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

  it("resolves Cru as one consolidated discovery source over the us/en spiritual trunks", () => {
    const cru = getSource("cru");
    expect(cru).toBeDefined();
    expect(cru?.domain).toBe("www.cru.org");
    expect(cru?.trust).toBe("partner");
    expect(cru?.ingestionMode).toBe("html-scrape");
    expect(cru?.languages).toEqual(["en"]);
    // `.article-long-form` is the verified content container for Cru AEM articles.
    expect(cru?.crawl.contentSelectors[0]).toBe(".article-long-form");
    // Discovery source now (absorbed the 12 hand-listed 10-basic-steps seeds).
    expect(cru?.crawl.seedPaths).toBeUndefined();
    expect(cru?.crawl.sitemaps?.[0]).toContain("us-en-sitemap.xml");

    const keep = (u: string): boolean =>
      cru!.crawl.allow!.some((a) => new RegExp(a).test(u)) &&
      !cru!.crawl.block!.some((b) => new RegExp(b).test(u));

    // the three spiritual trunks are in scope — including the absorbed 10-basic-steps
    expect(keep("https://www.cru.org/us/en/train-and-grow/10-basic-steps/4-prayer.html")).toBe(true);
    expect(keep("https://www.cru.org/us/en/how-to-know-god/what-is-christianity.html")).toBe(true);
    expect(keep("https://www.cru.org/us/en/blog/spiritual-growth/beyond-religion.html")).toBe(true);
    // org / recruiting / commerce are not teaching content
    expect(keep("https://www.cru.org/us/en/communities/campus.html")).toBe(false);
    expect(keep("https://www.cru.org/us/en/opportunities/mission-trips.html")).toBe(false);
    expect(keep("https://www.cru.org/us/en/about/donor-relations.html")).toBe(false);
    // the ~28-language bag stays out until per-document language detection exists
    expect(keep("https://www.cru.org/us/en/train-and-grow/language-resources/french.html")).toBe(
      false,
    );
    // non-article media
    expect(keep("https://www.cru.org/us/en/train-and-grow/video/a-clip.html")).toBe(false);
  });

  it("resolves cru-es as the Spanish sibling and blocks the untranslated-English 10-pasos path", () => {
    const es = getSource("cru-es");
    expect(es).toBeDefined();
    expect(es?.domain).toBe("www.cru.org");
    expect(es?.languages).toEqual(["es"]);
    // The Spanish AEM template: body is `.aem-Grid`. `.article-long-form` is absent,
    // and `.category-layout` is a 138-char CTA-boilerplate trap — neither is used.
    expect(es?.crawl.contentSelectors).toEqual([".aem-Grid"]);
    expect(es?.crawl.contentSelectors).not.toContain(".category-layout");

    const keep = (u: string): boolean =>
      es!.crawl.allow!.some((a) => new RegExp(a).test(u)) &&
      !es!.crawl.block!.some((b) => new RegExp(b).test(u));

    expect(
      keep("https://www.cru.org/mx/es/conoce-a-dios/jesus-dios-o-simplemente-buen-hombre.html"),
    ).toBe(true);
    expect(
      keep("https://www.cru.org/mx/es/crecer-y-equipar/crecimiento-espiritual/oracion/nacido.html"),
    ).toBe(true);
    // untranslated English lesson bodies served under Spanish chrome — verified
    expect(
      keep(
        "https://www.cru.org/mx/es/crecer-y-equipar/estudios-biblicos/10-pasos-basicos-para-la-madurez-cristiana/intro-the-uniqueness-of-jesus.html",
      ),
    ).toBe(false);
    // `conoce-a-dios1` is a CMS duplicate section — excluded by the trailing [/.]
    expect(keep("https://www.cru.org/mx/es/conoce-a-dios1/algo.html")).toBe(false);
    // the English locale belongs to `cru`, not here
    expect(keep("https://www.cru.org/us/en/train-and-grow/10-basic-steps/4-prayer.html")).toBe(
      false,
    );
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

  it("resolves familylife as a partner discovery source seeding three post-sitemaps", () => {
    const fl = getSource("familylife");
    expect(fl).toBeDefined();
    expect(fl?.domain).toBe("www.familylife.com");
    expect(fl?.trust).toBe("partner");
    expect(fl?.ingestionMode).toBe("html-scrape");
    // Discovery source: the three WP "post" content-type sitemaps + the Spanish
    // us-latinos child sitemap (added 2026-06-24), not the sitemap index. No
    // hand-listed seedPaths.
    expect(fl?.crawl.sitemaps).toEqual([
      "/post-sitemap1.xml",
      "/post-sitemap2.xml",
      "/post-sitemap3.xml",
      "/us-latinos-sitemap1.xml",
    ]);
    expect(fl?.crawl.seedPaths).toBeUndefined();
    expect(fl?.languages).toEqual(["en", "es"]);
    // `.the-content` is the innermost prose container, same on /articles/ and /equip/.
    expect(fl?.crawl.contentSelectors[0]).toBe(".the-content");
  });

  it("familylife articleHints keep /articles/ + /equip/ posts, drop homepage + non-post paths", () => {
    const fl = getSource("familylife")!;
    const hints = (fl.crawl.articleHints ?? []).map((p) => new RegExp(p));
    const block = (fl.crawl.block ?? []).map((p) => new RegExp(p));
    const kept = (u: string): boolean =>
      hints.some((re) => re.test(u)) && !block.some((re) => re.test(u));
    // /articles/<...> posts (the bulk of post-sitemap2/3 + 783 of post-sitemap1) — kept.
    expect(
      kept(
        "https://www.familylife.com/articles/topics/parenting/essentials/fathers/7-essentials-to-help-you-be-the-spiritual-leader-of-your-family/",
      ),
    ).toBe(true);
    // /equip/<...> teaching posts (155 in post-sitemap1, same WP template) — also kept.
    expect(kept("https://www.familylife.com/equip/how-to-mentor/")).toBe(true);
    expect(
      kept(
        "https://www.familylife.com/equip/discipleship-of-a-new-christian-start-here/",
      ),
    ).toBe(true);
    // Spanish /us-latinos/<sub-path> content — kept; bare /us-latinos/ landing
    // (no sub-path) — dropped (the hint requires at least one trailing segment).
    expect(
      kept(
        "https://www.familylife.com/us-latinos/acerca-de-nosotros/principios-fundamentales/",
      ),
    ).toBe(true);
    expect(kept("https://www.familylife.com/us-latinos/")).toBe(false);
    // Homepage `/` that post-sitemap1 lists — fails the hints.
    expect(kept("https://www.familylife.com/")).toBe(false);
    // Defensive blocks — wp-admin, cart, podcast (deferred sub-scope), assets.
    expect(kept("https://www.familylife.com/wp-admin/")).toBe(false);
    expect(kept("https://www.familylife.com/cart/checkout/")).toBe(false);
    expect(kept("https://www.familylife.com/podcast/some-episode/")).toBe(
      false,
    );
    expect(kept("https://www.familylife.com/wp-content/foo.pdf")).toBe(false);
    // Cross-host safety (handled by `allow`, but verify the hint regexes are origin-anchored).
    expect(kept("https://evil.com/articles/whatever/")).toBe(false);
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

  it("resolves thelife-fr (laviejenparle.com) — French sibling-domain variant", () => {
    const fr = getSource("thelife-fr");
    expect(fr).toBeDefined();
    expect(fr?.domain).toBe("laviejenparle.com");
    expect(fr?.trust).toBe("partner");
    expect(fr?.languages).toEqual(["fr"]);
    expect(fr?.crawl.sitemaps).toEqual(["/sitemap.xml"]);
    expect(fr?.crawl.seedPaths).toBeUndefined();
    expect(fr?.crawl.contentSelectors[0]).toBe(".article-body");
    expect(fr?.crawl.requestDelayMs).toBe(2000); // same Cloudflare stack as thelife
    const hints = (fr!.crawl.articleHints ?? []).map((p) => new RegExp(p));
    const block = (fr!.crawl.block ?? []).map((p) => new RegExp(p));
    const kept = (u: string): boolean =>
      hints.some((re) => re.test(u)) && !block.some((re) => re.test(u));
    // bare-root single-segment slug = a French article — kept
    expect(kept("https://laviejenparle.com/10-questions-spirituelles-avec-reponses")).toBe(true);
    // /articles/tags/* and /devotionals/tags/* are tag indexes — dropped
    expect(kept("https://laviejenparle.com/articles/tags/sexe")).toBe(false);
    expect(kept("https://laviejenparle.com/devotionals/tags/divorce")).toBe(false);
    // nav slugs blocked; homepage fails the hint
    expect(kept("https://laviejenparle.com/about")).toBe(false);
    expect(kept("https://laviejenparle.com/chat")).toBe(false);
    expect(kept("https://laviejenparle.com/")).toBe(false);
    // cross-host safety
    expect(kept("https://thelife.com/10-spiritual-questions-and-their-answers")).toBe(false);
  });

  it("resolves thelife-zh (uwota.com) — Chinese sibling-domain variant", () => {
    const zh = getSource("thelife-zh");
    expect(zh).toBeDefined();
    expect(zh?.domain).toBe("uwota.com");
    expect(zh?.trust).toBe("partner");
    expect(zh?.languages).toEqual(["zh"]);
    expect(zh?.crawl.sitemaps).toEqual(["/sitemap.xml"]);
    expect(zh?.crawl.seedPaths).toBeUndefined();
    expect(zh?.crawl.contentSelectors[0]).toBe(".article-body");
    const hints = (zh!.crawl.articleHints ?? []).map((p) => new RegExp(p));
    const block = (zh!.crawl.block ?? []).map((p) => new RegExp(p));
    const kept = (u: string): boolean =>
      hints.some((re) => re.test(u)) && !block.some((re) => re.test(u));
    expect(kept("https://uwota.com/a-happy-life")).toBe(true);
    expect(kept("https://uwota.com/articles/tags/ren-sheng")).toBe(false);
    expect(kept("https://uwota.com/about")).toBe(false);
    expect(kept("https://uwota.com/")).toBe(false);
  });

  it("registers the crawlable non-English variants and omits the un-acquirable ones", () => {
    // Crawlable, genuine-target-language sibling sources.
    expect(getSource("thelife-fr")).toBeDefined();
    expect(getSource("thelife-zh")).toBeDefined();
    // cru.org/mx/es IS acquirable: only its /10-pasos/ path is untranslated English
    // (blocked inside `cru-es`), not the whole locale as once recorded.
    expect(getSource("cru-es")).toBeDefined();
    // NOT registered: shagerdan.com (Persian) serves a Cloudflare 403 wall.
    expect(getSource("thelife-fa")).toBeUndefined();
    // The old narrow sub-scope key is gone — absorbed into the consolidated `cru`.
    expect(getSource("cru-10-basic-steps")).toBeUndefined();
  });
});
