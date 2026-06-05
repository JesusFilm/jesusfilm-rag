/**
 * Interactive production eval — runs the golden case suite
 * (eval/qa-golden.yaml) against the PRODUCTION corpus. The safe variant of
 * `pnpm eval`; intended as the certification step after acquire/index/retrieve
 * on a freshly-promoted source: did the slice's quality claim actually carry
 * over to prod, with real numbers? Credentials are prompted interactively and
 * never read from .env / .env.local. See docs/ops/prod-ingest.md.
 *
 *   pnpm eval:production --source <key>       # scope to one source (typical)
 *   pnpm eval:production                       # whole-corpus prod eval
 *
 * Writes the same eval/results-YYYY-MM-DD[-<source>].md markdown summary as
 * `pnpm eval`. The engineer can choose to commit that file alongside their
 * post-prod-ingest docs PR to record the prod-corpus numbers.
 */
import {
  promptProductionCredentials,
  installCreds,
} from "./lib/prompt-prod-creds.js";

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
  const scope = args.source
    ? `--source ${args.source} (cases whose relevant set includes this source)`
    : "whole-corpus (all golden cases)";

  const creds = await promptProductionCredentials({
    operation: "eval",
    intent: [
      "",
      "This will embed each golden query (via the prompted OPENROUTER_API_KEY)",
      "and run it against the PRODUCTION retriever. Read-only — no corpus writes.",
      `Scope: ${scope}`,
      "",
      "Output: prints headline recall/MRR/coverage to stdout and writes",
      "eval/results-YYYY-MM-DD[-<source>].md. Cost is one query embedding per",
      "case (cents, not dollars).",
    ],
    summary: () => [`  scope:           ${scope}`],
  });
  if (!creds) process.exit(0);

  installCreds(creds);

  // Dynamic imports — after installCreds() so the env loader sees our prompted
  // values first. See scripts/acquire-production.ts for the same rationale.
  const { readFile, writeFile, mkdir } = await import("node:fs/promises");
  const path = (await import("node:path")).default;
  const YAML = (await import("yaml")).default;
  const { getEnv } = await import("@/env.js");
  const { wire } = await import("@/main.js");
  const {
    GoldenFileSchema,
    allRelevantPaths,
    computeMetrics,
    coverageBySource,
    firstMatchingRank,
    renderMarkdown,
    returnedRelevant,
    safePathname,
  } = await import("./eval-metrics.js");
  type Hit = import("./eval-metrics.js").Hit;
  type CaseResult = import("./eval-metrics.js").CaseResult;

  const TOP_K = 10;
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
    cases = cases.filter((c) =>
      Object.prototype.hasOwnProperty.call(c.relevant, args.source!),
    );
    if (cases.length === 0) {
      const known = [
        ...new Set(golden.cases.flatMap((c) => Object.keys(c.relevant))),
      ].sort();
      console.error(
        `error: no golden cases with source="${args.source}" in their relevant set. ` +
          `known sources: ${known.join(", ")}`,
      );
      process.exit(2);
    }
  }

  const wiring = wire();
  try {
    const scopeLabel = args.source ? `source=${args.source}` : "whole-corpus";
    console.log(
      `\n▶ running ${cases.length} case(s) [${scopeLabel}] with top_k=${TOP_K}, model=${env.EMBED_MODEL_ID}`,
    );
    const results: CaseResult[] = [];
    for (const c of cases) {
      const ranked = await wiring.retriever.search(c.question, { topK: TOP_K });
      const hits: Hit[] = ranked.map((r) => ({
        chunkId: r.chunkId,
        docPath: safePathname(r.citation.url),
        docUrl: r.citation.url,
        score: r.score,
      }));
      const matchedRank = firstMatchingRank(hits, c);
      const returned = returnedRelevant(hits, c);
      results.push({ case: c, hits, matchedRank, returnedRelevant: returned });
      const tick = matchedRank !== null ? "✓" : "✗";
      const total = allRelevantPaths(c).length;
      console.log(
        `  ${tick} ${c.id} — rank=${matchedRank ?? "miss"} cov=${returned.length}/${total}`,
      );
    }

    const metrics = computeMetrics(results);
    console.log("\nmetrics:");
    for (const [k, v] of Object.entries(metrics)) {
      console.log(`  ${k.padEnd(14)} ${typeof v === "number" ? v.toFixed(3) : v}`);
    }

    console.log("\nper-source coverage:");
    for (const s of coverageBySource(results)) {
      console.log(
        `  ${s.source.padEnd(20)} n=${s.cases}  recall=${s.recall.toFixed(3)}  coverage=${s.coverage.toFixed(3)}`,
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const suffix = args.source ? `-${args.source}` : "";
    const outPath = path.resolve(
      process.cwd(),
      `eval/results-${date}${suffix}.md`,
    );
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

main().catch((err: unknown) => {
  console.error("eval:production failed:", err);
  process.exit(1);
});
