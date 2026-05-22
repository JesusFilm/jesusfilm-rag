/**
 * Index CLI — drives the Ingestion context (docs/architecture.md §10).
 *
 *   pnpm index                              # drain all pending raw_documents
 *   pnpm index --source starting-with-god   # only this source's pending rows
 *   pnpm index --limit 10                    # cap rows this run
 *   pnpm index --force                       # re-chunk/re-embed even if unchanged
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
  const limit = l >= 0 ? Number(argv[l + 1]) : undefined;
  return {
    source: s >= 0 ? argv[s + 1] : undefined,
    limit: limit != null && Number.isFinite(limit) ? limit : undefined,
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
