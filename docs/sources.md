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
| `everystudent` | EveryStudent — everystudent.com (en). Walled; acquired via Firecrawl (ADR-0012). The Arabic (`everyarabstudent.com`) and French (`questions2vie.com`) banners are separate domains → separate keys, later slices (ADR-0006) |
| `nextstep` | NextStep (deferred — marketing site) |
| `cru` | Cru — whole domain (us/en + mx/es + the one real `/language-resources/` fr article); absorbed `cru-10-basic-steps`, superseded `cru-es` (one domain = one source, ADR-0006) |
| `jesusfilm-org` | Jesus Film Project |
| `sightline-ministry` | Sightline Ministry |
| `thelife` | thelife (Cru Canada — successor to Power to Change) |
| `thelife-fr` | thelife — French (laviejenparle.com) — language variant |
| `thelife-zh` | thelife — Chinese (uwota.com) — language variant |

(Only registered sources appear; the rest get a key when their slice begins.
`familylife` is also registered — see the backlog table — and is now bilingual
`en`+`es`. See the **Multilingual acquisition** section below for the 2026-06-24
non-English pass.)

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
| Jesus Film Project | https://www.jesusfilm.org | HTML | Evaluated | **Eval (2026-05-26):** curated via `/golden` — 12 new persona-diverse jf cases + re-reviewed 11 existing cases' living `relevant` maps (qa-golden.yaml now 32 cases). **Whole-corpus, 3 sources / 32 cases @ top-10:** recall@3 **0.906** · recall@10 **0.938** · coverage **0.803** · MRR 0.777 · P@1 0.656. **Per-source: jesusfilm-org recall 0.913 / coverage 0.859** (n=23) · swg 0.833/0.728 · cru 0.714/0.714. The re-review resolved the pre-curation drop (stale 20 cases scored recall@10 0.85) — a living-set artifact, not a retrieval regression; the 3 displaced misses (gospel/witnessing/prayer) all pass after crediting the genuinely-relevant jf docs. 2 honest misses left (`jf-skeptic-intolerant` out-ranked by uniqueness docs; `jf-believer-disciple-making` a "grow in faith"↔"disciple" vocabulary gap). **minScore 0.37 held** (FOLLOW-UP A re-confirmed @ 3 sources: secular negatives return nothing; faith-adjacent Quran/Ramadan 0.389). **Ingest (2026-05-26):** drained all 349 → **349 docs / 2114 chunks / 2114 embeddings** (`openai/text-embedding-3-small`, 1536d); 1:1 chunks:embeddings, chunks/doc avg 6.1, 0 chunk_count mismatches; idempotent re-run drains 0. **Acquire (2026-05-26):** discovery crawl staged **349/349** blog articles → `raw_documents`, 0 skips. Discovery from `sitemap_index.xml` → 4 child sitemaps, **417 locs seen → 349 kept** (2 bare `/blog/` index pages + all `/give/` + `.kml` correctly dropped by articleHints/block). raw_content chars min 1796 / avg 9443 / max 45980; all titles populated; clean blog prose. | **Slice #3** (`slice/jesusfilm-org`), started 2026-05-26. Owned WordPress (Yoast sitemaps, Cloudflare-fronted but serves 200 — no challenge wall). **First source on the new discovery-crawl model (FOLLOW-UP F):** `CrawlPolicy.sitemaps`+`allow`/`block`/`articleHints`, sitemap-index recursion in `src/acquisition/discover.ts`. Corpus = ~351 `/blog/` teaching posts; `/give/` donation pages + page-sitemap + the `.kml` filtered out. Content selector `.entry-content`. Key `jesusfilm-org` (per jfa). See `docs/slices/jesusfilm-org.md`. |
| Cru | https://www.cru.org | HTML | **Evaluated** (slice #7, `cru` — whole domain, en+es+fr) | **Eval (slice #7, Stage 4, 2026-07-14) — judge-panel curated:** every proposed credit scored by a 3-lens LLM panel (theologian / pastor / mature Christian) on TWO orthogonal axes — *relevance* (does it answer THIS question) and *biblical soundness* — both gated at 0.75. **73 of 151 proposals were biblically SOUND but OFF-QUESTION**; a soundness-only rubric would have auto-accepted all of them and corrupted the answer keys. 73 credits approved. Golden suite **82 → 96 cases** (+6 en cru-native, **+8 es — the suite's first Spanish cases**). Whole-corpus @ 96: recall@3 **0.938** · recall@10 **1.000** · coverage **0.689** · MRR 0.814 · P@1 0.677. **cru per-source recall 0.125 → 0.828, coverage 0.063 → 0.576 with NO engine change** — the 0.125 was a *stale answer key* (still crediting only the 11 retired 10-Basic-Steps pages against a 2,444-doc source), never a retrieval regression. **Per-language coverage (new view):** en 0.614 · **es 0.938** · fr 0.817 · zh 0.867, 0 unscoped. **minScore 0.37 holds in Spanish** (es negatives top out 0.308; es positive band 0.622–0.739). **French deliberately not cased** — the sole fr doc is a marketing piece; at n=1 recall@10 is 1.000 by construction. **Findings:** 40/151 docs judged `answer_buried` (cru articles open with long anecdotes; retrieval returns one chunk/doc → right doc, useless snippet); 1,375 cru chunks (16.2%) begin with the junk string `0 100 0`; Spanish corpus is machine-translated to near-unreadability; 18 docs below 0.75 soundness → issue #78. **Ingest (slice #7, 2026-07-13):** drained all 2,444 pending → **2,444 docs / 8,497 chunks / 8,497 embeddings** (`qwen/qwen3-embedding-8b`, 1536d, 1:1, 0 skipped, chunks/doc avg 3.48); idempotent re-run drains 0; full gate green at ~33.2k total chunks (295/295). **First multi-language single-source ingest under invariant 6:** `en` 1,805 (incl. 30 English-bodied `/mx/es/` docs correctly labelled `en` — the predicted 7.6% audit class) · `es` 447 · `fr` 1 · **`null` 190** (7.8% — below the 500-char floor or 0.75 gate; honest ADR-0007 blanks, retrievable unfiltered, #73 worklist) · `vi` 1 (the run's single ⚠ out-of-set warning — detector misfire on genuine 654-char Spanish; #73 cleanup). **Acquire (slice #7, 2026-07-09→13):** staged **2,444 of 2,746** discovered URLs (1,907 en-path + 537 es-path; includes the one real `/language-resources/` French article, 3,415 chars). ~300 hub/section-index pages skip too-thin on every pass (never stage); 3 transient fetch-fails. All 2,444 rows pending ingest on qwen3. `cru-es` folded into `cru` (one domain = one source, ADR-0006; 537 rows re-keyed with one UPDATE); `cru-10-basic-steps` superseded — its 11 docs / 35 chunks / 11 raw rows dropped from the local DB. (Prod cutover since completed: `cru` embedded in prod 2026-07-14; the 11 superseded prod docs, briefly duplicated under `cru` (#85), were removed transactionally 2026-07-15 — PR #93, zero unique content lost.) Language is per-document at ingest (ADR-0006/0007) — the ~39 English-bodied `/mx/es/` docs will label `en`, and that is correct. **Prior sub-scope record (slice #2, historical):** **Eval (2026-05-25):** 10 persona-diverse golden cases (Believer ×4 / Newcomer ×3 / Seeker ×2 / Skeptic ×1) via the new per-source eval. **cru-10 breakdown** (whole-corpus retrieval): recall@3 **0.70** · recall@8 **0.90** · MRR **0.44** · P@1 **0.20** @ minScore **0.37** (re-confirmed, held — FOLLOW-UP A). Whole-corpus, 2 sources / 20 cases: recall@3 0.80 / recall@8 0.90 / MRR 0.62 / P@1 0.45. Retrieval is solid (right lessons cited to cru.org). **Eval reframed to source-agnostic questions + multi-source `relevant` sets, scored on recall + coverage (`docs/eval-approach.md`):** v2 whole-corpus (20 cases / 2 sources) recall@3 **0.95** · recall@10 **1.00** · coverage **0.896** · P@1 0.80; **per-source coverage cru 0.929** / swg 0.906. This resolved the v1 cru "P@1 0.20" artifact — cru content surfaces reliably when relevant; v1's single-source expected sets were measuring the wrong thing. (`cru-seeker-finances` reframed → `cru-stewardship` once we saw Step 8 is about stewardship, not money-anxiety; it now hits rank 1.) 2 misses: `cru-seeker-finances` (case-framing — "money anxiety" pulls SwG worry/trust content, not Step 8 "Giving/stewardship") and `swg-newcomer-gospel` (cross-source displacement — expected doc fell to rank 9 @ 0.468). **Citation-quality limitation:** the leading accordion-section TOC chunk is sometimes the top-cited cru snippet (e.g. abundant-life) instead of teaching prose — extraction-side; candidate follow-up. Negatives behave: clean off-scope (eschatology 0.28 / secular 0.14) return nothing at 0.37; "find a church" returns fellowship content (0.53, fair). **Acquire (2026-05-25):** staged **11/12** lesson pages → `raw_documents` (the `10-basic-steps.html` index correctly skipped too-thin); all status 200 + hashed; chars min 2525 / avg 4688 / max 10132. **Ingest (2026-05-25):** drained all 11 → **11 docs / 35 chunks / 35 embeddings** (`openai/text-embedding-3-small`, 1536 dims); 0 chunk_count mismatches; chunks/doc min 2 / avg 3.2 / max 6; idempotent re-run drains 0. | Content-reachable (probed 200, no challenge). Worked **per sub-scope**, not as one crawl (jfa splits cru.org into ~10 scoped keys — see `docs/jfa-registry-findings.md`). **Slice #2 = `cru-10-basic-steps`** (`slice/cru-10-basic-steps`), Bill Bright's new-believer 10 Basic Steps curriculum — 12 ready-made curated URLs from jfa, started 2026-05-25. Cru runs Adobe AEM; verified content selector is `.article-long-form` (jfa's `.article-content` guess is absent). Other Cru sub-scopes (Train & Grow, Beginning With God, Transferable Concepts, Classics, About, Oneness, Pathways) remain Not started. |
| EveryStudent | https://www.everystudent.com | HTML | Acquiring | — | **Unblocked 2026-07-24 — the wall is passed by Firecrawl (ADR-0012), not by us.** Slice #8 (`slice/everystudent`), en only. **Still walled, and more so than in 2026:** the site sits behind a Cloudflare JS managed challenge that our undici fetcher cannot pass (JS execution is needed to earn the `cf_clearance` cookie), and it has *tightened* since the 2026-05-25 probe — the homepage and `/sitemap.xml` now return **403** too (the homepage answered 200 back then, which is why the original recon read as a false positive). Only `robots.txt` answers plain HTTP. What changed is our side: `fetchStrategy: "firecrawl"` (#109) renders the page and returns raw HTML, verified working against this domain **unmodified** (#114). **Discovery is already paid for** — `/v2/map` enumerated **167 URLs** at 1 credit flat (#114, inventory preserved as a comment there), so this source is a hand-listed `seedPaths` crawl, not a sitemap discovery crawl; **149 seeds** after dropping the homepage, `/contact.php`, `/donate`, `/quiz`, `/sitemap.html`, the bare `/podcasts` index, 10 `/menus/*` index pages and 2 search pages. **Cost measured at 1 credit/page, not the 5 that Cloudflare-walled pages bill in general** (#113/#114: Firecrawl's `basic` proxy clears this host, so `auto` never escalates) — re-measure before any large run, since a tightened wall would quintuple the total. Shared `.content4`/`.content4b`/`.articletitle` template with the 48 non-walled sibling domains (#111, out of scope here). robots.txt honoured (`/4laws.html`, `/jdquestions.html`, `/team/*`, `/admin/*`, `/mobi/*`, `/sys/*`, `/mypage/*`, `/atools/*`, `/email/*`, contact pages) — none appear in the mapped set. ⚠️ **Detection caveat:** `challenge-platform` appears in *successful* responses too (Cloudflare injects it); classify a wall by `attention required` / `cf-browser-verification` / `just a moment` plus the status code. Planned via [#112](https://github.com/JesusFilm/jesusfilm-rag/issues/112). See `docs/slices/everystudent.md`. |
| Starting With God | https://www.startingwithgod.com | HTML | Evaluated | **Eval (2026-05-25):** 10 golden cases / 4 personas — recall@3 **0.90** · recall@8 **1.00** · MRR **0.82** · P@1 **0.70** @ minScore 0.37. Acquire: 40/40 pages staged → `raw_documents` (avg 6,843 chars). Ingest: **40/40 docs → 183 chunks → 183 embeddings**; chunk_count consistent (declared=actual=183, 0 mismatched); chunks/doc min 1 / avg 4.6 / max 14; idempotent re-run drains 0. | Slice #1 (`slice/starting-with-god`), acquired + ingested 2026-05-22. Seed-list of 40 article URLs; `#content` extraction clean. Chunker = jfa 500/50/min-20 paragraph-preserving. Embedded with **`openai/text-embedding-3-small`** (1536 dims via OpenRouter, locked decision-1) — a first run accidentally used a `.env` nvidia-free override and was corrected by re-embedding (`pnpm index --force`). Evaluated 2026-05-25 via `/golden` (persona-diverse cases + off-topic negatives); `minScore` re-derived 0.3 → **0.37** (hard floor 0.35, FOLLOW-UP A). |
| Sightline Ministry | https://sightlineministry.org | HTML | Evaluated | **Eval (2026-05-27):** curated via the `golden` skill — Part A re-reviewed 14 of 32 existing cases' living `relevant` maps (+Sightline docs), Part B added 10 new Sightline skeptic-axis cases (qa-golden.yaml now **42 cases**; all 55 credited Sightline paths verified present). **Whole-corpus, 4 sources / 42 cases @ top-10:** recall@3 **0.810** · recall@10 **0.976** · coverage **0.583** · MRR 0.709 · P@1 0.571. **Per-source: sightline-ministry recall 0.750 / coverage 0.468** (n=24) · jesusfilm-org 0.913/0.779 · swg 0.611/0.419 · cru 0.357/0.321. Curation recovered the living-set artifact (recall@3 0.688→0.810, P@1 0.375→0.571, MRR 0.565→0.709); coverage dipped 0.618→0.583 only because credited relevant sets grew larger than top-10 can return (recall@10 ~1.0 — every question still answered). **Closed slice-#3's `jf-skeptic-intolerant` miss → rank 1** (Sightline's own "Is Christianity Intolerant?"); 8/10 new Sightline cases rank 1. `jf-believer-disciple-making` remains an honest vocab-gap miss (not Sightline's domain). **Honest finding:** cru/swg per-source coverage did not recover — Sightline (1390 broad docs) crowds small sources out of top-10 on shared topics (FOLLOW-UP I/J signal, not a regression; mechanism-not-policy). **minScore 0.37 holds @ 4 sources** (secular index-fund/faucet 0 hits; metaphor/faith-adjacent cricket 0.381, Quran 0.389 — below the 0.5–0.65 positive cluster). **Acquire (2026-05-27):** discovery (2 content sitemaps) kept **1,392 unique** URLs (22 sitemap dups + 2 bare index pages dropped by the `Set`/filters); crawl staged **1390/1392**, 2 skipped too-thin (<250 chars). raw_documents: 1390 rows, all status 200, 0 null titles, 1390 distinct canonical_url, chars min 494 / avg 3429 / max 18993. **Ingest (2026-05-27):** drained all 1390 → **1390 docs / 3470 chunks / 3470 embeddings** (`openai/text-embedding-3-small`, 1:1, 0 null dropped); 0 chunk_count mismatches; chunks/doc min 1 / avg 2.5 / max 12; idempotent re-run drains 0. **Retrieve (2026-05-27):** apologetics/skeptic queries return cited Sightline hits — "Is Christianity intolerant?" → Sightline's own answer **rank 1 (0.616)**, jf #2 (closes slice #3's `jf-skeptic-intolerant` gap); "what proof God exists?" → 5 Sightline apologetics docs (0.647 top). Cross-source health holds (swg "How to Be Sure of Heaven" #1 on assurance). minScore **0.37 holds @ 4 sources** (secular 0 hits; Quran/Ramadan 0.389 unchanged). **Eval pending Stage 4 curation** (`/golden`). | **Slice #4** (`slice/sightline-ministry`), started 2026-05-27. Same WP/Yoast shape as jesusfilm.org → **reuses slice #3's discovery crawler unchanged** (no new code). Probed 200, empty `Disallow:`, no wall. Scope (operator-chosen): **posts (414) + daily devotionals (1000)**, both on `.o-longform-content__content`; resources (45) excluded (`.o-principle-block` card/hub template); asset/taxonomy non-article. Scoped by seeding the two content sitemaps directly (posts at bare-root `/<slug>/`). **Note:** Sightline republishes devotionals annually (`-2`/`-7` slug suffixes) → some near-duplicate docs the 3-key dedup doesn't collapse (citation-quality, candidate follow-up). See `docs/slices/sightline-ministry.md`. |
| NextStep | https://nextstep.is | HTML | Deferred | — | **Deferred 2026-05-25 — thin product-marketing site, not a seeker-Q&A corpus.** Reachable (200, no challenge), but it's ~8 WordPress landing pages (~540 words real content each: invite/prayer/disciple/easter/evangelize/christmas/football2026/cru25) describing how to use the NextStep invite/discipleship *tool* — confirmed by jfa, which splits it into `nextstep-is` (campaign), `nextstep-support` (Help Scout docs, explicitly not for doctrine), and `nextstep-football2026` (own subdomain). Best value is later as the **FOLLOW-UP E** seasonal-exclusion fixture (football2026), not as a primary corpus. See `docs/jfa-registry-findings.md`. |

---

## Backlog — all other known sources

Everything else we are aware of, to revisit after the short list proves the
acquire → ingest → evaluate loop end-to-end. (Short list + backlog = every
source we currently know of.)

| Source | URL | Type | Status | Results | Notes / issue description |
|--------|-----|------|--------|---------|---------------------------|
| GotQuestions | https://www.gotquestions.org | HTML | Not started | — | — |
| FamilyLife | https://www.familylife.com | HTML | Evaluated | **Eval (2026-06-04):** curated via `/golden` v2 content-grounded mode. **Part A re-review** (existing 52 cases for familylife credits) added **31 paths across 8 cases** — closed both regressions (`tl-believer-marriage-drift` cov 0/5 → 9/14, rank miss → 1; `swg-believer-assurance` rank 4 → 3) AND **19 prior-slice curation gaps** surfaced as a side-effect (slice-#1: swg `/new-life/new.html`; slice-#3 jf `/blog/mental-health-and-the-church`; slice-#4 sightline trio; slice-#5 thelife 8+ devotionals incl. `/devotionals/the-new-deal`, `/full-confidence`, `/how-to-know-im-really-saved`, `/should-we-talk-about-it`, `/should-christians-go-to-therapy`, `/how-therapy-changed-my-life`, `/devotionals/kept-in-perfect-peace`, `/devotionals/the-prayer-of-anguish`, `/my-story-of-miscarriage`). **Part B** added **10 persona-diverse familylife-native cases** (4 seeker / 3 believer / 2 newcomer / 1 skeptic) on the marriage/parenting axis the corpus was missing: affair-trust, spiritual-leader, teen-prodigal, teen-own-faith, single-parent, premarital, sex-marriage (skeptic), blended-family, prodigal-adult, discipline-child. **61 path credits** (47 familylife · 14 prior-source). Part B surfaced 6 *additional* prior-slice gaps for the sex-marriage skeptic question (thelife `/why-should-i-wait-for-sex` + sightline `/good-reasons-to-wait`, `/puritans-viewed-sex-correctly`, `/sex-sacred-forgotten-that`; thelife `/devotionals/going-it-alone` for single-parent; thelife `/kids-divorce-and-remarriage` for blended-family; thelife `/devotionals/our-greatest-burden` for prodigal-adult). qa-golden.yaml now **62 cases**. **Whole-corpus eval @ 6 sources / 62 cases @ top-10:** recall@3 **0.984** · recall@10 **1.000** · coverage **0.648** · MRR **0.870** · P@1 **0.758** (vs slice-5 end: 52/1.000/1.000/0.624/0.907/0.827 — recall@10 unchanged, coverage UP +0.024, recall@3 dipped 0.016 on a single honest ranking quirk). **Per-source: familylife n=16 recall=1.000 / coverage=0.958** (perfect where credited) · thelife n=28 0.929/0.777 · jf n=28 0.750/0.604 · sightline n=37 0.784/0.582 · **swg n=21 0.524/0.367 — UP from 0.335** (slice-#5 prior-source-up pattern re-confirmed at 6 sources; new-source re-review pulls earlier slices' numbers up) · **cru-10 n=15 recall=0.133 / coverage=0.067 — DOWN from 0.167** (sharpest FOLLOW-UP I #15 evidence yet: same denominator, smaller numerator; cru content still exists, retrieval still works, but with familylife+thelife+sightline crowding shared topics cru pieces displaced from top-10. Mechanism-not-policy — consumer-layer `maxPerSource`/MMR fix). **Only rank > 3:** `fl-skeptic-sex-marriage` at rank=4 — engine ranks abstract intimacy pieces (thelife `/wise-intimacy`, sightline `/is-it-good-for-you-2`) above direct "why wait" docs; honest ranking quirk, doesn't affect recall@10. **`minScore 0.37` holds at 6 sources:** 3/3 familylife-domain-adjacent negatives (mortgage refinancing, python crawler, World Cup 2014) = 0 hits; positive band 0.55–0.71 cleanly separated from cutoff. **`/equip/` retention decision: KEEP all 70 rows** — 4 `/equip/` paths credited as legitimate relevant docs and surface in top-10 (anxiety-what-you-need-to-know, when-someone-you-love-is-losing-faith, a-month-of-prayers-for-prodigals, parenting-during-deployment); teaser-shaped half didn't displace good content in any of the 12 probes; Stage-1 bimodal prediction validated, no re-ingest needed. **Retrieve (2026-06-04):** spot-retrieval via `pnpm query` against 6-source space (8,514 docs / 23,522 chunks); no code changes. Family-axis queries: familylife dominates "spiritual leadership" 10/10, "discipling teenagers" 10/10, "raising children with character" 8 fl + 2 thelife (rank 2+9), "rebuilding trust after affair" 9 fl + 1 thelife. Cross-source health: "is Christianity intolerant?" → #1 sightline 0.686 + #2 jf 0.673 (identical to slice 5; slice #3→#4 closure intact); "assurance of heaven" → #1 thelife 0.551 + **#2 swg "How to Be Sure of Heaven" 0.548 — IDENTICAL to slice 5, the 0.003 edge held; slice-1 founding source NOT buried by +9,815 fl chunks**; "anxious and can't sleep" → 3 thelife + 2 familylife (was all 5 thelife in slice 5 — fl meaningfully enters former monopoly; /equip/anxiety-what-you-need-to-know surfaces as real teaching at rank 4, validates Stage-1 bimodal-/equip/ prediction). Negatives @ minScore 0.37: pure secular 0 hits, faith-adjacent "Quran/fasting" 0.388-0.441 (below 0.55+ positive band). **minScore 0.37 holds at 6 sources; 3-key dedup intact; no regressions.** **Ingest (2026-06-03):** drained all 2,239 pending raw → **2,239 docs / 9,815 chunks / 9,815 embeddings** (`openai/text-embedding-3-small`, 1536d); 1:1 chunks:embeddings, 0 null dropped, **0 chunk_count mismatches**; chunks/doc min 1 / p50 4 / avg 4.38 / max 100 (143k-char testimony outlier — sits between thelife 1.76 devotional-heavy and jf 6.1 long-blog). Whole corpus now 6 sources / 8,514 docs / **23,522 chunks** (+60% vs slice-5 end). Verify gate at new size: 76/0 depcruise, 0 lint errors, typecheck clean, 114/114 tests — but the data growth tripped **FOLLOW-UP J #17** in `tests/retrieval.integration.test.ts` (HNSW post-filter under-recalls in-scope docs when out-of-scope neighbors dominate the graph at 23k+ chunks). Test loosened to assert only what's reliable; empirical evidence (max real cosine vs `oneHot(0)` = 0.12) appended to #17. **Acquire (2026-06-03):** discovery from 3 post-sitemaps kept **2,329 of 2,330** seen URLs (homepage `/` correctly dropped). Live crawl staged **2,239 / 2,329 (96.1%)** to `raw_documents` across 2 passes (pass 1 SIGINT-stopped at 1,431 for laptop disconnect, pass 2 walked the full list — FOLLOW-UP K #32 filed for fetch-layer idempotency). All status 200, perfect 1:1 distinct canonical_url, zero null titles, **zero 429s across 4,569 fetches** (WP VIP didn't throttle once). Skips (90): 88 too-thin = 84 `/equip/` teaser hubs (PDF/course download landings — content not in HTML) + 4 `/articles/` bare category-index pages; 2 transient fetch-failed. raw_content chars min 251 / avg 6,585 / max 143,254. | **Slice #6** (`slice/familylife`), started 2026-06-03. WordPress VIP behind `sitemaps.xml` (30 child sitemaps); reuses slice #3/#4/#5 discovery crawler (FOLLOW-UP F). Recon 2026-06-03: open robots, no challenge wall, sample article 300 KB, selectors `.the-content` (innermost) / `.single-content` (outer fallback). **Operator-locked scope: posts only** — seeded `post-sitemap1` (939: 783 `/articles/` + 155 `/equip/` + 1 `/`) + `post-sitemap2` (997 `/articles/`) + `post-sitemap3` (394 `/articles/`) = 2,330. **`/equip/` finding:** bimodal page type — 70 staged rows include both real teaching (e.g. "How Can I be a Safe Place for Someone" 3,375 chars) and teaser hubs (e.g. "Compassionate Mentoring Online Course" 633 chars); retention deferred to Stage 4 eval. Sub-brand sitemaps (Art of Marriage, Blended, Stepping Up, etc.) NOT seeded — Cru-style sub-keys later if needed. See `docs/slices/familylife.md`. |
| Power to Change | https://powertochange.com | HTML | Deferred | — | **Deferred 2026-05-29 — decommissioned.** Recon on slice #5 found powertochange.com 301-redirects every content URL to thelife.com (homepage, `/blogposts/*`) or issuesiface.com (`/discover/*`, `/itv/*`). Sitemap still served (1000 entries, jetpack-WP) but it's a 2014-2017 relic; content is fully migrated. **Slice #5 pivoted to `thelife` (new row below)**; Issues I Face stays its own backlog row. See `docs/slices/thelife.md`. |
| thelife (Cru Canada) | https://thelife.com | HTML | Evaluated | **Eval (2026-06-03):** curated via the `golden` skill in content-grounded mode (operator pushed back on title-only review; we re-grounded every credit decision in actual chunk snippets via a surgical probe). Part A re-reviewed 12 regressed cases (7 hard misses + 5 degraded-rank) and added **67 paths across 12 cases** (mix: 25 thelife · 28 sightline · 9 jesusfilm-org · 5 starting-with-god) — the sightline additions incidentally **closed a slice-#4 sightline curation gap** (15+ docs in corpus but never credited), and thelife `/discipleship-101` ("Seven Steps to Helping a New Christian") closed the long-standing **slice-#3 `jf-believer-disciple-making` vocab-gap miss**. Part B added **10 new persona-diverse thelife-native cases** (3 seeker / 2 skeptic / 3 believer / 2 newcomer) covering grief-over-lost-child, post-abortion healing, depression+meds, cosmology, loving-God-and-hell, marriage drift, hard obedience, discipling new Christians, next-step after decision, finding a church (qa-golden.yaml now **52 cases**; engine sanity-check revised 3 of 10 cases by surfacing better matches than the initial draft). **Whole-corpus eval @ 5 sources / 52 cases / top-10:** recall@3 **1.000** · recall@10 **1.000** · coverage **0.624** · MRR **0.907** · P@1 **0.827**. **Per-source: thelife n=22 recall 0.955 / coverage 0.851** (perfect where credited) · sightline n=34 0.853/0.603 · jesusfilm-org n=27 0.815/0.664 · starting-with-god n=20 0.500/0.335 · **cru-10-basic-steps n=15 recall 0.200 / coverage 0.167** — unchanged from pre-curation: confirms slice-#4 honest finding that cru/swg get crowded out of top-10 on shared questions even when both legitimately answer. **Sharpest FOLLOW-UP I #15 evidence yet** (consumer-specified retrieval diversity: `maxPerSource` / MMR) — mechanism-not-policy, lives in the consumer layer. **`minScore 0.37` holds at 5 sources:** 4/4 secular negatives (running shoes / leaking faucet / vacation / LLC) return 0 hits; Quran/Jesus faith-adjacent cluster 0.436–0.448, below the 0.55+ positive band; Buddhism/meditation 0. **Retrieve (2026-06-02):** spot-retrieval against the 5-source space (~14.7 k chunks) via `pnpm query` — discipleship "how do I grow as a disciple" → top 3 thelife (0.706/0.666/0.666), #4–5 jf (0.643/0.632); "I'm anxious and can't sleep" → **all 5 thelife (0.594–0.572)** — cleanest FOLLOW-UP I #15 small-source-crowding evidence yet (predicted at slice unpack, not a regression); "is Christianity intolerant?" → #1 sightline (0.686), #2 jf (0.673), #3–5 sightline (slice #3→#4 closure of `jf-skeptic-intolerant` intact); "how can I be sure I will go to heaven?" → #1 thelife (0.551), **#2 swg flagship "How to Be Sure of Heaven" (0.548)** — edged by 0.003, cross-source health preserved. 3-key dedup intact at 5 sources. **`minScore 0.37` holds at 5 sources**: secular "index fund" = 0 hits; "Ramadan teach about fasting?" returns 5 legitimate Christian-fasting hits 0.401–**0.495** (no Islamic content in corpus, honest "fasting" topic overlap, below 0.55+ positive band — top edged above slice-#3's 0.389 ref, flag for Stage 4 re-check). Stage 3 commit: 3a `7aedbad`; no code changes. **Ingest (2026-06-02):** drained all 4,485 pending raw rows → **4,485 docs / 7,905 chunks / 7,905 embeddings** (`openai/text-embedding-3-small`, 1536d); 1:1 chunks:embeddings, 0 null dropped, **0 chunk_count mismatches**; chunks/doc min 1 / avg **1.76** / max 17 (lower than Sightline's 2.5 because short devotionals dominate, 3,869 of 4,485 docs). Idempotent re-run drained 0. **Full gate green at new size**: depcruise 0/75, lint 0 errors, typecheck clean, **112/112 tests** — the slice-#3/#4 integration-fixture risk did NOT bite despite ~3.2× corpus growth to 5 sources / ~6.5 k docs / ~14.7 k chunks. Stage 2 commit: 2a `f50e2e7`. **Acquire (2026-05-30):** 2-pass crawl staged **4,485 / 4,552 distinct rows (98.5%)** to `raw_documents` — 616 bare-root articles + 3,869 devotionals; all status 200, 0 null titles; chars min 252 / avg 2,454 / max 24,164. Pass 1 @ 1,000 ms delay drew ~45% HTTP 429 (Cloudflare rate-limit kicks in below 1 req/s); pass 2 @ 2,000 ms ran at <2% 429, proving 2,000 ms is the right setting. Stage 1 commits: 1a `86a98c4` · 1b `cb4281d` · 1c `c9695aa` · 1d `8026f14`. | **Slice #5** (`slice/thelife`), started 2026-05-29 — **live successor to Power to Change**. Statamic-powered, open robots (`Disallow:` empty), flat `/sitemap.xml` (7,834 `<loc>` entries, 6,478 with `lastmod` 2026 — actively maintained). **First Statamic source for the discovery crawler** (slice #3/#4 were WordPress/Yoast). Recon initially miscounted (assumed articles at `/articles/<slug>`; reality is **bare-root single-segment** `/<slug>` — `/articles/` namespace is tag indexes only); corrected at 1c via dry discovery. **Operator-chosen scope: articles + devotionals (~4,552 kept after correction)** — explicit fork over articles-only (623) given the FOLLOW-UP I crowding signal; taking the broader scope to sharpen #15 evidence rather than soften it. Content selector `.article-body` confirmed on BOTH shapes. See `docs/slices/thelife.md`. |
| thelife — French (`thelife-fr`) | https://laviejenparle.com | HTML | Evaluated | **Acquire (2026-06-24):** 156 pages staged (sibling Statamic domain, same `.article-body`; genuine French verified). **Ingest (2026-07-02):** 156 docs / **651 chunks** on `qwen/qwen3-embedding-8b` (first-time ingest, embedder-gated — see "Embedding model swap"). **Eval (2026-07-02/03):** 10 `tlfr-*` golden cases (fr-scoped retrieval): **recall@10 1.000 · coverage 0.817 · MRR 0.900**; LLM-judge suite avg 0.8 (>0.7 bar), no 0s; operator-approved + merged 2026-07-03. Negatives in `docs/slices/thelife.md`. | Language variant of thelife — see the "Multilingual acquisition" + "Embedding model swap" sections below. Prod: **ingested + evaluated** — landed with the prod re-embed cutover verified 2026-07-08 (156 docs embedded; dashboard row `done`). |
| thelife — Chinese (`thelife-zh`) | https://uwota.com | HTML | Evaluated | **Acquire (2026-06-24):** 332 pages staged (same shape; genuine Simplified Chinese verified). **Ingest (2026-07-02):** 332 docs / **460 chunks** on qwen. **Eval (2026-07-02/03):** 10 `tlzh-*` golden cases (zh-scoped): **recall@10 1.000 · coverage 0.892** — after the pgvector `iterative_scan` fix ([#17](https://github.com/JesusFilm/jesusfilm-rag/issues/17)); was 0.800 with 2 zero-result cases before it. LLM-judge suite avg 0.8, no 0s; merged 2026-07-03. | Language variant of thelife — same sections as fr. Prod: **ingested + evaluated** — landed with the prod re-embed cutover verified 2026-07-08 (332 docs embedded; dashboard row `done`). |
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

---

## Multilingual acquisition (2026-06-24)

The first 6 sources were acquired **English-only by accident** — the scrape
policies only ever looked at English pages. This pass made acquisition
multilingual + resumable and acquired the **non-English** content. **Ingestion
is deliberately deferred** (blocked on a pending embedder-model swap): these rows
land as pending `raw_documents` (`ingested_at IS NULL`) to be drained later.
*(Deferral resolved 2026-07-03 — the pending rows were drained on the qwen swap;
see "Embedding model swap" below.)*

A per-source live-sitemap recon (+ adversarial verify + content spot-read) found
the non-English content is **concentrated, not uniform** — and that two
candidates that *looked* multilingual were not real and were rejected.

| Source | Lang | Where | Acquired | Notes |
|--------|------|-------|----------|-------|
| `thelife-fr` | fr | `laviejenparle.com` (sibling domain) | **156** | New source. Same Statamic template + `.article-body` as thelife; 2000 ms. Articles = bare-root single-segment slugs (`/articles/*` + `/devotionals/*` are 100% tag-index pages). Verified genuine French. |
| `thelife-zh` | zh | `uwota.com` (sibling domain) | **332** | New source. Same shape; verified genuine Simplified Chinese. |
| `familylife` (es) | es | `www.familylife.com/us-latinos/` (path prefix, own `us-latinos-sitemap1.xml`) | **1** | Folded into `familylife` (`languages: ["en","es"]`). Verified against the authoritative `sitemaps.xml` index (per `robots.txt`): `us-latinos-sitemap1.xml` is the **only** Spanish sitemap and lists just 1 acquirable article (`principios-fundamentales`; the bare landing is dropped). Deeper Spanish sub-sections (`vida-en-familia-hoy`, `recursos-gratuitos`) appear in **no** sitemap and render article links via JS → headless-fetcher territory ([#8](https://github.com/JesusFilm/jesusfilm-rag/issues/8)). 1 page is the complete sitemap-discoverable Spanish corpus, not a crawl gap. |
| `thelife` (fa) | fa | `shagerdan.com` (sibling domain) | **0 — BLOCKED** | Cloudflare **403** wall on all content pages to a non-JS fetcher (homepage + articles), exactly like EveryStudent. Sitemap (~2,946 URLs) is fetchable but bodies are not. NOT registered. Needs a headless fetcher — **FOLLOW-UP G / [#8](https://github.com/JesusFilm/jesusfilm-rag/issues/8)**. |
| `cru` (es) | es | `cru.org/mx/es/` (path prefix on the SAME domain → part of `cru`, not a sibling key) | **537 staged** | **CORRECTED 2026-07-09.** The old entry here read "0 — NOT REAL: the Spanish-locale path serves untranslated English lesson bodies" and generalised from one path. Only `/mx/es/.../10-pasos-basicos/` is untranslated English (it carries the *English* `.article-long-form` template and reads `lang=EN`) — that path is blocked. Of the 537 remaining staged docs, **489 are genuine Spanish**, 3 mixed, 4 thin, and **39–41 are English bodies** clustered in `comparte-evangelio` (31/98) and `vida-y-relaciones` (10/194); they share **zero `body_hash`** with any us/en doc, so they are untranslated originals to keep and label `en`. **`<html lang>` does not help** — the English `/10-pasos/` pages declare `lang="es-mx"`. Lesson stands and is now sharper: **trust the extracted body, not the path, not the chrome, and not a sample** (a 30-page spot-check found 0 English here and was simply unlucky). Per-document language detection at ingest is therefore mandatory → landed as ADR-0006/0007 (architecture invariant 6). |
| `starting-with-god` (20+ langs) | many | separate sibling **org domains** (empezandocondios.com es, demarreravecdieu.com fr, …) | **deferred** | Primary domain is English-only. 20+ sibling sites, each a different CMS needing its own selector recon (~2–3k URLs total) — **[#43](https://github.com/JesusFilm/jesusfilm-rag/issues/43)**. |
| `jesusfilm-org`, `sightline-ministry` | — | — | english-only | Verified: no `hreflang`, no language paths, `/es/` falls back to English. |

**Prod acquire (2026-06-24, confirmed):** ran `acquire:production --resume` for
all three. Prod staged counts match local exactly — `thelife-fr` **156/156**,
`thelife-zh` **332/332**, `familylife` **+1 es** (`principios-fundamentales`)
plus 1 incidental new English article from the sitemap delta. All rows are
pending (`ingested_at IS NULL`), awaiting the embedder-gated ingestion. Quirk:
the familylife run re-attempts ~88 `too-thin` `/equip/` resource pages on every
run — they extract no body so never stage, so `--resume` never skips them
(harmless wasted fetches; adding `/equip/` to the block list would stop it,
English-side, out of scope for this pass).

**Mechanism added (both serve resumability and the multilingual delta):**
- **`--resume`** (FOLLOW-UP K / [#32](https://github.com/JesusFilm/jesusfilm-rag/issues/32)) — `acquireSource` drops canonical URLs already staged for the source (`RawDocumentStore.listStagedCanonicalUrls`, ingested **and** pending) before fetching. A kill costs ≤1 in-flight URL; a restart re-fetches nothing; a multilingual run skips the already-acquired English automatically. Used live to recover thelife-zh's 19 transient Cloudflare fails (re-ran, fetched only those 19).
- **`--dry-run`** — resolve discovery + filters + resume-skip and print the URL count, fetch nothing. Used to validate every new policy before crawling.
- No `discover.ts` change: each sibling domain publishes its own sitemap listing its own-language URLs under `<loc>`, so direct sitemap crawl suffices (no `hreflang`/`xhtml:link` traversal).

**Lesson:** trust the **extracted body**, not the site chrome — a Spanish URL +
Spanish nav (cru.org `/mx/es/`) can still serve English content. The content
spot-read is the gate, not the URL/locale.

---

## Embedding model swap — qwen (2026-07-02/03, PR #57 / ADR-0005)

The corpus-wide re-embed onto **`qwen/qwen3-embedding-8b`** (1536d via OpenRouter,
query-side `EMBED_QUERY_INSTRUCTION`; documents embed raw). This event supersedes
the per-row eval baselines above — **every eval number recorded in the rows above
was measured on `openai/text-embedding-3-small`**; drift judgements from here on
compare against the qwen baseline below (`docs/eval-approach.md` drift rule).

**Re-embed (local dev corpus, 2026-07-02):** all 8 sources, ~9,000 docs /
**24,642 chunks**, per-source `pnpm index --source <key> --force` in 6 parallel
streams (safe: zero 429s; per-source is max fan-out — no row claiming in the
drain). This also **drained the pending multilingual rows** from the 2026-06-24
pass (first-time ingest): `thelife-fr` **156 docs / 651 chunks**, `thelife-zh`
**332 docs / 460 chunks**, `familylife` es **1 doc / 3 chunks**
(`principios-fundamentales`; retrieve/evaluate for es still pending — 1 page).

**Eval mechanism added:** golden cases are **language-scoped** — `caseLanguage()`
derives each case's language (explicit `language:` field, else intersection of
the relevant sources' registry languages) and passes it as a retrieval filter, so
results in other languages can't displace the language under test. Landed with a
pgvector fix (`SET LOCAL hnsw.iterative_scan = strict_order`) closing FOLLOW-UP J
[#17](https://github.com/JesusFilm/jesusfilm-rag/issues/17) — post-filter window
starvation had zh recall@10 at 0.800 with two zero-result cases; after the fix
zh hit 1.000/0.892.

**English drift gate (62 en cases, language-scoped): PASSED with improvement**
after a judge-gated re-credit of the living relevant sets (107 additions across
29 cases; 61/62 judge-approved). vs the 3-small baseline: recall@3 1.000 (was
0.984) · recall@10 1.000 (=) · coverage 0.656 (was 0.648) · MRR 0.876 (was
0.870) · P@1 0.790 (was 0.758). One honest ranking regression escalated, not
re-credited: `swg-newcomer-gospel` (direct gospel answers fell rank 1 → 3/10
behind adjacent sightline meta-content; still recall@10-covered).

**Golden suite now 82 cases** — the 10 `tlfr-*` + 10 `tlzh-*` cases (drafted via
`/golden`, LLM-judge suites fr 0.8 / zh 0.8 on the >0.7 bar) were
operator-approved and folded in 2026-07-03; every non-English case carries `# EN:`
question + translated `# RETRIEVED` evidence per the multilingual MUST.

**NEW BASELINE (qwen, whole corpus, 82 cases @ top-10, language-scoped):**
recall@3 **1.000** · recall@10 **1.000** · coverage **0.704** · MRR **0.862** ·
P@1 **0.756** — zero missed cases. Per-source: familylife n=22 1.000/0.839 ·
thelife n=31 0.871/0.651 · **thelife-fr n=10 1.000/0.817** · **thelife-zh n=10
1.000/0.892** · sightline n=40 0.825/0.621 · jesusfilm-org n=29 0.759/0.580 ·
starting-with-god n=22 0.545/0.427 · cru-10 n=16 0.375/0.313 (small-source
crowding, FOLLOW-UP I [#15](https://github.com/JesusFilm/jesusfilm-rag/issues/15)
— consumer-layer concern, unchanged by the swap).

**Production status:** prod is now **fully on `qwen/qwen3-embedding-8b`** — the
prod re-embed + serving cutover ([`docs/ops/prod-reembed.md`](./ops/prod-reembed.md))
**completed and was verified 2026-07-08**. Corpus at that verification (historical
**pre-cru snapshot**): **100% qwen**, 9,044 docs / 24,719 chunks, 0 pending, 0 left on
3-small. (The slice-#7 cru cutover 2026-07-14/15 + language sweep have since grown prod
to **11,477 docs** — all post-verification additions ingested directly on qwen.) Serving cutover: Railway service vars
`EMBED_MODEL_ID` + `EMBED_QUERY_INSTRUCTION` set, Doppler `forge-rag/prd` renamed
the parked key to plain `EMBED_QUERY_INSTRUCTION`, and the `jfrag-retrieve`
catalogue model default flipped to qwen. Post-cutover verify (read-only) passed:
`pnpm smoke` 200 / contract-valid ~1.3s (qwen latency signature); source-scoped fr
+ zh retrieves 5/5 same-language with no model-mismatch guard; whole-corpus
`eval:production` had zero English case misses, with English per-source recall /
coverage matching the local qwen baseline within noise. Provider-latency follow-up
(qwen 1–11s vs 3-small ~1s round-trips): observability issue
[#58](https://github.com/JesusFilm/jesusfilm-rag/issues/58).
