# Slice: Starting With God (starting-with-god)

_Branch: `slice/starting-with-god` · Started: 2026-05-22 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get Starting With God queryable end-to-end: acquire → ingest → retrieve →
spot-check. As slice #1 it also builds the first real path through each context
(Acquisition / Ingestion / Retrieval) — later slices reuse the machinery.

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents
- [x] `RawDocumentStore` write port + in-memory fake + Postgres adapter, wired in main; integration test writes/reads a `raw_documents` row. Idempotent per (source_key, canonical_url) so re-runs don't duplicate.   <!-- sha: 01cfd8b -->
- [x] Registry: `SourceEntry`/`CrawlPolicy` pure-data types + Starting With God entry (40 article seed paths, `#content` selector + strip list, 1500ms delay, maxPages 60) + lookups (getSource/allSources/seedUrls); pure unit test.   <!-- sha: a3fa409 -->
- [x] Acquisition context: `normalizeUrl()` (invariant 2 — strip fragments + tracking params, lowercase host, trim trailing slash), thin HTML extraction (node-html-parser; select `#content`, strip nav/sidebar/footer, decode entities, paragraph-preserving), `acquireOne` (fetch → extract → `RawDocument` w/ sha256 bodyHash, typed skips); fakes-only unit tests + real-fixture probe (clean 5698-char extraction).   <!-- sha: 3be1c4a -->
- [x] HTTP `Fetcher` adapter in `src/adapters/http-fetch/` (browser UA, follow redirects, conditional headers honored, 304→not-modified, body returned for hashing); wired in main; co-located stubbed-fetch unit test.   <!-- sha: a8a18b5 -->
- [x] `acquireSource` orchestrator in the Acquisition context (seed walk + delay + maxPages cap, stages via injected RawDocumentStore; fakes-only test) + thin `scripts/acquire.ts` + `pnpm acquire --source <key>|--all`. Typecheck + dry invocation (usage/unknown-source) green.   <!-- sha: 6abfe62 -->
- [x] Live run `pnpm acquire --source starting-with-god`: **40/40 pages staged**, avg 6,843 chars (412–20,877), all titled/status-200/body_hash; spot-reads clean (article text, paragraph breaks, entities decoded). Recorded in `sources.md` (→ Acquired).   <!-- sha: next -->

**Stage 1 (Acquire) complete — verify green, 40 clean rows in `raw_documents`.**

### 2. Ingest → corpus tables (needs OpenRouter key in .env)
- [x] OpenRouter `Embedder` adapter (OpenAI-compatible `/embeddings`, 1536 dims, batch ≤100, per-response dimension assertion, null-per-blank skip); wired in main. 6 stubbed-fetch unit tests.   <!-- sha: 31ea558 -->
- [x] Ingestion context: normalize (clean text, registry defaults, contentHash) → chunk (jfa 500/50/min-20 ported verbatim + best-effort spans/tokens) → embed → dedup gate → idempotent replaceDocument. Adds `RawDocumentReader` read port + fake. 10 fakes-only tests.   <!-- sha: 03d5ca9 -->
- [x] `scripts/index.ts`: drain `raw_documents` (ingested_at IS NULL) via ingestPending → mark consumed; `--source/--limit/--force`. Postgres `RawDocumentReader` adapter + live integration test.   <!-- sha: 5a99d37 -->
- [x] Live run `pnpm index --source starting-with-god`: **40/40 docs → 183 chunks → 183 embeddings**, chunk_count consistent (declared=actual=183, 0 mismatched), chunks/doc min 1 / avg 4.6 / max 14; sample chunk is clean article text. Idempotent re-run drains 0. First run mistakenly used the `.env`'s nvidia free model; corrected by re-embedding (`--force`) → all 183 embeddings now **`openai/text-embedding-3-small`** (1536 dims), counts unchanged.   <!-- sha: 7983f7e (run) / b073a0f (--force) -->

**Stage 2 (Ingest) complete — verify green, 40 docs / 183 chunks / 183 embeddings (openai/text-embedding-3-small) in the corpus. Model decision resolved.**

### 3. Retrieve → ranked results
- [x] Retrieval context (`src/retrieval/`): `createRetriever({embedder, search})` runs invariant 5 — embedQuery → vectorSearch(candidateTopK fan-out) → minScore 0.3 cutoff → soft preferSourceKey tiebreak → 3-key dedup (content-hash / canonicalUrl+ord / title+text fingerprint) → slice topK → citation assembly. Pure helpers (`candidateTopK`, `policyToFilter`) exported. 12 fakes-only tests (ranking, cutoff, fan-out count, each dedup key, scope/language filter, preference). Verify green, 59 tests.   <!-- sha: 8ad378b -->
- [x] Query entry point: `retriever` wired into `main.wire()`; thin `scripts/query.ts` + `pnpm query "<q>"` (flags: `--top-k/--min-score/--source/--prefer/--language/--category`) prints ranked cited hits; `scripts/eval.ts` step-5 TODO closed (`runOne` now drives the real Retriever). Live: `pnpm query "How can I begin a relationship with God?"` → **5 distinct docs**, scores 0.54–0.59, all on-topic, each cited (title + canonical URL).   <!-- sha: pending -->

**Stage 3 (Retrieve) complete — verify green (59 tests), live query returns ranked + cited hits from Starting With God. Per-document dedup confirmed (5 hits = 5 distinct URLs). Scores cluster ~0.55 — minScore 0.3 is generous (FOLLOW-UP A: re-derive from eval baseline).**

### 4. Spot-check
- [ ] A handful of representative queries return relevant chunks (operator eyeballs); record findings in `sources.md`.

## Decisions made (this slice)
- 2026-05-22 — Source #1 = Starting With God — leanest of the six (44 KB / ~723 words home), server-rendered HTML, no anti-bot wall (STATUS recon).
- 2026-05-22 — Acquire scope = **bare fetch + extract + write, with a polite per-request delay** (`requestDelayMs` in the crawl policy). robots.txt fetch/disallow enforcement AND http-cache conditional fetch are **deferred** to a later step — neither is load-bearing for proving the loop on one lean site. ("as per robot" read as: behave politely with a delay, not parse robots.txt.)
- 2026-05-22 — Page discovery = **hardcoded seed list** of content URLs in the registry, not a discovery crawl. The generic-crawler-vs-per-source call stays deferred until 2–3 sources reveal the pattern (STATUS).
- 2026-05-22 — `RawDocumentStore` is the new write port for `raw_documents` (the §4 port list had no writer for the staging table); made idempotent per (source_key, canonical_url) on un-ingested rows so re-acquire doesn't duplicate.
- 2026-05-22 — `RawDocumentReader` is the new **read** port for `raw_documents` (`listPending` + `markIngested`), symmetric to the write port — mirrors the CorpusWriteStore/CorpusSearchStore split so Acquisition sees only the writer and Ingestion only the reader. Same staging-table deviation from the §4 port list, read side.
- 2026-05-22 — `char_start`/`char_end` on chunks are **best-effort source offsets** (located by matching each chunk against a whitespace-collapsed projection; sequential fallback when overlap/whitespace defeats a match). They're metadata only — retrieval ranks on the embedding, never on offsets — so approximate spans are acceptable; the columns are NOT NULL so a value is always written. `token_count` = jfa's `ceil(chars/4)`.
- 2026-05-22 — **Embedding model = `openai/text-embedding-3-small`** (locked decision-1, confirmed by operator). The first ingest run accidentally used a `.env` `EMBED_MODEL_ID` override (`nvidia/llama-nemotron-embed-vl-1b-v2:free`); both models are reachable via OpenRouter at 1536 dims (probed), so it was a free choice, not a constraint. Corrected `.env` → openai and re-embedded all 183 chunks via `--force`. Probe also confirmed openai embeddings ARE served by OpenRouter (earlier assumption that they 404 was wrong).
- 2026-05-22 — `pnpm index --force` = **full re-index from the raw snapshot** (re-drain ingested rows via `RawDocumentReader.includeIngested` + bypass the contentHash skip). The reproducible way to re-embed after a model/chunker change without re-crawling — used for the openai re-embed above.
- 2026-05-22 — **3-key dedup yields at most one chunk per distinct document.** `ScoredRow.contentHash` is document-level (`sha256(title\n\ncontent)`), and invariant 5 names content-hash as a dedup key, so a query returns diverse articles rather than several chunks of one. This is the faithful reading of the spec and why the fan-out over-fetches 3×. If spot-checks find it too aggressive (a strongly-relevant article wanting >1 chunk), relax to a per-chunk key — a clean follow-up.
- 2026-05-22 — **`preferSourceKey` is a soft tiebreak, not a filter** (and not yet a score boost). It re-orders only equally-scored rows to favour the preferred source; scores are untouched. A real boost/interleave is deferred until multi-source eval exists (matches the "defer until data reveals the pattern" ethos). `allowedSourceKeys` remains the hard visibility scope. Registry-based source→domain+scopePath resolution (for sub-scoped sources) is likewise deferred — no sub-scoped source exists yet, and the store filters by `sourceKey` directly.

## Open question / blocker
- none. (Embedding-model divergence is resolved — corpus is on `openai/text-embedding-3-small`.)

## Resume hint (for a cold start)
At: **Stage 4 (Spot-check) — not started.** Stages 1–3 are done: the corpus (40
docs / 183 chunks / 183 embeddings, `openai/text-embedding-3-small`) is now
**queryable** via `src/retrieval/` + `pnpm query "<q>"` (and `pnpm eval` once
golden cases exist). Next concrete action: run a handful of representative
queries through `pnpm query`, eyeball relevance, and record findings in
`sources.md` (→ Evaluated). Then the slice is done — offer to merge
`slice/starting-with-god` into `main`. Last verify: green @ Stage 3 complete
(depcruise/typecheck/lint, 59 tests; live query "How can I begin a relationship
with God?" → 5 distinct cited docs, scores 0.54–0.59). Branch:
slice/starting-with-god.
