/**
 * Interactive production retrieval probe — drives the Retrieval context
 * against the PRODUCTION database. The safe variant of `pnpm query`, intended
 * as a smoke test immediately after `acquire:production` + `index:production`
 * on a new source: scope a query to the source you just ingested and eyeball
 * that the results look right. Read-only; the OPENROUTER_API_KEY is used only
 * to embed the query. See docs/ops/prod-ingest.md.
 *
 *   pnpm retrieve:production --source <key> "how do I become a Christian?"
 *   pnpm retrieve:production --source <key> --top-k 8 "what is sin?"
 *   pnpm retrieve:production "<question>"                    # whole corpus
 */
import {
  promptProductionCredentials,
  installCreds,
  extractProdRunFlags,
} from "./lib/prompt-prod-creds.js";

const USAGE =
  'usage: pnpm retrieve:production [--source <key>] [--top-k N] [--min-score S] [--prefer <key>] [--non-interactive [--expect-host <substr>]] "<question>"';

function die(msg: string): never {
  console.error(`error: ${msg}\n${USAGE}`);
  process.exit(2);
}

interface ParsedPolicy {
  topK?: number;
  minScore?: number;
  allowedSourceKeys?: string[];
  preferSourceKey?: string;
}

function parseArgs(argv: string[]): { query: string; policy: ParsedPolicy } {
  const policy: ParsedPolicy = {};
  const free: string[] = [];
  const val = (flag: string, i: number): string => {
    const v = argv[i];
    if (v === undefined) die(`${flag} needs a value`);
    return v;
  };
  // --top-k is a result limit: only a positive integer makes sense. Reject 0,
  // negatives, and fractions at the boundary rather than relying on the engine
  // to silently coerce them.
  const positiveInt = (flag: string, raw: string): number => {
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) {
      die(`${flag} must be a positive integer, got "${raw}"`);
    }
    return n;
  };
  // --min-score is a cosine cutoff: any finite number (typically 0..1).
  const finiteNum = (flag: string, raw: string): number => {
    const n = Number(raw);
    if (!Number.isFinite(n)) die(`${flag} must be a number, got "${raw}"`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--top-k") policy.topK = positiveInt(a, val(a, ++i));
    else if (a === "--min-score") policy.minScore = finiteNum(a, val(a, ++i));
    else if (a === "--source") policy.allowedSourceKeys = [val(a, ++i)];
    else if (a === "--prefer") policy.preferSourceKey = val(a, ++i);
    else free.push(a);
  }
  return { query: free.join(" ").trim(), policy };
}

function filterDescription(policy: ParsedPolicy): string {
  const parts: string[] = [];
  parts.push(
    policy.allowedSourceKeys
      ? `source=${policy.allowedSourceKeys.join(",")}`
      : "whole corpus",
  );
  parts.push(`topK=${policy.topK ?? 5}`);
  parts.push(`minScore=${policy.minScore ?? 0.37}`);
  if (policy.preferSourceKey) parts.push(`prefer=${policy.preferSourceKey}`);
  return parts.join(", ");
}

async function main(): Promise<void> {
  // Extract shared flags BEFORE parseArgs — its free-arg collection would
  // otherwise swallow --non-interactive / -y into the query text.
  const { flags: runFlags, rest, error } = extractProdRunFlags(
    process.argv.slice(2),
  );
  if (error) die(error);
  const { query, policy } = parseArgs(rest);
  if (!query) die("a question is required (the last positional argument)");
  const filterDesc = filterDescription(policy);

  const creds = await promptProductionCredentials({
    operation: "retrieve",
    intent: [
      "",
      "This will embed the query (via the prompted OPENROUTER_API_KEY) and",
      "search the PRODUCTION corpus. Read-only — no writes.",
      `Query:  "${query}"`,
      `Filter: ${filterDesc}`,
    ],
    summary: () => [
      `  query:           "${query}"`,
      `  filter:          ${filterDesc}`,
    ],
    runFlags, // read-only — no writeOp gate
  });
  if (!creds) process.exit(0);

  installCreds(creds);

  // Dynamic imports — after installCreds(). See acquire-production.ts.
  const { wire } = await import("@/main.js");
  const wiring = wire();
  try {
    console.log(`\n▶ "${query}"  (${filterDesc})`);
    const hits = await wiring.retriever.search(query, policy);
    if (hits.length === 0) {
      console.log("\n(no hits above the score cutoff)");
    } else {
      hits.forEach((hit, i) => {
        const snippet = hit.text.replace(/\s+/g, " ").trim().slice(0, 240);
        console.log(
          `\n${i + 1}. [${hit.score.toFixed(3)}] ${
            hit.citation.title ?? "(untitled)"
          } — ${hit.citation.sourceName}\n   ${hit.citation.url}\n   ${snippet}…`,
        );
      });
    }
    console.log(`\n✔ ${hits.length} hit(s)`);
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("retrieve:production failed:", err);
  process.exit(1);
});
