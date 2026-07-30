/**
 * Unit test for the FallbackEmbedder decorator — pure port-level fakes, no
 * fetch. Locks the load-bearing contract: primary serves when healthy, ANY
 * primary throw re-issues the whole call on the fallback with `onFallback`
 * fired, and a primary/fallback pair whose canonical model or dimensions
 * differ is rejected at construction (vectors must share one space).
 */
import { describe, expect, it, vi } from "vitest";
import type { Embedder } from "@/contracts/index.js";
import { FallbackEmbedder } from "./fallback-embedder.js";

/** Minimal Embedder fake: scripted vectors, or a scripted throw. */
function fakeEmbedder(opts: {
  model?: string;
  dimensions?: number;
  vector?: number[];
  fail?: Error;
}): Embedder & { embedCalls: string[][]; queryCalls: string[] } {
  const vector = opts.vector ?? [1, 0, 0];
  const embedCalls: string[][] = [];
  const queryCalls: string[] = [];
  return {
    model: opts.model ?? "qwen/qwen3-embedding-8b",
    dimensions: opts.dimensions ?? 3,
    embedCalls,
    queryCalls,
    async embed(texts: string[]): Promise<(number[] | null)[]> {
      embedCalls.push(texts);
      if (opts.fail) throw opts.fail;
      return texts.map((t) => (t.trim() ? vector : null));
    },
    async embedQuery(text: string): Promise<number[]> {
      queryCalls.push(text);
      if (opts.fail) throw opts.fail;
      return vector;
    },
  };
}

describe("FallbackEmbedder", () => {
  it("serves from the primary when it succeeds — fallback never called", async () => {
    const primary = fakeEmbedder({ vector: [1, 0, 0] });
    const fallback = fakeEmbedder({ vector: [0, 1, 0] });
    const onFallback = vi.fn();
    const embedder = new FallbackEmbedder({ primary, fallback, onFallback });

    expect(await embedder.embed(["a"])).toEqual([[1, 0, 0]]);
    expect(await embedder.embedQuery("q")).toEqual([1, 0, 0]);
    expect(fallback.embedCalls).toHaveLength(0);
    expect(fallback.queryCalls).toHaveLength(0);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("re-issues embed() on the fallback when the primary throws, firing onFallback", async () => {
    const boom = new Error("gateway 503");
    const primary = fakeEmbedder({ fail: boom });
    const fallback = fakeEmbedder({ vector: [0, 1, 0] });
    const onFallback = vi.fn();
    const embedder = new FallbackEmbedder({ primary, fallback, onFallback });

    const out = await embedder.embed(["a", "  ", "b"]);

    expect(out).toEqual([[0, 1, 0], null, [0, 1, 0]]);
    expect(fallback.embedCalls).toEqual([["a", "  ", "b"]]); // the WHOLE call re-runs
    expect(onFallback).toHaveBeenCalledExactlyOnceWith({
      operation: "documents",
      error: boom,
    });
  });

  it("re-issues embedQuery() on the fallback, tagged as a query fallback", async () => {
    const boom = new Error("gateway down");
    const primary = fakeEmbedder({ fail: boom });
    const fallback = fakeEmbedder({ vector: [0, 1, 0] });
    const onFallback = vi.fn();
    const embedder = new FallbackEmbedder({ primary, fallback, onFallback });

    expect(await embedder.embedQuery("how do I pray?")).toEqual([0, 1, 0]);
    expect(onFallback).toHaveBeenCalledExactlyOnceWith({
      operation: "query",
      error: boom,
    });
  });

  it("propagates a fallback failure after the primary failed (both providers down)", async () => {
    const primary = fakeEmbedder({ fail: new Error("gateway down") });
    const fallbackErr = new Error("openrouter down");
    const fallback = fakeEmbedder({ fail: fallbackErr });
    const embedder = new FallbackEmbedder({ primary, fallback });

    await expect(embedder.embed(["a"])).rejects.toBe(fallbackErr);
  });

  it("exposes the shared canonical model/dimensions", () => {
    const embedder = new FallbackEmbedder({
      primary: fakeEmbedder({}),
      fallback: fakeEmbedder({}),
    });
    expect(embedder.model).toBe("qwen/qwen3-embedding-8b");
    expect(embedder.dimensions).toBe(3);
  });

  it("rejects a canonical-model mismatch at construction", () => {
    expect(
      () =>
        new FallbackEmbedder({
          primary: fakeEmbedder({ model: "embeddings" }),
          fallback: fakeEmbedder({ model: "qwen/qwen3-embedding-8b" }),
        }),
    ).toThrow(/canonical model mismatch/);
  });

  it("rejects a dimensions mismatch at construction", () => {
    expect(
      () =>
        new FallbackEmbedder({
          primary: fakeEmbedder({ dimensions: 4096 }),
          fallback: fakeEmbedder({ dimensions: 3 }),
        }),
    ).toThrow(/dimensions mismatch/);
  });
});
