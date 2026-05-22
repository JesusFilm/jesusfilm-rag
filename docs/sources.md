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
| Cru | https://www.cru.org | HTML | Not started | — | — |
| EveryStudent | https://www.everystudent.com | HTML | Not started | — | — |
| Starting With God | https://www.startingwithgod.com | HTML | Ingested | Acquire: 40/40 pages staged → `raw_documents` (avg 6,843 chars). Ingest: **40/40 docs → 183 chunks → 183 embeddings**; chunk_count consistent (declared=actual=183, 0 mismatched); chunks/doc min 1 / avg 4.6 / max 14; idempotent re-run drains 0. | Slice #1 (`slice/starting-with-god`), acquired + ingested 2026-05-22. Seed-list of 40 article URLs; `#content` extraction clean. Chunker = jfa 500/50/min-20 paragraph-preserving. ⚠ **Embedded with `nvidia/llama-nemotron-embed-vl-1b-v2:free`** (the `.env` `EMBED_MODEL_ID`, 1536 dims via OpenRouter), NOT decision-1's `openai/text-embedding-3-small` — open decision before retrieval (accept the free model & update §decision-1, or re-embed). Next: retrieve. |
| Sightline Ministry | https://sightlineministry.org | HTML | Not started | — | — |
| NextStep | https://nextstep.is | HTML | Not started | — | — |

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
