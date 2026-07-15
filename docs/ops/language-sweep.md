# Language sweep — correcting `documents.language`

A re-runnable, per-source pass that re-derives every document's language label and
corrects the historical mislabels described in
[#73](https://github.com/JesusFilm/jesusfilm-rag/issues/73) /
[#84](https://github.com/JesusFilm/jesusfilm-rag/issues/84). Run it after ingesting
a new source, or any time you suspect the `language` column has drifted.

Detection is an **LLM** (`LANG_DETECT_MODEL_ID`, default `google/gemini-2.5-flash-lite`,
reached over OpenRouter with `OPENROUTER_API_KEY`) — accurate **regardless of
length**, unlike the pure `tinyld` detector ingest uses, which is confidently wrong
on short prose. This is the deliberate corrective layer; ingest stays on `tinyld`.
See [ADR-0009](../decisions/0009-llm-language-detection-sweep.md). It replays the
real ingest text path per document (`cleanText(raw_documents.raw_content)`), so it
labels exactly what a future re-ingest would see — never a second scraper.

## TL;DR

```sh
# Preview (writes nothing) — one source, then the whole corpus:
pnpm lang:sweep --source <key>
pnpm lang:sweep --all

# Apply the corrections (label-only; embeddings never touched):
pnpm lang:sweep --all --apply

# Undo a run in one command (reads the change log it wrote):
pnpm lang:sweep --revert <logs>/changelog-all-<ts>.jsonl --apply

# Same, against PRODUCTION (prompts for credentials):
pnpm lang:sweep:production --all               # dry-run
pnpm lang:sweep:production --source cru --apply
```

Dry-run is the default: nothing is written until you add `--apply`. **Dry-run costs
the same as apply** (detection runs either way), so the first dry-run is the real
cost checkpoint — a full-corpus run is cents to a few dollars at the default model.

## What it does, in one screen

- **Fills nulls and fixes wrong labels; never makes a label worse.** A confident LLM
  verdict may relabel (e.g. `en → fr`) or fill a null. A weak/abstain signal may only
  *fill* a null — it never overrides or blanks a label that already exists
  ([ADR-0008](../decisions/0008-language-label-lifecycle.md)).
- **No length floor — the LLM's own abstention is the safety valve.** A non-null
  verdict is trusted at any length, so a short French page stamped `en` is corrected.
  The model returns `null` only when it genuinely can't tell (empty / pure markup /
  even mix); those are the documented exceptions, listed at the end of the report.
- **Label-only.** The only column written is `documents.language`. Chunks and
  embeddings are never touched; the embedder is never imported.
- **Parallel but safe.** Documents are detected through a small concurrency pool
  (`--concurrency`, default 3), and a single serialized writer owns each log file so
  the workers never interleave partial lines. A per-document detector failure (after
  retries) is a logged **anomaly** — that row is left untouched, never a crashed run.
- **Safe & revertible.** `--apply` writes each source in one transaction behind an
  optimistic guard. The change log is streamed **per document, before its source
  commits**, so a crash mid-`--all` still leaves a guarded, revertible log.
  `--revert` replays it; the guard makes a second revert a no-op.

## Modes & options

| flag | meaning |
|---|---|
| `--source <key>` \| `--all` | one registered source, or every source |
| `--mode full` (default) | re-scan every document in scope |
| `--mode blanks` | only rows where `language IS NULL` (the incremental worklist) |
| `--apply` | write changes (default: dry-run, writes nothing) |
| `--revert <log> --apply` | restore the previous labels from a change log |
| `--concurrency <n>` | parallel detector calls per source (default 3) |
| `--max-detect-chars <n>` | cleaned content sent to the LLM (default 8000) |
| `--llm-review` | after the run, an LLM sanity pass over the proposed changes |
| `--verify-log` | also write a per-document iteration ledger (coverage proof) |
| `--limit <n>` | cap documents scanned per source (testing) |
| `--out-dir <dir>` | where the per-run logs land (see below) |

## Where the logs go

Each run writes a human `report-*.md`, a `results-*.csv` with **every scanned
document** (filter `changed=1` for just the corrections, plus a `detected`,
`confidence`, and LLM `evidence` column), the `changelog-*.jsonl` of changes only
(the revert source), and — with the respective flags — a `verify-*.jsonl` coverage
ledger and a `review-*.md` LLM verdict. **These are local run logs, not committed
artifacts.** The output directory is resolved in this order:

1. the `--out-dir <dir>` flag, if given;
2. the **`LANGUAGE_SWEEP_OUT_DIR`** environment variable, if set;
3. otherwise `<working-directory>/reports` (git-ignored).

Reviewing these logs after a run is part of verifying a sweep — the report's
"Eyeball these" and "Left null" sections (and the `--llm-review` verdict) are the
human/agent review surface. The `evidence` quote in the CSV motivates each relabel.

## Running against production

`pnpm lang:sweep:production` is the credential-gated counterpart. It NEVER reads the
DB URL from `.env`; credentials are supplied one of two ways (same abstraction as the
other `*-production` scripts — see [`prod-ingest.md`](./prod-ingest.md)):

- **Interactive** (a human at a terminal): the script prints a `PRODUCTION
  language-sweep` banner and what it will do, asks **Y/N before** anything sensitive,
  prompts for `DATABASE_URL` / `OPENROUTER_API_KEY` / `EMBED_MODEL_ID`, shows a
  **redacted** summary, and asks **Y/N again** before running.
- **Headless** (`--non-interactive`, e.g. the always-on Ops VM / CI):
  `doppler run -- pnpm lang:sweep:production --all --non-interactive` injects the
  `forge-rag/prd` secrets (`JFRAG_POSTGRESQL_DB_URL`, `JFRAG_OPENROUTER_API_KEY`, …),
  which the script maps onto the three credentials. An `--apply` run additionally
  requires `JFRAG_ALLOW_PROD_WRITE=1`. Optionally pass `--expect-host <substr>` to
  fail closed unless the resolved DB host matches.

All the sweep flags above apply. Start with a dry-run, review the report + the actual
token spend, then re-run with `--apply`. **Never** print a secret
(`doppler secrets`, `printenv`, `echo $JFRAG_...`) — creds hand off shell→subprocess
only.

## Re-embedding does not undo a sweep

Ingest never nulls out an established language: `replaceDocument` writes
`language = coalesce(new, existing)`, so a re-embed keeps the swept label. Note
ingest uses `tinyld` while the sweep uses the LLM — but where the LLM corrected a
short page, `tinyld` abstains to `null` on re-ingest, and `coalesce` keeps the swept
label; only a *confident* new `tinyld` detection wins. So the sweep's corrections
survive a re-embed and you do **not** need to re-run it after one.

## Coverage & zero-change runs

Every run reports scanned-vs-in-scope honestly; a partial scan (via `--limit`) is
flagged, not hidden. A source with no changes is a *verified* no-op: with
`--verify-log`, the ledger has one line per document, provably equal to the in-scope
count — not an early exit.

## Testing

The pure decision logic is unit-tested: `resolveFromLlm`'s branches (a confident
relabel of a **short** doc, the out-of-set warning, the abstain-→-null path), the
never-blank policy, and arg parsing for every flag. The OpenRouter adapter has a
mocked-`fetch` test (JSON parse, fenced-block tolerance, non-ISO→abstain, transient
429 retry, hard-fail on 4xx). The concurrency pool and serialized append-writer are
unit-tested for index-order and no-interleaving. Detection itself is behind the
`LanguageDetector` port, so tests use `FakeLanguageDetector` — no network.
