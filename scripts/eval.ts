/**
 * On-demand eval runner.
 *
 *   pnpm eval                          # whole corpus + per-source coverage
 *   pnpm eval --source cru-10-basic-steps   # cases whose relevant set includes it
 *
 * Reads eval/qa-golden.yaml, runs each question through the same Retriever the
 * MCP server / `pnpm query` use (top_k=10), and reports recall@3 / recall@10 /
 * coverage / MRR / precision@1, plus a per-source coverage breakdown. Each case
 * is a source-agnostic question + a `relevant` map of {sourceKey: [paths]} — see
 * docs/eval-approach.md for the model (recall + coverage lead; ranking is the
 * consumer's job, so P@1/MRR are secondary).
 *
 * `--source <key>` filters to the cases whose relevant set includes that source,
 * but STILL retrieves against the whole corpus — the realistic, competitive
 * condition. For isolated, source-scoped retrieval use `pnpm query --source`.
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
  computeMetrics,
  coverageBySource,
  firstMatchingRank,
  renderMarkdown,
  returnedRelevant,
  safePathname,
  type CaseResult,
  type Hit,
  type Metrics,
} from "./eval-metrics.js";

const TOP_K = 10;

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
    console.log("eval/qa-golden.yaml has no cases — nothing to run.");
    return;
  }

  let cases = golden.cases;
  if (args.source) {
    cases = cases.filter((c) => args.source! in c.relevant);
    if (cases.length === 0) {
      const known = [
        ...new Set(golden.cases.flatMap((c) => Object.keys(c.relevant))),
      ].sort();
      console.error(
        `error: no golden cases with source="${args.source}" in their relevant set. known sources: ${known.join(", ")}`,
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
      const returned = returnedRelevant(hits, c);
      results.push({ case: c, hits, matchedRank, returnedRelevant: returned });
      const tick = matchedRank !== null ? "✓" : "✗";
      const total = Object.values(c.relevant).flat().length;
      console.log(
        `  ${tick} ${c.id} — rank=${matchedRank ?? "miss"} cov=${returned.length}/${total}`,
      );
    }

    const metrics = computeMetrics(results);
    printMetrics("metrics", metrics);

    console.log("\nper-source coverage:");
    for (const s of coverageBySource(results)) {
      console.log(
        `  ${s.source.padEnd(20)} n=${s.cases}  recall=${s.recall.toFixed(3)}  coverage=${s.coverage.toFixed(3)}`,
      );
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
        perSource: coverageBySource(results),
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
 * MCP server / `pnpm query` use), mapped to the eval Hit shape. `docPath` is the
 * citation URL's pathname — relevant sets match on it. Retrieval is whole-corpus
 * (no source scope) even under `--source`.
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
