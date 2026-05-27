/**
 * Postgres-backed CorpusWriteStore — the only writer of the corpus tables
 * (sources / documents / chunks / chunk_embeddings). See docs/architecture.md §4.
 *
 * The load-bearing invariant (architecture §2, invariant 3): re-indexing a
 * document is delete-then-insert in ONE transaction. `replaceDocument` upserts
 * the document row, deletes its existing chunks (embeddings cascade via the
 * chunk_embeddings → chunks FK), then inserts the new chunk set. Skipping the
 * delete double-indexes the document.
 *
 * CRUD runs through Drizzle's query builder over the schema in src/db/schema.ts
 * (ADR-0003 — one tool for schema + queries). The pgvector embedding literal is
 * the only raw fragment: no ORM types `halfvec`, so it stays a `sql`…`` cast.
 */
import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CorpusWriteStore,
  DedupRecord,
  EmbeddedChunk,
  NormalizedDocument,
  SourceRecord,
} from "@/contracts/index.js";
import {
  chunkEmbeddings,
  chunks,
  documents,
  sources,
} from "@/db/schema.js";
import { toVectorLiteral } from "./vector.js";

export class PostgresCorpusWriteStore implements CorpusWriteStore {
  constructor(private readonly db: PostgresJsDatabase) {}

  async upsertSource(source: SourceRecord): Promise<string> {
    // The mutable columns are identical on insert and on conflict (a single-row
    // upsert), so the same object drives `set` — no `excluded.*` indirection.
    const mutable = {
      name: source.name,
      domain: source.domain,
      trust: source.trust,
      ingestionMode: source.ingestionMode,
      languages: source.languages,
      defaultTags: source.defaultTags,
      defaultCategory: source.defaultCategory,
      rights: source.rights,
      contentHash: source.contentHash,
      updatedAt: sql`now()`,
    };
    const [row] = await this.db
      .insert(sources)
      .values({ key: source.key, ...mutable })
      .onConflictDoUpdate({ target: sources.key, set: mutable })
      .returning({ id: sources.id });
    return row.id;
  }

  async getDedup(
    sourceKey: string,
    canonicalUrl: string,
  ): Promise<DedupRecord | null> {
    const [row] = await this.db
      .select({ contentHash: documents.contentHash })
      .from(documents)
      .innerJoin(sources, eq(sources.id, documents.sourceId))
      .where(
        and(
          eq(sources.key, sourceKey),
          eq(documents.canonicalUrl, canonicalUrl),
        ),
      );
    return row ? { contentHash: row.contentHash } : null;
  }

  async replaceDocument(
    doc: NormalizedDocument,
    embedded: EmbeddedChunk[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [src] = await tx
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.key, doc.sourceKey));
      if (!src) {
        throw new Error(
          `replaceDocument: unknown source key '${doc.sourceKey}' — call upsertSource first`,
        );
      }

      // Upsert the document row first so we have its id; canonical_url is the
      // dedup identity (unique per source). NormalizedDocument carries only the
      // canonical URL at this seam, so `url` mirrors it.
      const docMutable = {
        url: doc.canonicalUrl,
        title: doc.title,
        language: doc.language,
        category: doc.category,
        contentHash: doc.contentHash,
        chunkCount: embedded.length,
        lastSeen: sql`now()`,
        indexedAt: sql`now()`,
      };
      const [documentRow] = await tx
        .insert(documents)
        .values({
          sourceId: src.id,
          canonicalUrl: doc.canonicalUrl,
          ...docMutable,
        })
        .onConflictDoUpdate({
          target: [documents.sourceId, documents.canonicalUrl],
          set: docMutable,
        })
        .returning({ id: documents.id });

      // Delete-then-insert: drop stale chunks (embeddings cascade) before
      // inserting the fresh set, all inside this transaction.
      await tx.delete(chunks).where(eq(chunks.documentId, documentRow.id));

      for (const c of embedded) {
        const [chunkRow] = await tx
          .insert(chunks)
          .values({
            documentId: documentRow.id,
            sourceId: src.id,
            ord: c.ord,
            text: c.text,
            charStart: c.charStart,
            charEnd: c.charEnd,
            tokenCount: c.tokenCount,
            tags: c.tags,
          })
          .returning({ id: chunks.id });
        await tx.insert(chunkEmbeddings).values({
          chunkId: chunkRow.id,
          // halfvec has no ORM type — bind the literal and cast (ADR-0003).
          embedding: sql`${toVectorLiteral(c.embedding)}::halfvec`,
          embeddingModel: c.embeddingModel,
        });
      }
    });
  }
}
