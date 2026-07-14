Goal:
Cut the human review load on a golden-eval curation batch from "read every proposed
credit" to "read only what genuinely needs a human" — without letting a bad credit
through. A panel of LLM judges pre-filters; the human sees only failures and genuine
disagreement. You own the how; the human owns the bar.

Context (why this exists):
Slice #7 (Cru) Stage 4 produced 151 proposed credits to `eval/qa-golden.yaml` across
24 cases. Surfacing all 151 to the operator as a uniform HTML list failed as a review
surface — "it's too much and looks the same after a while". The fix is not a prettier
list; it is a gate. Candidate for promotion into `.claude/skills/golden` (or a new
sibling skill) so every future slice's Stage 4 runs this way by default.

THE BAR (human-owned — an agent does not renegotiate it):
Score two ORTHOGONAL properties separately. Never blend them into one number.

  1. RELEVANCE — the question the eval actually measures.
     Does this document substantively answer THIS question, as the person actually
     phrased it? Shared vocabulary, same broad topic, or "adjacent and worthy" = 0.
     Be strict: a wrong credit corrupts the eval permanently.

  2. BIBLICAL SOUNDNESS — a content guardrail, NOT a relevance signal.
     0 = unbiblical · 0.5 = passable but needs work · 1 = sound.
     Continuous values between 0 and 1 are valid.

  A doc that is 1.0 sound and 0.2 relevant MUST FAIL. That pairing is the specific
  error this harness exists to prevent — a perfectly orthodox document that does not
  answer the question. Treat it as the tripwire, not an edge case.

PANEL:
Three lenses — theologian, pastor, mature Christian. Each scores independently; do
not let them see each other's scores before scoring.
Judge Spanish and French cases IN-LANGUAGE. Do not translate before judging;
translate only to explain the verdict back to the human.

Every score carries ONE concise plain-English sentence saying why it got that number.
No essays. No headed paragraphs.

GATE:
Auto-accept iff mean(relevance) >= 0.75 AND mean(soundness) >= 0.75.
Everything else goes to the human queue.

ESCALATE (do not quietly average away):
  - any case where the panel splits by >= 0.5 on either axis, EVEN IF the mean passes
    — disagreement is signal, not noise;
  - any doc that is clearly relevant but theologically risky.

OUTPUT:
One HTML page containing ONLY the failures + escalations. Per item:
  · the question (+ EN translation if non-English)
  · the doc and its REAL chunk text from the corpus — never judge or present on titles
  · its current rank, and whether it displaced a previously-credited doc
  · the 3 lens scores on both axes
  · one synthesized verdict reconciling the panel where it disagrees

Compact and differentiated beats complete and uniform. Sort worst-first. Make severity
and panel-disagreement legible at a glance (spread bars, not prose). The human must be
able to act without scrolling. The uniform-card list is the failure mode being fixed.

Everything that passes the gate is accepted without human review — that is the point.
Report the pass count and what was auto-accepted, so the human can spot-audit if they
want.

BOUNDS:
Read-only. Do not modify `eval/qa-golden.yaml` — report; the human decides.

COST:
N docs x 3 lenses. Fan out however is most efficient — sequence the run as you see fit.
If the run will exceed ~1M output tokens, report the estimate before spending it.
