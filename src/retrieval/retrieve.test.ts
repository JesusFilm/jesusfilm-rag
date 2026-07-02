/**
 * Retrieval tests — fakes only (no Postgres, no network). Drives createRetriever
 * over FakeCorpusSearchStore plus a fixed-vector Embedder double, so cosine
 * scores are hand-verifiable. Locks invariant 5: cosine ranking, the candidate
 * fan-out, the minScore cutoff, each of the 3 dedup keys, the soft source
 * preference, source-scope filtering, and citation assembly.
 */
import { describe, expect, it } from "vitest";
import type {
  CorpusSearchStore,
  Embedder,
  SearchFilter,
} from "@/contracts/index.js";
import { FakeCorpusSearchStore, type FakeIndexedChunk } from "@/fakes/index.js";
import { candidateTopK, createRetriever } from "./index.js";

/** Embedder double returning a fixed query vector, so cosines are exact. */
class VecEmbedder implements Embedder {
  readonly model = "test/vec";
  readonly dimensions = 3;
  constructor(private readonly q: number[]) {}
  async embed(texts: string[]): Promise<(number[] | null)[]> {
    return texts.map(() => this.q);
  }
  async embedQuery(): Promise<number[]> {
    return this.q;
  }
}

const Q = [1, 0, 0]; // query direction; chunk embeddings are scored against this

function chunk(
  p: Partial<FakeIndexedChunk> & Pick<FakeIndexedChunk, "chunkId" | "embedding">,
): FakeIndexedChunk {
  return {
    chunkId: p.chunkId,
    text: p.text ?? `text ${p.chunkId}`,
    ord: p.ord ?? 0,
    tags: p.tags ?? [],
    sourceKey: p.sourceKey ?? "starting-with-god",
    sourceName: p.sourceName ?? "Starting With God",
    title: p.title ?? `Title ${p.chunkId}`,
    canonicalUrl:
      p.canonicalUrl ?? `https://www.startingwithgod.com/${p.chunkId}`,
    contentHash: p.contentHash ?? `hash-${p.chunkId}`,
    embedding: p.embedding,
    domain: p.domain ?? "www.startingwithgod.com",
    language: p.language ?? "en",
    category: p.category ?? null,
    embeddingModel: p.embeddingModel,
  };
}

function retriever(seed: FakeIndexedChunk[], q: number[] = Q) {
  return createRetriever({
    embedder: new VecEmbedder(q),
    search: new FakeCorpusSearchStore(seed),
  });
}

describe("candidateTopK (fan-out, invariant 5)", () => {
  it("over-fetches topK*3 (or topK+5 for small topK), capped at 50", () => {
    expect(candidateTopK(5)).toBe(15); // max(15, 10)
    expect(candidateTopK(1)).toBe(6); // max(3, 6)
    expect(candidateTopK(10)).toBe(30); // max(30, 15)
    expect(candidateTopK(20)).toBe(50); // max(60, 25) capped at 50
  });
});

describe("createRetriever.search", () => {
  it("ranks by cosine, applies the minScore cutoff, and cites each hit", async () => {
    const out = await retriever([
      chunk({ chunkId: "hi", embedding: [1, 0, 0] }), // cosine 1.0
      chunk({ chunkId: "mid", embedding: [0.8, 0.6, 0] }), // cosine 0.8
      chunk({ chunkId: "low", embedding: [0, 1, 0] }), // cosine 0.0 → dropped
    ]).search("anything");

    expect(out.map((r) => r.chunkId)).toEqual(["hi", "mid"]);
    expect(out[0].score).toBeCloseTo(1.0);
    expect(out[1].score).toBeCloseTo(0.8);
    expect(out[0].citation).toEqual({
      sourceKey: "starting-with-god",
      sourceName: "Starting With God",
      title: "Title hi",
      url: "https://www.startingwithgod.com/hi",
    });
  });

  it("honours topK (default 5, overridable)", async () => {
    const seed = Array.from({ length: 8 }, (_, i) =>
      chunk({ chunkId: `c${i}`, embedding: [1, 0, 0] }),
    );
    expect((await retriever(seed).search("q")).length).toBe(5); // default
    expect((await retriever(seed).search("q", { topK: 2 })).length).toBe(2);
  });

  it("honours an overridden minScore", async () => {
    const out = await retriever([
      chunk({ chunkId: "hi", embedding: [1, 0, 0] }), // 1.0
      chunk({ chunkId: "mid", embedding: [0.8, 0.6, 0] }), // 0.8 → below 0.9
    ]).search("q", { minScore: 0.9 });
    expect(out.map((r) => r.chunkId)).toEqual(["hi"]);
  });

  it("requests the fan-out candidate count from the store", async () => {
    let seenK = -1;
    const base = new FakeCorpusSearchStore([chunk({ chunkId: "a", embedding: [1, 0, 0] })]);
    const spy: CorpusSearchStore = {
      vectorSearch: (v: number[], f: SearchFilter, k: number) => {
        seenK = k;
        return base.vectorSearch(v, f, k);
      },
      fetchById: (id: string) => base.fetchById(id),
    };
    await createRetriever({ embedder: new VecEmbedder(Q), search: spy }).search(
      "q",
      { topK: 5 },
    );
    expect(seenK).toBe(15);
  });
});

describe("3-key dedup (invariant 5) — at most one chunk per distinct document", () => {
  it("collapses on shared document content-hash", async () => {
    const out = await retriever([
      chunk({ chunkId: "a", contentHash: "same", canonicalUrl: "u/a", ord: 0, title: "A", text: "alpha", embedding: [1, 0, 0] }),
      chunk({ chunkId: "b", contentHash: "same", canonicalUrl: "u/b", ord: 1, title: "B", text: "beta", embedding: [1, 0, 0] }),
    ]).search("q");
    expect(out.map((r) => r.chunkId)).toEqual(["a"]);
  });

  it("collapses on shared canonicalUrl + ord", async () => {
    const out = await retriever([
      chunk({ chunkId: "a", contentHash: "h1", canonicalUrl: "u/x", ord: 2, title: "A", text: "alpha", embedding: [1, 0, 0] }),
      chunk({ chunkId: "b", contentHash: "h2", canonicalUrl: "u/x", ord: 2, title: "B", text: "beta", embedding: [1, 0, 0] }),
    ]).search("q");
    expect(out.map((r) => r.chunkId)).toEqual(["a"]);
  });

  it("collapses on shared title + text fingerprint", async () => {
    const out = await retriever([
      chunk({ chunkId: "a", contentHash: "h1", canonicalUrl: "u/a", ord: 0, title: "Same", text: "Identical  body.", embedding: [1, 0, 0] }),
      chunk({ chunkId: "b", contentHash: "h2", canonicalUrl: "u/b", ord: 1, title: "Same", text: "identical body.", embedding: [1, 0, 0] }),
    ]).search("q");
    expect(out.map((r) => r.chunkId)).toEqual(["a"]);
  });

  it("keeps rows that differ on all three keys", async () => {
    const out = await retriever([
      chunk({ chunkId: "a", contentHash: "h1", canonicalUrl: "u/a", ord: 0, title: "A", text: "alpha", embedding: [1, 0, 0] }),
      chunk({ chunkId: "b", contentHash: "h2", canonicalUrl: "u/b", ord: 1, title: "B", text: "beta", embedding: [1, 0, 0] }),
    ]).search("q");
    expect(out.map((r) => r.chunkId)).toEqual(["a", "b"]);
  });
});

describe("query/corpus model-match guard", () => {
  // VecEmbedder.model is "test/vec"; the corpus reports its own embedding model(s).
  it("throws when the query model is in NONE of the corpus models", async () => {
    const r = retriever([
      chunk({ chunkId: "a", embedding: [1, 0, 0], embeddingModel: "openai/text-embedding-3-small" }),
    ]);
    await expect(r.search("q")).rejects.toThrow(/model mismatch/i);
    await expect(r.search("q")).rejects.toThrow(/test\/vec/); // reports the query model
  });

  it("passes when the query model is present in the corpus", async () => {
    const out = await retriever([
      chunk({ chunkId: "a", embedding: [1, 0, 0], embeddingModel: "test/vec" }),
    ]).search("q");
    expect(out.map((r) => r.chunkId)).toEqual(["a"]);
  });

  it("passes during a partial re-embed (mixed models) if the query model is one of them", async () => {
    const out = await retriever([
      chunk({ chunkId: "new", contentHash: "h1", canonicalUrl: "u/1", embedding: [1, 0, 0], embeddingModel: "test/vec" }),
      chunk({ chunkId: "old", contentHash: "h2", canonicalUrl: "u/2", embedding: [1, 0, 0], embeddingModel: "legacy/model" }),
    ]).search("q");
    expect(out.map((r) => r.chunkId)).toContain("new");
  });

  it("skips the guard when the corpus reports no models (empty / model not tracked)", async () => {
    const out = await retriever([
      chunk({ chunkId: "a", embedding: [1, 0, 0] }), // no embeddingModel set
    ]).search("q");
    expect(out.map((r) => r.chunkId)).toEqual(["a"]);
  });
});

describe("source scope + preference", () => {
  it("hard-scopes to allowedSourceKeys", async () => {
    const out = await retriever([
      chunk({ chunkId: "swg", sourceKey: "starting-with-god", contentHash: "h1", canonicalUrl: "u/1", embedding: [1, 0, 0] }),
      chunk({ chunkId: "cru", sourceKey: "cru", contentHash: "h2", canonicalUrl: "u/2", embedding: [1, 0, 0] }),
    ]).search("q", { allowedSourceKeys: ["starting-with-god"] });
    expect(out.map((r) => r.chunkId)).toEqual(["swg"]);
  });

  it("filters by language", async () => {
    const out = await retriever([
      chunk({ chunkId: "en", language: "en", contentHash: "h1", canonicalUrl: "u/1", embedding: [1, 0, 0] }),
      chunk({ chunkId: "es", language: "es", contentHash: "h2", canonicalUrl: "u/2", embedding: [1, 0, 0] }),
    ]).search("q", { language: "es" });
    expect(out.map((r) => r.chunkId)).toEqual(["es"]);
  });

  it("applies preferSourceKey as a tiebreak only (scores untouched)", async () => {
    const seed = [
      chunk({ chunkId: "x", sourceKey: "a-src", contentHash: "hx", canonicalUrl: "u/x", embedding: [1, 0, 0] }),
      chunk({ chunkId: "y", sourceKey: "b-src", contentHash: "hy", canonicalUrl: "u/y", embedding: [1, 0, 0] }),
    ];
    expect((await retriever(seed).search("q")).map((r) => r.chunkId)).toEqual(["x", "y"]);
    const preferred = await retriever(seed).search("q", { preferSourceKey: "b-src" });
    expect(preferred.map((r) => r.chunkId)).toEqual(["y", "x"]);
    expect(preferred[0].score).toBeCloseTo(1.0); // preference did not alter the score
  });
});
