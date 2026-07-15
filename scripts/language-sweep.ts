/**
 * language-sweep — the LOCAL runner for the #73/#84 corpus language-correction
 * sweep. Thin wrapper: parse argv, wire the DB + LLM `LanguageDetector` from the
 * local env (via `wire()`), and hand off to the shared engine in
 * `scripts/lib/language-sweep-core.ts`. The production counterpart (gated
 * credentials, Doppler) is `scripts/language-sweep-production.ts`.
 *
 * Detection is the OpenRouter LLM (default Gemini Flash Lite) — accurate
 * regardless of length, unlike the pure tinyld ingest detector — so the sweep
 * corrects short foreign pages that were mislabelled (#84). It re-derives
 * `documents.language` by replaying the real ingest text path
 * (`cleanText(raw_documents.raw_content)`); it is label-only, dry-run by default,
 * and one-command revertible. See docs/ops/language-sweep.md.
 *
 * Usage:
 *   pnpm lang:sweep --source <key> [--mode full|blanks] [--apply]
 *   pnpm lang:sweep --all         [--mode full|blanks] [--apply]
 *   pnpm lang:sweep --revert <changelog.jsonl> [--apply]
 *
 * `parseArgs` and the arg types are re-exported for the unit tests and the
 * production runner; the engine (`runSweep`) and the label decision
 * (`decideSweep` / `resolveFromLlm`) are unit-tested separately.
 */
import { wire } from "@/main.js";
import { getDb } from "@/db/index.js";
import { parseArgs, runSweep, runRevertCore } from "./lib/language-sweep-core.js";

// Re-export the pure arg contract + types (unit tests + production runner).
export { parseArgs, OUT_DIR_ENV } from "./lib/language-sweep-core.js";
export type {
  SweepArgs,
  RevertArgs,
  ParsedArgs,
  SweepMode,
  SweepDeps,
} from "./lib/language-sweep-core.js";

const HELP = `language-sweep — LLM re-derivation of documents.language (issues #73/#84)

  pnpm lang:sweep --source <key> [--mode full|blanks] [--apply]
  pnpm lang:sweep --all         [--mode full|blanks] [--apply]
  pnpm lang:sweep --revert <changelog.jsonl> [--apply]

  --source <key>       one registered source        --all             every source
  --mode full          re-scan all (default)         --mode blanks     only null rows
  --apply              write changes (default: dry-run)
  --limit <n>          cap docs/source (testing)     --verify-log      per-doc ledger
  --concurrency <n>    parallel detector calls (3)   --max-detect-chars content sent (8000)
  --sample-chars <n>   snippet length (240)          --sample-limit <n> rows/class (15)
  --llm-review         post-run LLM sanity review of the change log
  --out-dir <dir>      logs dir (flag > $LANGUAGE_SWEEP_OUT_DIR > <cwd>/reports)
  --help

Detection model: $LANG_DETECT_MODEL_ID (default google/gemini-2.5-flash-lite),
reached over OpenRouter with $OPENROUTER_API_KEY. Runs against the LOCAL database;
use pnpm lang:sweep:production for the production corpus.
`;

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`error: ${(e as Error).message}\n`);
    console.error(HELP);
    process.exitCode = 1;
    return;
  }

  if (parsed.kind === "help") {
    console.log(HELP);
    return;
  }

  // wire() builds the adapters (incl. the LLM detector) from the local env and
  // owns the DB pool shutdown; getDb() returns the same cached client wire() opened.
  const wiring = wire();
  const { client } = getDb();
  try {
    if (parsed.kind === "revert") {
      await runRevertCore(parsed, { client });
    } else {
      await runSweep(parsed, {
        client,
        detector: wiring.languageDetector,
        reviewer: wiring.llmReviewer,
      });
    }
  } finally {
    await wiring.shutdown();
  }
}

// Only run when invoked directly (not when imported by a test).
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (e) {
    // Clean, non-zero exit for operational failures (DB down, missing changelog,
    // unknown source) — AggregateError (e.g. postgres ECONNREFUSED) can carry an
    // empty message, so fall back to a code/name.
    let msg = e instanceof Error ? e.message : String(e);
    if (!msg && e && typeof e === "object") {
      const code = (e as { code?: string }).code;
      msg = code ? `database connection failed (${code})` : (e as Error).name || String(e);
    }
    console.error(`error: ${msg}`);
    process.exitCode = 1;
    const { closeDb } = await import("@/db/index.js");
    await closeDb().catch(() => {});
  }
}
