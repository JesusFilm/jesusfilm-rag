/**
 * Interactive production acquire — drives the Acquisition context
 * (architecture §10) against the PRODUCTION database. The safe variant of
 * `pnpm acquire`: credentials are prompted interactively and never read from
 * .env / .env.local. See docs/ops/prod-ingest.md.
 *
 *   pnpm acquire:production --source <key>
 *   pnpm acquire:production --all
 *   pnpm acquire:production --source thelife-fr --resume    # skip already-staged (resumable)
 *   pnpm acquire:production --source thelife-fr --dry-run   # resolve + count only, no writes
 *
 * Mirrors scripts/acquire.ts's body, but defers all @/* imports until AFTER
 * the credential prompt + installCreds() so the env loader in src/env.ts (which
 * runs on first import) cannot prefer a stale .env value over what we prompted.
 */
import {
  promptProductionCredentials,
  installCreds,
  extractProdRunFlags,
} from "./lib/prompt-prod-creds.js";

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

async function main(): Promise<void> {
  const { flags: runFlags, rest, error } = extractProdRunFlags(
    process.argv.slice(2),
  );
  if (error) {
    console.error(`error: ${error}`);
    process.exit(2);
  }
  const args = parseArgs(rest);
  if (!args.all && !args.source) {
    console.error(
      "usage: pnpm acquire:production --source <key> | --all [--dry-run] [--resume] " +
        "[--non-interactive [--expect-host <substr>]]",
    );
    process.exit(2);
  }
  const scope = args.all
    ? "--all (every registered source)"
    : `--source ${args.source}`;

  const creds = await promptProductionCredentials({
    operation: "acquire",
    intent: [
      "",
      args.dryRun
        ? "DRY RUN — resolves the URL list against PRODUCTION (reads only); stages nothing."
        : "This will crawl + stage rows into the PRODUCTION raw_documents table.",
      `Scope: ${scope}${args.resume ? " (resume: skip already-staged)" : ""}`,
    ],
    summary: () => [
      `  scope:           ${scope}`,
      `  dry-run:         ${args.dryRun}`,
      `  resume:          ${args.resume}`,
    ],
    writeOp: true, // stages rows into prod — non-interactive needs JFRAG_ALLOW_PROD_WRITE=1
    runFlags,
  });
  if (!creds) process.exit(0);

  installCreds(creds);

  // Dynamic imports — must happen AFTER installCreds() so @/env.js sees our
  // prompted values first. The loader is first-write-wins, so a stale
  // DATABASE_URL in .env / .env.local cannot overwrite us.
  const { wire } = await import("@/main.js");
  const { acquireSource } = await import("@/acquisition/index.js");
  const { allSources, getSource } = await import("@/registry/index.js");

  let entries;
  if (args.all) {
    entries = allSources();
  } else {
    const entry = getSource(args.source!);
    if (!entry) {
      const known = allSources()
        .map((s) => s.key)
        .join(", ");
      console.error(
        `acquire:production: unknown source '${args.source}'. Known: ${known}`,
      );
      process.exit(1);
    }
    entries = [entry];
  }

  const wiring = wire();
  try {
    for (const entry of entries) {
      const plan = entry.crawl.sitemaps?.length
        ? `discovery via ${entry.crawl.sitemaps.length} sitemap(s)`
        : `${(entry.crawl.seedPaths ?? []).length} seed pages`;
      console.log(
        `\n▶ acquiring ${entry.name} (${entry.key}) — ${plan}, ` +
          `${entry.crawl.requestDelayMs}ms delay, maxPages ${entry.crawl.maxPages}`,
      );
      const summary = await acquireSource(
        { fetcher: wiring.fetcherFor(entry), store: wiring.rawDocumentStore },
        entry,
        { onProgress: (line) => console.log(line), dryRun: args.dryRun, resume: args.resume },
      );
      if (args.dryRun) {
        console.log(
          `✔ ${summary.sourceKey}: DRY RUN — ${summary.resolved} URL(s) resolved (nothing fetched)`,
        );
        continue;
      }
      const skips =
        Object.entries(summary.skipped)
          .filter(([, n]) => n > 0)
          .map(([reason, n]) => `${reason}:${n}`)
          .join(", ") || "none";
      console.log(
        `✔ ${summary.sourceKey}: staged ${summary.written}/${summary.attempted} · skipped (${skips})`,
      );
    }
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("acquire:production failed:", err);
  process.exit(1);
});
