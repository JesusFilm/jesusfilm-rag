/**
 * Tests for the dashboard prod read.
 *  - shapeProdStatus: pure, no DB — coercion + dedup + validation.
 *  - fetchProdStatus: a guarded integration test against the docker-compose DB
 *    (skips loudly when unreachable, mirroring tests/retrieval.integration.test.ts).
 */
import { describe, it, expect } from "vitest";
import postgres from "postgres";
import { shapeProdStatus, fetchProdStatus } from "../scripts/lib/dashboard/query.js";
import { prodStatusDataSchema } from "../scripts/lib/dashboard/types.js";

describe("shapeProdStatus (pure)", () => {
  it("coerces bigint-string counts, drops null-language rows, dedupes acquired keys", () => {
    const out = shapeProdStatus(
      [
        { key: "thelife", name: "thelife", host: "thelife.com", language: "en", embedded_doc_count: "4485" },
        { key: "x", name: "X", host: null, language: null, embedded_doc_count: "10" }, // dropped (null lang)
      ],
      [{ key: "thelife" }, { key: "thelife" }, { key: "thelife-fr" }],
    );
    expect(out.ingested).toEqual([
      { key: "thelife", name: "thelife", host: "thelife.com", language: "en", embedded_doc_count: 4485 },
    ]);
    expect(typeof out.ingested[0].embedded_doc_count).toBe("number");
    expect(out.acquired_keys).toEqual(["thelife", "thelife-fr"]);
  });

  it("produces a schema-valid ProdStatusData", () => {
    const out = shapeProdStatus([], []);
    expect(() => prodStatusDataSchema.parse(out)).not.toThrow();
  });
});

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://jesusfilm_rag:jesusfilm_rag_dev@localhost:5434/jesusfilm_rag";

async function reachable(): Promise<boolean> {
  const probe = postgres(DATABASE_URL, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    await probe`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.end({ timeout: 1 });
  }
}

const dbUp = await reachable();
if (!dbUp) {
  console.warn(`[dashboard-query] DB unreachable at ${DATABASE_URL} — skipping integration. Run \`docker compose up -d\`.`);
}

describe.skipIf(!dbUp)("fetchProdStatus (integration, real Postgres)", () => {
  it("returns schema-valid data; acquired ⊇ ingested keys", async () => {
    const sql = postgres(DATABASE_URL, { max: 2, onnotice: () => {} });
    try {
      const data = await fetchProdStatus(sql);
      expect(() => prodStatusDataSchema.parse(data)).not.toThrow();
      // Every ingested key must also be an acquired key (you can't embed what you
      // never staged) — a structural invariant of the pipeline.
      const acquired = new Set(data.acquired_keys);
      for (const row of data.ingested) expect(acquired.has(row.key)).toBe(true);
      // Counts are non-negative integers.
      for (const row of data.ingested) expect(Number.isInteger(row.embedded_doc_count)).toBe(true);
    } finally {
      await sql.end({ timeout: 2 });
    }
  });
});
