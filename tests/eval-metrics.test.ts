/**
 * Unit tests for the eval harness's pure scoring + reporting logic
 * (scripts/eval-metrics.ts). No DB, network, or env — vitest includes tests/**,
 * and the module is side-effect-free. Covers the source-agnostic multi-relevant
 * model: matching against the relevant union, recall@3/@10, coverage, and the
 * per-source coverage breakdown (docs/eval-approach.md).
 */
import { describe, expect, it } from "vitest";
import {
  GoldenCaseSchema,
  allRelevantPaths,
  caseLanguage,
  computeMetrics,
  coverageBySource,
  firstMatchingRank,
  renderMarkdown,
  returnedRelevant,
  safePathname,
  type CaseResult,
  type GoldenCase,
  type Hit,
} from "../scripts/eval-metrics.js";

const SWG = "starting-with-god";
const CRU = "cru-10-basic-steps";

function gcase(over: Partial<GoldenCase> = {}): GoldenCase {
  return {
    id: "c1",
    question: "q?",
    relevant: { [SWG]: ["/a.html", "/b.html"], [CRU]: ["/x.html"] },
    ...over,
  };
}

function hit(docPath: string, score = 0.5): Hit {
  return { chunkId: docPath, docPath, docUrl: `https://t.test${docPath}`, score };
}

/** Hits where the given relevant paths land at the given 1-indexed ranks; fill the rest with misses. */
function hitsWith(at: Record<number, string>, len = 10): Hit[] {
  return Array.from({ length: len }, (_, i) => at[i + 1] ? hit(at[i + 1]) : hit(`/miss-${i}.html`));
}

function result(c: GoldenCase, hits: Hit[]): CaseResult {
  return {
    case: c,
    hits,
    matchedRank: firstMatchingRank(hits, c),
    returnedRelevant: returnedRelevant(hits, c),
  };
}

describe("GoldenCaseSchema", () => {
  it("accepts a well-formed multi-source case", () => {
    expect(GoldenCaseSchema.safeParse(gcase()).success).toBe(true);
  });

  it("rejects an empty relevant map", () => {
    expect(GoldenCaseSchema.safeParse({ id: "c", question: "q", relevant: {} }).success).toBe(false);
  });

  it("rejects a source with no paths", () => {
    expect(
      GoldenCaseSchema.safeParse({ id: "c", question: "q", relevant: { [SWG]: [] } }).success,
    ).toBe(false);
  });
});

describe("allRelevantPaths / returnedRelevant / firstMatchingRank", () => {
  it("flattens relevant paths across sources", () => {
    expect(allRelevantPaths(gcase()).sort()).toEqual(["/a.html", "/b.html", "/x.html"]);
  });

  it("matches a hit against any relevant path and finds the first rank", () => {
    const hits = hitsWith({ 2: "/x.html", 5: "/a.html" });
    expect(firstMatchingRank(hits, gcase())).toBe(2);
    expect(returnedRelevant(hits, gcase()).sort()).toEqual(["/a.html", "/x.html"]);
  });

  it("returns null rank + empty returned set on a miss", () => {
    const hits = hitsWith({});
    expect(firstMatchingRank(hits, gcase())).toBeNull();
    expect(returnedRelevant(hits, gcase())).toEqual([]);
  });
});

describe("computeMetrics", () => {
  it("computes recall@3/@10, coverage, MRR, P@1", () => {
    const c = gcase(); // 3 relevant paths
    const results = [
      result(c, hitsWith({ 1: "/a.html", 4: "/x.html" })), // rank 1; 2/3 covered
      result(c, hitsWith({ 9: "/b.html" })), // rank 9 (in @10, not @3); 1/3 covered
      result(c, hitsWith({})), // miss; 0/3
    ];
    const m = computeMetrics(results);
    expect(m.cases).toBe(3);
    expect(m.recall_at_3).toBeCloseTo(1 / 3, 5); // only the rank-1 case
    expect(m.recall_at_10).toBeCloseTo(2 / 3, 5); // rank 1 and rank 9
    expect(m.precision_at_1).toBeCloseTo(1 / 3, 5);
    expect(m.mrr).toBeCloseTo((1 + 1 / 9) / 3, 5);
    expect(m.coverage).toBeCloseTo((2 / 3 + 1 / 3 + 0) / 3, 5);
  });

  it("is zero (not NaN) for an empty set", () => {
    expect(computeMetrics([])).toMatchObject({ cases: 0, recall_at_10: 0, coverage: 0 });
  });

  it("dedups a path shared across sources so perfect retrieval reaches coverage 1.0", () => {
    // /shared.html listed under both sources — distinct count is 1, not 2.
    const c = gcase({ relevant: { [SWG]: ["/shared.html"], [CRU]: ["/shared.html"] } });
    expect(allRelevantPaths(c)).toEqual(["/shared.html"]);
    const m = computeMetrics([result(c, hitsWith({ 1: "/shared.html" }))]);
    expect(m.coverage).toBeCloseTo(1.0, 5);
  });
});

describe("coverageBySource", () => {
  it("reports per-source recall + coverage over cases where the source is relevant", () => {
    // c1: SWG[/a,/b] + CRU[/x]; c2: CRU[/x,/y] only
    const c1 = gcase({ id: "c1" });
    const c2 = gcase({ id: "c2", relevant: { [CRU]: ["/x.html", "/y.html"] } });
    const results = [
      result(c1, hitsWith({ 1: "/a.html", 2: "/x.html" })), // SWG 1/2, CRU 1/1
      result(c2, hitsWith({ 3: "/x.html" })), // CRU 1/2
    ];
    const bd = coverageBySource(results);
    expect(bd.map((b) => b.source)).toEqual([CRU, SWG]); // sorted

    const cru = bd.find((b) => b.source === CRU)!;
    expect(cru.cases).toBe(2); // relevant in both
    expect(cru.recall).toBeCloseTo(2 / 2, 5); // got >=1 in both
    expect(cru.coverage).toBeCloseTo((1 / 1 + 1 / 2) / 2, 5);

    const swg = bd.find((b) => b.source === SWG)!;
    expect(swg.cases).toBe(1); // only c1 has SWG
    expect(swg.coverage).toBeCloseTo(1 / 2, 5); // /a returned, /b not
  });
});

describe("renderMarkdown", () => {
  it("includes coverage, per-source coverage, and a per-case coverage column", () => {
    const c = gcase();
    const results = [result(c, hitsWith({ 1: "/a.html", 2: "/x.html" }))];
    const md = renderMarkdown({
      modelId: "openai/text-embedding-3-small",
      topK: 10,
      scope: null,
      results,
      metrics: computeMetrics(results),
      perSource: coverageBySource(results),
    });
    expect(md).toContain("| coverage |");
    expect(md).toContain("## Per-source coverage");
    expect(md).toContain("first rank");
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

describe("caseLanguage — per-case retrieval language scoping (eval must search the case's source language only)", () => {
  const LANGS = {
    "starting-with-god": ["en"],
    "cru-10-basic-steps": ["en"],
    "thelife-fr": ["fr"],
    "thelife-zh": ["zh"],
  };

  it("derives the single language shared by every relevant source", () => {
    const c = gcase({ relevant: { "thelife-fr": ["/dieu-existe-t-il"] } });
    expect(caseLanguage(c, LANGS)).toBe("fr");
  });

  it("derives 'en' for a case spanning multiple English sources", () => {
    const c = gcase(); // SWG + CRU, both en
    expect(caseLanguage(c, LANGS)).toBe("en");
  });

  it("returns null (no filter) when relevant sources span languages", () => {
    const c = gcase({
      relevant: { "starting-with-god": ["/a.html"], "thelife-zh": ["/pray"] },
    });
    expect(caseLanguage(c, LANGS)).toBeNull();
  });

  it("returns null when a relevant source is unknown to the registry map", () => {
    const c = gcase({ relevant: { "not-registered": ["/a.html"] } });
    expect(caseLanguage(c, LANGS)).toBeNull();
  });

  it("returns null when a relevant source is itself multilingual", () => {
    const c = gcase({ relevant: { multi: ["/a.html"] } });
    expect(caseLanguage(c, { multi: ["en", "fr"] })).toBeNull();
  });
});
