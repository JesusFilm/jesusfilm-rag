/**
 * Postgres-backed RawDocumentReader — the read side of the `raw_documents`
 * staging table (the write side is PostgresRawDocumentStore). Ingestion drains
 * the un-ingested rows (`ingested_at IS NULL`, oldest first) and marks them
 * consumed once written to the corpus. See docs/architecture.md §4 / §6.
 *
 * Drizzle's query builder over src/db/schema.ts (ADR-0003).
 */
import { and, asc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  PendingRawDocument,
  RawDocumentReader,
} from "@/contracts/index.js";
import { rawDocuments } from "@/db/schema.js";

/**
 * Normalize a timestamptz read to ISO-8601 (the ports speak ISO). Drizzle hands
 * back a Date for a timestamp column; guard the string case defensively.
 */
const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export class PostgresRawDocumentReader implements RawDocumentReader {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listPending(
    opts: { sourceKey?: string; limit?: number; includeIngested?: boolean } = {},
  ): Promise<PendingRawDocument[]> {
    const { sourceKey, limit, includeIngested } = opts;
    const conds: SQL[] = [];
    if (!includeIngested) conds.push(isNull(rawDocuments.ingestedAt));
    if (sourceKey) conds.push(eq(rawDocuments.sourceKey, sourceKey));

    const query = this.db
      .select({
        id: rawDocuments.id,
        sourceKey: rawDocuments.sourceKey,
        url: rawDocuments.url,
        canonicalUrl: rawDocuments.canonicalUrl,
        title: rawDocuments.title,
        rawContent: rawDocuments.rawContent,
        status: rawDocuments.status,
        bodyHash: rawDocuments.bodyHash,
        etag: rawDocuments.etag,
        lastModified: rawDocuments.lastModified,
        fetchedAt: rawDocuments.fetchedAt,
        notModified: rawDocuments.notModified,
      })
      .from(rawDocuments)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(rawDocuments.fetchedAt), asc(rawDocuments.id));

    const rows = await (limit != null ? query.limit(limit) : query);
    return rows.map((r) => ({
      id: r.id,
      sourceKey: r.sourceKey,
      url: r.url,
      canonicalUrl: r.canonicalUrl,
      title: r.title,
      rawContent: r.rawContent,
      fetch: {
        status: r.status,
        bodyHash: r.bodyHash ?? "",
        etag: r.etag,
        lastModified: r.lastModified,
        fetchedAt: iso(r.fetchedAt),
        notModified: r.notModified,
      },
    }));
  }

  async markIngested(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(rawDocuments)
      .set({ ingestedAt: sql`now()` })
      .where(inArray(rawDocuments.id, ids));
  }
}
