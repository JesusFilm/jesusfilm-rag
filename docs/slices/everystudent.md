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
- [ ] Live `pnpm acquire --source everystudent` → rows in `raw_documents`. **Watch the credit delta over the first ~10 pages** — if the rate is 5 cr/page, Cloudflare has tightened, the total (~585) blows the budget, and we stop. Spot-read `raw_content` for real article prose.   <!-- sha: ________ -->

### 2. Ingest → corpus tables

- [ ] Live `pnpm index --source everystudent` → documents / chunks / embeddings (`qwen/qwen3-embedding-8b`); chunk counts sane; idempotent re-run drains 0; spot-check that `documents.language` reads `en` from per-document detection (not from the declared set).   <!-- sha: ________ -->

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

## Open question / blocker

- none

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

At: Stage 1 — "Live `pnpm acquire --source everystudent`". The source is
registered and tested; **nothing has been crawled yet**. Next concrete action:
run `pnpm acquire --source everystudent --dry-run` to confirm it resolves 117
URLs, then the real run — reading the Firecrawl credit balance before and after
the first ~10 pages. Expect ~117 credits from a balance of 1,013; **stop and
re-plan if the rate is 5 cr/page** (a tightened Cloudflare), because ~585 would
not fit the cycle's remaining budget.
Last verify: green apart from the #17 canary (425/426) @ 2026-07-24.
Last commit: 0fde91a. Branch: slice/everystudent.
