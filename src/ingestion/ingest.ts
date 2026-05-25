/**
 * ingest — drain pending raw_documents → corpus, the Ingestion orchestrator.
 *
 * Per document: normalize → dedup gate (skip when contentHash is unchanged) →
 * chunk → embed → idempotent `replaceDocument` (delete-then-insert, one tx).
 * upsertSource runs once per source before its first document. Each consumed
 * staging row is marked ingested so a re-run drains only new/changed pages.
 *
 * All I/O is via injected ports (RawDocumentReader, Embedder, CorpusWriteStore);
 * the registry (pure data) supplies each source's crawl/defaults. No adapter is
 * constructed here — the runner (scripts/index.ts) wires them. See architecture §3.
 */
import type {
  CorpusWriteStore,
  Embedder,
  EmbeddedChunk,
  PendingRawDocument,
  RawDocumentReader,
  SourceRecord,
} from "@/contracts/index.js";
import { getSource, type SourceEntry } from "@/registry/index.js";
import { normalizeDocument } from "./normalize.js";
import { chunkDocument } from "./chunk.js";

export interface IngestDeps {
  reader: RawDocumentReader;
  embedder: Embedder;
  writer: CorpusWriteStore;
}

export type IngestStatus =
  | "inserted"
  | "updated"
  | "unchanged"
  | "skipped-thin"
  | "skipped-no-chunks";

export interface IngestSummary {
  attempted: number;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  unknownSource: number;
  chunksWritten: number;
}

export interface IngestOptions {
  sourceKey?: string;
  limit?: number;
  /**
   * Full re-index: re-drain already-ingested rows from the raw snapshot AND
   * re-chunk/re-embed even when the contentHash is unchanged (bypasses the dedup
   * skip). Use after an embedding-model or chunker change. Default false =
   * incremental (only un-ingested rows, skip unchanged).
   */
  force?: boolean;
  onProgress?: (line: string) => void;
}

function sourceRecordOf(entry: SourceEntry): SourceRecord {
  return {
    key: entry.key,
    name: entry.name,
    domain: entry.domain,
    trust: entry.trust,
    ingestionMode: entry.ingestionMode,
    languages: entry.languages,
    defaultTags: entry.defaultTags,
    defaultCategory: entry.defaultCategory,
    rights: entry.rights,
    contentHash: null, // source-level reindex gate unused in v1 (per-doc dedup carries it)
  };
}

/** Normalize → dedup → chunk → embed → write one staging row. */
async function ingestDocument(
  deps: IngestDeps,
  entry: SourceEntry,
  raw: PendingRawDocument,
  force: boolean,
): Promise<{ status: IngestStatus; chunks: number }> {
  const norm = normalizeDocument(entry, {
    url: raw.url,
    canonicalUrl: raw.canonicalUrl,
    title: raw.title,
    rawContent: raw.rawContent,
  });
  if (!norm.ok) return { status: "skipped-thin", chunks: 0 };
  const doc = norm.doc;

  const existing = await deps.writer.getDedup(doc.sourceKey, doc.canonicalUrl);
  if (existing && existing.contentHash === doc.contentHash && !force) {
    return { status: "unchanged", chunks: 0 };
  }

  const spans = chunkDocument(doc.content);
  const embeddings = await deps.embedder.embed(spans.map((s) => s.text));
  const chunks: EmbeddedChunk[] = [];
  spans.forEach((s, i) => {
    const embedding = embeddings[i];
    if (!embedding) return; // null = skip (blank/failed embedding)
    chunks.push({
      ord: chunks.length, // contiguous after any skips
      text: s.text,
      charStart: s.charStart,
      charEnd: s.charEnd,
      tokenCount: s.tokenCount,
      tags: doc.tags,
      embedding,
      embeddingModel: deps.embedder.model,
    });
  });
  if (chunks.length === 0) return { status: "skipped-no-chunks", chunks: 0 };

  await deps.writer.replaceDocument(doc, chunks);
  return { status: existing ? "updated" : "inserted", chunks: chunks.length };
}

/** Drain all pending staging rows (optionally scoped) through ingestDocument. */
export async function ingestPending(
  deps: IngestDeps,
  opts: IngestOptions = {},
): Promise<IngestSummary> {
  const pending = await deps.reader.listPending({
    sourceKey: opts.sourceKey,
    limit: opts.limit,
    includeIngested: opts.force ?? false, // force ⇒ re-index from the snapshot
  });
  const summary: IngestSummary = {
    attempted: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    unknownSource: 0,
    chunksWritten: 0,
  };
  const upserted = new Set<string>();

  for (const raw of pending) {
    summary.attempted++;
    const entry = getSource(raw.sourceKey);
    if (!entry) {
      // Leave the row un-marked: a later registry fix can pick it up.
      summary.unknownSource++;
      opts.onProgress?.(`  ⤫ ${raw.url} — unknown source '${raw.sourceKey}'`);
      continue;
    }
    if (!upserted.has(entry.key)) {
      await deps.writer.upsertSource(sourceRecordOf(entry));
      upserted.add(entry.key);
    }

    const { status, chunks } = await ingestDocument(deps, entry, raw, opts.force ?? false);
    if (status === "inserted") summary.inserted++;
    else if (status === "updated") summary.updated++;
    else if (status === "unchanged") summary.unchanged++;
    else summary.skipped++;
    summary.chunksWritten += chunks;

    await deps.reader.markIngested([raw.id]);
    opts.onProgress?.(`  ✓ ${raw.url} — ${status} (${chunks} chunks)`);
  }

  return summary;
}
