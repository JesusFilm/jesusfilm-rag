---
name: golden
description: "Author grounded golden eval cases for one ingested source. Survey what landed in the corpus, draft persona-diverse candidate questions tied to real documents plus off-topic negatives, and write approved cases only after operator curation. Use when asked to create or curate retrieval eval cases, or when the slice workflow reaches its Stage 4 golden-evaluation handoff."
---

<!-- version: 9 -->

# golden — draft grounded eval cases for a source, fast

The pain this removes: authoring 8–10 golden QA cases per source by hand means
scanning many ingested URLs and inventing fair questions — slow and error-prone.
This skill flips it: it reads what the corpus **actually** contains for a source
and drafts candidate cases for the operator to **curate, not write**. They judge;
they don't hunt.

It works for **any** source because it discovers content from the ingested
corpus — it never assumes a topic. Run it once per source, in **Stage 4** of that
source's slice (after Stage 2 ingest has populated `documents`/`chunks`).

## What "golden cases" are here (the contract)

- A **positive** case = a natural question + the document that should answer it
  (`expected_doc_paths`). `pnpm eval` scores recall@3/@8 / MRR / precision@1 over
  these. See `eval/qa-golden.yaml`'s header for the schema and why doc-path
  matching is preferred (it survives re-indexing).
  - **Intended direction (see `docs/eval-approach.md`):** questions are
    source-agnostic and a case's expected set should list **every** doc, across
    sources, that legitimately answers it — and that set is **living**, so when a
    new source is ingested, **re-review prior questions** for newly-relevant docs,
    not only draft new ones. (The v1 cases list a single source's doc; the reframe
    to multi-source `relevant` sets is queued — author with the intended model where
    practical.)
- A **negative** case = an off-topic question this source should *not* answer.
  Used to calibrate the `minScore` cutoff (the "is it honest?" check) by eyeball
  via `pnpm query`. (`eval.ts` does not auto-score negatives yet — see the note
  at the bottom.)

This skill tests **retrieval only** — did the right chunk come back, and does
off-topic content stay out. It encodes no intent / tone / answer judgment; that
is a consumer concern (`docs/architecture.md` §1, "mechanism, not policy").

## Personas — ask from a balanced spread of viewpoints

Real users of this content arrive from very different stances, and retrieval must
be robust to all of them — the *same* information need is phrased completely
differently by a hurting seeker and a combative atheist. Draft questions from **at
least three** of these balanced personas, distributed across the case set (not
every persona for every doc):

1. **Seeker** — hurting, confused, searching. First-person, emotional, informal;
   rarely uses churchy vocabulary. _"I feel so far from God — is there any way back?"_
2. **Skeptic** — adversarial / atheist / critical. Wants evidence, challenges the
   claims, may be combative; argument vocabulary (proof, evidence, contradiction,
   myth). _"Why would a loving God allow children to suffer?"_
3. **Believer** — already following Jesus; wants to grow, apply, or disciple.
   In-group vocabulary (Scripture, assurance, discipleship). _"What does the Bible
   teach about assurance of salvation?"_
4. **Newcomer** — no strong stance; plain, factual, often terse. _"What is the
   gospel?" / "Who is Jesus?"_

Aim for each chosen persona to appear at least once across the ~8–10 positives.
The personas are the default balanced set; the operator may swap or add one.

## Guardrails (what keeps the assist honest)

1. **Phrase like the persona, NOT like the article.** If a question just rewords
   the doc, retrieval finds it trivially — the eval becomes a softball *and*
   circular (you'd be testing whether an embedding matches its own words). Real
   people use *different* vocabulary than the source; that mismatch is what
   actually tests retrieval. Reject paraphrases at curation.
2. **Ground every positive in a real ingested doc.** The expected doc is the one
   the question was derived from — never invent a path. Use the `canonical_url`
   pathname for `expected_doc_paths`.
3. **Negatives must be plausibly-asked but genuinely off-topic for THIS source.**
   **3a. NEVER credit a null-language document — no exceptions, no operator
   question.** A doc whose `documents.language` is `null` has no known language
   (an honest ADR-0007 blank), so a `language:`-scoped case can never return it
   (SQL three-valued logic) and crediting it bakes a permanently unreturnable
   expectation into the answer keys — coverage would measure the confidence gate
   instead of retrieval. Drop nulls from the survey in §1 (`AND d.language IS NOT
   NULL`) so they cannot reach a draft, and say how many you dropped. This is
   settled policy (eval-approach.md → Multilingual eval, correction 3): do not
   propose `pnpm lang:sweep` — that is a production corrective tool, never a step
   in authoring an eval. Every source has some nulls; the dashboard counts them,
   so they are visible, not lost.
4. **The operator is the gate — and the gate is the WRITE, not the invocation.**
   This skill *proposes*; the operator approves, edits, or rejects. **Nothing
   reaches `eval/qa-golden.yaml` without an explicit approval turn** — not a
   plan the operator nodded at, not "everything above", not an inference from
   silence. Draft → present → **stop** → write only what came back approved.
   Re-confirm after any edit round; approval of v1 is not approval of v2.

   This is the load-bearing guarantee, so state it plainly: **the skill may be
   invoked by an agent** (v4 dropped `disable-model-invocation` — `/slice`
   Stage 4 hands off here, and a cold-start resume must not need a human at the
   keyboard). What used to be protected by "a human typed the command" is now
   protected by **this guardrail alone** — v7 removed #7's routine spend pause
   because it never changed an outcome. This one is the answer keys' only gate:
   if it stops holding, they stop being the operator's.
5. **Curate on content, never on titles.** Every candidate the operator judges
   MUST be presented with the actual chunk-text snippet (≥200 chars) and not
   just a title + score. A reviewer cannot judge whether `/devotionals/transform-
   me-by-your-spirit` legitimately answers a question without reading the text;
   forcing a yes/no on a title alone is rubber-stamping, not curation. (slice
   #5: title-only review was rejected by the operator; the surface was rebuilt
   around a surgical chunk-snippet probe. The mechanism is the wired
   `Retriever.search(question, { allowedSourceKeys, topK }).then(hits => …)`
   — every result carries `.text` which is the chunk excerpt to display.)

## Guardrail #6 — score RELEVANCE and BIBLICAL SOUNDNESS as separate axes (slice #7)

Curation at scale is a judging problem, and the axis you judge on decides what gets in.
**Relevance and biblical soundness are orthogonal. Never blend them into one score.**

A document can be **1.0 sound and 0.2 relevant** — perfectly orthodox, answering a question
nobody asked. In slice #7, **73 of 151 proposed credits were exactly that** (mean soundness
0.89). A soundness-only rubric would have auto-accepted every one of them into the answer
keys and quietly corrupted the eval. That pairing is the **tripwire**; count it separately,
never fold it into a generic fail.

The working shape (prompt preserved verbatim at
`docs/prompt-samples/2026-07-14-jfrag-golden-judge-panel.md`; its rubric is
promoted below, and v4 promoted its COST clause into Guardrail #7 — read the
original only for the HTML review-surface detail, not for the rubric):

1. **Panel of 3 lenses** — theologian · pastor · mature Christian. **Separate agents**, or
   they anchor on each other and the spread is meaningless.
2. **Judge the WHOLE DOCUMENT, never chunk 0.** The relevant set credits document paths, and
   articles often open with a long lead-in anecdote. (slice #7: judging chunk 0 rejected 75%
   of docs whose answer lived further in — the whole rejection list had to be thrown away.)
3. **Both axes gated at 0.75, in CODE.** Means, thresholds, and the disagreement rule are
   arithmetic. A model deciding "that's about a 0.8" is a vibe with a number attached.
4. **Non-English: judge in-language**, explain in English.
5. **Surface only failures + escalations** to the operator, worst-first, with a one-sentence
   verdict each. Everything that passes is accepted without review — that is the point.
   (slice #7 cut operator review from 151 uniform cards to 91 ranked ones.)
6. **Validate panel COVERAGE in code before gating.** Lens agents silently skip docs in
   large batches (~4% in practice); the gate must hard-fail on any missing (doc × lens)
   verdict and the holes get surgically re-judged — never gate over partial coverage.
   (slice #8: 7 of 160 docs lacked a lens verdict on the first pass; the gate validator
   caught all 7, two small fix-up agents merged them.)
7. **A rejected redirect-stub points at a floor casualty.** When the panel rejects a page
   for "poses the question, defers the answer to a linked article", check whether the
   link target sat just under the candidate floor — and top up that one pair surgically
   instead of dropping the case. (slice #8: `/faq/astrology.html` was rejected as a stub;
   its target `/wires/marcia-montenegro.html` had missed the floor by 0.002 and was
   approved 0.85 rel / 0.97 sound on re-judge.)

**Honest caveat:** three personas on one base model converge far more than three humans.
Slice #7's max panel disagreement was **0.25** against a 0.5 escalation threshold — **zero
escalations fired**. Do not read agreement as corroboration. The axis that earned its keep
was **soundness**, which found prosperity drift and genuinely harmful pastoral content that
no relevance check could ever surface (→ issue #78).

## Guardrail #8 — calibrate the candidate FLOOR, engine-check every draft, verify every path (v8, slice #10)

Three mechanical checks that cost minutes and prevent silent, permanent damage to the keys.

1. **Set the candidate floor empirically: the HIGHEST score that excludes ZERO
   already-approved documents.** A deep-k pool over a small language corpus is mostly
   noise — slice #10's top-40 sweep of a 225-doc French corpus produced 367 raw
   candidates (1,101 judgements, over the runaway ceiling). Rather than guess a
   cutoff, score the *existing* credited docs: they bottomed out at **0.511**, so a
   0.50 floor excludes none of them while cutting the pool to 320 pairs, and a 0.55
   floor would have discarded 3 documents the operator had already approved. **If a
   floor would exclude a previously-approved doc, it is too high** — that is the
   whole test, and it beats any round number.
2. **Run every drafted question through the wired Retriever BEFORE finalising it,
   and treat a very high score as a PARAPHRASE SMELL rather than a success.** slice
   #10's "what is the difference between being Catholic and being Christian?" scored
   **0.836** — the highest of any probe — purely because it restated the article
   title (Guardrail #1). Reframed as a real family situation it still ranked 1 at an
   honest 0.767. The reverse is also informative: rephrasing the hell question away
   from its article's framing dropped the target document **out of the top 8
   entirely**, exposing a genuine vocabulary gap. **Keep the honest phrasing and let
   the eval record the gap** — a case that always passes measures nothing.
3. **Before the final eval, verify every credited `(source, path)` resolves to
   EXACTLY ONE document.** One SQL query over the whole relevant set. A typo or an
   over-broad suffix match creates an expectation the engine can never satisfy —
   precisely the defect Guardrail #3a exists to prevent, reached by accident instead
   of by policy, and invisible in the metrics except as unexplained missing coverage.

## Guardrail #7 — REPORT the fan-out cost, don't pause for it (v7)

The judge panel is the expensive part: **N docs × 3 lenses**, and a Stage-4 batch
is routinely 150+ docs. Slice #7 ran 151 credits × 3 = 453 judgements in one pass.

**Compute and report the estimate — candidate docs × 3 lenses — then GO.** Do
**not** stop for a go-ahead on an ordinary Stage-4 batch. Print the number so the
run's size is visible in the record, and proceed in the same turn.

**The one exception (runaway backstop): stop and ask only if the estimate exceeds
~1,000 judgements** — roughly 2× the largest batch run to date (slice #8, 480).
That is not a normal Stage 4; it means the candidate pool was built wrong (a
missing floor, a duplicated case set), and the right response is to check the
pool, not to buy it. Below that ceiling, never ask.

**Why this changed in v7.** v4 added the pause because making the skill
agent-invocable removed the "a human typed `/golden`" spend approval. In practice
the gate never changed an outcome: the operator approved every batch, every time
(slices #7, #8, #9), because ingesting and evaluating sources *is* the goal and
the embedder budget is provisioned for it. A gate that always returns the same
answer is not oversight, it is latency — and it broke the cold-start resume
contract it was meant to protect, stranding an unattended Stage 4 on a question
whose answer was known. Spend approval now lives where it is load-bearing: the
runaway ceiling above, and **Guardrail #4** (the write to `eval/qa-golden.yaml`
is still gated on an explicit approval turn — that one does not move).
*(slice #9: the operator asked for this directly — "I always say yes … please
update the directive responsible for pausing on this every time.")*

## Two operating modes

The skill runs in one of two modes depending on the corpus state — pick the
mode at Step 0:

- **Bootstrap mode** — when this source is the only one (or the first to be
  evaluated): draft fresh cases from scratch. Goes Step 0 → 1 → 2 → 3 → 4 → 5
  → 6 → 7.
- **Re-review mode** — when the corpus already has prior slices' eval cases:
  the `relevant` maps are LIVING, and adding this source likely shifts which
  docs the engine returns for existing questions. Two parts:
  - **Part A — re-review existing cases.** Run the offline batch eval command
    defined below FIRST. Cases that
    regressed (recall@10 = 0, or recall@3 = 0 with rank > 3) are the
    curation surface — usually a small fraction of all cases. For each
    regressed case, fetch the engine's actual top-10 with chunk snippets,
    let the operator credit which are legitimate answers, write the
    additions to `qa-golden.yaml`. Skips Steps 1–4 (those are bootstrap-
    only) and jumps to a per-case surgical loop; see "Re-review mode
    procedure" below.
  - **Part B — author new cases for the new source's distinctive content.**
    Standard bootstrap-style drafting (Steps 1–7), but with one extra:
    after drafting each new case, run the question through the wired
    retriever and show the top-5 hits to the operator. The engine often
    surfaces docs the drafter missed (slice #5: 3 of the 10 new cases were
    revised this way).

A re-review-mode run usually does Part A before Part B so the operator gets
the regression-fix headline numbers up-front and the new cases are added on a
known-good baseline.

## Procedure

For every batch eval in this workflow—including bootstrap, initial re-review,
and the post-curation rerun—use the offline retry posture:

```bash
QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000 pnpm eval
```

Do not use bare `pnpm eval` here. The serving/query defaults are intentionally
fast-fail, while a large offline batch has no latency SLA or resume support.

### 0. Resolve the source (the operator need not know the key)
The canonical id is the registry **key** — a stable slug like `starting-with-god`,
never a number (numbers drift as sources are added). But don't make the operator
memorize it:
- **`/golden`** (no argument) → list the ingested sources and let them pick by
  number from that *live* menu:
  ```bash
  if [ ! -f .env ]; then echo "Missing .env; configure the local project database first." >&2; exit 1; fi
  set -a
  . ./.env
  set +a
  if [ -z "${DATABASE_URL:-}" ]; then echo "DATABASE_URL is missing or empty in .env." >&2; exit 1; fi
  psql --no-password "$DATABASE_URL" -c \
    "SELECT row_number() OVER (ORDER BY name) AS n, key, name FROM sources ORDER BY name;"
  ```
  The number is a transient picker for *this* list only — resolve it back to the
  key immediately; never store or refer to the number.
- **`/golden <key | name | partial>`** → resolve to a key (`starting`,
  `Starting With God`, and `starting-with-god` all map to `starting-with-god`).
  If the match is ambiguous or unknown, show the list and ask.

Then confirm the source is **ingested**: it must appear in `sources` AND have rows
in `documents`. If it has no documents, stop and say "ingest this source first
(slice Stage 2)". (`docs/sources.md` → "Registry keys" lists every registered
key.)

### 1. Survey the ingested corpus
Read what actually landed for the source — **do not re-scrape**. Via psql against
the project DB (`DATABASE_URL` from `.env`), list each document. Example:

```bash
if [ ! -f .env ]; then echo "Missing .env; configure the local project database first." >&2; exit 1; fi
set -a
. ./.env
set +a
if [ -z "${DATABASE_URL:-}" ]; then echo "DATABASE_URL is missing or empty in .env." >&2; exit 1; fi
psql --no-password "$DATABASE_URL" -c "
  SELECT d.title, d.canonical_url, d.category, d.language,
         count(c.id) AS chunks,
         left(regexp_replace(string_agg(c.text, ' ' ORDER BY c.ord), '\s+', ' ', 'g'), 240) AS snippet
    FROM sources s
    JOIN documents d ON d.source_id = s.id
    LEFT JOIN chunks c ON c.document_id = d.id
   WHERE s.key = '<source-key>'
     AND d.language IS NOT NULL   -- Guardrail #3a: nulls are UNCREDITABLE
   GROUP BY d.id, d.title, d.canonical_url, d.category, d.language
   ORDER BY d.title;"
```

The `d.language IS NOT NULL` filter is **load-bearing, not tidying** — it is what
stops an uncreditable doc reaching a draft (Guardrail #3a). Run the same query
without it once to get the null count, report that number alongside the digest
("N docs excluded as null-language"), and move on — do not investigate them, do
not propose a sweep.

Present a compact digest so both you and the operator can see the source's real
shape (titles, paths, categories, snippets).

### 2. Draft positives (persona-diverse, grounded)
Pick representative / important documents from the digest. For a balanced persona
spread, draft ~8–10 candidate positives — each: **persona · natural persona-true
question · expected document (pathname)**. Distribute personas for coverage. Obey
the guardrails (esp. #1: no paraphrases).

### 3. Draft negatives (cutoff calibration)
Draft 3–5 off-topic questions this source should *not* answer, derived from its
topic scope as revealed by the survey.

### 4. Present for curation (pause)
Show all candidates in a readable form — **with the actual chunk-text snippet
of each expected doc**, not just title + score (guardrail #5). For each draft
case, present: persona · question · expected doc pathname · first chunk text
(≥200 chars). For each draft negative: question + a 1-line reason it's
plausibly-asked-but-off-topic. Get the operator's approve / edit / reject. Do
**not** proceed on unconfirmed cases.

Bootstrap-mode addition: after drafting each new case, run its question
through the wired retriever (`Retriever.search(question, { topK: 5 })`) and
show the top-5 hits before pausing. If the engine surfaces a doc the drafter
missed, offer to add it; if the engine ranks an unrelated doc highest, that's
a useful signal about phrasing or about gaps in the source's coverage.

### 5. Write approved cases
- **Positives** → append to `eval/qa-golden.yaml` (preserve existing cases). Use
  unique, descriptive ids `<src>-<persona>-<topic>` (e.g. `swg-skeptic-suffering`,
  `swg-seeker-begin`); each MUST carry `source: <registry-key>` (the resolved
  source key — drives `pnpm eval --source` + the per-source breakdown) and at
  least `expected_doc_paths`.
- **Non-English cases MUST carry an English translation of the question as a
  YAML comment on the case (e.g. `# EN: …`), AND their eval evidence MUST
  include the retrieved results translated to English** — a `# RETRIEVED`
  comment block listing each returned doc (path + English-translated title),
  as in `eval/candidates-thelife-*.yaml`. A reviewer who doesn't read the
  language can only verify that the *results* answer the *question* if both
  sides are in English, and future agents re-review the living relevant sets
  from them. A non-English case without both is incomplete — do not write it.
  (See docs/eval-approach.md → "Multilingual eval".)
- **Non-English cases MUST also carry `evidence_tier`** — `human-verified` when
  the operator could read the language or sanity-check the translation,
  `llm-translated` when nobody available can verify it (added 2026-08-03 for the
  45-language #111 campaign; see docs/eval-approach.md → "Evidence tiers").
  Ask which applies rather than assuming — it is a fact about the *reviewer*,
  not about the language. It is **not** a quality gate: nothing is discounted or
  excluded, `pnpm eval` just reports the buckets apart so a machine-translated
  language's number is never averaged into a checked one. **Never backfill a tier
  onto an existing untagged case** — that asserts something nobody can now check.
- **Negatives** → save the list to the source's slice file (Stage 4 section) — do
  **not** put them in `qa-golden.yaml` (`eval.ts` would miscount them as misses).

### 6. Baseline + cutoff
- Run the offline batch eval command above → report recall@3/@8, MRR, precision@1 and the per-case table.
- Run the negatives through `pnpm query --source <key> "<q>"` and eyeball the top
  scores: they should sit *below* where the positives cluster. Use that gap to
  re-derive `minScore` (architecture FOLLOW-UP A).

### 7. Record
Note the baseline numbers + the cutoff finding in `docs/sources.md` (→ Evaluated)
and the slice file's Stage 4 evidence.

## Re-review mode procedure (when prior slices exist)

When the corpus already has eval cases from prior slices, the `relevant` maps
are LIVING and a new source likely makes some old cases miss not because
retrieval got worse but because the new source's docs displaced the old
expected docs on shared questions (slice #3/#4 lesson). Two passes:

### R1. Run the offline batch eval command FIRST to identify the curation surface
- Report headline metrics + per-case table. Compare against prior slice's
  baseline if you have it.
- The curation surface = regressed cases:
  - **Hard misses** (`recall@10 = 0`) — engine returned NOTHING the case
    credits. Highest-value targets; usually the existing relevant set is now
    stale.
  - **Degraded rank** (`recall@3 = 0` with rank > 3 in top-10) — old expected
    docs still surface but ranked below new content.
- Non-regressed cases need no work (the eval already confirms them).

### R2. For each regressed case, surgical content-grounded curation
For each regressed-case id, run the wired retriever (whole corpus, top-10)
and present the operator with:
- the question (verbatim)
- the existing `relevant` map (with rank-or-✗ for each path)
- the top-10 hits the engine actually returned, each with: source key, score,
  pathname, **and the chunk-text snippet** (`hit.text`, ≥200 chars)
- a flag on each hit: `[credited]` if it's already in the relevant set,
  `[<src>←new]` if it's from the new source, otherwise plain

The operator decides per hit whether to credit. Write approved additions to
`qa-golden.yaml` (additive: never remove a credited path; just extend the
arrays). Re-run the offline batch eval command to confirm the regression closed.

### R3. Watch for prior-slice curation gaps surfacing
The re-review often surfaces top-10 hits from PRIOR sources that were already
in the corpus but never credited — leftover gaps in an earlier slice's
Stage 4. Credit them; the eval matures incrementally. Surface these as
"slice-#N gap-fix" in the slice's Stage 4 evidence so the lesson is visible
in the record. (slice #5: 15+ sightline docs were credited this way,
fixing a slice-#4 sightline curation gap.)

### R4. Then Part B — author new cases for the new source's distinctive content
Run the bootstrap procedure (Steps 1–7) to draft new persona-diverse cases
for content the existing 42-ish questions don't cover. The engine sanity-
check in Step 4 catches when your draft misses a better existing match —
take it seriously (slice #5: 3 of 10 new cases were revised after engine
surfaced better-aligned docs).

## Negatives — current limitation (honest note)
`scripts/eval.ts` scores positives only; a case with no expected match is counted
as a **miss**, so negatives cannot yet be auto-scored as "correctly returned
nothing." For now they drive the manual `pnpm query` cutoff eyeball (step 6). A
small `eval.ts` extension — a `negative: true` flag scored as *pass = no hit above
cutoff* — would automate this. Clean future enhancement; not required to use this
skill.
