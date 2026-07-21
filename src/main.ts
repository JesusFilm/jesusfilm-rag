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
import {
  OpenRouterEmbedder,
  OpenRouterLanguageDetector,
  OpenRouterReviewer,
} from "@/adapters/openrouter/index.js";
import { createRetriever } from "@/retrieval/index.js";
import { closeDb, getDb } from "@/db/index.js";
import { getEnv } from "@/env.js";

/** The injected ports a runner needs, plus a shutdown hook for the DB pool. */
export interface Wiring {
  corpusWriteStore: CorpusWriteStore;
  corpusSearchStore: CorpusSearchStore;
  fetchStateStore: FetchStateStore;
  rawDocumentStore: RawDocumentStore;
  rawDocumentReader: RawDocumentReader;
  fetcher: Fetcher;
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

/** Build the storage + HTTP + embedding adapters; injected into the contexts by the runners. */
export function wire(): Wiring {
  const env = getEnv();
  const { db } = getDb();
  const corpusSearchStore = new PostgresCorpusSearchStore(db);
  // Everything both embedders must agree on — model above all (the corpus and
  // the queries must live in one vector space; retrieve.ts guards this).
  const sharedEmbedderOptions = {
    apiKey: env.OPENROUTER_API_KEY,
    model: env.EMBED_MODEL_ID,
    baseUrl: env.EMBED_BASE_URL,
    queryInstruction: env.EMBED_QUERY_INSTRUCTION,
    truncateToDimensions: env.EMBED_TRUNCATE_DIMENSIONS,
  };
  // Corpus/document embedder — PATIENT: a transient blip aborting a long index
  // run throws away hours (#64), so it rides out ~47s of backoff per batch.
  // Ingest-CLI progress style; `operation` names the work so this line can
  // never read as request-time query activity.
  const embedder = new OpenRouterEmbedder({
    ...sharedEmbedderOptions,
    maxAttempts: env.EMBED_MAX_ATTEMPTS,
    onRetry: ({ operation, attempt, maxAttempts, delayMs, error }) => {
      const what = operation === "query" ? "query embed" : "corpus embed";
      console.warn(
        `  ⟳ ${what} attempt ${attempt}/${maxAttempts} failed (${retryReason(error)}); retrying in ${delayMs}ms`,
      );
    },
  });
  // Query embedder — FAST-FAIL: embeds the caller's query text at request time
  // (every /v1/search does this), where the caller has typically given up
  // within seconds. Few attempts, tight per-attempt timeout, one short delay.
  // Event-style log (matches forge's seeker convention) so a Railway reader
  // sees request-time query embedding, not a corpus embed job.
  // See docs/ops/embed-retry-policy.md.
  const queryEmbedder = new OpenRouterEmbedder({
    ...sharedEmbedderOptions,
    maxAttempts: env.QUERY_EMBED_MAX_ATTEMPTS,
    timeoutMs: env.QUERY_EMBED_TIMEOUT_MS,
    retryBaseDelayMs: 250,
    onRetry: ({ attempt, maxAttempts, delayMs, error }) => {
      console.warn(
        `[retrieval] event=query_embed_retry attempt=${attempt}/${maxAttempts} reason=${retryReason(error)} delay_ms=${delayMs}`,
      );
    },
  });
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
    fetcher: new HttpFetcher(),
    embedder,
    queryEmbedder,
    languageDetector,
    llmReviewer,
    retriever: createRetriever({ embedder: queryEmbedder, search: corpusSearchStore }),
    shutdown: () => closeDb(),
  };
}
