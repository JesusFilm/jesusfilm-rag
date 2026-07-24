# Slice #8 (everystudent) Stage-4 judge rubric — as run 2026-07-24

_Given verbatim to each of the 3 lens agents (theologian / pastor / mature
Christian), 14+1 batches, 230 (case, doc) pairs over 160 whole documents.
Lens personas were prepended per agent; the gate arithmetic ran in code
(scripts/gate-judge-results.ts, throwaway). Preserved per the golden-skill
provenance convention (cf. 2026-07-14-jfrag-golden-judge-panel.md)._

# Judge rubric — slice #8 (everystudent) Stage-4 credit panel

You are ONE lens of a 3-lens judging panel evaluating candidate credits for a
retrieval eval's answer keys. The corpus is Christian seeker/discipleship
content from 9 ministry websites. A "credit" means: document D is recorded as
a legitimate answer to eval question Q. Your verdicts feed a CODE gate (both
axes must average ≥ 0.75 across the panel) — score honestly, do not round up.

## Input format

Your batch file is a JSON array of documents. Each document has:
- `path`, `sourceKey`, `title`
- `fullText` — the WHOLE document. **Judge the whole document, never just its
  opening.** Many articles open with a long lead-in anecdote; the answer often
  lives deep in the body. Rejecting on the opening alone is a known failure
  mode of past panels.
- `questions` — a list of `{caseId, question}` pairs to judge this document
  against.

## The two axes — orthogonal, never blended

**1. `soundness` (ONCE per document, 0.00–1.00):** biblical soundness against
historic orthodoxy (Nicene-creedal baseline). Watch specifically for:
prosperity drift (giving/tithing framed as yielding financial return),
works-righteousness, universalism, therapeutic deism, glib promises God does
not make. Anchors:
- 1.00 fully consistent with historic biblical orthodoxy
- 0.75 minor imprecision or overstatement; no doctrinal error
- 0.50 notable drift (prosperity framing, works-based assurance, etc.)
- 0.25 serious doctrinal error presented as teaching
- 0.00 outright heresy

**2. `relevance` (once per {caseId, question} pair, 0.00–1.00):** does THIS
document actually answer THIS question **as asked**? Anchors:
- 1.00 squarely and substantially answers the question
- 0.75 clearly addresses the question's main thrust; minor tangents
- 0.50 adjacent — related topic, but does not answer what was asked
- 0.25 shares vocabulary or theme only
- 0.00 unrelated

**The tripwire:** a document can be 1.0 sound and 0.2 relevant — perfectly
orthodox, answering a question nobody asked. In the last panel 73 of 151
proposals were exactly that. Score each axis on its own evidence.

## Output

Write a JSON array to your assigned output path — one entry per document, in
the batch file's order:

```json
[
  {
    "path": "/wires/example.html",
    "soundness": 0.9,
    "soundnessNote": "one sentence",
    "relevance": [
      { "caseId": "case-id", "score": 0.8, "note": "one sentence" }
    ]
  }
]
```

Every document needs a `soundness`; every `{caseId, question}` pair in the
batch needs exactly one `relevance` entry. Scores to two decimals. Notes are
one sentence each, no more. After writing the file, reply with a single line:
`<lens> <batch>: <N> docs judged`.
