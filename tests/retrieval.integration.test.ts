/**
 * Integration test for the Retrieval context against the real Postgres RAG store
 * (docker-compose Postgres). It wires the production PostgresCorpusSearchStore
 * into createRetriever and proves the retrieve pipeline returns real, ranked,
 * cited rows queried out of the database — not a fake.
 *
 * Why it lives outside src/: combining a concrete adapter (src/adapters) with a
 * context (src/retrieval) is composition-level work the import law confines to
 * the wiring layer — exactly why no *.test.ts under src/ may import an adapter
 * (.dependency-cruiser.cjs). `pnpm depcruise` cruises only src/, so this file is
 * the legitimate place to assemble the two, the same role main.ts plays.
 *
 * It self-migrates (idempotent, mirrors scripts/migrate.ts), scopes every write
 * to a sentinel source key and cleans up via cascade so it never touches real
 * corpus rows, and skips loudly when the DB is unreachable so the suite stays
 * green without Docker. The query embedder is a stub returning a fixed one-hot
 * vector (no network), so cosine scores are exact: a query equal to a chunk's
 * vector scores 1, an orthogonal chunk scores 0 — enough to prove ranking +
 * the minScore cutoff + citation assembly end-to-end through the real store.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type {
  EmbeddedChunk,
  Embedder,
  NormalizedDocument,
  SourceRecord,
} from "@/contracts/index.js";
import {
  EMBEDDING_DIMENSIONS,
  PostgresCorpusSearchStore,
  PostgresCorpusWriteStore,
} from "@/adapters/postgres/index.js";
import { createRetriever } from "@/retrieval/index.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://jesusfilm_rag:jesusfilm_rag_dev@localhost:5434/jesusfilm_rag";
const TEST_KEY = "__it__/retrieval";
const URL_PREFIX = "https://__it__/retrieval/";

/** Embedder double: embedQuery returns a fixed vector, so cosines are exact. */
class StubEmbedder implements Embedder {
  readonly model = "openai/text-embedding-3-small";
  readonly dimensions = EMBEDDING_DIMENSIONS;
  constructor(private readonly q: number[]) {}
  async embed(texts: string[]): Promise<(number[] | null)[]> {
    return texts.map(() => this.q);
  }
  async embedQuery(): Promise<number[]> {
    return this.q;
  }
}

function oneHot(i: number): number[] {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  v[i] = 1;
  return v;
}

/**
 * Unit vector with cosine `c` to oneHot(0): puts `c` on axis 0 and the remainder
 * on axis 1. Used for the second fixture doc. We deliberately give it a *positive*
 * cosine (not 0) so it stays inside pgvector's HNSW candidate window (ef_search,
 * default 40) even when the shared dev DB holds thousands of real chunks: the
 * source filter (`allowedSourceKeys`) is applied AFTER the index walk, so a
 * cosine-0 in-scope doc gets pushed out of the window by nearer out-of-scope
 * neighbors once the corpus is large (real embeddings score ≪0.15 on a one-hot
 * axis, so 0.3 reliably ranks 2nd globally). The under-recall this exposes for
 * filtered queries on a large corpus is tracked as a retrieval follow-up.
 */
function cosTo0(c: number): number[] {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  v[0] = c;
  v[1] = Math.sqrt(1 - c * c);
  return v;
}

function sentinelSource(): SourceRecord {
  return {
    key: TEST_KEY,
    name: "IT Retrieval Source",
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

function doc(slug: string, contentHash: string): NormalizedDocument {
  return {
    sourceKey: TEST_KEY,
    source: "__it__",
    canonicalUrl: `${URL_PREFIX}${slug}`,
    title: `IT Doc ${slug}`,
    content: "body",
    language: "en",
    category: "article",
    tags: ["audience:public"],
    contentHash,
    metadata: {},
  };
}

function chunk(text: string, embedding: number[]): EmbeddedChunk {
  return {
    ord: 0,
    text,
    charStart: 0,
    charEnd: text.length,
    tokenCount: 5,
    tags: ["audience:public"],
    embedding,
    embeddingModel: "openai/text-embedding-3-small",
  };
}

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

async function cleanup(sql: postgres.Sql): Promise<void> {
  await sql`DELETE FROM sources WHERE key = ${TEST_KEY}`; // cascades documents → chunks → embeddings
}

const dbUp = await reachable();
if (!dbUp) {
  console.warn(
    `[retrieval.integration] DB unreachable at ${DATABASE_URL} — skipping. Run \`docker compose up -d\`.`,
  );
}

describe.skipIf(!dbUp)("Retrieval over the real Postgres store (integration)", () => {
  let sql: postgres.Sql;
  let db: PostgresJsDatabase;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} });
    db = drizzle(sql);
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    await migrate(db, { migrationsFolder: "./migrations" });
    await sql`
      ALTER TABLE chunks ADD COLUMN IF NOT EXISTS search_tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;`;
    await cleanup(sql);

    const writeStore = new PostgresCorpusWriteStore(db);
    await writeStore.upsertSource(sentinelSource());
    await writeStore.replaceDocument(doc("match", "hash-match"), [
      chunk("the matching passage", oneHot(0)),
    ]);
    await writeStore.replaceDocument(doc("orthogonal", "hash-ortho"), [
      chunk("an unrelated passage", cosTo0(0.3)), // cosine 0.3 to the query: below the 0.37 cutoff, above the HNSW noise
    ]);
  });

  afterAll(async () => {
    if (sql) {
      await cleanup(sql);
      await sql.end({ timeout: 5 });
    }
  });

  it("returns ranked, cited rows from the store and applies the minScore cutoff", async () => {
    const retriever = createRetriever({
      embedder: new StubEmbedder(oneHot(0)), // aligns with the "match" doc's chunk
      search: new PostgresCorpusSearchStore(db),
    });

    const hits = await retriever.search("probe", { allowedSourceKeys: [TEST_KEY] });

    // Orthogonal doc scores cosine 0.3 (< default minScore 0.37) and is dropped.
    expect(hits).toHaveLength(1);
    const top = hits[0];
    expect(top.score).toBeCloseTo(1.0, 5);
    expect(top.text).toBe("the matching passage");
    expect(top.citation).toEqual({
      sourceKey: TEST_KEY,
      sourceName: "IT Retrieval Source",
      title: "IT Doc match",
      url: `${URL_PREFIX}match`,
    });
  });

  it("returns both docs when the cutoff is relaxed, ranked by cosine", async () => {
    const retriever = createRetriever({
      embedder: new StubEmbedder(oneHot(0)),
      search: new PostgresCorpusSearchStore(db),
    });

    const hits = await retriever.search("probe", {
      allowedSourceKeys: [TEST_KEY],
      minScore: 0,
    });

    expect(hits.map((h) => h.citation.url)).toEqual([
      `${URL_PREFIX}match`, // cosine 1.0 first
      `${URL_PREFIX}orthogonal`, // cosine 0.3 second
    ]);
  });
});
