/**
 * Ingestion context barrel — normalize → chunk → embed → dedup → idempotent
 * write. Consumed by scripts/index.ts (which wires the ports). Imports only
 * contracts + registry. See docs/architecture.md §3.
 */
export { normalizeDocument, type NormalizeOutcome, type RawInput } from "./normalize.js";
export {
  decideLanguage,
  CONFIDENCE_GATE,
  DETECTION_FLOOR_CHARS,
  type LanguageDecision,
} from "./decide-language.js";
export {
  chunkText,
  chunkDocument,
  estimateTokens,
  type ChunkSpan,
  type ChunkOptions,
} from "./chunk.js";
export {
  ingestPending,
  type IngestDeps,
  type IngestOptions,
  type IngestSummary,
  type IngestStatus,
} from "./ingest.js";
