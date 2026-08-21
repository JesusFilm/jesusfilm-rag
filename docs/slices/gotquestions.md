# Slice: GotQuestions — English (gotquestions)

_Branch: `slice/gotquestions` · Started: 2026-08-21 · Status: in-progress_
<!-- Status: in-progress | blocked | done | deferred -->

## Goal (architecture altitude)

Get the English teaching corpus on `www.gotquestions.org` queryable end-to-end:
acquire → ingest → retrieve → spot-check. This slice deliberately proves the
large English estate on its own. Translations on the same domain remain part of
the same `gotquestions` source and will follow as a separately resumable,
batched campaign recorded in
[`gotquestions-multilingual.md`](./gotquestions-multilingual.md).

## Recon and scope (2026-08-20–21)

- **Domain:** one source, `www.gotquestions.org`; all language sections share it.
- **English inventory:** the live sitemap contains **10,853 URLs**, including
  10,841 flat `.html` pages, 204 `content_*.html` topic indexes, and 30
  `questions_*.html` indexes. The prior jfa registry estimate (~1,500) is stale.
- **Bot-wall probe:** a real article returned HTTP 200 through plain HTTP with
  article markup and no Cloudflare block-page signature. Strategy: normal HTTP,
  not Firecrawl.
- **Robots/sitemap:** `robots.txt` advertises `/sitemapindex.xml`; the English
  URL set is available at `/sitemap.xml`.
- **Article shape:** flat `/<slug>.html`; real sample
  `/Christian-Platonism.html` exposes Question and Answer regions inside the
  main content wrapper. Index, utility, audio/XML, and navigation pages must be
  excluded by tested policy rather than assumed from the flat URL shape.
- **Language plan:** this slice declares only `en`. Language is still detected
  per document from extracted content during ingest; URL paths and `<html lang>`
  are not labels. Null-language documents are expected, excluded from eval
  credits, and reported as evidence.
- **Budget gate:** no live discovery crawl until the tested policy produces an
  exact kept-URL count and the operator approves `maxPages`, crawl time, and
  embedding spend.

## Stages & sub-steps

`[x]` = done + verify-green + committed (sha). Resume at the first `[ ]`.

### 1. Acquire → raw_documents

- [x] 1a — Register the English `gotquestions` source with a tested discovery
      and extraction policy that admits real answer articles and rejects topic
      indexes, utility pages, feeds, and non-content pages.
      **Evidence:** plain-HTTP live sample extracted 4,169 chars from the measured
      `itemprop="articleBody"` container with the correct title and no surrounding
      related/navigation furniture; 5 focused policy/extraction tests and the
      810-test full gate pass. <!-- sha: checkpoint commit -->
- [x] 1b — Dry-discover the live English inventory through that policy; classify
      kept/dropped shapes, sample adversarial edges, and present exact crawl and
      embedding budgets for operator approval.
      **Evidence:** 10,858 live sitemap URLs → **10,565 kept / 293 dropped**.
      The 293 drops cover 205 `content*` indexes, 30 `questions_*` indexes,
      feeds/XML, top lists, and measured utility/application pages. A
      deterministic 20-page spread across the kept set returned 20/20 HTTP 200
      answer bodies (2,332–9,946 chars in the reported sample); adversarial
      utility pages lacked `articleBody` and were explicitly blocked because
      their chrome/form text can clear the length floor. Proposed safety cap:
      **11,000 pages**. At 1,500 ms politeness delay the fetch floor is **4.4
      hours** plus network time. Sampled bodies imply roughly 10–15M embedding
      input tokens including chunk overlap: about **$0.10–$0.21** at the current
      qwen3 embedding list/effective provider range. <!-- sha: checkpoint commit -->
- [x] 1c — Run the approved live crawl and verify `raw_documents` counts,
      uniqueness, status distribution, and clean Question/Answer article text.
      **Evidence:** the interrupted crawl resumed from 4,032 staged URLs and
      skipped them exactly, then staged 6,530 of the remaining 6,533 candidates;
      3 were honestly rejected as too thin. Final staging is **10,562 rows / 10,562
      distinct canonical URLs**, all pending, all HTTP 200, and all titled.
      Extracted answer bodies range 719–39,802 chars (average 3,871); targeted and
      random samples begin with the article's `Answer` content and exclude
      navigation/related-page furniture. <!-- sha: checkpoint commit -->
- [x] 1d — Close Acquire: record evidence, set English acquire green through the
      status tool, update source/status docs, and run the full verify gate.
      **Evidence:** English acquire is green in the asserted status tracker and
      the post-crawl full gate passes with 810 tests. <!-- sha: checkpoint commit -->

### 2. Ingest → corpus tables

- [x] 2a — Ingest all pending English raws and verify document/chunk/embedding
      parity, sane chunk distribution, and the recorded embedding model.
      **Evidence:** the corpus already held the completed drain when this session
      resumed: **10,562 documents / 29,634 chunks / 29,634 embeddings**, with
      zero `chunk_count` mismatches, 1–29 chunks per document (average 2.81),
      and one model, `qwen/qwen3-embedding-8b`. <!-- sha: checkpoint commit -->
- [x] 2b — Re-run ingest to prove idempotency; report detected-language and null
      counts plus the exact null-language paths as evidence.
      **Evidence:** a repeat `pnpm index --source gotquestions` drained **0**
      pending rows. Per-document detection recorded **9,796 `en` / 763 `null`
      / 3 false-positive outliers** (`fr`, `ber`, `de`); spot-reading confirms
      all three outliers are English articles, so this is isolated detector
      noise rather than systematically low confidence. The settled null policy
      applies: the 763 rows remain retrievable and dashboard-visible but are
      excluded from language-scoped eval credits. Exact inventory:
      [`gotquestions-null-language-paths.md`](../slice-evidence/gotquestions-null-language-paths.md).
      <!-- sha: checkpoint commit -->
- [x] 2c — Close Ingest with the full verify gate and English status update.
      **Evidence:** English ingest is green in the asserted status tracker; the
      architecture-level trackers carry the measured corpus and language
      evidence, and the closing full gate passes with 810 tests.
      <!-- sha: checkpoint commit -->

### 3. Retrieve → ranked results

- [ ] 3a — Run representative seeker, skeptic, believer, and newcomer queries;
      verify ranked, cited GotQuestions hits and cross-source health.
- [ ] 3b — Verify `language:en`, source scoping, deduplication, and cutoff
      behavior; re-check the living-eval displacement signal before diagnosing
      any metric movement.
- [ ] 3c — Close Retrieve with the full verify gate and English status update.

### 4. Spot-check and evaluate

- [ ] 4a — Invoke `$golden gotquestions` for corpus-grounded re-review and new
      persona-diverse English cases; stop at its operator write-approval gate.
- [ ] 4b — Apply only approved golden changes, verify every credited path
      resolves exactly once, and run the batch eval with the offline retry
      posture.
- [ ] 4c — Record representative results and negatives, run the full verify
      gate, mark English done, and hand off the normal non-walled production
      promotion path after merge.

## Decisions made (this slice)

- 2026-08-20 — Use source key `gotquestions` for the whole domain — one domain
  remains one source even when later language sections are added.
- 2026-08-21 — Prove the full English estate as a standalone slice — it is the
  largest section and establishes extraction/discovery before bulk translation
  work.
- 2026-08-21 — Handle remaining languages as one automated, resumable campaign
  with canary and count-based batches — not 215 slices or operator sessions.
- 2026-08-21 — Land campaign work as small merged checkpoint PRs — each PR
  updates the durable campaign file so the next session starts from `main`.

## Open question / blocker

- none

## Resume hint (for a cold start)

At: Stage 3 — “run representative retrieval queries.” Ingest is green at 10,562
documents / 29,634 chunks / 29,634 embeddings, with idempotency and language
evidence recorded. Next query across seeker, skeptic, believer, and newcomer
perspectives; verify ranked citations and cross-source health. Last verify:
green at Stage 2 close (810 tests). Branch: `slice/gotquestions`.
