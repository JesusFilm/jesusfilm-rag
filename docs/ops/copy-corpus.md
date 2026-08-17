# copy-corpus — promote a validated corpus local→prod

> **Status: SPECIFICATION.** `scripts/copy-corpus.sh` is not built yet. This
> document is the contract it must satisfy, published with
> [ADR-0016](../decisions/0016-promote-validated-corpus-not-raw-inputs.md) so the
> guards can be reviewed **before** an executable prod-write path exists. Nothing
> here can be run today.

## What it does, in one screen

Copies a source's **finished corpus** — `documents`, `chunks`,
`chunk_embeddings`, plus the `raw_documents` snapshot — from the local database
to prod, so prod serves exactly the bytes that local eval approved.

It replaces `index:production` for that source. It does **not** replace
`eval:production`.

**Why not just re-ingest in prod?** Because ingest detects language with `tinyld`
and the corrective LLM sweep runs against one database. Measured on the #111
campaign: local was 0 null-language / 0 mislabelled; re-deriving the same content
in prod produces **225 nulls and 182 mislabels**. See ADR-0016 → Context.

## The flow

```text
pnpm acquire          # local
pnpm index            # local
pnpm lang:sweep       # local — the corrections that must not be discarded
pnpm eval             # local — THE QA GATE. Nothing is promoted that fails here.
        ↓
bash scripts/copy-corpus.sh --source <key> --apply
        ↓
pnpm eval:production  # certify
```

## Scope — pick exactly one

| Flag | Scope | When |
|---|---|---|
| `--source <key>` | one registered source | the normal single-slice promotion |
| `--prefix <str>` | every key starting with `<str>` | a campaign estate — `--prefix everystudent` is 48 keys |
| `--all` | every registered source | full re-seed / disaster recovery. **Also requires `--i-mean-all`.** |

The resolved key list is **printed in full** and confirmed before any write. The
blast-radius ceiling (below) is enforced **per source**, so one malformed key in a
48-key run cannot hide behind 47 healthy ones.

## Options

| Flag | Meaning |
|---|---|
| `--apply` | write. **Default is dry-run — nothing is written without this.** |
| `--expect-host <substr>` | abort unless the target host matches (exact or dot-boundary). **Required** with `--non-interactive`. |
| `--non-interactive` | no prompts. Additionally requires `JFRAG_ALLOW_PROD_WRITE=1`. |
| `--allow-shrink <n>` | permit a net row decrease of exactly `n`. Without it, **any** net shrink aborts. |
| `--i-mean-all` | required alongside `--all`. |
| `--backup-dir <dir>` | where the pre-write backup lands (default `./reports`). |

## Usage

```sh
# Dry run — resolves scope, runs every pre-flight, writes NOTHING.
bash scripts/copy-corpus.sh --source everystudent-sw --expect-host rlwy.net

# Promote one source.
source scripts/seed-prod.sh
bash scripts/copy-corpus.sh --source everystudent-sw --apply

# Promote a whole campaign estate — one reviewed operation, not 48.
bash scripts/copy-corpus.sh --prefix everystudent --apply

# Unattended (VM / CI).
doppler run --project forge-rag --config prd -- \
  env JFRAG_ALLOW_PROD_WRITE=1 \
  bash scripts/copy-corpus.sh --prefix everystudent --apply \
    --non-interactive --expect-host rlwy.net
```

## The guards, and what each one stops

Read ADR-0016 → "The guard design" for the reasoning. Summary:

| Layer | Guard | Stops |
|---|---|---|
| **L0** | Script contains **no DDL** — only SELECT/DELETE/COPY/BEGIN/COMMIT/ROLLBACK. Enforced by a test that greps for DDL keywords. | breaking the schema |
| **L1** | Target never from `.env`; `--expect-host` dot-boundary match; refuses source==target | writing to the wrong database |
| **L2** | Dry-run default; `--apply` required; `JFRAG_ALLOW_PROD_WRITE=1` for unattended; `--i-mean-all` for `--all` | running by accident |
| **L3** | No TRUNCATE; delete scoped to one resolved `source_id`; key round-trip assertion; **net-shrink refusal**; per-source ceiling | wiping prod data |
| **L4** | Delete + all COPYs in **one transaction**; **checksum verified INSIDE it; commit only on match** | a half-written or corrupt corpus |
| **L5** | Schema fingerprint pre-flight; single-`embedding_model` guard; vector-dimension assertion | silent corruption from drift or mixed models |
| **L6** | `pg_dump` of the in-scope prod rows **before** the delete; restore command printed | an unrecoverable mistake |

**The load-bearing one is L4.** The checksum over
`source key + canonical_url + language + ord + chunk text + embedding` is compared
inside the transaction, and `COMMIT` only happens if it matches. Prod can only
ever move to a state provably identical to the validated local corpus.

## ⚠️ The `ingested_at` inversion — read this before touching either script

`copy-raws.sh` deliberately **omits** `ingested_at` so copied rows land
**pending** and `index:production` drains them. That is its whole point.

`copy-corpus.sh` must do the **opposite** — copy `ingested_at` **stamped** — so
`index:production` drains **nothing**. The corpus is already there; re-draining
would re-chunk, re-embed and re-detect it, reintroducing exactly the divergence
ADR-0016 exists to remove.

Same column. Same estate. Opposite rule. Getting it backwards fails **silently**.

## Which promotion path do I want?

| Situation | Path |
|---|---|
| Source completed acquire → index → sweep → eval locally | **`copy-corpus.sh`** (this doc) |
| Walled/Firecrawl source, want prod to re-embed rather than replicate | `copy-raws.sh` → `index:production` (ADR-0014) |
| Source never acquired locally | `acquire:production` → `index:production` |
| Prod-side re-embed / embedding-model migration | `index:production` |
| Source already in prod via re-derivation, labels wrong | `lang:sweep:production` |

## Verification after a run

The script does this itself inside the transaction, but to re-check later:

```sql
-- run on BOTH databases; the two hashes must be identical
SELECT md5(string_agg(x, '|' ORDER BY x)) FROM (
  SELECT s.key || d.canonical_url || coalesce(d.language,'~')
         || c.ord::text || c.text || e.embedding::text AS x
  FROM chunks c
  JOIN documents d ON d.id = c.document_id
  JOIN sources   s ON s.id = d.source_id
  JOIN chunk_embeddings e ON e.chunk_id = c.id
  WHERE s.key = '<key>') q;
```

Plus the cheap integrity set: orphan chunks, orphan embeddings, null-language
count, distinct `embedding_model` count.

## Measured expectations

From the 2026-07-31 proof run (scratch database with prod's schema and
independent `sources.id` uuids, HNSW index live on the target):

| | Value |
|---|---|
| 48-source estate | 2,532 docs · 14,514 chunks · 14,514 embeddings |
| DB-side time | **24.7 s** |
| Wire volume, estate | 280 MB embeddings + 90 MB chunks |
| Wire volume, whole corpus | 920 MB embeddings + 203 MB chunks |
| `halfvec` text round-trip | **byte-exact**, 500/500 |
| `search_tsv` | regenerates automatically, 14,514/14,514 |

⚠️ 24.7 s was **loopback**. Over a real uplink to Railway, budget minutes and run
it somewhere that will not sleep — the general long-prod-op guidance in
[`prod-ingest.md`](./prod-ingest.md) applies unchanged.
