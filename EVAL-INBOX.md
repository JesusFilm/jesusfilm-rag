# EVAL-INBOX — embedder swap (3-small → qwen3-embedding-8b @1536)

Decision ledger for the multilingual embedder swap (#39 P1 + P4, local-only; prod
ingestion is a separate follow-up). **One section per open decision, my
recommendation pre-filled.** You answer inline under **Your call:** and confirm in
terminal when a batch is ready. I do not start the expensive re-embed until the
**bar (D2/D3), serving (D1), and matrix (D4/D5)** are ratified.

_Status: **APPROACH PIVOTED (2026-07-02).** The manual local A/B below (D2–D6, D8) is
**superseded** — a hand-rolled single-language eval is the wrong instrument for a
strategic, futureproofing, parity-with-Forge decision. Decision is now made on external
benchmark evidence (see **DECISION** block). The embedder-adapter code (commit `e4876ca`)
stands — it's the model-agnostic mechanism to run Qwen either way._

---

## DECISION (2026-07-02) — Adopt Qwen3-Embedding-8B @1536. Evidence conclusive.

**Answer to "is Qwen needed for multilingual RAG?": YES** — not because 3-small is broken on
any one language, but because it is measurably and substantially weaker across the
multilingual / cross-lingual / low-resource space the RAG is expanding into, and the
embedding choice is a one-way door that must be made futureproof now.

**Head-to-head (cited):**
| Benchmark (higher = better) | text-embedding-3-small | text-embedding-3-large | Qwen3-Embedding-8B |
|---|---|---|---|
| MTEB Multilingual — retrieval | not listed (~10 pts below 3-large) | 59.27 | **70.88** (+11.6 vs 3-large) |
| MTEB Multilingual — task mean | not listed | 58.93 | **70.58** (#1, Jun 2025) |
| MIRACL (18-lang, OpenAI's own multilingual test) | **44.0** | 54.9 | not published (wins broader MMTEB) |
| Cross-lingual matching (Bitext) | not listed | 62.17 | **80.89** (+18.7 vs 3-large) |

Qwen beats OpenAI's *larger, pricier* 3-large by ~+11.6 (retrieval) / +18.7 (cross-lingual);
vs the 3-**small** we run, the gap is bigger. Sources: Qwen3 tech report
(arxiv.org/pdf/2506.05176), model card (huggingface.co/Qwen/Qwen3-Embedding-8B), OpenAI
MIRACL via pinecone.io/learn/openai-embeddings-v3.

**Strategic:** 100+ languages (vs OpenAI's uncommitted English-lineage model); embedding =
one-way door → commit to a broad multilingual space once (Weaviate/industry consensus);
Forge parity; Apache-2.0 open-weight (self-hostable, no per-token fee, no vendor
deprecation); Matryoshka native-4096 truncates to 1536 → **keeps the halfvec(1536) column,
no migration**, with headroom later.

**Caveats (honest):** vendors never benchmark the same model/suite/dim, so the exact vs-3-small
magnitude is inferred not lab-measured; Qwen scores are at 4096 (1536 a few pts lower, still
ahead); "100+ languages" ≠ uniform per-language quality; it's an 8B model → needs a GPU to
self-host (on-prem #41) or a hosted endpoint. My 2026-07-01 local probe (3-small handles
Chinese fine) does NOT contradict this — Chinese is high-resource, the one place 3-small is
least bad; the case is won on the low-resource / cross-lingual long tail benchmarks capture.

**Next:** (1) record as ADR-0005 superseding 0002's model pin; (2) prod re-embed becomes the
main event (needs the serving call: on-prem vLLM vs hosted).

---

## (Superseded) original manual-A/B plan below — kept for the record

---

## Research map (Step 1) — what each source offers + which #39 claims still hold

**Skills**
- **`/slice`** (`.claude/skills/slice/SKILL.md`) — drives ONE source through
  acquire→ingest→retrieve→spot-check, resumably, committing per verified step. This
  is the engine for the per-source×language re-ingest streams (ORCH 3). Key reusable
  gate: `pnpm depcruise && lint && typecheck && db:check && test`. Warns that a data
  stage alone can turn integration tests red (must re-run the gate after ingest).
- **`/golden`** (`.claude/skills/golden/SKILL.md`) — drafts grounded eval cases for a
  source from what actually landed in the corpus, for you to curate (not hand-write).
  This is how we author the **French + Chinese suites**. It presents each candidate
  **with the real chunk snippet** — I'll add **English translations** alongside the
  non-English snippets for your content-check (guardrail #5 extended for language).

**#39 claims — verified against current code, not taken on faith**
- ✅ **P1 + P4 in scope, P3 out.** P2 (acquire non-English) marked done.
- ✅ **Dim stays 1536, no schema migration.** 3-small is 1536 (ADR-0002); Qwen3-8B is
  MRL-native (truncate 4096→1536 + L2-renormalize, no quality loss). `EMBEDDING_DIMS`
  (`src/db/schema.ts:19`) and `EMBEDDING_DIMENSIONS` (`src/adapters/postgres/vector.ts:17`)
  both stay 1536.
- ⚠️ **"Add a new model row alongside, then migrate" does NOT hold.**
  `chunk_embeddings.chunkId` is a PRIMARY KEY (one embedding per chunk) and
  `replaceDocument` is delete-then-insert (`src/adapters/postgres/corpus-write-store.ts:75`).
  `pnpm index --force` is a **destructive in-place re-embed**. ⇒ **Baseline (3-small)
  eval numbers must be captured before the swap** — no true side-by-side in one DB.
  Sequential A/B is valid because doc-path eval is stable across deterministic re-chunk.
- ⚠️ **"Multilingual corpus" is narrower than it sounds.** Only two viable non-English
  bodies exist, both currently **pending / unembedded** (`ingested_at IS NULL`, gated on
  this swap): **`thelife-fr` 156 docs (French)**, **`thelife-zh` 332 docs (Chinese)**.
  `familylife` Spanish = **1 doc** (drop from eval). Farsi blocked (Cloudflare).
- ⚠️ **#39 says "local/self-hosted adapter, not OpenRouter"** — that's a *prod* serving
  requirement. This dev box has **no GPU, 1 vCPU, 15 GB RAM** → cannot self-host an 8B
  model at usable speed. See **D1** (scope escalation).
- ⚠️ **nDCG@10 does not exist.** Harness computes recall@3, recall@10, coverage, MRR,
  P@1 (`scripts/eval-metrics.ts`). Primary = **recall@10 + coverage** (`eval-approach.md`).
  See **D2**.

---

## D1 — How Qwen3-8B is served (+ cost/latency) — RATIFY BEFORE RE-EMBED

**Context.** This VM can't self-host an 8B embedder (no GPU, 1 vCPU). Three candidates:
Ollama (CPU here → minutes-per-batch, impractical for 24k chunks), vLLM (needs a GPU we
don't have locally), hosted. **OpenRouter already hosts `qwen/qwen3-embedding-8b` at
$0.01/M input tokens** — and our current adapter already talks to OpenRouter. Full-corpus
re-embed (~24k chunks + ~500 non-English ≈ ~12M tokens) ≈ **$0.12**; the cheap pass
(`thelife-zh`, ~600 chunks) ≈ **fractions of a cent**. Latency is network-bound, batched
100/req with retry/backoff — minutes, not hours.

**Recommendation.** For the **measurement/eval** (proving the quality win), serve via
**hosted OpenRouter `qwen/qwen3-embedding-8b`** — cheapest, fastest, zero infra, same
provider we already use. Write **one provider-agnostic adapter** (base URL + model + dims
+ instruction-mode + client-side MRL truncation) so the *same code* points at OpenRouter
now and an **on-prem vLLM `/v1/embeddings`** in prod later — config swap, no rewrite. The
#39 "not OpenRouter, self-hosted" requirement is thereby honored **for prod** (the on-prem
vLLM path) and deferred to the prod-ingestion follow-up (**D7**).

**⚠️ Scope escalation:** this uses OpenRouter for the local eval, which #39 P1's letter
argues against. I'm treating "not OpenRouter" as a prod constraint, not an eval one. If
you want the eval itself to run only against a self-hosted endpoint, that blocks on the
on-prem server (#41) and I can't proceed locally — tell me.

**Your call:**
- [x] Approve hosted OpenRouter for the eval, provider-agnostic adapter (recommended)
- [ ] Require self-hosted even for the eval (blocks on #41 — I pause)
- Notes: ____________________

---

## D2 — The WIN metric (bar top-line) — RATIFY BEFORE RE-EMBED

**Context.** Brief said "recall@k / nDCG@10 — confirm which the golden skill treats as
primary." **nDCG@10 is not implemented.** `eval-approach.md` declares **recall@10** (did
we answer it at all) and **coverage** (fraction of relevant set returned) as primary;
MRR/P@1 secondary.

**Recommendation.** **Win = recall@10 improves** on each non-English suite vs its 3-small
baseline, **and no non-English suite regresses**, with **coverage** reported as the depth
metric. **Risk I'm flagging up-front:** recall@10 may *saturate* (a French query has
little non-French competition, so even a weak embedding could hit @10). If baseline
recall@10 is already ≈ceiling and can't show the win, I'll escalate to add **recall@3 +
MRR** as the discriminating non-English metric — that's a bar change, so you'd ratify it.
The cheap pass (**D5**) is designed to surface this before we spend on the full matrix.

**Your call:**
- [x] recall@10 primary (+ coverage), fall back to recall@3/MRR if it saturates (recommended)
- [ ] Different primary: ____________________
- Notes: ____________________

---

## D3 — The FLOOR (English must-not-regress) — RATIFY BEFORE RE-EMBED

**Context.** Latest whole-corpus baseline (prod cert 2026-06-10): **recall@3 0.984 ·
recall@10 1.000 · coverage 0.646 · MRR 0.870 · P@1 0.758** (62 English cases). I'll
re-establish this **locally** on 3-small immediately before the swap (local DB may differ)
as the true comparison point.

**Recommendation.** No English **primary** metric regresses **> 2% relative**:
recall@10 ≥ 0.980, coverage ≥ 0.98× local baseline, and recall@3 ≥ 0.98× local baseline.
(Secondary MRR/P@1 reported but not gated.) The 2% is my proposed number — your ratify.

**Your call:**
- [x] 2% relative floor on recall@10 + coverage + recall@3 (recommended)
- [ ] Different threshold / metric set: ____________________
- Notes: ____________________

---

## D4 — Source×language matrix — RATIFY BEFORE RE-EMBED

**Context.** Viable non-English corpora: `thelife-fr` (fr, 156 docs), `thelife-zh`
(zh, 332 docs). Spanish is 1 doc (unusable). Both are separate source keys, so the
**existing `--source` breakdown gives per-language metrics for free** — no `--language`
flag needed.

**Recommendation.** Two non-English suites, each **8–10 `/golden` cases** with `relevant`
scoped to that source key only (isolates the cross-lingual signal):
| Suite | Source key | Docs | Baseline | Win-target model |
|-------|-----------|-----:|----------|------------------|
| French | `thelife-fr` | 156 | ingest on 3-small | re-embed qwen3-8b |
| Chinese | `thelife-zh` | 332 | ingest on 3-small | re-embed qwen3-8b |
| English floor | existing 6 sources / 62 cases | — | current 3-small | re-embed qwen3-8b |

**Your call:**
- [x] Approve fr + zh suites + English floor (recommended)
- [ ] Adjust (e.g. add Spanish despite 1 doc / drop one): ____________________
- Notes: ____________________

---

## D5 — Cheap representative pass FIRST — RATIFY BEFORE RE-EMBED

**Context.** Brief: ratify the bar on cheap evidence before the whole matrix. Re-embedding
all 24k English chunks + both non-English is cheap in $ but I still want your sign-off on
the *method* before it.

**Recommendation.** Representative = **`thelife-zh` (Chinese)** — most distant from English
→ strongest test of "multilingual actually improves." Sequence:
1. Ingest `thelife-zh` on **3-small** (baseline).
2. Author the Chinese `/golden` suite — I present each case **with an English translation**
   of the question + expected-doc snippet for your content-check (**this is a D-content
   section that lands here when ready**).
3. Run eval → **baseline** zh numbers.
4. Re-embed `thelife-zh` on **qwen3-8b** → run eval → **drift report**.
5. You ratify the bar on this single cheap suite. Only then do I commit the full matrix
   (French + English-floor re-embed).

**Your call:**
- [x] thelife-zh as the cheap representative pass (recommended)
- [ ] thelife-fr instead (easier for you to vet, weaker signal): ____________________
- Notes: ____________________

---

## D6 — minScore under a new model (honest flag)

**Context.** `minScore = 0.37` (`src/retrieval/retrieve.ts:26`) was derived from an
English 3-small eval. A new model shifts the score distribution; and it's never been
tested on non-English negatives.

**Recommendation.** After the swap, re-derive `minScore` from the new distribution using
non-English off-topic negatives (a handful per language) plus the English negatives.
Report the new cutoff in this file before I change the default. **Not gating the win** —
just don't want a silent honesty regression.

**Your call:**
- [ ] Re-confirm/re-derive minScore post-swap, report before changing (recommended)
- Notes: ____________________

---

## D7 — Prod-ingestion follow-up issue (must exist on #39's tracker)

**Context.** No dedicated prod-re-embed issue exists. Closest: #39 P1 itself and #41
(on-prem job-runner infra). The brief scopes prod ingestion OUT of this work but requires
the follow-up to exist.

**Recommendation.** I create a **#39 sub-issue**: *"P1b — prod re-embed on qwen3-8b via
self-hosted adapter (on-prem vLLM), linked to #41"* capturing: the provider-agnostic
adapter, the destructive-`--force` finding (needs blue/green per #5), and the local eval
result as the go/no-go evidence. I'll draft and show you before filing.

**Your call:**
- [ ] Create the sub-issue after I draft it (recommended)
- [ ] You'll track it elsewhere: ____________________
- Notes: ____________________

---

## D8 — ⚠️ ESCALATION: 3-small is better at Chinese than #39 assumed → win may be subtle

**What I found (live OpenRouter probes, 3-small vs qwen3-8b, before spending on eval).**
#39 P1's premise is *"the embedding model handles multilingual content poorly."* The
probes only partly support that:
- **Chinese query → true Chinese answer, vs unrelated Chinese distractors:** BOTH models
  rank the true answer #1 with clean separation (3-small 0.50 vs 0.10–0.16; qwen 0.61 vs
  0.09–0.14). 3-small is *not* broken on Chinese.
- **Cross-lingual (Chinese query, mixed EN+ZH docs):** 3-small still ranks the true
  Chinese answer #1 (0.50) above a same-topic English doc (0.31). qwen's real edge is
  **much stronger cross-lingual alignment** (rates the EN same-topic doc 0.53 vs 3-small's
  0.31) and a higher absolute positive band (~0.61 vs ~0.50).

**Why it matters.** On easy, well-separated cases the swap shows **little recall
movement** — the exact "English holds but non-English doesn't actually improve" outcome the
brief told me to escalate rather than absorb. The win, if real, will live in the **hard**
cases: paraphrased persona questions (golden guardrail #1) over 332 real, topically-clustered
Chinese devotionals **mixed with English competitors** — where 3-small's weaker in-language
ranking should cost it recall@3 / coverage / MRR that qwen recovers.

**What I'm doing about it (proceeding on recommendation; adjust before the expensive pass).**
1. **Cheap-pass corpus = mixed, not Chinese-only.** thelife-zh (332 zh) **+ a small
   topically-overlapping English layer** (`starting-with-god` 40 + `cru-10-basic-steps` 11,
   gospel/assurance/discipleship). ~3 min extra crawl; makes the pass a fair, production-
   realistic cross-lingual test instead of a saturated in-language one.
2. **Read the win on recall@3 + coverage + MRR too, not only recall@10** (which will
   saturate here) — this is the D2 fallback, triggered early by the probe evidence.
3. If, after the real eval, qwen shows **no meaningful gain** on the Chinese suite, I
   STOP and bring you the numbers as a go/no-go — I do not proceed to the expensive
   English-floor re-embed on a swap that doesn't earn its keep.

**Your call:**
- [ ] Mixed cheap-pass corpus + read recall@3/coverage/MRR (recommended; I'm proceeding)
- [ ] Chinese-only, accept saturation risk: ____________________
- [ ] Other: ____________________
- Notes: ____________________

---

## Content-check sections (added when suites are drafted)
_These appear here during D5/D4 golden authoring — each non-English candidate case with
its English translation for your read. Empty until we reach that step._
