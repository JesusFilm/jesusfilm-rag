# Campaign: EveryStudent non-walled sibling domains (48 sources) — [#111](https://github.com/JesusFilm/jesusfilm-rag/issues/111)

_Branch: `feat/everystudent-siblings` · Started: 2026-07-28 · Status: in-progress_
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

**Last updated: 2026-07-29**

- ✅ **Phase 1, batch 1 (pilot) — DONE.** 8 registry entries written and wired.
- ⚠️ **Two real defects found and fixed at Phase 2 — read rules 1b and 1c.**
  Five of the eight entries would have acquired **zero documents**, and a sixth
  would have staged 25 duplicate nav pages. Neither was visible to the Phase-1
  gate. The gate has been strengthened; §10's agent prompt is updated.
- ✅ **Phase 2, batch 1 — DONE 2026-07-29.** All 8 acquired locally:
  **600 documents**, zero duplicate-content groups, `acquire: green` recorded in
  `docs/source-status.yaml`. Per-source counts and full skip accounting in §8.
- ⏭️ **NEXT: Phase 1, batch 2** — 12 sources from §8, largest sitemap first,
  using the §10 prompt. **Do NOT run `pnpm index` yet** — indexing happens once,
  after all 48 are acquired (Phase 3).

**Progress: 8 of 48 registry entries written. 8 of 48 acquired (600 docs).**

### The immediate next command

Pick the next 12 from §8's "Remaining with reachable sitemaps" table, largest
first — `sq` pyetjetejetes.com (131), `fa` everypersianstudent.com (107),
`mn` tailal.mn (105), `tr` tanriyitanimak.com (102), `cs` everystudent.cz (97),
`bg` everystudent.bg (95), `hu` everystudent.hu (95), `pl` kazdystudent.pl (90),
`sr` studentskikutak.com (84), `et` tudengielu.net (77),
`vi` everyvietstudent.com (76), `zh-tw` everystudent.com.tw (70) — and spawn one
agent each with the §10 prompt, each with its own scratch subdirectory.

⚠️ `cs` (everystudent.cz) is a known outlier: `.content .content-13` / `.main`,
not the shared template. Expect it to need its own container.

**Before committing batch 2, run the live-extraction gate** (§6 Phase 1, step 4).
It is not optional — it is the only check that caught the batch-1 defect.

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
4. ⚠️ **MANDATORY — the live-extraction gate.** `--dry-run` fetches nothing and
   the registry tests assert the entry's own fields, so **neither can tell you
   whether extraction works.** Batch 1 passed both with five entries that
   extracted 0 chars. For each new key, fetch 2 discovered article URLs and run
   the repo's own extractor:
   ```ts
   const entry = SOURCES.find((s) => s.key === key)!;
   const { urls } = await discoverUrls({ fetcher }, entry.crawl);
   for (const url of urls.slice(0, 2)) {
     const res = await fetcher.fetch(url);
     // Report EVERY contentSelector's char count, not just the final result —
     // a 0-char match that binds first is the failure you are looking for.
     for (const sel of entry.crawl.contentSelectors) { … }
     const out = extractContent(res.body!, entry.crawl);
     assert(out.text.length >= entry.crawl.minContentLength);
   }
   ```
   Anything below `minContentLength` means the container is wrong (rule 1b).
5. Commit the batch. **Do not** register in `source-status.yaml` yet — that
   happens at stage boundaries once the source has actually acquired.

### Phase 2 — acquire (per batch)
```bash
for k in <batch keys>; do pnpm acquire --source everystudent-$k; done
```
Evidence to check before calling it done. (`raw_documents` carries `source_key`
directly — there is no `source_id` and no join. An earlier version of this file
had that wrong.)
```sql
-- 1. counts and body sizes
select source_key, count(*), min(length(raw_content)),
       avg(length(raw_content))::int, max(length(raw_content))
from raw_documents where source_key like 'everystudent-%' group by 1 order by 1;

-- 2. ⚠️ REQUIRED — duplicate-content check (rule 1c). Any group with a high
--    count means dead URLs are extracting the same nav page via the <body>
--    fallback. Expect ZERO rows.
select source_key, md5(raw_content) h, count(*)
from raw_documents where source_key like 'everystudent-%'
group by 1, 2 having count(*) > 1 order by 3 desc;
```
Expect the counts in §8's "Staged" column. A large shortfall means the crawl
policy is wrong; a small one is normal (dead sitemap URLs, see §9). **Account for
every skip** — `grep "⤫"` the acquire log and check each URL by hand. That is how
the `ja` mixed-host anomaly surfaced.

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

**Done (8) — ACQUIRED locally 2026-07-29.** `acquire: green` in
`docs/source-status.yaml`. **600 documents, zero duplicate-content groups.**
"Container" is the selector that actually extracts (see rule 1b):

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `es` | cadaestudiante.com | 153 | 78 | **77** | `.contentpadding` |
| `zh-cn` | xinshengming.com | 146 | 129 | **128** | `.cb-entry-content` (WordPress) |
| `ru` | mirstudentov.com | 105 | 95 | **95** | `.contentpadding` |
| `ro` | everystudent.ro | 102 | 90→65 | **64** | `.contentpadding` |
| `ja` | studentinjapan.com | 94 | 81 | **79** | `.content4` ⚠️ mixed host |
| `pt` | suaescolha.com | 74 | **75** | **75** | `.contentpadding` |
| `de` | duentscheidest.com | 72 | 45 | **45** | `.contentpadding` |
| `ko` | everykoreanstudent.com | 48 | 37 | **37** | `html` (broken markup) |

Skip accounting — every one checked, none is a defect:
- `es` 1 · `/articulos/discipulos.html` is a genuine 164-char stub (title +
  subhead only).
- `zh-cn` 1 · `/a/pack3.html`, from the "adventure/pack" email series.
- `ro` 90→65 · the 25 dead redirects are now **hard-blocked** (see rule 1c);
  the remaining 1 skip is `/v/filmuliisus.html`, a transcript-less video embed.
  64 = the ~64 this file predicted all along.
- `ja` 2 · `/a/jes4.html` (220 ch, under the floor) and `/a/Bible215.html` (an
  interactive quiz page with no content container). Both correctly dropped.
- `pt` 75/75 · the 13 pinned `seedPaths` unioned with the 62 discovered exactly
  as designed — the stale-sitemap patch works.

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

1b. **⚠️ THE ONE THAT BIT US — `contentSelectors` is NOT a fallback chain.**
   `extractContent` (`src/acquisition/extract.ts`) scopes to the **first selector
   that matches an ELEMENT**, not the first that yields text:
   ```ts
   for (const selector of policy.contentSelectors) {
     scope = root.querySelector(selector);
     if (scope) break;          // ← binds even when it extracts 0 chars
   }
   ```
   So **a zero-text match SHADOWS every working selector after it.** Listing the
   shared template as a "fallback chain, outermost first" is not defensive — it
   is the failure mode.

   On **five of the eight pilot hosts** (`es`, `ru`, `ro`, `pt`, `de`)
   `.content4` exists only as `<div class="content4"> </div>` — an empty layout
   spacer, 0 chars, 0 child elements — and `.content4b` **does not exist at all**.
   The real container is **`.contentpadding`** (3.6k–20.5k chars). Because
   `.content4` was listed first, all five extracted **0 chars on every page** and
   every article was skipped as `too-thin` on an **HTTP 200**. Fixed 2026-07-29 by
   setting `contentSelectors: [".contentpadding"]` — one measured selector, no
   chain. Only `ja` genuinely has `.content4` as its container.

   Two things made this survive Phase 1:
   - **The registry unit tests cannot catch it.** They assert the entry object's
     own fields (`expect(contentSelectors[0]).toBe(".content4")`) — a tautology
     that passes whatever you write. All five even shipped a confident nesting
     diagram (`.content4 > .content4b > .contentpadding`) that does not exist.
   - **`--dry-run` acquire cannot catch it either.** It resolves URLs against the
     sitemap and **fetches nothing**, so "resolves 630 URLs" says nothing about
     extraction. The §6 Phase-1 gate is insufficient on its own.

   **New mandatory Phase-1 gate — run BEFORE committing a batch:** fetch 2 real
   article URLs per new key and run the repo's own `extractContent` with the
   registry policy; assert `text.length >= minContentLength`. Anything else is
   guessing. See "Open questions" #4 — this should become a checked-in script.

1c. **"`minContentLength` will drop it" is NOT a blocking strategy — there is a
   `<body>` fallback.** When **no** `contentSelector` matches, `extractContent`
   does not return empty. It falls through (`extract.ts:50`):
   ```ts
   const container = scope ?? root.querySelector("body") ?? root;
   ```
   so the page still extracts — usually the entire nav/teaser chrome, which on
   these hosts runs 800+ chars and clears the 250 floor comfortably.

   `everystudent-ro` shipped 25 dead `/a/` URLs unblocked on exactly the wrong
   reasoning: "the homepage carries none of the selectors, so extraction yields
   0 characters and the floor drops them." The real acquire run staged **89 docs,
   25 of them byte-identical copies of the 842-char homepage teaser list.** They
   do not collapse at ingest either — the dedup gate keys on
   `(sourceKey, canonicalUrl)`, so 25 URLs mean 25 chunked, embedded documents.
   Blocked by URL and the 25 rows deleted; `ro` now stands at the 64 predicted.

   **Rule: a page you do not want must be blocked by URL.** The floor only
   catches pages that are genuinely short *after* extraction, and a selector
   miss makes a page LONGER, not shorter. Verify with
   `select md5(raw_content), count(*) … group by 1 having count(*) > 1` after
   every acquire — one hash with a high count is this bug.

   ⚠️ Two hosts (`studentinjapan.com`, `everykoreanstudent.com`) have **no
   `<body>` in the parsed tree at all**, so they fall through to the document
   root instead — same failure, different shape.
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
  defaulting to ISO-8859-1 would mojibake every page. (Observed clean in the
  2026-07-29 acquire — Node's `fetch` handled both correctly.)
- **Measured after batch-1 acquire (2026-07-29), to watch at Phase 3:**
  - `everystudent-zh-cn` min body is **322 chars** and its mean is **2,882** —
    by far the shortest of the eight. The 500-char detection floor (ADR-0007)
    will label some of these `language = null`, exactly the CJK interaction
    already flagged above. Expect it; do not "fix" it.
  - `everystudent-es` has one **100,409-char** document,
    `/articulos/biblia_juan.html` ("El Evangelio de Juan") — the full text of
    John's Gospel on an article URL. Correctly extracted, not chrome, but it is
    4× the next largest and will chunk heavily. Decide at Phase 3 whether a full
    scripture book belongs in this corpus or should be blocked.
  - `everystudent-ja` min body is **841 chars**, the next-shortest after
    `zh-cn`.

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
3. At least 3 real article pages. Determine which selector wraps the body — and
   verify by EXTRACTED TEXT LENGTH using node-html-parser exactly as
   extract.ts does, NOT by grepping for the class name. Every host declares
   .content4 in an inline <style> block, so a grep false-positives every time.

   ⚠️ READ THIS TWICE — it broke 5 of the 8 pilot entries. `contentSelectors`
   is NOT a fallback chain. extract.ts binds the FIRST selector that matches an
   ELEMENT, even when that element extracts 0 characters, and then stops. A
   zero-text match SHADOWS every working selector after it. On most of these
   hosts `.content4` is an empty spacer `<div class="content4"> </div>` (0 ch)
   and `.content4b` does not exist; the real container is `.contentpadding`.
   Listing the shared template "outermost first as fallbacks" makes every page
   extract 0 chars and skip as `too-thin` on an HTTP 200 — silent, and the unit
   tests cannot see it.

   So: measure EVERY candidate and report each one's char count. Then ship
   `contentSelectors` with the SINGLE selector you measured extracting the
   article — not a chain, not the sibling list. If you are tempted to add a
   fallback, don't: state in your report why you think one is needed and let
   the orchestrator decide.
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
- EVERY candidate selector with its measured extracted char count (including
  the zero ones — "`.content4` matched, 0 chars" is a required line), and which
  single one you shipped
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
| 2026-07-29 | `contentSelectors` ships ONE measured selector, never the sibling chain | A zero-text match shadows everything after it (rule 1b). 5 of 8 pilot entries extracted 0 chars because `.content4` — an empty spacer — was listed first. |
| 2026-07-29 | Live-extraction check added to the Phase-1 gate | `--dry-run` fetches nothing and the unit tests are tautological, so neither can see a broken selector. Only running `extractContent` on a real page can. |
| 2026-07-29 | `extract.ts` NOT changed on this branch | Preferring the first text-yielding selector would fix the trap globally but alters extraction for all sources incl. the 3 live in prod. Raised as open question #5. |
| 2026-07-29 | `ro`'s 25 dead URLs hard-blocked, reversing the earlier call | The "self-policing floor" reasoning ignored the `<body>` fallback; the real run staged 25 identical nav pages (rule 1c). 25-branch alternation is the cheap fix. |
| 2026-07-29 | `ja` keeps `.content4` first — deliberately not normalised | It is a genuine container there and carries the category kicker that `.contentpadding` omits (11 ch/page). Switching would lose the kicker on 79 pages to fix 0. Mixed-host caveat documented in the entry. |

## 13. Open questions for the operator

1. **Eval shortlist (§7)** — confirm `es`/`zh`/`ru`/`pt`/`de`/`ja`/`ko` get real
   golden cases and the remaining 41 are `evaluate: deferred`, or name a
   different set. **Does not block Phases 1–4.**
2. **When to fix #128** — before the 48 land, after, or on its own schedule.
3. **The 5 sitemap-less domains** — hand-list seeds from their HTML sitemap
   pages, or defer them out of this campaign entirely?
4. **Make the live-extraction gate a checked-in script?** (New, 2026-07-29.)
   Rule 1b was caught only by hand-running `extractContent` against live pages
   after acquire had already started. With 40 domains still to write, that check
   should be a command — e.g. `pnpm acquire --source <key> --probe`, fetching 2
   discovered URLs and printing extracted char counts per `contentSelector`
   without writing to the database. Small, and it turns the campaign's most
   expensive failure mode into a gate. Needs Jaco's yes before building.
5. **Should `extractContent` skip zero-text matches?** The root cause is that
   `contentSelectors` reads like a fallback chain but is not one. Making the
   loop prefer the first selector yielding text would remove the trap for all 48
   domains — but it changes shared extraction behaviour for **every** source,
   including the three already live in prod. Deliberately NOT done on this
   branch, same reasoning as #128. Worth its own issue.

## 14. Resume hint (cold start)

At: **Phase 1, batch 2.** Batch 1 is fully acquired — 8 sources, **600
documents**, `acquire: green` in `docs/source-status.yaml`, zero duplicates.

Next: spawn 12 agents for the 12 domains listed in §4 using the §10 prompt, wire
`src/registry/index.ts` yourself, then run the full gate **plus the mandatory
live-extraction gate (§6 Phase 1 step 4)** before committing. Do not skip it:
batch 1 passed the old gate with five entries that extracted nothing.

Read rules **1b** and **1c** in §9 before writing any entry — they are the two
defects batch 1 shipped, and both are easy to repeat.

Last verify: **green 2026-07-29** (496 tests · depcruise · lint · typecheck ·
db:check · status:check). Branch: `feat/everystudent-siblings`.
