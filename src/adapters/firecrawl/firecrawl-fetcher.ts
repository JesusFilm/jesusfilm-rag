/**
 * Firecrawl Fetcher adapter — the concrete `Fetcher` port over Firecrawl's
 * scrape API, for walled sources whose content pages sit behind a JS bot wall
 * plain HTTP cannot pass (ADR-0012). Strictly a transport: it returns the
 * rendered RAW HTML (never Firecrawl's cleaned HTML/markdown) with
 * Firecrawl-side caching disabled, so our own extraction stays the single owner
 * of what counts as content and a deliberate re-crawl means "the site now".
 * Bare REST over global fetch — no SDK (the SDK exists for crawl/batch/
 * webhooks, which we deliberately don't use). Constructed only by main.ts, and
 * lazily: only when a source declares fetchStrategy: "firecrawl".
 *
 * A Firecrawl-level failure (success: false, non-2xx API response, timeout)
 * THROWS — the acquire loop counts a fetcher throw as a fetch-failed skip and
 * keeps crawling, so one flaky page never abandons the rest of the source.
 */
import type {
  ConditionalHeaders,
  Fetcher,
  FetchResult,
} from "@/contracts/index.js";

const SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

/** Response shape prototyped by the throwaway probe (2026-07-21). */
interface ScrapeResponse {
  success: boolean;
  error?: string;
  data?: {
    rawHtml?: string;
    metadata?: { statusCode?: number };
  };
}

export interface FirecrawlFetcherOptions {
  apiKey: string;
  /** Per-request abort; rendering a JS challenge takes longer than plain HTTP. */
  timeoutMs?: number;
}

export class FirecrawlFetcher implements Fetcher {
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(opts: FirecrawlFetcherOptions) {
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  // `conditional` is accepted but never forwarded: Firecrawl has no conditional
  // requests, so notModified is honestly always false (a re-crawl re-fetches).
  async fetch(url: string, _conditional?: ConditionalHeaders): Promise<FetchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(SCRAPE_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        // maxAge 0 disables cache READS (never serve Firecrawl's stale copy);
        // storeInCache false disables cache WRITES (our pages are never stored
        // in Firecrawl's shared index) — both are needed for "cache disabled".
        body: JSON.stringify({ url, formats: ["rawHtml"], maxAge: 0, storeInCache: false }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`firecrawl: API responded ${res.status} scraping ${url}`);
      }
      const payload = (await res.json()) as ScrapeResponse;
      if (!payload.success || payload.data?.rawHtml === undefined) {
        const reason = payload.error ?? "no rawHtml in response";
        throw new Error(`firecrawl: scrape failed for ${url}: ${reason}`);
      }
      return {
        status: payload.data.metadata?.statusCode ?? null,
        body: payload.data.rawHtml,
        etag: null,
        lastModified: null,
        notModified: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
