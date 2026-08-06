import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { NormalizedDocument, SourceRecord } from "@/contracts/index.js";
import { PostgresCorpusWriteStore } from "./index.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://jesusfilm_rag:jesusfilm_rag_dev@localhost:5434/jesusfilm_rag";
const KEY = "__it__/empty-document";

const client = postgres(DATABASE_URL, { max: 1, connect_timeout: 2, onnotice: () => {} });
let dbUp = true;
try {
  await client`select 1`;
} catch {
  dbUp = false;
}

describe.skipIf(!dbUp)("PostgresCorpusWriteStore empty document (integration)", () => {
  const db = drizzle(client);
  const writer = new PostgresCorpusWriteStore(db);
  const source: SourceRecord = {
    key: KEY,
    name: "Empty document test",
    domain: "__it__",
    trust: "owned",
    ingestionMode: "html-scrape",
    languages: ["en"],
    defaultTags: [],
    defaultCategory: "article",
    rights: "test",
    contentHash: null,
  };
  const doc: NormalizedDocument = {
    sourceKey: KEY,
    source: "__it__",
    canonicalUrl: "https://__it__/empty-document",
    title: "Empty",
    content: "",
    language: null,
    category: "article",
    tags: [],
    contentHash: "empty-hash",
    metadata: {},
  };

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./migrations" });
    await client`delete from sources where key = ${KEY}`;
  });
  afterAll(async () => {
    await client`delete from sources where key = ${KEY}`;
    await client.end({ timeout: 1 });
  });

  it("commits the document and skips empty bulk inserts", async () => {
    await writer.upsertSource(source);
    await writer.replaceDocument(doc, []);
    expect(await writer.getDedup(KEY, doc.canonicalUrl)).toEqual({
      contentHash: "empty-hash",
      embeddingModel: null,
    });
  });
});

if (!dbUp) await client.end({ timeout: 1 });
