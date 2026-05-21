# jesusfilm-rag — agent conventions

A standalone, production-quality RAG over publicly accessible JesusFilm Project content. Read-only retrieval exposed to other tools (Claude Code, agents, internal services) via an MCP server. **Consumers generate; this service only retrieves.**

**Design source of truth:** [`docs/architecture.md`](./docs/architecture.md). Read it before non-trivial work — especially §5 (Enforcement & dependency rules).

## Three bounded contexts (behind ports)

| Context | Owns | Does NOT |
|---------|------|----------|
| **Acquisition** | scrapers, source registry, robots, HTTP cache, content extraction → emits `RawDocument` to `raw_documents` | normalize, chunk, embed, write corpus tables |
| **Ingestion** | normalize → chunk → embed → dedup → write (through the storage port) | fetch, run robots, expose search |
| **Retrieval** | query + policy → ranked, cited results (candidate selection, cosine rank, cutoff, dedup, citations) | generate prose, know about HTTP/MCP, apply safety/intent routing |

MCP/HTTP is a thin **serving adapter** over Retrieval, not a fourth context.

## The import law (enforced by `dependency-cruiser`)

Everything depends on *interfaces* (`src/contracts`), never on concrete code, except the composition root.

| Module | May import |
|--------|------------|
| `contracts/` | nothing |
| `registry/` | `contracts` |
| `acquisition/` `ingestion/` `retrieval/` `serving/` | `contracts`, `registry`, itself |
| `adapters/` | `contracts` (+ external libs) |
| `main.ts` | anything (it wires) |

No context imports another context. No context or serving imports a concrete adapter. The only place adapters are constructed is `main.ts`, which injects them. A violation fails the build (`pnpm depcruise`).

## Conventions

- **Postgres + `pgvector` only.** No alternative vector DBs. Schema in `src/db/schema.ts` (Drizzle); changes go through a migration.
- **Dependency injection, one composition root.** No module-level singletons, no top-level `new Adapter()`. Contexts receive ports as arguments.
- **Fakes-only unit tests.** Each port has an in-memory fake; context tests run with no Postgres and no network. A test that needs a real adapter is a coupling bug.
- **File-size cap** (eslint `max-lines` ≈ 300). When a file mixes responsibilities, split it.
- **Sources are defined in the code registry** (`src/registry`), not local files — each entry carries domain, crawl policy, default tags, trust, and languages.
- **Access is by `audience:` tag + per-consumer token scope**, not directory location. Default `audience:public`; anything more restricted must be tagged.
- **Read-only at the MCP boundary.** Any write surface is a separate internal tool, never exposed via MCP. Only Ingestion writes corpus rows.
- **Re-indexing is idempotent and source-scoped:** stale chunks for a changed source are deleted and replaced in the same transaction.
- **Embedding model recorded per row** (`chunk_embeddings.embedding_model`). Don't silently change it — add a new model row, then migrate.
- **Confirm before destructive ops** (dropping tables, deleting sources, force-pushing).
- Defer to `~/Jaxs/CLAUDE.md` for workspace-wide conventions (gh account, tone, decision hierarchy).
