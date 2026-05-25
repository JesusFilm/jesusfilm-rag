# Slice: Jesus Film Project (jesusfilm-org)

_Branch: `slice/jesusfilm-org` · Started: 2026-05-26 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get Jesus Film Project (jesusfilm.org) queryable end-to-end: acquire → ingest →
retrieve → spot-check. This is **slice #3** and the source that triggers
**FOLLOW-UP F** — the declarative **discovery-crawl** model. Slices #1–2
hand-listed exact paths; jesusfilm.org (~1,200 pages, owned) is too large for
that, so Stage 1 builds discovery (sitemap seed → allow∧articleHints filter →
drop block) once, for every large source after it. §3 already declares
Acquisition *owns* `allow`/`block` fetch policy; this finishes that.

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents (the discovery-crawl build)
- [x] 1a. Extend `CrawlPolicy` with discovery fields (`sitemaps`/`allow`/`block`/`articleHints`); keep `seedPaths` working so SwG + Cru still validate. Registry types + registry test.            <!-- sha: 1002dc9 -->
      <!-- seedPaths now optional; seedUrls() + acquire.ts log + registry test hardened; +1 discovery-shape test (79 total). -->
- [x] 1b. `src/acquisition/discover.ts`: fetch sitemaps via injected `Fetcher`, parse sitemap + sitemapindex (node-html-parser, recurse index→children), keep URLs matching allow∧articleHints, drop block, cap at maxPages. Fakes-only tests (canned XML).            <!-- sha: 1b-commit -->
      <!-- discoverUrls(deps, policy) → {urls, sitemapsFetched, totalSeen}; cycle guard + 404-skip + maxPages cap; 5 fakes-only tests (84 total). node-html-parser handles sitemap XML — no new dep. -->
- [ ] 1c. Wire discovery into `acquireSource` (discovery entries crawl discovered URLs; `seedPaths` entries unchanged). Fakes-only test: a discovery entry crawls the discovered set.            <!-- sha: ________ -->
- [ ] 1d. Probe jesusfilm.org sitemap + a real article DOM (read-only); register `jesusfilm-org` entry with confirmed `contentSelectors` + a conservative `maxPages`.            <!-- sha: ________ -->
- [ ] 1e. Live crawl → `raw_documents`; spot-read content is real article prose, not nav/boilerplate. (Pause before this to confirm discovered-URL count + crawl budget.)            <!-- sha: ________ -->

### 2. Ingest → corpus tables
- [ ] 2a. `pnpm index --source jesusfilm-org` drains raw_documents → documents/chunks/embeddings; counts sane; idempotent re-run drains 0.            <!-- sha: ________ -->

### 3. Retrieve → ranked results
- [ ] 3a. A real query returns ranked, cited jesusfilm.org hits in the now-3-source space.            <!-- sha: ________ -->

### 4. Spot-check / eval
- [ ] 4a. `/golden jesusfilm-org` + re-review existing `relevant` maps (the set is living); `pnpm eval` recall + coverage @ top-10; record per-source coverage across 3 sources.            <!-- sha: ________ -->

## Decisions made (this slice)
- 2026-05-26 — Source key is `jesusfilm-org` (matches jfa curation + our `cru-10-basic-steps` precedent), not the name-slug `jesus-film-project`.
- 2026-05-26 — Build the discovery crawler now (FOLLOW-UP F) rather than hand-listing a sub-scope. Operator-confirmed; jesusfilm.org is the named trigger source.
- 2026-05-26 — Parse sitemaps with the existing `node-html-parser` (sitemaps are trivial `<url><loc>` XML), **not** a new `fast-xml-parser` dep. Refines the earlier suggestion once we saw extract.ts already pulls node-html-parser.

## Open question / blocker
- none

## Resume hint (for a cold start)
At: Stage 1 — "1c. Wire discovery into `acquireSource`". Next concrete action:
in `src/acquisition/acquire.ts`, when a policy has `sitemaps`, build the URL
list via `discoverUrls()` instead of `seedUrls()` (union with any seedPaths),
then run the existing acquireOne loop unchanged. Inject the Fetcher (already a
dep). Add a fakes-only test: a discovery entry (canned sitemap + page bodies)
stages the discovered docs. Last verify: green (84 tests, 1b). Branch: slice/jesusfilm-org.
