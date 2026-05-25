/**
 * Unit test for the HTTP Fetcher adapter — global fetch is stubbed, so this is
 * fast and offline (a real network fetch is exercised by the live acquire run).
 * Locks the response-mapping contract: header passthrough, 304 → not-modified,
 * conditional headers + UA on the request.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpFetcher } from "./index.js";

function response(
  status: number,
  body: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(status === 304 ? null : body, { status, headers });
}

afterEach(() => vi.unstubAllGlobals());

describe("HttpFetcher", () => {
  it("maps a 200 to body + etag/last-modified, sends the UA", async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> =>
        response(200, "<html>hi</html>", {
          etag: '"abc"',
          "last-modified": "Wed, 21 Oct 2026 07:28:00 GMT",
        }),
    );
    vi.stubGlobal("fetch", spy);

    const out = await new HttpFetcher({ userAgent: "test-agent" }).fetch(
      "https://example.com/p",
    );
    expect(out).toEqual({
      status: 200,
      body: "<html>hi</html>",
      etag: '"abc"',
      lastModified: "Wed, 21 Oct 2026 07:28:00 GMT",
      notModified: false,
    });
    const init = spy.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>)["user-agent"]).toBe("test-agent");
    expect(init.redirect).toBe("follow");
  });

  it("maps a 304 to a not-modified result with null body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(304, "", { etag: '"v2"' })));
    const out = await new HttpFetcher().fetch("https://example.com/p", {
      ifNoneMatch: '"v2"',
    });
    expect(out).toMatchObject({ status: 304, body: null, notModified: true, etag: '"v2"' });
  });

  it("forwards conditional headers", async () => {
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit): Promise<Response> => response(200, "x"),
    );
    vi.stubGlobal("fetch", spy);
    await new HttpFetcher().fetch("https://example.com/p", {
      ifNoneMatch: '"e"',
      ifModifiedSince: "Wed, 21 Oct 2026 07:28:00 GMT",
    });
    const headers = spy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers["if-none-match"]).toBe('"e"');
    expect(headers["if-modified-since"]).toBe("Wed, 21 Oct 2026 07:28:00 GMT");
  });
});
