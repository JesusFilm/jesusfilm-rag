# Promoting a slice to production

When a slice's PR lands on `main` with all four stages green, the source still
needs to be **acquired + ingested into the Railway production database**, and
then smoke-tested. This is a deliberate, local, watched operation by an
engineer — infrequent, observable. There is no automated post-merge ingest,
by design.

Issue: [#29](https://github.com/JesusFilm/jesusfilm-rag/issues/29).

## TL;DR

```sh
pnpm acquire:production  --source <key>
pnpm index:production    --source <key>
pnpm retrieve:production --source <key> "<a representative query>"   # vibe-check
pnpm eval:production     --source <key>                              # certify
```

Each script:

1. Prints a `⚠️  PRODUCTION <op>` banner with a plain-English description of
   what it will do (scope, side effects, cost).
2. Asks **Y/N before** prompting for any credentials. "N" exits without
   touching anything.
3. Prompts for `DATABASE_URL`, `OPENROUTER_API_KEY`, and `EMBED_MODEL_ID` —
   pressing **Enter reuses** a value already exported in the shell (or the
   default model). See *Running several in a row* for seeding a session once.
4. Shows the **redacted** target — DB host/port/db + the scope — and asks
   **Y/N again**.
5. Runs.

Credentials live **only in memory** — the script process's, or the shell
session you exported them into for reuse (see *Running several in a row*). They
are never read from or written to `.env` / `.env.local`.

The mechanism that makes this safe: `src/env.ts`'s loader is first-write-wins.
The production scripts install prompted values into `process.env` and then
**dynamic-import** `@/main.js`. Even if `.env` / `.env.local` contains a stale
`DATABASE_URL`, our prompted value lands first, so the loader leaves it alone.

## Finding the next source

Open **`docs/source-status.yaml`**. Find a row whose `status` is `done` and
all four `stages` are `green`. Copy its key.

That YAML is auto-maintained by `/slice` at stage boundaries — it's the
intentional lookup surface for these scripts. Don't dig through
`docs/sources.md` (verbose prose tracker, different purpose).

## Getting the credentials

`DATABASE_URL`, `OPENROUTER_API_KEY`, and `EMBED_MODEL_ID` live in the
JF-org Railway project's Shared Variables (or your password manager — whatever
you use for prod secrets). When prompted, paste each value at the prompt.

**Do not** paste them into `.env` or `.env.local`. The `:production` scripts
ignore those files; the unsuffixed `pnpm acquire` / `index` / `query` will
silently use them, and a stale value is the exact hazard this flow exists to
prevent.

## Running several in a row (reuse creds for a session)

Promoting one source is four scripts; promoting the whole backlog is four × N.
Re-typing a long `DATABASE_URL` and an API key for every run is the friction —
so each `:production` script will **reuse a value already exported in your
shell**: when `DATABASE_URL` / `OPENROUTER_API_KEY` / `EMBED_MODEL_ID` are
present in the environment, the prompt offers them as a redacted default — press
**Enter to keep**, or type a new value to override. The redacted preview and the
second Y/N gate still run, so a reused value is always shown and re-confirmed,
never silent.

Seed the session **once** with the helper — it prompts for the three values and
exports them into your current shell. You must `source` it (a child process
can't export into your shell):

```sh
source scripts/seed-prod.sh
```

It reads the secrets straight into exported env vars — nothing touches disk or
your shell history. From then on every `:production` script in that terminal is
just **Enter → y → y** — no secret typing. Close the terminal (or `unset
DATABASE_URL OPENROUTER_API_KEY`) to discard them.

**Why this stays safe.** The reuse default is read *before* any `@/` import, so
`.env` / `.env.local` haven't been loaded — the only values offered are ones you
genuinely `export`ed this session, never file values. The stale-`.env` hazard
this flow exists to prevent is untouched. Mechanism + tests:
`scripts/lib/prompt-prod-creds.ts`, `tests/prompt-prod-creds.test.ts`.

## What each script does

| Script | What it does | When to use |
|---|---|---|
| `pnpm acquire:production --source <key>` | Crawls + stages rows into the prod `raw_documents` table. No LLM. | Once per new source. |
| `pnpm index:production --source <key>` | Drains pending raws → normalize → chunk → **embed** → write to prod corpus tables. Idempotent (re-run drains what's pending). `--force` for a full re-index. | Once per new source. |
| `pnpm retrieve:production --source <key> "<question>"` | Embeds the query and searches the prod corpus, scoped to the given source. Read-only vibe-check. | Immediately after the index, as a quick smoke test that the source is queryable in prod. |
| `pnpm eval:production --source <key>` | Runs the golden case suite (`eval/qa-golden.yaml`) against the prod retriever, scoped to one source. Prints recall/MRR/coverage; writes `eval/results-YYYY-MM-DD-<key>.md`. | Right after retrieve, as the **certification step** — does the slice's local eval still hold against prod data? |

`retrieve:production` accepts the same filter shape as `pnpm query`:
`--top-k N`, `--min-score S`, `--source <key>`, `--prefer <key>`. For testing
a freshly-ingested source, `--source <key>` is the obvious filter — it scopes
results to the source you just added so you can see what landed without other
sources crowding the top-K.

`eval:production` is the load-bearing step for trust. The slice's local eval
ran against your dev corpus; `eval:production` re-runs the same golden cases
against prod, so "the slice's quality claim holds in prod" is a measurement,
not a vibe. Cost is one query embedding per case (cents).

## Recording the result

After the four steps run clean:

1. Commit the `eval/results-YYYY-MM-DD-<key>.md` file produced by
   `eval:production` if you want a prod-eval record (recommended for the first
   ingest of a source).
2. Optionally note the date in `docs/sources.md`'s row for that source.

`docs/source-status.yaml` deliberately does **not** carry a "prod-ingested"
field — its purpose is slice lifecycle only, and updating it from a script
would mean opening a PR per ingest run. Prod ingest state lives in git history
+ (optionally) a `sources.md` note.

## Hazards

- **Long-running acquire.** Familylife was 2,239 URLs × 2 s ≈ 75 min. Ctrl-C is
  safe. Re-running continues, **but** see FOLLOW-UP K
  ([#32](https://github.com/JesusFilm/jesusfilm-rag/issues/32)): a resumed
  crawl re-fetches already-staged URLs because conditional headers aren't
  threaded yet. Bounded by the registry entry's `maxPages`.
- **Partial index.** `pnpm index:production` is idempotent on a per-document
  basis (delete-then-insert in one tx). A killed run leaves the corpus in a
  partial state for that source; re-running drains the rest.
- **Wrong environment.** The script's redacted-host preview is your last line
  of defence. If the host looks wrong, answer `N`. Never put prod values into
  `.env`/`.env.local` — the unsuffixed scripts will use them silently.
- **Input is not masked while typing.** Acceptable trade-off for an infrequent,
  engineer-driven local op; revisit if shoulder-surfing becomes a real concern.

## Why this shape

Considered and rejected:

- **A `.env.production` file** — production credentials should not be written
  to disk for a rare operation; a forgotten file is a leak vector.
- **A GitHub Action on post-merge ingest** — keeps the engineer out of the
  loop on a long, money-spending, hard-to-reverse operation, and gives an
  automated path write-access to prod.

Kept:

- **Four interactive scripts** whose names contain `production`
  (acquire / index / retrieve / eval), with a Y/N before any credential is
  entered and a second Y/N after the (redacted) target is shown.
- **A flat YAML lookup** (`docs/source-status.yaml`) maintained by `/slice` —
  the engineer doesn't grep through prose to find a key.
- **Audit trail = the engineer's terminal.** They saw what they ran.

## Related

- Issue [#29](https://github.com/JesusFilm/jesusfilm-rag/issues/29) —
  populate prod corpus on JF-org Railway.
- Issue [#28](https://github.com/JesusFilm/jesusfilm-rag/issues/28) —
  Railway project migration to JF org (prerequisite for the prod
  `DATABASE_URL`).
- FOLLOW-UP K
  ([#32](https://github.com/JesusFilm/jesusfilm-rag/issues/32)) — fetch-layer
  idempotency for paused-and-resumed crawls.
