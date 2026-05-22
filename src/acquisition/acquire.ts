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
import type { Fetcher, RawDocument } from "@/contracts/index.js";
import type { SourceEntry } from "@/registry/index.js";
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
