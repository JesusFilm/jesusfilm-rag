/**
 * Cru registry entries — the consolidated English `cru` source and its Spanish
 * sibling `cru-es`. Split out of `registry.test.ts` (the §5.5 300-line cap) because
 * these two carry the repo's most trap-laden crawl policy: a 9-char `article` stub,
 * a truncating `.cmp-text`, a CTA-boilerplate `.category-layout`, and a Spanish
 * locale path that serves untranslated English. Each guard below encodes one of
 * those traps. Pure data + lookups, no I/O.
 */
import { describe, expect, it } from "vitest";
import { getSource } from "./index.js";

describe("Cru registry entries", () => {
  it("resolves Cru as one consolidated discovery source over the us/en spiritual trunks", () => {
    const cru = getSource("cru");
    expect(cru).toBeDefined();
    expect(cru?.domain).toBe("www.cru.org");
    expect(cru?.trust).toBe("partner");
    expect(cru?.ingestionMode).toBe("html-scrape");
    expect(cru?.languages).toEqual(["en"]);
    // `.article-long-form` covers lesson pages; everything else falls back to <body>.
    expect(cru?.crawl.contentSelectors).toEqual([".article-long-form"]);
    // REGRESSION GUARD: `article` matches a 9-char stub on every cru.org page. Listing
    // it starved /how-to-know-god/ (59/59 dropped too-thin) on the first live crawl.
    // `.cmp-text` truncates multi-block articles; `.cmp-container` can match empty.
    expect(cru?.crawl.contentSelectors).not.toContain("article");
    expect(cru?.crawl.contentSelectors).not.toContain(".cmp-text");
    expect(cru?.crawl.contentSelectors).not.toContain(".cmp-container");
    // The AEM chrome is <div>-based, so the tag strip misses it; it must be stripped
    // explicitly or ~1.7k chars of region-picker country names land in every doc.
    for (const sel of [".cmp-header", ".cmp-footer", ".cmp-global-picker", ".cmp-teaser"]) {
      expect(cru?.crawl.stripSelectors).toContain(sel);
    }
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
    // No reliable container on the Spanish template: extract <body>, strip the chrome.
    // `.category-layout` matches every page but yields 138 chars of CTA boilerplate;
    // `.aem-Grid`/`.cmp-text` are first-match containers that truncate or match empty.
    expect(es?.crawl.contentSelectors).toEqual([]);
    expect(es?.crawl.contentSelectors).not.toContain(".category-layout");
    for (const sel of [".cmp-header", ".cmp-global-picker", ".cmp-teaser"]) {
      expect(es?.crawl.stripSelectors).toContain(sel);
    }

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

});
