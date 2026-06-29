# Public status dashboard

A single static page — deployed to GitHub Pages — that is the **source of truth**
for what the JesusFilm RAG vector database contains: every source, the languages
it has content for, where each sits on the journey (**acquire → ingest →
evaluate**), and embedded document counts. Audience: Miheret and other
stakeholders. Refreshes are engineer-initiated via the `status-dashboard` skill,
reviewed via PR, and deployed on merge.

## The data model (one row per source × language)

| Flag | True when | Source of truth |
|------|-----------|-----------------|
| **acquire** | raw documents for the source are captured | prod DB (`raw_documents`) |
| **ingest** | content is chunked + embedded (retrievable) | prod DB (`chunk_embeddings`) |
| **evaluate** | acquire ∧ ingest ∧ `stages.evaluate: green` in `docs/source-status.yaml` | prod DB **and** the asserted tracker |

`evaluate` is a *decision*, not an automated check: it flips true only when the
engineer has done the evaluation work and shipped it (the `green` mark in
`docs/source-status.yaml`, written by `/slice` via the deterministic
`status:*` writer) **and** prod confirms the row is acquired + ingested. The
`pnpm eval:production` script an engineer may run after ingest is a non-gating
sanity check — it is intentionally **not** consulted by the dashboard.

Why a shared raw key still resolves per language: a multilingual source like
`familylife` (en + es) stages both languages under one `raw_documents.source_key`.
So `es` is **acquired** (the shared key is present) but **not ingested** (no
`es` documents have embeddings) — exactly what the dashboard shows. Language
variants on separate domains (`thelife-fr`, `thelife-zh`) are their own keys.

## Pipeline

```
prod DB --(doppler run -- pnpm dashboard:data)--> dashboard/prod-status-data.json   (git-ignored, regenerable, data-only)
prod-status-data.json + docs/source-status.yaml + src/registry
        --(pnpm dashboard:build)--> dashboard/compiled-data.json + dashboard/index.html   (committed)
```

- `scripts/dashboard-data.ts` — reads **only** `DATABASE_URL` (directly, not via
  `@/env`, to keep the credential surface to one variable), runs two read-only
  `SELECT`s (`scripts/lib/dashboard/query.ts`), writes the raw export. Prints a
  **redacted** DB URL only.
- `scripts/dashboard-compile.ts` — pure merge (`scripts/lib/dashboard/compile.ts`)
  → `compiled-data.json`, then fills `dashboard/template.html` → `index.html`.
- `scripts/dashboard-verify.ts` (`pnpm dashboard:verify`) — the **merge gate**:
  fails unless every row in `compiled-data.json` is present in `index.html`.

## Credentials (doppler, local-only)

Prod access is fetched **locally via doppler and never leaves the machine**. The
only safe path is `doppler run -- pnpm dashboard:data`, which injects secrets into
the subprocess environment — they never pass through the model/transcript, a file,
the issue, the PR, or a log. Never run a command that prints a secret value
(`doppler secrets get`, `printenv`, `echo $DATABASE_URL`, `cat .env`, …). See the
secret-safety contract in `.claude/skills/status-dashboard/SKILL.md`.

## Design

The page follows the **Jesus Film Project design system** (Jesus Film Red leads,
warm neutrals, Inter + Noto Serif, hairline dividers) and the **anti-slop
checklist** (no gradients, functional color, real hierarchy, honest data, a
semantic left-aligned table — no hero, no card grid, no emoji bullets). The brand
has **no green**, so lifecycle state uses a progression within the palette:
neutral (acquired) → navy (ingested) → red (evaluated), with maroon for blocked.
Inter is used deliberately as the JFP brand typeface (the anti-slop "avoid Inter
as a lazy default" rule is satisfied by it being an intentional brand choice).

## CI

- `ci.yml` → `pnpm dashboard:verify` gates every PR (HTML ↔ data in sync), and the
  `test` job runs the compile/query unit + integration tests.
- `pages.yml` → deploys `dashboard/` to GitHub Pages on push to `main` (PR merge).
