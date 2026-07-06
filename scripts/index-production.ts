/**
 * Interactive production index — drives the Ingestion context (architecture
 * §10) against the PRODUCTION database. The safe variant of `pnpm index`:
 * credentials are prompted interactively and never read from .env / .env.local.
 * Embeddings spend real money on the prompted OPENROUTER_API_KEY — banner says
 * so before any credential is entered. See docs/ops/prod-ingest.md.
 *
 *   pnpm index:production --source <key>
 *   pnpm index:production --source <key> --limit 10
 *   pnpm index:production --source <key> --force       # re-embed (resumable — skips
 *                                                      #   docs already on the target model)
 *   pnpm index:production --source <key> --force-all   # re-embed EVERY doc (chunker change)
 */
import {
  promptProductionCredentials,
  installCreds,
  extractProdRunFlags,
} from "./lib/prompt-prod-creds.js";

interface Args {
  source?: string;
  limit?: number;
  force: boolean;
  forceAll: boolean;
}

function parseArgs(argv: string[]): Args {
  const s = argv.indexOf("--source");
  const l = argv.indexOf("--limit");
  let limit: number | undefined;
  if (l >= 0) {
    const n = Number(argv[l + 1]);
    if (!Number.isInteger(n) || n <= 0) {
      console.error(
        `error: --limit must be a positive integer, got "${argv[l + 1] ?? ""}"`,
      );
      process.exit(2);
    }
    limit = n;
  }
  const forceAll = argv.includes("--force-all");
  return {
    source: s >= 0 ? argv[s + 1] : undefined,
    limit,
    force: argv.includes("--force") || forceAll, // --force-all implies --force
    forceAll,
  };
}

/** One-line description of the re-embed mode for the banner + summary. */
function reembedMode(args: Args): string {
  if (args.forceAll) return "force-all (re-embed every doc, incl. same-model)";
  if (args.force)
    return "force (resumable — skip docs already on the target model)";
  return "no (incremental — pending rows only)";
}

async function main(): Promise<void> {
  const { flags: runFlags, rest, error } = extractProdRunFlags(
    process.argv.slice(2),
  );
  if (error) {
    console.error(`error: ${error}`);
    process.exit(2);
  }
  const args = parseArgs(rest);
  const scope = args.source ? `--source ${args.source}` : "all pending sources";

  const creds = await promptProductionCredentials({
    operation: "index",
    intent: [
      "",
      "This will drain pending raw_documents → normalize → chunk → EMBED →",
      "write documents/chunks/chunk_embeddings into the PRODUCTION corpus.",
      `Scope: ${scope}${args.limit ? `, limit ${args.limit}` : ""}`,
      `Re-embed: ${reembedMode(args)}`,
      "",
      "Embeddings cost real money on the prompted OPENROUTER_API_KEY.",
    ],
    summary: () => [
      `  scope:           ${scope}`,
      `  limit:           ${args.limit ?? "(none)"}`,
      `  re-embed:        ${reembedMode(args)}`,
    ],
    writeOp: true, // embeds + writes prod corpus — non-interactive needs JFRAG_ALLOW_PROD_WRITE=1
    runFlags,
  });
  if (!creds) process.exit(0);

  installCreds(creds);

  // Dynamic imports — after installCreds() so the env loader sees our values
  // first. See scripts/acquire-production.ts for the same rationale.
  const { wire } = await import("@/main.js");
  const { ingestPending } = await import("@/ingestion/index.js");

  const wiring = wire();
  try {
    console.log(
      `\n▶ indexing pending raw_documents` +
        (args.source ? ` for ${args.source}` : " (all sources)") +
        (args.limit != null ? `, limit ${args.limit}` : "") +
        (args.forceAll ? ", force-all" : args.force ? ", force" : ""),
    );
    const summary = await ingestPending(
      {
        reader: wiring.rawDocumentReader,
        embedder: wiring.embedder,
        writer: wiring.corpusWriteStore,
      },
      {
        sourceKey: args.source,
        limit: args.limit,
        force: args.force,
        forceAll: args.forceAll,
        onProgress: (line) => console.log(line),
      },
    );
    console.log(
      `✔ ingested ${summary.attempted} pending row(s): ` +
        `${summary.inserted} inserted, ${summary.updated} updated, ${summary.unchanged} unchanged, ` +
        `${summary.skipped} skipped, ${summary.unknownSource} unknown-source · ` +
        `${summary.chunksWritten} chunks written`,
    );
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("index:production failed:", err);
  process.exit(1);
});
