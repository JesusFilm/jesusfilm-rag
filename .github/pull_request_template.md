<!--
PR title MUST be Conventional Commits (feat: …, fix(retrieve): …, docs: …) — it
becomes the squash-merge commit subject and is linted by .github/workflows/pr-title.yml.
-->

## What & why

<!-- One or two sentences. Link the plan (docs/plans/…) or issue if there is one. -->

## How it was verified

- [ ] `pnpm depcruise && pnpm lint && pnpm typecheck && pnpm test` green
- [ ] `pnpm check:solutions` green (if a learning doc was added/changed)
- [ ] `pnpm eval` reported — required when acquisition / ingestion / retrieval or the corpus changed
- [ ] Touched an architecture boundary? Confirmed the import law still holds (and added/updated an ADR if a hard-to-reverse direction changed)

## Ship-confirmation (the compound-engineering gate)

State **both** flags — a clean yes on both is what unblocks merge
(see [docs/workflow/ways-of-working.md](../docs/workflow/ways-of-working.md)):

- **Reviewed ✅** — CI gates green **and** the diff cleared review (name the verdict).
- **Compounded ✅** — which `docs/solutions/` doc (or this PR) captured the learning:
  a fresh lesson, an honest extension of an existing doc, or an explicit
  "covered by `<doc>`". `/ce-compound` was considered, not skipped.
