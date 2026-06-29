/**
 * `pnpm dashboard:data` — read the status inventory from a Postgres database and
 * write dashboard/prod-status-data.json.
 *
 * Credential source (precedence in scripts/lib/dashboard/credentials.ts):
 *   1. JFRAG_POSTGRESQL_DB_URL — the dashboard's OWN namespaced prod credential,
 *      injected by `doppler run`. Distinct from DATABASE_URL so the prod URL
 *      cannot bleed into the source tooling (acquire/index/eval read DATABASE_URL
 *      for the local dev DB). See docs/ops/dashboard.md.
 *   2. DATABASE_URL (env) → 3. a local `.env` DATABASE_URL (dev convenience).
 *
 * Read straight from the environment (NOT through @/env, so it never also demands
 * OPENROUTER_API_KEY). The injected value reaches this process's env and nothing
 * else: it is never written to a file, echoed, or put in the JSON output — only a
 * REDACTED host is ever logged. Read-only against the DB.
 */
import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { fetchProdStatus } from "./lib/dashboard/query.js";
import { resolveDatabaseUrl } from "./lib/dashboard/credentials.js";
import { prodStatusDataSchema } from "./lib/dashboard/types.js";
import { redactDbUrl } from "./lib/prompt-prod-creds.js";

const OUT = path.resolve(import.meta.dirname, "..", "dashboard", "prod-status-data.json");

/** UTC calendar date (YYYY-MM-DD) — UTC so the same read stamps one canonical
 *  date regardless of operator timezone (mirrors scripts/source-status.ts). */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Read the local `.env` text for the dev fallback, or undefined if absent. */
function readEnvFile(): string | undefined {
  try {
    return readFileSync(path.resolve(import.meta.dirname, "..", ".env"), "utf8");
  } catch {
    return undefined; // no .env — fine for a doppler-injected prod run
  }
}

async function main(): Promise<void> {
  const { url: databaseUrl, source } = resolveDatabaseUrl(process.env, readEnvFile());
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error("database URL must start with postgres:// or postgresql://");
  }
  // Redacted only — the raw URL (with password) is never printed. Naming the
  // SOURCE makes a dev/fallback read impossible to miss: a PROD refresh must read
  // the namespaced var, so anything else is loudly flagged (a misconfigured
  // `doppler run` that injects nothing would otherwise publish dev data as prod).
  console.log(`▶ reading dashboard status from ${redactDbUrl(databaseUrl)} (via ${source})`);
  if (source !== "JFRAG_POSTGRESQL_DB_URL") {
    console.warn(
      `⚠️  NOT the namespaced prod credential — this is a DEV/fallback read (${source}). ` +
        "For a PRODUCTION refresh, run `doppler run -- pnpm dashboard:data` so JFRAG_POSTGRESQL_DB_URL is injected.",
    );
  }

  const sql = postgres(databaseUrl, { max: 3, onnotice: () => {} });
  try {
    const read = await fetchProdStatus(sql);
    // Stamp the prod-read date INTO the export so `dashboard:build` is a pure
    // function of its inputs (no build-time clock — CodeRabbit #1).
    const data = prodStatusDataSchema.parse({ fetched_at: todayUtc(), ...read });
    await writeFile(OUT, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(
      `✔ wrote ${path.relative(process.cwd(), OUT)} — fetched ${data.fetched_at}, ${data.ingested.length} ingested row(s), ${data.acquired_keys.length} acquired source(s)`,
    );
  } finally {
    await sql.end({ timeout: 3 });
  }
}

main().catch((e: unknown) => {
  console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
