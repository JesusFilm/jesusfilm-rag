# adapters — boundary

Owns: concrete implementations of the contract ports — `postgres/`, `openrouter/`, `http-fetch/`, `firecrawl/`.
May import: `contracts`, this dir (+ external libs). MUST NOT import: any context, `registry`, `serving`, `main`.
Constructed only by `src/main.ts` (the composition root) and injected into contexts — never imported by a context.
