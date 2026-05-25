/**
 * Pure scoring + reporting logic for the eval harness, extracted from
 * scripts/eval.ts so it can be unit-tested without a DB, network, or env
 * (vitest includes `src/**` + `tests/**`, not `scripts/**`; the test lives in
 * tests/eval-metrics.test.ts and imports this module). eval.ts keeps all the
 * I/O — read the golden file, wire the Retriever, write the results markdown.
 *
 * The `source` tag (added for slice #2's per-source eval) names the registry
 * source each golden case exercises. A whole-corpus run reports the overall
 * score AND a per-source breakdown — the lever for watching cross-source
 * interference as the corpus grows (docs/architecture.md §1; FOLLOW-UP A, the
 * minScore re-derivation, reads these numbers).
 */
import { z } from "zod";

export const GoldenCaseSchema = z
  .object({
    id: z.string(),
    // Registry key this case exercises, e.g. 'starting-with-god'. Required: the
    // per-source breakdown is only honest if every case declares its source.
    source: z.string().min(1),
    question: z.string(),
    expected_doc_paths: z.array(z.string()).optional(),
    expected_url_contains: z.array(z.string()).optional(),
  })
  .refine(
    (c) =>
      (c.expected_doc_paths?.length ?? 0) +
        (c.expected_url_contains?.length ?? 0) >
      0,
    {
      message:
        "golden case needs at least one matcher (expected_doc_paths or expected_url_contains) — a case with none always scores as a miss",
    },
  );

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
  matchedRank: number | null; // 1-indexed rank of first matching hit, or null
}

export interface Metrics {
  cases: number;
  recall_at_3: number;
  recall_at_8: number;
  mrr: number;
  precision_at_1: number;
}

export interface SourceBreakdown {
  source: string;
  metrics: Metrics;
}

/** Pathname of a URL for `expected_doc_paths` matching; falls back to the raw string. */
export function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** A hit satisfies a case if its path is listed OR its URL contains a substring. */
export function matchesExpected(hit: Hit, c: GoldenCase): boolean {
  if (c.expected_doc_paths?.some((p) => hit.docPath === p)) return true;
  if (c.expected_url_contains?.some((s) => hit.docUrl?.includes(s))) return true;
  return false;
}

/** 1-indexed rank of the first hit that matches the case, or null for a miss. */
export function firstMatchingRank(hits: Hit[], c: GoldenCase): number | null {
  for (let i = 0; i < hits.length; i++) {
    if (matchesExpected(hits[i], c)) return i + 1;
  }
  return null;
}

/** recall@3 / recall@8 / MRR / precision@1 over a set of case results. */
export function computeMetrics(results: CaseResult[]): Metrics {
  const n = results.length;
  let recall3 = 0;
  let recall8 = 0;
  let mrr = 0;
  let p1 = 0;
  for (const r of results) {
    if (r.matchedRank !== null) {
      if (r.matchedRank <= 3) recall3 += 1;
      if (r.matchedRank <= 8) recall8 += 1;
      mrr += 1 / r.matchedRank;
      if (r.matchedRank === 1) p1 += 1;
    }
  }
  return {
    cases: n,
    recall_at_3: n ? recall3 / n : 0,
    recall_at_8: n ? recall8 / n : 0,
    mrr: n ? mrr / n : 0,
    precision_at_1: n ? p1 / n : 0,
  };
}

/**
 * Group results by their case's `source` and compute metrics per group, ordered
 * by source key. Each case is retrieved against the WHOLE corpus, so a source's
 * breakdown row reflects how its questions fare amid cross-source competition —
 * the same number a focused `pnpm eval --source <key>` run produces.
 */
export function breakdownBySource(results: CaseResult[]): SourceBreakdown[] {
  const bySource = new Map<string, CaseResult[]>();
  for (const r of results) {
    const list = bySource.get(r.case.source) ?? [];
    list.push(r);
    bySource.set(r.case.source, list);
  }
  return [...bySource.keys()]
    .sort()
    .map((source) => ({ source, metrics: computeMetrics(bySource.get(source)!) }));
}

function escape(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function metricsRows(m: Metrics): string[] {
  return [
    `| recall@3 | ${m.recall_at_3.toFixed(3)} |`,
    `| recall@8 | ${m.recall_at_8.toFixed(3)} |`,
    `| MRR | ${m.mrr.toFixed(3)} |`,
    `| precision@1 | ${m.precision_at_1.toFixed(3)} |`,
  ];
}

export interface RenderInput {
  modelId: string;
  topK: number;
  scope: string | null; // source key for a scoped run, null for whole-corpus
  results: CaseResult[];
  metrics: Metrics;
  breakdown: SourceBreakdown[];
}

/** Markdown report: header + overall metrics + (multi-source) breakdown + per-case table. */
export function renderMarkdown(input: RenderInput): string {
  const { modelId, topK, scope, results, metrics, breakdown } = input;
  const caseRows = results.map((r) => {
    const tick = r.matchedRank !== null ? "✓" : "✗";
    const top = r.hits[0];
    const topInfo = top
      ? `\`${top.docPath}\` (score ${top.score.toFixed(3)})`
      : "—";
    return `| ${tick} | \`${r.case.id}\` | \`${r.case.source}\` | ${escape(r.case.question)} | ${r.matchedRank ?? "miss"} | ${topInfo} |`;
  });

  const breakdownSection =
    breakdown.length > 1
      ? [
          "## Per-source breakdown",
          "",
          "(each case retrieved against the whole corpus — shows cross-source competition)",
          "",
          "| source | cases | recall@3 | recall@8 | MRR | precision@1 |",
          "|--------|------:|---------:|---------:|----:|------------:|",
          ...breakdown.map(
            (b) =>
              `| \`${b.source}\` | ${b.metrics.cases} | ${b.metrics.recall_at_3.toFixed(3)} | ${b.metrics.recall_at_8.toFixed(3)} | ${b.metrics.mrr.toFixed(3)} | ${b.metrics.precision_at_1.toFixed(3)} |`,
          ),
          "",
        ]
      : [];

  return [
    `# Eval results — ${new Date().toISOString()}`,
    "",
    `**Model:** \`${modelId}\``,
    `**Top-k:** ${topK}`,
    `**Scope:** ${scope ? `\`${scope}\` (cases filtered; whole-corpus retrieval)` : "whole-corpus"}`,
    `**Cases:** ${metrics.cases}`,
    "",
    "## Metrics",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    ...metricsRows(metrics),
    "",
    ...breakdownSection,
    "## Per-case",
    "",
    "| | id | source | question | rank | top hit |",
    "|---|----|--------|----------|------|---------|",
    ...caseRows,
    "",
  ].join("\n");
}
