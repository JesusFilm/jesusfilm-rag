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
  redactDbUrl,
  redactSecret,
  resolveCredential,
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
