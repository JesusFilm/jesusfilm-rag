---
name: slice
description: "Drive one vertical slice of jesusfilm-rag end-to-end (acquire → ingest → retrieve → spot-check for a single source) with resumable checkpoint state for cold starts. Reads STATUS.md, resumes in-progress work or unpacks the next slice, commits per verified checkpoint, and narrates in plain language. Invoke /slice (resume or start next) or /slice <source>."
allowed-tools: "Bash(git *) Bash(pnpm *) Bash(npx *) Bash(tsx *) Bash(node *) Bash(docker *) Bash(psql *) Bash(curl *) Bash(date *) Bash(mkdir *) Bash(cat *) Read(*) Write(*) Edit(*) Grep(*) Glob(*)"
disable-model-invocation: true
---

<!-- version: 7 -->

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

Three durable artifacts, all git-tracked — never chat memory:

- **Slice file** — `docs/slices/<source-key>.md`. The unpacked sub-step
  checklist with a "resume hint", decisions, and per-step commit shas. Template
  at the bottom of this file.
- **Slice branch** — `slice/<source-key>`, branched off `main`. Each verified
  sub-step is a commit on it; the git log is the checkpoint trail.
- **Source status YAML** — `docs/source-status.yaml`. The scannable lookup the
  `*:production` scripts depend on: one row per source, each nesting its stages
  under `languages:` (per-language `status` + the four `stages`
  acquire/ingest/retrieve/evaluate). The status vocabulary, the cross-field
  invariants, and the rollup rule are defined once in the contract
  `src/contracts/source-status.schema.ts`. **Never hand-edit this file** —
  mutate it only through `pnpm status:*` (the deterministic writer, the sole
  sanctioned mutator: it validates against the contract, derives the top-level
  `status`, and bumps `last_updated`). This skill calls the tool at stage
  boundaries (Step 2 add-source, Step 4 stage-set, Step 5 done). It is **not a
  production mirror** — the `*:production` scripts don't read or write it; it
  records *asserted* stage state, not verified prod inventory (live counts live
  in SQL + `docs/sources.md`). See `docs/ops/prod-ingest.md`.

A fresh session resumes by: read `STATUS.md` → open the active slice file → read
its "Resume hint" + the first unchecked `[ ]` → confirm the slice branch is
checked out → continue. No other context required.

## Procedure

### Step 0 — Orient (always, every invocation)

Read, in order: `docs/STATUS.md`, `docs/sources.md`, and `docs/architecture.md`
§5 (the import law — the boundaries you must not cross). Confirm the green
baseline is intact: `pnpm depcruise && pnpm lint && pnpm typecheck && pnpm db:check && pnpm test`.
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
3. **Produce the source's language plan (mandatory — do this during unpack, BEFORE
   writing crawl policy or registering the source).** Language is **not** an ad-hoc
   per-source question anymore; it follows a deterministic recipe (architecture
   invariant 6, [ADR-0006](../../../docs/decisions/0006-per-document-language-detection.md)):
   1. **Enumerate domains → one source per domain (hard rule).** The same ministry/
      banner on multiple domains → multiple source keys (the `thelife` /
      `thelife-fr` / `thelife-zh` pattern). This is not a judgment call and needs no
      operator question.
   2. **Declare the expected language set by inspecting the site** (sitemaps/sections
      — e.g. a `/us-latinos/` Spanish sitemap on a shared domain). This fills the
      registry `languages` as the *declared/expected* set (a cross-check), NOT the
      per-document label.
   3. **State that language is detected per document at ingest** from the content
      (`ingestion/detect-language.ts`). The skill never assumes one language per
      source and never trusts the URL path or `<html lang>` for the label.
   Escalate to the operator **only** if detection confidence is *systematically* low
   for a source (a genuine fork), not to ask "how do we handle languages?".
   *(slice: FamilyLife `es` was mislabeled `en` because language was sourced from
   `languages[0]` — see #68 / ADR-0006.)*
4. **Probe for a bot wall (mandatory — during unpack, BEFORE writing the crawl
   policy).** Plain-HTTP-fetch one real content page (the recon UA). Classify the
   source **walled** ONLY on the Cloudflare **block-page signature**: 403/503 status
   AND the interstitial's markers (title "Attention Required! | Cloudflare",
   "Enable JavaScript and cookies to continue", …). Do **NOT** key off the presence
   of a `challenge-platform` script reference — successfully-served Cloudflare
   pages carry it too, so it false-positives on CF-fronted-but-served sources
   (thelife, cru). On detecting a wall, record `fetchStrategy: "firecrawl"` in the
   new registry entry ([ADR-0012](../../../docs/decisions/0012-firecrawl-fetch-strategy-walled-sources.md))
   — a deliberate, static, per-source choice; there is no runtime fallback, and the
   strategy covers ALL the source's requests (sitemap discovery included). If a
   walled source's sitemap can't be fetched cleanly through Firecrawl either, the
   fallback is hand-listed `seedPaths` — a registry decision, not a runtime one.
   A firecrawl source needs `FIRECRAWL_API_KEY` set when its acquire runs (loud
   wiring error otherwise).
5. Create the slice branch: `git checkout main && git pull --ff-only` (if a
   remote is configured; skip if not) `&& git checkout -b slice/<source-key>`.
6. Write `docs/slices/<source-key>.md` from the template. Point STATUS.md's
   "Next action" at it and set the source's row in `sources.md` to `Acquiring`.
   Register the source in `docs/source-status.yaml` via the tool:
   `pnpm status:add-source --key <source-key> --name "<name>" --lang <code> --slice-file docs/slices/<source-key>.md`
   (creates the row with one language at all four `stages: pending`; the tool
   derives `status` and stamps `last_updated`). Never hand-edit the YAML — the
   `*:production` scripts read it, and a stray edit makes engineers pick wrong
   keys (see `docs/ops/prod-ingest.md`).
7. **Present the plan in plain language and get a go-ahead** (this is the first
   stage-boundary pause). Show the stages + sub-steps — **including the language
   plan (domains → source keys, declared languages, per-doc detection)** — as a
   short narrative, not a wall of detail. Then proceed to Step 3.

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
  next action), `sources.md` (e.g. → `Acquired`), and flip this stage to `green`
  (or `red` if blocked) with the tool:
  `pnpm status:set --source <key> --lang <code> --stage <stage>=<green|red>`
  (it re-derives `status` and bumps `last_updated` — never hand-edit the YAML).
  Include the YAML write in the same checkpoint commit as the stage close so git
  history and the YAML never diverge. Ask to proceed to the next stage.
- **A genuine fork appears** (a design choice the architecture doesn't settle, or
  the "generic crawler vs. per-source" kind of call). Frame it at architecture
  altitude with 2–3 options and a recommendation. Record the chosen answer under
  "Decisions made" in the slice file.
- **A blocker appears** (site anti-bot, JS-rendered content, missing API key,
  flaky verify). Set the slice status to `blocked`, write the blocker plainly in
  the slice file + `sources.md` Notes, and record it in the YAML via the tool:
  `pnpm status:set --source <key> --lang <code> --stage <stage>=red --status blocked --blocker "<reason>"`
  (the tool requires both a `red` stage and a blocker for `blocked`). Surface it;
  don't paper over it.
- **Before a live _discovery_ crawl, confirm the budget.** Unlike a hand-listed
  seed set, a discovery crawl's scale is unknown until you parse the sitemap, and
  it drives both fetch politeness and embedding cost. Do a dry discovery (count
  URLs), then confirm `maxPages` + the embedding spend with the operator before the
  full crawl + ingest. (slice #3: ~351 discovered before committing to the crawl.)
- **A new source "regressing" the eval is usually a stale relevant-set, not a
  retrieval bug.** Adding a source to an existing corpus lets its genuinely-relevant
  docs displace the old expected docs on _existing_ cases, so recall/coverage drops.
  Re-review the **living `relevant` maps** via `/golden` (it re-scans prior cases)
  _before_ suspecting retrieval/minScore. (slice #3: recall@10 0.85 → 0.938 after
  re-review, no engine change. slice #5: recall@3 0.71 → 1.00 after re-review.)
- **Each slice's Stage 4 re-review improves PRIOR slices' eval too, not just the
  new source's.** Re-reviewing a question for the new source's relevant docs
  often surfaces top-10 hits from PRIOR sources that were already in the corpus
  but never credited — leftover curation gaps in an earlier slice's Stage 4.
  Don't skip those; crediting them is how the eval matures. When reading
  per-source coverage after a Stage 4, expect _prior-source_ numbers to MOVE —
  usually up. (slice #5: 15+ sightline docs were credited as a side-effect of
  re-reviewing for thelife, closing a slice-#4 sightline curation gap; the
  slice-#3 `jf-believer-disciple-making` vocab gap was also closed by
  thelife `/discipleship-101`.)
- **`/golden` ≥ v2 runs Stage 4 in content-grounded mode** — every candidate is
  presented with the actual chunk snippet, not just title + score. Title-only
  review is rubber-stamping, not curation. If `/golden` regresses to title
  lists, push back; rebuild the surface around real text.
- **Stage 4 curation: judge the DOCUMENT, not the chunk.** The relevant set credits
  **document paths**, so relevance must be judged on the whole document. Cru articles
  routinely open with a long lead-in anecdote, so judging chunk 0 rejects docs whose
  answer lives in chunk 7. (slice #7: 75% of the docs a first judging pass rejected as
  "off-question" had >2 chunks — the rejection list was junk and had to be re-run.)
- **Never author a relevant set from what the engine returned — coverage goes circular.**
  `coverage` exists to detect a good answer being *buried*; if the set contains only what
  came back, it is 1.0 by construction and detects nothing. Build the set from the
  **corpus** (deep-k probe + keyword sweep), then check the engine against it. (slice #7:
  fake 1.0 → honest 0.45–1.00 per case after backfilling the buried answers.)
- **Score relevance and biblical soundness as SEPARATE axes, and gate on both.** slice #7
  ran Stage 4 through a 3-lens LLM judge panel (theologian / pastor / mature Christian).
  **73 of 151 proposed credits were biblically SOUND but OFF-QUESTION** — a
  soundness-only rubric would have auto-accepted every one and corrupted the answer keys.
  The gate itself must live in **code**, not in a model's head. Caveat: three personas on
  one base model agree far more than three humans (max spread 0.25 vs a 0.5 escalation
  threshold → zero escalations), so don't read agreement as corroboration — but the
  soundness axis surfaced real content problems (#78) relevance never could.
  Prompt: `docs/prompt-samples/2026-07-14-jfrag-golden-judge-panel.md`.
- **A multi-language source breaks per-source eval reads.** Since ADR-0006 (one domain =
  one source), `--source <key>` blends a source's languages. Use the per-language
  coverage view, and **pin `language:` on any case whose only relevant source is
  multilingual** — otherwise `caseLanguage()` can't derive one and the case silently
  searches the whole multilingual corpus. See `docs/eval-approach.md` → Multilingual eval.
- **Verify your probing tool before you trust its verdicts.** slice #7's deep-k curation
  probe (`--top-k 40`) was silently truncating at ~33 docs — `candidateTopK` was capped at
  a flat 50 — so every "not ranked" verdict really meant "not in the top ~33". Prod and
  eval never hit it (topK 5 / 10). If a probe tells you a doc is *absent*, confirm the
  probe can actually see that far.

### Step 5 — Slice complete

When all four stages are green and the spot-check looks good:

1. Final plain-language summary: what's now queryable, the spot-check queries +
   results, anything learned.
2. Update `sources.md` → `Evaluated` with concrete `Results`; update `STATUS.md`
   (move source to Done; set the next slice as "Next action").
3. Set the slice file status to `done`. In `docs/source-status.yaml`, mark the
   language done via the tool:
   `pnpm status:set --source <key> --lang <code> --stage evaluate=green --status done`
   (the tool refuses `done` unless all four `stages` are `green`, then derives
   the row `status` — which reads `done` only once every language is done).
   Confirm with `pnpm status:check`. This rollup is the signal the `*:production`
   scripts watch for — without it, the engineer can't tell at a glance that the
   source is ready to promote to prod.
4. **Check unblocked follow-ups.** If this completion means **≥2 sources are now
   done end-to-end**, surface that **FOLLOW-UP E** (consumer source-exclude filter,
   `excludedSourceKeys`) is unblocked — it was deferred precisely until a second
   source exists to test exclusion against. See `docs/architecture.md` §11.
5. **Capture process learnings.** Before offering merge/next-slice, ask: "Anything
   from this slice worth carrying forward?" Lessons land in their natural home —
   no graveyard doc; embed them where they'll be READ on the next invocation:
   - **Procedural lessons that change how the next slice runs** → edit this skill
     (`.claude/skills/slice/SKILL.md`) and bump the `<!-- version: N -->` marker.
     Cite the slice that taught it (`slice #N: <what we hit>`) — the citation
     pattern is the provenance trail; future readers can trace a rule back to the
     moment it bit someone.
   - **`/golden`-handoff-surface lessons** → edit `.claude/skills/golden/SKILL.md`
     (bump its version) AND drop a one-line pointer in this skill's Step-4
     living-relevant-set bullet so the `/slice` driver knows about the
     `/golden` shape it'll hand off to.
   - **Engine / architecture lessons** → `docs/architecture.md` §11 FOLLOW-UPS
     (the running list that captures "things a slice discovered we need to do
     later"; this slice may sharpen an existing FOLLOW-UP rather than add one).
   - **Eval-methodology lessons** → `docs/eval-approach.md`.
   Commit as `docs(skill): capture slice-N learnings — <one-line summary>` on
   the slice branch so lessons land alongside the work that produced them.
   Skip silently if there's genuinely nothing — don't manufacture lessons.
6. Offer next steps — merge `slice/<source-key>` into `main`, and/or
   `/slice <next-source>`. Do not merge or push without the operator's say-so.

## The verify gate

The bar for "this sub-step is real":

- **Always:** `pnpm depcruise && pnpm lint && pnpm typecheck && pnpm db:check && pnpm status:check && pnpm test` — green.
  `depcruise` red usually means a boundary was crossed (architecture §5) — fix the
  placement, don't loosen the rule. `db:check` red means `src/db/schema.ts` changed
  without a migration — run `pnpm db:generate` and commit the new file, don't skip it.
  **`status:check` is in the gate because CI runs it** — a slice can otherwise go green
  locally and red in CI. (CI also runs `dashboard:verify`; run it if you touched the
  dashboard.) *(slice #7 found this gap.)*
- **Re-run the full gate after Acquire/Ingest, not only after code changes.**
  `pnpm test` includes integration tests that query the live Postgres, so a *data*
  stage can turn them red with **zero** code changes (slice #3: ingesting 349 docs
  broke `tests/retrieval.integration.test.ts`, whose fixture assumed a small DB).
  Never check off a data stage on the strength of "no code changed" — run it.
- **Delete throwaway slice scripts BEFORE running the gate, not after.** Stage 4
  curation (and sometimes other sub-steps) needs disposable scripts under
  `scripts/` — ad-hoc probes, one-off appliers, etc. These are part of the work,
  not part of the codebase. Keep them only while you're using them: `tsc` (in
  `pnpm typecheck`) will fail on a stale unused-variable in a debug iteration
  even though the script is going away, and the slice can't close on a red gate.
  Delete-then-verify, never verify-then-delete. (slice #5: a Stage-4 probe's
  unused `probe` const flunked typecheck the first time the post-curation gate
  ran.)
- **Plus the stage's evidence:**
  - *Acquire* — rows in `raw_documents` for the source; spot-read `raw_content`,
    confirm it's real article text, not nav/boilerplate.
  - *Ingest* — rows in `documents`/`chunks`/`chunk_embeddings`; chunk counts sane;
    re-run is idempotent (delete-then-insert, no duplicate chunks). **For a
    multi-language source, spot-check that a non-primary-language document lands
    with the correct `documents.language`** (e.g. a FamilyLife `/us-latinos/` page
    reads `es`, not `en`) — this is the invariant-6 detection working.
  - *Retrieve* — a real query returns ranked, cited hits from this source. **For a
    multi-language source, a `language:<code>` filter returns ONLY that language**
    (e.g. `language:"es"` returns Spanish and no English).
  - *Spot-check* — a handful of representative queries return relevant chunks
    (operator eyeballs).

## Checkpoint & commit conventions

- One sub-step = one checkpoint = one commit on the slice branch.
- Conventional, stage-scoped: `feat(acquire): …`, `feat(ingest): …`,
  `feat(retrieve): …`, `test(acquire): …`, `docs(slice): …`.
- Commit message body: one line on what it does + the verify result.
- End commit messages with the standard `Co-Authored-By` trailer.
- **commitlint gotchas** (husky `commit-msg` hook): the subject must be
  **lowercase** — a sentence-case subject like `Stage 4 …` is rejected
  (`subject-case`); and the `Co-Authored-By` trailer needs a **blank line before
  it** (`footer-leading-blank`). The same rules bind the squash-merge **PR title**
  (linted by `.github/workflows/pr-title.yml`).
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
<!-- Status: in-progress | blocked | done | deferred (mirrors the RowStatus contract) -->

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
