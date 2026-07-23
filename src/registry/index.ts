/**
 * SourceRegistry — the source list as pure data, plus lookups. Zero I/O. A
 * context (Acquisition) imports this for crawl policy; only `main.ts`/scripts
 * pick which source(s) to run. See docs/architecture.md §3 / §5.1.
 */
import type { FetchStrategy, SourceEntry } from "./types.js";
import { startingWithGod } from "./starting-with-god.js";
import { cru } from "./cru.js";
import { jesusFilmOrg } from "./jesusfilm-org.js";
import { sightlineMinistry } from "./sightline-ministry.js";
import { thelife } from "./thelife.js";
import { thelifeFr } from "./thelife-fr.js";
import { thelifeZh } from "./thelife-zh.js";
import { familylife } from "./familylife.js";
import { everystudent } from "./everystudent.js";

export type { SourceEntry, CrawlPolicy, FetchStrategy } from "./types.js";

/** Every registered source. **One domain = one source** (2026-07-09) — a source may hold
 *  several languages, and language is a per-document property decided at ingest, never
 *  inferred from the source. A sibling key exists only where the *domain* differs:
 *  `thelife-fr` is laviejenparle.com and `thelife-zh` is uwota.com, so they stay separate;
 *  cru.org's Spanish lives under `/mx/es/` and therefore belongs to `cru` itself.
 *
 *  One non-English variant was investigated but NOT registered: thelife's Persian site
 *  (shagerdan.com) serves a Cloudflare 403 wall to non-JS fetchers (FOLLOW-UP G / #8).
 *  That wall is now passable in principle — `everystudent` is the first registered
 *  source to declare `fetchStrategy: "firecrawl"` (ADR-0012) — but shagerdan.com stays
 *  unregistered until someone slices it and funds the credits.
 *
 *  EveryStudent spans three domains and is therefore three keys, of which only the
 *  English one is registered so far: everystudent.com → `everystudent`;
 *  everyarabstudent.com → `everystudent-ar` and questions2vie.com → `everystudent-fr`
 *  follow as their own slices (#112).
 *
 *  A note once recorded here — that cru.org's Spanish locale had no real Spanish content —
 *  over-generalised from a single path. Only `/mx/es/.../10-pasos-basicos/` serves
 *  untranslated English bodies; it is blocked in `cru`, while ~489 of the remaining
 *  `/mx/es/` pages are genuine Spanish (and ~39 are untranslated English that only a
 *  per-document body check can catch). See `cru.ts` and docs/sources.md. */
export const SOURCES: readonly SourceEntry[] = [
  startingWithGod,
  cru,
  jesusFilmOrg,
  sightlineMinistry,
  thelife,
  thelifeFr,
  thelifeZh,
  familylife,
  everystudent,
];

/** Look up a source by its stable key; undefined if unknown. */
export function getSource(key: string): SourceEntry | undefined {
  return SOURCES.find((s) => s.key === key);
}

/** All registered sources. */
export function allSources(): readonly SourceEntry[] {
  return SOURCES;
}

/** The source's declared fetch strategy; absent means plain HTTP (the
 *  zero-config norm — Firecrawl is strictly opt-in, per source, at slice time).
 *  The single decision point for strategy selection: main.ts's fetcherFor()
 *  builds the matching adapter from this, and nothing re-decides at runtime. */
export function resolveFetchStrategy(entry: SourceEntry): FetchStrategy {
  return entry.crawl.fetchStrategy ?? "plain-http";
}

/** Resolve a source's hand-listed seed paths into absolute URLs (against its
 *  baseUrl). Empty for a pure discovery source (its URLs come from the sitemap). */
export function seedUrls(entry: SourceEntry): string[] {
  return (entry.crawl.seedPaths ?? []).map(
    (path) => new URL(path, entry.crawl.baseUrl).href,
  );
}
