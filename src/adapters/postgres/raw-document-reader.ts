/**
 * Postgres-backed RawDocumentReader — the read side of the `raw_documents`
 * staging table (the write side is PostgresRawDocumentStore). Ingestion drains
 * the un-ingested rows (`ingested_at IS NULL`, oldest first) and marks them
 * consumed once written to the corpus. See docs/architecture.md §4 / §6.
 *
 * Raw SQL over the injected postgres-js client — the import law forbids adapters
 * from importing the Drizzle schema (src/db), so the table/column names are the
 * adapter's contract with the migration.
 */
import type postgres from "postgres";
import type {
  PendingRawDocument,
  RawDocumentReader,
} from "@/contracts/index.js";

interface PendingRow {
  id: string;
  source_key: string;
  url: string;
  canonical_url: string;
  title: string | null;
  raw_content: string;
  status: number | null;
  body_hash: string;
  etag: string | null;
  last_modified: string | null;
  fetched_at: Date | string;
  not_modified: boolean;
}

/**
 * Normalize a fetched_at value to ISO-8601 (the ports speak ISO). postgres-js
 * may hand back a Date or the raw Postgres timestamptz text
 * (`2026-05-22 00:00:00+00`); both round-trip through Date.
 */
const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();

export class PostgresRawDocumentReader implements RawDocumentReader {
  constructor(private readonly sql: postgres.Sql) {}

  async listPending(
    opts: { sourceKey?: string; limit?: number; includeIngested?: boolean } = {},
  ): Promise<PendingRawDocument[]> {
    const { sourceKey, limit, includeIngested } = opts;
    const rows = await this.sql<PendingRow[]>`
      SELECT id, source_key, url, canonical_url, title, raw_content,
             status, body_hash, etag, last_modified, fetched_at, not_modified
        FROM raw_documents
       WHERE ${includeIngested ? this.sql`TRUE` : this.sql`ingested_at IS NULL`}
         ${sourceKey ? this.sql`AND source_key = ${sourceKey}` : this.sql``}
       ORDER BY fetched_at ASC, id ASC
       ${limit != null ? this.sql`LIMIT ${limit}` : this.sql``}
    `;
    return rows.map((r) => ({
      id: r.id,
      sourceKey: r.source_key,
      url: r.url,
      canonicalUrl: r.canonical_url,
      title: r.title,
      rawContent: r.raw_content,
      fetch: {
        status: r.status,
        bodyHash: r.body_hash,
        etag: r.etag,
        lastModified: r.last_modified,
        fetchedAt: iso(r.fetched_at),
        notModified: r.not_modified,
      },
    }));
  }

  async markIngested(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.sql`
      UPDATE raw_documents
         SET ingested_at = now()
       WHERE id = ANY(${ids}::uuid[])
    `;
  }
}
