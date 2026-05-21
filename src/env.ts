import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DEFAULT_EMBED_MODEL_ID } from "@/embedder.js";

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

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENROUTER_API_KEY: z.string().min(1),
  EMBED_MODEL_ID: z.string().min(1).default(DEFAULT_EMBED_MODEL_ID),
  MCP_PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  MCP_BEARER_TOKEN: z.string().min(1),
  MCP_BEARER_SCOPES: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  CLIENT_HASH_SECRET: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
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
