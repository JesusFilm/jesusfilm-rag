# Re-embedding production onto `qwen/qwen3-embedding-8b`

The one-time corpus re-embed for the multilingual model swap ([ADR-0005](../decisions/0005-embedding-model-qwen3-8b-multilingual.md),
[#39](https://github.com/JesusFilm/jesusfilm-rag/issues/39) P1). This is a **deliberate,
human-run, watched** operation — **never** an agent/automated job. Run it on an always-on
box **inside `tmux`** so a dropped connection can't interrupt a long run.

> **This runbook is for PRODUCTION only** and is gated on the embedder PR being **merged to
> `main`** first. The local (dev-laptop) re-embed + eval is a separate, earlier phase, driven
> from the operator's out-of-repo execution tracker (kept on the laptop, not in this repo).

## Exact model + config (do not paraphrase)

| Var | Value | Where it's needed |
|---|---|---|
| `EMBED_MODEL_ID` | `qwen/qwen3-embedding-8b` | **Everywhere** — re-embed AND every query path |
| `EMBED_QUERY_INSTRUCTION` | `Given a web search query, retrieve relevant passages that answer the query` | Query paths only (retrieve/eval/**live server**); documents embed raw |
| dimensions | 1536 (OpenRouter honours the `dimensions=1536` request param → server-side MRL truncation; no client truncation needed) | — |
| `EMBED_BASE_URL` | *unset* (defaults to OpenRouter) | set only for a self-hosted vLLM endpoint |
| `EMBED_TRUNCATE_DIMENSIONS` | *unset / false* on OpenRouter | set `true` only if a self-host endpoint returns native 4096 |

### ⚠️ The one rule that must not be broken: query model == document model

Retrieval compares a **query** embedding against **document** embeddings. If documents are
re-embedded with qwen but a **query path still uses 3-small** (or vice-versa), the two live
in different vector spaces and retrieval **silently returns garbage** — no error, just wrong
results. Therefore the corpus re-embed and the **serving cutover must be coordinated** (see
step 4). `EMBED_QUERY_INSTRUCTION` is a *quality* enhancement (query side only);
`EMBED_MODEL_ID` matching is a *correctness* requirement.

**Every query is embedded by the same wired embedder** (`main.wire()` → one
`OpenRouterEmbedder` from `EMBED_MODEL_ID`), so there is no separate "retrieval model" in
code — but **each of these entry points must run with `EMBED_MODEL_ID=qwen/qwen3-embedding-8b`**:

- the **live `/v1` Railway server** (`pnpm serve`) — via Railway service vars (step 4);
- `pnpm retrieve:production` / `pnpm eval:production` — via the seeded session (step 1);
- (local, on the laptop) `pnpm query` / `pnpm eval` — via `.env`.

⚠️ **The code default is now `qwen/qwen3-embedding-8b`** (flipped 2026-07-02 after the local
re-embed + eval sign-off; the earlier revision of this runbook deliberately kept 3-small as
the default). Consequence — **THIS IS A MERGE-BLOCKER**: Railway redeploys on push to `main`,
and a qwen-defaulted server against the still-3-small prod corpus makes the retrieval guard
error every query (prod retrieval DOWN, not wrong). Before merging this PR to `main`, either
(a) run the prod re-embed (steps above) first, or (b) pin the Railway service var
`EMBED_MODEL_ID=openai/text-embedding-3-small` so the deploy keeps serving the old corpus
until the cutover, then remove the pin at step 4. Verify the Railway env BEFORE merge.

**A retrieval-time guard now enforces this (`src/retrieval/retrieve.ts`):** if the query
embedder's model is in *none* of the corpus's `embedding_model` values, `search` throws
`retrieval model mismatch: …` instead of returning silent garbage. Practical consequence you
must expect during the cutover: once step 3 finishes (corpus fully on qwen) but *before*
step 4 (Railway still on 3-small), the live server will **error every query** — retrieval is
briefly *down*, not wrong. So do steps 3 → 4 back-to-back. During a partial re-embed the
guard stays quiet as long as the query model matches *some* rows (mixed models are allowed).

## Preconditions

1. Embedder PR merged to `main`; this VM has `git pull`ed `main`.
2. `pnpm install --frozen-lockfile` done; `pnpm db:check` green.
3. Prod `DATABASE_URL` + `OPENROUTER_API_KEY` to hand (JF-org Railway shared variables /
   password manager). Same OpenRouter key as local — mind the shared rate limit (don't run
   a local parallel re-embed at the same time).

## Procedure (human, in `tmux`)

All `:production` scripts prompt Y/N, then for creds, then show a **redacted** target and
ask Y/N again. They read creds from the shell/prompt, **never `.env`**. See
[`prod-ingest.md`](./prod-ingest.md) for the interactive-cred mechanism.

```sh
# 0. Persistent session (survives disconnects)
tmux new -s reembed

# 1. Seed prod creds once for the session, and export the qwen model + instruction.
#    seed-prod.sh prompts for DATABASE_URL / OPENROUTER_API_KEY / EMBED_MODEL_ID.
#    seed-prod.sh's Enter-default is now `qwen/qwen3-embedding-8b` (footgun removed
#    2026-07-02 — the default used to be the old 3-small model), so pressing Enter is
#    correct. Then export the query instruction (the :production scripts do NOT prompt for it):
source scripts/seed-prod.sh
export EMBED_QUERY_INSTRUCTION="Given a web search query, retrieve relevant passages that answer the query"

# 2. Sanity: confirm the model the session will use.
echo "model=$EMBED_MODEL_ID  instr=${EMBED_QUERY_INSTRUCTION:0:24}..."

# 2.5 FREEZE /v1 TRAFFIC before any --force. In-place reindex has no uptime guarantee
#     (architecture.md locked-decision 6; blue-green is deferred, #5). While step 3
#     runs, the corpus is a shrinking mix of old+new vectors: a still-3-small server returns
#     PARTIAL results, and the moment the corpus is fully qwen the model-match guard makes it
#     ERROR every query. So put the service in maintenance mode (or drain traffic / take the
#     Railway service offline) BEFORE step 3, and lift it only after step 4. If a consumer
#     can tolerate a brief window, at minimum announce it. Blue-green (build candidate → atomic
#     swap, #5) is the future fix that removes this freeze.

# 3. Re-embed every source. --force re-drains ALREADY-ingested English rows AND drains the
#    pending fr/zh rows, re-embedding everything with qwen. Documents embed raw (instruction
#    is query-side only), so the export above does not affect ingestion — it's for step 4/5.
#    Run per-source so a failure is scoped. If a source dies mid-run, just re-run the SAME
#    --force line — it RESUMES (skips docs already on qwen, re-embeds only the rest; #61). Do
#    them SEQUENTIALLY here (one prod key; parallel is a local experiment, see the master plan):
pnpm index:production --source starting-with-god   --force
pnpm index:production --source cru-10-basic-steps   --force
pnpm index:production --source jesusfilm-org        --force
pnpm index:production --source sightline-ministry   --force
pnpm index:production --source thelife              --force
pnpm index:production --source familylife           --force
pnpm index:production --source thelife-fr           --force
pnpm index:production --source thelife-zh           --force
```

**Do NOT run any `acquire:production` step** — the raw documents are already staged; this is
a re-embed of existing rows only.

```sh
# 4. SERVING CUTOVER (coordinate with step 3 — see the "one rule" box above).
#    Update the live Railway service's env so query embeddings use the SAME model:
#      Railway → jesusfilm-rag service → Variables:
#        EMBED_MODEL_ID          = qwen/qwen3-embedding-8b
#        EMBED_QUERY_INSTRUCTION = Given a web search query, retrieve relevant passages that answer the query
#    Redeploy the service. Until this is done, the live /v1 API queries with the OLD model
#    against NEW vectors → broken retrieval. Prefer: finish step 3, then flip step 4 promptly.

# 5. Verify in prod (read-only) — query model now matches doc model.
pnpm retrieve:production --source thelife-zh "我怎样才能确定死后能上天堂？"   # Chinese vibe-check
pnpm retrieve:production --source thelife-fr "comment être sûr d'aller au ciel"  # French vibe-check
pnpm eval:production                                                             # English drift (whole corpus)
pnpm eval:production --source thelife-fr        # per-language (once fr golden cases exist)
pnpm eval:production --source thelife-zh        # per-language (once zh golden cases exist)
```

## Verification checklist

- Every `chunk_embeddings` row's `embedding_model` = `qwen/qwen3-embedding-8b` (no
  3-small rows left). Chunk counts unchanged vs pre-swap (re-embed re-chunks deterministically).
- `retrieve:production` returns sensible, **same-language** hits for the fr/zh probes.
- `eval:production` (English) shows **no major drift** vs the pre-swap baseline in
  `docs/sources.md` / prior `eval/results-*.md` (see the drift-judgement rule in the master
  plan; only major regression blocks — English is expected to hold, not necessarily improve).
- The live `/v1` server is redeployed with the qwen env (step 4) — query/doc models match.

## Hazards

- **Model mismatch (the big one)** — see the box above. Coordinate re-embed + serving cutover.
- **Shared OpenRouter key** — prod re-embed competes with any local run on the same rate
  limit. Don't run both at once.
- **Long run / interruption** — hence `tmux`. `index:production` is per-document idempotent
  (delete-then-insert in one tx). A killed run leaves the source on a mix of old + new
  vectors — **just re-run the same `--force` command to resume** (#61): the model-aware force
  gate skips documents already on the target model and re-embeds only the remainder, so
  nothing already done is redone. Reach for `--force-all` only to re-embed docs already on the
  target model (e.g. a chunker change that did not change the model). *(Before #61, resuming a
  partial `--force` needed a manual `content_hash` invalidation + `ingested_at = NULL` reset
  and a non-`--force` re-run — no longer necessary; `--force` is now resumable by design.)*
- **Cost** — one embedding per chunk (~24k) + queries; pennies on OpenRouter, but real. The
  redacted-target Y/N gate is the last line of defence against the wrong DB.

## Local-run learnings (dev laptop, 2026-07-02) — apply to prod expectations

The full local re-embed (8 sources, 24,642 chunks, ~9,000 documents) ran per-source
`pnpm index --source <key> --force` in **6 parallel streams**:

- **Parallel per-source streams are safe and effective**: zero 429s / zero rate-limit
  pushback from OpenRouter at 6-way; transient timeouts (~0.5% of docs) all recovered by
  the embedder's retry. Streams touch disjoint sources, so no DB contention.
- **Do NOT run two streams on the same source**: the pending-row drain has no row claiming
  (no `FOR UPDATE SKIP LOCKED`) — concurrent same-source workers double-process rows.
  Per-source is the max safe fan-out today; intra-source workers would need a claiming
  drain (follow-up if speed ever matters more).
- **Throughput is provider-latency-bound, not concurrency-bound**: one embed request per
  document (~5 chunks avg), 1–40s per request depending on OpenRouter's provider routing
  (SiliconFlow fast, Nebius slow on big batches). Observed ~6–13 docs/min per stream,
  ~20–35 docs/min aggregate. Whole corpus ≈ a working day wall-clock; the largest source
  (`thelife`, 4,485 docs) dominates. Sequential prod (one key, per the procedure above)
  should expect ~9,000 docs × ~9 s ≈ **22h+**; plan the tmux session accordingly or
  run 2–3 sources in parallel panes if the shared-key rate budget allows.
