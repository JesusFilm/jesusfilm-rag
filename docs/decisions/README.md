# Architecture Decision Records (ADRs)

Each significant, hard-to-reverse decision gets one short file here so a future
contributor — human or agent — can see **what we chose, what we rejected, and
why** before trying to change it. The goal is to stop well-meaning "I'll just
swap in X" churn that doesn't know the history.

The **index** is the _Locked decisions_ table at the top of
[`../architecture.md`](../architecture.md); its **ADR** column links to the files
here. Decisions that haven't earned a standalone record yet stay inline in that
table until they do — extraction is incremental, not a big-bang refactor.

## When to raise an ADR checkpoint (agents)

An agent should not wait to be asked. When a change trips one of these, **pause and
raise an ADR checkpoint** (the format + behaviour is in `AGENT.md` → *ADR
checkpoint*), then let the engineer decide draft / defer / skip:

- **Amends or contradicts** an existing ADR, an `AGENT.md` convention, or a stated
  invariant in `architecture.md` (grep tell: the code you're touching cites `ADR-`).
- **Data-shape or write-path** change: `src/db/schema.ts`, a migration, how a corpus
  column is written/updated, or a dedup/idempotency rule.
- **Boundary/port** change: a new port, a change to the import law, or a new place an
  adapter is constructed.
- **A policy fork with a real rejected alternative** — you chose X over a genuine Y
  and the reasoning is worth protecting from future "I'll just swap in Y" churn.
- **A new cross-cutting invariant** a later contributor might innocently "simplify"
  away (this session's `language = coalesce(new, existing)` is the canonical example).

**Not** a checkpoint: routine implementation, bug fixes, behaviour-preserving
refactors, or a choice with an obvious default and no rejected alternative. When
unsure, raise it — skipping is one word from the engineer; a lost decision is not.

Once accepted, `/adr` drafts the record from the current change (survey diff → next
`NNNN` → template below → update the `architecture.md` index → cite the ADR at the
code seam → commitlint-safe `docs(adr): …` commit).

## Conventions

- One file per decision: `NNNN-short-slug.md`, zero-padded and sequential
  (`0001-…`, `0002-…`).
- ADR numbers are **independent** of the architecture-table row numbers — the
  table is purely the linking index, so the two numbering schemes coexist.
- `Status` is `Accepted`, `Proposed`, or `Superseded by ADR-XXXX`. We never
  delete a superseded ADR; we mark it and link forward so the history stays
  readable.
- Keep each ADR to about one screen. Deep mechanism / enforcement detail stays in
  `architecture.md`; the ADR captures the **decision and its rationale**, and
  points to the section for the how.
- The load-bearing section is **Alternatives rejected** — that's what protects
  the decision from being re-litigated by someone who never saw the trade-offs.

## Template

```markdown
# ADR-NNNN — <title>

- Status: Accepted | Proposed | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Issue/PR: #NN (or — if foundational)
- Related: ADR-XXXX, ADR-YYYY

## Context
2–4 sentences: the situation and the forcing question.

## Decision
What we will do, stated plainly.

## Alternatives rejected
- **<option>** — why not (one or two lines).

## Consequences
- What this makes easy, and what we give up / must live with.
```
