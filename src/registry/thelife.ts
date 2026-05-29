/**
 * thelife (thelife.com) — slice #5. **Live successor to the decommissioned
 * powertochange.com**: every powertochange content URL 301-redirects to
 * thelife.com (or to issuesiface.com for the `/discover/` + `/itv/` "issues"
 * sub-axis); the old WP sitemap is a 2014-2017 relic. thelife.com is Cru
 * Canada's modern discipleship/life-issues corpus — Statamic-powered, empty
 * `Disallow:` robots, no challenge wall. Probed 2026-05-29.
 *
 * **First Statamic source for the discovery crawler** (slice #3 was Yoast,
 * slice #4 was the same shape). Sitemap is a single flat `/sitemap.xml` with
 * 7,834 `<loc>` entries — no `<sitemapindex>`, so no recursion needed.
 *
 * **Scope (operator-chosen 2026-05-29):** articles + devotionals. The path
 * distribution from recon is 5,015 `/devotionals/` + 478 `/articles/` + 1,358
 * `/tags/` + 289 `/author/` + 47 `/series/` + ~50 other. `articleHints` admits
 * `/articles/<slug>` and `/devotionals/<slug>` (single-segment slug, optional
 * trailing slash); everything else is filtered out by *not matching the hints*,
 * not by explicit blocks. Taking the broader scope explicitly is a deliberate
 * fork over articles-only despite slice #4's small-source crowding signal
 * (FOLLOW-UP I #15) — the goal is to sharpen the #15 evidence with a 4× source.
 *
 * Content selector `.article-body` covers BOTH shapes — confirmed on probes:
 * `/10-spiritual-questions-and-their-answers` → `<section class="article-body
 * dropcap">` (article, ~12k words shell), `/devotionals/a-higher-calling` →
 * the same `.article-body` wrapper (devotional, ~1.4k words). `.spaces-content`
 * is a wider page shell; we keep it as a lower-priority fallback.
 */
import type { SourceEntry } from "./types.js";

export const thelife: SourceEntry = {
  key: "thelife",
  name: "thelife",
  domain: "thelife.com",
  trust: "partner",
  ingestionMode: "html-scrape",
  languages: ["en"],
  defaultTags: ["thelife", "cru-canada", "topic:discipleship"],
  defaultCategory: "article",
  rights:
    "© thelife (Cru Canada) — partner ministry content; used for retrieval/attribution.",
  crawl: {
    baseUrl: "https://thelife.com",
    // One flat <urlset> at /sitemap.xml (7,834 locs as of 2026-05-29 recon).
    // No sitemap index here; /sitemap_index.xml returns 404. discover.ts won't
    // need to recurse.
    sitemaps: ["/sitemap.xml"],
    // Same-host only.
    allow: ["^https://thelife\\.com/"],
    // Keep articles OR devotionals — single-segment slug under the section
    // path. Optional trailing slash because thelife serves both forms.
    // Distribution from recon: 478 match hint #1, 5,015 match hint #2;
    // everything else (tags / author / series / about / etc.) fails to match
    // either hint and gets dropped.
    articleHints: [
      "^https://thelife\\.com/articles/[^/]+/?$",
      "^https://thelife\\.com/devotionals/[^/]+/?$",
    ],
    // Non-article URLs are dropped by failing articleHints, not by block — so
    // block stays narrow: just non-HTML assets, defensive against odd slugs.
    block: ["\\.kml($|\\?)", "\\.pdf($|\\?)"],
    // `.article-body` is the prose container on BOTH articles and devotionals
    // (confirmed 2026-05-29). `.spaces-content` is the wider page shell — keep
    // as a defensive fallback; `<article>` / `<main>` after that.
    contentSelectors: [".article-body", ".spaces-content", "article", "main"],
    stripSelectors: [
      "script",
      "style",
      "noscript",
      "svg",
      "nav",
      "header",
      "footer",
      "form",
    ],
    requestDelayMs: 1500, // polite; ~5,500 pages ≈ 138 min at this delay
    maxPages: 6000, // covers 478 articles + 5,015 devotionals + headroom
    minContentLength: 250,
  },
};
