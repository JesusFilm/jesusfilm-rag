/**
 * acquireOne — fetch one page through the injected Fetcher, extract its main
 * text, and assemble a RawDocument for the staging table. Acquisition stops
 * here: no normalize, chunk, embed, or corpus write (docs/architecture.md §3).
 *
 * Returns null (a logged skip, not a throw) when the page is unusable: a non-OK
 * / missing-body response, a not-modified response, or extracted text below the
 * source's minContentLength (a nav-only / boilerplate page). bodyHash is
 * sha256(response body) — the re-fetch identity, distinct from any contentHash.
 */
import { createHash } from "node:crypto";
import type { Fetcher, RawDocument, RawDocumentStore } from "@/contracts/index.js";
import { type SourceEntry, seedUrls } from "@/registry/index.js";
import { extractContent } from "./extract.js";
import { normalizeUrl } from "./normalize-url.js";

export type SkipReason = "fetch-failed" | "not-modified" | "too-thin";

export type AcquireOutcome =
  | { ok: true; doc: RawDocument }
  | { ok: false; reason: SkipReason; status: number | null };

export async function acquireOne(
  fetcher: Fetcher,
  entry: SourceEntry,
  url: string,
): Promise<AcquireOutcome> {
  const result = await fetcher.fetch(url);

  if (result.notModified) {
    return { ok: false, reason: "not-modified", status: result.status };
  }
  if (result.status == null || result.status >= 400 || result.body == null) {
    return { ok: false, reason: "fetch-failed", status: result.status };
  }

  const { title, text } = extractContent(result.body, entry.crawl);
  if (text.length < entry.crawl.minContentLength) {
    return { ok: false, reason: "too-thin", status: result.status };
  }

  const bodyHash = createHash("sha256").update(result.body).digest("hex");
  const doc: RawDocument = {
    sourceKey: entry.key,
    url,
    canonicalUrl: normalizeUrl(url),
    title,
    rawContent: text,
    fetch: {
      status: result.status,
      bodyHash,
      etag: result.etag,
      lastModified: result.lastModified,
      fetchedAt: new Date().toISOString(),
      notModified: false,
    },
  };
  return { ok: true, doc };
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface AcquireSummary {
  sourceKey: string;
  attempted: number;
  written: number;
  skipped: Record<SkipReason, number>;
}

export interface AcquireDeps {
  fetcher: Fetcher;
  store: RawDocumentStore;
}

/**
 * Acquire one source end-to-end: walk its seed URLs (capped at maxPages) with a
 * polite requestDelayMs between fetches, acquireOne each, stage the ok docs via
 * the injected RawDocumentStore, and tally outcomes. Ports are injected — no
 * adapter is constructed here. `onProgress` lets the runner stream live lines.
 */
export async function acquireSource(
  deps: AcquireDeps,
  entry: SourceEntry,
  opts: { onProgress?: (line: string) => void } = {},
): Promise<AcquireSummary> {
  const urls = seedUrls(entry).slice(0, entry.crawl.maxPages);
  const summary: AcquireSummary = {
    sourceKey: entry.key,
    attempted: 0,
    written: 0,
    skipped: { "fetch-failed": 0, "not-modified": 0, "too-thin": 0 },
  };

  for (let i = 0; i < urls.length; i++) {
    if (i > 0 && entry.crawl.requestDelayMs > 0) await sleep(entry.crawl.requestDelayMs);
    const url = urls[i];
    summary.attempted++;
    let out: AcquireOutcome;
    try {
      out = await acquireOne(deps.fetcher, entry, url);
    } catch (err) {
      // A network/timeout/DNS error rejects the fetch — count it as a skip and
      // keep crawling. One flaky page must never abandon the rest of the source.
      summary.skipped["fetch-failed"]++;
      const msg = err instanceof Error ? err.message : String(err);
      opts.onProgress?.(`  ⤫ ${url}  — fetch-failed (error: ${msg})`);
      continue;
    }
    if (out.ok) {
      await deps.store.putRawDocument(out.doc);
      summary.written++;
      opts.onProgress?.(`  ✓ ${url}  (${out.doc.rawContent.length} chars)`);
    } else {
      summary.skipped[out.reason]++;
      opts.onProgress?.(`  ⤫ ${url}  — ${out.reason} (status ${out.status ?? "—"})`);
    }
  }
  return summary;
}
