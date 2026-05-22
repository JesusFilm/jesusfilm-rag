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
- [ ] OpenRouter `Embedder` adapter (`openai/text-embedding-3-small`, 1536 dims, batch ≤100, dimension assertion); wired in main.
- [ ] Ingestion context: normalize (clean text, language/category/tags, contentHash) → chunk (500/50/min-20, paragraph-preserving) → embed → dedup gate; fakes-only unit tests.
- [ ] `scripts/index.ts`: drain `raw_documents` (ingested_at IS NULL) → idempotent `replaceDocument`; mark consumed rows.
- [ ] Verify: rows in documents/chunks/chunk_embeddings, chunk counts sane; re-run is idempotent (delete-then-insert, no duplicate chunks).

### 3. Retrieve → ranked results
- [ ] Retrieval context: embedQuery → vectorSearch (candidate fan-out, invariant 5) → cosine rank → minScore 0.3 → 3-key dedup → citation assembly; fakes-only unit tests.
- [ ] A query entry (script/test) returns ranked, cited hits from Starting With God.

### 4. Spot-check
- [ ] A handful of representative queries return relevant chunks (operator eyeballs); record findings in `sources.md`.

## Decisions made (this slice)
- 2026-05-22 — Source #1 = Starting With God — leanest of the six (44 KB / ~723 words home), server-rendered HTML, no anti-bot wall (STATUS recon).
- 2026-05-22 — Acquire scope = **bare fetch + extract + write, with a polite per-request delay** (`requestDelayMs` in the crawl policy). robots.txt fetch/disallow enforcement AND http-cache conditional fetch are **deferred** to a later step — neither is load-bearing for proving the loop on one lean site. ("as per robot" read as: behave politely with a delay, not parse robots.txt.)
- 2026-05-22 — Page discovery = **hardcoded seed list** of content URLs in the registry, not a discovery crawl. The generic-crawler-vs-per-source call stays deferred until 2–3 sources reveal the pattern (STATUS).
- 2026-05-22 — `RawDocumentStore` is the new write port for `raw_documents` (the §4 port list had no writer for the staging table); made idempotent per (source_key, canonical_url) on un-ingested rows so re-acquire doesn't duplicate.

## Open question / blocker
- none (OpenRouter key needed before Stage 2; acquire does not need it).

## Resume hint (for a cold start)
At: **Stage 2 (Ingest) — first sub-step: OpenRouter Embedder adapter.** Stage 1
is done: 40 clean rows sit in `raw_documents` (ingested_at IS NULL), ready to
drain. Next concrete action requires the OpenRouter API key in `.env`, then:
build `src/adapters/openrouter/` (Embedder over `openai/text-embedding-3-small`,
1536 dims, batch ≤100, dimension assertion) and wire it in main; then the
Ingestion context (normalize → chunk 500/50/min-20 → embed → dedup) and
`scripts/index.ts` to drain raw_documents → idempotent replaceDocument.
Last verify: green @ Stage 1 complete (depcruise/typecheck/lint/test, 29 tests;
live crawl 40/40 staged + DB spot-reads clean). Branch: slice/starting-with-god.
