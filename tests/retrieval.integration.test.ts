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
 * on axis 1. Used for the second fixture doc.
 *
 * **FOLLOW-UP J #17 limitation surfaced at slice #6 (23k+ chunks).** This
 * fixture's embedding lives in a region of vector space that's *Euclidean-far*
 * from `match` (cosine 0.3 ≠ "near" in HNSW graph terms — `[0.3, √0.91, 0…]`
 * vs `[1, 0, 0…]` are ~1.4 apart). HNSW starts its walk at `match` (cosine 1.0)
 * and explores its graph neighbors — all of which are real-corpus chunks that
 * happen to be slightly-non-zero on axis 0 (real chunks score ≤0.12 on a
 * one-hot axis, confirmed empirically). The walker has no graph edge into this
 * fixture's neighborhood, so the source post-filter (`allowedSourceKeys`)
 * never sees this row even though it's globally rank-2 by exact cosine. This
 * is the **exact pathology FOLLOW-UP J #17 predicts**: HNSW post-filter
 * under-recalls in-scope docs when out-of-scope neighbors dominate the
 * graph. The row IS in the table (verifiable via `fetchById`), just not in
 * the candidate window.
 *
 * Pre-slice-#6 (~14k chunks) the walker still happened to find it; the slice-#6
 * ingest (familylife, +9,815 chunks → 23,522) tipped the corpus past the size
 * where this approximation holds. Test 2 below now asserts only what's still
 * reliable (match is rank 1) until #17 lands and pre-filters scoped queries.
 *
 * 2026-07-02: #17's fix landed as pgvector iterative index scans (see
 * corpus-search-store.vectorSearch + the swarm test below). It cures WINDOW
 * starvation — the production failure — but not this fixture's graph-island
 * (its back-edges lose every pruning contest to real-corpus neighbors), so
 * test 2 stays loosened. An in-filter row must be graph-REACHABLE for any
 * HNSW scan to find it; exact-scan fallback would be a different follow-up.
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

  it("returns the match doc ranked first when the cutoff is relaxed (FOLLOW-UP J #17 limits the rest)", async () => {
    const retriever = createRetriever({
      embedder: new StubEmbedder(oneHot(0)),
      search: new PostgresCorpusSearchStore(db),
    });

    const hits = await retriever.search("probe", {
      allowedSourceKeys: [TEST_KEY],
      minScore: 0,
    });

    // What we can still assert at 23k+ chunks:
    //  - the minScore-0 override works (no default-cutoff drop), AND
    //  - `match` (cosine 1.0) is rank 1.
    // What we CAN'T assert without FOLLOW-UP J #17: the `orthogonal` fixture
    // (cosine 0.3, but Euclidean-far from match in vector space) survives
    // HNSW's graph walk to make the candidate window. See the cosTo0 docstring
    // above. Re-tighten this to `toEqual([match, orthogonal])` once #17 lands.
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].citation.url).toBe(`${URL_PREFIX}match`);
    expect(hits[0].score).toBeCloseTo(1.0, 5);
  });

  /**
   * Issue #79 end-to-end through the real store: a two-chunk document whose
   * lead-in chunk wins the ranking but whose answer sits in a later chunk. The
   * 3-key dedup returns one chunk; `includeDocument` must reassemble the whole
   * body (both chunks, `ord` order) from the real `fetchDocumentTexts` SQL.
   *
   * Seeds a fresh sentinel doc; runs before the swarm test below (which floods
   * the source with 60 rows). Cleaned up by afterAll's cascade like every row.
   */
  it("reassembles the full document from all its chunks when includeDocument is set (#79)", async () => {
    const writeStore = new PostgresCorpusWriteStore(db);
    await writeStore.replaceDocument(doc("buried", "hash-buried"), [
      { ...chunk("a long lead-in anecdote about Antarctica", oneHot(0)), ord: 0 },
      { ...chunk("the actual answer the reader came for", cosTo0(0.2)), ord: 1 },
    ]);

    const retriever = createRetriever({
      embedder: new StubEmbedder(oneHot(0)), // matches chunk 0 (cosine 1.0)
      search: new PostgresCorpusSearchStore(db),
    });

    const hits = await retriever.search("probe", {
      allowedSourceKeys: [TEST_KEY],
      includeDocument: true,
    });
    const buried = hits.find((h) => h.citation.url === `${URL_PREFIX}buried`);

    expect(buried).toBeDefined();
    // `text` is still the matched lead-in chunk (the ranking evidence)…
    expect(buried?.text).toBe("a long lead-in anecdote about Antarctica");
    // …and `document` carries the whole body, including the later answer chunk.
    expect(buried?.document).toBe(
      "a long lead-in anecdote about Antarctica\n\n" +
        "the actual answer the reader came for",
    );

    // The default path (no flag) still omits the field — no payload regression.
    const plain = await retriever.search("probe", { allowedSourceKeys: [TEST_KEY] });
    expect(plain.find((h) => h.citation.url === `${URL_PREFIX}buried`)?.document).toBeUndefined();
  });

  /**
   * FOLLOW-UP J #17, production form (hit by the 2026-07-02 multilingual eval):
   * a filtered search whose in-scope rows live behind a wall of out-of-scope
   * neighbors starves HNSW's candidate window and returns ZERO rows even though
   * matching rows exist above the cutoff. Here: 60 English chunks at cosine
   * .99 to the query swamp the default window (hnsw.ef_search = 40); the one
   * zh chunk at cosine .97 never reaches the post-filter, so a language-scoped
   * search comes back empty. pgvector 0.8 iterative index scans (SET LOCAL in
   * the adapter) must keep scanning until in-filter rows surface.
   *
   * NOTE: seeds inside the test body — MUST run after the two tests above,
   * which assert exact hit sets over the same sentinel source.
   */
  it("finds in-language rows behind an out-of-language HNSW swarm (language filter must not starve)", async () => {
    const writeStore = new PostgresCorpusWriteStore(db);
    for (let i = 0; i < 60; i++) {
      // Distinct unit vectors, each cosine ~.99 to oneHot(0): a tight English
      // cluster that is strictly closer to the query than the zh needle.
      const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
      v[0] = 0.99;
      v[2 + i] = Math.sqrt(1 - 0.99 * 0.99);
      await writeStore.replaceDocument(doc(`swarm-${i}`, `hash-swarm-${i}`), [
        chunk(`english swarm passage ${i}`, v),
      ]);
    }
    // The needle shares axis 2 with swarm-0, making it swarm-0's CLOSEST
    // neighbor (cos .9946 > intra-swarm .9801) — a guaranteed HNSW edge into
    // the swarm, so this tests window starvation, not graph reachability.
    // (A needle merely *near* the swarm loses every edge-pruning contest to
    // the tighter intra-swarm edges and becomes a one-way island the walk can
    // never enter — verified empirically; that is the cosTo0-docstring
    // pathology, a fixture artifact, not the production bug.) From the QUERY
    // it is still rank 61 behind all 60 swarm members, so the default
    // 40-candidate window never contains it.
    const needleVec = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    needleVec[0] = 0.97;
    needleVec[2] = Math.sqrt(1 - 0.97 * 0.97);
    await writeStore.replaceDocument(
      { ...doc("zh-needle", "hash-zh-needle"), language: "zh" },
      [chunk("中文内容", needleVec)],
    );

    const retriever = createRetriever({
      embedder: new StubEmbedder(oneHot(0)),
      search: new PostgresCorpusSearchStore(db),
    });

    // Language-only filter — the exact shape that starved in the 2026-07-02
    // zh eval. (No allowedSourceKeys: source-scoping makes the planner drive
    // from the sentinel source and sidestep the hnsw window.) Real-corpus zh
    // rows pass the filter too but score ≲.12 on a one-hot axis (see cosTo0
    // docstring) — far below the .37 cutoff, so the needle is the only hit.
    const hits = await retriever.search("probe", { language: "zh" });

    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].citation.url).toBe(`${URL_PREFIX}zh-needle`);
    expect(hits[0].score).toBeCloseTo(0.97, 2);
  });

  /**
   * #74: a document whose language was not confidently detected is stored with
   * `language = NULL`. Lock the column-level semantics against the real store:
   * NULL round-trips through the write path, `language = $1` filters exclude
   * it (SQL three-valued logic), and the row stays fully reachable unfiltered.
   * Presence is asserted via keywordSearch (FTS) — deterministic, no HNSW
   * graph-reachability caveats (see the cosTo0 docstring above).
   */
  it("stores a NULL language and excludes it from language filters, not from unfiltered search (#74)", async () => {
    const writeStore = new PostgresCorpusWriteStore(db);
    await writeStore.replaceDocument(
      { ...doc("null-lang", "hash-null-lang"), language: null },
      [chunk("an unlabelled zebrafish sentinel passage", oneHot(1))],
    );

    const [row] = await sql`
      SELECT language FROM documents
      WHERE canonical_url = ${`${URL_PREFIX}null-lang`}`;
    expect(row.language).toBeNull();

    const store = new PostgresCorpusSearchStore(db);
    for (const language of ["en", "es"]) {
      const filtered = await store.keywordSearch("unlabelled zebrafish", { language }, 10);
      expect(filtered.map((r) => r.canonicalUrl)).not.toContain(`${URL_PREFIX}null-lang`);
    }

    const unfiltered = await store.keywordSearch("unlabelled zebrafish", {}, 10);
    expect(unfiltered.map((r) => r.canonicalUrl)).toContain(`${URL_PREFIX}null-lang`);
  });
});
