---
name: status-dashboard
description: "Refresh the public JesusFilm RAG status dashboard (sources × languages, acquire/ingest/evaluate, embedded doc counts) from the production database and open a PR. Reads prod via doppler-injected credentials that never leave the machine, regenerates dashboard/compiled-data.json + dashboard/index.html, asserts the page shows the data in a real browser, opens a PR, and stops without merging. Invoke /status-dashboard."
allowed-tools: "Bash(doppler run*) Bash(doppler setup*) Bash(pnpm *) Bash(git *) Bash(gh *) Bash(python3 -m http.server*) Bash(kill *) Bash(curl *) Bash(date *) Bash(mkdir *) Read(*) Write(*) Edit(*) Grep(*) Glob(*) mcp__playwright__browser_navigate mcp__playwright__browser_snapshot mcp__playwright__browser_evaluate mcp__playwright__browser_take_screenshot mcp__playwright__browser_close"
disable-model-invocation: true
---

<!-- version: 1 -->

# status-dashboard — refresh the public RAG status page, open a PR

Regenerates the public dashboard that is the **source of truth** for what the
JesusFilm RAG vector database contains: every source, the languages it has
content for, where each sits on the journey (**acquire → ingest → evaluate**),
and the embedded document counts. Built for Miheret and other stakeholders.

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
  `doppler secrets download`, `printenv`, `env`, `echo $DATABASE_URL`, `set`,
  `cat .env`, or piping any of these anywhere. The data script only ever prints a
  **redacted** DB URL (`postgres://user:***@host:port/db`) — keep it that way.
- **NEVER write a credential** to a file, commit, branch, the GitHub issue, the PR
  body, a comment, or a log. `dashboard/prod-status-data.json` is data-only (it is
  also git-ignored) and contains **no** credentials — confirm that before commit.
- **If doppler is not configured, STOP and ask the operator** to run `doppler
  setup` for the prod config. Do **not** work around it by accepting a pasted
  connection string in the chat — that defeats the entire control.

If you cannot satisfy the above, do not proceed — surface the blocker instead.

---

## Prerequisites (operator, once)

- **doppler** installed and authenticated, with a config holding the prod
  `DATABASE_URL`. Select it once per checkout: `doppler setup` (pick the
  jesusfilm-rag project + the production config). Verify wiring **without
  revealing a value**: `doppler run -- node -e "process.exit(process.env.DATABASE_URL?0:1)"`
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

2. **Refresh prod data — the one credentialed step.** Run exactly:
   ```bash
   doppler run -- pnpm dashboard:data
   ```
   This writes `dashboard/prod-status-data.json`. Confirm the printed DB URL is
   **redacted**. If doppler errors, STOP (see the contract above) — do not paste a
   connection string, and do not paste any error text that contains a URL.

3. **Compile the page (no secrets, no DB).**
   ```bash
   pnpm dashboard:build
   ```
   Writes `dashboard/compiled-data.json` and `dashboard/index.html`.

4. **Browser-verify the rendered page.** Serve it in the **background** (so the
   skill doesn't block), load it in Playwright, assert, then stop the server:
   ```bash
   python3 -m http.server 8137 --directory dashboard &   # background; note the PID
   ```
   Navigate to `http://localhost:8137/index.html` with the Playwright browser
   tools and assert via `browser_evaluate`: the `<h1>` reads "JesusFilm RAG";
   `document.querySelectorAll('tbody tr').length` equals `compiled-data.json`'s
   `sources.length`; and a spot-check of a couple of source names + a doc count
   from the JSON appear in `document.body.innerText`. Then `browser_close` and
   `kill <pid>` the server. Also run the headless gate as belt-and-suspenders:
   ```bash
   pnpm dashboard:verify   # must print "contains all N compiled row(s)"
   ```

5. **Confirm no secret leaked before committing.** `git diff --staged` (and the
   issue/PR text) must contain **no** connection string or password. The only data
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
