/**
 * Interactive credential prompt for the *:production scripts (acquire / index /
 * retrieve). The unified safe path for production runs:
 *
 *   1. Print a "PRODUCTION <op>" banner with what the script will do.
 *   2. Ask Y/N BEFORE prompting for anything sensitive.
 *   3. Prompt for the three credentials interactively (DATABASE_URL,
 *      OPENROUTER_API_KEY, EMBED_MODEL_ID).
 *   4. Show a REDACTED summary (DB host + scope, embedding model) and Y/N again.
 *   5. Return the credentials. The caller installs them into process.env
 *      BEFORE dynamic-importing @/env.js — because the loader in src/env.ts is
 *      first-write-wins, our prompted values win even if a stale DATABASE_URL
 *      sits in .env / .env.local.
 *
 * Credentials live ONLY in this process's memory. There is no .env.production
 * file; nothing is written to disk. Closing the script discards them.
 *
 * Trade-off: input is NOT masked while typing. Node's readline has no native
 * masking API and the monkey-patch options are fragile. For an infrequent,
 * engineer-driven local operation this is acceptable; revisit if shoulder-
 * surfing becomes a real concern. See docs/ops/prod-ingest.md.
 */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

export interface ProdCreds {
  DATABASE_URL: string;
  OPENROUTER_API_KEY: string;
  EMBED_MODEL_ID: string;
}

export interface PromptOptions {
  /** "acquire" | "index" | "retrieve" — interpolated into the banner. */
  operation: string;
  /** Lines describing what the script will do, shown above the first Y/N. */
  intent: string[];
  /** Lines for the post-credential summary (scope, query, etc.). */
  summary: () => string[];
}

const DEFAULT_EMBED_MODEL = "openai/text-embedding-3-small";

/** Redact the password in a postgres URL for the on-screen summary. */
function redactDbUrl(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl);
    const host = u.hostname || "?";
    const port = u.port || "?";
    const db = u.pathname.replace(/^\//, "") || "?";
    const user = u.username || "?";
    return `${u.protocol}//${user}:***@${host}:${port}/${db}`;
  } catch {
    return "(unparseable — fix the value)";
  }
}

async function confirm(rl: readline.Interface, q: string): Promise<boolean> {
  const a = (await rl.question(`${q} (y/N) `)).trim().toLowerCase();
  return a === "y" || a === "yes";
}

async function ask(
  rl: readline.Interface,
  q: string,
  required = true,
): Promise<string> {
  const v = (await rl.question(q)).trim();
  if (required && !v) throw new Error(`a value is required for: ${q.trim()}`);
  return v;
}

function banner(operation: string): void {
  const title = `⚠️  PRODUCTION ${operation.toUpperCase()}`;
  console.log(`\n${title}`);
  // Subtract 2 because the warning glyph counts as 1 width but renders wider.
  console.log("=".repeat(Math.max(20, title.length - 2)));
}

export async function promptProductionCredentials(
  opts: PromptOptions,
): Promise<ProdCreds | null> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    banner(opts.operation);
    for (const line of opts.intent) console.log(line);
    console.log(
      "\nCredentials will be entered interactively and kept only in this " +
        "process's memory.\nNothing is read from or written to .env / .env.local.",
    );
    if (!(await confirm(rl, "\nContinue?"))) {
      console.log("aborted.");
      return null;
    }

    console.log("\nEnter production credentials (Ctrl-C to abort):");
    const DATABASE_URL = await ask(rl, "  DATABASE_URL (postgres://…): ");
    if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
      throw new Error(
        "DATABASE_URL must start with postgres:// or postgresql://",
      );
    }
    const OPENROUTER_API_KEY = await ask(rl, "  OPENROUTER_API_KEY: ");
    const modelInput = await ask(
      rl,
      `  EMBED_MODEL_ID (Enter for ${DEFAULT_EMBED_MODEL}): `,
      false,
    );
    const EMBED_MODEL_ID = modelInput || DEFAULT_EMBED_MODEL;

    console.log("\nReady to run:");
    console.log(`  database:        ${redactDbUrl(DATABASE_URL)}`);
    console.log(`  embedding model: ${EMBED_MODEL_ID}`);
    for (const line of opts.summary()) console.log(line);
    if (!(await confirm(rl, "\nProceed?"))) {
      console.log("aborted.");
      return null;
    }

    return { DATABASE_URL, OPENROUTER_API_KEY, EMBED_MODEL_ID };
  } finally {
    rl.close();
  }
}

/**
 * Install prompted credentials into process.env, BEFORE the caller dynamic-
 * imports @/env.js. The loader's first-write-wins precedence then ensures any
 * stale value in .env / .env.local cannot overwrite ours.
 */
export function installCreds(creds: ProdCreds): void {
  process.env.DATABASE_URL = creds.DATABASE_URL;
  process.env.OPENROUTER_API_KEY = creds.OPENROUTER_API_KEY;
  process.env.EMBED_MODEL_ID = creds.EMBED_MODEL_ID;
}
