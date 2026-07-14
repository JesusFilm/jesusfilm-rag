# Language sweep — test evidence

Proof the sweep was exercised end-to-end before it touched real data. Two layers:
deterministic unit tests for the decision logic, and a dry-run simulation that
drives the CLI through every failure mode and the write/revert path.

## 1. Unit tests (`src/ingestion/resolve-language.test.ts`)

20 tests, all passing, covering every branch of the two pure decision functions:

- **The fallback ladder** (`resolveFromSignals`) — confident detection kept
  verbatim; out-of-set warning passed through; monolingual fallback above/below
  the floor; multilingual in-set lean; the two ways a multilingual doc stays
  null; the empty-declared case; and the exact floor boundary.
- **The safety policy** (`decideSweep`) — confident relabel/fill/confirm; a weak
  signal fills a null but **never blanks or overrides** an existing label; a
  disagreeing weak signal is flagged for review, not applied. A property test
  asserts the invariant *a write never sets a non-null label to null*.

Full project suite: **319 tests / 30 files, green** — the new `cleanText` export
and the `thelife` registry change broke nothing.

## 2. Dry-run simulation (`sim-run.sh`, 19 cases, all pass)

### Argument failure modes — every one exits non-zero with a clear message

| case | result |
|---|---|
| unknown flag (`--bogus`) | `error: unknown or misplaced argument: --bogus` |
| missing flag value (`--source` alone) | `error: flag --source requires a value` |
| `--source` **and** `--all` | `error: use exactly one of --source <key> or --all` |
| no scope given | `error: specify a source: --source <key> or --all` |
| invalid `--mode sideways` | `error: --mode must be 'full' or 'blanks'` |
| negative `--limit -3` | `error: --limit must be a positive integer` |
| non-numeric `--limit abc` | `error: --limit must be a positive integer` |
| unknown source | `error: unknown source 'nope'. Known: …` |
| `--revert` + `--source` | `error: --revert cannot be combined with --source/--all` |
| `--help` | usage text, exit 0 |

### Operational paths

| case | result |
|---|---|
| empty in-scope set (`thelife --mode blanks`, 0 nulls) | `0 scanned, 0 change(s)` — clean no-op |
| no-change source (`jesusfilm-org`, all English) | `349 scanned, 0 change(s)` |
| **DB unreachable** (dead port) | exits 1: `error: database connection failed (ECONNREFUSED)` — no hang, no partial write |
| revert a missing changelog | exits 1: `ENOENT … no such file` |

### Coverage proof — "0 changes" is verified, not skipped

The no-change `jesusfilm-org` run wrote a per-document ledger of **349** lines,
matching **349** documents in the DB for that source. Every document was
re-derived; nothing was skipped.

### Apply + revert cycle (`thelife`, 2 rows, fully reversible)

| step | result |
|---|---|
| apply | `2 applied` — the two French docs went `en → fr` (before: 0 `fr`, after: 2) |
| **idempotent re-apply** | `0 change(s)` — a second run is a no-op (resume-safe) |
| revert | `Reverted 2; skipped 0` — labels restored (fr back to 0) |
| **guarded re-revert** | `Reverted 0; skipped 2` — the guard refuses to double-revert rows that moved |

### Bugs found and fixed during simulation

1. **Test-harness bug (not the script):** the first sim run reverted the wrong
   changelog — `ls -t | head -1` grabbed an *empty* changelog written by an
   earlier empty-scope case. Reverting the correct file restored the rows
   perfectly. Fixed by isolating each apply's output dir and capturing the
   changelog path from the run's own stdout.
2. **Blank error line on DB failure:** a postgres `AggregateError` carries an
   empty `.message`, so the operator saw `error:` with nothing after it. Added a
   fallback to the error `code`, now `error: database connection failed (ECONNREFUSED)`.
3. **Policy flaw caught by the full-corpus dry-run (the important one):** the
   first draft would have **blanked 17 short English FamilyLife pages** to null
   (they sit below the 500-char floor on a multi-language source). Blanking a
   correct label is the exact error the sweep exists to avoid. Fixed by the
   `decideSweep` policy: a weak signal may only *fill* a null, never override or
   blank an existing label. Re-run: FamilyLife 17 → **0** changes.

## 3. LLM-judge verification gates

Three independent gates, each run by separate LLM judges reading the actual
artifacts (not this summary).

### Gate 1 — correctness (does each label match the text?): PASS
A judge read the content snippet of all **116** proposed changes and judged the
language directly. Result: **116/116 correct, 0 wrong, 0 uncertain** — including
the 2 French relabels and 7 untranslated-English articles served on Spanish URLs
(correctly `en`, because the body text is English). The known blind spot (short
foreign page read as the source's main language) did not fire. It flagged, fairly,
that ~a third of the 76 remaining nulls are clearly single-language but held back
by the multilingual + 500-char floor — a deliberate recall trade-off, not an error.

### Gate 2 — script vs. intent, scored 0–10 by a 3-judge panel (median)
The rubric: extract a checklist from the intent (any item unmet → 0); all met → 5
floor; the upper 5 only for implementation quality; any real security / failover /
network / resume / corruption defect caps at 5; pass = 7–8.

- **Round 1: scores 8 / 6 / 5 → median 6 (FAIL).** Two judges found the same real
  defect: the change log was written only *after* the whole `--all` loop, so a
  crash mid-run left committed changes with no revert log. A third found a
  hardcoded "(100%)" coverage line that lied under `--limit`.
- **Fixes:** split analyze from apply so each source's change log is persisted
  **before** that source commits (guarded revert makes a logged-but-uncommitted
  change a safe no-op); made the coverage line honest with three distinct states.
- **Round 2: scores 8 / 8 / 8 → median 8 (PASS).** All three independently traced
  the crash-safety property and confirmed it holds; remaining notes are hardening
  (no `fsync` on the log = a narrow power-loss window) and cosmetic, not defects.

### Gate 3 — report readability: PASS
A judge assessed the report on two criteria: reviewable without the codebase, and
low verbosity. Round 1 **FAILED** — the "Filled" and "Eyeball these" tables showed
the same 25 rows verbatim. Fixed by making "Eyeball these" a genuine subset (the
12 least-confident calls, lowest first) and adding a shorthand legend. Round 2:
**reason-friendly PASS + low-verbosity PASS**.

## 4. Applied to the local corpus

Ran `--all --apply` against the full local database. Language distribution moved:

| label | before | after | Δ |
|---|---:|---:|---:|
| en | 10309 | 10380 | +71 |
| es | 448 | 489 | +41 |
| fr | 157 | 159 | +2 |
| null | 190 | 76 | −114 |
| zh / vi | 332 / 1 | 332 / 1 | — |

116 rows written, 0 skipped: 2 `thelife` articles corrected `en → fr`, 114 cru
nulls filled (73 en + 41 es). The 76 remaining nulls are all pre-existing,
below-floor documents on the trilingual cru source — the documented exception.
One-command undo: `tsx scripts/language-sweep.ts --revert <changelog> --apply`.
