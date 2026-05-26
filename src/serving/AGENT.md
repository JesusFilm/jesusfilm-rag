# serving — boundary

Owns: the delivery adapter (`http/`; `mcp/` later) over an injected `Retriever` — transport, auth, request/response mapping.
May import: `contracts`, this dir, external libs (`hono`). MUST NOT import: `acquisition`, `ingestion`, `retrieval`, `adapters`, `main`.
Does NOT: implement retrieval logic — it calls a `Retriever` handed to it by `main`. Does NOT bind a listener (the serve runner does) and never injects a write store (read-only surface).

`http/` is the versioned `/v1` surface: routes under `/v1`, every request/response validated against the published Zod contract (`contracts` module). The contract is the single source of truth — `contracts/openapi.v1.json` is generated from it (`pnpm gen:contract`); consumers map onto it, the engine does not bend. See docs/architecture.md §3.1.
