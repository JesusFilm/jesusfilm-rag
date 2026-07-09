/**
 * Cru (cru.org) — the consolidated English spiritual corpus.
 *
 * **Supersedes `cru-10-basic-steps`** (slice #2's 12-page hand-list). Those lesson
 * pages live under `/us/en/train-and-grow/10-basic-steps/` and are re-acquired here
 * as part of one `cru` source: one domain → one key (operator decision 2026-07-09).
 *
 * Scope = the three spiritual/seeker trunks of the `us/en` locale, discovered from
 * the `us-en` child sitemap (3,642 locs):
 *   - `/train-and-grow/`  (1,842) discipleship — devotionals, 10-basic-steps,
 *     transferable-concepts, classics, pathways, core beliefs, prayer, fasting,
 *     evangelism, leadership training, bible studies, life & relationships.
 *   - `/how-to-know-god/` (114) the seeker/gospel trunk — "Would You Like to Know
 *     God Personally?", "What do Christians believe?", life-changed testimonies.
 *   - `/blog/` (317) spiritual-growth articles. Distinct content from train-and-grow
 *     despite mirroring its taxonomy: only 24 slugs overlap, all thin section-index
 *     pages that `minContentLength` drops.
 *
 * Deliberately excluded (org / recruiting / commerce, not teaching): `/communities/`
 * (665), `/opportunities/` (399), `/about/` (169 — mostly donor-relations and
 * stewardship admin), `/campaigns/`, `/store/`, `/give/`.
 *
 * `/language-resources/` (29) is excluded **even though it is genuine multilingual
 * gospel content in ~28 languages**: `normalize()` stamps a document's language from
 * the source's `languages[0]`, so a mixed-language bag inside an `languages:["en"]`
 * source would be silently mis-tagged `en`. Revisit once per-document language
 * detection exists (FOLLOW-UP M). Spanish is captured properly by the sibling
 * `cru-es` source.
 *
 * Cru runs Adobe AEM. The article body is `.article-long-form` (verified slice #2
 * against /4-prayer.html and /5-the-bible.html; jfa's `.article-content` is absent).
 * Non-article media (`/video/` 50, `/quizzes-and-assessments/` 41, `/audio/`,
 * `/infographics/`) is blocked; thin section-index pages fall out via
 * `minContentLength` (proven in slice #2, where `10-basic-steps.html` skipped too-thin).
 */
import type { SourceEntry } from "./types.js";

export const cru: SourceEntry = {
  key: "cru",
  name: "Cru",
  domain: "www.cru.org",
  trust: "partner",
  ingestionMode: "html-scrape",
  languages: ["en"],
  defaultTags: ["cru", "discipleship", "spiritual-growth"],
  defaultCategory: "discipleship",
  rights:
    "Cru (partner ministry) — ingestion under ministry-partner understanding; citations + canonical URLs preserved; not redistributed.",
  crawl: {
    baseUrl: "https://www.cru.org",
    // The us/en locale's own child sitemap (the root /sitemap.xml is an index that
    // also lists mx/es + the tt-en and bb-en regional English mirrors, which would
    // duplicate this corpus under different canonical URLs).
    sitemaps: ["https://www.cru.org/content/cru.sitemap.us-en-sitemap.xml"],
    allow: [
      "^https://www\\.cru\\.org/us/en/train-and-grow[/.]",
      "^https://www\\.cru\\.org/us/en/how-to-know-god[/.]",
      "^https://www\\.cru\\.org/us/en/blog[/.]",
    ],
    block: [
      "/language-resources", // multilingual bag — would be mis-tagged `en` (see above)
      "/video/",
      "/quizzes-and-assessments/",
      "/audio/",
      "/infographics/",
      "/give",
      "/store",
      "/search",
      "\\?", // tracking/query variants
    ],
    // Every Cru content page is a `.html` leaf; this drops assets. Thin section
    // index pages are removed later by `minContentLength`, not by a hint regex.
    articleHints: ["\\.html$"],
    contentSelectors: [".article-long-form", "main", "article", "#content"],
    stripSelectors: [
      "script",
      "style",
      "noscript",
      "svg",
      "nav",
      "header",
      "footer",
      ".material-icons-outlined", // icon ligature text (arrow_back, search, …)
      ".material-icons",
      ".article-share", // social share widget
      ".hidden-print",
    ],
    requestDelayMs: 2000, // AEM pages are large + sometimes slow; be polite
    maxPages: 2500, // ~2,150 expected after allow/block; cap is a safety net
    minContentLength: 250,
  },
};
