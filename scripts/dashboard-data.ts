/**
 * `pnpm dashboard:data` — read the status inventory from a Postgres database and
 * write dashboard/prod-status-data.json.
 *
 * Credential surface is deliberately ONE variable: DATABASE_URL, read straight
 * from the environment (NOT through @/env, so this never also demands
 * OPENROUTER_API_KEY). For a production refresh the dashboard skill injects a
 * prod DATABASE_URL via `doppler` at invocation time — the value reaches this
 * process's env and nothing else: it is never written to a file, echoed, or put
 * in the JSON output. Locally, it falls back to .env (the dev DB), so the same
 * command works for development without any prod access.
 *
 * Read-only against the DB.
 */
import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { fetchProdStatus } from "./lib/dashboard/query.js";
import { redactDbUrl } from "./lib/prompt-prod-creds.js";

const OUT = path.resolve(import.meta.dirname, "..", "dashboard", "prod-status-data.json");

// Read DATABASE_URL directly; .env is a dev convenience fallback only.
function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  // Minimal .env fallback (dev) — never logs the value.
  try {
    const text = readFileSync(path.resolve(import.meta.dirname, "..", ".env"), "utf8");
    const line = text.split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
    if (line) {
      let v = line.slice(line.indexOf("=") + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v) return v;
    }
  } catch {
    /* no .env — fine */
  }
  throw new Error("DATABASE_URL is not set (export it, or via `doppler run -- pnpm dashboard:data`, or set it in .env for local).");
}

async function main(): Promise<void> {
  const databaseUrl = readDatabaseUrl();
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://");
  }
  // Redacted only — the raw URL (with password) is never printed.
  console.log(`▶ reading dashboard status from ${redactDbUrl(databaseUrl)}`);

  const sql = postgres(databaseUrl, { max: 3, onnotice: () => {} });
  try {
    const data = await fetchProdStatus(sql);
    await writeFile(OUT, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(
      `✔ wrote ${path.relative(process.cwd(), OUT)} — ${data.ingested.length} ingested row(s), ${data.acquired_keys.length} acquired source(s)`,
    );
  } finally {
    await sql.end({ timeout: 3 });
  }
}

main().catch((e: unknown) => {
  console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
