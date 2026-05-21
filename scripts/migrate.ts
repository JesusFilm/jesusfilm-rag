import "@/env.js";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getEnv } from "@/env.js";

async function main(): Promise<void> {
  const { DATABASE_URL } = getEnv();
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  // Bring up pgvector if not already present — migrations assume it exists.
  await client`CREATE EXTENSION IF NOT EXISTS vector;`;
  await migrate(db, { migrationsFolder: "./migrations" });

  // Add a generated tsvector column + GIN index for keyword search. Drizzle
  // doesn't model generated columns well as of v0.45; we add it idempotently
  // outside the migrator. Postgres 12+ supports GENERATED ALWAYS AS ... STORED.
  await client`
    ALTER TABLE chunks
    ADD COLUMN IF NOT EXISTS search_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;
  `;
  await client`CREATE INDEX IF NOT EXISTS chunks_search_tsv_gin ON chunks USING GIN (search_tsv);`;

  await client.end();
  console.log("migrations applied");
}

main().catch((err: unknown) => {
  console.error("migration failed:", err);
  process.exit(1);
});
