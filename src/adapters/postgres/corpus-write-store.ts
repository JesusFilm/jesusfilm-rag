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
 * Raw SQL over the injected postgres-js client — the import law forbids adapters
 * from importing the Drizzle schema (src/db).
 */
import type postgres from "postgres";
import type {
  CorpusWriteStore,
  DedupRecord,
  EmbeddedChunk,
  NormalizedDocument,
  SourceRecord,
} from "@/contracts/index.js";
import { toVectorLiteral } from "./vector.js";

type IdRow = { id: string };

export class PostgresCorpusWriteStore implements CorpusWriteStore {
  constructor(private readonly sql: postgres.Sql) {}

  async upsertSource(source: SourceRecord): Promise<string> {
    const rows = await this.sql<IdRow[]>`
      INSERT INTO sources
        (key, name, domain, trust, ingestion_mode, languages, default_tags,
         default_category, rights, content_hash, updated_at)
      VALUES (
        ${source.key}, ${source.name}, ${source.domain}, ${source.trust},
        ${source.ingestionMode}, ${JSON.stringify(source.languages)}::jsonb,
        ${JSON.stringify(source.defaultTags)}::jsonb, ${source.defaultCategory},
        ${source.rights}, ${source.contentHash}, now()
      )
      ON CONFLICT (key) DO UPDATE SET
        name             = EXCLUDED.name,
        domain           = EXCLUDED.domain,
        trust            = EXCLUDED.trust,
        ingestion_mode   = EXCLUDED.ingestion_mode,
        languages        = EXCLUDED.languages,
        default_tags     = EXCLUDED.default_tags,
        default_category = EXCLUDED.default_category,
        rights           = EXCLUDED.rights,
        content_hash     = EXCLUDED.content_hash,
        updated_at       = now()
      RETURNING id
    `;
    return rows[0].id;
  }

  async getDedup(
    sourceKey: string,
    canonicalUrl: string,
  ): Promise<DedupRecord | null> {
    const rows = await this.sql<{ content_hash: string }[]>`
      SELECT d.content_hash
        FROM documents d
        JOIN sources s ON s.id = d.source_id
       WHERE s.key = ${sourceKey} AND d.canonical_url = ${canonicalUrl}
    `;
    const row = rows[0];
    return row ? { contentHash: row.content_hash } : null;
  }

  async replaceDocument(
    doc: NormalizedDocument,
    chunks: EmbeddedChunk[],
  ): Promise<void> {
    await this.sql.begin(async (tx) => {
      const sources = await tx<IdRow[]>`
        SELECT id FROM sources WHERE key = ${doc.sourceKey}
      `;
      const sourceId = sources[0]?.id;
      if (!sourceId) {
        throw new Error(
          `replaceDocument: unknown source key '${doc.sourceKey}' — call upsertSource first`,
        );
      }

      // Upsert the document row first so we have its id; canonical_url is the
      // dedup identity (unique per source). NormalizedDocument carries only the
      // canonical URL at this seam, so `url` mirrors it.
      const docs = await tx<IdRow[]>`
        INSERT INTO documents
          (source_id, canonical_url, url, title, language, category,
           content_hash, chunk_count, last_seen, indexed_at)
        VALUES (
          ${sourceId}, ${doc.canonicalUrl}, ${doc.canonicalUrl}, ${doc.title},
          ${doc.language}, ${doc.category}, ${doc.contentHash}, ${chunks.length},
          now(), now()
        )
        ON CONFLICT (source_id, canonical_url) DO UPDATE SET
          url          = EXCLUDED.url,
          title        = EXCLUDED.title,
          language     = EXCLUDED.language,
          category     = EXCLUDED.category,
          content_hash = EXCLUDED.content_hash,
          chunk_count  = EXCLUDED.chunk_count,
          last_seen    = now(),
          indexed_at   = now()
        RETURNING id
      `;
      const documentId = docs[0].id;

      // Delete-then-insert: drop stale chunks (embeddings cascade) before
      // inserting the fresh set, all inside this transaction.
      await tx`DELETE FROM chunks WHERE document_id = ${documentId}::uuid`;

      for (const c of chunks) {
        const inserted = await tx<IdRow[]>`
          INSERT INTO chunks
            (document_id, source_id, ord, text, char_start, char_end,
             token_count, tags)
          VALUES (
            ${documentId}, ${sourceId}, ${c.ord}, ${c.text}, ${c.charStart},
            ${c.charEnd}, ${c.tokenCount}, ${JSON.stringify(c.tags)}::jsonb
          )
          RETURNING id
        `;
        await tx`
          INSERT INTO chunk_embeddings (chunk_id, embedding, embedding_model)
          VALUES (
            ${inserted[0].id}, ${toVectorLiteral(c.embedding)}::halfvec,
            ${c.embeddingModel}
          )
        `;
      }
    });
  }
}
