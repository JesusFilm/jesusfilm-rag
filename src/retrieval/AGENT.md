# retrieval — boundary

Owns: query embed → candidate selection → cosine rank → minScore cutoff → 3-key dedup → citation assembly.
May import: `contracts`, `registry`, this dir. MUST NOT import: `acquisition`, `ingestion`, `serving`, `adapters`, `main`.
Does NOT: generate prose, know about HTTP/MCP/channels, or apply intent/crisis/scope routing (it arrives as `RetrievalPolicy`).
All I/O goes through injected ports (`CorpusSearchStore`, `Embedder`) — never construct an adapter here.
