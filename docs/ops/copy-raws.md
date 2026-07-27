# Promoting a walled source to prod by copying raw_documents

The normal promotion path — `acquire:production` → `index:production` →
`retrieve/eval:production` — is in [prod-ingest.md](./prod-ingest.md). This doc
covers the **one deviation**: sources that sit behind a **Firecrawl-metered
wall**, where re-acquiring in prod would pay the credit cost a *second* time.

For those, we **acquire once locally** and copy the `raw_documents` rows into
prod, then embed there. Prod pays **zero Firecrawl**.

Issue: [#115](https://github.com/JesusFilm/jesusfilm-rag/issues/115) (mechanism),
part of [#112](https://github.com/JesusFilm/jesusfilm-rag/issues/112) (the
EveryStudent walled-domains effort).

## When to use this instead of `acquire:production`

| Source kind | Prod path | Why |
|---|---|---|
| **Firecrawl-walled** (registry `fetchStrategy: "firecrawl"`) | **`copy-raws.sh`** | `acquire:production` re-scrapes through Firecrawl → **doubles** a metered spend. Copying the already-acquired rows costs nothing. |
| **Non-walled** (plain HTTP) | `acquire:production` | Re-fetching over plain HTTP is free; the normal path stays simplest. `copy-raws.sh` *works* for these too (skips a re-crawl) but there's no cost reason to prefer it. |

This is an **additional, optional route**, chosen per-source on credit-availability
grounds — never a replacement for `acquire:production`.

## The seam that makes "acquire once" work

`raw_documents` is flat, keyed by `source_key`, with **no foreign keys**, so one
source's rows copy local→prod as a single-table operation with no FK remapping.
`index:production` **only drains pending raws** (normalize → chunk → embed →
write) — it never fetches. So the sequence is:

```text
acquire (local, Firecrawl — the only paid fetch)
  → index locally → eval        # validate the source before prod sees it
  → copy-raws.sh → prod         # ingested_at reset to NULL (see gotcha)
  → index:production            # embed in prod, no fetching
```

Prod only ever receives content already validated locally. Embedding twice
(local + prod) is the accepted cost; **Firecrawl is billed once.**

## The gotcha the script exists to prevent

`raw_documents.ingested_at` is `NULL` until Ingestion consumes a row; the reader
drains `WHERE ingested_at IS NULL` and stamps `SET ingested_at = now()`. Because
we copy **after** local indexing, every local row is already stamped. Copying
verbatim would land pre-stamped rows in prod and `index:production` would drain
**nothing** — a silent no-op, not an error.

**Fix (no explicit transform):** the script omits `id` **and** `ingested_at`
from both column lists. Prod regenerates `id` via `gen_random_uuid()` and leaves
`ingested_at` NULL. This also removes any PK-collision risk from reused uuids.

## De-dup

There is **no unique constraint** on `(source_key, canonical_url)` — the table
intentionally allows one ingested-history row plus one pending row per URL — so a
naive copy-all would duplicate pages in prod after any re-acquire. The source
`SELECT` is `DISTINCT ON (canonical_url) ... ORDER BY fetched_at DESC`, keeping
the newest row per URL. The script also **refuses to run if the target already
has rows for the source** (pass `--force` only to deliberately append).

## Verifying a copy (do this — matching totals are not proof)

`copy-raws.sh` prints row counts, which proves *how many* rows arrived, not *that
they are the same rows*. Two digests close that gap. Run each on **both** local and
prod and compare the hashes; they are cheap and they are what turns "looks right"
into evidence.

**1. After the copy — row-level digest over the 11 copied columns:**

```sql
SET TIME ZONE 'UTC';   -- REQUIRED, see below
WITH copied AS (
  SELECT DISTINCT ON (canonical_url)
         source_key, url, canonical_url, title, raw_content, status,
         body_hash, etag, last_modified, fetched_at, not_modified
  FROM raw_documents WHERE source_key = '<key>'
  ORDER BY canonical_url, fetched_at DESC
)
SELECT count(*), md5(string_agg(md5(copied::text), '' ORDER BY canonical_url))
FROM copied;
```

⚠️ **Pin the TimeZone.** `fetched_at` and `last_modified` are `timestamptz`, so
their `::text` rendering inside `md5(row::text)` depends on the **session**
TimeZone. Local psql and the prod session can differ, which makes a byte-identical
copy report a mismatch. Pin both sides to UTC and the comparison is meaningful.

**2. After `index:production` — per-document fingerprint:**

```sql
WITH d AS (
  SELECT d.canonical_url, coalesce(d.language,'∅') AS lang, d.chunk_count, d.content_hash
  FROM documents d JOIN sources s ON s.id = d.source_id WHERE s.key = '<key>'
)
SELECT count(*),
       md5(string_agg(canonical_url||'|'||lang||'|'||chunk_count||'|'||content_hash,
                      '' ORDER BY canonical_url))
FROM d;
```

This is the one that earns its keep: identical `docs` + `chunks` **totals** can
still hide a document that chunked differently or picked up a different language
label, because errors in opposite directions cancel in a sum. The fingerprint pins
every document's split and label individually. Also assert
`count(*) FILTER (WHERE chunk_count <> (actual chunk rows)) = 0`.

## Guard rails (this is a new write path into the prod corpus)

`copy-raws.sh` bypasses `acquire:production`'s Y/N gates, so it carries its own,
matching the bar in `scripts/lib/prompt-prod-creds.ts`:

- The **target (prod)** resolves from `DATABASE_URL` → `JFRAG_POSTGRESQL_DB_URL`,
  **never** from `.env` / `.env.local` (only the local *source* side reads `.env`).
- **`--expect-host <substr>`** aborts unless the resolved target host contains it
  (`rlwy.net` for Railway). **Required** in `--non-interactive` mode.
- **Interactive:** a **redacted** target + row counts are shown and re-confirmed
  (`y`) before any write.
- **`--non-interactive`** additionally requires **`JFRAG_ALLOW_PROD_WRITE=1`** —
  a stray `--non-interactive` can never start an unattended prod write on its own.
- Credentials live **only in memory** (env / doppler-injected); nothing touches
  disk. Fail-closed: a missing cred, host mismatch, or missing write signal
  exits **3** before anything runs.

## Running it

The **source (local)** DB is `SRC_DATABASE_URL`, or the `DATABASE_URL` in the
repo `.env` if unset. The **target (prod)** DB is `DATABASE_URL` /
`JFRAG_POSTGRESQL_DB_URL`.

**Interactive** — seed prod creds once (see prod-ingest.md → *Running several in
a row*), then run:

```sh
source scripts/seed-prod.sh                 # exports DATABASE_URL=<prod> …
bash scripts/copy-raws.sh --source <key>    # shows redacted target + counts, asks y
```

**Unattended / agent** — creds from doppler `forge-rag/prd`:

```sh
doppler run --project forge-rag --config prd -- \
  env JFRAG_ALLOW_PROD_WRITE=1 \
  bash scripts/copy-raws.sh --source <key> --non-interactive --expect-host rlwy.net
```

**Dry run** — resolve + count + host-guard check, write nothing:

```sh
doppler run --project forge-rag --config prd -- \
  bash scripts/copy-raws.sh --source <key> --expect-host rlwy.net --dry-run
```

Then embed and certify with the normal prod scripts:

```sh
doppler run --project forge-rag --config prd -- env JFRAG_ALLOW_PROD_WRITE=1 \
  pnpm index:production    --non-interactive --expect-host rlwy.net --source <key>
doppler run --project forge-rag --config prd -- \
  pnpm retrieve:production --non-interactive --expect-host rlwy.net --source <key> "<query>"
doppler run --project forge-rag --config prd -- \
  pnpm eval:production     --non-interactive --expect-host rlwy.net --source <key>
```

## Recording the result

Same as prod-ingest.md: commit the `eval/results-YYYY-MM-DD-<key>.md` produced by
`eval:production` (recommended for the first ingest of a source), and optionally
note the date in the source's `docs/sources.md` row. `docs/source-status.yaml`
deliberately carries no "prod-ingested" field — prod state lives in git history +
a `sources.md` note.

## Hazards

- **Re-running duplicates rows.** No unique constraint protects
  `(source_key, canonical_url)`. The empty-target guard blocks the common
  mistake; `--force` bypasses it and *appends*. If you need a clean re-copy,
  delete the source's prod rows first
  (`DELETE FROM raw_documents WHERE source_key = '<key>'`) — but only the pending
  ones if a partial `index:production` already ran, or you'll orphan corpus rows.
- **Copy without embed = invisible.** `copy-raws.sh` only stages `raw_documents`;
  the source is not queryable until `index:production` drains and embeds it. That
  embed IS a metered OpenRouter corpus write (the "embed twice" cost #112
  accepts) — separate from, and after, the free copy. Don't conflate "copied" with
  "live": a live eval measures the *embedded* corpus, so it needs the embed done.
- **`eval:production` can abort on one transient query-embed timeout
  ([#118](https://github.com/JesusFilm/jesusfilm-rag/issues/118)).** Query
  embedding is fast-fail (`QUERY_EMBED_MAX_ATTEMPTS` default 2,
  `QUERY_EMBED_TIMEOUT_MS` default 4s), so during a provider-slow spell a single
  blip discards the whole batch. Ride it out by raising both for the run, e.g.
  `env QUERY_EMBED_MAX_ATTEMPTS=10 QUERY_EMBED_TIMEOUT_MS=15000 pnpm eval:production …`.
- **Prod eval ≠ local eval, and that's expected.** The scoped eval retrieves over
  the *whole* prod corpus, which drifts from your local one (other sources sit at
  the state of their own last prod ingest). A promoted source can match local
  byte-for-byte yet score a little differently because different neighbours
  compete. Verify the *promotion* by comparing doc/chunk counts local↔prod (they
  should match exactly); read the eval as "is it live and sane in prod", not as a
  re-measurement of the local number.
  - **A language-scoped eval drifts iff that LANGUAGE'S SUBCORPUS differs
    local↔prod.** Single-source-ness is a confound, not the cause. `language:`-pinned
    cases hit `corpus-search-store.ts`'s strict `eq(documents.language, …)`, so the
    eligible competitors are exactly that language's documents — if those are
    identical on both sides, the eval cannot drift no matter how many sources share
    the language, and if they differ it will drift even for a sole source.
    - everystudent-ar (sole-language) reproduced local to three decimals — its own
      docs were the only competitors and were identical.
    - **everystudent-fr reproduced local coverage EXACTLY (0.856) on all 18 cases
      despite `thelife-fr` competing at 156 docs vs its 66** — because the French
      subcorpus was byte-identical on both sides (225 `fr` docs). This doc
      previously predicted drift here and called an exact match "the surprise";
      that prediction was wrong, and the corrected rule above is why.
    - **The measurement that settles it:** at that run prod carried **40 more docs
      than local** (11,728 vs 11,688) — thelife +30, sightline +9, jesusfilm-org +1,
      **all English**. Those same ~40 docs are what this doc blames for the English
      promotion's ~0.09 gap. Same divergence, same run: it moved `en` and could not
      touch `fr`.
    - Practical check before reading a promotion eval as drift: **diff the
      per-source doc counts local↔prod for that language only.** Whole-corpus totals
      differing tells you nothing about a language-scoped result.
- **Be ready for the provider-slow spell on both metered steps — but it is not a
  law.** The first two promotions hit it; **everystudent-fr hit it on neither**
  (0 embed retries, 0 query-embed retries) despite carrying the largest chunk
  count of the three banners. Corpus embed rides it out on its own when it does
  strike (everystudent-ar: 34 retry lines, longest chain 6 of 10, zero docs lost).
  `eval:production` does **not** — its fast-fail query-embed policy (#118)
  discards the batch on a single timeout. Keep running promotion evals with
  `QUERY_EMBED_MAX_ATTEMPTS=10 QUERY_EMBED_TIMEOUT_MS=15000` as the default: it
  costs nothing on a clean run and saves the whole batch on a bad one.
- **Wrong environment.** The redacted-host preview (interactive) and
  `--expect-host` (unattended) are the last line of defence. Never put prod
  values in `.env` / `.env.local` — the script reads `.env` for the *source* side.

## Provenance

- The mechanism was specified in
  [#115](https://github.com/JesusFilm/jesusfilm-rag/issues/115), which deferred
  both the docs and an ADR until it had been **run once**. It has now been run
  (everystudent, first promotion via this path) — hence this doc. Whether the
  path earns an ADR is the remaining open call, now unblocked.
- **First live run — everystudent (English), 2026-07-24.** 117 `raw_documents`
  copied local→prod, verified identical by a **deterministic ordered row-level
  digest** over all 11 copied columns — `md5(string_agg(md5(row) ORDER BY
  canonical_url))` returned `867068cb…57c6` on **both** local and prod (117 rows),
  proving row-for-row equality, not just matching aggregate totals. Then
  `index:production` embedded them to **117 docs / 550 chunks / 550 embeddings** —
  an exact match of the local corpus, confirming the copy + gotcha-fix (rows
  landed `ingested_at IS NULL` and drained cleanly).
  `eval:production --source everystudent` certified it live: recall@10 0.955,
  everystudent n=22 recall 0.727 / coverage 0.648, native cases mostly rank 1
  (`eval/results-2026-07-24-everystudent-keep.md`). The ~0.09 gap vs the local
  slice-8 number (0.818) is corpus drift, not a promotion defect — prod carried
  ~40 more docs across thelife/sightline/jf-org than local at run time. See
  `docs/slices/everystudent.md`.
- **Second live run — everystudent-ar (Arabic), 2026-07-25.** 67 rows copied,
  digest `712a93db…56a1` matching on both sides; `index:production` embedded them
  to **67 docs / 283 chunks / 283 embeddings**, an exact match of local including
  the 65 `ar` / 2 null language split and 0 `chunk_count` mismatches.
  `eval:production` reproduced the local numbers **exactly** — recall@3 0.917 /
  recall@10 1.000 / coverage 0.979 / MRR 0.938 / P@1 0.917
  (`eval/results-2026-07-25-everystudent-ar-keep.md`). Two refinements this run
  contributed, both now folded into *Verifying a copy* and *Hazards* below:
  the digest needs an explicit UTC TimeZone pin, and a **per-document
  fingerprint** catches split/label errors that matching grand totals hide.
  See `docs/slices/everystudent-ar.md`.
- **Third live run — everystudent-fr (French), 2026-07-27**, closing the #112
  route in prod. 67 rows copied (dry-run first: host confirmed, 0 existing rows),
  digest **`8e9ec570d09affcfbbd7a5fa7baad8b7`** matching on both sides;
  `index:production` embedded them to **67 docs / 418 chunks / 418 embeddings**,
  an exact match of local including the 66 `fr` / 1 `null` split, 0 `chunk_count`
  mismatches and 0 rows left pending, per-document fingerprint
  **`5739cf2f273df42c115a866840055cad`** on both sides. Prod 11,661 → **11,728
  docs** / 34,016 → **34,434 chunks**. `eval:production` returned recall@3/@10
  **1.000** · coverage **0.848** · MRR **1.000** · P@1 **1.000** with **all 18
  cases at rank 1**, and per-source `everystudent-fr` coverage **0.856 —
  identical to local** (`eval/results-2026-07-27-everystudent-fr-prod-keep.md`).
  Two corrections this run contributed, both folded in above: **the first
  promotion to see zero retries on either metered step**, and — the important one
  — **the drift predictor is the language subcorpus, not sole-source-ness**, which
  this doc had stated backwards and which this run falsified directly. Exactly one
  of 18 cases changed rank (`esfr-skeptic-enfer` 2 → 1) on a **0.001** score gap:
  boundary jitter, with coverage unchanged. See `docs/slices/everystudent-fr.md`.

## Related

- [prod-ingest.md](./prod-ingest.md) — the normal (non-walled) promotion path;
  the credential model, `--non-interactive`/`--expect-host`, and
  `JFRAG_ALLOW_PROD_WRITE` semantics this script mirrors.
- [ADR-0012](../decisions/0012-firecrawl-fetch-strategy-walled-sources.md) —
  the per-source Firecrawl fetch strategy that makes a source "walled".
