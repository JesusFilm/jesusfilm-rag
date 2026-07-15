/**
 * Integration test for the language-preservation invariant of replaceDocument
 * (#73): a re-ingest / re-embed must NEVER null out an established language, but a
 * confident NEW detection still wins. Kept in its own file (the main store test is
 * at the module size cap). Self-migrates and scopes to a sentinel source key,
 * skipping loudly when the docker-compose Postgres is unreachable.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { EmbeddedChunk, NormalizedDocument, SourceRecord } from "@/contracts/index.js";
import { EMBEDDING_DIMENSIONS, PostgresCorpusWriteStore } from "./index.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://jesusfilm_rag:jesusfilm_rag_dev@localhost:5434/jesusfilm_rag";
const TEST_KEY = "__it__/lang-preserve";
const URL = "https://__it__/lang-preserve/doc";

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

const source: SourceRecord = {
  key: TEST_KEY,
  name: "IT Source",
  domain: "__it__",
  trust: "owned",
  ingestionMode: "html-scrape",
  languages: ["en", "fr"],
  defaultTags: ["audience:public"],
  defaultCategory: "article",
  rights: "test",
  contentHash: null,
};

function doc(contentHash: string, language: string | null): NormalizedDocument {
  return {
    sourceKey: TEST_KEY,
    source: "__it__",
    canonicalUrl: URL,
    title: "IT Doc",
    content: "body",
    language,
    category: "article",
    tags: ["audience:public"],
    contentHash,
    metadata: {},
  };
}

const chunk: EmbeddedChunk = {
  ord: 0,
  text: "x",
  charStart: 0,
  charEnd: 1,
  tokenCount: 1,
  tags: ["audience:public"],
  embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === 0 ? 1 : 0)),
  embeddingModel: "openai/text-embedding-3-small",
};

const dbUp = await reachable();
if (!dbUp) {
  console.warn(`[lang-preserve.test] DB unreachable at ${DATABASE_URL} — skipping. Run \`docker compose up -d\`.`);
}

describe.skipIf(!dbUp)("replaceDocument language preservation (integration)", () => {
  let sql: postgres.Sql;
  let writeStore: PostgresCorpusWriteStore;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} });
    await migrate(drizzle(sql), { migrationsFolder: "migrations" });
    writeStore = new PostgresCorpusWriteStore(drizzle(sql));
    await sql`delete from sources where key = ${TEST_KEY}`; // cascade cleans docs/chunks
  });

  afterAll(async () => {
    await sql`delete from sources where key = ${TEST_KEY}`;
    await sql.end({ timeout: 5 });
  });

  it("a re-embed abstaining to null keeps the label; a confident new one wins", async () => {
    await writeStore.upsertSource(source);
    const lang = async () =>
      (await sql`select d.language from documents d join sources s on s.id = d.source_id
                 where s.key = ${TEST_KEY} and d.canonical_url = ${URL}`)[0]?.language;

    await writeStore.replaceDocument(doc("h1", "en"), [chunk]); // established 'en'
    await writeStore.replaceDocument(doc("h2", null), [chunk]); // re-embed → null
    expect(await lang()).toBe("en"); // must NOT be nulled out
    await writeStore.replaceDocument(doc("h3", "fr"), [chunk]); // confident new detection
    expect(await lang()).toBe("fr"); // still overrides
  });
});
