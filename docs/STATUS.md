# STATUS — jesusfilm-rag

Live "you are here" for the build. Stable design lives in
[architecture.md](./architecture.md); per-source progress in
[sources.md](./sources.md). **This file is the churn layer** — update it
whenever state changes; keep it to ~one screen.

_Last updated: 2026-07-30 — **the #111 campaign has CLOSED PHASES 1–2**:
47 of 48 sibling domains registered, **45 acquired locally, 2,281 documents**,
zero duplicate-content groups, zero doctype leaks, gate green at **744 tests**.
Five batches on `feat/everystudent-siblings`, **nothing pushed and no PR** (that
is Phase 6). **Nothing is indexed yet — Phase 3 (`pnpm index`) runs ONCE and is
the next action.** Three domains are unacquired by decision, none blocking:
`sr` ([#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129)), `he`
([#132](https://github.com/JesusFilm/jesusfilm-rag/issues/132)) and `lv`
([#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133)). Two prod-corpus
defects were found and filed rather than fixed on this branch:
[#131](https://github.com/JesusFilm/jesusfilm-rag/issues/131) (`everystudent-ar`
serves a full Gospel of John, against the policy that entry set) and the
standing [#128](https://github.com/JesusFilm/jesusfilm-rag/issues/128). Full
resume contract:
**[docs/slices/everystudent-siblings.md](./slices/everystudent-siblings.md)**.
Previously:
slice #10 (EveryStudent French, `everystudent-fr`)
is DONE — all four stages GREEN and PROMOTED TO PROD**, closing the #112 route
both locally and in prod (en ✅ → ar ✅ → fr ✅). 67 French articles acquired,
ingested (67 docs / 418 chunks, 66 `fr` / 1 `null`), queryable, evaluated, and now
**live in the prod corpus** via the bulk-copy path — copy digest and per-document
fingerprint both matched local↔prod, `eval:production` @ 18 cases returned
**coverage 0.856, identical to local, with all 18 cases at rank 1**. Prod is now
**11,728 docs / 34,434 chunks / 11 sources**. **Local eval @ 130 cases / 11
sources: recall@3 0.954 · recall@10 1.000 · coverage 0.736 · MRR 0.854 · P@1
0.746 — every headline metric UP** on the pre-curation baseline. ⚠️ **The branch
is still UNMERGED, so prod leads `main` on this source** (same inverted order as
slice #9). Three findings: the child-suffering soundness problem behind
**[#123](https://github.com/JesusFilm/jesusfilm-rag/issues/123) is estate-wide,
not Arabic-specific** — and its French document is now **live and served in prod**;
a real **hell-question vocabulary gap** is recorded in the eval; and the promotion
**falsified `copy-raws.md`'s drift prediction**, correcting the rule to "a
language-scoped eval drifts iff that *language's* subcorpus differs local↔prod".
Previously:
**slice #9 (EveryStudent Arabic) is DONE — all four
stages GREEN and PROMOTED TO PROD**. `everystudent-ar` is live in the prod corpus
(67 docs / 283 chunks via the bulk-copy path, prod eval identical to local);
**PR [#124](https://github.com/JesusFilm/jesusfilm-rag/pull/124) MERGED
2026-07-27**, so `main` now carries that slice. Arabic enters the eval at
**coverage 0.979 / recall@10 1.000**; whole
corpus @ 118 cases is **recall@10 1.000 · coverage 0.730**. Two findings filed:
**[#123](https://github.com/JesusFilm/jesusfilm-rag/issues/123)** (content
soundness — one item is time-sensitive) and **FOLLOW-UP O** (eval retry posture).
The **#17/#75 canary is resolved**, gate green at 432/432; slice #8 MERGED
(PR #119) and live in prod; prod is 100% qwen3_

## You are here

**▶ The GotQuestions English slice is the active work on `slice/gotquestions` —
see [docs/slices/gotquestions.md](./slices/gotquestions.md).** It establishes the
large English corpus first; the remaining same-domain translations are locked as
one later batched campaign in
[docs/slices/gotquestions-multilingual.md](./slices/gotquestions-multilingual.md),
not 215 individual slices. The #111 sibling-domain campaign retains its durable
state below and is not rewritten by this slice.

⚠️ **The slice narrative below is HISTORY, not current state.** It stops at
slice #9 and predates the campaign entirely. It is kept for the per-slice detail
that is not recorded anywhere else; do not read its opening line as "you are
here".

---

**Slice #9 (EveryStudent Arabic, `everystudent-ar`) is DONE — all four stages
green, source Evaluated** on `slice/everystudent-ar` (2026-07-25), **not yet
merged**. The second walled source (Firecrawl, ADR-0012) and the **first Arabic
content in the corpus**. 68 hand-listed seeds from #114's already-paid
`/v2/map` inventory (84 URLs, minus 11 `/m/*` menu indexes, 4 `/bible/**.pdf`
and the homepage).

**Evaluated (Stage 4): 12 Arabic cases / 27 credits; qa-golden.yaml 106 → 118.**
Arabic-scoped **recall@3 0.917 · recall@10 1.000 · coverage 0.979 · MRR 0.938 ·
P@1 0.917** (11 of 12 at rank 1). **Whole-corpus @ 118 cases / 10 sources:
recall@3 0.949 · recall@10 1.000 · coverage 0.730 · MRR 0.839 · P@1 0.720** —
coverage/MRR/P@1 all UP on the 106-case baseline; recall@3 dipped 0.004 from one
rank-4 case. **Per-language: `ar` 0.979** · en 0.641 · es 0.938 · fr 0.817 ·
zh 0.867, **0 unscoped**. Every prior source unchanged.

🔎 **Part A (re-review) was a provable NO-OP — the first time a new source
*could not* disturb prior answer keys.** All 106 pre-existing cases resolve to a
non-`ar` language (en 78 · fr 10 · zh 10 · es 8, 0 unscoped) and
`corpus-search-store.ts:62` is a strict `eq(documents.language, …)`, so Arabic
docs are **ineligible by construction**; confirmed empirically — zero Arabic docs
appear anywhere in the 106-case results, and the metrics reproduced slice #8
exactly across two runs. The cheap structural check (offline, seconds) now
precedes the expensive re-review in `skills/slice` v12.

⚠️ **`everystudent` 0.818 ↔ 0.773 is BOUNDARY JITTER, not a regression.** It
traced to one credited doc — `everystudent/forum/contradictions.html` at **rank
10, score 0.648, rank 11 at 0.647**. A 0.001 gap at the exact top-10 cutoff,
flipped by float noise in the query embedding between sessions; both eval modes
are individually reproducible, so it is neither HNSW nondeterminism nor the
Arabic ingest. **At n≈20 one boundary doc is ~0.045 of per-source recall** —
per-source numbers have been read as exact and are not (`eval-approach.md`).

🔑 **DECISION — for a single-source language, gate answer-key entry on RELEVANCE
only and FILE soundness.** The slice #7/#8 both-axes-at-0.75 rule assumes several
sources compete on a question; with one source and `ar`-scoped cases it does not
filter a key, it **deletes** it — both axes approved **6 of 52** credits leaving
**9 of 14 cases empty**, versus **27 of 52** on relevance alone. It would also
mark the engine wrong for returning the best document in the corpus
(`/a/childraped.html`: relevance **0.91**, the panel's highest, soundness 0.52),
and excluding a doc from a key never stopped the RAG serving it. Judge panel:
**52 pairs × 3 lenses = 156 judgements, coverage complete, max spread 0.35 → 0
escalations** (convergence caveat holds a third time).

🚨 **[#123](https://github.com/JesusFilm/jesusfilm-rag/issues/123) — content
soundness, mean 0.703 (lowest of any source).** False factual claims (complete
Bible books "from 300 BC" in the flagship Muslim-readership article; "Athanasius
367 BC"; an invented "11 to 14 soldiers" at the tomb), **modalism in the Trinity
explainer**, and polemic against the very readership the site exists to reach
(`/a/matter.html`, soundness 0.47, lists "the God of Islam" beside praying to a
cactus). **Time-sensitive: `/a/endingthe8th.html`** carries graphic suicidal
ideation and self-harm detail under "Jesus Christ is the cure for depression"
with **no doctor, therapy or medication mentioned** — and it ships to prod with
the source.

ⓘ **FOLLOW-UP O filed — `pnpm eval` inherits the fast-fail QUERY retry posture**
(`QUERY_EMBED_MAX_ATTEMPTS=2`, 4 s) built for `/v1/search` latency. A 118-case
offline eval has no latency SLA and no resume, so one transient blip discards the
run — it killed two runs, each after ~100 cases. Workaround (env only, serving
path untouched): `QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000 pnpm eval`.

**Retrieved (Stage 3): Arabic is queryable, and the corpus is genuinely
cross-lingual.** Three real Arabic questions against the unfiltered 10-source
space took **rank 1 on two of three** — "هل الله موجود؟" (does God exist) →
`/a/isthere.html` **@ 0.732**, "كيف أتعامل مع القلق والخوف؟" → `/a/coronavirus.html`
**@ 0.643** — all ranked and cited off real Arabic prose. The anxiety query
returned **four languages in one top-5** (`ar` · `zh` · `fr` · `ar` · `en`), and
"does God exist" surfaced `everystudent.com/features/is-there-a-god.html` at #5:
**the English original of the very same article**, matched to its own Arabic
translation across the language boundary. **`language:"ar"` is airtight** — an
*English* question under `--language ar` returned 5 Arabic docs and nothing else,
so the filter binds on the **document**, not the query language;
`corpus-search-store.ts:62` is a strict `eq(documents.language, …)`, so other
languages **and NULLs** are excluded by construction. Arabic is **0.56% of the
corpus** (65 of 11,621), so those rank-1 results are the first live proof that
the `iterative_scan = strict_order` mitigation carries a genuinely rare language
post-#17/#75. **minScore 0.37 HOLDS at 10 sources — keep unchanged:** clean
secular negatives ceiling **0.349** vs positive floor **0.538**. Two probes
crossed and neither is encroachment — "write a CV" @ 0.466 is a **true positive**
(`/a/jobinterviews.html` really exists) and "five pillars of Islam" @ **0.382**
is by-design adjacency for a source written for Muslim readers, though at just
**0.012 above the cutoff** it is the tightest faith-adjacent margin yet and the
number to watch when `everystudent-fr` lands.

ⓘ **Slice #8's flagged English near-miss is largely explained.** The
resume-writing negative recorded at 0.505 as "the faith-adjacent band's closest
approach yet" is **not a clean negative for this corpus** — hiring/career content
exists across four sources (`familylife/…/now-hiring` 0.466, the Arabic
job-interviews doc 0.416 cross-lingually, plus cru and everystudent pages).
Different wording from slice #8's exact probe, so this doesn't disprove the 0.505
reading — but the approach was toward **real documents**, not noise at the cutoff.

**Ingested (Stage 2): all 67 pending → 67 docs / 283 chunks / 283 embeddings**
(`qwen/qwen3-embedding-8b`, 1536d) — perfect 1:1, 0 `chunk_count` mismatches,
single model, chunks/doc avg 4.22 (max 16); `/a/` 61 docs / 272 chunks · `/v/`
4 / 9 · root 2 / 2. Idempotent re-run drains 0. 10 transient OpenRouter embed
timeouts, all recovered inside the retry policy (#64, as slice #8). **The
offline language pre-flight held EXACTLY at ingest: 65 `ar` / 2 `null`**, the
nulls being precisely the two predicted `/v/` testimony pages — per-document
detection (invariant 6) labelled the first Arabic in the corpus off the content,
not the URL path. **Corpus now 10 sources / 11,621 docs / 33,937 chunks.** Gate
re-run WITH the new data: green, 432/432.

ⓘ **Latent finding, NOT on the live path:** `chunks.search_tsv` is
`to_tsvector('english', …)` and `keywordSearch` hardcodes the `'english'`
config, so Arabic (and the existing `zh`) get no useful stemming there.
`keywordSearch` has **no caller** in the retrieval context — the Retriever is
pure vector search (invariant 5) — so nothing live is affected. It only becomes
real if hybrid retrieval is ever wired. Predates this slice.

**Acquired 67/68** — the one skip is `/v/video7.html` (status 200, too-thin: a
genuine media stub). 67 rows / 67 distinct URLs / 0 null titles / 0 non-200;
chars avg 6,442, max 23,906. **Cost exactly 68 credits at exactly 1.00/page**
(896 → 828) — the 5-cr/page tightened-wall risk did not materialise, so
`everystudent-fr`'s ~87 still fits this period. `.content4` **binds on this
host**, confirming #112's shared-template claim.

**Language pre-flight (offline, before ingest): 65 `ar` / 2 `null`, 0
out-of-declared-set warnings.** Both nulls are `/v/` testimony pages rather than
flagship articles — `/v/gods-help.html` at `ar` 0.718 (just under the 0.75 gate)
and `/v/personally.html` at **`ur` 0.716** (Urdu shares Arabic script). **Null
rate 3.0% vs English's 7.7%.**

📌 **Standing policy set 2026-07-25 — null-language docs are EXCLUDED from the
eval, permanently, and this is no longer a per-source question.** Every source
produces some nulls (honest ADR-0007 blanks); we cannot know their language, so a
`language:`-scoped expectation on one is unreturnable by construction. They are
never credited, never swept during a slice (**`pnpm lang:sweep` is a production
corrective tool only**), and not lost — the dashboard carries a per-source null
count, and that count is the record. Written into `skills/slice` **v11**,
`skills/golden` **v6** (Guardrail #3a, with `d.language IS NOT NULL` in
the survey query so a null can't reach a draft), and `docs/eval-approach.md`
(Multilingual eval, correction 3) — because it had been re-asked at every new
source. The accepted cost is named there: slice #8's null
`/wires/loneliness.html` left that case with zero everystudent credits.

**Slice #9 is complete.** See [docs/slices/everystudent-ar.md](./slices/everystudent-ar.md).

⚠️ **The #17/#75 canary is CLOSED as a false alarm** (`55bfd7f`). `pnpm test` was
425/426 for months and STATUS gated the `ar`/`fr` slices on investigating it.
Diagnosis: **the test fixture, not the engine.** Sparse query vectors are not
HNSW-reachable once the corpus is large — measured against the real index, a
random *dense* unit vector at exact cosine 0.068 returns 15 rows while a one-hot
at 0.113 returns **0**, and `hnsw.ef_search = 1000` does not rescue it. Real
embeddings are always dense, so production was never affected; CI stayed green
only because a fresh DB has a trivially small graph. The shipped
`hnsw.iterative_scan = strict_order` mitigation was independently confirmed
**load-bearing and working**: a real `en` query vector with a `language='zh'`
filter returns 15 rows (top 0.5742) with it and **0 rows** without. Fixture
rebuilt on deterministic dense vectors preserving the same geometry; still a real
guard (removing the `SET LOCAL` turns it red). **Gate is now fully green for the
first time since slice #6.**

---

**Slice #8 (EveryStudent English, `everystudent`) is DONE and MERGED** to `main`
(PR #119, `7277471`, 2026-07-24) **and is live in prod** — the prod inventory
reads `everystudent / en / 108 embedded docs` (108 + the 9 null-language docs =
117). ⚠️ Issue #112's slice-run handoff still claims prod reads
`acquire:false ingest:false`; **that handoff is stale**, the dashboard and prod
DB are correct. The first
walled source, acquired through Firecrawl (ADR-0012, #114): **117 docs / 550
qwen3 chunks** at exactly 117 credits, queryable and evaluated in the 9-source
space. Scope was the English domain only — `everystudent-ar` /
`everystudent-fr` are separate keys, queued (ADR-0006, #112).

**Stage 4 was the first agent-driven `/golden` run (v4)** — the operator gated
the fork, the spend, and the write instead of typing the command. A 3-lens
judge panel (theologian / pastor / mature Christian) scored **230 (case, doc)
pairs over 160 whole documents**, both axes gated ≥ 0.75 in code: **85 credits
approved, 141 (61%) rejected as sound-but-off-question** (the tripwire, worse
than slice #7's 48%), 0 soundness failures, 0 escalations (max spread 0.20 —
the convergence caveat stands). qa-golden.yaml **96 → 106 cases** (+31
gap-fixes on 14 prior cases, +10 everystudent-native cases on the
seeker/apologetics axis).

**Final eval @ 106 cases / 9 sources:** recall@3 **0.953** · recall@10
**1.000** · coverage **0.703** · MRR 0.828 · P@1 0.698. **everystudent n=22:
recall 0.818 / coverage 0.739**, 9 of 10 native cases at rank 1. Every prior
en source moved UP — cru 0.861/0.636, thelife 0.878/0.634, sightline
0.783/0.563, **swg 0.458/0.375** (the feared displacement never materialized;
two slice-#1 gap docs credited as side-effects). **minScore 0.37 holds**; note
a resume-writing negative reached 0.505, the faith-adjacent band's closest
approach yet to the 0.55+ positive cluster.

✅ **Both slice-#8 carry-forwards are now CLOSED** (2026-07-25): (1) the source's
**9 null-language docs are excluded from all eval credits** — and as of
2026-07-25 that is the **standing rule for every source**, not a per-source
decision, so they will NOT "enter the keys after a future `lang:sweep`"; they
stay out permanently and the dashboard's null count is the record (see the
standing-policy note above). The loneliness case crediting zero everystudent docs
is the accepted price. (2) `pnpm test` **is now 432/432** — the FOLLOW-UP J
#17/#75 canary was a stale test fixture, not an engine fault, and is fixed
(`55bfd7f`); the gate it placed on the `ar`/`fr` slices is lifted.
See [docs/slices/everystudent.md](./slices/everystudent.md).

---

**Slice #7 (Cru consolidated, `cru`) is DONE and MERGED to `main`** (PR #80,
2026-07-14). One whole-domain source (en+es+fr) superseding `cru-10-basic-steps`
and the short-lived `cru-es` (one domain = one source, ADR-0006). **2,444 docs /
8,497 qwen3 chunks**, queryable in three languages.

**Prod cutover is COMPLETE.** `cru` was ingested + embedded in prod 2026-07-14
(dashboard PR #87: index 9,044 → 11,488). The cutover initially only ADDED — the 11
superseded `cru-10-basic-steps` docs stayed duplicated (#85) until their transactional
removal 2026-07-15 (PR #93: 11 docs / 35 chunks deleted, zero unique content lost,
`cru` intact at 2,444). The prod language sweep (LLM detector, ADR-0009, PRs
#92/#95/#96) then drained unclassified docs **190 → 0** and relabelled the phantom
`vi` doc → `es` (#84). **Prod now: 11,477 docs, 100% `qwen/qwen3-embedding-8b`.**
(Timeline: the re-embed + serving cutover was verified 2026-07-08 on the then-9,044-doc
**pre-cru** corpus — see sources.md "Embedding model swap"; the cru cutover 2026-07-14/15
and the language sweep grew prod to 11,477, with everything added since ingested directly
on qwen.) ⚠️ **Known gap: no `eval:production` has run since the cru
cutover** — cru's prod "Evaluated" rests on the local slice-#7 eval; the last prod
eval (2026-07-08, post-qwen) had zero English misses.

**Stage 4 (eval) used a 3-lens LLM judge panel** (theologian / pastor / mature
Christian) instead of a hand-curated pass. Every proposed credit was scored on
**TWO orthogonal axes** — *relevance* (does it answer THIS question) and *biblical
soundness* — both gated at 0.75. **73 of 151 proposals were biblically SOUND but
OFF-QUESTION**: orthodox docs answering a question nobody asked. A soundness-only
rubric would have auto-accepted every one into the answer keys and quietly
corrupted the eval. 73 credits approved; suite **82 → 96 cases** (+6 en cru-native,
**+8 es — the first Spanish cases in the suite**). Prompt preserved at
`docs/prompt-samples/2026-07-14-jfrag-golden-judge-panel.md` — **promoted into
`skills/golden` v3 as Guardrail #6** (two-axis relevance ⊥ soundness;
shipped with PR #80).

**Final eval @ 96 cases / 9 sources:** recall@3 **0.938** · recall@10 **1.000** ·
coverage **0.689** · MRR 0.814 · P@1 0.677. **cru per-source recall 0.125 → 0.828,
coverage 0.063 → 0.576 with NO engine change** — the 0.125 was a **stale answer
key** (still crediting only the 11 retired 10-Basic-Steps pages against a 2,444-doc
source), never a retrieval regression. **Per-language coverage — a new view:**
en 0.614 · **es 0.938** · fr 0.817 · zh 0.867, **0 unscoped**. minScore **0.37
holds in Spanish** (es negatives ≤ 0.308; es positive band 0.622–0.739).

**Two engine changes shipped this slice:**
- **`08acd48` — per-language coverage.** ADR-0006 made `cru` the first single source
  carrying several languages, so the per-source view BLENDS them and can hide an
  unhealthy language. `coverageByLanguage()` splits them; a case with no derivable
  language surfaces as `(unscoped)` rather than being dropped (that state is a bug).
- **`3418717` — candidate fan-out cap bug.** `candidateTopK` ceilinged at a flat 50,
  so any `topK >= 17` fetched 50 chunks → ~33 docs after dedup: `search` answered a
  request for 100 results with 33 and said nothing. Prod (topK 5) and eval (topK 10)
  sit under the old cap and were never affected — deep-k **curation probing** exposed
  it, which means every "not ranked" verdict really meant "not in the top ~33".

**Findings filed:** **[#78](https://github.com/JesusFilm/jesusfilm-rag/issues/78)** —
18 docs below 0.75 soundness (14 cru, **3 thelife ⚠️ already in prod**, 1 familylife).
One real pattern: **prosperity drift** (tithe → financial return) across four sources.
Deliberately **not** blanket-excluded from the crawl — none are heresy (0.57–0.73), 4
of the 14 are Spanish machine-translation damage misfiled as doctrine, and it was a
sample of 151 of ~11,500 docs, not an audit.

**Engine findings from slice #7 (detail in the slice file):**
- **FILED → [#79](https://github.com/JesusFilm/jesusfilm-rag/issues/79)** (architecture
  §11 FOLLOW-UP N): retrieval returns **one chunk per doc** and cru articles open with
  long lead-in anecdotes → **40 of 151 docs judged `answer_buried`** (right doc, useless
  snippet); compounded by **1,375 cru chunks (16.2%) beginning with the junk string
  `0 100 0`** (AEM artifact, no other source has it). **#79 CLOSED 2026-07-16** — opt-in
  `includeDocument` full-document-per-hit shipped (PR #97, ADR-0011); the extraction-side
  `0 100 0` junk-strip (needs a cru re-ingest) and lead-in detection remain open candidates.
- **Still unfiled:** Cru's Spanish corpus is **machine-translated to near-unreadability**
  — an acquire-side quality ceiling, not a soundness problem (do not file it as one).

See [docs/slices/cru.md](./slices/cru.md).

**Slice #1 (Starting With God) is DONE and MERGED to `main`** (PR #2,
2026-05-25) — acquired (40 rows), ingested (**40 docs / 183 chunks / 183
embeddings**, `openai/text-embedding-3-small`), retrievable, evaluated:
**recall@3 0.90 · recall@8 1.00 · MRR 0.82 · P@1 0.70** @ minScore **0.37**.

**Slice #2 (Cru "10 Basic Steps", `cru-10-basic-steps`) is DONE — all 4 stages green,
Evaluated, and MERGED to `main`** (PR #11, `b3105f7`). 11 docs / 35 chunks / 35
embeddings; retrievable + cited; two sources now coexist in one ranked space.

**Slice #3 (Jesus Film Project, `jesusfilm-org`) is DONE — all 4 stages green,
Evaluated** — on `slice/jesusfilm-org` (2026-05-26), **not yet merged**. It
triggered **FOLLOW-UP F**: Stage 1 built the **discovery-crawl** model
(`CrawlPolicy.sitemaps`+`allow`/`block`/`articleHints`; `src/acquisition/discover.ts`
recurses a sitemap index → filters → URL list; fakes-tested), because jesusfilm.org
is too large to hand-list. The live crawl staged **349/349 blog articles, 0 skips**
(417 sitemap locs → 349 kept; /give/ + .kml filtered), ingested to **349 docs /
2114 chunks / 2114 embeddings**, retrievable + cited. The corpus is now **3 sources**.
**Stage 4 (eval) via `/golden`:** 12 new persona-diverse jf cases + re-reviewed 11
existing cases' living `relevant` maps (qa-golden.yaml now **32 cases**). Curated
whole-corpus eval @ top-10: **recall@3 0.906 · recall@10 0.938 · coverage 0.803 ·
MRR 0.777 · P@1 0.656**; per-source **jf 0.913** / swg 0.833 / cru 0.714. **Key
lesson re-confirmed:** the pre-curation drop (stale 20 cases → recall@10 0.85) was a
**living-relevant-set artifact, not a retrieval regression** — re-reviewing the maps
made the 3 displaced misses (gospel/witnessing/prayer) pass. 2 honest misses remain
(`jf-skeptic-intolerant` out-ranked by uniqueness docs; `jf-believer-disciple-making`
a vocabulary gap). **minScore 0.37 held** (FOLLOW-UP A @ 3 sources). 86 tests green.
Two follow-ups filed this slice: **#14 (H)** ingest-time tag/keyword enrichment, **#15
(I)** consumer-specified retrieval diversity. EveryStudent `Blocked` / NextStep `Deferred`.

Eval methodology (source-agnostic questions + multi-source living `relevant` sets,
recall+coverage @ top-10) is stable — see **[docs/eval-approach.md](./eval-approach.md)**.

## Next action

**▶ ACTIVE: GotQuestions English — register and test the flat-page discovery and
extraction policy, then dry-discover the exact article inventory before asking
for crawl/embedding budget approval.** State:
[docs/slices/gotquestions.md](./slices/gotquestions.md). Branch:
`slice/gotquestions`.

After English merges, translations use the single-source batched campaign state
at [docs/slices/gotquestions-multilingual.md](./slices/gotquestions-multilingual.md).
Fresh sessions resume that campaign by naming this file; they do not invoke 215
language slices.

**Preserved campaign state: #111 — 48 non-walled EveryStudent sibling domains.**
Branch `feat/everystudent-siblings`. **The state file is
[docs/slices/everystudent-siblings.md](./slices/everystudent-siblings.md) — read
it first; it is the complete resume contract and needs no chat history.**

This is a **batched campaign, NOT 48 `/slice` runs** — only acquisition is
per-source; ingest and eval are already whole-corpus single commands. Do not run
`/slice` for these.

_You are here (2026-08-04):_ **PHASES 1–4 ARE CLOSED. PHASE 5 IS IN PROGRESS —
14 of 45 golden suites written.**

⚠️ **This block was STALE until 2026-08-03** — it reported "Indexed: NOTHING YET"
and "Next: Phase 3" for four days after Phase 3 finished. That is the precise
failure this file hit on 2026-07-17 and the reason the campaign file's §0 exists.
**The campaign file is the truth; this is a pointer to it.**

| | |
|---|---|
| Registered | **47 of 48** |
| Acquired locally | **45** — 2,281 documents |
| Duplicate-content groups | **0** |
| Doctype leaks | **0** (14 cleaned up 2026-07-30, before Phase 3) |
| Gate | green — depcruise · lint · typecheck · db:check · status:check · **764 tests** |
| Indexed (Phase 3) | ✅ **2,281 / 2,281**, 12,974 chunks, ~95 min, 0 retries · 2026-07-30 |
| Language labels | ✅ 225 null + 182 mislabelled → **0** (LLM sweep, 2026-07-31) |
| Retrieve (Phase 4) | ✅ **47 / 47**, zero wrong-language hits · 2026-08-03 |
| Eval (Phase 5) | 🔵 **IN PROGRESS** — Part A ✅ closed; Part B **14 of 45 suites** written |
| Eval, latest | **270 cases** · recall@10 **1.000** · coverage **0.841** · P@1 **0.759** · `eval/results-2026-08-04-batch1-tierA-keep.md` |
| Suites written | `zh-cn` `ru` `bg` + tier-A batch 1 (`sk` `hu` `mn` `ja` `pl` `sq` `es` `fa` `pt` `cs` `tr`) |
| Control | the 130 pre-campaign cases moved **0.721 → 0.720** — 110 new cases disturbed nothing |

Five batches: 8 pilot (599 docs) · 12 → 11 acquired (782) · 12 (567) · 11 → 10
acquired (233) · 4 → 3 acquired + 1 partial (100). **Batches 4 and 5 both staged
100% with ZERO skips.**

_Next:_ **BATCH B — 14 mid-tier sources (41–67 docs), drafted in PARALLEL and
approved in ONE turn.** The operator ended the one-source-at-a-time loop on
2026-08-04; do not reinstate it. Then batch C (9) and D (8), **then the mandatory
closing Part A sweep** — bulk removed the per-source version, so the living
relevant sets must be re-reviewed once at the end or the keys go stale.

≈150 cases remain across 31 sources, taking the suite to roughly 420. Then Phase
6 (ONE PR), Phase 7 (prod — which **must** re-run `lang:sweep:production`; the
Persian text itself contains Arabic characters, so ingest will reproduce the
mislabels from scratch). **The full brief for a cold start is the campaign
file's §0 and §0.12.**

⚠️ The `QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000` override on
`pnpm eval` is MANDATORY — it has no resume. Also: `pnpm eval` is **not
run-to-run deterministic** (recall@3 drifts ~0.9% relative between identical
runs); recall@10 and coverage are the stable primaries.
⚠️ **Re-run the FULL gate after ingest**, not just after code changes —
integration tests query the live Postgres.

**3 of the 48 are not acquired, all by decision, none blocking Phase 3:**

| Key | Why | Issue |
|---|---|---|
| `everystudent-sr` | DNS-blackholed from this network. **Do NOT add an `/etc/hosts` line** — considered and rejected. | [#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129) |
| `everystudent-he` | **Not a Cru property** (footer `© המכללה למקרא`); 1,020 articles, not the ~5 recon said; CDATA sitemap `discover.ts` cannot parse | [#132](https://github.com/JesusFilm/jesusfilm-rag/issues/132) |
| `lv` (unwritten) | **Rights, not crawlability** — robots disallows `ClaudeBot` by name. Ask Agape Students Latvia. | [#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133) |

Filed on the way:
- **[#128](https://github.com/JesusFilm/jesusfilm-rag/issues/128)** — share-widget
  chrome embedded in all three EXISTING EveryStudent sources, **live in prod**
  (232 chunks; `-ar` and `-fr` at 100% of documents). Deliberately kept out of
  the campaign branch.
- **[#131](https://github.com/JesusFilm/jesusfilm-rag/issues/131)** —
  `everystudent-ar` seeds a **full Gospel of John** (23,624 ch), **live in
  prod**, against the scripture policy that entry itself established. Exactly
  one document; the other two prod sources were checked and are clean.
- **[#132](https://github.com/JesusFilm/jesusfilm-rag/issues/132)**,
  **[#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133)** — as above.
- **[#138](https://github.com/JesusFilm/jesusfilm-rag/issues/138)** (2026-08-03) —
  the LLM language detector's 200-token output cap can truncate a **correct**
  reply mid-`evidence`-string, which the adapter then rejects as
  `response was not JSON`. Hit 1 document in 409. The row is left null and logged
  as an anomaly, so **the bug is indistinguishable from an honest abstain** in
  the report. Fix is a bigger cap and/or a shorter evidence quote.

⚠️ **`everystudent-ru-ca` (studentstan.com) carries only 5 seeds, deliberately.**
It is a **mirror** of `everystudent-ru` — 42 of its 87 articles overlap at ≥95%,
mean 84.1%. Do not "complete" its seed list from the site's own map: the ingest
dedup gate keys on `(sourceKey, canonicalUrl)`, so ~81 near-duplicates would be
chunked and embedded with nothing downstream to catch them.

---

**✅ DONE — slice #10 (`everystudent-fr`, questions2vie.com), ALL FOUR STAGES
GREEN 2026-07-27 AND PROMOTED TO PROD the same day.** The third and final walled
EveryStudent domain; **the #112 route is now closed, locally and in prod**
(en ✅ → ar ✅ → fr ✅).

**Promoted (Step 6, 2026-07-27) — the third source through the #115 bulk-copy
path.** `acquire:production` was deliberately NOT run (walled source; the ~70
Firecrawl credits were already spent at Stage 1). 67 raw rows copied local→prod
after a clean dry-run, verified by a UTC-pinned row-level digest
(**`8e9ec570…d8b7`** on both sides), then embedded to **67 docs / 418 chunks /
418 embeddings** — an exact match of local, per-document fingerprint
**`5739cf2f…5cad`** on both sides, 0 `chunk_count` mismatches, 66 `fr` / 1 `null`
preserved, 0 rows left pending. **Prod 11,661 → 11,728 docs / 34,016 → 34,434
chunks.** Smoke test reproduced all four Stage-3 French queries within float noise
and **the three-way cross-lingual match held in prod** (fr #1 · en #2 · fr #3 ·
`ar` #4 on "Comment puis-je connaître Dieu personnellement ?").
`eval:production --source everystudent-fr` @ 18 cases: recall@3/@10 **1.000** ·
coverage **0.848** · MRR **1.000** · P@1 **1.000**, **all 18 at rank 1**;
per-source coverage **0.856, identical to local**. Record:
`eval/results-2026-07-27-everystudent-fr-prod-keep.md`. ✅ **First promotion of
the three with ZERO retries on either metered step.**

🔑 **The promotion FALSIFIED `copy-raws.md`'s drift prediction, and the rule is
now corrected.** The runbook expected French to drift because `thelife-fr`
competes, calling an exact match "the surprise". Coverage matched **exactly on all
18 cases**. Mechanism, measured: prod carries **40 more docs than local** (11,728
vs 11,688 — thelife +30, sightline +9, jf-org +1) and **every one is English**,
while the 225-doc French subcorpus is identical on both sides; the strict
`eq(documents.language, …)` makes `fr` cases structurally blind to them. Restated:
**a language-scoped eval drifts iff that LANGUAGE'S subcorpus differs local↔prod**
— sole-source-ness was a confound, not the cause. Those same ~40 docs are exactly
what the runbook blamed for the English promotion's ~0.09 gap.

⚠️ **Exactly one case moved rank and it is JITTER, not drift.**
`esfr-skeptic-enfer` went rank 2 → 1: local's first credited hit was
`/a/260islam.html` @ **0.616**, prod's was thelife-fr
`/10-questions-spirituelles-avec-reponses` @ **0.615** — a **0.001** gap, the
fourth sighting of this pattern. Coverage held at 2/3. ⓘ It qualifies the Stage-4
"vocabulary gap" framing slightly: the gap is real (`/a/726enfer.html` still falls
out of the top 8), but **this case's rank-1-vs-2 reading is not stable between
runs.**

**▶ NEXT — the operator decides, in this order:**

1. **Merge `slice/everystudent-fr` → `main`.** Nothing is pushed; no PR opened.
   **This is now the ONLY step left to close slice #10**, and until it lands
   **prod leads `main` on this source** (the same inverted order as slice #9).
2. ~~Promote to prod via the bulk-copy path.~~ **DONE 2026-07-27** — see above.
3. **Triage [#123](https://github.com/JesusFilm/jesusfilm-rag/issues/123) — now
   with a WIDER scope than filed, and now LIVE IN PROD in two languages.** The
   French `/a/700horribles.html` returns at **rank 2 @ 0.718** on a natural French
   suffering question in the unfiltered prod space, alongside the Arabic
   `/a/endingthe8th.html` promoted in slice #9. Excluding a doc from an answer key
   never stopped the RAG serving it; the fix is content-side. See the escalation
   note below.
4. `/slice <next-source>` — GotQuestions / KnowGod / Issues I Face.

**Evaluated (Stage 4): qa-golden.yaml 118 → 130 cases; 93 credits added
(59 `everystudent-fr` + 34 `thelife-fr`), 1 mis-credit removed.**
**Final @ 130 cases / 11 sources: recall@3 0.954 · recall@10 1.000 · coverage
0.736 · MRR 0.854 · P@1 0.746** — **every headline metric UP** on the 118-case
pre-curation baseline (0.941 / 1.000 / 0.723 / 0.821 / 0.695). Per-language:
`ar` 0.979 · **`fr` 0.804** (n=22) · es 0.938 · zh 0.867 · en 0.641, 0 unscoped.
`everystudent-fr` **n=18, recall 1.000, coverage 0.856** with 11 of its 12 native
cases at rank 1; `thelife-fr` 0.778 (n=18).

🚨 **ESCALATION on #123 — the content problem is ESTATE-WIDE, not Arabic-specific.**
The French `/a/700horribles.html` (the child-rape FAQ) was **rejected on soundness
0.62** against relevance 0.82: it asserts, as an unevidenced wager, that
« l'abus verbal est celui dont les conséquences sont les plus graves » —
relativising child sexual abuse downward inside the answer to a survivor. #123 was
filed as an Arabic-source finding; the same failure is present in French, so the
remediation should be scoped across the EveryStudent estate rather than one
banner. **It ranks 4 on a natural French hell question, so the RAG serves it
whether or not it is in an answer key** — excluding it from the eval protects the
metric, not the reader. The fix is content-side.

ⓘ **Counter-finding worth equal weight: doctrinal quality is per-LANGUAGE, not
per-ministry.** The French Trinity explainer is careful — "trois personnes de la
même essence divine", explicitly **rejecting** the H2O and egg analogies for
implying parts — where slice #9 found outright **modalism** in the Arabic
equivalent. Do not generalise a soundness finding from one language to a source.

⚖️ **The two French sources are COMPLEMENTARY, not competing.** `everystudent-fr`
contributed **zero** credits to four of the ten prior French cases (post-abortion
healing, forgiveness, Spirit-empowered living, unbelieving spouse) because it
publishes **seeker apologetics, not sanctification** — while taking **15 of 20**
credits on "give me one reason a god exists". The `language:"fr"` probes at Stage
3 predicted exactly this; Stage 4 confirmed it on content.

🔍 **A real VOCABULARY GAP is now recorded in the eval.** `esfr-skeptic-enfer`'s
first draft ("how can a God of love condemn someone to suffer for eternity?") put
`/a/726enfer.html` at **rank 1 @ 0.749** — but that phrasing echoed the article's
own title. Rephrased to how a skeptic actually argues it (« un châtiment infini
pour une vie finie »), **the document falls out of the top 8 entirely.** The hard
phrasing was kept so the eval measures the gap instead of hiding it. Related:
`esfr-newcomer-catholique` first scored **0.836**, the highest of any probe,
purely because it restated the article title — **a very high score on a new case
is a paraphrase smell, not a success signal.**

📐 **METHODOLOGY — `coverage` is structurally capped at `min(1, k/|relevant|)`**
(filed as `eval-approach.md` authoring trap 3). `tlfr-skeptic-dieu-existe` now
carries 20 relevant docs, so its ceiling is **0.50**; it scores 0.45, i.e. **9 of
its 10 top-10 slots are credited docs** — near-perfect, reported as "bad". A
falling coverage after a re-review is expected, not a regression: read rank and
P@1 beside it.

⚠️ **`everystudent` (en) 0.693 ↔ 0.739 is BOUNDARY JITTER, seen a THIRD time**
(`/forum/contradictions.html`, rank 10 @ 0.648 vs rank 11 @ 0.647). `sightline`
0.563 ↔ 0.571 likewise. Neither can be a French effect — French docs are
ineligible on English-scoped cases by construction.

**Part A (re-review) was real work — the opposite of slice #9.** Pre-curation,
`thelife-fr` fell **0.817 → 0.733** and was the ONLY source that moved; the drop
localised to exactly **two cases** on EveryStudent's core axis
(`tlfr-skeptic-dieu-existe` rank 1 → 4, `tlfr-newcomer-jesus` rank 1 → 2). Pool
built from the **corpus** (deep-k 40, floor 0.50 — calibrated as the highest floor
excluding zero already-approved docs), 320 pairs / 151 whole documents judged:
**54 approved, 265 rejected as sound-but-off-question (83%)**. Every per-case
coverage prediction made before the confirming run landed exactly.
See [docs/slices/everystudent-fr.md](./slices/everystudent-fr.md).

---

**Previously (slice #9 and earlier):**

**Retrieved (Stage 3): French is queryable, and the EveryStudent estate now
matches itself across three languages.** Four real French questions against the
unfiltered 11-source space took **rank 1 on three** — « Dieu existe-t-il ? » →
`/a/101existe.html` **@ 0.737**, « Comment trouver la paix intérieure…? » →
`/a/coronavirus.html` **@ 0.739**, « Comment puis-je connaître Dieu
personnellement ? » → `/a/comment-connaitre-dieu-personnellement.html` **@
0.775**. 🌍 **That last one returned fr #1 · en #2 · fr #3 · `ar` #4 — the same
EveryStudent article in three languages, matched to one French query across two
language boundaries**; slice #9 saw this two-way, and completing the #112 route
makes it three-way. The fourth question (« Pourquoi Dieu permet-il la
souffrance ? ») was best-answered **in English** by cru at 0.728 over the French
`/a/700horribles.html` at 0.718 — the unfiltered space ranks on meaning, not
query language.

**`language:"fr"` is airtight and the two French sources genuinely trade
places.** An **English** question under `--language fr` returned **8 French docs
and nothing else**, so the filter binds on the **document**
(`corpus-search-store.ts:62` is a strict `eq(…)`, excluding other languages and
NULLs by construction). ⚖️ Neither source monopolises: that anxiety run was **7
of 8 `thelife-fr`**, while a French knowing-God question under the same filter
returned **10 of 10 `everystudent-fr`** — matching what each banner publishes
(seeker apologetics vs devotional life-issues). At 29.3% of the French corpus,
everystudent-fr is competing, not swamping.

⚠️ **Stage-4 Part A is now CONFIRMED as real work — the opposite of slice #9.**
A top-10 sweep by the new source, in exactly the language where the 10 `tlfr-*`
golden cases live, means displacement is **demonstrated, not hypothetical**.
Re-review the living `relevant` maps before reading any `fr` coverage movement
(currently 0.817) as a retrieval regression. French is also **multi-source**, so
default to the slice-#7/#8 two-axis 0.75 gate, NOT slice #9's relevance-only
rule.

**minScore 0.37 HOLDS at 11 sources — keep unchanged.** French positives
**0.615–0.775** against a clean-secular ceiling of **0.430** — a ~0.19 gap, the
same separation slice #9 described with **both ends shifted up**.

🔧 **CORRECTION — the carried-forward "0.012 faith-adjacent margin" does NOT
reproduce, and slice #9's 0.349 clean-secular ceiling was PROBE-SET dependent,
not a corpus property.** (a) The French Islam/Ramadan probes land at
**0.601/0.602 — ~0.23 ABOVE the cutoff, not 0.012** — and both are genuine
adjacency, not noise (the top hits really do describe world religions and
fasting respectively). ⓘ **`/a/260islam.html`, the doc this slice was told to
watch, topped neither probe.** (b) **The secular floor is ~0.40–0.43 in BOTH
languages:** re-running the two highest crossers as **English controls** gave
**0.398** and **0.418** versus French **0.430**/**0.421**. So crossings track
*which* probes you pick, not query language — slice #9's set (rice, World Cup,
Python) was simply gentler. Read "0.349" as a measurement of that probe set; the
honest corpus-wide figure is **~0.43**. Two crossings aren't negatives at all —
"coupe du monde" (0.404) hits cru's real *World Cup City Champion* page and
carbonara (0.323) hits FamilyLife's real *Family Recipes*, the same
true-positive-disguised-as-a-negative trap slice #9 hit with its CV probe.

⚠️ **METHODOLOGY TRAP — FOLLOW-UP O bites `pnpm query` too, and it fails LOOKING
LIKE A RESULT.** Two secular probes first came back with no hits — which reads
exactly like a perfect clean reject. They had actually aborted the **query
embedding** with `DOMException [AbortError]` under the fast-fail posture
(`QUERY_EMBED_MAX_ATTEMPTS=2`, 4 s). Re-run with the retry override, both
returned hits **above** the cutoff (0.421, 0.323) — the timeout would have made
the negatives table read *better* than the truth. Run probes AND batch evals as
`QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000 …`, and never record a
zero-hit probe without checking its exit status.

**Ingested (Stage 2): all 67 pending → 67 docs / 418 chunks / 418 embeddings**
(`qwen/qwen3-embedding-8b`, 1536d) — perfect 1:1, 0 `chunk_count` mismatches,
single model, **chunks/doc avg 6.24** (max 21) — the densest of the three
banners (en 4.70, ar 4.22), matching Stage 1's "richest bodies" finding. All 67
are `/a/` articles, confirming the 3 signup pages really left the corpus.
Idempotent re-run drains 0. **The offline language pre-flight held EXACTLY:
66 `fr` / 1 `null`**, the null being precisely the predicted `/a/jesusqui.html`.
**Corpus now 11 sources / 11,688 docs / 34,355 chunks.** Gate re-run WITH the new
data: green, 441/441.

⚠️ **French is now genuinely multi-source: 225 `fr` docs** — thelife-fr 156 ·
**everystudent-fr 66** · thelife 2 · cru 1. At **29.3% of the French corpus**,
displacement on the 10 existing `tlfr-*` cases is a live possibility, not a
theoretical one — Stage-4 Part A re-review is real work this time.

ⓘ The one null-language doc is a **Scripture-compilation page** ("extraits tirés
directement de l'évangile de Jean… **Aucun commentaire ajouté**") — near-entirely
quoted Johannine text with no editorial French voice, a plausible reason
detection sat at 0.689. Observation only; excluded from the eval per standing
policy, no sweep.

**Acquired 70/70 seeds, zero skips** — the
first banner to take every seed — at **exactly 1.00 cr/page (828 → 758), so
#112's whole three-domain route is now paid for**. Bodies are the richest of the
three (avg 9,104 ch vs en 7,203 / ar 6,442); `.content4` binds here too,
confirming the shared-template claim on the last banner.

⚠️ **The 3 provisionally-seeded root pages were dropped after fetching — they
are email-signup forms, not articles**, so ingest takes **67 `/a/` articles and
nothing else**. All three cleared `minContentLength` easily (1,949–2,453 ch):
*length is not aboutness*, which is exactly why the floor could not catch them.
`/jean.html` ↔ `/jeanFR.html` share **87.9% of their 12-word shingles** (the same
sign-up page reordered — the band slice #8 dropped podcasts at), and all three
close with an **identical 850-char French GDPR notice** worth 35–44% of their
bodies. ⓘ **The Arabic `/john.html` + `/pack.html` are the SAME two pages, kept
in slice #9 and live in prod today** — the estate is inconsistent; recorded for a
future cleanup, no issue filed, prod untouched by this slice.

**Language pre-flight: 69 `fr` / 1 `null` of 70 staged (66/1 of the 67
ingested), 0 out-of-declared-set warnings — a 1.5% null rate, the LOWEST of any
source** (en 7.7%, ar 3.0%). The one null is `/a/jesusqui.html` at confidence
**0.689**, just under the 0.75 gate, and — as in slice #8 — it is the source's
*largest* document, not a thin one.

⚠️ Unlike Arabic, **French is not a new language** — 159 `fr` docs and 10
`tlfr-*` cases already existed, so Stage-4 Part A re-review is **not** a provable
no-op and `fr` coverage (0.817) should be expected to move. **Next: Stage 3
(retrieve)** — French queries against the 11-source space, `language:"fr"` with
**two** French sources competing, and a re-probe of the faith-adjacent minScore
margin (slice #9 recorded 0.382, just 0.012 above the 0.37 cutoff, and
`/a/260islam.html` is in this seed set). Plan + decisions:
[docs/slices/everystudent-fr.md](./slices/everystudent-fr.md).

**Also open — operator decides between three, in this order of urgency:**

1. **Triage [#123](https://github.com/JesusFilm/jesusfilm-rag/issues/123) —
   specifically `/a/endingthe8th.html`.** Suicide and self-harm content presented
   as cured by faith, with no professional help signposted.
   ⚠️ **This item's framing has changed: the decision is now retroactive.** This
   file previously said "decide exclude-vs-accept **before** the copy-raws step,
   not after". **The promotion ran first** (operator-directed, 2026-07-25), so the
   page is **live in prod today** and the choice is no longer "ship it or not" but
   "leave it or pull it from prod" — a smaller, more urgent decision. The prod
   smoke test makes it concrete: an anxiety question
   ("كيف أتعامل مع القلق والخوف؟") returns it at **rank 4 @ 0.431**, so it is a
   real retrieval result, not a latent risk. Retrieval is behaving correctly — the
   document genuinely is topically relevant — so the fix is content-side (exclude
   the doc, or get help signposting added), not engine-side.
2. ~~**Merge slice #9**, then promote.~~ **BOTH DONE — promotion 2026-07-25, and
   PR [#124](https://github.com/JesusFilm/jesusfilm-rag/pull/124) MERGED
   2026-07-27**, so `main` now carries slice #9 and prod no longer leads it.
   `everystudent-ar` is live in prod: 67 docs / 283
   chunks / 283 embeddings via the **bulk-copy path** (`copy-raws.sh`, zero extra
   Firecrawl), both copy digests matched local↔prod, and `eval:production`
   reproduced the local numbers exactly (coverage 0.979 / recall@10 1.000).
   Dashboard refreshed in the same PR (10 sources / 5 languages / 11,661 docs).
   **Note the inverted order vs slice #8**, which merged first and promoted after
   — slice #10 has now repeated slice #9's inverted order. Details:
   `docs/slices/everystudent-ar.md` → "Prod promotion".
3. ~~**`/slice everystudent-fr`** as slice #10.~~ **STARTED 2026-07-27, now at
   Stage 4** — see the "in flight" block at the top of this section.
   ~~The carried-forward watch item stands: the **0.382** five-pillars margin is
   0.012 above the 0.37 cutoff…~~ **RESOLVED at Stage 3 — it did not reproduce.**
   French faith-adjacent probes sit ~0.23 above the cutoff and
   `/a/260islam.html` topped neither; the tightness was specific to slice #9's
   Arabic probe geometry, not a standing property. See the correction above.

The **#17/#75 gate on the `ar`/`fr` slices is lifted** — the rare-language
mechanism those slices depend on is verified working; only the test fixture was
broken, and Arabic at 0.56% of the corpus now demonstrates it live.

Still open, operator decides when:

1. **Certify prod post-cutover** — run `pnpm eval:production` against the post-cutover
   corpus (11,477 docs). cru's prod "Evaluated" currently rests on the local slice-#7
   eval; the last recorded prod eval (2026-07-08) predates the cru cutover.
2. **Content soundness #78** — 18 docs below 0.75 soundness (14 cru, **3 thelife ⚠️
   already live in prod**, 1 familylife); prosperity-drift pattern. Remediation
   decisions pending.
3. **Retrieval-quality leads** — #76 (negation blindness) and #75 (HNSW drops best
   matches, worst for rare-language). #79 itself is closed (PR #97, ADR-0011); the cru
   `0 100 0` junk-strip (extraction-side, needs a cru re-ingest) is the remaining
   chunk-quality lead.
4. **FOLLOW-UP I #15** (`maxPerSource` / MMR) and **FOLLOW-UP E #6** (`excludedSourceKeys`)
   remain unblocked consumer-layer work.
5. **Next source slice** — GotQuestions / KnowGod / Issues I Face.

---

**Slice #6 (FamilyLife, `familylife`) is DONE 2026-06-04** on
`slice/familylife` (not yet merged). All 4 stages green; familylife
queryable end-to-end in the 6-source space (8,514 docs / 23,522 chunks).
**Final eval @ 6 sources / 62 cases / top-10:** recall@3 **0.984** ·
recall@10 **1.000** · coverage **0.648** · MRR **0.870** · P@1 **0.758**.
**Per-source: familylife n=16 recall=1.000 / coverage=0.958** (perfect
where credited) · thelife n=28 0.929/0.777 · jf n=28 0.750/0.604 ·
sightline n=37 0.784/0.582 · **swg n=21 0.524/0.367 — UP from 0.335**
(slice-#5 prior-source-up pattern re-confirmed at 6 sources) ·
**cru-10 n=15 0.133/0.067 — DOWN from 0.167** (sharpest FOLLOW-UP I #15
evidence yet: cru content/retrieval still work, but with 5 competing
sources cru pieces get displaced from top-10 on shared topics —
mechanism-not-policy, consumer-layer `maxPerSource`/MMR fix).
**Stage 4 via `/golden` v2 content-grounded:** **Part A** added 31 paths
across 8 cases — closed both regressions (`tl-believer-marriage-drift`
cov 0/5 hard-miss → rank 1 cov 9/14; `swg-believer-assurance` rank 4 → 3)
AND **19 prior-slice curation gaps** surfaced as side-effects (slice-#1
swg `/new-life/new.html`, slice-#3 jf `/blog/mental-health-and-the-church`,
slice-#4 sightline trio, slice-#5 thelife 8+ devotionals incl.
`/full-confidence`, `/how-to-know-im-really-saved`,
`/should-we-talk-about-it`, `/should-christians-go-to-therapy`,
`/the-new-deal`, `/the-prayer-of-anguish`, `/my-story-of-miscarriage`).
**Part B** added 10 persona-diverse familylife-native cases on the
marriage/parenting axis (4 seeker / 3 believer / 2 newcomer / 1 skeptic),
61 path credits + 6 *additional* prior-slice gaps surfaced (thelife
`/why-should-i-wait-for-sex` + 3 sightline sex-marriage devotionals;
thelife `/going-it-alone`, `/kids-divorce-and-remarriage`,
`/devotionals/our-greatest-burden`). qa-golden.yaml now **62 cases**.
**Only rank > 3 case:** `fl-skeptic-sex-marriage` at rank=4 — engine
ranks abstract intimacy pieces above direct "why wait" docs; honest
ranking quirk. **`minScore 0.37` holds at 6 sources** (3/3 negatives = 0
hits). **`/equip/` retention DECIDED — KEEP all 70 rows:** 4 paths
credited as legitimate relevant docs and surface in top-10; teaser half
didn't displace good content in 12 probes; Stage-1 bimodal prediction
validated, no re-ingest. 114/114 tests green, depcruise 76/0, 0 lint
errors. **Stage 4a+4b commit:** `e5d46c4`. **≥4 sources now done end-to-end
→ FOLLOW-UP E #6 (consumer source-exclude filter) fully unblocked** —
abundant fixtures across familylife/thelife/sightline/jf for testing
narrow-only exclusion.

**Next pick — operator decides:** (1) **Merge slice #6** to `main` (open
PR from `slice/familylife`); (2) **FOLLOW-UP I #15** (`maxPerSource` / MMR
consumer-layer) — evidence is now devastating, cru drops 0.321→0.167→0.067
across slices #4/#5/#6 with monotonic sharpening; this is engine work, not
`/slice`; (3) **FOLLOW-UP E #6** (`excludedSourceKeys`) — now fully
unblocked; consumer-layer too; (4) **GotQuestions / KnowGod / Issues I Face**
as next backlog source slice (GotQuestions would amplify #15 further;
Issues I Face needs different discovery — sitemap 404); (5) **Cru
accordion-TOC strip** (citation quality follow-up from slice #2).

**Slice #5 (`thelife`) is DONE and MERGED to `main`** ([PR #31](https://github.com/JesusFilm/jesusfilm-rag/pull/31),
`dc8cfaf`, 2026-06-03). 4,485 docs / 7,905 chunks / 7,905 embeddings; thelife
corpus fully queryable + evaluated. **Final eval @ 52 cases / 5 sources:**
recall@3/@10 **1.000** · coverage **0.624** · MRR **0.907** · P@1 **0.827**.
Per-source highlights: thelife 0.955/0.851 (perfect where credited),
cru 0.200/0.167 (unchanged — sharper FOLLOW-UP I #15 evidence, not a
regression). The slice-#4 sightline curation gap (15+ docs) and the
slice-#3 `jf-believer-disciple-making` vocab gap were both closed as
side-effects of the content-grounded `/golden` re-review.

**Slice #6 historical record (Stages 1+2 DONE 2026-06-03)** on
`slice/familylife`. WordPress VIP via `sitemaps.xml`; reused slice #3/#4/#5
discovery crawler with no new acquisition code (FOLLOW-UP F durable across 4
sources now: jf/sightline/thelife/familylife). **Acquired 2,239 / 2,329
(96.1%)** across 2 passes — pass 1 SIGINT-stopped at 1,431 for laptop
disconnect, pass 2 walked the full list (surfaced **FOLLOW-UP K #32**:
fetch-layer idempotency gap — re-runs of paused crawls re-fetch already-staged
URLs because conditional headers aren't threaded). All status 200, zero 429s
across 4,569 fetches. 88 too-thin skips concentrated on `/equip/` (84 —
bimodal: real teaching + PDF/course teaser hubs); /equip/ retention deferred
to Stage 4. **Ingested all 2,239 raw → 2,239 docs / 9,815 chunks / 9,815
embeds** (`openai/text-embedding-3-small`, 1536d); perfect 1:1, 0 mismatches,
chunks/doc avg 4.38. Corpus now **6 sources / 8,514 docs / 23,522 chunks**
(+60% chunk growth vs slice-5 end). **Verify gate green at new size** but
the data growth fired the pre-existing canary in
`tests/retrieval.integration.test.ts` — **FOLLOW-UP J #17** (HNSW post-filter
under-recalls in-scope docs when out-of-scope neighbors dominate the graph)
now actively bites at 23.5k chunks (was dormant at ~14k). Test loosened as
a stop-gap; full empirical evidence (max real cosine vs `oneHot(0)` = 0.12;
HNSW graph topology, not cosine cutoff) appended to #17.

**Stage 3 (Retrieve) DONE 2026-06-04** — spot-retrieval against the 6-source
space via `pnpm query`, no code changes. Family-axis queries: familylife
dominates (10/10 on spiritual leadership + teen discipling; 8-9/10 on character
+ affair recovery) while adjacent sources still surface where they should
(thelife at ranks 2+9 on character question). **Cross-source health PRESERVED
at 6 sources:** sightline #1 + jf #2 unchanged on "Christianity intolerant?"
(slice #3→#4 closure intact); **swg flagship "How to Be Sure of Heaven" still
ranks #2 at exactly 0.548 — the 0.003 edge from slice 5 held; slice-1's
founding source was NOT buried by +9,815 familylife chunks.** Familylife
meaningfully enters the anxiety domain (was thelife monopoly in slice 5;
includes one /equip/ row that's real teaching, validating the Stage-1
bimodal-/equip/ prediction). Negatives confirm **minScore 0.37 holds at 6
sources** (secular 0 hits; faith-adjacent Quran/fasting 0.388-0.441 below the
0.55+ positive band).

See **[docs/slices/familylife.md](./slices/familylife.md)** for the slice-6
record, and **[docs/slices/thelife.md](./slices/thelife.md)** for slice 5.
The "Next pick" candidates above subsume the prior "Still on the table"
list — FOLLOW-UP E is now fully unblocked (≥4 done sources), FOLLOW-UP I
is at devastating-evidence sharpness, and FamilyLife's marriage/parenting
axis closes the corpus gap that started slice #6.

## How we're building (decided 2026-05-22)

- **Vertical slices, one source at a time.** Drive ONE source fully through
  acquire → ingest → retrieve → spot-check, then move to the next. This refines
  architecture §9's horizontal order — module boundaries and ports are
  unchanged, only the build order.
- **jfa is a behavioral reference, not a port target.** We learn what worked;
  we do not transplant its files.
- **Defer the "generic crawler vs. per-source scraper" decision** until 2–3
  sources reveal the real pattern.
- **Eval** (spot-checks first, then recall@k / MRR) gets built once slice #1 has
  real data to evaluate against.
- **`/slice` drives the work.** A lightweight, resumable slice-driver
  (`skills/slice/`): reads this file, unpacks the next slice (or resumes
  an in-progress one), runs the verify gate, and checkpoints each step to a slice
  file + commit. Pauses at stage boundaries and real decisions, in plain language.

## The slice loop (repeat per source)

1. **Acquire** — fetch + extract its pages → `raw_documents`.
2. **Ingest** — drain `raw_documents` → normalize → chunk → embed → corpus tables.
3. **Retrieve** — embedQuery → vectorSearch → ranked, cited results.
4. **Spot-check** — run real queries, eyeball quality; note findings in `sources.md`.

## Recon — 2026-05-22 (homepage GET, browser UA, follow redirects)

All six are reachable, server-rendered HTML, no SPA/JS-shell markers.

| Source | Home size | ~words | Note |
|--------|----------:|-------:|------|
| Starting With God | 44 KB | 723 | leanest → **slice #1** |
| EveryStudent | 60 KB | 1283 | lean; jfa saw 403s, returned 200 here with a browser UA |
| NextStep | 129 KB | 2009 | medium |
| Cru | 169 KB | 1871 | large site |
| Jesus Film Project | 158 KB | 3971 | large, owned |
| Sightline Ministry | 297 KB | 5218 | content-heavy |

("Challenge" greps were false positives from cloudflare-hosted asset URLs — the
high word counts confirm real content, not an anti-bot page.)

## Open decisions / blockers

- ~~`.env` missing `MCP_BEARER_TOKEN`~~ — resolved by **removing** the unused
  serving/auth vars (`MCP_PORT`, `MCP_BEARER_TOKEN`, `MCP_BEARER_SCOPES`,
  `CLIENT_HASH_SECRET`, `ADMIN_PASSWORD`) from `src/env.ts`. No code reads them
  yet; the env schema now declares only what's consumed (`DATABASE_URL`,
  `OPENROUTER_API_KEY`, `EMBED_MODEL_ID`). **Update — step 6 landed (PR #19):**
  serving added `PORT` + `SERVE_BEARER_TOKENS` (HTTP `/v1`, not the old `MCP_*`
  set); `CLIENT_HASH_SECRET` / `ADMIN_PASSWORD` stay dropped.
- ~~Embedding model diverged from decision 1~~ — resolved: re-embedded on
  `openai/text-embedding-3-small` (both it and the nvidia free model are reachable
  via OpenRouter at 1536 dims; openai is the locked choice).
- ~~OpenRouter API key must be in `.env` before ingest~~ — present; Stage 2 ran.
- ~~First source = Starting With God~~ — confirmed; acquired + ingested.

## Process TODOs (deferred)

- **Seed-URL discovery → now informed by jfa.** We examined jfa's source registry
  (2026-05-25); the full findings are in
  **[docs/jfa-registry-findings.md](./jfa-registry-findings.md)** — read it before
  picking the next source or deciding how to crawl one. Two recurring forks are now
  written up as **architecture §11 FOLLOW-UP F** (adopt jfa's discovery-crawl policy
  shape — `seeds`+`allow`/`block`/`articleHints`+`contentSelectors`+`sitemaps`;
  trigger = first large source) and **FOLLOW-UP G** (Cloudflare/JS-walled sources —
  EveryStudent confirmed walled; bypass options listed). For small curated scopes
  (like the since-retired `cru-10-basic-steps`, 12 ready-made URLs — absorbed into
  whole-domain `cru` in slice #7) the hand-listed `seedPaths` code is still fine;
  neither follow-up was taken in slice #2.

## Done

- **Step 1** — bare-out + §6 schema + §5 enforcement gates (depcruise / max-lines / fakes-only).
- **Step 2** — Postgres storage adapters (CorpusWrite, CorpusSearch, FetchState) + in-memory fakes; integration-tested against docker Postgres.
- **2026-05-22** — lightweight tracking (this file) + vertical-slice build decision; reachability recon of all 6 sources.
- **Slice #1, Stage 1 (Acquire)** — RawDocumentStore port/fake/adapter, SourceRegistry + Starting With God entry, Acquisition context (normalizeUrl/extraction/acquireOne/acquireSource), HTTP Fetcher adapter, `pnpm acquire`. Live crawl staged **40/40 clean rows** in `raw_documents`. On `slice/starting-with-god`.
- **Slice #1, Stage 2 (Ingest)** — OpenRouter Embedder adapter, Ingestion context (normalize → jfa-ported chunk → embed → dedup → idempotent replaceDocument), RawDocumentReader read port/fake/adapter, `pnpm index`. Live run drained `raw_documents` → **40 docs / 183 chunks / 183 embeddings** (`openai/text-embedding-3-small`); idempotent re-run drains 0. 47 tests green. `pnpm index --force` = full re-index from the raw snapshot (used to re-embed off an accidental `.env` model override). On `slice/starting-with-god`.
- **Slice #1, Stage 3 (Retrieve)** — Retrieval context (`src/retrieval/`): `createRetriever` runs invariant 5 (embedQuery → vectorSearch candidate fan-out → minScore 0.3 cutoff → soft preferSourceKey tiebreak → 3-key dedup → citation). Wired into `main.wire()`; `pnpm query "<q>"` entry point; `scripts/eval.ts` step-5 TODO closed (drives the real Retriever). 12 fakes-only tests (59 total). Live query returns 5 distinct cited docs. **Decision:** 3-key dedup ⇒ at most one chunk per document (content-hash is doc-level). On `slice/starting-with-god`.
- **Slice #2 (Cru "10 Basic Steps", `cru-10-basic-steps`)** — full acquire → ingest → retrieve → eval on `slice/cru-10-basic-steps` (not yet merged). 11 docs / 35 chunks / 35 embeddings (AEM `.article-long-form` extraction). **Stage 4 built the per-source eval mechanism:** required `source` tag on golden cases, `pnpm eval --source <key>`, and a per-source breakdown (pure logic in `scripts/eval-metrics.ts`, unit-tested from `tests/`; +15 tests, 80 total). 10 persona-diverse cru golden cases authored. Whole-corpus eval (20 cases / 2 sources): recall@3 0.80 / recall@8 0.90 / MRR 0.62 / P@1 0.45; minScore **0.37 (FOLLOW-UP A re-confirmed, held)**. **Stage 4 also reframed the eval** (`8fbee09`) to source-agnostic questions + multi-source `relevant` maps scored on recall + coverage — v2 whole-corpus recall@10 1.00 / coverage 0.896 / P@1 0.80, per-source coverage cru 0.929 / swg 0.906 (resolved the v1 cru P@1 0.20 artifact). Remaining: accordion-TOC chunk hurts cru citation quality (extraction-side follow-up). See `docs/eval-approach.md`; Cru → Evaluated in `sources.md`.
- **Serving (step 6) — DONE** (`feat/serving-v1`, PR #19; closes #9 + #12). Versioned `/v1` HTTP adapter (`src/serving/http/`, Hono) over the injected `Retriever`: `POST /v1/search` + `GET /v1/health`, bearer auth + `allowedSourceKeys` scope intersection (narrow-only). Single-source **Zod** contract (`src/contracts/retrieval.schema.ts`) → generated `contracts/openapi.v1.json` (`pnpm gen:contract`) + drift test; versioning policy in architecture §3.1. Runs in `docker compose` alongside Postgres (`:8080`, no manual env); `pnpm smoke` is the consumer/CD probe. 108 tests green. **MCP adapter deferred** (a later variant over the same `Retriever`).
- **Slice #5 (thelife, `thelife`)** — pivoted from `power-to-change` (decommissioned) on 2026-05-29 to thelife.com (Cru Canada's live successor). Statamic source, **first time the discovery crawler ran against a non-WordPress site**; two-pass crawl (Cloudflare forced 1000→2000 ms delay) staged **4,485 of 4,552 distinct rows (98.5%)**. Ingest drained all 4,485 → **4,485 docs / 7,905 chunks / 7,905 embeddings** (chunks/doc avg 1.76 — devotional-dominant; corpus now 5 sources / ~6.5 k docs / ~14.7 k chunks). Stage 3 spot-retrieval: thelife dominates devotional/life-issues; cross-source health preserved; minScore 0.37 holds. **Stage 4 ran `/golden` in content-grounded mode for the first time** — operator pushed back on title-only review; we rebuilt curation around a surgical probe returning chunk snippets per candidate. Part A added 67 paths across 12 regressed cases (incidentally closing a slice-#4 sightline curation gap AND the slice-#3 `jf-believer-disciple-making` vocab gap); Part B added 10 new persona-diverse thelife-native cases (52 total now). **Final eval @ 52 cases / 5 sources:** recall@3/@10 1.000 · coverage 0.624 · MRR 0.907 · P@1 0.827. cru/swg per-source coverage unchanged from pre-curation (0.17/0.34) — confirms slice-#4 mechanism: thelife/sightline crowd small sources out of top-10 even when both legitimately answer. **Sharpest FOLLOW-UP I #15 evidence yet.** On `slice/thelife` (not yet merged).
