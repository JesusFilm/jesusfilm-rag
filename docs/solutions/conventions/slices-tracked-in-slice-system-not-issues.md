---
title: "Slices live in the /slice system; non-slice work lives in GitHub Issues"
date: "2026-05-25"
problem_type: "convention"
component: "process"
tags: ["tracking", "slice", "github-issues", "ways-of-working"]
severity: "medium"
---

## The rule

Tracking in jesusfilm-rag is **split by work type — never duplicated**:

- **Vertical source-ingest slices** are tracked *exclusively* in the `/slice`
  system: the slice file (`docs/slices/<source>.md`), `docs/STATUS.md`,
  `docs/sources.md`, and the `slice/<source>` branch.
- **Everything else** — infra, cross-cutting, deploy, and follow-ups (e.g. the
  `architecture.md` §11 deferred items) — goes into **GitHub Issues**, with a
  minimal label set: `area:serving`, `type:infra`, `type:follow-up`.

## Why

Creating GitHub Issues for slices would **duplicate tracking** and re-add exactly
the ceremony the `/slice` skill deliberately removed. The two systems are
complementary surfaces, not redundant ones: `/slice` carries resumable
per-source pipeline state; Issues carry discrete, independently-schedulable work.

This is the boundary the CE loop already encodes — `slice` is the *domain
executor* for source work, `ce-work` is the *generic executor* for the rest
(`compound-engineering.local.md`, "Two executors"). The **tracking** split mirrors
the **executor** split.

## Applying it

- About to file an Issue for a source ingest? Stop — it belongs in the slice
  file + `docs/STATUS.md`.
- About to add a slice entry for infra/deploy/follow-up work? Stop — that's a
  GitHub Issue.
- `slices ≠ issues` should stay visible to future agents in `docs/STATUS.md` (or
  the README "For agentic AI" section) so the split isn't rediscovered.

_Backfilled from memory (decision recorded 2026-05-25)._
