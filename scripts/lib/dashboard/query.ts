/**
 * Prod-database read for the dashboard. Two facts, separately sourced:
 *
 *   ingested  — one (key, language) row per source that has embedding vectors,
 *               with its embedded document count. Drives `ingest` + the count.
 *   acquired  — every source key present in raw_documents (acquisition staging).
 *               Drives `acquire` (a key may be acquired in several languages
 *               under one raw_documents key — see thelife-fr / familylife-es).
 *
 * Read-only: a couple of SELECTs, no writes. `shapeProdStatus` is pure (coerces
 * the driver's bigint-as-string counts, dedupes, validates) so it is unit-
 * tested without a database; `fetchProdStatus` is the thin DB-touching wrapper.
 */
import type postgres from "postgres";
import { prodReadSchema, type ProdRead } from "./types.js";

/** Ingested (source × language) inventory with embedded-document counts. */
export const INGESTED_SQL = `
SELECT s.key            AS key,
       s.name           AS name,
       s.domain         AS host,
       d.language       AS language,
       count(DISTINCT d.id) AS embedded_doc_count
FROM sources s
JOIN documents d         ON d.source_id   = s.id
JOIN chunks c            ON c.document_id = d.id
JOIN chunk_embeddings ce ON ce.chunk_id   = c.id
GROUP BY s.key, s.name, s.domain, d.language
ORDER BY s.key, d.language
`;

/** Every acquired source key (acquisition staging). */
export const ACQUIRED_SQL = `
SELECT DISTINCT source_key AS key
FROM raw_documents
ORDER BY source_key
`;

export interface RawIngestedRow {
  key: string;
  name: string;
  host: string | null;
  language: string | null;
  embedded_doc_count: number | string | bigint;
}
export interface RawAcquiredRow {
  key: string;
}

/**
 * Shape + validate raw driver rows into ProdStatusData. Pure. Coerces the
 * postgres `count()` (bigint → string) to a number and dedupes acquired keys.
 *
 * Rows with a null/empty language are NOT dropped — they are embedded and
 * retrievable, just unattributed to a language. Dropping them silently
 * under-reports the index (#86), so they are tallied per source into
 * `unclassified` and surfaced separately by the dashboard.
 */
export function shapeProdStatus(
  ingestedRows: RawIngestedRow[],
  acquiredRows: RawAcquiredRow[],
): ProdRead {
  const hasLanguage = (r: RawIngestedRow): boolean =>
    r.language != null && r.language !== "";

  const ingested = ingestedRows.filter(hasLanguage).map((r) => ({
    key: r.key,
    name: r.name,
    host: r.host ?? null,
    language: r.language as string,
    embedded_doc_count: Number(r.embedded_doc_count),
  }));

  // Tally null-language rows per source. INGESTED_SQL groups by language, so a
  // source contributes at most one null row today; summing keeps it correct if
  // that ever changes.
  const unclassifiedByKey = new Map<string, ProdRead["unclassified"][number]>();
  for (const r of ingestedRows) {
    if (hasLanguage(r)) continue;
    const count = Number(r.embedded_doc_count);
    const prev = unclassifiedByKey.get(r.key);
    if (prev) prev.embedded_doc_count += count;
    else
      unclassifiedByKey.set(r.key, {
        key: r.key,
        name: r.name,
        host: r.host ?? null,
        embedded_doc_count: count,
      });
  }
  const unclassified = [...unclassifiedByKey.values()].sort(
    (a, b) => b.embedded_doc_count - a.embedded_doc_count || a.key.localeCompare(b.key),
  );

  const acquired_keys = [...new Set(acquiredRows.map((r) => r.key))].sort();
  return prodReadSchema.parse({ ingested, acquired_keys, unclassified });
}

/** Run both reads against an open postgres client and shape the result. */
export async function fetchProdStatus(sql: postgres.Sql): Promise<ProdRead> {
  const [ingestedRows, acquiredRows] = await Promise.all([
    sql.unsafe(INGESTED_SQL) as unknown as Promise<RawIngestedRow[]>,
    sql.unsafe(ACQUIRED_SQL) as unknown as Promise<RawAcquiredRow[]>,
  ]);
  return shapeProdStatus(ingestedRows, acquiredRows);
}
