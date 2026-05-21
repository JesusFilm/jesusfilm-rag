# serving — boundary

Owns: the delivery adapter (`mcp/`, `http/`) over an injected `Retriever` — transport, auth, request/response mapping.
May import: `contracts`, this dir. MUST NOT import: `acquisition`, `ingestion`, `retrieval`, `adapters`, `main`.
Does NOT: implement retrieval logic — it calls a `Retriever` handed to it by `main`.
