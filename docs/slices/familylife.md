# Slice: FamilyLife (familylife)

_Branch: `slice/familylife` · Started: 2026-06-03 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get **FamilyLife.com** (Cru's marriage & family ministry, WordPress VIP)
queryable end-to-end: acquire → ingest → retrieve → spot-check. This is
**slice #6** and the **fourth source to reuse the discovery-crawl machinery
(FOLLOW-UP F) without new acquisition code** — FamilyLife is sitemap-driven
(`/sitemaps.xml` → 30 child sitemaps, WordPress/Yoast-style) so the
slice-#3/#4/#5 `src/acquisition/discover.ts` handles it via
`CrawlPolicy.sitemaps` + `articleHints`/`block` filtering. **Topical purpose:**
the corpus currently lacks a strong marriage/parenting axis — five sources
covering seeker Q&A, discipleship, apologetics, and devotionals leave family
ministry under-served. FamilyLife fills that gap.

## Recon (2026-06-03)

- **Homepage:** `https://www.familylife.com/` → 200, 480 KB, browser UA, no
  challenge wall.
- **robots.txt:** `User-agent: * / Disallow: /wp-admin/` (open); sitemap
  pointer `https://www.familylife.com/sitemaps.xml`.
- **Sitemap index:** **30 child sitemaps** — primary spiritual content is the
  three post-sitemaps (WordPress "post" content type):
  - `post-sitemap1.xml` — 939 locs (lastmod 2026): **783 `/articles/` + 155
    `/equip/` + 1 homepage `/`**
  - `post-sitemap2.xml` — 997 locs (lastmod 2018): all `/articles/`
  - `post-sitemap3.xml` — 394 locs (lastmod 2012): all `/articles/`
  - **= 2,330 posts total = 2,174 `/articles/` + 155 `/equip/` + 1 homepage.**
    The `/equip/` URLs are FamilyLife Equip teaching content (mentoring,
    discipleship-of-a-new-Christian, leaving-an-abusive-relationship) using the
    same WP post template + the same `.the-content` selector as `/articles/` —
    legitimate teaching, kept. Homepage dropped by `articleHints`.
- Other significant sitemaps: `page-sitemap1` (254 hub/landing), `podcast-sitemap*`
  (~1k+ episodes), sub-brand sitemaps (art-of-marriage, blended, stepping-up,
  weekend-to-remember, missions, etc. — mixed teaching/marketing/conference).
- **Sample article shape:** `/articles/topics/parenting/essentials/fathers/
  7-essentials-to-help-you-be-the-spiritual-leader-of-your-family/` — 300 KB
  page; visible content selectors include `.the-content` and
  `.single-content.single-post-content`. WordPress.
- **jfa estimate:** ~15,000 pages total across all sub-brands. Posts-only scope
  is what makes this slice tractable.

## Scope (locked 2026-06-03 at Step 2.5)

**Scope A — posts only, ~2,330 URLs** from `post-sitemap1` (939) +
`post-sitemap2` (997) + `post-sitemap3` (394). Operator-confirmed this is the
primary teaching content; sub-brands can layer later as Cru-style scoped
sub-keys (`familylife-blended` etc.) only if the eval shows real gaps —
that's the proven pattern.

Policy intent: `sitemaps: ['/sitemaps.xml']`, `articleHints: ['/articles/']`,
`block: ['/wp-admin/', '/cart/', '/podcast/']`, sub-brand sitemaps not
seeded (they're listed by the sitemap index but `articleHints` filters out
anything that doesn't live under `/articles/`).

**Estimated embed cost:** ~2,330 docs × ~3 chunks/doc avg ≈ ~7k chunks
(slightly above Sightline's 3,470; well below thelife's 7,905). At
`text-embedding-3-small` rates this is negligible (<$0.10). Re-confirmed at
1b dry discovery before the live crawl per skill Step 4.

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents (reuse the discovery crawler)
- [x] 1a — Register `familylife` SourceRegistry entry: discovery source seeding
      the three post-sitemaps directly (sightline pattern, bypassing the index
      to avoid 27 unrelated sub-brand sitemaps). `articleHints` keep
      `/articles/<...>` AND `/equip/<...>` (both WP-post + same selector);
      `block` defensives wp-admin / cart / podcast / .kml / .pdf. Content
      selector `.the-content` preferred, `.single-content` fallback.
      Fakes-only tests cover hint+block behavior on real sample URLs.
      <!-- sha: d5abfd4 -->
- [x] 1b — **Dry discovery** (operator-confirmed 2026-06-03, budget approved):
      ran the policy's allow/hint/block regexes against `<url><loc>` from the
      three post-sitemaps. **2,330 seen → 2,329 kept**, 1 dropped (the `/`
      homepage post-sitemap1 lists). Distribution: 2,174 `/articles/` +
      155 `/equip/`. Zero unexpected drops, zero unexpected keeps. Crawl
      time estimate: ~58 min at 1,500 ms polite delay. Embed cost <$0.10
      at `text-embedding-3-small`. No policy change needed. <!-- sha: ________ -->
- [ ] 1c — Live crawl `pnpm acquire --source familylife`. Stage rows to
      `raw_documents`. Polite delay 1,500 ms; bump to 2,000 ms only if
      Cloudflare-style 429s appear (WP VIP / Automattic isn't expected to
      throttle). Verify: row count vs. 2,329 kept; status 200 dominant;
      titles populated; spot-read raw_content for clean article prose.
      **Pass 1 (2026-06-03 15:21 → 16:29 NZST):** SIGINT-stopped at
      **1,431 / 2,329 rows (61.4%)** before operator laptop disconnect —
      all status 200, zero 429s, zero other errors, raw_content avg 6,575
      chars (min 251, max 61,469). Crawl rate ~22 rows/min observed (per-
      fetch ~2.7 sec, not the 1.5 sec the delay-only estimate suggested).
      **Pass 2 (next session):** re-run `pnpm acquire --source familylife`;
      acquire is idempotent (slice #5 ran two passes), should pick up only
      the remaining ~898 URLs in ~41 min. <!-- sha: ________ -->
- [ ] 1d — Slice-file checkpoint: record acquire numbers + selector evidence.
      <!-- sha: ________ -->

### 2. Ingest → corpus tables
- [ ] 2a — `pnpm index --source familylife` drains raw → docs / chunks /
      embeddings (`openai/text-embedding-3-small`, 1536d). Idempotent re-run
      drains 0. **Re-run the full verify gate at new corpus size** — slice #3
      taught us live-Postgres integration tests can flip red on data growth
      even with zero code changes. Verify: 1:1 chunks:embeddings, 0 null
      dropped, 0 chunk_count mismatches, chunks/doc within sane band.
      <!-- sha: ________ -->

### 3. Retrieve → ranked results
- [ ] 3a — Spot-retrieval against the 6-source space via `pnpm query`. Probe
      a handful of marriage/parenting/family queries that the current corpus
      under-serves (e.g. "how do I lead my family spiritually?", "rebuilding
      trust after an affair", "discipling teenagers"). Confirm cross-source
      health (thelife/sightline/jf not catastrophically displaced),
      minScore 0.37 holds, secular negatives stay at 0. No code changes
      expected. <!-- sha: ________ -->

### 4. Spot-check via `/golden` (content-grounded mode, skill v2)
- [ ] 4a — **Part A (re-review):** `/golden` re-scans the existing 52 cases'
      living `relevant` maps for FamilyLife-credible docs (content-grounded —
      real chunk snippets, not titles). Expect prior-source numbers to MOVE
      (slice #5 pattern: slice-#4 sightline curation gap closed as a
      side-effect). <!-- sha: ________ -->
- [ ] 4b — **Part B (new cases):** `/golden` adds persona-diverse
      FamilyLife-native cases on the marriage/parenting axis the corpus
      currently lacks (target ~10 cases: seeker/skeptic/newcomer/believer).
      <!-- sha: ________ -->
- [ ] 4c — Final whole-corpus eval @ 6 sources / ~62 cases. Record recall@3,
      recall@10, coverage, MRR, P@1, per-source breakdown. Re-confirm
      minScore 0.37 across negatives + faith-adjacent cluster. Document the
      FOLLOW-UP I #15 cru/swg drift (will likely worsen — that's signal, not
      regression). **Delete any throwaway probe scripts BEFORE the gate**
      (slice #5 unused-const lesson). <!-- sha: ________ -->

## Decisions made (this slice)
- 2026-06-03 — Picked **FamilyLife** as slice #6 over GotQuestions/KnowGod/
  Issues I Face — fresh marriage/parenting axis without amplifying the
  FOLLOW-UP I #15 crowding signal (GotQuestions would have); avoided the
  API/Angular complexity of KnowGod and the sitemap-404 blocker of Issues I
  Face.
- 2026-06-03 — Registry key = `familylife` (matches `everystudent` / `thelife`
  one-word style; reserves `familylife-<sub>` for future sub-brand scopes per
  the Cru pattern).

## Open question / blocker
- none (scope locked; re-confirm count at 1b dry discovery).

## Resume hint (for a cold start)
At: Stage 1 — "1c Live crawl, pass 2". Pass 1 was SIGINT-stopped at
**1,431 / 2,329 rows** before operator disconnect (clean: all status 200,
zero 429s, no in-flight write damage — acquire writes one row per fetch
transactionally). Next concrete action: re-run `pnpm acquire --source
familylife` to pick up the remaining ~898 URLs (acquire is idempotent;
slice #5 ran two passes). Expected ~41 min at the observed ~22 rows/min
rate. On full completion: verify rows in `raw_documents` against 2,329
kept count, status 200 dominant, titles populated, spot-read raw_content
for clean prose, then commit 1c. Last verify: green @ 1a (depcruise 76/0,
lint 0 errors, typecheck clean, 114/114 tests on `d5abfd4`). Last commit:
`ef062f8` (1b — dry discovery checkpoint). Branch: `slice/familylife`.
