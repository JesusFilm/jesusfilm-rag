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
      Findings recorded in "Decisions made" below.            <!-- sha: <this commit> -->
- [ ] 1b. Register `thelife` SourceEntry in `src/registry/`:
      `CrawlPolicy.sitemaps = ['/sitemap.xml']`, `articleHints` allowing
      `/articles/` AND `/devotionals/` (operator-chosen broad scope), `block`
      filtering out `/tags/`, `/author/`, `/series/`, `/about/`, `/chat/`,
      `/partners/`. Candidate content selector `.article-body` (recon found
      `class="article-body dropcap"` on a probed article). Fakes-only registry
      test asserts the registration shape (mirrors `sightline-ministry`/`jesusfilm-org`).
- [ ] 1c. **Dry discovery** — run `discover.ts` against live `/sitemap.xml`,
      confirm the filter math produces ~5,493 kept URLs (478 `/articles/` +
      5,015 `/devotionals/`). **OPERATOR PAUSE — confirm crawl + embedding
      budget** for ~5,500 docs before live fetch (the architectural risk is
      crowding small sources further; see FOLLOW-UP I).
- [ ] 1d. Live `pnpm acquire --source thelife` stages rows in `raw_documents`;
      spot-read content (real article / devotional prose, not nav/boilerplate);
      counts match discovery (minus too-thin skips). Verify gate green.

### 2. Ingest → corpus tables
- [ ] 2a. `pnpm index --source thelife` drains `raw_documents` →
      documents/chunks/embeddings; 1:1 chunks:embeddings; 0 chunk_count
      mismatches; chunks/doc sane; idempotent re-run drains 0. **Re-run the FULL
      gate** (integration tests query live PG — the slice-#3 lesson: a data stage
      can break a fixture with zero code changes; at ~5500 docs the corpus
      doubles, the risk is real).

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
      regressions (likely **stronger** small-source crowding given 5,500 docs ≈
      4× Sightline's 1,390 — feeds FOLLOW-UP I #15 with sharper data).
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
- (1b) Does `.article-body` cover both `/articles/` and `/devotionals/` shapes,
  or does `/devotionals/` use a different selector (e.g. `.spaces-content`)?
  Resolve at sub-step 1b by probing one of each.

## Resume hint (for a cold start)
At: Stage 1 — "1b. Register `thelife` SourceEntry". Sub-step 1a (recon) done in
this commit; the pivot is recorded above. Next concrete action: probe one
`/articles/` and one `/devotionals/` page to confirm the content selector covers
both shapes (open question above), then write the SourceEntry + registry test.
Last verify: green (baseline). Last commit: <this docs(slice) commit>. Branch:
slice/thelife.
