/**
 * OpenRouter Embedder adapter — the concrete `Embedder` port over OpenRouter's
 * OpenAI-compatible embeddings endpoint (POST `{baseUrl}/embeddings`). Model
 * `openai/text-embedding-3-small`, 1536 dims (docs/architecture.md decision 1).
 * Batches ≤100 inputs per request and asserts every returned vector's width, so
 * a provider-side dimension drift fails loudly instead of poisoning the corpus.
 * Constructed only by main.ts. See architecture §4.
 *
 * The null-per-empty-input contract is load-bearing — the ingest skip path
 * relies on it: blank/whitespace inputs never hit the API and map to null in the
 * aligned result array.
 *
 * Transient failures (request timeout, network drop, HTTP 429/5xx) are retried
 * per batch with exponential backoff up to `maxAttempts` (configurable; env
 * EMBED_MAX_ATTEMPTS, wired in main.ts). A single slow batch previously aborted
 * an entire index run — the AbortError crashes seen promoting sightline/
 * familylife to prod. Data-integrity errors (width/count mismatch) and client
 * errors (4xx other than 429) are NOT retried — a retry can't fix them.
 */
import type { Embedder } from "@/contracts/index.js";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;
const DEFAULT_MAX_BATCH = 100; // OpenAI allows far more; 100 keeps requests modest.
const DEFAULT_INTER_BATCH_DELAY_MS = 200;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 4; // 1 initial try + 3 retries.
const DEFAULT_RETRY_BASE_DELAY_MS = 500; // 500ms → 1s → 2s … (doubles, capped).
const RETRY_MAX_DELAY_MS = 8_000; // ceiling so a high maxAttempts can't wait minutes.

export interface OpenRouterEmbedderOptions {
  apiKey: string;
  model?: string;
  dimensions?: number;
  baseUrl?: string;
  maxBatch?: number;
  interBatchDelayMs?: number;
  timeoutMs?: number;
  /** Max attempts per batch (initial try + retries). Floored at 1; default 4. */
  maxAttempts?: number;
  /** Backoff before the first retry; doubles each retry, capped at 8s. */
  retryBaseDelayMs?: number;
  /** Observe a transient failure about to be retried (logging / metrics). */
  onRetry?: (info: EmbedRetryInfo) => void;
}

export interface EmbedRetryInfo {
  /** The attempt that just failed (1-based). */
  attempt: number;
  /** Configured maximum number of attempts. */
  maxAttempts: number;
  /** Backoff applied before the next attempt, in ms. */
  delayMs: number;
  /** The transient error being retried. */
  error: unknown;
}

/** OpenAI-compatible embeddings response (the subset we read). */
interface EmbeddingsResponse {
  data?: { embedding: number[]; index: number }[];
}

/** A non-2xx from the embeddings endpoint, tagged with whether a retry may help. */
class EmbedHttpError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  constructor(status: number, statusText: string, detail: string) {
    super(
      `OpenRouter embeddings failed: ${status} ${statusText}` +
        (detail ? ` — ${detail.slice(0, 300)}` : ""),
    );
    this.name = "EmbedHttpError";
    this.status = status;
    // 429 (rate limit) + 5xx (server) are transient; other 4xx are caller bugs.
    this.retryable = status === 429 || status >= 500;
  }
}

/**
 * Classify an embed failure as worth retrying. HTTP errors carry an explicit
 * `retryable` flag (429/5xx yes, other 4xx no). A timeout surfaces as an
 * AbortError and a network drop as a TypeError (undici "fetch failed") — both
 * transient. Anything else (width/count mismatch) is a hard failure.
 */
export function isRetryableEmbedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { retryable?: boolean; name?: string };
  if (typeof e.retryable === "boolean") return e.retryable;
  return e.name === "AbortError" || e.name === "TypeError";
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class OpenRouterEmbedder implements Embedder {
  readonly model: string;
  readonly dimensions: number;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxBatch: number;
  private readonly interBatchDelayMs: number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryBaseDelayMs: number;
  private readonly onRetry?: (info: EmbedRetryInfo) => void;

  constructor(opts: OpenRouterEmbedderOptions) {
    if (!opts.apiKey) throw new Error("OpenRouterEmbedder: apiKey is required");
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.dimensions = opts.dimensions ?? DEFAULT_DIMENSIONS;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.maxBatch = opts.maxBatch ?? DEFAULT_MAX_BATCH;
    this.interBatchDelayMs = opts.interBatchDelayMs ?? DEFAULT_INTER_BATCH_DELAY_MS;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // A misconfigured 0/negative would skip every attempt — floor at 1.
    this.maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.retryBaseDelayMs = opts.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    this.onRetry = opts.onRetry;
  }

  /** Batch-embed; blank/whitespace inputs stay null and never reach the API. */
  async embed(texts: string[]): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const cleaned = texts.map((t) => t.replace(/\n+/g, " ").trim());
    const pending: { index: number; text: string }[] = [];
    cleaned.forEach((t, i) => {
      if (t) pending.push({ index: i, text: t });
    });

    for (let i = 0; i < pending.length; i += this.maxBatch) {
      const batch = pending.slice(i, i + this.maxBatch);
      const vectors = await this.post(batch.map((b) => b.text));
      batch.forEach((b, j) => {
        results[b.index] = vectors[j];
      });
      if (i + this.maxBatch < pending.length && this.interBatchDelayMs > 0) {
        await sleep(this.interBatchDelayMs);
      }
    }
    return results;
  }

  /** Embed a single query (same model/dims). Throws on empty input — a query must be real. */
  async embedQuery(text: string): Promise<number[]> {
    const cleaned = text.replace(/\n+/g, " ").trim();
    if (!cleaned) throw new Error("embedQuery: query text is empty");
    const [vec] = await this.post([cleaned]);
    return vec;
  }

  /** POST one batch, retrying transient failures with exponential backoff. */
  private async post(inputs: string[]): Promise<number[][]> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.postOnce(inputs);
      } catch (err) {
        if (attempt >= this.maxAttempts || !isRetryableEmbedError(err)) throw err;
        const delayMs = Math.min(
          this.retryBaseDelayMs * 2 ** (attempt - 1),
          RETRY_MAX_DELAY_MS,
        );
        this.onRetry?.({ attempt, maxAttempts: this.maxAttempts, delayMs, error: err });
        await sleep(delayMs);
      }
    }
  }

  /** One POST attempt: width-checked vectors aligned to `inputs` order. */
  private async postOnce(inputs: string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: inputs,
          dimensions: this.dimensions,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new EmbedHttpError(res.status, res.statusText, detail);
      }
      const json = (await res.json()) as EmbeddingsResponse;
      const data = json.data;
      if (!Array.isArray(data) || data.length !== inputs.length) {
        throw new Error(
          `OpenRouter embeddings: expected ${inputs.length} vectors, got ` +
            `${Array.isArray(data) ? data.length : "none"}`,
        );
      }
      // Sort by the provider's index defensively, then assert each width.
      return [...data]
        .sort((a, b) => a.index - b.index)
        .map((d) => {
          if (!Array.isArray(d.embedding) || d.embedding.length !== this.dimensions) {
            throw new Error(
              `OpenRouter embeddings: vector width ${d.embedding?.length} ` +
                `≠ expected ${this.dimensions}`,
            );
          }
          return d.embedding;
        });
    } finally {
      clearTimeout(timer);
    }
  }
}
