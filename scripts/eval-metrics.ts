/**
 * Pure scoring + reporting logic for the eval harness, extracted from
 * scripts/eval.ts so it can be unit-tested without a DB, network, or env
 * (vitest includes `src/**` + `tests/**`, not `scripts/**`; the test lives in
 * tests/eval-metrics.test.ts and imports this module). eval.ts keeps all the
 * I/O — read the golden file, wire the Retriever, write the results markdown.
 *
 * Model (docs/eval-approach.md): a golden case is a **source-agnostic question**
 * plus a `relevant` map of `{ sourceKey: [doc pathnames] }` — every document,
 * across sources, that legitimately answers it. A hit is correct if it matches
 * ANY relevant path. We report **recall** (any relevant doc in top-k) AND
 * **coverage** (fraction of the relevant set returned), plus **per-source
 * coverage** (when source X has a relevant doc, does an X doc surface?). P@1/MRR
 * are secondary — ranking is the consumer's job (architecture §1). The relevant
 * set is *living*: re-reviewed each slice as sources are added.
 */
import { z } from "zod";

export const GoldenCaseSchema = z
  .object({
    id: z.string(),
    question: z.string(),
    // sourceKey -> canonical-url pathnames. Every doc that legitimately answers
    // the question, grouped by its source (each source listed has >= 1 path).
    relevant: z.record(z.array(z.string().min(1)).min(1)),
  })
  .refine((c) => Object.keys(c.relevant).length > 0, {
    message:
      "golden case needs at least one source in `relevant` — a question with no relevant doc always scores as a miss",
  });

export const GoldenFileSchema = z.object({
  cases: z.array(GoldenCaseSchema),
});

export type GoldenCase = z.infer<typeof GoldenCaseSchema>;

export interface Hit {
  chunkId: string;
  docPath: string;
  docUrl: string | null;
  score: number;
}

export interface CaseResult {
  case: GoldenCase;
  hits: Hit[];
  matchedRank: number | null; // 1-indexed rank of first hit matching ANY relevant path
  returnedRelevant: string[]; // distinct relevant paths present in the returned hits
}

export interface Metrics {
  cases: number;
  recall_at_3: number;
  recall_at_10: number;
  coverage: number; // mean per-case fraction of the relevant set returned
  mrr: number;
  precision_at_1: number;
}

export interface SourceCoverage {
  source: string;
  cases: number; // cases where this source has >= 1 relevant doc
  recall: number; // fraction of those cases where >= 1 of its docs was returned
  coverage: number; // mean fraction of its relevant docs returned
}

/** Pathname of a URL for matching against `relevant`; falls back to the raw string. */
export function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Every relevant pathname across sources, **distinct**. Deduped so the coverage
 * denominator matches the (also-deduped) returnedRelevant numerator — a doc
 * listed under two sources counts once, so perfect retrieval still reaches 1.0.
 */
export function allRelevantPaths(c: GoldenCase): string[] {
  return [...new Set(Object.values(c.relevant).flat())];
}

/** Distinct relevant paths that appear among the hits (the returned set). */
export function returnedRelevant(hits: Hit[], c: GoldenCase): string[] {
  const want = new Set(allRelevantPaths(c));
  const found = new Set<string>();
  for (const h of hits) if (want.has(h.docPath)) found.add(h.docPath);
  return [...found];
}

/** 1-indexed rank of the first hit matching any relevant path, or null for a miss. */
export function firstMatchingRank(hits: Hit[], c: GoldenCase): number | null {
  const want = new Set(allRelevantPaths(c));
  for (let i = 0; i < hits.length; i++) {
    if (want.has(hits[i].docPath)) return i + 1;
  }
  return null;
}

/** recall@3 / recall@10 / coverage / MRR / P@1 over a set of case results. */
export function computeMetrics(results: CaseResult[]): Metrics {
  const n = results.length;
  let r3 = 0;
  let r10 = 0;
  let cov = 0;
  let mrr = 0;
  let p1 = 0;
  for (const r of results) {
    if (r.matchedRank !== null) {
      if (r.matchedRank <= 3) r3 += 1;
      if (r.matchedRank <= 10) r10 += 1;
      mrr += 1 / r.matchedRank;
      if (r.matchedRank === 1) p1 += 1;
    }
    const total = allRelevantPaths(r.case).length;
    cov += total ? r.returnedRelevant.length / total : 0;
  }
  return {
    cases: n,
    recall_at_3: n ? r3 / n : 0,
    recall_at_10: n ? r10 / n : 0,
    coverage: n ? cov / n : 0,
    mrr: n ? mrr / n : 0,
    precision_at_1: n ? p1 / n : 0,
  };
}

/**
 * Per-source coverage: for cases where source X has a relevant doc, how often
 * does an X doc surface (recall) and what fraction of its docs come back
 * (coverage). Derived from the relevant docs' sources — no per-case "owner".
 * The signal for "did adding source X make its content findable, or buried?"
 */
export function coverageBySource(results: CaseResult[]): SourceCoverage[] {
  const sources = new Set<string>();
  for (const r of results) {
    for (const s of Object.keys(r.case.relevant)) sources.add(s);
  }
  return [...sources].sort().map((source) => {
    let cases = 0;
    let recallHits = 0;
    let covSum = 0;
    for (const r of results) {
      const want = r.case.relevant[source];
      if (!want || want.length === 0) continue;
      cases += 1;
      const got = want.filter((p) => r.returnedRelevant.includes(p)).length;
      if (got > 0) recallHits += 1;
      covSum += got / want.length;
    }
    return {
      source,
      cases,
      recall: cases ? recallHits / cases : 0,
      coverage: cases ? covSum / cases : 0,
    };
  });
}

function escape(s: string): string {
  return s.replace(/\|/g, "\\|");
}

export interface RenderInput {
  modelId: string;
  topK: number;
  scope: string | null; // source key for a scoped run, null for whole-corpus
  results: CaseResult[];
  metrics: Metrics;
  perSource: SourceCoverage[];
}

/** Markdown report: header + metrics + per-source coverage + per-case table. */
export function renderMarkdown(input: RenderInput): string {
  const { modelId, topK, scope, results, metrics, perSource } = input;

  const caseRows = results.map((r) => {
    const tick = r.matchedRank !== null ? "✓" : "✗";
    const total = allRelevantPaths(r.case).length;
    const top = r.hits[0];
    const topInfo = top ? `\`${top.docPath}\` (${top.score.toFixed(3)})` : "—";
    return `| ${tick} | \`${r.case.id}\` | ${escape(r.case.question)} | ${r.matchedRank ?? "miss"} | ${r.returnedRelevant.length}/${total} | ${topInfo} |`;
  });

  const perSourceRows = perSource.map(
    (s) =>
      `| \`${s.source}\` | ${s.cases} | ${s.recall.toFixed(3)} | ${s.coverage.toFixed(3)} |`,
  );

  return [
    `# Eval results — ${new Date().toISOString()}`,
    "",
    `**Model:** \`${modelId}\``,
    `**Top-k:** ${topK}`,
    `**Scope:** ${scope ? `\`${scope}\` (cases whose relevant set includes it; whole-corpus retrieval)` : "whole-corpus"}`,
    `**Cases:** ${metrics.cases}`,
    "",
    "## Metrics",
    "",
    "_recall + coverage lead; P@1/MRR secondary — see docs/eval-approach.md._",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| recall@3 | ${metrics.recall_at_3.toFixed(3)} |`,
    `| recall@10 | ${metrics.recall_at_10.toFixed(3)} |`,
    `| coverage | ${metrics.coverage.toFixed(3)} |`,
    `| MRR | ${metrics.mrr.toFixed(3)} |`,
    `| precision@1 | ${metrics.precision_at_1.toFixed(3)} |`,
    "",
    "## Per-source coverage",
    "",
    "(cases where the source has a relevant doc — recall = any of its docs returned; coverage = mean fraction returned)",
    "",
    "| source | cases | recall | coverage |",
    "|--------|------:|-------:|---------:|",
    ...perSourceRows,
    "",
    "## Per-case",
    "",
    "| | id | question | first rank | coverage | top hit |",
    "|---|----|----------|-----------|----------|---------|",
    ...caseRows,
    "",
  ].join("\n");
}
