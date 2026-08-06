/**
 * Composition root — the ONLY module that constructs concrete adapters
 * (src/adapters/*) and wires them into the contexts. Everything else depends on
 * interfaces in src/contracts and receives its dependencies by injection. This
 * boundary is enforced by .dependency-cruiser.cjs (see docs/architecture.md §5).
 *
 * `wire()` is the single place adapters are built; the CLI runners
 * (scripts/acquire.ts, scripts/index.ts) and the serving entrypoint call it
 * rather than constructing adapters themselves (architecture §10). As later
 * build steps land, wire() grows the Embedder/Fetcher adapters and assembles
 * the Acquisition/Ingestion/Retrieval contexts around these ports.
 */
import type {
  CorpusSearchStore,
  CorpusWriteStore,
  Embedder,
  Fetcher,
  FetchStateStore,
  LanguageDetector,
  LlmReviewer,
  RawDocumentReader,
  RawDocumentStore,
  Retriever,
} from "@/contracts/index.js";
import {
  PostgresCorpusSearchStore,
  PostgresCorpusWriteStore,
  PostgresFetchStateStore,
  PostgresRawDocumentReader,
  PostgresRawDocumentStore,
} from "@/adapters/postgres/index.js";
import { HttpFetcher } from "@/adapters/http-fetch/index.js";
import { FirecrawlFetcher } from "@/adapters/firecrawl/index.js";
import { resolveFetchStrategy, type SourceEntry } from "@/registry/index.js";
import {
  FallbackEmbedder,
  OpenRouterEmbedder,
  OpenRouterLanguageDetector,
  OpenRouterReviewer,
  type EmbedFallbackInfo,
  type EmbedRetryInfo,
  type OpenRouterEmbedderOptions,
} from "@/adapters/openrouter/index.js";
import { createRetriever } from "@/retrieval/index.js";
import { closeDb, getDb } from "@/db/index.js";
import { getEnv, type Env } from "@/env.js";

/** The injected ports a runner needs, plus a shutdown hook for the DB pool. */
export interface Wiring {
  corpusWriteStore: CorpusWriteStore;
  corpusSearchStore: CorpusSearchStore;
  fetchStateStore: FetchStateStore;
  rawDocumentStore: RawDocumentStore;
  rawDocumentReader: RawDocumentReader;
  /**
   * The Fetcher for one source, per its declared fetch strategy (ADR-0012):
   * plain HTTP unless the registry entry declares `fetchStrategy: "firecrawl"`.
   * Static, per-source, for ALL its requests (sitemap discovery and content
   * pages alike) — never a runtime fallback, never per-request mixing.
   */
  fetcherFor(entry: SourceEntry): Fetcher;
  /** Corpus/document embedder — the PATIENT retry policy (ingest runs). */
  embedder: Embedder;
  /** Query embedder — the FAST-FAIL retry policy (request-time retrieval). */
  queryEmbedder: Embedder;
  languageDetector: LanguageDetector;
  llmReviewer: LlmReviewer;
  retriever: Retriever;
  shutdown(): Promise<void>;
}

/**
 * Short, greppable token for an embed/detect retry log: `http_<status>` for a
 * provider response (the class name alone would hide 429 vs 503 — the fact that
 * matters during triage), `timeout` for a per-attempt abort, `network` for a
 * dropped connection.
 */
function retryReason(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { name?: string; status?: number };
    if (typeof e.status === "number") return `http_${e.status}`;
    if (e.name === "AbortError" || e.name === "TimeoutError") return "timeout";
    if (e.name === "TypeError") return "network";
    if (e.name) return e.name;
  }
  return "error";
}

/**
 * Per-source Fetcher selection (ADR-0012), driven by the pure
 * resolveFetchStrategy: plain HTTP unless the registry entry declares
 * `fetchStrategy: "firecrawl"`. The Firecrawl adapter is built lazily — only
 * when a source actually declares it — so the key is required exactly then and
 * plain-HTTP runs never touch it. One instance serves every Firecrawl source
 * (the adapter holds no per-source state).
 */
function makeFetcherFor(env: Env): (entry: SourceEntry) => Fetcher {
  const httpFetcher = new HttpFetcher();
  let firecrawlFetcher: Fetcher | null = null;
  return (entry) => {
    const strategy = resolveFetchStrategy(entry);
    switch (strategy) {
      case "plain-http":
        return httpFetcher;
      case "firecrawl":
        if (!firecrawlFetcher) {
          if (!env.FIRECRAWL_API_KEY) {
            throw new Error(
              `FIRECRAWL_API_KEY is not set, but source '${entry.key}' declares ` +
                `fetchStrategy: "firecrawl". Set it in .env (local, free-tier key) ` +
                `or Doppler (production, hobby-tier key) and re-run.`,
            );
          }
          firecrawlFetcher = new FirecrawlFetcher({ apiKey: env.FIRECRAWL_API_KEY });
        }
        return firecrawlFetcher;
      default: {
        // Exhaustive: a new FetchStrategy member must be routed here explicitly,
        // never silently sent to one of the existing fetchers.
        const unhandled: never = strategy;
        throw new Error(`unhandled fetch strategy '${String(unhandled)}' for source '${entry.key}'`);
      }
    }
  };
}

// Retry log in ingest-CLI progress style; `operation` names the work so this
// line can never read as request-time query activity. `provider` is labelled
// only in gateway mode — the single-provider format predates it and is
// locked by tests/wire-embed-policy.test.ts.
const corpusRetryLog =
  (provider?: string) =>
  ({ operation, attempt, maxAttempts, delayMs, error }: EmbedRetryInfo) => {
    const what = operation === "query" ? "query embed" : "corpus embed";
    const tag = provider ? ` [${provider}]` : "";
    console.warn(
      `  ⟳ ${what}${tag} attempt ${attempt}/${maxAttempts} failed (${retryReason(error)}); retrying in ${delayMs}ms`,
    );
  };

const queryRetryLog =
  (provider?: string) =>
  ({ attempt, maxAttempts, delayMs, error }: EmbedRetryInfo) => {
    const tag = provider ? `provider=${provider} ` : "";
    console.warn(
      `[retrieval] event=query_embed_retry ${tag}attempt=${attempt}/${maxAttempts} reason=${retryReason(error)} delay_ms=${delayMs}`,
    );
  };

/**
 * Build the corpus + query embedders — the two retry postures of
 * docs/ops/embed-retry-policy.md, each optionally wrapped in the
 * gateway-primary/OpenRouter-fallback split of ADR-0015.
 */
function buildEmbedders(env: Env): { embedder: Embedder; queryEmbedder: Embedder } {
  // Everything both embedders must agree on — model above all (the corpus and
  // the queries must live in one vector space; retrieve.ts guards this).
  const sharedEmbedderOptions = {
    model: env.EMBED_MODEL_ID,
    queryInstruction: env.EMBED_QUERY_INSTRUCTION,
    truncateToDimensions: env.EMBED_TRUNCATE_DIMENSIONS,
  };
  // Embedding provider split (ADR-0015): with EMBED_BASE_URL set, that endpoint
  // (the JFP AI gateway) is the PRIMARY provider — its own credential and its
  // own wire-level model alias — and hosted OpenRouter is the logged FALLBACK.
  // Unset ⇒ hosted OpenRouter serves alone, exactly the pre-gateway wiring.
  // Either way the canonical EMBED_MODEL_ID is what ingestion records per row.
  const gatewayEmbedderOptions = env.EMBED_BASE_URL
    ? {
        ...sharedEmbedderOptions,
        // getEnv()'s superRefine rejects EMBED_BASE_URL without EMBED_API_KEY.
        apiKey: env.EMBED_API_KEY as string,
        baseUrl: env.EMBED_BASE_URL,
        wireModel: env.EMBED_WIRE_MODEL_ID,
      }
    : null;
  const openRouterEmbedderOptions = {
    ...sharedEmbedderOptions,
    apiKey: env.OPENROUTER_API_KEY,
  };
  // One retry posture (policy + log style) in, one embedder out: the gateway-
  // primary/fallback pair when gateway mode is on, the plain single-provider
  // instance when off.
  const buildEmbedderPair = (
    policy: Partial<OpenRouterEmbedderOptions>,
    retryLog: (provider?: string) => (info: EmbedRetryInfo) => void,
    onFallback: (info: EmbedFallbackInfo) => void,
  ): Embedder =>
    gatewayEmbedderOptions
      ? new FallbackEmbedder({
          primary: new OpenRouterEmbedder({
            ...gatewayEmbedderOptions,
            ...policy,
            onRetry: retryLog("gateway"),
          }),
          fallback: new OpenRouterEmbedder({
            ...openRouterEmbedderOptions,
            ...policy,
            onRetry: retryLog("openrouter"),
          }),
          onFallback,
        })
      : new OpenRouterEmbedder({
          ...openRouterEmbedderOptions,
          ...policy,
          onRetry: retryLog(),
        });
  // Corpus/document embedder — PATIENT: a transient blip aborting a long index
  // run throws away hours (#64), so it rides out ~47s of backoff per batch.
  const embedder = buildEmbedderPair(
    {
      maxAttempts: env.EMBED_MAX_ATTEMPTS,
      timeoutMs: env.EMBED_TIMEOUT_MS,
    },
    corpusRetryLog,
    ({ operation, error }) => {
      const what = operation === "query" ? "query embed" : "corpus embed";
      console.warn(
        `  ↯ ${what}: gateway failed (${retryReason(error)}); falling back to hosted OpenRouter`,
      );
    },
  );
  // Query embedder — FAST-FAIL: embeds the caller's query text at request time
  // (every /v1/search does this), where the caller has typically given up
  // within seconds. Few attempts, tight per-attempt timeout, one short delay.
  // Event-style log (matches forge's seeker convention) so a Railway reader
  // sees request-time query embedding, not a corpus embed job.
  // See docs/ops/embed-retry-policy.md.
  const queryEmbedder = buildEmbedderPair(
    {
      maxAttempts: env.QUERY_EMBED_MAX_ATTEMPTS,
      timeoutMs: env.QUERY_EMBED_TIMEOUT_MS,
      retryBaseDelayMs: 250,
    },
    queryRetryLog,
    ({ error }) => {
      console.warn(
        `[retrieval] event=query_embed_fallback provider=openrouter reason=${retryReason(error)}`,
      );
    },
  );
  return { embedder, queryEmbedder };
}

/** Build the storage + HTTP + embedding adapters; injected into the contexts by the runners. */
export function wire(): Wiring {
  const env = getEnv();
  const { db } = getDb();
  const corpusSearchStore = new PostgresCorpusSearchStore(db);
  const { embedder, queryEmbedder } = buildEmbedders(env);
  const onLangRetry = ({
    attempt,
    maxAttempts,
    delayMs,
    error,
  }: {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
    error: unknown;
  }) => {
    const reason = error instanceof Error ? error.name : "error";
    console.warn(
      `  ⟳ detect attempt ${attempt}/${maxAttempts} failed (${reason}); retrying in ${delayMs}ms`,
    );
  };
  const languageDetector = new OpenRouterLanguageDetector({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.LANG_DETECT_MODEL_ID,
    baseUrl: env.LANG_DETECT_BASE_URL,
    maxAttempts: env.LANG_DETECT_MAX_ATTEMPTS,
    onRetry: onLangRetry,
  });
  const llmReviewer = new OpenRouterReviewer({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.LANG_DETECT_MODEL_ID,
    baseUrl: env.LANG_DETECT_BASE_URL,
    maxAttempts: env.LANG_DETECT_MAX_ATTEMPTS,
    onRetry: onLangRetry,
  });
  return {
    corpusWriteStore: new PostgresCorpusWriteStore(db),
    corpusSearchStore,
    fetchStateStore: new PostgresFetchStateStore(db),
    rawDocumentStore: new PostgresRawDocumentStore(db),
    rawDocumentReader: new PostgresRawDocumentReader(db),
    fetcherFor: makeFetcherFor(env),
    embedder,
    queryEmbedder,
    languageDetector,
    llmReviewer,
    retriever: createRetriever({ embedder: queryEmbedder, search: corpusSearchStore }),
    shutdown: () => closeDb(),
  };
}
