/**
 * FallbackEmbedder — an `Embedder` decorator that serves every call from a
 * PRIMARY embedder (the internal AI gateway) and, when the primary throws
 * after exhausting its own retry budget, re-issues the whole call on a
 * FALLBACK embedder (hosted OpenRouter). Fallback activation is surfaced via
 * `onFallback` so the serving/ingest logs always show which provider served —
 * a silent fallback would hide a dying gateway until the OpenRouter bill did.
 *
 * Both providers MUST produce vectors in the same space: the constructor
 * rejects a primary/fallback pair whose canonical `model` or `dimensions`
 * differ. The canonical model is what ingestion records per row
 * (`chunk_embeddings.embedding_model`) and retrieve.ts guards at query time —
 * a per-provider wire alias belongs in `OpenRouterEmbedderOptions.wireModel`,
 * never here.
 *
 * The whole `embed()` call (all batches) re-runs on the fallback, not just the
 * failed batch: `embed()` is pure over its inputs, so re-embedding already-
 * succeeded batches costs a little compute and keeps this decorator ignorant
 * of the adapter's batching internals. Any primary error triggers fallback —
 * including non-retryable ones (a 401 from a misconfigured gateway key is
 * exactly when the fallback should carry traffic). A caller bug (e.g. empty
 * query text) throws identically from both providers, so it still surfaces.
 * Constructed only by main.ts. See architecture §4.
 */
import type { Embedder } from "@/contracts/index.js";
import type { EmbedOperation } from "./openrouter-embedder.js";

export interface EmbedFallbackInfo {
  /** Whether the falling-back call embeds a search query or corpus documents. */
  operation: EmbedOperation;
  /** The primary-provider failure that triggered the fallback. */
  error: unknown;
}

export interface FallbackEmbedderOptions {
  primary: Embedder;
  fallback: Embedder;
  /** Observe a fallback activation (logging / metrics). */
  onFallback?: (info: EmbedFallbackInfo) => void;
}

export class FallbackEmbedder implements Embedder {
  readonly model: string;
  readonly dimensions: number;
  private readonly primary: Embedder;
  private readonly fallback: Embedder;
  private readonly onFallback?: (info: EmbedFallbackInfo) => void;

  constructor(opts: FallbackEmbedderOptions) {
    if (opts.primary.model !== opts.fallback.model) {
      throw new Error(
        `FallbackEmbedder: canonical model mismatch — primary "${opts.primary.model}" ` +
          `vs fallback "${opts.fallback.model}" (vectors would live in different spaces)`,
      );
    }
    if (opts.primary.dimensions !== opts.fallback.dimensions) {
      throw new Error(
        `FallbackEmbedder: dimensions mismatch — primary ${opts.primary.dimensions} ` +
          `vs fallback ${opts.fallback.dimensions}`,
      );
    }
    this.primary = opts.primary;
    this.fallback = opts.fallback;
    this.onFallback = opts.onFallback;
    this.model = opts.primary.model;
    this.dimensions = opts.primary.dimensions;
  }

  async embed(texts: string[]): Promise<(number[] | null)[]> {
    try {
      return await this.primary.embed(texts);
    } catch (error) {
      this.onFallback?.({ operation: "documents", error });
      return this.fallback.embed(texts);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      return await this.primary.embedQuery(text);
    } catch (error) {
      this.onFallback?.({ operation: "query", error });
      return this.fallback.embedQuery(text);
    }
  }
}
