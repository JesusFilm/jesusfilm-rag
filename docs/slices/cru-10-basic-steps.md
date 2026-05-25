# Slice: Cru — 10 Basic Steps (cru-10-basic-steps)

_Branch: `slice/cru-10-basic-steps` · Started: 2026-05-25 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get Cru's "10 Basic Steps Toward Christian Maturity" (a new-believer discipleship
curriculum, a scoped sub-corpus of cru.org) queryable end-to-end: acquire → ingest
→ retrieve → spot-check. This is **slice #2**, chosen after examining jfa's registry
(see `docs/jfa-registry-findings.md`): jfa hands us **12 ready-made curated URLs**,
cru.org is content-reachable (probed 200, no challenge), it's genuinely on-mission,
and it fits our current hand-listed `seedPaths` code with **no crawler rebuild**.
It **reuses all of slice #1's machinery** (Acquisition / Ingestion / Retrieval
contexts, fetcher, embedder, Postgres adapters, eval harness). As the first slice
with a **second** ingested source it unblocks two deferred pieces: **per-source eval**
and **FOLLOW-UP E** (`excludedSourceKeys`, surfaced at close).

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents
- [ ] Probe the 12 jfa Cru URLs at the **content level** (confirm 200, no challenge) + find cru.org's real main-content selector + strip list (jfa guessed `.article-content`/`.content-body` for AEM — verify against a live page).   <!-- sha: ________ -->
- [ ] Add the `cru-10-basic-steps` `SourceEntry` (registry) — `scopePath`-style key, the 12 curated seed paths, verified content/strip selectors, polite delay; wire into `SOURCES`; extend `registry.test.ts` (pure unit test, verify green).   <!-- sha: ________ -->
- [ ] Live `pnpm acquire --source cru-10-basic-steps` → rows in `raw_documents`; spot-read `raw_content` (real curriculum text, not nav/boilerplate). Record in `sources.md` (→ Acquired).   <!-- sha: ________ -->

### 2. Ingest → corpus tables
- [ ] Live `pnpm index --source cru-10-basic-steps` → documents / chunks / embeddings (`openai/text-embedding-3-small`); chunk counts sane; idempotent re-run drains 0. (No new code expected — reuses the Ingestion context.)   <!-- sha: ________ -->

### 3. Retrieve → ranked results
- [ ] Live `pnpm query "<10-basic-steps topic>"` → ranked, cited hits from this source; confirm on-topic + each cited. (No new code expected — reuses the Retrieval context.)   <!-- sha: ________ -->

### 4. Eval + spot-check (+ unblocked cross-source work)
- [ ] **Per-source eval mechanism** (deferred to slice #2 in slice #1's decision log): add a `source` tag to the golden schema + `pnpm eval --source <key>` scoped run + a per-source breakdown in the whole-corpus run. Test coverage as appropriate.   <!-- sha: ________ -->
- [ ] Author Cru 10-Basic-Steps golden cases via `/golden` (persona-diverse), tagged `source: cru-10-basic-steps`.   <!-- sha: ________ -->
- [ ] Run the **whole-corpus** `pnpm eval` (now 2 sources: starting-with-god + cru-10-basic-steps) → re-confirm/re-derive `minScore` (FOLLOW-UP A: expect drift toward — not below — the 0.35 floor as breadth grows); write `eval/results-YYYY-MM-DD.md`.   <!-- sha: ________ -->
- [ ] Spot-check: persona positives + off-topic negatives via `pnpm query`; record findings in `sources.md` (→ Evaluated).   <!-- sha: ________ -->

## Seed URLs (from jfa `cru-10-basic-steps`, paths relative to https://www.cru.org)
```
/us/en/train-and-grow/10-basic-steps.html                                  (index)
/us/en/train-and-grow/10-basic-steps/intro-the-uniqueness-of-jesus.html
/us/en/train-and-grow/10-basic-steps/1-the-christian-adventure.html
/us/en/train-and-grow/10-basic-steps/2-abundant-life.html
/us/en/train-and-grow/10-basic-steps/3-the-holy-spirit.html
/us/en/train-and-grow/10-basic-steps/4-prayer.html
/us/en/train-and-grow/10-basic-steps/5-the-bible.html
/us/en/train-and-grow/10-basic-steps/6-obedience.html
/us/en/train-and-grow/10-basic-steps/7-the-christian-and-witnessing.html
/us/en/train-and-grow/10-basic-steps/8-giving.html
/us/en/train-and-grow/10-basic-steps/9-the-old-testament.html
/us/en/train-and-grow/10-basic-steps/10-the-new-testament.html
```

## Decisions made (this slice)
- 2026-05-25 — **Slice #2 = `cru-10-basic-steps`**, after examining jfa's registry (`docs/jfa-registry-findings.md`). Rationale: ready-made 12-URL curation, cru.org content-reachable, on-mission new-believer discipleship, fits current `seedPaths` code with no crawler change. Two prior candidates parked: **EveryStudent** `blocked` (Cloudflare JS challenge, jfa-confirmed — `everystudent.md`) and **NextStep** `deferred` (8-page marketing site, jfa-confirmed — best as the FOLLOW-UP E seasonal fixture). The `slice/cru-10-basic-steps` branch carries both records forward to `main`.
- 2026-05-25 — **Discovery-crawl + Cloudflare bypass deliberately NOT taken here.** jfa reveals the discovery-crawl model (architecture §11 FOLLOW-UP F) and the walled-source problem (FOLLOW-UP G); both are written up and triggered by a *large* / *walled* source, not this small curated scope. Slice #2 stays on the hand-listed `seedPaths` path.
- 2026-05-25 — **Seed sourcing = reuse jfa's curated URLs** (the human curation is the expensive part; we lift the 12 URLs + selector hints, adapted to our registry types).

## Open question / blocker
- **Extraction wrinkle (not a blocker): Cru is Adobe AEM with no clean content
  wrapper.** Probe 2026-05-25: all 12 seed URLs reachable, **no Cloudflare
  challenge** (9/12 returned 200 cleanly; 3 intermittent timeouts on large ~115KB
  AEM pages under fast 0.5s spacing — slowness, not blocking; our 1500ms delay +
  idempotent re-runs handle stragglers). jfa's guessed `.article-content` /
  `.content-body` selectors are **absent** from the live page; structure is AEM
  (`cmp-container`, `data-cmp`, `aem-Grid`) wrapped in `header`/`nav`/`footer`/
  `breadcrumb` + 9 `experiencefragment` chrome blocks, no `<main>`. So extraction
  must be **body-minus-chrome** (mirroring jfa's org-pages approach: take a broad
  container, strip nav/header/footer/breadcrumb/experiencefragment), **verified
  against real lesson prose** before the registry entry is committed.

## Resume hint (for a cold start)
At: Stage 1 — mid sub-step 1 (reachability ✓ confirmed, **selector still to finalize**).
Reachability + no-wall verified; the wrinkle is the AEM extraction (see Open
question above). Next concrete action: nail the content selector + strip list for
Cru AEM (body-minus-chrome), confirm it yields clean lesson text on `/4-prayer.html`,
then add the `cru-10-basic-steps` registry entry (12 seed paths above) + extend
`registry.test.ts`, then `pnpm acquire --source cru-10-basic-steps`. Branch
`slice/cru-10-basic-steps` carries the EveryStudent (blocked) + NextStep (deferred)
records forward; it's off the merged `origin/main` (`da037f5`). Last verify: green
(depcruise / typecheck / lint / test). Branch: slice/cru-10-basic-steps.
