import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// Default embedding model — see docs/architecture.md (decision 1). The Embedder
// adapter (src/adapters/openrouter) will own the canonical client; this is only
// the env default, so EMBED_MODEL_ID can be omitted.
const DEFAULT_EMBED_MODEL_ID = "qwen/qwen3-embedding-8b";

// Default language-detection model for the corrective sweep (#84) — a cheap,
// capable chat model reached over OpenRouter. The LanguageDetector adapter owns
// the canonical client; this is only the env default, so LANG_DETECT_MODEL_ID
// can be omitted. Swap it (e.g. to a local Ollama model) via the env var.
const DEFAULT_LANG_DETECT_MODEL_ID = "google/gemini-2.5-flash-lite";

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

/**
 * The dedicated `forge-rag` Doppler project (doppler.yaml) carries its secrets
 * under NAMESPACED keys (JFRAG_*) precisely so that a `doppler run` wrapped
 * around LOCAL tooling can never silently repoint it at prod: DATABASE_URL and
 * EMBED_MODEL_ID stay local-owned, and the prod DB URL is only used by code
 * that EXPLICITLY opts in (dashboard credentials, the :production scripts'
 * non-interactive mode). The ONE environment-agnostic credential is the
 * OpenRouter spend key — the same key serves local and prod — so it alone is
 * mapped here: a doppler-injected JFRAG_OPENROUTER_API_KEY fills
 * OPENROUTER_API_KEY when the plain name isn't genuinely set. Exported for
 * unit tests. Deliberately NO other JFRAG_* mapping — see the safety test in
 * tests/env-fallbacks.test.ts.
 */
export function applyNamespacedEnvFallbacks(
  env: Record<string, string | undefined> = process.env,
): void {
  if (!env.OPENROUTER_API_KEY?.trim() && env.JFRAG_OPENROUTER_API_KEY?.trim()) {
    env.OPENROUTER_API_KEY = env.JFRAG_OPENROUTER_API_KEY;
  }
}

// Order matters: fallbacks first (genuinely-injected env, e.g. doppler), THEN
// the .env file fill — a doppler-injected JFRAG_OPENROUTER_API_KEY must beat a
// placeholder sitting in .env, and loadDotEnv only fills keys still undefined.
applyNamespacedEnvFallbacks();
loadDotEnv();

// The schema validates exactly what the running code consumes: the DB, the
// embedder, the embedding model, and (build step 6) the HTTP serving adapter.
// The serving vars are OPTIONAL here so the CLI runners (acquire/index/query),
// which also call getEnv(), don't require them; scripts/serve.ts asserts
// SERVE_BEARER_TOKENS is set before it binds a listener — keeping the env
// contract honest rather than carrying unused, unenforced vars.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENROUTER_API_KEY: z.string().min(1),
  EMBED_MODEL_ID: z.string().min(1).default(DEFAULT_EMBED_MODEL_ID),
  // Per-batch embed attempts (initial try + retries) before an index run fails;
  // raise it for a flaky provider. Default 10 (1 try + 9 retries, ~47s of backoff)
  // so a transient OpenRouter blip recovers instead of aborting a long ingest run
  // — see issue #64. Consumed by the OpenRouter Embedder (main.ts).
  EMBED_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  // Embeddings endpoint base URL. Defaults to OpenRouter; point at a self-hosted
  // vLLM `/v1` for on-prem serving. Consumed by the Embedder adapter (main.ts).
  EMBED_BASE_URL: z.string().url().optional(),
  // Instruction-aware query task for Qwen3-Embedding-class models. When set,
  // embedQuery encodes `Instruct: {…}\nQuery: {text}` (documents stay raw).
  // Unset ⇒ symmetric encoding; set it for qwen (see docs/ops/prod-reembed.md).
  EMBED_QUERY_INSTRUCTION: z.string().min(1).optional(),
  // MRL fallback: truncate+renormalize a wider-than-1536 vector client-side, for
  // a self-hosted endpoint that ignores the `dimensions` request param. Off by
  // default (OpenRouter honours `dimensions`). Accepts "true"/"1".
  EMBED_TRUNCATE_DIMENSIONS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  // Language-detection model for the corrective sweep (LanguageDetector port),
  // reached over OpenRouter with the same OPENROUTER_API_KEY. Consumed in main.ts.
  LANG_DETECT_MODEL_ID: z.string().min(1).default(DEFAULT_LANG_DETECT_MODEL_ID),
  // Chat-completions endpoint base URL for language detection. Defaults to
  // OpenRouter (the adapter owns the default); point at a self-hosted `/v1`
  // (e.g. Ollama) to run a local model instead. Consumed by the adapter (main.ts).
  LANG_DETECT_BASE_URL: z.string().url().optional(),
  // Per-call detect attempts (initial try + retries) before a document is flagged
  // as an anomaly; mirrors EMBED_MAX_ATTEMPTS. Default 10 (~47s of backoff).
  LANG_DETECT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  PORT: z.coerce.number().int().positive().default(8080), // Railway injects PORT
  // JSON map of bearer token → allowed source keys (["*"] = all). Parsed by the
  // serving adapter (src/serving/http/auth.ts); required only by `pnpm serve`.
  SERVE_BEARER_TOKENS: z.string().min(1).optional(),
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
