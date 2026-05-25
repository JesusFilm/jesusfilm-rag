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
- [x] Added the `cru-10-basic-steps` `SourceEntry` (`src/registry/cru-10-basic-steps.ts`) — 12 curated seed paths, `contentSelectors:['.article-long-form',…]`, strip Material-icons/share/chrome, 2000ms delay; wired into `SOURCES`; extended `registry.test.ts` (Cru-specific + key-uniqueness). Verify green, **65 tests**.   <!-- sha: 85fa3db -->
- [x] Live `pnpm acquire --source cru-10-basic-steps`: **staged 11/12** (the `10-basic-steps.html` index page correctly skipped as too-thin — no lesson prose). All 11 rows status 200, body_hash present; chars min 2525 / avg 4688 / max 10132. Spot-read clean (real Bill Bright curriculum prose + attribution, leading accordion-section TOC is minor). Recorded in `sources.md` (→ Acquired).   <!-- sha: 43275c1 -->

**Stage 1 (Acquire) complete — verify green, 11 clean lesson rows in `raw_documents`.**

### 2. Ingest → corpus tables
- [x] Live `pnpm index --source cru-10-basic-steps` → documents / chunks / embeddings (`openai/text-embedding-3-small`); chunk counts sane; idempotent re-run drains 0. (No new code expected — reuses the Ingestion context.)   **Result:** drained all 11 pending raw rows → **11 docs / 35 chunks / 35 embeddings**; 0 chunk_count mismatches (declared=actual); chunks/doc min 2 / avg 3.2 / max 6; embeddings all `openai/text-embedding-3-small` @ **1536 dims** (consistent with starting-with-god — no model footgun). Idempotent re-run drained **0** pending, wrote 0 chunks, count held at 35. Verify gate green (depcruise/lint/typecheck/65 tests).   <!-- sha: 30b7092 -->

**Stage 2 (Ingest) complete — verify green, 11 docs / 35 chunks / 35 embeddings, idempotent.**

### 3. Retrieve → ranked results
- [x] Live `pnpm query "<10-basic-steps topic>"` → ranked, cited hits from this source; confirm on-topic + each cited. (No new code expected — reuses the Retrieval context.)   **Result:** cru-10 surfaces correctly in the **whole-corpus** ranking (both sources coexist, right source wins by topic) and **in isolation** (`--source cru-10-basic-steps`), every hit cited to its `cru.org` lesson URL. Wins rank 1 on Witnessing (0.663), Abundant Life (0.604), Obedience (0.634, clean prose); rank 2 on Prayer (0.564) + Holy Spirit (0.643) behind relevant SwG pages. **Wrinkle for Stage 4:** the leading accordion-section TOC chunk sometimes surfaces instead of lesson prose (seen on Giving / Abundant Life) and cru-10 scores a bit lower than SwG; on "how to study the Bible" SwG swept top 3 and cru-10's Step 5 didn't place. Not a blocker — eval will quantify recall impact.   <!-- sha: 0f9c1bd -->

**Stage 3 (Retrieve) complete — verify green, cru-10 retrievable + cited, two sources coexist.**

### 4. Eval + spot-check (+ unblocked cross-source work)
- [x] **Per-source eval mechanism** (deferred to slice #2 in slice #1's decision log): add a `source` tag to the golden schema + `pnpm eval --source <key>` scoped run + a per-source breakdown in the whole-corpus run. Test coverage as appropriate.   **Result:** required `source` tag on the golden schema; `--source <key>` filters cases but retrieves **whole-corpus** (so the scoped number == that source's breakdown row — one source of truth, exposes cross-source interference); whole-corpus run prints + writes a per-source breakdown; scoped runs write `results-<date>-<source>.md`. Pure scoring/reporting logic split into `scripts/eval-metrics.ts` (unit-tested from `tests/` since vitest excludes `scripts/`) — **+15 tests, 80 total**. Backfilled the 10 SwG cases; `/golden` skill now emits `source`. **Finding (for sub-step 3):** scoped swg run dropped to recall@8 **0.90** (was 1.00) — `swg-newcomer-gospel`'s expected doc fell out of top-8, displaced by 3 cru-10 chunks scoring 0.469–0.472 (ranking competition, **not** a minScore cutoff issue).   <!-- sha: cdccfc0 -->
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
At: **Stage 4 (Eval + spot-check) — sub-step 1 DONE, resume at sub-step 2.** Stages 1–3
complete & verify-green; corpus holds **11 docs / 35 chunks / 35 embeddings** for
cru-10-basic-steps. Sub-step 1 (per-source eval mechanism) is committed (`cdccfc0`): the
golden schema now requires a `source` tag, `pnpm eval --source <key>` runs one source's
cases against the whole corpus, and the whole-corpus run emits a per-source breakdown.
**Next concrete action (sub-step 2):** author persona-diverse cru-10 golden cases — follow
the `/golden` procedure (survey the ingested cru corpus via psql, draft seeker/skeptic/
believer/newcomer positives each grounded in a real cru lesson doc + 3–5 off-topic
negatives), present for operator curation, then write approved positives (tagged
`source: cru-10-basic-steps`) into `eval/qa-golden.yaml` and negatives into this file's
Stage 4 section. **Then sub-step 3:** run the **whole-corpus** `pnpm eval` (2 sources) →
re-derive `minScore` (FOLLOW-UP A — toward but not below 0.35) → write
`eval/results-<date>.md`. **Then sub-step 4:** spot-check + record → `sources.md`
(→ Evaluated). **Known finding to interpret in sub-step 3:** adding cru-10 already drops
`swg-newcomer-gospel` out of top-8 (cru chunks at 0.469–0.472 out-rank it — competition,
not cutoff); also watch the **accordion-TOC chunk wrinkle** (Stage 3 note). Branch
`slice/cru-10-basic-steps` carries the EveryStudent (blocked) + NextStep (deferred) records
forward; off the merged `origin/main` (`da037f5`). Last verify: green (depcruise /
typecheck / lint / **80 tests**). Branch: slice/cru-10-basic-steps.
