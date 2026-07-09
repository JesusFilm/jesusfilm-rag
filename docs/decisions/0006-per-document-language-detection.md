# ADR-0006 — Per-document, content-based language detection (`tinyld`)

- Status: Accepted
- Date: 2026-07-09
- Issue/PR: [#68](https://github.com/JesusFilm/jesusfilm-rag/issues/68)
- Related: [ADR-0005](./0005-embedding-model-qwen3-8b-multilingual.md) (qwen is multilingual — no model change here)

## Context

`documents.language` was a **source-level guess**: at ingest every document was stamped
with `entry.languages[0] ?? "en"` (`src/ingestion/normalize.ts`). Any source hosting more
than one language on a single domain therefore mislabels every non-first-language document
— **FamilyLife**'s Spanish pages (`/us-latinos/`) are all stored as `language = "en"`.
Retrieval's language filter reads exactly that column
(`src/adapters/postgres/corpus-search-store.ts`), so that Spanish content is **unfilterable
and effectively invisible** as Spanish (`language: "es"` returns nothing; `language: "en"`
silently returns mixed en+es). The forcing question: where does a document's language come
from — the source, or the content? The prose can't lie; the source, URL, and `<html lang>`
all can.

A second, related gap: sources were modeled inconsistently — `thelife` was split into three
source keys because its languages live on *different domains*, while FamilyLife stayed one
source because its languages *share* a domain. The deciding factor was domain, not language,
but there was no written rule, so `/slice` improvised per source.

## Decision

Adopt **"sources by domain, language per document."**

1. **Sources split by domain, full stop.** One domain = one source = one crawl job. A
   shared banner across domains → separate source keys (the `thelife` pattern). Acquisition
   stays language-blind.
2. **Language is detected per document at ingest** from the cleaned content by an
   **in-process, content-based detector** — never from `source.languages`, the URL path, or
   `<html lang>`. The detector is a **pure function** in the `ingestion` context
   (`src/ingestion/detect-language.ts`), zero-I/O, free (no per-document cloud/LLM cost).
3. **`source.languages` becomes the declared/expected set** — a cross-check ("did we detect
   a language we didn't declare?") and documentation of what a source contains, filled in
   during scraping-policy investigation by inspecting the site (e.g. spotting a
   `/us-latinos/` Spanish sitemap). It is no longer the label source.

**Library: `tinyld`, chosen by experiment** (issue #68 benchmark; the experiment was a
required task, not an up-front guess). `tinyld` and `franc` both scored **22/22** on the
sample — core en/es/fr/zh docs, the real FamilyLife `es` page, short/noisy/mixed docs, and
near-language pairs (es↔pt, Simplified↔Traditional Chinese). `tinyld` was chosen because:
- **Native ISO 639-1 output** (`en`,`es`,`fr`,`zh`) matches `documents.language` directly —
  **no 639-3→639-1 mapping layer** to write, test, and keep correct (franc emits `eng`/`cmn`/…).
- **A usable, graded confidence.** `tinyld`'s top-candidate confidence drops on genuinely
  ambiguous input (clean ~1.00, real-but-harder `es` ~0.77–0.91, clearly-noisy ~0.30) —
  exactly the signal the confidence gate needs. `franc`'s top score is ~1.000 almost
  everywhere, a poor gate signal.
- **Speed** — ~2.4× faster on article-length text (both are trivially cheap).

**Detection contract (library-agnostic):**
- Input: cleaned document text (leading ~2k-char window is sufficient). Output:
  `{ language: string /*639-1*/, confidence: number }`. Empty/undetectable →
  `{ language: "", confidence: 0 }`.
- **Confidence gate + declared-set cross-check** (owned by `normalize.ts`, not the detector):
  - **High confidence** → use the detected language. If it falls **outside** the source's
    declared `languages`, still store it (content wins) **and log a warning** — an actionable
    signal the registry declaration is incomplete.
  - **Low confidence, single-language source** → fall back to that declared language.
  - **Low confidence, multi-language source** → do not auto-guess; surface the top
    candidates + confidence + the document to the operator as data.
- **Boundary (architecture §5):** the in-process detector is pure. If an **LLM escalation**
  is ever added for genuinely ambiguous docs, that is I/O and MUST enter behind a
  `LanguageDetector` **port** wired in `main.ts` — never imported into `ingestion`. LLM
  escalation is explicitly deferred (becomes ~free once a local GPU server exists).

## Alternatives rejected

- **URL/path-based labeling** (e.g. `/us-latinos/` → `es`) — the path can lie and isn't
  present on every multilingual source; encodes a per-source special case instead of a rule.
- **`<html lang>` / hreflang** — frequently wrong or absent (FamilyLife has no hreflang);
  it's a publisher's claim, not the content.
- **One source per language even on a shared domain** — re-keying existing docs would change
  `(source_id, canonical_url)` identity → effectively a re-embed; and source-key sprawl
  fragments eval/status/ops. Rejected in favor of language-as-a-document-property.
- **LLM-per-document detection** — cost + latency for no accuracy gain: trigram detectors are
  highly accurate on article-length prose, which is our regime. Deferred behind a port for
  the rare genuinely-ambiguous case only.
- **`franc`** — battle-tested and broader (187 vs ~60 languages), but that breadth isn't
  exercised by the corpus's languages, and it costs a 639-3→639-1 mapping layer plus a
  weaker (near-constant) confidence signal. Trade accepted: `tinyld`.

## Consequences

- (+) `documents.language` reflects the actual content language; FamilyLife `es` becomes
  filterable. Retrieval needs **no change** — the filter starts working the moment labels
  are correct.
- (+) The existing corpus is corrected by a **label-only backfill** (`UPDATE documents SET
  language`), matched from `raw_documents.raw_content` by `(source_id, canonical_url)`. Because
  vectors live in a separate table (`chunk_embeddings`), **no re-chunk, no re-embed** — the
  constraint is time, not cost.
- (+) `/slice` gets a deterministic language rule (domains-by-source + declared set +
  per-doc detection) — no ad-hoc "how do we handle languages?" operator question.
- (−) A new runtime dependency (`tinyld`) in the ingest path, and a confidence-gate threshold
  to pin (the observed ~0.30 noisy / ~0.77+ real band gives the range).
- (−) Detection resolves the **dominant** language of a document; mixed-language *within one
  block of text* is out of scope (unanticipated for our sources).
