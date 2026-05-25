import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// Default embedding model — see docs/architecture.md (decision 1). The Embedder
// adapter (src/adapters/openrouter) will own the canonical client; this is only
// the env default, so EMBED_MODEL_ID can be omitted.
const DEFAULT_EMBED_MODEL_ID = "openai/text-embedding-3-small";

/**
 * Load `.env` from the repo root if present. We deliberately do NOT use
 * dotenv as a dependency — the file format is simple enough and we want zero
 * extra surface area on the server.
 */
function loadDotEnv(): void {
  const root = process.cwd();
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadDotEnv();

// The schema validates exactly what the running code consumes today: the DB,
// the embedder, and the embedding model. Serving/auth env (MCP_PORT,
// MCP_BEARER_TOKEN, MCP_BEARER_SCOPES, CLIENT_HASH_SECRET, ADMIN_PASSWORD) is
// added back when the MCP serving adapter that reads it lands in build step 6 —
// keeping the env contract honest rather than carrying unused, unenforced vars.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENROUTER_API_KEY: z.string().min(1),
  EMBED_MODEL_ID: z.string().min(1).default(DEFAULT_EMBED_MODEL_ID),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`env validation failed:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
