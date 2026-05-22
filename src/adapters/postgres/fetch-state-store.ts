/**
 * Postgres-backed FetchStateStore — Acquisition's HTTP conditional-fetch cache
 * (`http_cache`) and robots cache (`robots_cache`). See docs/architecture.md §4.
 *
 * Raw SQL over the injected postgres-js client: the import law forbids adapters
 * from importing the Drizzle schema (src/db), so the table/column names below
 * are the adapter's contract with the migration, not a typed reference.
 */
import type postgres from "postgres";
import type {
  FetchStateStore,
  HttpCacheEntry,
  RobotsEntry,
} from "@/contracts/index.js";

/**
 * Normalize a fetched_at value to ISO-8601 (the ports speak ISO). postgres-js
 * may hand back a Date or the raw Postgres timestamptz text
 * (`2026-05-22 00:00:00+00`); both round-trip through Date.
 */
function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

export class PostgresFetchStateStore implements FetchStateStore {
  constructor(private readonly sql: postgres.Sql) {}

  async getHttpCache(url: string): Promise<HttpCacheEntry | null> {
    const rows = await this.sql<
      {
        url: string;
        etag: string | null;
        last_modified: string | null;
        body_hash: string | null;
        status_code: number | null;
        fetched_at: Date | string;
      }[]
    >`
      SELECT url, etag, last_modified, body_hash, status_code, fetched_at
        FROM http_cache
       WHERE url = ${url}
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      url: row.url,
      etag: row.etag,
      lastModified: row.last_modified,
      bodyHash: row.body_hash ?? "",
      status: row.status_code,
      fetchedAt: toIso(row.fetched_at),
    };
  }

  async putHttpCache(entry: HttpCacheEntry): Promise<void> {
    await this.sql`
      INSERT INTO http_cache
        (url, etag, last_modified, body_hash, status_code, fetched_at, updated_at)
      VALUES (
        ${entry.url}, ${entry.etag}, ${entry.lastModified}, ${entry.bodyHash},
        ${entry.status}, ${entry.fetchedAt}::timestamptz, now()
      )
      ON CONFLICT (url) DO UPDATE SET
        etag          = EXCLUDED.etag,
        last_modified = EXCLUDED.last_modified,
        body_hash     = EXCLUDED.body_hash,
        status_code   = EXCLUDED.status_code,
        fetched_at    = EXCLUDED.fetched_at,
        updated_at    = now()
    `;
  }

  async getRobots(robotsUrl: string): Promise<RobotsEntry | null> {
    const rows = await this.sql<
      {
        robots_url: string;
        body: string | null;
        status_code: number | null;
        fetched_at: Date | string;
      }[]
    >`
      SELECT robots_url, body, status_code, fetched_at
        FROM robots_cache
       WHERE robots_url = ${robotsUrl}
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      robotsUrl: row.robots_url,
      body: row.body,
      status: row.status_code,
      fetchedAt: toIso(row.fetched_at),
    };
  }

  async putRobots(entry: RobotsEntry): Promise<void> {
    await this.sql`
      INSERT INTO robots_cache
        (robots_url, body, status_code, fetched_at, updated_at)
      VALUES (
        ${entry.robotsUrl}, ${entry.body}, ${entry.status},
        ${entry.fetchedAt}::timestamptz, now()
      )
      ON CONFLICT (robots_url) DO UPDATE SET
        body        = EXCLUDED.body,
        status_code = EXCLUDED.status_code,
        fetched_at  = EXCLUDED.fetched_at,
        updated_at  = now()
    `;
  }
}
