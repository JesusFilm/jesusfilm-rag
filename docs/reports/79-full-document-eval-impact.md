# Eval-impact report — full-document retrieval (#79)

- **Date:** 2026-07-16
- **Issue:** [#79](https://github.com/JesusFilm/jesusfilm-rag/issues/79) — retrieval returns one chunk per doc; cru articles bury the answer behind a lead-in anecdote
- **Branch:** `feat/retrieval-full-document`
- **Base:** `origin/main` @ `302371f`
- **Commits:** `b1d2492` (test isolation), `8111ffb` (feature), `a0c8f1c` (ADR-0011)
- **Environment:** local replica Postgres (`localhost:5434`, pgvector), corpus of **8 sources / 11,437 documents / 33,104 chunks**, embed model `qwen/qwen3-embedding-8b`. **Production was never touched** (read-only local retrieval + a self-cleaning sentinel source for the integration test).

## Verdict

**No degradation.** The retrieval eval suite is **byte-identical** before and after the change — every aggregate metric and all 96 per-case ranks/coverage match exactly. The change is additive and **off by default**, so the default retrieval path is unchanged; the eval never opts in, so it cannot move. A ready-for-review PR is therefore warranted (not Draft).

The honest nuance, stated plainly: the eval suite is **structurally blind** to this improvement (see §3). It neither degrades nor rewards it. That is expected and correct — and it is the answer to "are we affecting the eval suite": **no**, and here is why.

## 1. What changed

`RankedResult` gains an optional `document` field, populated **only** when a request sets `policy.includeDocument: true`. It carries the whole source document, reassembled in-context from the winning document's chunks (in `ord` order) via a new batched `CorpusSearchStore.fetchDocumentTexts()` port. `text` still holds the matched chunk (the ranking evidence). Default (flag absent) → no field, no extra query: byte-identical to before. Full design + rejected alternatives: [ADR-0011](../decisions/0011-retrieval-full-document.md).

## 2. Eval before/after — the evidence

Same 96 golden cases, same corpus, `top_k=10`, whole-corpus retrieval.

| Metric | Before (`302371f`) | After (`f64beb1`) | Δ |
|--------|-------------------:|------------------:|:---:|
| recall@3 | 0.938 | 0.938 | **0.000** |
| recall@10 | 1.000 | 1.000 | **0.000** |
| coverage | 0.687 | 0.687 | **0.000** |
| MRR | 0.813 | 0.813 | **0.000** |
| precision@1 | 0.677 | 0.677 | **0.000** |

- **Before:** run `2026-07-16T03:45:12Z → 03:46:43Z` on `302371f` (clean base). Exit 0.
- **After:** run `2026-07-16T04:17:23Z → 04:19:24Z` on **committed HEAD `f64beb1`** (clean working tree — `git status` empty). Exit 0. Its retrieval runtime is the feature commit `8111ffb`; later commits touch only tests, docs, and the opt-in `includeDocument` branch — the **default** retrieval path the eval exercises is unchanged, so this result stands. *(An earlier after-run on the uncommitted working tree — logged `302371f-dirty` — produced the same numbers; this clean-HEAD re-run replaces it so the provenance ties to a real pushed commit.)*
- **Depth check:** a line-diff of the full eval output (metrics **+** per-source coverage **+** per-language coverage) is **identical** before vs after; a diff of all **96 per-case** `rank`/`coverage` lines is **identical**. Not one case moved.

Per-source and per-language coverage (unchanged before→after):

```
cru                n=29  recall=0.828  coverage=0.576
familylife         n=23  recall=0.913  coverage=0.745
jesusfilm-org      n=30  recall=0.667  coverage=0.537
sightline-ministry n=41  recall=0.756  coverage=0.561
starting-with-god  n=22  recall=0.409  coverage=0.318
thelife            n=35  recall=0.857  coverage=0.604
thelife-fr         n=10  recall=1.000  coverage=0.817
thelife-zh         n=10  recall=1.000  coverage=0.867
```

## 3. Why the eval cannot move — and why that is correct

The eval maps each `RankedResult` to `{ chunkId, docPath, score }` and computes every metric (recall@k, coverage, MRR, P@1) by matching **`docPath`** against the golden `relevant` set (`scripts/eval-metrics.ts`). It never reads result `text` or `document`. This change:

1. does not alter candidate selection, cosine ranking, the minScore cutoff, or the 3-key dedup — so **which documents rank where is unchanged**; and
2. only *enriches* the winning hit's payload with full text when opted in.

So the eval — a **document-level** retrieval measure — is invariant to it by construction. The improvement (#79's buried answer now present in the returned payload) lives **below** what the suite measures: content quality within a correctly-retrieved document.

## 4. Are we negatively affecting the eval suite or scripts? No — and no change is needed to keep quality high

- **Suite:** unaffected (identical results, §2). No metric regressed; no case flipped.
- **Scripts:** `scripts/eval.ts` / `eval-metrics.ts` are untouched and still valid — they measure exactly what they claim (document retrieval), which we deliberately preserved.
- **The gap (not a regression):** the suite can't *see* the win. Closing that gap means measuring "does the returned payload contain the answer," which is an **answer-content** judgment. Per the architecture's core tenet (retrieval is mechanism; answer/intent/tone judgment is a **consumer** concern, `AGENTS.md` + architecture §1), that metric does **not** belong bolted onto the retrieval eval. **Recommendation:** track it as a consumer-side / follow-up eval (an LLM-judge "answer present in payload?" harness over `includeDocument` results), not inside `pnpm eval`. Doing otherwise would cross the retrieval/consumer boundary this repo enforces.

## 5. TDD red → green (verifiable)

- **RED** — `2026-07-16T03:50:17Z` on base `302371f`: `src/retrieval/retrieve.test.ts` → **2 failed | 20 passed**. Both failures are the buried-answer assertions (`expected undefined to be defined`; `expected undefined to be '<full doc>'`) — chunk-only retrieval returns the anecdote and the answer is unreachable.
- **GREEN** — `2026-07-16T03:51:23Z` after wiring `retrieve.ts`: `retrieve.test.ts` + `retrieval.integration.test.ts` → **27 passed**. `includeDocument` returns the whole document containing the buried answer, over both the fake and the **real Postgres** store.

## 6. Gates & full suite

- **Full suite:** `pnpm test` → **383 passed (34 files)**, run **3× consecutively** (start stamps `03:54:30 / :32 / :34Z`; each run ~1.5s — vitest is fast and the integration tests are few/quick, so three back-to-back runs fit a ~5s window), all green — the fixed cross-file integration race is deterministic. (Raw log retained.) *(This count predates the review-driven multi-hit test added afterward; the current suite is 384.)*
- `pnpm typecheck` ✓ · `pnpm lint` ✓ · `pnpm depcruise` ✓ (no boundary violations) · `pnpm db:check` ✓ (schema/migrations in sync; no schema change) · `pnpm gen:contract` regenerated `contracts/openapi.v1.json` and the drift test passes.

## 7. Local DB cleanup (bound honored)

The only writes were the integration test's scoped sentinel source (`__it__/retrieval`), removed by its `afterAll` cascade. Post-run verification: **0 sentinel sources, 0 sentinel documents**; corpus totals **unchanged** (11,437 documents / 33,104 chunks). No test data left behind.

## 8. Reproduction

```bash
git checkout 302371f && pnpm eval   # before
git checkout f64beb1 && pnpm eval   # after (identical — the logged clean-HEAD run)
pnpm test                           # integration test proves the real-store fix
```
