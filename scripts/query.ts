/**
 * Ad-hoc query CLI — drives the Retrieval context for a single question and
 * prints the ranked, cited hits. The operator-facing way to spot-check the
 * corpus (docs/architecture.md §3); the eval harness (scripts/eval.ts) runs the
 * same Retriever over golden cases.
 *
 *   pnpm query "how do I become a Christian?"
 *   pnpm query --top-k 8 --min-score 0.5 "who is Jesus?"
 *   pnpm query --source starting-with-god "what is sin?"
 *
 * Thin entry point: parse args, wire the adapters (main.wire()), run one search
 * through the injected Retriever, print, shut the pool down. No adapter is
 * constructed here.
 */
import "@/env.js";
import { wire } from "@/main.js";
import type { RankedResult, RetrievalPolicy } from "@/contracts/index.js";

interface Args {
  query: string;
  policy: RetrievalPolicy;
}

function parseArgs(argv: string[]): Args {
  const policy: RetrievalPolicy = {};
  const free: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--top-k") policy.topK = Number(argv[++i]);
    else if (a === "--min-score") policy.minScore = Number(argv[++i]);
    else if (a === "--source") policy.allowedSourceKeys = [argv[++i]];
    else if (a === "--prefer") policy.preferSourceKey = argv[++i];
    else if (a === "--language") policy.language = argv[++i];
    else if (a === "--category") policy.category = argv[++i];
    else free.push(a);
  }
  return { query: free.join(" ").trim(), policy };
}

function printHit(rank: number, hit: RankedResult): void {
  const snippet = hit.text.replace(/\s+/g, " ").trim().slice(0, 240);
  console.log(
    `\n${rank}. [${hit.score.toFixed(3)}] ${hit.citation.title ?? "(untitled)"}` +
      ` — ${hit.citation.sourceName}\n   ${hit.citation.url}\n   ${snippet}…`,
  );
}

async function main(): Promise<void> {
  const { query, policy } = parseArgs(process.argv.slice(2));
  if (!query) {
    console.error('usage: pnpm query [--top-k N] [--min-score S] [--source KEY] "<question>"');
    process.exit(2);
  }

  const wiring = wire();
  try {
    console.log(
      `\n▶ "${query}"  (topK=${policy.topK ?? 5}, minScore=${policy.minScore ?? 0.37}` +
        (policy.allowedSourceKeys ? `, source=${policy.allowedSourceKeys.join(",")}` : "") +
        ")",
    );
    const hits = await wiring.retriever.search(query, policy);
    if (hits.length === 0) {
      console.log("\n(no hits above the score cutoff)");
    } else {
      hits.forEach((hit, i) => printHit(i + 1, hit));
    }
    console.log(`\n✔ ${hits.length} hit(s)`);
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("query failed:", err);
  process.exit(1);
});
