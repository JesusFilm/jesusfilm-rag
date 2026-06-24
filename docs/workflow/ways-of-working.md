# jesusfilm-rag — Ways of Working

How work happens here: explored, planned, built, verified, reviewed, merged, and
**compounded**. This is the compound-engineering (CE) loop, tuned to this repo's
existing machinery — the three-context architecture, the mechanical gates, and
the vertical-slice build model. The binding summary lives in
[`AGENT.md`](../../AGENT.md); the per-skill config lives in
[`compound-engineering.local.md`](../../compound-engineering.local.md).

The principle behind all of it: **each unit of engineering work should make the
next unit easier — not harder.** The loop exists to make that mechanical.

---

## The loop

```
/ce-brainstorm ──▶ docs/brainstorms/<topic>-requirements.md      (WHAT — optional)
      │  decide to act
      ▼
/ce-plan ───────▶ docs/plans/<slug>.md   (+ ADR if it locks a direction)  ⏸ GATE 1
      │  direction approved (self or human)         (HOW)
      ▼
 build the plan:
   · per-source pipeline  → /slice   (acquire → ingest → retrieve → eval)
   · everything else      → /ce-work (infra · tooling · refactor · process)
      │  small, recovery-safe commits          [on a branch / worktree]
      ▼
 VERIFY (hard gate, mechanical):
   pnpm depcruise && pnpm lint && pnpm typecheck && pnpm test
   pnpm check:solutions        (learnings index + frontmatter)
   pnpm eval                   (when retrieval/corpus changed)
      ▼
 PR open ──▶ review (cold reviewer reads the diff)              ⏸ GATE 2
      │  CI green + review APPROVE
      ▼
 squash-merge ──▶ /ce-compound ──▶ docs/solutions/<category>/<doc>.md
                                   (+ index row, discoverability check)
```

### 1. Brainstorm (optional)
`/ce-brainstorm` when exploring **what** to build. Output is a requirements doc
in `docs/brainstorms/`. It is not committed work and does not auto-become an
issue — you promote it by moving to `/ce-plan`.

### 2. Plan → GATE 1 (direction)
`/ce-plan` writes the technical plan to `docs/plans/<slug>.md`. **GATE 1** is
direction approval: for routine work the agent approves its own direction and
proceeds; for anything that locks a hard-to-reverse choice it writes an
**[ADR](../decisions/)** and — per `AGENT.md` — *escalates to Jaco* before
building (architecture, the mechanism-not-policy tenet, real spend, irreversible
ops). Bug/chore/docs work skips GATE 1.

### 3. Build
- **`/slice`** drives the canonical per-source vertical pipeline with resumable
  checkpoint state. It stays the executor for source work — `/ce-work` does not
  replace it.
- **`/ce-work`** is the generic executor for everything that isn't a per-source
  slice: infra, tooling, refactors, the eval harness, process/docs changes. It
  reads a plan (or a bare task), works in small committed increments, and runs
  the verify gate before opening a PR.

Both work on a branch or a `.claude/worktrees/<name>` worktree off
`origin/main`, never on `main` directly.

### 4. Verify (hard gate — mechanical)
No PR opens until these pass locally (CI re-runs them — see
[architecture.md §5.8–5.9](../architecture.md)):

- `pnpm depcruise && pnpm lint && pnpm typecheck && pnpm test` — the import law,
  size caps, types, fakes-only tests.
- `pnpm check:solutions` — any new/changed learning doc is well-formed and
  indexed.
- `pnpm eval` — when the change touches acquisition / ingestion / retrieval or
  the corpus, report recall@k / MRR against `eval/qa-golden.yaml`. Author new
  golden cases for a newly-ingested source with [`/golden`](../../.claude/skills/golden/SKILL.md).

### 5. Review → GATE 2 (merge)
Open the PR (Conventional-Commits title — linted by `.github/workflows/pr-title.yml`).
A reviewer — ideally a fresh, cold subagent — reads the **actual diff** against
this repo's bars: the import law, the mechanism-not-policy tenet, fakes-only
tests, file-size discipline, read-only-at-MCP. CI green **and** an explicit
review verdict are the merge gate. Branch protection on `main` means green
checks are the only thing between a commit and production.

### 6. Merge → Compound → done
Squash-merge, then run **`/ce-compound`** to capture any reusable learning into
`docs/solutions/` (it also keeps the Lessons Index and `AGENT.md`
discoverability honest). Not every PR yields a fresh lesson — but the step is
never skipped silently; the outcome is one of *fresh lesson*, *honest extension
of an existing doc*, or an explicit *"covered by `<doc>`"*.

---

## The ship-confirmation routine (agent-suggested, binding)

Nothing is reported as **shipped** without stating BOTH flags — this is the
clean "yes" that unblocks the next piece of work:

- **Reviewed ✅** — CI gates green **and** the diff cleared review (which verdict).
- **Compounded ✅** — which `docs/solutions/` doc (or PR) captured the learning:
  a fresh lesson, an honest extension, or an explicit "covered by `<doc>`" — and
  `/ce-compound` was actually *considered*, not skipped.

If either is missing it is **not** a clean yes — close the gap (run the missing
review, or compound the learning) before reporting done. This applies to
autonomous runs too. The mechanical gates can't judge "did you learn anything",
so this flag is the human/agent routine that backstops them.

---

## Skill quick-reference

| Skill | Role | Home |
|---|---|---|
| `/ce-brainstorm` | explore the WHAT | `docs/brainstorms/` |
| `/ce-plan` | plan the HOW (+ ADR) | `docs/plans/` |
| `/slice` | build — per-source pipeline | `docs/slices/`, `docs/STATUS.md` |
| `/ce-work` | build — everything else | — |
| `/golden` | author eval cases for a source | `eval/qa-golden.yaml` |
| `/walkthrough` | explain a flow (read-only) | — |
| `/ce-compound` | capture the learning | `docs/solutions/` |

**Skills live in this repo (`.claude/skills/*`) — edit them here.** The CE skills
(`ce-*`) are a vendored, locally-tailored copy of EveryInc's
`compound-engineering-plugin`; we do not install the plugin. See
[`compound-engineering.local.md`](../../compound-engineering.local.md) for what
was pulled in, what's intentionally absent, and how absent hand-offs degrade.

## Definition of done
Builds clean (`depcruise · lint · typecheck · test`) · `check:solutions` green ·
eval reported when corpus/retrieval changed · committed on a branch · PR open
with a Conventional-Commits title · review APPROVE · squash-merged ·
`/ce-compound` run · **ship report states both flags (Reviewed ✅ + Compounded ✅).**
