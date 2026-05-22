/**
 * Postgres adapter — concrete implementations of the storage ports
 * (CorpusWriteStore, CorpusSearchStore, FetchStateStore) over the schema in
 * src/db/schema.ts. Constructed only by src/main.ts. See docs/architecture.md §4.
 */
export { PostgresCorpusWriteStore } from "./corpus-write-store.js";
export { PostgresCorpusSearchStore } from "./corpus-search-store.js";
export { PostgresFetchStateStore } from "./fetch-state-store.js";
export { PostgresRawDocumentStore } from "./raw-document-store.js";
export { EMBEDDING_DIMENSIONS, toVectorLiteral } from "./vector.js";
