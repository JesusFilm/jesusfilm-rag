/**
 * Unit tests for the eval harness's pure scoring + reporting logic
 * (scripts/eval-metrics.ts). No DB, network, or env — vitest includes tests/**,
 * and the module is side-effect-free, so the scoring math + the new per-source
 * grouping (slice #2) are testable in isolation from scripts/eval.ts's I/O.
 */
import { describe, expect, it } from "vitest";
import {
  GoldenCaseSchema,
  breakdownBySource,
  computeMetrics,
  firstMatchingRank,
  matchesExpected,
  renderMarkdown,
  safePathname,
  type CaseResult,
  type GoldenCase,
  type Hit,
} from "../scripts/eval-metrics.js";

function gcase(over: Partial<GoldenCase> = {}): GoldenCase {
  return {
    id: "c1",
    source: "starting-with-god",
    question: "q?",
    expected_doc_paths: ["/a.html"],
    ...over,
  };
}

function hit(over: Partial<Hit> = {}): Hit {
  return {
    chunkId: "k",
    docPath: "/a.html",
    docUrl: "https://x.test/a.html",
    score: 0.5,
    ...over,
  };
}

/** Build a CaseResult with a chosen matched rank, padding hits so ranks line up. */
function result(source: string, matchedRank: number | null): CaseResult {
  const hits: Hit[] = Array.from({ length: 8 }, (_, i) =>
    hit({ docPath: `/miss-${i}.html`, docUrl: `https://x.test/miss-${i}.html` }),
  );
  if (matchedRank !== null) {
    hits[matchedRank - 1] = hit({ docPath: "/a.html" });
  }
  return { case: gcase({ source }), hits, matchedRank };
}

describe("GoldenCaseSchema", () => {
  it("requires a source tag", () => {
    const parsed = GoldenCaseSchema.safeParse({
      id: "c1",
      question: "q?",
      expected_doc_paths: ["/a.html"],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires at least one matcher", () => {
    const parsed = GoldenCaseSchema.safeParse({
      id: "c1",
      source: "s",
      question: "q?",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a well-formed case", () => {
    expect(GoldenCaseSchema.safeParse(gcase()).success).toBe(true);
  });
});

describe("matchesExpected", () => {
  it("matches on doc path", () => {
    expect(matchesExpected(hit({ docPath: "/a.html" }), gcase())).toBe(true);
  });

  it("matches on url substring", () => {
    const c = gcase({ expected_doc_paths: undefined, expected_url_contains: ["a.html"] });
    expect(matchesExpected(hit({ docUrl: "https://x.test/sub/a.html" }), c)).toBe(true);
  });

  it("does not match an unrelated hit", () => {
    expect(matchesExpected(hit({ docPath: "/z.html" }), gcase())).toBe(false);
  });
});

describe("firstMatchingRank", () => {
  it("returns the 1-indexed rank of the first match", () => {
    const hits = [hit({ docPath: "/x.html" }), hit({ docPath: "/a.html" })];
    expect(firstMatchingRank(hits, gcase())).toBe(2);
  });

  it("returns null on a miss", () => {
    expect(firstMatchingRank([hit({ docPath: "/x.html" })], gcase())).toBeNull();
  });
});

describe("computeMetrics", () => {
  it("computes recall@3/@8, MRR, precision@1", () => {
    // ranks: 1 (hit@1), 2, miss, 5
    const results = [
      result("s", 1),
      result("s", 2),
      result("s", null),
      result("s", 5),
    ];
    const m = computeMetrics(results);
    expect(m.cases).toBe(4);
    expect(m.recall_at_3).toBeCloseTo(2 / 4, 5); // ranks 1,2 within 3
    expect(m.recall_at_8).toBeCloseTo(3 / 4, 5); // ranks 1,2,5 within 8
    expect(m.precision_at_1).toBeCloseTo(1 / 4, 5); // only rank 1
    expect(m.mrr).toBeCloseTo((1 + 1 / 2 + 1 / 5) / 4, 5);
  });

  it("is zero (not NaN) for an empty set", () => {
    const m = computeMetrics([]);
    expect(m).toMatchObject({ cases: 0, recall_at_3: 0, mrr: 0, precision_at_1: 0 });
  });
});

describe("breakdownBySource", () => {
  it("groups by source, ordered by key, with per-group metrics", () => {
    const results = [
      result("starting-with-god", 1),
      result("cru-10-basic-steps", null),
      result("starting-with-god", 2),
      result("cru-10-basic-steps", 1),
    ];
    const bd = breakdownBySource(results);
    expect(bd.map((b) => b.source)).toEqual([
      "cru-10-basic-steps", // sorted
      "starting-with-god",
    ]);
    const cru = bd.find((b) => b.source === "cru-10-basic-steps")!;
    expect(cru.metrics.cases).toBe(2);
    expect(cru.metrics.precision_at_1).toBeCloseTo(1 / 2, 5); // one rank-1, one miss
    const swg = bd.find((b) => b.source === "starting-with-god")!;
    expect(swg.metrics.recall_at_3).toBeCloseTo(2 / 2, 5); // ranks 1,2
  });
});

describe("renderMarkdown", () => {
  const base = {
    modelId: "openai/text-embedding-3-small",
    topK: 8,
  };

  it("includes a per-source breakdown only when >1 source is present", () => {
    const results = [result("starting-with-god", 1), result("cru-10-basic-steps", 2)];
    const md = renderMarkdown({
      ...base,
      scope: null,
      results,
      metrics: computeMetrics(results),
      breakdown: breakdownBySource(results),
    });
    expect(md).toContain("## Per-source breakdown");
    expect(md).toContain("whole-corpus");
  });

  it("omits the breakdown and labels the scope for a single-source run", () => {
    const results = [result("cru-10-basic-steps", 1)];
    const md = renderMarkdown({
      ...base,
      scope: "cru-10-basic-steps",
      results,
      metrics: computeMetrics(results),
      breakdown: breakdownBySource(results),
    });
    expect(md).not.toContain("## Per-source breakdown");
    expect(md).toContain("`cru-10-basic-steps`");
  });
});

describe("safePathname", () => {
  it("extracts the pathname", () => {
    expect(safePathname("https://x.test/a/b.html?q=1")).toBe("/a/b.html");
  });

  it("falls back to the raw string on a non-URL", () => {
    expect(safePathname("not a url")).toBe("not a url");
  });
});
