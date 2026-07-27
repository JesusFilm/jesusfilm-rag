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
- [x] Live Firecrawl crawl of the 70 seeds → `raw_documents` — **70/70 staged, 0 skips**   <!-- sha: c542c13 -->
- [x] Verify: row count, French article prose, `.content4` binds; provisional keeps resolved — **all 3 dropped**   <!-- sha: ad1de46 -->
- [x] Offline language pre-flight (`decideLanguage` over the staged bodies) — **69 `fr` / 1 `null`**   <!-- sha: c542c13 -->

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

**Language pre-flight (offline, free, before ingest): 69 `fr` / 1 `null` over
the 70 staged, 0 out-of-declared-set warnings** — the `languages: ["fr"]`
declaration is correct. After the 3 signup-page drops (all of which detected
`fr`) the set carried into ingest is **66 `fr` / 1 `null` of 67**. **Null rate
1.5% — the lowest of any source** (en 7.7%, ar 3.0%). The single
null is `/a/jesusqui.html` ("Who is Jesus?"), detected `fr` at **0.689**, just
under the 0.75 confidence gate — and, as in slice #8, it is the source's
*largest* document (23,762 ch cleaned), not a thin one, so `DETECTION_FLOOR_CHARS`
is not involved. Per standing policy it is **excluded from the eval** and
otherwise left alone — no sweep; the dashboard's null count is the record.
⚠️ Worth noting for Stage 4: this is a flagship apologetics article, so the
exclusion has the same shape as slice #8's `/wires/loneliness.html` cost.

### 2. Ingest → corpus tables
- [x] Drain `raw_documents` → documents / chunks / chunk_embeddings (qwen3) — **67 docs / 418 chunks / 418 embeddings**   <!-- sha: PENDING -->
- [x] Verify: 1:1 counts, `documents.language = 'fr'` (invariant 6), idempotent re-run   <!-- sha: PENDING -->
- [x] Report the null-language count as evidence — no sweep, no fix (standing policy)   <!-- sha: PENDING -->

**Stage 2 evidence (2026-07-27).** All **67 pending rows drained in one pass →
67 documents / 418 chunks / 418 embeddings** — a perfect 1:1, **0 `chunk_count`
mismatches**, and a single embedding model (`qwen/qwen3-embedding-8b`, 1536d).
Chunks/doc min 1 · **avg 6.24** · max 21 — the densest of the three EveryStudent
banners (en 4.70, ar 4.22), consistent with Stage 1's finding that the French
bodies are the richest. **All 67 sit under `/a/`** — confirmation that the 3
dropped signup pages really did leave the corpus. The **idempotent re-run drains
0** (`0 inserted, 0 updated, 0 unchanged, 0 skipped`).

**The offline language pre-flight held EXACTLY at ingest: 66 `fr` / 1 `null`**,
and the null is precisely the predicted document — `/a/jesusqui.html` ("Qui était
Jésus ?"). Per-document detection (invariant 6) labelled every article off the
content, never the URL path or the `["fr"]` declaration. **Null rate 1.5% — the
lowest of any source in the corpus** (en 7.7%, ar 3.0%). Per standing policy the
null is **excluded from the eval**, not swept; the dashboard's null count is the
record.

ⓘ **Why that one document hedged, most likely.** Spot-reading it: it is a
**Scripture-compilation page** — "Ce sont des extraits tirés directement de
l'évangile de Jean, dans la Bible. **Aucun commentaire ajouté.**" Its 14 chunks
are near-entirely quoted Johannine text with no editorial French voice, which is
a plausible reason the detector sat at 0.689 rather than a length problem (it is
the source's *largest* document, so `DETECTION_FLOOR_CHARS` is not involved).
An observation only — no action, per policy.

**Corpus now 11 sources / 11,688 docs / 34,355 chunks** (from 11,621 / 33,937).
**French is now genuinely multi-source: 225 `fr` docs** — thelife-fr 156 ·
**everystudent-fr 66** · thelife 2 · cru 1. everystudent-fr is **29.3% of the
French corpus**, so Stage-4 Part A displacement on the 10 `tlfr-*` cases is a
live possibility, not a theoretical one.

Transient OpenRouter embed timeouts occurred and **all recovered inside the retry
policy** (#64, as in slices #8/#9); **0 permanent failures**. An exact retry
count isn't available — the run's log was captured through `tail -60`, so only
the final stretch was retained (15 retries visible there).

Gate re-run **WITH** the new data: green, **441/441**.

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
- 2026-07-27 — **the 3 provisional root pages are DROPPED; ingest takes the 67
  `/a/` articles and nothing else** (operator fork, resolved on Stage-1
  evidence). `/jean.html`, `/jeanFR.html` and `/aventure.html` all cleared
  `minContentLength` comfortably (1,949 / 2,020 / 2,453 ch) — which is precisely
  why the floor could not decide it: **length is not aboutness**. The fetch
  showed all three are **email-signup landing pages**, not seeker Q&A:
    - `/jean.html` ↔ `/jeanFR.html` share **87.9% of their 12-word shingles** —
      one sign-up page for a Gospel-of-John email study with sentences reordered.
      That is the same band as the 93.8% podcast/article overlap slice #8
      dropped, and the document-level content hash cannot collapse
      near-duplicates living at different URLs.
    - all three close with an **identical 850-char French GDPR privacy notice**
      (Agapé France, loi « informatique et libertés ») — **44% / 42% / 35%** of
      their bodies, and the only text the three share. It would embed as pure
      noise and could match privacy/legal queries.
    - what is left is form copy ("S'inscrire ici", unsubscribe terms).
  The 3 credits are sunk and unrecoverable, but the seeds are removed so a
  re-crawl never re-pays for them, and the 3 rows were deleted from
  `raw_documents` before ingest. Seed set 70 → **67**.
- 2026-07-27 — ⓘ **Observation, NOT actioned by this slice: the Arabic banner's
  `/john.html` and `/pack.html` are the SAME two pages** (the John email study
  and the "Spiritual Adventure" 7-email series), kept in slice #9 on the same
  provisional call and **live in prod today**. The estate is therefore
  inconsistent: French ingests articles only, Arabic carries two signup pages.
  Recorded for a future cleanup — slice #10 deliberately does not touch prod, and
  no issue was filed (operator's call).
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

**~70 credits at the measured 1.00 cr/page** (70 paid; 67 ingested) (#114 — Firecrawl's `basic` proxy
clears this host, so `auto` never escalates to the 5-credit enhanced retry).
Balance checked live 2026-07-27: **828 remaining of 1,000**, billing period ends
**2026-08-21**. Comfortable — this closes #112's route with ~758 to spare.

⚠️ **Cost guard:** watch the credit delta over the first ~10 pages. If the rate
is 5 cr/page, Cloudflare has tightened (~350 total) — stop and re-plan.

## Open question / blocker

- none

## Resume hint (for a cold start)

At: Stage 3 — "A French query returns ranked, cited hits from this source".
Next concrete action: run `pnpm query` with real French questions against the
now-11-source space (e.g. "Dieu existe-t-il ?", "Comment gérer l'anxiété ?"),
then `--language fr` to prove the filter binds with **two** French sources
competing, then re-probe the minScore 0.37 negatives — **specifically the
faith-adjacent margin**, since slice #9 recorded 0.382 (only 0.012 above the
cutoff) and `/a/260islam.html` is in this seed set.
Last verify: green @ 2026-07-27 (441/441, WITH the new data).
Last commit: (this one). Branch: slice/everystudent-fr.
