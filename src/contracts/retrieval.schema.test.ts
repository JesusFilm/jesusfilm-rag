import { describe, it, expect } from "vitest";
import {
  retrievalPolicySchema,
  rankedResultSchema,
  searchRequestSchema,
} from "./retrieval.schema.js";

describe("published retrieval contract", () => {
  it("accepts a fully-specified policy", () => {
    const policy = {
      allowedSourceKeys: ["jesusfilm-org"],
      preferSourceKey: "jesusfilm-org",
      language: "en",
      category: "teaching",
      topK: 5,
      minScore: 0.37,
    };
    expect(retrievalPolicySchema.parse(policy)).toEqual(policy);
  });

  it("accepts an empty policy (all defaults engine-applied)", () => {
    expect(retrievalPolicySchema.parse({})).toEqual({});
  });

  it("rejects unknown policy fields (strict contract boundary)", () => {
    expect(
      retrievalPolicySchema.safeParse({ audience: "seeker" }).success,
    ).toBe(false);
  });

  it("rejects an out-of-range minScore", () => {
    expect(retrievalPolicySchema.safeParse({ minScore: 1.5 }).success).toBe(
      false,
    );
    expect(retrievalPolicySchema.safeParse({ topK: 0 }).success).toBe(false);
  });

  it("bounds topK to the engine's candidate ceiling (1..50)", () => {
    expect(retrievalPolicySchema.safeParse({ topK: 50 }).success).toBe(true);
    expect(retrievalPolicySchema.safeParse({ topK: 51 }).success).toBe(false);
  });

  it("round-trips a RankedResult with its citation", () => {
    const result = {
      chunkId: "c1",
      score: 0.82,
      text: "…",
      ord: 3,
      tags: ["topic:prayer"],
      citation: {
        sourceKey: "jesusfilm-org",
        sourceName: "Jesus Film",
        title: null,
        url: "https://example.org/a",
      },
    };
    expect(rankedResultSchema.parse(result)).toEqual(result);
  });

  it("requires a non-empty, length-bounded query on the search request", () => {
    expect(searchRequestSchema.safeParse({ query: "" }).success).toBe(false);
    expect(
      searchRequestSchema.safeParse({ query: "how do I pray" }).success,
    ).toBe(true);
    expect(
      searchRequestSchema.safeParse({ query: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});
