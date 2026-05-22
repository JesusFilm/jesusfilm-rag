/**
 * Postgres-backed CorpusSearchStore — candidate selection for Retrieval.
 * See docs/architecture.md §4. The store returns the top-k candidates ordered
 * by cosine score; the minScore cutoff and 3-key dedup are Retrieval's job
 * (architecture §2, invariant 5), not the store's.
 *
 * Raw SQL over the injected postgres-js client (the import law forbids adapters
 * from importing the Drizzle schema). Single embedding model today, so no
 * model filter — a multi-model corpus would scope by embedding_model here
 * (schema note: "add a new model row, then migrate").
 */
import type postgres from "postgres";
import type {
  CorpusSearchStore,
  ScoredRow,
  SearchFilter,
} from "@/contracts/index.js";
import { assertQueryDimensions, toVectorLiteral } from "./vector.js";

type SearchRow = {
  chunk_id: string;
  text: string;
  ord: number;
  tags: string[];
  source_key: string;
  source_name: string;
  title: string | null;
  canonical_url: string;
  content_hash: string;
  score: number;
};

function toScoredRow(row: SearchRow): ScoredRow {
  return {
    chunkId: row.chunk_id,
    score: row.score,
    text: row.text,
    ord: row.ord,
    tags: row.tags,
    sourceKey: row.source_key,
    sourceName: row.source_name,
    title: row.title,
    canonicalUrl: row.canonical_url,
    contentHash: row.content_hash,
  };
}

export class PostgresCorpusSearchStore implements CorpusSearchStore {
  constructor(private readonly sql: postgres.Sql) {}

  /** AND-combined WHERE fragment for the candidate filter (TRUE when empty). */
  private where(filter: SearchFilter): postgres.Fragment {
    const sql = this.sql;
    const conds: postgres.Fragment[] = [];
    if (filter.allowedSourceKeys !== undefined) {
      // Empty allow-list = no visible sources (architecture §6 dropped the
      // legacy `OR source_key IS NULL` branch — every chunk has a source).
      conds.push(
        filter.allowedSourceKeys.length === 0
          ? sql`1 = 0`
          : sql`s.key IN ${sql(filter.allowedSourceKeys)}`,
      );
    }
    if (filter.sourceKey) conds.push(sql`s.key = ${filter.sourceKey}`);
    if (filter.domain) conds.push(sql`s.domain = ${filter.domain}`);
    if (filter.urlPrefix) {
      conds.push(sql`d.canonical_url LIKE ${filter.urlPrefix + "%"}`);
    }
    if (filter.language) conds.push(sql`d.language = ${filter.language}`);
    if (filter.category) conds.push(sql`d.category = ${filter.category}`);
    if (conds.length === 0) return sql`TRUE`;
    return conds.reduce((acc, c) => sql`${acc} AND ${c}`);
  }

  async vectorSearch(
    queryVec: number[],
    filter: SearchFilter,
    k: number,
  ): Promise<ScoredRow[]> {
    assertQueryDimensions(queryVec);
    const lit = toVectorLiteral(queryVec);
    const where = this.where(filter);
    const rows = await this.sql<SearchRow[]>`
      SELECT c.id AS chunk_id, c.text, c.ord, c.tags,
             s.key AS source_key, s.name AS source_name,
             d.title, d.canonical_url, d.content_hash,
             (1 - (e.embedding <=> ${lit}::halfvec)) AS score
        FROM chunk_embeddings e
        JOIN chunks c    ON c.id = e.chunk_id
        JOIN documents d ON d.id = c.document_id
        JOIN sources s   ON s.id = c.source_id
       WHERE ${where}
       ORDER BY e.embedding <=> ${lit}::halfvec
       LIMIT ${k}
    `;
    return rows.map(toScoredRow);
  }

  async keywordSearch(
    query: string,
    filter: SearchFilter,
    k: number,
  ): Promise<ScoredRow[]> {
    // FTS over the generated `search_tsv` column (added by scripts/migrate.ts).
    // score is a raw ts_rank_cd, NOT a 0..1 cosine — Retrieval fuses the two
    // (RRF) in FOLLOW-UP B; it is not directly comparable to vectorSearch.
    const where = this.where(filter);
    const rows = await this.sql<SearchRow[]>`
      SELECT c.id AS chunk_id, c.text, c.ord, c.tags,
             s.key AS source_key, s.name AS source_name,
             d.title, d.canonical_url, d.content_hash,
             ts_rank_cd(c.search_tsv, websearch_to_tsquery('english', ${query})) AS score
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        JOIN sources s   ON s.id = c.source_id
       WHERE ${where}
         AND c.search_tsv @@ websearch_to_tsquery('english', ${query})
       ORDER BY score DESC
       LIMIT ${k}
    `;
    return rows.map(toScoredRow);
  }

  async fetchById(chunkId: string): Promise<ScoredRow | null> {
    const rows = await this.sql<SearchRow[]>`
      SELECT c.id AS chunk_id, c.text, c.ord, c.tags,
             s.key AS source_key, s.name AS source_name,
             d.title, d.canonical_url, d.content_hash,
             1 AS score
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        JOIN sources s   ON s.id = c.source_id
       WHERE c.id = ${chunkId}::uuid
    `;
    const row = rows[0];
    return row ? toScoredRow(row) : null;
  }
}
