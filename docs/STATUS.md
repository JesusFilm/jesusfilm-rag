# STATUS — jesusfilm-rag

Live "you are here" for the build. Stable design lives in
[architecture.md](./architecture.md); per-source progress in
[sources.md](./sources.md). **This file is the churn layer** — update it
whenever state changes; keep it to ~one screen.

_Last updated: 2026-05-29_

## You are here

**Slice #1 (Starting With God) is DONE and MERGED to `main`** (PR #2,
2026-05-25) — acquired (40 rows), ingested (**40 docs / 183 chunks / 183
embeddings**, `openai/text-embedding-3-small`), retrievable, evaluated:
**recall@3 0.90 · recall@8 1.00 · MRR 0.82 · P@1 0.70** @ minScore **0.37**.

**Slice #2 (Cru "10 Basic Steps", `cru-10-basic-steps`) is DONE — all 4 stages green,
Evaluated, and MERGED to `main`** (PR #11, `b3105f7`). 11 docs / 35 chunks / 35
embeddings; retrievable + cited; two sources now coexist in one ranked space.

**Slice #3 (Jesus Film Project, `jesusfilm-org`) is DONE — all 4 stages green,
Evaluated** — on `slice/jesusfilm-org` (2026-05-26), **not yet merged**. It
triggered **FOLLOW-UP F**: Stage 1 built the **discovery-crawl** model
(`CrawlPolicy.sitemaps`+`allow`/`block`/`articleHints`; `src/acquisition/discover.ts`
recurses a sitemap index → filters → URL list; fakes-tested), because jesusfilm.org
is too large to hand-list. The live crawl staged **349/349 blog articles, 0 skips**
(417 sitemap locs → 349 kept; /give/ + .kml filtered), ingested to **349 docs /
2114 chunks / 2114 embeddings**, retrievable + cited. The corpus is now **3 sources**.
**Stage 4 (eval) via `/golden`:** 12 new persona-diverse jf cases + re-reviewed 11
existing cases' living `relevant` maps (qa-golden.yaml now **32 cases**). Curated
whole-corpus eval @ top-10: **recall@3 0.906 · recall@10 0.938 · coverage 0.803 ·
MRR 0.777 · P@1 0.656**; per-source **jf 0.913** / swg 0.833 / cru 0.714. **Key
lesson re-confirmed:** the pre-curation drop (stale 20 cases → recall@10 0.85) was a
**living-relevant-set artifact, not a retrieval regression** — re-reviewing the maps
made the 3 displaced misses (gospel/witnessing/prayer) pass. 2 honest misses remain
(`jf-skeptic-intolerant` out-ranked by uniqueness docs; `jf-believer-disciple-making`
a vocabulary gap). **minScore 0.37 held** (FOLLOW-UP A @ 3 sources). 86 tests green.
Two follow-ups filed this slice: **#14 (H)** ingest-time tag/keyword enrichment, **#15
(I)** consumer-specified retrieval diversity. EveryStudent `Blocked` / NextStep `Deferred`.

Eval methodology (source-agnostic questions + multi-source living `relevant` sets,
recall+coverage @ top-10) is stable — see **[docs/eval-approach.md](./eval-approach.md)**.

## Next action

**Slice #4 (Sightline Ministry) was MERGED to `main`** (PR #22, `2c5c57f`) — the
earlier "not yet merged" note above is stale.

**Slice #5 (`thelife`) is IN-PROGRESS** on `slice/thelife` (started 2026-05-29).
**This slice was initially picked as `power-to-change`**; Stage 1a recon found
powertochange.com fully decommissioned (every content URL 301-redirects to
thelife.com or issuesiface.com; sitemap is a 2014-2017 WP relic). The actual
Cru Canada discipleship corpus lives at **thelife.com** now (Statamic, fresh
sitemap with 7,834 locs / 6,478 lastmod 2026, open robots), so we pivoted the
slice. Issues I Face stays its own backlog row.

**Scope (operator-chosen):** articles **+** devotionals — `articleHints`
allows `/articles/` (478) and `/devotionals/` (5,015), `block` filters out
`/tags/`/`/author/`/`/series/`/etc. **Expected ~5,493 kept URLs.** Taken
explicitly despite slice #4's small-source crowding signal — the expected
consequence is per-source coverage for cru/swg likely drops further in the
eval; that's a sharper signal for **FOLLOW-UP I (#15)**, not a regression.

→ **At: Stage 1 — `1b. Register thelife SourceEntry`.** Sub-step 1a (recon +
pivot) done in the unpack commit. Next concrete action: probe one `/articles/`
and one `/devotionals/` page to confirm the content selector covers both
shapes (open question — `.article-body` confirmed for articles, devotionals
TBD), then write `src/registry/` entry + fakes-only registry test. Subsequent
operator pause: **dry discovery → confirm crawl + embedding budget** for
~5,500 docs before live fetch. See [docs/slices/thelife.md](./slices/thelife.md).

**Still on the table (not picked):** FOLLOW-UP I (#15,
`maxPerSource`/MMR — most evidence-backed engine work; this slice will sharpen
its signal), FOLLOW-UP E (#6, `excludedSourceKeys` — unblocked, no real fixture),
Cru accordion-TOC strip (citation quality), Issues I Face (own backlog row —
sitemap 404, needs different discovery).

## How we're building (decided 2026-05-22)

- **Vertical slices, one source at a time.** Drive ONE source fully through
  acquire → ingest → retrieve → spot-check, then move to the next. This refines
  architecture §9's horizontal order — module boundaries and ports are
  unchanged, only the build order.
- **jfa is a behavioral reference, not a port target.** We learn what worked;
  we do not transplant its files.
- **Defer the "generic crawler vs. per-source scraper" decision** until 2–3
  sources reveal the real pattern.
- **Eval** (spot-checks first, then recall@k / MRR) gets built once slice #1 has
  real data to evaluate against.
- **`/slice` drives the work.** A lightweight, resumable slice-driver
  (`.claude/skills/slice/`): reads this file, unpacks the next slice (or resumes
  an in-progress one), runs the verify gate, and checkpoints each step to a slice
  file + commit. Pauses at stage boundaries and real decisions, in plain language.

## The slice loop (repeat per source)

1. **Acquire** — fetch + extract its pages → `raw_documents`.
2. **Ingest** — drain `raw_documents` → normalize → chunk → embed → corpus tables.
3. **Retrieve** — embedQuery → vectorSearch → ranked, cited results.
4. **Spot-check** — run real queries, eyeball quality; note findings in `sources.md`.

## Recon — 2026-05-22 (homepage GET, browser UA, follow redirects)

All six are reachable, server-rendered HTML, no SPA/JS-shell markers.

| Source | Home size | ~words | Note |
|--------|----------:|-------:|------|
| Starting With God | 44 KB | 723 | leanest → **slice #1** |
| EveryStudent | 60 KB | 1283 | lean; jfa saw 403s, returned 200 here with a browser UA |
| NextStep | 129 KB | 2009 | medium |
| Cru | 169 KB | 1871 | large site |
| Jesus Film Project | 158 KB | 3971 | large, owned |
| Sightline Ministry | 297 KB | 5218 | content-heavy |

("Challenge" greps were false positives from cloudflare-hosted asset URLs — the
high word counts confirm real content, not an anti-bot page.)

## Open decisions / blockers

- ~~`.env` missing `MCP_BEARER_TOKEN`~~ — resolved by **removing** the unused
  serving/auth vars (`MCP_PORT`, `MCP_BEARER_TOKEN`, `MCP_BEARER_SCOPES`,
  `CLIENT_HASH_SECRET`, `ADMIN_PASSWORD`) from `src/env.ts`. No code reads them
  yet; the env schema now declares only what's consumed (`DATABASE_URL`,
  `OPENROUTER_API_KEY`, `EMBED_MODEL_ID`). **Update — step 6 landed (PR #19):**
  serving added `PORT` + `SERVE_BEARER_TOKENS` (HTTP `/v1`, not the old `MCP_*`
  set); `CLIENT_HASH_SECRET` / `ADMIN_PASSWORD` stay dropped.
- ~~Embedding model diverged from decision 1~~ — resolved: re-embedded on
  `openai/text-embedding-3-small` (both it and the nvidia free model are reachable
  via OpenRouter at 1536 dims; openai is the locked choice).
- ~~OpenRouter API key must be in `.env` before ingest~~ — present; Stage 2 ran.
- ~~First source = Starting With God~~ — confirmed; acquired + ingested.

## Process TODOs (deferred)

- **Seed-URL discovery → now informed by jfa.** We examined jfa's source registry
  (2026-05-25); the full findings are in
  **[docs/jfa-registry-findings.md](./jfa-registry-findings.md)** — read it before
  picking the next source or deciding how to crawl one. Two recurring forks are now
  written up as **architecture §11 FOLLOW-UP F** (adopt jfa's discovery-crawl policy
  shape — `seeds`+`allow`/`block`/`articleHints`+`contentSelectors`+`sitemaps`;
  trigger = first large source) and **FOLLOW-UP G** (Cloudflare/JS-walled sources —
  EveryStudent confirmed walled; bypass options listed). For small curated scopes
  (like `cru-10-basic-steps`, 12 ready-made URLs) the current hand-listed `seedPaths`
  code is still fine; neither follow-up is taken in slice #2.

## Done

- **Step 1** — bare-out + §6 schema + §5 enforcement gates (depcruise / max-lines / fakes-only).
- **Step 2** — Postgres storage adapters (CorpusWrite, CorpusSearch, FetchState) + in-memory fakes; integration-tested against docker Postgres.
- **2026-05-22** — lightweight tracking (this file) + vertical-slice build decision; reachability recon of all 6 sources.
- **Slice #1, Stage 1 (Acquire)** — RawDocumentStore port/fake/adapter, SourceRegistry + Starting With God entry, Acquisition context (normalizeUrl/extraction/acquireOne/acquireSource), HTTP Fetcher adapter, `pnpm acquire`. Live crawl staged **40/40 clean rows** in `raw_documents`. On `slice/starting-with-god`.
- **Slice #1, Stage 2 (Ingest)** — OpenRouter Embedder adapter, Ingestion context (normalize → jfa-ported chunk → embed → dedup → idempotent replaceDocument), RawDocumentReader read port/fake/adapter, `pnpm index`. Live run drained `raw_documents` → **40 docs / 183 chunks / 183 embeddings** (`openai/text-embedding-3-small`); idempotent re-run drains 0. 47 tests green. `pnpm index --force` = full re-index from the raw snapshot (used to re-embed off an accidental `.env` model override). On `slice/starting-with-god`.
- **Slice #1, Stage 3 (Retrieve)** — Retrieval context (`src/retrieval/`): `createRetriever` runs invariant 5 (embedQuery → vectorSearch candidate fan-out → minScore 0.3 cutoff → soft preferSourceKey tiebreak → 3-key dedup → citation). Wired into `main.wire()`; `pnpm query "<q>"` entry point; `scripts/eval.ts` step-5 TODO closed (drives the real Retriever). 12 fakes-only tests (59 total). Live query returns 5 distinct cited docs. **Decision:** 3-key dedup ⇒ at most one chunk per document (content-hash is doc-level). On `slice/starting-with-god`.
- **Slice #2 (Cru "10 Basic Steps", `cru-10-basic-steps`)** — full acquire → ingest → retrieve → eval on `slice/cru-10-basic-steps` (not yet merged). 11 docs / 35 chunks / 35 embeddings (AEM `.article-long-form` extraction). **Stage 4 built the per-source eval mechanism:** required `source` tag on golden cases, `pnpm eval --source <key>`, and a per-source breakdown (pure logic in `scripts/eval-metrics.ts`, unit-tested from `tests/`; +15 tests, 80 total). 10 persona-diverse cru golden cases authored. Whole-corpus eval (20 cases / 2 sources): recall@3 0.80 / recall@8 0.90 / MRR 0.62 / P@1 0.45; minScore **0.37 (FOLLOW-UP A re-confirmed, held)**. **Stage 4 also reframed the eval** (`8fbee09`) to source-agnostic questions + multi-source `relevant` maps scored on recall + coverage — v2 whole-corpus recall@10 1.00 / coverage 0.896 / P@1 0.80, per-source coverage cru 0.929 / swg 0.906 (resolved the v1 cru P@1 0.20 artifact). Remaining: accordion-TOC chunk hurts cru citation quality (extraction-side follow-up). See `docs/eval-approach.md`; Cru → Evaluated in `sources.md`.
- **Serving (step 6) — DONE** (`feat/serving-v1`, PR #19; closes #9 + #12). Versioned `/v1` HTTP adapter (`src/serving/http/`, Hono) over the injected `Retriever`: `POST /v1/search` + `GET /v1/health`, bearer auth + `allowedSourceKeys` scope intersection (narrow-only). Single-source **Zod** contract (`src/contracts/retrieval.schema.ts`) → generated `contracts/openapi.v1.json` (`pnpm gen:contract`) + drift test; versioning policy in architecture §3.1. Runs in `docker compose` alongside Postgres (`:8080`, no manual env); `pnpm smoke` is the consumer/CD probe. 108 tests green. **MCP adapter deferred** (a later variant over the same `Retriever`).
