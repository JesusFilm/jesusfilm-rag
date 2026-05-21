# registry — boundary

Owns: SourceRegistry — the source list + crawl policy as pure data, plus lookups (by key, by URL).
May import: `contracts`, this dir. MUST NOT import: any context, `adapters`, `serving`, `main`.
Does NOT: fetch, persist, or perform any I/O. Pure data + functions only.
