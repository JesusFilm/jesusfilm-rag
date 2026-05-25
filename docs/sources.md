# Source Inventory & Acquisition Tracking

The working tracker for every content source we know of, and how far each has
moved through **acquire → ingest → evaluate**. This is the human-facing progress
sheet; the machine-readable crawl config lives in the code registry
(`src/registry`, built in step 3).

> **Fresh start — no history carried over.** Nothing here is copied from the
> previous project's outcomes. Even sources that worked (or failed) before are
> treated as if we are meeting them for the first time: every row begins at
> `Not started`, and we record only what *we* observe when we acquire and
> evaluate them ourselves.

## Registry keys (how to refer to a source)

Tools that act on one source — `/golden`, `pnpm acquire|index|query --source <key>` —
take the **registry key**: a stable slug, not a number (numbers would drift as
sources are added). You don't need to memorize it — **`/golden`** with no argument
lists the ingested sources and lets you pick by number from that live menu. Keys,
as sources are registered:

| Key | Source |
|-----|--------|
| `starting-with-god` | Starting With God |
| `everystudent` | EveryStudent (blocked — Cloudflare) |
| `nextstep` | NextStep (deferred — marketing site) |
| `cru-10-basic-steps` | Cru — 10 Basic Steps (sub-scope of Cru) |

(Only registered sources appear; the rest get a key when their slice begins.)

## How to use this tracker

Update a row as it moves through the pipeline. Keep `Results` and `Notes`
factual and our-own.

**Columns**
- **Source / URL / Type** — what it is and how we expect to acquire it. `Type` is our *expected* method (confirm on first contact), not a verdict.
- **Status** — current pipeline stage (legend below).
- **Results** — concrete things we measured: pages acquired, chunks ingested, eval recall@k / pass–fail. `—` until there's something real to record.
- **Notes / issue description** — free text. **On any failure, explain what we found** (HTTP errors, anti-bot/challenge, JS-rendered content, weak extraction, rights/robots) so it's actionable. `—` until there's something to say.

**Status legend**
| Status | Meaning |
|--------|---------|
| `Not started` | No acquisition attempted yet (default). |
| `Acquiring` | Crawl/extraction in progress (writing to `raw_documents`). |
| `Acquired` | Raw documents captured; not yet ingested. |
| `Ingested` | Normalized, chunked, embedded into the corpus. |
| `Evaluated` | Run through the eval harness — see `Results`. |
| `Blocked` | Acquisition/ingestion failed — reason in `Notes`. |
| `Deferred` | Intentionally postponed. |

`Type` values: **HTML** (crawl + extract), **API** (structured endpoint), **Manual** (reviewed import, e.g. a Drive archive or curated set).

---

## Short list — v1 priority (6)

The six originally-scoped domains that previously produced a working corpus, so
we re-attempt them first. We make no assumptions about whether they'll work this
time — we acquire and evaluate each one fresh and record the outcome here.

| Source | URL | Type | Status | Results | Notes / issue description |
|--------|-----|------|--------|---------|---------------------------|
| Jesus Film Project | https://www.jesusfilm.org | HTML | Not started | — | — |
| Cru | https://www.cru.org | HTML | Evaluated (sub-scope `cru-10-basic-steps`) | **Eval (2026-05-25):** 10 persona-diverse golden cases (Believer ×4 / Newcomer ×3 / Seeker ×2 / Skeptic ×1) via the new per-source eval. **cru-10 breakdown** (whole-corpus retrieval): recall@3 **0.70** · recall@8 **0.90** · MRR **0.44** · P@1 **0.20** @ minScore **0.37** (re-confirmed, held — FOLLOW-UP A). Whole-corpus, 2 sources / 20 cases: recall@3 0.80 / recall@8 0.90 / MRR 0.62 / P@1 0.45. Retrieval is solid (right lessons cited to cru.org). **v1 caveat (see `docs/eval-approach.md`):** the low cru **P@1 0.20** is largely a *scoring artifact* of v1's single-source expected sets — shared-topic cru questions listed only the cru doc, so an equally-correct SwG answer scored as a non-win; multi-source returns are verified working. These are a **v1 baseline**, to be re-derived under the source-agnostic / multi-relevant reframe. (cru does rank below SwG on shared topics — SwG's Q&A articles embed better against questions than cru's workbook format — but that's a softer signal than P@1 0.20 suggests.) 2 misses: `cru-seeker-finances` (case-framing — "money anxiety" pulls SwG worry/trust content, not Step 8 "Giving/stewardship") and `swg-newcomer-gospel` (cross-source displacement — expected doc fell to rank 9 @ 0.468). **Citation-quality limitation:** the leading accordion-section TOC chunk is sometimes the top-cited cru snippet (e.g. abundant-life) instead of teaching prose — extraction-side; candidate follow-up. Negatives behave: clean off-scope (eschatology 0.28 / secular 0.14) return nothing at 0.37; "find a church" returns fellowship content (0.53, fair). **Acquire (2026-05-25):** staged **11/12** lesson pages → `raw_documents` (the `10-basic-steps.html` index correctly skipped too-thin); all status 200 + hashed; chars min 2525 / avg 4688 / max 10132. **Ingest (2026-05-25):** drained all 11 → **11 docs / 35 chunks / 35 embeddings** (`openai/text-embedding-3-small`, 1536 dims); 0 chunk_count mismatches; chunks/doc min 2 / avg 3.2 / max 6; idempotent re-run drains 0. | Content-reachable (probed 200, no challenge). Worked **per sub-scope**, not as one crawl (jfa splits cru.org into ~10 scoped keys — see `docs/jfa-registry-findings.md`). **Slice #2 = `cru-10-basic-steps`** (`slice/cru-10-basic-steps`), Bill Bright's new-believer 10 Basic Steps curriculum — 12 ready-made curated URLs from jfa, started 2026-05-25. Cru runs Adobe AEM; verified content selector is `.article-long-form` (jfa's `.article-content` guess is absent). Other Cru sub-scopes (Train & Grow, Beginning With God, Transferable Concepts, Classics, About, Oneness, Pathways) remain Not started. |
| EveryStudent | https://www.everystudent.com | HTML | Blocked | — | **Blocked 2026-05-25 — Cloudflare JS managed challenge on all content pages.** Slice #2 (`slice/everystudent`). Homepage `/` returns 200 (the recon's homepage-only GET was a false positive), but **every content path returns 403** with the `challenge-platform` marker — `/sitemap.{html,xml}`, `/wires/*`, `/features/*`, `/knowingGod.html`, `/reasons-to-believe.html`, `/menus/issues.html`, `/contact.html`. Full browser headers don't help (JS challenge needs JS execution for the `cf_clearance` cookie; our undici fetcher has no JS engine). Scope is everystudent.com-specific — Cru.org (parent org) + the other 3 short-list sources serve content at 200. Unblock paths: switch source / Playwright fetcher / authorized Cru feed. See `docs/slices/everystudent.md`. |
| Starting With God | https://www.startingwithgod.com | HTML | Evaluated | **Eval (2026-05-25):** 10 golden cases / 4 personas — recall@3 **0.90** · recall@8 **1.00** · MRR **0.82** · P@1 **0.70** @ minScore 0.37. Acquire: 40/40 pages staged → `raw_documents` (avg 6,843 chars). Ingest: **40/40 docs → 183 chunks → 183 embeddings**; chunk_count consistent (declared=actual=183, 0 mismatched); chunks/doc min 1 / avg 4.6 / max 14; idempotent re-run drains 0. | Slice #1 (`slice/starting-with-god`), acquired + ingested 2026-05-22. Seed-list of 40 article URLs; `#content` extraction clean. Chunker = jfa 500/50/min-20 paragraph-preserving. Embedded with **`openai/text-embedding-3-small`** (1536 dims via OpenRouter, locked decision-1) — a first run accidentally used a `.env` nvidia-free override and was corrected by re-embedding (`pnpm index --force`). Evaluated 2026-05-25 via `/golden` (persona-diverse cases + off-topic negatives); `minScore` re-derived 0.3 → **0.37** (hard floor 0.35, FOLLOW-UP A). |
| Sightline Ministry | https://sightlineministry.org | HTML | Not started | — | — |
| NextStep | https://nextstep.is | HTML | Deferred | — | **Deferred 2026-05-25 — thin product-marketing site, not a seeker-Q&A corpus.** Reachable (200, no challenge), but it's ~8 WordPress landing pages (~540 words real content each: invite/prayer/disciple/easter/evangelize/christmas/football2026/cru25) describing how to use the NextStep invite/discipleship *tool* — confirmed by jfa, which splits it into `nextstep-is` (campaign), `nextstep-support` (Help Scout docs, explicitly not for doctrine), and `nextstep-football2026` (own subdomain). Best value is later as the **FOLLOW-UP E** seasonal-exclusion fixture (football2026), not as a primary corpus. See `docs/jfa-registry-findings.md`. |

---

## Backlog — all other known sources

Everything else we are aware of, to revisit after the short list proves the
acquire → ingest → evaluate loop end-to-end. (Short list + backlog = every
source we currently know of.)

| Source | URL | Type | Status | Results | Notes / issue description |
|--------|-----|------|--------|---------|---------------------------|
| GotQuestions | https://www.gotquestions.org | HTML | Not started | — | — |
| FamilyLife | https://www.familylife.com | HTML | Not started | — | — |
| Power to Change | https://powertochange.com | HTML | Not started | — | — |
| KnowGod / GodTools | https://knowgod.com | API / HTML | Not started | — | — |
| Victory Beyond the Cup | https://victorybeyondthecup.com | HTML | Not started | — | — |
| Victory Host Kit | Google Drive archive | Manual | Not started | — | — |
| Arclight Videos | https://api.arclight.org | API | Not started | — | — |
| IssuesIFace | https://issuesiface.com | HTML | Not started | — | Re-attempt acquisition ourselves and record exactly what blocks it (reachability, anti-bot, host/`www` resolution, extraction). |
| Joshua Project | https://joshuaproject.net | Manual / data | Not started | — | — |
| NextStep Support | https://support.nextstep.is | HTML | Not started | — | — |
| NextStep Football 2026 | https://nextstep.is (seasonal campaign) | HTML | Not started | — | — |
| NextSteps Toolkit | internal / owned | Manual | Not started | — | — |
| Curated References | manual reference set | Manual | Not started | — | — |

---

## Scope note

A few entries on the old registry were finer-grained sub-scopes of one site
(e.g. Cru split into Train & Grow, 10 Basic Steps, Beginning With God,
Transferable Concepts, Classics, Pathways, About, and the "oneness" series;
Jesus Film Project into resources + about). They're consolidated here under
their parent site as the unit of acquisition work. If we want to track a
sub-scope separately once we hit it, split it into its own row at that point.

**jfa's curated registry** (examined 2026-05-25) has ready-made crawl policies +
per-source rights/hazard notes for ~20 of these sources — including which ones
block bots and which are JS-rendered. Reuse that curation when starting a source:
see **[docs/jfa-registry-findings.md](./jfa-registry-findings.md)**.
