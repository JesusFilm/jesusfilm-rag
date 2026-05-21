/**
 * Indexer CLI — STUBBED during the jesusfilm-ai port (build step 1).
 *
 *   pnpm index
 *
 * The previous corpus-walking, chunk + embed + upsert pipeline was written
 * against the prior schema and seed corpus, both removed in build step 1.
 * The new pipeline is the "Ingestion" context: consume `raw_documents`
 * (emitted by Acquisition), normalize → chunk → embed → idempotent
 * `replaceDocument` via the CorpusWriteStore port. See docs/architecture.md
 * §3 (Ingestion) and §9 build sequence.
 *
 * TODO(step-2): implement CorpusWriteStore over Postgres (new §5 schema).
 * TODO(step-4): implement Ingestion (normalize/chunk/embed/dedup) and re-point
 *               this CLI at the raw_documents staging table.
 *
 * Kept as a compiling no-op so the bare skeleton typechecks and `pnpm index`
 * does not silently run against a half-migrated schema.
 */

import "@/env.js";

async function main(): Promise<void> {
  console.error(
    "index: not implemented — the Ingestion pipeline is rebuilt in port build steps 2 & 4. See scripts/index.ts header.",
  );
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error("index failed:", err);
  process.exit(1);
});
