/**
 * acquire-core — the engine shared by the local (`scripts/acquire.ts`) and
 * production (`scripts/acquire-production.ts`) acquire runners: the CLI arg
 * contract, `--source`/`--all` resolution against the registry, and the
 * per-source loop (plan line → acquireSource → summary report). Env-free — it
 * imports only the registry and the Acquisition context — so the production
 * runner can import it statically; only the env-reading `@/main` is deferred
 * there until after installCreds() (same split as language-sweep-core).
 */
import { acquireSource, type AcquireSummary } from "@/acquisition/index.js";
import { allSources, getSource, type SourceEntry } from "@/registry/index.js";
import type { Fetcher, RawDocumentStore } from "@/contracts/index.js";

export interface AcquireArgs {
  all: boolean;
  source?: string;
  dryRun: boolean;
  resume: boolean;
}

export function parseArgs(argv: string[]): AcquireArgs {
  const i = argv.indexOf("--source");
  return {
    all: argv.includes("--all"),
    source: i >= 0 ? argv[i + 1] : undefined,
    dryRun: argv.includes("--dry-run"),
    resume: argv.includes("--resume"),
  };
}

/** The registry's source keys, for usage/error messages. */
export function knownKeys(): string {
  return allSources()
    .map((s) => s.key)
    .join(", ");
}

/**
 * Resolve `--all` / `--source <key>` to registry entries. On an unknown key:
 * print the known-source list (prefixed with the CLI's name) and exit 1 —
 * before any wiring, so a typo never opens a DB pool.
 */
export function resolveEntries(args: AcquireArgs, cliName: string): readonly SourceEntry[] {
  if (args.all) return allSources();
  const entry = getSource(args.source!);
  if (!entry) {
    console.error(`${cliName}: unknown source '${args.source}'. Known: ${knownKeys()}`);
    process.exit(1);
  }
  return [entry];
}

/** The ports the loop needs — supplied from `wire()` by each runner. */
export interface AcquireDeps {
  fetcherFor(entry: SourceEntry): Fetcher;
  store: RawDocumentStore;
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

/**
 * Acquire each source in turn: announce the plan (discovery shape, pacing,
 * mode), run acquireSource with the source's own Fetcher (per its declared
 * fetch strategy, ADR-0012), and report the summary line.
 */
export async function runAcquire(
  deps: AcquireDeps,
  entries: readonly SourceEntry[],
  opts: { dryRun: boolean; resume: boolean },
): Promise<void> {
  for (const entry of entries) {
    const plan = entry.crawl.sitemaps?.length
      ? `discovery via ${entry.crawl.sitemaps.length} sitemap(s)`
      : `${(entry.crawl.seedPaths ?? []).length} seed pages`;
    const mode = [opts.dryRun ? "DRY RUN" : null, opts.resume ? "resume" : null]
      .filter(Boolean)
      .join(" + ");
    console.log(
      `\n▶ acquiring ${entry.name} (${entry.key}) — ${plan}, ${entry.crawl.requestDelayMs}ms delay, maxPages ${entry.crawl.maxPages}${mode ? ` [${mode}]` : ""}`,
    );
    const summary = await acquireSource(
      { fetcher: deps.fetcherFor(entry), store: deps.store },
      entry,
      { onProgress: (line) => console.log(line), dryRun: opts.dryRun, resume: opts.resume },
    );
    report(summary, opts.dryRun);
  }
}
