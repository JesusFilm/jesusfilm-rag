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
 * **Extraction: `contentSelectors` is deliberately empty** — every page falls through
 * to `<body>` and `stripSelectors` does the work, exactly as in the English `cru`
 * source (see its docstring for the full derivation). Selectors that look right here
 * are all traps: `.article-long-form` is absent (its *presence* is the tell for an
 * untranslated English page), `.category-layout` matches every page but yields a
 * 138-char CTA blurb, and `.aem-Grid` / `.cmp-text` are first-match containers that
 * truncate or return empty on some templates. Over a 10-page sample the body fallback
 * captured a **median 105% of ground truth** with zero chrome leaks; the only drop was
 * `/mx/es/conoce-a-dios.html`, a section landing page.
 *
 * Language: `languages:["es"]`. `normalize()` stamps a document's language from
 * `languages[0]`, so one source per language is required for correct tagging — the
 * same model as `thelife-fr` / `thelife-zh`. See FOLLOW-UP M.
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
    // Intentionally empty: no reliable container on this template — extract <body>
    // and let stripSelectors remove the chrome. See docstring.
    contentSelectors: [],
    stripSelectors: [
      "script",
      "style",
      "noscript",
      "svg",
      "nav",
      "header",
      "footer",
      // AEM chrome — <div>s, missed by the tag strip above.
      ".cmp-header",
      ".cmp-footer",
      ".cmp-global-picker",
      ".cmp-breadcrumb",
      // related-content furniture
      ".cmp-experiencefragment",
      ".cmp-teaser",
      ".swiper",
      ".swiper-slide",
      ".legacy-tile",
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
