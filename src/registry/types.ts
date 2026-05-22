/**
 * SourceRegistry data types — the richer, crawl-time shape of a source (the
 * persisted projection is `SourceRecord` in contracts/sources.ts). Pure data:
 * no I/O, no behavior. The registry may import only `contracts`. See
 * docs/architecture.md §3 (Acquisition) and §5.1.
 */
import type { IngestionMode, SourceTrust } from "@/contracts/index.js";

/**
 * How a source is crawled. Slice #1 uses an explicit seed list rather than a
 * discovery crawl (the generic-crawler-vs-per-source call is deferred until
 * 2–3 sources reveal the pattern — see docs/STATUS.md).
 */
export interface CrawlPolicy {
  /** Origin used to resolve `seedPaths` into absolute URLs. */
  baseUrl: string;
  /** Content-page paths (relative to `baseUrl`) to acquire. */
  seedPaths: string[];
  /** CSS selectors for the main content container, tried in order — first match wins. */
  contentSelectors: string[];
  /** Selectors removed from the content container before text extraction (nav, sidebar, footer, share widgets, comments). */
  stripSelectors: string[];
  /** Polite delay between fetches, in milliseconds. */
  requestDelayMs: number;
  /** Safety cap on pages fetched per run. */
  maxPages: number;
  /** Drop a page whose extracted text is shorter than this many characters. */
  minContentLength: number;
}

/** A registered source plus its crawl policy. */
export interface SourceEntry {
  key: string; // stable registry key, e.g. 'starting-with-god'
  name: string;
  domain: string; // bare host, e.g. 'www.startingwithgod.com'
  trust: SourceTrust;
  ingestionMode: IngestionMode;
  languages: string[];
  defaultTags: string[];
  defaultCategory: string | null;
  rights: string | null;
  crawl: CrawlPolicy;
}
