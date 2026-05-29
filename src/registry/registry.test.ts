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

  it("jesusfilm-org block patterns hit top-level disallows but not blog slugs that contain the substring", () => {
    const jf = getSource("jesusfilm-org")!;
    const block = (jf.crawl.block ?? []).map((p) => new RegExp(p));
    const blocked = (u: string): boolean => block.some((re) => re.test(u));
    // top-level robots disallows + assets ARE blocked
    expect(blocked("https://www.jesusfilm.org/dev")).toBe(true);
    expect(blocked("https://www.jesusfilm.org/give/ways-to-give/")).toBe(true);
    expect(blocked("https://www.jesusfilm.org/locations.kml")).toBe(true);
    // blog articles whose slug merely contains a disallowed substring are NOT blocked
    expect(blocked("https://www.jesusfilm.org/blog/devotions")).toBe(false);
    expect(blocked("https://www.jesusfilm.org/blog/lacking-faith")).toBe(false);
    expect(blocked("https://www.jesusfilm.org/blog/design-for-discipleship")).toBe(false);
  });

  it("resolves Sightline as a partner discovery source seeding two content sitemaps", () => {
    const sl = getSource("sightline-ministry");
    expect(sl).toBeDefined();
    expect(sl?.domain).toBe("sightlineministry.org");
    expect(sl?.trust).toBe("partner");
    expect(sl?.ingestionMode).toBe("html-scrape");
    // Discovery source: seeds the two TEACHING sitemaps directly, no hand-listed seeds.
    expect(sl?.crawl.sitemaps).toEqual([
      "/post-sitemap.xml",
      "/daily-devo-sitemap.xml",
    ]);
    expect(sl?.crawl.seedPaths).toBeUndefined();
    expect(sl?.crawl.contentSelectors[0]).toBe(".o-longform-content__content");
  });

  it("sightline articleHints keep posts + devos but drop the bare index pages", () => {
    const sl = getSource("sightline-ministry")!;
    const hints = (sl.crawl.articleHints ?? []).map((p) => new RegExp(p));
    const block = (sl.crawl.block ?? []).map((p) => new RegExp(p));
    const kept = (u: string): boolean =>
      hints.some((re) => re.test(u)) && !block.some((re) => re.test(u));
    // apologetics post (bare-root slug) + daily devotional are kept
    expect(kept("https://sightlineministry.org/why-does-god-seem-hidden-from-us/")).toBe(true);
    expect(kept("https://sightlineministry.org/daily-devo/for-goodness-sake-2/")).toBe(true);
    // the two bare index pages each sitemap lists are dropped
    expect(kept("https://sightlineministry.org/blog/")).toBe(false);
    expect(kept("https://sightlineministry.org/daily-devotions/")).toBe(false);
  });

  it("resolves thelife as a partner discovery source on a flat /sitemap.xml", () => {
    const tl = getSource("thelife");
    expect(tl).toBeDefined();
    expect(tl?.domain).toBe("thelife.com");
    expect(tl?.trust).toBe("partner");
    expect(tl?.ingestionMode).toBe("html-scrape");
    // Discovery source: one flat sitemap (no <sitemapindex>), no hand-listed seeds.
    expect(tl?.crawl.sitemaps).toEqual(["/sitemap.xml"]);
    expect(tl?.crawl.seedPaths).toBeUndefined();
    // `.article-body` covers BOTH /articles/ and /devotionals/ shapes.
    expect(tl?.crawl.contentSelectors[0]).toBe(".article-body");
  });

  it("thelife articleHints keep bare-root articles + /devotionals/<slug>, drop tag indexes + nav", () => {
    const tl = getSource("thelife")!;
    const hints = (tl.crawl.articleHints ?? []).map((p) => new RegExp(p));
    const block = (tl.crawl.block ?? []).map((p) => new RegExp(p));
    const kept = (u: string): boolean =>
      hints.some((re) => re.test(u)) && !block.some((re) => re.test(u));
    // ARTICLES live at bare-root single-segment slugs — /articles/<slug> does NOT exist.
    expect(kept("https://thelife.com/10-spiritual-questions-and-their-answers")).toBe(true);
    expect(kept("https://thelife.com/10-spiritual-questions-and-their-answers/")).toBe(true);
    expect(kept("https://thelife.com/5-steps-to-staying-sober")).toBe(true);
    // DEVOTIONALS at single-segment under /devotionals/.
    expect(kept("https://thelife.com/devotionals/a-higher-calling")).toBe(true);
    expect(kept("https://thelife.com/devotionals/a-higher-calling/")).toBe(true);
    // /articles/tags/<tag> is a tag-index page, NOT an article — drop.
    expect(kept("https://thelife.com/articles/tags/communication")).toBe(false);
    // /devotionals/tags/<tag> likewise.
    expect(kept("https://thelife.com/devotionals/tags/prayer")).toBe(false);
    // Other tag/author/series 2-segment URLs fail the hints (single-segment only).
    expect(kept("https://thelife.com/tags/last-words")).toBe(false);
    expect(kept("https://thelife.com/author/staff")).toBe(false);
    expect(kept("https://thelife.com/series/easter")).toBe(false);
    // Nav/utility bare-root slugs match the hint but are blocked.
    expect(kept("https://thelife.com/chat")).toBe(false);
    expect(kept("https://thelife.com/give")).toBe(false);
    expect(kept("https://thelife.com/partners")).toBe(false);
    expect(kept("https://thelife.com/about")).toBe(false);
    expect(kept("https://thelife.com/contact")).toBe(false);
    // Section indexes — defensive blocks.
    expect(kept("https://thelife.com/articles")).toBe(false);
    expect(kept("https://thelife.com/devotionals")).toBe(false);
    expect(kept("https://thelife.com/articles/")).toBe(false);
    expect(kept("https://thelife.com/devotionals/")).toBe(false);
    // Homepage itself (no slug) fails the hint regex.
    expect(kept("https://thelife.com/")).toBe(false);
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
