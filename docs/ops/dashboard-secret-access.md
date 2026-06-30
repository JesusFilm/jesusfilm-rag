# Decision: short-term prod credential access for the status dashboard

**Status:** decided · **Date:** 2026-06-29 · **Blocks PR #52?** No (runtime/ops + additive docs; nothing gates the merge).

## Decision taken (interim)

Use Doppler (the structurally-enforced path) but in a **temporary home**, since a
dedicated `jesusfilm-rag` project can't be created yet:

- The prod DB URL lives in the low-usage **`resources` project, env `prd`**, under
  the **namespaced** key **`JFRAG_POSTGRESQL_DB_URL`** — distinct from `DATABASE_URL`
  on purpose. The dashboard reads the namespaced key; all source tooling reads
  `DATABASE_URL` (local dev). So the prod URL **does not bleed into a source run**
  via name collision: the safety comes from the *distinct variable name*, not just
  discipline. ⚠️ This holds **only if the shared `resources`/`prd` config does not
  also define a `DATABASE_URL` secret** — it must not, or `doppler run -- pnpm acquire`
  would inject and use it. Keep the dashboard's prod URL under the namespaced key
  only (see #53). Precedence is unit-tested in `tests/dashboard-hardening.test.ts`
  (`resolveDatabaseUrl`), which also reports the resolved *source* so a dev/fallback
  read is flagged loudly rather than silently published as prod.
- `doppler.yaml` (committed; **names only, no secret**) declares `project: resources` /
  `config: prd`. Doppler does NOT auto-apply it to `doppler run`, so activate it
  once per checkout with `doppler setup --no-interactive` (or pass
  `--project resources --config prd` on each run); then `doppler run -- pnpm
  dashboard:data` uses it. See the skill Prerequisites.
- **Tech debt:** migrate the secret to a real `jesusfilm-rag` Doppler project and
  drop the namespacing workaround once project-creation access exists (tracked: #53).

The option analysis below is retained as the rationale. The chosen path is closest
to "doppler-preferred" — it keeps doppler's per-subprocess isolation while the
namespaced key adds the decoupling that the shared-`.env` Option 1 lacked.

## Problem

The `status-dashboard` skill's one credentialed step is `doppler run -- pnpm dashboard:data`, which injects the production `DATABASE_URL` into the data script's environment. We cannot use it yet: **the engineer can't create a `jesusfilm-rag` doppler project** (no permission), and the available `core` / `forge` projects are the wrong owners for this secret (cross-project ACL/audit boundary). We want to run the skill against **real prod data today** — to test the live pull + HTML generation — without waiting on doppler provisioning.

## The invariant that actually matters

doppler was never the requirement; it's one *provider*. The real requirement is:

> **The prod `DATABASE_URL` value must never pass through the AI agent/model context (the transcript), and must never land in a committed file, the issue, the PR, or a log.**

The data script (`scripts/dashboard-data.ts`) reads `DATABASE_URL` straight from `process.env` (with a direct `.env` read it never echoes) and prints only a **redacted** host. So *any* local mechanism that puts the value into the subprocess env without routing it through the agent satisfies the invariant identically to doppler. That reframing is what unlocks Option 3.

A second, **independent** finding from the review: the committed sample page's footer asserts *"Generated from the production database … counts reflect the live index"* while showing **dev** data. That over-claim is a separate must-fix (see "Cross-cutting", below) regardless of which option we pick.

---

> # ⚠️ EVERYTHING BELOW IS HISTORICAL — SUPERSEDED, DO NOT FOLLOW
> The options and recommendation below were the decision-time analysis. They are
> **NOT the shipped approach** and several **contradict the current runtime
> contract**: `dashboard:data` now **fails closed** and reads **only**
> `JFRAG_POSTGRESQL_DB_URL` via `doppler run` (see `scripts/lib/dashboard/credentials.ts`,
> `scripts/dashboard-data.ts`, `.claude/skills/status-dashboard/SKILL.md`). In
> particular, the local-`.env` (Option 1) and out-of-band / `op run` / pasted-string
> (Option 3) paths are **retired and forbidden**. For what to actually do, follow
> **"Decision taken (interim)"** at the top of this doc and the SKILL — not the text below.

## Option 1 — Put prod creds in a local `.env`, let the script read it

Paste the prod `DATABASE_URL` into a git-ignored env file; the agent runs `pnpm dashboard:data` (no doppler); the script reads the file itself.

**Pros**
- Fastest possible; **zero code change** — the `.env` read path already exists.
- Model-leak invariant preserved: the script reads the file, the agent never sees the value (and never `cat`s it — the skill already forbids that).
- Repeatable: paste once, every refresh is just `pnpm dashboard:data`.

**Cons / risks**
- 🔴 **Ambient write-to-prod hazard (the dealbreaker):** `.env` is the project's *shared* DB pointer, consumed broadly via `@/env` (acquire / index / eval). Putting the **prod** URL there silently repoints *every* script at prod — a careless run could **write to production**. doppler scoped the secret to one subprocess; `.env` makes it ambient and persistent.
- 🔴 **`.env.production` is NOT git-ignored** (only `.env`, `.env.local`, `.env.*.local` are) — the exact filename the option names is a commit trap.
- Secret at rest in plaintext on disk (vs doppler's vault); relies on `chmod 600` + no cloud-sync of the repo dir.
- Safe only if hardened: use a **dedicated** file (e.g. `.env.dashboard`) read *only* by this script (small code change), never the shared `.env`; revert immediately after the refresh.

**Speed:** immediate. **Safety vs doppler:** materially weaker (at-rest plaintext + ambient prod-pointer hazard).

## Option 2 — Ship the current dev-data page, log prod refresh as tech debt

Merge PR #52's already-committed page (built from the **local dev DB**) and wait for doppler access before pulling real data.

**Pros**
- **Best-in-class secret-safety:** zero credential handling now — defers the credentialed step entirely.
- Fastest to "merged"; the artifact is done and tests are green.

**Cons / risks**
- 🔴 **A confidently-wrong "source of truth."** 100% of the counts are dev-derived but the footer claims prod provenance ("live index"). The page doesn't merely go stale — it makes a *false* claim.
- 🔴 **Silent, un-self-healing drift:** if another engineer ingests a source to prod (e.g. completes the embedder swap for `thelife-fr`), the public page still shows it as *Acquired / 0 docs* — and the only mechanism that would correct it is the very `doppler run` refresh that's blocked. Miheret could read it and make a wrong downstream call.
- A known-wrong, authoritative-looking, stakeholder-facing page is **worse than no page** (absence prompts a question; confident wrongness prompts a wrong decision).
- Merging auto-publishes via `pages.yml` if Pages is enabled — merge ≠ passive.

**Only acceptable *guardrailed*:** correct the footer to say "dev sample, not production", add a visible DEV-SNAPSHOT banner, **leave GitHub Pages disabled** until real data, don't socialize the URL, and track the debt with an owner + expiry.

**Speed:** fastest. **Safety:** excellent on secrets, **poor on data-integrity** (the two point in opposite directions — that opposition is the whole decision).

## Option 3 — Provider-agnostic injection; engineer supplies the secret out-of-band (recommended)

Generalize the skill's contract from "doppler injects it" to **"some *local* mechanism injects `DATABASE_URL` into the subprocess env without the value ever transiting the agent."** Short-term, the engineer runs the single credentialed command **in their own terminal** (out-of-band), then hands control back to the agent at the build step:

```bash
# In the engineer's OWN terminal (not via the agent), leading space to skip history:
 DATABASE_URL="postgres://…prod…" pnpm dashboard:data
# → writes dashboard/prod-status-data.json (git-ignored). Then the agent runs:
pnpm dashboard:build && pnpm dashboard:verify   # no secret involved
```

Graduate to **1Password** if a vault item holds the URL: set `DATABASE_URL` to an `op://…` *reference* (no plaintext — safe to keep in a committed `.env` template or the shell) and run `op run -- pnpm dashboard:data`, which resolves the reference at launch. That's a true doppler analog the agent *can* run end-to-end (the command carries only the `op://` reference, never the secret). Note: a bare `op run` injects nothing without that `op://` reference present. This is the **same pattern the repo already uses** for its `:production` scripts (`scripts/seed-prod.sh` + `scripts/lib/prompt-prod-creds.ts`, via `read -rs` — never in history, never on disk; see `docs/ops/prod-ingest.md`), so it's the project's existing, blessed credential philosophy — not new machinery.

**Pros**
- **Real prod data today** with **doppler-equivalent isolation**: the secret is scoped to one subprocess invocation, nothing at rest, never through the agent — and (unlike Option 1) it does **not** repoint the shared dev pointer, so no ambient write-to-prod hazard.
- **Zero code change** (the script is already env-driven); reuses the repo's established prod-cred pattern.
- Additive: doppler-`jesusfilm-rag` stays the eventual preferred provider; this is a docs/skill wording change only.

**Cons / risks**
- Manual step each refresh (infrequent, engineer-watched — matches `prod-ingest.md`'s stance).
- Discipline-dependent rather than structurally enforced: must use a leading space / `read` (never raw `export`, which hits shell history), and must eyeball the **redacted host** the script prints to confirm it hit prod, not the dev fallback.
- ❌ **Do NOT** use the inline `!`-prefix form (`! DATABASE_URL=… pnpm …`) — the bang-command *string* is recorded into the transcript, routing the secret through the agent. **Forbidden.** Using `core`/`forge` doppler as a personal vault is a governance smell — also avoid.

**Speed:** high (ready today, zero code). **Safety vs doppler:** equal for the out-of-band terminal and `op run` variants (weaker only in that it leans on engineer discipline, not structural enforcement).

---

## Recommendation — Option 3 *(SUPERSEDED — historical analysis only)*

> ⚠️ **SUPERSEDED by the "Decision taken (interim)" at the top of this doc.** The
> analysis below (Options 1–3 and this recommendation) is retained as the
> reasoning trail. It is **NOT** the shipped approach: the "Do this" steps below
> describe out-of-band / `op run` / "any local injection" — which the shipped
> `.claude/skills/status-dashboard/SKILL.md` contract deliberately **forbids**
> (doppler-only; never a pasted connection string). For what to actually run, follow
> the **Decision taken** section above and the SKILL, not the steps below.

On **speed and safety together**, Option 3 wins: it's the only option that delivers a **correct** prod render quickly *and* keeps doppler-grade secret isolation. Option 1 is fast but reintroduces an ambient write-to-prod hazard and an at-rest plaintext secret; Option 2 is the safest on secrets but publishes a confidently-wrong source of truth that can't self-heal while the refresh path is blocked. Option 3 dominates Option 1 on safety and dominates Option 2 on data-integrity.

**Do this:**

1. **Now (no code):** engineer runs the credentialed command out-of-band (terminal or `op run`); the agent builds + verifies and opens the **first real-prod** refresh PR. This is the live-pull + HTML-generation test the engineer wanted. Note the workflow seam: in this interim mode the skill run is **interrupted** at the data step (engineer-driven), not fully agent-driven — that's expected until doppler/`op` is wired, after which the whole run is agent-driven again.
2. **PR #52:** merge it (it's the machinery). Keep **GitHub Pages disabled** until the real-data render lands, so the dev sample is never published; don't share the URL yet. (The footer's "production database" claim becomes *true* once the page is a real prod render — so the fix is to publish prod data, not to reword the footer.)
3. **Small follow-up PR (non-blocking):** generalize `SKILL.md` + `docs/ops/dashboard.md` from "doppler only" to "doppler preferred; any local injection that never routes the value through the agent — out-of-band terminal or `op run`; **never** the `!`-inline form or a raw `export`." Add `Bash(op run*)` to `allowed-tools` if `op` is adopted.
4. **Durable fix (tracked tech debt):** obtain `jesusfilm-rag` doppler project-creation access; once it exists, revert to `doppler run --` as the structurally-enforced default.

**Fallback:** if real prod access can't be arranged this week at all, take **Option 2 *guardrailed*** (honest banner, Pages off, debt issue) as a holding pattern — never Option 2 "as-is", and never Option 1 against the shared `.env`.

## Cross-cutting (do regardless of option)

- **Honest provenance.** Don't publish a page whose footer claims prod data while it shows a dev sample. Either render real prod data first (Option 3), or gate publication (Option 2 guardrailed). Consider having the compile step stamp the actual data source so the page can't over-claim.
- **Publication ≠ merge.** Keep GitHub Pages off until a real-prod render is the committed page.
