/**
 * Unit tests for the dashboard prod read — FAKES ONLY (no Postgres, no network,
 * no DATABASE_URL), per the repo's unit-test guideline. The real-adapter
 * coverage lives in tests/dashboard-query.integration.test.ts.
 */
import { describe, it, expect, vi } from "vitest";
import type postgres from "postgres";
import { shapeProdStatus, fetchProdStatus } from "../scripts/lib/dashboard/query.js";
import { prodReadSchema } from "../scripts/lib/dashboard/types.js";

describe("shapeProdStatus (pure)", () => {
  it("coerces bigint-string counts, tallies null-language rows into unclassified, dedupes acquired keys", () => {
    const out = shapeProdStatus(
      [
        { key: "thelife", name: "thelife", host: "thelife.com", language: "en", embedded_doc_count: "4485" },
        { key: "x", name: "X", host: null, language: null, embedded_doc_count: "10" }, // → unclassified (null lang)
      ],
      [{ key: "thelife" }, { key: "thelife" }, { key: "thelife-fr" }],
    );
    expect(out.ingested).toEqual([
      { key: "thelife", name: "thelife", host: "thelife.com", language: "en", embedded_doc_count: 4485 },
    ]);
    expect(typeof out.ingested[0].embedded_doc_count).toBe("number");
    // The null-language row is surfaced per source, not dropped (#86).
    expect(out.unclassified).toEqual([{ key: "x", name: "X", host: null, embedded_doc_count: 10 }]);
    expect(typeof out.unclassified[0].embedded_doc_count).toBe("number");
    expect(out.acquired_keys).toEqual(["thelife", "thelife-fr"]);
  });

  it("produces a schema-valid ProdRead", () => {
    expect(() => prodReadSchema.parse(shapeProdStatus([], []))).not.toThrow();
  });
});

describe("fetchProdStatus (fake postgres client — no DB, no network)", () => {
  it("runs both reads and shapes them, with no real adapter", async () => {
    // Two `sql.unsafe(...)` calls: ingested rows, then acquired keys.
    const unsafe = vi
      .fn()
      .mockResolvedValueOnce([
        { key: "thelife", name: "thelife", host: "thelife.com", language: "en", embedded_doc_count: "2" },
      ])
      .mockResolvedValueOnce([{ key: "thelife" }, { key: "thelife-fr" }]);
    const sql = { unsafe } as unknown as postgres.Sql;

    await expect(fetchProdStatus(sql)).resolves.toEqual({
      ingested: [
        { key: "thelife", name: "thelife", host: "thelife.com", language: "en", embedded_doc_count: 2 },
      ],
      acquired_keys: ["thelife", "thelife-fr"],
      unclassified: [],
    });
    expect(unsafe).toHaveBeenCalledTimes(2);
  });
});
