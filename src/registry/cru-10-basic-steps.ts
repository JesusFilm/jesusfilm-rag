/**
 * Cru — "10 Basic Steps Toward Christian Maturity" (cru.org), slice #2's source.
 * A scoped sub-corpus of cru.org (Bill Bright's new-believer discipleship
 * curriculum) under /us/en/train-and-grow/10-basic-steps/. The 12 seed paths are
 * jfa's curated set (docs/jfa-registry-findings.md).
 *
 * Cru runs Adobe AEM. There is no clean single content wrapper for the whole
 * page (header/nav/footer + a global region-picker modal share the DOM), but the
 * lesson body lives in `.article-long-form`; selecting that and stripping the
 * Material-icon ligatures + share widget yields clean curriculum prose (verified
 * against /4-prayer.html and /5-the-bible.html — 2.8k / 7.1k chars, attribution
 * line preserved). Probed 2026-05-25: all 12 URLs reachable, no Cloudflare wall.
 */
import type { SourceEntry } from "./types.js";

export const cru10BasicSteps: SourceEntry = {
  key: "cru-10-basic-steps",
  name: "Cru — 10 Basic Steps Toward Christian Maturity",
  domain: "www.cru.org",
  trust: "partner",
  ingestionMode: "html-scrape",
  languages: ["en"],
  defaultTags: ["cru", "discipleship", "new-believer", "10-basic-steps"],
  defaultCategory: "discipleship",
  rights:
    "© Cru (Bill Bright / Campus Crusade for Christ). Ministry-partner content — used for retrieval/attribution; not redistributed.",
  crawl: {
    baseUrl: "https://www.cru.org",
    // `.article-long-form` is the AEM long-form article component; the others are
    // fallbacks in case a page uses a different template.
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
    maxPages: 20, // 12 seeds, no discovery — cap is just a safety net
    minContentLength: 250,
    seedPaths: [
      "/us/en/train-and-grow/10-basic-steps.html",
      "/us/en/train-and-grow/10-basic-steps/intro-the-uniqueness-of-jesus.html",
      "/us/en/train-and-grow/10-basic-steps/1-the-christian-adventure.html",
      "/us/en/train-and-grow/10-basic-steps/2-abundant-life.html",
      "/us/en/train-and-grow/10-basic-steps/3-the-holy-spirit.html",
      "/us/en/train-and-grow/10-basic-steps/4-prayer.html",
      "/us/en/train-and-grow/10-basic-steps/5-the-bible.html",
      "/us/en/train-and-grow/10-basic-steps/6-obedience.html",
      "/us/en/train-and-grow/10-basic-steps/7-the-christian-and-witnessing.html",
      "/us/en/train-and-grow/10-basic-steps/8-giving.html",
      "/us/en/train-and-grow/10-basic-steps/9-the-old-testament.html",
      "/us/en/train-and-grow/10-basic-steps/10-the-new-testament.html",
    ],
  },
};
