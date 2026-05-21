/**
 * Barrel for the contracts module — the dependency-free seam definitions every
 * other module depends on. Re-exports types only (verbatimModuleSyntax).
 */
export type * from "./documents.js";
export type * from "./retrieval.js";
export type * from "./sources.js";
export type * from "./ports.js";
