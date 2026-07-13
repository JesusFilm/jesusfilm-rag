# ingestion — boundary

Owns: normalize (incl. the per-document language decision, detect-language + decide-language, #74) → chunk → embed → dedup gate → idempotent write (delete-then-insert, one transaction).
May import: `contracts`, `registry`, this dir. MUST NOT import: `acquisition`, `retrieval`, `serving`, `adapters`, `main`.
Does NOT: fetch URLs, run robots, or expose search.
All I/O goes through injected ports (`Embedder`, `CorpusWriteStore`) — never construct an adapter here.
