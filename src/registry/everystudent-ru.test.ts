/**
 * The `everystudent-ru` registry entry — EveryStudent's Russian domain
 * (mirstudentov.com). Split out of `registry.test.ts` (the §5.5 300-line cap),
 * following `everystudent.test.ts` / `everystudent-ar.test.ts` /
 * `everystudent-fr.test.ts` / `everystudent-de.test.ts`.
 *
 * Each guard below pins a decision that took live measurement to reach, so a
 * future edit cannot quietly undo it:
 *   - plain HTTP, NOT Firecrawl — this banner is not walled, and adding a
 *     strategy here would bill 95 pages for a wall that isn't there;
 *   - a SEPARATE key from `everystudent`, because one domain = one source;
 *   - discovery, not hand-listed seeds, because the sitemap is reachable;
 *   - `/a/` only — the `/m/` indexes and `/sitemap.html` all clear the
 *     250-char floor, so `minContentLength` could never have excluded them;
 *   - the CTA/share chrome strip, including the site-specific "ПОДЕЛИТЬСЯ:"
 *     widget whose wrapping tag is malformed.
 * Pure data + lookups, no I/O.
 */
import { describe, expect, it } from "vitest";
import { getSource, resolveFetchStrategy, seedUrls } from "./index.js";
import type { SourceEntry } from "./types.js";

const ru = (): SourceEntry => getSource("everystudent-ru")!;

/** Apply the entry's own discovery filters to a URL, the way Acquisition does. */
const keeps = (url: string): boolean => {
  const { allow, articleHints, block } = ru().crawl;
  const any = (pats: string[] | undefined): boolean =>
    !pats?.length || pats.some((p) => new RegExp(p).test(url));
  if (block?.some((p) => new RegExp(p).test(url))) return false;
  return any(allow) && any(articleHints);
};

describe("everystudent-ru registry entry", () => {
  it("resolves everystudent-ru as an UNWALLED Russian source crawled over plain HTTP", () => {
    const entry = ru();
    expect(entry.domain).toBe("www.mirstudentov.com");
    expect(entry.languages).toEqual(["ru"]);
    // The load-bearing fact: probed 2026-07-28, 26 plain-HTTP GETs (robots.txt,
    // /sitemap.xml, 14 articles, all 7 /m/ indexes, /vopros.html,
    // /sitemap.html, the homepage) all returned HTTP 200 with real HTML and no
    // Cloudflare block-page signature, and a HEAD sweep of all 95 /a/ URLs
    // returned 95/95 200s. Declaring a strategy here would bill every page.
    expect(entry.crawl.fetchStrategy).toBeUndefined();
    expect(resolveFetchStrategy(entry)).toBe("plain-http");
  });

  it("is a DISCOVERY crawl off the live sitemap, not a hand-listed seed set", () => {
    const entry = ru();
    // /sitemap.xml answered 200 (7,692 bytes, 105 <loc>, all 105 distinct), so
    // there is no reason to hand-list. The three walled siblings had to; this
    // one doesn't. Precedent for the shape: thelife-fr.
    expect(entry.crawl.sitemaps).toEqual(["/sitemap.xml"]);
    expect(entry.crawl.seedPaths).toBeUndefined();
    expect(seedUrls(entry)).toEqual([]);
    // Discovery needs the filter trio to be meaningful, not just present.
    expect(entry.crawl.allow?.length).toBeGreaterThan(0);
    expect(entry.crawl.articleHints?.length).toBeGreaterThan(0);
    expect(entry.crawl.block?.length).toBeGreaterThan(0);
    expect(entry.crawl.maxPages).toBeGreaterThan(105); // 105 sitemap URLs
  });

  it("is a SEPARATE source key per domain, and does not claim `ru` exclusively (ADR-0006)", () => {
    // One domain = one source. mirstudentov.com is its own domain, so the
    // Russian content must not be folded into `everystudent` as a second
    // language — the same rule that keeps thelife-fr / thelife-zh separate.
    const en = getSource("everystudent")!;
    expect(en.languages).toEqual(["en"]);
    expect(en.domain).not.toBe(ru().domain);
    expect(ru().key).toBe("everystudent-ru");
    // `languages` is a declaration about THIS domain only. A Central-Asian
    // Russian sibling (studentstan.com) exists and would also carry "ru", so
    // nothing may treat this entry as the sole owner of the language.
    expect(ru().languages).toEqual(["ru"]);
  });

  it("keeps /a/ articles and drops the section indexes, site plan, contact form and homepage", () => {
    const host = "https://www.mirstudentov.com";
    expect(keeps(`${host}/a/estli.html`)).toBe(true);
    // One slug is mixed-case; the hint must not assume lowercase.
    expect(keeps(`${host}/a/pomoshch-ot-Boga.html`)).toBe(true);
    // The 7 /m/ section indexes are headline+teaser link lists (756-1,750 ch),
    // incl. /m/vid.html (video index) and /m/ob.html (about + privacy).
    expect(keeps(`${host}/m/sush.html`)).toBe(false);
    expect(keeps(`${host}/m/ob.html`)).toBe(false);
    // The contact form: 85 chars.
    expect(keeps(`${host}/vopros.html`)).toBe(false);
    expect(keeps(`${host}/`)).toBe(false);
  });

  it("drops the site-plan page that minContentLength could never catch", () => {
    // /sitemap.html extracts 3,262 chars of pure link list and is also the page
    // linking out to the sibling language domains ("Другие языки") — the
    // Russian twin of the French /plan.html and the English /menus/intl.html.
    // It clears the 250-char floor by an order of magnitude: length is not
    // aboutness, which slice #10 paid to learn. Only a URL block excludes it.
    expect(keeps("https://www.mirstudentov.com/sitemap.html")).toBe(false);
    expect(ru().crawl.minContentLength).toBe(250);
  });

  it("extracts from the shared template selectors, measured binding on this host", () => {
    const { contentSelectors } = ru().crawl;
    // The shared EveryStudent template DOES bind here (unlike Simplified
    // Chinese and Georgian). All four are also defined in the page's inline
    // <style> block, so token presence alone proved nothing — verified against
    // the markup itself. Nesting: .content4 > .content4b > .contentpadding >
    // h1.articletitle. Outermost first, so one node carries kicker + title +
    // body; the 14 articles sampled extracted 2,570-17,689 chars.
    expect(contentSelectors).toEqual([
      ".content4",
      ".content4b",
      ".articletitle",
      ".contentpadding",
    ]);
  });

  it("strips the share/CTA chrome, including the site-specific ПОДЕЛИТЬСЯ widget", () => {
    const strip = ru().crawl.stripSelectors;
    // A custom ELEMENT tag, not a class — <sitelevel_noindex>…</sitelevel_noindex>,
    // 4 pairs per article page. The missing leading "." is correct, not a typo.
    expect(strip).toContain("sitelevel_noindex");
    // The "FEATURE CLOSE" CTA: the table shell as well as its cells, or the
    // emptied shell survives. Measured removal 60-238 chars per article.
    expect(strip).toContain(".fctable");
    expect(strip).toContain(".fccell");
    // Site-specific: the "ПОДЕЛИТЬСЯ:" AddToAny widget. Its wrapping
    // <sitelevel_noindex> is malformed — on /a/molitvi.html it opens at line
    // 360 inside .contentpadding and closes at 375, after .contentpadding
    // (361), .content4b (362) and .content4 (374) have all closed. Parser
    // recovery cannot be assumed; without this the label trails every article.
    expect(strip).toContain(".shareiconsmenupg");
  });
});
