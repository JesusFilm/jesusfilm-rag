# Slice: Cru — consolidated English + Spanish (`cru`, `cru-es`)

_Branch: `slice/cru` · Started: 2026-07-09 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Consolidate Cru into **one `cru` source** covering its whole English spiritual corpus,
absorbing the 12-page `cru-10-basic-steps` hand-list, and add a **`cru-es`** Spanish
sibling. Get both queryable end-to-end in the current **qwen3 multilingual** corpus:
acquire → ingest → retrieve → eval.

**Operator decisions (2026-07-09):** one `cru` key, no second cru source; broad scope
(not just train-and-grow); add `cru-es`; exclude the 28-language `language-resources`
bag for now; no consumers ⇒ downtime tolerated (nuke-and-repave the cru rows).

## Context that changed since the last cru work (READ FIRST on a cold start)
- **Embedding model is `qwen/qwen3-embedding-8b` @ 1536** (ADR-0005, #39), instruction-aware
  queries. Local + prod corpus already re-embedded. Any cru ingest MUST use qwen3 —
  mixing spaces silently breaks retrieval ("query model == document model").
- **Local `.env` was stale** (`openai/text-embedding-3-small`) — fixed in Stage 0.
- **`architecture.md` IS current** on the model swap; **`STATUS.md` / `sources.md` are stale**
  (still describe the 6-source openai world). Refreshing them is part of this slice.
- **Prod is a separate post-merge step** (`docs/ops/prod-ingest.md`, #29). This slice is local only.
- **`tests/retrieval.integration.test.ts` is a flaky canary**, not a gate — FOLLOW-UP J #17.
  It failed once and passed on the next runs with no code/DB change (populated DB only).

## Scope (verified against the live sitemap)
`cru` = us/en, from the `us-en` child sitemap (3,642 locs) → **2,145 URLs** kept:
`/train-and-grow/` (1,842) + `/how-to-know-god/` (114, the seeker/gospel trunk) +
`/blog/` (317). Excluded: `/communities/` 665, `/opportunities/` 399, `/about/` 169
(mostly donor/stewardship admin), store/give/campaigns; non-article media
(`/video/` 50, `/quizzes-and-assessments/` 41, `/audio/`, `/infographics/`);
`/language-resources/` 29 (multilingual — see FOLLOW-UP M).
`/blog/` mirrors train-and-grow's taxonomy but is distinct content: only 24 slugs
overlap, all thin section-index pages that `minContentLength` drops.

`cru-es` = mx/es → **571 URLs** kept: `/conoce-a-dios/` + `/crecer-y-equipar/`, minus
`/10-pasos/`. Regional English mirrors `tt-en` (3,203) and `bb-en` (3,079) are excluded —
identical slugs under a different locale path would duplicate the corpus.

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 0. Prep
- [x] Fix local `.env` → `EMBED_MODEL_ID=qwen/qwen3-embedding-8b` + `EMBED_QUERY_INSTRUCTION`.
- [x] Green baseline on `slice/cru` (263 tests; the 2 #17 integration failures proved flaky, then passed).

### 1. Acquire → raw_documents
- [x] Registry: `cru` (discovery over the 3 us/en trunks) + `cru-es`; delete `cru-10-basic-steps`; tests.   <!-- sha: f45f369 -->
- [x] DB migration: dropped `cru-10-basic-steps` (11 docs / 35 chunks / 35 embeds + 11 raw rows), 0 orphans. 8→7 sources.
- [x] Dry discovery: `cru` 2,145 kept / 3,642 seen · `cru-es` 571 kept / 709 seen (the 2nd es sitemap adds 6 unique).
- [x] **Extraction fix** — the first live crawl skipped 59/59 `/how-to-know-god/` too-thin.   <!-- sha: b793502 -->
- [ ] Live crawl `cru` + `cru-es` → `raw_documents`; spot-read `raw_content`; **language-audit `cru-es` bodies** (trust the body, not the path).
- [ ] Record counts in `sources.md` (→ Acquired) + `docs/source-status.yaml`.

### 2. Ingest → corpus tables
- [ ] `pnpm index --source cru` and `--source cru-es` → qwen3 @ 1536; counts sane; idempotent re-run drains 0.
- [ ] Re-run the FULL gate at the new corpus size (a data stage can redden integration tests).

### 3. Retrieve → ranked results
- [ ] Spot-retrieval in the 9-source space; cru + cru-es cited; **Spanish query returns Spanish docs**; cross-source health; minScore 0.37 re-confirmed.

### 4. Eval + spot-check
- [ ] Re-key golden `cru-10-basic-steps:` → `cru:` (17 refs) + `tests/eval-metrics.test.ts` fixture.
- [ ] `/golden` content-grounded re-review of living `relevant` maps (broad cru now answers far more questions).
- [ ] `pnpm eval` + per-source `cru` / `cru-es` breakdown; record results.

## Decisions made (this slice)
- 2026-07-09 — **One `cru` source, absorb `cru-10-basic-steps`** (operator). Its lesson pages are re-crawled inside `/train-and-grow/`.
- 2026-07-09 — **Scope is broader than train-and-grow.** Scoping to it alone would have dropped `/how-to-know-god/` (the seeker gospel trunk) and `/blog/` — the operator caught this.
- 2026-07-09 — **Sitemap discovery**, not seed+link-follow: cru.org exposes `/sitemap.xml` → per-locale children.
- 2026-07-09 — **`cru-es` is a separate source, not folded into `cru`.** `normalize()` stamps language from `languages[0]`, so one source = one language (the `thelife-fr`/`zh` model). Folding Spanish in would tag it `en`. → FOLLOW-UP M.
- 2026-07-09 — **`/language-resources/` (28 languages) excluded** for the same reason; revisit after FOLLOW-UP M.
- 2026-07-09 — **Embed with qwen3 @ 1536**, not openai — correctness, not preference.

## Findings worth carrying forward
- **The prior "cru.org has no real Spanish content" note over-generalized.** Only
  `/mx/es/.../10-pasos-basicos/` serves untranslated English under Spanish chrome
  (reproduced: English `.article-long-form` template, `lang=EN`). A 30-page sample across
  all six other `/mx/es/` sub-sections found **0** English pages. `registry/index.ts` and
  `sources.md` corrected.
- **cru.org has no single content container.** `article` matches a **9-char stub on every
  page** (this caused the 59/59 skip); `.cmp-text` truncates multi-block articles
  (heaven-and-hell 14%, `full-article.html` 3%); `.cmp-container` can match empty.
  Answer: `.article-long-form` when present, else `<body>` + aggressive strips.
  **Slice #2's selector was verified on 2 lesson pages and never generalized.**
- **AEM chrome is `<div>`-based**, so a `header`/`footer` tag strip misses it. The
  `.cmp-global-picker` alone is ~1,745 chars of country names per page.

## Open question / blocker
- none

## Resume hint (for a cold start)
At: Stage 1 — "Live crawl". Background crawl stages `cru` (2,145 URLs) then `cru-es`
(571) at 2,000 ms delay, ~90 min total; logs in the session scratchpad. If interrupted,
re-run `pnpm acquire --source <key> --resume` (skips already-staged URLs).
Then: language-audit `cru-es` raw bodies, record counts, and move to Stage 2 ingest.
Last verify: green @ b793502 (depcruise 82/0, lint, typecheck, 263/263). Branch: slice/cru.
