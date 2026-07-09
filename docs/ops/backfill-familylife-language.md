# One-time backfill: FamilyLife `documents.language` (`en` → `es`)

The one-time, **label-only** correction of FamilyLife's mislabeled Spanish document
([ADR-0006](../decisions/0006-per-document-language-detection.md),
[#68](https://github.com/JesusFilm/jesusfilm-rag/issues/68) — Units F/G/H). Ingest stamps every
document with its source's *first declared* language (`normalize.ts` → `entry.languages[0]`), so
FamilyLife's lone Spanish page under `/us-latinos/` was written as `language = "en"` and is
therefore unreachable through the retrieval language filter.

> **This is a document, not a script — deliberately.** The runner below is reproduced as a fenced
> code block and is **never** committed to `scripts/`. A committed script invites accidental
> re-running; a document gives a permanent, auditable record of what was actually run, by whom,
> and what it changed. To run it, copy the block into an **uncommitted** throwaway file, run it,
> then delete it. It must never be wired into CI, `package.json`, or any task runner.

> **Do not run this from an agent unattended, and never against production without the human
> gate.** Prod (Unit H) is operator-run, following the escalation rule at the bottom.

## ⚠️ The one rule that must not be broken: the backfill never touches embeddings

`documents.language` is a plain column on `documents`. Vectors live in a **separate** table,
`chunk_embeddings`, reachable only indirectly (`chunk_embeddings.chunk_id → chunks.id`,
`chunks.document_id → documents.id`). Verified against the live schema: **zero triggers, zero
rewrite rules, and all four foreign keys are `ON UPDATE NO ACTION`** — and every FK references a
`uuid` primary key, never `language`. An `UPDATE documents SET language = …` therefore *cannot*
delete, re-create, or re-embed a single vector. **No re-chunk, no re-embed, no re-acquire.**

If the embeddings fingerprint in Block A moves, something is wrong — stop and roll back.

## ⚠️ The confidence score is not a confidence score (read before reusing this)

`detectLanguage()` returns `tinyld`'s `detectAll()[0].accuracy`. That number is a **normalized
share across surviving candidates, not a calibrated probability**. When exactly one candidate
survives, its `accuracy` is `1.0` *by construction, however wrong it is*.

This is not hypothetical. The local run found `/equip/your-child-and-the-autism-spectrum` — a
251-character English listing page — detected as:

```
detectAll(text) → [{ lang: "hi", accuracy: 1 }]        // Hindi. Confidence 1.000. English page.
```

while genuine English prose returns four candidates with the winner at `0.07`. **No confidence
threshold can catch this**, because the wrong answer scores the maximum. What actually protected
this backfill is the orthogonal **declared-set cross-check** (`detected ∈ source.languages`),
which discarded `hi`.

That protection is narrow: it only blocks misdetections landing *outside* the declared set. A
lone-candidate misfire that landed on `es` for a thin English page would have been written
silently, with "confidence 1.000". Two consequences:

1. **This runbook is scoped to `familylife` and must not be pointed at another source** without
   first re-reading this section and re-running the dry run.
2. **Unit B (the `normalize.ts` wire-up) must not gate on confidence alone.** A `confidence >=
   threshold → content wins` rule would stamp `hi` on an English autism article at ingest. It
   needs corroborating signal: a minimum content-length floor to suppress thin-document
   artifacts, a declared-set restriction, or a second detector that must agree.

## Exact scope + gate (do not paraphrase)

| Item | Value |
|---|---|
| Source | `familylife` only (`sources.key = 'familylife'`) |
| Declared language set | `{ en, es }` (`src/registry/familylife.ts` → `languages: ["en","es"]`) |
| Detection input | `cleanText(raw_documents.raw_content)` — the *same normalized text ingest feeds the detector*, not the raw snapshot, so a backfilled label equals what a future re-ingest would assign (ADR-0006) |
| Detector | `detectLanguage()` from `src/ingestion/detect-language.ts` (PR [#71](https://github.com/JesusFilm/jesusfilm-rag/pull/71), merged) — leading 2000 chars |
| Match key | `documents.(source_id, canonical_url)` ↔ `raw_documents.(source_key, canonical_url)` |
| Write gate | `confidence >= 0.75` **AND** `detected ∈ {en, es}` **AND** `language IS DISTINCT FROM detected` |
| Write | `UPDATE documents SET language` — nothing else, ever |
| Expected effect | exactly **1** row, `en → es`, `/us-latinos/acerca-de-nosotros/principios-fundamentales` |

## Preconditions

- PR [#71](https://github.com/JesusFilm/jesusfilm-rag/pull/71) (the detector, Unit A) merged to `main` — it is.
- You are on a checkout containing `src/ingestion/detect-language.ts` with `tinyld` installed.
- `.env` has `DATABASE_URL` pointing at the environment you intend to change. **Read it twice.**
- A snapshot of `documents` exists (Step 0). Local: cheap. Prod: mandatory.

## Procedure

### Step 0 — snapshot `documents`, so a bad UPDATE is a restore, not a rebuild

```bash
docker exec jesusfilm-rag-db pg_dump -U jesusfilm_rag -d jesusfilm_rag -t public.documents > documents-before.sql
```

### Block A — evidence. Run verbatim BEFORE and AFTER. Read-only; diff the two outputs.

```sql
-- A1. The headline invariant (issue #68 acceptance gate)
SELECT
  (SELECT count(*) FROM documents d JOIN sources s ON d.source_id=s.id
     WHERE s.key='familylife' AND d.language='es') AS es_docs,
  (SELECT count(*) FROM documents d JOIN sources s ON d.source_id=s.id
     WHERE s.key='familylife' AND d.language='en') AS en_docs,
  (SELECT count(*) FROM chunk_embeddings)          AS embeddings;

-- A2. Embeddings IDENTITY, global. count(*) alone cannot distinguish "untouched"
--     from "deleted and re-inserted at the same cardinality". The fingerprint can.
SELECT count(*)          AS embeddings_global,
       max(embedded_at)  AS max_embedded_at,
       md5(string_agg(chunk_id::text || '|' || embedding_model || '|' || embedded_at::text,
                      ',' ORDER BY chunk_id)) AS embeddings_fingerprint
FROM chunk_embeddings;

-- A3. Embeddings IDENTITY, scoped to familylife. A1.embeddings is GLOBAL and unfiltered —
--     on prod, an unrelated concurrent ingest moves it. A3 is the authoritative check.
SELECT count(*) AS fl_embeddings,
       md5(string_agg(ce.chunk_id::text || '|' || ce.embedding_model || '|' || ce.embedded_at::text,
                      ',' ORDER BY ce.chunk_id)) AS fl_fingerprint
FROM chunk_embeddings ce
JOIN chunks  c ON c.id = ce.chunk_id
JOIN sources s ON s.id = c.source_id
WHERE s.key = 'familylife';

-- A4. Global language histogram — drift guard: NOTHING outside familylife may move.
SELECT s.key AS source, coalesce(d.language,'(null)') AS language, count(*) AS docs
FROM documents d JOIN sources s ON d.source_id = s.id
GROUP BY 1,2 ORDER BY 1,2;

-- A5. The target row(s).
SELECT d.language, left(d.canonical_url, 78) AS canonical_url
FROM documents d JOIN sources s ON d.source_id = s.id
WHERE s.key='familylife' AND d.canonical_url LIKE '%/us-latinos/%'
ORDER BY d.canonical_url;
```

Local invocation:

```bash
docker exec -i jesusfilm-rag-db psql -U jesusfilm_rag -d jesusfilm_rag -f - < block-a-evidence.sql
```

### Block B (dry run) + Block C (apply) — the throwaway runner

Copy into an **uncommitted** file at the repo root, e.g. `tmp-backfill-familylife-language.ts`, and
add it to `.git/info/exclude` so it cannot be committed. Delete it when done.

Default is a **dry run**: it prints the delta report and writes nothing. `--apply` performs the
UPDATE inside a transaction that asserts the affected row count against the dry-run count and
rolls back on any disagreement. **Always run the dry run first and read every proposed row.**

```ts
/**
 * THROWAWAY — issue #68 Unit F/G backfill runner. NOT committed, NOT a script/.
 * Default = DRY RUN (no writes). Pass --apply to write inside a transaction.
 *
 *   pnpm exec tsx tmp-backfill-familylife-language.ts
 *   pnpm exec tsx tmp-backfill-familylife-language.ts --apply
 */
import "@/env.js";
import { detectLanguage } from "@/ingestion/detect-language.js";
import { getDb, closeDb } from "@/db/index.js";

const SOURCE_KEY = "familylife";
const DECLARED = new Set(["en", "es"]); // registry: familylife.languages
const MIN_CONFIDENCE = 0.75;

/** Verbatim copy of the private cleanText in src/ingestion/normalize.ts.
 *  The backfill MUST detect on the same normalized text ingest feeds the
 *  detector, or a backfilled label won't match a future re-ingest (ADR-0006). */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Row {
  id: string;
  canonical_url: string;
  current_language: string | null;
  raw_content: string;
}

const apply = process.argv.includes("--apply");
const { client } = getDb();

// Fan-out guard: raw_documents has no unique (source_key, canonical_url).
const [{ docs }] = await client`
  SELECT count(*)::int AS docs FROM documents d
  JOIN sources s ON s.id = d.source_id WHERE s.key = ${SOURCE_KEY}`;
const [{ dupes }] = await client`
  SELECT count(*)::int AS dupes FROM (
    SELECT canonical_url FROM raw_documents WHERE source_key = ${SOURCE_KEY}
    GROUP BY 1 HAVING count(*) > 1) t`;
if (dupes > 0) {
  console.error(`ABORT: ${dupes} duplicate canonical_url in raw_documents — join would fan out`);
  process.exit(1);
}

const rows = (await client`
  SELECT d.id, d.canonical_url, d.language AS current_language, r.raw_content
  FROM documents d
  JOIN sources s       ON s.id = d.source_id
  JOIN raw_documents r ON r.source_key = s.key AND r.canonical_url = d.canonical_url
  WHERE s.key = ${SOURCE_KEY}
  ORDER BY d.canonical_url`) as unknown as Row[];

console.log(`documents(${SOURCE_KEY}) = ${docs}   joined to raws = ${rows.length}`);
if (rows.length !== docs) console.error(`WARN: join did not cover all documents (${rows.length} != ${docs})`);

const changes: Array<{ id: string; url: string; from: string | null; to: string; conf: number }> = [];
const lowConf: Array<{ url: string; from: string | null; to: string; conf: number }> = [];
const offDeclared: Array<{ url: string; from: string | null; to: string; conf: number }> = [];
const dist = new Map<string, number>();
let confMin = 1;

for (const r of rows) {
  const content = cleanText(r.raw_content);
  const { language, confidence } = detectLanguage(content);
  dist.set(language || "(undetectable)", (dist.get(language || "(undetectable)") ?? 0) + 1);
  if (language === r.current_language) { confMin = Math.min(confMin, confidence); continue; }

  const row = { url: r.canonical_url, from: r.current_language, to: language, conf: confidence };
  if (!language || confidence < MIN_CONFIDENCE) { lowConf.push(row); continue; }
  if (!DECLARED.has(language)) { offDeclared.push(row); continue; }
  changes.push({ id: r.id, ...row });
}

console.log(`\n--- detected language distribution (all ${rows.length} docs) ---`);
for (const [lang, n] of [...dist].sort((a, b) => b[1] - a[1])) console.log(`  ${lang.padEnd(16)} ${n}`);
console.log(`  min confidence among AGREEING docs: ${confMin.toFixed(3)}`);

console.log(`\n--- PROPOSED CHANGES (conf >= ${MIN_CONFIDENCE}, detected in declared set) : ${changes.length} ---`);
for (const c of changes) console.log(`  ${c.from} -> ${c.to}  conf=${c.conf.toFixed(3)}  ${c.url}`);

console.log(`\n--- SKIPPED: low confidence / undetectable : ${lowConf.length} ---`);
for (const c of lowConf.slice(0, 25)) console.log(`  ${c.from} -> ${c.to || "(none)"}  conf=${c.conf.toFixed(3)}  ${c.url}`);
if (lowConf.length > 25) console.log(`  … and ${lowConf.length - 25} more`);

console.log(`\n--- SKIPPED: detected OUTSIDE declared set ${[...DECLARED]} : ${offDeclared.length} ---`);
for (const c of offDeclared.slice(0, 25)) console.log(`  ${c.from} -> ${c.to}  conf=${c.conf.toFixed(3)}  ${c.url}`);
if (offDeclared.length > 25) console.log(`  … and ${offDeclared.length - 25} more`);

if (!apply) {
  console.log(`\nDRY RUN — no writes. Would UPDATE ${changes.length} row(s).`);
  await closeDb();
  process.exit(0);
}

// --- APPLY: transaction, assert affected rowcount == dry-run count, else rollback.
const expected = changes.length;
console.log(`\nAPPLY — expecting exactly ${expected} row(s) to change.`);
await client.begin(async (tx) => {
  let affected = 0;
  for (const c of changes) {
    const res = await tx`UPDATE documents SET language = ${c.to}
                         WHERE id = ${c.id}::uuid AND language IS DISTINCT FROM ${c.to}`;
    affected += res.count;
  }
  if (affected !== expected) {
    throw new Error(`ROLLBACK: affected ${affected} != expected ${expected}`);
  }
  console.log(`  affected = ${affected} == expected ${expected} → COMMIT`);
});
console.log("COMMITTED.");
await closeDb();
```

## Acceptance — the backfill worked **iff** all of this holds

Comparing AFTER vs BEFORE:

| Metric | Rule | Why |
|---|---|---|
| `es_docs` | after > before (locally `0 → 1`) | the mislabeled Spanish doc got corrected |
| `en_docs` | after = before − (es_docs gain) | en drops by exactly the docs relabeled — no other labels moved |
| `embeddings` | after = before | no re-embed — the label-only guarantee |
| `embeddings_fingerprint` | **identical** | a matching count with a changed fingerprint = delete + re-insert |
| `max_embedded_at` | **identical** | nothing was re-embedded |
| A4 histogram | only `familylife` rows move | nothing outside the source drifted |

The crisp signal: **`es_docs` goes up, embeddings stays flat.** If embeddings changes at all, it
re-embedded → fail. If `en_docs` drops by more than `es_docs` rose, it relabeled something it
shouldn't have → fail.

Retrieval-side equivalent: the same Spanish query returns the doc under `--language es` and does
**not** return it under `--language en`.

```bash
pnpm query --source familylife --language es "¿Cuáles son nuestros principios fundamentales?"
pnpm query --source familylife --language en "¿Cuáles son nuestros principios fundamentales?"
```

Note `--language en` legitimately returns *English* hits above the score floor; the criterion is
that the Spanish document is **absent** from them, not that the result set is empty.

## Evidence — local run (Unit G), operator's Mac, 2026-07-09

Corpus: 2241 familylife documents, 24607 embeddings, all familylife docs labeled `en`.

**Dry run** — proposed exactly one change, and skipped one document as out-of-declared-set:

```
documents(familylife) = 2241   joined to raws = 2241
detected distribution: en 2239, hi 1, es 1
min confidence among AGREEING docs: 0.480

PROPOSED CHANGES (conf >= 0.75, detected in declared set) : 1
  en -> es  conf=1.000  https://www.familylife.com/us-latinos/acerca-de-nosotros/principios-fundamentales
SKIPPED: low confidence / undetectable : 0
SKIPPED: detected OUTSIDE declared set en,es : 1
  en -> hi  conf=1.000  https://www.familylife.com/equip/your-child-and-the-autism-spectrum
```

**Apply** — `affected = 1 == expected 1 → COMMIT`.

**Block A, before → after** (only the changed lines shown; everything else byte-identical):

```diff
  A1  es_docs | en_docs | embeddings
- A1        0 |    2241 |      24607
+ A1        1 |    2240 |      24607

  A2  embeddings_global 24607 | max_embedded_at 2026-07-02 07:52:36.397461+00
  A2  embeddings_fingerprint  63fe6af8705ed48174f818c6c5eba0ff     (unchanged)
  A3  fl_embeddings     9824 | fl_fingerprint 7246108738460afd3f48b475be8754f1  (unchanged)

  A4  familylife | en | 2241        →   familylife | en | 2240
+ A4                                    familylife | es |    1
  A4  (every other source byte-identical: jesusfilm-org 349, sightline-ministry 1390,
  A4   starting-with-god 40, thelife 4485, thelife-fr 156, thelife-zh 332)

- A5  en | .../us-latinos/acerca-de-nosotros/principios-fundamenta
+ A5  es | .../us-latinos/acerca-de-nosotros/principios-fundamenta
```

**Retrieval** — same Spanish question under both filters:

```
--source familylife --language es  → 1 hit  [0.527] .../us-latinos/.../principios-fundamentales  ✅ present
--source familylife --language en  → 5 hits, all English /articles/…                             ✅ target absent
--language es (no source filter)   → 1 hit  — the only es-labeled document in the entire corpus
```

**Independent verification.** Three verifiers ran blind on the artifacts, none of them the agent
that authored the UPDATE:

- *Invariant verifier* — PASS on all six rules above.
- *Retrieval verifier* — PASS; target returned under `es`, absent under `en`.
- *Adversarial verifier* — instructed to **refute** "only the intended rows were touched", and
  could not. It independently re-detected all 2241 documents at **full body length** (not just the
  2000-char head) and found exactly one Spanish document; confirmed a 1:1:1 `documents` ↔
  `raw_documents` correspondence with zero duplicate, orphan, or NULL-language rows; and confirmed
  the relabeled doc's 3 chunks and 3 embeddings still carry `embedded_at = 2026-07-02`, a week
  before the run. It also independently derived the `tinyld` confidence flaw documented above.

## Prod run (Unit H) — expectations and the escalation rule

Prod's FamilyLife corpus matches local: **2241 documents, 100% labeled `en`, exactly one
`/us-latinos/` page.** So the prod dry run must propose **exactly 1 change**, and will very likely
skip the same `hi` autism doc — that skip is expected and correct, not a defect.

**Before running Block C on prod:**

- Run Block B (dry run) and read the proposed-changes list in full.
- **If the dry-run count is anything other than 1 — STOP and escalate.** Do not commit. A larger
  count means either the corpus diverged from this document, or the detector is misfiring on a
  shape of content it did not see locally.
- Note that `A1.embeddings` is a **global, unfiltered** count. If any unrelated ingest is running
  against prod, it will move and that is not a failure — judge by `A3.fl_fingerprint`, which is
  scoped to familylife.
- The PR closes on **prod evidence** — the same Block A before/after and dry-run output, pasted
  into this section — not on trust in the local run.

## Aftermath — this is a treadmill until Unit B lands

**The ingest-time root cause is not fixed.** `src/ingestion/normalize.ts` still reads
`const language = entry.languages[0] ?? "en"` on `main`. This backfill corrects the stored label;
it does **not** stop the label from being re-broken. **Any re-ingest or re-acquire of `familylife`
will silently re-stamp that Spanish document as `en` and undo this work.**

Until PR-B (the `normalize.ts` wire-up) is merged:

- Do not re-ingest `familylife`.
- If you must, re-run this backfill immediately afterward and re-verify with Block A.

And when Unit B is written, it must not gate on `confidence` alone — see the second ⚠️ box.
