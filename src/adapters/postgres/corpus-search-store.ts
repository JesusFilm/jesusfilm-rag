/**
 * Postgres-backed CorpusSearchStore — candidate selection for Retrieval.
 * See docs/architecture.md §4. The store returns the top-k candidates ordered
 * by cosine score; the minScore cutoff and 3-key dedup are Retrieval's job
 * (architecture §2, invariant 5), not the store's.
 *
 * Joins/filters run through Drizzle's query builder over src/db/schema.ts
 * (ADR-0003). The two hot paths no ORM can type stay as `sql`…`` fragments
 * interleaved in the builder: the pgvector `<=>` distance and the FTS
 * `ts_rank_cd` / `websearch_to_tsquery` over the generated `search_tsv` column
 * (added by scripts/migrate.ts, so it is not in the Drizzle schema). Single
 * embedding model today, so no model filter — a multi-model corpus would scope
 * by embedding_model here ("add a new model row, then migrate").
 */
import { and, desc, eq, inArray, like, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  CorpusSearchStore,
  ScoredRow,
  SearchFilter,
} from "@/contracts/index.js";
import { chunkEmbeddings, chunks, documents, sources } from "@/db/schema.js";
import { assertQueryDimensions, toVectorLiteral } from "./vector.js";

/**
 * The non-score columns of a ScoredRow, named so the builder result maps to the
 * port shape directly (no snake→camel pass). Each query adds its own `score`.
 */
const scoredColumns = {
  chunkId: chunks.id,
  text: chunks.text,
  ord: chunks.ord,
  tags: chunks.tags,
  sourceKey: sources.key,
  sourceName: sources.name,
  title: documents.title,
  canonicalUrl: documents.canonicalUrl,
  contentHash: documents.contentHash,
};

export class PostgresCorpusSearchStore implements CorpusSearchStore {
  constructor(private readonly db: PostgresJsDatabase) {}

  /** AND-combined candidate filter (undefined = no filter). */
  private buildWhere(filter: SearchFilter): SQL | undefined {
    const conds: SQL[] = [];
    if (filter.allowedSourceKeys !== undefined) {
      // Empty allow-list = no visible sources (architecture §6 dropped the
      // legacy `OR source_key IS NULL` branch — every chunk has a source).
      conds.push(
        filter.allowedSourceKeys.length === 0
          ? sql`false`
          : inArray(sources.key, filter.allowedSourceKeys),
      );
    }
    if (filter.sourceKey) conds.push(eq(sources.key, filter.sourceKey));
    if (filter.domain) conds.push(eq(sources.domain, filter.domain));
    if (filter.urlPrefix) {
      conds.push(like(documents.canonicalUrl, `${filter.urlPrefix}%`));
    }
    if (filter.language) conds.push(eq(documents.language, filter.language));
    if (filter.category) conds.push(eq(documents.category, filter.category));
    return conds.length ? and(...conds) : undefined;
  }

  async vectorSearch(
    queryVec: number[],
    filter: SearchFilter,
    k: number,
  ): Promise<ScoredRow[]> {
    assertQueryDimensions(queryVec);
    const lit = toVectorLiteral(queryVec);
    const distance = sql`${chunkEmbeddings.embedding} <=> ${lit}::halfvec`;
    return this.db
      .select({ ...scoredColumns, score: sql<number>`1 - (${distance})` })
      .from(chunkEmbeddings)
      .innerJoin(chunks, eq(chunks.id, chunkEmbeddings.chunkId))
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .innerJoin(sources, eq(sources.id, chunks.sourceId))
      .where(this.buildWhere(filter))
      .orderBy(distance)
      .limit(k);
  }

  async keywordSearch(
    query: string,
    filter: SearchFilter,
    k: number,
  ): Promise<ScoredRow[]> {
    // FTS over the generated `search_tsv` column. score is a raw ts_rank_cd, NOT
    // a 0..1 cosine — Retrieval fuses the two (RRF) in FOLLOW-UP B; it is not
    // directly comparable to vectorSearch.
    const rank = sql<number>`ts_rank_cd(chunks.search_tsv, websearch_to_tsquery('english', ${query}))`;
    const matches = sql`chunks.search_tsv @@ websearch_to_tsquery('english', ${query})`;
    const where = this.buildWhere(filter);
    return this.db
      .select({ ...scoredColumns, score: rank })
      .from(chunks)
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .innerJoin(sources, eq(sources.id, chunks.sourceId))
      .where(where ? and(where, matches) : matches)
      .orderBy(desc(rank))
      .limit(k);
  }

  async fetchById(chunkId: string): Promise<ScoredRow | null> {
    const [row] = await this.db
      .select({ ...scoredColumns, score: sql<number>`1` })
      .from(chunks)
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .innerJoin(sources, eq(sources.id, chunks.sourceId))
      .where(eq(chunks.id, chunkId));
    return row ?? null;
  }

  /**
   * Distinct embedding models in the corpus (uses the `chunk_embeddings_model_idx`
   * index). Retrieval's query/corpus model-match guard reads this; see
   * docs/ops/prod-reembed.md.
   */
  async embeddingModels(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ model: chunkEmbeddings.embeddingModel })
      .from(chunkEmbeddings);
    return rows.map((r) => r.model);
  }
}
