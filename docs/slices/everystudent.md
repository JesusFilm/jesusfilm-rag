# Slice: EveryStudent — English (everystudent)

_Branch: `slice/everystudent` · Started: 2026-05-25 (blocked) · Restarted: 2026-07-24 · Status: in-progress_
<!-- Status: in-progress | blocked | done | deferred (mirrors the RowStatus contract) -->

## Goal (architecture altitude)

Get **everystudent.com (English)** queryable end-to-end: acquire → ingest →
retrieve → eval. This is the first slice to acquire a **walled** source — the
per-source work is a registry entry plus driving the existing pipeline, with
`fetchStrategy: "firecrawl"` (ADR-0012) as the only new thing under it.

**Scope is one domain.** ADR-0006 makes one domain = one source key, so the
Arabic (`everyarabstudent.com`) and French (`questions2vie.com`) banners are
**separate keys and separate later slices**, not part of this one. Planned in
[#112](https://github.com/JesusFilm/jesusfilm-rag/issues/112).

## Language plan

1. **Domains → source keys.** everystudent.com → `everystudent` (this slice) ·
   everyarabstudent.com → `everystudent-ar` · questions2vie.com →
   `everystudent-fr`. Three domains, three keys, three slices — the
   `thelife` / `thelife-fr` / `thelife-zh` pattern. Not a judgment call.
2. **Declared language set: `["en"]`.** All 167 mapped URLs on this domain are
   English (#114); the international siblings live on their own domains, and
   `/menus/intl.html` — the page that links out to them — is blocked as an
   index page. This is the *expected* set, a cross-check only.
3. **Language is detected per document at ingest** from the content
   (`ingestion/detect-language.ts`), never from `languages[0]`, the URL path, or
   `<html lang>` (architecture invariant 6, ADR-0006 / #68).

## Stages & sub-steps

`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents

- [x] Correct the stale `blocked — needs a JS-capable fetcher` claims in this file, `sources.md`, and `source-status.yaml` (all predate #109); document the conditional `FIRECRAWL_API_KEY` in `.env.example`.   <!-- sha: efcafd5 + this -->
- [x] **Cost-guard probe (3 credits, 1016 → 1013).** Both assumptions were wrong, in opposite directions — see "Decisions made". Rate re-confirmed at **1 credit/page** (3 pages, 3 credits).   <!-- sha: 0fde91a -->
- [x] Add the `everystudent` `SourceEntry`: `fetchStrategy: "firecrawl"`, hand-listed `seedPaths` (**117**, lifted from #114 — **never re-map**), `.content4`/`.content4b` selectors + a chrome-tuned strip list. Wired into `SOURCES`; tests split into `everystudent.test.ts` (the §5.5 300-line cap, following `cru.test.ts`).   <!-- sha: 0fde91a -->
- [x] Live `pnpm acquire --source everystudent` → **117/117 staged, zero skips**, 117 credits (1013 → 896) at a measured **1.00 cr/page**. All status 200, 0 null titles, 117 distinct URLs. Chars min 507 / avg 7,203 / max 22,711.   <!-- sha: 0673cf9 -->

### 2. Ingest → corpus tables

- [x] Live `pnpm index --source everystudent` → **117 docs / 550 chunks / 550 embeddings** (`qwen/qwen3-embedding-8b`, 1:1, 0 chunk_count mismatches); idempotent re-run drains 0. Language detected per document: **108 `en` · 9 `null`** — see the Stage 2 evidence below.   <!-- sha: 99e9696 -->

### 3. Retrieve → ranked results

- [ ] Live `pnpm query` → ranked, cited hits from everystudent; cross-source health (does it complement or displace the 8 existing sources on shared seeker topics?); confirm `minScore 0.37` still separates positives from negatives.   <!-- sha: ________ -->

### 4. Eval + spot-check

- [ ] `/golden` content-grounded Stage 4: re-review existing cases' living `relevant` maps (expect prior-source numbers to MOVE — usually up), then author persona-diverse everystudent-native cases. Two-axis gating: relevance ⊥ biblical soundness, both at 0.75.   <!-- sha: ________ -->
- [ ] Whole-corpus `pnpm eval` → per-source + per-language coverage; write `eval/results-YYYY-MM-DD.md`; re-confirm `minScore`.   <!-- sha: ________ -->
- [ ] Spot-check representative queries; record results in `sources.md` (→ Evaluated).   <!-- sha: ________ -->

**Out of this slice:** prod promotion via the #115 bulk-copy path (acquire local
→ ingest + eval local → copy `raw_documents` with `id`/`ingested_at` omitted →
`index:production`). It happens *after* Stage 4, on a separate operator
go-ahead. **Never run `acquire:production` for this source** — that re-pays
Firecrawl.

## Decisions made (this slice)

- 2026-05-25 — Source = **EveryStudent**, leanest remaining of the short list. _(Superseded in scope: the slice now covers the English domain only.)_
- 2026-05-25 — **Seed sourcing = hand-curate.** Still true, for a new reason: #114 already paid to enumerate the site via `/v2/map`, so re-discovering it would cost credits for nothing.
- 2026-07-24 — **Hand-listed `seedPaths`, not a sitemap discovery crawl.** `/sitemap.xml` is 403 to plain HTTP, and the 167-URL inventory from #114 is preserved. Discovery through Firecrawl would re-pay for knowledge we already hold.
- 2026-07-24 — **149 seeds from the 167 mapped.** Dropped: the homepage, `/contact.php`, `/donate`, `/quiz`, `/sitemap.html`, the bare `/podcasts` index, 10 `/menus/*` index pages, and `/features/search.html` + `/podcasts/search.html`. Kept `/videos/jobsearch.html` (a real article that only *looks* like a search page). No robots-disallowed path appears in the mapped set.
- 2026-07-24 — **`/podcasts/*` (32) DROPPED as duplicates — the probe's real finding.** The worry was that podcasts/videos were media stubs. They are not: both carry full transcripts. But a `/podcasts/` page is the *read-aloud of an article that already exists* — `/podcasts/loneliness.html` is "LISTEN TO ARTICLE: What to Do with Loneliness" and shares **93.8% of its 12-word shingles** with `/wires/loneliness.html`. 18 of the 32 share an exact article slug; most of the rest are renames (`whowas` ↔ `who-was-jesus`, `isthere` ↔ `is-there-a-god`, `political-views` ↔ `the-politics-of-jesus`). Keeping them would have spent 32 credits to add 32 near-duplicate documents that the doc-level content hash cannot collapse — the same near-duplicate problem slice #4 hit with Sightline's annually-republished devotionals. **149 → 117 seeds.**
- 2026-07-24 — **`/videos/*` (17) KEPT.** Genuine unique testimony transcripts, not stubs: `/videos/lacey-sturm.html` is a ~4.1k-char first-person account with no article twin. ⚠️ The few with a `-video` suffix (`know-God-video`, `kindness-of-god-video`) may echo their article counterpart — not probed; check at Stage 4.
- 2026-07-24 — **Strip list tuned beyond boilerplate.** `sitelevel_noindex` (the site's own no-index wrapper around share links + related-article cards) and `.fccell` (the "FEATURE CLOSE" CTA table — "I just asked Jesus into my life…" — appended verbatim to every article). Measured: −359 chars on an article, −275 on a video, articles now ending cleanly on their own last line. This is the slice-#2 accordion-TOC citation-quality problem fixed at the source rather than discovered at eval.
- 2026-07-24 — **No `block` array.** It would be dead config: `block` filters *discovered* URLs and a seed-only source discovers none. robots.txt compliance is enforced by a test over `seedPaths` instead.
- 2026-07-24 — **Funded from the personal Firecrawl account** (Free tier; 1,016 credits confirmed live, cycle ends 2026-08-21). ~117 credits for this domain (after the podcast drop), ~292–338 for all three — roughly 3× headroom, no upgrade (#116). Prod resolves its key via docker secret pull, never `.env`.

## Stage 1 evidence (Acquire — GREEN 2026-07-24)

`raw_documents` for `everystudent`: **117 rows / 117 distinct canonical_url**,
all status 200, 0 null titles. Content chars min 507 · avg 7,203 · max 22,711.
Spot-read across three page shapes returned real article prose, no Cloudflare
interstitial. Cost: **117 credits, exactly 1.00/page** (1,013 → 896) — the
tightened-wall risk did not materialise.

| Section | Docs | Avg chars |
|---|---:|---:|
| `/wires/` | 47 | 8,371 |
| `/features/` | 20 | 15,338 |
| `/videos/` | 17 | 3,195 |
| `/forum/` | 14 | 3,499 |
| `/faq/` | 13 | **702** |
| `/journeys/` | 4 | 6,660 |
| 2 root articles | 2 | 1,735 |

**Two things to carry into later stages:**

1. **`/faq/*` is a thin band** — 13 docs averaging 702 chars (507 min). They
   clear `minContentLength: 250` and are genuine Q&A answers, but each will
   likely chunk to 1. Watch whether they earn top-10 slots at Stage 4 or just
   dilute; do **not** pre-emptively drop them (slice #6's `/equip/` retention
   decision was made on eval evidence, not a guess).
2. **A little chrome survives extraction** — a leading breadcrumb ("Spiritual Qs
   / FAQ", "Find God"), a "Listen to article | Share this article" line, and a
   `▶` on video pages. All are bare `<p>`/text with no class to target, so no
   selector can strip them; they are a few words at the head of chunk 0. Noted,
   not chased — re-crawling 117 pages to shave a breadcrumb is not worth 117
   credits.

## Stage 2 evidence (Ingest — GREEN 2026-07-24)

**117 docs / 550 chunks / 550 embeddings** (`qwen/qwen3-embedding-8b`, 1536d) —
perfect 1:1, 0 `chunk_count` mismatches, idempotent re-run drains 0. Corpus now
**9 sources / 11,554 docs / 33,654 chunks**. 76 transient OpenRouter embed
timeouts all recovered inside the retry policy (#64); zero data loss.

Chunks/doc avg 4.70 (min 1, max 15):

| Section | Docs | Chunks | Avg |
|---|---:|---:|---:|
| `/wires/` | 47 | 251 | 5.34 |
| `/features/` | 20 | 192 | 9.60 |
| `/videos/` | 17 | 39 | 2.29 |
| `/forum/` | 14 | 35 | 2.50 |
| `/journeys/` | 4 | 17 | 4.25 |
| `/faq/` | 13 | **13** | **1.00** |
| 2 root articles | 2 | 3 | 1.50 |

The Stage-1 prediction held exactly: **every `/faq/` doc chunks to 1.**

### ⚠️ Finding — 9 docs unclassified, and they are the site's *best* articles

`documents.language`: **108 `en`, 9 `null`** (7.7%). Counter-intuitively the 9
are not the thin ones — they are among the **largest** (5.7k–26k chars) and
include some of EveryStudent's flagship pieces: `/features/bible.html`,
`/features/faith.html` (Beyond Blind Faith), `/wires/atheist.html` (How an
Atheist Found God), `/wires/who-is-god.html`, `/wires/loneliness.html`,
`/wires/jesus-in-islam.html`, `/forum/trinity.html`,
`/features/martin-luther-king-jr.html`, `/features/whypick.html`.

**Cause: the tinyld confidence gate, not the content.** All nine are plainly
clean English prose; re-running the detector over their leading 2,000 chars
returns `en` as the top candidate every time, at **0.605–0.771** — clustered
just under `CONFIDENCE_GATE = 0.75` — with a spurious `hi` runner-up (0.12–0.29)
that is a tinyld quirk, not anything in the text. `DETECTION_FLOOR_CHARS` is not
involved (all are far above 500). So this is ADR-0007 working as designed: a
`null` is an honest "not confidently detected", never a guess.

**Why it still matters:** a `null`-language doc is excluded from
`language:"en"` filtered searches (SQL three-valued logic) while staying
retrievable unfiltered. Nine of this source's strongest apologetics articles are
currently invisible to any language-scoped query — which is exactly the shape of
query Stage 4 eval uses.

**Context:** the rate itself is unremarkable — cru ingested at 7.8% null. But
**every other source in the local corpus now reads 0.0%**, because the ADR-0009
LLM sweep (`pnpm lang:sweep`, PRs #92/#95/#96) drained them 190 → 0.
everystudent is simply the first source ingested since that sweep, so it is the
lone outlier and the remedy is an existing, proven tool.

## Open question / blocker

- **Run `pnpm lang:sweep` on `everystudent` before Stage 4?** Operator decision
  at the Stage-2 boundary. Recommended: yes — it is the established remedy, it
  costs a small LLM spend rather than any Firecrawl credits, and leaving 9
  flagship docs unfilterable would distort the eval. Deferring is defensible
  (they are retrievable unfiltered, and English-only eval cases may not scope by
  language), but the distortion would be silent.

## Known caveat — not a blocker for this slice

`pnpm test` is **425/426** on this machine. The failure is
`tests/retrieval.integration.test.ts › "language filter must not starve"` — the
FOLLOW-UP J [#17](https://github.com/JesusFilm/jesusfilm-rag/issues/17) /
[#75](https://github.com/JesusFilm/jesusfilm-rag/issues/75) canary, which
asserts that a language-filtered search still finds in-language rows hidden
behind a wall of out-of-language neighbours.

It is **data-dependent, not a code defect**: the same test passes 5/5 against an
empty scratch database and is green in CI (fresh DB), but fails against this
machine's 11,437-doc / 33,104-chunk local corpus. Slice #6 recorded the same
canary firing at 23.5k chunks; the corpus has since grown to 33k.

**Why it is noted here rather than fixed here:** it is pre-existing, unrelated to
acquiring a source, and English-only work cannot trip the failure mode. **It must
be investigated before the `everystudent-ar` / `everystudent-fr` slices**, which
are exactly the small-language-drowning-in-English case the canary exists to
warn about (30,136 `en` chunks vs 460 `zh` today). Open question when we get
there: is the fixture's cosine-0.99 cluster an artifact no real query produces,
or a real ceiling on rare-language retrieval?

**This slice's gate is therefore "green apart from the #17 canary."**

## History — why this slice was blocked for two months

Blocked 2026-05-25 at Stage 1: everystudent.com serves a Cloudflare JS managed
challenge, and the plain HTTP fetcher (undici, no JS engine) cannot earn the
`cf_clearance` cookie. At the time the homepage returned 200 while every content
path returned 403; the site has since tightened, and **the homepage and
`/sitemap.xml` are now 403 too** — only `robots.txt` answers plain HTTP.

Nothing about the wall got easier. What changed is our side: ADR-0012 / #109
added Firecrawl as an opt-in per-source fetch strategy, and #114 verified the
existing `FirecrawlFetcher` clears all three EveryStudent domains **unmodified**.
The route from wall to plan is mapped in
[#112](https://github.com/JesusFilm/jesusfilm-rag/issues/112).

⚠️ **Detection lesson (ADR-0012, re-confirmed by #114):** do **not** classify a
wall by the presence of the `challenge-platform` script — Cloudflare injects it
into *successful* responses too, so it false-positives on CF-fronted-but-served
sources like thelife and cru. Use `attention required` /
`cf-browser-verification` / `just a moment` plus the status code.

## Resume hint (for a cold start)

At: **Stage 3 — Retrieve.** Stages 1 and 2 are green; everystudent is live in
the 9-source corpus (11,554 docs / 33,654 chunks) and no further Firecrawl spend
is needed for this source ever. **One decision is open first** (see "Open
question"): whether to run `pnpm lang:sweep` over everystudent to classify the 9
`null`-language docs before eval.

Next concrete action: `pnpm query` against seeker-axis topics this source owns
(is there a God, loneliness, atheism, the Trinity, purpose) — confirm ranked
cited hits from everystudent, check cross-source health (does it complement or
bury the 8 existing sources?), and re-confirm `minScore 0.37` separates
positives from off-topic negatives.
Last verify: green apart from the #17 canary (425/426) @ 2026-07-24.
Last commit: 99e9696. Branch: slice/everystudent.
