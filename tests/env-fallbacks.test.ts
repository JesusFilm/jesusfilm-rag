/**
 * Unit tests for the namespaced-Doppler-key env fallback (src/env.ts,
 * applyNamespacedEnvFallbacks) added with the forge-rag project migration
 * (#53). The load-bearing property is the NEGATIVE one: only the
 * environment-agnostic OpenRouter spend key is mapped — the prod DB URL and
 * the embedding model id must NEVER flow from JFRAG_* into the plain names
 * here, or `doppler run -- pnpm acquire` (a LOCAL run) would silently point
 * at production. Prod-intent consumers opt in explicitly instead
 * (scripts/lib/dashboard/credentials.ts, the :production scripts'
 * non-interactive mode).
 *
 * Note: importing @/env.js runs its module-level loaders against the test
 * process env — that's the existing behavior every integration test already
 * relies on. These tests call the exported function on plain objects only.
 */
import { describe, expect, it } from "vitest";
import { applyNamespacedEnvFallbacks } from "../src/env.js";

describe("applyNamespacedEnvFallbacks — OpenRouter key mapping", () => {
  it("fills OPENROUTER_API_KEY from JFRAG_OPENROUTER_API_KEY when unset", () => {
    const env: Record<string, string | undefined> = {
      JFRAG_OPENROUTER_API_KEY: "sk-or-v1-doppler",
    };
    applyNamespacedEnvFallbacks(env);
    expect(env.OPENROUTER_API_KEY).toBe("sk-or-v1-doppler");
  });

  it("fills when the plain name is empty/whitespace (not genuinely set)", () => {
    const env: Record<string, string | undefined> = {
      OPENROUTER_API_KEY: "   ",
      JFRAG_OPENROUTER_API_KEY: "sk-or-v1-doppler",
    };
    applyNamespacedEnvFallbacks(env);
    expect(env.OPENROUTER_API_KEY).toBe("sk-or-v1-doppler");
  });

  it("never overrides a genuinely-set plain name", () => {
    const env: Record<string, string | undefined> = {
      OPENROUTER_API_KEY: "sk-or-v1-exported",
      JFRAG_OPENROUTER_API_KEY: "sk-or-v1-doppler",
    };
    applyNamespacedEnvFallbacks(env);
    expect(env.OPENROUTER_API_KEY).toBe("sk-or-v1-exported");
  });

  it("is a no-op when neither name is present", () => {
    const env: Record<string, string | undefined> = {};
    applyNamespacedEnvFallbacks(env);
    expect(env.OPENROUTER_API_KEY).toBeUndefined();
  });
});

describe("applyNamespacedEnvFallbacks — the safety boundary", () => {
  it("NEVER maps the prod DB URL or model id into the plain names", () => {
    // If this test ever fails, a local `doppler run -- pnpm acquire/index`
    // would inherit the PROD database pointer. Do not "fix" it by mapping —
    // prod-intent code paths must opt in to JFRAG_* explicitly.
    const env: Record<string, string | undefined> = {
      JFRAG_POSTGRESQL_DB_URL: "postgres://prod:secret@db.rlwy.net:5432/railway",
      JFRAG_OPENROUTER_EMBED_MODEL_ID: "qwen/qwen3-embedding-8b",
      JFRAG_SERVE_BEARER_TOKENS: '{"token":"*"}',
    };
    applyNamespacedEnvFallbacks(env);
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.EMBED_MODEL_ID).toBeUndefined();
    expect(env.SERVE_BEARER_TOKENS).toBeUndefined();
  });
});
