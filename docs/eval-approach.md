# Eval approach — how we evaluate retrieval

_Design context for the golden-case eval (`eval/qa-golden.yaml`, `scripts/eval.ts`,
the `/golden` skill). **Stable intent lives here**; per-slice results live in the
slice files + `sources.md`; live status in `STATUS.md`. Written 2026-05-25 after
reviewing slice #2's per-source eval — see "Status & open questions" for what is
decided vs. still open._

## What the eval tests (and what it doesn't)

Retrieval is a **mechanism, not policy** (architecture §1): given a query it returns
every chunk above the `minScore` cutoff, cited; the **consumer** decides how to rank,
trim, or weight them. The eval therefore tests the mechanism's one job — **did the
relevant content come back?** — and deliberately under-weights pure ranking (which the
consumer overrides).

- **Recall / coverage are primary:** of the documents that legitimately answer a
  question, how many surfaced in the returned set.
- **P@1 / MRR are secondary.** They measure internal ranking, which is consumer-relative;
  a correct answer at rank 4 is still a correct answer the consumer can choose. (This is
  why slice #2's cru P@1 0.20 is largely a *scoring artifact*, not a quality verdict — see
  "Correction" below.)

## The golden-case model (intended)

A golden case is a **source-agnostic question** plus the set of **all documents, across
every source, that legitimately answer it** — the *relevant set*:

```yaml
- id: holy-spirit-filling
  question: "How can I be filled with the Holy Spirit and walk in his power?"
  relevant:                       # any source — the question is not "owned" by one
    - "/us/en/train-and-grow/10-basic-steps/3-the-holy-spirit.html"   # Cru
    - "/new-life/spirit-filled.html"                                   # SwG
    - "/knowing-god/holy-spirit.html"                                  # SwG
```

A hit is correct if it matches **any** path in `relevant`. (The existing matcher in
`scripts/eval.ts` already accepts a list of paths from any source — the v1 cases just
listed one, which is the whole problem.)

### Relevant sets are LIVING
Adding a source can make **new documents relevant to questions that already exist.** So
each slice's Stage 4 does two things, not one:
1. Author new questions exercising the new source.
2. **Re-review existing questions** and extend their relevant sets with any newly-ingested
   docs that now legitimately answer them.

A question's relevant set is never "finished" — it grows with the corpus. The `/golden`
survey step must re-scan prior questions against the new source, not only draft fresh ones.

## Parameters

- **top-k = 10 per question** (decided 2026-05-25). Generous enough to reflect "return the
  above-cutoff set; the consumer trims," without unbounded output.
- **minScore = 0.37** (architecture FOLLOW-UP A; re-confirm per slice via the whole-corpus run).
- Retrieval is **whole-corpus** in eval (never source-scoped) — cross-source competition is
  the realistic condition we want to measure. Both sources returning for one question is the
  expected, healthy case (verified 2026-05-25: e.g. a Holy-Spirit query returns SwG
  `spirit-filled` #1 and Cru Step 3 #4, both above cutoff).

## Per-source view

We still want to know "did a newly-added source's content actually become findable, or did it
get buried?" Under the multi-relevant model this is **derived from the relevant docs' sources**,
not from a case being "owned" by a source: for questions whose relevant set includes a doc from
source X, how often does an X doc appear in the returned set (X's coverage). That keeps the
burial signal without pretending one source owns a shared question.

## Status & open questions

**Shipped (slice #2, v1 — `scripts/eval.ts`, `scripts/eval-metrics.ts`):** a `source` tag per
case + `pnpm eval --source <key>` + a per-source breakdown. It groups *metrics by
authored-source* and lists *single-source* expected docs — which distorts shared-topic
questions (the cru P@1 artifact). Useful as a first cut; superseded by the model above.

**Intended next (the reframe), corpus-wide — NOT cru-specific:**
1. Re-author cases as source-agnostic questions with multi-source `relevant` sets; drop the
   per-case `source` tag.
2. Add a **coverage** metric over the above-cutoff returned set; demote P@1/MRR to secondary.
3. Eval top-k → 10; report recall@k + coverage.
4. Replace the authored-source breakdown with relevant-doc-derived per-source coverage.

**Open (settle before implementing):**
- **(a)** Coverage = "any relevant returned" (recall) / "all relevant returned" / report both?
- **(c)** Keep a per-source coverage view, or just measure overall relevant-set coverage?
- **(d)** Leave the engine default `topK=5` (change eval only), or revisit the engine cap too?

## Correction to the slice #2 record

cru-10's **P@1 0.20** (and the "SwG out-ranks cru" framing first recorded in `sources.md` /
`STATUS.md`) is **largely a scoring artifact** of v1's single-source expected sets: shared-topic
cru questions listed only the cru doc as acceptable, so an equally-correct SwG answer at rank 1
scored the case as a non-P@1 "miss." Retrieval on shared topics is behaving correctly (both
sources return above the cutoff — verified). The multi-relevant reframe removes the artifact;
cru's slice-#2 numbers are a **v1 baseline**, to be re-derived under the new model.
