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
- [x] Probe the 12 jfa Cru URLs at the **content level** (all reachable, no Cloudflare challenge) + found the real content selector: **`.article-long-form`** (AEM long-form component; jfa's `.article-content` guess is absent). Verified against `/4-prayer.html` (2.8k chars) + `/5-the-bible.html` (7.1k chars) — clean lesson prose w/ attribution; only Material-icon ligatures + `.article-share` needed stripping.   <!-- sha: 562b798 (probe) -->
- [x] Added the `cru-10-basic-steps` `SourceEntry` (`src/registry/cru-10-basic-steps.ts`) — 12 curated seed paths, `contentSelectors:['.article-long-form',…]`, strip Material-icons/share/chrome, 2000ms delay; wired into `SOURCES`; extended `registry.test.ts` (Cru-specific + key-uniqueness). Verify green, **65 tests**.   <!-- sha: ________ -->
- [x] Live `pnpm acquire --source cru-10-basic-steps`: **staged 11/12** (the `10-basic-steps.html` index page correctly skipped as too-thin — no lesson prose). All 11 rows status 200, body_hash present; chars min 2525 / avg 4688 / max 10132. Spot-read clean (real Bill Bright curriculum prose + attribution, leading accordion-section TOC is minor). Recorded in `sources.md` (→ Acquired).   <!-- sha: ________ -->

**Stage 1 (Acquire) complete — verify green, 11 clean lesson rows in `raw_documents`.**

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
At: **Stage 2 (Ingest) — not started.** Stage 1 (Acquire) is complete & verify-green:
**11 clean lesson rows** in `raw_documents` (1 index page skipped too-thin), content
selector `.article-long-form`, 65 tests. Next concrete action: run `pnpm index
--source cru-10-basic-steps`, confirm docs/chunks/embeddings (`openai/text-embedding-3-small`),
sane chunk counts, idempotent re-run drains 0 — no new code expected (reuses the
Ingestion context). Branch
`slice/cru-10-basic-steps` carries the EveryStudent (blocked) + NextStep (deferred)
records forward; it's off the merged `origin/main` (`da037f5`). Last verify: green
(depcruise / typecheck / lint / test). Branch: slice/cru-10-basic-steps.
