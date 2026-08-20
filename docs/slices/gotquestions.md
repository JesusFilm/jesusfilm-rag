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

- [ ] 1a — Register the English `gotquestions` source with a tested discovery
      and extraction policy that admits real answer articles and rejects topic
      indexes, utility pages, feeds, and non-content pages.
- [ ] 1b — Dry-discover the live English inventory through that policy; classify
      kept/dropped shapes, sample adversarial edges, and present exact crawl and
      embedding budgets for operator approval.
- [ ] 1c — Run the approved live crawl and verify `raw_documents` counts,
      uniqueness, status distribution, and clean Question/Answer article text.
- [ ] 1d — Close Acquire: record evidence, set English acquire green through the
      status tool, update source/status docs, and run the full verify gate.

### 2. Ingest → corpus tables

- [ ] 2a — Ingest all pending English raws and verify document/chunk/embedding
      parity, sane chunk distribution, and the recorded embedding model.
- [ ] 2b — Re-run ingest to prove idempotency; report detected-language and null
      counts plus the exact null-language paths as evidence.
- [ ] 2c — Close Ingest with the full verify gate and English status update.

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

At: Stage 1 — “register and test the English source policy.” Next concrete
action: inspect current registry conventions and implement a policy for the flat
English article/index shapes. Last verify: green on 2026-08-20 (depcruise, lint
with three pre-existing warnings, typecheck, db:check, 796 tests). Last commit:
none. Branch: `slice/gotquestions`.

