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
 * The engine is the shared scripts/lib/acquire-core.ts (imported statically —
 * it reads no env); the env-reading `@/main` is dynamic-imported AFTER the
 * credential prompt + installCreds() so the env loader in src/env.ts (which
 * runs on first import) cannot prefer a stale .env value over what we prompted.
 */
import {
  promptProductionCredentials,
  installCreds,
  extractProdRunFlags,
} from "./lib/prompt-prod-creds.js";
import { parseArgs, resolveEntries, runAcquire } from "./lib/acquire-core.js";

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
  // Registry-only, env-free — an unknown key fails here, before the prompt.
  const entries = resolveEntries(args, "acquire:production");
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

  // Dynamic import — AFTER installCreds() so @/env.js sees our prompted values
  // first. The loader is first-write-wins, so a stale DATABASE_URL in
  // .env / .env.local cannot overwrite us.
  const { wire } = await import("@/main.js");

  const wiring = wire();
  try {
    await runAcquire(
      { fetcherFor: wiring.fetcherFor, store: wiring.rawDocumentStore },
      entries,
      { dryRun: args.dryRun, resume: args.resume },
    );
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("acquire:production failed:", err);
  process.exit(1);
});
