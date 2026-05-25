# Slice: EveryStudent (everystudent)

_Branch: `slice/everystudent` · Started: 2026-05-25 · Status: blocked_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get EveryStudent queryable end-to-end: acquire → ingest → retrieve → spot-check.
As slice #2 it **reuses all of slice #1's machinery** (Acquisition / Ingestion /
Retrieval contexts, HTTP fetcher, OpenRouter embedder, Postgres adapters, eval
harness) — the per-source work is a registry entry + driving the pipeline. It is
also the first slice with a **second** ingested source, which unblocks two pieces
deferred by design: **per-source eval** (a `source` tag per golden case + a scoped
`pnpm eval --source <key>` + per-source breakdown) and **FOLLOW-UP E**
(consumer `excludedSourceKeys` filter — surfaced at slice close).

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents
- [ ] Probe a sample everystudent.com page + its sitemap/homepage; hand-curate a seed list of article URLs (drop nav/category/cross-site links); determine the main-content selector + strip list (slice #1 used `#content` — EveryStudent will differ).   <!-- sha: ________ -->
- [ ] Add the `everystudent` `SourceEntry` (registry) with the curated seeds + crawl policy; wire into `SOURCES`; extend `registry.test.ts` (pure unit test, verify green).   <!-- sha: ________ -->
- [ ] Live `pnpm acquire --source everystudent` → rows in `raw_documents`; spot-read `raw_content` (real article text, not nav/boilerplate). Record in `sources.md` (→ Acquired).   <!-- sha: ________ -->

### 2. Ingest → corpus tables
- [ ] Live `pnpm index --source everystudent` → documents / chunks / embeddings (`openai/text-embedding-3-small`); chunk counts sane; idempotent re-run drains 0. (No new code expected — reuses the Ingestion context.)   <!-- sha: ________ -->

### 3. Retrieve → ranked results
- [ ] Live `pnpm query "<everystudent topic>"` → ranked, cited hits from EveryStudent; confirm on-topic + each cited. (No new code expected — reuses the Retrieval context.)   <!-- sha: ________ -->

### 4. Eval + spot-check (+ unblocked cross-source work)
- [ ] **Per-source eval mechanism** (deferred to slice #2 in slice #1's decision log): add a `source` tag to the golden schema + `pnpm eval --source <key>` scoped run + a per-source breakdown in the whole-corpus run. Test coverage as appropriate.   <!-- sha: ________ -->
- [ ] Author EveryStudent golden cases via `/golden` (persona-diverse), tagged `source: everystudent`.   <!-- sha: ________ -->
- [ ] Run the **whole-corpus** `pnpm eval` (now 2 sources) → re-confirm/re-derive `minScore` (FOLLOW-UP A: expect drift toward — not below — the 0.35 floor as breadth grows); write `eval/results-YYYY-MM-DD.md`.   <!-- sha: ________ -->
- [ ] Spot-check: persona positives + off-topic negatives via `pnpm query`; record findings in `sources.md` (→ Evaluated).   <!-- sha: ________ -->

## Decisions made (this slice)
- 2026-05-25 — Source #2 = **EveryStudent** — leanest remaining of the short list (60 KB / ~1283 words home, STATUS recon); recon returned 200 with a browser UA where the old jfa project saw 403s, so worth proving fresh.
- 2026-05-25 — **Seed sourcing = hand-curate again** (consistent with slice #1). The `discover-seeds` helper stays **deferred** until 2–3 sources reveal the pattern (operator decision; STATUS Process TODO). Revisit at source #3 if hand-curation starts to chafe.

## Open question / blocker
- **BLOCKED 2026-05-25 — EveryStudent content pages are behind a Cloudflare JS
  managed challenge; our plain HTTP fetcher cannot pass it.** Probe findings (browser
  UA + full browser headers, with delays):
  - Homepage `/` → **200** (stable; the recon's homepage-only GET passed here — a
    false positive for reachability).
  - **Every content path → 403** Cloudflare "Attention Required" with the
    `challenge-platform` marker (the JS-challenge injector). Confirmed across
    sections: `/sitemap.html`, `/sitemap.xml`, `/wires/loneliness.html`,
    `/features/{faith,peace-of-mind}.html`, `/knowingGod.html`,
    `/reasons-to-believe.html`, `/menus/issues.html`, `/contact.html`.
  - Full browser headers (Accept, Accept-Language, sec-ch-ua, Sec-Fetch-*,
    Upgrade-Insecure-Requests) did **not** help — a JS challenge needs JS execution
    to earn the `cf_clearance` cookie, which `src/adapters/http-fetch` (undici
    `fetch`, no JS engine) cannot do.
  - **Scope:** specific to everystudent.com — not org-wide. Cru.org (the parent
    org) and the other three short-list sources all serve **content pages** at 200
    with no challenge (deep-probed 2026-05-25), so only 1 of 6 needs a JS bypass.

  **Paths to unblock** (operator decision pending): (A) switch slice #2 to another
  short-list source — NextStep / Jesus Film Project / Cru / Sightline all pass the
  content-level probe — and revisit EveryStudent later; (B) build a headless-browser
  `Fetcher` adapter (Playwright) that executes the CF challenge — slots behind the
  existing `Fetcher` port, but a heavy dep and may still lose to a managed challenge;
  (C) seek an authorized feed/API from Cru (EveryStudent is a Cru property).

## Resume hint (for a cold start)
**BLOCKED at Stage 1, sub-step 1.** EveryStudent's content pages sit behind a
Cloudflare JS challenge (homepage 200, all content 403 w/ `challenge-platform`);
the plain HTTP fetcher can't pass it. The other four short-list sources are
content-level reachable (deep-probed). **Decision pending** (see "Open question /
blocker" above): switch slice #2 to another source, or build a Playwright-based
`Fetcher`. No code written; branch `slice/everystudent` is off `origin/main`
(`da037f5`), baseline green. Branch: slice/everystudent.
