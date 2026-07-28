# Campaign: EveryStudent non-walled sibling domains (48 sources) — [#111](https://github.com/JesusFilm/jesusfilm-rag/issues/111)

_Branch: `feat/everystudent-siblings` · Started: 2026-07-28 · Status: **in-progress**_
<!-- Status: in-progress | blocked | done | deferred -->

> **If you are a fresh agent: read this whole file, then go to "You are here".**
> It is the complete resume contract for this campaign. You need no chat history.
> This is a **campaign file**, not a `/slice` file — do **not** run `/slice` for these
> sources. See "Why not /slice" below; running it 48 times is the exact thing this
> campaign exists to avoid.

---

## 1. The goal

Acquire, ingest and evaluate the **48 non-walled EveryStudent sibling-language
domains** — the multilingual estate around `everystudent.com`. One domain = one
source key (ADR-0006), so 48 new registry entries.

- **Firecrawl cost: zero.** All 48 answer plain HTTP. The three walled banners
  (`everystudent` en, `everystudent-ar`, `everystudent-fr`) are already done and
  are **not** part of this campaign.
- The binding constraint is **operator attention and eval load**, not money.
- Recon for all 48 was already captured in #111 on 2026-07-24 (domains, languages,
  sitemap counts). That table is reproduced in §8.

## 2. Why not `/slice`

`/slice` exists to discover architecture on a *novel* source: bot-wall probe,
language plan, crawl-policy design, ~7 operator gates. These 48 are **clones of an
already-proven source**. 48 × ~7 gates ≈ 300 pauses, and almost none are
load-bearing.

More importantly, **only acquisition is per-source**. Verified in the CLIs:

| Stage | Command | Scope |
|---|---|---|
| Acquire | `pnpm acquire --source <key>` | **per source** — the only fan-out |
| Ingest | `pnpm index` (no `--source`) | drains **all** pending rows, one run |
| Eval | `pnpm eval` (no `--source`) | **whole corpus**, one run |
| Prod ingest | `pnpm index:production` | one run |
| Prod eval | `pnpm eval:production` | one run |

So the shape is: **fan out on writing registry entries, then a handful of bulk
commands.** Not 48 rounds of anything.

## 3. The full plan, end to end

```
PHASE 1  triage + registry entries    ← fan out, batches of 8–12 agents
PHASE 2  acquire locally               ← one loop over the batch's keys
   … repeat 1–2 until all 48 are acquired locally …
PHASE 3  index locally                 ← ONE run, all 48 at once
PHASE 4  retrieve spot-check           ← per-language smoke, scripted
PHASE 5  eval locally                  ← batched by language group (see §7)
PHASE 6  ONE pull request for all 48   ← then merge to main
PHASE 7  prod, on Jaco's VM            ← acquire → index → retrieve → eval
```

**Operator's stated intent for the endgame (2026-07-28), do not deviate without
asking:** all 48 acquired locally first → then a single full index/retrieve/eval
→ then **one PR for all 48 sources** → merge → then re-run
acquire/index/retrieve/eval **on the VM against prod**.

Note phases 1–2 interleave per batch; phases 3+ happen **once**, after all 48 are
locally acquired.

---

## 4. You are here

**Last updated: 2026-07-28 · last commit `6e7f492`**

- ✅ **Phase 1, batch 1 (pilot) — DONE.** 8 registry entries written, wired,
  verify gate green (depcruise · lint · typecheck · db:check · status:check ·
  test 494 passing). Dry-run acquire resolves all 8 → **630 article URLs**.
  Committed as `6e7f492`.
- ⏭️ **NEXT: Phase 2 for batch 1** — acquire those 8 locally. Nothing has been
  fetched or ingested yet. Command in §6.
- ⏭️ Then: Phase 1 batch 2 (12 sources), and repeat.

**Progress: 8 of 48 registry entries written. 0 of 48 acquired.**

### The immediate next command

```bash
git checkout feat/everystudent-siblings
for k in es zh-cn ru ro ja pt de ko; do
  pnpm acquire --source everystudent-$k
done
```

~630 pages over plain HTTP at 1s delay ≈ 15 min. Free. Then verify per §6 and
commit. **Do not run `pnpm index` yet** — indexing happens once, after all 48 are
acquired (Phase 3).

---

## 5. The batching approach (and why)

### What fans out
**Only writing the registry entry.** One agent = one domain = two new files:
`src/registry/everystudent-<code>.ts` + its `.test.ts`. No shared state.

### What must NOT fan out
- `src/registry/index.ts` — the barrel. **The orchestrator writes it**, once per
  batch, after all agents return. Eight agents editing it would collide.
- Anything touching the local Postgres: `pnpm acquire`, `index`, `test`, `eval`.
  One database, one connection pool. Agents are forbidden from running these.
- `docs/source-status.yaml` — single-writer via `pnpm status:*` only.

### Batch size
- Pilot was **8**. Worked well; review was manageable.
- **Batch 2 onward: 12.** Recommended after the pilot, not yet run.
- Save the **5 sitemap-less domains for last** — they need a different discovery
  route and will not fit the standard agent prompt.

### Hard rules for spawned agents (put these in every prompt)
1. Do **not** edit `src/registry/index.ts`. Their test WILL fail until the barrel
   is wired — that is expected; tell them so, or they waste turns "fixing" it.
2. Do **not** run pnpm / npm / npx / tsx / vitest / psql / docker / git-write.
3. **Give each agent its own scratch subdirectory.** In the pilot, 4 of 8 agents
   had files silently overwritten by a sibling using the same generic filenames
   (`sitemap.xml`). All four noticed and redid the work — that was luck, not
   design. Pass an explicit per-agent path.
4. Probe with `curl` using a **full browser UA string**. A bare `Mozilla/5.0`
   gets **406 Not Acceptable** from these Apache hosts. The repo's real fetcher
   already sends a full Chrome UA (`http-fetcher.ts`), so this is a probing
   concern only.

The exact working pilot prompt is preserved in §10 — reuse it, changing only the
per-domain facts.

---

## 6. Per-phase runbook

### Phase 1 — triage + registry entry (per batch)
1. Orchestrator picks the batch from §8, ordered largest-sitemap-first.
2. Spawn one agent per domain with the §10 prompt.
3. When all return: orchestrator wires `src/registry/index.ts` (imports +
   `SOURCES` array), runs the full gate, then **dry-run acquire** each new key:
   ```bash
   pnpm acquire --source everystudent-<code> --dry-run
   ```
   This resolves the discovery filters against the live sitemap and fetches
   nothing. A source that resolves 0 URLs is broken — do not proceed.
4. Commit the batch. **Do not** register in `source-status.yaml` yet — that
   happens at stage boundaries once the source has actually acquired.

### Phase 2 — acquire (per batch)
```bash
for k in <batch keys>; do pnpm acquire --source everystudent-$k; done
```
Evidence to check before calling it done:
```sql
select s.key, count(*), min(length(r.raw_content)), avg(length(r.raw_content))::int
from raw_documents r join sources s on s.id = r.source_id
where s.key like 'everystudent-%' group by 1 order by 1;
```
Expect the counts in §8's "will acquire" column. A large shortfall means the
crawl policy is wrong; a small one is normal (dead sitemap URLs, see §9).

Then `pnpm status:add-source` + `status:set … acquire=green` per source.

### Phase 3 — index (ONCE, after all 48 acquired)
```bash
pnpm index
```
Drains every pending row across all 48. Expect **~2,900 documents**. This is the
expensive step (embeddings). Re-run is idempotent.

⚠️ Re-run the **full verify gate after ingest**, not just after code changes —
integration tests query the live Postgres and a data-only change can turn them
red (slice #3 precedent).

### Phase 4 — retrieve spot-check
Per-language smoke: a `language:<code>` filtered query returns non-zero hits, all
in that language. Script it; do not hand-run 48 times.

### Phase 5 — eval (batched, see §7)
```bash
QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000 pnpm eval
```
**The env override is mandatory for batch evals.** `pnpm eval` inherits the
fast-fail query retry posture meant for `/v1/search`, and it has **no resume** —
one transient OpenRouter blip discards the whole run. It killed two runs in
slice #9. See `docs/ops/embed-retry-policy.md`.

### Phase 6 — one PR for all 48
Title must be lowercase (commitlint + `.github/workflows/pr-title.yml`).
Switch `gh` identity to `jaco-brink` before any push.

### Phase 7 — prod, on the VM
Per `docs/ops/prod-ingest.md`. These are **non-walled**, so the normal
`acquire:production` path applies — re-fetching over plain HTTP is free.
**Do NOT suggest `copy-raws.sh`** for these; that path exists to avoid paying
Firecrawl twice and there is no Firecrawl here.

---

## 7. Eval strategy — the one place 48 still bites

Golden cases need someone who can read the language. Nobody can curate Oromo,
Tigrigna and Georgian answer keys. **Proposed, and awaiting the operator's
decision:**

- **Real `/golden` treatment** for a shortlist — suggested: `es`, `zh`, `ru`,
  `pt`, `de`, `ja`, `ko`.
- **Everything else: `evaluate: deferred`** in `docs/source-status.yaml`.
  `deferred` is a **sanctioned status in the contract**
  (`src/contracts/source-status.schema.ts`), not a workaround. Record the reason.
  Prove retrieval with the Phase-4 language smoke instead.

Facts that bear on this (measured 2026-07-28, local corpus):

- Existing corpus languages: `en` 10,554 · `es` 500 · `zh` 332 · `fr` 225 ·
  `ar` 65 · `null` 12.
- Existing golden cases carry only `ar` (13) · `fr` (12) · `en` (11) · `es` (9).
- Therefore: **`es` and `zh` are multi-source languages** — Stage-4 Part A
  re-review is real work there. **`ru` `ro` `ja` `pt` `de` `ko` are new
  languages** — Part A is a *provable no-op* (no existing case can resolve to
  them; `corpus-search-store.ts` applies a strict `eq(documents.language, …)`).
  Do the cheap structural check before spending a curation pass.

---

## 8. The 48 domains

**Done (8)** — registry written, dry-run verified, not yet acquired:

| Lang | Domain | Sitemap | Will acquire | Template |
|---|---|---|---|---|
| `es` | cadaestudiante.com | 153 | 78 | shared |
| `zh-cn` | xinshengming.com | 146 | 129 | **WordPress** |
| `ru` | mirstudentov.com | 105 | 95 | shared |
| `ro` | everystudent.ro | 102 | 90 | shared |
| `ja` | studentinjapan.com | 94 | 81 | shared |
| `pt` | suaescolha.com | 74 | **75** | shared |
| `de` | duentscheidest.com | 72 | 45 | shared |
| `ko` | everykoreanstudent.com | 48 | 37 | **`html` (broken markup)** |

**Remaining with reachable sitemaps (35)** — suggested batch order, largest first:

| Lang | Domain | URLs | | Lang | Domain | URLs |
|---|---|---|---|---|---|---|
| `sq` | pyetjetejetes.com | 131 | | `hr` | vrlovazno.com | 54 |
| `fa` | everypersianstudent.com | 107 | | `th` | everythaistudent.com | 52 |
| `mn` | tailal.mn | 105 | | `am` | habeshastudent.com | 50 |
| `tr` | tanriyitanimak.com | 102 | | `it` | ognistudente.com | 50 |
| `cs` | everystudent.cz | 97 | | `sk` | everystudent.sk | 44 |
| `bg` | everystudent.bg | 95 | | `el` | everystudent.gr | 43 |
| `hu` | everystudent.hu | 95 | | `ur` | zindagikaysawalat.com | 42 |
| `pl` | kazdystudent.pl | 90 | | `hi` | everystudent.in | 40 |
| `sr` | studentskikutak.com | 84 | | `ta` | ungalthervuenna.com | 40 |
| `et` | tudengielu.net | 77 | | `te` | everytelugustudent.com | 39 |
| `vi` | everyvietstudent.com | 76 | | `my` | everymyanmarstudent.com | 38 |
| `zh-tw` | everystudent.com.tw | 70 | | `sl` | vsakstudent.com | 30 |
| `id` | mahasiswakeren.com | 67 | | `om` | everybarataa.com | 29 |
| `mk` | studentskiodgovori.com | 65 | | `ne` | nepalistudent.net | 28 |
| `ms` | persoalanhidup.com | 61 | | `ka` | kovelistudenti.com | 25 |
| `lt` | kiekvienamstudentui.lt | 60 | | `kk` | shakirtter.com | 25 |
| `bn` | everybengalistudent.com | 57 | | `sw` | lipotumaini.com | 21 |
| | | | | `he` | igod.co.il | 5 |

**No reachable sitemap (5) — SAVE FOR LAST**, they need a different discovery
route (site's own HTML sitemap page, or hand-listed seeds):

`hy` 1patasxan.com · `lv` katramstudentam.lv · `ru-ca` studentstan.com ·
`ti` everytemhari.com · `uk` svitstudentiv.com

**Known outliers already flagged by #111:** `cs` (everystudent.cz) uses
`.content .content-13` / `.main`, not the shared template. `ka`
(kovelistudenti.com) has no shared-template selectors either.

---

## 9. Rules learned — do not re-learn these

Each cost real investigation. Cite them when they apply.

1. **Verify selectors by extracted TEXT LENGTH, using the repo's own parser —
   never by grepping for the class name.** Every one of these hosts also declares
   `.content4` in an inline `<style>` block, so a text grep false-positives.
   Worse: on `everykoreanstudent.com`, `.content4` **matches 2 elements and
   extracts 0 characters**, and `<body>` is absent from the parsed tree entirely
   (152 direct children of `<html>`). Shipping the sibling selector list there
   would have acquired **zero documents with no error anywhere** — a silent
   failure that looks correctly configured. Check like this:
   ```js
   import { parse } from 'node-html-parser';
   const el = parse(html).querySelector(sel);
   console.log(sel, el ? el.structuredText.trim().length : -1);
   ```
2. **There is no single shared template.** Three families in the first eight:
   shared `.content4` (5), WordPress `.cb-entry-content` (`zh-cn`), and
   `html`-as-container (`ko`). #111's "one crawl policy + a handful of bespoke"
   is optimistic — assume per-host verification every time.
3. **Sitemaps here are stale and cannot be trusted as the source of truth.**
   - `suaescolha.com`: sitemap listed 62 articles, the site's own `/mapa.html`
     lists **75**. Pure discovery would have silently dropped **17%** of the
     source. Fix: pin the missing ones in `seedPaths` — `acquire.ts` unions seeds
     with discovered URLs.
   - `everystudent.ro`: **25 of 85** article URLs 301 to the homepage. Left
     unblocked deliberately — the homepage extracts 0 chars so `minContentLength`
     drops them free. **Expect ~64 docs, not 102. A shortfall is not a failure.**
   - **Always cross-check the sitemap against the site's own HTML sitemap page**
     (`/mapa.html`, `/sitemap.html`, `/plan.html`, `/m/sitemap.html`).
4. **`sitelevel_noindex` is a custom ELEMENT, not a class** (hence no leading dot
   in the entries — that is correct, not a typo). Its markup is **malformed on
   every host**: it opens inside `.contentpadding` and closes after `.content4`,
   so parsers pop it early and it does **not** contain the share widget. Strip
   **`.shareiconsmenupg`** explicitly. This is the defect behind #128.
5. **`.relatedbottom` is dead config** — declared in CSS, never an element, on
   every host measured. Kept for parity; label it a no-op, don't claim it strips.
6. **Signup landing pages clear `minContentLength` and must be blocked by URL.**
   The `/john`·`/jean`·`/juan`·`/joao`·`/ioan` Gospel-of-John email study and the
   `/aventure`·`/aventura`·`/abenteuerreise`·`/pack` series are 1,000–2,500 chars
   of form copy. **Length is not aboutness** (slice #10 paid to learn this).
   Every sibling has localized twins — block them before the first fetch.
7. **`/audio/*` and `/v/*` need a measured decision, not a rule.** On
   `cadaestudiante.com` and `duentscheidest.com` the audio pages are the same
   article reflowed (73–86% 12-word shingle overlap) → blocked. On
   `everystudent.ro` the `/v/` pages carry unique transcripts → kept. Measure
   shingle overlap; don't assume.
8. **Watch for near-twin slugs, but measure before dropping.** `ceu`/`ceu2`,
   `gdebog`/`gdyebog`, `nebesnom`/`nebesnom2` all looked like duplicates and were
   all **distinct** (0–12% overlap). Some are literal continuations.
9. **Probe with a full browser UA.** Bare `Mozilla/5.0` → 406 from these hosts.
10. **Give every fan-out agent its own scratch subdirectory** (see §5).
11. **Mixed-case slugs exist** (`/a/pomoshch-ot-Boga.html`,
    `/articulos/Dios.html`). A lowercase-only `articleHints` regex silently drops
    them.

### Ingest-stage notes (Phase 3 — not acquisition concerns)

Recorded here so they are not lost, but **do not act on them during Phase 1–2**:

- The **500-char detection floor** (ADR-0007) interacts badly with CJK: a full
  Chinese article can be ~1,200 chars, and short-but-legitimate pages
  (`/a/followup` 298 ch, `/john/john37` 310 ch) will store `language = null` and
  drop out of `language:"zh"` filtered retrieval. Observe and report at Phase 3.
- **`zh` is a colliding label.** `thelife-zh` (Simplified), `everystudent-zh-cn`
  (Simplified) and a future `everystudent-zh-tw` (Traditional) all declare `zh`.
  Language-filtered retrieval cannot separate them. Same for `ru` /
  `ru-ca` (studentstan.com). Recorded as an observation; **not solved here.**
- **The standing null-language policy is unchanged and settled** — nulls are
  expected, excluded from eval, surfaced on the dashboard. Do not re-open it, do
  not propose a sweep. `pnpm lang:sweep` is a prod corrective tool and is never a
  campaign step.
- `studentinjapan.com` and `everykoreanstudent.com` serve **UTF-8** but send a
  bare `content-type: text/html` with **no charset parameter**. A client
  defaulting to ISO-8859-1 would mojibake every page.

---

## 10. The agent prompt that worked (reuse verbatim, swap the facts)

Preserved so a fresh session need not re-derive it. Substitute the **bold**
placeholders per domain.

```
Write ONE new source registry entry for the jesusfilm-rag repo at
<REPO>. The branch `feat/everystudent-siblings` is already checked out — do not
switch or create branches, do not commit.

TARGET: EveryStudent sibling domain — **<LANGUAGE> (`<code>`)**, host
**<domain>**, ~<N> sitemap URLs (per prior recon; verify).

## Deliverable — exactly two new files, nothing else
1. `src/registry/everystudent-<code>.ts` exporting
   `export const everystudent<Camel>: SourceEntry`
2. `src/registry/everystudent-<code>.test.ts` — vitest

## HARD CONSTRAINTS
- Do NOT edit `src/registry/index.ts`. The orchestrator owns that barrel. Your
  entry will not be importable during your run and your test would fail if
  executed — that is expected and correct. Do not try to fix it.
- Do NOT run pnpm, npm, npx, tsx, vitest, psql, docker, git commit/checkout/branch.
  No builds, no test runs, no database. Do not self-verify with `pnpm typecheck`.
- Probe with `curl` only (`-m 20`), using a FULL browser UA string — a bare
  `Mozilla/5.0` gets 406 from these hosts.
- Your scratch directory is <SCRATCH>/<code>/ — use ONLY that path. Sibling
  agents run concurrently and generic filenames WILL collide.

## Read first
`src/registry/types.ts`, `src/registry/everystudent-fr.ts` (field shape +
docstring standard), `src/registry/thelife-fr.ts` (discovery-mode precedent),
`src/registry/everystudent-fr.test.ts` (test pattern),
`src/acquisition/extract.ts` (how selectors are actually applied).

## Recon you must actually perform — measure, never assume
1. robots.txt — fetch it. Record Disallow rules and whether they touch articles.
2. Sitemap — fetch `/sitemap.xml` (try with and without `www.`). Count URLs.
   Work out the article pattern vs nav/index pages.
   THEN cross-check against the site's own HTML sitemap page (/mapa.html,
   /sitemap.html, /plan.html …). These sitemaps are STALE: one sibling's was
   missing 17% of its articles, another lists 25 dead URLs. If the HTML map has
   articles the XML sitemap lacks, pin them in `seedPaths` — acquire.ts unions
   seeds with discovered URLs.
3. At least 3 real article pages. Determine which selectors wrap the body — and
   verify by EXTRACTED TEXT LENGTH using node-html-parser exactly as
   extract.ts does, NOT by grepping for the class name. Every host declares
   .content4 in an inline <style> block, and on one sibling .content4 matched
   but extracted 0 chars while <body> was absent entirely. Test the shared
   template (.content4/.content4b/.articletitle/.contentpadding) first; if it
   does not extract text, find the real container.
4. Chrome to strip — check `sitelevel_noindex` (a custom ELEMENT, not a class),
   `.fccell`, `.fctable`, `.hr2`, `.articledivider`, `.relatedbottom`, and
   `.shareiconsmenupg` (REQUIRED — sitelevel_noindex's markup is malformed and
   does not contain the share widget). Measure what each removes.
5. Language — READ THE CONTENT YOURSELF and say what you read, quoting a phrase.
   Confirm it is genuinely <LANGUAGE>, not untranslated English (a real failure
   mode: cru.org's Spanish path served English bodies). Do NOT use, install or
   mention any language-detection library.

## Shape of the entry
- DISCOVERY mode (`sitemaps` + `allow` + `articleHints` + `block`), not
  hand-listed seeds — except seeds pinned per step 2. Precedent: thelife-fr.ts.
- OMIT `fetchStrategy` — not walled, plain HTTP is the default. If you DO find a
  Cloudflare 403 block page, STOP, write nothing, and report it.
- `languages`: the ISO 639-1 code detection emits (regional variants declare the
  base code, e.g. zh-cn → ["zh"]; note the variant in key/name/docstring).
- `key`: `everystudent-<code>`, matching /^[a-z0-9-]+$/.
- `maxPages`: sitemap count + headroom. `minContentLength: 250`.
  `requestDelayMs: 1000` unless probes suggest otherwise.
- `trust: "partner"`, `ingestionMode: "html-scrape"`, `defaultCategory: "article"`,
  tags `["everystudent","cru","topic:seeker","lang:<code>"]`, a `rights` line
  matching the siblings.
- BLOCK the localized Gospel-of-John signup page and the "adventure/pack" email
  series — they clear minContentLength and only a URL block catches them.

## Docstring
Match the siblings' standard, but ONLY claim what you MEASURED. Stamp measured
facts "verified <DATE>: …". Never write a measurement you did not take. Note the
separate-key-per-domain rule (ADR-0006).

## Tests
Model on everystudent-fr.test.ts. Assert what would be costly to silently undo:
domain, languages, discovery-vs-seed mode, the selectors you measured binding,
the strip list, separate-key-per-domain. 4–6 focused tests. Do not pad.

## eslint: `max-lines: 300` (comments excluded) on the entry file.

## Report back — tight
- domain + sitemap count + article pattern + any HTML-map cross-check delta
- selectors measured binding, with extracted char counts
- robots.txt verdict
- language confirmation in your own words, quoting a phrase you read
- anything surprising, or any call the orchestrator must make
```

---

## 11. Corpus issues filed

- **[#128](https://github.com/JesusFilm/jesusfilm-rag/issues/128)** — share-widget
  chrome embedded in all three **existing** EveryStudent sources, **live in prod**:
  `everystudent` 97/117 docs · `everystudent-ar` **67/67** · `everystudent-fr`
  **67/67** (232 chunks total). Fix is one selector (`.shareiconsmenupg`) plus a
  re-extract — no re-fetch, no Firecrawl credits.
  **Deliberately NOT part of this campaign's branch or PR** — it touches three
  existing sources and would make the 48-source PR unreviewable.
- Related open: **[#123](https://github.com/JesusFilm/jesusfilm-rag/issues/123)**
  content soundness, estate-wide (found in `-ar`, confirmed in `-fr`).

## 12. Decisions made

| Date | Decision | Why |
|---|---|---|
| 2026-07-28 | Campaign file, not 48 `/slice` runs | Only acquisition is per-source; ingest/eval are already bulk. ~300 operator gates avoided. |
| 2026-07-28 | Fan out on registry authoring only | It is the sole per-source unit with no shared state. |
| 2026-07-28 | Discovery mode over hand-listed seeds | Sitemaps reachable, plain HTTP free. Seeds used only to patch stale sitemaps. |
| 2026-07-28 | Branch `feat/everystudent-siblings` off `origin/main` | New work; `slice/everystudent-fr` was already merged upstream. |
| 2026-07-28 | #128 kept out of this branch | Keeps the 48-source PR reviewable. |
| 2026-07-28 | Batch 2 sized at 12 | Pilot of 8 was comfortably reviewable. |

## 13. Open questions for the operator

1. **Eval shortlist (§7)** — confirm `es`/`zh`/`ru`/`pt`/`de`/`ja`/`ko` get real
   golden cases and the remaining 41 are `evaluate: deferred`, or name a
   different set. **Does not block Phases 1–4.**
2. **When to fix #128** — before the 48 land, after, or on its own schedule.
3. **The 5 sitemap-less domains** — hand-list seeds from their HTML sitemap
   pages, or defer them out of this campaign entirely?

## 14. Resume hint (cold start)

At: **Phase 2, batch 1** — acquire the 8 pilot sources locally. Nothing fetched
yet. Run the command in §4, verify with the SQL in §6, `status:add-source` +
`status:set … acquire=green` per source, commit. Then Phase 1 batch 2 (12
sources from §8, largest first) using the §10 prompt.
Last verify: **green 2026-07-28** (494 tests). Last commit: `6e7f492`.
Branch: `feat/everystudent-siblings`.
