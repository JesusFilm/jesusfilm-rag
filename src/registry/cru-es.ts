/**
 * Cru — Español (México), `cru.org/mx/es/`. The Spanish sibling of `cru`.
 *
 * **This REFINES an earlier conclusion.** `registry/index.ts` and `docs/sources.md`
 * previously recorded that cru.org's Spanish locale had "no real Spanish content to
 * acquire". That is true **only** of
 * `/mx/es/crecer-y-equipar/estudios-biblicos/10-pasos-basicos-.../`, which serves
 * **untranslated English** lesson bodies (Bill Bright's 10 Basic Steps) under Spanish
 * chrome. Reproduced 2026-07-09: those pages carry the *English* `.article-long-form`
 * template and extract as `lang=EN` (e.g. `intro-the-uniqueness-of-jesus.html` →
 * 4,577 chars, "Who Is Jesus Christ? Bill Bright…"). They are blocked below.
 *
 * Everything else is genuinely Spanish. A 30-page sample spread across all six
 * sub-sections (`conoce-a-dios`, `mi-historia-una-vida-cambiada`, `crecimiento-
 * espiritual`, `vida-y-relaciones`, `recursos`, `comparte-evangelio`) found **0**
 * pages with the English template and **0** whose body reads English.
 *
 * Scope: `/mx/es/conoce-a-dios/` (seeker) + `/mx/es/crecer-y-equipar/` (grow & equip),
 * minus `/10-pasos/` ⇒ **564** of the 578 in-scope sitemap locs.
 *
 * **Extraction differs from the English locale.** `.article-long-form` is absent here;
 * the article body is the first `.aem-Grid` (verified over 12 pages, bodies 1.3k–14k
 * chars, matching the body-fallback text). `.category-layout` matches on *every* page
 * but yields only a 138-char CTA blurb — a trap selector, deliberately not used, and
 * not listed as a fallback (a miss should fall through to `<body>` + minContentLength,
 * not to boilerplate).
 *
 * Language: `languages:["es"]`. `normalize()` stamps a document's language from
 * `languages[0]`, so one source per language is required for correct tagging — the
 * same model as `thelife-fr` / `thelife-zh`.
 */
import type { SourceEntry } from "./types.js";

export const cruEs: SourceEntry = {
  key: "cru-es",
  name: "Cru — Español (México)",
  domain: "www.cru.org",
  trust: "partner",
  ingestionMode: "html-scrape",
  languages: ["es"],
  defaultTags: ["cru", "discipleship", "espanol"],
  defaultCategory: "discipleship",
  rights:
    "Cru (partner ministry) — ingestion under ministry-partner understanding; citations + canonical URLs preserved; not redistributed.",
  crawl: {
    baseUrl: "https://www.cru.org",
    sitemaps: [
      "https://www.cru.org/content/cru.sitemap.mx-es-sitemap.xml",
      // A separately-indexed spiritual-disciplines branch; overlaps the above, the
      // discovery `Set` dedups. Seeded so no page is missed if it is not a child.
      "https://www.cru.org/content/cru.sitemap.mx-es-crecer-y-equipar-crecimiento-espiritual-disciplinas-espirituales-sitemap.xml",
    ],
    // `conoce-a-dios1` (a 7-loc CMS duplicate section) is excluded for free: the
    // trailing `[/.]` refuses to match the `1`.
    allow: ["^https://www\\.cru\\.org/mx/es/(conoce-a-dios|crecer-y-equipar)[/.]"],
    block: [
      "/10-pasos", // untranslated English bodies under Spanish chrome — verified
      "/search",
      "\\?",
    ],
    articleHints: ["\\.html$"],
    // The Spanish AEM template: body is the first `.aem-Grid`. NOT `.article-long-form`
    // (absent, and its presence here is the tell for an untranslated English page),
    // NOT `.category-layout` (138-char CTA boilerplate on every page).
    contentSelectors: [".aem-Grid"],
    stripSelectors: [
      "script",
      "style",
      "noscript",
      "svg",
      "nav",
      "header",
      "footer",
      ".material-icons-outlined",
      ".material-icons",
      ".article-share",
      ".hidden-print",
    ],
    requestDelayMs: 2000,
    maxPages: 700, // 564 expected after allow/block
    minContentLength: 250,
  },
};
