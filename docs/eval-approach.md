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

- **Recall / coverage are primary, and we report BOTH** (decided 2026-05-25):
  - **recall@10** — did *at least one* relevant doc come back in top-10 (did we answer it at all);
  - **coverage** — what *fraction* of the relevant set came back (did we surface *every* good
    answer, e.g. 2 of 3). Coverage is the metric that notices a good answer being buried.
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
- **Engine default `topK` stays 5** (decided 2026-05-25) — a stable architecture default, overridable
  per call via `RetrievalPolicy.topK`. Only the *eval* runs at 10; the engine is not changed.
- Retrieval is **whole-corpus** in eval (never source-scoped) — cross-source competition is
  the realistic condition we want to measure. Both sources returning for one question is the
  expected, healthy case (verified 2026-05-25: e.g. a Holy-Spirit query returns SwG
  `spirit-filled` #1 and Cru Step 3 #4, both above cutoff).

## Per-source view

**Kept (decided 2026-05-25)** — it's the clearest signal of "did a newly-added source's content
actually become findable, or did it get buried?", i.e. whether the RAG needs adjustment. Under
the multi-relevant model it is **derived from the relevant docs' sources**, not from a case being
"owned" by a source: for questions whose relevant set includes a doc from source X, how often does
an X doc appear in the returned set (X's coverage). That keeps the burial signal without pretending
one source owns a shared question.

## Status & open questions

**Shipped (slice #2, v1 — `scripts/eval.ts`, `scripts/eval-metrics.ts`):** a `source` tag per
case + `pnpm eval --source <key>` + a per-source breakdown. It groups *metrics by
authored-source* and lists *single-source* expected docs — which distorts shared-topic
questions (the cru P@1 artifact). Useful as a first cut; superseded by the model above.

**The reframe — IMPLEMENTED 2026-05-25 (commit `8fbee09`):**
1. Cases re-authored as source-agnostic questions with multi-source `relevant` maps (operator-curated);
   per-case `source` tag dropped; `cru-seeker-finances` reframed → `cru-stewardship`.
2. Reports **recall@3 / recall@10 / coverage** (fraction of the relevant set returned); P@1/MRR secondary.
3. Eval runs **top-10**; engine default `topK=5` unchanged.
4. **Per-source coverage** view, derived from the relevant docs' sources.

**Decided 2026-05-25** (the three formerly-open questions, now built):
- **(a)** Report **both** recall@10 and coverage.
- **(c)** **Keep** the per-source coverage view (per source) — it shows whether the RAG needs
  adjustment as the corpus grows.
- **(d)** **Leave** the engine default `topK=5`; change eval methodology only.

**v2 baseline (whole-corpus, 20 cases / 2 sources, 2026-05-25):** recall@3 **0.95** · recall@10
**1.00** · coverage **0.896** · MRR 0.881 · P@1 0.80. Per-source coverage: cru-10-basic-steps
recall 0.929 / coverage 0.929 (n=14); starting-with-god recall 1.000 / coverage 0.906 (n=18).

## Correction to the slice #2 record — RESOLVED

cru-10's v1 **P@1 0.20** (and the "SwG out-ranks cru" framing first recorded in `sources.md` /
`STATUS.md`) was **largely a scoring artifact** of v1's single-source expected sets: shared-topic
cru questions listed only the cru doc, so an equally-correct SwG answer at rank 1 scored the case
as a non-P@1 "miss." The multi-relevant reframe removed the artifact — under v2, **cru's per-source
recall is 0.929** (its content surfaces reliably when relevant). Retrieval was behaving correctly
all along; the v1 metric was measuring the wrong thing.

## Known engine ranking quirks (interpret MRR / P@1 with care)

Dense embeddings (`openai/text-embedding-3-small`) sometimes rank **abstract /
spiritual-foundation pieces above direct topic answers** for evaluatively-framed
questions. Slice #6 example: case `fl-skeptic-sex-marriage` ("Why does
Christianity insist on waiting until marriage for sex? It seems outdated.")
ranks thelife `/wise-intimacy` (0.649 — a foolishness-of-the-cross meditation,
not a why-wait answer) and sightline `/is-it-good-for-you-2` (0.588 —
carrying-past-relationships angle) above the directly-on-topic thelife
`/why-should-i-wait-for-sex` and sightline `/good-reasons-to-wait`. The case
sits at rank=4 with full coverage in top-10. **This is a model property, not
a curation error:** abstract framing scores high on cosine even when the
specific question would be better answered downstream. Implications:

- **Recall@10 is the integrity metric**; recall@3 / MRR / P@1 will dip on
  skeptic / evaluative questions where the engine prefers foundation pieces.
  A rank=4 case with full coverage is fine — recall@10 = 1.000 still proves
  the system found everything that legitimately answers.
- **Don't conclude "curate harder" from a rank=4 case** unless you'd genuinely
  credit the higher-ranked abstract pieces. The skill #5 guardrail (credit on
  content, not titles) cuts both ways: if the higher-ranked doc doesn't really
  answer the question, _leave it uncredited_ and accept the rank dip.
- **The right fix is downstream**, not in the eval: a re-ranking or prompt
  layer that biases toward direct-topic answers for evaluative questions.
  Mechanism-not-policy, again.

## Consumer-layer policies and the eval (FOLLOW-UPs E / I / L)

Three consumer-layer follow-ups are in flight: `excludedSourceKeys` (#6), the
diversity knobs `maxPerSource` / `perSourceCaps` / MMR (#15), and the source
discovery endpoint `GET /v1/sources` (L). **None of them change the golden-case
eval.** This is a deliberate consequence of the engine-stays-ranking-pure
decision (architecture §1) and worth making explicit so it doesn't get
re-argued every slice.

**Why the whole-corpus eval is unaffected:** `pnpm eval` runs every case
against the *unfiltered* engine — no `allowedSourceKeys`, no `excludedSourceKeys`,
no `maxPerSource`, no `perSourceCaps`. It asks the integrity question: *given
the whole corpus and no consumer filter, does the most-similar search find the
docs that should answer this question?* The consumer-layer knobs are policies
applied **after** the engine has done its job; they don't change what the
engine could return, only what a specific consumer chose to receive. Adding
the knobs doesn't invalidate any existing golden case.

**What we add instead: mechanism tests.** Each consumer-layer knob gets a small
set of integration tests in `src/retrieval/` and (where the knob is HTTP-exposed)
`src/serving/http/`, asserting the *mechanism* works as advertised:

- *Exclusion* — "consumer A asks to exclude source X; verify zero source-X
  results; verify other authorized sources still surface; verify excluding a
  source the consumer wasn't authorized for is a no-op (not an error)."
- *Per-source caps* — "with `maxPerSource: 2` and a query that returns 10
  same-source hits unfiltered, verify the top-10 has at most 2 from that
  source. With `perSourceCaps: { cru: 1 }` and `maxPerSource: 3` both set,
  verify cru is capped at 1 and others at 3. With caps higher than the
  unfiltered hit count, verify caps cap, they don't pad."
- *Discovery* — "consumer with `allowedSourceKeys = [a, b]` calls
  `GET /v1/sources`; verify only a and b are listed; verify the response
  shape; verify the doc-count and last-indexed-at fields."

These are *unit/integration tests* in the codebase, not golden cases. A few
dozen lines per follow-up. They prove the knob does what the API claims.

**What we do NOT do: re-author golden cases to favour diversity.** It's
tempting to say "now that we have `perSourceCaps`, our golden cases should
prefer balanced top-10s." That would silently pick a side — making the engine
eval favour one consumer's policy over another's. A devotional chatbot might
want diversity; a deep-research tool might want depth from one source. Neither
preference belongs in the integrity eval. If a *specific consumer* wants to
measure their policy's behaviour, they author their own cases against
`POST /v1/search` with their policy bound — that's the consumer's eval, not
ours.

**Practical implication for picking up E / I / L:** they're shippable
independently of any eval re-authoring. The 62-case suite stays the integrity
baseline; the new follow-ups add focused mechanism tests sitting next to the
code they exercise. Slice work and engine/consumer follow-up work don't
interleave or compete.

---

## Multilingual eval (embedder swap → qwen3-8b, #39 P4)

Adopting `qwen/qwen3-embedding-8b` ([ADR-0005](./decisions/0005-embedding-model-qwen3-8b-multilingual.md))
re-embeds the whole corpus, so eval covers two distinct concerns with two
different bars. The prod half is the repo runbook
[docs/ops/prod-reembed.md](./ops/prod-reembed.md); the local (dev-laptop) phase is driven
from the operator's out-of-repo execution tracker (kept on the laptop, not in this repo).

### English — a **drift gate** (existing 6 sources only), not an improvement target
**Scope: this no-human shortcut applies ONLY to re-embedding the existing 6 English
sources**, which already carry curated golden cases — the model swap re-scores an
*already-authored* suite, it does not create cases.
English is the well-characterised baseline. After the re-embed, run `pnpm eval`
(whole corpus, 62 cases) and compare the primary metrics — **recall@10** and
**coverage** (per this doc's mechanism-not-ranking stance) — against the last
recorded baseline in `docs/sources.md` / the newest `eval/results-*.md`. English
is expected to **hold**, not necessarily improve. **Only a major regression
blocks**: proposed gate = recall@10 or coverage down **> 2% relative** vs
baseline. An agent may judge this autonomously by reading `sources.md` + the
prior results file for the historical numbers and the living-relevant-set /
minScore history (a small dip from a living-set artifact is not a regression —
see the `/slice` Stage-4 note). **No human-in-the-loop is needed for this gate** — it
re-scores already-curated cases, it does not author new ones.

> **A NEW English source (future work) is NOT covered by this shortcut.** It has no golden
> cases yet, so it needs the same human-in-the-loop `/golden` authoring as the non-English
> flow below — just without the translation step. The no-human path is exclusively the
> model-swap drift re-score of the *existing* curated suite; authoring cases for any new
> source, in any language, is always human-gated.

### Non-English — **human-in-the-loop**, one suite per language
No non-English golden cases exist yet. For each non-English source key
(`thelife-fr`, `thelife-zh`, …), author a suite with `/golden`
(`.claude/skills/golden/SKILL.md`) against the **qwen-embedded** corpus:

1. Survey what landed for the source; draft persona-diverse questions grounded
   in real docs, `relevant` scoped to that source key (isolates the cross-lingual
   signal). Because each language is its own source key, `pnpm eval --source
   thelife-fr` **is** the per-language breakdown — no new `--language` flag.
2. **Human-in-the-loop is mandatory for taste + accuracy**, and the reviewer may
   not read the language. So the agent presents every candidate case **with an
   English translation** of the question *and* the expected-doc chunk snippet
   (extending golden guardrail #5 across languages) — the human approves/edits/
   rejects on the translated content, never on a title.
3. Write approved cases to `eval/qa-golden.yaml`; run `pnpm eval --source <key>`.
   Primary read is **recall@10 + coverage**, with recall@3 + MRR reported as
   ranking-quality secondaries (recall@10 can saturate on a small per-language set).
4. **minScore** (0.37, English-derived) may shift under qwen and across languages —
   re-derive from the new score distribution using a few non-English off-topic
   negatives per language before changing the default; report before changing.
