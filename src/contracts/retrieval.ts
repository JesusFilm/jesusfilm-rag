/**
 * Retrieval seam: the query + policy in, ranked cited results out.
 * Types only. See docs/architecture.md §2.
 *
 * The PUBLISHED, caller-facing shapes — `RetrievalPolicy` (request) and
 * `RankedResult` (response) — are defined ONCE as Zod schemas in
 * ./retrieval.schema.ts (the versioned contract). They're imported here only
 * for the `Retriever` signature below; the contracts barrel re-exports them
 * from the schema module (this file does not). The engine-internal shapes
 * (`SearchFilter`, `ScoredRow`) stay plain types — they never cross the seam.
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
  documentId: string; // the parent document — keys full-document reassembly (issue #79)
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
