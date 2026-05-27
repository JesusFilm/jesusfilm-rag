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
      maxPages) + registry test.            <!-- sha: 69250c2 -->
      <!-- partner discovery source seeding /post-sitemap.xml + /daily-devo-sitemap.xml; articleHints validated against live sitemaps (414 posts + 1000 devos kept, 2 index pages dropped); +2 registry tests (110 total). Verify green. -->

- [ ] 1b. Live crawl → `raw_documents`; spot-read content is real apologetics prose,
      not nav/boilerplate. (Budget confirmed below before crawling.)            <!-- sha: ________ -->

### 2. Ingest → corpus tables
- [ ] 2a. `pnpm index --source sightline-ministry` drains `raw_documents` →
      documents/chunks/embeddings; counts sane; 1:1 chunks:embeddings; idempotent
      re-run drains 0. **Re-run the FULL gate** (integration tests query live PG).            <!-- sha: ________ -->

### 3. Retrieve → ranked results
- [ ] 3a. A real apologetics/skeptic query returns ranked, cited sightline hits in
      the now-4-source space; dedup intact; cross-source health checked.            <!-- sha: ________ -->

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
- none — budget confirmed (posts + devotionals, ~1,414). Live crawl runs in 1b.

## Resume hint (for a cold start)
At: Stage 1 — awaiting the operator's budget/scope decision before registering the
entry + live crawl. Dry discovery done (post 415 / daily-devo 1001 / resource 45 /
page 65 / asset 470 + taxonomy). Content selector confirmed `.o-longform-content__content`
on posts + devos (resources use a card template). Next concrete action: operator
picks scope → write `src/registry/sightline-ministry.ts` + test → dry `discoverUrls`
to confirm exact count → live crawl. Branch: slice/sightline-ministry. Baseline green.
