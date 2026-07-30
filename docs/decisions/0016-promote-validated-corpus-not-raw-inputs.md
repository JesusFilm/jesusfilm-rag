# ADR-0016 — Promote the VALIDATED CORPUS local→prod, not the raw inputs

- Status: **Proposed** — the guard design below is the thing to review. No executable prod-write path ships with this ADR; `scripts/copy-corpus.sh` is specified here and built separately once this is accepted.
- Date: 2026-07-31
- Related: **supersedes the "copy the full corpus" alternative rejected in [ADR-0014](./0014-bulk-copy-raw-documents-to-prod.md)** (alternative 2). ADR-0014's `copy-raws.sh` path itself stands and keeps its walled-source justification. Depends on [ADR-0007](./0007-language-decision-thresholds-null-policy.md) / [ADR-0009](./0009-llm-language-detection-sweep.md) (why prod re-derivation diverges) and [ADR-0013](./0013-language-sweep-operational-policy.md).

## Context

Promotion today re-derives the corpus in prod. Either `acquire:production` →
`index:production`, or `copy-raws.sh` → `index:production`. Both end in
`index:production`, which runs the **full ingest pipeline** in prod: normalize →
detect language → chunk → embed → write.

ADR-0014 considered copying the finished corpus instead and rejected it:

> *"Copy the full corpus (`documents`/`chunks`/`chunk_embeddings`) local→prod to skip prod embedding too. Requires UUID foreign-key remapping across four tables (`sources`→`documents`→`chunks`→`chunk_embeddings`) and moves large embedding blobs. Embedding twice is cheap by comparison, so the added complexity and risk are not worth it."*

That was a **cost** argument, and at the time it was the only argument available:
if prod re-derivation produces the same corpus, paying twice for embedding is the
only difference and it is small.

**Prod re-derivation does not produce the same corpus.** Measured 2026-07-31 on
the #111 campaign:

| | Local, after the pipeline ran | What `index:production` would produce in prod |
|---|---|---|
| Null-language documents | **0** | **225** |
| Mislabelled documents | **0** | **182** |

Ingest detects language with `tinyld` (ADR-0007). The corrective LLM sweep
(ADR-0009) is a *separate, deliberate* pass that runs against **one database**.
ADR-0008's `coalesce(new, existing)` preserves an established label within a
database; it cannot carry one across two. So every language correction validated
locally is discarded the moment prod re-ingests, and prod must be swept again —
a second metered LLM pass, plus a second window in which prod is serving a corpus
nobody has evaluated.

The same divergence is already documented from the other direction in
[`docs/ops/copy-raws.md`](../ops/copy-raws.md): *"a language-scoped eval drifts
iff that LANGUAGE'S SUBCORPUS differs local↔prod."* Re-derivation is what makes
the subcorpora differ.

ADR-0014's two mechanical objections were also measured, and both are weaker than
stated:

| ADR-0014 claim | Measured 2026-07-31 |
|---|---|
| "UUID foreign-key remapping across four tables" | **One scalar substitution in two columns** — `documents.source_id` and `chunks.source_id`. `documents.id`, `chunks.id`, `chunks.document_id` and `chunk_embeddings.chunk_id` all copy **verbatim** (uuids are globally unique). `chunk_embeddings` carries no `source_id` at all. |
| "moves large embedding blobs" | True — 280 MB for the 48-source campaign, 920 MB whole-corpus, in `COPY … TO STDOUT` text form. Moved in **24.7 s** DB-side with the HNSW index live. |
| (unstated worry) `halfvec` fidelity | Text COPY round-trips **byte-exactly**: 500/500 rows identical, 0 differ. |

Proof run: a scratch database with prod's schema and **independent `sources.id`
uuids** (the real local↔prod condition) received the whole estate — 48 sources /
2,532 documents / 14,514 chunks / 14,514 embeddings. Checksum over
`source key + canonical_url + language + ord + chunk text + embedding` was
**identical on both sides**; zero orphans; vector search and keyword search both
functional in the copy.

The forcing question: should prod be an *independent re-derivation* of the source
material, or a *replica of a corpus that has passed local QA*?

## Decision

**Promote the validated corpus.** For a source that has completed the local
pipeline — acquire → index → **language sweep** → eval — prod receives
`documents`, `chunks` and `chunk_embeddings` verbatim, with `sources.id` remapped.
`index:production` is **not** run for that source.

```text
acquire (local)  →  index (local)  →  lang:sweep (local)  →  eval (local)   ← QA gate
                                                                  ↓
                                                   copy-corpus.sh --apply
                                                                  ↓
                                                       eval:production      ← certify
```

Prod becomes a **replica of a corpus that passed QA**, rather than an independent
re-derivation that nothing checks. This is the substance of the decision and also
its main risk — see Consequences.

### Scope: per-source and whole-estate, both first-class

The tool takes **exactly one** of three scope flags, mirroring `lang:sweep`:

| Flag | Scope | Use |
|---|---|---|
| `--source <key>` | one registered source | the normal single-slice promotion |
| `--prefix <str>` | every source key with that prefix (e.g. `everystudent`) | a campaign estate — #111 is 48 keys, and 48 invocations is its own failure mode |
| `--all` | every registered source | a full-corpus re-seed / disaster recovery |

Scope is resolved to an explicit key list, **printed in full**, and confirmed
before anything is written. `--all` additionally requires `--i-mean-all` — the
one scope that can touch a source the operator was not thinking about.

### What replaces what

- `acquire:production` — **not needed** for a promoted source. Still the right
  tool for acquiring a source that was never acquired locally.
- `index:production` — **not needed** for a promoted source. Still the right tool
  for prod-side re-embeds and model migrations.
- `lang:sweep:production` — **not needed** for a promoted source; the swept labels
  arrive with the copy. Still the tool for correcting a source that reached prod
  by the re-derivation path.
- `eval:production` — **still required**, and it gets *better*. Under
  re-derivation, a local↔prod eval difference could be either a real prod problem
  or expected re-derivation noise, and the two were not separable. Under
  replication the corpus is provably identical, so any difference is a real prod
  problem.

## The guard design (this is the part to review)

The risk this creates is a **new write path into the prod corpus that deletes
before it inserts.** `copy-raws.sh` only ever appends to a flat staging table.
This one issues `DELETE` against the live corpus. The guards are therefore
stronger than `copy-raws.sh`'s, not equal to them, and are layered so that no
single mistake is sufficient.

### L0 — the script issues no DDL, ever

**Hard invariant: `copy-corpus.sh` executes only `SELECT`, `DELETE`, `COPY` and
`BEGIN`/`COMMIT`/`ROLLBACK`.** It contains no `CREATE`, `ALTER`, `DROP` or
`TRUNCATE` — not in any branch, not behind any flag. Schema changes remain
exclusively `pnpm db:migrate`. This is asserted by a test that greps the script
for DDL keywords, so it cannot regress silently.

*Addresses: "breaks schema".* The tool is structurally incapable of it.

### L1 — cannot point at the wrong database

Inherited verbatim from `copy-raws.sh`, which has run in production:

- Target resolved from `DATABASE_URL` ‖ `JFRAG_POSTGRESQL_DB_URL` — **never** from
  `.env` / `.env.local` (those are read for the *source* side only).
- `--expect-host <substr>`, matched on an exact host or a dot boundary, so
  `rlwy.net` cannot be satisfied by `evilrlwy.net`. **Required** with
  `--non-interactive`.
- Refuses when source and target URLs are equal.
- Interactive runs print a redacted target + row counts and re-confirm.

### L2 — cannot run by accident

- **Dry-run is the default.** Nothing is written without `--apply`. (Stronger than
  `copy-raws.sh`, which writes on confirmation; matches `lang:sweep`.)
- `--non-interactive` additionally requires `JFRAG_ALLOW_PROD_WRITE=1`, so a stray
  `--non-interactive` in a script cannot start an unattended prod write alone.
- `--all` additionally requires `--i-mean-all`.

### L3 — cannot delete more than intended

*This is the "engineer accidentally wipes prod" layer.*

- **No `TRUNCATE`, no unscoped `DELETE`.** The only delete is
  `DELETE FROM documents WHERE source_id = $1`, where `$1` was resolved by
  `SELECT id FROM sources WHERE key = $2` **in the target**. Chunks and embeddings
  go by `ON DELETE CASCADE`, never by their own statement.
- **Key round-trip assertion.** Before deleting, assert the resolved uuid maps
  *back* to the expected key in the target. A uuid that resolves to a different
  key aborts the run.
- **Blast-radius ceiling.** Count the rows the delete would remove and the rows
  about to be inserted. **Refuse any net shrink** unless `--allow-shrink <n>` is
  passed with the exact expected figure. You cannot delete 10,000 prod documents
  in order to insert 13 — the arithmetic stops it before the transaction opens.
- **The ceiling is enforced per source, not in aggregate.** Under `--prefix` or
  `--all`, one malformed key cannot be masked by 47 healthy ones.
- **Sources outside the resolved key list are never referenced** in any statement.

### L4 — cannot leave prod in a broken half-state

- The delete and all four `COPY`s run in **one transaction** on the target. A
  network drop mid-copy rolls the whole thing back; there is no partial corpus.
- **Verification runs INSIDE that transaction, and the commit is conditional.**
  The checksum over `source key + canonical_url + language + ord + chunk text +
  embedding` is computed on both sides and compared **before `COMMIT`**. Mismatch
  → `ROLLBACK`, non-zero exit, prod untouched.

  This is the strongest guard in the design: **prod can only ever move to a state
  that is provably byte-identical to the locally-validated corpus.** A corrupt
  copy cannot commit.

### L5 — cannot corrupt through drift or model mixing

- **Schema fingerprint pre-flight.** Compare `information_schema.columns` (name,
  ordinal, data type, nullability) for all five tables, local vs target. **Any**
  difference aborts before a single row moves. Catches migration drift between a
  developer's laptop and prod — the failure mode that would otherwise produce a
  silently mis-aligned `COPY`.
- **Embedding-model guard.** Refuse unless the in-scope local rows have exactly
  **one** distinct `chunk_embeddings.embedding_model`, and any existing prod rows
  outside the scope use that same value. Mixing two models in one HNSW index
  produces silently wrong retrieval with no error — this is the one corruption
  mode with no loud symptom.
- **Vector dimension assertion** on `halfvec` typmod both sides.
- **`search_tsv` is never in a column list.** It is `GENERATED ALWAYS AS … STORED`;
  Postgres rejects it in `COPY` and regenerates it on insert (verified:
  14,514/14,514 populated, keyword search functional).

### L6 — recoverable when everything above fails

- **Pre-write backup, taken by the script, before the delete.** `pg_dump` of
  exactly the in-scope prod rows to a timestamped local file, and the **restore
  command printed on completion**. This converts "an engineer wiped prod" from an
  incident into a five-minute restore that needs nobody's permission.
- The backup is written **before** the transaction opens and is retained
  regardless of outcome.
- Railway's own backups remain the second line, not the first.

### L7 — the inverted `ingested_at` rule

`raw_documents` is copied alongside the corpus so prod keeps a reproducible raw
snapshot (a prod-side sweep or re-embed needs it). **`ingested_at` must be copied
STAMPED**, so a later `index:production` drains nothing.

⚠️ **This is the exact inverse of `copy-raws.sh`**, which deliberately *omits*
`ingested_at` so rows land **pending**. Same column, same estate, opposite rule,
and getting it backwards silently re-embeds and re-detects the whole source —
reintroducing the divergence this ADR exists to remove. Both scripts carry a
header block naming the other.

## Alternatives rejected

- **Keep re-deriving in prod (the status quo, ADR-0014's position).** Every local
  language correction is discarded and must be re-bought as a second prod sweep,
  during which prod serves an unevaluated corpus. The cost argument that justified
  it assumed local and prod converge; measured, they differ by 225 nulls and 182
  mislabels.
- **Fix it by always running `lang:sweep:production` after `index:production`.**
  Works, and stays the right answer for sources promoted the old way. But it pays
  the LLM pass twice, leaves a window where prod is wrong, and still cannot
  guarantee prod matches what eval approved — the sweep is not deterministic
  across runs (one document needed a retry in the local pass). Replication removes
  the class of problem; a second sweep only narrows it.
- **Make `index:production` use the LLM detector too.** Rejected on ADR-0009's own
  grounds — cost and latency on the high-volume ingest path — and it would still
  re-derive chunk boundaries and embeddings independently, so prod could differ
  from the evaluated corpus in other ways.
- **Copy with `pg_dump`/`pg_restore` instead of a bespoke script.** No per-source
  scoping, no source_id remap, no conditional-commit verification, and it happily
  issues DDL — which L0 exists to forbid. Wrong shape for a scoped, guarded,
  repeatable promotion.
- **Binary-format `COPY` for exactness.** Unnecessary: text form was measured
  byte-exact for `halfvec` (500/500). Binary would add a Postgres-version coupling
  for no fidelity gain.
- **A read-only prod role for everything except this script.** Genuinely stronger
  than L1–L3 and worth doing, but it is a database-administration change with
  blast radius well beyond this ADR. Recorded as a follow-up, not a prerequisite.

## Consequences

- (+) **Prod serves exactly what eval approved.** The evaluated artefact and the
  served artefact are the same bytes, provable by checksum.
- (+) **No second language sweep, no second embed.** The campaign's prod
  promotion drops from ~95 minutes of `index:production` plus a metered embedding
  run plus a metered sweep, to a copy measured at 24.7 s DB-side (plus upload).
- (+) **Eval drift becomes meaningful.** Any local↔prod difference is now a real
  prod problem, not expected re-derivation noise.
- (+) **`--prefix` makes a 48-source estate one reviewed operation** instead of 48
  chances to fat-finger a key.
- (−) 🔴 **Prod content becomes downstream of a developer's machine.** This is the
  real cost and it should be stated plainly: prod is no longer independently
  derived from the public web, it is a replica of one laptop's database. The
  mitigation is that it replicates a corpus which has passed the local gate *and*
  eval, versus today replicating a re-run that nothing checks — but the trust
  boundary genuinely moves, and a compromised or simply wrong local corpus
  propagates faithfully.
- (−) 🔴 **A new prod write path that DELETEs.** `copy-raws.sh` only appends.
  L0–L6 exist because of this and are the reason the ADR is longer than the
  script will be.
- (−) Two promotion paths now coexist (`copy-raws.sh` → `index:production` for
  re-derivation, `copy-corpus.sh` for replication). An operator must know which
  they are doing. Mitigated by the inverted-`ingested_at` warning in both headers.
- (−) 920 MB whole-corpus upload on a real network is minutes, not seconds, and a
  drop mid-copy costs the whole attempt (it rolls back cleanly, but it must be
  re-run).
- (−) The local database becomes a de facto production artefact and deserves the
  care that implies — backups, and not casually truncating it.

## Follow-ups (not blocking)

1. A read-only prod role, with the promotion script holding the only write grant.
2. `--verify-only` mode: run the checksum comparison against prod without writing,
   as a standing drift check.
3. Retire `lang:sweep:production` once no source reaches prod by re-derivation.
