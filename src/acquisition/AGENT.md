# acquisition — boundary

Owns: fetch, robots, http-cache, source-selector extraction → emits `RawDocument` to `raw_documents`.
May import: `contracts`, `registry`, this dir. MUST NOT import: `ingestion`, `retrieval`, `serving`, `adapters`, `main`.
Does NOT: normalize, chunk, embed, or write corpus tables.
All I/O goes through injected ports (`Fetcher`, `FetchStateStore`) — never construct an adapter here.
