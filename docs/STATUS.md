# STATUS — jesusfilm-rag

Live "you are here" for the build. Stable design lives in
[architecture.md](./architecture.md); per-source progress in
[sources.md](./sources.md). **This file is the churn layer** — update it
whenever state changes; keep it to ~one screen.

_Last updated: 2026-05-25_

## You are here

**Slice #1 (Starting With God) is DONE and MERGED to `main`** (PR #2,
2026-05-25) — acquired (40 rows), ingested (**40 docs / 183 chunks / 183
embeddings**, `openai/text-embedding-3-small`), retrievable, evaluated:
**recall@3 0.90 · recall@8 1.00 · MRR 0.82 · P@1 0.70** @ minScore **0.37**.

**Slice #2 is NextStep** (re-targeted from EveryStudent), IN PROGRESS on
`slice/nextstep` at **Stage 1 (Acquire)**. EveryStudent is parked `Blocked` —
its content pages are behind a Cloudflare JS managed challenge our plain fetcher
can't pass (record in `docs/slices/everystudent.md`); the `slice/nextstep` branch
carries that record forward. NextStep passed the content-level probe (200, no
challenge) and is the leanest reachable alternative.

## Next action

**Drive slice #2 — NextStep.** The unpacked sub-step checklist, decisions, and
resume hint live in **[docs/slices/nextstep.md](./slices/nextstep.md)**. Next
concrete step: content-level probe of nextstep.is (confirm a real article returns
200, no CF challenge) + hand-curate its seed URLs (the `discover-seeds` helper
stays deferred).

Two pieces unblock now that a 2nd source is landing — both fold into slice #2's
Stage 4: the **per-source eval** mechanism (`source` tag per golden case + `pnpm
eval --source <key>` + per-source breakdown), and **FOLLOW-UP E** (consumer
`excludedSourceKeys` filter — surfaced at slice close per the architecture trigger).

→ **Resume with `/slice`** — it reads this file + the slice file, checks out the
branch, and continues at the first unchecked sub-step.

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
  `OPENROUTER_API_KEY`, `EMBED_MODEL_ID`). They return in step 6 with the MCP
  serving adapter that actually reads them.
- ~~Embedding model diverged from decision 1~~ — resolved: re-embedded on
  `openai/text-embedding-3-small` (both it and the nvidia free model are reachable
  via OpenRouter at 1536 dims; openai is the locked choice).
- ~~OpenRouter API key must be in `.env` before ingest~~ — present; Stage 2 ran.
- ~~First source = Starting With God~~ — confirmed; acquired + ingested.

## Process TODOs (deferred)

- **Seed-URL discovery.** Seed URLs are currently **curated by hand** from a
  source's sitemap/homepage (worked cleanly for Starting With God — 40 URLs).
  Before source #2, decide whether to build a `discover-seeds` helper (a guided
  skill or a `scripts/discover-seeds.ts`) that fetches a site's sitemap/homepage,
  lists candidate content URLs, and filters nav/category/cross-site links for a
  human to curate into a registry entry. Deferred until we start the next source.

## Done

- **Step 1** — bare-out + §6 schema + §5 enforcement gates (depcruise / max-lines / fakes-only).
- **Step 2** — Postgres storage adapters (CorpusWrite, CorpusSearch, FetchState) + in-memory fakes; integration-tested against docker Postgres.
- **2026-05-22** — lightweight tracking (this file) + vertical-slice build decision; reachability recon of all 6 sources.
- **Slice #1, Stage 1 (Acquire)** — RawDocumentStore port/fake/adapter, SourceRegistry + Starting With God entry, Acquisition context (normalizeUrl/extraction/acquireOne/acquireSource), HTTP Fetcher adapter, `pnpm acquire`. Live crawl staged **40/40 clean rows** in `raw_documents`. On `slice/starting-with-god`.
- **Slice #1, Stage 2 (Ingest)** — OpenRouter Embedder adapter, Ingestion context (normalize → jfa-ported chunk → embed → dedup → idempotent replaceDocument), RawDocumentReader read port/fake/adapter, `pnpm index`. Live run drained `raw_documents` → **40 docs / 183 chunks / 183 embeddings** (`openai/text-embedding-3-small`); idempotent re-run drains 0. 47 tests green. `pnpm index --force` = full re-index from the raw snapshot (used to re-embed off an accidental `.env` model override). On `slice/starting-with-god`.
- **Slice #1, Stage 3 (Retrieve)** — Retrieval context (`src/retrieval/`): `createRetriever` runs invariant 5 (embedQuery → vectorSearch candidate fan-out → minScore 0.3 cutoff → soft preferSourceKey tiebreak → 3-key dedup → citation). Wired into `main.wire()`; `pnpm query "<q>"` entry point; `scripts/eval.ts` step-5 TODO closed (drives the real Retriever). 12 fakes-only tests (59 total). Live query returns 5 distinct cited docs. **Decision:** 3-key dedup ⇒ at most one chunk per document (content-hash is doc-level). On `slice/starting-with-god`.
