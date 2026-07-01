# ADR-0002 — Embeddings stored as halfvec(1536); model openai/text-embedding-3-small

- Status: Accepted — **model choice superseded by [ADR-0005](./0005-embedding-model-qwen3-8b-multilingual.md)** (2026-07-02); the `halfvec(1536)` storage + per-row `embedding_model` decisions below still stand.
- Date: 2026-05-21
- Issue/PR: — (foundational; "decision 1" in architecture.md)
- Related: ADR-0001, ADR-0003, ADR-0005

## Context

The corpus is embedded once and queried by cosine similarity through pgvector.
The embedding model and the physical column type are expensive to change after a
corpus exists — a width or model change means re-embedding everything — so both
are pinned deliberately rather than drifting.

## Decision

Embed with **`openai/text-embedding-3-small` at 1536 dimensions** (via
OpenRouter), matching jesusfilm-ai and Forge. Store vectors as **`halfvec(1536)`**
(fp16) with an HNSW cosine index. Record `embedding_model` **per row**: a model
swap inserts new embedding rows alongside the existing ones — never silently
rewrites them — then migrates. See architecture.md §6 and `src/db/schema.ts`.

## Alternatives rejected

- **`vector(1536)` (fp32)** — acceptable and simpler (1536 is under pgvector's
  ~2000-dim full-precision HNSW cap), but `halfvec` halves storage and is
  forward-compatible with larger models. We keep `halfvec`; `vector` stays a
  valid fallback if a future need makes it simpler.
- **A different / newer embedding model** — would break parity with jesusfilm-ai
  and Forge and invalidate the existing corpus. Changing the model is a migration
  (a new model row), not an edit.

## Consequences

- (+) Storage-efficient, parity with sibling projects, deterministic similarity.
- (–) The vector column cannot be modeled by an ORM's typed query client, so
  similarity queries stay raw `sql` regardless of data-access tooling (ADR-0003).
- The 1536 width is restated in `src/adapters/postgres/vector.ts` because the
  adapter may not import the schema (ADR-0001); changing it is a coordinated
  migration across both, plus a re-embed.
