/**
 * Integration test for the Postgres storage adapters against the docker-compose
 * Postgres (`docker compose up -d`). It self-migrates (mirrors scripts/migrate.ts,
 * idempotent) and scopes all writes to a sentinel source key, cleaning up via
 * cascade so it never touches real corpus rows. Skips loudly when the DB is
 * unreachable so the suite stays green without Docker.
 *
 * Per the import law this adapter test may NOT import @/fakes (adapters import
 * only contracts), so query/chunk vectors are built inline as orthonormal
 * one-hots: a query equal to a chunk's vector scores cosine 1, orthogonal
 * vectors score 0 — enough to prove ranking + filtering end-to-end.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type {
  EmbeddedChunk,
  NormalizedDocument,
  RawDocument,
  SourceRecord,
} from "@/contracts/index.js";
import {
  EMBEDDING_DIMENSIONS,
  PostgresCorpusSearchStore,
  PostgresCorpusWriteStore,
  PostgresFetchStateStore,
  PostgresRawDocumentReader,
  PostgresRawDocumentStore,
} from "./index.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://jesusfilm_rag:jesusfilm_rag_dev@localhost:5434/jesusfilm_rag";
const TEST_KEY = "__it__/postgres-store";
const URL_PREFIX = "https://__it__/";

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

function sourceRecord(): SourceRecord {
  return {
    key: TEST_KEY,
    name: "IT Source",
    domain: "__it__",
    trust: "owned",
    ingestionMode: "html-scrape",
    languages: ["en"],
    defaultTags: ["audience:public"],
    defaultCategory: "article",
    rights: "test",
    contentHash: null,
  };
}

function doc(canonicalUrl: string, contentHash: string): NormalizedDocument {
  return {
    sourceKey: TEST_KEY,
    source: "__it__",
    canonicalUrl,
    title: "IT Doc",
    content: "body",
    language: "en",
    category: "article",
    tags: ["audience:public"],
    contentHash,
    metadata: {},
  };
}

function chunk(ord: number, text: string, embedding: number[]): EmbeddedChunk {
  return {
    ord,
    text,
    charStart: 0,
    charEnd: text.length,
    tokenCount: 5,
    tags: ["audience:public"],
    embedding,
    embeddingModel: "openai/text-embedding-3-small",
  };
}

function oneHot(i: number): number[] {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  v[i] = 1;
  return v;
}

async function countWhere(sql: postgres.Sql, table: "chunks" | "embeddings", url: string): Promise<number> {
  const rows =
    table === "chunks"
      ? await sql<{ n: number }[]>`
          SELECT count(*)::int AS n FROM chunks c
            JOIN documents d ON d.id = c.document_id
           WHERE d.canonical_url = ${url}`
      : await sql<{ n: number }[]>`
          SELECT count(*)::int AS n FROM chunk_embeddings e
            JOIN chunks c    ON c.id = e.chunk_id
            JOIN documents d ON d.id = c.document_id
           WHERE d.canonical_url = ${url}`;
  return rows[0].n;
}

function rawDoc(canonicalUrl: string, rawContent: string, bodyHash: string): RawDocument {
  return {
    sourceKey: TEST_KEY,
    url: canonicalUrl,
    canonicalUrl,
    title: "IT Raw Doc",
    rawContent,
    fetch: {
      status: 200,
      bodyHash,
      etag: null,
      lastModified: null,
      fetchedAt: "2026-05-22T00:00:00.000Z",
      notModified: false,
    },
  };
}

async function cleanup(sql: postgres.Sql): Promise<void> {
  await sql`DELETE FROM sources WHERE key = ${TEST_KEY}`; // cascades documents → chunks → embeddings
  await sql`DELETE FROM raw_documents WHERE source_key = ${TEST_KEY}`;
  await sql`DELETE FROM http_cache WHERE url LIKE ${URL_PREFIX + "%"}`;
  await sql`DELETE FROM robots_cache WHERE robots_url LIKE ${URL_PREFIX + "%"}`;
}

const dbUp = await reachable();
if (!dbUp) {
  console.warn(
    `[postgres-store.test] DB unreachable at ${DATABASE_URL} — skipping integration tests. Run \`docker compose up -d\`.`,
  );
}

describe.skipIf(!dbUp)("Postgres storage adapters (integration)", () => {
  let sql: postgres.Sql;
  let writeStore: PostgresCorpusWriteStore;
  let searchStore: PostgresCorpusSearchStore;
  let fetchState: PostgresFetchStateStore;
  let rawStore: PostgresRawDocumentStore;
  let rawReader: PostgresRawDocumentReader;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} });
    // The adapters now take a Drizzle db (ADR-0003); raw `sql` stays for the
    // test's own setup/assert helpers. Both wrap the same connection.
    const db = drizzle(sql);
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    await migrate(db, { migrationsFolder: "./migrations" });
    await sql`
      ALTER TABLE chunks ADD COLUMN IF NOT EXISTS search_tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;`;
    await sql`CREATE INDEX IF NOT EXISTS chunks_search_tsv_gin ON chunks USING GIN (search_tsv);`;
    await cleanup(sql);
    writeStore = new PostgresCorpusWriteStore(db);
    searchStore = new PostgresCorpusSearchStore(db);
    fetchState = new PostgresFetchStateStore(db);
    rawStore = new PostgresRawDocumentStore(db);
    rawReader = new PostgresRawDocumentReader(db);
  });

  afterAll(async () => {
    if (sql) {
      await cleanup(sql);
      await sql.end({ timeout: 5 });
    }
  });

  it("FetchStateStore: stores, reads back (ISO), and upserts http + robots cache", async () => {
    const url = `${URL_PREFIX}page1`;
    await fetchState.putHttpCache({
      url,
      etag: "v1",
      lastModified: "Wed, 21 Oct 2026 07:28:00 GMT",
      bodyHash: "bh1",
      status: 200,
      fetchedAt: "2026-05-22T00:00:00.000Z",
    });
    const got = await fetchState.getHttpCache(url);
    expect(got?.etag).toBe("v1");
    expect(got?.bodyHash).toBe("bh1");
    expect(got?.fetchedAt).toBe("2026-05-22T00:00:00.000Z");

    await fetchState.putHttpCache({
      url,
      etag: "v2",
      lastModified: null,
      bodyHash: "bh2",
      status: 304,
      fetchedAt: "2026-05-22T01:00:00.000Z",
    });
    expect((await fetchState.getHttpCache(url))?.etag).toBe("v2");
    expect(await fetchState.getHttpCache(`${URL_PREFIX}absent`)).toBeNull();

    const robotsUrl = `${URL_PREFIX}robots.txt`;
    await fetchState.putRobots({
      robotsUrl,
      body: "User-agent: *\nDisallow:",
      status: 200,
      fetchedAt: "2026-05-22T00:00:00.000Z",
    });
    expect((await fetchState.getRobots(robotsUrl))?.body).toContain("User-agent");
  });

  it("CorpusWriteStore + CorpusSearchStore: writes, dedups, and ranks by cosine", async () => {
    const sourceId = await writeStore.upsertSource(sourceRecord());
    expect(sourceId).toMatch(/^[0-9a-f-]{36}$/);

    const url = `${URL_PREFIX}doc-a`;
    await writeStore.replaceDocument(doc(url, "hash-a"), [
      chunk(0, "alpha chunk", oneHot(0)),
      chunk(1, "bravo chunk", oneHot(1)),
    ]);
    expect(await writeStore.getDedup(TEST_KEY, url)).toEqual({ contentHash: "hash-a" });

    // Query equal to chunk 0's vector → it ranks first at score ~1. Scope by
    // urlPrefix so the assertion is independent of other tests' rows.
    const results = await searchStore.vectorSearch(
      oneHot(0),
      { allowedSourceKeys: [TEST_KEY], urlPrefix: url },
      5,
    );
    expect(results).toHaveLength(2);
    expect(results[0].ord).toBe(0);
    expect(results[0].score).toBeCloseTo(1, 4);
    expect(results[0].sourceName).toBe("IT Source");
    expect(results[0].canonicalUrl).toBe(url);
    expect(results[0].contentHash).toBe("hash-a");
    expect(results[0].tags).toEqual(["audience:public"]);

    const byId = await searchStore.fetchById(results[0].chunkId);
    expect(byId?.text).toBe("alpha chunk");

    // Empty allow-list = nothing visible.
    expect(await searchStore.vectorSearch(oneHot(0), { allowedSourceKeys: [] }, 5)).toHaveLength(0);
  });

  it("replaceDocument re-index is delete-then-insert (embeddings cascade, no orphans)", async () => {
    await writeStore.upsertSource(sourceRecord());
    const url = `${URL_PREFIX}doc-b`;
    await writeStore.replaceDocument(doc(url, "v1"), [
      chunk(0, "x", oneHot(0)),
      chunk(1, "y", oneHot(1)),
      chunk(2, "z", oneHot(2)),
    ]);
    expect(await countWhere(sql, "chunks", url)).toBe(3);
    expect(await countWhere(sql, "embeddings", url)).toBe(3);

    await writeStore.replaceDocument(doc(url, "v2"), [chunk(0, "x", oneHot(0))]);
    expect(await countWhere(sql, "chunks", url)).toBe(1);
    expect(await countWhere(sql, "embeddings", url)).toBe(1);
    expect((await writeStore.getDedup(TEST_KEY, url))?.contentHash).toBe("v2");
  });

  it("keywordSearch matches the generated FTS column", async () => {
    await writeStore.upsertSource(sourceRecord());
    const url = `${URL_PREFIX}doc-c`;
    await writeStore.replaceDocument(doc(url, "kw"), [
      chunk(0, "the parable of the prodigal son", oneHot(0)),
      chunk(1, "loaves and fishes miracle", oneHot(1)),
    ]);
    const hits = await searchStore.keywordSearch(
      "prodigal son",
      { allowedSourceKeys: [TEST_KEY], urlPrefix: url },
      5,
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].text).toContain("prodigal");
  });

  it("RawDocumentStore: stages a row and replaces it idempotently per canonical_url", async () => {
    const url = `${URL_PREFIX}raw-1`;
    const pending = (): Promise<{ raw_content: string; body_hash: string }[]> =>
      sql`SELECT raw_content, body_hash FROM raw_documents
            WHERE source_key = ${TEST_KEY} AND canonical_url = ${url}
              AND ingested_at IS NULL`;

    await rawStore.putRawDocument(rawDoc(url, "first capture", "bh1"));
    let rows = await pending();
    expect(rows).toHaveLength(1);
    expect(rows[0].raw_content).toBe("first capture");
    expect(rows[0].body_hash).toBe("bh1");

    // Re-acquire the same page → the un-ingested row is replaced, not appended.
    await rawStore.putRawDocument(rawDoc(url, "second capture", "bh2"));
    rows = await pending();
    expect(rows).toHaveLength(1);
    expect(rows[0].raw_content).toBe("second capture");

    // An already-ingested snapshot row is left intact; a re-acquire stages a
    // fresh pending row beside it (Ingestion drains the pending one).
    await sql`UPDATE raw_documents SET ingested_at = now()
                WHERE source_key = ${TEST_KEY} AND canonical_url = ${url}`;
    await rawStore.putRawDocument(rawDoc(url, "third capture", "bh3"));
    expect(await pending()).toHaveLength(1);
    const all = await sql`SELECT count(*)::int AS n FROM raw_documents
                            WHERE source_key = ${TEST_KEY} AND canonical_url = ${url}`;
    expect(all[0].n).toBe(2);
  });

  it("RawDocumentReader: lists pending rows (ISO fetchedAt) and markIngested drains them", async () => {
    const u1 = `${URL_PREFIX}reader-1`;
    const u2 = `${URL_PREFIX}reader-2`;
    await rawStore.putRawDocument(rawDoc(u1, "reader body one", "rh1"));
    await rawStore.putRawDocument(rawDoc(u2, "reader body two", "rh2"));

    const pending = await rawReader.listPending({ sourceKey: TEST_KEY });
    const mine = pending.filter((p) => p.canonicalUrl === u1 || p.canonicalUrl === u2);
    expect(mine).toHaveLength(2);
    const one = mine.find((p) => p.canonicalUrl === u1)!;
    expect(one.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(one.rawContent).toBe("reader body one");
    expect(one.fetch.bodyHash).toBe("rh1");
    expect(one.fetch.fetchedAt).toBe("2026-05-22T00:00:00.000Z"); // Date → ISO string

    await rawReader.markIngested(mine.map((p) => p.id));
    const after = (await rawReader.listPending({ sourceKey: TEST_KEY })).filter(
      (p) => p.canonicalUrl === u1 || p.canonicalUrl === u2,
    );
    expect(after).toHaveLength(0); // both drained

    // includeIngested re-surfaces the consumed rows (full re-index path).
    const reindex = (
      await rawReader.listPending({ sourceKey: TEST_KEY, includeIngested: true })
    ).filter((p) => p.canonicalUrl === u1 || p.canonicalUrl === u2);
    expect(reindex).toHaveLength(2);
  });
});
