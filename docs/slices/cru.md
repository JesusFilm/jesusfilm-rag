# Slice: Cru — Train & Grow, consolidated (`cru`)

_Branch: `slice/cru` · Started: 2026-07-09 · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Consolidate Cru into **one `cru` source** and broaden it from the 12-page
`cru-10-basic-steps` hand-list to a **discovery crawl over `/us/en/train-and-grow/`**
(operator scope: broad train-and-grow). Absorb — do not duplicate — the existing
`cru-10-basic-steps` source (its lesson pages live inside `/train-and-grow/` and are
re-crawled under `cru`). Get `cru` queryable end-to-end in the current **qwen3
multilingual 8-source** corpus: acquire → ingest → retrieve → eval.

**Decisions locked by the operator (2026-07-09):** scope = broad train-and-grow;
key = `cru` (absorb `cru-10-basic-steps`, no second cru source); no consumers →
downtime tolerated (nuke-and-repave the cru source is fine).

## Context that changed since the last cru work (READ FIRST on a cold start)
- **Embedding model swapped to `qwen/qwen3-embedding-8b` @ 1536** (ADR-0005, #39).
  The local + prod corpus is already fully qwen3 (local: 8 sources / 9,004 docs /
  24,642 chunks, multilingual en/zh/fr). Query paths use
  `EMBED_QUERY_INSTRUCTION="Given a web search query, retrieve relevant passages
  that answer the query"`. **Any cru ingest MUST embed with qwen3 @ 1536** — mixing
  spaces silently breaks retrieval (prod-reembed.md, "query model == document model").
- **Local `.env` was stale** (`EMBED_MODEL_ID=openai/text-embedding-3-small`) —
  fixed in Stage 0. This was a live landmine.
- **Prod is a separate post-merge step** (prod-ingest.md, #29). The slice stays
  local (docker DB, port 5434); production promotion is operator-run afterwards.
- **`STATUS.md` / `sources.md` are stale** (still describe the 6-source openai
  world). Bringing them current is part of this slice.

## Rename blast radius (verified 2026-07-09 — all mechanical, no hardcoded allowlists)
- `src/registry/cru-10-basic-steps.ts` → `cru.ts` (key/const/name + broaden crawl to discovery).
- `src/registry/index.ts` (import + SOURCES), `registry.test.ts` (Cru assertions rewritten for discovery), `types.ts` (comment).
- `tests/eval-metrics.test.ts` (`const CRU`, fixture key).
- `eval/qa-golden.yaml` — 17 `cru-10-basic-steps:` → `cru:` (relevant-map + template).
- `docs/source-status.yaml` (re-key row) + re-compile `dashboard/compiled-data.json`.
- `scripts/eval.ts` / `eval-production.ts` comment examples (cosmetic).
- Toolchain tracks the rename automatically: `acquire:production` validates `--source`
  against the registry (`allSources()`); `eval:production` against golden relevant keys;
  `dashboard-compile` derives from the registry.

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 0. Prep
- [ ] Fix local `.env`: `EMBED_MODEL_ID=qwen/qwen3-embedding-8b` + add `EMBED_QUERY_INSTRUCTION`.   <!-- sha: ________ -->
- [ ] Confirm green baseline on `slice/cru` (`pnpm depcruise && pnpm lint && pnpm typecheck && pnpm test`).

### 1. Acquire → raw_documents
- [ ] Rewrite registry entry → `cru` with a discovery `CrawlPolicy` over `/us/en/train-and-grow/` (seed us-en child sitemap; allow `^…/us/en/train-and-grow/`; block login/donate/cart/store/communities/api/media/utm + non-article media video/quizzes/audio/infographics; articleHints for nested `.html`; selectors `.article-long-form` + fallbacks; 2000ms delay). Update `index.ts` + tests.
- [ ] Migrate DB: delete the old `cru-10-basic-steps` source (cascade docs/chunks/embeddings) + its `raw_documents` rows.
- [ ] **Dry discovery** (count kept URLs) → **confirm `maxPages` + embedding spend with operator (budget gate)** before the live crawl.
- [ ] Live `pnpm acquire --source cru` → `raw_documents`; spot-read `raw_content` is real teaching prose.

### 2. Ingest → corpus tables
- [ ] `pnpm index --source cru` → docs/chunks/embeddings (qwen3 @ 1536); counts sane; idempotent re-run drains 0.
- [ ] Re-run the FULL gate at the new corpus size (data stage can redden integration tests).

### 3. Retrieve → ranked results
- [ ] Spot-retrieval in the 8-source space via `pnpm query`: cru surfaces + cited; cross-source health holds; minScore 0.37 re-confirmed.

### 4. Eval + spot-check
- [ ] Re-key golden cases `cru-10-basic-steps:` → `cru:`; re-review living relevant maps for broad-cru credits (`/golden`).
- [ ] Run `pnpm eval` + per-source `cru` breakdown; author cru-native cases if warranted; record results.

## Decisions made (this slice)
- 2026-07-09 — **One `cru` source, absorb `cru-10-basic-steps`** (operator) — a second cru source is confusing; consolidate, split later only if eval shows a routing need.
- 2026-07-09 — **Broad train-and-grow scope** (operator "4") — comprehensive cru teaching, not a narrow curated curriculum set.
- 2026-07-09 — **Sitemap fork settled: discovery crawl** — cru.org exposes `/sitemap.xml` → us-en child covering `/train-and-grow/` (1,842 locs). No seed+link-follow needed.
- 2026-07-09 — **Embed with qwen3 @ 1536** (not openai) — correctness requirement to match the existing corpus.

## Open question / blocker
- Final `block` set + whether to keep all 519 `/train-and-grow/spiritual-growth/devotionals/` — resolved at the Stage-1 dry-discovery budget gate (operator confirms scope + spend).

## Resume hint (for a cold start)
At: Stage 0 — "Fix local `.env` to qwen3". Next concrete action: set
`EMBED_MODEL_ID=qwen/qwen3-embedding-8b` + `EMBED_QUERY_INSTRUCTION` in `.env`,
then confirm the green baseline on `slice/cru`.
Last verify: not yet run on this branch. Last commit: (branch just cut from origin/main `b2a67eb`). Branch: slice/cru.
