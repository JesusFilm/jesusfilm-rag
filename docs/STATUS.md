# STATUS — jesusfilm-rag

Live "you are here" for the build. Stable design lives in
[architecture.md](./architecture.md); per-source progress in
[sources.md](./sources.md). **This file is the churn layer** — update it
whenever state changes; keep it to ~one screen.

_Last updated: 2026-05-22_

## You are here

**Slice #1 is acquired AND ingested — the corpus is now queryable-ready.** Both
the Acquisition and Ingestion contexts are built and proven end-to-end:
`pnpm acquire` staged 40 clean rows in `raw_documents`, then `pnpm index` drained
them into the corpus — **40 docs → 183 chunks → 183 embeddings** (chunk_count
consistent, chunks/doc avg 4.6, idempotent re-run drains 0). 46 tests green
(incl. live-DB integration). **Retrieval / eval do not exist yet** — the corpus
is populated but nothing queries it.

⚠ **One open decision blocks Stage 3:** the corpus was embedded with
`nvidia/llama-nemotron-embed-vl-1b-v2:free` (the `EMBED_MODEL_ID` in `.env`), not
locked decision-1's `openai/text-embedding-3-small`. See "Open decisions" below.

## Next action

**Slice #1 — Starting With God — is in progress** on branch
`slice/starting-with-god`. The unpacked sub-step checklist, decisions, and
resume hint live in **[docs/slices/starting-with-god.md](./slices/starting-with-god.md)**
— that file + the slice branch's git log are the cold-start resume contract.

**Stages 1 (Acquire) + 2 (Ingest) are done** ✅. **Stage 3 (Retrieve) is next**,
pending the embedding-model decision: build `src/retrieval/` (embedQuery →
vectorSearch fan-out → cosine rank → minScore 0.3 → 3-key dedup → citation) over
the existing `CorpusSearchStore` + the OpenRouter Embedder query side.

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

- **⚠ Embedding model diverges from locked decision 1 — resolve before Stage 3.**
  Slice #1's corpus (183 chunks) is embedded with
  `nvidia/llama-nemotron-embed-vl-1b-v2:free` (the `.env` `EMBED_MODEL_ID`, 1536
  dims via OpenRouter), not decision-1's `openai/text-embedding-3-small`. The
  adapter used the env-configured model correctly. Retrieval works as long as
  queries use the same model. Decide: **(A)** accept the nvidia free model as the
  new decision-1 (update architecture.md), or **(B)** re-embed with
  `openai/text-embedding-3-small` (`pnpm index --force`) if reachable. Likely
  cause: OpenRouter's embeddings catalogue is limited (openai model 404s).
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
- **Slice #1, Stage 2 (Ingest)** — OpenRouter Embedder adapter, Ingestion context (normalize → jfa-ported chunk → embed → dedup → idempotent replaceDocument), RawDocumentReader read port/fake/adapter, `pnpm index`. Live run drained `raw_documents` → **40 docs / 183 chunks / 183 embeddings**; idempotent re-run drains 0. 46 tests green. ⚠ embedded with the `.env` nvidia free model (open decision above). On `slice/starting-with-god`.
