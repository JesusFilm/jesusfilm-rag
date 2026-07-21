/**
 * OpenRouter adapter — the concrete Embedder port over OpenRouter's
 * OpenAI-compatible embeddings endpoint. Constructed only by src/main.ts.
 * See docs/architecture.md §4.
 */
export {
  OpenRouterEmbedder,
  isRetryableEmbedError,
  type OpenRouterEmbedderOptions,
  type EmbedOperation,
  type EmbedRetryInfo,
} from "./openrouter-embedder.js";
export {
  OpenRouterLanguageDetector,
  OpenRouterReviewer,
  isRetryableLangDetectError,
  parseDetection,
  type OpenRouterLanguageDetectorOptions,
  type OpenRouterReviewerOptions,
  type LangDetectRetryInfo,
} from "./openrouter-language-detector.js";
