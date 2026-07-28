/**
 * EveryStudent — Spanish (cadaestudiante.com). The Spanish banner of Cru's
 * seeker-facing Q&A ministry: short apologetics/life-issue articles written for
 * Spanish-speaking students who are not believers. A sibling of the three
 * already-registered EveryStudent domains.
 *
 * **A separate SOURCE KEY, not a language of `everystudent`** — one domain =
 * one source (ADR-0006). cadaestudiante.com is its own domain, so it gets its
 * own key, exactly as `everystudent-ar` (everyarabstudent.com) and
 * `everystudent-fr` (questions2vie.com) are separate from `everystudent`, and
 * as `thelife-fr` / `thelife-zh` are separate from `thelife`.
 *
 * **NOT walled — plain HTTP, and therefore a real DISCOVERY crawl.** This is the
 * headline difference from its three siblings. Verified 2026-07-28 with plain
 * `curl` and a browser UA: `/robots.txt`, `/sitemap.xml`, the homepage and 32
 * content pages all returned **HTTP 200 with real HTML** — no `Attention
 * Required!`, no `Just a moment`, no challenge interstitial. Cloudflare fronts
 * the origin (`server: cloudflare` on every response) but serves us normally.
 * So `fetchStrategy` is deliberately ABSENT — plain HTTP is the default and
 * there is no reason to pay Firecrawl credits here. ~40 probe requests, most
 * spaced 1s apart, drew zero 429s and zero challenge pages — which is what
 * `requestDelayMs: 1000` is sized against.
 *
 * Because fetching is free and `/sitemap.xml` is reachable, this entry uses
 * `sitemaps` + `allow`/`articleHints`/`block` rather than a hand-listed
 * `seedPaths`. Precedent: `thelife-fr`. The siblings hand-list only because
 * their walls made discovery cost money.
 *
 * **robots.txt: `User-agent: * Allow: /`** — fetched 2026-07-28, 26 bytes, a
 * single line, **zero Disallow directives**. Same as everyarabstudent.com and
 * questions2vie.com, and unlike everystudent.com (which carries a real disallow
 * list). Nothing in the article set is disallowed.
 *
 * **Sitemap: 153 `<loc>` entries, all on `https://www.cadaestudiante.com`**
 * (counted 2026-07-28). Bare `cadaestudiante.com` 301s to the `www` host, and
 * every `<loc>` is already written with `www`, so the filters anchor on it.
 * The 153 break down as:
 *   -  **78 `/articulos/<slug>.html`** — THE ARTICLE CORPUS, and the only thing
 *      this source ingests. Slugs are mixed-case with hyphens/underscores
 *      (`Dios.html`, `biblia_juan.html`, `jesus-y-islam.html`,
 *      `ayuda-de-Dios.html`), so the hint matches any `[^/]+\.html` leaf.
 *   -  **49 `/pdf/<slug>.pdf`** — print twins of the articles (48 of the 49
 *      slugs are literally an `/articulos/` slug; the odd one, `Hay1Dios.pdf`,
 *      is the print twin of `/articulos/hayundios.html`). Blocked: this source
 *      is `html-scrape`, and they are duplicates besides.
 *   -  **13 `/audio/…`** — 12 `/audio/<slug>.html` player pages plus the
 *      `/audio/` index. Blocked as **near-duplicates**, measured not assumed:
 *      `/audio/fe.html` shares **85.7%** of its 12-word shingles with
 *      `/articulos/fe.html`, and `/audio/hayundios.html` **83.5%** with
 *      `/articulos/hayundios.html` — an audio player wrapped around the same
 *      body text. The document-level content hash cannot collapse
 *      near-duplicates sitting at different URLs, so they must be filtered here.
 *      The one audio page with no same-slug twin, `/audio/intimidad.html`, is
 *      **not** unique content either: `/articulos/intimidad.html` 301s to
 *      `/articulos/busqueda.html`, which is in the sitemap and shares **91.9%**
 *      of the audio page's shingles. Blocking `/audio/` therefore loses nothing.
 *   -  **6 `/menu/<topic>.html`** — section index pages (`conociendo`,
 *      `enigmas`, `existencia`, `intl`, `preguntas`, `relaciones`). Measured
 *      628 chars on `/menu/preguntas.html`: a bare list of article titles.
 *      Navigation, not content. `/menu/intl.html` is also the page linking out
 *      to the sibling language domains — dropped for the same reason the English
 *      entry drops `/menus/intl.html`.
 *   -  **7 root pages**, all blocked, each fetched and read 2026-07-28:
 *      `/` (homepage); `/sitemap.html` (the "Mapa del sitio" nav page, the
 *      Spanish twin of the `/sitemap.html` the English entry drops);
 *      `/acerca.html` (about + privacy, 1,940 ch); `/personal.html` (the
 *      "¿Tienes alguna pregunta?" contact form, 408 ch); `/promocion/`
 *      ("Promociona este sitio" — printable promo assets, 883 ch); and
 *      `/juan.html` (1,630 ch) + `/aventura.html` (1,757 ch), which are
 *      **email-signup landing pages** ("Regístrate para … por email"), the exact
 *      Spanish counterparts of the `/jean.html` / `/aventure.html` pages that
 *      slice #10 measured and dropped from `everystudent-fr` after ingest. They
 *      clear `minContentLength` easily — length is not aboutness — so they are
 *      excluded structurally, before the first fetch, rather than after.
 * Net: **78 URLs pass the filters**, and every one of them is an article.
 *
 * ⓘ The `/articulos/` set includes two **video-transcript** pages,
 * `conociendo-video.html` (6,106 ch) and `platos.html` (1,422 ch). Both were
 * fetched and both carry genuine Spanish transcript prose, and
 * `conociendo-video.html` overlaps its nearest-named neighbour
 * `/articulos/conociendo.html` by only **3.0%** of shingles — distinct
 * documents, so they are kept.
 *
 * ⚠️ One page the sitemap omits: `/articulos/conociendo2.html`, linked from the
 * call-to-action on every article, is **not** in `/sitemap.xml` (grepped, 0
 * hits) and so will not be discovered. It is decision-follow-up material rather
 * than a seeker article, so this is acceptable — recorded so nobody re-derives it.
 *
 * **Extraction — the shared EveryStudent template is fully present here and
 * `.content4` binds.** Verified 2026-07-28 across 32 fetched pages, 21 of them
 * `/articulos/` articles: every article carries exactly one
 * `<div class="content4">` and one nested `<div class="content4b">`, plus
 * `.articletitle` and `.contentpadding`. (Only nav/utility pages —
 * `/menu/preguntas.html`, `/acerca.html`, `/promocion/`, `/audio/` — lack
 * `.content4b`, and all of those are blocked.) Extracting `.content4` yields the
 * category kicker, headline, subhead, byline and the whole body — e.g.
 * `/articulos/hayundios.html` → 19,643 chars ending on its own last footnote.
 * Bodies measured after stripping ranged 1,422–24,146 chars, so the 250 floor is
 * comfortable. Selector order mirrors the three siblings.
 *
 * **Chrome strip — measured per selector, not copied on faith.** On 5 sampled
 * articles the base sibling list removes 61–183 chars/page and the additions
 * below take it to 84–206:
 *   - `.fccell` — the "FEATURE CLOSE" CTA table (`INVITÉ A JESUS A ENTRAR EN MI
 *     VIDA…`, `TENGO UNA PREGUNTA…`). **The only sibling selector that removes
 *     real text here: 61–183 chars on every page.**
 *   - `.shareiconsmenupg` — **SITE-SPECIFIC, added here.** The trailing
 *     "COMPARTE ESTA PÁGINA:" share row. It survives `sitelevel_noindex` because
 *     of a genuine markup defect (below), so it needs naming directly; removing
 *     it is what lets every article end on its own last line.
 *   - `sitelevel_noindex` — a real custom TAG, not a class (hence no leading
 *     dot, as in both sibling entries): the markup is literally
 *     `<sitelevel_noindex>…</sitelevel_noindex>`. **Measured 0 chars removed
 *     from inside `.content4`** on all 5 pages: its instances wrap the cookie
 *     notice, the top nav menu and the right sidebar, all of which sit outside
 *     `.content4`; the one instance that overlaps the article opens inside
 *     `.contentpadding` and closes *after* `.content4` closes, so HTML5 tree
 *     construction pops it at the first `</div>` and it never encloses the share
 *     row. Retained for parity and in case the markup is repaired upstream.
 *   - `.relatedbottom` — present only as a CSS rule; no element instance on any
 *     sampled page. 0 chars. Retained for parity.
 *   - `.hr2` / `.articledivider` — present as elements but they are zero-height,
 *     zero-text rules. 0 chars. Retained for parity.
 *
 * **Language: `["es"]` — read, not inferred.** Every page carries
 * `<html lang="es">`, and the bodies are genuine Spanish prose, not the
 * untranslated-English failure mode cru.org's `/mx/es/.../10-pasos-basicos/`
 * path exhibits. Read directly across 15 articles, e.g. `/articulos/hayundios.html`
 * opens "¿No te gustaría que alguien te mostrase -de una manera simple- la
 * evidencia de la existencia de Dios?" and `/articulos/soledad.html` "En lugar
 * de ocultar esos sentimientos vacíos, esto es lo que hay que hacer". The only
 * English found anywhere was inside bibliographic footnotes on
 * `/articulos/matrimonio.html` (untranslated citations such as "Shervert H.
 * Frazier, Psychotrends" and "(8) John 14:6") — reference apparatus, not body
 * text. The stored per-document label still comes from content detection at
 * ingest (invariant 6), never from this field.
 *
 * ⚠️ Spanish is **not** a new language for this corpus — `cru` and `familylife`
 * already contribute `es` documents — so Spanish is a MULTI-source language for
 * gating purposes and existing Spanish golden cases become eligible by
 * construction against this source's documents.
 */
import type { SourceEntry } from "./types.js";

export const everystudentEs: SourceEntry = {
  key: "everystudent-es",
  name: "EveryStudent — Spanish (cadaestudiante.com)",
  domain: "www.cadaestudiante.com",
  trust: "partner",
  ingestionMode: "html-scrape",
  languages: ["es"],
  defaultTags: ["everystudent", "cru", "topic:seeker", "lang:es"],
  defaultCategory: "article",
  rights:
    "© CadaEstudiante.com (Cru) — partner ministry content; used for retrieval/attribution.",
  crawl: {
    // No `fetchStrategy`: verified unwalled 2026-07-28 (plain HTTP 200s), so the
    // default plain-http applies and no Firecrawl credits are spent.
    baseUrl: "https://www.cadaestudiante.com",
    // Discovery, not hand-listed seeds: the sitemap is reachable and free.
    sitemaps: ["/sitemap.xml"],
    allow: ["^https://www\\.cadaestudiante\\.com/"],
    // Articles live at /articulos/<slug>.html and nowhere else. Slugs are
    // mixed-case with hyphens/underscores, hence the permissive leaf class.
    articleHints: [
      "^https://www\\.cadaestudiante\\.com/articulos/[^/]+\\.html$",
    ],
    block: [
      // /pdf/ print twins (this source is html-scrape) and /audio/ player pages
      // (83.5-91.9% shingle-identical to their /articulos/ twin — see header).
      "^https://www\\.cadaestudiante\\.com/(pdf|audio)/",
      // Section index pages, incl. /menu/intl.html (the sibling-language links).
      "^https://www\\.cadaestudiante\\.com/menu/",
      // "Promociona este sitio" — printable promo assets, not content.
      "^https://www\\.cadaestudiante\\.com/promocion/",
      // Site nav, about/privacy, contact form, and the two email-signup landing
      // pages (the Spanish /jean.html + /aventure.html of everystudent-fr).
      "^https://www\\.cadaestudiante\\.com/(sitemap|acerca|personal|juan|aventura)\\.html$",
      // Homepage.
      "^https://www\\.cadaestudiante\\.com/?$",
      "\\.pdf($|\\?)",
    ],
    contentSelectors: [
      ".content4",
      ".content4b",
      ".articletitle",
      ".contentpadding",
    ],
    stripSelectors: [
      "script",
      "style",
      "noscript",
      "svg",
      "nav",
      "header",
      "footer",
      "form",
      // Site-specific chrome, measured 2026-07-28 (see header):
      "sitelevel_noindex", // custom TAG; 0 ch here — kept for sibling parity
      ".relatedbottom", // CSS rule only on this host; 0 ch — kept for parity
      ".fccell", // "FEATURE CLOSE" CTA table — removes 61-183 ch/page
      ".shareiconsmenupg", // "COMPARTE ESTA PÁGINA:" share row — site-specific
      ".hr2",
      ".articledivider",
    ],
    // ~40 probe requests at ~1s spacing drew zero 429s (2026-07-28).
    requestDelayMs: 1000,
    maxPages: 200, // 153 sitemap URLs / 78 passing the hints + headroom
    minContentLength: 250,
  },
};
