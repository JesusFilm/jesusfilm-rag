/**
 * Ingestion orchestrator tests — fakes only (no Postgres, no network). Drives
 * ingestPending over FakeRawDocumentReader + FakeEmbedder + FakeCorpusWriteStore,
 * using the real `starting-with-god` registry entry (pure data). Locks: source
 * upsert + document/chunk writes + ingested marking; the dedup gate (unchanged →
 * no rewrite); re-chunk on content change (delete-then-insert, no duplication);
 * the model-aware force gate (skip docs already on the target model, so an
 * interrupted re-embed resumes; forceAll overrides it); and the skip paths
 * (too-thin, unknown source).
 */
import { describe, expect, it } from "vitest";
import type { PendingRawDocument } from "@/contracts/index.js";
import {
  FakeCorpusWriteStore,
  FakeEmbedder,
  FakeRawDocumentReader,
} from "@/fakes/index.js";
import { ingestPending, type IngestDeps } from "./index.js";

const KEY = "starting-with-god";

const body = (seed: string): string =>
  Array.from(
    { length: 30 },
    (_, i) => `${seed} paragraph ${i}: knowing God, the gospel, and new life in Christ.`,
  ).join("\n\n");

function pending(
  overrides: Partial<PendingRawDocument> & Pick<PendingRawDocument, "id">,
): PendingRawDocument {
  const url = overrides.url ?? `https://www.startingwithgod.com/${overrides.id}.html`;
  return {
    id: overrides.id,
    sourceKey: overrides.sourceKey ?? KEY,
    url,
    canonicalUrl: overrides.canonicalUrl ?? url,
    title: overrides.title ?? `Title ${overrides.id}`,
    rawContent: overrides.rawContent ?? body(overrides.id),
    fetch: {
      status: 200,
      bodyHash: `hash-${overrides.id}`,
      etag: null,
      lastModified: null,
      fetchedAt: new Date().toISOString(),
      notModified: false,
    },
  };
}

function deps(rows: PendingRawDocument[]): IngestDeps & {
  reader: FakeRawDocumentReader;
  writer: FakeCorpusWriteStore;
} {
  return {
    reader: new FakeRawDocumentReader(rows),
    embedder: new FakeEmbedder({ dimensions: 16 }),
    writer: new FakeCorpusWriteStore(),
  };
}

describe("ingestPending", () => {
  it("upserts the source, writes documents + chunks, and marks rows ingested", async () => {
    const d = deps([pending({ id: "a" }), pending({ id: "b" })]);

    const summary = await ingestPending(d);

    expect(summary).toMatchObject({ attempted: 2, inserted: 2, unchanged: 0, skipped: 0 });
    expect(summary.chunksWritten).toBeGreaterThan(0);
    expect(d.writer.allDocuments()).toHaveLength(2);
    expect(d.writer.getSource(KEY)).not.toBeNull();
    expect(d.reader.ingestedCount()).toBe(2);
    expect(d.reader.isIngested("a")).toBe(true);
  });

  it("dedups by content hash — a repeat of the same page writes no new chunks", async () => {
    const url = "https://www.startingwithgod.com/same.html";
    const content = body("same");
    // Same title + content + canonicalUrl ⇒ identical contentHash ⇒ dedup hit.
    const d = deps([
      pending({ id: "first", url, canonicalUrl: url, title: "Same Page", rawContent: content }),
      pending({ id: "second", url, canonicalUrl: url, title: "Same Page", rawContent: content }),
    ]);

    const summary = await ingestPending(d);

    expect(summary).toMatchObject({ attempted: 2, inserted: 1, unchanged: 1 });
    expect(d.writer.allDocuments()).toHaveLength(1);
    const doc = d.writer.getDocument(KEY, url)!;
    expect(d.writer.totalChunks()).toBe(doc.chunks.length); // no duplication
    expect(d.reader.ingestedCount()).toBe(2); // both consumed
  });

  it("re-chunks on content change — old chunks replaced, not accumulated", async () => {
    const url = "https://www.startingwithgod.com/evolving.html";
    const d = deps([
      pending({ id: "v1", url, canonicalUrl: url, rawContent: body("alpha") }),
      pending({ id: "v2", url, canonicalUrl: url, rawContent: body("beta longer text") }),
    ]);

    const summary = await ingestPending(d);

    expect(summary).toMatchObject({ attempted: 2, inserted: 1, updated: 1, unchanged: 0 });
    expect(d.writer.allDocuments()).toHaveLength(1);
    const doc = d.writer.getDocument(KEY, url)!;
    expect(d.writer.totalChunks()).toBe(doc.chunks.length); // replaced, not summed
  });

  it("skips a too-thin doc but still marks it ingested", async () => {
    const d = deps([pending({ id: "thin", rawContent: "too short" })]);

    const summary = await ingestPending(d);

    expect(summary).toMatchObject({ attempted: 1, inserted: 0, skipped: 1 });
    expect(d.writer.allDocuments()).toHaveLength(0);
    expect(d.reader.isIngested("thin")).toBe(true);
  });

  it("force re-drains ingested rows but SKIPS docs already on the target model", async () => {
    const d = deps([pending({ id: "a" }), pending({ id: "b" })]);

    await ingestPending(d); // first pass marks both ingested (on the fake's model)
    const firstChunks = d.writer.totalChunks();
    expect(d.reader.ingestedCount()).toBe(2);

    // A plain re-run drains nothing (both already ingested).
    expect((await ingestPending(d)).attempted).toBe(0);

    // force re-drains the snapshot, but both docs are already on the target model
    // with unchanged content ⇒ re-embedding is a no-op ⇒ skipped. This model-aware
    // skip is what makes an interrupted --force resumable (see the next test).
    const forced = await ingestPending(d, { force: true });
    expect(forced).toMatchObject({ attempted: 2, updated: 0, unchanged: 2 });
    expect(d.writer.allDocuments()).toHaveLength(2);
    expect(d.writer.totalChunks()).toBe(firstChunks);
  });

  it("force re-embeds when the target model differs, then resumes idempotently", async () => {
    const rows = [pending({ id: "a" }), pending({ id: "b" })];
    const reader = new FakeRawDocumentReader(rows);
    const writer = new FakeCorpusWriteStore();
    const oldModel = new FakeEmbedder({ dimensions: 16, model: "openai/text-embedding-3-small" });
    const newModel = new FakeEmbedder({ dimensions: 16, model: "qwen/qwen3-embedding-8b" });
    const allOn = (m: string): boolean =>
      writer.allDocuments().every((doc) => doc.chunks.every((c) => c.embeddingModel === m));

    // Initial ingest on the OLD model.
    await ingestPending({ reader, embedder: oldModel, writer });
    expect(allOn("openai/text-embedding-3-small")).toBe(true);

    // force with the NEW model re-embeds every doc (model differs ⇒ not skipped).
    const migrated = await ingestPending({ reader, embedder: newModel, writer }, { force: true });
    expect(migrated).toMatchObject({ attempted: 2, updated: 2, unchanged: 0 });
    expect(allOn("qwen/qwen3-embedding-8b")).toBe(true);

    // Re-running the SAME force now skips both — already migrated. The resume
    // property: an interrupted re-embed continues, it does not restart from zero.
    const resumed = await ingestPending({ reader, embedder: newModel, writer }, { force: true });
    expect(resumed).toMatchObject({ attempted: 2, updated: 0, unchanged: 2 });
  });

  it("forceAll re-embeds even documents already on the target model", async () => {
    const reader = new FakeRawDocumentReader([pending({ id: "a" })]);
    const writer = new FakeCorpusWriteStore();
    const embedder = new FakeEmbedder({ dimensions: 16, model: "qwen/qwen3-embedding-8b" });

    await ingestPending({ reader, embedder, writer });
    // Same model + unchanged content ⇒ force would skip; forceAll re-embeds
    // regardless — the escape hatch for a chunker change on the same model.
    const forced = await ingestPending({ reader, embedder, writer }, { forceAll: true });
    expect(forced).toMatchObject({ attempted: 1, updated: 1, unchanged: 0 });
  });

  it("skips an unknown source and leaves the row un-marked", async () => {
    const d = deps([pending({ id: "x", sourceKey: "no-such-source" })]);

    const summary = await ingestPending(d);

    expect(summary).toMatchObject({ attempted: 1, unknownSource: 1, inserted: 0 });
    expect(d.writer.allDocuments()).toHaveLength(0);
    expect(d.reader.isIngested("x")).toBe(false);
  });
});
