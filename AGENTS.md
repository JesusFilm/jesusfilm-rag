# Agent workflows — jesusfilm-rag

Agent-facing index of the repeatable workflows in this repo. Each is a `/skill`
(under `.claude/skills/`) backed by deterministic `pnpm` scripts, so an agent
orchestrates and verifies rather than free-hands the work.

| Skill | Does | Key scripts |
|-------|------|-------------|
| `/slice` | Drives one source through acquire → ingest → retrieve → spot-check, resumably | `pnpm acquire`/`index`/`query`, `status:*` |
| `/walkthrough` | Read-only code-flow explainer with diagrams | — |
| `/adr` | Records an architecture decision from the current change (template, index, citation, commit) | — |
| `/status-dashboard` | Refreshes the public status dashboard from prod and opens a PR | `pnpm dashboard:data`/`build`/`verify` |

## Status dashboard refresh (`/status-dashboard`)

Regenerates the public GitHub Pages dashboard — the source of truth for which
sources × languages exist in the RAG index and where each sits on the
**acquire → ingest → evaluate** journey — then opens a PR for an engineer to
merge. Full runbook: `docs/ops/dashboard.md`. Skill: `.claude/skills/status-dashboard/SKILL.md`.

End-to-end flow the skill performs:

1. Open a GitHub issue tracking the refresh.
2. `doppler run -- pnpm dashboard:data` — read prod with locally-injected
   credentials → `dashboard/prod-status-data.json`.
3. `pnpm dashboard:build` — merge prod data + `docs/source-status.yaml` + registry
   → `dashboard/compiled-data.json` + `dashboard/index.html`.
4. Browser-verify the page actually displays the data; `pnpm dashboard:verify` as
   the headless gate.
5. Open a PR — **never merge** (the engineer merges; `pages.yml` deploys on merge).

### 🔒 Non-negotiable: credentials never leave the machine

Production credentials are fetched **only** via `doppler run -- <command>`, which
injects them into the subprocess environment. They must never pass through the
model/transcript, a file, the GitHub issue/PR, a commit, or a log. Never run a
command that prints a secret value (`doppler secrets get`, `printenv`,
`echo $DATABASE_URL`, `cat .env`). The data script prints only a **redacted** DB
URL. The full secret-safety contract is in the skill — read it before running.

## Conventions

- TypeScript scripts under `scripts/` run via `tsx` + a `pnpm` entry.
- Pure, testable logic lives outside the depcruise'd `src/` context boundaries
  (e.g. `scripts/lib/`); tests live in `tests/` (integration) or beside `src/`
  (fakes-only unit). `pnpm test` runs vitest; `pnpm typecheck` / `pnpm lint` /
  `pnpm depcruise` gate structure.
- `docs/source-status.yaml` is the asserted per-language tracker — mutate it only
  through `pnpm status:*` (the deterministic writer), never by hand.
