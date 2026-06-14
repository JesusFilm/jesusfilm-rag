/**
 * Interactive credential prompt for the *:production scripts (acquire / index /
 * retrieve / eval). The unified safe path for production runs:
 *
 *   1. Print a "PRODUCTION <op>" banner with what the script will do.
 *   2. Ask Y/N BEFORE prompting for anything sensitive.
 *   3. Prompt for the three credentials (DATABASE_URL, OPENROUTER_API_KEY,
 *      EMBED_MODEL_ID). A value already EXPORTED in the current shell is offered
 *      as a reuse default — press Enter to keep it, or type to override. This is
 *      what makes back-to-back runs (acquire → index → retrieve → eval) fast:
 *      seed the three values once per terminal session and every script reuses
 *      them. See docs/ops/prod-ingest.md "Running several in a row".
 *   4. Show a REDACTED summary (DB host + scope, embedding model) and Y/N again.
 *   5. Return the credentials. The caller installs them into process.env
 *      BEFORE dynamic-importing @/env.js — because the loader in src/env.ts is
 *      first-write-wins, our prompted values win even if a stale DATABASE_URL
 *      sits in .env / .env.local.
 *
 * WHY reuse-from-env is SAFE (does not reintroduce the stale-.env hazard this
 * flow exists to prevent): this prompt runs BEFORE any @/env.js import, so the
 * src/env.ts loader has not yet read .env / .env.local into process.env. The
 * only values present at prompt time are ones the engineer genuinely EXPORTED
 * into this shell — never file values. And a reused value is still shown
 * redacted in the step-4 summary and re-confirmed at the second Y/N gate, so
 * reuse is never silent. **Do NOT move the @/ imports above this prompt** — that
 * ordering is the invariant that keeps reuse honest. (The reuse/override/
 * validate precedence is unit-tested in tests/prompt-prod-creds.test.ts.)
 *
 * Credentials live ONLY in this process's memory (or the parent shell's
 * exported env). There is no .env.production file; nothing is written to disk.
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
  /** "acquire" | "index" | "retrieve" | "eval" — interpolated into the banner. */
  operation: string;
  /** Lines describing what the script will do, shown above the first Y/N. */
  intent: string[];
  /** Lines for the post-credential summary (scope, query, etc.). */
  summary: () => string[];
}

const DEFAULT_EMBED_MODEL = "openai/text-embedding-3-small";

/** Redact the password in a postgres URL for the on-screen summary. */
export function redactDbUrl(databaseUrl: string): string {
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

/** Redact a secret (API key) to its last 4 chars for a reuse offer / summary. */
export function redactSecret(secret: string): string {
  return secret.length <= 4 ? "***" : `…${secret.slice(-4)}`;
}

async function confirm(rl: readline.Interface, q: string): Promise<boolean> {
  const a = (await rl.question(`${q} (y/N) `)).trim().toLowerCase();
  return a === "y" || a === "yes";
}

export interface CredentialSpec {
  /** Human label, e.g. "DATABASE_URL (postgres://…)". */
  label: string;
  /** Already-exported value (process.env[...]) offered as a reuse default. */
  current?: string;
  /** Render `current` when offering reuse (redaction). Defaults to raw. */
  display?: (v: string) => string;
  /** Default applied on empty input when nothing is exported (e.g. the model). */
  fallback?: string;
  /** Return an error string to reject the resolved value, or null to accept. */
  validate?: (v: string) => string | null;
  /** When true (default) an empty resolved value throws. */
  required?: boolean;
}

/**
 * Resolve the final value of one credential given what the engineer typed and
 * what (if anything) is exported. Pure — no I/O — so the reuse/override/validate
 * precedence is unit-testable without a TTY. Precedence: typed > current >
 * fallback. Validation runs on the resolved value either way, so a malformed
 * exported value is caught the same as a malformed typed one.
 */
export function resolveCredential(typed: string, spec: CredentialSpec): string {
  const { label, current, fallback, validate, required = true } = spec;
  const value = typed.trim() || current || fallback || "";
  if (!value && required) {
    throw new Error(`a value is required for: ${label}`);
  }
  if (value && validate) {
    const err = validate(value);
    if (err) throw new Error(`${label}: ${err}`);
  }
  return value;
}

/** Build the prompt line for one credential, reflecting any reuse default. */
function credentialPrompt(spec: CredentialSpec): string {
  if (spec.current) {
    const shown = spec.display ? spec.display(spec.current) : spec.current;
    return `  ${spec.label} [reuse ${shown}, Enter to keep]: `;
  }
  if (spec.fallback) return `  ${spec.label} (Enter for ${spec.fallback}): `;
  return `  ${spec.label}: `;
}

async function askCredential(
  rl: readline.Interface,
  spec: CredentialSpec,
): Promise<string> {
  const typed = await rl.question(credentialPrompt(spec));
  return resolveCredential(typed, spec);
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

    // Reuse defaults come ONLY from genuinely-exported shell env: this runs
    // before any @/env.js import, so .env / .env.local have not been loaded.
    const exported = {
      DATABASE_URL: process.env.DATABASE_URL?.trim() || undefined,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY?.trim() || undefined,
      EMBED_MODEL_ID: process.env.EMBED_MODEL_ID?.trim() || undefined,
    };

    console.log(
      "\nCredentials are entered interactively and kept only in this process's " +
        "memory.\nNothing is read from or written to .env / .env.local.",
    );
    if (exported.DATABASE_URL || exported.OPENROUTER_API_KEY) {
      console.log(
        "Values exported in this shell are offered below — press Enter to reuse, " +
          "or\ntype a new value to override. Each is shown redacted + re-confirmed " +
          "before running.",
      );
    }
    if (!(await confirm(rl, "\nContinue?"))) {
      console.log("aborted.");
      return null;
    }

    console.log("\nEnter production credentials (Ctrl-C to abort):");
    const DATABASE_URL = await askCredential(rl, {
      label: "DATABASE_URL (postgres://…)",
      current: exported.DATABASE_URL,
      display: redactDbUrl,
      validate: (v) =>
        /^postgres(ql)?:\/\//.test(v)
          ? null
          : "must start with postgres:// or postgresql://",
    });
    const OPENROUTER_API_KEY = await askCredential(rl, {
      label: "OPENROUTER_API_KEY",
      current: exported.OPENROUTER_API_KEY,
      display: redactSecret,
    });
    const EMBED_MODEL_ID = await askCredential(rl, {
      label: "EMBED_MODEL_ID",
      current: exported.EMBED_MODEL_ID,
      fallback: DEFAULT_EMBED_MODEL,
    });

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
