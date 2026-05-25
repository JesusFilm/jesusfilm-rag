# retrieval — boundary

Owns: query embed → candidate selection → cosine rank → minScore cutoff → 3-key dedup → citation assembly.
May import: `contracts`, `registry`, this dir. MUST NOT import: `acquisition`, `ingestion`, `serving`, `adapters`, `main`.
Does NOT: generate prose, know about HTTP/MCP/channels, apply intent/crisis/scope routing, or apply audience/value weighting/bias. Mechanism, not policy: rank on similarity + the declared `RetrievalPolicy` only; "what's good for this audience" is the consumer's job. The only sanctioned in-engine steering is thin + tiebreak-only (`minScore`, `preferSourceKey` soft tiebreak). See `docs/architecture.md` §1 tenet.
All I/O goes through injected ports (`CorpusSearchStore`, `Embedder`) — never construct an adapter here.
