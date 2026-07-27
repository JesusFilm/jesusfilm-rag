# Slice: EveryStudent — French (everystudent-fr)

_Branch: `slice/everystudent-fr` · Started: 2026-07-27 · Status: in-progress_
<!-- Status: in-progress | blocked | done | deferred (mirrors the RowStatus contract) -->

## Goal (architecture altitude)

Get EveryStudent's **French** banner (questions2vie.com) queryable end-to-end:
acquire → ingest → retrieve → spot-check. This is **slice #10**, the **third and
final walled EveryStudent domain** (Firecrawl, ADR-0012) and the close-out of the
#112 wayfinder route (en ✅ → ar ✅ → fr).

Scope is the French domain only. `everystudent` (en) and `everystudent-ar` are
separate keys and separate, completed slices (ADR-0006).

**What makes this slice different from #9:** French is **not a new language**.
The corpus already holds **159 `fr` docs** — `thelife-fr` 156 · `thelife` 2 ·
`cru` 1 — and **10 French golden cases** (`tlfr-*`, all deriving `fr` from
`thelife-fr`'s declared `["fr"]`, none explicitly pinned). So unlike Arabic:

- **Stage 4 Part A (re-review) is NOT a provable no-op.** The 10 `tlfr-*` cases
  resolve to `fr`, so everystudent-fr docs are **eligible by construction** on
  them and genuine displacement is possible. Expect `fr` per-language coverage
  (currently **0.817**) to MOVE, and re-review the living `relevant` maps before
  suspecting retrieval.
- **French is a MULTI-source language**, so the slice-#9 "relevance-only" gate
  (which exists for single-source languages) does **not** automatically apply.
  Decide the Stage-4 gate on evidence at Stage 4, defaulting to the slice-#7/#8
  two-axis 0.75 rule.

## Stages & sub-steps

`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents
- [x] Register `everystudent-fr` (walled, seed-only, 70 seeds) + fakes-only tests   <!-- sha: 8398995 -->
- [x] Live Firecrawl crawl of the 70 seeds → `raw_documents` — **70/70 staged, 0 skips**   <!-- sha: PENDING -->
- [ ] Verify: row count, French article prose (not nav/boilerplate), `.content4` binds; resolve the `/jean*` + `/aventure` provisional keeps   <!-- sha: ________ -->
- [x] Offline language pre-flight (`decideLanguage` over the staged bodies) — **69 `fr` / 1 `null`**   <!-- sha: PENDING -->

**Stage 1 evidence (2026-07-27).** Staged **70 of 70** seeds — **zero skips**,
the first EveryStudent banner to take every seed (en 117/117 but from a
pre-filtered 149; ar 67/68). 70 rows / 70 distinct `canonical_url` / 0
null-or-empty titles / 0 non-200 / 0 already-ingested / 0 below
`minContentLength`. Chars min 1,718 · avg **9,104** · max 31,558 — the richest
of the three banners (en 7,203, ar 6,442). Sections: **`/a/` 67** (avg 9,416 ch)
· **root 3** (2,141).

**Cost: exactly 70 credits at exactly 1.00 cr/page** (828 → 758). The guard
tripped at 26 pages reading 1.00 cr/page, so the tightened-wall risk (5 cr/page,
~350 total) did not materialise on the third host either. **#112's route is now
fully funded and paid: 758 credits remain**, period ends 2026-08-21.

**Extraction verified** on `/a/101existe.html` ("Dieu existe-t-il ?"): a short
breadcrumb ("Existence de Dieu"), then title, subtitle, byline (Marilyn
Adamson), then clean French article prose, closing on genuine Scripture
footnotes (Jean 8.12, Jérémie 31.3, Apocalypse 3.20). `.content4` **binds on
this host**, confirming #112's shared-template claim on the last of the three
banners. Residual chrome is a trailing "PARTAGER CETTE PAGE:" — a few words, the
same class as the English sibling's leftover and the Arabic "شارك مع أخرين";
noted, not re-crawled.

**Language pre-flight (offline, free, before ingest): 69 `fr` / 1 `null`, 0
out-of-declared-set warnings** — the `languages: ["fr"]` declaration is correct.
**Null rate 1.4% — the lowest of any source** (en 7.7%, ar 3.0%). The single
null is `/a/jesusqui.html` ("Who is Jesus?"), detected `fr` at **0.689**, just
under the 0.75 confidence gate — and, as in slice #8, it is the source's
*largest* document (23,762 ch cleaned), not a thin one, so `DETECTION_FLOOR_CHARS`
is not involved. Per standing policy it is **excluded from the eval** and
otherwise left alone — no sweep; the dashboard's null count is the record.
⚠️ Worth noting for Stage 4: this is a flagship apologetics article, so the
exclusion has the same shape as slice #8's `/wires/loneliness.html` cost.

### 2. Ingest → corpus tables
- [ ] Drain `raw_documents` → documents / chunks / chunk_embeddings (qwen3)   <!-- sha: ________ -->
- [ ] Verify: 1:1 counts, `documents.language = 'fr'` (invariant 6), idempotent re-run   <!-- sha: ________ -->
- [ ] Report the null-language count as evidence — no sweep, no fix (standing policy)   <!-- sha: ________ -->

### 3. Retrieve → ranked results
- [ ] A French query returns ranked, cited hits from this source   <!-- sha: ________ -->
- [ ] `language:"fr"` returns ONLY French, now that **two** French sources compete   <!-- sha: ________ -->
- [ ] Re-check minScore 0.37 at 11 sources — **specifically the faith-adjacent margin** (slice #9 recorded 0.382, only 0.012 above the cutoff, on a Muslim-readership probe; `/a/260islam.html` is in this seed set)   <!-- sha: ________ -->

### 4. Spot-check / eval (`/golden everystudent-fr`)
- [ ] Part A — re-review the 10 existing `tlfr-*` cases' living `relevant` maps (NOT a no-op this time)   <!-- sha: ________ -->
- [ ] Part B — author everystudent-fr-native cases (English translation + translated retrieved-set block, per `docs/eval-approach.md`)   <!-- sha: ________ -->
- [ ] Decide + record the Stage-4 gate (two-axis vs relevance-only) on French's multi-source evidence   <!-- sha: ________ -->
- [ ] Full eval; report whole-corpus, per-language `fr`, and per-source numbers   <!-- sha: ________ -->

## Decisions made (this slice)

- 2026-07-27 — **WALLED → `fetchStrategy: "firecrawl"`** (ADR-0012). Probed live:
  `/robots.txt` answers **200**, but the homepage, `/a/102rien.html` and
  `/sitemap.xml` all return **403** carrying the Cloudflare block-page signature
  (`<title>Attention Required! | Cloudflare</title>`). Same posture as both
  siblings. Classified on the block-page signature, not on a `challenge-platform`
  script reference (which false-positives).
- 2026-07-27 — **Seed-only, 70 of the 87 mapped URLs; `sitemaps` deliberately
  absent.** Discovery was already paid for by `/v2/map` (#114, 1 credit flat,
  inventory preserved as a comment there); re-discovering would re-pay for
  knowledge we already hold. Body = **67 `/a/` articles** + 3 provisional root
  pages. Dropped 17: the bare homepage, **12 `/m/*`** menu/section indexes
  (`enigmes`, `existence`, `experience`, `faq`, `intl`, `jesus`, `lavie`,
  `legales`, `qetr`, `qui`, `relations`, `videos`), `/contact1.html`,
  `/plan.html` (the "plan du site" sitemap page — mirrors the en entry dropping
  `/sitemap.html`), and the two `.php` extension twins `/aventure.php` +
  `/jean.php` (same slug served twice; keeping both would pay a credit for a
  duplicate document the content hash cannot collapse across differing URLs).
- 2026-07-27 — **`/jean.html`, `/jeanFR.html` and `/aventure.html` kept
  provisionally.** Root-level pages the map returned that cannot be classified
  without spending a credit (`jean` = the Gospel of John, mirroring the Arabic
  banner's `/john.html`; `aventure` likely a resource/next-step page). Whether
  `/jeanFR.html` is a genuine variant or a duplicate of `/jean.html` is a
  3-credit question answered at Stage 1, not guessed now; `minContentLength: 250`
  drops any that turn out to be link-only chrome.
- 2026-07-27 — **robots.txt is `User-agent: * Allow: /`** (checked live). Nothing
  disallowed, so no seed dropped on robots grounds — same as `everystudent-ar`,
  unlike `everystudent` (en), which carries a real disallow list. No `block`
  array: `block` filters DISCOVERED urls and a seed-only source discovers none.
- 2026-07-27 — **Language plan: declared `["fr"]`, detected per document.** All
  87 mapped URLs sit under one French banner (`/m/intl.html`, the page linking
  out to sibling languages, is dropped). The stored label still comes from
  content detection at ingest (invariant 6, ADR-0006) — never from this field,
  the URL path, or `<html lang>`. Null-language docs are **expected**, permanently
  **excluded from the eval**, and reported as an observation; `pnpm lang:sweep` is
  a prod-only corrective tool and is not a step in this slice.
- 2026-07-27 — **Prod promotion path is the bulk-copy** (`scripts/copy-raws.sh`
  → `pnpm index:production` → `pnpm eval:production`), **never
  `acquire:production`** — this is a walled source, and re-acquiring in prod would
  re-pay ~70 Firecrawl credits. See `docs/ops/copy-raws.md`.

## Budget

**~70 credits at the measured 1.00 cr/page** (#114 — Firecrawl's `basic` proxy
clears this host, so `auto` never escalates to the 5-credit enhanced retry).
Balance checked live 2026-07-27: **828 remaining of 1,000**, billing period ends
**2026-08-21**. Comfortable — this closes #112's route with ~758 to spare.

⚠️ **Cost guard:** watch the credit delta over the first ~10 pages. If the rate
is 5 cr/page, Cloudflare has tightened (~350 total) — stop and re-plan.

## Open question / blocker

- none

## Resume hint (for a cold start)

At: Stage 1 — "Live Firecrawl crawl of the 70 seeds". Next concrete action: run
`pnpm acquire --source everystudent-fr` against the live site, watching the
Firecrawl credit delta over the first ~10 pages (expect 1.00 cr/page; 5 cr/page
means the wall tightened — stop and re-plan). Then verify row count, French
prose, and whether `.content4` binds on this host.
Last verify: green @ 2026-07-27 (440/440, source registered).
Last commit: (registry). Branch: slice/everystudent-fr.
