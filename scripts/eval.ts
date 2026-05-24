/**
 * On-demand eval runner.
 *
 *   pnpm eval
 *
 * Reads eval/qa-golden.yaml, runs each question through semantic_search
 * (top_k=8) against the same code path the MCP server uses, computes:
 *
 *   recall@3, recall@8, MRR, precision@1
 *
 * Writes a markdown summary to eval/results-YYYY-MM-DD.md and prints the
 * headline numbers to stdout. No CI hook — operator-invoked only.
 */

import "@/env.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { getEnv } from "@/env.js";
import { wire } from "@/main.js";
import type { Retriever } from "@/contracts/index.js";

const GoldenCaseSchema = z
  .object({
    id: z.string(),
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

// `.min(1)` relaxed during the port (step 1): the seed cases were stripped and
// the file ships as `cases: []` until the real corpus is ingested (step 7).
const GoldenFileSchema = z.object({
  cases: z.array(GoldenCaseSchema),
});

type GoldenCase = z.infer<typeof GoldenCaseSchema>;

interface Hit {
  chunkId: string;
  docPath: string;
  docUrl: string | null;
  score: number;
}

interface CaseResult {
  case: GoldenCase;
  hits: Hit[];
  matchedRank: number | null; // 1-indexed rank of first matching hit, or null
}

const TOP_K = 8;

async function main(): Promise<void> {
  const env = getEnv();
  const goldenRaw = await readFile(
    path.resolve(process.cwd(), "eval/qa-golden.yaml"),
    "utf8",
  );
  const golden = GoldenFileSchema.parse(YAML.parse(goldenRaw));

  if (golden.cases.length === 0) {
    console.log(
      "eval/qa-golden.yaml has no cases — nothing to run. Author cases now that the corpus is ingested + retrievable (slice #1).",
    );
    return;
  }

  const wiring = wire();
  try {
    console.log(
      `running ${golden.cases.length} case(s) with top_k=${TOP_K}, model=${env.EMBED_MODEL_ID}`,
    );
    const results: CaseResult[] = [];
    for (const c of golden.cases) {
      const hits = await runOne(wiring.retriever, c.question);
      const matchedRank = firstMatchingRank(hits, c);
      results.push({ case: c, hits, matchedRank });
      const tick = matchedRank !== null ? "✓" : "✗";
      console.log(`  ${tick} ${c.id} — rank=${matchedRank ?? "miss"}`);
    }

    const metrics = computeMetrics(results);
    console.log("\nmetrics:");
    for (const [k, v] of Object.entries(metrics)) {
      console.log(`  ${k.padEnd(14)} ${typeof v === "number" ? v.toFixed(3) : v}`);
    }

    const date = new Date().toISOString().slice(0, 10);
    const outPath = path.resolve(process.cwd(), `eval/results-${date}.md`);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, renderMarkdown(env.EMBED_MODEL_ID, results, metrics));
    console.log(`\nwrote ${path.relative(process.cwd(), outPath)}`);
  } finally {
    await wiring.shutdown();
  }
}

/**
 * One golden question through the real Retrieval library (the same Retriever the
 * MCP server / `pnpm query` use), mapped to the eval Hit shape. `docUrl` is the
 * chunk's canonical URL; `docPath` its pathname — golden cases match on either.
 */
async function runOne(retriever: Retriever, question: string): Promise<Hit[]> {
  const ranked = await retriever.search(question, { topK: TOP_K });
  return ranked.map((r) => ({
    chunkId: r.chunkId,
    docPath: safePathname(r.citation.url),
    docUrl: r.citation.url,
    score: r.score,
  }));
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function firstMatchingRank(hits: Hit[], c: GoldenCase): number | null {
  for (let i = 0; i < hits.length; i++) {
    if (matchesExpected(hits[i], c)) return i + 1;
  }
  return null;
}

function matchesExpected(hit: Hit, c: GoldenCase): boolean {
  if (c.expected_doc_paths?.some((p) => hit.docPath === p)) return true;
  if (c.expected_url_contains?.some((s) => hit.docUrl?.includes(s))) return true;
  return false;
}

interface Metrics {
  cases: number;
  recall_at_3: number;
  recall_at_8: number;
  mrr: number;
  precision_at_1: number;
}

function computeMetrics(results: CaseResult[]): Metrics {
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
    recall_at_3: recall3 / n,
    recall_at_8: recall8 / n,
    mrr: mrr / n,
    precision_at_1: p1 / n,
  };
}

function renderMarkdown(
  modelId: string,
  results: CaseResult[],
  metrics: Metrics,
): string {
  const rows = results.map((r) => {
    const tick = r.matchedRank !== null ? "✓" : "✗";
    const top = r.hits[0];
    const topInfo = top
      ? `\`${top.docPath}\` (score ${top.score.toFixed(3)})`
      : "—";
    return `| ${tick} | \`${r.case.id}\` | ${escape(r.case.question)} | ${r.matchedRank ?? "miss"} | ${topInfo} |`;
  });

  return [
    `# Eval results — ${new Date().toISOString()}`,
    "",
    `**Model:** \`${modelId}\``,
    `**Top-k:** ${TOP_K}`,
    `**Cases:** ${metrics.cases}`,
    "",
    "## Metrics",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| recall@3 | ${metrics.recall_at_3.toFixed(3)} |`,
    `| recall@8 | ${metrics.recall_at_8.toFixed(3)} |`,
    `| MRR | ${metrics.mrr.toFixed(3)} |`,
    `| precision@1 | ${metrics.precision_at_1.toFixed(3)} |`,
    "",
    "## Per-case",
    "",
    "| | id | question | rank | top hit |",
    "|---|----|----------|------|---------|",
    ...rows,
    "",
  ].join("\n");
}

function escape(s: string): string {
  return s.replace(/\|/g, "\\|");
}

main().catch((err: unknown) => {
  console.error("eval failed:", err);
  process.exit(1);
});
