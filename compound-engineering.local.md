# Compound Engineering — jesusfilm-rag config

Project-local config for the vendored Compound-Engineering (CE) skills in
`.claude/skills/ce-*`. These are **our copy** (pulled from
`EveryInc/compound-engineering-plugin`, the same source emberpath vendors) so we
can tailor them to this repo — we do **not** install the plugin. Edit the skills
in place; capture *why* in `docs/solutions/` (a `conventions/` or
`tooling-decisions/` learning).

The skills make one loop mechanical: **explore → plan → build → verify → review
→ compound**, so each unit of work leaves the next one cheaper. The full gated
flow is [`docs/workflow/ways-of-working.md`](./docs/workflow/ways-of-working.md);
the binding summary is in [`AGENT.md`](./AGENT.md).

## Where things live

| Artifact | Home |
|----------|------|
| Brainstorms (WHAT, exploratory) | `docs/brainstorms/<topic>-requirements.md` |
| Plans (HOW, technical) | `docs/plans/<slug>.md` |
| Learnings (compounded) | `docs/solutions/` — index + gate in its `README.md` |
| Decisions (locked, hard-to-reverse) | `docs/decisions/` (ADRs) — index in `architecture.md` |
| Per-source slice records | `docs/slices/`, live state in `STATUS.md` |
| Issues (the work surface) | GitHub `JesusFilm/jesusfilm-rag` (`project_tracker: github`) |

## Component vocabulary (use these, not Rails/web/api)

The `component` frontmatter field on a learning is one of:
`acquisition` · `ingestion` · `retrieval` · `serving` · `contracts` ·
`registry` · `adapters` · `db-schema` · `eval` · `mcp` · `http-api` ·
`tooling` · `docs` · `process`. (Canonical list:
`.claude/skills/ce-compound/references/schema.yaml`.)

## Two executors — `/slice` vs `/ce-work`

Both build from a plan; they do not overlap.

- **`/slice`** — the domain executor for the canonical per-source vertical
  pipeline (acquire → ingest → retrieve → eval, one source), with resumable
  checkpoint state. **Use it for source work.** `/ce-work` does not replace it.
- **`/ce-work`** — the generic executor for everything else: infra, tooling,
  refactors, eval-harness changes, process/docs. Reads a `docs/plans/` doc (or a
  bare task), works in small committed increments, runs the verify gate.

## Review gate

We do **not** vendor CE's `ce-code-review` agent fleet (Rails/Python-tuned) or
the `emberpath-*` review skills (art/game-tuned). Review stays on this repo's
own bars, applied by a fresh cold reviewer reading the **diff**: the import law,
mechanism-not-policy, fakes-only tests, file-size discipline, read-only-at-MCP —
backed mechanically by `pnpm depcruise · lint · typecheck · test ·
check:solutions` and the `pr-title` CI check.

## Intentionally absent (graceful degradation)

These CE skills/agents are referenced by the vendored skills but **not** pulled
in. Where a skill offers to hand off to one of these, that option degrades to
"skip" — the retuned skills already do this. Do not try to invoke them.

- **Skills:** `ce-doc-review`, `ce-compound-refresh`, `ce-demo-reel`,
  `ce-report-bug`, `ce-test-browser`, `ce-proof`, `ce-sessions`, `ce-debug`,
  `ce-code-review`, `ce-commit-push-pr`, `ce-commit`, `ce-worktree`, `ce-setup`,
  `ce-figma-design-sync`, `ce-slack-research`.
- **Agent fleet** (`ce-*` reviewer/researcher agents: `ce-kieran-*-reviewer`,
  `ce-performance-oracle`, `ce-security-sentinel`, `ce-data-integrity-guardian`,
  `ce-code-simplicity-reviewer`, the research analysts) — deepening passes and
  Phase-3 reviews that dispatch to these degrade to "skip"; expected.

Substitutions this repo makes for absent hand-offs:
- **commit / push / PR** → plain `git` + Conventional Commits (commitlint
  `commit-msg` hook + `pr-title` CI check). No `ce-commit-push-pr`.
- **worktrees** → the repo convention `git worktree add
  .claude/worktrees/<name> origin/main`. No `ce-worktree`.
- **frontmatter validation** → `pnpm check:solutions` (repo-native TS, wired into
  CI). Replaces CE's `scripts/validate-frontmatter.py`.
- **code review** → the harness-native review + a cold-subagent diff read. No
  `ce-code-review` fleet.

Pull one in later (same copy from the plugin source) only if we actually need
it — and write a `tooling-decisions/` learning when you do.
