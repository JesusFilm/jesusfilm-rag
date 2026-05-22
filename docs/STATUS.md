# STATUS — jesusfilm-rag

Live "you are here" for the build. Stable design lives in
[architecture.md](./architecture.md); per-source progress in
[sources.md](./sources.md). **This file is the churn layer** — update it
whenever state changes; keep it to ~one screen.

_Last updated: 2026-05-22_

## You are here

**Slice #1 has real content acquired.** The Acquisition context is built and
proven end-to-end: `pnpm acquire --source starting-with-god` crawled the live
site and staged **40 clean article rows** in `raw_documents` (avg 6,843 chars,
nav/boilerplate stripped, entities decoded). 29 tests green (incl. live-DB
integration). Ingestion / retrieval / eval do **not** exist yet — the corpus
tables (`documents`/`chunks`/`chunk_embeddings`) are still empty.

## Next action

**Slice #1 — Starting With God — is in progress** on branch
`slice/starting-with-god`. The unpacked sub-step checklist, decisions, and
resume hint live in **[docs/slices/starting-with-god.md](./slices/starting-with-god.md)**
— that file + the slice branch's git log are the cold-start resume contract.

**Stage 1 (Acquire) is done** ✅ — 40 rows staged. **Stage 2 (Ingest) is next**
and needs the **OpenRouter API key in `.env`** before it can run: build the
OpenRouter Embedder adapter + the Ingestion context (normalize → chunk → embed →
dedup) + `scripts/index.ts` to drain `raw_documents` → corpus tables.

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

- **OpenRouter API key** must be in `.env` before the *ingest* stage of slice #1
  (acquire didn't need it). **This is the blocker for Stage 2.**
- ~~First source = Starting With God~~ — confirmed; acquired (40 rows).

## Done

- **Step 1** — bare-out + §6 schema + §5 enforcement gates (depcruise / max-lines / fakes-only).
- **Step 2** — Postgres storage adapters (CorpusWrite, CorpusSearch, FetchState) + in-memory fakes; integration-tested against docker Postgres.
- **2026-05-22** — lightweight tracking (this file) + vertical-slice build decision; reachability recon of all 6 sources.
- **Slice #1, Stage 1 (Acquire)** — RawDocumentStore port/fake/adapter, SourceRegistry + Starting With God entry, Acquisition context (normalizeUrl/extraction/acquireOne/acquireSource), HTTP Fetcher adapter, `pnpm acquire`. Live crawl staged **40/40 clean rows** in `raw_documents`. On `slice/starting-with-god`.
