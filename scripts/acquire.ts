/**
 * Acquire CLI — drives the Acquisition context (docs/architecture.md §10).
 *
 *   pnpm acquire --source starting-with-god
 *   pnpm acquire --all
 *   pnpm acquire --source thelife-fr --dry-run   # resolve + count URLs, fetch nothing
 *   pnpm acquire --source thelife-fr --resume    # skip already-staged URLs (resumable crawl)
 *
 * Thin entry point: parse args, wire the adapters (main.wire()), and hand off
 * to the shared engine in scripts/lib/acquire-core.ts (arg contract, source
 * resolution, per-source acquire loop). All adapter construction stays in
 * main.wire(); this script only chooses what to run. The production
 * counterpart (gated credentials) is scripts/acquire-production.ts.
 */
import "@/env.js";
import { wire } from "@/main.js";
import { knownKeys, parseArgs, resolveEntries, runAcquire } from "./lib/acquire-core.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.all && !args.source) {
    console.error(
      `usage: pnpm acquire --source <key> | --all [--dry-run] [--resume]\nknown sources: ${knownKeys()}`,
    );
    process.exit(1);
  }
  const entries = resolveEntries(args, "acquire");

  const wiring = wire();
  try {
    await runAcquire(
      { fetcherFor: wiring.fetcherFor, store: wiring.rawDocumentStore },
      entries,
      args,
    );
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("acquire failed:", err);
  process.exit(1);
});
