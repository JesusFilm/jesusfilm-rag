import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  jsonb,
  index,
  uniqueIndex,
  halfvec,
} from "drizzle-orm/pg-core";

// jesusfilm-ai / Forge parity: openai/text-embedding-3-small at 1536 dims,
// stored as halfvec (fp16). 1536 is well under pgvector's full-precision
// `vector` HNSW cap (2000), so plain `vector(1536)` would also work; we keep
// halfvec for storage efficiency and forward-compat with larger models.
// See docs/architecture.md (decision 1: embedding model).
export const EMBEDDING_DIMS = 1536;

/**
 * One row per registered source (e.g. 'cru-org'). `content_hash` provides
 * source-level idempotency (skip reindex when a source is unchanged). `key` is the stable
 * registry identifier used by the SourceRegistry and visibility filtering.
 */
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    domain: text("domain"),
    trust: text("trust"),
    ingestionMode: text("ingestion_mode"),
    languages: jsonb("languages").$type<string[]>().notNull().default([]),
    defaultTags: jsonb("default_tags").$type<string[]>().notNull().default([]),
    defaultCategory: text("default_category"),
    rights: text("rights"),
    contentHash: text("content_hash"),
    indexedAt: timestamp("indexed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("sources_key_uq").on(t.key)],
);

/**
 * One row per ingested document. `canonical_url` (registry-normalized) is the
 * dedup identity, unique per source. `content_hash` = sha256(`title\n\ncontent`)
 * is the chunk-dedup gate: a change here triggers delete-then-insert of this
 * document's chunks in a single transaction.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    canonicalUrl: text("canonical_url").notNull(),
    url: text("url"),
    title: text("title"),
    language: text("language"),
    category: text("category"),
    contentHash: text("content_hash").notNull(),
    chunkCount: integer("chunk_count").notNull().default(0),
    firstSeen: timestamp("first_seen", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true })
      .notNull()
      .defaultNow(),
    indexedAt: timestamp("indexed_at", { withTimezone: true }),
  },
  (t) => [
    index("documents_source_idx").on(t.sourceId),
    uniqueIndex("documents_source_canonical_url_uq").on(
      t.sourceId,
      t.canonicalUrl,
    ),
  ],
);

/**
 * Chunked text + denormalised tags (for fast GIN filter intersection on query)
 * and a denormalised source_id (for fast scope filtering without a join).
 * The FTS tsvector column + GIN index for optional keyword_search are added by
 * scripts/migrate.ts (Drizzle does not model GENERATED columns).
 */
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    ord: integer("ord").notNull(),
    text: text("text").notNull(),
    charStart: integer("char_start").notNull(),
    charEnd: integer("char_end").notNull(),
    tokenCount: integer("token_count").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chunks_source_idx").on(t.sourceId),
    index("chunks_document_idx").on(t.documentId),
    // Tag GIN index for filter intersection.
    index("chunks_tags_gin").using("gin", t.tags),
    // FTS index — see scripts/migrate.ts for the GENERATED tsvector + GIN.
  ],
);

/**
 * Separate table so model swaps insert new embedding rows alongside existing
 * ones — never silently rewrite. `embedding_model` is recorded per row.
 * See docs/architecture.md (decision 1: embedding model).
 */
export const chunkEmbeddings = pgTable(
  "chunk_embeddings",
  {
    chunkId: uuid("chunk_id")
      .primaryKey()
      .references(() => chunks.id, { onDelete: "cascade" }),
    embedding: halfvec("embedding", { dimensions: EMBEDDING_DIMS }).notNull(),
    embeddingModel: text("embedding_model").notNull(),
    embeddedAt: timestamp("embedded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chunk_embeddings_hnsw").using(
      "hnsw",
      t.embedding.op("halfvec_cosine_ops"),
    ),
    index("chunk_embeddings_model_idx").on(t.embeddingModel),
  ],
);

/**
 * HTTP conditional-fetch cache. Keyed by URL. `body_hash` (sha256 of the raw
 * response body) is the re-fetch gate in Acquisition — distinct from
 * documents.content_hash (the re-chunk gate in Ingestion). Never conflate them.
 */
export const httpCache = pgTable("http_cache", {
  url: text("url").primaryKey(),
  etag: text("etag"),
  lastModified: text("last_modified"),
  bodyHash: text("body_hash"),
  statusCode: integer("status_code"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * robots.txt cache. Keyed by the robots URL. Used by Acquisition's RFC-9309
 * longest-match, fail-open robots gate.
 */
export const robotsCache = pgTable("robots_cache", {
  robotsUrl: text("robots_url").primaryKey(),
  body: text("body"),
  statusCode: integer("status_code"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Acquisition → Ingestion staging table, also the reproducible raw snapshot.
 * Acquisition emits one row per fetched document; Ingestion consumes rows where
 * `ingested_at IS NULL`, normalizes, chunks, embeds, and writes the corpus
 * tables. `raw_content` is extracted main text (NOT cleaned/validated/tagged).
 */
export const rawDocuments = pgTable(
  "raw_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceKey: text("source_key").notNull(),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title"),
    rawContent: text("raw_content").notNull(),
    status: integer("status"),
    bodyHash: text("body_hash"),
    etag: text("etag"),
    lastModified: text("last_modified"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notModified: boolean("not_modified").notNull().default(false),
    // null until Ingestion consumes this row.
    ingestedAt: timestamp("ingested_at", { withTimezone: true }),
  },
  (t) => [
    index("raw_documents_source_key_idx").on(t.sourceKey),
    index("raw_documents_ingested_at_idx").on(t.ingestedAt),
  ],
);
