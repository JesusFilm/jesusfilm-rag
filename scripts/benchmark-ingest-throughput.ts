import "@/env.js";
import { and, eq, like, sql } from "drizzle-orm";
import type {
  CorpusWriteStore,
  Embedder,
  EmbeddedChunk,
  NormalizedDocument,
  RawDocumentReader,
  SourceRecord,
} from "@/contracts/index.js";
import {
  PostgresCorpusWriteStore,
  PostgresRawDocumentReader,
} from "@/adapters/postgres/index.js";
import { getDb, closeDb } from "@/db/index.js";
import { documents, rawDocuments, sources } from "@/db/schema.js";
import { ingestPending } from "@/ingestion/index.js";

const DOCS = Number(process.env.BENCH_DOCS ?? 80);
const EMBED_DELAY_MS = Number(process.env.BENCH_EMBED_DELAY_MS ?? 100);
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY ?? 1);
const BENCH_DATABASE = "jesusfilm_rag_ingest_bench";
const BENCH_URL_PREFIX = "https://www.startingwithgod.com/__ingest-benchmark__/";

type Operation = "getDedup" | "embed" | "replaceDocument" | "markIngested" | "upsertSource";
type Metric = { calls: number; totalMs: number };

const metrics: Record<Operation, Metric> = {
  getDedup: { calls: 0, totalMs: 0 },
  embed: { calls: 0, totalMs: 0 },
  replaceDocument: { calls: 0, totalMs: 0 },
  markIngested: { calls: 0, totalMs: 0 },
  upsertSource: { calls: 0, totalMs: 0 },
};

/** Record cumulative latency without changing the wrapped port's behavior. */
async function measured<T>(operation: Operation, work: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await work();
  } finally {
    metrics[operation].calls++;
    metrics[operation].totalMs += performance.now() - start;
  }
}

class DelayedEmbedder implements Embedder {
  readonly model = "benchmark/deterministic";
  readonly dimensions = 1536;

  async embed(texts: string[]): Promise<(number[] | null)[]> {
    return measured("embed", async () => {
      await new Promise((resolve) => setTimeout(resolve, EMBED_DELAY_MS));
      return texts.map((text, index) => text.trim() ? vector(index) : null);
    });
  }

  async embedQuery(): Promise<number[]> {
    return vector(0);
  }
}

/** Build a deterministic unit vector accepted by the real halfvec column. */
function vector(seed: number): number[] {
  const result = new Array<number>(1536).fill(0);
  result[seed % result.length] = 1;
  return result;
}

class MeasuredWriter implements CorpusWriteStore {
  constructor(private readonly inner: CorpusWriteStore) {}

  upsertSource(source: SourceRecord): Promise<string> {
    return measured("upsertSource", () => this.inner.upsertSource(source));
  }

  getDedup(sourceKey: string, canonicalUrl: string) {
    return measured("getDedup", () => this.inner.getDedup(sourceKey, canonicalUrl));
  }

  replaceDocument(doc: NormalizedDocument, embedded: EmbeddedChunk[]): Promise<void> {
    return measured("replaceDocument", () => this.inner.replaceDocument(doc, embedded));
  }
}

class MeasuredReader implements RawDocumentReader {
  constructor(private readonly inner: RawDocumentReader) {}

  listPending(opts?: { sourceKey?: string; limit?: number; includeIngested?: boolean }) {
    return this.inner.listPending(opts);
  }

  markIngested(ids: string[]): Promise<void> {
    return measured("markIngested", () => this.inner.markIngested(ids));
  }
}

/** Fail closed before connecting or mutating unless this is the isolated benchmark DB. */
function validateBenchmarkTarget(): void {
  if (!Number.isSafeInteger(DOCS) || DOCS < 1) {
    throw new Error(`BENCH_DOCS must be a positive safe integer, got ${DOCS}`);
  }
  if (!Number.isFinite(EMBED_DELAY_MS) || EMBED_DELAY_MS < 0) {
    throw new Error(`BENCH_EMBED_DELAY_MS must be a non-negative number, got ${EMBED_DELAY_MS}`);
  }
  if (!Number.isSafeInteger(CONCURRENCY) || CONCURRENCY < 1 || CONCURRENCY > 4) {
    throw new Error(`BENCH_CONCURRENCY must be a safe integer from 1 to 4, got ${CONCURRENCY}`);
  }
  const databaseUrl = process.env.DATABASE_URL;
  let database = "";
  try {
    database = new URL(databaseUrl ?? "").pathname.replace(/^\//, "");
  } catch {
    // The target check below emits one fail-closed error without echoing credentials.
  }
  if (database !== BENCH_DATABASE) {
    throw new Error(
      `benchmark refused: DATABASE_URL must target the isolated '${BENCH_DATABASE}' database`,
    );
  }
  if (process.env.BENCH_ALLOW_RESET !== "1") {
    throw new Error("benchmark refused: set BENCH_ALLOW_RESET=1 to confirm benchmark-row reset");
  }
}

/** Reset and seed only rows owned by this benchmark, never the surrounding corpus. */
async function seed(): Promise<void> {
  const { db } = getDb();
  const [source] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.key, "starting-with-god"));
  if (source) {
    await db
      .delete(documents)
      .where(
        and(
          eq(documents.sourceId, source.id),
          like(documents.canonicalUrl, `${BENCH_URL_PREFIX}%`),
        ),
      );
  }
  await db
    .delete(rawDocuments)
    .where(like(rawDocuments.canonicalUrl, `${BENCH_URL_PREFIX}%`));

  const paragraph =
    "Jesus teaches his followers to love God and their neighbours with patient, practical faith. ";
  const rawContent = Array.from({ length: 90 }, (_, index) => `${paragraph} Section ${index}.`).join("\n\n");
  await db.insert(rawDocuments).values(
    Array.from({ length: DOCS }, (_, index) => ({
      sourceKey: "starting-with-god",
      url: `${BENCH_URL_PREFIX}${index}`,
      canonicalUrl: `${BENCH_URL_PREFIX}${index}`,
      title: `Benchmark document ${index}`,
      rawContent,
      status: 200,
      bodyHash: `benchmark-${index}`,
      fetchedAt: sql`now() + (${index} * interval '1 millisecond')`,
    })),
  );
}

/** Run one measured ingest after every safety check has passed. */
async function main(): Promise<void> {
  validateBenchmarkTarget();
  await seed();
  const { db } = getDb();
  const start = performance.now();
  const summary = await ingestPending(
    {
      reader: new MeasuredReader(new PostgresRawDocumentReader(db)),
      writer: new MeasuredWriter(new PostgresCorpusWriteStore(db)),
      embedder: new DelayedEmbedder(),
    },
    { sourceKey: "starting-with-god", concurrency: CONCURRENCY },
  );
  const wallMs = performance.now() - start;
  console.log(JSON.stringify({ docs: DOCS, concurrency: CONCURRENCY, embedDelayMs: EMBED_DELAY_MS, wallMs, docsPerSecond: DOCS / (wallMs / 1000), summary, metrics }, null, 2));
}

main().finally(closeDb).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
