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
- [ ] **Cost-guard probe (~2 credits).** Scrape one `/podcasts/` and one `/videos/` page to settle whether those 49 URLs are prose or media stubs, and re-confirm the 1 cr/page rate before committing to the full crawl. Record the answer under "Decisions made".   <!-- sha: ________ -->
- [ ] Add the `everystudent` `SourceEntry`: `fetchStrategy: "firecrawl"`, hand-listed `seedPaths` (149, lifted from #114 — **never re-map**), `.content4`/`.content4b`/`.articletitle` selectors + strip list. Wire into `SOURCES`; extend `registry.test.ts`.   <!-- sha: ________ -->
- [ ] Live `pnpm acquire --source everystudent` → rows in `raw_documents`. **Watch the credit delta over the first ~10 pages** — if the rate is 5 cr/page, Cloudflare has tightened, the total (~745) blows the budget, and we stop. Spot-read `raw_content` for real article prose.   <!-- sha: ________ -->

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
- 2026-07-24 — **Funded from the personal Firecrawl account** (Free tier; 1,016 credits confirmed live, cycle ends 2026-08-21). ~149 credits for this domain, ~292–338 for all three — roughly 3× headroom, no upgrade (#116). Prod resolves its key via docker secret pull, never `.env`.

## Open question / blocker

- none

## Known caveat — not a blocker for this slice

`pnpm test` is **421/422** on this machine. The failure is
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

At: Stage 1 — "Cost-guard probe (~2 credits)". Next concrete action: scrape one
`/podcasts/` and one `/videos/` page through Firecrawl and read the extracted
text — if they are media stubs rather than prose, drop those 49 URLs from the
seed list before registering the source (149 → ~100). Then write the registry
entry and run the live crawl.
Last verify: green apart from the #17 canary @ 2026-07-24. Last commit: efcafd5.
Branch: slice/everystudent.
