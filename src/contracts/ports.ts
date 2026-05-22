/**
 * The ports each context depends on. Concrete implementations live in
 * src/adapters and are wired in src/main.ts — never imported by a context.
 * Types only. See docs/architecture.md §4.
 */
import type {
  RawDocument,
  PendingRawDocument,
  NormalizedDocument,
  EmbeddedChunk,
} from "./documents.js";
import type { SourceRecord } from "./sources.js";
import type { ScoredRow, SearchFilter } from "./retrieval.js";

// ---- Acquisition ports -----------------------------------------------------

export interface ConditionalHeaders {
  ifNoneMatch?: string;
  ifModifiedSince?: string;
}

export interface FetchResult {
  status: number | null;
  body: string | null; // null on 304 / not-modified
  etag: string | null;
  lastModified: string | null;
  notModified: boolean;
}

export interface Fetcher {
  fetch(url: string, conditional?: ConditionalHeaders): Promise<FetchResult>;
}

export interface HttpCacheEntry {
  url: string;
  etag: string | null;
  lastModified: string | null;
  bodyHash: string;
  status: number | null;
  fetchedAt: string;
}

export interface RobotsEntry {
  robotsUrl: string;
  body: string | null;
  status: number | null;
  fetchedAt: string;
}

export interface FetchStateStore {
  getHttpCache(url: string): Promise<HttpCacheEntry | null>;
  putHttpCache(entry: HttpCacheEntry): Promise<void>;
  getRobots(robotsUrl: string): Promise<RobotsEntry | null>;
  putRobots(entry: RobotsEntry): Promise<void>;
}

export interface RawDocumentStore {
  /**
   * Persist one acquired RawDocument to the `raw_documents` staging table.
   * Idempotent per (sourceKey, canonicalUrl): replaces any not-yet-ingested row
   * for the same identity, so re-acquiring a page never accumulates duplicate
   * un-ingested rows. Already-ingested rows are left intact as the raw snapshot.
   */
  putRawDocument(doc: RawDocument): Promise<void>;
}

// ---- Ingestion ports -------------------------------------------------------

export interface RawDocumentReader {
  /**
   * Staging rows to ingest, oldest first. By default only un-ingested rows
   * (`ingested_at IS NULL`); `includeIngested` returns already-consumed rows too
   * (a full re-index from the raw snapshot, e.g. after an embedding-model change).
   * Optional source/limit scope. The read side of the Acquisition→Ingestion
   * handoff — the write side is RawDocumentStore.
   */
  listPending(opts?: {
    sourceKey?: string;
    limit?: number;
    includeIngested?: boolean;
  }): Promise<PendingRawDocument[]>;
  /** Mark these `raw_documents` rows consumed (set `ingested_at`). */
  markIngested(ids: string[]): Promise<void>;
}

export interface Embedder {
  /** Batch embed; returns null per empty/failed input (the skip path relies on this). */
  embed(texts: string[]): Promise<(number[] | null)[]>;
  embedQuery(text: string): Promise<number[]>;
  readonly model: string;
  readonly dimensions: number;
}

export interface DedupRecord {
  contentHash: string;
}

export interface CorpusWriteStore {
  upsertSource(source: SourceRecord): Promise<string>; // returns source id
  getDedup(
    sourceKey: string,
    canonicalUrl: string,
  ): Promise<DedupRecord | null>;
  /** Delete this document's chunks then insert the new ones, in one transaction. */
  replaceDocument(
    doc: NormalizedDocument,
    chunks: EmbeddedChunk[],
  ): Promise<void>;
}

// ---- Retrieval port --------------------------------------------------------

export interface CorpusSearchStore {
  vectorSearch(
    queryVec: number[],
    filter: SearchFilter,
    k: number,
  ): Promise<ScoredRow[]>;
  keywordSearch?(
    query: string,
    filter: SearchFilter,
    k: number,
  ): Promise<ScoredRow[]>;
  fetchById(chunkId: string): Promise<ScoredRow | null>;
}
