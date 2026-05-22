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
- [x] Acquisition context: `normalizeUrl()` (invariant 2 — strip fragments + tracking params, lowercase host, trim trailing slash), thin HTML extraction (node-html-parser; select `#content`, strip nav/sidebar/footer, decode entities, paragraph-preserving), `acquireOne` (fetch → extract → `RawDocument` w/ sha256 bodyHash, typed skips); fakes-only unit tests + real-fixture probe (clean 5698-char extraction).   <!-- sha: next -->
- [ ] HTTP `Fetcher` adapter in `src/adapters/http-fetch/` (browser UA, follow redirects, conditional headers honored, body returned for hashing); wired in main.   <!-- sha: ________ -->
- [ ] `scripts/acquire.ts` + `pnpm acquire --source <key>`: wires Acquisition with Fetcher + RawDocumentStore + registry, iterates seed URLs with the polite delay, writes RawDocuments. Typecheck + dry wire-up green.   <!-- sha: ________ -->
- [ ] Live run `pnpm acquire --source starting-with-god`: rows land in `raw_documents`; spot-read `raw_content` = real article text, not nav/boilerplate. Record counts + observations in `sources.md`.   <!-- sha: ________ -->

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
At: Stage 1 — "HTTP Fetcher adapter". Next concrete action: build
`src/adapters/http-fetch/` — a real `fetch()`-based Fetcher (browser UA, follow
redirects, honor ConditionalHeaders → If-None-Match/If-Modified-Since, return
the body string + etag/lastModified, status, notModified on 304) implementing
the `Fetcher` port; wire it into `main.wire()`. Adapters import only contracts.
(Network-dependent, so the live acquire run in the next sub-step is its
integration evidence; keep the adapter thin.)
Last verify: green @ sub-step 3 (depcruise/typecheck/lint/test, 24 tests incl. 6
acquisition tests; real-fixture extraction probe clean). Branch: slice/starting-with-god.
