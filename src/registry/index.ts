/**
 * SourceRegistry — the source list as pure data, plus lookups. Zero I/O. A
 * context (Acquisition) imports this for crawl policy; only `main.ts`/scripts
 * pick which source(s) to run. See docs/architecture.md §3 / §5.1.
 */
import type { SourceEntry } from "./types.js";
import { startingWithGod } from "./starting-with-god.js";
import { cru10BasicSteps } from "./cru-10-basic-steps.js";
import { jesusFilmOrg } from "./jesusfilm-org.js";
import { sightlineMinistry } from "./sightline-ministry.js";

export type { SourceEntry, CrawlPolicy } from "./types.js";

/** Every registered source, in registry order. */
export const SOURCES: readonly SourceEntry[] = [
  startingWithGod,
  cru10BasicSteps,
  jesusFilmOrg,
  sightlineMinistry,
];

/** Look up a source by its stable key; undefined if unknown. */
export function getSource(key: string): SourceEntry | undefined {
  return SOURCES.find((s) => s.key === key);
}

/** All registered sources. */
export function allSources(): readonly SourceEntry[] {
  return SOURCES;
}

/** Resolve a source's hand-listed seed paths into absolute URLs (against its
 *  baseUrl). Empty for a pure discovery source (its URLs come from the sitemap). */
export function seedUrls(entry: SourceEntry): string[] {
  return (entry.crawl.seedPaths ?? []).map(
    (path) => new URL(path, entry.crawl.baseUrl).href,
  );
}
