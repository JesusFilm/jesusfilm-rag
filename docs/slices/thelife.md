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
- [x] 1d. Live `pnpm acquire --source thelife` stages rows in `raw_documents`
      across **two passes** (Cloudflare 429s drove a delay adjustment, see
      below). Pass 1 @ 1000ms: 2,520 / 4,552 staged · skipped 2,025
      fetch-failed (2,018 were HTTP 429, 1.7s sustained limit on this site).
      Pass 2 @ 2000ms: 4,446 / 4,552 staged · skipped 96 fetch-failed (80
      HTTP 429, 1.8% — proves 2,000 ms is comfortably under Cloudflare's rate
      limit). **Union of both passes in `raw_documents` = 4,485 distinct rows
      (98.5% of target)**: 616 bare-root articles + 3,869 devotionals; all
      status 200, 0 null titles; chars min 252 / avg 2,454 / max 24,164.
      Spot-read 5 random rows = real prose ("The Life ::" titles, devotionals
      ~2 k chars, articles ~5 k chars). 67 URLs unaccounted (presumably stuck
      429s + a handful of 404s); not worth a third pass for ~1.5% — the slice
      corpus is set.            <!-- sha: 1d-commit -->
      <!-- requestDelayMs change 1000→2000ms is the only registry change in this commit. Pass 1 log archived at /tmp/thelife-acquire-pass1.log. Verify green: depcruise 0/75, tests 112/112. -->


### 2. Ingest → corpus tables
- [x] 2a. `pnpm index --source thelife` drained all 4,485 pending raw rows →
      **4,485 docs / 7,905 chunks / 7,905 embeddings** (`openai/text-embedding-3-small`,
      1:1 chunks:embeddings, 0 nulls dropped). **0 chunk_count mismatches**;
      chunks/doc **min 1 / avg 1.76 / max 17** (lower than Sightline's 2.5 — short
      devotionals dominate). Idempotent re-run drained 0. Spot-read 3 random chunks =
      clean devotional prose, no nav/boilerplate. **Full gate green after ingest**:
      depcruise 0/75, lint 0/4 (pre-existing warnings), typecheck clean,
      **112/112 tests** — the slice-#3/#4 integration-fixture risk did NOT bite
      despite ~3.2× corpus growth (4 → 5 sources, ~6.5 k docs total).            <!-- sha: f50e2e7 -->


### 3. Retrieve → ranked results
- [x] 3a. Spot-retrieval against the 5-source space (~14.7 k chunks): 6 queries
      via `pnpm query`. **thelife dominates its native topics with cross-source
      health preserved:**
      - "how do I grow as a disciple of Jesus?" → top 3 thelife (0.706/0.666/0.666),
        #4–5 jesusfilm-org (0.643/0.632). jf surfaces alongside.
      - "I'm anxious and can't sleep — what does the Bible say?" → **all 5 thelife**
        (0.594→0.572). **FOLLOW-UP I/J small-source crowding signal manifesting
        exactly as predicted** by the operator at slice-unpack; not a regression.
      - "is Christianity intolerant?" → #1 sightline (0.686), #2 jf (0.673), #3–5
        sightline. The slice-#3 `jf-skeptic-intolerant` gap that slice #4 closed
        remains closed.
      - "how can I be sure I will go to heaven?" → #1 thelife (0.551), **#2 swg
        "How to Be Sure of Heaven" (0.548)** — the slice-#1 flagship doc still
        surfaces (edged by 0.003); sightline #5. Cross-source health preserved.
      **Dedup intact** — every query returned 5 distinct URLs / 5 distinct
      documents; 3-key content-hash dedup holds at 5 sources.
      **minScore 0.37 holds at 5 sources:**
      - "best index fund to buy in 2026" → **0 hits** (secular floor unchanged).
      - "what does Ramadan teach about fasting?" → 5 hits 0.401–**0.495**, all
        legitimate Christian-fasting content (Jesus fasting, spiritual discipline)
        — the corpus has no Islamic content, so this is honest topic overlap on
        "fasting", below the typical 0.55+ positive band. Note: top edged above
        the historical Quran/Ramadan 0.389 reference; flag for re-check during
        Stage 4 curation but not a noise breakthrough (results aren't off-topic
        — they're on a different framing of the same word).            <!-- sha: ________ -->

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
At: **Stage 3 (Retrieve) complete; operator pause before Stage 4 (eval via
`/golden`)**. Stages 1, 2, 3 all green. 5-source corpus (~14.7 k chunks) is
queryable end-to-end; thelife dominates devotional/life-issues queries,
cross-source health preserved on apologetics (sightline #1, jf #2) and
assurance (thelife #1 by 0.003 over swg #2); 3-key dedup intact; minScore 0.37
holds (secular = 0; Ramadan/fasting cluster legitimately on-topic Christian
fasting at 0.40–0.495, below the 0.55+ positive band). Next concrete action:
**Stage 4** — `/golden thelife` adds discipleship/devotional cases + re-reviews
the living `relevant` maps of existing 42 cases (the set is living — slice
#3/#4 lesson). Run whole-corpus eval @ top-10 (recall@3 / recall@10 / coverage
/ MRR / P@1) + per-source breakdown across 5 sources; honest log of the
predicted small-source crowding regressions (sharper FOLLOW-UP I #15 data, not
a retrieval regression). Last verify: green (depcruise 0/75, tests 112/112).
Last commit: 3a (sha pending). Branch: slice/thelife.
