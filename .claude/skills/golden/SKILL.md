---
name: golden
description: "Author grounded golden eval cases for one ingested source, fast. Surveys what actually landed in the corpus for a source, then drafts persona-diverse candidate questions (each tied to a real document) plus off-topic negatives for cutoff calibration — for the operator to curate, not hand-write. Writes approved cases into eval/qa-golden.yaml. Invoke /golden to pick from the ingested sources by number, or /golden <key|name|partial> to target one directly."
allowed-tools: "Bash(pnpm *) Bash(psql *) Bash(docker *) Bash(cat *) Bash(grep *) Read(*) Write(*) Edit(*) Grep(*) Glob(*)"
disable-model-invocation: true
---

<!-- version: 2 -->

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
4. **The operator is the gate.** This skill *proposes*; the operator approves,
   edits, or rejects. Never write a case the operator hasn't confirmed.
5. **Curate on content, never on titles.** Every candidate the operator judges
   MUST be presented with the actual chunk-text snippet (≥200 chars) and not
   just a title + score. A reviewer cannot judge whether `/devotionals/transform-
   me-by-your-spirit` legitimately answers a question without reading the text;
   forcing a yes/no on a title alone is rubber-stamping, not curation. (slice
   #5: title-only review was rejected by the operator; the surface was rebuilt
   around a surgical chunk-snippet probe. The mechanism is the wired
   `Retriever.search(question, { allowedSourceKeys, topK }).then(hits => …)`
   — every result carries `.text` which is the chunk excerpt to display.)

## Two operating modes

The skill runs in one of two modes depending on the corpus state — pick the
mode at Step 0:

- **Bootstrap mode** — when this source is the only one (or the first to be
  evaluated): draft fresh cases from scratch. Goes Step 0 → 1 → 2 → 3 → 4 → 5
  → 6 → 7.
- **Re-review mode** — when the corpus already has prior slices' eval cases:
  the `relevant` maps are LIVING, and adding this source likely shifts which
  docs the engine returns for existing questions. Two parts:
  - **Part A — re-review existing cases.** Run `pnpm eval` FIRST. Cases that
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

### 0. Resolve the source (the operator need not know the key)
The canonical id is the registry **key** — a stable slug like `starting-with-god`,
never a number (numbers drift as sources are added). But don't make the operator
memorize it:
- **`/golden`** (no argument) → list the ingested sources and let them pick by
  number from that *live* menu:
  ```sh
  psql "$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)" -c \
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

```sh
psql "$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)" -c "
  SELECT d.title, d.canonical_url, d.category, d.language,
         count(c.id) AS chunks,
         left(regexp_replace(string_agg(c.text, ' ' ORDER BY c.ord), '\s+', ' ', 'g'), 240) AS snippet
    FROM sources s
    JOIN documents d ON d.source_id = s.id
    LEFT JOIN chunks c ON c.document_id = d.id
   WHERE s.key = '<source-key>'
   GROUP BY d.id, d.title, d.canonical_url, d.category, d.language
   ORDER BY d.title;"
```

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
- **Negatives** → save the list to the source's slice file (Stage 4 section) — do
  **not** put them in `qa-golden.yaml` (`eval.ts` would miscount them as misses).

### 6. Baseline + cutoff
- Run `pnpm eval` → report recall@3/@8, MRR, precision@1 and the per-case table.
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

### R1. Run `pnpm eval` FIRST to identify the curation surface
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
arrays). Re-run `pnpm eval` to confirm the regression closed.

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
