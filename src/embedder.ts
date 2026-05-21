/**
 * OpenRouter embedding client. Batched, with a dimension assertion that fails
 * loud if the model's output dim drifts from what the schema expects.
 * See docs/architecture.md (decision 1: embedding model).
 */

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_BATCH_SIZE = 16;

/**
 * Canonical embedding model + dimensions for the jesusfilm-ai port.
 * `openai/text-embedding-3-small` via OpenRouter at 1536 dims — matches
 * jesusfilm-ai and Forge. Recorded per row in `chunk_embeddings.embedding_model`
 * so a future swap is a non-destructive migration. See docs/architecture.md.
 * Provider: https://openrouter.ai/openai/text-embedding-3-small
 */
export const DEFAULT_EMBED_MODEL_ID = "openai/text-embedding-3-small";
export const DEFAULT_EMBED_DIMENSIONS = 1536;

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export interface EmbedderOptions {
  apiKey: string;
  modelId: string;
  expectedDimensions: number;
  baseUrl?: string;
  batchSize?: number;
  fetchImpl?: typeof fetch;
}

export interface EmbedOptions {
  signal?: AbortSignal;
  batchSize?: number;
}

interface OpenRouterEmbeddingResponse {
  data?: { embedding?: number[]; index?: number }[];
}

export class OpenRouterEmbedder {
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly expectedDimensions: number;
  private readonly baseUrl: string;
  private readonly defaultBatchSize: number;
  private readonly fetchImpl: typeof fetch;
  private dimensionsValidated = false;

  constructor(options: EmbedderOptions) {
    this.apiKey = options.apiKey;
    this.modelId = options.modelId;
    this.expectedDimensions = options.expectedDimensions;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultBatchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get model(): string {
    return this.modelId;
  }

  dimensions(): number {
    return this.expectedDimensions;
  }

  async embed(texts: string[], options?: EmbedOptions): Promise<number[][]> {
    if (texts.length === 0) return [];
    const batchSize = options?.batchSize ?? this.defaultBatchSize;
    const batches = chunkArr(texts, batchSize);
    const results: number[][] = [];
    for (const batch of batches) {
      const batchResult = await this.embedOne(batch, options?.signal);
      results.push(...batchResult);
    }
    return results;
  }

  private async embedOne(
    batch: string[],
    signal?: AbortSignal,
  ): Promise<number[][]> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          // OpenRouter recommends these for attribution/quota routing.
          "HTTP-Referer": "https://github.com/JesusFilm/jesusfilm-rag",
          "X-Title": "jesusfilm-rag",
        },
        body: JSON.stringify({ model: this.modelId, input: batch }),
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new Error("Embedding provider unreachable");
    }

    if (response.status === 429) {
      throw new QuotaExceededError("Embedding quota exhausted");
    }
    if (!response.ok) {
      const body = await safeText(response);
      throw new Error(
        `Embedding provider returned ${response.status}: ${body.slice(0, 200)}`,
      );
    }

    let parsed: OpenRouterEmbeddingResponse;
    try {
      parsed = (await response.json()) as OpenRouterEmbeddingResponse;
    } catch {
      throw new Error("Embedding provider returned invalid JSON");
    }

    const data = parsed.data;
    if (!data || data.length !== batch.length) {
      throw new Error(
        `Embedding provider returned ${data?.length ?? 0} vectors for ${batch.length} inputs`,
      );
    }

    const ordered: number[][] = new Array<number[]>(batch.length);
    for (let i = 0; i < data.length; i++) {
      const entry = data[i];
      const embedding = entry.embedding;
      if (!embedding) {
        throw new Error("Embedding provider returned an entry without embedding");
      }
      const position = entry.index ?? i;
      ordered[position] = embedding;
    }

    if (!this.dimensionsValidated) {
      const actual = ordered[0].length;
      if (actual !== this.expectedDimensions) {
        throw new Error(
          `Embedder dimensions mismatch: expected ${this.expectedDimensions}, got ${actual} from model ${this.modelId}. Regenerate the migration with the correct dimension before ingesting.`,
        );
      }
      this.dimensionsValidated = true;
    }

    return ordered;
  }
}

function chunkArr<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("batchSize must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function safeText(r: Response): Promise<string> {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
