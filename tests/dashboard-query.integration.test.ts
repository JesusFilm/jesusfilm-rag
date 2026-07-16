/**
 * Integration coverage for the dashboard prod read against the docker-compose
 * Postgres — mirrors tests/retrieval.integration.test.ts. It lives in a
 * `*.integration.test.ts` file (not the unit `*.test.ts` path) precisely because
 * it touches a real adapter, and it skips loudly when the DB is unreachable so
 * the suite stays green without Docker.
 */
import { describe, it, expect } from "vitest";
import postgres from "postgres";
import { fetchProdStatus } from "../scripts/lib/dashboard/query.js";
import { prodReadSchema } from "../scripts/lib/dashboard/types.js";

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
  // Never interpolate DATABASE_URL — it may carry credentials (CodeRabbit #5).
  console.warn("[dashboard-query.integration] DB unreachable — skipping. Run `docker compose up -d`.");
}

describe.skipIf(!dbUp)("fetchProdStatus (integration, real Postgres)", () => {
  it("returns schema-valid data; acquired ⊇ ingested keys", async () => {
    const sql = postgres(DATABASE_URL, { max: 2, onnotice: () => {} });
    try {
      const data = await fetchProdStatus(sql);
      expect(() => prodReadSchema.parse(data)).not.toThrow();
      // Every ingested key must also be an acquired key (you can't embed what you
      // never staged) — a structural invariant of the real pipeline.
      const acquired = new Set(data.acquired_keys);
      // Exclude integration sentinel sources (`__it__/*`). A sibling integration
      // file (retrieval.integration) runs concurrently against this same DB and
      // writes documents straight through the Ingestion write path with no
      // raw_documents staging row — so a sentinel source is transiently
      // ingested-but-not-acquired. The invariant is about real corpus, not test
      // fixtures; the two files share the DB, so scope the assertion to real keys.
      const realIngested = data.ingested.filter(
        (row) => !row.key.startsWith("__it__/"),
      );
      for (const row of realIngested) expect(acquired.has(row.key)).toBe(true);
      for (const row of data.ingested) expect(Number.isInteger(row.embedded_doc_count)).toBe(true);
    } finally {
      await sql.end({ timeout: 2 });
    }
  });
});
