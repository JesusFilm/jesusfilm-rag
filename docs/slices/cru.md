# Slice: Cru — consolidated English + Spanish (`cru`, `cru-es`)

_Branch: `slice/cru` · Started: 2026-07-09 · Status: blocked_
<!-- Status: in-progress | blocked | done -->

## ⛔ PAUSED at Stage 2 — blocked on engine work (2026-07-09)

The operator is landing an engine change before this slice ingests:
1. **One domain = one source**, always — no per-case judgement calls.
2. **Language is per-document detection at ingest**, never inferred from the source.
3. `/slice` must fill in a per-source **language plan** during policy investigation
   (`single: es` | `by-path: {…}` | `detect`).
4. **Backfill = a `documents.language` column update. No re-embed.**

**Consequence for this slice:** `cru-es` must be **folded into `cru`** (both are
`www.cru.org`). `thelife-fr` / `thelife-zh` stay separate — different domains
(laviejenparle.com / uwota.com) — so they already obey the rule.

**Nothing acquired is wasted.** `raw_documents` has **no `language` column**; language is
assigned only at ingest (`normalize.ts`). The crawl output is language-agnostic and
survives the pivot intact. Backfill needs no re-crawl either: `raw_documents.raw_content`
and `documents.content` are already stored, so a detector can run over them in place.

### ⚠️ Evidence the engine work must not ignore: `<html lang>` LIES

Measured 2026-07-09 on cru.org:

| page | `<html lang>` | `.article-long-form` | body reads |
|---|---|---|---|
| `/us/en/train-and-grow/10-basic-steps/4-prayer.html` | `en-us` | yes | EN ✓ |
| `/mx/es/conoce-a-dios/jesus-dios-o-simplemente-buen-hombre.html` | `es-mx` | no | ES ✓ |
| `/mx/es/…/10-pasos-basicos-…/intro-the-uniqueness-of-jesus.html` | **`es-mx`** | yes | **EN** ✗ |

So `<html lang>` is a **locale marker, not a body-language signal** — it fails on exactly
the same pages the URL path fails on. Two consequences:
- **`by-path` (and `<html lang>`) must not be a trusted rung above detection.** Treat them
  as a *prior* that body-detection can override, and **log/flag disagreements** — that
  check would have caught the `/10-pasos/` pages automatically instead of by hand.
- **Capturing `<html lang>` into `RawDocument` is not worth a schema change** — it buys a
  signal we've just proven unreliable. Detect from the extracted body, which is already
  persisted.

These three URLs are a ready-made acceptance fixture for the detection cascade.

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
- [x] Live crawl `cru` (English) → **1,905 staged / 240 skipped of 2,145**, exit 0. All status 200, 1,905 distinct canonical_url, 0 null titles; chars min 250 / avg 4,954 / max 52,671 (heaven-and-hell — matches the 52,409 body-fallback prediction). 9× 429 + 5 fetch-fails across 2,145 requests. Skips are hub/index pages.
- [~] Live crawl `cru-es` (571 URLs) — ran under the soon-to-be-retired `cru-es` key. Its raw rows are **re-keyable to `cru`** with one `UPDATE`: mx/es pages have no `.article-long-form`, so both policies extract via the identical chrome-stripped `<body>` path. Alternatively re-acquire with `--resume`.
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

## Fold-in work, once the engine change lands (one commit, ~contained)
- Delete `src/registry/cru-es.ts`; **migrate its verified knowledge into `cru.ts` first**
  (the `/10-pasos/` English-body reproduction, the 0/30 Spanish sample, the
  `.category-layout` 138-char CTA trap, the `.aem-Grid`/`.cmp-text` first-match traps).
  That docstring is the only home for several hours of verification.
- Extend `cru.crawl.allow` with `^https://www\.cru\.org/mx/es/(conoce-a-dios|crecer-y-equipar)[/.]`
  and keep `block: ["/10-pasos", …]`. Selectors need no change: `.article-long-form` is
  absent on mx/es, so those pages already take the `<body>` path.
- Add cru's **language plan**: `by-path { "/mx/es/": es, default: en }` — *as a prior only*,
  with body-detection authoritative (see the `<html lang>` table above).
- `UPDATE raw_documents SET source_key='cru' WHERE source_key='cru-es'` (no re-crawl).
- Update `cru.test.ts` (drop the cru-es block, keep every trap guard) and `sources.md`.
- **Bonus unlocked:** `/language-resources/` (~29 pages, ~28 languages) can be *un-blocked* —
  it was excluded only because a single source could hold one language. Per-doc detection
  makes it ingestible. Scope grows slightly; re-run dry discovery.

## Open question / blocker
- **BLOCKED:** waiting on the engine change (domain-as-source + per-doc language detection
  + slice-skill language-plan field + `documents.language` backfill). FOLLOW-UP M in
  `architecture.md` §11 is the spec seed; it should be promoted to an ADR + closed by that work.

## Process gap found this slice (worth folding into the same skill edit)
`/slice`'s verify gate is `depcruise && lint && typecheck && test`, but **CI also runs
`db:check`, `status:check` and `dashboard:verify`**. A slice can go green locally and red in
CI. All three pass on this branch, but the gate should name them.

## Resume hint (for a cold start)
At: **Stage 2, BLOCKED on engine work** (see the PAUSED banner). Acquire is done for English
(1,905 rows under `source_key='cru'`). Do NOT ingest yet: `normalize()` still stamps
`language = entry.languages[0]`, so ingesting now would tag everything from the
soon-to-be-unified cru source as `en`.
When the engine lands: do the "Fold-in work" list above, then `pnpm index --source cru`.
Last verify: green @ 579b067 (depcruise 82/0, lint, typecheck, 263/263; db:check,
status:check, dashboard:verify also green). Branch: slice/cru.
