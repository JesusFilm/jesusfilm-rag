---
name: status-dashboard
description: "Refresh the public JesusFilm RAG status dashboard (sources × languages, acquire/ingest/evaluate, embedded doc counts) from the production database and open a PR. Reads prod via doppler-injected credentials that never leave the machine, regenerates dashboard/compiled-data.json + dashboard/index.html, asserts the page shows the data in a real browser, opens a PR, and stops without merging. Invoke /status-dashboard."
allowed-tools: "Bash(doppler run*) Bash(doppler setup*) Bash(doppler configure get*) Bash(pnpm *) Bash(git *) Bash(gh *) Bash(python3 -m http.server*) Bash(kill *) Bash(curl *) Bash(date *) Bash(mkdir *) Read(*) Write(*) Edit(*) Grep(*) Glob(*) mcp__playwright__browser_navigate mcp__playwright__browser_snapshot mcp__playwright__browser_evaluate mcp__playwright__browser_take_screenshot mcp__playwright__browser_close"
disable-model-invocation: true
---

<!-- version: 2 -->

# status-dashboard — refresh the public RAG status page, open a PR

Regenerates the public dashboard that is the **source of truth** for what the
JesusFilm RAG vector database contains: every source, the languages it has
content for, where each sits on the journey (**acquire → ingest → evaluate**),
and the embedded document counts. Built for Miheret and other stakeholders.

The main grid is one row per **source × language**. Below it, a secondary
**"Unclassified documents"** table lists any embedded docs whose language could
not be detected (`documents.language = NULL`), tallied per source (count only, no
lifecycle flags) so the index total is never silently under-reported — see
"The secondary Unclassified-documents table" below and `docs/ops/dashboard.md` (#86).

The page is a single static HTML file deployed to GitHub Pages. This skill
refreshes its data from production, proves the page renders that data, and opens
a PR — **an engineer reviews and merges; this skill never merges.**

---

## 🔒 Secret-safety contract — READ FIRST, NON-NEGOTIABLE

Production credentials are fetched **locally via doppler** and must **never reach
the model/server or any durable artifact.** The whole pipeline is designed so a
leak is *structurally* hard. You MUST keep it that way:

- **Inject, never read.** Get prod credentials into the script with
  `doppler run -- <command>` ONLY. That hands the secret from your shell to the
  subprocess's environment — it never passes through your (the model's) context.
- **NEVER run a command that prints a secret value to stdout** — it would land in
  the transcript. Forbidden here: `doppler secrets`, `doppler secrets get`,
  `doppler secrets download`, `printenv`, `env`, `echo $JFRAG_POSTGRESQL_DB_URL`,
  `echo $DATABASE_URL`, `set`, `cat .env`, or piping any of these anywhere. The
  data script only ever prints a **redacted** DB URL (`postgres://user:***@host:port/db`)
  — keep it that way.
- **NEVER write a credential** to a file, commit, branch, the GitHub issue, the PR
  body, a comment, or a log. `dashboard/prod-status-data.json` is data-only (it is
  also git-ignored) and contains **no** credentials — confirm that before commit.
- **If doppler is not configured, STOP and ask the operator** to set it up. Do
  **not** work around it by accepting a pasted connection string in the chat —
  that defeats the entire control.

The dashboard's prod credential is the namespaced secret **`JFRAG_POSTGRESQL_DB_URL`**,
deliberately distinct from `DATABASE_URL` so the prod URL can never bleed into the
source tooling (acquire/index/eval read `DATABASE_URL` for the local dev DB). It
lives in the dedicated **`forge-rag`** Doppler project, env `prd` (pinned by the
repo's `doppler.yaml`; migrated from the interim `resources` home 2026-07-06) —
see `docs/ops/dashboard-secret-access.md`.

If you cannot satisfy the above, do not proceed — surface the blocker instead.

---

## Prerequisites (operator, once)

- **doppler** installed and authenticated (`doppler login`), with access to the
  project holding the prod secret.
- **Activate the doppler scope — required, one-time per checkout.** The repo ships
  a `doppler.yaml` pinning `forge-rag` / `prd`, but doppler does **NOT**
  auto-apply `doppler.yaml` to `doppler run` — you must run it once
  **from this directory** (the worktree where `doppler.yaml` lives):
  ```bash
  doppler setup --no-interactive   # reads doppler.yaml → pins forge-rag/prd for this dir
  ```
  (Alternative, no setup: pass `--project forge-rag --config prd` on every
  `doppler run`.) Confirm the scope took: `doppler configure get project config`
  should show `forge-rag` / `prd` — **names only, never a secret value**.
- **Verify the secret is injected — without revealing it:**
  `doppler run -- node -e "process.exit(process.env.JFRAG_POSTGRESQL_DB_URL?0:1)"`
  (exit 0 = present). Never print the value to check it.
- **gh** authenticated as `jaco-brink` (JesusFilm org) for the issue + PR.
- Production is **read-only** here — the dashboard query runs `SELECT`s only.

---

## What the skill produces (outcomes)

1. A GitHub issue tracking this dashboard refresh.
2. A branch with regenerated `dashboard/compiled-data.json` + `dashboard/index.html`.
3. A browser-verified page (data actually visible, not just present in source).
4. An open PR linked to the issue — **left for the engineer to merge.**

The data pipeline (already built; you orchestrate it, you don't reinvent it):

```
prod DB --(doppler run -- pnpm dashboard:data)--> dashboard/prod-status-data.json
prod-status-data.json + docs/source-status.yaml + registry
        --(pnpm dashboard:build)--> dashboard/compiled-data.json + dashboard/index.html
```

`evaluate` is true for a row only when prod has **acquired AND ingested** it AND
`docs/source-status.yaml` marks that source/language `stages.evaluate: green` —
the engineer's shipped-via-PR signal that source-quality evaluation happened. The
prod eval script is a non-gating sanity check and is deliberately not consulted.

### The secondary "Unclassified documents" table (#86)

The build emits a second table under the main grid for embedded docs whose
language could not be detected (`documents.language = NULL`), tallied per source
by `shapeProdStatus` into `prod-status-data.json`'s `unclassified` list. You do
**not** author or maintain it — the pipeline produces it; just know it exists so
the browser-verify step checks it (above) and you can explain it:

- It has **only** a source column and a count — no acquire/ingest/evaluate flags,
  no stage. A null-language row is a count, not a (source × language) cell.
- Its total is **included in the headline "embedded documents" stat**, so the
  figure is the true index size. A non-zero table means a language-detection gap
  worth a look (usually drained by the ADR-0009 language sweep).
- When there are none (the healthy state), the section is a one-line reassurance,
  not an empty table — so a clean refresh looks intentionally clean, not broken.

---

## Steps

1. **Branch off `origin/main` and open the tracking issue.** Cut the branch first
   (so the refresh never piles onto unrelated work):
   ```bash
   git fetch origin
   git switch -c chore/dashboard-refresh-$(date +%Y-%m-%d) origin/main
   gh issue create --title "Refresh RAG status dashboard ($(date +%Y-%m-%d))" \
     --body "Refresh dashboard data from prod, regenerate the page, open a PR."
   ```
   Keep the issue body free of any credential or connection detail.

2. **Refresh prod data — the one credentialed step.** Assumes the one-time
   `doppler setup` from Prerequisites has pinned the scope (else `doppler run`
   errors with no project/config, or use the explicit `--project/--config` form).
   Run exactly:
   ```bash
   doppler run -- pnpm dashboard:data
   ```
   This writes `dashboard/prod-status-data.json`. It must print
   `(via JFRAG_POSTGRESQL_DB_URL)` and a **prod** host. The script **fails closed**:
   if `doppler run` didn't inject the namespaced secret, it **errors and writes
   nothing** (rather than producing a dev snapshot) — so publishing dev-as-prod is
   structurally impossible, not just discouraged. If it errors with "Refusing to
   write a production snapshot…", fix doppler (wrong scope or missing key) and
   re-run; do **not** reach for `--allow-dev` (that flag is for a deliberate local
   dev preview only, never a publish). If doppler itself errors, STOP (see the
   contract) — don't paste a connection string or any error text containing a URL.

3. **Compile the page (no secrets, no DB).**
   ```bash
   pnpm dashboard:build
   ```
   Writes `dashboard/compiled-data.json` and `dashboard/index.html`.

4. **Browser-verify the rendered page.** Serve it in the **background** (so the
   skill doesn't block), load it in Playwright, assert, then stop the server:
   ```bash
   python3 -m http.server 8137 --directory dashboard & SERVER_PID=$!   # capture the PID
   ```
   Navigate to `http://localhost:8137/index.html` with the Playwright browser
   tools and assert via `browser_evaluate`: the `<h1>` reads "JesusFilm RAG";
   the **main** grid row count —
   `document.querySelectorAll('table:not(.unclassified-table) tbody tr').length` —
   equals `compiled-data.json`'s `sources.length` (scope the selector to the main
   table so the secondary "Unclassified documents" table's rows are not counted);
   the **unclassified** row count —
   `document.querySelectorAll('.unclassified-table tbody tr').length` — equals the
   JSON's `unclassified.length` (which is `0` when the page shows the "nothing
   unclassified" reassurance line, and the `.unclassified-table` is absent); and a
   spot-check of a couple of source names + a doc count from the JSON appear in
   `document.body.innerText`. Then `browser_close` and stop the server with
   `kill "$SERVER_PID"`. Also run the headless gate as belt-and-suspenders:
   ```bash
   pnpm dashboard:verify   # must print "contains all N compiled row(s)"
   ```

5. **Confirm no secret leaked before committing.** `git diff` (the build just wrote
   the files **unstaged**, so use unstaged `git diff`, not `--staged`) and the
   issue/PR text must contain **no** connection string or password. The only data
   files changed are `dashboard/compiled-data.json` and `dashboard/index.html`
   (`prod-status-data.json` is git-ignored).

6. **Commit and open the PR — do not merge.** (Already on the branch from step 1.)
   ```bash
   git add dashboard/compiled-data.json dashboard/index.html
   git commit -m "chore(dashboard): refresh status data ($(date +%Y-%m-%d))"
   git push -u origin HEAD
   gh pr create \
     --title "chore(dashboard): refresh status data ($(date +%Y-%m-%d))" \
     --body "Closes #<issue>. Dashboard data refreshed from prod; page browser-verified. Merging deploys to GitHub Pages."
   ```
   **Stop here.** Report the PR link. The engineer reviews and merges; the Pages
   workflow deploys on merge.

---

## Done means

- Issue opened; PR opened and **not merged**.
- `dashboard/index.html` + `dashboard/compiled-data.json` regenerated and in sync
  (`pnpm dashboard:verify` green).
- Browser confirmed the page shows the data.
- No credential anywhere in the diff, issue, PR, logs, or transcript.

See `docs/ops/dashboard.md` for the architecture and the design-system rationale,
and `AGENTS.md` for where this fits among the project's agent workflows.
