/**
 * On-demand eval runner.
 *
 *   pnpm eval                          # whole corpus + per-source breakdown
 *   pnpm eval --source cru-10-basic-steps   # only that source's golden cases
 *
 * Reads eval/qa-golden.yaml, runs each question through the same Retriever the
 * MCP server / `pnpm query` use (top_k=8), and computes recall@3 / recall@8 /
 * MRR / precision@1. A whole-corpus run also reports a per-source breakdown.
 *
 * `--source <key>` filters the golden cases to that source but STILL retrieves
 * against the whole corpus — so the scoped number equals that source's row in
 * the whole-corpus breakdown (one source of truth) and surfaces cross-source
 * interference rather than hiding it. For isolated, source-scoped retrieval use
 * `pnpm query --source <key>`.
 *
 * Writes a markdown summary to eval/results-YYYY-MM-DD[-<source>].md and prints
 * the headline numbers to stdout. No CI hook — operator-invoked only.
 */
import "@/env.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { getEnv } from "@/env.js";
import { wire } from "@/main.js";
import type { Retriever } from "@/contracts/index.js";
import {
  GoldenFileSchema,
  breakdownBySource,
  computeMetrics,
  firstMatchingRank,
  renderMarkdown,
  safePathname,
  type CaseResult,
  type Hit,
  type Metrics,
} from "./eval-metrics.js";

const TOP_K = 8;

interface Args {
  source: string | null;
}

function parseArgs(argv: string[]): Args {
  let source: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") {
      const v = argv[++i];
      if (v === undefined) {
        console.error("error: --source needs a value");
        process.exit(2);
      }
      source = v;
    }
  }
  return { source };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
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

  let cases = golden.cases;
  if (args.source) {
    cases = cases.filter((c) => c.source === args.source);
    if (cases.length === 0) {
      const known = [...new Set(golden.cases.map((c) => c.source))].sort();
      console.error(
        `error: no golden cases tagged source="${args.source}". known sources: ${known.join(", ")}`,
      );
      process.exit(2);
    }
  }

  const wiring = wire();
  try {
    const scopeLabel = args.source ? `source=${args.source}` : "whole-corpus";
    console.log(
      `running ${cases.length} case(s) [${scopeLabel}] with top_k=${TOP_K}, model=${env.EMBED_MODEL_ID}`,
    );
    const results: CaseResult[] = [];
    for (const c of cases) {
      const hits = await runOne(wiring.retriever, c.question);
      const matchedRank = firstMatchingRank(hits, c);
      results.push({ case: c, hits, matchedRank });
      const tick = matchedRank !== null ? "✓" : "✗";
      console.log(`  ${tick} ${c.id} [${c.source}] — rank=${matchedRank ?? "miss"}`);
    }

    const metrics = computeMetrics(results);
    printMetrics("metrics", metrics);

    const breakdown = breakdownBySource(results);
    if (breakdown.length > 1) {
      console.log("\nper-source breakdown:");
      for (const b of breakdown) {
        console.log(
          `  ${b.source.padEnd(20)} n=${b.metrics.cases}  r@3=${b.metrics.recall_at_3.toFixed(3)}  r@8=${b.metrics.recall_at_8.toFixed(3)}  mrr=${b.metrics.mrr.toFixed(3)}  p@1=${b.metrics.precision_at_1.toFixed(3)}`,
        );
      }
    }

    const date = new Date().toISOString().slice(0, 10);
    const suffix = args.source ? `-${args.source}` : "";
    const outPath = path.resolve(process.cwd(), `eval/results-${date}${suffix}.md`);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(
      outPath,
      renderMarkdown({
        modelId: env.EMBED_MODEL_ID,
        topK: TOP_K,
        scope: args.source,
        results,
        metrics,
        breakdown,
      }),
    );
    console.log(`\nwrote ${path.relative(process.cwd(), outPath)}`);
  } finally {
    await wiring.shutdown();
  }
}

function printMetrics(label: string, metrics: Metrics): void {
  console.log(`\n${label}:`);
  for (const [k, v] of Object.entries(metrics)) {
    console.log(`  ${k.padEnd(14)} ${typeof v === "number" ? v.toFixed(3) : v}`);
  }
}

/**
 * One golden question through the real Retrieval library (the same Retriever the
 * MCP server / `pnpm query` use), mapped to the eval Hit shape. `docUrl` is the
 * chunk's canonical URL; `docPath` its pathname — golden cases match on either.
 * Retrieval is whole-corpus (no source scope) even under `--source`.
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

main().catch((err: unknown) => {
  console.error("eval failed:", err);
  process.exit(1);
});
