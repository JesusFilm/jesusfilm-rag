---
name: slice
description: "Drive one vertical slice of jesusfilm-rag end-to-end (acquire → ingest → retrieve → spot-check for a single source) with resumable checkpoint state for cold starts. Reads STATUS.md, resumes in-progress work or unpacks the next slice, commits per verified checkpoint, and narrates in plain language. Invoke /slice (resume or start next) or /slice <source>."
allowed-tools: "Bash(git *) Bash(pnpm *) Bash(npx *) Bash(tsx *) Bash(node *) Bash(docker *) Bash(psql *) Bash(curl *) Bash(date *) Bash(mkdir *) Bash(cat *) Read(*) Write(*) Edit(*) Grep(*) Glob(*)"
disable-model-invocation: true
---

<!-- version: 1 -->

# slice — drive one vertical slice, resumably

Drives **one source all the way through** the pipeline — acquire → ingest →
retrieve → spot-check — then stops. State is durable, so a cold start (fresh
session, no chat history) can resume exactly where the last one left off. It is
the lightweight cousin of the sabs `build-loop`: same bones (durable resumable
state, a verify gate, a resume path), none of the ceremony (no PRs, Actions,
retros, phase specs, circuit breakers, locks).

## Operating principles (the contract)

1. **You hold the architecture; I handle the low-level — in plain language.**
   The operator keeps `docs/architecture.md` in their head. This skill never
   makes the operator track file-level detail. Every summary is at architecture
   altitude: what got built, why, what the verify proved, what's next.
2. **Vertical, one source at a time.** Prove the whole loop on one source before
   touching the next. Module boundaries/ports (architecture §5) are fixed — only
   the build order is per-source.
3. **Verify, don't assume.** Nothing is "done" until the verify gate is green and
   you've seen real evidence (rows, a query result). Never check off or commit on
   red.
4. **Checkpoint as you go.** Each verified sub-step is recorded in the slice file
   AND committed. The slice file + git history are the resume contract.
5. **Lightweight.** One markdown state file per slice. No new infrastructure.

## Invocation

- `/slice` — resume the in-progress slice if one exists; otherwise unpack the
  next slice from `STATUS.md`'s "Next action".
- `/slice <source>` — target a specific source (e.g. `/slice starting-with-god`).
  Resumes that source's slice if present, else starts it.

## The cold-start contract: where state lives

Two durable artifacts, both git-tracked — never chat memory:

- **Slice file** — `docs/slices/<source-key>.md`. The unpacked sub-step
  checklist with a "resume hint", decisions, and per-step commit shas. Template
  at the bottom of this file.
- **Slice branch** — `slice/<source-key>`, branched off `main`. Each verified
  sub-step is a commit on it; the git log is the checkpoint trail.

A fresh session resumes by: read `STATUS.md` → open the active slice file → read
its "Resume hint" + the first unchecked `[ ]` → confirm the slice branch is
checked out → continue. No other context required.

## Procedure

### Step 0 — Orient (always, every invocation)

Read, in order: `docs/STATUS.md`, `docs/sources.md`, and `docs/architecture.md`
§5 (the import law — the boundaries you must not cross). Confirm the green
baseline is intact: `pnpm depcruise && pnpm lint && pnpm typecheck && pnpm test`.
If the baseline is red before any work, stop and report — we never build on a
broken foundation.

### Step 1 — Resume or start?

- Look in `docs/slices/` for a file whose status is `in-progress` or `blocked`
  with an unchecked `[ ]` sub-step (honor a `<source>` arg if given).
- **If found → RESUME.** Check out its slice branch (`git checkout slice/<key>`).
  Read the "Resume hint". Give the operator a 3-line plain-language re-orientation
  ("We're mid-acquire on Starting With God; the fetcher works, next is wiring the
  raw-documents write."), then go to **Step 3** at the first unchecked sub-step.
- **If none → START.** Go to **Step 2**.

### Step 2 — Start a slice (unpack)

1. Determine the source from the arg or `STATUS.md`'s "Next action". Derive a
   `<source-key>` slug (e.g. "Starting With God" → `starting-with-god`).
2. **Unpack** the slice into the four stages and their concrete sub-steps —
   translate STATUS's high-level "Next action" into the low-level steps yourself
   (this is the "unpack next work" the operator asked for). Keep each sub-step
   small enough to verify and commit on its own.
3. Create the slice branch: `git checkout main && git pull --ff-only` (if a
   remote is configured; skip if not) `&& git checkout -b slice/<source-key>`.
4. Write `docs/slices/<source-key>.md` from the template. Point STATUS.md's
   "Next action" at it and set the source's row in `sources.md` to `Acquiring`.
5. **Present the plan in plain language and get a go-ahead** (this is the first
   stage-boundary pause). Show the stages + sub-steps as a short narrative, not a
   wall of detail. Then proceed to Step 3.

### Step 3 — Drive a stage (the inner loop)

For each unchecked sub-step in the current stage, autonomously:

1. Do the work (write/edit code in the correct module per §5; build fixtures;
   write fakes-only tests for contexts, co-located integration tests for adapters).
2. Run the **verify gate** (below) plus the stage's evidence check.
3. **On green:** check the box in the slice file, append the commit sha, commit
   the checkpoint (convention below), update the "Resume hint". Move to the next
   sub-step.
4. **On red:** fix and re-verify. Do not check off, do not commit code. If stuck
   after a couple of honest attempts, treat it as a blocker → Step 4 (decision).

Run within the stage without pausing — momentum inside a stage, oversight at its
edges.

### Step 4 — Stage boundary & decisions (pause points)

Pause and hand back to the operator, in plain language, when:

- **A stage's sub-steps are all green.** Summarize: what this stage now does, the
  verify evidence (e.g. "37 rows in `raw_documents`, text looks clean — sample
  below"), and what the next stage will do. Update `STATUS.md` (you-are-here +
  next action) and `sources.md` (e.g. → `Acquired`). Ask to proceed to the next
  stage.
- **A genuine fork appears** (a design choice the architecture doesn't settle, or
  the "generic crawler vs. per-source" kind of call). Frame it at architecture
  altitude with 2–3 options and a recommendation. Record the chosen answer under
  "Decisions made" in the slice file.
- **A blocker appears** (site anti-bot, JS-rendered content, missing API key,
  flaky verify). Set the slice status to `blocked`, write the blocker plainly in
  the slice file + `sources.md` Notes, and surface it. Don't paper over it.

### Step 5 — Slice complete

When all four stages are green and the spot-check looks good:

1. Final plain-language summary: what's now queryable, the spot-check queries +
   results, anything learned.
2. Update `sources.md` → `Evaluated` with concrete `Results`; update `STATUS.md`
   (move source to Done; set the next slice as "Next action").
3. Set the slice file status to `done`.
4. Offer next steps — merge `slice/<source-key>` into `main`, and/or
   `/slice <next-source>`. Do not merge or push without the operator's say-so.

## The verify gate

The bar for "this sub-step is real":

- **Always:** `pnpm depcruise && pnpm lint && pnpm typecheck && pnpm test` — green.
  `depcruise` red usually means a boundary was crossed (architecture §5) — fix the
  placement, don't loosen the rule.
- **Plus the stage's evidence:**
  - *Acquire* — rows in `raw_documents` for the source; spot-read `raw_content`,
    confirm it's real article text, not nav/boilerplate.
  - *Ingest* — rows in `documents`/`chunks`/`chunk_embeddings`; chunk counts sane;
    re-run is idempotent (delete-then-insert, no duplicate chunks).
  - *Retrieve* — a real query returns ranked, cited hits from this source.
  - *Spot-check* — a handful of representative queries return relevant chunks
    (operator eyeballs).

## Checkpoint & commit conventions

- One sub-step = one checkpoint = one commit on the slice branch.
- Conventional, stage-scoped: `feat(acquire): …`, `feat(ingest): …`,
  `feat(retrieve): …`, `test(acquire): …`, `docs(slice): …`.
- Commit message body: one line on what it does + the verify result.
- End commit messages with the standard `Co-Authored-By` trailer.
- **This skill commits at each verified checkpoint** — a deliberate override of
  the global "commit only when asked", confirmed when the skill was created.
  Pushing and merging are NOT automatic; the operator decides.
- Switch the `gh`/git identity to `jaco-brink` before any push (per workspace
  conventions) — but only when the operator asks to push/merge.

## Talking to the operator (plain-language rules)

- Lead with the architecture-level "what/why", then the evidence. Keep file-level
  mechanics out of summaries unless asked.
- Surface decisions as a short choice with a recommendation, never a jargon dump.
- When resuming, the first thing the operator hears is a 3-line "here's where we
  are" — not a replay of everything done.
- If something is uncertain or went sideways, say so plainly. No false "done".

## Respecting the architecture (boundaries)

Before writing code, place it in the right module — `contracts` / `registry` /
`acquisition` / `ingestion` / `retrieval` / `adapters` / `main` — per the import
law (§5). Contexts depend on interfaces, never concrete adapters; only `main.ts`
wires. If a sub-step seems to need a cross-boundary import, that's a design smell:
stop and raise it (Step 4) rather than weakening `.dependency-cruiser.cjs`.

## Slice file template (`docs/slices/<source-key>.md`)

```markdown
# Slice: <Source name> (<source-key>)

_Branch: `slice/<source-key>` · Started: <YYYY-MM-DD> · Status: in-progress_
<!-- Status: in-progress | blocked | done -->

## Goal (architecture altitude)
Get <Source name> queryable end-to-end: acquire → ingest → retrieve → spot-check.

## Stages & sub-steps
`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents
- [ ] <sub-step>            <!-- sha: ________ -->
- [ ] <sub-step>

### 2. Ingest → corpus tables
- [ ] <sub-step>

### 3. Retrieve → ranked results
- [ ] <sub-step>

### 4. Spot-check
- [ ] <sub-step>

## Decisions made (this slice)
- <date> — <decision> — <why>

## Open question / blocker
- none

## Resume hint (for a cold start)
At: Stage <n> — "<sub-step text>". Next concrete action: <plain language>.
Last verify: <green/red @ time>. Last commit: <sha>. Branch: slice/<source-key>.
```
