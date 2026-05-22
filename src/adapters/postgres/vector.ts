/**
 * Vector-literal helpers shared by the Postgres write/search stores.
 *
 * Embeddings are stored as `halfvec(1536)` (docs/architecture.md decision 1).
 * pgvector parses its text representation `[v1,v2,...]`, so both the query
 * vector and the per-chunk vectors are interpolated as a text parameter and
 * cast with `::halfvec` at the call site.
 */

/**
 * Physical embedding width of the `chunk_embeddings.embedding` column. Mirrors
 * EMBEDDING_DIMS in src/db/schema.ts — the adapter cannot import the Drizzle
 * schema (the import law forbids adapters → src/db), so the value is restated
 * here as the adapter's knowledge of its own column. A model swap to a new
 * width is a migration, not an edit (see schema.ts / decision 1).
 */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Render an embedding as a pgvector text literal (`[v1,v2,...]`). Throws on an
 * empty or non-finite vector — a malformed embedding must fail loudly rather
 * than persist or query a garbage row.
 */
export function toVectorLiteral(vec: readonly number[]): string {
  if (vec.length === 0) throw new Error("embedding vector is empty");
  let out = "[";
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    if (!Number.isFinite(v)) {
      throw new Error(`embedding contains a non-finite value at index ${i}`);
    }
    out += i === 0 ? v : `,${v}`;
  }
  return `${out}]`;
}

/** Guard a query vector against the column width before hitting the database. */
export function assertQueryDimensions(vec: readonly number[]): void {
  if (vec.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `query vector has ${vec.length} dims; expected ${EMBEDDING_DIMENSIONS} ` +
        `(chunk_embeddings.embedding is halfvec(${EMBEDDING_DIMENSIONS}))`,
    );
  }
}
