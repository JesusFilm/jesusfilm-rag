# ADR-0005 — Adopt the compound-engineering loop (vendored CE skills)

- Status: Accepted
- Date: 2026-06-24
- Issue/PR: — (process foundation)
- Related: ADR-0001 (mechanical enforcement philosophy)

## Context

The build already accumulates hard-won knowledge — FOLLOW-UPs (A…), per-slice
learnings in `STATUS.md`, ADRs — but capture was ad hoc, and there was no
front-of-work ritual (explore → plan) or a searchable place a future agent reads
*before* touching a documented area. We wanted the same property ADR-0001 gives
the architecture — **each unit of work makes the next one cheaper** — but for
process, and enforced the same way: mechanically where possible.

## Decision

Adopt a **vendored, locally-tailored copy** of EveryInc's
`compound-engineering-plugin` (the same source emberpath uses) as the way work
runs here. Four skills are pulled into `.claude/skills/ce-*` and retuned to this
repo: `ce-brainstorm` (WHAT), `ce-plan` (HOW), `ce-work` (generic executor), and
`ce-compound` (capture the learning). They compose with the existing `/slice`
(per-source pipeline executor), `/golden`, and `/walkthrough` skills.

The loop and its homes:
`docs/brainstorms/` → `docs/plans/` (+ ADR) → build (`/slice` or `/ce-work`) →
verify → review → merge → `docs/solutions/` (the compounding Lessons Index).

Enforcement, in ADR-0001's spirit:
- **Mechanical** — `pnpm check:solutions` (wired into the CI `static` job)
  fails the build if any `docs/solutions/` learning has malformed/missing
  frontmatter, a YAML parse-safety trap, or is not linked in the Lessons Index.
  A `.github/pull_request_template.md` carries the verify checklist.
- **Agent-suggested routine** — the CE skills are model-invocable (reached for by
  default), and `AGENT.md` binds the **ship-confirmation routine**: nothing is
  reported shipped without *Reviewed ✅ + Compounded ✅*. "Did you learn
  anything" is a judgment a build can't make, so it stays a routine, not a gate.

We do **not** vendor the plugin itself, nor its Rails/Python-tuned
`ce-code-review` agent fleet or the art-tuned `emberpath-*` skills. Absent
hand-offs degrade to "skip" (documented in `compound-engineering.local.md`).

## Alternatives rejected

- **Keep the ad-hoc practice (FOLLOW-UPs + STATUS notes only)** — works for one
  builder holding context, but doesn't survive turnover or fresh cold agents, and
  has no front-of-work (brainstorm/plan) ritual. The point of compounding is that
  the *next* agent finds the learning without being told.
- **Install the CE plugin as a dependency** — couples us to upstream's cadence
  and its Rails/Python assumptions; we can't tailor enums, paths, or the
  degradation map. Vendoring lets us edit in place and diff against upstream.
- **A CI gate that requires a learning doc per PR** — rejected as dishonest: not
  every PR yields a reusable lesson, so it would produce noise or gaming. The
  mechanical gate checks *well-formedness + indexing* of learnings that exist;
  the *should there be one* judgment stays in the ship routine.
- **Replace `/slice` with `ce-work`** — `/slice` encodes the domain pipeline with
  resumable checkpoints; `ce-work` is generic. We kept both, with a clear
  boundary, rather than lose the slice machinery.

## Consequences

- (+) A fresh agent has a discoverable, indexed knowledge store and a named loop;
  `AGENT.md` and `docs/workflow/ways-of-working.md` make it the default path.
- (+) Malformed or orphaned learnings fail CI — the store can't silently rot.
- (−) Carrying cost: the vendored skills must be re-tailored when we pull a newer
  plugin version (the local config + per-skill banners localize the diff).
- (−) The "Compounded ✅" flag is a routine, not a build gate — it relies on
  discipline (and review) the way the pre-ADR-0001 boundaries once did.
