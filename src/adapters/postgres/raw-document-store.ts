/**
 * Postgres-backed RawDocumentStore — the writer of the `raw_documents` staging
 * table (Acquisition → Ingestion handoff + reproducible raw snapshot).
 * See docs/architecture.md §4 / §6.
 *
 * putRawDocument is idempotent per (source_key, canonical_url): inside one
 * transaction it deletes any not-yet-ingested row for the same identity, then
 * inserts the fresh capture. Already-ingested rows (ingested_at IS NOT NULL) are
 * left untouched — they are the historical snapshot Ingestion has consumed — so
 * re-acquiring leaves at most one pending row per page for Ingestion to drain.
 *
 * Raw SQL over the injected postgres-js client — the import law forbids adapters
 * from importing the Drizzle schema (src/db), so the table/column names below
 * are the adapter's contract with the migration, not a typed reference.
 */
import type postgres from "postgres";
import type { RawDocument, RawDocumentStore } from "@/contracts/index.js";

export class PostgresRawDocumentStore implements RawDocumentStore {
  constructor(private readonly sql: postgres.Sql) {}

  async putRawDocument(doc: RawDocument): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`
        DELETE FROM raw_documents
         WHERE source_key = ${doc.sourceKey}
           AND canonical_url = ${doc.canonicalUrl}
           AND ingested_at IS NULL
      `;
      await tx`
        INSERT INTO raw_documents
          (source_key, url, canonical_url, title, raw_content, status,
           body_hash, etag, last_modified, fetched_at, not_modified)
        VALUES (
          ${doc.sourceKey}, ${doc.url}, ${doc.canonicalUrl}, ${doc.title},
          ${doc.rawContent}, ${doc.fetch.status}, ${doc.fetch.bodyHash},
          ${doc.fetch.etag}, ${doc.fetch.lastModified},
          ${doc.fetch.fetchedAt}::timestamptz, ${doc.fetch.notModified}
        )
      `;
    });
  }
}
