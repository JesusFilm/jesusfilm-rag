/**
 * Composition-level test locking wire()'s SPLIT embed retry policies
 * (docs/ops/embed-retry-policy.md): the corpus/document embedder keeps the
 * patient ingest posture (EMBED_MAX_ATTEMPTS, default 10 — issue #64), while
 * the query embedder the retriever is wired with fails fast
 * (QUERY_EMBED_MAX_ATTEMPTS, default 2) and logs event-style lines that name
 * the work as request-time QUERY embedding — the 2026-07-21 confusion was a
 * shared, ingest-worded retry log making per-request query embeds on the serve
 * path read as a corpus embed job.
 *
 * Why it lives outside src/: it exercises main.ts, the wiring layer, which the
 * import law keeps out of src/**'s fakes-only unit tests (same rationale as
 * tests/retrieval.integration.test.ts). Offline and DB-free: fetch is stubbed,
 * the postgres client is lazy (never connects), and backoff runs on fake time.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// wire() reads getEnv() (module-cached), so the env must exist BEFORE main.ts
// is imported. Values are inert: the pg client never connects in this test.
process.env.DATABASE_URL ??= "postgres://unused:unused@localhost:5432/unused";
process.env.OPENROUTER_API_KEY ??= "test-key";
delete process.env.EMBED_MAX_ATTEMPTS;
delete process.env.QUERY_EMBED_MAX_ATTEMPTS;
delete process.env.QUERY_EMBED_TIMEOUT_MS;

const { wire } = await import("@/main.js");

const failWith503 = (): ReturnType<typeof vi.fn> => {
  const spy = vi.fn(
    async () => new Response("busy", { status: 503, statusText: "Service Unavailable" }),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
};

describe("wire() — split embed retry policies", () => {
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

  it("query embedder fails fast: default 2 attempts, event-style query_embed_retry log", async () => {
    const fetchSpy = failWith503();
    const { queryEmbedder } = wire();

    const outcome = queryEmbedder.embedQuery("how do I pray?").catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const err = await outcome;

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/503/);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // 1 try + 1 quick retry — no ingest-grade patience
    expect(warns).toEqual([
      "[retrieval] event=query_embed_retry attempt=1/2 reason=http_503 delay_ms=250",
    ]);
  });

  it("document embedder keeps the patient ingest policy: default 10 attempts, corpus-worded log", async () => {
    const fetchSpy = failWith503();
    const { embedder } = wire();

    const outcome = embedder.embed(["a document chunk"]).catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const err = await outcome;

    expect(err).toBeInstanceOf(Error);
    expect(fetchSpy).toHaveBeenCalledTimes(10); // 1 try + 9 retries (#64 posture, unchanged)
    expect(warns).toHaveLength(9);
    expect(warns[0]).toBe(
      "  ⟳ corpus embed attempt 1/10 failed (http_503); retrying in 500ms",
    );
  });

  it("the two embedders are distinct instances sharing one model (vector-space match)", () => {
    const wiring = wire();
    expect(wiring.queryEmbedder).not.toBe(wiring.embedder);
    expect(wiring.queryEmbedder.model).toBe(wiring.embedder.model);
  });
});
