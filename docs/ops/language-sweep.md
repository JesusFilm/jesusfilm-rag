# Language sweep — correcting `documents.language`

A re-runnable, per-source pass that re-derives every document's language label and
corrects the historical mislabels described in
[#73](https://github.com/JesusFilm/jesusfilm-rag/issues/73). Run it after ingesting
a new source, or any time you suspect the `language` column has drifted.

It replays the **real ingest path** for each document
(`cleanText(raw_documents.raw_content)` → `resolveLanguage(...)`), so detection is
the same code ingest uses — never a second implementation.

## TL;DR

```sh
# Preview (writes nothing) — one source, then the whole corpus:
pnpm lang:sweep --source <key>
pnpm lang:sweep --all

# Apply the corrections (label-only; embeddings never touched):
pnpm lang:sweep --all --apply

# Undo a run in one command (reads the change log it wrote):
pnpm lang:sweep --revert <logs>/changelog-all-<ts>.jsonl --apply
```

Dry-run is the default: nothing is written until you add `--apply`.

## What it does, in one screen

- **Fills nulls and fixes wrong labels; never makes a label worse.** A confident
  detection may relabel (e.g. `en → fr`) or fill a null. A weak signal may only
  *fill* a null — it never overrides or blanks a label that already exists.
- **Null is the exception, not the goal.** Every document should end up labelled.
  A short page whose detector reads a language **inside the source's declared set**
  is labelled with it, even below the 500-char detection floor — the floor guards
  against confidently-wrong *out-of-set* calls (Hindi on an English listing), not
  in-set ones. A `null` remains only when a multi-language source's detection is
  out-of-set or undetectable — a likely misfire, left for review / future LLM
  escalation. Remaining nulls are listed and highlighted at the end of the report.
- **Label-only.** The only column written is `documents.language`. Chunks and
  embeddings are never touched; the embedder is never imported.
- **Safe & revertible.** `--apply` writes each source in one transaction behind an
  optimistic guard. The change log is written **per source, before that source
  commits**, so a crash mid-`--all` still leaves a guarded, revertible log for
  everything that could have committed. `--revert` replays it; the guard makes a
  second revert a no-op.

## Modes & options

| flag | meaning |
|---|---|
| `--source <key>` \| `--all` | one registered source, or every source |
| `--mode full` (default) | re-scan every document in scope |
| `--mode blanks` | only rows where `language IS NULL` (the incremental worklist) |
| `--apply` | write changes (default: dry-run, writes nothing) |
| `--revert <log> --apply` | restore the previous labels from a change log |
| `--verify-log` | also write a per-document iteration ledger (coverage proof) |
| `--limit <n>` | cap documents scanned per source (testing) |
| `--out-dir <dir>` | where the per-run logs land (see below) |

## Where the logs go

Each run writes four local files — a human `report-*.md`, the full `changes-*.csv`,
the `changelog-*.jsonl` (the revert source), and (with `--verify-log`) a
`verify-*.jsonl` coverage ledger. **These are local run logs, not committed
artifacts.** The output directory is resolved in this order:

1. the `--out-dir <dir>` flag, if given;
2. the **`LANGUAGE_SWEEP_OUT_DIR`** environment variable, if set;
3. otherwise `<working-directory>/reports` (git-ignored).

Reviewing these logs after a run is part of verifying a sweep — the report's
"Eyeball these" and "Left null" sections are the human review surface.

## Re-embedding does not undo a sweep

Ingest never nulls out an established language: `replaceDocument` writes
`language = coalesce(new, existing)`, so a re-embed of a below-floor document
(where detection abstains to `null`) keeps the swept label, while a genuinely
confident *new* detection still wins. You do **not** need to re-run the sweep after
a re-embed. (A plain re-crawl of unchanged content skips the write entirely.)

## Coverage & zero-change runs

Every run reports scanned-vs-in-scope honestly; a partial scan (via `--limit`) is
flagged, not hidden. A source with no changes is a *verified* no-op: with
`--verify-log`, the ledger has one line per document, provably equal to the
in-scope count — not an early exit.

## Testing

The decision logic is unit-tested (every fallback-ladder branch, the never-blank
policy, a no-null-over-non-null property test, and the re-embed COALESCE guard
against a live DB). The CLI is exercised end-to-end by a dry-run simulation
(`sim-run.sh`, kept out of the repo) covering every argument failure mode and the
apply → idempotent re-apply → revert → guarded re-revert cycle.
