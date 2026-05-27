# jesusfilm-rag — agent conventions

A standalone, production-quality RAG over publicly accessible JesusFilm Project content. Read-only retrieval exposed to other tools (Claude Code, agents, internal services) via an MCP server. **Consumers generate; this service only retrieves.**

**Core tenet — mechanism, not policy:** the RAG is a reliable, parameterized retrieval mechanism; all "what's good for this audience" weighting lives in the consumer; corpus heterogeneity is solved by ingest-time labeling (`category`/`tags`/`sourceKey`) and source-level on/off, **not** retrieve-time bias. The engine ranks on similarity + the declared `RetrievalPolicy` and returns deterministic, cited results. See [`docs/architecture.md`](./docs/architecture.md) §1 "Tenet: mechanism, not policy".

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
| `adapters/` | `contracts`, `src/db/schema` (+ external libs) |
| `main.ts` | anything (it wires) |

No context imports another context. No context or serving imports a concrete adapter. The only place adapters are constructed is `main.ts`, which injects them. A violation fails the build (`pnpm depcruise`).

Adapters may import **`src/db/schema.ts`** — the one relaxation of the law (ADR-0003): the Postgres adapter drives Drizzle's query builder off the schema for CRUD. The pgvector `<=>` and FTS `tsvector` hot paths stay raw `sql\`…\`` fragments interleaved in the builder (no ORM types them).

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
- **Commits follow Conventional Commits** (`feat: …`, `fix(retrieve): …`, `docs: …`; scope optional), enforced by a commitlint `commit-msg` hook (husky) — see `commitlint.config.mjs`. Squash-merge note: the commit that lands on `main` takes its subject from the **PR title**, which the hook can't see — so the PR title is linted separately by a CI check (`.github/workflows/pr-title.yml`).
- **Golden eval cases are authored with `/golden <source-key>`, not by hand.** After a source is ingested, the skill surveys the *real* corpus and drafts persona-diverse candidate questions — **seeker · skeptic · believer · newcomer**, each tied to a real document — plus off-topic negatives for cutoff calibration, for you to curate into `eval/qa-golden.yaml`. `pnpm eval` then scores recall@k / MRR. Retrieval-only — no intent/tone/answer judgment (that's a consumer concern). See [`.claude/skills/golden/SKILL.md`](./.claude/skills/golden/SKILL.md).
- Defer to `~/Jaxs/CLAUDE.md` for workspace-wide conventions (gh account, tone, decision hierarchy).
