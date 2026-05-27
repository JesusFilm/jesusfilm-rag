import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/env.js";

let cached: { client: postgres.Sql; db: PostgresJsDatabase } | null = null;

export function getDb(): { client: postgres.Sql; db: PostgresJsDatabase } {
  if (cached) return cached;
  const { DATABASE_URL } = getEnv();
  const client = postgres(DATABASE_URL, { max: 5 });
  const db = drizzle(client);
  cached = { client, db };
  return cached;
}

export async function closeDb(): Promise<void> {
  if (cached) {
    await cached.client.end();
    cached = null;
  }
}
