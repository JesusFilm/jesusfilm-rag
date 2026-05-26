/**
 * Barrel for the contracts module — the dependency-free seam definitions every
 * other module depends on. Mostly types (verbatimModuleSyntax); the published
 * retrieval contract (retrieval.schema.ts) also exports runtime Zod schemas, so
 * it is a value-export (`export *`) — the engine's published shapes live there.
 */
export type * from "./documents.js";
export type * from "./retrieval.js";
export type * from "./sources.js";
export type * from "./ports.js";
export * from "./retrieval.schema.js";
