# Contributor process — WIP, paused

**Status:** active design **paused** as of 2026-05-29. This document banks the
harvest from one live-it iteration of the contributor flow. Resume conditions
and what to do next are at the bottom.

**Tracker:** [#30](https://github.com/JesusFilm/jesusfilm-rag/issues/30) (this
file is its in-repo home).
**Companion:** [#29](https://github.com/JesusFilm/jesusfilm-rag/issues/29)
(populate prod corpus — develops in lockstep, in the cadence noted below).
**Source-onboarding model (design substrate):** memory id
`42a9911a-2412-47c2-a700-e1cb9e5c57a2` — intake-issue → engineer PR →
auto-prod re-index; the contributor never writes code, never touches prod.

## Why this document exists, in this shape

#30 is the *mechanism* by which a non-coder domain expert can contribute a RAG
source end-to-end. The decision (memory `622392e9`, `b6d726c2`) was to develop
it **alongside source additions** — each new source surfaces concrete skill /
mechanical-check requirements that pure on-paper design would miss.

The 2026-05-29 session lived that on one candidate source. It produced enough
signal to bank a structured first pass of the design — but not enough to scaffold
the `/slice-intake` skill against a single source's friction without falling back
into the design-on-paper trap, flipped. So the harvest lands here, and active
design is **batched** until more pattern evidence (or a real external contributor)
arrives.

Design intent unchanged. Cadence shifted from *live-every-micro-turn* to
*passively collect signals during normal `/slice` runs, batch the design work*.

## Two substrates the contributor model rests on

1. **Skills** — curated slash commands that drive the contributor through bounded
   workflows (intake → local acquire+index → eval → PR). The contributor follows
   the skill, not code-level intuition.
2. **Mechanical checks** — lint, typecheck, depcruise (three-context architecture
   enforcement), tests, and any custom guards that catch boundary crossover
   (e.g. a contributor PR touching files outside `src/registry/<key>.ts` should
   fail a check, not slide through).

Both are required; either alone leaks.

## Skill-shape corrections (banked 2026-05-29)

These are the structural lessons from running the flow live. They are
prerequisites for any future `/slice-intake` skill spec — not just "nice to
have."

### #1 — Candidate-listing is not part of the contributor skill

The contributor *brings* the source. They paste a URL. They don't pick from a
menu of candidates the engineer surfaced — that step (curation / triage / which
sources should we want) happens **upstream** of the intake skill and is not the
contributor's problem.

The intake skill begins at: *"paste the URL of the source you want to propose."*
A single input.

### #2 — The skill is agent-led, not interrogation-led

**Wrong shape:** contributor answers 10–12 sequential structured questions →
emits artifact.

**Right shape:**

```
contributor → pastes ONE input: the URL
   ▼
skill-agent does its own recon:
  - fetch homepage + sample pages
  - look for sitemap.xml / sitemap_index.xml / robots.txt
  - inspect <title>, <h1>, og:site_name, footer copyright
  - detect rendered-HTML vs. JS-blank
  - detect login/paywall/Cloudflare-challenge (passive instrumentation
    vs. actual content gate — distinguish; see skill-gap #8)
  - DOM-inspect representative pages for non-article elements
  - skim About / footer for org + denominational context
  - cluster sample article lengths + structure → infer content shape
   ▼
skill-agent emits a DRAFT intake with everything it could infer + UNKNOWNS flagged
   ▼
skill-agent → contributor: short follow-up
  - confirm/correct any wrong inferences (yes/no, not open-ended)
  - fill the *irreducibly contributor* things — chiefly: eval queries (the bar)
  - resolve any scope choices the agent surfaced (e.g. "include devotionals?" yes/no)
   ▼
final intake artifact committed
```

The contributor's role collapses to: **bring URL → confirm a small set of
inferences → name the questions this source should answer well.** Everything
mechanical is the agent's job.

### #3 — Eval queries are seeded, never cold

"Give me 8–12 questions this source should answer well" is a wall, even for a
coder. The intake step that captures the eval-queries quality spec is not "ask
for 12 questions cold" but a three-substep, none of which asks the contributor
to invent from nothing. This pattern is lifted directly from `/golden`'s
"curate, not write" principle (see `.claude/skills/golden/SKILL.md`).

```
agent reads eval/qa-golden.yaml         ←─ existing eval cases (N≈42 today)
   + agent's recon outputs (h2s, article slugs, devotional titles, etc.)
   ▼
Substep A — REPLAY existing cases against source's topic surface
   Agent topic-matches each existing case to the source.
   Contributor sees: "These existing questions look like THIS source
                      should also answer them — confirm yes / no / maybe."
   Output: list of case_ids whose `relevant` map should be extended with
           this source's paths (engineer fills paths via /golden post-ingest).
   ▼
Substep B — PROPOSE new candidates from the source's OWN content
   Agent generates persona-diverse candidate questions from:
     - homepage h2s read as questions
     - article slugs read as questions
     - devotional titles read as questions
   Contributor sees: "Here are candidate NEW questions specific to what
                      only this source seems to answer — approve / edit / reject."
   Output: approved new questions, no paths yet (engineer grounds via
           /golden post-ingest).
   ▼
Substep C — TAIL "what's missing?"
   ONLY after substeps A+B (contributor has seen 15-30 concrete examples
   and is warm to the pattern), the agent asks:
   "Anything readers would ask that we haven't captured?"
   Output: contributor free-form additions.
```

`/golden` itself stays unchanged (operator-side, post-ingest, has DB access).
The intake skill borrows its *pattern* with a different data source — existing
yaml + agent recon outputs instead of `documents`/`chunks`.

Side effect: this accidentally enforces `qa-golden.yaml`'s mandated
**living relevant set** (its header explicitly says: *"when a new source is
ingested, RE-REVIEW these questions and extend their relevant sets with newly-
relevant docs — don't only add new questions"*) — without the contributor
having to know that concept exists.

## Skill-gap logs (banked 2026-05-29)

Specific implementation requirements surfaced during the live-it run. These
are inputs to a future `/slice-intake` spec.

| # | Gap | Why it matters |
|---|-----|----------------|
| 1 | Skill must echo the chosen source back in every prompt header | Source identity leaked between Q&A turns in the live run (contributor opened a different tab; couldn't notice). |
| 2 | First action of skill must be "open this URL in your browser now" + confirm a unique on-page fact (tagline / logo word) | "It all looks the same to me" — distinguishing Christian-ministry sites by sight alone is hard for the contributor; the skill must absorb that cognitive cost. |
| 3 | When article URLs live on a different domain than the entry URL, list **both** and tag scope as engineer-decided | Real-world case (entry was `powertochange.com`; articles were on `thelife.com`). Contributor cannot resolve "one source or two?" — that's engineer scope, not contributor. |
| 4 | Skill must explicitly prompt "anything on the page that isn't the article itself? (sidebar, comments, form, related links, ads)" — contributor-mode framing | Contributor-answerable; feeds directly into engineer's content-extraction selector decision. |
| 5 | Agent recon must try `/sitemap.xml` AND `/sitemap_index.xml` (sites split) | thelife.com uses the flat one; JF + Sightline use the indexed one. |
| 6 | Agent recon must flag **sitemap-external-domain pollution** | thelife.com's sitemap contained one `sanctuarymentalhealth.org` row — engineer must filter. |
| 7 | Agent recon must read **hreflang siblings** from homepage / sitemap and document them as "engineer-decide: include or exclude as separate sources?" | thelife.com surfaced fr/zh/fa language siblings. |
| 8 | Agent recon must distinguish **passive CF bot-management** from **CF challenge-gate** | Naive grep for `challenge-platform` flags both; passive instrumentation serves content fine (thelife.com, JF, Sightline), the gate doesn't (EveryStudent). Recon must verify body actually contains content. |
| 9 | Non-article-CTA detection must scan **visible text/labels** as well as class names | "Talk to a Mentor" CTA on thelife.com was in a button label, not a class — class-grep alone misses it. |

## Mechanical checks — status and candidates

**Already in place (ci.yml floor):**
- lint
- typecheck
- depcruise (three-context architecture enforcement)
- test (Postgres-backed integration suites included)

These are the *floor* and run on every PR.

**Candidate additional checks for the contributor path (NOT IMPLEMENTED):**

| Candidate | Catches | Defer until |
|-----------|---------|-------------|
| Contributor-PR file-path allowlist | Contributor PR touching files outside `src/registry/<key>.ts` + eval seed additions (e.g. a PR that quietly edits `src/retrieval/**` or `docs/architecture.md`) — should fail, not slide through. Engineer PRs unaffected (label-bypass or path-pattern detected via PR title prefix). | A real external contributor is identified; before that, the allowlist has no signal to gate. |
| Eval-must-pass gate (workflow_dispatch) | Engineer-fired eval against PR's actual code (acquire+index+eval for one source). Output posted as PR comment. Per-source scoped — costs one source's embeddings, not the world. | Local-attached (engineer pastes results into PR) is the cheap v1; graduate to CI when there's a second committer who isn't Jaco. |
| Eval-bar regression gate (post-merge prod-smoke) | Re-runs Miheret-style eval queries against the just-reindexed prod corpus; fails loudly if the bar drops. Regression net. | After v1 auto-trigger ships and runs unattended for 2–3 successful merges. |

## Persona-bias recalibration (internal note)

During the live-it session, the assistant briefly framed apologetics/skeptic
content as a separate genre to downrank for sources whose voice happens to be
devotional. **That framing is wrong** and was caught by the operator.

The repo's framing is consistent and correct:
- `README.md:3` — corpus serves **biblically aligned content**.
- `README.md:11` + `docs/architecture.md:67–69` — mechanism-not-policy; the
  same engine serves a doctrinal apologist and a World Cup chat bot.
- `.claude/skills/golden/SKILL.md:44–65` — personas are a **vocabulary-balance
  lens for retrieval coverage**, not audience filters.
- `docs/slices/sightline-ministry.md:12` — the apologetics/skeptic/evidence axis
  is celebrated as **core corpus value**.

Recalibration for any future skill design: persona is a vocabulary lens;
biblical alignment is the orthogonal quality axis; apologetics/skeptic content
is core corpus value, not a downrank-worthy genre.

## Proof-of-concept: the agent recon recipe (executed against thelife.com)

The recon pass that would belong to step 2 ("agent does its own recon") above.
Documented as a reproducible recipe; not yet code.

```sh
# 1. reachability + CMS + CDN fingerprint
curl -sIL -A "$UA" "$URL/"
# look for: HTTP status, server, x-powered-by, cookies, set-cookie patterns

# 2. robots + sitemap discovery (try both shapes)
curl -sL -A "$UA" "$URL/robots.txt"
curl -sL -A "$UA" "$URL/sitemap.xml"
curl -sL -A "$UA" "$URL/sitemap_index.xml"
# count URLs, sample first/mid/last, distribute by path-depth, flag
# external-domain pollution (rows not on $URL)

# 3. homepage meta + footer + JS-shell detection
curl -sL -A "$UA" "$URL/" \
  | grep -iE '<title>|og:site_name|og:title|og:description|name="description"'
# verify content actually present in HTML (NOT a CF challenge gate);
# look for hreflang siblings (other-language brand sites)

# 4. sample 3-5 representative content pages
#    (from sitemap, or topic-hub if found, or the contributor's mentions)
# for each: status, size, title/og, article-body class candidates,
# non-article element scan (class names AND visible-text labels:
# Comment / Discuss / Mentor / Talk to / Subscribe / Share),
# rough word count

# 5. About / Our Beliefs / footer for org + denominational context
curl -sL -A "$UA" "$URL/about"
curl -sL -A "$UA" "$URL/about/our-beliefs"  # try; many sites have it
```

A real session of this recipe against `https://thelife.com` is the source
material for the worked example below; the recipe is not yet wrapped as code.

### Worked example: draft intake artifact for thelife.com (not committed)

The output the agent recon produced on 2026-05-29 (captured here as the
concrete artifact shape a future `/slice-intake` would emit). **Not** committed
to `src/registry/` or anywhere active — this is the structural example.

```yaml
source_key: thelife                          # candidate; engineer confirms
display_name: The Life
url: https://thelife.com
parent_org: Power to Change Ministries™      # from homepage footer (confirmed by contributor)
cms: Statamic                                # x-powered-by header
cdn: Cloudflare (passive bot-mgmt, no challenge wall)

homepage_status: 200
robots: "Disallow: (empty) — all crawl allowed"
js_rendered: false                           # full HTML on first byte
block_wall: none                             # CF challenge-platform <script>
                                             #   is passive instrumentation, not a content gate

sitemap: https://thelife.com/sitemap.xml     # NOT sitemap_index.xml
sitemap_url_count: 7834
sitemap_bytes: ~4.6 MB
sitemap_lastmod_range: 2022-11-17 → 2026-05-28
url_shape_distribution:
  depth_1: 628    # top-level routes / topic hubs
  depth_2: 5637   # ROOT ARTICLES — e.g. /healing-a-marriage
  depth_3: 1567   # /devotionals/<slug>
  noise:
    - external row: sanctuarymentalhealth.org (sitemap pollution, drop)
    - /devotionals/tags/<tag> taxonomy pages (engineer drops)

article_body_class: ".article-body"          # clean single-class
article_word_counts_sampled: [1282, 1964, 5210]
structure: H1 title + H2/H3 sections inside articles

non_article:
  - Discussion / comments section
  - "Talk to a Mentor" CTA
  - Share / share-icons widget
  - Subscribe form

hreflang_siblings:
  fr: laviejenparle.com
  zh: uwota.com
  fa: shagerdan.com

scope (contributor decision): articles + devotionals (both, ~7,200 docs)
eval_queries: <substep A/B/C output — not collected this session>
```

## What is explicitly NOT in this document yet

- A scaffolded `.claude/skills/slice-intake/` skill — premature; would be
  designed against one source's friction.
- The engineer playbook (#30 deliverable).
- The eval-gate decision (local-attached vs. CI `workflow_dispatch`).
- The prod-trigger decision (manual vs. GH-Action-fires-Railway-indexer).
- Implementation of the contributor-PR file-path allowlist check.

## Resume conditions

Pick this back up when **any** of:

1. **Pattern density** — 4–6 more backlog sources have landed via normal
   `/slice` (corpus is richer, contributor patterns are clearer, the
   templatable-vs-engineer-only split is empirical not speculative).
2. **Real contributor candidate identified** — the friction model changes
   the moment a real non-coder is named; design against their constraints,
   not a persona.
3. **Batched intent** — a half-day-plus session scheduled explicitly to
   design the skill against banked signals.

## Passive signals to collect in the meantime

During every normal `/slice` run between now and resume: if a friction point
clearly screams **"a non-coder could never do this"**, append a one-liner to
the "Passive signals" section below. Don't pause the slice. Don't refactor.
Just bank the signal.

## Passive signals (append-only)

<!-- One-liner per signal. Format: `YYYY-MM-DD source-key — what happened` -->
<!-- e.g. `2026-06-15 powertochange — selector `.article-body` had 5 nested CTAs that needed manual class-exclusion list; agent recon couldn't have inferred without rendering JS` -->
