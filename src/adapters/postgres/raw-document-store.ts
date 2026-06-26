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
 * Drizzle's query builder over src/db/schema.ts (ADR-0003).
 */
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { RawDocument, RawDocumentStore } from "@/contracts/index.js";
import { rawDocuments } from "@/db/schema.js";

export class PostgresRawDocumentStore implements RawDocumentStore {
  constructor(private readonly db: PostgresJsDatabase) {}

  async putRawDocument(doc: RawDocument): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(rawDocuments)
        .where(
          and(
            eq(rawDocuments.sourceKey, doc.sourceKey),
            eq(rawDocuments.canonicalUrl, doc.canonicalUrl),
            isNull(rawDocuments.ingestedAt),
          ),
        );
      await tx.insert(rawDocuments).values({
        sourceKey: doc.sourceKey,
        url: doc.url,
        canonicalUrl: doc.canonicalUrl,
        title: doc.title,
        rawContent: doc.rawContent,
        status: doc.fetch.status,
        bodyHash: doc.fetch.bodyHash,
        etag: doc.fetch.etag,
        lastModified: doc.fetch.lastModified,
        fetchedAt: new Date(doc.fetch.fetchedAt),
        notModified: doc.fetch.notModified,
      });
    });
  }

  async listStagedCanonicalUrls(sourceKey: string): Promise<string[]> {
    // Every staged row for the source — ingested AND pending (no ingestedAt
    // filter): a resume must skip already-ingested pages too, not just pending
    // ones, so an English-already-acquired source isn't re-fetched.
    const rows = await this.db
      .select({ canonicalUrl: rawDocuments.canonicalUrl })
      .from(rawDocuments)
      .where(eq(rawDocuments.sourceKey, sourceKey));
    return [...new Set(rows.map((r) => r.canonicalUrl))];
  }
}
