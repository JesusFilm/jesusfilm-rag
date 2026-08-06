/**
 * Composition-level test locking wire()'s GATEWAY-PRIMARY embedding mode
 * (ADR-0015): with EMBED_BASE_URL set, both embedders serve from the gateway —
 * its own credential (EMBED_API_KEY) and its own wire-level model alias
 * (EMBED_WIRE_MODEL_ID) — while the canonical `.model` stays EMBED_MODEL_ID
 * (what ingestion records per row and retrieve.ts guards). When the gateway
 * exhausts its retry budget, the call falls back to hosted OpenRouter with the
 * OpenRouter credential, and the fallback is logged — never silent.
 *
 * Sibling of tests/wire-embed-policy.test.ts (which locks the single-provider
 * mode and its exact log format); same offline setup: fetch stubbed, lazy pg
 * client never connects, backoff on fake time. env.js caches getEnv() at
 * module scope, so the gateway env must exist BEFORE main.ts is imported —
 * this file sets it at top level and must not share a module graph with the
 * policy test (vitest gives each test file a fresh graph).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ??= "postgres://unused:unused@localhost:5432/unused";
process.env.OPENROUTER_API_KEY = "or-spend-key-test";
process.env.EMBED_BASE_URL = "https://gateway.test/v1";
process.env.EMBED_API_KEY = "gw-key-test";
process.env.EMBED_WIRE_MODEL_ID = "embeddings";
process.env.EMBED_MODEL_ID = "qwen/qwen3-embedding-8b";
delete process.env.EMBED_MAX_ATTEMPTS;
delete process.env.EMBED_TIMEOUT_MS;
delete process.env.QUERY_EMBED_MAX_ATTEMPTS;
delete process.env.QUERY_EMBED_TIMEOUT_MS;

const { wire } = await import("@/main.js");

interface SeenRequest {
  url: string;
  auth: string | undefined;
  model: string;
}

/**
 * Stub fetch routing by host: the gateway host responds per `gatewayStatus`,
 * any other host (hosted OpenRouter) succeeds. Records every request's URL,
 * auth header, and wire model.
 */
function stubRoutedFetch(gatewayStatus: number): {
  spy: ReturnType<typeof vi.fn>;
  seen: SeenRequest[];
} {
  const seen: SeenRequest[] = [];
  const spy = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(init!.body as string) as { input: string[]; model: string };
    const headers = init!.headers as Record<string, string>;
    seen.push({ url: String(url), auth: headers.authorization, model: body.model });
    if (String(url).startsWith("https://gateway.test") && gatewayStatus !== 200) {
      return new Response("busy", { status: gatewayStatus, statusText: "x" });
    }
    const data = body.input.map((_t, index) => ({
      embedding: new Array(1536).fill(0.5),
      index,
    }));
    return new Response(JSON.stringify({ data }), { status: 200 });
  });
  vi.stubGlobal("fetch", spy);
  return { spy, seen };
}

describe("wire() — gateway-primary embedding with OpenRouter fallback", () => {
  let warns: string[];

  beforeEach(() => {
    warns = [];
    vi.spyOn(console, "warn").mockImplementation((msg: unknown) => {
      warns.push(String(msg));
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("healthy gateway serves the query embed: gateway URL, gateway key, wire-model alias", async () => {
    const { seen } = stubRoutedFetch(200);
    const { queryEmbedder } = wire();

    const vec = await queryEmbedder.embedQuery("how do I pray?");

    expect(vec).toHaveLength(1536);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("https://gateway.test/v1/embeddings");
    expect(seen[0].auth).toBe("Bearer gw-key-test");
    expect(seen[0].model).toBe("embeddings"); // the wire alias, not the canonical id
    expect(warns).toEqual([]); // no retries, no fallback — silence is the healthy path
  });

  it("canonical model stays EMBED_MODEL_ID on both embedders (rows + retrieve guard)", () => {
    stubRoutedFetch(200);
    const wiring = wire();
    expect(wiring.embedder.model).toBe("qwen/qwen3-embedding-8b");
    expect(wiring.queryEmbedder.model).toBe("qwen/qwen3-embedding-8b");
  });

  it("gateway failure falls back to hosted OpenRouter with the OpenRouter key — and logs it", async () => {
    const { seen } = stubRoutedFetch(503);
    const { queryEmbedder } = wire();

    const outcome = queryEmbedder.embedQuery("how do I pray?");
    await vi.runAllTimersAsync();
    const vec = await outcome;

    expect(vec).toHaveLength(1536);
    // 2 gateway attempts (fast-fail query policy), then 1 OpenRouter success.
    const gatewayCalls = seen.filter((s) => s.url.startsWith("https://gateway.test"));
    const openRouterCalls = seen.filter((s) => s.url.startsWith("https://openrouter.ai"));
    expect(gatewayCalls).toHaveLength(2);
    expect(openRouterCalls).toHaveLength(1);
    expect(openRouterCalls[0].auth).toBe("Bearer or-spend-key-test");
    expect(openRouterCalls[0].model).toBe("qwen/qwen3-embedding-8b"); // no alias off-gateway
    expect(warns).toContain(
      "[retrieval] event=query_embed_fallback provider=openrouter reason=http_503",
    );
  });

  it("corpus embed falls back too, with the corpus-worded fallback line", async () => {
    const { seen } = stubRoutedFetch(503);
    const { embedder } = wire();

    const outcome = embedder.embed(["a document chunk"]);
    await vi.runAllTimersAsync();
    const out = await outcome;

    expect(out).toEqual([expect.any(Array)]);
    // 10 patient gateway attempts (#64 posture), then 1 OpenRouter success.
    expect(seen.filter((s) => s.url.startsWith("https://gateway.test"))).toHaveLength(10);
    expect(seen.filter((s) => s.url.startsWith("https://openrouter.ai"))).toHaveLength(1);
    expect(warns).toContain(
      "  ↯ corpus embed: gateway failed (http_503); falling back to hosted OpenRouter",
    );
  });

  it("lets four corpus batches queue within the batch timeout without retrying", async () => {
    const serviceMs = 25_000;
    let availableAt = Date.now();
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        const body = JSON.parse(init!.body as string) as { input: string[] };
        seen.push(String(url));
        const startedAt = Date.now();
        availableAt = Math.max(availableAt, startedAt) + serviceMs;
        const waitMs = availableAt - startedAt;
        return new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => {
            const data = body.input.map((_text, index) => ({
              embedding: new Array(1536).fill(0.5),
              index,
            }));
            resolve(new Response(JSON.stringify({ data }), { status: 200 }));
          }, waitMs);
          init!.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("This operation was aborted", "AbortError"));
          });
        });
      }),
    );
    const { embedder } = wire();

    const outcome = Promise.all(
      ["one", "two", "three", "four"].map((text) => embedder.embed([text])),
    );
    expect(seen).toHaveLength(4); // concurrent dispatch, not four serialized calls
    await vi.advanceTimersByTimeAsync(100_001);
    const vectors = await outcome;

    expect(vectors).toHaveLength(4);
    expect(vectors.every(([vector]) => vector?.length === 1536)).toBe(true);
    expect(seen).toHaveLength(4);
    expect(seen.every((url) => url.startsWith("https://gateway.test"))).toBe(true);
    expect(warns).toEqual([]);
  });
});
