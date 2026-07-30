# Campaign: EveryStudent non-walled sibling domains (48 sources) — [#111](https://github.com/JesusFilm/jesusfilm-rag/issues/111)

_Branch: `feat/everystudent-siblings` · Started: 2026-07-28 · Status: in-progress_
<!-- Status: in-progress | blocked | done | deferred -->

> **If you are a fresh agent: read this whole file, then go to "You are here".**
> It is the complete resume contract for this campaign. You need no chat history.
> This is a **campaign file**, not a `/slice` file — do **not** run `/slice` for these
> sources. See "Why not /slice" below; running it 48 times is the exact thing this
> campaign exists to avoid.

---

## 0. Board — OPEN EVERY SESSION WITH THIS

🔴 **Mandatory, both directions.** **Start** every session by rendering §0 back
to the operator as the tables below — that is how Jaco wants the state
delivered, not as prose. **End** every session by regenerating it (§0.1) so the
next one starts from truth. A stale board is worse than none: it is the exact
failure `docs/STATUS.md` hit on 2026-07-17, when a narrative doc reported a
finished cutover as pending.

**Last regenerated: 2026-07-31 (after the language sweep)** · **47 of 48
registered · 45 acquired · 2 deferred · 1 open · 2,281 documents · 0
duplicate-content groups · 0 doctype leaks · 0 null-language**

**Phases 1–2 are CLOSED. PHASE 3 IS COMPLETE.** The bulk `pnpm index` ran to
completion on 2026-07-30 (operator-approved) through the ADR-0015 gateway.

**Measured state, 2026-07-30 (queries in §0.1):**

| Metric | Value |
|---|---|
| Ingested | **2,281 / 2,281** · **0 pending** |
| Bulk run itself | 2,219 inserted · 0 updated · 0 unchanged · **0 skipped** · 0 unknown-source · **12,974 chunks** |
| Wall clock | **~95 min** at 23.5 docs/min (2.55 s/doc) |
| Corpus totals | declared **47,618** = actual chunks **47,618** = embeddings **47,618** |
| `embedding_model` | **one** distinct value, `qwen/qwen3-embedding-8b` — the wire alias never leaked |
| Retries / fallbacks | **0 / 0** across the entire run |
| Idempotency | re-run drained **0 rows** |
| Gate | **761 tests green** |
| Language | ✅ **FIXED 2026-07-31** — 225 `null` → **0**; 182 mislabelled → **0**. See §0.4 |

Per-stage state: **45 sources at `acquire: green` + `ingest: green`**;
`retrieve`/`evaluate` still `pending` (Phases 4–5). `sr` and `he` remain
`deferred` with every stage pending — they were correctly NOT flipped.

The 8 `everystudent-zh-cn` documents left by the earlier stopped run were
**kept**, not rolled back; the bulk run drained the remaining 120 and skipped
them. That closes the open keep-or-rollback decision.

⚠️ **Counts here are measured, not assumed.** Regenerate from the database
(§0.1) rather than trusting this prose after any further ingest.

Everything acquirable has been acquired.
- `sr` and `he` are deferred by decision → [#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129), [#132](https://github.com/JesusFilm/jesusfilm-rag/issues/132)
- `lv` is the single open item, and it is a **rights** question → [#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133)
- `ru-ca` is **RESOLVED** — registered with 5 seeds, not 87, because it is a
  mirror of `ru` (§16)

### ✅ Acquired (45)

`†` = ships the rule-1e `"html"` fallback + `head` strip.

| Lang | Domain | Docs | Container | | Lang | Domain | Docs | Container |
|---|---|---:|---|---|---|---|---:|---|
| `zh-cn` | xinshengming.com | 128 | `.cb-entry-content` | | `ms` | persoalanhidup.com | 52 | `.contentpadding` |
| `ru` | mirstudentov.com | 95 | `.contentpadding` | | `mk` | studentskiodgovori.com | 49 | `.contentpadding` † |
| `bg` | everystudent.bg | 84 | `.article-content` ⚠️ staging | | `lt` | kiekvienamstudentui.lt | 49 | `html` |
| `sk` | everystudent.sk | 83 | `.entry-content` (Elementor) | | `bn` | everybengalistudent.com | 48 | `.contentpadding` † |
| `hu` | everystudent.hu | 83 | `.contentpadding` | | `zh-tw` | everystudent.com.tw | 46 | `.entry-content` |
| `mn` | tailal.mn | 82 | `html` | | `et` | tudengielu.net | 46 | `.contentleftpadding` |
| `ja` | studentinjapan.com | 79 | `.content4` | | `de` | duentscheidest.com | 45 | `.contentpadding` |
| `pl` | kazdystudent.pl | 77 | `.contentpadding` | | `th` | everythaistudent.com | 44 | `.contentpadding` † |
| `sq` | pyetjetejetes.com | 77 | `html` | | `hr` | vrlovazno.com | 41 | `.contentpadding` † |
| `es` | cadaestudiante.com | 76 | `.contentpadding` | | `am` | habeshastudent.com | 41 | `.contentpadding` † |
| `fa` | everypersianstudent.com | 75 | `.contentpadding` | | `it` | ognistudente.com | 38 | `.post-content` (WP) |
| `pt` | suaescolha.com | 75 | `.contentpadding` | | `ko` | everykoreanstudent.com | 37 | `html` |
| `cs` | everystudent.cz | 74 | `.content` ⚠️ IPv6 flag | | `ur` | zindagikaysawalat.com | 33 | `.contentpadding` † |
| `tr` | tanriyitanimak.com | 71 | `.contentpadding` | | `el` | everystudent.gr | 32 | `#content4` † ⚠️ `http://` |
| `vi` | everyvietstudent.com | 67 | `.contentpadding` | | `hi` | everystudent.in | 34 | `.contentpadding` † |
| `ro` | everystudent.ro | 64 | `.contentpadding` | | `ta` | ungalthervuenna.com | 31 | `html` |
| `id` | mahasiswakeren.com | 57 | `.contentpadding` † | | `my` | everymyanmarstudent.com | 31 | `.contentpadding` † |
| | | | | | `te` | everytelugustudent.com | 30 | `html` |
| | | | | | `sl` | vsakstudent.com | 23 | **`#contentpadding`** † ⚠️ ID |
| | | | | | `ne` | nepalistudent.net | 20 | `.contentpadding` † |
| | | | | | `om` | everybarataa.com | 18 | `.contentpadding` † ⚠️ no detect |
| | | | | | `kk` | shakirtter.com | 17 | `html` |
| | | | | | `ka` | kovelistudenti.com | 16 | `.contentpadding` † |
| | | | | | `sw` | lipotumaini.com | 13 | `.contentpadding` † |
| | | | | | `uk` | svitstudentiv.com | 47 | `html` · **seed** |
| | | | | | `hy` | 1patasxan.com | 34 | `html` · **seed** |
| | | | | | `ti` | everytemhari.com | 14 | `.contentpadding` † · **seed** ⚠️ no detect |
| | | | | | `ru-ca` | studentstan.com | 5 | `.post-content` † · **seed** ⚠️ mirror |

### 🅿️ Deferred (2)

| Lang | Domain | Expected | Why |
|---|---|---:|---|
| `sr` | studentskikutak.com | 76 | Written, wired, gate-passed. Network blackhole → **[#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129)**. Do NOT add `/etc/hosts`. |
| `he` | igod.co.il | **1,020** | Written, wired, gate-passed. **Not a Cru property**; sitemap uses CDATA that `discover.ts` cannot parse; 200× the recon count. Three operator calls — see §4 and §16. |

### ⚠️ Open — one item, and it is a rights question (1)

| Lang | Domain | Articles | What blocks it |
|---|---|---:|---|
| `lv` | katramstudentam.lv | 49 | **RIGHTS, not crawlability** → **[#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133)**. `robots.txt` disallows `ClaudeBot` by name. Ask Agape Students Latvia; do not out-engineer it. See §15. |

### 0.2 ✅ RESOLVED — nine campaign languages were INVISIBLE to the ingest-time detector

> ✅ **Fixed 2026-07-31 by the language sweep — see §0.4 for the run record.**
> The diagnosis below is kept because it explains *why* the corpus was wrong and
> it is the reason `--mode full`, not `--mode blanks`, was the right tool. The
> per-language counts in the table are the **pre-sweep** state; every one of them
> now reads 100% correct. Do not re-run anything on the strength of this section.

Measured 2026-07-30 from the `everystudent-sw` gateway canary, then generalised
by reading `tinyld`'s own exported list. **This was the single biggest surprise of
Phase 3 and it affected 274 documents (12% of the campaign).**

`tinyld` — the detector `decideLanguage` uses at ingest — models **62**
languages. Nine of this campaign's declared languages are **not among them**, so
tinyld cannot ever return the right answer for those sources. Check it yourself:

```bash
node -e "const {supportedLanguages}=require('tinyld'); console.log(supportedLanguages.length)"
```

What happens splits into two very different outcomes, and the bad one is not the
one you would guess. **A null is honest; a confident wrong answer is not.**

**MEASURED after the full bulk run** (predictions were from the 4 longest docs
per source, which overestimated mislabels exactly as flagged — 156 actual vs
227 predicted; the balance landed as honest nulls instead):

| Lang | Docs | tinyld guesses | 🔴 mislabelled | ⚪ null | Collides with a real corpus language? |
|---|---:|---|---:|---:|---|
| `sq` Albanian | 77 | `nl` | **38** `nl` | 39 | no Dutch source exists → the whole `nl` bucket is wrong |
| `ms` Malay | 52 | `id` | **47** `id` | 5 | **YES** — `id` bucket is 54 real + 47 Malay = 101 |
| `hr` Croatian | 41 | `sr` | **30** `sr` | 11 | **YES** — see `sr` below |
| `sl` Slovenian | 23 | `sr` | **6** `sr` | 17 | **YES** — see `sr` below |
| `ne` Nepali | 20 | `hi` | **20** `hi` (all) | 0 | **YES** — `hi` bucket is 34 real + 20 Nepali = 54 |
| `ti` Tigrinya | 14 | `am` | **14** `am` (all) | 0 | **YES** — `am` bucket is 41 real + 14 Tigrinya = 55 |
| `om` Oromo | 18 | `fi`/`ber` | 1 `ber` | 17 | — |
| `ka` Georgian | 16 | *nothing* @ 0.000 | 0 | 16 | — no Georgian script model at all |
| `sw` Swahili | 13 | `rn` (Kirundi) | 0 | 13 | — |
| **total** | **274** | | **156** | **118** | |

🔴 **The `sr` bucket was 100% wrong.** `everystudent-sr` is deferred and never
acquired (#129), so all **36** documents labelled `sr` were mislabelled Croatian
(30) or Slovenian (6). Same for `nl`: 38 Albanian documents and no Dutch source.
✅ Both buckets are now **empty** — the sweep moved every row to `hr`/`sl`/`sq`.

⚠️ **This table UNDERCOUNTED the damage by 26 documents.** It omits
`everystudent-fa`, which §0.3 filed as a nulls-only problem. The database showed
**26 Persian documents labelled `ar`**, colliding with the 65 genuinely-Arabic
documents in `everystudent-ar` — a source already evaluated and live in prod.
**The real mislabel total was 182, not 156.** Lesson: derive the fix list from a
query against the registry's declared `languages`, never from a hand-maintained
table. The query is in §0.4.

### 0.3 ✅ RESOLVED — a THIRD failure mode: modelled languages that still miss the gate

> ✅ **Fixed 2026-07-31 by the same sweep — see §0.4.** Counts below are pre-sweep.

Not every null comes from §0.2. **107 of the 225 corpus nulls are on languages
tinyld *does* model**, where two same-script neighbours split the confidence
below 0.75:

| Source | Nulls | Of total | tinyld's read |
|---|---:|---:|---|
| `everystudent-fa` Persian | **47** | 75 | oscillates `fa`/`ar` at **0.503–0.746** — Persian and Arabic share a script |
| `everystudent-sk` Slovak | **17** | 83 | correct `sk`, but **0.620–0.815** — Czech/Slovak/Polish split it |
| `es` `et` `zh-cn` `id` `pt` `it` `mn` `cs` `el` `ru` | 1–7 each | | scattered near-gate cases |
| pre-existing (`everystudent` 9, `ar` 2, `fr` 1) | 12 | | untouched by this campaign |

`fa` is the headline: **63% of Persian documents are unlabelled**, and it was
never on any watch list because `fa` *is* in tinyld's 62. The lesson is that
"modelled" does not mean "detected" — a language with a same-script sibling can
sit under the gate indefinitely. **The `lang:sweep` LLM pass fixes these too.**

The 0.75 confidence gate (`CONFIDENCE_GATE`) is what separates the two columns,
and it is doing its job well: `sw`'s highest-scoring document reached **0.744**,
missing the gate by 0.006. The ADR-0007 500-char floor is **not** involved —
every document sampled ran 3,330–33,649 chars.

⚠️ **The five "YES" rows are the real damage.** A `language:hi` filtered query
would return Nepali documents; `language:am` would return Tigrinya. That breaks
the Phase-4 per-language smoke and any language-filtered eval — silently, because
nothing errors.

#### ✅ The fix is cheap, and it is NOT a re-embed

`pnpm lang:sweep` wires a **completely different, far more capable detector** —
an LLM (`google/gemini-2.5-flash-lite`) via the `LanguageDetector` port, not
tinyld. Proven on the `sw` canary (dry-run, 2026-07-30):

```
sweeping everystudent-sw … 13 scanned, 13 change(s)
13 filled (∅ → sw), every one detected sw@1.00, 0 left null
```

And `decideSweep` (`src/ingestion/resolve-language.ts:218`) explicitly allows a
confident detection to **override an existing label** — `reason: "relabel"` —
so the six mislabelled sources are fixable by the same pass, not just the three
nulls. `language` is a plain column on `documents`; correcting it touches **no
chunks and no embeddings**, so this costs an LLM pass over 274 documents and
nothing else.

✅ **Done 2026-07-31 — see §0.4 for what was actually run and what it found.**
`--mode full` re-scans every row, which is what let it fix a non-null mislabel;
`--mode blanks` would only have touched the nulls and left all 182 mislabelled
documents wrong. Every run wrote a `changelog-*.jsonl` that `--revert` consumes,
so the pass stays reversible.

⚠️ **`everystudent-am` was already indexed and labelled `am`.** Until the sweep
ran, `language:am` covered Tigrinya too. ✅ Now clean: `am` = 41 docs from
`everystudent-am` only. **Any `am` retrieval number measured before 2026-07-31
is invalid — re-measure.**

ⓘ **Correction to this file's earlier prediction (§13 #11/#16):** it named only
`om` and `ti`. The real list is nine, and `ti`'s "may be mislabelled `am`" was
**measured at confidence 1.000 on 4 of 4** — not a maybe. `ka` was also recorded
as detectable; tinyld returns nothing at all for Georgian.

### 0.4 ✅ The language sweep — run record (2026-07-31)

**Outcome in one line: the corpus went from 225 null + 182 mislabelled to
`0 null` across all 13,969 documents, and every everystudent source now matches
its registry-declared language.**

Detector: `google/gemini-2.5-flash-lite` over OpenRouter (ADR-0009), **not**
`tinyld`. Label-only — no chunks and no embeddings were touched. Local DB only.

**How the fix list was derived** (do this, not a hand-kept table — that is what
missed `fa`):

```sql
with per as (
  select s.key, coalesce(d.language,'(NULL)') label, count(*) docs
  from documents d join sources s on s.id=d.source_id
  where s.key like 'everystudent%' group by 1,2),
expect as (select key,
  case when key='everystudent' then 'en' when key like '%zh-%' then 'zh'
       when key='everystudent-ru-ca' then 'ru'
       else replace(key,'everystudent-','') end exp
  from (select distinct key from per) t)
select p.key, e.exp should_be, p.label actual, p.docs
from per p join expect e on e.key=p.key where p.label <> e.exp order by p.docs desc;
```

⚠️ **Two rows in that query are FALSE ALARMS — do not sweep them.**
`everystudent-zh-tw` (46 docs labelled `zh`) and `everystudent-ru-ca` (5 labelled
`ru`) are correct: both declare the base ISO 639-1 code in the registry
(`languages: ["zh"]` / `["ru"]`). Regional variants are *supposed* to collapse.

#### What ran

**Step 1 — dry-run, 8 mislabelled sources, `--mode full`.** All eight came back
100% resolved to the declared language, `0` left null, `0` rows in the report's
"Eyeball these" list. That is what justified applying without a per-source pause.

**Step 2 — apply, same 8 sources, `--mode full` — 317 rows written, 0 skipped by
the optimistic guard:**

| Source | Scanned | Relabelled | Filled from null | Confidence |
|---|---:|---|---:|---|
| `everystudent-fa` | 75 | 26 `ar`→`fa` | 47 | 1.00 |
| `everystudent-sq` | 77 | 38 `nl`→`sq` | 38 | 1.00 |
| `everystudent-ms` | 52 | 47 `id`→`ms` | 5 | 0.99–1.00 |
| `everystudent-hr` | 41 | 30 `sr`→`hr` | 11 | 1.00 |
| `everystudent-sl` | 23 | 6 `sr`→`sl` | 17 | 1.00 |
| `everystudent-ne` | 20 | 20 `hi`→`ne` | 0 | 1.00 |
| `everystudent-om` | 18 | 1 `ber`→`om` | 17 | 1.00 |
| `everystudent-ti` | 14 | 14 `am`→`ti` | 0 | 0.99–1.00 |
| **total** | **320** | **182** | **135** | |

**Step 3 — apply, 16 null-only sources, `--mode blanks` — 89 rows, 0 skipped:**
`sk` 17 · `ka` 16 · `sw` 13 · `everystudent` 9 · `et` 7 · `es` 7 · `zh-cn` 6 ·
`id` 3 · `ar` 2 · `it` 2 · `pt` 2 · `fr` 1 · `el` 1 · `cs` 1 · `ru` 1 · `mn` 1.

**Total: 406 documents relabelled or filled. Cost ≈ 15 cents** (~730 detector
calls including the dry-run pass, at Flash-Lite rates — an estimate from
published pricing, not a metered figure).

#### Collision buckets — before and after

| Bucket | Before | After |
|---|---|---|
| `ar` | 65 Arabic **+ 26 Persian** | 67, `everystudent-ar` only |
| `hi` | 34 Hindi **+ 20 Nepali** | 34, `everystudent-hi` only |
| `am` | 41 Amharic **+ 14 Tigrinya** | 41, `everystudent-am` only |
| `id` | 54 Indonesian **+ 47 Malay** | 57, `everystudent-id` only |
| `sr` | 36 docs, **100% fake** | **0** — bucket gone |
| `nl` | 38 docs, **100% fake** | **0** — bucket gone |

Every one of the 14 affected language buckets is now exactly one source.

#### Three findings worth carrying forward

1. 🟢 **Gemini Flash Lite detects every language `tinyld` cannot — including the
   ones this file predicted were undetectable.** `om` (Oromo) resolved **18/18 at
   confidence 1.00**; `ka` (Georgian) **16/16 at 1.00**, where `tinyld` returns
   *nothing at all*. **This retires the §13 #11 concern.** The registry's
   `languages: ["om"]` declaration was right and is now backed by real labels.
2. 🟡 **`fa` was mis-triaged as a nulls-only problem and was actually the worst
   collision.** 26 Persian pages sat in the `ar` bucket that `everystudent-ar` —
   already evaluated, already in prod — draws from. Any `language:ar` eval number
   taken before 2026-07-31 measured a polluted corpus.
3. 🔴 **One transient detector failure in 409 documents, and it is a real defect
   — NOT YET FILED, needs an issue (see §11).**
   `pyetjetejetes.com/a/rastesisht.html` failed with `response was not JSON` —
   but the logged fragment shows the model answered **correctly** and the JSON was
   truncated mid-`evidence` string: `{"language": "sq", "confidence": 1,
   "evidence": "A gjendemi këtu`. Cause is `DEFAULT_MAX_OUTPUT_TOKENS = 200`
   (`openrouter-language-detector.ts:34`) being consumed by a long evidence quote
   in a diacritic-heavy language that tokenises poorly. The sweep behaved
   correctly — logged it as an anomaly, left the row untouched, never crashed —
   and a plain re-run fixed it. **But it fails SILENTLY into a null**, so on a
   larger run it would look like an honest abstain rather than a bug.

#### Reverting

Each source has its own changelog under `reports/` (git-ignored), so a bad
relabel reverts per-source without touching the others:

```bash
pnpm lang:sweep --revert reports/changelog-everystudent-<key>-<ts>.jsonl --apply
```

#### ⚠️ This does NOT carry to production

**These labels live in the LOCAL database only.** Phase 7 runs
`acquire:production` (§6) — prod re-fetches and re-ingests, and ingest detects
with **`tinyld`**, not the LLM. So **prod will reproduce all 225 nulls and all
182 mislabels from scratch.** ADR-0008's `coalesce(new, existing)` protects an
established label *within* one database; it cannot carry one across two.

The same is true of the `copy-raws.sh` path (not used here) — it copies
`raw_documents` only, and `index:production` re-detects just the same.

**Phase 7 must re-run both passes against prod, after `index:production`:**

```bash
for k in fa ms sq hr ne ti sl om; do
  pnpm lang:sweep:production --source everystudent-$k --mode full --apply
done
for k in sk ka sw et es zh-cn id ar it pt fr el cs ru mn; do
  pnpm lang:sweep:production --source everystudent-$k --mode blanks --apply
done
pnpm lang:sweep:production --source everystudent --mode blanks --apply
```

Prod runs need `JFRAG_ALLOW_PROD_WRITE=1` and Doppler credentials — see
`docs/ops/language-sweep.md` → "Running against production".

### 0.1 How to regenerate this board

Counts come from the **database**, never from memory or from this file's prose.

```bash
docker exec jesusfilm-rag-db psql -U jesusfilm_rag -d jesusfilm_rag -c "
  select source_key, count(*) docs
  from raw_documents
  where source_key like 'everystudent-%'
    and source_key not in ('everystudent-ar','everystudent-fr')
  group by 1 order by 2 desc;"
```

`everystudent`, `-ar` and `-fr` are the three WALLED banners and are **not** part
of this campaign — exclude them or the totals will not match.

**Phase 3 onward, also check ingest progress** — `raw_documents.ingested_at` is
the truth, not the console log of a run that may still be going:

```bash
docker exec jesusfilm-rag-db psql -U jesusfilm_rag -d jesusfilm_rag -c "
  select count(*) filter (where ingested_at is null)     still_pending,
         count(*) filter (where ingested_at is not null) ingested
  from raw_documents
  where source_key like 'everystudent-%'
    and source_key not in ('everystudent-ar','everystudent-fr');"
```

⚠️ **`documents` and `chunks` key on `source_id`, NOT `source_key`** — only
`raw_documents` carries the key directly. Join through `sources`:
```sql
select coalesce(d.language,'(NULL)') lang, count(*) docs, sum(d.chunk_count) chunks
from documents d join sources s on d.source_id = s.id
where s.key = 'everystudent-<code>' group by 1 order by 2 desc;
```
Embeddings live in a separate table, `chunk_embeddings` (`chunk_id`,
`embedding halfvec(1536)`, `embedding_model`) — there is no `embedding` column
on `chunks`.

Then: move any newly-acquired row from a ⬜ table into ✅, update the counts line,
stamp "Last regenerated", and confirm the totals add to 48.

---

## 1. The goal

Acquire, ingest and evaluate the **48 non-walled EveryStudent sibling-language
domains** — the multilingual estate around `everystudent.com`. One domain = one
source key (ADR-0006), so 48 new registry entries.

- **Firecrawl cost: zero.** All 48 answer plain HTTP. The three walled banners
  (`everystudent` en, `everystudent-ar`, `everystudent-fr`) are already done and
  are **not** part of this campaign.
- The binding constraint is **operator attention and eval load**, not money.
- Recon for all 48 was already captured in #111 on 2026-07-24 (domains, languages,
  sitemap counts). That table is reproduced in §8.

## 2. Why not `/slice`

`/slice` exists to discover architecture on a *novel* source: bot-wall probe,
language plan, crawl-policy design, ~7 operator gates. These 48 are **clones of an
already-proven source**. 48 × ~7 gates ≈ 300 pauses, and almost none are
load-bearing.

More importantly, **only acquisition is per-source**. Verified in the CLIs:

| Stage | Command | Scope |
|---|---|---|
| Acquire | `pnpm acquire --source <key>` | **per source** — the only fan-out |
| Ingest | `pnpm index` | drains **all** pending rows, one run. ⓘ `--source <key>` IS supported and was used for the Phase-3 canary — a bare run simply needs no fan-out |
| Eval | `pnpm eval` (no `--source`) | **whole corpus**, one run |
| Prod ingest | `pnpm index:production` | one run |
| Prod eval | `pnpm eval:production` | one run |

So the shape is: **fan out on writing registry entries, then a handful of bulk
commands.** Not 48 rounds of anything.

## 3. The full plan, end to end

```
PHASE 1  triage + registry entries    ← fan out, batches of 8–12 agents
PHASE 2  acquire locally               ← one loop over the batch's keys
   … repeat 1–2 until all 48 are acquired locally …
PHASE 3  index locally                 ← ONE run, all 48 at once
PHASE 4  retrieve spot-check           ← per-language smoke, scripted
PHASE 5  eval locally                  ← batched by language group (see §7)
PHASE 6  ONE pull request for all 48   ← then merge to main
PHASE 7  prod, on Jaco's VM            ← acquire → index → retrieve → eval
```

**Operator's stated intent for the endgame (2026-07-28), do not deviate without
asking:** all 48 acquired locally first → then a single full index/retrieve/eval
→ then **one PR for all 48 sources** → merge → then re-run
acquire/index/retrieve/eval **on the VM against prod**.

Note phases 1–2 interleave per batch; phases 3+ happen **once**, after all 48 are
locally acquired.

---

## 4. You are here

**Last updated: 2026-07-31**

> ⚠️ **This section below is STALE from 2026-07-30 and contradicts §0.** It still
> says "Phase 3 HAS NOT RUN". Phase 3 **is complete** — §0 is the truth. The
> batch history below is accurate; only the "NEXT" framing is wrong. Left in
> place rather than rewritten because the batch record is worth keeping; read §0
> and the box immediately below for current state.

### ⏭️ Actual next action (2026-07-31)

**Phase 3 (index) is CLOSED. The language sweep is CLOSED (§0.4).**
Language is no longer a blocker for anything downstream — 0 nulls, 0 mislabels,
every bucket single-source.

**Next: Phase 4 — the per-language retrieve smoke** (§6 Phase 4). It is now
worth running for the first time: before the sweep, `language:<code>` filters
were returning the wrong corpus for six languages and returning nothing for
`ka`/`sw`/`om`, so any earlier smoke result was meaningless.

Two things Phase 4 must respect:
- **Re-measure `am`, `ar`, `hi`, `id` from scratch.** Any number taken before
  2026-07-31 was measured against a polluted bucket (§0.4).
- **`ka` `sw` `om` `ti` `ne` are now eligible for golden cases for the first
  time** — they were 100% null or 100% mislabelled, so `/golden` guardrail 3a
  would have dropped every candidate. §7's eval shortlist (§13 #1) was decided
  when those languages could not produce cases at all, and may be worth revisiting.

One unfiled defect from the sweep needs an issue — see §11, last entry.

- ✅ **Batch 1 (pilot, 8 sources) — DONE.** Written, wired, acquired.
- ✅ **Batch 2 (12 sources) — DONE.** 11 acquired (782 docs); `sr` deferred.
- ✅ **Batch 3 (12 sources) — DONE.** 12 acquired (567 docs), commit `0e8b1e9`.
- ✅ **Batch 4 (11 sources) — DONE.** `hi` `ta` `my` `te` `sl` `ne` `om` `kk`
  `ka` `sw` `he`. All 11 written, wired and gated; **10 acquired locally
  (233 documents)**, commit `4fce4ee`. **All 10 staged 100% with ZERO
  skips — the first perfect batch of the campaign.** `he` is written and
  gate-passed but **deferred**, on three points that are not defects in the
  entry (below). Zero duplicate-content groups across all 43 everystudent keys.
- ✅ **Batch 5 (4 sitemap-less hosts) — DONE.** `uk` `hy` `ti` written, wired,
  gated and **acquired (95 documents)**, commit `26e8861`. **All three staged
  100% with ZERO skips**, so batches 4 and 5 are both perfect. **`ru-ca` was
  correctly NOT written** — it is a mirror of `everystudent-ru`, see §16.
  These are **SEED MODE** entries: `baseUrl` + `seedPaths`, no `sitemaps` and
  therefore no `block`. Zero duplicate-content groups across all 46 keys.
- 🅿️ **`sr` and `he` are DEFERRED, not pending. Do not try to acquire either.**
- ⚠️ **`ru-ca` and `lv` are OPEN DECISIONS, not unstarted work.** Both are
  fully reconned. Neither needs another agent; both need Jaco.
- ⏭️ **NEXT: nothing is blocked. Phase 1–2 are functionally COMPLETE.**
  The decision is whether to run **Phase 3 (`pnpm index`, ONCE)** now on 44
  sources, or to settle `ru-ca`/`lv`/`he` first so the index covers everything.
  ⚠️ **Consider the doctype cleanup FIRST** — see below; it is nearly free
  now and expensive after embeddings exist.

**Progress: 47 of 48 registry entries written. 45 of 48 acquired
(2,281 documents). 2 deferred (`sr` #129, `he` #132). 1 open (`lv` #133).**
**Phases 1–2 are CLOSED — there is nothing left to crawl.**
**Phase 3 HAS NOT RUN and is the next action, on Jaco's explicit go-ahead.**
`everystudent-am` canary indexed clean (41/41 docs, 163/163 chunks embedded,
0 null-language, idempotent, gate green). A bulk run was started unsanctioned on
2026-07-30 and stopped after 8 `everystudent-zh-cn` documents — see §0 for the
measured state and the open keep-or-rollback decision on those 8. Full canary
evidence and the two operational findings it produced are in §6 Phase 3.

🔴 **`pnpm index` over the remaining 2,232 documents is an expensive,
operator-gated step. Do not launch it without Jaco saying so in that turn.**
The canary exists so he can inspect it *before* the spend; running both in one
go removes the decision point it was created to provide.

### ✅ DONE — the doctype cleanup, before Phase 3 (2026-07-30)

**14 documents across 7 sources** carried a literal `<!DOCTYPE html>` at the
head of their extracted text (`ru` 3, `hu` 3, `ro` 2, `pt` 2, `es` 2, `fa` 1,
`vi` 1). All seven were batch-1/2 entries written **before rule 1e existed**;
batches 3–5 had zero.

Fixed in commit `2b6f8a0` by retrofitting rule 1e — trailing `"html"` plus
`head` in `stripSelectors` — then re-acquiring all 7 over plain HTTP.

**Proven inert before anything changed.** 35 sampled pages (the 14 leaking plus
3 healthy per source) were extracted under both the old and new policies:

| Outcome | Pages |
|---|---:|
| **identical, byte for byte** (healthy) | **21 / 21** |
| changed (leaking; lost only 17–134 ch of doctype + duplicate title) | 14 / 14 |
| **still leaking afterwards** | **0** |

Verify it stayed fixed:
```sql
select source_key, count(*) from raw_documents
where source_key like 'everystudent-%' and raw_content like '%<!DOCTYPE%'
group by 1;   -- expect ZERO rows
```

⚠️ **The 7 entries' tests were rewritten to assert intent, not the literal
array** — the measured container binds FIRST, `"html"` is last, and the 0-char
shadows (`.content4`, `.content4b`, `.articletitle`) are absent. A test pinning
`toEqual([".contentpadding"])` would have blocked this fix for no benefit.

### 🅿️ `everystudent-he` — deferred, and it needs THREE decisions from Jaco

`igod.co.il` was catalogued in #111 as "~5 articles", which is why it was
nearly dropped without a key. **It has 1,020.** The recon read
`/sitemap.xml` — a `<sitemapindex>` — and counted its **five child sitemaps as
if they were pages**. Same failure mode as `sk` (rule 12), 200× the size.

The entry is written, wired, typechecks and passes the full gate. It is not
acquired, on three separate points:

1. **A repo defect blocks acquire outright.** That sitemap wraps every `<loc>`
   in `<![CDATA[…]]>`, and `discover.ts` (lines 87 and 95) reads `loc.text`
   raw, so the string it hands to `fetch` is literally
   `<![CDATA[https://igod.co.il/post-sitemap.xml]]>` →
   `TypeError: Invalid URL`. **Not fixed on this branch**, same reasoning as
   #128 and `extract.ts`: it is shared code. See rule 16 and §13 #10.
2. **It is NOT a Cru property.** Its footer reads
   `© 2026 – כל הזכויות שמורות המכללה למקרא` ("HaMichlala LaMikra", The Bible
   College). A sweep of all 53 fetched pages found **zero** occurrences of Cru,
   EveryStudent, Agape or Campus Crusade. Our standard `rights` line and the
   `cru` tag would misattribute it. Same shape as the `et`/`bn` Bible-society
   copyright catches, but for the whole site rather than one page.
3. **Scale.** 1,020 documents would be **47% of this campaign's entire corpus**
   and more than the ten other batch-4 sources combined (233). That is a
   corpus-composition question, not a technical one.

⚠️ **Do not "just fix the CDATA parsing and acquire it."** Point 1 is the only
one a code change answers; points 2 and 3 are Jaco's.

### What batch 4 changed that a fresh agent must know
1. **#111's last outlier flag was WRONG** (rule 2, corrected). `ka`
   (kovelistudenti.com) was recorded as having no shared-template selectors.
   It runs the ordinary static template with `content4` as an **ID**; a probe
   scanning for `.content4` as a class saw nothing. **The estate has nine
   generators, not ten.** No host in the campaign is now unexplained.
2. **`.articletitle` is a new shadow trap** (rule 1f). It is third in the
   sibling selector list and matches an `<h1>` — on `ka`, where `.content4`
   and `.content4b` both miss, inheriting that list binds the headline and
   stages 16 documents of ~20 characters each, with no error anywhere.
3. **The word-boundary guard from batch 3 is WRONG for Indic scripts**
   (rule 17). Devanagari vowel signs are `\p{M}`, not `\p{L}`, so
   `(?<!\p{L})…(?!\p{L})` matches Nepali छ inside Hindi छोटा. Use
   `(?<![\p{L}\p{M}\p{N}])…(?![\p{L}\p{M}\p{N}])`.
4. **A container may be an ID rather than a class — twice now** (`el`
   `#content4`, `sl` `#contentpadding`). Probe both forms, always.
5. **`om` (Oromo) cannot be language-detected at all** — see §13 #11. The
   entry is correct; the detector has no Oromo model.

### 🅿️ `everystudent-sr` — deferred to [#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129), do NOT work around it

`studentskikutak.com` is DNS-blackholed to `203.0.113.250` (TEST-NET-3) from
Jaco's network. Both port-53 paths return the blackhole — including
`dig @1.1.1.1` — while Cloudflare and Google **DoH** both return the true
`50.28.103.165`. That signature is transparent port-53 interception on the local
gateway; **the domain resolves fine on the public internet.**

The entry is correct and its gate passed (offline, against curl-fetched bytes:
19,095 / 4,733 / 21,022 chars). What is unresolved is a judgement call Jaco
raised on 2026-07-29:

> If our own network filters this host, can we confidently list it as a
> publicly available retrieval source?

⚠️ **An `/etc/hosts` line was considered and DELIBERATELY REJECTED.** It makes
the acquire succeed while leaving that question unanswered and bakes a
machine-specific workaround into a corpus meant to hold publicly retrievable
sources. **Do not add one.** If a future agent finds this and thinks "easy fix",
it is not — read #129 first.

Status: `deferred` in `docs/source-status.yaml`, with the full reason in its
`note`. Still wired into `SOURCES` (the entry is sound); #129 decides whether it
acquires on the VM at Phase 7, or comes out of `SOURCES` entirely. Expected
yield if unblocked: **76 documents**.

### ⚠️ One environment gotcha that is NOT a code defect

1. **`cs` needs an IPv6 workaround.** `everystudent.cz` publishes an AAAA
   record (`2001:1ab0:7e1e:151:62:109:154:30`) that is unreachable from here.
   `curl` silently falls back to IPv4; **Node's `fetch` does not** and dies
   `ETIMEDOUT`. Every `cs` command needs:
   ```bash
   NODE_OPTIONS=--no-network-family-autoselection pnpm acquire --source everystudent-cs
   ```
   `--dns-result-order=ipv4first` alone is NOT enough — undici's Happy Eyeballs
   still tries v6. Verified 2026-07-29 on Node v24.3.0.
2. **Do not run `pnpm test` while an acquire is writing to Postgres.** One
   integration test went red mid-run and was green immediately after. This is
   the §6 Phase-3 warning showing up early — the suite queries the live DB.

---

## 5. The batching approach (and why)

### What fans out
**Only writing the registry entry.** One agent = one domain = two new files:
`src/registry/everystudent-<code>.ts` + its `.test.ts`. No shared state.

### What must NOT fan out
- `src/registry/index.ts` — the barrel. **The orchestrator writes it**, once per
  batch, after all agents return. Eight agents editing it would collide.
- Anything touching the local Postgres: `pnpm acquire`, `index`, `test`, `eval`.
  One database, one connection pool. Agents are forbidden from running these.
- `docs/source-status.yaml` — single-writer via `pnpm status:*` only.

### Batch size
- Pilot was **8**. Reviewable in volume — but **5 of the 8 shipped a broken
  container** (rule 1b) and the review did not catch it, because the thing to
  check was not in the diff. Size is not the risk; the missing gate was. Do not
  read "the pilot went fine" into this file — it did not.
- **Batch 2 onward: 12**, with the §6 step-4 live-extraction gate as the
  backstop. **Run twice now — batches 2 and 3 — and it held both times.**
  Batch 3: 12 concurrent agents, zero scratch collisions, 12 clean entries,
  0 refusals, and every key passed the extraction gate first time. Keep 12.
- Save the **5 sitemap-less domains for last** — they need a different discovery
  route and will not fit the standard agent prompt.

### What batch 3 proved about the prompt
The §10 prompt is doing real work and should not be trimmed. Feeding the agents
the *corrections* (rules 1b–1d, the rule-4 correction, the scripture policy)
rather than just the original advice produced measurably better entries:
- **Every one of the 12 reported its zero-char measurements**, including the
  required "`.content4` matched, 0 chars" line. The shadow trap was live on 9 of
  the 12 hosts and not one agent shipped it.
- **Three found things the recon table had wrong** — `sk`'s dead 2014 sitemap,
  `el`'s `http://` scheme, `ms`'s `<html lang="id">` on a Malay site.
- **Language checks were quantitative, not impressionistic.** `hr` counted
  tko 126 / ko 0 with word boundaries (and explicitly warned that naive
  substring counts give the *opposite* answer); `mk` counted ќ/њ/ѓ/љ/ѕ against
  zero Serbian ђ/ћ and zero Bulgarian ъ/щ; `am` separated Amharic from Tigrinya
  on the genitive prefix; `ur` separated Urdu from Persian/Arabic on ٹ/ڈ/ڑ/ے.

### Hard rules for spawned agents (put these in every prompt)
1. Do **not** edit `src/registry/index.ts`. Their test WILL fail until the barrel
   is wired — that is expected; tell them so, or they waste turns "fixing" it.
2. Do **not** run pnpm / npm / npx / tsx / vitest / psql / docker / git-write.
3. **Give each agent its own scratch subdirectory.** In the pilot, 4 of 8 agents
   had files silently overwritten by a sibling using the same generic filenames
   (`sitemap.xml`). All four noticed and redid the work — that was luck, not
   design. Pass an explicit per-agent path.
4. Probe with `curl` using a **full browser UA string**. A bare `Mozilla/5.0`
   gets **406 Not Acceptable** from these Apache hosts. The repo's real fetcher
   already sends a full Chrome UA (`http-fetcher.ts`), so this is a probing
   concern only.

The exact working pilot prompt is preserved in §10 — reuse it, changing only the
per-domain facts.

---

## 6. Per-phase runbook

### Phase 1 — triage + registry entry (per batch)
1. Orchestrator picks the batch from §8, ordered largest-sitemap-first.
2. Spawn one agent per domain with the §10 prompt.
3. When all return: orchestrator wires `src/registry/index.ts` (imports +
   `SOURCES` array), runs the full gate, then **dry-run acquire** each new key:
   ```bash
   pnpm acquire --source everystudent-<code> --dry-run
   ```
   This resolves the discovery filters against the live sitemap and fetches
   nothing. A source that resolves 0 URLs is broken — do not proceed.
4. ⚠️ **MANDATORY — the live-extraction gate.** `--dry-run` fetches nothing and
   the registry tests assert the entry's own fields, so **neither can tell you
   whether extraction works.** Batch 1 passed both with five entries that
   extracted 0 chars.

   This script is what caught it. **Copy it verbatim** — it must live INSIDE the
   repo (the `@/` alias and ESM `type: module` only resolve there); a scratchpad
   path fails with "Top-level await is not supported with the cjs output format".
   Put it at `.tmp-diag/audit-selectors.ts`, add `.tmp-diag/` to
   `.git/info/exclude`, and delete it before committing.

   ```ts
   import { parse } from "node-html-parser";
   import { HttpFetcher } from "@/adapters/http-fetch/http-fetcher.js";
   import { extractContent } from "@/acquisition/extract.js";
   import { discoverUrls } from "@/acquisition/discover.js";
   import { SOURCES } from "@/registry/index.js";

   async function main() {
     const fetcher = new HttpFetcher();
     const keys = process.argv.slice(2);
     const targets = SOURCES.filter(
       (s) => keys.length === 0 || keys.includes(s.key),
     );
     for (const entry of targets) {
       console.log(`\n=== ${entry.key} (${entry.domain}) ===`);
       let urls: string[] = [];
       try {
         const d = await discoverUrls({ fetcher }, entry.crawl);
         urls = d.urls.slice(0, 2);
         console.log(`  discovered ${d.urls.length} URLs`);
       } catch (e) {
         console.log(`  discovery FAILED: ${String(e)}`);
       }
       if (urls.length === 0) {
         const seeds = entry.crawl.seedPaths ?? [];
         urls = seeds.slice(0, 2).map((p) => new URL(p, entry.crawl.baseUrl).href);
       }
       for (const url of urls) {
         const res = await fetcher.fetch(url);
         if (res.status !== 200 || !res.body) {
           console.log(`  ${url} -> status ${res.status}`);
           continue;
         }
         const root = parse(res.body);
         // Print EVERY candidate's char count — a 0-char match that binds first
         // is exactly the failure you are looking for (rule 1b).
         const parts = entry.crawl.contentSelectors.map((sel) => {
           const el = root.querySelector(sel);
           return `${sel}=${el ? el.structuredText.trim().length : "MISS"}`;
         });
         const out = extractContent(res.body, entry.crawl);
         const verdict =
           out.text.length < entry.crawl.minContentLength ? "TOO-THIN" : "ok";
         console.log(
           `  ${verdict.padEnd(9)} final=${String(out.text.length).padStart(6)}  [${parts.join("  ")}]  ${url}`,
         );
         await new Promise((r) => setTimeout(r, 800));
       }
     }
   }
   void main();
   ```
   Run: `npx tsx .tmp-diag/audit-selectors.ts everystudent-<code> …`
   (no args = every source; the three walled banners will show 403, which is
   expected — they are Firecrawl-fetched and not part of this campaign).

   **Every new key must print `ok`.** A `TOO-THIN` line means the container is
   wrong (rule 1b) — fix the entry, do not proceed to acquire.
5. Commit the batch. **Do not** register in `source-status.yaml` yet — that
   happens at stage boundaries once the source has actually acquired.

### Phase 2 — acquire (per batch)
```bash
for k in <batch keys>; do pnpm acquire --source everystudent-$k; done
```
Evidence to check before calling it done. (`raw_documents` carries `source_key`
directly — there is no `source_id` and no join. An earlier version of this file
had that wrong.)
```sql
-- 1. counts and body sizes
select source_key, count(*), min(length(raw_content)),
       avg(length(raw_content))::int, max(length(raw_content))
from raw_documents where source_key like 'everystudent-%' group by 1 order by 1;

-- 2. ⚠️ REQUIRED — duplicate-content check (rule 1c). Any group with a high
--    count means dead URLs are extracting the same nav page via the <body>
--    fallback. Expect ZERO rows.
select source_key, md5(raw_content) h, count(*)
from raw_documents where source_key like 'everystudent-%'
group by 1, 2 having count(*) > 1 order by 3 desc;
```
Expect the counts in §8's "Staged" column. A large shortfall means the crawl
policy is wrong; a small one is normal (dead sitemap URLs, see §9). **Account for
every skip** — `grep "⤫"` the acquire log and check each URL by hand. That is how
the `ja` mixed-host anomaly surfaced.

Then `pnpm status:add-source` + `status:set … acquire=green` per source.

### Phase 3 — index (after all acquisition is done)

🔴 **Run it under Doppler, or you silently get the OLD embedding provider.**
`origin/main` was merged into this branch on 2026-07-30 (merge `77d8d3e`,
bringing `9a34634` / **ADR-0015**): embedding is now **JFP AI gateway primary
with a logged hosted-OpenRouter fallback**, and gateway mode activates *only*
when `EMBED_BASE_URL` is set. That variable lives in Doppler, **not** in local
`.env` — so a bare `pnpm index` runs the pre-gateway OpenRouter-only path with
all the routing variance (#58: 1–11s per call, batches to ~40s) this change
exists to remove.

```bash
# ✅ the ONLY sanctioned way — gateway-primary, no local config
doppler run -p forge-rag -c dev -- pnpm index
doppler run -p forge-rag -c dev -- pnpm index --source everystudent-<key>

# 🔎 force the OpenRouter-only path, for an A/B
EMBED_BASE_URL="" pnpm index
```

⛔ **Do NOT put the gateway trio in `.env` — it turns the test suite RED.**
Tried on 2026-07-30 and reverted. Three tests fail with the trio present:

| Test | Failure | Why |
|---|---|---|
| `tests/env-gateway-guard.test.ts` | `expected getEnv to throw` | The test `delete`s `EMBED_API_KEY`, then re-imports `env.js`. `loadDotEnv()` re-reads `.env` from disk and **puts the key straight back**, so the credential guard never fires. |
| `tests/wire-embed-policy.test.ts` ×2 | got **4** attempts, expected 2; got **20**, expected 10 | With `EMBED_BASE_URL` set, `wire()` builds a `FallbackEmbedder`: the primary burns its full retry budget, then the whole call re-runs on the fallback. Retry counts **double**. |

The first one is not fixable by any env override — the test deletes the variable
*before* importing, and the loader then reads the file. The credential simply
cannot live in `.env` while that test exists. This is exactly why
`.env.example` ships the three commented out and says prefer `doppler run`;
treat that as binding, not advisory.

**So: always use `doppler run` for gateway work.** `EMBED_BASE_URL=""` in the
real environment is the off-switch when you want the OpenRouter path.

⚠️ **`EMBED_MODEL_ID` must stay `qwen/qwen3-embedding-8b`.** It is the canonical
identity written to `chunk_embeddings.embedding_model` per row, and
`retrieve.ts` fails loud on a query/corpus mismatch against the ~11k rows
already embedded. The gateway's wire alias (`embeddings`) belongs in
`EMBED_WIRE_MODEL_ID` and **nowhere else**. `OPENROUTER_API_KEY` also stays
required — it is the fallback credential plus language-detect and LLM review.
ⓘ `.env.example` deliberately ships these three commented out and prefers
`doppler run`; Option B is a convenience, not the sanctioned home.
⓵ `pnpm index` accepts `--source`, `--limit`, `--force`, `--force-all`.
⓶ **Doppler `forge-rag/dev` defines NO `DATABASE_URL`**, so the local `.env`
value (`localhost:5434`) still wins — running under Doppler does **not** point
you at prod. Verified 2026-07-30.

**2,232 documents across 44 sources are pending** as of 2026-07-30 (49 already
ingested — see §0). This is the expensive step (embeddings). Re-run is
idempotent — a second run drains 0.

#### ✅ Gateway canary — `everystudent-sw`, 2026-07-30

The first source indexed through the ADR-0015 gateway. 13 documents, chosen as
the smallest pending source so the gateway was the only variable.

| Check | Result |
|---|---|
| Ingested | **13 / 13** — 0 updated, 0 unchanged, 0 skipped, 0 unknown-source |
| Chunks | **105 declared = 105 actual** |
| Embeddings | **105 / 105** in `chunk_embeddings` |
| **`embedding_model` recorded** | **`qwen/qwen3-embedding-8b`** on all 105 — the wire alias `embeddings` did **NOT** leak into row identity, which was ADR-0015's headline risk |
| Fallback activations | **0** — no `↯`, no `query_embed_fallback`; the gateway served every batch |
| Embed retries | **0** — compare the `am` OpenRouter canary, which needed several timeout retries. This is the #58 latency win, visible on the first run |
| Idempotency | re-run drained **0 rows** |
| Corpus arithmetic | docs 11,737 → 11,750 (+13) · chunks 34,539 → 34,644 (+105) · embeddings = chunks · pending 2,232 → **2,219** |
| Retrieval | Swahili "Mungu ni nani?" → `/a/mungu-ni-nani.html` at **0.758** |
| Language | 🔴 **13 of 13 `null`** — not a gateway fault, see §0.2 |

**Verdict: the gateway path is good for the bulk run.** Zero retries and zero
fallbacks over 105 chunks, and row identity is intact.

#### ✅ Gateway verified from this machine, 2026-07-30 (read-only)

All tests used `pnpm query` against the already-indexed `everystudent-am`, so
no writes and no embedding spend on the corpus.

⚠️ **The similarity score does NOT tell you which provider served the embed.**
Gateway and hosted OpenRouter both return `/a/isthere.html` at **0.756** for the
same Amharic query. That agreement is the good news — the two providers produce
equivalent vectors, which is what lets ADR-0015 claim no re-embed and keeps
`retrieve.ts`'s model-mismatch guard satisfied — but it means **you cannot use
the score to confirm your config is live.** Break a key instead:

| Test | Expected | Observed |
|---|---|---|
| Gateway configured, `OPENROUTER_API_KEY` broken | succeeds — gateway is primary, fallback never needed | ✅ hit at 0.756 |
| `EMBED_BASE_URL=""`, `OPENROUTER_API_KEY` broken | fails — OpenRouter was the only provider | ✅ `401 Unauthorized — "User not found."` |
| Gateway configured, `EMBED_API_KEY` broken | falls back, loudly | ✅ `event=query_embed_fallback provider=openrouter reason=http_401`, still returns the hit |

`EMBED_BASE_URL=""` is a valid off-switch — the schema's `emptyAsUnset` reads an
empty string as unset, and because `loadDotEnv()` only fills keys that are still
`undefined`, an empty value in the real environment also **beats** a populated
`.env` line. That is the one-shot way to A/B the two providers.

The fallback is **logged, never silent** — grep a long run for `↯` and
`query_embed_fallback` to see whether the gateway quietly stopped carrying
traffic.

⚠️ **Correction to this file's own §2 table:** it says `pnpm index` takes "no
`--source`". That is wrong — `scripts/index.ts` accepts `--source`, `--limit`,
`--force` and `--force-all`. What the table *meant* is that a bare run drains
everything, so ingest does not need to fan out. Both are true.

#### ✅ Canary run — `everystudent-am`, 2026-07-30

Operator's call: index one source first, verify, then bulk. **The rule "Phase 3
runs ONCE" is about not indexing mid-acquisition** — it existed to stop someone
embedding batch 1 before batch 5 was written. With acquisition complete, a
canary costs one small source and is safe: chunking is per-document and
embedding is per-chunk, with **no corpus-wide fitting** that a partial run could
skew.

| Check | Result |
|---|---|
| Ingested | **41 / 41** — 0 skipped, 0 unknown-source |
| Chunks | **163 declared = 163 actual** (no `chunk_count` mismatch) |
| Embeddings | **163 / 163** present in `chunk_embeddings` |
| Language | **41 `am`, ZERO `null`** — no ADR-0007 floor casualties |
| Idempotency | re-run drained **0 rows** |
| Pending after | 2,240 = 2,281 − 41 ✅ |
| Gate | green, **744 tests** |
| Retrieval | Amharic "እግዚአብሔር አለ ወይ?" → `/a/isthere.html` at **0.756** |

⚠️ **A clean `am` run proves nothing about `om` or `ti`.** Amharic is the one
Ge'ez-script language `tinyld` actually models. §13 #11/#16 predict `om` lands
17/18 `null` plus one mislabelled `'ber'`, and `ti` may be mislabelled `'am'`
outright. **Verify those two specifically after the bulk run** — see the
per-source language query in Phase 4.

#### Two operational findings from the canary

1. **Ingest-side embed timeouts are normal and self-heal.** Several
   `corpus embed attempt N/10 failed (timeout); retrying` lines appeared and
   **every one succeeded on retry**. Same OpenRouter flakiness as slice #8
   (#64), absorbed by the ingest retry policy. Expect more across 2,240 docs;
   they are not a failure signal.
2. 🔴 **The QUERY side is NOT so forgiving, and this bites Phase 4 too.** An
   ad-hoc `pnpm query` died outright with
   `DOMException [AbortError]: This operation was aborted` — ad-hoc queries
   inherit the **fast-fail posture built for `/v1/search`** (2 attempts, short
   timeout). The same override this file already mandates for Phase 5 fixes it,
   and it is needed for **any** retrieval work, not just eval:
   ```bash
   QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000 pnpm query …
   ```
   ⚠️ Also note `pnpm query` takes **flags BEFORE the query string** —
   `pnpm query --source <key> --top-k 3 "…"`. A trailing `--limit 3` is
   swallowed into the query text and silently changes what you searched for.

⚠️ Re-run the **full verify gate after ingest**, not just after code changes —
integration tests query the live Postgres and a data-only change can turn them
red (slice #3 precedent). Verified green after the canary.

### Phase 4 — retrieve spot-check
Per-language smoke: a `language:<code>` filtered query returns non-zero hits, all
in that language. Script it; do not hand-run 48 times.

✅ **Prerequisite met 2026-07-31 — the language sweep (§0.4) is what makes this
phase meaningful.** Before it, `language:hi` returned Nepali, `language:am`
returned Tigrinya, `language:ar` returned Persian, `language:id` returned Malay,
and `language:ka`/`sw`/`om` returned nothing at all. A smoke run before the sweep
would have passed on the wrong corpus.

⚠️ **Discard any Phase-4 number taken before 2026-07-31** for `am`, `ar`, `hi`
or `id` — those buckets were polluted by a second language.

### Phase 5 — eval (batched, see §7)
```bash
QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000 pnpm eval
```
**The env override is mandatory for batch evals.** `pnpm eval` inherits the
fast-fail query retry posture meant for `/v1/search`, and it has **no resume** —
one transient OpenRouter blip discards the whole run. It killed two runs in
slice #9. See `docs/ops/embed-retry-policy.md`.

### Phase 6 — one PR for all 48
Title must be lowercase (commitlint + `.github/workflows/pr-title.yml`).
Switch `gh` identity to `jaco-brink` before any push.

### Phase 7 — prod, on the VM
Per `docs/ops/prod-ingest.md`. These are **non-walled**, so the normal
`acquire:production` path applies — re-fetching over plain HTTP is free.
**Do NOT suggest `copy-raws.sh`** for these; that path exists to avoid paying
Firecrawl twice and there is no Firecrawl here.

🔴 **Then run the language sweep against prod — it is NOT optional and it does
NOT come along for free.** Prod re-detects with `tinyld` at ingest, so it will
reproduce all 225 nulls and all 182 mislabels that §0.4 just fixed locally. The
exact commands are in §0.4 → "This does NOT carry to production".

---

## 7. Eval strategy — the one place 48 still bites

Golden cases need someone who can read the language. Nobody can curate Oromo,
Tigrigna and Georgian answer keys. **Proposed, and awaiting the operator's
decision:**

- **Real `/golden` treatment** for a shortlist — suggested: `es`, `zh`, `ru`,
  `pt`, `de`, `ja`, `ko`.
- **Everything else: `evaluate: deferred`** in `docs/source-status.yaml`.
  `deferred` is a **sanctioned status in the contract**
  (`src/contracts/source-status.schema.ts`), not a workaround. Record the reason.
  Prove retrieval with the Phase-4 language smoke instead.

Facts that bear on this (measured 2026-07-28, local corpus):

- Existing corpus languages: `en` 10,554 · `es` 500 · `zh` 332 · `fr` 225 ·
  `ar` 65 · `null` 12.
- Existing golden cases carry only `ar` (13) · `fr` (12) · `en` (11) · `es` (9).
- Therefore: **`es` and `zh` are multi-source languages** — Stage-4 Part A
  re-review is real work there. **`ru` `ro` `ja` `pt` `de` `ko` are new
  languages** — Part A is a *provable no-op* (no existing case can resolve to
  them; `corpus-search-store.ts` applies a strict `eq(documents.language, …)`).
  Do the cheap structural check before spending a curation pass.

---

## 8. The 48 domains

**Batch 1 (8) — ACQUIRED locally 2026-07-28.** `acquire: green` in
`docs/source-status.yaml`. **599 documents** (was 600; `es` lost one row to the
2026-07-29 scripture policy), zero duplicate-content groups.
"Container" is the selector that actually extracts (see rule 1b):

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `es` | cadaestudiante.com | 153 | 77 | **76** | `.contentpadding` |
| `zh-cn` | xinshengming.com | 146 | 129 | **128** | `.cb-entry-content` (WordPress) |
| `ru` | mirstudentov.com | 105 | 95 | **95** | `.contentpadding` |
| `ro` | everystudent.ro | 102 | 65 | **64** | `.contentpadding` |
| `ja` | studentinjapan.com | 94 | 81 | **79** | `.content4` ⚠️ mixed host |
| `pt` | suaescolha.com | 74 | **75** | **75** | `.contentpadding` |
| `de` | duentscheidest.com | 72 | 45 | **45** | `.contentpadding` |
| `ko` | everykoreanstudent.com | 48 | 37 | **37** | `html` (broken markup) |

Skip accounting — every one checked, none is a defect:
- `es` 1 · `/articulos/discipulos.html` is a genuine 164-char stub (title +
  subhead only). ⚠️ A **second** `es` document was removed on 2026-07-29:
  `/articulos/biblia_juan.html` (100,409 ch, the complete Gospel of John) is now
  blocked under the estate-wide scripture policy and its row was deleted. The
  entry's own test was updated — it had asserted that URL was *kept*, as its
  example of an underscore slug passing the hint, and it was the only underscore
  slug on the host.
- `zh-cn` 1 · `/a/pack3.html`, from the "adventure/pack" email series.
- `ro` · the 25 dead redirects are now **hard-blocked** (rule 1c), so discovery
  resolves 65 rather than 90. The single remaining skip is
  `/v/filmuliisus.html`, a transcript-less video embed. 64 = the ~64 this file
  predicted all along. ⚠️ The **first** run — before the block — staged 89, of
  which 25 were byte-identical junk; those rows were deleted from
  `raw_documents`. If you ever re-run `ro`, the block prevents their return.
- `ja` 2 · `/a/jes4.html` (220 ch, under the floor) and `/a/Bible215.html` (an
  interactive quiz page with no content container). Both correctly dropped.
- `pt` 75/75 · the 13 pinned `seedPaths` unioned with the 62 discovered exactly
  as designed — the stale-sitemap patch works.

**Batch 2 (12) — written and wired 2026-07-29; 11 ACQUIRED, `sr` deferred (#129).**
**782 documents**, zero duplicate-content groups. Commit `9a0fec3` (+ a follow-up
for `bg` and the scripture policy).

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `hu` | everystudent.hu | 95 | 83 | **83** | `.contentpadding` |
| `bg` | everystudent.bg | 95 | 84 seeds | **84** | `.article-content` ⚠️ staging |
| `mn` | tailal.mn | 105 | 82 | **82** | `html` ⚠️ +11 seeds |
| `sq` | pyetjetejetes.com | 131 | 78 | **77** | `html` |
| `pl` | kazdystudent.pl | 90 | 77 | **77** | `.contentpadding` |
| `sr` | studentskikutak.com | 84 | 76 | **— deferred #129** | `.contentpadding` |
| `fa` | everypersianstudent.com | 107 | 75 | **75** | `.contentpadding` |
| `cs` | everystudent.cz | 97 | 100 | **74** | `.content` ⚠️ Yii app |
| `tr` | tanriyitanimak.com | 102 | 71 | **71** | `.contentpadding` |
| `vi` | everyvietstudent.com | 76 | 67 | **67** | `.contentpadding` |
| `et` | tudengielu.net | 77 | 46 | **46** | `.contentleftpadding` |
| `zh-tw` | everystudent.com.tw | 70 | 46 | **46** | `.entry-content` |

Skip accounting — every one checked, none is a defect:
- **9 of the 11 acquired staged 100% with ZERO skips.** Only `cs` and `sq` differ.
- `cs` 26 · dead event stubs (`movie_night`, `plazovy_volejbal`, `rip`, …), all
  extracting the same 25-char "Nenalezeny žádné záznamy." Left unblocked
  deliberately: `.content` binds, so there is no `<body>` fallback and the floor
  genuinely catches them. Their ids interleave with live articles.
- `cs` 1 fetch-failed on the **first** run (`/in/73/je_bible_duveryhodna`, a
  genuine article) — a timeout on that slow PHP host, **recovered on re-run**.
  This is why the entry ships `requestDelayMs: 2000`.
- `sq` 1 · `/a/gjoni.html` blocked under the scripture policy (see §12).
- `mn` +11 · the XML sitemap omits 11 live articles the site's own map links —
  a 13.4% blind spot, pinned as `seedPaths`. `cs` similarly pins 17 (a whole
  section, `/19/zivot_s_bohem`, absent from the sitemap). `sr` pins 7.

**Batch 3 (12) — written, wired and ACQUIRED 2026-07-29.** **567 documents**,
zero duplicate-content groups. Commit `0e8b1e9`. Note the "Sitemap" column is
what was actually measured, which is **not** what the recon table above said for
`sk`:

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `sk` | everystudent.sk | **103** (recon said 44) | 80 + 3 seeds | **83** | `.entry-content` ⚠️ WordPress + Elementor |
| `id` | mahasiswakeren.com | 67 | 57 | **57** | `.contentpadding` |
| `ms` | persoalanhidup.com | 61 | 51 + 1 seed | **52** | `.contentpadding` |
| `mk` | studentskiodgovori.com | 65 | 48 + 1 seed | **49** | `.contentpadding` |
| `lt` | kiekvienamstudentui.lt | 60 | 49 | **49** | `html` ⚠️ 2 broken articles |
| `bn` | everybengalistudent.com | 57 | 47 + 1 seed | **48** | `.contentpadding` |
| `th` | everythaistudent.com | 52 | 43 + 1 seed | **44** | `.contentpadding` |
| `hr` | vrlovazno.com | 54 | 41 | **41** | `.contentpadding` |
| `am` | habeshastudent.com | 50 | 40 + 1 seed | **41** | `.contentpadding` |
| `it` | ognistudente.com | 50 | 38 | **38** | `.post-content` ⚠️ WordPress |
| `ur` | zindagikaysawalat.com | 42 | 33 | **33** | `.contentpadding` |
| `el` | everystudent.gr | 43 | 32 | **32** | `#content4` ⚠️ `http://` sitemap |

Skip accounting — every one checked, none is a defect:
- **11 of the 12 staged 100% with ZERO skips.** Only `it` differs.
- `it` 1 · `/fede/` returned `fetch-failed` on the **first** run and
  **recovered on re-run** (38/38). A transient network error, the same shape as
  `cs`'s first-run timeout in batch 2. Not a defect and no entry change needed.
- 7 seeds pinned across 5 hosts, each a live article missing from the XML
  sitemap: `sk` 3 (parts II–IV of a four-part series Yoast lists only part I of),
  `ms` 1, `mk` 1 (linked from 16 articles, in neither map), `am` 1, `th` 1.
  `bn`'s seed is an orchestrator decision, not an agent find — see §12.
- Two pages blocked under the scripture policy: `ms` `/a/300siapakah.html`
  (28,213 ch, abridged John, "no added commentary") and `bn` `/a/whowas.html`
  (22,236 ch, complete John — **and the only page on that domain carrying a
  third-party licence**, New Living Translation © Tyndale House Foundation).
- ⚠️ `sk`'s shortest document is **478 chars**, under ADR-0007's 500-char
  detection floor, so it may store `language = null`. Expected; see the
  ingest-stage notes.

**Batch 4 (11) — written, wired and gated 2026-07-30; 10 ACQUIRED, `he` deferred.**
**233 documents**, zero duplicate-content groups. Commit `4fce4ee`.
**Every recon count in the "Sitemap" column below was correct** — no `sk`-style
fossil this round. Ten of eleven; the eleventh is the exception that matters.

| Lang | Domain | Sitemap | Resolved | **Staged** | Container |
|---|---|---|---|---|---|
| `hi` | everystudent.in | 40 | 30 + 4 seeds | **34** | `.contentpadding` † |
| `ta` | ungalthervuenna.com | 40 | 31 | **31** | `html` |
| `my` | everymyanmarstudent.com | 38 | 31 | **31** | `.contentpadding` † |
| `te` | everytelugustudent.com | 39 | 29 + 1 seed | **30** | `html` |
| `sl` | vsakstudent.com | 30 | 22 + 1 seed | **23** | **`#contentpadding`** † ⚠️ an ID |
| `ne` | nepalistudent.net | 28 | 18 + 2 seeds | **20** | `.contentpadding` † |
| `om` | everybarataa.com | 29 | 18 | **18** | `.contentpadding` † ⚠️ undetectable |
| `kk` | shakirtter.com | 25 | 17 | **17** | `html` |
| `ka` | kovelistudenti.com | 25 | 16 | **16** | `.contentpadding` † ⚠️ #111 was wrong |
| `sw` | lipotumaini.com | 21 | 13 | **13** | `.contentpadding` † |
| `he` | igod.co.il | **1,182** (recon said 5) | — | **— deferred** | `.elementor-widget-theme-post-content` † |

Skip accounting — there is almost none, which is itself the finding:
- **ALL TEN staged 100% with ZERO skips.** No transient `fetch-failed`, no
  `too-thin`, no dead redirect. The first batch in the campaign with nothing to
  account for. Batch 2 had `cs` and `sq`; batch 3 had `it`.
- 8 seeds pinned across 4 hosts, each a live article missing from the XML
  sitemap: `hi` 4 (its own `/m/map.html` is a **superset** of the XML — the
  reverse of the usual staleness), `ne` 2 (one from the HTML map, one in
  neither map), `te` 1, `sl` 1 (linked from 11 articles, in neither map).
- **No page was blocked as scripture in 7 of the 11.** Four were: `te`
  `/a/whowas.html` (23,429 ch, abridged John, © Tyndale House Foundation —
  byte-for-byte the page `bn` blocks at the same slug), `sl` `/janez.html`
  (© Društvo Svetopisemska družba Slovenije), `om` `/a/whowas.html` (credited
  to the Oromo Bible), `hi` `/bible.html`. In every case the agent kept the
  host's `/a/bible.html`-style apologetics essay and said how it told them
  apart — voice, verse numbering and the presence of a secondary-source
  bibliography, never length.
- **Three hosts have real `robots.txt` rules and each was honoured by hand**
  (`my` 2 paths, `kk` 1, `ka` 1 — the last written malformed, `Disallow:
  a/fol.html` with no leading slash). All four pages return 200, match
  `articleHints`, and clear the floor, so nothing else would have excluded
  them. That is the third, fourth and fifth time this campaign has hand-patched
  a gap that §13 #7 describes: **the acquire path never reads robots.txt.**

⚠️ ~~**`ka` has no shared-template selectors** per #111~~ — **DISPROVED
2026-07-30, see rule 2.** It is the ordinary static template; `content4` is an
**ID** there. The estate stays at nine generators.
⚠️ ~~**`he` yields only ~5 articles**~~ — **WRONG by 200×, see §4.** It has
**1,020**, and it is not a Cru property.

**~~`sk` needs care~~ — RESOLVED 2026-07-29, and the warning was wrong.**
`everystudent.sk` is **not** the Czech Yii app; it is WordPress + Elementor, and
`.content` matches 0 of its pages. Measured 8-gram overlap between the `.cz` and
`.sk` estates is **0.00%** across all 94 Slovak bodies — Czech and Slovak
translations of one English original share no 8-grams. The single exception is
`.cz` `/in/163/koronavirus_jak_prekonat_strach` ↔ `.sk` `/uzkost-a-strach/` at
**60.1%**, which confirms that page was lifted *from* everystudent.sk. `cs`
neither discovers nor seeds it, so **there is no live duplicate risk** and
leaving it out of `cs` remains correct.

**~~`hr` and `mk` are Serbian's neighbours~~ — RESOLVED 2026-07-29, both are
genuinely distinct.** `hr` is Croatian Ijekavian in Latin script (tko 126 / ko 0
under word boundaries — the exact mirror of `sr`'s ko 201 / tko 0), with 8 Cyrillic
codepoints on the entire site and **no parallel script tree**. Shingle overlap with
`sr` on same-topic articles is **0.4–0.9%** — independent translations. `mk` is
Macedonian Cyrillic (99.05%), proven on the alphabet: ќ ×1,433, њ ×745, ѓ ×422,
љ ×273, ѕ ×17, against **zero** Serbian-only ђ/ћ and **zero** Bulgarian-only
ъ/щ/ю/я. Also no parallel tree. **No duplicate-content decision needed for either.**

⚠️ **Word-boundary counting matters here.** `hr`'s agent noted that naive
substring counts give the *opposite* answer — `vreme` scores 75 inside Croatian
"suvremen"/"istovremeno", and `ko` scores 1,354 inside "kako"/"tko". Both drop to
0 under `(?<!\p{L})…(?!\p{L})`. Anyone re-running a Slavic language check must
use word boundaries.

**No reachable sitemap (5) — recon DONE 2026-07-29, see §15.** Route decided:
**hand-listed seeds from each site's own HTML map, NOT Firecrawl** — 4 of the 5
are bare Apache serving 200, so there is no wall to pay for. ~234 documents.

`ru-ca` studentstan.com (87) · `lv` katramstudentam.lv (49) ·
`uk` svitstudentiv.com (47) · `hy` 1patasxan.com (37) ·
`ti` everytemhari.com (14).

⛔ **`lv` is blocked on RIGHTS, not on crawlability** — its `robots.txt`
disallows `ClaudeBot` by name and declares `Content-Signal: ai-train=no`. §15
has the full text and the recommendation (ask Cru, don't out-engineer it).

**Known outliers already flagged by #111:** `cs` (everystudent.cz) uses
`.content .content-13` / `.main`, not the shared template — **done, batch 2**;
the stable half is `.content` (`content-13` is the article id). `ka`
(kovelistudenti.com) has no shared-template selectors either — **still
unwritten**, and the only remaining host #111 flagged. Expect a tenth generator.

---

## 9. Rules learned — do not re-learn these

Each cost real investigation. Cite them when they apply.

1. **Verify selectors by extracted TEXT LENGTH, using the repo's own parser —
   never by grepping for the class name.** Every one of these hosts also declares
   `.content4` in an inline `<style>` block, so a text grep false-positives.
   Worse: on `everykoreanstudent.com`, `.content4` **matches 2 elements and
   extracts 0 characters**, and `<body>` is absent from the parsed tree entirely
   (152 direct children of `<html>`). Shipping the sibling selector list there
   would have acquired **zero documents with no error anywhere** — a silent
   failure that looks correctly configured. Check like this:
   ```js
   import { parse } from 'node-html-parser';
   const el = parse(html).querySelector(sel);
   console.log(sel, el ? el.structuredText.trim().length : -1);
   ```

1b. **⚠️ THE ONE THAT BIT US — `contentSelectors` is NOT a fallback chain.**
   `extractContent` (`src/acquisition/extract.ts`) scopes to the **first selector
   that matches an ELEMENT**, not the first that yields text:
   ```ts
   for (const selector of policy.contentSelectors) {
     scope = root.querySelector(selector);
     if (scope) break;          // ← binds even when it extracts 0 chars
   }
   ```
   So **a zero-text match SHADOWS every working selector after it.** Listing the
   shared template as a "fallback chain, outermost first" is not defensive — it
   is the failure mode.

   On **five of the eight pilot hosts** (`es`, `ru`, `ro`, `pt`, `de`)
   `.content4` exists only as `<div class="content4"> </div>` — an empty layout
   spacer, 0 chars, 0 child elements — and `.content4b` **does not exist at all**.
   The real container is **`.contentpadding`** (3.6k–20.5k chars). Because
   `.content4` was listed first, all five extracted **0 chars on every page** and
   every article was skipped as `too-thin` on an **HTTP 200**. Fixed 2026-07-28 by
   setting `contentSelectors: [".contentpadding"]` — one measured selector, no
   chain. Only `ja` genuinely has `.content4` as its container.

   Two things made this survive Phase 1:
   - **The registry unit tests cannot catch it.** They assert the entry object's
     own fields (`expect(contentSelectors[0]).toBe(".content4")`) — a tautology
     that passes whatever you write. All five even shipped a confident nesting
     diagram (`.content4 > .content4b > .contentpadding`) that does not exist.
   - **`--dry-run` acquire cannot catch it either.** It resolves URLs against the
     sitemap and **fetches nothing**, so "resolves 630 URLs" says nothing about
     extraction. The §6 Phase-1 gate is insufficient on its own.

   **New mandatory Phase-1 gate — run BEFORE committing a batch:** fetch 2 real
   article URLs per new key and run the repo's own `extractContent` with the
   registry policy; assert `text.length >= minContentLength`. Anything else is
   guessing. See "Open questions" #4 — this should become a checked-in script.

1c. **"`minContentLength` will drop it" is NOT a blocking strategy — there is a
   `<body>` fallback.** When **no** `contentSelector` matches, `extractContent`
   does not return empty. It falls through (`extract.ts:50`):
   ```ts
   const container = scope ?? root.querySelector("body") ?? root;
   ```
   so the page still extracts — usually the entire nav/teaser chrome, which on
   these hosts runs 800+ chars and clears the 250 floor comfortably.

   `everystudent-ro` shipped 25 dead `/a/` URLs unblocked on exactly the wrong
   reasoning: "the homepage carries none of the selectors, so extraction yields
   0 characters and the floor drops them." The real acquire run staged **89 docs,
   25 of them byte-identical copies of the 842-char homepage teaser list.** They
   do not collapse at ingest either — the dedup gate keys on
   `(sourceKey, canonicalUrl)`, so 25 URLs mean 25 chunked, embedded documents.
   Blocked by URL and the 25 rows deleted; `ro` now stands at the 64 predicted.

   **Rule: a page you do not want must be blocked by URL.** The floor only
   catches pages that are genuinely short *after* extraction, and a selector
   miss makes a page LONGER, not shorter. Verify with
   `select md5(raw_content), count(*) … group by 1 having count(*) > 1` after
   every acquire — one hash with a high count is this bug.

   ⚠️ **CORRECTED 2026-07-29 — it is not "two hosts", it is MOST of them.**
   `<body>` is absent from the parsed tree on `ja`, `ko`, `sq`, `mn`, `vi`, and
   on individual pages of `hu`, `fa` and `sr`. So `?? root` — the *document*
   fallback — is the normal path on this estate, not the exception. What it
   returns is the WHOLE document including a literal `<!DOCTYPE html>` text
   node, not the tidy nav blob this rule originally described. Two agents
   (`sq`, `vi`) hit that artifact independently.

1d. **⚠️ CORRECTED 2026-07-29 — `.contentpadding` is NOT a safe default either.**
   Rule 1b reads as "`.content4` is the trap, `.contentpadding` is the fix". That
   is wrong. On `pyetjetejetes.com` (`sq`) **`.contentpadding` matches 52 of 78
   pages and extracts 0 chars on every one**, while `.content4` matches 78/78
   at 0 chars and `<body>` is absent entirely — the only container is `html`.
   There is **no selector that is safe by default anywhere on this estate.**
   Measure every candidate on every host, every time.
1e. **✅ THE FIX for rules 1b–1d, found in batch 3 — append `"html"` LAST.**
   Rules 1b–1d all describe the same wound: `extract.ts` binds the first
   selector that matches an ELEMENT, and when nothing matches it falls to
   `?? root`, which returns the whole document **including a literal
   `<!DOCTYPE html>` text node**. Batch 3 found the cheap, safe remedy:

   ```ts
   contentSelectors: [".contentpadding", "html"],   // "html" is ALWAYS last
   stripSelectors:   ["head", …],                   // drops the duplicate <title>
   ```

   Why this is safe, and why it does **not** contradict rule 1b:
   - Rule 1b warns against an **unmeasured selector placed FIRST**. A trailing
     entry is the opposite — nothing follows it, so it can shadow nothing.
   - It is only ever consulted when the primary misses. **Proven:** all 24
     batch-3 gate probes returned values *byte-identical* before and after the
     change. The fallback is completely inert on healthy pages.
   - `<html>` is a real element, so it carries **no doctype text node** — it
     strictly dominates `?? root`.
   - `head` is not inside the primary container, so it strips 0 chars on
     healthy pages and only fires on the fallback path. Safe because
     `extract.ts` reads the title from `root` at **line 43**, BEFORE the strip
     loop at **line 52**.

   **Precondition — check it per host:** the primary must have **zero
   matched-but-empty pages**. If the primary can match at 0 chars (rule 1d,
   `sq`), the fallback never fires and the page is lost anyway; that host needs
   `["html"]` outright, as `lt` ships.

   ⚠️ **This changes what "block the broken page" is worth.** Three batch-3
   agents blocked genuine articles solely because of the doctype artefact —
   `th` `/a/300whatislife.html` (10,449 ch), `lt` `/m/istorija.html`
   (20,148 ch), `bn` `/a/followup.html` (3,255 ch). All three now extract
   clean. **Do not block a page for a doctype leak; add the fallback instead.**
   `bn` had even blocked one page while keeping another with the identical
   defect.

1f. **⚠️ NEW (batch 4) — `.articletitle` is a shadow trap too, and it is the
   worst kind: it extracts a plausible non-zero number.** Rules 1b–1d are about
   selectors that match at 0 chars. `.articletitle` matches an `<h1>` and
   extracts **5–79 characters** — enough to look like a working measurement in a
   log, far too little to be an article, and *above* nothing since the 250-char
   floor still catches it. The danger is its POSITION: it sits third in the
   sibling list, so on any host where `.content4` and `.content4b` both miss it
   binds and stops. On `ka` that would have staged 16 documents of ~20
   characters each.

   Measured on the hosts that carry it: `ka` 5–62, `te` 4–78, `ta` 4–61,
   `ne` 18–47, `kk` 13–66. **Never list it.** If you see it in a candidate set,
   it is a title, not a container.

2. **There is no single shared template.** Measured across all 43 registered
   siblings (updated 2026-07-30 after batch 4):
   - **`.contentpadding` (25)** — `es` `ru` `ro` `pt` `de` `pl` `hu` `tr` `vi`
     `fa` `sr` `id` `ms` `mk` `bn` `th` `hr` `am` + batch 4's `hi` `my` `ne`
     `om` `ka` `sw`. `.content4` is an empty 0-char spacer on essentially all
     of them.
   - **`#contentpadding` (1)** — `sl` (vsakstudent.com), where
     **`contentpadding` is an ID, not a class.** `.contentpadding` matches
     **nothing** there. The second host in the estate to hide its container
     behind the class-vs-ID distinction, after `el`. A different stylesheet
     generation (`lessframework2022.css` vs `ka`'s `lessframework2013.css`),
     so treat the year-variants of this hand-built template as separate.
   - **`html` (6)** — `ko` `sq` `mn` `lt` + batch 4's `ta` `te` `kk`. On `ko`
     `sq` `mn` a malformed `sitelevel_noindex` pops the element stack and takes
     `<body>` with it (rule 4); the same mechanism is what forces `ta` `te` `kk`
     — on `ta` a stray `</sitelevel_noindex>` fires right after the share row on
     **all 31 pages**, and on `kk` each page also carries one extra `</div>`.
     On `lt` it is two individual articles instead — one closing an `<h2>` with
     `</h1>`, one with an unclosed `<span>`.
   - **`.elementor-widget-theme-post-content` (1)** — `he` (igod.co.il),
     WordPress + **Elementor with the `hello-elementor` theme** — a fourth
     WordPress container, and unlike `sk` (also Elementor) it does **not** use
     `.entry-content`. On `he`, `.entry-content` is the trap: it matches 44 of
     51 pages and extracts a **constant 286 chars** — a related-post teaser,
     byte-identical across unrelated articles. Not zero, and therefore not
     caught by the floor either. **Deferred, not acquired — see §4.**
   - **`.content4` (1)** — `ja` only, and even there the spacer shape appears on
     some pages (see the entry's mixed-host note).
   - **`#content4` (1)** — `el`, where **`content4` is an ID, not a class**.
     `.content4` matches nothing there. One character between working and a
     silent zero — and the sibling selector list would have produced exactly the
     0-char failure of rule 1b.
   - **`.cb-entry-content` (1)** — `zh-cn`, WordPress (Chosen theme).
   - **`.entry-content` (2)** — `zh-tw`, WordPress (Enfold/Avia), and `sk`,
     WordPress + **Elementor**. Same selector, two unrelated themes.
   - **`.post-content` (1)** — `it`, WordPress (`sight2016`). **A third
     WordPress theme with a third container** — one WP host never predicts
     another. All seven catalogued containers are absent from `it` entirely.
   - **`.contentleftpadding` (1)** — `et`, an older hand-rolled layout. None of
     the `.content4`-family selectors exist on it **at all**, not even as
     spacers. Inheriting the sibling list here would have missed on all four and
     silently ingested 46 articles with nav+sidebar+footer attached.
   - **`.article-content` (1)** — `bg`, an Angular build with Pagefind search.
   - **`.content` (1)** — `cs`, a bespoke Yii PHP app. #111's
     "`.content .content-13`" hint was one element's class attribute;
     `content-13` is the article id, so the stable half is `.content`.
     ⚠️ **`sk` is NOT this app despite the sibling domain** — it is WordPress,
     and `.content` matches 0 of its pages. See rule 12.

   That is **ten distinct generators** — nine across the 47 EveryStudent-family
   hosts, plus `he`'s Elementor build, which is not one of them. The "shared
   EveryStudent template" is a minority case; #111's "one crawl policy + a
   handful of bespoke" is optimistic by a wide margin. Assume per-host
   verification every time, and never copy a sibling's selector list.

   ⚠️ **#111's outlier flags are not reliable, in BOTH directions.** It flagged
   `ka` as having no shared-template selectors — **false**, it is the ordinary
   template with `content4` as an ID, and a probe scanning for the class saw
   nothing. It recorded `he` at ~5 articles — **false by 200×**, it has 1,020.
   Both errors came from a probe that did not look hard enough, not from the
   hosts being strange. Re-measure anything #111 asserts.

   ⚠️ **Probe BOTH `.x` and `#x` for every candidate.** Two hosts out of 43
   (`el` `#content4`, `sl` `#contentpadding`) put the container in an ID. That
   is ~5% of the estate, and the failure is silent in both directions: a class
   probe on an ID host finds nothing, which reads identically to "this selector
   isn't used here".

   ⚠️ **The estate may be mid-migration.** `bg`'s sitemap carries hreflang
   alternates naming **49 other EveryStudent hosts**, and `bg` alone is on a new
   Angular platform. If it is the pilot of a platform-wide rebuild, container
   selectors recorded here have a shelf life — re-verify rather than trusting
   this table on a host you have not measured yourself.
3. **Sitemaps here are stale and cannot be trusted as the source of truth.**
   - `suaescolha.com`: sitemap listed 62 articles, the site's own `/mapa.html`
     lists **75**. Pure discovery would have silently dropped **17%** of the
     source. Fix: pin the missing ones in `seedPaths` — `acquire.ts` unions seeds
     with discovered URLs.
   - `everystudent.ro`: **25 of 85** article URLs 301 to the homepage. They are
     now **hard-blocked by URL** — see rule 1c, which reversed an earlier and
     wrong "the floor will drop them" decision. **Expect ~64 docs, not 102. A
     shortfall is not a failure.**
   - **Always cross-check the sitemap against the site's own HTML sitemap page**
     (`/mapa.html`, `/sitemap.html`, `/plan.html`, `/m/sitemap.html`).
4. **`sitelevel_noindex` is a custom ELEMENT, not a class** (hence no leading dot
   in the entries — that is correct, not a typo).

   ⚠️ **CORRECTED 2026-07-29 — it is NOT malformed on every host.** This rule
   previously claimed the malformation was universal. Six batch-2 hosts measured
   the opposite: on `pl`, `hu`, `tr`, `vi`, `fa` and `et` the tag is
   **well-formed and already contains the share widget**, making
   `.shareiconsmenupg` a **0-char no-op**. Those entries keep the selector as a
   cheap drift guard and say so honestly rather than claiming it strips.
   **#128 is host-specific, not estate-wide** — cite it only where measured.

   Where it IS malformed the damage is worse than "doesn't contain the widget":
   on `mn` the tag opens at line 176 and closes at 202, *inside*
   `.contentpadding` and before the article starts at 212, which pops the
   element stack and destroys `#content4`, `.contentpadding` **and** `<body>`.
   That is the mechanism behind every `["html"]` host (`ko`, `sq`, `mn`).

   Where it is malformed, strip **`.shareiconsmenupg`** explicitly.
   Measured inside `.contentpadding` on 2026-07-28: it removes 83 ch (`ru`),
   102 (`ro`), 109 (`de`), 148 (`es`), 154 (`pt`) — real chrome, so keep it. It
   does **not** exist at all on `studentinjapan.com` (`ja`), where the site's
   marker is an HTML comment no selector can target.
5. **`.relatedbottom` is dead config** — declared in CSS, never an element, on
   every host measured. Kept for parity; label it a no-op, don't claim it strips.
6. **Signup landing pages clear `minContentLength` and must be blocked by URL.**
   The `/john`·`/jean`·`/juan`·`/joao`·`/ioan` Gospel-of-John email study and the
   `/aventure`·`/aventura`·`/abenteuerreise`·`/pack` series are 1,000–2,500 chars
   of form copy. **Length is not aboutness** (slice #10 paid to learn this).
   Every sibling has localized twins — block them before the first fetch.
7. **`/audio/*` and `/v/*` need a measured decision, not a rule.** On
   `cadaestudiante.com` and `duentscheidest.com` the audio pages are the same
   article reflowed (73–86% 12-word shingle overlap) → blocked. On
   `everystudent.ro` the `/v/` pages carry unique transcripts → kept. Measure
   shingle overlap; don't assume.
8. **Watch for near-twin slugs, but measure before dropping.** `ceu`/`ceu2`,
   `gdebog`/`gdyebog`, `nebesnom`/`nebesnom2` all looked like duplicates and were
   all **distinct** (0–12% overlap). Some are literal continuations.
9. **Probe with a full browser UA.** Bare `Mozilla/5.0` → 406 from these hosts.
10. **Give every fan-out agent its own scratch subdirectory** (see §5).
11. **Mixed-case slugs exist** (`/a/pomoshch-ot-Boga.html`,
    `/articulos/Dios.html`). A lowercase-only `articleHints` regex silently drops
    them.
12. **⚠️ NEW (batch 3) — the recon table in §8 can be reading a DEAD sitemap.**
    `everystudent.sk` was listed at "44 URLs". That number came from
    `/sitemap.xml`, which is a **2014 fossil** (`generated-on="July 21, 2014"`).
    The live sitemap is Yoast's **`/sitemap_index.xml` with 103 URLs**, and the
    real yield is **83 documents, not 44**. Of the fossil's 27 unique slugs, 23
    now 301 onto URLs already in the live set and 4 are 404 — listing it would
    stage duplicates at old permalinks.

    **So: always check for `/sitemap_index.xml` and read the sitemap's own
    generation date before trusting §8's count.** §8's numbers are recon from
    2026-07-24 and are a starting hypothesis, not a measurement.

    The same host also disproved its own §8 warning: `sk` is **not** the Czech
    Yii app. It is WordPress + Elementor, and 8-gram overlap against all 94
    Slovak bodies is **0.00%** — Czech and Slovak translations of one English
    original share no 8-grams. The single exception
    (`/in/163/koronavirus_jak_prekonat_strach`, 60.1%) is the page `cs` already
    excludes, which confirms it was lifted *from* everystudent.sk.
13. **⚠️ NEW (batch 3) — sitemaps may publish `http://`, and discovery does not
    normalise the scheme.** `everystudent.gr`'s `<loc>`s are all
    `http://www.everystudent.gr/…`. `discover.ts:95-98` filters the **raw
    `<loc>` string**, so the `^https://` pin every sibling uses would have
    discovered **ZERO URLs**. Use `^https?://` unless you have checked.

    The `--dry-run` gate catches this (0 resolved is a hard failure), so it
    cannot ship silently — but you will waste a cycle. Check the sitemap's
    scheme when you write the `allow` regex.

    **Downstream consequence, recorded not solved:** `acquire.ts:47` stores
    `canonicalUrl: normalizeUrl(url)` from the URL **as discovered**, not the
    final URL after redirect, and `normalizeUrl` lowercases the protocol but
    never rewrites `http`→`https`. So `el`'s documents are stored under `http://`
    URLs. Deterministic today; but the dedup key is `(sourceKey, canonicalUrl)`,
    so **if that host ever republishes its sitemap as `https://`, a re-acquire
    creates 32 duplicate documents rather than updating.** See §13 #9.
14. **⚠️ NEW (batch 3) — `*/` inside a docstring code span TERMINATES the
    comment.** `everystudent-it.ts` documented its blocked category indexes as
    `` `/category/*/` `` inside the JSDoc header. The `*/` closed the comment
    block 80 lines early and turned the rest of the file into code — 20
    typecheck errors, none of which named the real cause. Write
    `` `/category/<slug>/` `` instead. Cheap to hit, cheap to fix, confusing to
    diagnose: the first error points at a line that is fine.
15. **Cloudflare's PRESENCE is not a wall — classify on the block-page
    signature.** Batch 3 met it three ways and none needed Firecrawl:
    `mahasiswakeren.com` is Cloudflare-fronted and passed all 67 pages;
    `vrlovazno.com` serves a **Turnstile CAPTCHA** on two mail-form pages and
    still returned HTTP 200 with full HTML to plain `curl`;
    `katramstudentam.lv` (§15) is Cloudflare **and** disallows us by name, which
    is a rights problem, not a technical one. Reinforces the #114 correction —
    test the response, not the CDN header.

16. **⚠️ NEW (batch 4) — `discover.ts` cannot read a sitemap that uses CDATA.
    This is a REPO DEFECT, not an entry problem.** `igod.co.il` wraps every
    `<loc>` in `<![CDATA[…]]>` (All in One SEO emits this; Yoast and
    xml-sitemaps.com do not, which is why 42 hosts never hit it).
    `discover.ts` reads `loc.text` raw at **lines 87 and 95**, and
    node-html-parser returns the CDATA wrapper as literal text. Both branches
    break, differently:

    | Branch | Line | What happens |
    |---|---|---|
    | `<sitemapindex>` → child sitemaps | 87 | the wrapper string is queued and passed to `fetch` → **`TypeError: Invalid URL`, the whole acquire dies** |
    | `<urlset>` → page candidates | 95 | the string fails every `^https://…` `allow` regex → **silently discovers 0 URLs** |

    The fix is to unwrap before use:
    ```ts
    const raw = loc.text.trim();
    const m = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(raw);
    const u = (m ? m[1] : raw).trim();
    ```
    **Deliberately NOT done on this branch** (same call as `extract.ts` and
    `normalizeUrl` — see §12 and §13 #5/#9). Note this one is *provably* inert
    for every existing source: a `<loc>` starting `<![CDATA[` is never a valid
    URL, so today it can only crash or be dropped. Filed as §13 #10.
17. **⚠️ NEW (batch 4) — the batch-3 word-boundary guard is WRONG for Indic
    scripts, and it fails in the direction that FABRICATES evidence.** Batch 3
    established `(?<!\p{L})…(?!\p{L})` for separating Croatian from Serbian.
    In Devanagari, vowel signs (ा ो ं ्) are `\p{M}`, not `\p{L}` — so that
    guard happily matches Nepali `छ` inside Hindi `छोटा` and `है` inside `हैं`.

    The `hi` agent's first pass reported **594 false `छ` hits** and inflated
    `है` by 1,193; it looked like genuine Nepali signal on a Hindi site. Caught
    only because the agent re-derived it. **Correct guard:**
    ```js
    (?<![\p{L}\p{M}\p{N}])…(?![\p{L}\p{M}\p{N}])
    ```
    With it, the two hosts separate cleanly and independently: `hi` is Hindi
    (है 2,788 / छ 2, and both `छ` are `छ:`, the numeral "six"), `ne` is Nepali
    (छ 325 / है 0). Applies to any abugida — Devanagari, Tamil, Telugu,
    Bengali, Myanmar, Ge'ez. The Latin/Cyrillic form of the rule is unaffected.
18. **⚠️ NEW (batch 4) — Burmese has an encoding hazard a charset check cannot
    see: Zawgyi vs Unicode.** Both use the same Myanmar block (U+1000–U+109F)
    with different meanings, so a Zawgyi page is not mojibake — it is valid
    UTF-8 that renders as garbage. `everymyanmarstudent.com` is **Unicode**,
    proven three ways: the string "zawgyi" appears 0 times across all 38 pages;
    U+103A (asat) 38,109 vs U+1039 (virama) 1,101, a ~35:1 split that Zawgyi
    inverts; and Zawgyi's repurposed codepoints U+1033/U+1034/U+1064 are all 0.
    If a future Myanmar-script host inverts that ratio, the stored text is not
    retrievable and no charset header will tell you.

19. **⚠️ NEW (batch 5) — Apache directory autoindex is open on some hosts, and
    it is GROUND TRUTH.** `1patasxan.com` and `everytemhari.com` both return a
    real `Index of /a` listing at `/a/`. That beats every other net, because it
    reads the filesystem rather than the site's own links — it shows files that
    **no map lists and no page links to**.

    It let the `ti` agent *prove* its article count is exactly 14 rather than
    merely consistent with 14, by cross-checking the directory against the HTML
    map and the site's own search index. It also exposed two editor leftovers
    invisible to every other method: `/a/fol copy.html` (2,636 chars, with a
    literal space in the filename) and `/a/peace copy.html` (**96.0% overlap**
    with `/a/peace.html`). Both correctly excluded — but a discovery policy
    that crawled the directory would have staged them.

    **Try `curl <base>/a/` on any host before trusting a map.** It costs one
    request. Where it works it is definitive; where it 404s you have lost
    nothing.
20. **⚠️ NEW (batch 5) — the scripture policy was never applied to
    `everystudent-ar`, and that source is LIVE IN PROD.** Its seeded
    `/a/whowas.html` is **23,624 chars of the Gospel of John**. The page's own
    opening says the passages are «مقتطفات مأخوذة مباشرة من إنجيل يوحنا …
    **دون إضافة لأي تعليق**» ("excerpts taken directly from the Gospel of John
    … without adding any commentary"), then runs `يوحنا 3` ("John 3") as a
    chapter heading over continuous verse text — 17 chapter references in all.

    It is **the same page this campaign blocked on six other hosts**: `bn`
    (22,236 ch), `te` (23,429), `ms`, `om`, `sq`, `uk`. And `everystudent-ar`
    is the entry that **set the precedent** — its docstring excludes four
    `/bible/**.pdf` files with the exact wording the 2026-07-29 estate-wide
    policy later quoted. It simply never applied that reasoning to its own
    `/a/whowas.html`. Its `/john.html` seed (1,473 ch) is the signup page every
    other sibling also excludes.

    **Checked, and the finding is exactly one document.** The other two prod
    sources are clean: `-fr`'s `/a/215bible.html` ("Pourquoi Vous Pouvez Croire
    la Bible", 31,558 ch) and `everystudent`'s `/features/bible.html` ("Can You
    Trust the Bible?", 22,711 ch) are both apologetics *about* the Bible and
    correctly kept.

    **NOT for this branch** — it touches a prod source, same reasoning as #128.
    Belongs with #123/#128 as prod-corpus work. §13 #13.

### Ingest-stage notes (Phase 3 — not acquisition concerns)

✅ **The 500-char/CJK worry below did NOT materialise on the first source
indexed.** `everystudent-am` came out **41/41 `am`, zero `null`** — see §6
Phase 3. That is one source and a non-CJK one; the CJK note still stands
untested until `zh-cn` / `zh-tw` / `ja` / `ko` land.

Recorded here so they are not lost, but **do not act on them during Phase 1–2**:

- The **500-char detection floor** (ADR-0007) interacts badly with CJK: a full
  Chinese article can be ~1,200 chars, and short-but-legitimate pages
  (`/a/followup` 298 ch, `/john/john37` 310 ch) will store `language = null` and
  drop out of `language:"zh"` filtered retrieval. Observe and report at Phase 3.
- **`zh` is a colliding label.** `thelife-zh` (Simplified), `everystudent-zh-cn`
  (Simplified) and a future `everystudent-zh-tw` (Traditional) all declare `zh`.
  Language-filtered retrieval cannot separate them. Same for `ru` /
  `ru-ca` (studentstan.com). Recorded as an observation; **not solved here.**
- **The standing null-language policy is unchanged and settled** — nulls are
  expected, excluded from eval, surfaced on the dashboard. Do not re-open it, do
  not propose a sweep. `pnpm lang:sweep` is a prod corrective tool and is never a
  campaign step.
- `studentinjapan.com` and `everykoreanstudent.com` serve **UTF-8** but send a
  bare `content-type: text/html` with **no charset parameter**. A client
  defaulting to ISO-8859-1 would mojibake every page. (Observed clean in the
  2026-07-28 acquire — Node's `fetch` handled both correctly.)
- **Measured after batch-1 acquire (2026-07-28), to watch at Phase 3:**
  - `everystudent-zh-cn` min body is **322 chars** and its mean is **2,882** —
    by far the shortest of the eight. The 500-char detection floor (ADR-0007)
    will label some of these `language = null`, exactly the CJK interaction
    already flagged above. Expect it; do not "fix" it.
  - `everystudent-es` has one **100,409-char** document,
    `/articulos/biblia_juan.html` ("El Evangelio de Juan") — the full text of
    John's Gospel on an article URL. Correctly extracted, not chrome, but it is
    4× the next largest and will chunk heavily. Decide at Phase 3 whether a full
    scripture book belongs in this corpus or should be blocked.
  - `everystudent-ja` min body is **841 chars**, the next-shortest after
    `zh-cn`.

---

## 10. The agent prompt that worked (reuse verbatim, swap the facts)

🔴 **This is the batch-3 version, rewritten 2026-07-29. Use THIS, not your
memory of the earlier one.** It differs from the batch-1/2 prompt in five ways
that each cost real investigation, and the old text actively contradicts the
current rules:

| Was | Now | Why |
|---|---|---|
| "ship ONE selector, never a fallback" | append `"html"` LAST when the primary has no 0-char matches | rule 1e — three real articles were nearly lost to this |
| "`.contentpadding` is the real container" | there is **no** safe default | rule 1d — `.contentpadding` was the 0-char shadow on `sq` |
| "`.shareiconsmenupg` REQUIRED, markup is malformed" | measure it; it is a 0-char no-op on most hosts | rule 4 correction |
| "falls back to `<body>`" | usually falls back to the **whole document** | rule 1c correction — `<body>` is absent on most of this estate |
| (no scripture guidance) | block full Bible books | §12 decision, 2026-07-29 |

Substitute the **bold** placeholders per domain. Append any per-host warning
from §0/§8 (script neighbours, template outliers, tiny yields) as a SPECIAL
CARE block at the top — batch 3 did that for `sk`, `hr`, `mk` and `ms` and all
four warnings paid off, two by being disproved.

```
Write ONE new source registry entry for the jesusfilm-rag repo at
<REPO>. The branch `feat/everystudent-siblings` is already checked out — do not
switch or create branches, do not commit.

TARGET: EveryStudent sibling domain — **<LANGUAGE> (`<code>`)**, host
**<domain>**, ~<N> sitemap URLs (per prior recon; verify).

## Deliverable — exactly two new files, nothing else
1. `src/registry/everystudent-<code>.ts` exporting
   `export const everystudent<Camel>: SourceEntry`
2. `src/registry/everystudent-<code>.test.ts` — vitest

## HARD CONSTRAINTS
- Do NOT edit `src/registry/index.ts`. The orchestrator owns that barrel. Your
  entry will not be importable during your run and your test would fail if
  executed — that is expected and correct. Do not try to fix it.
- Do NOT run pnpm, npm, npx, tsx, vitest, psql, docker, git commit/checkout/branch.
  No builds, no test runs, no database. Do not self-verify with `pnpm typecheck`.
- Probe with `curl` only (`-m 20`), using a FULL browser UA string — a bare
  `Mozilla/5.0` gets 406 from these hosts.
- Your scratch directory is <SCRATCH>/<code>/ — use ONLY that path. Sibling
  agents run concurrently and generic filenames WILL collide.

## Read first
`src/registry/types.ts`, `src/registry/everystudent-fr.ts` (field shape +
docstring standard), `src/registry/everystudent-pl.ts` and
`src/registry/everystudent-sq.ts` (a clean `.contentpadding` host and an
`html`-container host), `src/registry/thelife-fr.ts` (discovery-mode
precedent), `src/registry/everystudent-fr.test.ts` (test pattern),
`src/acquisition/extract.ts` (how selectors are actually applied).

## Recon you must actually perform — measure, never assume
1. robots.txt — fetch it. Record Disallow rules and whether they touch articles.
   NOTE: the acquire path does NOT enforce robots.txt, so anything robots
   disallows must be blocked by URL BY HAND in your entry. If robots says
   `Disallow: /` for `*`, STOP, write nothing, and report it — that is a
   correct outcome, not a failure.
2. Sitemap — fetch `/sitemap.xml` (try with and without `www.`). Count URLs.

   ⚠️ **ALSO try `/sitemap_index.xml`, and read the sitemap's own generation
   date.** `everystudent.sk` was catalogued at "44 URLs" from a `/sitemap.xml`
   that turned out to be a **2014 fossil**; the live Yoast index had 103, and
   the real yield was 83 documents. The URL count in your brief is RECON, not a
   measurement — verify it and report any delta.

   ⚠️ **Check the SCHEME of the `<loc>`s.** `everystudent.gr` publishes
   `http://` URLs, and `discover.ts` filters the RAW `<loc>` string without
   normalising, so an `^https://` pin would discover ZERO. Use `^https?://` if
   the sitemap is http, and say which you used.

   THEN cross-check against the site's own HTML sitemap page (/mapa.html,
   /sitemap.html, /plan.html, /m/sitemap.html, /peta.html …). These sitemaps
   are STALE: one sibling's was missing 17% of its articles, another lists 25
   dead URLs, one omits a whole section. If the HTML map has articles the XML
   sitemap lacks, pin them in `seedPaths` — acquire.ts unions seeds with
   discovered URLs. Also harvest every internal href across the pages you
   fetch; batch 3 found live articles that were in NEITHER map that way.
3. At least 3 real article pages, and check candidates on MORE THAN ONE page.
   Determine which selector wraps the body — and verify by EXTRACTED TEXT
   LENGTH using node-html-parser exactly as extract.ts does, NOT by grepping
   for the class name. Every FreeFind host declares .content4 in an inline
   <style> block, so a grep false-positives every time.

   ⚠️ READ THIS TWICE — it broke 5 of the 8 pilot entries. `contentSelectors`
   is NOT a fallback chain. extract.ts binds the FIRST selector that matches an
   ELEMENT, even when that element extracts 0 characters, and then stops. A
   zero-text match SHADOWS every working selector after it.

   ⚠️ AND THERE IS NO SAFE DEFAULT. Do not assume `.contentpadding` just
   because most siblings use it — on `pyetjetejetes.com` it matched 52 of 78
   pages and extracted **0 chars on every one**, and the only container was
   `html`. NINE generators have been measured across 32 hosts:
   `.contentpadding`, `html`, `.content4`, **`#content4` (an ID, not a class)**,
   `.cb-entry-content`, `.entry-content`, `.post-content`, `.contentleftpadding`,
   `.article-content`, `.content`. Measure EVERY candidate on THIS host and
   report each one's char count — including the zeros. "`.content4` matched,
   0 chars" is a required line in your report.

   **Then ship the SINGLE measured selector FIRST**, never the sibling list.
   ✅ **You MAY append `"html"` as a LAST entry** — and should, if the primary
   has ZERO matched-but-empty pages. It cannot shadow anything (nothing follows
   it), it only fires when the primary misses, and it beats extract.ts's
   implicit `?? root` because `<html>` is a real element and carries no literal
   `<!DOCTYPE html>` text node. Pair it with `"head"` in `stripSelectors` (0
   chars on healthy pages; drops the duplicated `<title>` on the fallback path —
   safe because extract.ts reads the title from `root` at line 43, BEFORE the
   strip loop at line 52). If the primary CAN match at 0 chars, the fallback
   never fires — that host needs `["html"]` outright.
4. Chrome to strip — check `sitelevel_noindex` (a custom ELEMENT, not a class,
   hence no leading dot), `.fccell`, `.fctable`, `.hr2`, `.articledivider`,
   `.relatedbottom`, `.a2a_kit` and `.shareiconsmenupg`. **Measure what each
   actually removes and say so honestly.** `sitelevel_noindex` is NOT malformed
   on every host: on most measured hosts it is well-formed and already contains
   the share widget, making `.shareiconsmenupg` a **0-char no-op** kept only as
   a drift guard. Do NOT repeat "REQUIRED because the markup is malformed"
   unless you measured malformation HERE. `.relatedbottom` has been dead config
   on every host so far. If this is a non-FreeFind generator (WordPress, Yii,
   Angular) these may be absent entirely — say so and OMIT them rather than
   carrying parity no-ops that can never bind.
5. Language — READ THE CONTENT YOURSELF and say what you read, quoting a phrase.
   Confirm it is genuinely <LANGUAGE>, not untranslated English (a real failure
   mode: cru.org's Spanish path served English bodies). Do NOT use, install or
   mention any language-detection library.

   ⚠️ **Do not trust `<html lang>`** — `persoalanhidup.com` declares `lang="id"`
   and serves Malay. ⚠️ **Count with WORD BOUNDARIES** if you are separating
   close languages: naive substring counts gave the *opposite* answer on
   Croatian vs Serbian (`ko` scored 1,354 inside "kako"/"tko", and 0 with
   `(?<!\p{L})…(?!\p{L})`). ⚠️ For a non-Latin script, also fetch the response
   headers: several hosts serve UTF-8 with a bare `content-type: text/html` and
   NO charset parameter — confirm the text is not mojibake.

## Shape of the entry
- DISCOVERY mode (`sitemaps` + `allow` + `articleHints` + `block`), not
  hand-listed seeds — except seeds pinned per step 2. Precedent: thelife-fr.ts.
- OMIT `fetchStrategy` — not walled, plain HTTP is the default. ⚠️ Cloudflare's
  PRESENCE is not a wall: classify on the BLOCK-PAGE SIGNATURE, not the CDN
  header. Hosts have passed traffic while Cloudflare-fronted, and one serves a
  Turnstile CAPTCHA on its mail forms and still returns 200 with full HTML. If
  you DO find a genuine Cloudflare 403 block page, STOP, write nothing, report.
- `languages`: the ISO 639-1 code detection emits (regional variants declare the
  base code, e.g. zh-cn → ["zh"]; note the variant in key/name/docstring).
- `key`: `everystudent-<code>`, matching /^[a-z0-9-]+$/.
- `maxPages`: sitemap count + headroom. `minContentLength: 250`.
  `requestDelayMs: 1000` unless probes suggest otherwise (a slow PHP host
  wanted 2000).
- `trust: "partner"`, `ingestionMode: "html-scrape"`, `defaultCategory: "article"`,
  tags `["everystudent","cru","topic:seeker","lang:<code>"]`, a `rights` line
  matching the siblings.
- ⚠️ **Check the canonical host both ways.** Most siblings 301 apex → `www.`,
  but `everystudent.sk` does the REVERSE (`www.` 301s to the bare apex). Pin
  `domain`/`baseUrl`/every regex to whichever actually serves, or every filter
  misses.
- BLOCK the localized Gospel-of-John signup page and the "adventure/pack" email
  series — they clear minContentLength and only a URL block catches them. Some
  hosts have neither; report an absence you MEASURED rather than omitting
  silently.
- ⚠️ **BLOCK FULL SCRIPTURE — estate-wide policy, 2026-07-29.** Several siblings
  carry complete or abridged Bible books on article URLs (98k–100k chars).
  Policy: "public-domain Scripture text rather than ministry writing — outside
  what this corpus answers from." Watch for a third-party Bible-society
  copyright too (© Eesti Piibliselts, © Tyndale House Foundation) — our
  `rights` line would misattribute it. An apologetics essay *about* the Bible
  is NOT scripture: keep it, and say how you told them apart.
- BLOCK the homepage, nav/menu indexes, and ANY sitemap URL you find redirecting
  (301/302) to the homepage. ⚠️ Never argue "minContentLength will drop it".
  When no contentSelector matches, extract.ts does NOT return empty — it falls
  back to `<body> ?? root`, and `<body>` is ABSENT from the parsed tree on most
  of this estate, so the real fallback is the WHOLE DOCUMENT. A sibling shipped
  25 unblocked dead URLs on that reasoning and staged 25 byte-identical copies
  of its homepage. If you do not want a page, block it by URL. Report any
  redirecting URLs you find with the exact list.
- ⚠️ **Do NOT block a real article just because its markup is broken.** If a
  page's container collapses (an unclosed `<span>`, a `</h1>` closing an
  `<h2>`, a `<sup>` missing its `>`), the step-3 `"html"` fallback fixes it.
  Three genuine articles were nearly lost this way in batch 3. Report such
  pages; do not silently drop them.
- ⚠️ Mixed-case slugs exist (`/a/pomoshch-ot-Boga.html`, `/articulos/Dios.html`).
  Use `[^/]+`, not `[a-z0-9-]+`. If slugs carry non-Latin script or `%XX`
  escapes, say so — an ASCII-only hint would drop every one.

## Docstring
Match the siblings' standard, but ONLY claim what you MEASURED. Stamp measured
facts "verified <DATE>: …". Never write a measurement you did not take. Note the
separate-key-per-domain rule (ADR-0006).

⚠️ **Never write `*/` inside the docstring** — not even in a code span like
`` `/category/*/` ``. It terminates the JSDoc block and turns the rest of the
file into code; it cost 20 typecheck errors on `everystudent-it.ts`, none of
which named the real cause. Write `` `/category/<slug>/` `` instead.

## Tests
Model on everystudent-fr.test.ts. Assert what would be costly to silently undo:
domain, languages, discovery-vs-seed mode, the selector you measured binding
FIRST, the absence of the 0-char shadow selector, the strip list,
separate-key-per-domain, and any URL block encoding a real decision (scripture,
dead redirects, robots). 4–6 focused tests. Do not pad. **Do not write a test
that asserts a field equals what you typed for its own sake** — that tautology
is what let 5 broken entries through the pilot.

## eslint: `max-lines: 300` (comments excluded) on the entry file.

## Report back — tight
- domain + sitemap count (and any delta from the brief's recon number) + which
  sitemap file you used + the `<loc>` scheme + article pattern + HTML-map
  cross-check delta, listing any URLs you pin as seedPaths
- EVERY candidate selector with its measured extracted char count across at
  least 2 pages (including the zero ones — "`.content4` matched, 0 chars" is a
  required line), which one you shipped FIRST, and whether you appended `"html"`
- robots.txt verdict, and any path you blocked by hand to honour it
- language confirmation in your own words, quoting a phrase you read; plus
  script/encoding notes for a non-Latin host
- what each strip selector actually removed, in chars (0 is a fine answer)
- anything surprising, or any call the orchestrator must make
```

---

## 11. Corpus issues filed

- **[#128](https://github.com/JesusFilm/jesusfilm-rag/issues/128)** — share-widget
  chrome embedded in all three **existing** EveryStudent sources, **live in prod**:
  `everystudent` 97/117 docs · `everystudent-ar` **67/67** · `everystudent-fr`
  **67/67** (232 chunks total). Fix is one selector (`.shareiconsmenupg`) plus a
  re-extract — no re-fetch, no Firecrawl credits.
  **Deliberately NOT part of this campaign's branch or PR** — it touches three
  existing sources and would make the 48-source PR unreviewable.
- Related open: **[#123](https://github.com/JesusFilm/jesusfilm-rag/issues/123)**
  content soundness, estate-wide (found in `-ar`, confirmed in `-fr`).
- **[#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129)** (new,
  2026-07-29) — whether `everystudent-sr` is a listable retrieval source at all,
  given our own network blackholes it. Blocks only `sr`. **The fix is NOT an
  `/etc/hosts` line** — see §4.
- **[#131](https://github.com/JesusFilm/jesusfilm-rag/issues/131)** (new,
  2026-07-30) — `everystudent-ar` seeds a **full Gospel of John** (23,624 ch),
  **live in prod**, against the scripture policy that entry itself established.
  Exactly one document; the other two prod sources were checked and are clean.
  Deletion, not re-acquisition — no Firecrawl credits. Rule 20.
- **[#132](https://github.com/JesusFilm/jesusfilm-rag/issues/132)** (new,
  2026-07-30) — whether `everystudent-he` (igod.co.il) belongs in the corpus:
  **not a Cru property**, 1,020 articles rather than the ~5 #111 recorded, and
  a CDATA sitemap `discover.ts` cannot parse. Carries the full recon so the
  entry is a short write if the answer is yes.
- **[#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133)** (new,
  2026-07-30) — `lv` (katramstudentam.lv): `robots.txt` disallows `ClaudeBot`
  **by name**, so this is a rights question, not a crawling one. Recommends
  asking Agape Students Latvia. Also records that robots compliance on this
  estate has now been hand-patched **five times** because the acquire path
  never reads `robots.txt` (§13 #7).
- 🔴 **NOT YET FILED — needs an issue (found 2026-07-31, §0.4 finding 3).** The
  LLM language detector's `DEFAULT_MAX_OUTPUT_TOKENS = 200`
  (`src/adapters/openrouter/openrouter-language-detector.ts:34`) can truncate a
  correct response mid-`evidence`-string, which the adapter then rejects as
  `response was not JSON`. Hit **1 document in 409** (an Albanian page —
  diacritic-heavy text tokenises poorly). The row is left untouched and logged as
  an anomaly, which is correct behaviour, **but the failure is indistinguishable
  from an honest abstain in the report's "Left null" section** — on a big run it
  reads as a detection limit rather than a bug. Two candidate fixes: raise the
  cap, or cap the `evidence` field length in `SYSTEM_PROMPT`. A plain re-run
  fixed this instance.

## 12. Decisions made

| Date | Decision | Why |
|---|---|---|
| 2026-07-28 | Campaign file, not 48 `/slice` runs | Only acquisition is per-source; ingest/eval are already bulk. ~300 operator gates avoided. |
| 2026-07-28 | Fan out on registry authoring only | It is the sole per-source unit with no shared state. |
| 2026-07-28 | Discovery mode over hand-listed seeds | Sitemaps reachable, plain HTTP free. Seeds used only to patch stale sitemaps. |
| 2026-07-28 | Branch `feat/everystudent-siblings` off `origin/main` | New work; `slice/everystudent-fr` was already merged upstream. |
| 2026-07-28 | #128 kept out of this branch | Keeps the 48-source PR reviewable. |
| 2026-07-28 | Batch 2 sized at 12 | Pilot of 8 was comfortably reviewable. |
| 2026-07-28 | `contentSelectors` ships ONE measured selector, never the sibling chain | A zero-text match shadows everything after it (rule 1b). 5 of 8 pilot entries extracted 0 chars because `.content4` — an empty spacer — was listed first. |
| 2026-07-28 | Live-extraction check added to the Phase-1 gate | `--dry-run` fetches nothing and the unit tests are tautological, so neither can see a broken selector. Only running `extractContent` on a real page can. |
| 2026-07-28 | `extract.ts` NOT changed on this branch | Preferring the first text-yielding selector would fix the trap globally but alters extraction for all sources incl. the 3 live in prod. Raised as open question #5. |
| 2026-07-28 | `ro`'s 25 dead URLs hard-blocked, reversing the earlier call | The "self-policing floor" reasoning ignored the `<body>` fallback; the real run staged 25 identical nav pages (rule 1c). 25-branch alternation is the cheap fix. |
| 2026-07-28 | `ja` keeps `.content4` first — deliberately not normalised | It is a genuine container there and carries the category kicker that `.contentpadding` omits (11 ch/page). Switching would lose the kicker on 79 pages to fix 0. Mixed-host caveat documented in the entry. |
| **2026-07-29** | **Scripture is excluded estate-wide** | Five hosts carry full Bible text and were being handled three different ways in one PR. `everystudent-ar` already set the precedent for its `/bible/**.pdf`: "public-domain Scripture text rather than ministry writing — outside what this corpus answers from." Applied uniformly: `et` `mn` `fa` already blocked; **`sq` `/a/gjoni.html` (98,887 ch) and `es` `/articulos/biblia_juan.html` (100,409 ch) newly blocked**, and the `es` row deleted from `raw_documents`. `et`'s chapters were additionally © Eesti Piibliselts — a third-party rights holder our `rights` line would misattribute. |
| **2026-07-29** | **`bg` ingested despite being a pre-launch staging site** | Operator call. Cru owns the property. All automated signals say keep out (`Disallow: /`, `noindex` header + meta, staging canonicals). Recorded prominently in the entry so nobody "fixes" it later. |
| **2026-07-29** | **`bg` is SEED mode, not discovery** | Its 84 article `<loc>`s all name `staging.everystudent.bg`. Discovery would stamp a staging host into `canonical_url` — the dedup key — for all 84 documents, needing a rewrite at launch. `www` serves the identical pages at 200, so the paths are hand-listed against a `www` baseUrl. Precedent for seed-only: `everystudent-ar`. |
| **2026-07-29** | Batch 2 sized at 12, and it held | 12 concurrent agents, no scratch collisions (per-agent subdirectories worked), 11 clean entries + 1 correct refusal. Reviewable. Keep 12 for batch 3. |
| **2026-07-29** | `bg`'s agent was right to STOP and write nothing | It hit a robots `Disallow: /` and a staging canonical and escalated instead of shipping. That is the behaviour the prompt asks for; the recon it returned made the entry a 20-minute write once the operator decided. |
| **2026-07-29** | **Batch 3 sized at 12, and it held again** | 12 concurrent agents, zero scratch collisions, 12 clean entries, 0 refusals. Second consecutive clean run at 12. Keep 12 for batch 4. |
| **2026-07-29** | **`contentSelectors` may carry a trailing `"html"` — rule 1e** | Orchestrator call. Rule 1b forbids an *unmeasured selector FIRST*; a trailing entry shadows nothing, and `<html>` beats `extract.ts`'s implicit `?? root` because it carries no `<!DOCTYPE html>` text node. Proven inert: all 24 batch-3 gate probes returned **byte-identical** values before and after. Applied to the 8 hosts whose primary has zero matched-but-empty pages, with `head` added to `stripSelectors`. |
| **2026-07-29** | **Three articles un-blocked that had been dropped over the doctype artefact** | `th` `/a/300whatislife.html` (10,449 ch), `lt` `/m/istorija.html` (20,148 ch), `bn` `/a/followup.html` (3,255 ch, pinned as a seed). All verified extracting clean under rule 1e. `bn` had blocked one page while KEEPING another with the identical defect — the calls contradicted each other. Losing a real article to avoid 15 cosmetic characters is the wrong trade. |
| **2026-07-29** | **`lt` `/m/istorija.html` exempted from the blanket `/m/` block** | Every sibling blocks `/m/` as navigation. Before reversing that here, the `/m/` namespace was probed on `ru`, `pl`, `hu` and `tr`: **nothing above 3,589 ch**, and the only two over 3k are a sitemap page and an "about us". So `lt`'s 20,148-ch testimony page is a genuine one-off, **not** content the blanket block has been quietly eating across 20 sources. No systemic loss to fix. |
| **2026-07-30** | **Batch 4 sized at 11 (all that remained), and it held a third time** | 11 concurrent agents, zero scratch collisions, 11 clean entries, 0 refusals, and **all 10 acquirable hosts staged 100% with zero skips** — the campaign's first perfect acquire. The §10 prompt's corrections-first design is now proven three consecutive rounds. |
| **2026-07-30** | **`he` deferred rather than acquired, on THREE grounds** | Orchestrator call, escalating rather than deciding. The entry is sound and gate-passed, but (1) `discover.ts` cannot parse its CDATA sitemap, (2) igod.co.il is **not a Cru property** — footer `© המכללה למקרא`, zero Cru/EveryStudent markers site-wide — so our `rights` line and `cru` tag would misattribute it, and (3) at **1,020 articles** it is 47% of the campaign corpus, which is a composition question, not a technical one. Only (1) is answerable in code. Same escalation shape as `bg` on 2026-07-29. |
| **2026-07-30** | **The CDATA fix to `discover.ts` NOT made on this branch** | Consistent with `extract.ts` (#5) and `normalizeUrl` (#9): shared acquisition code changes get their own issue. Noted honestly that this one is *provably* inert for the other 42 sources — a `<loc>` beginning `<![CDATA[` can only crash or be dropped today — so the argument for deferring is consistency and reviewability, not risk. §13 #10. |
| **2026-07-30** | **`om` shipped as `languages: ["om"]` despite the detector being unable to emit it** | The registry declares what the source *is*, not what the detector can recognise. `tinyld` has no Oromo model, so 17 of 18 documents will store `language = null` and one stores `'ber'`. Declaring anything else would be a lie in the entry to paper over a gap in a different module. Recorded as §13 #11. ✅ **Vindicated 2026-07-31:** the LLM sweep labelled all 18 `om` at confidence 1.00. Declaring the truth and letting a *different* module catch up was the right call. |
| **2026-07-31** | **Language corrected with `--source … --mode full` per source, NOT `--all`** | The corpus is 13,969 documents and had already had a full sweep before this campaign. `--all --mode full` would re-audit ~13,000 already-correct rows to fix 406. Eight sources needed `full` (they carried wrong labels); sixteen needed only `blanks`. Per-source also means per-source changelogs, so a bad relabel reverts without touching the others. Ran as 8 dry-runs → review → 8 applies → 16 blanks-applies. |
| **2026-07-31** | **Applied all eight `--mode full` relabels without a per-source operator pause** | The Step-1 dry-runs returned 100% resolution to the declared language at confidence 0.99–1.00, with **zero** rows in the report's "Eyeball these" list and zero left null. There was no ambiguous call to escalate. Had any source come back mixed, or with a relabel *away* from its declared language, that would have been a stop. |
| **2026-07-31** | **§0.2's hand-maintained damage table treated as untrustworthy; fix list re-derived by SQL** | The table undercounted by 26 documents — it filed `everystudent-fa` under §0.3 as nulls-only and missed that 26 Persian pages were labelled `ar`, colliding with a source already live in prod. A table maintained by hand across five batches drifts; a query against the registry's declared `languages` cannot. Query preserved in §0.4. |
| **2026-07-29** | **`sr` deferred, and the `/etc/hosts` workaround explicitly rejected** | Jaco's call, reversing the earlier "add a hosts entry" decision. A host our own network filters cannot be listed as a publicly available retrieval source on the strength of a machine-local override — the workaround would hide the question rather than answer it. Tracked in [#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129). Note the domain IS publicly resolvable (both DoH providers return the real IP); what needs deciding is why our gateway blackholes it. |

## 13. Open questions for the operator

**Answered 2026-07-29:** scripture policy (now §12), `bg` (ingested, §12),
`sr` network route (hosts entry, §4).

1. **Eval shortlist (§7)** — confirm `es`/`zh`/`ru`/`pt`/`de`/`ja`/`ko` get real
   golden cases and the remaining 41 are `evaluate: deferred`, or name a
   different set. **Does not block Phases 1–4.** Batch 2 added 11 more languages,
   **10 of them entirely new to the corpus** (`sq` `fa` `mn` `tr` `cs` `hu` `pl`
   `et` `vi` `bg`) — for those, Stage-4 Part A is a provable no-op. Only `zh`
   (from `zh-tw`) lands in an existing language, and it makes that label
   **three-way ambiguous** (see #6).

   **Batch 3 adds 12 more, and ALL TWELVE are new to the corpus** — `sk` `id`
   `ms` `mk` `lt` `bn` `th` `hr` `am` `it` `ur` `el`. Stage-4 Part A is a
   provable no-op for every one (`corpus-search-store.ts` applies a strict
   `eq(documents.language, …)`, so no existing golden case can resolve to them).
   Running total after batch 3: **31 acquired sources across 30 distinct
   language labels** (`zh-cn` and `zh-tw` share `zh`). Existing golden cases
   cover only `ar` `fr` `en` `es` — so of this campaign's 30 labels, **exactly
   one (`es`) has any golden case today.** That is the scale that makes the
   question real: the "everything else is `evaluate: deferred`" half of the
   proposal now covers **~23 languages**, not a handful.

   ⚠️ One nuance for the shortlist: `it` (Italian) and `el` (Greek) are widely
   read and might deserve real golden cases even though they are new labels;
   `am` `bn` `ur` `th` `mk` `lt` are the ones nobody here can curate. Worth
   splitting the decision by *who can read it*, not by *is it new*.
2. **When to fix #128** — before the 48 land, after, or on its own schedule.
   Note the scope shrank: batch 2 measured `sitelevel_noindex` **well-formed** on
   6 of 11 hosts, so #128 is host-specific (rule 4, corrected).
3. ~~**The 5 sitemap-less domains**~~ — **ANSWERED 2026-07-29, see §15.**
   Hand-listed seeds from each site's own HTML map; **no Firecrawl** (4 of 5 are
   bare Apache serving 200 — there is no wall to pay for). ~234 docs.
   **One residual decision for Jaco: `lv` (katramstudentam.lv).** Its
   `robots.txt` disallows `ClaudeBot` and `CloudflareBrowserRenderingCrawler` by
   name and declares `Content-Signal: ai-train=no,use=reference`. Recommendation
   is to ask Agape Students Latvia (a Cru partner) rather than crawl it. Needs a
   yes/no from you; everything else in §15 is unblocked.
4. **Make the live-extraction gate a checked-in script?** (2026-07-28.) It has
   now been hand-rebuilt from this file **twice**. It caught nothing in batch 2
   — because the agents were told to measure — but it is what *proves* that,
   and it took two extra variants this round (an IPv6 flag for `cs`, an
   offline file-based run for `sr`). Strong candidate for
   `pnpm acquire --source <key> --probe`. Still needs Jaco's yes.
5. **Should `extractContent` skip zero-text matches?** Unchanged, and batch 2
   strengthens the case: `sq` proved even `.contentpadding` can be the zero-char
   shadow (rule 1d), so there is no selector ordering that is safe by
   convention. Still deliberately NOT done on this branch.
6. **NEW — `zh` is now a three-way collision.** `thelife-zh` (uwota.com,
   Simplified), `everystudent-zh-cn` (Simplified) and `everystudent-zh-tw`
   (Traditional) all declare `zh`. Language-filtered retrieval cannot separate
   Traditional from Simplified. Recorded, not solved. `ru` / `ru-ca` will do the
   same when `studentstan.com` lands.
7. **NEW — the repo does not enforce `robots.txt` at all.** The `robots_cache`
   table, the `RobotsEntry` port and both its implementations exist, but **no
   caller in `src/acquisition/` invokes them** — verified 2026-07-29 — while
   `docs/architecture.md:150` declares Acquisition "Owns: … robots (RFC-9309
   longest-match, fail-open)". So that line is aspirational. It surfaced here
   because `bg` serves `Disallow: /` and `sq` disallows a real article path
   (`/a/ungjillin2.html`, blocked by URL by hand as the only thing that would
   honour it). **Deserves its own issue, not this branch** — same reasoning as
   #128.

8. **NEW (batch 3) — do film-transcript pages belong in this corpus?** Same
   shape as the scripture question you settled on 2026-07-29: a content-scope
   call, not a technical one. The "Falling Plates" / video-narration page exists
   estate-wide and agents keep deciding it one host at a time:

   | Source | Page | Extracted | Call | Measured reason |
   |---|---|---:|---|---|
   | `pl` | `/wideo.html` | ~60 one-line captions | blocked | nav URL, chunks badly |
   | `ru` | `/m/vid.html` | — | blocked | nav URL |
   | `sr` | `/a/tanjiri.html` | 33 ch | blocked | stub |
   | `hr` | `/a/razbijeni-tanjuri.html` | 1,321 ch | **kept** | paragraph prose, in both maps |
   | `am` | `/a/plates.html` | 953 ch | **kept** | flagged: ~40 lines, chunks poorly |
   | `id` | 2 pages | ~205 ch/block | **kept** | indistinguishable from articles |
   | `mk` | 3 pages | 1,326–2,098 ch | **kept** | `pl`'s stated reason measured false here |
   | `th` | 8 `-video` twins | 0.1–78.2% overlap | **kept** | below the 87.9% near-dup band |

   The principle each agent applied is consistent — keep paragraph prose, drop
   caption fragments and stubs — and the pages genuinely differ, so this is not
   sloppiness. But it recurs across the remaining 16 domains and is worth one
   ruling. **Exposure is ~1–8 documents per host.** Not blocking.
9. **NEW (batch 3) — should `normalizeUrl` canonicalise the URL scheme?**
   `everystudent.gr` publishes `http://` sitemap URLs, and nothing in the
   acquire path rewrites them (rule 13), so its 32 documents store `http://`
   canonical URLs. The dedup key is `(sourceKey, canonicalUrl)`, so if that host
   ever republishes as `https://`, a re-acquire **creates 32 duplicates instead
   of updating**. The fix is one line in `normalize-url.ts` — but it changes the
   dedup key for **every** source including the three live in prod, so it is the
   same shape as #5 and deliberately NOT done on this branch. Deserves its own
   issue.
10. **NEW (batch 4) — `discover.ts` cannot parse a CDATA sitemap.** Rule 16 has
    the mechanism, the two failure modes and the four-line fix. It is the only
    thing that makes `he` un-acquirable in code terms. **Deserves its own
    issue**, like #7 and #9. Unlike those two, this fix is provably inert for
    every other source, so it is the cheapest of the three to land.
11. ✅ **ANSWERED 2026-07-31 — no ruling needed.** The premise was wrong: `om` is
    undetectable *by `tinyld`*, not undetectable. The LLM sweep (§0.4) labelled
    **all 18 documents `om` at confidence 1.00**, including the `'ber'` row. Same
    for `ka` (Georgian, 16/16 at 1.00), which `tinyld` cannot read at all. The
    original text is kept below because it is the correct diagnosis of the
    *ingest-time* detector, which is unchanged and will do this again on the next
    Oromo source and in prod (§0.4, "does NOT carry to production").

    ~~**NEW (batch 4) — `om` (Oromo) cannot be language-detected at all, and this
    is not fixable in the registry.**~~ `tinyld` has no Oromo model. Pushed
    through the real `decideLanguage` (gate 0.75, floor 500) on all 18 acquired
    articles:

    | Outcome | Count |
    |---|---:|
    | `documents.language = null` — confidence 0.242–0.717, below the gate | **17** |
    | stored as **`'ber'` (Berber)** at 0.784, with an out-of-set warning | **1** |

    Consequence: Oromo documents are retrievable in unfiltered search but
    invisible to a `language:"om"` filter, and one row carries an actively
    wrong label. The standing null-language policy already covers nulls
    (expected, excluded from eval, surfaced on the dashboard) — but that policy
    was written for scattered short documents, not for **94% of one source**.
    The `'ber'` row is the part that is arguably a bug rather than a gap.
    ~~**Not blocking; needs a ruling at Phase 3.**~~ Resolved by the sweep — the
    real lesson is that a source whose language `tinyld` cannot model needs a
    sweep pass wired in **per environment**, not a policy exception.
12. **NEW (batch 4) — is `he` (igod.co.il) in scope at all?** See §4. Three
    questions in one: the code fix (#10 above), whether a **non-Cru** ministry
    belongs under the EveryStudent campaign key with our standard `rights` line
    and `cru` tag, and whether **1,020 documents from one host** — 47% of the
    campaign corpus, ~4× the largest existing sibling — is proportionate. The
    content itself is squarely seeker-facing apologetics and reads as in-scope;
    the attribution and the scale are what need a decision.

13. **NEW (batch 5) — `ru-ca` is a mirror; which of three routes?** See §16 for
    the full measurement and the three options. **Not an agent's call**, and
    the recon needed for any of them is already done.
14. **NEW (batch 5) — `everystudent-ar` carries a full Gospel of John in prod.**
    Rule 20 has the evidence. One document, one prod source, and the policy it
    violates is the one that source's own docstring established. Needs an issue
    of its own, not this branch.
15. **NEW (batch 5) — clean up the 14 doctype-leaking documents before Phase 3?**
    See §4. Seven batch-1/2 entries predate rule 1e. The fix is mechanical and
    costs 7 plain-HTTP re-fetches **now**, versus re-chunking and re-embedding
    **after** `pnpm index`. This is the cheap moment and it closes shortly.
16. **NEW (batch 5) — `ti` will be MISLABELLED, not merely unlabelled.** Worse
    than `om` (#11). `tinyld` carries 61 languages with no `tir` entry, and its
    only Ge'ez-script model is Amharic — so each of the 14 Tigrinya documents
    lands as `null` or as **`'am'` with an out-of-set warning**. `om` at least
    has no competing model to be wrong about. With only 14 documents there is
    no margin for them to be both mislabelled and dropped from `language:ti`
    retrieval. Same root cause as #11; worth one ruling covering both.

## 14. Resume hint (cold start)

### Repo state, exactly
- Branch **`feat/everystudent-siblings`**, tracking `origin/main`.
- **Unpushed commits — read them, do not trust a number written here.**
  ```bash
  git log --oneline origin/main..HEAD
  ```
  ⚠️ This file previously hardcoded the count and it went stale **three times in
  one session** — every commit invalidates it, including the commit that
  updates it. Do not reintroduce a number. The commits are self-describing;
  the command above is the source of truth.

  The campaign's own history, oldest first, as anchors that will not change:
  `6e7f492` batch-1 entries · `2807832` state file + #128 ·
  `6a31631` container fixes + batch-1 acquire · `4cbd1d2` cold-start contract ·
  `9a0fec3` batch-2 entries (11 domains) ·
  `9c60b40` `bg` + estate-wide scripture policy ·
  the docs commits recording batch 2, the `sr` deferral (#129), and §0 ·
  `0e8b1e9` batch-3 entries (12 domains) · the batch-3 docs update and the §10
  prompt rewrite · `4fce4ee` batch-4 entries (11 domains) · the batch-4 docs
  update · `26e8861` batch-5 entries (3 seed-mode domains) · then this file's
  batch-5 update.
- **Nothing is pushed and there is no PR** — that is Phase 6, after all 48 land.
  Do not open one early.
- Working tree clean apart from an untracked `.playwright-mcp/` (unrelated).
- Local Postgres container `jesusfilm-rag-db` on port 5434 must be running.
  Query it with:
  `docker exec jesusfilm-rag-db psql -U jesusfilm_rag -d jesusfilm_rag -c "…"`
- Last full gate: green **2026-07-30**, re-run AFTER the batch-5 acquire —
  depcruise · lint · typecheck · db:check · status:check · **739 tests**
  (was 722 after batch 4, 650 before it, 575 before batch 3, 496 before
  batch 2).

⚠️ **Dates in this file and in the registry docstrings are the dates the work was
MEASURED** — `2026-07-28` for batch 1 (matching `6a31631`), `2026-07-29` for
batches 2 **and** 3 (they ran on the same day; tell them apart by commit, not by
date — `9a0fec3`/`9c60b40` are batch 2, `0e8b1e9` is batch 3). Cross-check
against `git log` and they will agree.

### Where the work stands
**All five batches are through Phase 2. Phase 1-2 are functionally COMPLETE.**
44 sources acquired locally, **2,276 documents**, **zero duplicate-content
groups across all 46 everystudent keys**, `acquire: green` recorded for each.
Per-source counts and full skip accounting: §8.

**Nothing is half-finished.** Both deferrals are decisions, not omissions:
- `everystudent-sr` — network blackhole, see §4 and
  [#129](https://github.com/JesusFilm/jesusfilm-rag/issues/129). Do not add an
  `/etc/hosts` line; that workaround was considered and rejected on purpose.
- `everystudent-he` — see §4. Three open points, only one of which is code.
  Do not "just fix the CDATA parsing and acquire it."

**All the sitemap-reachable domains are done.** What remains of Phase 1–2 is
the 5 sitemap-less hosts in §15.

Nothing has been indexed — Phase 3 runs ONCE, after acquisition is complete.

### Do this next — decisions, then Phase 3 (no crawling left)
0. **Render §0's board back to Jaco as your opening message.** He asked for the
   state as tables, not prose. Regenerate the counts from the DB first (§0.1) —
   do not retype what §0 currently says without checking it.
1. **There is no crawling left to do.** Every acquirable host in the 48 has
   been acquired, and the pre-Phase-3 cleanup is done. Do NOT spawn
   entry-writing agents. The three remaining decisions are filed as
   [#131](https://github.com/JesusFilm/jesusfilm-rag/issues/131),
   [#132](https://github.com/JesusFilm/jesusfilm-rag/issues/132) and
   [#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133), and **none of
   them blocks Phase 3.**
2. **Phase 3 — `pnpm index`.** ⓘ **A canary run is sanctioned and was used**:
   `everystudent-am` was indexed alone first, verified, then bulk. See §6
   Phase 3 for the checks that make a canary trustworthy and the two
   operational findings it produced (ingest-side embed timeouts self-heal; the
   QUERY side needs `QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000`
   or it aborts outright). Drains every pending row across all
   45 acquired sources. This is the expensive step (embeddings); it is
   idempotent on re-run. Expect ~2,281 documents from this campaign plus the
   pre-existing corpus.
   ⚠️ **Re-run the FULL verify gate after ingest**, not just after code changes
   — integration tests query the live Postgres and a data-only change can turn
   them red (slice #3 precedent).
3. **Then Phase 4** (per-language retrieval smoke, scripted — do not hand-run
   45 times) and **Phase 5** (eval, §7), remembering the mandatory env
   override: `QUERY_EMBED_MAX_ATTEMPTS=8 QUERY_EMBED_TIMEOUT_MS=25000 pnpm eval`.
   `pnpm eval` has **no resume** and one transient blip discards the whole run.
4. **Then Phase 6 — ONE PR** for the campaign, lowercase title (commitlint),
   `gh auth switch --user jaco-brink` first.
5. **Regenerate §0's board before you finish** (§0.1). This is the last step of
   every session, not an optional tidy-up.

**If you DO end up writing another entry** (e.g. Jaco picks option 2 for
`ru-ca`, or answers `lv`): read §9 rules 1b–1f, 2, 4, 12, 13, 16, 17 and 19
first. The newest reverse or correct earlier advice — **1f** (`.articletitle`
is a shadow trap extracting a plausible non-zero number), **2** (probe `#x` as
well as `.x`; #111's outlier flags were wrong in *both* directions), **16**
(CDATA sitemaps break discovery), **17** (the Slavic word-boundary guard
fabricates evidence on Indic scripts), **19** (try `curl <base>/a/` — Apache
autoindex is ground truth where it is open). For a seed-mode host the §10
prompt must be adapted, as it was for batch 5: `baseUrl` + `seedPaths`, no
`sitemaps` and therefore no `block`, and **HEAD-sweep every harvested URL**.

**Expect an agent to refuse occasionally, and treat that as success.** Three
have now done it and all three were right: `bg` hit a robots `Disallow: /` and
wrote nothing; `he` wrote the entry AND escalated the three things it could not
decide; `ru-ca` measured an 84.1% mirror and wrote nothing. **The refusals have
been among the most valuable outputs of this campaign** — each one caught
something no gate downstream would have.

### Waiting on Jaco — this is now the critical path
**Sixteen** open questions in §13; **two have been answered and closed since**
(#13 `ru-ca`, #15 the doctype cleanup), and three are now filed as GitHub
issues (#131, #132, #133). Nothing blocks Phase 3. Answered on 2026-07-29: the scripture policy, `bg`,
and `sr` (deferred → #129).

**The four that decide what happens next:**

| # | Question | Why it is urgent |
|---|---|---|
| ~~#15~~ | ~~Clean up the 14 doctype-leaking documents~~ | ✅ **DONE** 2026-07-30, commit `2b6f8a0`. 0 leaks remain. |
| ~~#13~~ | ~~`ru-ca` — drop, separate key, or fold into `ru`?~~ | ✅ **DONE** 2026-07-30, commit `185a090`. Separate key, 5 seeds. §16. |
| **#12** | Is `he` (igod.co.il) in scope — not a Cru property, 1,020 docs? | Filed as **[#132](https://github.com/JesusFilm/jesusfilm-rag/issues/132)**. Decides whether the corpus grows by ~45% |
| **#3** | `lv` rights — ask Agape Students Latvia? | Filed as **[#133](https://github.com/JesusFilm/jesusfilm-rag/issues/133)**. Only host nobody has permission to crawl |
| **#14** | `everystudent-ar`'s Gospel of John, live in prod | Filed as **[#131](https://github.com/JesusFilm/jesusfilm-rag/issues/131)**. One document; deletion, no re-fetch |

**Still open, none blocking:** the eval shortlist (#1), #128 timing (#2), the
`--probe` flag (#4), the `extractContent` root-cause fix (#5), the three-way
`zh` collision (#6), **robots.txt not being enforced anywhere in the acquire
path (#7 — now hand-patched five times)**, film-transcript pages (#8),
`normalizeUrl` scheme canonicalisation (#9), the CDATA defect (#10),
~~Oromo being undetectable (#11)~~ ✅ **closed 2026-07-31 by the sweep (§0.4)**,
**`everystudent-ar` carrying a full Gospel of John in PROD (#14)**, and
~~`ti` being actively MISLABELLED `am` (#16)~~ ✅ **closed 2026-07-31 — all 14
`ti` documents relabelled at confidence 0.99–1.00**.

#7, #9, #10 and #14 each deserve their own issue. ~~#11 and #16 are one ruling.~~
✅ **Both answered by the language sweep, no ruling needed** — the LLM detector
reads every language `tinyld` cannot. One NEW unfiled defect replaced them: the
detector's 200-token output cap can truncate a correct verdict into a silent null
(§11, last entry).

---

## 15. The 5 sitemap-less domains — recon and route (2026-07-29)

Answers open question #3. **All five were probed live**; nothing here is
inferred from the other 43.

### Verdict: hand-listed seeds. **Do NOT use Firecrawl.**

**Firecrawl solves a bot wall, not a missing sitemap.** They are different
problems and the campaign has conflated them before. ADR-0012 makes Firecrawl a
per-source opt-in for hosts whose *bytes* are unreachable to plain HTTP; a
missing `sitemap.xml` is a *discovery* problem, and discovery has a cheaper
answer these sites already provide — their own HTML map page.

Measured 2026-07-29: **4 of 5 are bare Apache serving HTTP 200** to a plain
request with a full Chrome UA. Not one returns a Cloudflare challenge or block
page. Spending Firecrawl credits here would buy nothing.

The pattern is already proven twice in this estate — `everystudent-ar`
(68 hand-listed seeds) and `everystudent-bg` (84). Both are seed-only: no
`sitemaps` field, and therefore no `block` array, because the seed list IS the
filter.

| Lang | Domain | Server | HTML map | Articles | Route |
|---|---|---|---|---:|---|
| `ru-ca` | studentstan.com | Apache | `/m/karta.html` | 87 | seeds |
| `uk` | svitstudentiv.com | Apache | `/m/sitemap.html` | 47 | seeds |
| `hy` | 1patasxan.com | Apache | `/m/sitemap.html` | 37 | seeds |
| `ti` | everytemhari.com | Apache | `/sitemap.html` | 14 | seeds |
| `lv` | katramstudentam.lv | Cloudflare | `/lv/lapas-karte/` | 49 | ⛔ see below |

~234 documents in total — roughly one normal batch.

### Per-host notes

- **`hy` `ru-ca` `uk` `ti`** — the standard FreeFind/Apache banner, same family
  as batch 1–2. `robots.txt` is 404 on `hy`, `ru-ca` and `uk` (no rules exist);
  200 on `ti`. Harvest the HTML map, then **verify every harvested URL with a
  HEAD sweep before seeding** — `sr` taught us that a map can list dead URLs,
  and `mn`/`cs` that a map can hold articles the XML never had.
- **`ru-ca` (studentstan.com)** is the largest at 87 and will collide with `ru`
  (mirstudentov.com) on the `ru` language label — the same ambiguity as `zh`
  (§13 #6). Record it; do not try to solve it here.
- **`ti` (everytemhari.com)** yields only ~14 articles. Cheap, but check whether
  it is worth a source key at all before writing the entry.

### ⛔ `lv` (katramstudentam.lv) — a RIGHTS blocker, not a technical one

Do not treat this as "the hard one to crawl". Technically it is easy: the
apex serves a **meta-refresh** to `/lv/` (which `curl -L` does not follow —
that is why it first looked empty/JS-rendered, and it is neither). Behind it is
ordinary server-rendered HTML, 43 internal links on the homepage and a
`/lv/lapas-karte/` map listing 49 article-shaped pages.

The blocker is what its `robots.txt` says. Fetched live 2026-07-29:

```
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: ClaudeBot                       Disallow: /
User-agent: GPTBot                          Disallow: /
User-agent: CCBot                           Disallow: /
User-agent: Google-Extended                 Disallow: /
User-agent: CloudflareBrowserRenderingCrawler   Disallow: /
… (also Amazonbot, Applebot-Extended, Bytespider, meta-externalagent)
```

Three things follow, and they matter:

1. **`ClaudeBot` is disallowed by name.**
2. **`CloudflareBrowserRenderingCrawler` is disallowed by name** — that is
   precisely the class of headless renderer Firecrawl belongs to. Reaching for
   Firecrawl here would not be a neutral technical choice; it would be
   circumventing a preference the operator wrote down explicitly.
3. **`Content-Signal: ai-train=no, use=reference`.** There is a genuine reading
   under which *this* corpus is permitted — we do retrieval with attribution,
   which is `reference`, not `ai-train`. That reading may well be right. **It is
   still not an agent's call to make**, and it does not override the explicit
   `ClaudeBot Disallow`.

**Recommendation:** do not crawl `lv`. The site is Agape Students Latvia — a Cru
partner — so the cheap, correct route is to **ask them for the content or for
permission**, not to out-engineer their robots file. If the answer is no, drop
`lv` from the 48 and record it `deferred` with the reason.

⚠️ Note this is the second host in this campaign whose robots policy we can only
honour by hand, because **the acquire path does not read `robots.txt` at all**
(§13 #7). `sq` needed a manual URL block for the same reason. That gap is now
load-bearing twice over.

---

## 16. `ru-ca` (studentstan.com) — a MIRROR, not a sibling (2026-07-30)

> ## ✅ RESOLVED 2026-07-30 — commit `185a090`
> Registered as `everystudent-ru-ca` with **5 seeds, not 87** (operator's call:
> option 2 below, the one that HONOURS ADR-0006). Acquired 5/5, zero skips, and
> **zero rows share an md5 with any `everystudent-ru` document**.
> `/a/jfil.html` — the 6th unique page — was excluded as JESUS-film promo copy
> (~400 ch of prose before the nav), the same class as `everystudent-ro`'s
> skipped `/v/filmuliisus.html`. One line to reverse.
> 🔴 **Do NOT "complete" that seed list from the site's own map.** Its test
> asserts `toHaveLength(5)` and names four of the ≥99% duplicates precisely to
> stop that.

**The batch-5 agent wrote nothing and escalated. That was correct.** This is
the campaign's second correct refusal, after `bg`.

### The measurement

12-word shingle overlap of **all 87** studentstan articles against the **full
99-article** `everystudent-ru` corpus (mirstudentov.com) — not a sample:

| Best-match band | Articles |
|---|---:|
| **≥95% — effectively identical** | **42** |
| 80–95% | 25 |
| 50–80% | 14 |
| 20–50% | 0 |
| **<20% — genuinely new** | **6** |

**Mean 84.1%.** Same-slug pairs alone: mean 89.3%, median 94.6%. Worked
examples: `/a/christianstvo.html` **99.8%**, `/a/dostoy.html` **99.7%**,
`/a/abdul.html` **99.4%**.

### Why the LOW scores are not evidence of independence

The agent hand-diffed the lowest same-slug pair, `/a/ad.html` at **52.7%**, and
found the bodies **word-for-word the same translation**. The score is depressed
only because mirstudentov prepends a section kicker and title, and uses
en-dashes where studentstan uses hyphens. **True content identity is HIGHER
than the numbers show.** Do not re-run this and conclude "only half overlap".

Two corroborating signals: **78 of 87 slugs are byte-identical filenames**, and
studentstan's own `/a/fol.html` reads «Я координатор проекта
**Mirstudentov.com**» — the sibling's signup page, not even re-branded.

### Calibration — the same test on genuinely independent hosts

| Pair | Overlap | Verdict |
|---|---|---|
| `ru-ca` vs `ru` | **84.1% mean** | **MIRROR** |
| `uk` vs `ru` | 0.00–0.04% | independent, both kept |
| `ti` vs `am` | 0.0% on all 5 same-slug pairs | independent, both kept |
| `hr` vs `sr` (batch 3) | 0.4–0.9% | independent, both kept |
| `cs` vs `sk` (batch 3) | 0.00% | independent, both kept |

The test discriminates cleanly. A mirror is not a close call.

### Why this matters mechanically

**The ingest dedup gate keys on `(sourceKey, canonicalUrl)`.** Two source keys
means two sets of rows, so ~81 near-duplicate Russian articles would be
chunked, embedded and left to compete with each other in retrieval. Nothing
downstream catches this. It is the same mechanism that let `ro` stage 25
byte-identical homepages (rule 1c), one level up.

### The 6 genuinely unique articles (~31,500 chars)

`/a/aborti.html` (4,679) · `/a/uznat.html` (6,650 — studentstan uses the Four
Spiritual Laws tract where mirstudentov uses «Знать Бога лично») ·
`/a/svetlana.html` (3,273) · `/a/mutniye.html` (12,675) · `/a/rashmor.html`
(3,700) · `/a/jfil.html` (488).

⚠️ Two are judgement calls: **`/a/jfil.html` is 488 chars of film-promo copy**,
and **`/a/mutniye.html` is Carl Wieland / Answers in Genesis material** — a
third-party copyright our `rights` line would misattribute, same shape as the
`et`/`bn`/`te`/`sl` Bible-society catches.

### The options, none of which an agent should pick

1. **Drop `ru-ca` from the 48.** Record `deferred`, reason "mirror of
   `everystudent-ru`". Campaign becomes 47 domains. Cleanest.
2. **Register a 6-seed `everystudent-ru-ca`.** Honours ADR-0006
   (one domain = one key) and keeps the estate complete, at the cost of a
   6-document source. Everything needed is already measured — one pass to write.
3. **Add the 6 paths to `everystudent-ru`'s `seedPaths`.** Cheapest in
   documents-per-effort, but **violates ADR-0006** by serving two domains from
   one key, and would store mirstudentov `canonical_url`s for pages that live
   on studentstan. Not recommended.

### Recon already done, if option 2 is chosen

Seed mode (`/sitemap.xml`, `/sitemap_index.xml`, `/sitemap.xml.gz`,
`/wp-sitemap.xml`, `/robots.txt` all **404** on the canonical `www` host; apex
301s to `www`). **No robots.txt at all**, so no rights blocker. `/m/karta.html`
lists 86 articles; the href sweep adds `/a/fol.html` and `/n/nedos.html`, the
latter a **404** (site-wide typo for `/m/nedos.html`, repeated on 10 pages).

**This host is NOT the FreeFind template** — it is a WordPress theme, and the
container is **`.post-content`** (86/87 pages, 488–25,282 chars, zero empties).
`.content4` matched **0 pages, 0 chars**; it does not exist here in class or ID
form. Ship `[".post-content", "html"]`. Strip `.sectionlink` — this host's CTA,
**7,591 chars across 85 pages**, and the legacy FreeFind strip list is 100%
dead here.

⚠️ **`/a/bibliya.html` is a broken-markup rescue case**: its wrappers are
absent, `#content` closes after 55 chars, and the `"html"` fallback recovers
**32,980 chars** of a genuine apologetics essay about the Bible. It is not
scripture (no chapter-and-verse run, no Bible-society copyright) and must not
be dropped for its markup — rule 1e.
