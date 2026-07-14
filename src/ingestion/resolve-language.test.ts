import { describe, it, expect } from "vitest";
import {
  resolveFromSignals,
  resolveLanguage,
  decideSweep,
  isFallback,
  type ResolveSignals,
  type LanguageResolution,
} from "./resolve-language.js";
import { DETECTION_FLOOR_CHARS } from "./decide-language.js";

/** A signal bundle with sensible defaults; override per case. */
function signals(over: Partial<ResolveSignals> = {}): ResolveSignals {
  return {
    decision: { language: null },
    detected: "",
    confidence: 0,
    contentLength: 1000,
    declared: ["en"],
    ...over,
  };
}

describe("resolveFromSignals — the pure fallback ladder", () => {
  it("1. keeps a confident detection verbatim", () => {
    const r = resolveFromSignals(
      signals({ decision: { language: "fr" }, detected: "fr", confidence: 0.99 }),
    );
    expect(r).toMatchObject({ language: "fr", basis: "detected" });
    expect(isFallback(r.basis)).toBe(false);
  });

  it("1. passes a confident out-of-declared-set warning straight through", () => {
    const warning = "detected 'fr' outside declared set [en]";
    const r = resolveFromSignals(
      signals({
        decision: { language: "fr", warning },
        detected: "fr",
        confidence: 0.91,
        declared: ["en"],
      }),
    );
    expect(r.language).toBe("fr");
    expect(r.warning).toBe(warning);
  });

  it("2. monolingual + abstain below the floor → the sole declared language", () => {
    const r = resolveFromSignals(
      signals({ contentLength: 120, declared: ["en"], detected: "hi", confidence: 1 }),
    );
    expect(r).toMatchObject({ language: "en", basis: "declared-monolingual" });
    expect(isFallback(r.basis)).toBe(true);
    expect(r.note).toContain("below the");
  });

  it("2. monolingual + abstain above the floor (low confidence) → declared language", () => {
    const r = resolveFromSignals(
      signals({ contentLength: 2000, declared: ["fr"], detected: "ru", confidence: 0.5 }),
    );
    expect(r).toMatchObject({ language: "fr", basis: "declared-monolingual" });
    expect(r.note).toContain("low confidence");
  });

  it("3. multilingual + enough prose + in-set lean → the dominant language", () => {
    const r = resolveFromSignals(
      signals({
        contentLength: 1500,
        declared: ["en", "es", "fr"],
        detected: "es",
        confidence: 0.55,
      }),
    );
    expect(r).toMatchObject({ language: "es", basis: "declared-primary" });
    expect(isFallback(r.basis)).toBe(true);
  });

  it("4. multilingual + too short → null (the documented exception)", () => {
    const r = resolveFromSignals(
      signals({
        contentLength: 200,
        declared: ["en", "es"],
        detected: "de",
        confidence: 1,
      }),
    );
    expect(r).toMatchObject({ language: null, basis: "unresolved-null" });
    expect(r.note).toContain("below the");
  });

  it("4. multilingual + enough prose but OUT-of-set lean → null (no guessing)", () => {
    const r = resolveFromSignals(
      signals({
        contentLength: 1500,
        declared: ["en", "es"],
        detected: "ru",
        confidence: 0.6,
      }),
    );
    expect(r).toMatchObject({ language: null, basis: "unresolved-null" });
    expect(r.note).toContain("outside the declared set");
  });

  it("4. no declared languages + abstain → null, never a fabricated guess", () => {
    const r = resolveFromSignals(
      signals({ contentLength: 50, declared: [], detected: "", confidence: 0 }),
    );
    expect(r).toMatchObject({ language: null, basis: "unresolved-null" });
  });

  it("uses exactly the floor constant as the boundary (>= floor counts as enough)", () => {
    // At the floor with a multilingual in-set lean → resolves (declared-primary).
    const atFloor = resolveFromSignals(
      signals({
        contentLength: DETECTION_FLOOR_CHARS,
        declared: ["en", "fr"],
        detected: "fr",
        confidence: 0.6,
      }),
    );
    expect(atFloor.basis).toBe("declared-primary");
    // One char below the floor → too short → null.
    const belowFloor = resolveFromSignals(
      signals({
        contentLength: DETECTION_FLOOR_CHARS - 1,
        declared: ["en", "fr"],
        detected: "fr",
        confidence: 0.6,
      }),
    );
    expect(belowFloor.basis).toBe("unresolved-null");
  });
});

describe("decideSweep — the never-make-it-worse safety policy", () => {
  const res = (over: Partial<LanguageResolution>): LanguageResolution => ({
    language: null,
    basis: "unresolved-null",
    detected: "",
    confidence: 0,
    ...over,
  });

  it("confident detection that matches → confirmed, no write", () => {
    const d = decideSweep("en", res({ language: "en", basis: "detected", detected: "en" }));
    expect(d).toMatchObject({ changed: false, reason: "confirmed" });
  });

  it("confident detection that differs from a non-null label → relabel", () => {
    const d = decideSweep("en", res({ language: "fr", basis: "detected", detected: "fr" }));
    expect(d).toMatchObject({ final: "fr", changed: true, reason: "relabel" });
  });

  it("confident detection on a null → filled", () => {
    const d = decideSweep(null, res({ language: "es", basis: "detected", detected: "es" }));
    expect(d).toMatchObject({ final: "es", changed: true, reason: "filled" });
  });

  it("weak fallback FILLS a null", () => {
    const d = decideSweep(null, res({ language: "en", basis: "declared-monolingual", detected: "hi" }));
    expect(d).toMatchObject({ final: "en", changed: true, reason: "filled", review: true });
  });

  it("weak signal NEVER blanks an existing label (the familylife bug)", () => {
    // Short English page on a multilingual source: resolver would say null...
    const d = decideSweep("en", res({ language: null, basis: "unresolved-null", detected: "en" }));
    // ...but decideSweep keeps the existing 'en' — no blanking, ever.
    expect(d).toMatchObject({ final: "en", changed: false, reason: "kept" });
  });

  it("weak signal NEVER overrides an existing label, only flags disagreement for review", () => {
    const d = decideSweep("en", res({ language: "es", basis: "declared-primary", detected: "es" }));
    expect(d).toMatchObject({ final: "en", changed: false, reason: "kept", review: true });
  });

  it("unresolved null on an already-null doc → still-null, flagged for review", () => {
    const d = decideSweep(null, res({ language: null, basis: "unresolved-null", detected: "" }));
    expect(d).toMatchObject({ final: null, changed: false, reason: "still-null", review: true });
  });

  it("never produces a write that sets a non-null label to null", () => {
    // Property: changed ⇒ final is non-null.
    for (const old of [null, "en", "es"]) {
      for (const basis of ["detected", "declared-monolingual", "declared-primary", "unresolved-null"] as const) {
        for (const lang of [null, "en", "fr"]) {
          const d = decideSweep(old, res({ language: lang, basis, detected: lang ?? "" }));
          if (d.changed) expect(d.final).not.toBeNull();
        }
      }
    }
  });
});

describe("resolveLanguage — integration over the real detector", () => {
  const ENGLISH =
    "When my wife and I first married, we knew almost nothing about how to build a " +
    "lasting relationship. We argued about money, about time, about whose turn it was " +
    "to wash the dishes. Slowly we learned that honesty, patience, and forgiveness " +
    "were worth far more than winning any single argument. These are the quiet habits " +
    "that hold a marriage together through the years, long after the excitement fades.".repeat(
      3,
    );
  const FRENCH =
    "Quelque chose ne va pas, c'était une question simple qui me laissait devant un choix : mentir ou dire la vérité. ".repeat(
      12,
    );

  it("relabels genuinely French content on an en-declared source", () => {
    const r = resolveLanguage(FRENCH, { declared: ["en"] });
    expect(r.language).toBe("fr");
    expect(r.basis).toBe("detected");
    expect(r.warning).toBeDefined(); // fr is outside [en]
  });

  it("confirms clear English as English", () => {
    const r = resolveLanguage(ENGLISH, { declared: ["en"] });
    expect(r.language).toBe("en");
    expect(r.basis).toBe("detected");
  });

  it("falls back to the declared language on a too-short monolingual page", () => {
    const r = resolveLanguage("Autism Spectrum · Speaker · 2024", {
      declared: ["en"],
    });
    expect(r.language).toBe("en");
    expect(r.basis).toBe("declared-monolingual");
  });
});
