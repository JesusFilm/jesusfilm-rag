/**
 * Resolve the database URL the dashboard read should use — pure, so the
 * credential precedence is unit-tested without touching a real environment.
 *
 * Precedence, and why:
 *   1. JFRAG_POSTGRESQL_DB_URL — the dashboard's OWN, namespaced prod credential
 *      (injected by `doppler run`). Distinct from DATABASE_URL on purpose: it
 *      decouples the dashboard's prod access from the `DATABASE_URL` that every
 *      other script (acquire/index/eval) reads for the LOCAL dev DB. So even a
 *      `doppler run -- pnpm acquire` stays on dev — the prod URL lives under a
 *      different name the source tooling never reads. See docs/ops/dashboard.md.
 *   2. DATABASE_URL — env (dev) or the project's default pointer.
 *   3. A `.env` file's DATABASE_URL — local dev convenience fallback.
 *
 * Never logs or returns anything but the resolved URL; callers redact before
 * printing (scripts/lib/prompt-prod-creds.ts redactDbUrl).
 */

/** Extract `DATABASE_URL=` from raw .env text (quotes stripped). */
function databaseUrlFromEnvFile(text: string): string | undefined {
  const line = text.split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
  if (!line) return undefined;
  let v = line.slice(line.indexOf("=") + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v || undefined;
}

export interface DbEnv {
  JFRAG_POSTGRESQL_DB_URL?: string;
  DATABASE_URL?: string;
}

/** Where the URL came from. Only `JFRAG_POSTGRESQL_DB_URL` is the namespaced
 *  PROD credential; the other two are dev/fallback sources. The caller reports
 *  this so a fallback read is never SILENT (a misconfigured `doppler run` that
 *  injects nothing would otherwise publish dev data stamped as prod). */
export type DbUrlSource = "JFRAG_POSTGRESQL_DB_URL" | "DATABASE_URL" | ".env";

export interface ResolvedDbUrl {
  url: string;
  source: DbUrlSource;
}

/**
 * Resolve the DB URL: namespaced prod var first, then DATABASE_URL, then a
 * `.env` file's DATABASE_URL. Returns the URL AND which source it came from, so
 * callers can flag a dev/fallback read loudly. Throws if none provide one —
 * never silently defaults, so a missing credential fails loud, not quiet.
 */
export function resolveDatabaseUrl(env: DbEnv, envFileText?: string): ResolvedDbUrl {
  const namespaced = env.JFRAG_POSTGRESQL_DB_URL?.trim();
  if (namespaced) return { url: namespaced, source: "JFRAG_POSTGRESQL_DB_URL" };

  const generic = env.DATABASE_URL?.trim();
  if (generic) return { url: generic, source: "DATABASE_URL" };

  const fromFile = envFileText ? databaseUrlFromEnvFile(envFileText) : undefined;
  if (fromFile) return { url: fromFile, source: ".env" };

  throw new Error(
    "No database URL: set JFRAG_POSTGRESQL_DB_URL (via `doppler run -- pnpm dashboard:data`) " +
      "or DATABASE_URL, or provide a local .env with DATABASE_URL for dev.",
  );
}
