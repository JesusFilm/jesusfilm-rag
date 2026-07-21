# Embed retry policies — corpus vs query

The service calls the OpenRouter embeddings endpoint in two very different
postures, and each has its own retry policy. Both are wired in `src/main.ts`
as two separate instances of the same `OpenRouterEmbedder` adapter; the
adapter itself carries one policy per instance and no global default beyond
its constructor options.

## Why two policies

- **Corpus (document) embedding** happens inside a long `pnpm index` /
  `pnpm index:production` run. Abandoning a run because one batch hit a
  transient blip throws away hours of compute
  ([#64](https://github.com/JesusFilm/jesusfilm-rag/issues/64)), so this path
  is **patient**.
- **Query embedding** happens at request time — every `/v1/search` embeds the
  caller's query text before vector search. The consumer on the other end has
  typically given up within seconds (forge's `jesusfilm-rag-client` defaults
  to a **5s** budget), so ingest-grade patience holds a dead request open for
  minutes and floods the serve logs with retry lines. This path **fails
  fast**.

The split exists because the two paths briefly shared one policy and one log
wording. On 2026-07-21 an OpenRouter embeddings degradation made the serving
container's Railway logs fill with `⟳ embed attempt N/10 failed` lines — which
read as "the RAG is busy embedding its corpus" while callers saw
`rag_retrieval_unavailable`. It was neither: each line was a *query* embed
retry for a request whose caller was already gone.

## The policies

| | Corpus / documents (ingest) | Query (retrieval) |
|---|---|---|
| Runs during | `pnpm index`, `pnpm index:production` | `/v1/search` (`pnpm serve`), `pnpm query`, `pnpm retrieve:production`, `pnpm eval`, `pnpm eval:production` |
| Per-attempt timeout | 30s (adapter default, not env-tunable) | `QUERY_EMBED_TIMEOUT_MS`, default **4s** |
| Attempts (try + retries) | `EMBED_MAX_ATTEMPTS`, default **10** | `QUERY_EMBED_MAX_ATTEMPTS`, default **2** |
| Backoff between attempts | 500ms → 1s → 2s → 4s → 8s → 8s … (doubles, capped at 8s); ~47.5s cumulative across 9 retries | 250ms before the single retry |
| Worst case per call | ≈ 5.8 min per batch (10 × 30s timeouts + 47.5s backoff) | ≈ **8.25s** (4s + 250ms + 4s) |
| On exhaustion | The index run fails; re-run resumes (model-aware gate skips finished docs) | The search throws; `/v1/search` returns a contract-shaped `{"error":"internal"}` 500 |
| Retry log line | `  ⟳ corpus embed attempt 2/10 failed (http_503); retrying in 1000ms` | `[retrieval] event=query_embed_retry attempt=1/2 reason=timeout delay_ms=250` |

Shared by both instances (they must agree or retrieval is silent garbage —
`retrieve.ts` guards this): `EMBED_MODEL_ID`, `EMBED_BASE_URL`,
`EMBED_QUERY_INSTRUCTION`, `EMBED_TRUNCATE_DIMENSIONS`, the API key.

What counts as transient (retried): request timeout (`AbortError`), network
drop, HTTP 429/5xx. Never retried on either path: data-integrity errors
(vector width/count mismatch) and non-429 4xx — a retry can't fix them.

## Reading the logs

Retry lines name the operation and carry a greppable reason token —
`http_<status>`, `timeout`, or `network`:

```
[retrieval] event=query_embed_retry attempt=1/2 reason=http_429 delay_ms=250   ← a request-time QUERY embed
  ⟳ corpus embed attempt 3/10 failed (timeout); retrying in 2000ms             ← an ingest batch
```

On the serving path the terminal entry after any retry lines is:

```
serve: request failed — returning 500 to the caller <error>
```

If Railway serve logs show `query_embed_retry` lines, the embeddings provider
is degraded and searches are failing — **no corpus embed job is running**.
Corpus embedding only ever happens when someone runs the index CLIs by hand;
nothing schedules it.

## Tuning

- A consumer that wants to benefit from the query retry must budget past the
  worst case (≈ 8.25s at defaults) — e.g. forge would raise
  `JESUSFILM_RAG_TIMEOUT_MS` (default 5000, max 30000) to ~10s. Alternatively
  set `QUERY_EMBED_MAX_ATTEMPTS=1` for a pure single-shot.
- Long eval runs inherit the fast-fail query policy; if a flaky provider is
  failing individual eval questions, raise `QUERY_EMBED_MAX_ATTEMPTS` /
  `QUERY_EMBED_TIMEOUT_MS` for that run rather than reverting the serving
  default.
- Raise `EMBED_MAX_ATTEMPTS` per ingest run when OpenRouter is having a rough
  day (see [prod-ingest.md](./prod-ingest.md)).
