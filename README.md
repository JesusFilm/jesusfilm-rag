# jesusfilm-rag

A standalone, production-quality retrieval service that serves **biblically aligned content** to other JesusFilm Project systems. Consumers ask, this service retrieves — it does not generate.

> **Design source of truth:** [`docs/architecture.md`](./docs/architecture.md) — the three bounded contexts (Acquisition / Ingestion / Retrieval), the ports between them, the Postgres schema, and the dependency-enforcement rules that keep the boundaries honest.

## Architecture in one breath

**Acquisition** fetches raw content (scrapers, source registry, robots, HTTP cache) and emits `RawDocument`s to a staging table → **Ingestion** normalizes, chunks, embeds, and writes through a storage port → **Retrieval** takes a query plus a policy and returns ranked, cited results. MCP/HTTP is a thin serving **adapter** over Retrieval, not a core concern. LLM generation and any safety/intent routing live in the *caller*, never here.

## Who consumes this

Read-only retrieval over a curated, publicly accessible corpus. Consumers do their own generation:

- **NextSteps** — journey-style conversational tools (e.g. the World Cup chat bot).
- **Forge** — textual content production (writing, drafting, summarisation).
- **JesusFilm-AI** — broader AI surfaces under the JFP umbrella.

## Stack

- **PostgreSQL + `pgvector`** — the only datastore. HNSW cosine index on `halfvec(1536)` embeddings. No alternative vector DBs.
- **OpenRouter** — embedding provider. Model `openai/text-embedding-3-small` (1536d), recorded per row so it can be swapped without losing history.
- **MCP server** — the read-only Streamable HTTP surface other systems call.

## Sources & corpus

Sources are defined in the **source registry** (`src/registry`) — each entry carries its domain, crawl policy, default tags (`media:`/`audience:`/`topic:`/`lang:`), trust level, and languages. There is no local corpus directory: the corpus is **built from sources by code**. Acquisition crawls each source per its policy into the `raw_documents` staging table; Ingestion normalizes → chunks → embeds into the corpus tables. Re-runs are idempotent and source-scoped — unchanged pages are skipped. See [`docs/architecture.md`](./docs/architecture.md) §3 and §10.

## Access & filtering (two layers)

- **Layer 1 — token scope (allowlist).** Each consumer holds a Bearer token whose scope is the set of tags it may see. Anything outside scope is invisible — not queryable, not fetchable by id, not discoverable.
- **Layer 2 — query filter (refinement).** Within scope, a search call may pass `filter.include` / `filter.exclude`. The server intersects the filter with the token scope; an out-of-scope filter returns zero results without erroring or leaking what exists.

Token scopes live in Railway env on the MCP service, issued one per consumer, rotated per-consumer.

## Running

### Prerequisites
- Node ≥ 20.12, pnpm 9+, Docker (local Postgres container).
- An OpenRouter API key (set in `.env`; see `.env.example`).

### Quick start
```sh
cp .env.example .env
docker compose up -d        # pgvector/pgvector:pg16, host port 5434
pnpm install
pnpm db:migrate             # schema + migrations are live
```

The pipeline is being built out per [`docs/architecture.md`](./docs/architecture.md) §9. Until the contexts land, `pnpm index` / `pnpm serve` / `pnpm eval` are stubbed (they carry `TODO(step-N)` markers); the schema, migrations, env, and devcontainer are live.

### Scripts
| Script | What it does |
|--------|--------------|
| `pnpm db:generate` | Regenerate migrations from `src/db/schema.ts`. |
| `pnpm db:migrate` | Apply migrations + pgvector + generated FTS column. |
| `pnpm index` | Ingestion pipeline. **Stubbed** pending build steps 2 & 4 (consumes `raw_documents`, idempotent + source-scoped). |
| `pnpm serve` | **Stubbed** — the Serving (MCP) adapter is rebuilt in step 6 over an injected `Retriever`. |
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
