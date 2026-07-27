/**
 * EveryStudent — French (questions2vie.com). The French banner of Cru's
 * seeker-facing Q&A ministry: short apologetics/life-issue articles aimed at
 * French-speaking students who are not believers. Slice #10; planned in #112.
 *
 * **The third and final walled EveryStudent domain**, closing the #112 route
 * (en → ar → fr).
 *
 * **A separate SOURCE KEY, not a language of `everystudent`** — one domain =
 * one source (ADR-0006). questions2vie.com is its own domain, so it gets its
 * own key, the same way `thelife-fr` (laviejenparle.com) and `thelife-zh`
 * (uwota.com) are separate from `thelife`.
 *
 * **WALLED (ADR-0012), like both siblings.** Probed 2026-07-27: the homepage,
 * a real article (`/a/102rien.html`) and `/sitemap.xml` all return **403**
 * carrying the Cloudflare block-page signature (`<title>Attention Required! |
 * Cloudflare</title>`), and only `robots.txt` answers plain HTTP. So
 * `fetchStrategy: "firecrawl"` — every request this source makes is billed per
 * page (measured 1 credit/page across all three EveryStudent hosts in #114,
 * because Firecrawl's `basic` proxy clears them and `auto` never escalates to
 * the 5-credit enhanced retry; re-measure before any large re-crawl).
 *
 * Classification note: the wall was called on the **block-page signature**, not
 * on the presence of a `challenge-platform` script — Cloudflare injects that
 * into successfully-served pages too, so keying off it false-positives (#114).
 *
 * **Hand-listed seeds, not a discovery crawl** — same reasoning as both
 * siblings, and the same already-paid inventory. `/sitemap.xml` is unreachable
 * to plain HTTP, and #114 already enumerated this domain through Firecrawl's
 * `/v2/map` (87 URLs, 1 credit flat, full list preserved as a comment on that
 * issue). Re-discovering would re-pay for knowledge we already hold, so the
 * mapped inventory is lifted here directly. `sitemaps` is intentionally absent.
 *
 * **70 seeds from the 87 mapped.** Dropped:
 *   - the **12 `/m/*` pages** — the mobile/menu section indexes (`enigmes`,
 *     `existence`, `experience`, `faq`, `intl`, `jesus`, `lavie`, `legales`,
 *     `qetr`, `qui`, `relations`, `videos`). #112's crawl policy strips `/m/`,
 *     `/menu/`, `/menus/` across all three banners; these are navigation, not
 *     articles. `/m/intl.html` is also the page linking out to the sibling
 *     language domains — dropped for the same reason the English entry drops
 *     `/menus/intl.html`.
 *   - **`/plan.html`** — the "plan du site" sitemap page, the French twin of
 *     the `/sitemap.html` the English entry drops.
 *   - **`/contact1.html`** — contact chrome.
 *   - the **two `.php` extension twins**, `/aventure.php` and `/jean.php`. Each
 *     shares a slug with a `.html` page already seeded; a legacy site serving
 *     one page at two extensions is the likeliest reading, and the document-level
 *     content hash cannot collapse duplicates that sit at different URLs — so
 *     seeding both would pay a credit to add a near-duplicate document. If the
 *     `.html` twin turns out to be a redirect stub at Stage 1, revisit.
 *   - the bare homepage.
 * No `block` array: `block` filters DISCOVERED urls, and a seed-only source
 * discovers none — the seed list itself is the filter. Anything added later must
 * be re-checked against robots.txt by hand.
 *
 * **`/jean.html`, `/jeanFR.html` and `/aventure.html` are kept provisionally.**
 * Root-level pages the map returned that could not be classified without
 * spending a credit — `jean` is presumably a Gospel-of-John reader (the Arabic
 * banner's `/john.html` equivalent) and `aventure` a resource or next-step page.
 * Whether `/jeanFR.html` is a genuine variant or a duplicate of `/jean.html` is
 * a question worth 1 credit, not a guess; `minContentLength: 250` drops any that
 * turn out to be link-only chrome. Confirm at Stage 1.
 *
 * **robots.txt is `User-agent: * Allow: /`** — checked live 2026-07-27. Same as
 * everyarabstudent.com and UNLIKE everystudent.com, which carries a real
 * disallow list (`/4laws.html`, `/team/*`, `/mobi/*`, …). Nothing on this domain
 * is disallowed, so no seed needed dropping on robots grounds.
 *
 * **Extraction.** `.content4` / `.content4b` (plus `.articletitle`,
 * `.contentpadding`) — #112 records the same template across all three walled
 * banners and the 48 non-walled siblings (#111), and `.content4` was **measured
 * binding** on the Arabic host at slice #9's Stage 1. The strip list mirrors both
 * sibling entries: `sitelevel_noindex` (share links + related cards) and
 * `.fccell` (the "FEATURE CLOSE" call-to-action table appended to every
 * article), which together removed ~275-360 chars of pure chrome per page on the
 * English host. Verify the selectors bind on the first French fetch.
 *
 * **Language: `["fr"]` — declared, not assumed.** All 87 mapped URLs sit under
 * one French banner, and #114 sampled `/a/102rien.html` as genuine French. The
 * stored per-document label still comes from content detection at ingest
 * (invariant 6), never from this field.
 *
 * ⚠️ **French is NOT a new language for this corpus** — unlike slice #9's
 * Arabic. 159 `fr` documents already exist (`thelife-fr` 156, `thelife` 2,
 * `cru` 1) and 10 French golden cases (`tlfr-*`) resolve to `fr` without an
 * explicit pin. So this source's documents are **eligible by construction** on
 * those existing cases: Stage-4 Part A re-review is real work here, and French
 * becomes a MULTI-source language for gating purposes.
 *
 * `requestDelayMs` is modest because Firecrawl fronts the requests: the
 * politeness that matters is Firecrawl's own egress, and each scrape already
 * takes seconds.
 */
import type { SourceEntry } from "./types.js";

export const everystudentFr: SourceEntry = {
  key: "everystudent-fr",
  name: "EveryStudent — French (questions2vie.com)",
  domain: "www.questions2vie.com",
  trust: "partner",
  ingestionMode: "html-scrape",
  languages: ["fr"],
  defaultTags: ["everystudent", "cru", "topic:seeker", "lang:fr"],
  defaultCategory: "article",
  rights:
    "© Questions2Vie.com (Cru) — partner ministry content; used for retrieval/attribution.",
  crawl: {
    baseUrl: "https://www.questions2vie.com",
    // ADR-0012: the wall is unpassable to plain HTTP, so EVERY request is billed.
    fetchStrategy: "firecrawl",
    seedPaths: [
      "/a/101existe.html",
      "/a/102rien.html",
      "/a/103quelquechose.html",
      "/a/104qui.html",
      "/a/107choisir.html",
      "/a/109Dieu.html",
      "/a/201foiaveugle.html",
      "/a/202citationsdeJesus.html",
      "/a/204qui2.html",
      "/a/205divin.html",
      "/a/215bible.html",
      "/a/260islam.html",
      "/a/270droitsdelafemme.html",
      "/a/301tranquillite.html",
      "/a/302changerdevie.html",
      "/a/305but.html",
      "/a/306lapriere.html",
      "/a/311remarquable.html",
      "/a/320rencontre.html",
      "/a/401connaitreDieu.html",
      "/a/501intimite.html",
      "/a/502mariage.html",
      "/a/507soif.html",
      "/a/509beaute.html",
      "/a/511toxique.html",
      "/a/512luttant.html",
      "/a/601epreuve.html",
      "/a/602pourquoi.html",
      "/a/608apres.html",
      "/a/611inevitable.html",
      "/a/630pourquoiaider.html",
      "/a/700_existe.html",
      "/a/700_religions.html",
      "/a/700horribles.html",
      "/a/708saintesprit.html",
      "/a/709trinite.html",
      "/a/723catholique.html",
      "/a/725paradis.html",
      "/a/726enfer.html",
      "/a/731miracle.html",
      "/a/MLK-et-le-racisme.html",
      "/a/aide-de-Dieu.html",
      "/a/arbitre.html",
      "/a/athee.html",
      "/a/bonDieu.html",
      "/a/collins.html",
      "/a/comment-connaitre-dieu-personnellement.html",
      "/a/commun.html",
      "/a/contradictions.html",
      "/a/coronavirus.html",
      "/a/cree.html",
      "/a/deconcertes.html",
      "/a/elephant.html",
      "/a/guide.html",
      "/a/homosexuel-lesbienne.html",
      "/a/implique.html",
      "/a/jesusqui.html",
      "/a/miracles-de-jesus.html",
      "/a/noel.html",
      "/a/offre.html",
      "/a/ouest.html",
      "/a/philosophie.html",
      "/a/pourquoi-jesus-est-il-mort.html",
      "/a/rationnelle.html",
      "/a/reel.html",
      "/a/trouverDieu.html",
      "/a/univers.html",
      "/aventure.html",
      "/jean.html",
      "/jeanFR.html",
    ],
    // No `sitemaps`: discovery was already paid for (#114). See the header.
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
      // Site-specific chrome, mirrored from both sibling entries (see header):
      "sitelevel_noindex", // share links + "Other articles you might like" cards
      ".relatedbottom", // related-article thumbnails
      ".fccell", // the "FEATURE CLOSE" call-to-action table appended to every article
      ".hr2",
      ".articledivider",
    ],
    // Firecrawl fronts every request; a scrape already takes seconds.
    requestDelayMs: 1000,
    maxPages: 120, // 70 seeds + headroom
    minContentLength: 250,
  },
};
