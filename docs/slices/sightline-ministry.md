# Slice: Sightline Ministry (sightline-ministry)

_Branch: `slice/sightline-ministry` · Started: 2026-05-27 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get Sightline Ministry (sightlineministry.org) queryable end-to-end: acquire →
ingest → retrieve → spot-check. This is **slice #4** and the first source to
**reuse the slice-#3 discovery-crawl machinery (FOLLOW-UP F) unchanged** — no new
acquisition code. Sightline is the same WordPress/Yoast shape as jesusfilm.org
(`sitemap_index.xml`, serves 200, empty `Disallow:`, no challenge wall — probed
2026-05-27). Its distinctive value is the **apologetics / skeptic / evidence** axis
(titles like "Doesn't believing in God require faith?", "Why does God seem hidden
from us?", "Three signs you've got the wrong god") — directly targeting the two
honest skeptic misses left open at the end of slice #3.

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents (reuse the discovery crawler)
- [x] 1a. Register `sightline-ministry` SourceEntry (content sitemaps per the budget
      decision below, `.o-longform-content__content` selector, allow/block/articleHints,
      maxPages) + registry test.            <!-- sha: 5903b2a -->
      <!-- partner discovery source seeding /post-sitemap.xml + /daily-devo-sitemap.xml; articleHints validated against live sitemaps (414 posts + 1000 devos kept, 2 index pages dropped); +2 registry tests (110 total). Verify green. -->

- [x] 1b. Live crawl → `raw_documents`; spot-read content is real apologetics prose,
      not nav/boilerplate. (Budget confirmed below before crawling.)            <!-- sha: 1b-commit -->
      <!-- Discovery: 2 sitemaps → 1392 unique kept (22 sitemap dups + 2 index pages dropped by the Set/filters). Crawl staged 1390/1392, 2 skipped too-thin (<250 chars). raw_documents: 1390 rows, all status 200, 0 null titles, 1390 distinct canonical_url, chars min 494 / avg 3429 / max 18993, 0 ingested. Spot-read: apologetics posts ("Is Christianity Intolerant?", "Doesn't Believing in God Require Faith?") = clean prose; shortest (494ch) is a reader testimonial (real, above floor). Full gate re-run green (110 tests). -->


### 2. Ingest → corpus tables
- [x] 2a. `pnpm index --source sightline-ministry` drains `raw_documents` →
      documents/chunks/embeddings; counts sane; 1:1 chunks:embeddings; idempotent
      re-run drains 0. **Re-run the FULL gate** (integration tests query live PG).            <!-- sha: 2a-commit -->
      <!-- Drained all 1390 → 1390 docs / 3470 chunks / 3470 embeddings (1:1, no null-embeds dropped). Single model openai/text-embedding-3-small; 0 chunk_count mismatches; chunks/doc min 1 / avg 2.5 / max 12 (devos lean ~1-2, apologetics 3-4+). Idempotent re-run drained 0. Full gate re-run GREEN (110 tests) — the 4x corpus growth did NOT break a fixture (slice #3 lesson held). Corpus now 4 sources. -->


### 3. Retrieve → ranked results
- [x] 3a. A real apologetics/skeptic query returns ranked, cited sightline hits in
      the now-4-source space; dedup intact; cross-source health checked.            <!-- sha: 3a-commit -->
      <!-- "Is Christianity intolerant…?" → Sightline's own "Is Christianity Intolerant?" RANK 1 (0.616), jf's at #2 — directly addresses the slice-#3 jf-skeptic-intolerant miss. "What proof God exists?" → 5 Sightline apologetics docs (0.647 top: first-cause/personal-experience/God-Delusion). "Blind faith?" → faith-apologetics incl. the exact doc. Cross-source HEALTH: "sure of heaven" → swg "How to Be Sure of Heaven" still #1 (0.677), swg 3/5; "begin a relationship with God" → swg "New Christian" #1 — other sources NOT drowned. minScore 0.37 HOLDS @ 4 sources: secular (index funds) 0 hits; faith-adjacent Quran/Ramadan top 0.389 (unchanged from slice #3, noise floor not raised). Dedup intact (distinct URLs). Note: Sightline has near-duplicate REPUBLISHED devotionals (annual re-runs, -2/-7 slugs) the 3-key dedup doesn't collapse (near-, not exact-dup) — citation-quality nit, candidate follow-up. Retrieval prebuilt + source-agnostic; no code change. -->


### 4. Spot-check / eval
- [ ] 4a. `/golden sightline-ministry` (new skeptic-axis cases) + re-review living
      `relevant` maps (the set is living — slice #3 lesson); `pnpm eval` recall +
      coverage @ top-10; per-source breakdown across 4 sources. Re-check the 2
      slice-#3 skeptic misses now that Sightline is in the corpus.            <!-- sha: ________ -->

## Dry discovery (probed read-only, 2026-05-27)
`sitemap_index.xml` → 16 child sitemaps. URL counts per child:

| Sitemap | URLs | Content? | Selector |
|---|--:|---|---|
| `post-sitemap.xml` | 415 | **yes — apologetics/teaching posts** (`/<slug>/`) | `.o-longform-content__content` ✓ |
| `daily-devo-sitemap.xml` | 1001 | yes — daily devotionals (`/daily-devo/<slug>/`) | `.o-longform-content__content` ✓ |
| `resource-sitemap.xml` | 45 | hub pages (`/resources/<cat>/<slug>/`) | **card template** (`.o-principle-block`), not prose → excluded |
| `page-sitemap.xml` | 65 | mixed (about/contact/landing) — not teaching | — |
| `asset-sitemap.xml` | 470 | assets/media — not content | — |
| `post_tag` / `category` / `author` / `contributor` / `region` / `global-location` | 124/28/1/14/1/4 | taxonomy listings | — |
| `event` / `press-release` / `job-listing*` | 5/30/12+3 | not teaching | — |

(Each content sitemap also lists one bare index page — `/blog/`, `/daily-devotions/`,
`/resources/` — dropped by an `articleHints` slug filter.)

## Decisions made (this slice)
- 2026-05-27 — Source key is `sightline-ministry` (matches jfa curation).
- 2026-05-27 — Reuse slice #3's discovery crawler **unchanged**; Sightline is the
  same WP/Yoast shape as jesusfilm.org. No new acquisition code.
- 2026-05-27 — Scope by **seeding specific content sitemaps**, NOT the index + URL
  regex: posts live at bare-root `/<slug>/` (indistinguishable by path from
  `page`/`contact` entries), so seeding the index would pull asset (470), post_tag
  (124), category, author, event, job sitemaps. Seeding `post-sitemap.xml` (+ optionally
  `daily-devo-sitemap.xml`) scopes precisely to teaching content.
- 2026-05-27 — Resources (45) use a `.o-principle-block` card/hub template, not
  `.o-longform-content__content` — excluded (would extract as nav, not prose).
- 2026-05-27 — Crawl budget/scope: **posts + daily devotionals (~1,414)** — operator
  chose the broader scope (2026-05-27). Seed `post-sitemap.xml` (415 → 414 after
  dropping `/blog/`) + `daily-devo-sitemap.xml` (1001 → 1000 after dropping
  `/daily-devotions/`). `maxPages` 1600 (headroom). Resources still excluded
  (card template). Embedding $ trivial; ~35 min polite crawl at 1500ms.

## Open question / blocker
- none — budget confirmed (posts + devotionals). Live crawl runs in 1b.
- Note: discovery keeps **1,392 unique** articles, not 1,414 — the Yoast sitemaps
  contain 22 duplicate URLs (post 415→414 unique; devo 1001→980 unique), which
  `discoverUrls`'s `Set` correctly collapses (no double-indexing). 1,392 = 413
  posts (414 − `/blog/` index) + 979 devos (980 − `/daily-devotions/` index).

## Pre-curation eval (read-only, 2026-05-27 — the living-set artifact)
Whole-corpus `pnpm eval` on the **stale 32 cases** (no Sightline in any `relevant`
map yet) against the **4-source** corpus: recall@3 **0.688** · recall@10 **0.969** ·
coverage **0.618** · MRR 0.565 · P@1 0.375. Per-source: jf **0.913/0.779**
(unchanged) · swg 0.611/0.419 (was 0.833) · cru 0.357/0.321 (was 0.714). recall@10
*rose* to 0.969 — expected docs are still in top-10, just **displaced from top ranks**
by genuinely-relevant Sightline content. Classic stale-living-set artifact (slice #3:
0.85→0.938), **not** a retrieval regression. Fix = `/golden` curation, not an engine
change. (Wrote `eval/results-2026-05-27.md`; will be overwritten by the curated run.)

## Resume hint (for a cold start)
At: **Stages 1–3 GREEN & committed** (1a `5903b2a` · 1b `35dc82a` · 2a `b34ffa9` ·
3a `c966bd6`). Corpus is now **4 sources**: Sightline = 1390 docs / 3470 chunks /
3470 embeddings, retrievable + cited, minScore 0.37 holds. **PAUSED at the Stage 4
boundary (eval).** Next concrete action: **`/golden` curation** — (A) re-review the
32 existing cases' living `relevant` maps to credit genuinely-relevant Sightline docs
(this recovers the displaced cru/swg coverage above), and (B) add new Sightline
skeptic-axis cases; then re-run `pnpm eval` for the curated 4-source numbers + re-check
the 2 slice-#3 skeptic misses (jf-skeptic-intolerant now has Sightline #1). Branch:
slice/sightline-ministry. Baseline green.
