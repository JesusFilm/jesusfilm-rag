/**
 * SourceRegistry — the source list as pure data, plus lookups. Zero I/O. A
 * context (Acquisition) imports this for crawl policy; only `main.ts`/scripts
 * pick which source(s) to run. See docs/architecture.md §3 / §5.1.
 */
import type { SourceEntry } from "./types.js";
import { startingWithGod } from "./starting-with-god.js";
import { cru } from "./cru.js";
import { cruEs } from "./cru-es.js";
import { jesusFilmOrg } from "./jesusfilm-org.js";
import { sightlineMinistry } from "./sightline-ministry.js";
import { thelife } from "./thelife.js";
import { thelifeFr } from "./thelife-fr.js";
import { thelifeZh } from "./thelife-zh.js";
import { familylife } from "./familylife.js";

export type { SourceEntry, CrawlPolicy } from "./types.js";

/** Every registered source, in registry order (language variants follow their
 *  parent English source).
 *
 *  One non-English variant was investigated but NOT registered: thelife's Persian
 *  site (shagerdan.com) serves a Cloudflare 403 wall to non-JS fetchers (see
 *  FOLLOW-UP G / #8).
 *
 *  `cru-es` IS registered (2026-07-09). The earlier note here — that cru.org's
 *  Spanish locale had no real Spanish content — over-generalized from one path:
 *  only `/mx/es/.../10-pasos-basicos/` serves untranslated English bodies under
 *  Spanish chrome. It is blocked in `cru-es`; the other 564 `/mx/es/` pages are
 *  genuine Spanish (verified by sampling). See `cru-es.ts` and docs/sources.md. */
export const SOURCES: readonly SourceEntry[] = [
  startingWithGod,
  cru,
  cruEs,
  jesusFilmOrg,
  sightlineMinistry,
  thelife,
  thelifeFr,
  thelifeZh,
  familylife,
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
