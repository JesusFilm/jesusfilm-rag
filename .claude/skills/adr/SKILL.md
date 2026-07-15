---
name: adr
description: "Draft (or complete) an Architecture Decision Record for a decision made in the current change, following this repo's docs/decisions/ template. Surveys the working diff, picks the next NNNN, writes Context/Decision/Alternatives-rejected/Consequences, marks Status + Related (detecting any superseded ADR), updates the Locked-decisions index in architecture.md, cites the ADR at the code seam it governs, and commits with a commitlint-safe message. Invoke /adr after accepting an ADR checkpoint (AGENT.md), or /adr <one-line decision> to start one directly."
allowed-tools: "Bash(git *) Bash(grep *) Bash(rg *) Bash(ls *) Bash(cat *) Bash(date *) Read(*) Write(*) Edit(*) Grep(*) Glob(*)"
disable-model-invocation: true
---

# adr — record an architecture decision, consistently

Turns an accepted **ADR checkpoint** into a committed record. The point is not the
file — it's the **Alternatives rejected** section, which protects the decision from
being re-litigated by someone who never saw the trade-offs (see
`docs/decisions/README.md`). Keep the record to about one screen; deep mechanism
stays in `architecture.md`.

## When to use

- Right after the engineer accepts an **ADR checkpoint** (the protocol in
  `AGENT.md`), or
- `/adr <one-line decision>` to record a decision directly, or
- `/adr` to complete/repair an ADR you started.

Do not invoke for routine work — the checkpoint bar in
`docs/decisions/README.md` → *When to raise an ADR checkpoint* gates that.

## Steps

1. **Gather the decision.** Read the working diff (`git diff` + `git diff --cached`,
   and `git diff origin/main...` for the branch) and the conversation context. State
   the decision in one plain sentence before writing anything — confirm it matches
   the checkpoint the engineer accepted.
2. **Number it.** `ls docs/decisions/` → next zero-padded `NNNN` after the highest
   existing (independent of the architecture-table row numbers).
3. **Find prior art.** `grep -rl "ADR-" docs src` for any ADR/convention this
   decision **amends or supersedes**. If it supersedes one, you will also mark that
   older ADR `Status: Superseded by ADR-NNNN` and link forward (never delete it).
4. **Draft** `docs/decisions/NNNN-<short-slug>.md` from the template in
   `docs/decisions/README.md`:
   - `Status` (usually `Accepted`), `Date` (`date +%F`), `Issue/PR`, `Related`.
   - **Context** — 2–4 sentences: the situation + the forcing question.
   - **Decision** — what we do, stated plainly.
   - **Alternatives rejected** — the load-bearing section; one or two lines each on
     the real options you did *not* take and why. If you cannot name a rejected
     alternative, it probably is not ADR-worthy — stop and reconsider.
   - **Consequences** — what it makes easy (+) and what you give up / must live with (−).
5. **Index it.** Add the ADR to the **Locked decisions** table in
   `docs/architecture.md` (the ADR column of the relevant row, or a new row), and to
   any invariant paragraph the decision touches. The README calls this table the
   index — an un-indexed ADR is easy to miss.
6. **Cite it at the seam.** Add a short `// … (ADR-NNNN)` reference at the code that
   embodies the decision, so the next reader of that line finds the rationale and
   doesn't "simplify" it away.
7. **Commit** (only the ADR + index + citation; keep it separate from unrelated
   code unless the decision *is* this PR's change):
   ```
   docs(adr): add ADR-NNNN <slug> (#issue)
   ```
   ⚠️ **commitlint gotcha:** the subject must NOT start with an uppercase token — a
   header like `ADR-0008 …` fails the `subject-case` rule. Start with a lowercase
   verb (`add ADR-0008 …`, `record …`). The `commit-msg` husky hook enforces this;
   the PR title is linted separately (`.github/workflows/pr-title.yml`), so give the
   PR the same lowercase-subject shape.

## Output

Confirm back to the engineer: the ADR path, its one-line decision, what it
amends/supersedes, and the index + citation edits — so they can review the record,
not reverse-engineer it.
