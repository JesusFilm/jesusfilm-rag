/**
 * Unit tests for the pure pieces of the *:production credential prompt
 * (scripts/lib/prompt-prod-creds.ts) — no TTY, no DB, no env. Covers the
 * load-bearing reuse behavior added for back-to-back prod runs: pressing Enter
 * reuses an exported value, typing overrides it, and validation runs on the
 * RESOLVED value either way (so a malformed *exported* value is rejected just
 * like a malformed typed one). Importing the module is side-effect-free — it
 * only defines functions — so it's safe to pull into a unit test.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMBED_MODEL,
  extractProdRunFlags,
  redactDbUrl,
  redactSecret,
  resolveCredential,
  resolveNonInteractiveCreds,
} from "../scripts/lib/prompt-prod-creds.js";

const isPostgres = (v: string): string | null =>
  /^postgres(ql)?:\/\//.test(v) ? null : "must start with postgres://";

describe("resolveCredential — typed > current > fallback precedence", () => {
  it("uses the typed value when one is entered", () => {
    expect(
      resolveCredential("postgres://typed/db", {
        label: "DATABASE_URL",
        current: "postgres://exported/db",
      }),
    ).toBe("postgres://typed/db");
  });

  it("reuses the exported `current` when the engineer presses Enter", () => {
    expect(
      resolveCredential("", {
        label: "DATABASE_URL",
        current: "postgres://exported/db",
      }),
    ).toBe("postgres://exported/db");
  });

  it("prefers an exported `current` over the `fallback`", () => {
    expect(
      resolveCredential("", {
        label: "EMBED_MODEL_ID",
        current: "exported/model",
        fallback: "default/model",
      }),
    ).toBe("exported/model");
  });

  it("falls back to the default when nothing is typed or exported", () => {
    expect(
      resolveCredential("", {
        label: "EMBED_MODEL_ID",
        fallback: "default/model",
      }),
    ).toBe("default/model");
  });

  it("trims surrounding whitespace from typed input", () => {
    expect(
      resolveCredential("  postgres://typed/db  ", { label: "DATABASE_URL" }),
    ).toBe("postgres://typed/db");
  });
});

describe("resolveCredential — required + validation", () => {
  it("throws when required and nothing resolves", () => {
    expect(() => resolveCredential("", { label: "OPENROUTER_API_KEY" })).toThrow(
      /required for: OPENROUTER_API_KEY/,
    );
  });

  it("returns empty string when not required and nothing resolves", () => {
    expect(
      resolveCredential("", { label: "OPTIONAL", required: false }),
    ).toBe("");
  });

  it("validates a typed value and rejects a bad one", () => {
    expect(() =>
      resolveCredential("mysql://nope", {
        label: "DATABASE_URL",
        validate: isPostgres,
      }),
    ).toThrow(/DATABASE_URL: must start with postgres/);
  });

  it("validates a REUSED exported value too (not just typed input)", () => {
    // A stale exported DATABASE_URL must be caught the same as a typed one.
    expect(() =>
      resolveCredential("", {
        label: "DATABASE_URL",
        current: "mysql://stale-export",
        validate: isPostgres,
      }),
    ).toThrow(/DATABASE_URL: must start with postgres/);
  });

  it("accepts a valid reused value through validation", () => {
    expect(
      resolveCredential("", {
        label: "DATABASE_URL",
        current: "postgresql://ok/db",
        validate: isPostgres,
      }),
    ).toBe("postgresql://ok/db");
  });
});

describe("redactDbUrl", () => {
  it("masks the password but keeps user/host/port/db for confirmation", () => {
    expect(redactDbUrl("postgres://user:s3cret@db.example:5432/rag")).toBe(
      "postgres://user:***@db.example:5432/rag",
    );
  });

  it("flags an unparseable URL rather than leaking it", () => {
    expect(redactDbUrl("not a url")).toBe("(unparseable — fix the value)");
  });
});

describe("redactSecret", () => {
  it("shows only the last 4 chars of a real key", () => {
    expect(redactSecret("sk-or-v1-abcdEFGH")).toBe("…EFGH");
  });

  it("fully masks anything 4 chars or shorter", () => {
    expect(redactSecret("abcd")).toBe("***");
    expect(redactSecret("ab")).toBe("***");
  });
});

// ---------------------------------------------------------------------------
// Non-interactive mode (#56)
// ---------------------------------------------------------------------------

describe("extractProdRunFlags", () => {
  it("recognizes --non-interactive and both aliases, removing them from argv", () => {
    for (const alias of ["--non-interactive", "--yes", "-y"]) {
      const { flags, rest, error } = extractProdRunFlags([
        "--source",
        "thelife",
        alias,
        "how do I pray?",
      ]);
      expect(error).toBeUndefined();
      expect(flags.nonInteractive).toBe(true);
      expect(rest).toEqual(["--source", "thelife", "how do I pray?"]);
    }
  });

  it("defaults to interactive when no flag is present", () => {
    const { flags, rest } = extractProdRunFlags(["--source", "thelife"]);
    expect(flags.nonInteractive).toBe(false);
    expect(flags.expectHost).toBeUndefined();
    expect(rest).toEqual(["--source", "thelife"]);
  });

  it("captures --expect-host and its value, removing both", () => {
    const { flags, rest } = extractProdRunFlags([
      "--expect-host",
      "rlwy.net",
      "-y",
      "what is grace?",
    ]);
    expect(flags.expectHost).toBe("rlwy.net");
    expect(flags.nonInteractive).toBe(true);
    expect(rest).toEqual(["what is grace?"]);
  });

  it("errors on --expect-host without a value (end of argv or next flag)", () => {
    expect(extractProdRunFlags(["--expect-host"]).error).toMatch(
      /--expect-host needs a value/,
    );
    expect(
      extractProdRunFlags(["--expect-host", "--non-interactive"]).error,
    ).toMatch(/--expect-host needs a value/);
  });

  it("leaves unrelated tokens (including query words) untouched", () => {
    const { rest } = extractProdRunFlags(["--top-k", "8", "yes and amen"]);
    expect(rest).toEqual(["--top-k", "8", "yes and amen"]);
  });
});

describe("resolveNonInteractiveCreds — env-strict resolution", () => {
  const fullEnv = {
    DATABASE_URL: "postgres://user:pw@db.rlwy.net:5432/rag",
    OPENROUTER_API_KEY: "sk-or-v1-test",
    EMBED_MODEL_ID: "qwen/qwen3-embedding-8b",
  };

  it("resolves all three creds from plain env names", () => {
    expect(resolveNonInteractiveCreds(fullEnv)).toEqual(fullEnv);
  });

  it("falls back to the namespaced Doppler keys (JFRAG_*)", () => {
    const creds = resolveNonInteractiveCreds({
      JFRAG_POSTGRESQL_DB_URL: "postgres://u:p@db.rlwy.net:5432/rag",
      JFRAG_OPENROUTER_API_KEY: "sk-or-v1-doppler",
      JFRAG_OPENROUTER_EMBED_MODEL_ID: "qwen/qwen3-embedding-8b",
    });
    expect(creds.DATABASE_URL).toBe("postgres://u:p@db.rlwy.net:5432/rag");
    expect(creds.OPENROUTER_API_KEY).toBe("sk-or-v1-doppler");
    expect(creds.EMBED_MODEL_ID).toBe("qwen/qwen3-embedding-8b");
  });

  it("prefers the plain name over the namespaced fallback", () => {
    const creds = resolveNonInteractiveCreds({
      ...fullEnv,
      JFRAG_POSTGRESQL_DB_URL: "postgres://other:x@elsewhere:5432/nope",
      JFRAG_OPENROUTER_API_KEY: "sk-or-v1-other",
    });
    expect(creds.DATABASE_URL).toBe(fullEnv.DATABASE_URL);
    expect(creds.OPENROUTER_API_KEY).toBe(fullEnv.OPENROUTER_API_KEY);
  });

  it("falls back to the default embedding model when none is in env", () => {
    const creds = resolveNonInteractiveCreds({
      DATABASE_URL: fullEnv.DATABASE_URL,
      OPENROUTER_API_KEY: fullEnv.OPENROUTER_API_KEY,
    });
    expect(creds.EMBED_MODEL_ID).toBe(DEFAULT_EMBED_MODEL);
  });

  it("fails closed when DATABASE_URL is missing everywhere", () => {
    expect(() =>
      resolveNonInteractiveCreds({ OPENROUTER_API_KEY: "sk-or-v1-x" }),
    ).toThrow(/required for: DATABASE_URL/);
  });

  it("fails closed when OPENROUTER_API_KEY is missing everywhere", () => {
    expect(() =>
      resolveNonInteractiveCreds({ DATABASE_URL: fullEnv.DATABASE_URL }),
    ).toThrow(/required for: OPENROUTER_API_KEY/);
  });

  it("rejects a malformed DATABASE_URL from env exactly like a typed one", () => {
    expect(() =>
      resolveNonInteractiveCreds({
        DATABASE_URL: "mysql://nope",
        OPENROUTER_API_KEY: "sk-or-v1-x",
      }),
    ).toThrow(/must start with postgres/);
  });
});

describe("resolveNonInteractiveCreds — --expect-host guard", () => {
  const env = {
    DATABASE_URL: "postgres://user:pw@db.rlwy.net:5432/rag",
    OPENROUTER_API_KEY: "sk-or-v1-test",
  };

  it("passes when the resolved host contains the expected substring", () => {
    expect(() =>
      resolveNonInteractiveCreds(env, { expectHost: "rlwy.net" }),
    ).not.toThrow();
  });

  it("aborts when the host does not match", () => {
    expect(() =>
      resolveNonInteractiveCreds(env, { expectHost: "localhost" }),
    ).toThrow(/--expect-host "localhost" does not match/);
  });
});

describe("resolveNonInteractiveCreds — prod-write second signal", () => {
  const env = {
    DATABASE_URL: "postgres://user:pw@db.rlwy.net:5432/rag",
    OPENROUTER_API_KEY: "sk-or-v1-test",
  };

  it("refuses a write op without JFRAG_ALLOW_PROD_WRITE=1", () => {
    expect(() => resolveNonInteractiveCreds(env, { writeOp: true })).toThrow(
      /JFRAG_ALLOW_PROD_WRITE=1/,
    );
    expect(() =>
      resolveNonInteractiveCreds(
        { ...env, JFRAG_ALLOW_PROD_WRITE: "true" },
        { writeOp: true },
      ),
    ).toThrow(/JFRAG_ALLOW_PROD_WRITE=1/); // exact-match "1", not truthiness
  });

  it("allows a write op with the explicit ack, and read ops without it", () => {
    expect(() =>
      resolveNonInteractiveCreds(
        { ...env, JFRAG_ALLOW_PROD_WRITE: "1" },
        { writeOp: true },
      ),
    ).not.toThrow();
    expect(() => resolveNonInteractiveCreds(env, {})).not.toThrow();
  });
});
