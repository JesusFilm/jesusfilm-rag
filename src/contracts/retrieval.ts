/**
 * Retrieval seam: the query + policy in, ranked cited results out.
 * Types only. See docs/architecture.md §2.
 *
 * The PUBLISHED, caller-facing shapes — `RetrievalPolicy` (request) and
 * `RankedResult` (response) — are defined ONCE as Zod schemas in
 * ./retrieval.schema.ts (the versioned contract) and re-exported here so the
 * retrieval engine keeps importing them from the same place. The
 * engine-internal shapes (`SearchFilter`, `ScoredRow`) stay plain types — they
 * never cross the published seam.
 */
import type { RetrievalPolicy, RankedResult } from "./retrieval.schema.js";

/** Filter the search store applies during candidate selection. */
export interface SearchFilter {
  allowedSourceKeys?: string[];
  sourceKey?: string;
  domain?: string;
  urlPrefix?: string;
  language?: string;
  category?: string;
}

/** A raw scored row from the search store, pre dedup + citation assembly. */
export interface ScoredRow {
  chunkId: string;
  score: number;
  text: string;
  ord: number;
  tags: string[];
  sourceKey: string;
  sourceName: string;
  title: string | null;
  canonicalUrl: string;
  contentHash: string; // used by the 3-key dedup
}

/** The Retrieval context's public surface. Transport-agnostic. */
export interface Retriever {
  search(query: string, policy?: RetrievalPolicy): Promise<RankedResult[]>;
}
