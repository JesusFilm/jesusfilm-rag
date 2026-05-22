# jesusfilm-rag — architecture

_2026-05-21 — architecture of record for `jesusfilm-rag`: a standalone, production-quality retrieval service. It rebuilds the proven RAG logic from jesusfilm-ai into three clean bounded contexts (Acquisition / Ingestion / Retrieval) behind ports. We follow jesusfilm-ai's **behavior**, not its file structure or its persistence warts. The router/crisis/scope layer and all LLM generation are **out of scope** — they are caller-side concerns (a Mastra agent, NextSteps, the monorepo)._

## Resuming the build (start here)

**Status (2026-05-22):** clean root → enforcement scaffolding → operational-model docs → legacy strip (commits `acb2c62` … on `main`) → Postgres storage adapter + in-memory fakes (step 2). **Steps 1–2 are done.** Live status + the single next action now live in **[docs/STATUS.md](./STATUS.md)** — the churn layer this design doc deliberately stays out of. We build in **vertical per-source slices** (acquire → ingest → retrieve → spot-check, one source at a time), which refines §9's horizontal order without changing the module boundaries or ports below.

**To resume cold (a fresh agent, no prior chat context):**
1. Read `AGENT.md`, then this doc — §9 for the step list, §2 + §4 for the contracts you implement, §5 for the boundary law.
2. Confirm the green baseline: `pnpm depcruise && pnpm lint && pnpm typecheck`.
3. The behavioral source of truth for the porting steps is the **jesusfilm-ai** repo (the RAG this is based on); §8 maps which of its files feed each context. Step 2 is mostly self-contained — implement the contract ports over the schema in `src/db/schema.ts` — and needs little from it.
4. **Testing:** contexts get fakes-only unit tests (no DB, no network); an **adapter** gets its own co-located `*.test.ts` integration test against the docker-compose Postgres (`docker compose up -d`).
5. **Git:** local `main` is an orphan root that intentionally diverged from `origin/main` — do not force-push without intent.

---

## Locked decisions (2026-05-21)

| # | Decision | Choice |
|---|---|---|
| 1 | Embedding model + dims | `openai/text-embedding-3-small` via OpenRouter, **1536** dims. Matches jesusfilm-ai and Forge. |
| 2 | Persistence schema | **Normalized** (`sources`/`documents`/`chunks`/`chunk_embeddings`) + jesusfilm-ai's richer fields. |
| 3 | Retrieval `minScore` | Port **0.3 verbatim**. Quality fix deferred to a follow-up ticket (FOLLOW-UP A below). |
| 4 | Acquisition→Ingestion handoff | **Raw staging table** (`raw_documents`), which is also the reproducible raw snapshot. |
| 5 | v1 source scope *(added 2026-05-22)* | Curated HTML subset first — the **six** originally-scoped domains that previously yielded a working corpus (Jesus Film Project, Cru, EveryStudent, Starting With God, Sightline Ministry, NextStep). Full inventory + acquire→ingest→evaluate status tracked in [`docs/sources.md`](./sources.md); started fresh, no prior-project data carried. API/Drive/multi-language sources deferred. |
| 6 | Reindex stability *(added 2026-05-22)* | **In-place reindex; no uptime/consistency guarantee during a run.** Ingestion writes directly to the live corpus tables (per-document delete-then-insert is atomic, but a full run is not). Temporary stale data, brief inconsistency, or downtime during reindex is **accepted for v1**. Blue/green candidate-build + atomic swap is deferred — see FOLLOW-UP D. |

---

## 1. The shape

```
        ┌─────────────── Acquisition ───────────────┐
 web →  │ SourceRegistry (pure)                      │
        │ Fetcher port → robots + http-cache (port)  │ ── emits ──▶ raw_documents
        │ content extraction (source selectors)      │              (staging)
        └────────────────────────────────────────────┘
                                                            │
        ┌─────────────── Ingestion ──────────────────┐     ▼
        │ normalize → chunk → embed (port)            │ ◀── consumes raw_documents
        │ dedup gate → CorpusWriteStore (port, 1 tx)  │ ── writes ──▶ sources/documents/chunks/embeddings
        └─────────────────────────────────────────────┘
                                                            │
        ┌─────────────── Retrieval (core lib) ────────┐     ▼
caller→ │ embedQuery → CorpusSearchStore (port)       │ ◀── reads
(policy)│ rank (cosine) → minScore → dedup → cite     │ ── returns ──▶ RankedResult[]
        └─────────────────────────────────────────────┘
                          ▲
                          │ thin adapter (NOT part of Retrieval)
                 MCP / HTTP serving
```

The seams between the boxes are the architecture. Retrieval is a pure library over a search port, so the same code can be called in-process by a Mastra tool, by NextSteps, or behind the MCP server. MCP/HTTP is an **adapter**, not a fourth context.

### Tenet: mechanism, not policy

**The RAG is a reliable, parameterized retrieval mechanism; all "what's good for this audience" weighting lives in the consumer; corpus heterogeneity is solved by ingest-time labeling, not retrieve-time bias.**

Given a query and a `RetrievalPolicy`, Retrieval ranks on embedding similarity and the **declared** parameters (scope, language, category, cutoff, top-k) and returns deterministic, cited results. It bakes in **no** audience- or value-weighting — "what's best for *this* asker" is consumer-relative (the same chunk is the right answer for a doctrinal apologist and noise for a World Cup chat bot), so it belongs in the consumer, not the engine. Baking a worldview into the engine makes it wrong for some consumer, undermines the multi-consumer reuse §1 is built on, and turns retrieval into an untestable black box.

Corpus heterogeneity (football-campaign content sitting next to doctrinal teaching) is therefore handled by **structure, not bias**, on two levers:
- **Ingest-time labels** (`category` / `tags` / `sourceKey`, set in Ingestion) — a consumer scopes declaratively and never sees off-topic content; it is *filtered out by parameter*, not *down-ranked by hidden logic*.
- **Source-level enablement** (an operator switch — see FOLLOW-UP E) — turns a whole source on/off corpus-wide, the right lever for *seasonal* content.

The only in-engine steering the architecture sanctions is **thin, declared, and tiebreak-only** (today: `minScore`, and `preferSourceKey` as a soft tiebreak — not a score boost). Anything thicker is a design smell: push it to the consumer.

---

## 2. Contracts (the seams)

### Acquisition → Ingestion: `RawDocument` (persisted as a `raw_documents` row)
Acquisition does policy/robots gating + source-selector content extraction, then stops.

```ts
type RawDocument = {
  sourceKey: string            // registry key, e.g. 'cru-org'
  url: string
  canonicalUrl: string         // policy.normalizeUrl() — the dedup identity
  title: string | null
  rawContent: string           // extracted main text; NOT cleaned/validated/tagged
  fetch: {
    status: number | null
    bodyHash: string           // sha256(response body) — HTTP-cache identity
    etag: string | null; lastModified: string | null
    fetchedAt: string; notModified: boolean
  }
}
```

### Ingestion internal + Ingestion → storage

```ts
type NormalizedDocument = {
  sourceKey: string; source: string; canonicalUrl: string
  title: string | null; content: string            // cleaned
  language: string; category: string; tags: string[]
  contentHash: string          // sha256(`${title}\n\n${content}`) — CHUNK dedup identity
  metadata: Record<string, unknown>
}
type EmbeddedChunk = {
  ord: number                  // jfa's chunk_index
  text: string; charStart: number; charEnd: number; tokenCount: number
  tags: string[]; embedding: number[]; embeddingModel: string
}
```

### Caller → Retrieval → Caller

```ts
type RetrievalPolicy = {
  allowedSourceKeys?: string[] // tenant/visibility scope (undefined = all)
  preferSourceKey?: string; language?: string; category?: string
  topK?: number               // default 5
  minScore?: number           // default 0.3 (ported verbatim; see FOLLOW-UP A)
}
type RankedResult = {
  chunkId: string; score: number              // cosine 0..1
  text: string; ord: number; tags: string[]
  citation: { sourceKey: string; sourceName: string; title: string | null; url: string }
}
interface Retriever { search(query: string, policy?: RetrievalPolicy): Promise<RankedResult[]> }
```

### Invariants that must survive the port (silent-breakage traps)
1. **Two distinct hashes, never conflated** — `fetch.bodyHash` (sha256 of raw body, gates *re-fetch* in Acquisition) vs `contentHash` (sha256 of `title\n\ncontent`, gates *re-chunk* in Ingestion).
2. **`canonicalUrl` is the dedup key** — `normalizeUrl()` strips fragments + tracking params (`utm_*`, `gclid`, `fbclid`, `ref`, `ref_src`, `igshid`, `mc_cid`, `mc_eid`), lowercases host, trims trailing slash (except root). Must be deterministic.
3. **Dedup lifecycle = delete-then-insert in one transaction** — on content-hash change: delete the document's chunks → insert new chunks → upsert the document row. Skipping the delete double-indexes.
4. **Chunking is faithful** — target ~500 tokens (`maxChars = tokens*4`), 50-token overlap, paragraph-boundary preserving, drop tail chunks < 20 tokens.
5. **Candidate fan-out before cutoff** — `candidateTopK = min(50, max(topK*3, topK+5))`, cosine `ORDER BY score DESC`, then `minScore` cutoff, then 3-key dedup, then slice to `topK`.

---

## 3. The three contexts

### Acquisition — *fetch raw content; never normalize or chunk*
- **Owns:** `SourceRegistry` (the `SourceEntry`/`CrawlPolicy` data, pure, zero-I/O), content extraction via source `contentSelectors`, fetch policy (`allow`/`block`/`minContentLength`/`requestDelayMs`/`maxPages`), robots (RFC-9309 longest-match, fail-open), HTTP conditional-fetch cache.
- **Ports needed:** `Fetcher` (HTTP, injectable for fixtures), `FetchStateStore` (`http_cache` + `robots_cache`).
- **Ports from jfa:** `sources/registry.ts`, `scraper-base.ts`, `ingest/policy.ts`, `ingest/robots.ts`, `ingest/http-cache.ts`, `ingest/scheduler.ts`, `scrapers/*`.
- **Does NOT:** build `NormalizedDocument`, chunk, embed, or touch corpus tables. (Output stops at a `raw_documents` row.)

### Ingestion — *RawDocument → embedded chunks via the storage port; never fetch, never serve*
- **Owns:** normalize (clean text, language/category/tags, `contentHash`), chunk (per invariant 4), embed (batched), the dedup gate, idempotent write.
- **Ports needed:** `Embedder`, `CorpusWriteStore`.
- **Ports from jfa:** `ingest/normalize.ts`, `chunk.ts`, `embed.ts`, plus chunk/dedup write logic out of `store.ts`.
- **Does NOT:** fetch URLs, run robots, expose search.

### Retrieval — *query + policy → ranked, cited results; core library, no transport*
- **Owns:** query embedding, candidate selection, cosine ranking + cutoff, 3-key dedup (content-hash / url+chunk / title+content fingerprint), citation assembly, source-scope resolution (`source`/`sourceKey` → domain + scopePath).
- **Ports needed:** `CorpusSearchStore`, `Embedder` (query side), `SourceRegistry` (scope resolution).
- **Ports from jfa:** `retrieve.ts` (with the `require('./store')` / `pgvector-store` direct coupling moved behind the port).
- **Does NOT:** know about HTTP/MCP/Telegram, generate prose, apply intent/crisis/scope routing, or apply audience/value weighting — it ranks on similarity + the declared `RetrievalPolicy` only (see the "mechanism, not policy" tenet above). All of that arrives as `RetrievalPolicy` input or is the caller's job.

---

## 4. Ports & adapters (one Postgres adapter implements the stores)

```ts
interface Fetcher          { fetch(url, conditional?): Promise<FetchResult> }
interface FetchStateStore  { getHttpCache(url); putHttpCache(e); getRobots(u); putRobots(e) }
interface Embedder         { embed(texts): Promise<(number[]|null)[]>; embedQuery(t): Promise<number[]>;
                             readonly model: string; readonly dimensions: number }
interface CorpusWriteStore { upsertSource(s); getDedup(sourceKey, canonicalUrl);
                             replaceDocument(doc, chunks): Promise<void> /* delete+insert, one tx */ }
interface CorpusSearchStore{ vectorSearch(queryVec, filter, k); keywordSearch?(q, filter, k); fetchById(id) }
```

**Embedder adapter:** OpenRouter, model `openai/text-embedding-3-small`, 1536 dims, batch ≤ 100, dimension assertion on every response. Provider: https://openrouter.ai/openai/text-embedding-3-small.

**Note (reconciled in build step 2):** the port (`src/contracts/ports.ts`) carries the final shape — `embed → (number[]|null)[]` + `readonly dimensions` (not the legacy `number[][]` + `dimensions()`). The `null`-per-empty-input is load-bearing (the dedup/skip path relies on it); `FakeEmbedder` adopts it, and the OpenRouter Embedder adapter (built in a later step) must too.

---

## 5. Enforcement & dependency rules — keeping the AI (and us) from re-coupling

The §3 boundaries are only real if crossing one **fails the build**. jesusfilm-ai rotted because nothing stopped "just one more import" or a 1,400-line `store.ts` that everything reached into. These rules turn each boundary into a mechanical gate. Mechanism: **`dependency-cruiser`** (import boundaries) + eslint `max-lines` + a fakes-only test rule, all run in CI.

**5.1 Layout = boundaries.** One directory per context, a dependency-free `contracts` module, and a single composition root:

```
src/
  contracts/    types + port interfaces (RawDocument, NormalizedDocument, EmbeddedChunk,
                RetrievalPolicy, RankedResult, Retriever, Fetcher, FetchStateStore,
                Embedder, CorpusWriteStore, CorpusSearchStore). Imports: NOTHING.
  registry/     SourceRegistry — pure source data + lookups. Imports: contracts only.
  acquisition/  fetch · robots · http-cache · extraction → emits RawDocument
  ingestion/    normalize · chunk · embed · dedup · write
  retrieval/    query-embed · rank · cutoff · dedup · cite
  adapters/     postgres/ · openrouter/ · http-fetch/   (concrete port implementations)
  serving/      mcp/ · http/   (delivery adapter over an injected Retriever)
  fakes/        in-memory port doubles for fakes-only unit tests (imported only by *.test.ts)
  main.ts       composition root — the ONLY file that builds adapters and wires contexts
```

**5.2 The import law.** Everything depends on *interfaces* (`contracts`), never on concrete code, except the composition root.

| Module | May import |
|---|---|
| `contracts/` | nothing (internal) |
| `registry/` | `contracts` |
| `acquisition/` `ingestion/` `retrieval/` `serving/` | `contracts`, `registry`, and **itself** |
| `adapters/` | `contracts` (+ external libs) |
| `main.ts` | anything (it wires) |

Consequences: no context imports another context; no context or serving imports a concrete adapter; the only place `new PostgresStore()` / `new OpenRouterEmbedder()` exists is `main.ts`, which injects them. This is the direct antidote to jfa's `require('./store')`-from-everywhere singleton.

**5.3 `dependency-cruiser` config** (`.dependency-cruiser.cjs`):

```js
module.exports = {
  forbidden: [
    { name: 'contracts-are-pure', severity: 'error',
      comment: 'contracts/ is types + port interfaces only',
      from: { path: '^src/contracts/' }, to: { path: '^src/(?!contracts/)' } },

    { name: 'registry-is-pure', severity: 'error',
      from: { path: '^src/registry/' }, to: { path: '^src/(?!(contracts|registry)/)' } },

    { name: 'contexts-import-only-ports', severity: 'error',
      comment: 'a context may import contracts, registry, or itself — nothing else',
      from: { path: '^src/(acquisition|ingestion|retrieval|serving)/' },
      to:   { path: '^src/', pathNot: '^src/(contracts|registry|$1)/' } }, // $1 = same context

    { name: 'adapters-import-only-contracts', severity: 'error',
      from: { path: '^src/adapters/' },
      to:   { path: '^src/', pathNot: '^src/(contracts|adapters)/' } },

    { name: 'tests-never-touch-adapters', severity: 'error',
      comment: 'unit tests run on fakes; a test needing a real adapter = coupling bug',
      from: { path: '\\.test\\.ts$' }, to: { path: '^src/adapters/' } },
  ],
  options: {
    tsPreCompilationDeps: true,                 // catch type-only imports that still couple
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
  },
};
```
(`$1` is dependency-cruiser's backreference to the group captured in `from.path`, so intra-context imports stay legal.)

**5.4 Dependency injection, one composition root.** No module-level singletons, no top-level `new Adapter()`. Contexts and serving receive their ports as constructor/factory arguments; `main.ts` is the only wiring point. The `contexts-import-only-ports` + `adapters` rules above enforce this structurally.

**5.5 File-size cap** (eslint) — the antidote to 1,468/2,673-line god-objects:
```jsonc
"max-lines": ["error", { "max": 300, "skipBlankLines": true, "skipComments": true }],
"max-lines-per-function": ["warn", 80]
```
When a file starts mixing fetch+parse+persist it trips the cap and forces a split before it festers.

**5.6 Fakes-only unit tests.** Every port ships an in-memory fake (`FakeFetcher`, `FakeFetchStateStore`, `FakeEmbedder`, `FakeCorpusWriteStore`, `FakeCorpusSearchStore`). Each context's unit tests run against fakes — **no Postgres, no network**. This is both the quality bar and the coupling detector: if a context can't be tested without a real adapter, it's already coupled (and `tests-never-touch-adapters` fails). Landed in `src/fakes/` (step 2): pure port doubles enforced by `fakes-import-only-contracts` + `fakes-are-test-only`, and kept faithful to each adapter's load-bearing invariants (e.g. `FakeCorpusWriteStore` enforces upsertSource-before-replaceDocument and delete-then-insert).

**5.7 Per-context `AGENT.md`.** Each context dir carries a ~5-line fence so an agent working there reads its constraints first (the Forge pattern). Template:
```md
# acquisition — AGENT boundary
Owns: fetch, robots, http-cache, source-selector extraction → emits RawDocument.
May import: contracts, registry, this dir. MUST NOT import: ingestion, retrieval, serving, adapters, main.
Does NOT: normalize, chunk, embed, or write corpus tables.
All I/O goes through injected ports (Fetcher, FetchStateStore) — never construct an adapter here.
```

**5.8 CI gate.** Every change runs `pnpm depcruise && pnpm lint && pnpm typecheck && pnpm test`. A boundary violation, an oversized file, or an adapter-touching test fails the build. That failure — not this document — is what keeps the architecture honest.

---

## 6. Postgres schema (normalized + jfa fields, Drizzle)

```
sources            id(uuid pk) · key(text uq)        -- registry key, e.g. 'cru-org'
                   name · domain · trust · ingestion_mode
                   languages(jsonb) · default_tags(jsonb) · default_category · rights
                   content_hash                       -- source-level idempotency (skip reindex when unchanged)
                   indexed_at · created_at · updated_at

documents          id(uuid pk) · source_id(fk)
                   canonical_url                      -- unique per source; dedup identity
                   url · title · language · category
                   content_hash                       -- sha256(title\n\ncontent); chunk-dedup gate
                   chunk_count · first_seen · last_seen · indexed_at
                   UNIQUE(source_id, canonical_url)

chunks             id(uuid pk) · document_id(fk) · source_id(fk, denorm for fast filter)
                   ord(int) · text · char_start · char_end · token_count
                   tags(jsonb)                         -- denormalized for GIN filter
                   created_at
                   (FTS tsvector + GIN index — for optional keyword_search)

chunk_embeddings   chunk_id(uuid pk, fk) · embedding halfvec(1536) · embedding_model(text) · embedded_at
                   (HNSW cosine index)

http_cache         url(pk) · etag · last_modified · body_hash · status_code · fetched_at · updated_at
robots_cache       robots_url(pk) · body · status_code · fetched_at · updated_at

raw_documents      id(uuid pk) · source_key · url · canonical_url · title
   (staging +      raw_content · status · body_hash · etag · last_modified · fetched_at · not_modified
    snapshot)      ingested_at(null until Ingestion consumes it)
```

Notes:
- Visibility filter is `sources.key IN (:allowedSourceKeys)` (cleaner than jfa's `metadata->>'source_key'`). The jfa `OR source_key IS NULL` back-compat branch is **dropped** — fresh build, every chunk has a source.
- `halfvec(1536)` keeps the storage-efficiency choice at the new dimension; `vector(1536)` is an acceptable swap if simpler.
- Language/category live on `documents`; `tags` denormalized onto `chunks` for filtering.

---

## 7. Foundation — what we kept vs. dropped (build step 1, done 2026-05-21)

| Kept (production bones) | Dropped |
|---|---|
| Postgres + Drizzle + migrate, devcontainer, Zod env, pnpm/Vitest/ESLint | abandoned-MVP seed corpus + the old corpus-walking indexer |
| Eval harness (recall@k, MRR) + idempotent source-scoped reindex | seed eval cases |
| MCP serving + bearer/scope auth (becomes the Retrieval adapter) | MVP-era ADRs / plan / investigation docs |
| `chunker.ts` shape — **retuned** to jfa params (500/50/min-20) | prior embedder model → switched to `openai/text-embedding-3-small`/1536 |

The infrastructure (DB factory, migrations, eval framework, MCP transport, idempotency) is the genuine production value and stays. Schema, chunker params, and embedder model follow jesusfilm-ai.

---

## 8. Port map (jfa → context)

- **Acquisition:** `sources/registry.ts`, `scraper-base.ts`, `scrapers/*`, `ingest/{policy,robots,http-cache,scheduler}.ts`
- **Ingestion:** `ingest/normalize.ts`, `chunk.ts`, `embed.ts`, chunk/dedup writers from `store.ts`, chunk/source/dedup DDL from `schema.ts`
- **Retrieval:** `retrieve.ts`, `getChunksForRetrieval` from `store.ts`, `sources/visibility.ts`
- **Left behind (caller-side / generation):** `api.ts`, `bot.ts`, `router/*`, `providers.ts`, `cache.ts` (response cache)

---

## 9. Build sequence

1. **Bare-out + schema** ✅ *done — clean root commit `acb2c62`* — §7 strip; §6 schema + baseline migration; embedder → `openai/text-embedding-3-small`/1536; chunker retuned. Legacy pipeline code stubbed with `TODO(step-N)` markers. **Enforcement scaffolding** also landed (commit `7a70fd5`): `src/contracts/` (ports + seam types), the per-context dir layout + `AGENT.md` fences, `.dependency-cruiser.cjs`, eslint `max-lines`, `src/main.ts` stub — depcruise/lint/typecheck green.
2. **Storage adapter** ✅ *done — `src/adapters/postgres/`, wired via `main.wire()`* — `CorpusWriteStore` + `CorpusSearchStore` + `FetchStateStore` over the §6 schema. Implemented as **raw SQL on the injected postgres-js client** (the import law forbids adapters → `src/db`, so the adapter targets the migration's table/column names rather than importing the Drizzle schema). Co-located `postgres-store.test.ts` integration test against the docker-compose Postgres (self-migrates; skips loudly when the DB is unreachable). Embedder port shape reconciled (§4 note). In-memory fakes for every port landed in `src/fakes/` (§5.6).
3. **Acquisition** — port registry + scraper-base + policy/robots/http-cache into `src/acquisition/`; `scripts/acquire.ts` writes `RawDocument`s to `raw_documents`. Verify against fixtures (no live crawl needed for tests). **v1 scope = the six-source short list in [`docs/sources.md`](./sources.md)** (API/Drive/multi-language deferred); track each source's acquire→ingest→evaluate status there as we go.
4. **Ingestion** — port normalize/chunk/embed into `src/ingestion/`; `scripts/index.ts` drains `raw_documents` → idempotent `replaceDocument`. Verify the dedup lifecycle.
5. **Retrieval** — port `retrieve.ts` into `src/retrieval/` behind `CorpusSearchStore`; wire `RetrievalPolicy`.
6. **Serving adapter** — re-attach MCP/HTTP in `src/serving/` over an injected `Retriever`.
7. **Bootstrap the corpus + eval** *(the deliverable)* — once 2–4 exist, `pnpm acquire --all && pnpm index` populates the full corpus from sources; then re-point the eval harness at it and record the baseline. **The corpus is buildable the moment step 4 lands; 5–6 make it queryable.** How the runners are triggered: §10.

Critical path to a delivered, queryable RAG: **2 → 3 → 4 → bootstrap → 5 → 6**. Each step is independently verifiable — the reason for the seams. Step 1's §5 enforcement scaffolding is already in place, so every porting step lands under the import law + size caps from the first line.

---

## 10. Operational model — corpus build & refresh

The corpus is rebuilt **from sources by code**, not restored from a blob — this *is* the reproducibility guarantee: anyone can reconstruct the full corpus from scratch, and it doubles as the disaster-recovery runbook (closing the gap that left the original corpus trapped in a Railway Postgres).

**The unit of work — two CLI runners** (thin entry points that call `main.wire()` for adapter-injected contexts, keeping adapter construction centralized in the composition root):
- `scripts/acquire.ts` → drives **Acquisition**: iterate the source registry, fetch + extract each source per its crawl policy (robots, http-cache, delay), write `RawDocument`s to `raw_documents`. `pnpm acquire --all` | `--source <key>`.
- `scripts/index.ts` → drives **Ingestion**: drain `raw_documents` → normalize → chunk → embed → idempotent write. `pnpm index`.

**Triggers, by phase:**

| Phase | Trigger | Notes |
|---|---|---|
| **Bootstrap** (full corpus — the deliverable) | one-off `pnpm acquire --all && pnpm index`, locally or as a Railway one-off job | one-time crawl-everything; populates the corpus from scratch |
| **Recurring refresh** | a **Railway cron service** running the two scripts on a schedule (e.g. weekly) | crawl is long-running, stateful (http-cache/robots/dedup live in the DB), DB-adjacent; re-runs are cheap — conditional fetch + content-hash dedup skip unchanged pages, only changed articles re-embed |
| **Quality gates + deploy** | **GitHub Actions** | `depcruise`/`lint`/`typecheck`/`test` on PRs + deploy the Serving (MCP) container — **not crawling** |
| **On-demand re-index** (optional) | `workflow_dispatch` GH Action that kicks the Railway job | convenience for manual refreshes |

**Why Railway cron, not GitHub Actions, for the crawl:** the crawl needs the Postgres-resident http-cache/robots/dedup state, runs long, and holds DB credentials — all favor a job in the DB's own network over an ephemeral CI runner (whose IPs also get blocked by sites).

**Sequencing for delivery:** the recurring cron and the eval baseline are *deferrable* — do the bootstrap run manually first to ship the corpus, then automate refresh and author evals. The bootstrap run is what delivers.

---

## 11. Deferred follow-ups (tickets)

- **FOLLOW-UP A — retrieval `minScore` quality.** 0.3 is ported verbatim but is almost certainly too low (Jaco's own RAGs ran ~0.85; <0.70 is noise). After step 7's eval baseline exists, re-derive the real cutoff from the harness. Owner: TBD.
- **FOLLOW-UP B — hybrid search.** jfa's hot path is vector-only (FTS exists but is unqueried). Forge uses RRF fusion. Keep `keywordSearch` as an optional port now; evaluate RRF hybrid against the harness later.
- **FOLLOW-UP C — original-HTML snapshot.** `raw_documents.raw_content` holds extracted text; if full-fidelity reproducibility is wanted, persist original HTML to object storage keyed by `body_hash`.
- **FOLLOW-UP D — zero-downtime reindex (blue/green).** Decision 6 accepts downtime/stale reads during a reindex. When retrieval becomes high-traffic or multi-tenant, revisit: build a candidate corpus (a `build_id`/version column + an active pointer, or a separate green database), eval it, then atomically swap production reads to it — so a bad or in-progress ingest never reaches live readers. Pairs with `raw_documents` as the cheap re-embed source (no re-crawl). Owner: TBD.
- **FOLLOW-UP E — source enablement (operator on/off).** Requested by Miheret for *seasonal* sources (e.g. retire football-2026 once the tournament ends, re-enable for the next). The "mechanism, not policy" lever for corpus lifecycle: a persistent `enabled boolean` on `sources` (default true), enforced as an **unconditional** filter in `CorpusSearchStore.vectorSearch` (`… AND sources.enabled`). Disabling makes a source invisible to retrieval **while retaining its rows** — re-enable is instant, no re-crawl/re-embed. Distinct from the per-call `RetrievalPolicy.allowedSourceKeys` (consumer scope, one query) — this is operator state, corpus-wide, all consumers; effective visibility = `enabled sources ∩ allowedSourceKeys`. Flipped by a small admin action (e.g. `pnpm source enable|disable <key>`), not a code deploy; `acquire`/`index` may also skip disabled sources. Touches §6 schema (column + migration), the `CorpusSearchStore` port/adapter, and `docs/sources.md` (a `Disabled` lifecycle state, separate from `Deferred`). Owner: TBD.
