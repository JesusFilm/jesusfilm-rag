# Plans — the HOW

Technical implementation plans, one per unit of work, written by
[`/ce-plan`](../../.claude/skills/ce-plan/SKILL.md). A plan turns a requirements
doc (or a directly-described task) into ordered implementation units with key
technical decisions, scope boundaries, and risks — the middle of the
compound-engineering loop.

- File pattern: `<issue-or-slug>-<short-name>.md` with YAML frontmatter
  (`title`, `type`, `status`, `date`).
- A plan is the artifact the executor runs against:
  - **per-source pipeline work** (acquire → ingest → retrieve → eval for one
    source) → [`/slice`](../../.claude/skills/slice/SKILL.md), the domain
    executor with checkpoint state;
  - **everything else** (infra, tooling, refactors, eval-harness, process) →
    [`/ce-work`](../../.claude/skills/ce-work/SKILL.md), the generic executor.
- A plan that locks a hard-to-reverse direction should also produce an
  **[ADR](../decisions/)** — the plan says *how*, the ADR records *why this and
  not that*.

Upstream: [`docs/brainstorms/`](../brainstorms/). Downstream: `/slice` or
`/ce-work`, then `/ce-compound` to capture what was learned.
