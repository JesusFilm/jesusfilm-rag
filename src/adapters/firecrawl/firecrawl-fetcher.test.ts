/**
 * Unit test for the Firecrawl Fetcher adapter — global fetch is stubbed, so this
 * is fast, offline, and spends no Firecrawl credits (live capability was proven
 * by the throwaway probe, 2026-07-21). Locks the transport contract: the agreed
 * /v2/scrape request shape, the success → FetchResult mapping, and throw on any
 * Firecrawl-level failure (the acquire loop counts a fetcher throw as a
 * fetch-failed skip and keeps crawling).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirecrawlFetcher } from "./index.js";

function apiResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("FirecrawlFetcher", () => {
  it("POSTs the agreed scrape request (rawHtml, no Firecrawl cache, bearer auth) and maps success onto FetchResult", async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        apiResponse(200, {
          success: true,
          data: { rawHtml: "<html>real article</html>", metadata: { statusCode: 200 } },
        }),
    );
    vi.stubGlobal("fetch", spy);

    const out = await new FirecrawlFetcher({ apiKey: "fc-test-key" }).fetch(
      "https://example.net/wires/loneliness.html",
    );
    expect(out).toEqual({
      status: 200,
      body: "<html>real article</html>",
      etag: null,
      lastModified: null,
      notModified: false,
    });

    expect(spy.mock.calls[0][0]).toBe("https://api.firecrawl.dev/v2/scrape");
    const init = spy.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer fc-test-key");
    expect(headers["content-type"]).toBe("application/json");
    // rawHtml (our extraction stays the single owner of what counts as content)
    // + maxAge 0 (a deliberate re-crawl means "the site now", never Firecrawl's copy).
    expect(JSON.parse(init.body as string)).toEqual({
      url: "https://example.net/wires/loneliness.html",
      formats: ["rawHtml"],
      maxAge: 0,
    });
  });

  it("reports conditional requests as unsupported: notModified false, conditional headers not sent", async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        apiResponse(200, {
          success: true,
          data: { rawHtml: "<html>x</html>", metadata: { statusCode: 200 } },
        }),
    );
    vi.stubGlobal("fetch", spy);

    const out = await new FirecrawlFetcher({ apiKey: "k" }).fetch(
      "https://example.net/p",
      { ifNoneMatch: '"e"', ifModifiedSince: "Wed, 21 Oct 2026 07:28:00 GMT" },
    );
    expect(out.notModified).toBe(false);
    const body = JSON.parse(spy.mock.calls[0][1]!.body as string) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["formats", "maxAge", "url"]);
  });

  it("throws when Firecrawl reports success: false (challenge unpassed, quota exhausted)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => apiResponse(200, { success: false, error: "insufficient credits" })),
    );
    await expect(
      new FirecrawlFetcher({ apiKey: "k" }).fetch("https://example.net/p"),
    ).rejects.toThrow(/insufficient credits/);
  });

  it("throws on a non-2xx Firecrawl API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => apiResponse(402, { success: false, error: "payment required" })),
    );
    await expect(
      new FirecrawlFetcher({ apiKey: "k" }).fetch("https://example.net/p"),
    ).rejects.toThrow(/402/);
  });
});
