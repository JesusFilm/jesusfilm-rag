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
 * Non-article media (`/video/` 50, `/quizzes-and-assessments/` 41, `/audio/`,
 * `/infographics/`) is blocked; thin section-index pages fall out via `minContentLength`.
 *
 * ## Extraction (Adobe AEM — re-derived 2026-07-09, the slice-#2 selector did NOT generalize)
 *
 * There is **no single content container** across cru.org's templates. Measured against
 * ground truth (`.article-long-form`, else the sum of all `.cmp-text` blocks):
 *
 *  - `article` matched a **9-char stub on every page**. With the old
 *    `[".article-long-form","main","article","#content"]` list, any page lacking
 *    `.article-long-form` fell through to it and was dropped `too-thin` — the first
 *    live crawl skipped **59/59** `/how-to-know-god/` pages. Removed. (`main` and
 *    `#content` never match at all.)
 *  - `.article-long-form` exists only on *lesson-style* pages (10-basic-steps,
 *    transferable-concepts). It is **absent** on most of train-and-grow, on all of
 *    how-to-know-god, and on all of blog — so slice #2's verification (done only on
 *    /4-prayer.html and /5-the-bible.html) never generalized.
 *  - `.cmp-text` **truncates**: articles are split across blocks and `querySelector`
 *    takes the first. heaven-and-hell → 14% of the article, the resurrection
 *    `full-article.html` → 3% (195 of 6,489 chars).
 *  - `.cmp-container` returns an **empty** first match on some pages (0 chars on
 *    `/how-to-know-god/my-story-a-life-changed/finding-peace.html`).
 *
 * So: take `.article-long-form` where it exists, otherwise fall through to `<body>`
 * and rely on `stripSelectors`. Over a 22-page sample spanning 23 sub-sections this
 * captures a **median 104% of ground truth (min 100%)** with zero chrome leaks; the
 * only drops are genuine section-index/hub pages.
 *
 * `stripSelectors` therefore carries the load and must remove two things the tag-level
 * strip misses:
 *  - **AEM chrome** — `.cmp-header` / `.cmp-footer` / `.cmp-global-picker` are `<div>`s,
 *    not `<header>`/`<footer>` tags. The global picker alone is ~1,745 chars of country
 *    names ("Angola English Burundi Français …") that would otherwise land in every doc.
 *  - **Related-content furniture** — `.cmp-teaser` cards, `.swiper` carousels,
 *    `.cmp-experiencefragment` promos, `.legacy-tile`. Removing these took the
 *    body-fallback overhead from ~114–152% down to ~104%.
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
    // Lesson pages only; everything else falls through to <body> + stripSelectors.
    // Do NOT add `article` (a 9-char stub on every page), `.cmp-text` (truncates
    // multi-block articles) or `.cmp-container` (empty first match). See docstring.
    contentSelectors: [".article-long-form"],
    stripSelectors: [
      "script",
      "style",
      "noscript",
      "svg",
      "nav",
      "header",
      "footer",
      // AEM chrome — these are <div>s, so the tag strip above misses them.
      ".cmp-header",
      ".cmp-footer",
      ".cmp-global-picker", // region/language picker: ~1,745 chars of country names
      ".cmp-breadcrumb",
      // related-content furniture (cards, carousels, reusable promo fragments)
      ".cmp-experiencefragment",
      ".cmp-teaser",
      ".swiper",
      ".swiper-slide",
      ".legacy-tile",
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
