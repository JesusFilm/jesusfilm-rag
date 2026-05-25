# Slice: NextStep (nextstep)

_Branch: `slice/nextstep` · Started: 2026-05-25 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get NextStep (nextstep.is) queryable end-to-end: acquire → ingest → retrieve →
spot-check. This is **slice #2** (re-targeted from EveryStudent, which is blocked
by a Cloudflare JS challenge — see `docs/slices/everystudent.md`). It **reuses all
of slice #1's machinery** (Acquisition / Ingestion / Retrieval contexts, HTTP
fetcher, OpenRouter embedder, Postgres adapters, eval harness) — the per-source
work is a registry entry + driving the pipeline. As the first slice with a
**second** ingested source it unblocks two pieces deferred by design: **per-source
eval** (a `source` tag per golden case + `pnpm eval --source <key>` + per-source
breakdown) and **FOLLOW-UP E** (consumer `excludedSourceKeys` filter — surfaced at
slice close).

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents
- [ ] Probe nextstep.is at the **content level** (not just the homepage — the EveryStudent lesson): confirm a sample article returns 200 with no anti-bot challenge; fetch its sitemap/homepage; hand-curate a seed list of article URLs (drop nav/category/cross-site); determine the main-content selector + strip list.   <!-- sha: ________ -->
- [ ] Add the `nextstep` `SourceEntry` (registry) with the curated seeds + crawl policy; wire into `SOURCES`; extend `registry.test.ts` (pure unit test, verify green).   <!-- sha: ________ -->
- [ ] Live `pnpm acquire --source nextstep` → rows in `raw_documents`; spot-read `raw_content` (real article text, not nav/boilerplate). Record in `sources.md` (→ Acquired).   <!-- sha: ________ -->

### 2. Ingest → corpus tables
- [ ] Live `pnpm index --source nextstep` → documents / chunks / embeddings (`openai/text-embedding-3-small`); chunk counts sane; idempotent re-run drains 0. (No new code expected — reuses the Ingestion context.)   <!-- sha: ________ -->

### 3. Retrieve → ranked results
- [ ] Live `pnpm query "<nextstep topic>"` → ranked, cited hits from NextStep; confirm on-topic + each cited. (No new code expected — reuses the Retrieval context.)   <!-- sha: ________ -->

### 4. Eval + spot-check (+ unblocked cross-source work)
- [ ] **Per-source eval mechanism** (deferred to slice #2 in slice #1's decision log): add a `source` tag to the golden schema + `pnpm eval --source <key>` scoped run + a per-source breakdown in the whole-corpus run. Test coverage as appropriate.   <!-- sha: ________ -->
- [ ] Author NextStep golden cases via `/golden` (persona-diverse), tagged `source: nextstep`.   <!-- sha: ________ -->
- [ ] Run the **whole-corpus** `pnpm eval` (now 2 sources: starting-with-god + nextstep) → re-confirm/re-derive `minScore` (FOLLOW-UP A: expect drift toward — not below — the 0.35 floor as breadth grows); write `eval/results-YYYY-MM-DD.md`.   <!-- sha: ________ -->
- [ ] Spot-check: persona positives + off-topic negatives via `pnpm query`; record findings in `sources.md` (→ Evaluated).   <!-- sha: ________ -->

## Decisions made (this slice)
- 2026-05-25 — **Slice #2 re-targeted EveryStudent → NextStep.** EveryStudent's content pages are behind a Cloudflare JS managed challenge our plain fetcher can't pass (homepage 200, all content 403; see `everystudent.md`). A content-level deep-probe showed NextStep / JFP / Cru / Sightline all serve articles at 200; NextStep is the leanest reachable alternative (129 KB / ~2009 words home, STATUS recon). Operator chose NextStep; EveryStudent stays `blocked` with its record, revisited later (likely via a Playwright fetcher) once more sources show whether a JS bypass is worth building.
- 2026-05-25 — **Seed sourcing = hand-curate** (operator decision, carried from the slice-#2 plan). The `discover-seeds` helper stays deferred until 2–3 sources reveal the pattern.
- 2026-05-25 — **Lesson banked: verify content pages, not just the homepage.** The recon's homepage-only GET was a false positive for EveryStudent. Stage 1 here checks a real article page first.

## Open question / blocker
- none

## Resume hint (for a cold start)
At: Stage 1 — first sub-step ("content-level probe of nextstep.is + hand-curate
seeds"). Next concrete action: fetch a sample NextStep **article** (confirm 200, no
CF challenge) + its sitemap/homepage, pick the content selector + strip list,
curate the article seed list. Branch `slice/nextstep` is off the slice-#2 blocker
HEAD (`0107538`) so it carries the EveryStudent blocked record forward to `main`;
that HEAD is itself off the merged `origin/main` (`da037f5`). Last verify: green
(depcruise / typecheck / lint / test). Branch: slice/nextstep.
