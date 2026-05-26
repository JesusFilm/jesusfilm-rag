# jesusfilm-rag

A standalone, production-quality retrieval service that serves **biblically aligned content** to other JesusFilm Project systems. Consumers ask, this service retrieves — it does not generate.

> **Design source of truth:** [`docs/architecture.md`](./docs/architecture.md) — the three bounded contexts (Acquisition / Ingestion / Retrieval), the ports between them, the Postgres schema, and the dependency-enforcement rules that keep the boundaries honest.

## Architecture in one breath

**Acquisition** fetches raw content (scrapers, source registry, robots, HTTP cache) and emits `RawDocument`s to a staging table → **Ingestion** normalizes, chunks, embeds, and writes through a storage port → **Retrieval** takes a query plus a policy and returns ranked, cited results. MCP/HTTP is a thin serving **adapter** over Retrieval, not a core concern. LLM generation and any safety/intent routing live in the *caller*, never here.

**Mechanism, not policy.** The RAG is a reliable, parameterized retrieval mechanism: it ranks on similarity + the declared `RetrievalPolicy` (scope, language, category, cutoff, top-k) and returns deterministic, cited results. All "what's good for *this* audience" weighting lives in the consumer; corpus heterogeneity (e.g. football-campaign content next to doctrinal teaching) is solved by **ingest-time labeling and source-level on/off, not retrieve-time bias** — so the same engine serves a doctrinal apologist and a World Cup chat bot without either's preferences contaminating the other. See [`docs/architecture.md`](./docs/architecture.md) §1.

## Who consumes this

Read-only retrieval over a curated, publicly accessible corpus. Consumers do their own generation:

- **NextSteps** — journey-style conversational tools (e.g. the World Cup chat bot).
- **Forge** — textual content production (writing, drafting, summarisation).
- **JesusFilm-AI** — broader AI surfaces under the JFP umbrella.

## Stack

- **PostgreSQL + `pgvector`** — the only datastore. HNSW cosine index on `halfvec(1536)` embeddings. No alternative vector DBs.
- **OpenRouter** — embedding provider. Model `openai/text-embedding-3-small` (1536d), recorded per row so it can be swapped without losing history.
- **HTTP `/v1` API** — the read-only retrieval surface other systems call: a versioned REST contract (`POST /v1/search`, `GET /v1/health`) published as [`contracts/openapi.v1.json`](./contracts/openapi.v1.json). An MCP adapter is a later variant over the same `Retriever`.

## Sources & corpus

Sources are defined in the **source registry** (`src/registry`) — each entry carries its domain, crawl policy, default tags (`media:`/`audience:`/`topic:`/`lang:`), trust level, and languages. There is no local corpus directory: the corpus is **built from sources by code**. Acquisition crawls each source per its policy into the `raw_documents` staging table; Ingestion normalizes → chunks → embeds into the corpus tables. Re-runs are idempotent and source-scoped — unchanged pages are skipped. See [`docs/architecture.md`](./docs/architecture.md) §3 and §10.

## Authoring evals (golden cases)

Golden cases are **not hand-written**. After a source is ingested, run the
**`/golden <source-key>`** skill: it surveys what *actually* landed in the corpus
and drafts candidate questions from a balanced spread of personas — **seeker,
skeptic, believer, newcomer** — each tied to a real document, plus off-topic
negatives for cutoff calibration. You curate (approve / edit / reject) into
`eval/qa-golden.yaml`; `pnpm eval` then scores recall@k / MRR. It works for any
source because it reads the ingested corpus rather than assuming a topic.

The eval is **retrieval-only** — did the right chunk come back, and does
off-topic content stay out. No intent/tone/answer judgment lives here; that's a
consumer concern (see [`docs/architecture.md`](./docs/architecture.md) §1,
"mechanism, not policy"). See [`.claude/skills/golden/SKILL.md`](./.claude/skills/golden/SKILL.md).

## Access & filtering (two layers)

- **Layer 1 — token scope (allowlist).** Each consumer holds a Bearer token whose scope is the set of source keys it may see (`["*"]` = all). Anything outside scope is invisible — not queryable. (A finer tag-level scope is a future refinement.)
- **Layer 2 — query narrowing (refinement).** Within scope, a search call may pass `policy.allowedSourceKeys` to narrow further. The server intersects it with the token scope — a request may narrow but never widen past the token; an out-of-scope request returns zero results without erroring or leaking what exists.

Token scopes live in Railway env on the serving service (`SERVE_BEARER_TOKENS`, a JSON map of token → source keys), issued one per consumer, rotated per-consumer.

## Running

### Prerequisites
- Node ≥ 20.12, pnpm 9+, Docker (local Postgres container).
- An OpenRouter API key (set in `.env`; see `.env.example`).

### Quick start
```sh
cp .env.example .env        # set OPENROUTER_API_KEY
docker compose up -d        # postgres (:5434) + the /v1 serving API (:8080)
pnpm install
pnpm db:migrate             # schema + migrations are live
```

`docker compose up` runs the **`serve`** container alongside Postgres, so the `/v1` API is live on `:8080` with no manual env — the DB host, `OPENROUTER_API_KEY` (from `.env`), and a dev bearer token (`local-dev-token`) are wired in `docker-compose.yml`. Verify:

```sh
curl localhost:8080/v1/health
curl -X POST localhost:8080/v1/search -H 'authorization: Bearer local-dev-token' \
  -H 'content-type: application/json' -d '{"query":"how do I become a Christian?"}'
```

The pipeline is being built out per [`docs/architecture.md`](./docs/architecture.md) §9. The serving adapter is live — a versioned `/v1` HTTP surface over the wired `Retriever` (§3.1); run it in Docker (above) or directly on the host via `pnpm serve`. The schema, migrations, env, and devcontainer are live too.

### Scripts
| Script | What it does |
|--------|--------------|
| `pnpm db:generate` | Regenerate migrations from `src/db/schema.ts`. |
| `pnpm db:migrate` | Apply migrations + pgvector + generated FTS column. |
| `pnpm index` | Ingestion pipeline. **Stubbed** pending build steps 2 & 4 (consumes `raw_documents`, idempotent + source-scoped). |
| `pnpm serve` | Start the `/v1` HTTP serving adapter over the wired `Retriever`. Binds `PORT` (Railway-injected; default 8080); requires `SERVE_BEARER_TOKENS`. |
| `pnpm gen:contract` | Regenerate `contracts/openapi.v1.json` from the Zod source (`src/contracts/retrieval.schema.ts`). The drift test fails if it's out of sync. |
| `pnpm smoke "<query>"` | Consumer-perspective probe of a **running** `/v1` server (`SMOKE_BASE_URL`, default localhost; `SMOKE_TOKEN`). Gates on correctness — public interface → RAG → back returns a contract-valid 200 — and reports latency (`SMOKE_MAX_MS` is a hang ceiling, default 5s, not a sub-second SLA). A post-deploy / CD gate, not part of `pnpm test`. |
| `pnpm eval` | Run `eval/qa-golden.yaml` (recall@k, MRR). Harness kept; query path **stubbed** until Retrieval (step 5). |
| `pnpm depcruise` / `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality + boundary gates. |

## For agentic AI

Operational rules that **must** be followed when an agent works in this repo:

- **Read `AGENT.md` first**, then `docs/architecture.md` §5 for the boundary law.
- **Boundaries are enforced, not advisory** — `dependency-cruiser` + eslint caps fail the build on a cross-context import, an adapter touched outside `main.ts`, or an oversized file. Do not work around them; fix the design.
- **Only Ingestion writes corpus rows.** Never have an MCP tool, ad-hoc script, or agent task write to Postgres directly.
- **Only public content enters the corpus.** A restricted source does not belong here — stop and ask.
- **Re-indexing is idempotent and source-scoped** (delete-then-insert in one transaction). Do not invent partial-update mechanisms.
- **Embedding model is recorded per row.** Don't silently change it — add a new model row, then migrate.
- **No write surface on the MCP server.**
- **Confirm before destructive ops** (dropping tables, deleting corpus subdirs, force-pushing). Defer to `~/Jaxs/CLAUDE.md` for workspace-wide safety.

## Status

Clean-slate rebuild started **2026-05-21**: porting the proven jesusfilm-ai RAG into three bounded contexts behind ports (see [`docs/architecture.md`](./docs/architecture.md)). Landed so far: the normalized schema + migrations, the embedding-model decision (`openai/text-embedding-3-small`, 1536d, in env + schema), and the §5 enforcement scaffolding (`src/contracts`, dir layout, `dependency-cruiser`, lint caps). The legacy MVP implementations (source walker, chunker, embedder, MCP server) were stripped — Acquisition, Ingestion, Retrieval, and Serving are rebuilt fresh from jesusfilm-ai in the porting steps. Kept: Postgres + Drizzle + migrate runner, devcontainer, Zod env, the eval harness framework.
