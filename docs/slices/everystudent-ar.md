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
- [x] Register `everystudent-ar` (walled, seed-only, 68 seeds) + fakes-only tests   <!-- sha: ________ -->
- [ ] Live Firecrawl crawl of the 68 seeds → `raw_documents` (~68 credits)
- [ ] Verify: row count, Arabic article prose (not nav/boilerplate), selectors bound

### 2. Ingest → corpus tables
- [ ] Drain `raw_documents` → documents / chunks / chunk_embeddings (qwen3)
- [ ] Verify: 1:1 counts, `documents.language = 'ar'` (invariant 6), idempotent re-run
- [ ] Sweep any null-language docs (`pnpm lang:sweep`) BEFORE Stage 4

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
- 2026-07-25 — **Null-language policy: sweep-after-ingest, never
  exclude-from-credits.** Probed tinyld on Arabic prose: returns `ar` at
  confidence **1.0 with no runner-up**, versus the 0.605–0.771 `en`/`hi`
  confusion that produced slice #8's 9 nulls under the 0.75 gate. Nulls should be
  ~zero; residual risk is the 500-char detection floor on thin docs. If any
  appear, sweep them BEFORE Stage 4 — slice #8's excluded nulls were its flagship
  docs and left a case with zero credits.
- 2026-07-25 — **The #17/#75 canary was a fixture artifact, not an engine
  fault.** Sparse query vectors are not HNSW-reachable at corpus scale (a random
  *dense* vector at cosine 0.068 returns 15 rows; a one-hot at 0.113 returns 0,
  and `ef_search=1000` doesn't rescue it). The shipped `iterative_scan =
  strict_order` mitigation is load-bearing and works: a real `en` query vector
  with a `language='zh'` filter returns 15 rows with it, 0 without. Fixture
  rebuilt on dense vectors; gate green at 426/426, then 432/432.

## Open question / blocker

- none — **awaiting operator go-ahead on the ~68-credit Firecrawl spend** before
  the live crawl (896 credits remain; period ends 2026-08-21).

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

At: Stage 1 — "Live Firecrawl crawl of the 68 seeds". Next concrete action: get
the operator's go-ahead on ~68 Firecrawl credits, then run
`pnpm acquire --source everystudent-ar` and verify the staged rows are real
Arabic article prose.
Last verify: green @ 2026-07-25 (depcruise 100/0, lint clean, typecheck clean,
tests 432/432). Last commit: registry entry. Branch: `slice/everystudent-ar`.
