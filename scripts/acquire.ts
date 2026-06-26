/**
 * Acquire CLI — drives the Acquisition context (docs/architecture.md §10).
 *
 *   pnpm acquire --source starting-with-god
 *   pnpm acquire --all
 *   pnpm acquire --source thelife-fr --dry-run   # resolve + count URLs, fetch nothing
 *   pnpm acquire --source thelife-fr --resume    # skip already-staged URLs (resumable crawl)
 *
 * Thin entry point: parse args, wire the adapters (main.wire()), look the
 * source(s) up in the registry, run acquireSource (fetch + extract → stage
 * RawDocuments in raw_documents), report, and shut the DB pool down. All adapter
 * construction stays in main.wire(); this script only chooses what to run.
 */
import "@/env.js";
import { wire } from "@/main.js";
import { acquireSource, type AcquireSummary } from "@/acquisition/index.js";
import { allSources, getSource, type SourceEntry } from "@/registry/index.js";

function knownKeys(): string {
  return allSources()
    .map((s) => s.key)
    .join(", ");
}

interface Args {
  all: boolean;
  source?: string;
  dryRun: boolean;
  resume: boolean;
}

function parseArgs(argv: string[]): Args {
  const i = argv.indexOf("--source");
  return {
    all: argv.includes("--all"),
    source: i >= 0 ? argv[i + 1] : undefined,
    dryRun: argv.includes("--dry-run"),
    resume: argv.includes("--resume"),
  };
}

function report(s: AcquireSummary, dryRun: boolean): void {
  if (dryRun) {
    console.log(`✔ ${s.sourceKey}: DRY RUN — ${s.resolved} URL(s) resolved (nothing fetched)`);
    return;
  }
  const skips =
    Object.entries(s.skipped)
      .filter(([, n]) => n > 0)
      .map(([reason, n]) => `${reason}:${n}`)
      .join(", ") || "none";
  console.log(`✔ ${s.sourceKey}: staged ${s.written}/${s.attempted} · skipped (${skips})`);
}

async function main(): Promise<void> {
  const { all, source, dryRun, resume } = parseArgs(process.argv.slice(2));

  let entries: readonly SourceEntry[];
  if (all) {
    entries = allSources();
  } else if (source) {
    const entry = getSource(source);
    if (!entry) {
      console.error(`acquire: unknown source '${source}'. Known: ${knownKeys()}`);
      process.exit(1);
    }
    entries = [entry];
  } else {
    console.error(
      `usage: pnpm acquire --source <key> | --all [--dry-run] [--resume]\nknown sources: ${knownKeys()}`,
    );
    process.exit(1);
  }

  const wiring = wire();
  try {
    for (const entry of entries) {
      const plan = entry.crawl.sitemaps?.length
        ? `discovery via ${entry.crawl.sitemaps.length} sitemap(s)`
        : `${(entry.crawl.seedPaths ?? []).length} seed pages`;
      const mode = [dryRun ? "DRY RUN" : null, resume ? "resume" : null]
        .filter(Boolean)
        .join(" + ");
      console.log(
        `\n▶ acquiring ${entry.name} (${entry.key}) — ${plan}, ${entry.crawl.requestDelayMs}ms delay, maxPages ${entry.crawl.maxPages}${mode ? ` [${mode}]` : ""}`,
      );
      const summary = await acquireSource(
        { fetcher: wiring.fetcher, store: wiring.rawDocumentStore },
        entry,
        { onProgress: (line) => console.log(line), dryRun, resume },
      );
      report(summary, dryRun);
    }
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("acquire failed:", err);
  process.exit(1);
});
