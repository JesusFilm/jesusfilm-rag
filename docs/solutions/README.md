# Solutions — the Lessons Index

The **compounding knowledge store** for jesusfilm-rag. Every time we solve a
non-trivial problem, we capture it here as a small, frontmattered doc so the
*next* occurrence takes minutes, not hours. The first solve is research; the
documented solve is a lookup. **Each unit of work should make the next one
easier — that is the whole point of the compound-engineering loop.**

Docs are written by [`/ce-compound`](../../.claude/skills/ce-compound/SKILL.md)
after a verified fix or a durable decision, organized into category
subdirectories with YAML frontmatter (`title`, `date`, `problem_type`,
`component`, `tags`). Read the relevant ones **before** starting work in a
documented area — they are accumulated, hard-won context, not optional tips.

## How this differs from its neighbours

| Store | Holds | Indexed by |
|---|---|---|
| `docs/solutions/` (here) | **Compounded learnings** — solved problems, gotchas, patterns, conventions | this file |
| [`docs/decisions/`](../decisions/) | **ADRs** — hard-to-reverse decisions (what we chose, what we rejected, why) | architecture.md "Locked decisions" table |
| [`docs/slices/`](../slices/) | **Per-source slice records** — one vertical pipeline run | STATUS.md |
| [architecture.md §11](../architecture.md) | **FOLLOW-UPs** — deferred work items (A…) | that section |

A learning is *knowledge you'd want a future agent to read before touching this
area*. A decision is *a fork in the road we don't want re-litigated*. When in
doubt: if it changes how you'd build, it's a learning here; if it locks a
direction, it's an ADR.

## The index (binding — keep in sync)

> **Mechanical gate:** `pnpm check:solutions` (run in CI) fails the build if any
> doc under `docs/solutions/` is missing required frontmatter, has YAML
> parse-safety risks, or is **not linked below**. `/ce-compound` adds the entry
> for you; if you write one by hand, add its row here too.

_No learnings captured yet. The first `/ce-compound` run will add a row here._

<!-- INDEX:START — one row per docs/solutions/**/*.md (excluding this README). Format: -->
<!-- - [title](relative/path.md) — one-line summary · `component` · `YYYY-MM-DD` -->
<!-- INDEX:END -->

## Categories

Created on demand by `/ce-compound`; you won't see an empty dir until a learning
lands in it.

**Bug track** — `build-errors/` · `test-failures/` · `runtime-errors/` ·
`performance-issues/` · `database-issues/` (Postgres · pgvector · Drizzle ·
migrations) · `security-issues/` · `integration-issues/` (MCP · HTTP ·
OpenRouter) · `logic-errors/`

**Knowledge track** — `architecture-patterns/` · `design-patterns/` ·
`tooling-decisions/` · `conventions/` · `workflow-issues/` ·
`developer-experience/` · `documentation-gaps/` · `best-practices/` (fallback)
