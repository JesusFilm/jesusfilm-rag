/**
 * Postgres-backed FetchStateStore — Acquisition's HTTP conditional-fetch cache
 * (`http_cache`) and robots cache (`robots_cache`). See docs/architecture.md §4.
 *
 * Drizzle's query builder over src/db/schema.ts (ADR-0003). The ports speak ISO
 * strings; the `fetched_at` columns are timestamptz, so writes pass a Date and
 * reads normalize back to ISO via `toIso`.
 */
import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  FetchStateStore,
  HttpCacheEntry,
  RobotsEntry,
} from "@/contracts/index.js";
import { httpCache, robotsCache } from "@/db/schema.js";

/**
 * Normalize a timestamptz read to ISO-8601 (the ports speak ISO). Drizzle hands
 * back a Date for a timestamp column; guard the string case defensively.
 */
function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export class PostgresFetchStateStore implements FetchStateStore {
  constructor(private readonly db: PostgresJsDatabase) {}

  async getHttpCache(url: string): Promise<HttpCacheEntry | null> {
    const [row] = await this.db
      .select({
        url: httpCache.url,
        etag: httpCache.etag,
        lastModified: httpCache.lastModified,
        bodyHash: httpCache.bodyHash,
        status: httpCache.statusCode,
        fetchedAt: httpCache.fetchedAt,
      })
      .from(httpCache)
      .where(eq(httpCache.url, url));
    if (!row) return null;
    return {
      url: row.url,
      etag: row.etag,
      lastModified: row.lastModified,
      bodyHash: row.bodyHash ?? "",
      status: row.status,
      fetchedAt: toIso(row.fetchedAt),
    };
  }

  async putHttpCache(entry: HttpCacheEntry): Promise<void> {
    const mutable = {
      etag: entry.etag,
      lastModified: entry.lastModified,
      bodyHash: entry.bodyHash,
      statusCode: entry.status,
      fetchedAt: new Date(entry.fetchedAt),
      updatedAt: sql`now()`,
    };
    await this.db
      .insert(httpCache)
      .values({ url: entry.url, ...mutable })
      .onConflictDoUpdate({ target: httpCache.url, set: mutable });
  }

  async getRobots(robotsUrl: string): Promise<RobotsEntry | null> {
    const [row] = await this.db
      .select({
        robotsUrl: robotsCache.robotsUrl,
        body: robotsCache.body,
        status: robotsCache.statusCode,
        fetchedAt: robotsCache.fetchedAt,
      })
      .from(robotsCache)
      .where(eq(robotsCache.robotsUrl, robotsUrl));
    if (!row) return null;
    return {
      robotsUrl: row.robotsUrl,
      body: row.body,
      status: row.status,
      fetchedAt: toIso(row.fetchedAt),
    };
  }

  async putRobots(entry: RobotsEntry): Promise<void> {
    const mutable = {
      body: entry.body,
      statusCode: entry.status,
      fetchedAt: new Date(entry.fetchedAt),
      updatedAt: sql`now()`,
    };
    await this.db
      .insert(robotsCache)
      .values({ robotsUrl: entry.robotsUrl, ...mutable })
      .onConflictDoUpdate({ target: robotsCache.robotsUrl, set: mutable });
  }
}
