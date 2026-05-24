---
name: golden
description: "Author grounded golden eval cases for one ingested source, fast. Surveys what actually landed in the corpus for a source, then drafts persona-diverse candidate questions (each tied to a real document) plus off-topic negatives for cutoff calibration — for the operator to curate, not hand-write. Writes approved cases into eval/qa-golden.yaml. Invoke /golden <source-key> after that source is ingested."
allowed-tools: "Bash(pnpm *) Bash(psql *) Bash(docker *) Bash(cat *) Bash(grep *) Read(*) Write(*) Edit(*) Grep(*) Glob(*)"
disable-model-invocation: true
---

<!-- version: 1 -->

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

## Procedure

### 0. Preconditions
The source must be ingested. Confirm `documents` has rows for it; if zero, stop
and say "ingest this source first (slice Stage 2)".

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
Show all candidates in a readable table (persona · question · expected doc, then
the negatives). Get the operator's approve / edit / reject. Do **not** proceed on
unconfirmed cases.

### 5. Write approved cases
- **Positives** → append to `eval/qa-golden.yaml` (preserve existing cases). Use
  unique, descriptive ids `<src>-<persona>-<topic>` (e.g. `swg-skeptic-suffering`,
  `swg-seeker-begin`); each MUST carry at least `expected_doc_paths`.
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

## Negatives — current limitation (honest note)
`scripts/eval.ts` scores positives only; a case with no expected match is counted
as a **miss**, so negatives cannot yet be auto-scored as "correctly returned
nothing." For now they drive the manual `pnpm query` cutoff eyeball (step 6). A
small `eval.ts` extension — a `negative: true` flag scored as *pass = no hit above
cutoff* — would automate this. Clean future enhancement; not required to use this
skill.
