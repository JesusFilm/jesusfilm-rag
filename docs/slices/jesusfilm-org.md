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
- [x] 1b. `src/acquisition/discover.ts`: fetch sitemaps via injected `Fetcher`, parse sitemap + sitemapindex (node-html-parser, recurse index→children), keep URLs matching allow∧articleHints, drop block, cap at maxPages. Fakes-only tests (canned XML).            <!-- sha: 2dabb74 -->
      <!-- discoverUrls(deps, policy) → {urls, sitemapsFetched, totalSeen}; cycle guard + 404-skip + maxPages cap; 5 fakes-only tests (84 total). node-html-parser handles sitemap XML — no new dep. -->
- [x] 1c. Wire discovery into `acquireSource` (discovery entries crawl discovered URLs; `seedPaths` entries unchanged). Fakes-only test: a discovery entry crawls the discovered set.            <!-- sha: 7798079 -->
      <!-- resolveAcquireUrls(): sitemaps→discoverUrls (∪ any seedPaths), else seeds; capped at maxPages. +1 acquireSource discovery test (85 total). -->
- [x] 1d. Probe jesusfilm.org sitemap + a real article DOM (read-only); register `jesusfilm-org` entry with confirmed `contentSelectors` + `maxPages`.            <!-- sha: 6f12fce -->
      <!-- Probed: WP/Yoast, Cloudflare-200 (no wall). Corpus = ~351 /blog/ posts; /give/+page-sitemap+.kml filtered. Entry: owned, sitemap_index.xml seed, allow same-host, articleHints /blog/<slug>/, block robots-disallows+/give/+.kml/.pdf, content .entry-content (strip related-posts). maxPages 400 (operator: full crawl). +1 registry test (86 total). -->
- [x] 1e. Live crawl → `raw_documents`; spot-read content is real article prose, not nav/boilerplate. (Budget approved: full ~351.)            <!-- sha: 1e-commit -->
      <!-- Discovery: sitemap_index.xml → 4 child sitemaps, 417 locs seen → 349 kept (2 bare /blog/ index pages + all /give/ + .kml correctly dropped). Crawl: staged 349/349, 0 skips. raw_content chars min 1796 / avg 9443 / max 45980. All 349 titles populated; 0 bodies start with nav text; largest (parables-of-jesus) is clean prose end-to-end. -->

### 2. Ingest → corpus tables
- [x] 2a. `pnpm index --source jesusfilm-org` drains raw_documents → documents/chunks/embeddings; counts sane; idempotent re-run drains 0.            <!-- sha: 2a-commit -->
      <!-- 349 inserted / 0 skipped → 349 docs / 2114 chunks / 2114 embeddings (1:1, no null-embeds dropped); chunks/doc avg 6.1. Single model openai/text-embedding-3-small; 0 chunk_count mismatches. Idempotent re-run drained 0. Data-only step → unit gate unchanged (86 tests, green). -->

### 3. Retrieve → ranked results
- [x] 3a. A real query returns ranked, cited jesusfilm.org hits in the now-3-source space.            <!-- sha: 3a-commit -->
      <!-- "parables of Jesus" → 5 cited jesusfilm.org articles, top 0.712. "share the gospel/witness" → 5 evangelism articles (0.65–0.69). Dedup intact (distinct URL/doc), scores healthy. Cross-source health: "assurance of heaven" → 4 swg + 1 jf (swg holds); "new-believer daily prayer" → 4 jf + 1 swg, **0 cru** (cru step-4 prayer displaced — carry to Stage 4 per-source coverage). Retrieval is source-agnostic + prebuilt; no code change. -->

### 4. Spot-check / eval
- [~] 4a. `/golden jesusfilm-org` + re-review existing `relevant` maps (the set is living); `pnpm eval` recall + coverage @ top-10; record per-source coverage across 3 sources.            <!-- sha: (pending /golden) -->
      <!-- PRE-CURATION baseline run (3-source corpus, existing 20 stale cases): recall@3 0.75 / recall@10 0.85 / coverage 0.746 / MRR 0.602 / P@1 0.45; per-source cru 0.714 / swg 0.728 — DOWN from slice-#2 (0.95/1.00/0.896; cru 0.929/swg 0.906). DIAGNOSED as a stale-living-set artifact, NOT a retrieval regression: the 3 misses (swg-newcomer-gospel, cru-believer-witnessing, cru-newcomer-prayer) are displaced by genuinely-relevant jesusfilm.org docs (gospel→what-is-the-gospel(-really); witnessing→overcoming-fear/tips-getting-over-fear; prayer→how-to-pray/prayer-tips/why-do-we-pray + swg still at ranks 7&10). FIX = curation: operator runs /golden jesusfilm-org (drafts new cases AND re-scans the 20 prior cases for newly-relevant jf docs per eval-approach §"Relevant sets are LIVING"), then re-run pnpm eval. NOT done by hand (project norm). -->

## Decisions made (this slice)
- 2026-05-26 — Source key is `jesusfilm-org` (matches jfa curation + our `cru-10-basic-steps` precedent), not the name-slug `jesus-film-project`.
- 2026-05-26 — Build the discovery crawler now (FOLLOW-UP F) rather than hand-listing a sub-scope. Operator-confirmed; jesusfilm.org is the named trigger source.
- 2026-05-26 — Parse sitemaps with the existing `node-html-parser` (sitemaps are trivial `<url><loc>` XML), **not** a new `fast-xml-parser` dep. Refines the earlier suggestion once we saw extract.ts already pulls node-html-parser.
- 2026-05-26 — Crawl budget: full crawl (maxPages 400, all ~351 /blog/ posts). Operator-chosen.
- 2026-05-26 — The Stage-4 pre-curation eval drop is a **stale living-relevant-set artifact, not a retrieval regression** (diagnosed: misses are displaced by valid jf answers). Fix is curation via `/golden`, per the documented LIVING-set workflow — not a retrieval/minScore change.

## Open question / blocker
- **Stage 4 needs operator action:** run `/golden jesusfilm-org` (it's
  disable-model-invocation by design — golden cases are curated, not
  auto-written). That drafts new jesusfilm-org cases AND re-scans the 20 prior
  cases for newly-relevant jf docs (the displaced gospel/witnessing/prayer
  docs). Then re-run `pnpm eval`. Until then the slice is at Stage 4 (not done).
- Minor: `pnpm eval` wrote `eval/results-2026-05-25.md` on 2026-05-26 (the dated
  results filename looks stale/hardcoded). Out of slice scope; noted.

## Resume hint (for a cold start)
At: Stage 4 — "4a. Eval", awaiting operator `/golden jesusfilm-org`. Stages 1–3
done (349 docs ingested + retrievable). Pre-curation eval baseline captured +
diagnosed (stale living set, not a regression). Next concrete action (OPERATOR):
`/golden jesusfilm-org` to draft new cases + re-scan the 20 prior cases for
newly-relevant jf docs; then `pnpm eval` and confirm recall/coverage recovers.
Last verify: green (86 tests). Branch: slice/jesusfilm-org.
