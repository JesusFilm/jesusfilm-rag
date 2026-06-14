/**
 * Interactive production acquire — drives the Acquisition context
 * (architecture §10) against the PRODUCTION database. The safe variant of
 * `pnpm acquire`: credentials are prompted interactively and never read from
 * .env / .env.local. See docs/ops/prod-ingest.md.
 *
 *   pnpm acquire:production --source <key>
 *   pnpm acquire:production --all
 *
 * Mirrors scripts/acquire.ts's body, but defers all @/* imports until AFTER
 * the credential prompt + installCreds() so the env loader in src/env.ts (which
 * runs on first import) cannot prefer a stale .env value over what we prompted.
 */
import {
  promptProductionCredentials,
  installCreds,
} from "./lib/prompt-prod-creds.js";

function parseArgs(argv: string[]): { all: boolean; source?: string } {
  const all = argv.includes("--all");
  const i = argv.indexOf("--source");
  return { all, source: i >= 0 ? argv[i + 1] : undefined };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.all && !args.source) {
    console.error(
      "usage: pnpm acquire:production --source <key> | --all",
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
      "This will crawl + stage rows into the PRODUCTION raw_documents table.",
      `Scope: ${scope}`,
    ],
    summary: () => [`  scope:           ${scope}`],
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
        { fetcher: wiring.fetcher, store: wiring.rawDocumentStore },
        entry,
        { onProgress: (line) => console.log(line) },
      );
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
