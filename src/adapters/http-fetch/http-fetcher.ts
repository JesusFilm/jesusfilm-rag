/**
 * HTTP Fetcher adapter — the concrete `Fetcher` port over the global fetch
 * (Node ≥20 undici). Follows redirects, sends a browser-like UA (the recon UA
 * that returns 200 where bot UAs see 403 — docs/STATUS.md), honors conditional
 * headers, and maps a 304 to a not-modified result with a null body. Constructed
 * only by main.ts. Raw HTTP only — no extraction, no policy. See architecture §4.
 */
import type {
  ConditionalHeaders,
  Fetcher,
  FetchResult,
} from "@/contracts/index.js";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface HttpFetcherOptions {
  userAgent?: string;
  timeoutMs?: number;
}

export class HttpFetcher implements Fetcher {
  private readonly userAgent: string;
  private readonly timeoutMs: number;

  constructor(opts: HttpFetcherOptions = {}) {
    this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = opts.timeoutMs ?? 20_000;
  }

  async fetch(url: string, conditional?: ConditionalHeaders): Promise<FetchResult> {
    const headers: Record<string, string> = {
      "user-agent": this.userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
    if (conditional?.ifNoneMatch) headers["if-none-match"] = conditional.ifNoneMatch;
    if (conditional?.ifModifiedSince) {
      headers["if-modified-since"] = conditional.ifModifiedSince;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        headers,
        redirect: "follow",
        signal: controller.signal,
      });
      const etag = res.headers.get("etag");
      const lastModified = res.headers.get("last-modified");
      if (res.status === 304) {
        return { status: 304, body: null, etag, lastModified, notModified: true };
      }
      return {
        status: res.status,
        body: await res.text(),
        etag,
        lastModified,
        notModified: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
