/**
 * Env-schema guard: EMBED_BASE_URL without EMBED_API_KEY must fail validation
 * at startup — a gateway endpoint with no credential would 401 every call and
 * silently ride the OpenRouter fallback forever (ADR-0015). Isolated from the
 * other env tests because getEnv() caches at module scope: each case resets
 * the module graph and re-imports env.js under a scripted process.env.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = {
  DATABASE_URL: "postgres://unused:unused@localhost:5432/unused",
  OPENROUTER_API_KEY: "or-key-test",
};

describe("getEnv() — gateway credential guard", () => {
  let saved: NodeJS.ProcessEnv;

  beforeEach(() => {
    saved = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = saved;
  });

  const importEnv = async (
    overrides: Record<string, string | undefined>,
  ): Promise<() => unknown> => {
    for (const key of [
      "EMBED_BASE_URL",
      "EMBED_API_KEY",
      "EMBED_WIRE_MODEL_ID",
      "JFRAG_OPENROUTER_API_KEY",
    ]) {
      delete process.env[key];
    }
    Object.assign(process.env, BASE, overrides);
    const { getEnv } = await import("@/env.js");
    return getEnv;
  };

  it("rejects EMBED_BASE_URL without EMBED_API_KEY", async () => {
    const getEnv = await importEnv({ EMBED_BASE_URL: "https://gateway.test/v1" });
    expect(getEnv).toThrow(/EMBED_API_KEY.*required when EMBED_BASE_URL is set/s);
  });

  it("accepts EMBED_BASE_URL with EMBED_API_KEY", async () => {
    const getEnv = await importEnv({
      EMBED_BASE_URL: "https://gateway.test/v1",
      EMBED_API_KEY: "gw-key-test",
    });
    expect(getEnv).not.toThrow();
  });

  it("treats an empty-string EMBED_BASE_URL as unset (compose `${VAR:-}` pass-through)", async () => {
    const getEnv = await importEnv({ EMBED_BASE_URL: "", EMBED_API_KEY: "" });
    const env = (getEnv as () => { EMBED_BASE_URL?: string; EMBED_API_KEY?: string })();
    expect(env.EMBED_BASE_URL).toBeUndefined();
    expect(env.EMBED_API_KEY).toBeUndefined();
  });

  it("still accepts the plain OpenRouter-only environment (no gateway vars)", async () => {
    const getEnv = await importEnv({});
    expect(getEnv).not.toThrow();
  });
});
