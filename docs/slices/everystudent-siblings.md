# Campaign: EveryStudent non-walled sibling domains (48 sources) — [#111](https://github.com/JesusFilm/jesusfilm-rag/issues/111)

_Branch: `feat/everystudent-siblings` · Started: 2026-07-28 · Status: in-progress_
<!-- Status: in-progress | blocked | done | deferred -->

> **If you are a fresh agent: read this whole file, then go to "You are here".**
> It is the complete resume contract for this campaign. You need no chat history.
> This is a **campaign file**, not a `/slice` file — do **not** run `/slice` for these
> sources. See "Why not /slice" below; running it 48 times is the exact thing this
> campaign exists to avoid.

---

## 0. Board — OPEN EVERY SESSION WITH THIS

🔴 **Mandatory, both directions.** **Start** every session by rendering §0 back
to the operator as the tables below — that is how Jaco wants the state
delivered, not as prose. **End** every session by regenerating it (§0.1) so the
next one starts from truth. A stale board is worse than none: it is the exact
failure `docs/STATUS.md` hit on 2026-07-17, when a narrative doc reported a
finished cutover as pending.

**Last regenerated: 2026-07-29 (after batch 3)** · **32 of 48 registered ·
31 acquired · 1 deferred · 16 remaining · 1,948 documents · 0 duplicate-content
groups**

### ✅ Acquired (31)

`†` = ships the rule-1e `"html"` fallback + `head` strip.

| Lang | Domain | Docs | Container | | Lang | Domain | Docs | Container |
|---|---|---:|---|---|---|---|---:|---|
| `zh-cn` | xinshengming.com | 128 | `.cb-entry-content` | | `ms` | persoalanhidup.com | 52 | `.contentpadding` |
| `ru` | mirstudentov.com | 95 | `.contentpadding` | | `mk` | studentskiodgovori.com | 49 | `.contentpadding` † |
| `bg` | everystudent.bg | 84 | `.article-content` ⚠️ staging | | `lt` | kiekvienamstudentui.lt | 49 | `html` |
| `sk` | everystudent.sk | 83 | `.entry-content` (Elementor) | | `bn` | everybengalistudent.com | 48 | `.contentpadding` † |
| `hu` | everystudent.hu | 83 | `.contentpadding` | | `zh-tw` | everystudent.com.tw | 46 | `.entry-content` |
| `mn` | tailal.mn | 82 | `html` | | `et` | tudengielu.net | 46 | `.contentleftpadding` |
| `ja` | studentinjapan.com | 79 | `.content4` | | `de` | duentscheidest.com | 45 | `.contentpadding` |
| `pl` | kazdystudent.pl | 77 | `.contentpadding` | | `th` | everythaistudent.com | 44 | `.contentpadding` † |
| `sq` | pyetjetejetes.com | 77 | `html` | | `hr` | vrlovazno.com | 41 | `.contentpadding` † |
| `es` | cadaestudiante.com | 76 | `.contentpadding` | | `am` | habeshastudent.com | 41 | `.contentpadding` † |
| `fa` | everypersianstudent.com | 75 | `.contentpadding` | | `it` | ognistudente.com | 38 | `.post-content` (WP) |
| `pt` | suaescolha.com | 75 | `.contentpadding` | | `ko` | everykoreanstudent.com | 37 | `html` |
| `cs` | everystudent.cz | 74 | `.content` ⚠️ IPv6 flag | | `ur` | zindagikaysawalat.com | 33 | `.contentpadding` † |
| `tr` | tanriyitanimak.com | 71 | `.contentpadding` | | `el` | everystudent.gr | 32 | `#content4` † ⚠️ `http://` |
| `vi` | everyvietstudent.com | 67 | `.contentpadding` | | | | | |
| `ro` | everystudent.ro | 64 | `.contentpadding` | | | | | |
| `id` | mahasiswakeren.com | 57 | `.contentpadding` † | | | | | |

### 🅿️ Deferred (1)

| Lang | Domain | Expected | Why |
|---|---|---:|---|
| `sr` | studentskikutak.com | 76 | Written, wired, gate-passed. Network blackhole → **[#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129)**. Do NOT add `/etc/hosts`. |

### ⬜ Not started — reachable sitemap (11)

⚠️ These URL counts are **2026-07-24 recon, not measurements** — `sk` was listed
at 44 and turned out to be 83 (rule 12). Verify per host.

| Lang | Domain | URLs | | Lang | Domain | URLs |
|---|---|---:|---|---|---|---:|
| `hi` | everystudent.in | 40 | | `ne` | nepalistudent.net | 28 |
| `ta` | ungalthervuenna.com | 40 | | `ka` | kovelistudenti.com | 25 |
| `te` | everytelugustudent.com | 39 | | `kk` | shakirtter.com | 25 |
| `my` | everymyanmarstudent.com | 38 | | `sw` | lipotumaini.com | 21 |
| `sl` | vsakstudent.com | 30 | | `he` | igod.co.il | 5 |
| `om` | everybarataa.com | 29 | | | | |

### ⬜ Not started — no XML sitemap (5) · **recon done 2026-07-29, see §15**

| Lang | Domain | HTML map | Articles | Route |
|---|---|---|---:|---|
| `ru-ca` | studentstan.com | `/m/karta.html` | 87 | seeds |
| `lv` | katramstudentam.lv | `/lv/lapas-karte/` | 49 | ⛔ robots |
| `uk` | svitstudentiv.com | `/m/sitemap.html` | 47 | seeds |
| `hy` | 1patasxan.com | `/m/sitemap.html` | 37 | seeds |
| `ti` | everytemhari.com | `/sitemap.html` | 14 | seeds |

### 0.1 How to regenerate this board

Counts come from the **database**, never from memory or from this file's prose.

```bash
docker exec jesusfilm-rag-db psql -U jesusfilm_rag -d jesusfilm_rag -c "
  select source_key, count(*) docs
  from raw_documents
  where source_key like 'everystudent-%'
    and source_key not in ('everystudent-ar','everystudent-fr')
  group by 1 order by 2 desc;"
```

`everystudent`, `-ar` and `-fr` are the three WALLED banners and are **not** part
of this campaign — exclude them or the totals will not match.

Then: move any newly-acquired row from a ⬜ table into ✅, update the counts line,
stamp "Last regenerated", and confirm the totals add to 48.

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

- ✅ **Batch 1 (pilot, 8 sources) — DONE.** Written, wired, acquired.
- ✅ **Batch 2 (12 sources) — DONE.** 11 acquired (782 docs); `sr` deferred.
- ✅ **Batch 3 (12 sources) — DONE.** `sk` `id` `ms` `mk` `lt` `bn` `th` `hr`
  `am` `it` `ur` `el`. All 12 written, wired, gated and **acquired locally
  (567 documents)**, commit `0e8b1e9`. **11 of 12 staged 100% with ZERO skips**;
  `it` lost one page to a transient `fetch-failed` on the first run and
  **recovered on re-run** (the same shape as `cs` in batch 2). Zero
  duplicate-content groups across all 33 everystudent keys.
- 🅿️ **`sr` is DEFERRED, not pending — see below. Do not try to acquire it.**
- ⏭️ **NEXT: Phase 1, batch 4** — the **last 11** sitemap-reachable domains
  (§0), then the 5 sitemap-less ones per §15. **Do NOT run `pnpm index` yet** —
  indexing happens ONCE, after all 48 are acquired (Phase 3).

**Progress: 32 of 48 registry entries written. 31 of 48 acquired
(1,948 documents). 1 deferred (`sr`). 16 remaining.**

### What batch 3 changed that a fresh agent must know
1. **Rule 1e is new and it REVERSES earlier advice.** `contentSelectors` may now
   carry a trailing `"html"` (plus `head` in `stripSelectors`). It is measured
   inert on healthy pages and rescues articles whose markup is broken. **Do not
   block a page for a `<!DOCTYPE html>` leak any more** — three real articles
   were nearly lost that way.
2. **§8's URL counts are recon, not measurements** (rule 12). `sk` was listed at
   44 and is 83, because `/sitemap.xml` there is a 2014 fossil and the live one
   is `/sitemap_index.xml`. Check for a sitemap index and a generation date.
3. **Sitemaps may publish `http://`** (rule 13) — `^https://` in `allow` would
   discover zero. `--dry-run` catches it, but check first.
4. **The estate has nine generators, not seven** (rule 2). `it` is a third
   WordPress theme with a third container; `el` uses `#content4` as an **ID**.

### 🅿️ `everystudent-sr` — deferred to [#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129), do NOT work around it

`studentskikutak.com` is DNS-blackholed to `203.0.113.250` (TEST-NET-3) from
Jaco's network. Both port-53 paths return the blackhole — including
`dig @1.1.1.1` — while Cloudflare and Google **DoH** both return the true
`50.28.103.165`. That signature is transparent port-53 interception on the local
gateway; **the domain resolves fine on the public internet.**

The entry is correct and its gate passed (offline, against curl-fetched bytes:
19,095 / 4,733 / 21,022 chars). What is unresolved is a judgement call Jaco
raised on 2026-07-29:

> If our own network filters this host, can we confidently list it as a
> publicly available retrieval source?

⚠️ **An `/etc/hosts` line was considered and DELIBERATELY REJECTED.** It makes
the acquire succeed while leaving that question unanswered and bakes a
machine-specific workaround into a corpus meant to hold publicly retrievable
sources. **Do not add one.** If a future agent finds this and thinks "easy fix",
it is not — read #129 first.

Status: `deferred` in `docs/source-status.yaml`, with the full reason in its
`note`. Still wired into `SOURCES` (the entry is sound); #129 decides whether it
acquires on the VM at Phase 7, or comes out of `SOURCES` entirely. Expected
yield if unblocked: **76 documents**.

### ⚠️ One environment gotcha that is NOT a code defect

1. **`cs` needs an IPv6 workaround.** `everystudent.cz` publishes an AAAA
   record (`2001:1ab0:7e1e:151:62:109:154:30`) that is unreachable from here.
   `curl` silently falls back to IPv4; **Node's `fetch` does not** and dies
   `ETIMEDOUT`. Every `cs` command needs:
   ```bash
   NODE_OPTIONS=--no-network-family-autoselection pnpm acquire --source everystudent-cs
   ```
   `--dns-result-order=ipv4first` alone is NOT enough — undici's Happy Eyeballs
   still tries v6. Verified 2026-07-29 on Node v24.3.0.
2. **Do not run `pnpm test` while an acquire is writing to Postgres.** One
   integration test went red mid-run and was green immediately after. This is
   the §6 Phase-3 warning showing up early — the suite queries the live DB.

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
- Pilot was **8**. Reviewable in volume — but **5 of the 8 shipped a broken
  container** (rule 1b) and the review did not catch it, because the thing to
  check was not in the diff. Size is not the risk; the missing gate was. Do not
  read "the pilot went fine" into this file — it did not.
- **Batch 2 onward: 12**, with the §6 step-4 live-extraction gate as the
  backstop. **Run twice now — batches 2 and 3 — and it held both times.**
  Batch 3: 12 concurrent agents, zero scratch collisions, 12 clean entries,
  0 refusals, and every key passed the extraction gate first time. Keep 12.
- Save the **5 sitemap-less domains for last** — they need a different discovery
  route and will not fit the standard agent prompt.

### What batch 3 proved about the prompt
The §10 prompt is doing real work and should not be trimmed. Feeding the agents
the *corrections* (rules 1b–1d, the rule-4 correction, the scripture policy)
rather than just the original advice produced measurably better entries:
- **Every one of the 12 reported its zero-char measurements**, including the
  required "`.content4` matched, 0 chars" line. The shadow trap was live on 9 of
  the 12 hosts and not one agent shipped it.
- **Three found things the recon table had wrong** — `sk`'s dead 2014 sitemap,
  `el`'s `http://` scheme, `ms`'s `<html lang="id">` on a Malay site.
- **Language checks were quantitative, not impressionistic.** `hr` counted
  tko 126 / ko 0 with word boundaries (and explicitly warned that naive
  substring counts give the *opposite* answer); `mk` counted ќ/њ/ѓ/љ/ѕ against
  zero Serbian ђ/ћ and zero Bulgarian ъ/щ; `am` separated Amharic from Tigrinya
  on the genitive prefix; `ur` separated Urdu from Persian/Arabic on ٹ/ڈ/ڑ/ے.

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
   extracted 0 chars.

   This script is what caught it. **Copy it verbatim** — it must live INSIDE the
   repo (the `@/` alias and ESM `type: module` only resolve there); a scratchpad
   path fails with "Top-level await is not supported with the cjs output format".
   Put it at `.tmp-diag/audit-selectors.ts`, add `.tmp-diag/` to
   `.git/info/exclude`, and delete it before committing.

   ```ts
   import { parse } from "node-html-parser";
   import { HttpFetcher } from "@/adapters/http-fetch/http-fetcher.js";
   import { extractContent } from "@/acquisition/extract.js";
   import { discoverUrls } from "@/acquisition/discover.js";
   import { SOURCES } from "@/registry/index.js";

   async function main() {
     const fetcher = new HttpFetcher();
     const keys = process.argv.slice(2);
     const targets = SOURCES.filter(
       (s) => keys.length === 0 || keys.includes(s.key),
     );
     for (const entry of targets) {
       console.log(`\n=== ${entry.key} (${entry.domain}) ===`);
       let urls: string[] = [];
       try {
         const d = await discoverUrls({ fetcher }, entry.crawl);
         urls = d.urls.slice(0, 2);
         console.log(`  discovered ${d.urls.length} URLs`);
       } catch (e) {
         console.log(`  discovery FAILED: ${String(e)}`);
       }
       if (urls.length === 0) {
         const seeds = entry.crawl.seedPaths ?? [];
         urls = seeds.slice(0, 2).map((p) => new URL(p, entry.crawl.baseUrl).href);
       }
       for (const url of urls) {
         const res = await fetcher.fetch(url);
         if (res.status !== 200 || !res.body) {
           console.log(`  ${url} -> status ${res.status}`);
           continue;
         }
         const root = parse(res.body);
         // Print EVERY candidate's char count — a 0-char match that binds first
         // is exactly the failure you are looking for (rule 1b).
         const parts = entry.crawl.contentSelectors.map((sel) => {
           const el = root.querySelector(sel);
           return `${sel}=${el ? el.structuredText.trim().length : "MISS"}`;
         });
         const out = extractContent(res.body, entry.crawl);
         const verdict =
           out.text.length < entry.crawl.minContentLength ? "TOO-THIN" : "ok";
         console.log(
           `  ${verdict.padEnd(9)} final=${String(out.text.length).padStart(6)}  [${parts.join("  ")}]  ${url}`,
         );
         await new Promise((r) => setTimeout(r, 800));
       }
     }
   }
   void main();
   ```
   Run: `npx tsx .tmp-diag/audit-selectors.ts everystudent-<code> …`
   (no args = every source; the three walled banners will show 403, which is
   expected — they are Firecrawl-fetched and not part of this campaign).

   **Every new key must print `ok`.** A `TOO-THIN` line means the container is
   wrong (rule 1b) — fix the entry, do not proceed to acquire.
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

**Batch 1 (8) — ACQUIRED locally 2026-07-28.** `acquire: green` in
`docs/source-status.yaml`. **599 documents** (was 600; `es` lost one row to the
2026-07-29 scripture policy), zero duplicate-content groups.
"Container" is the selector that actually extracts (see rule 1b):

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `es` | cadaestudiante.com | 153 | 77 | **76** | `.contentpadding` |
| `zh-cn` | xinshengming.com | 146 | 129 | **128** | `.cb-entry-content` (WordPress) |
| `ru` | mirstudentov.com | 105 | 95 | **95** | `.contentpadding` |
| `ro` | everystudent.ro | 102 | 65 | **64** | `.contentpadding` |
| `ja` | studentinjapan.com | 94 | 81 | **79** | `.content4` ⚠️ mixed host |
| `pt` | suaescolha.com | 74 | **75** | **75** | `.contentpadding` |
| `de` | duentscheidest.com | 72 | 45 | **45** | `.contentpadding` |
| `ko` | everykoreanstudent.com | 48 | 37 | **37** | `html` (broken markup) |

Skip accounting — every one checked, none is a defect:
- `es` 1 · `/articulos/discipulos.html` is a genuine 164-char stub (title +
  subhead only). ⚠️ A **second** `es` document was removed on 2026-07-29:
  `/articulos/biblia_juan.html` (100,409 ch, the complete Gospel of John) is now
  blocked under the estate-wide scripture policy and its row was deleted. The
  entry's own test was updated — it had asserted that URL was *kept*, as its
  example of an underscore slug passing the hint, and it was the only underscore
  slug on the host.
- `zh-cn` 1 · `/a/pack3.html`, from the "adventure/pack" email series.
- `ro` · the 25 dead redirects are now **hard-blocked** (rule 1c), so discovery
  resolves 65 rather than 90. The single remaining skip is
  `/v/filmuliisus.html`, a transcript-less video embed. 64 = the ~64 this file
  predicted all along. ⚠️ The **first** run — before the block — staged 89, of
  which 25 were byte-identical junk; those rows were deleted from
  `raw_documents`. If you ever re-run `ro`, the block prevents their return.
- `ja` 2 · `/a/jes4.html` (220 ch, under the floor) and `/a/Bible215.html` (an
  interactive quiz page with no content container). Both correctly dropped.
- `pt` 75/75 · the 13 pinned `seedPaths` unioned with the 62 discovered exactly
  as designed — the stale-sitemap patch works.

**Batch 2 (12) — written and wired 2026-07-29; 11 ACQUIRED, `sr` deferred (#129).**
**782 documents**, zero duplicate-content groups. Commit `9a0fec3` (+ a follow-up
for `bg` and the scripture policy).

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `hu` | everystudent.hu | 95 | 83 | **83** | `.contentpadding` |
| `bg` | everystudent.bg | 95 | 84 seeds | **84** | `.article-content` ⚠️ staging |
| `mn` | tailal.mn | 105 | 82 | **82** | `html` ⚠️ +11 seeds |
| `sq` | pyetjetejetes.com | 131 | 78 | **77** | `html` |
| `pl` | kazdystudent.pl | 90 | 77 | **77** | `.contentpadding` |
| `sr` | studentskikutak.com | 84 | 76 | **— deferred #129** | `.contentpadding` |
| `fa` | everypersianstudent.com | 107 | 75 | **75** | `.contentpadding` |
| `cs` | everystudent.cz | 97 | 100 | **74** | `.content` ⚠️ Yii app |
| `tr` | tanriyitanimak.com | 102 | 71 | **71** | `.contentpadding` |
| `vi` | everyvietstudent.com | 76 | 67 | **67** | `.contentpadding` |
| `et` | tudengielu.net | 77 | 46 | **46** | `.contentleftpadding` |
| `zh-tw` | everystudent.com.tw | 70 | 46 | **46** | `.entry-content` |

Skip accounting — every one checked, none is a defect:
- **9 of the 11 acquired staged 100% with ZERO skips.** Only `cs` and `sq` differ.
- `cs` 26 · dead event stubs (`movie_night`, `plazovy_volejbal`, `rip`, …), all
  extracting the same 25-char "Nenalezeny žádné záznamy." Left unblocked
  deliberately: `.content` binds, so there is no `<body>` fallback and the floor
  genuinely catches them. Their ids interleave with live articles.
- `cs` 1 fetch-failed on the **first** run (`/in/73/je_bible_duveryhodna`, a
  genuine article) — a timeout on that slow PHP host, **recovered on re-run**.
  This is why the entry ships `requestDelayMs: 2000`.
- `sq` 1 · `/a/gjoni.html` blocked under the scripture policy (see §12).
- `mn` +11 · the XML sitemap omits 11 live articles the site's own map links —
  a 13.4% blind spot, pinned as `seedPaths`. `cs` similarly pins 17 (a whole
  section, `/19/zivot_s_bohem`, absent from the sitemap). `sr` pins 7.

**Batch 3 (12) — written, wired and ACQUIRED 2026-07-29.** **567 documents**,
zero duplicate-content groups. Commit `0e8b1e9`. Note the "Sitemap" column is
what was actually measured, which is **not** what the recon table above said for
`sk`:

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `sk` | everystudent.sk | **103** (recon said 44) | 80 + 3 seeds | **83** | `.entry-content` ⚠️ WordPress + Elementor |
| `id` | mahasiswakeren.com | 67 | 57 | **57** | `.contentpadding` |
| `ms` | persoalanhidup.com | 61 | 51 + 1 seed | **52** | `.contentpadding` |
| `mk` | studentskiodgovori.com | 65 | 48 + 1 seed | **49** | `.contentpadding` |
| `lt` | kiekvienamstudentui.lt | 60 | 49 | **49** | `html` ⚠️ 2 broken articles |
| `bn` | everybengalistudent.com | 57 | 47 + 1 seed | **48** | `.contentpadding` |
| `th` | everythaistudent.com | 52 | 43 + 1 seed | **44** | `.contentpadding` |
| `hr` | vrlovazno.com | 54 | 41 | **41** | `.contentpadding` |
| `am` | habeshastudent.com | 50 | 40 + 1 seed | **41** | `.contentpadding` |
| `it` | ognistudente.com | 50 | 38 | **38** | `.post-content` ⚠️ WordPress |
| `ur` | zindagikaysawalat.com | 42 | 33 | **33** | `.contentpadding` |
| `el` | everystudent.gr | 43 | 32 | **32** | `#content4` ⚠️ `http://` sitemap |

Skip accounting — every one checked, none is a defect:
- **11 of the 12 staged 100% with ZERO skips.** Only `it` differs.
- `it` 1 · `/fede/` returned `fetch-failed` on the **first** run and
  **recovered on re-run** (38/38). A transient network error, the same shape as
  `cs`'s first-run timeout in batch 2. Not a defect and no entry change needed.
- 7 seeds pinned across 5 hosts, each a live article missing from the XML
  sitemap: `sk` 3 (parts II–IV of a four-part series Yoast lists only part I of),
  `ms` 1, `mk` 1 (linked from 16 articles, in neither map), `am` 1, `th` 1.
  `bn`'s seed is an orchestrator decision, not an agent find — see §12.
- Two pages blocked under the scripture policy: `ms` `/a/300siapakah.html`
  (28,213 ch, abridged John, "no added commentary") and `bn` `/a/whowas.html`
  (22,236 ch, complete John — **and the only page on that domain carrying a
  third-party licence**, New Living Translation © Tyndale House Foundation).
- ⚠️ `sk`'s shortest document is **478 chars**, under ADR-0007's 500-char
  detection floor, so it may store `language = null`. Expected; see the
  ingest-stage notes.

**Remaining with reachable sitemaps (11)** — suggested batch order, largest first.
⚠️ **These counts are 2026-07-24 recon, NOT measurements** — see rule 12:

| Lang | Domain | URLs | | Lang | Domain | URLs |
|---|---|---|---|---|---|---|
| `hi` | everystudent.in | 40 | | `ne` | nepalistudent.net | 28 |
| `ta` | ungalthervuenna.com | 40 | | `ka` | kovelistudenti.com | 25 |
| `te` | everytelugustudent.com | 39 | | `kk` | shakirtter.com | 25 |
| `my` | everymyanmarstudent.com | 38 | | `sw` | lipotumaini.com | 21 |
| `sl` | vsakstudent.com | 30 | | `he` | igod.co.il | 5 |
| `om` | everybarataa.com | 29 | | | | |

⚠️ **`ka` (kovelistudenti.com) has no shared-template selectors** per #111 — the
one remaining host flagged as an outlier. Expect a tenth generator.
⚠️ **`he` (igod.co.il) yields only ~5 articles** — check whether it earns a
source key at all before writing the entry, same question as `ti` in §15.

**~~`sk` needs care~~ — RESOLVED 2026-07-29, and the warning was wrong.**
`everystudent.sk` is **not** the Czech Yii app; it is WordPress + Elementor, and
`.content` matches 0 of its pages. Measured 8-gram overlap between the `.cz` and
`.sk` estates is **0.00%** across all 94 Slovak bodies — Czech and Slovak
translations of one English original share no 8-grams. The single exception is
`.cz` `/in/163/koronavirus_jak_prekonat_strach` ↔ `.sk` `/uzkost-a-strach/` at
**60.1%**, which confirms that page was lifted *from* everystudent.sk. `cs`
neither discovers nor seeds it, so **there is no live duplicate risk** and
leaving it out of `cs` remains correct.

**~~`hr` and `mk` are Serbian's neighbours~~ — RESOLVED 2026-07-29, both are
genuinely distinct.** `hr` is Croatian Ijekavian in Latin script (tko 126 / ko 0
under word boundaries — the exact mirror of `sr`'s ko 201 / tko 0), with 8 Cyrillic
codepoints on the entire site and **no parallel script tree**. Shingle overlap with
`sr` on same-topic articles is **0.4–0.9%** — independent translations. `mk` is
Macedonian Cyrillic (99.05%), proven on the alphabet: ќ ×1,433, њ ×745, ѓ ×422,
љ ×273, ѕ ×17, against **zero** Serbian-only ђ/ћ and **zero** Bulgarian-only
ъ/щ/ю/я. Also no parallel tree. **No duplicate-content decision needed for either.**

⚠️ **Word-boundary counting matters here.** `hr`'s agent noted that naive
substring counts give the *opposite* answer — `vreme` scores 75 inside Croatian
"suvremen"/"istovremeno", and `ko` scores 1,354 inside "kako"/"tko". Both drop to
0 under `(?<!\p{L})…(?!\p{L})`. Anyone re-running a Slavic language check must
use word boundaries.

**No reachable sitemap (5) — recon DONE 2026-07-29, see §15.** Route decided:
**hand-listed seeds from each site's own HTML map, NOT Firecrawl** — 4 of the 5
are bare Apache serving 200, so there is no wall to pay for. ~234 documents.

`ru-ca` studentstan.com (87) · `lv` katramstudentam.lv (49) ·
`uk` svitstudentiv.com (47) · `hy` 1patasxan.com (37) ·
`ti` everytemhari.com (14).

⛔ **`lv` is blocked on RIGHTS, not on crawlability** — its `robots.txt`
disallows `ClaudeBot` by name and declares `Content-Signal: ai-train=no`. §15
has the full text and the recommendation (ask Cru, don't out-engineer it).

**Known outliers already flagged by #111:** `cs` (everystudent.cz) uses
`.content .content-13` / `.main`, not the shared template — **done, batch 2**;
the stable half is `.content` (`content-13` is the article id). `ka`
(kovelistudenti.com) has no shared-template selectors either — **still
unwritten**, and the only remaining host #111 flagged. Expect a tenth generator.

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
   every article was skipped as `too-thin` on an **HTTP 200**. Fixed 2026-07-28 by
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

   ⚠️ **CORRECTED 2026-07-29 — it is not "two hosts", it is MOST of them.**
   `<body>` is absent from the parsed tree on `ja`, `ko`, `sq`, `mn`, `vi`, and
   on individual pages of `hu`, `fa` and `sr`. So `?? root` — the *document*
   fallback — is the normal path on this estate, not the exception. What it
   returns is the WHOLE document including a literal `<!DOCTYPE html>` text
   node, not the tidy nav blob this rule originally described. Two agents
   (`sq`, `vi`) hit that artifact independently.

1d. **⚠️ CORRECTED 2026-07-29 — `.contentpadding` is NOT a safe default either.**
   Rule 1b reads as "`.content4` is the trap, `.contentpadding` is the fix". That
   is wrong. On `pyetjetejetes.com` (`sq`) **`.contentpadding` matches 52 of 78
   pages and extracts 0 chars on every one**, while `.content4` matches 78/78
   at 0 chars and `<body>` is absent entirely — the only container is `html`.
   There is **no selector that is safe by default anywhere on this estate.**
   Measure every candidate on every host, every time.
1e. **✅ THE FIX for rules 1b–1d, found in batch 3 — append `"html"` LAST.**
   Rules 1b–1d all describe the same wound: `extract.ts` binds the first
   selector that matches an ELEMENT, and when nothing matches it falls to
   `?? root`, which returns the whole document **including a literal
   `<!DOCTYPE html>` text node**. Batch 3 found the cheap, safe remedy:

   ```ts
   contentSelectors: [".contentpadding", "html"],   // "html" is ALWAYS last
   stripSelectors:   ["head", …],                   // drops the duplicate <title>
   ```

   Why this is safe, and why it does **not** contradict rule 1b:
   - Rule 1b warns against an **unmeasured selector placed FIRST**. A trailing
     entry is the opposite — nothing follows it, so it can shadow nothing.
   - It is only ever consulted when the primary misses. **Proven:** all 24
     batch-3 gate probes returned values *byte-identical* before and after the
     change. The fallback is completely inert on healthy pages.
   - `<html>` is a real element, so it carries **no doctype text node** — it
     strictly dominates `?? root`.
   - `head` is not inside the primary container, so it strips 0 chars on
     healthy pages and only fires on the fallback path. Safe because
     `extract.ts` reads the title from `root` at **line 43**, BEFORE the strip
     loop at **line 52**.

   **Precondition — check it per host:** the primary must have **zero
   matched-but-empty pages**. If the primary can match at 0 chars (rule 1d,
   `sq`), the fallback never fires and the page is lost anyway; that host needs
   `["html"]` outright, as `lt` ships.

   ⚠️ **This changes what "block the broken page" is worth.** Three batch-3
   agents blocked genuine articles solely because of the doctype artefact —
   `th` `/a/300whatislife.html` (10,449 ch), `lt` `/m/istorija.html`
   (20,148 ch), `bn` `/a/followup.html` (3,255 ch). All three now extract
   clean. **Do not block a page for a doctype leak; add the fallback instead.**
   `bn` had even blocked one page while keeping another with the identical
   defect.

2. **There is no single shared template.** Measured across all 32 registered
   siblings (updated 2026-07-29 after batch 3):
   - **`.contentpadding` (18)** — `es` `ru` `ro` `pt` `de` `pl` `hu` `tr` `vi`
     `fa` `sr` `id` `ms` `mk` `bn` `th` `hr` `am`. `.content4` is an empty
     0-char spacer on essentially all of them.
   - **`html` (4)** — `ko` `sq` `mn` `lt`. On the first three a malformed
     `sitelevel_noindex` pops the element stack and takes `<body>` with it
     (rule 4). On `lt` it is two individual articles instead — one closing an
     `<h2>` with `</h1>`, one with an unclosed `<span>`.
   - **`.content4` (1)** — `ja` only, and even there the spacer shape appears on
     some pages (see the entry's mixed-host note).
   - **`#content4` (1)** — `el`, where **`content4` is an ID, not a class**.
     `.content4` matches nothing there. One character between working and a
     silent zero — and the sibling selector list would have produced exactly the
     0-char failure of rule 1b.
   - **`.cb-entry-content` (1)** — `zh-cn`, WordPress (Chosen theme).
   - **`.entry-content` (2)** — `zh-tw`, WordPress (Enfold/Avia), and `sk`,
     WordPress + **Elementor**. Same selector, two unrelated themes.
   - **`.post-content` (1)** — `it`, WordPress (`sight2016`). **A third
     WordPress theme with a third container** — one WP host never predicts
     another. All seven catalogued containers are absent from `it` entirely.
   - **`.contentleftpadding` (1)** — `et`, an older hand-rolled layout. None of
     the `.content4`-family selectors exist on it **at all**, not even as
     spacers. Inheriting the sibling list here would have missed on all four and
     silently ingested 46 articles with nav+sidebar+footer attached.
   - **`.article-content` (1)** — `bg`, an Angular build with Pagefind search.
   - **`.content` (1)** — `cs`, a bespoke Yii PHP app. #111's
     "`.content .content-13`" hint was one element's class attribute;
     `content-13` is the article id, so the stable half is `.content`.
     ⚠️ **`sk` is NOT this app despite the sibling domain** — it is WordPress,
     and `.content` matches 0 of its pages. See rule 12.

   That is **nine distinct generators**. The "shared EveryStudent template" is
   a minority case; #111's "one crawl policy + a handful of bespoke" is
   optimistic by a wide margin. Assume per-host verification every time, and
   never copy a sibling's selector list.

   ⚠️ **The estate may be mid-migration.** `bg`'s sitemap carries hreflang
   alternates naming **49 other EveryStudent hosts**, and `bg` alone is on a new
   Angular platform. If it is the pilot of a platform-wide rebuild, container
   selectors recorded here have a shelf life — re-verify rather than trusting
   this table on a host you have not measured yourself.
3. **Sitemaps here are stale and cannot be trusted as the source of truth.**
   - `suaescolha.com`: sitemap listed 62 articles, the site's own `/mapa.html`
     lists **75**. Pure discovery would have silently dropped **17%** of the
     source. Fix: pin the missing ones in `seedPaths` — `acquire.ts` unions seeds
     with discovered URLs.
   - `everystudent.ro`: **25 of 85** article URLs 301 to the homepage. They are
     now **hard-blocked by URL** — see rule 1c, which reversed an earlier and
     wrong "the floor will drop them" decision. **Expect ~64 docs, not 102. A
     shortfall is not a failure.**
   - **Always cross-check the sitemap against the site's own HTML sitemap page**
     (`/mapa.html`, `/sitemap.html`, `/plan.html`, `/m/sitemap.html`).
4. **`sitelevel_noindex` is a custom ELEMENT, not a class** (hence no leading dot
   in the entries — that is correct, not a typo).

   ⚠️ **CORRECTED 2026-07-29 — it is NOT malformed on every host.** This rule
   previously claimed the malformation was universal. Six batch-2 hosts measured
   the opposite: on `pl`, `hu`, `tr`, `vi`, `fa` and `et` the tag is
   **well-formed and already contains the share widget**, making
   `.shareiconsmenupg` a **0-char no-op**. Those entries keep the selector as a
   cheap drift guard and say so honestly rather than claiming it strips.
   **#128 is host-specific, not estate-wide** — cite it only where measured.

   Where it IS malformed the damage is worse than "doesn't contain the widget":
   on `mn` the tag opens at line 176 and closes at 202, *inside*
   `.contentpadding` and before the article starts at 212, which pops the
   element stack and destroys `#content4`, `.contentpadding` **and** `<body>`.
   That is the mechanism behind every `["html"]` host (`ko`, `sq`, `mn`).

   Where it is malformed, strip **`.shareiconsmenupg`** explicitly.
   Measured inside `.contentpadding` on 2026-07-28: it removes 83 ch (`ru`),
   102 (`ro`), 109 (`de`), 148 (`es`), 154 (`pt`) — real chrome, so keep it. It
   does **not** exist at all on `studentinjapan.com` (`ja`), where the site's
   marker is an HTML comment no selector can target.
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
12. **⚠️ NEW (batch 3) — the recon table in §8 can be reading a DEAD sitemap.**
    `everystudent.sk` was listed at "44 URLs". That number came from
    `/sitemap.xml`, which is a **2014 fossil** (`generated-on="July 21, 2014"`).
    The live sitemap is Yoast's **`/sitemap_index.xml` with 103 URLs**, and the
    real yield is **83 documents, not 44**. Of the fossil's 27 unique slugs, 23
    now 301 onto URLs already in the live set and 4 are 404 — listing it would
    stage duplicates at old permalinks.

    **So: always check for `/sitemap_index.xml` and read the sitemap's own
    generation date before trusting §8's count.** §8's numbers are recon from
    2026-07-24 and are a starting hypothesis, not a measurement.

    The same host also disproved its own §8 warning: `sk` is **not** the Czech
    Yii app. It is WordPress + Elementor, and 8-gram overlap against all 94
    Slovak bodies is **0.00%** — Czech and Slovak translations of one English
    original share no 8-grams. The single exception
    (`/in/163/koronavirus_jak_prekonat_strach`, 60.1%) is the page `cs` already
    excludes, which confirms it was lifted *from* everystudent.sk.
13. **⚠️ NEW (batch 3) — sitemaps may publish `http://`, and discovery does not
    normalise the scheme.** `everystudent.gr`'s `<loc>`s are all
    `http://www.everystudent.gr/…`. `discover.ts:95-98` filters the **raw
    `<loc>` string**, so the `^https://` pin every sibling uses would have
    discovered **ZERO URLs**. Use `^https?://` unless you have checked.

    The `--dry-run` gate catches this (0 resolved is a hard failure), so it
    cannot ship silently — but you will waste a cycle. Check the sitemap's
    scheme when you write the `allow` regex.

    **Downstream consequence, recorded not solved:** `acquire.ts:47` stores
    `canonicalUrl: normalizeUrl(url)` from the URL **as discovered**, not the
    final URL after redirect, and `normalizeUrl` lowercases the protocol but
    never rewrites `http`→`https`. So `el`'s documents are stored under `http://`
    URLs. Deterministic today; but the dedup key is `(sourceKey, canonicalUrl)`,
    so **if that host ever republishes its sitemap as `https://`, a re-acquire
    creates 32 duplicate documents rather than updating.** See §13 #9.
14. **⚠️ NEW (batch 3) — `*/` inside a docstring code span TERMINATES the
    comment.** `everystudent-it.ts` documented its blocked category indexes as
    `` `/category/*/` `` inside the JSDoc header. The `*/` closed the comment
    block 80 lines early and turned the rest of the file into code — 20
    typecheck errors, none of which named the real cause. Write
    `` `/category/<slug>/` `` instead. Cheap to hit, cheap to fix, confusing to
    diagnose: the first error points at a line that is fine.
15. **Cloudflare's PRESENCE is not a wall — classify on the block-page
    signature.** Batch 3 met it three ways and none needed Firecrawl:
    `mahasiswakeren.com` is Cloudflare-fronted and passed all 67 pages;
    `vrlovazno.com` serves a **Turnstile CAPTCHA** on two mail-form pages and
    still returned HTTP 200 with full HTML to plain `curl`;
    `katramstudentam.lv` (§15) is Cloudflare **and** disallows us by name, which
    is a rights problem, not a technical one. Reinforces the #114 correction —
    test the response, not the CDN header.

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
  2026-07-28 acquire — Node's `fetch` handled both correctly.)
- **Measured after batch-1 acquire (2026-07-28), to watch at Phase 3:**
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
- BLOCK the homepage, nav/menu indexes, and ANY sitemap URL you find redirecting
  (301/302) to the homepage. ⚠️ Never argue "minContentLength will drop it".
  When no contentSelector matches, extract.ts does NOT return empty — it falls
  back to <body> and returns the whole nav page, typically 800+ chars, well over
  the 250 floor. A sibling shipped 25 unblocked dead URLs on that reasoning and
  staged 25 byte-identical copies of its homepage. If you do not want a page,
  block it by URL. Report any redirecting URLs you find with the exact list.

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
- **[#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129)** (new,
  2026-07-29) — whether `everystudent-sr` is a listable retrieval source at all,
  given our own network blackholes it. Blocks only `sr`. **The fix is NOT an
  `/etc/hosts` line** — see §4.

## 12. Decisions made

| Date | Decision | Why |
|---|---|---|
| 2026-07-28 | Campaign file, not 48 `/slice` runs | Only acquisition is per-source; ingest/eval are already bulk. ~300 operator gates avoided. |
| 2026-07-28 | Fan out on registry authoring only | It is the sole per-source unit with no shared state. |
| 2026-07-28 | Discovery mode over hand-listed seeds | Sitemaps reachable, plain HTTP free. Seeds used only to patch stale sitemaps. |
| 2026-07-28 | Branch `feat/everystudent-siblings` off `origin/main` | New work; `slice/everystudent-fr` was already merged upstream. |
| 2026-07-28 | #128 kept out of this branch | Keeps the 48-source PR reviewable. |
| 2026-07-28 | Batch 2 sized at 12 | Pilot of 8 was comfortably reviewable. |
| 2026-07-28 | `contentSelectors` ships ONE measured selector, never the sibling chain | A zero-text match shadows everything after it (rule 1b). 5 of 8 pilot entries extracted 0 chars because `.content4` — an empty spacer — was listed first. |
| 2026-07-28 | Live-extraction check added to the Phase-1 gate | `--dry-run` fetches nothing and the unit tests are tautological, so neither can see a broken selector. Only running `extractContent` on a real page can. |
| 2026-07-28 | `extract.ts` NOT changed on this branch | Preferring the first text-yielding selector would fix the trap globally but alters extraction for all sources incl. the 3 live in prod. Raised as open question #5. |
| 2026-07-28 | `ro`'s 25 dead URLs hard-blocked, reversing the earlier call | The "self-policing floor" reasoning ignored the `<body>` fallback; the real run staged 25 identical nav pages (rule 1c). 25-branch alternation is the cheap fix. |
| 2026-07-28 | `ja` keeps `.content4` first — deliberately not normalised | It is a genuine container there and carries the category kicker that `.contentpadding` omits (11 ch/page). Switching would lose the kicker on 79 pages to fix 0. Mixed-host caveat documented in the entry. |
| **2026-07-29** | **Scripture is excluded estate-wide** | Five hosts carry full Bible text and were being handled three different ways in one PR. `everystudent-ar` already set the precedent for its `/bible/**.pdf`: "public-domain Scripture text rather than ministry writing — outside what this corpus answers from." Applied uniformly: `et` `mn` `fa` already blocked; **`sq` `/a/gjoni.html` (98,887 ch) and `es` `/articulos/biblia_juan.html` (100,409 ch) newly blocked**, and the `es` row deleted from `raw_documents`. `et`'s chapters were additionally © Eesti Piibliselts — a third-party rights holder our `rights` line would misattribute. |
| **2026-07-29** | **`bg` ingested despite being a pre-launch staging site** | Operator call. Cru owns the property. All automated signals say keep out (`Disallow: /`, `noindex` header + meta, staging canonicals). Recorded prominently in the entry so nobody "fixes" it later. |
| **2026-07-29** | **`bg` is SEED mode, not discovery** | Its 84 article `<loc>`s all name `staging.everystudent.bg`. Discovery would stamp a staging host into `canonical_url` — the dedup key — for all 84 documents, needing a rewrite at launch. `www` serves the identical pages at 200, so the paths are hand-listed against a `www` baseUrl. Precedent for seed-only: `everystudent-ar`. |
| **2026-07-29** | Batch 2 sized at 12, and it held | 12 concurrent agents, no scratch collisions (per-agent subdirectories worked), 11 clean entries + 1 correct refusal. Reviewable. Keep 12 for batch 3. |
| **2026-07-29** | `bg`'s agent was right to STOP and write nothing | It hit a robots `Disallow: /` and a staging canonical and escalated instead of shipping. That is the behaviour the prompt asks for; the recon it returned made the entry a 20-minute write once the operator decided. |
| **2026-07-29** | **Batch 3 sized at 12, and it held again** | 12 concurrent agents, zero scratch collisions, 12 clean entries, 0 refusals. Second consecutive clean run at 12. Keep 12 for batch 4. |
| **2026-07-29** | **`contentSelectors` may carry a trailing `"html"` — rule 1e** | Orchestrator call. Rule 1b forbids an *unmeasured selector FIRST*; a trailing entry shadows nothing, and `<html>` beats `extract.ts`'s implicit `?? root` because it carries no `<!DOCTYPE html>` text node. Proven inert: all 24 batch-3 gate probes returned **byte-identical** values before and after. Applied to the 8 hosts whose primary has zero matched-but-empty pages, with `head` added to `stripSelectors`. |
| **2026-07-29** | **Three articles un-blocked that had been dropped over the doctype artefact** | `th` `/a/300whatislife.html` (10,449 ch), `lt` `/m/istorija.html` (20,148 ch), `bn` `/a/followup.html` (3,255 ch, pinned as a seed). All verified extracting clean under rule 1e. `bn` had blocked one page while KEEPING another with the identical defect — the calls contradicted each other. Losing a real article to avoid 15 cosmetic characters is the wrong trade. |
| **2026-07-29** | **`lt` `/m/istorija.html` exempted from the blanket `/m/` block** | Every sibling blocks `/m/` as navigation. Before reversing that here, the `/m/` namespace was probed on `ru`, `pl`, `hu` and `tr`: **nothing above 3,589 ch**, and the only two over 3k are a sitemap page and an "about us". So `lt`'s 20,148-ch testimony page is a genuine one-off, **not** content the blanket block has been quietly eating across 20 sources. No systemic loss to fix. |
| **2026-07-29** | **`sr` deferred, and the `/etc/hosts` workaround explicitly rejected** | Jaco's call, reversing the earlier "add a hosts entry" decision. A host our own network filters cannot be listed as a publicly available retrieval source on the strength of a machine-local override — the workaround would hide the question rather than answer it. Tracked in [#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129). Note the domain IS publicly resolvable (both DoH providers return the real IP); what needs deciding is why our gateway blackholes it. |

## 13. Open questions for the operator

**Answered 2026-07-29:** scripture policy (now §12), `bg` (ingested, §12),
`sr` network route (hosts entry, §4).

1. **Eval shortlist (§7)** — confirm `es`/`zh`/`ru`/`pt`/`de`/`ja`/`ko` get real
   golden cases and the remaining 41 are `evaluate: deferred`, or name a
   different set. **Does not block Phases 1–4.** Batch 2 added 11 more languages,
   **10 of them entirely new to the corpus** (`sq` `fa` `mn` `tr` `cs` `hu` `pl`
   `et` `vi` `bg`) — for those, Stage-4 Part A is a provable no-op. Only `zh`
   (from `zh-tw`) lands in an existing language, and it makes that label
   **three-way ambiguous** (see #6).

   **Batch 3 adds 12 more, and ALL TWELVE are new to the corpus** — `sk` `id`
   `ms` `mk` `lt` `bn` `th` `hr` `am` `it` `ur` `el`. Stage-4 Part A is a
   provable no-op for every one (`corpus-search-store.ts` applies a strict
   `eq(documents.language, …)`, so no existing golden case can resolve to them).
   Running total after batch 3: **31 acquired sources across 30 distinct
   language labels** (`zh-cn` and `zh-tw` share `zh`). Existing golden cases
   cover only `ar` `fr` `en` `es` — so of this campaign's 30 labels, **exactly
   one (`es`) has any golden case today.** That is the scale that makes the
   question real: the "everything else is `evaluate: deferred`" half of the
   proposal now covers **~23 languages**, not a handful.

   ⚠️ One nuance for the shortlist: `it` (Italian) and `el` (Greek) are widely
   read and might deserve real golden cases even though they are new labels;
   `am` `bn` `ur` `th` `mk` `lt` are the ones nobody here can curate. Worth
   splitting the decision by *who can read it*, not by *is it new*.
2. **When to fix #128** — before the 48 land, after, or on its own schedule.
   Note the scope shrank: batch 2 measured `sitelevel_noindex` **well-formed** on
   6 of 11 hosts, so #128 is host-specific (rule 4, corrected).
3. ~~**The 5 sitemap-less domains**~~ — **ANSWERED 2026-07-29, see §15.**
   Hand-listed seeds from each site's own HTML map; **no Firecrawl** (4 of 5 are
   bare Apache serving 200 — there is no wall to pay for). ~234 docs.
   **One residual decision for Jaco: `lv` (katramstudentam.lv).** Its
   `robots.txt` disallows `ClaudeBot` and `CloudflareBrowserRenderingCrawler` by
   name and declares `Content-Signal: ai-train=no,use=reference`. Recommendation
   is to ask Agape Students Latvia (a Cru partner) rather than crawl it. Needs a
   yes/no from you; everything else in §15 is unblocked.
4. **Make the live-extraction gate a checked-in script?** (2026-07-28.) It has
   now been hand-rebuilt from this file **twice**. It caught nothing in batch 2
   — because the agents were told to measure — but it is what *proves* that,
   and it took two extra variants this round (an IPv6 flag for `cs`, an
   offline file-based run for `sr`). Strong candidate for
   `pnpm acquire --source <key> --probe`. Still needs Jaco's yes.
5. **Should `extractContent` skip zero-text matches?** Unchanged, and batch 2
   strengthens the case: `sq` proved even `.contentpadding` can be the zero-char
   shadow (rule 1d), so there is no selector ordering that is safe by
   convention. Still deliberately NOT done on this branch.
6. **NEW — `zh` is now a three-way collision.** `thelife-zh` (uwota.com,
   Simplified), `everystudent-zh-cn` (Simplified) and `everystudent-zh-tw`
   (Traditional) all declare `zh`. Language-filtered retrieval cannot separate
   Traditional from Simplified. Recorded, not solved. `ru` / `ru-ca` will do the
   same when `studentstan.com` lands.
7. **NEW — the repo does not enforce `robots.txt` at all.** The `robots_cache`
   table, the `RobotsEntry` port and both its implementations exist, but **no
   caller in `src/acquisition/` invokes them** — verified 2026-07-29 — while
   `docs/architecture.md:150` declares Acquisition "Owns: … robots (RFC-9309
   longest-match, fail-open)". So that line is aspirational. It surfaced here
   because `bg` serves `Disallow: /` and `sq` disallows a real article path
   (`/a/ungjillin2.html`, blocked by URL by hand as the only thing that would
   honour it). **Deserves its own issue, not this branch** — same reasoning as
   #128.

8. **NEW (batch 3) — do film-transcript pages belong in this corpus?** Same
   shape as the scripture question you settled on 2026-07-29: a content-scope
   call, not a technical one. The "Falling Plates" / video-narration page exists
   estate-wide and agents keep deciding it one host at a time:

   | Source | Page | Extracted | Call | Measured reason |
   |---|---|---:|---|---|
   | `pl` | `/wideo.html` | ~60 one-line captions | blocked | nav URL, chunks badly |
   | `ru` | `/m/vid.html` | — | blocked | nav URL |
   | `sr` | `/a/tanjiri.html` | 33 ch | blocked | stub |
   | `hr` | `/a/razbijeni-tanjuri.html` | 1,321 ch | **kept** | paragraph prose, in both maps |
   | `am` | `/a/plates.html` | 953 ch | **kept** | flagged: ~40 lines, chunks poorly |
   | `id` | 2 pages | ~205 ch/block | **kept** | indistinguishable from articles |
   | `mk` | 3 pages | 1,326–2,098 ch | **kept** | `pl`'s stated reason measured false here |
   | `th` | 8 `-video` twins | 0.1–78.2% overlap | **kept** | below the 87.9% near-dup band |

   The principle each agent applied is consistent — keep paragraph prose, drop
   caption fragments and stubs — and the pages genuinely differ, so this is not
   sloppiness. But it recurs across the remaining 16 domains and is worth one
   ruling. **Exposure is ~1–8 documents per host.** Not blocking.
9. **NEW (batch 3) — should `normalizeUrl` canonicalise the URL scheme?**
   `everystudent.gr` publishes `http://` sitemap URLs, and nothing in the
   acquire path rewrites them (rule 13), so its 32 documents store `http://`
   canonical URLs. The dedup key is `(sourceKey, canonicalUrl)`, so if that host
   ever republishes as `https://`, a re-acquire **creates 32 duplicates instead
   of updating**. The fix is one line in `normalize-url.ts` — but it changes the
   dedup key for **every** source including the three live in prod, so it is the
   same shape as #5 and deliberately NOT done on this branch. Deserves its own
   issue.
## 14. Resume hint (cold start)

### Repo state, exactly
- Branch **`feat/everystudent-siblings`**, tracking `origin/main`.
- **Unpushed commits — read them, do not trust a number written here.**
  ```bash
  git log --oneline origin/main..HEAD
  ```
  ⚠️ This file previously hardcoded the count and it went stale **three times in
  one session** — every commit invalidates it, including the commit that
  updates it. Do not reintroduce a number. The commits are self-describing;
  the command above is the source of truth.

  The campaign's own history, oldest first, as anchors that will not change:
  `6e7f492` batch-1 entries · `2807832` state file + #128 ·
  `6a31631` container fixes + batch-1 acquire · `4cbd1d2` cold-start contract ·
  `9a0fec3` batch-2 entries (11 domains) ·
  `9c60b40` `bg` + estate-wide scripture policy ·
  the docs commits recording batch 2, the `sr` deferral (#129), and §0 ·
  `0e8b1e9` batch-3 entries (12 domains) · then this file's batch-3 update.
- **Nothing is pushed and there is no PR** — that is Phase 6, after all 48 land.
  Do not open one early.
- Working tree clean apart from an untracked `.playwright-mcp/` (unrelated).
- Local Postgres container `jesusfilm-rag-db` on port 5434 must be running.
  Query it with:
  `docker exec jesusfilm-rag-db psql -U jesusfilm_rag -d jesusfilm_rag -c "…"`
- Last full gate: green **2026-07-29**, re-run AFTER the batch-3 acquire —
  depcruise · lint · typecheck · db:check · status:check · **650 tests**
  (was 575 before batch 3, 496 before batch 2).

⚠️ **Dates in this file and in the registry docstrings are the dates the work was
MEASURED** — `2026-07-28` for batch 1 (matching `6a31631`), `2026-07-29` for
batch 2. Cross-check against `git log` and they will agree.

### Where the work stands
**Batches 1, 2 and 3 are all through Phase 2, with one exception.**
31 sources acquired locally, **1,948 documents**, **zero duplicate-content
groups across all 33 everystudent keys**, `acquire: green` recorded for each.
Per-source counts and full skip accounting: §8.

**All three batches are COMPLETE.** Nothing is half-finished.
`everystudent-sr` is **deferred by decision, not left undone** — see §4 and
[#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129). Do not try to
acquire it, and specifically do not add an `/etc/hosts` line; that workaround
was considered and rejected on purpose.

Nothing has been indexed — Phase 3 runs ONCE, after all 48 are acquired.

### Do this next — batch 4 (the last of the sitemap-reachable domains)
0. **Render §0's board back to Jaco as your opening message.** He asked for the
   state as tables, not prose. Regenerate the counts from the DB first (§0.1) —
   do not retype what §0 currently says without checking it.
1. **Read §9 rules 1b, 1c, 1d, 1e, 4, 12 and 13 before writing any new entry.**
   **Rule 1e is new from batch 3 and REVERSES earlier advice** — a trailing
   `"html"` in `contentSelectors` is now sanctioned and blocking a page over a
   `<!DOCTYPE html>` leak is not. Rules 12–13 are also new: §8's URL counts are
   recon that has been wrong by 39 documents, and a sitemap may publish
   `http://`. Rule 1d still stands: there is **no** safe default container.
2. **Only 11 sitemap-reachable domains remain**, so batch 4 is the last standard
   one. Spawn one agent each with the §10 prompt (12 concurrent has now run
   cleanly twice); give each its own scratch subdirectory.
   ⚠️ Watch `ka` (kovelistudenti.com) — #111 says it has no shared-template
   selectors, so expect a tenth generator. ⚠️ `he` (igod.co.il) yields ~5
   articles; ask whether it earns a key at all, as with `ti` in §15.
3. Wire `src/registry/index.ts` yourself — agents must not touch the barrel.
4. Full gate → `--dry-run` per key → the **mandatory live-extraction gate**
   (§6 Phase 1 step 4). Batch 1 passed the first two with five entries that
   extracted nothing; only the third catches that. Batches 2 and 3 passed all
   three, which is what makes their 782 + 567 documents trustworthy.
5. Commit, then Phase 2 (§6) including the duplicate-content SQL.
   ⚠️ **Re-run the full gate AFTER the acquire too**, not just after the code
   change — integration tests query the live Postgres.
6. **Regenerate §0's board before you finish** (§0.1). This is the last step of
   every session, not an optional tidy-up.
7. Then the **5 sitemap-less domains** per §15 (hand-listed seeds, no
   Firecrawl), which closes Phase 1–2 and unlocks Phase 3.

**Expect an agent to refuse occasionally, and treat that as success.** `bg`'s
agent wrote nothing and escalated a robots `Disallow: /`; that was correct, and
its recon made the entry a short write once Jaco decided. (Batch 3 had zero
refusals — all 12 hosts were plain and open.)

### Waiting on Jaco (none of it blocks batch 4)
**Nine** open questions in §13. Answered on 2026-07-29: the scripture policy,
`bg`, and `sr` (deferred → #129). Still open — the eval shortlist (#1), #128
timing (#2), the 5 sitemap-less domains' `lv` rights call (#3), the `--probe`
flag (#4), the `extractContent` root-cause fix (#5), the three-way `zh`
collision (#6), the fact that **robots.txt is not enforced anywhere in the
acquire path** (#7), **whether film-transcript pages belong in the corpus (#8,
new)** and **whether `normalizeUrl` should canonicalise the URL scheme (#9,
new)**. #7 and #9 each deserve their own issue.

---

## 15. The 5 sitemap-less domains — recon and route (2026-07-29)

Answers open question #3. **All five were probed live**; nothing here is
inferred from the other 43.

### Verdict: hand-listed seeds. **Do NOT use Firecrawl.**

**Firecrawl solves a bot wall, not a missing sitemap.** They are different
problems and the campaign has conflated them before. ADR-0012 makes Firecrawl a
per-source opt-in for hosts whose *bytes* are unreachable to plain HTTP; a
missing `sitemap.xml` is a *discovery* problem, and discovery has a cheaper
answer these sites already provide — their own HTML map page.

Measured 2026-07-29: **4 of 5 are bare Apache serving HTTP 200** to a plain
request with a full Chrome UA. Not one returns a Cloudflare challenge or block
page. Spending Firecrawl credits here would buy nothing.

The pattern is already proven twice in this estate — `everystudent-ar`
(68 hand-listed seeds) and `everystudent-bg` (84). Both are seed-only: no
`sitemaps` field, and therefore no `block` array, because the seed list IS the
filter.

| Lang | Domain | Server | HTML map | Articles | Route |
|---|---|---|---|---:|---|
| `ru-ca` | studentstan.com | Apache | `/m/karta.html` | 87 | seeds |
| `uk` | svitstudentiv.com | Apache | `/m/sitemap.html` | 47 | seeds |
| `hy` | 1patasxan.com | Apache | `/m/sitemap.html` | 37 | seeds |
| `ti` | everytemhari.com | Apache | `/sitemap.html` | 14 | seeds |
| `lv` | katramstudentam.lv | Cloudflare | `/lv/lapas-karte/` | 49 | ⛔ see below |

~234 documents in total — roughly one normal batch.

### Per-host notes

- **`hy` `ru-ca` `uk` `ti`** — the standard FreeFind/Apache banner, same family
  as batch 1–2. `robots.txt` is 404 on `hy`, `ru-ca` and `uk` (no rules exist);
  200 on `ti`. Harvest the HTML map, then **verify every harvested URL with a
  HEAD sweep before seeding** — `sr` taught us that a map can list dead URLs,
  and `mn`/`cs` that a map can hold articles the XML never had.
- **`ru-ca` (studentstan.com)** is the largest at 87 and will collide with `ru`
  (mirstudentov.com) on the `ru` language label — the same ambiguity as `zh`
  (§13 #6). Record it; do not try to solve it here.
- **`ti` (everytemhari.com)** yields only ~14 articles. Cheap, but check whether
  it is worth a source key at all before writing the entry.

### ⛔ `lv` (katramstudentam.lv) — a RIGHTS blocker, not a technical one

Do not treat this as "the hard one to crawl". Technically it is easy: the
apex serves a **meta-refresh** to `/lv/` (which `curl -L` does not follow —
that is why it first looked empty/JS-rendered, and it is neither). Behind it is
ordinary server-rendered HTML, 43 internal links on the homepage and a
`/lv/lapas-karte/` map listing 49 article-shaped pages.

The blocker is what its `robots.txt` says. Fetched live 2026-07-29:

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: ClaudeBot                       Disallow: /
User-agent: GPTBot                          Disallow: /
User-agent: CCBot                           Disallow: /
User-agent: Google-Extended                 Disallow: /
User-agent: CloudflareBrowserRenderingCrawler   Disallow: /
… (also Amazonbot, Applebot-Extended, Bytespider, meta-externalagent)
```

Three things follow, and they matter:

1. **`ClaudeBot` is disallowed by name.**
2. **`CloudflareBrowserRenderingCrawler` is disallowed by name** — that is
   precisely the class of headless renderer Firecrawl belongs to. Reaching for
   Firecrawl here would not be a neutral technical choice; it would be
   circumventing a preference the operator wrote down explicitly.
3. **`Content-Signal: ai-train=no, use=reference`.** There is a genuine reading
   under which *this* corpus is permitted — we do retrieval with attribution,
   which is `reference`, not `ai-train`. That reading may well be right. **It is
   still not an agent's call to make**, and it does not override the explicit
   `ClaudeBot Disallow`.

**Recommendation:** do not crawl `lv`. The site is Agape Students Latvia — a Cru
partner — so the cheap, correct route is to **ask them for the content or for
permission**, not to out-engineer their robots file. If the answer is no, drop
`lv` from the 48 and record it `deferred` with the reason.

⚠️ Note this is the second host in this campaign whose robots policy we can only
honour by hand, because **the acquire path does not read `robots.txt` at all**
(§13 #7). `sq` needed a manual URL block for the same reason. That gap is now
load-bearing twice over.
