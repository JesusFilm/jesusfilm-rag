/**
 * Unit test for the OpenRouter Embedder adapter — global fetch is stubbed, so it
 * is fast and offline (the live embeddings call is exercised by `pnpm index`).
 * Locks the load-bearing contract: blank inputs skip the API and map to null,
 * inputs batch at maxBatch, every returned vector's width is asserted, and
 * results stay aligned to input order even when the provider reorders `data`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterEmbedder, isRetryableEmbedError } from "./index.js";

/**
 * Stub fetch with a scripted sequence of responders (one per call; the last is
 * reused if there are more calls than steps). Each responder gets the request
 * init so a success step can echo one vector per input.
 */
function stubFetchSequence(
  steps: Array<(init: RequestInit) => Promise<Response>>,
): ReturnType<typeof vi.fn> {
  let call = 0;
  const spy = vi.fn(async (_url: string, init?: RequestInit): Promise<Response> => {
    const step = steps[Math.min(call, steps.length - 1)];
    call++;
    return step(init!);
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

const okWith = (dim: number) => async (init: RequestInit): Promise<Response> => {
  const { input } = JSON.parse(init.body as string) as { input: string[] };
  const data = input.map((_t, index) => ({ embedding: new Array(dim).fill(1), index }));
  return new Response(JSON.stringify({ data }), { status: 200 });
};
const fail = (status: number, statusText = "x") => async (): Promise<Response> =>
  new Response("body", { status, statusText });
const abort = async (): Promise<never> => {
  throw new DOMException("This operation was aborted", "AbortError");
};

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

  it("rejects a non-contiguous provider index (guards against misaligned vectors)", async () => {
    // Two inputs, but the provider returns index 0 twice (1 missing) — the count
    // check still passes, so without the position check a vector would misalign.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              { embedding: [1, 1, 1], index: 0 },
              { embedding: [2, 2, 2], index: 0 },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 3, retryBaseDelayMs: 0 });

    await expect(embedder.embed(["a", "b"])).rejects.toThrow(/non-contiguous provider index/);
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

  it("embedQuery wraps the query in the instruction template when queryInstruction is set", async () => {
    const spy = stubEmbeddings(ones(3));
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 3,
      queryInstruction: "Retrieve passages that answer the query",
    });

    await embedder.embedQuery("how do I know God?");

    const sent = JSON.parse(spy.mock.calls[0][1]!.body as string) as { input: string[] };
    expect(sent.input).toEqual([
      "Instruct: Retrieve passages that answer the query\nQuery: how do I know God?",
    ]);
  });

  it("documents via embed() stay raw even when queryInstruction is set (asymmetric)", async () => {
    const spy = stubEmbeddings(ones(3));
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 3,
      queryInstruction: "Retrieve passages that answer the query",
    });

    await embedder.embed(["a plain document chunk"]);

    const sent = JSON.parse(spy.mock.calls[0][1]!.body as string) as { input: string[] };
    expect(sent.input).toEqual(["a plain document chunk"]);
  });

  it("truncateToDimensions truncates a wider vector to `dimensions` and L2-renormalizes", async () => {
    // Provider returns width 4 (native); we want 2. Truncate → [3,4], renormalize → unit norm.
    stubEmbeddings(() => [3, 4, 99, 99]);
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 2,
      truncateToDimensions: true,
    });

    const [vec] = await embedder.embed(["x"]);
    expect(vec).not.toBeNull();
    expect(vec).toHaveLength(2);
    // [3,4] / 5 = [0.6, 0.8]; unit norm.
    expect(vec![0]).toBeCloseTo(0.6, 6);
    expect(vec![1]).toBeCloseTo(0.8, 6);
    expect(Math.hypot(vec![0], vec![1])).toBeCloseTo(1, 6);
  });

  it("without truncateToDimensions, a wider-than-expected vector still fails loudly", async () => {
    stubEmbeddings(() => [1, 2, 3, 4]); // width 4, expected 2
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 2 });

    await expect(embedder.embed(["x"])).rejects.toThrow(/width 4 ≠ expected 2/);
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

describe("OpenRouterEmbedder — retry/backoff", () => {
  it("retries a transient 5xx and then succeeds", async () => {
    const onRetry = vi.fn();
    const spy = stubFetchSequence([fail(503), fail(503), okWith(3)]);
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 3,
      retryBaseDelayMs: 0,
      onRetry,
    });

    expect(await embedder.embed(["x"])).toEqual([[1, 1, 1]]);
    expect(spy).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("retries a timeout (AbortError) then succeeds", async () => {
    const spy = stubFetchSequence([abort, okWith(2)]);
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 2, retryBaseDelayMs: 0 });

    expect(await embedder.embed(["x"])).toEqual([[1, 1]]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("names the operation in retry info: embed() = documents, embedQuery() = query", async () => {
    // main.ts's retry loggers word their lines from this field — it is what
    // stops a request-time query retry from reading as a corpus embed job.
    const onRetry = vi.fn();
    stubFetchSequence([fail(503), okWith(3), fail(503), okWith(3)]);
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 3,
      retryBaseDelayMs: 0,
      onRetry,
    });

    await embedder.embed(["a document chunk"]);
    await embedder.embedQuery("how do I pray?");

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0].operation).toBe("documents");
    expect(onRetry.mock.calls[1][0].operation).toBe("query");
  });

  it("gives up after maxAttempts, surfacing the last error, with doubling backoff", async () => {
    const onRetry = vi.fn();
    const spy = stubFetchSequence([fail(503, "Service Unavailable")]);
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 3,
      maxAttempts: 4,
      retryBaseDelayMs: 1,
      onRetry,
    });

    await expect(embedder.embed(["x"])).rejects.toThrow(/503/);
    expect(spy).toHaveBeenCalledTimes(4); // initial + 3 retries
    expect(onRetry.mock.calls.map((c) => c[0].delayMs)).toEqual([1, 2, 4]);
  });

  it("default max attempts (10) rides out a transient blur the old 4-cap aborted on", async () => {
    // Regression for #64: 8 consecutive AbortErrors on one batch — past the old
    // 4-attempt cap — then success. With the default budget the batch recovers.
    const onRetry = vi.fn();
    const spy = stubFetchSequence([
      abort, abort, abort, abort, abort, abort, abort, abort, okWith(3),
    ]);
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 3, retryBaseDelayMs: 0, onRetry });

    const out = await embedder.embed(["x"]);

    expect(out).toEqual([[1, 1, 1]]);
    expect(spy).toHaveBeenCalledTimes(9); // 8 failures + 1 success, within the 10-attempt default
    expect(onRetry).toHaveBeenCalledTimes(8);
    expect(onRetry.mock.calls[0][0].maxAttempts).toBe(10);
  });

  it("does NOT retry a non-retryable 4xx", async () => {
    const onRetry = vi.fn();
    const spy = stubFetchSequence([fail(402, "Payment Required")]);
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 3,
      retryBaseDelayMs: 0,
      onRetry,
    });

    await expect(embedder.embed(["x"])).rejects.toThrow(/402/);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("does NOT retry a data-integrity error (width mismatch)", async () => {
    const spy = stubFetchSequence([async () => new Response(
      JSON.stringify({ data: [{ embedding: [1, 2], index: 0 }] }), // width 2, expect 3
      { status: 200 },
    )]);
    const embedder = new OpenRouterEmbedder({ apiKey: "k", dimensions: 3, retryBaseDelayMs: 0 });

    await expect(embedder.embed(["x"])).rejects.toThrow(/width 2 ≠ expected 3/);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("maxAttempts is floored at 1 (a single try, no retries)", async () => {
    const spy = stubFetchSequence([fail(503)]);
    const embedder = new OpenRouterEmbedder({
      apiKey: "k",
      dimensions: 3,
      maxAttempts: 0,
      retryBaseDelayMs: 0,
    });

    await expect(embedder.embed(["x"])).rejects.toThrow(/503/);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("isRetryableEmbedError", () => {
  it("retries timeouts, network drops, 429 and 5xx; not 4xx or data errors", () => {
    expect(isRetryableEmbedError(Object.assign(new Error("t"), { name: "AbortError" }))).toBe(true);
    expect(isRetryableEmbedError(Object.assign(new Error("n"), { name: "TypeError" }))).toBe(true);
    expect(isRetryableEmbedError({ retryable: true })).toBe(true); // 429 / 5xx
    expect(isRetryableEmbedError({ retryable: false })).toBe(false); // other 4xx
    expect(isRetryableEmbedError(new Error("width mismatch"))).toBe(false);
    expect(isRetryableEmbedError(null)).toBe(false);
  });
});
