/**
 * Index CLI — drives the Ingestion context (docs/architecture.md §10).
 *
 *   pnpm index                              # drain all pending raw_documents
 *   pnpm index --source starting-with-god   # only this source's pending rows
 *   pnpm index --limit 10                    # cap rows this run
 *   pnpm index --force                       # full re-index: re-drain already-ingested
 *                                            #   rows AND re-embed (e.g. model change)
 *
 * Thin entry point: parse args, wire the adapters (main.wire()), drain
 * `raw_documents` (ingested_at IS NULL) through ingestPending (normalize → chunk
 * → embed → idempotent replaceDocument → mark consumed), report, shut the pool
 * down. All adapter construction stays in main.wire(); this only chooses scope.
 */
import "@/env.js";
import { wire } from "@/main.js";
import { ingestPending, type IngestSummary } from "@/ingestion/index.js";

interface Args {
  source?: string;
  limit?: number;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const s = argv.indexOf("--source");
  const l = argv.indexOf("--limit");
  let limit: number | undefined;
  if (l >= 0) {
    // Must be a positive integer: 0 would silently drain nothing, a negative or
    // fractional value would build an invalid SQL LIMIT and throw deep in the store.
    const n = Number(argv[l + 1]);
    if (!Number.isInteger(n) || n <= 0) {
      console.error(`error: --limit must be a positive integer, got "${argv[l + 1] ?? ""}"`);
      process.exit(2);
    }
    limit = n;
  }
  return {
    source: s >= 0 ? argv[s + 1] : undefined,
    limit,
    force: argv.includes("--force"),
  };
}

function report(s: IngestSummary): void {
  console.log(
    `✔ ingested ${s.attempted} pending row(s): ` +
      `${s.inserted} inserted, ${s.updated} updated, ${s.unchanged} unchanged, ` +
      `${s.skipped} skipped, ${s.unknownSource} unknown-source · ` +
      `${s.chunksWritten} chunks written`,
  );
}

async function main(): Promise<void> {
  const { source, limit, force } = parseArgs(process.argv.slice(2));

  const wiring = wire();
  try {
    console.log(
      `\n▶ indexing pending raw_documents` +
        (source ? ` for ${source}` : " (all sources)") +
        (limit != null ? `, limit ${limit}` : "") +
        (force ? ", force" : ""),
    );
    const summary = await ingestPending(
      {
        reader: wiring.rawDocumentReader,
        embedder: wiring.embedder,
        writer: wiring.corpusWriteStore,
      },
      { sourceKey: source, limit, force, onProgress: (line) => console.log(line) },
    );
    report(summary);
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("index failed:", err);
  process.exit(1);
});
