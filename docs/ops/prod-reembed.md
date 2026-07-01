# Re-embedding production onto `qwen/qwen3-embedding-8b`

The one-time corpus re-embed for the multilingual model swap ([ADR-0005](../decisions/0005-embedding-model-qwen3-8b-multilingual.md),
[#39](https://github.com/JesusFilm/jesusfilm-rag/issues/39) P1). This is a **deliberate,
human-run, watched** operation — **never** an agent/automated job. Run it on an always-on
box **inside `tmux`** so a dropped connection can't interrupt a long run.

> **This runbook is for PRODUCTION only** and is gated on the embedder PR being **merged to
> `main`** first. The local (dev laptop) re-embed + eval is a separate, earlier phase — see
> the master plan at `~/Ops/docs/jesusfilm-rag-reembed-plan.md`.

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

The code **default stays `openai/text-embedding-3-small` on purpose**: Railway redeploys on
push to `main`, so flipping the default before the corpus is re-embedded would break prod
retrieval on the merge. The model is switched by **env at cutover**, never by the code default.

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
#    ⚠️ FOOTGUN: at the EMBED_MODEL_ID prompt, seed-prod.sh's Enter-default is the OLD model
#    (openai/text-embedding-3-small). You MUST TYPE `qwen/qwen3-embedding-8b` — do NOT press
#    Enter. Then export the query instruction (the :production scripts do NOT prompt for it):
source scripts/seed-prod.sh
export EMBED_QUERY_INSTRUCTION="Given a web search query, retrieve relevant passages that answer the query"

# 2. Sanity: confirm the model the session will use.
echo "model=$EMBED_MODEL_ID  instr=${EMBED_QUERY_INSTRUCTION:0:24}..."

# 3. Re-embed every source. --force re-drains ALREADY-ingested English rows AND drains the
#    pending fr/zh rows, re-embedding everything with qwen. Documents embed raw (instruction
#    is query-side only), so the export above does not affect ingestion — it's for step 4/5.
#    Run per-source so a failure is scoped and resumable. Do them SEQUENTIALLY here (one prod
#    key; parallel is a local experiment, see the master plan):
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
  (delete-then-insert in one tx); a killed run leaves that source partial, re-run drains the rest.
- **Cost** — one embedding per chunk (~24k) + queries; pennies on OpenRouter, but real. The
  redacted-target Y/N gate is the last line of defence against the wrong DB.
