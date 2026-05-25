# STATUS — jesusfilm-rag

Live "you are here" for the build. Stable design lives in
[architecture.md](./architecture.md); per-source progress in
[sources.md](./sources.md). **This file is the churn layer** — update it
whenever state changes; keep it to ~one screen.

_Last updated: 2026-05-26_

## You are here

**Slice #1 (Starting With God) is DONE and MERGED to `main`** (PR #2,
2026-05-25) — acquired (40 rows), ingested (**40 docs / 183 chunks / 183
embeddings**, `openai/text-embedding-3-small`), retrievable, evaluated:
**recall@3 0.90 · recall@8 1.00 · MRR 0.82 · P@1 0.70** @ minScore **0.37**.

**Slice #2 (Cru "10 Basic Steps", `cru-10-basic-steps`) is DONE — all 4 stages green,
Evaluated, and MERGED to `main`** (PR #11, `b3105f7`). 11 docs / 35 chunks / 35
embeddings; retrievable + cited; two sources now coexist in one ranked space.

**Slice #3 (Jesus Film Project, `jesusfilm-org`) is IN PROGRESS** on
`slice/jesusfilm-org` (started 2026-05-26) — see
[docs/slices/jesusfilm-org.md](./slices/jesusfilm-org.md). This is the source
that triggers **FOLLOW-UP F**: Stage 1 built the **discovery-crawl** model
(sitemap seed → allow∧articleHints filter → drop block), because jesusfilm.org
is too large to hand-list like slices #1–2. **Stage 1 (Acquire) DONE:** the
discovery crawler is built + fakes-tested (1a–1c) and `jesusfilm-org` registered
(owned WP source, `.entry-content`); the live discovery crawl staged **349/349
blog articles, 0 skips** (417 sitemap locs → 349 kept; /give/ + .kml filtered).
raw_content avg 9.4k chars, clean prose, all titles populated. **Stage 2
(Ingest) DONE:** 349 docs / **2114 chunks / 2114 embeddings**
(`openai/text-embedding-3-small`), 0 chunk_count mismatches, idempotent re-run
drains 0. The corpus is now **3 sources** (swg + cru + jesusfilm-org). **Next:
Stage 3 (Retrieve)** spot-query, then Stage 4 (`/golden jesusfilm-org` + eval).
**Stage 4 built the eval, then reframed it.** v1 shipped a per-source breakdown with
single-source expected docs; reviewing it with the operator surfaced a better model, now
**implemented (`8fbee09`)**: cases are **source-agnostic questions + a multi-source `relevant`
map**, scored on **recall + coverage** (P@1/MRR secondary) at **top-10**, with per-source
coverage — see **[docs/eval-approach.md](./eval-approach.md)**. **v2 whole-corpus eval (20 cases
/ 2 sources): recall@3 0.95 · recall@10 1.00 · coverage 0.896 · MRR 0.881 · P@1 0.80**; per-source
coverage cru 0.929 / swg 0.906. This **resolved** the v1 cru "P@1 0.20" artifact — cru content
surfaces reliably (per-source recall 0.929); retrieval was fine, v1 measured the wrong thing.
minScore **0.37** held (FOLLOW-UP A). Citation-quality limitation remains: the leading
**accordion-TOC chunk** is sometimes the top-cited cru snippet (extraction-side; candidate
follow-up). 77 tests green. Parked candidates carried forward on the branch: **EveryStudent**
`Blocked` (Cloudflare) + **NextStep** `Deferred` (marketing site).

## Next action

**Slice #3 (Jesus Film Project, `jesusfilm-org`) is in progress** — drive it with
`/slice jesusfilm-org`; state lives in [docs/slices/jesusfilm-org.md](./slices/jesusfilm-org.md).
Operator-confirmed (2026-05-26): build the **discovery crawler** (FOLLOW-UP F) now rather than
hand-list a sub-scope — jesusfilm.org is the named trigger source. **Resume point:** Stage 1,
sub-step 1a (extend `CrawlPolicy` with discovery fields). After this lands, remaining short-list
`Not started`: **Sightline Ministry** (rides the now-built crawler; adds the skeptic axis).
Read `docs/jfa-registry-findings.md` before crawling (FOLLOW-UP F/G live there).

**Eval reframe (DONE 2026-05-25, `8fbee09`):** golden cases are now **source-agnostic questions
+ multi-source `relevant` maps**, scored on **recall + coverage** at **top-10** (P@1/MRR
secondary), with per-source coverage. The `relevant` set is **living** — re-review existing
questions for newly-relevant docs each time a source is added (not just author new ones). Model
+ v2 baseline in **[docs/eval-approach.md](./eval-approach.md)**.

**Now unblocked (2 sources end-to-end): FOLLOW-UP E — consumer `excludedSourceKeys`
filter** ([#6](https://github.com/JesusFilm/jesusfilm-rag/issues/6)). Can be a small
standalone change or folded into slice #3; NextStep football2026 was earmarked as its
seasonal-exclusion fixture. **New candidate follow-up:** strip the AEM accordion-section TOC
during Cru acquisition (top-cited cru chunk is sometimes the section list, not prose —
citation quality, not recall).

→ **`/slice <source>`** starts the next slice; `/slice` alone resumes an in-progress one
(none right now). Merge is the operator's call.

## How we're building (decided 2026-05-22)

- **Vertical slices, one source at a time.** Drive ONE source fully through
  acquire → ingest → retrieve → spot-check, then move to the next. This refines
  architecture §9's horizontal order — module boundaries and ports are
  unchanged, only the build order.
- **jfa is a behavioral reference, not a port target.** We learn what worked;
  we do not transplant its files.
- **Defer the "generic crawler vs. per-source scraper" decision** until 2–3
  sources reveal the real pattern.
- **Eval** (spot-checks first, then recall@k / MRR) gets built once slice #1 has
  real data to evaluate against.
- **`/slice` drives the work.** A lightweight, resumable slice-driver
  (`.claude/skills/slice/`): reads this file, unpacks the next slice (or resumes
  an in-progress one), runs the verify gate, and checkpoints each step to a slice
  file + commit. Pauses at stage boundaries and real decisions, in plain language.

## The slice loop (repeat per source)

1. **Acquire** — fetch + extract its pages → `raw_documents`.
2. **Ingest** — drain `raw_documents` → normalize → chunk → embed → corpus tables.
3. **Retrieve** — embedQuery → vectorSearch → ranked, cited results.
4. **Spot-check** — run real queries, eyeball quality; note findings in `sources.md`.

## Recon — 2026-05-22 (homepage GET, browser UA, follow redirects)

All six are reachable, server-rendered HTML, no SPA/JS-shell markers.

| Source | Home size | ~words | Note |
|--------|----------:|-------:|------|
| Starting With God | 44 KB | 723 | leanest → **slice #1** |
| EveryStudent | 60 KB | 1283 | lean; jfa saw 403s, returned 200 here with a browser UA |
| NextStep | 129 KB | 2009 | medium |
| Cru | 169 KB | 1871 | large site |
| Jesus Film Project | 158 KB | 3971 | large, owned |
| Sightline Ministry | 297 KB | 5218 | content-heavy |

("Challenge" greps were false positives from cloudflare-hosted asset URLs — the
high word counts confirm real content, not an anti-bot page.)

## Open decisions / blockers

- ~~`.env` missing `MCP_BEARER_TOKEN`~~ — resolved by **removing** the unused
  serving/auth vars (`MCP_PORT`, `MCP_BEARER_TOKEN`, `MCP_BEARER_SCOPES`,
  `CLIENT_HASH_SECRET`, `ADMIN_PASSWORD`) from `src/env.ts`. No code reads them
  yet; the env schema now declares only what's consumed (`DATABASE_URL`,
  `OPENROUTER_API_KEY`, `EMBED_MODEL_ID`). They return in step 6 with the MCP
  serving adapter that actually reads them.
- ~~Embedding model diverged from decision 1~~ — resolved: re-embedded on
  `openai/text-embedding-3-small` (both it and the nvidia free model are reachable
  via OpenRouter at 1536 dims; openai is the locked choice).
- ~~OpenRouter API key must be in `.env` before ingest~~ — present; Stage 2 ran.
- ~~First source = Starting With God~~ — confirmed; acquired + ingested.

## Process TODOs (deferred)

- **Seed-URL discovery → now informed by jfa.** We examined jfa's source registry
  (2026-05-25); the full findings are in
  **[docs/jfa-registry-findings.md](./jfa-registry-findings.md)** — read it before
  picking the next source or deciding how to crawl one. Two recurring forks are now
  written up as **architecture §11 FOLLOW-UP F** (adopt jfa's discovery-crawl policy
  shape — `seeds`+`allow`/`block`/`articleHints`+`contentSelectors`+`sitemaps`;
  trigger = first large source) and **FOLLOW-UP G** (Cloudflare/JS-walled sources —
  EveryStudent confirmed walled; bypass options listed). For small curated scopes
  (like `cru-10-basic-steps`, 12 ready-made URLs) the current hand-listed `seedPaths`
  code is still fine; neither follow-up is taken in slice #2.

## Done

- **Step 1** — bare-out + §6 schema + §5 enforcement gates (depcruise / max-lines / fakes-only).
- **Step 2** — Postgres storage adapters (CorpusWrite, CorpusSearch, FetchState) + in-memory fakes; integration-tested against docker Postgres.
- **2026-05-22** — lightweight tracking (this file) + vertical-slice build decision; reachability recon of all 6 sources.
- **Slice #1, Stage 1 (Acquire)** — RawDocumentStore port/fake/adapter, SourceRegistry + Starting With God entry, Acquisition context (normalizeUrl/extraction/acquireOne/acquireSource), HTTP Fetcher adapter, `pnpm acquire`. Live crawl staged **40/40 clean rows** in `raw_documents`. On `slice/starting-with-god`.
- **Slice #1, Stage 2 (Ingest)** — OpenRouter Embedder adapter, Ingestion context (normalize → jfa-ported chunk → embed → dedup → idempotent replaceDocument), RawDocumentReader read port/fake/adapter, `pnpm index`. Live run drained `raw_documents` → **40 docs / 183 chunks / 183 embeddings** (`openai/text-embedding-3-small`); idempotent re-run drains 0. 47 tests green. `pnpm index --force` = full re-index from the raw snapshot (used to re-embed off an accidental `.env` model override). On `slice/starting-with-god`.
- **Slice #1, Stage 3 (Retrieve)** — Retrieval context (`src/retrieval/`): `createRetriever` runs invariant 5 (embedQuery → vectorSearch candidate fan-out → minScore 0.3 cutoff → soft preferSourceKey tiebreak → 3-key dedup → citation). Wired into `main.wire()`; `pnpm query "<q>"` entry point; `scripts/eval.ts` step-5 TODO closed (drives the real Retriever). 12 fakes-only tests (59 total). Live query returns 5 distinct cited docs. **Decision:** 3-key dedup ⇒ at most one chunk per document (content-hash is doc-level). On `slice/starting-with-god`.
- **Slice #2 (Cru "10 Basic Steps", `cru-10-basic-steps`)** — full acquire → ingest → retrieve → eval on `slice/cru-10-basic-steps` (not yet merged). 11 docs / 35 chunks / 35 embeddings (AEM `.article-long-form` extraction). **Stage 4 built the per-source eval mechanism:** required `source` tag on golden cases, `pnpm eval --source <key>`, and a per-source breakdown (pure logic in `scripts/eval-metrics.ts`, unit-tested from `tests/`; +15 tests, 80 total). 10 persona-diverse cru golden cases authored. Whole-corpus eval (20 cases / 2 sources): recall@3 0.80 / recall@8 0.90 / MRR 0.62 / P@1 0.45; minScore **0.37 (FOLLOW-UP A re-confirmed, held)**. **Stage 4 also reframed the eval** (`8fbee09`) to source-agnostic questions + multi-source `relevant` maps scored on recall + coverage — v2 whole-corpus recall@10 1.00 / coverage 0.896 / P@1 0.80, per-source coverage cru 0.929 / swg 0.906 (resolved the v1 cru P@1 0.20 artifact). Remaining: accordion-TOC chunk hurts cru citation quality (extraction-side follow-up). See `docs/eval-approach.md`; Cru → Evaluated in `sources.md`.
