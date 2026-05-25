/**
 * Registry unit test — pure data + lookups, no I/O. Guards the load-bearing
 * facts Acquisition relies on: the source resolves by key, seed paths become
 * absolute same-origin URLs, and the policy bounds are coherent.
 */
import { describe, expect, it } from "vitest";
import { SOURCES, allSources, getSource, seedUrls } from "./index.js";
import type { SourceEntry } from "./types.js";

describe("SourceRegistry", () => {
  it("resolves Starting With God by key and exposes its crawl policy", () => {
    const swg = getSource("starting-with-god");
    expect(swg).toBeDefined();
    expect(swg?.domain).toBe("www.startingwithgod.com");
    expect(swg?.ingestionMode).toBe("html-scrape");
    expect(swg?.crawl.contentSelectors).toContain("#content");
    expect(swg?.crawl.requestDelayMs).toBeGreaterThan(0);
    expect((swg?.crawl.seedPaths ?? []).length).toBeGreaterThan(0);
  });

  it("resolves Cru 10 Basic Steps by key with the AEM long-form selector + 12 seeds", () => {
    const cru = getSource("cru-10-basic-steps");
    expect(cru).toBeDefined();
    expect(cru?.domain).toBe("www.cru.org");
    expect(cru?.trust).toBe("partner");
    expect(cru?.ingestionMode).toBe("html-scrape");
    // `.article-long-form` is the verified content container for Cru AEM lessons.
    expect(cru?.crawl.contentSelectors[0]).toBe(".article-long-form");
    expect(cru?.crawl.seedPaths).toHaveLength(12);
    // every seed is within the 10-basic-steps scope.
    for (const p of cru!.crawl.seedPaths ?? []) {
      expect(p.startsWith("/us/en/train-and-grow/10-basic-steps")).toBe(true);
    }
  });

  it("resolves Jesus Film Project as an owned discovery source (sitemap + /blog/ hints)", () => {
    const jf = getSource("jesusfilm-org");
    expect(jf).toBeDefined();
    expect(jf?.domain).toBe("www.jesusfilm.org");
    expect(jf?.trust).toBe("owned");
    expect(jf?.ingestionMode).toBe("html-scrape");
    // Discovery source: a sitemap seed + filters, no hand-listed seedPaths.
    expect(jf?.crawl.sitemaps).toEqual(["/sitemap_index.xml"]);
    expect(jf?.crawl.seedPaths).toBeUndefined();
    expect(jf?.crawl.contentSelectors[0]).toBe(".entry-content");
    // articleHints keep blog articles, drop the bare /blog/ index + /give/.
    const hint = new RegExp(jf!.crawl.articleHints![0]);
    expect(hint.test("https://www.jesusfilm.org/blog/parables-of-jesus/")).toBe(true);
    expect(hint.test("https://www.jesusfilm.org/blog/")).toBe(false);
    expect(hint.test("https://www.jesusfilm.org/give/why-give/")).toBe(false);
  });

  it("returns undefined for an unknown key", () => {
    expect(getSource("does-not-exist")).toBeUndefined();
  });

  it("registry keys are unique", () => {
    const keys = SOURCES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("seedUrls() yields absolute, same-origin, de-duplicated URLs", () => {
    const swg = getSource("starting-with-god")!;
    const urls = seedUrls(swg);
    expect(urls).toHaveLength((swg.crawl.seedPaths ?? []).length);
    expect(new Set(urls).size).toBe(urls.length); // no duplicate seed URLs
    for (const u of urls) {
      expect(u.startsWith(`${swg.crawl.baseUrl}/`)).toBe(true);
      expect(new URL(u).host).toBe(swg.domain);
    }
  });

  it("policy bounds are coherent (maxPages covers the seed list)", () => {
    for (const s of allSources()) {
      expect(s.crawl.maxPages).toBeGreaterThanOrEqual(
        (s.crawl.seedPaths ?? []).length,
      );
      expect(s.crawl.minContentLength).toBeGreaterThan(0);
    }
    expect(SOURCES.length).toBeGreaterThanOrEqual(1);
  });

  it("seedUrls() is empty for a pure discovery source (URLs come from the sitemap)", () => {
    const discovery: SourceEntry = {
      key: "discovery-fixture",
      name: "Discovery Fixture",
      domain: "example.org",
      trust: "trusted",
      ingestionMode: "html-scrape",
      languages: ["en"],
      defaultTags: [],
      defaultCategory: null,
      rights: null,
      crawl: {
        baseUrl: "https://example.org",
        sitemaps: ["/sitemap.xml"],
        allow: ["^https://example\\.org/"],
        articleHints: ["/article/"],
        contentSelectors: ["main"],
        stripSelectors: [],
        requestDelayMs: 1000,
        maxPages: 50,
        minContentLength: 250,
      },
    };
    expect(seedUrls(discovery)).toEqual([]);
  });
});
