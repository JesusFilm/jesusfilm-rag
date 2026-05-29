# Slice: thelife (thelife)

_Branch: `slice/thelife` · Started: 2026-05-29 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get **thelife.com** (Cru Canada's discipleship corpus, the live successor of the
decommissioned powertochange.com) queryable end-to-end: acquire → ingest →
retrieve → spot-check. This is **slice #5** and the **third source to reuse the
discovery-crawl machinery (FOLLOW-UP F) without new acquisition code** — thelife
is sitemap-driven (`/sitemap.xml`, 7,834 `<loc>` entries, no index), so the
slice-#3/#4 `discover.ts` handles it via `CrawlPolicy.sitemaps` +
`articleHints`/`block` filtering. **First time the crawler runs against a
Statamic site** (slice #3/#4 were WordPress/Yoast) — recon found a flat sitemap
and conventional HTML, no SPA shell.

**Important pivot — read before resuming.** The slice was initially unpacked as
`power-to-change` (jfa key, ~1200 sitemap-driven). Recon on 2026-05-29 found
powertochange.com fully decommissioned: every probed content URL 301-redirects
to thelife.com (or to issuesiface.com for the `/discover/` + `/itv/` "issues"
sub-axis). Staging powertochange.com would yield 1000 redirect-to-homepage rows.
The actual Cru Canada discipleship corpus lives at **thelife.com** now —
Statamic-powered, fresh content (6,478 entries `lastmod` 2026), open robots —
so we pivoted the slice. Issues I Face stays its own backlog row (no sitemap;
needs a different discovery path).

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents (reuse the discovery crawler)
- [x] 1a. **Recon** — homepage + robots + sitemap probed under browser UA;
      decided the pivot from powertochange.com → thelife.com and the scope.
      Findings recorded in "Decisions made" below.            <!-- sha: 86a98c4 -->
- [x] 1b. Register `thelife` SourceEntry in `src/registry/` with one flat
      `/sitemap.xml`, `.article-body` content selector (confirmed on BOTH
      articles AND devotionals). **Initial articleHints were wrong** — see
      1c below; corrected as part of the dry-discovery commit.            <!-- sha: cb4281d -->

- [x] 1c. **Dry discovery** + **policy correction**. Ran `discover.ts` against
      live `/sitemap.xml`; the initial filter math was wrong because the
      recon's path-distribution awk hid the real URL structure. Corrected
      and re-ran.

      _True URL shape on thelife.com_:
      - **Articles live at bare-root** single-segment slugs `/<slug>` (628 in
        sitemap, ~5 are nav/utility blocked → **623 article slugs**).
      - `/articles/...` namespace contains ONLY tag-index pages
        (`/articles/tags/<tag>`) — 478 of them, NOT articles.
      - **Devotionals** at `/devotionals/<slug>` — **3,929**.
      - `/devotionals/tags/<tag>` is another 1,086 tag indexes (fail
        single-segment hint, drop).

      `articleHints` updated to `^/[^/]+/?$` (bare-root) + `^/devotionals/[^/]+/?$`
      (single-segment devotional). `block` extended to catch the nav/utility
      bare-root slugs that match the broader hint (`chat`, `give`, `partners`,
      `about`, `contact`, `error-report`, `content-submission-form`,
      `chat-terms-of-service`, `editorial-*`, `writing-for-the-internet`) and
      defensive section indexes. Registry test rewritten to assert the new
      shape — articles at bare-root kept; `/articles/tags/*` dropped; nav
      slugs dropped; off-shape paths dropped.

      **Dry-discovery result: 4,552 kept / 7,834 seen** (3,929 devotionals
      + 623 articles). `maxPages` lowered 6000 → 5000.            <!-- sha: 1c-commit -->

      **OPERATOR PAUSE — confirm crawl + embedding budget** for 4,552 docs
      before live fetch. Numbers: crawl ~114 min at 1500ms delay; embed cost
      ~$0.11 at ~2.5 chunks/doc (Sightline's average) × ~500 tok/chunk × $0.02/M
      tokens for `text-embedding-3-small`.
- [ ] 1d. Live `pnpm acquire --source thelife` stages rows in `raw_documents`;
      spot-read content (real article / devotional prose, not nav/boilerplate);
      counts match discovery (4,552 minus too-thin skips). Verify gate green.

### 2. Ingest → corpus tables
- [ ] 2a. `pnpm index --source thelife` drains `raw_documents` →
      documents/chunks/embeddings; 1:1 chunks:embeddings; 0 chunk_count
      mismatches; chunks/doc sane; idempotent re-run drains 0. **Re-run the FULL
      gate** (integration tests query live PG — the slice-#3 lesson: a data stage
      can break a fixture with zero code changes; at ~4,552 docs the corpus
      ~3× grows, the risk is real).

### 3. Retrieve → ranked results
- [ ] 3a. A handful of discipleship / devotional / life-issues queries return
      ranked, cited `thelife` hits in the 5-source space; dedup intact;
      cross-source health (swg/cru/jf/sightline still surface on their topics);
      **re-confirm `minScore 0.37`** at 5 sources (off-scope nulls; faith-adjacent
      below the positive band).

### 4. Spot-check / eval (via `/golden`)
- [ ] 4a. `/golden thelife` adds discipleship/devotional cases + re-reviews the
      living `relevant` maps of existing 42 cases (the set is living — slice
      #3/#4 lesson). Whole-corpus eval @ top-10 (recall@3 / recall@10 / coverage /
      MRR / P@1); per-source breakdown across 5 sources. Honest log of any
      regressions (likely **stronger** small-source crowding given 4,552 docs ≈
      3.3× Sightline's 1,390 — feeds FOLLOW-UP I #15 with sharper data).
      Update `sources.md` → `Evaluated` with concrete `Results`.

## Decisions made (this slice)
- 2026-05-29 — **Pivoted target from powertochange.com → thelife.com.** Recon
  found powertochange.com 301-redirects every content URL (homepage → thelife.com;
  `/discover/`, `/itv/` → issuesiface.com). Sitemap exists (1000 stale WP entries
  2014-2017) but content is gone. thelife.com is the live Cru Canada successor:
  Statamic, fresh sitemap (7,834 locs, 6,478 with lastmod 2026), open robots.
  Source-key renamed `power-to-change` → `thelife` to match URLs and the 1:1
  file↔key convention.
- 2026-05-29 — **Scope = articles + devotionals (~5,500 docs)**, operator-chosen
  over articles-only (478) or devotionals-only (5,015). Explicitly taking the
  broader scope despite slice #4's small-source crowding signal (FOLLOW-UP I).
  Expected consequence: per-source coverage for cru/swg/sometimes jf likely
  drops further in the eval — that's a sharper signal for #15, not a regression.
- 2026-05-29 — **First Statamic source.** Recon-validated content selector
  `.article-body` (probed `/10-spiritual-questions-and-their-answers` → 200,
  `class="article-body dropcap"`); to be confirmed against a `/devotionals/`
  sample at sub-step 1b. Open robots (`Disallow:` empty).

## Open question / blocker
- ~~(1b) Does `.article-body` cover both `/articles/` and `/devotionals/`
  shapes?~~ **Resolved 2026-05-29 at 1b:** yes — probed
  `/devotionals/a-higher-calling` → `<section class="article-body dropcap">`,
  identical to articles.
- none

## Resume hint (for a cold start)
At: Stage 1 — operator pause after 1c. 1a (recon + pivot), 1b (register source —
articleHints initially wrong) and 1c (dry discovery + policy correction) done;
the live `/sitemap.xml` produces **4,552 kept URLs** (3,929 devotionals + 623
articles). **Waiting on operator confirmation of the crawl + embedding budget
(~114 min crawl @ 1500ms, ~$0.11 embed)** before 1d (live `pnpm acquire`). Last
verify: green (depcruise 0/75, tests 112/112). Last commit: 1c. Branch:
slice/thelife.
