/**
 * The PUBLISHED retrieval contract — the single source of truth for the
 * versioned serving surface (see docs/architecture.md §2, §3, and the
 * versioning policy in §3.1). These Zod schemas are the canonical shape:
 *
 *   - the serving adapter validates requests/responses against them,
 *   - the OpenAPI artifact (contracts/openapi.v1.json) is GENERATED from them,
 *   - consumers (the reference client, the jesusfilm-ai façade) import the
 *     inferred types and map onto them — the engine never bends toward a
 *     consumer's preferences.
 *
 * Schemas are runtime VALUES (the only value-exports in src/contracts); the
 * paired types are derived via z.infer so a shape can only change in one place.
 * zod is an external lib, so importing it here does not violate the
 * "contracts import nothing under src/" rule (.dependency-cruiser.cjs).
 */
import { z } from "zod";
import type { Citation } from "./documents.js";

/** Source attribution attached to every result. Mirrors documents.ts `Citation`. */
export const citationSchema = z
  .object({
    sourceKey: z.string(),
    sourceName: z.string(),
    title: z.string().nullable(),
    url: z.string(), // canonicalUrl
  })
  .strict();

/**
 * What the caller hands to Retrieval. Mechanism, not policy: declared
 * parameters only (see docs/architecture.md §1). `.strict()` rejects unknown
 * fields so a typo or a consumer-specific extension fails loudly at the seam
 * rather than being silently ignored.
 */
export const retrievalPolicySchema = z
  .object({
    allowedSourceKeys: z.array(z.string()).optional(), // visibility scope (undefined = all)
    preferSourceKey: z.string().optional(),
    language: z.string().optional(),
    category: z.string().optional(),
    topK: z.number().int().positive().optional(), // default 5 (engine-applied)
    minScore: z.number().min(0).max(1).optional(), // default 0.37 (engine-applied)
  })
  .strict();

/** A ranked, cited result returned to the caller. */
export const rankedResultSchema = z
  .object({
    chunkId: z.string(),
    score: z.number(), // cosine 0..1
    text: z.string(),
    ord: z.number().int(),
    tags: z.array(z.string()),
    citation: citationSchema,
  })
  .strict();

/** POST /v1/search request body. */
export const searchRequestSchema = z
  .object({
    query: z.string().min(1),
    policy: retrievalPolicySchema.optional(),
  })
  .strict();

/**
 * POST /v1/search response. An envelope (not a bare array) so additive growth
 * — e.g. a future `meta` block — stays within the same major version.
 */
export const searchResponseSchema = z
  .object({
    results: z.array(rankedResultSchema),
  })
  .strict();

export type RetrievalPolicy = z.infer<typeof retrievalPolicySchema>;
export type RankedResult = z.infer<typeof rankedResultSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;

/**
 * Compile-time drift guard: the published `citation` shape MUST stay identical
 * to the internal `Citation` (documents.ts) the retriever assembles. If either
 * side changes without the other, `Equal<…>` becomes `false`, which is not
 * assignable to `true` and fails `tsc` here — no runtime cost.
 */
type Equal<A, B> =
  (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
export type _CitationContractGuard = Expect<
  Equal<RankedResult["citation"], Citation>
>;
