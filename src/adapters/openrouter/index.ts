/**
 * OpenRouter adapter — the concrete Embedder port over OpenRouter's
 * OpenAI-compatible embeddings endpoint. Constructed only by src/main.ts.
 * See docs/architecture.md §4.
 */
export {
  OpenRouterEmbedder,
  type OpenRouterEmbedderOptions,
} from "./openrouter-embedder.js";
