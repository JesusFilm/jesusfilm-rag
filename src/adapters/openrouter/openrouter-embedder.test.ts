/**
 * Unit test for the OpenRouter Embedder adapter — global fetch is stubbed, so it
 * is fast and offline (the live embeddings call is exercised by `pnpm index`).
 * Locks the load-bearing contract: blank inputs skip the API and map to null,
 * inputs batch at maxBatch, every returned vector's width is asserted, and
 * results stay aligned to input order even when the provider reorders `data`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterEmbedder } from "./index.js";

/** Stub fetch with an embeddings endpoint that echoes one vector per input. */
function stubEmbeddings(
  vectorFor: (text: string) => number[],
  opts: { reverseOrder?: boolean } = {},
): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (_url: string, init?: RequestInit): Promise<Response> => {
    const { input } = JSON.parse(init!.body as string) as { input: string[] };
    let data = input.map((text, index) => ({ embedding: vectorFor(text), index }));
    if (opts.reverseOrder) data = [...data].reverse();
    return new Response(JSON.stringify({ data }), { status: 200 });
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

const ones = (dim: number) => (): number[] => new Array(dim).fill(1);

afterEach(() => vi.unstubAllGlobals());

describe("OpenRouterEmbedder", () => {
  it("skips blank/whitespace inputs (null in result, never sent to the API)", async () => {
    const spy = stubEmbeddings(ones(3));
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 3 });

    const out = await embedder.embed(["hello", "   ", "\n\n", "world"]);

    expect(out).toHaveLength(4);
    expect(out[0]).toEqual([1, 1, 1]);
    expect(out[1]).toBeNull();
    expect(out[2]).toBeNull();
    expect(out[3]).toEqual([1, 1, 1]);
    // Only the two non-blank inputs were sent, in one batch.
    expect(spy).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(spy.mock.calls[0][1]!.body as string) as { input: string[] };
    expect(sent.input).toEqual(["hello", "world"]);
  });

  it("batches at maxBatch and re-aligns each batch to the source positions", async () => {
    const spy = stubEmbeddings((t) => [t.length]);
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 1,
      maxBatch: 2,
      interBatchDelayMs: 0,
    });

    const out = await embedder.embed(["a", "bb", "ccc", "dddd", "eeeee"]);

    expect(spy).toHaveBeenCalledTimes(3); // ceil(5/2)
    expect(out).toEqual([[1], [2], [3], [4], [5]]);
  });

  it("keeps results aligned when the provider returns data out of order", async () => {
    stubEmbeddings((t) => [t.length], { reverseOrder: true });
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 1, interBatchDelayMs: 0 });

    const out = await embedder.embed(["a", "bb", "ccc"]);

    expect(out).toEqual([[1], [2], [3]]);
  });

  it("asserts the returned vector width (provider dimension drift fails loudly)", async () => {
    stubEmbeddings(() => [1, 2]); // width 2, expected 3
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 3 });

    await expect(embedder.embed(["x"])).rejects.toThrow(/width 2 ≠ expected 3/);
  });

  it("embedQuery returns a single vector; empty query throws", async () => {
    stubEmbeddings(ones(4));
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 4 });

    expect(await embedder.embedQuery("how do I know God?")).toEqual([1, 1, 1, 1]);
    await expect(embedder.embedQuery("   ")).rejects.toThrow(/empty/);
  });

  it("throws with the status on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 402, statusText: "Payment Required" })),
    );
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 3 });

    await expect(embedder.embed(["x"])).rejects.toThrow(/402/);
  });
});
