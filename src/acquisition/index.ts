/**
 * Acquisition context — fetch raw content + extract main text → RawDocument.
 * Never normalizes, chunks, embeds, or writes corpus tables; all I/O is via
 * injected ports (Fetcher) wired in main.ts. See docs/architecture.md §3.
 */
export { normalizeUrl } from "./normalize-url.js";
export { extractContent, type Extracted } from "./extract.js";
export {
  acquireOne,
  type AcquireOutcome,
  type SkipReason,
} from "./acquire.js";
