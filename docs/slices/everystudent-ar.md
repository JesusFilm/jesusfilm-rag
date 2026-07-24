# Slice: EveryStudent — Arabic (everystudent-ar)

_Branch: `slice/everystudent-ar` · Started: 2026-07-25 · Status: in-progress_
<!-- Status: in-progress | blocked | done | deferred (mirrors the RowStatus contract) -->

## Goal (architecture altitude)

Get EveryStudent's **Arabic** banner (everyarabstudent.com) queryable end-to-end:
acquire → ingest → retrieve → spot-check. This is slice #9, the **second walled
source** (Firecrawl, ADR-0012) and the **first Arabic content in the corpus** —
so it is also the first real test of rare-language retrieval since the #17/#75
mechanism was verified.

Scope is the Arabic domain only. `everystudent-fr` (questions2vie.com) is a
separate key and a later slice (ADR-0006, #112).

## Stages & sub-steps

`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 0. Unblock the gate (pre-slice)
- [x] Repair the #17/#75 canary — STATUS.md gated this slice on it   <!-- sha: 55bfd7f -->

### 1. Acquire → raw_documents
- [x] Register `everystudent-ar` (walled, seed-only, 68 seeds) + fakes-only tests   <!-- sha: 04f2d20 -->
- [x] Live Firecrawl crawl of the 68 seeds → `raw_documents` — **67/68 staged**   <!-- sha: 69573a5 -->
- [x] Verify: row count, Arabic article prose (not nav/boilerplate), selectors bound   <!-- sha: 69573a5 -->

**Stage 1 evidence (2026-07-25).** Staged **67 of 68** seeds; the single skip is
`/v/video7.html` (status 200, too-thin — a genuine media stub under
`minContentLength: 250`). 67 rows / 67 distinct `canonical_url` / 0 null-or-empty
titles / 0 non-200 / 0 already-ingested. Chars min 1,239 · avg 6,442 · max
23,906. Sections: **`/a/` 61** (avg 6,806 ch) · **`/v/` 4** (3,278) · **root 2**
(1,661).

**Cost: exactly 68 credits at exactly 1.00 cr/page** (896 → 828). The
tightened-wall risk (5 cr/page, ~340 total) did not materialise — measured live
at 1.10 cr/page over the first 10 pages and settling to 1.00 over all 68.

**Extraction verified** on `/a/answer.html`: a short breadcrumb ("معرفة الله"),
then title, subtitle, then clean article prose, closing on genuine Scripture
footnotes (1 John 5:14, Isaiah 59:1-2, …). `.content4` DOES bind on this host —
#112's shared-template claim holds. Residual chrome is a trailing "شارك مع أخرين"
("Share with others"), a few words at the tail — the same class as the English
sibling's leftover, noted and not re-crawled.

**`/john.html` (1,473 ch) and `/pack.html` (1,849 ch) both cleared
`minContentLength`** and are kept — the provisional call at unpack resolved in
their favour without a wasted credit.

**Language pre-flight (offline, free, before ingest):** `decideLanguage` over all
67 staged bodies predicts **65 `ar` / 2 `null`**, and **0 out-of-declared-set
warnings** — the `languages: ["ar"]` declaration is correct. The 2 nulls are both
`/v/` testimony pages, NOT flagship articles:
  - `/v/gods-help.html` → `ar` at **0.718**, just under the 0.75 gate;
  - `/v/personally.html` → **`ur` at 0.716** — Urdu shares Arabic script, so this
    is script confusion rather than a content problem.
Null rate **3.0%**, well under English's 7.7%, and the unpack-time prediction
(Arabic script is largely unambiguous to tinyld) held. Per standing policy these
two are **excluded from the eval** and otherwise left alone — no sweep, nothing
to fix; the dashboard's null count is the record.

### 2. Ingest → corpus tables
- [x] Drain `raw_documents` → documents / chunks / chunk_embeddings (qwen3)   <!-- sha: 4219cb5 -->
- [x] Verify: 1:1 counts, `documents.language = 'ar'` (invariant 6), idempotent re-run   <!-- sha: 4219cb5 -->
- [x] Report the null-language count as evidence (expected: 2) — no sweep, no fix   <!-- sha: 4219cb5 -->

**Stage 2 evidence (2026-07-25).** Drained all **67 pending → 67 docs / 283
chunks / 283 embeddings** (`qwen/qwen3-embedding-8b`, 1536d) — perfect 1:1, **0
`chunk_count` mismatches**, 67 distinct `canonical_url`, single embedding model.
Chunks/doc avg 4.22 (min 1, max 16). By section: **`/a/` 61 docs / 272 chunks**
(avg 4.46) · **`/v/` 4 / 9** (2.25) · **root 2 / 2** (1.00). Idempotent re-run
drains **0**. **10 transient OpenRouter embed timeouts, all recovered inside the
retry policy** (#64, same as slice #8) — longest chain was 3 attempts; no doc
lost.

**Language (invariant 6) — the offline pre-flight held exactly: 65 `ar` / 2
`null`.** The two nulls are precisely the two predicted `/v/` testimony pages
(`/v/gods-help.html`, `/v/personally.html`) — no new surprises at ingest. This is
the **first Arabic in the corpus** and per-document detection labelled it
correctly off the content, not the URL path or `<html lang>`. Null rate **3.0%**
vs English's 7.7%. Per standing policy these two are excluded from the eval,
left alone, and the dashboard's null count is the record — no sweep.

**Extraction spot-read** (`/a/answer.html`, `ar`): chunk 0 opens with the short
breadcrumb "معرفة الله" then the title "هل يستجيب اللـه لصلواتنا؟" and real
article prose; chunk 2 is mid-body carrying Scripture footnote markers. Genuine
article text, not nav.

**Corpus now: 10 sources / 11,621 docs / 33,937 chunks** (11 null-language docs
total — 9 everystudent en + these 2).

**Latent finding (NOT on the live path, not this slice's to fix):** `chunks.search_tsv`
is `to_tsvector('english', text)` and `keywordSearch` hardcodes
`websearch_to_tsquery('english', …)`. Arabic (and the existing `zh`) get no
useful stemming there. **`keywordSearch` has no caller in the retrieval context**
— the Retriever is pure vector search (invariant 5) — so nothing on the live path
is affected. It only becomes real if hybrid retrieval is ever wired; noted here
so that work starts informed. Predates this slice (`thelife-zh` already sits in
the same tsvector).

### 3. Retrieve → ranked results
- [ ] An Arabic query returns ranked, cited hits from this source
- [ ] `language:"ar"` returns ONLY Arabic; minScore 0.37 re-checked at 10 sources

### 4. Spot-check + eval
- [ ] `/golden everystudent-ar` — Arabic cases with English question translations
      AND translated retrieved-set blocks; `language: ar` pinned on every case
- [ ] Whole-corpus eval; confirm no prior-source regression

## Decisions made (this slice)

- 2026-07-25 — **Own source key, not a language of `everystudent`.** One domain =
  one source (ADR-0006). No operator question needed; follows `thelife-fr`/`-zh`.
- 2026-07-25 — **`fetchStrategy: "firecrawl"`.** Re-probed live: homepage and
  `/sitemap.xml` both 403 with the Cloudflare block-page signature (`Attention
  Required`); only `robots.txt` answers. Same wall as the English sibling.
- 2026-07-25 — **Seed-only, 68 of 84 mapped URLs.** Discovery was already paid
  for via `/v2/map` (#114); re-discovering would re-pay for what we hold.
  Dropped: 11 `/m/*` menu indexes, 4 `/bible/**.pdf` (html-scrape can't read a
  PDF, and it's public-domain Scripture), the bare homepage. Kept `/john.html`
  and `/pack.html` provisionally — `minContentLength: 250` drops them if they're
  link-only chrome.
- 2026-07-25 — **robots.txt is `Allow: /` with no disallows** (checked live),
  unlike everystudent.com which carries a real disallow list. Nothing dropped on
  robots grounds.
- 2026-07-25 — **Null-language docs are EXCLUDED from the eval — standing
  policy, not a decision this slice made.** Nulls are an expected, permanent
  outcome in every source (honest ADR-0007 blanks); we cannot know their
  language, so a `language:`-scoped expectation on one is unreturnable by
  construction. They are never credited, they are never swept during a slice
  (`pnpm lang:sweep` is a **prod** corrective tool), and they are not lost — the
  dashboard carries a per-source null count. Recorded as a standing rule
  2026-07-25 in `.claude/skills/slice` v11, `.claude/skills/golden` v6
  (Guardrail #3a) and `docs/eval-approach.md`, because it had been re-asked at
  every new source. For context, the risk here is small anyway: tinyld reads
  Arabic prose at confidence **1.0 with no runner-up**, versus the 0.605–0.771
  `en`/`hi` confusion behind slice #8's 9 nulls.
- 2026-07-25 — **The #17/#75 canary was a fixture artifact, not an engine
  fault.** Sparse query vectors are not HNSW-reachable at corpus scale (a random
  *dense* vector at cosine 0.068 returns 15 rows; a one-hot at 0.113 returns 0,
  and `ef_search=1000` doesn't rescue it). The shipped `iterative_scan =
  strict_order` mitigation is load-bearing and works: a real `en` query vector
  with a `language='zh'` filter returns 15 rows with it, 0 without. Fixture
  rebuilt on dense vectors; gate green at 426/426, then 432/432.

## Open question / blocker

- none. The Firecrawl spend was approved and is now **done** (68 credits, 828
  remain — `everystudent-fr`'s ~87 still fits this period, which ends
  2026-08-21).

## Notes carried in from #112 / the English slice

- **Cost guard:** measured 1 credit/page on this host (#114). Watch the credit
  delta over the first few pages — if it reads 5 cr/page, Cloudflare has
  tightened; stop and re-plan.
- **Prod promotion is the bulk-copy path, NOT `acquire:production`** — that would
  re-pay Firecrawl. `bash scripts/copy-raws.sh --source everystudent-ar` →
  `pnpm index:production` → `pnpm eval:production`. See `docs/ops/copy-raws.md`.
- **Multilingual eval:** `ar` cases need an English translation of the question
  and a translated retrieved-set block (`AGENTS.md`, `docs/eval-approach.md`),
  and `language: ar` pinned so `caseLanguage()` can derive a scope.
- **Selector claim is unverified on this host.** #112 says `.content4`/`.content4b`
  is shared across all three banners; confirm on the first Arabic fetch.

## Resume hint (for a cold start)

At: Stage 3 — "An Arabic query returns ranked, cited hits from this source".
Acquire and Ingest are both DONE and green (67 docs / 283 chunks / 283 qwen3
embeddings; 65 `ar` + 2 excluded nulls). Next concrete action: run `pnpm query`
with a real Arabic question (e.g. "هل يستجيب الله لصلواتنا؟" — does God answer
our prayers) and confirm ranked, cited hits come back from `everystudent-ar`;
then confirm a `language:"ar"` filter returns ONLY Arabic and re-check that
minScore 0.37 still separates positives from negatives at 10 sources. This is
the first rare-language retrieval since the #17/#75 fixture repair, so the
`iterative_scan = strict_order` mitigation is what's being exercised.
Last verify: green @ 2026-07-25 WITH the new data (depcruise 100/0, lint clean,
typecheck clean, db:check in sync, status:check valid, tests 432/432).
Branch: `slice/everystudent-ar`.
