# Slice: Cru — consolidated, one domain one source (`cru`)

_Branch: `slice/cru` · Started: 2026-07-09 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## ✅ UNBLOCKED 2026-07-13 — the language engine landed

Everything this slice paused for is now merged to `main` (and merged into this
branch, commit `86a4d97`):
- **Per-document content-based detection** (`tinyld`) wired into `normalize()` —
  [ADR-0006](../decisions/0006-per-document-language-detection.md), PR #77.
- **Thresholds + `null` policy** — 500-char detection floor, 0.75 confidence gate,
  below either the label is stored **`null`** (never a guess, never a default to the
  declared language) — [ADR-0007](../decisions/0007-language-decision-thresholds-null-policy.md).
  Note: ADR-0007 **dropped the "by-path prior" idea** this slice sketched — there is no
  prior rung at all; content detection or `null`, with out-of-declared-set detections
  stored + warned.
- **`/slice` skill** now carries the deterministic language plan (domains → source
  keys, declared set by inspection, per-doc detection) — no more re-asking.

The section below is the historical pause record, kept verbatim.

## ⛔ PAUSED at Stage 2 — blocked on engine work (2026-07-09, RESOLVED above)

The operator is landing an engine change before this slice ingests:
1. **One domain = one source**, always — no per-case judgement calls.
2. **Language is per-document detection at ingest**, never inferred from the source.
3. `/slice` must fill in a per-source **language plan** during policy investigation
   (`single: es` | `by-path: {…}` | `detect`).
4. **Backfill = a `documents.language` column update. No re-embed.**

**Consequence for this slice: DONE.** `cru-es` has been **folded into `cru`** (both are
`www.cru.org`); its registry file is deleted and all its verified knowledge migrated into
`cru.ts`. Its 537 staged rows were re-keyed with one `UPDATE` — no re-crawl.
`thelife-fr` / `thelife-zh` stay separate — different domains (laviejenparle.com /
uwota.com) — so they already obey the rule.

**Still blocked:** do NOT ingest. `normalize()` still stamps `language = languages[0]`,
so all 537 Spanish rows would be labelled `en`.

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

### ⚠️ Blocking `/10-pasos/` is NOT sufficient — 7.6% of the Spanish path is English

A body-language audit of all **537 staged Spanish-path documents** (SQL over
`raw_documents.raw_content`, after `/10-pasos/` was already excluded):

| bucket | docs |
|---|---:|
| Spanish body | 489 |
| **English body** | **39–41** |
| mixed | 3 |
| thin/unknown | 4 |

Clustered in `crecer-y-equipar/comparte-evangelio` (**31 of 98**) and
`crecer-y-equipar/vida-y-relaciones` (10 of 194) — e.g. *"State of the Mission: The 21st
Century"*, *"Weaving Social Justice into Cru Movements"*. They share **zero `body_hash`
with any us/en document**, so they are unique articles that were never translated:
**keep them and label them `en`.** A `by-path` rule would mislabel all 39.

**This also corrects an earlier claim of mine in this very slice.** A 30-page spot-check
reported "0/30 English" and was simply unlucky. Sampling cannot establish a per-document
property — which is the whole argument for the engine change.

The English crawl is clean by contrast: 1,877 EN / 0 ES / 28 thin-unknown of 1,905.

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
- [x] Live crawl `cru-es` (571 URLs) — ran under the retired `cru-es` key; its 537 raw rows re-keyed to `cru` with one `UPDATE` (see Fold-in below).
- [x] Un-block `/language-resources/` + add `fr` to the declared set (detection landed).   <!-- sha: 19591a1 -->
      **Scope correction by inspection:** the 28 per-language pages are ~90-char
      link-card hubs (external `.cmp-teaser` links) that `minContentLength` drops —
      NOT "gospel content in 28 languages". The section's one real doc is a French
      article. Dry discovery 2,746 kept (was 2,716).
- [x] Resume-crawl the delta → **staged 2/305** (the French article, 3,415 chars, + one
      train-and-grow story that grew past the floor); 300 hub pages re-skipped too-thin
      exactly as predicted, 3 transient fetch-fails. **Stage 1 FINAL: 2,444 rows**
      (1,907 en-path + 537 es-path), all pending. Counts recorded in `sources.md`
      (→ Acquired) + `source-status.yaml` (acquire green ×3 langs).

### 2. Ingest → corpus tables
- [x] `pnpm index --source cru` → **2,444 docs / 8,497 chunks / 8,497 embeddings** (qwen3 @ 1536, 1:1, 0 skipped, chunks/doc avg 3.48); idempotent re-run drains **0**.
- [x] **Invariant-6 evidence (first multi-language single-source ingest):**
      `en` 1,805 (incl. **30 English-bodied `/mx/es/` docs — the audit's predicted class,
      correctly labelled `en`**) · `es` 447 (all es-path) · `fr` 1 (the language-resources
      article) · `null` 190 (7.8%; lengths 250–28k, median 918 — 76 near-floor, 114
      confidence-gated; honest #73 worklist, retrievable unfiltered) · `vi` 1 — the run's
      single ⚠ warning, a detector misfire on genuine 654-char Spanish ("El poder de la
      oración ferviente", conf 0.89): the ADR-0007 sweep's 0.3% wrong-above-gate class,
      #73 cleanup material. es-path total reconciles: 447+30+59+1 = 537 ✓.
- [x] Full gate re-run at new corpus size (~33.2k chunks): depcruise ✓ lint ✓ typecheck ✓
      db:check ✓ **295/295 tests** — the #17 canary did not bite this time.

### 3. Retrieve → ranked results
- [ ] Spot-retrieval in the 9-source space; cru + cru-es cited; **Spanish query returns Spanish docs**; cross-source health; minScore 0.37 re-confirmed.

### 4. Eval + spot-check
- [ ] Re-key golden `cru-10-basic-steps:` → `cru:` (17 refs) + `tests/eval-metrics.test.ts` fixture.
- [ ] `/golden` content-grounded re-review of living `relevant` maps (broad cru now answers far more questions).
- [ ] `pnpm eval` + per-source `cru` / `cru-es` breakdown; record results.

## Decisions made (this slice)
- 2026-07-13 — **Declared set is `["en","es","fr"]`, by inspection** (ADR-0006's rule): en +
  es trunks, plus fr for the single real `/language-resources/` French article. The other
  27 per-language hub pages never reach ingest (thin), so their languages are NOT declared.
- 2026-07-13 — **`cru-10-basic-steps` YAML row → `deferred` + supersession note**, not
  deleted: prod still serves its rows until this slice's prod cutover, and the status
  tool (correctly) has no row-delete — the note carries the story.
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

## Fold-in — DONE (commit below)
- [x] Deleted `src/registry/cru-es.ts`; **all** its verified knowledge migrated into
  `cru.ts` (the `/10-pasos/` English-body reproduction, the `.category-layout` 138-char
  CTA trap, the `.aem-Grid`/`.cmp-text`/`.cmp-container` first-match traps) — plus the
  corrected sampling claim and the 7.6% audit above.
- [x] `cru.crawl.allow` extended with `^https://www\.cru\.org/mx/es/(conoce-a-dios|crecer-y-equipar)[/.]`;
  `block` keeps `/10-pasos`. Selectors unchanged: `.article-long-form` is absent on mx/es,
  so those pages already take the `<body>` path. `maxPages` 2500 → 3000; both es sitemaps seeded.
- [x] `languages: ["en","es"]` as a **declared set**, with a loud comment that ingest is
  gated on per-doc detection.
- [x] `UPDATE raw_documents SET source_key='cru' WHERE source_key='cru-es'` — 0 collisions;
  now 2,442 rows (1,905 en-path + 537 es-path), all distinct, all pending.
- [x] `cru.test.ts` rewritten: every trap keeps a regression guard, plus new guards for
  the mx/es allow, the `/10-pasos/` block, the tt-en/bb-en mirrors, and
  `getSource("cru-es") === undefined`. `registry.test.ts` now asserts the domain rule.

### Still to do when detection lands — RESOLVED 2026-07-13
- [x] Language plan: the "by-path prior" idea was **dropped by ADR-0007** (no prior rung
  exists — detection or `null`). The plan is now just the declared set on the registry
  entry: `languages: ["en","es","fr"]` (fr = the one real `/language-resources/` article).
- [x] `/language-resources/` un-blocked (`19591a1`) — scope grew by 1 real doc, not ~29
  (the 28 per-language pages are thin link hubs; see Stage 1).
- [ ] `pnpm index --source cru` → Stage 2.

## Open question / blocker
- none — the engine-work blocker resolved 2026-07-13 (ADR-0006/0007 merged; FOLLOW-UP M
  was promoted into those ADRs and removed from `architecture.md` §11, replaced by
  invariant 6 + decision row 10).

## Process gap found this slice (worth folding into the same skill edit)
`/slice`'s verify gate is `depcruise && lint && typecheck && test`, but **CI also runs
`db:check`, `status:check` and `dashboard:verify`**. A slice can go green locally and red in
CI. All three pass on this branch, but the gate should name them.

## Resume hint (for a cold start)
At: **Stage 1 close → Stage 2 (ingest).** The engine blocker is RESOLVED (main merged in,
`86a4d97`; detection wired per ADR-0006/0007). `/language-resources/` un-blocked
(`19591a1`, +1 real French doc; declared set now en/es/fr). Resume-crawl of the delta ran
2026-07-13; then: record staged counts in `sources.md` + `source-status.yaml` (cru row via
`status:add-source`/`add-lang`; retire `cru-10-basic-steps` to deferred+note), close
Stage 1, then `pnpm index --source cru` (qwen3 @ 1536) and verify the invariant-6
evidence (es labels, `null` counts, out-of-set warnings).
Last verify: green post-merge (depcruise 87/0, lint, typecheck, db:check, **295/295**,
status:check, dashboard:verify). Branch: slice/cru.
