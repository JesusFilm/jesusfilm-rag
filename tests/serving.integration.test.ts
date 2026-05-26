/**
 * End-to-end integration test for the serving adapter: real HTTP → real RAG →
 * back. It binds the production `createApp` over a real Node listener
 * (@hono/node-server, ephemeral port) and drives it with real `fetch`, so every
 * layer the fakes-only unit tests can't reach runs for real:
 *
 *   HTTP request → bearer auth → Zod request validation → the production
 *   `createRetriever` over the production `PostgresCorpusSearchStore` (docker
 *   Postgres) → cosine ranking + cutoff + dedup + citation → JSON response,
 *   validated back against the PUBLISHED `searchResponseSchema`.
 *
 * Reproducible, not ambient: it seeds its OWN two sentinel sources, embeds with
 * a fixed-vector stub (no OpenRouter, exact cosines), asserts against that known
 * corpus, and cleans up via cascade — so it never depends on or touches the real
 * corpus. Every query is SCOPED to the sentinel keys (never a global search): the
 * dev DB is shared — thousands of real chunks plus other integration tests' own
 * cosine-1.0 fixtures run against it concurrently — so an unscoped query is not
 * reproducible. Lives outside src/ for the same reason as retrieval.integration
 * .test (composition of an adapter + a context is wiring-layer work) and skips
 * loudly when the DB is unreachable so the suite stays green without Docker.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { serve, type ServerType } from "@hono/node-server";
import type {
  EmbeddedChunk,
  Embedder,
  NormalizedDocument,
  SourceRecord,
} from "@/contracts/index.js";
import { rankedResultSchema, searchResponseSchema } from "@/contracts/index.js";
import {
  EMBEDDING_DIMENSIONS,
  PostgresCorpusSearchStore,
  PostgresCorpusWriteStore,
} from "@/adapters/postgres/index.js";
import { createRetriever } from "@/retrieval/index.js";
import { createApp, parseTokenRegistry } from "@/serving/http/index.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://jesusfilm_rag:jesusfilm_rag_dev@localhost:5434/jesusfilm_rag";

// Two sentinel sources so we can prove cross-source scope at the HTTP seam.
const KEY_A = "__it_http__/a";
const KEY_B = "__it_http__/b";
const URL_A = "https://__it_http__/a/doc";
const URL_B = "https://__it_http__/b/doc";

/** Embedder double: a fixed query vector, so cosines against seeded chunks are exact. */
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

function source(key: string, name: string): SourceRecord {
  return {
    key,
    name,
    domain: "__it_http__",
    trust: "owned",
    ingestionMode: "html-scrape",
    languages: ["en"],
    defaultTags: ["audience:public"],
    defaultCategory: "article",
    rights: "test",
    contentHash: null,
  };
}

function doc(key: string, url: string, title: string): NormalizedDocument {
  return {
    sourceKey: key,
    source: "__it_http__",
    canonicalUrl: url,
    title,
    content: title, // distinct per doc → no title+text dedup collision
    language: "en",
    category: "article",
    tags: ["audience:public"],
    contentHash: `hash-${key}`,
    metadata: {},
  };
}

function chunk(text: string): EmbeddedChunk {
  return {
    ord: 0,
    text,
    charStart: 0,
    charEnd: text.length,
    tokenCount: 5,
    tags: ["audience:public"],
    embedding: oneHot(0), // cosine 1.0 to the stub query → top neighbor globally
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
  await sql`DELETE FROM sources WHERE key IN (${KEY_A}, ${KEY_B})`; // cascades to documents → chunks → embeddings
}

/** The tokens the running server trusts. */
const TOKENS = parseTokenRegistry(
  JSON.stringify({ "tok-all": ["*"], "tok-a": [KEY_A] }),
);

function searchBody(token: string, body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  };
}

const dbUp = await reachable();
if (!dbUp) {
  console.warn(
    `[serving.integration] DB unreachable at ${DATABASE_URL} — skipping. Run \`docker compose up -d\`.`,
  );
}

describe.skipIf(!dbUp)("serving adapter: HTTP → RAG → back (integration)", () => {
  let sql: postgres.Sql;
  let server: ServerType;
  let baseUrl: string;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} });
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    await migrate(drizzle(sql), { migrationsFolder: "./migrations" });
    await sql`
      ALTER TABLE chunks ADD COLUMN IF NOT EXISTS search_tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;`;
    await cleanup(sql);

    const writeStore = new PostgresCorpusWriteStore(sql);
    await writeStore.upsertSource(source(KEY_A, "IT Source A"));
    await writeStore.upsertSource(source(KEY_B, "IT Source B"));
    await writeStore.replaceDocument(doc(KEY_A, URL_A, "Doc A"), [chunk("passage A")]);
    await writeStore.replaceDocument(doc(KEY_B, URL_B, "Doc B"), [chunk("passage B")]);

    // Real listener over the production app, wired to the real store + retriever.
    const app = createApp({
      retriever: createRetriever({
        embedder: new StubEmbedder(oneHot(0)),
        search: new PostgresCorpusSearchStore(sql),
      }),
      tokens: TOKENS,
    });
    baseUrl = await new Promise((resolve) => {
      server = serve({ fetch: app.fetch, port: 0 }, (info) => {
        resolve(`http://localhost:${info.port}`);
      });
    });
  });

  afterAll(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    if (sql) {
      await cleanup(sql);
      await sql.end({ timeout: 5 });
    }
  });

  it("GET /v1/health → 200 over the wire", async () => {
    const res = await fetch(`${baseUrl}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("all-access token + both sources returns contract-valid, cited results from the real store", async () => {
    const res = await fetch(
      `${baseUrl}/v1/search`,
      searchBody("tok-all", { query: "probe", policy: { allowedSourceKeys: [KEY_A, KEY_B] } }),
    );
    expect(res.status).toBe(200);

    // The bytes off the wire validate against the PUBLISHED schema (loop closed).
    const body = searchResponseSchema.parse(await res.json());
    for (const r of body.results) rankedResultSchema.parse(r);

    // A wildcard token permits the request's scope; both seeded docs match
    // (cosine 1.0). Order between equal scores is unspecified, so compare sorted.
    expect(body.results.map((r) => r.citation.sourceKey).sort()).toEqual([KEY_A, KEY_B]);
    expect(body.results.every((r) => r.score > 0.99)).toBe(true);
  });

  it("a source-scoped token only sees its own source, even when the request asks for both", async () => {
    const res = await fetch(
      `${baseUrl}/v1/search`,
      searchBody("tok-a", { query: "probe", policy: { allowedSourceKeys: [KEY_A, KEY_B] } }),
    );
    const body = searchResponseSchema.parse(await res.json());
    // token [KEY_A] ∩ request [KEY_A, KEY_B] = [KEY_A] — the token narrows the request.
    expect(body.results.map((r) => r.citation.sourceKey)).toEqual([KEY_A]);
  });

  it("a scoped token cannot widen past its scope (empty, no leak)", async () => {
    const res = await fetch(
      `${baseUrl}/v1/search`,
      searchBody("tok-a", { query: "probe", policy: { allowedSourceKeys: [KEY_B] } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [] });
  });

  it("rejects a missing bearer token with 401", async () => {
    const res = await fetch(`${baseUrl}/v1/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "probe" }),
    });
    expect(res.status).toBe(401);
  });
});
