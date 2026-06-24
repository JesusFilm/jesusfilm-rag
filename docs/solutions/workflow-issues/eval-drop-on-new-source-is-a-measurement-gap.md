---
title: "A new source's eval drop is usually a measurement gap, not a retrieval regression"
date: "2026-06-03"
problem_type: "workflow_issue"
component: "eval"
tags: ["eval", "recall", "curation", "false-regression"]
severity: "medium"
---

## Symptom

Right after a new source is ingested, the pre-curation eval drops sharply and
looks like a retrieval regression. Observed on **slices #3, #4, and #5** — e.g.
`recall@3` fell **0.81 → 0.71** for `thelife`.

## Root cause — measurement, not retrieval

The drop is a **measurement gap**, not an engine fault. The new source crowds
some previously-credited documents out of the top-10 *while the living
relevant-set for the existing questions has not yet been updated for the new
corpus state*. The engine still ranks correctly against the policy; the
expected-doc set is simply stale. After re-reviewing expected docs for the new
corpus, metrics rebounded to perfect.

## Rule

**Treat any post-add eval drop as a curation-review trigger, not a retrieval
bug.** Before touching ranking, re-curate the golden set against the new corpus:

1. Re-run `pnpm eval` to get the drop and the now-misranked questions.
2. For each regressed question, open the credited docs — are the *better* answers
   from the new source actually ranking above them? If so, the relevant-set is
   stale, not the engine.
3. Re-review expected docs (or author fresh cases with `/golden <source-key>`)
   for the new corpus state, then re-run eval.
4. Only if a genuinely-relevant doc is ranking *below* an irrelevant one do you
   have a retrieval bug worth chasing.

## Why this compounds

This trap recurs on every source addition. Logging it once turns a multi-hour
"did I just break retrieval?" investigation into a five-minute curation pass.
Reinforces the `mechanism, not policy` tenet (AGENT.md): the engine is doing its
job; the *measurement* is what moved.

_Backfilled from memory (learning recorded 2026-06-03, confirmed across slices
#3/#4/#5)._
