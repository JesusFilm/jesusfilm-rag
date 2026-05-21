/**
 * Retrieval seam: the query + policy in, ranked cited results out.
 * Types only. See docs/architecture.md §2.
 */
import type { Citation } from "./documents.js";

/** What the caller (a Mastra agent, NextSteps, the monorepo) hands to Retrieval. */
export interface RetrievalPolicy {
  allowedSourceKeys?: string[]; // tenant/visibility scope (undefined = all)
  preferSourceKey?: string;
  language?: string;
  category?: string;
  topK?: number; // default 5
  minScore?: number; // default 0.3 (ported verbatim; see docs/architecture.md FOLLOW-UP A)
}

/** A ranked, cited result returned to the caller. */
export interface RankedResult {
  chunkId: string;
  score: number; // cosine 0..1
  text: string;
  ord: number;
  tags: string[];
  citation: Citation;
}

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
