# Architecture Decision Records (ADRs)

Each significant, hard-to-reverse decision gets one short file here so a future
contributor — human or agent — can see **what we chose, what we rejected, and
why** before trying to change it. The goal is to stop well-meaning "I'll just
swap in X" churn that doesn't know the history.

The **index** is the _Locked decisions_ table at the top of
[`../architecture.md`](../architecture.md); its **ADR** column links to the files
here. Decisions that haven't earned a standalone record yet stay inline in that
table until they do — extraction is incremental, not a big-bang refactor.

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
