/**
 * Unit tests for the deterministic source-status writer (scripts/source-status.ts) —
 * the only sanctioned mutator of docs/source-status.yaml. No fs/argv side effects:
 * we drive the exported pure core over an in-memory yaml Document. Proves the
 * guarantees that stop the /slice agent misusing the file — comment preservation,
 * tool-derived rollup, last_updated bump, and validate-before-write.
 */
import { describe, expect, it } from "vitest";
import {
  loadDoc,
  applyMutation,
  validateDoc,
  parseArgv,
} from "../scripts/source-status.js";
import type { Mutation } from "../scripts/source-status.js";

const FIXTURE = `# Source status header — must survive every write.
sources:
  foo:
    name: Foo
    status: in-progress
    languages:
      en:
        status: in-progress
        stages: { acquire: green, ingest: pending, retrieve: pending, evaluate: pending }
    slice_file: docs/slices/foo.md
    last_updated: 2026-01-01
`;

const TODAY = "2026-06-29";

describe("applyMutation — set", () => {
  it("derives the rollup status and bumps last_updated when a language completes", () => {
    const doc = loadDoc(FIXTURE);
    const m: Mutation = {
      kind: "set",
      source: "foo",
      lang: "en",
      ops: [
        { op: "stage", stage: "ingest", state: "green" },
        { op: "stage", stage: "retrieve", state: "green" },
        { op: "stage", stage: "evaluate", state: "green" },
        { op: "status", status: "done" },
      ],
    };
    applyMutation(doc, m, TODAY);
    const file = validateDoc(doc);
    expect(file.sources.foo.status).toBe("done"); // derived, not hand-set
    expect(file.sources.foo.last_updated).toBe(TODAY);
    expect(doc.toString()).toContain("# Source status header"); // comment preserved
  });

  it("refuses (validateDoc throws) when the result violates an invariant", () => {
    const doc = loadDoc(FIXTURE);
    // mark the language done while stages are still pending — an illegal state
    applyMutation(doc, { kind: "set", source: "foo", lang: "en", ops: [{ op: "status", status: "done" }] }, TODAY);
    expect(() => validateDoc(doc)).toThrow();
  });

  it("clears an optional field when given a null value", () => {
    const doc = loadDoc(FIXTURE);
    applyMutation(doc, { kind: "set", source: "foo", lang: "en", ops: [{ op: "note", value: "watch me" }] }, TODAY);
    expect(validateDoc(doc).sources.foo.languages.en.note).toBe("watch me");
    applyMutation(doc, { kind: "set", source: "foo", lang: "en", ops: [{ op: "note", value: null }] }, TODAY);
    expect(validateDoc(doc).sources.foo.languages.en.note).toBeUndefined();
  });

  it("throws on an unknown source or language", () => {
    const doc = loadDoc(FIXTURE);
    expect(() => applyMutation(doc, { kind: "set", source: "nope", lang: "en", ops: [] }, TODAY)).toThrow();
    expect(() => applyMutation(doc, { kind: "set", source: "foo", lang: "zz", ops: [] }, TODAY)).toThrow();
  });
});

describe("applyMutation — add-source / add-lang", () => {
  it("adds a source as a single in-progress language, all stages pending", () => {
    const doc = loadDoc(FIXTURE);
    applyMutation(doc, { kind: "add-source", key: "bar", name: "Bar", lang: "en", sliceFile: "docs/slices/bar.md" }, TODAY);
    const file = validateDoc(doc);
    expect(file.sources.bar.status).toBe("in-progress");
    expect(file.sources.bar.languages.en.stages).toEqual({ acquire: "pending", ingest: "pending", retrieve: "pending", evaluate: "pending" });
    expect(file.sources.bar.last_updated).toBe(TODAY);
  });

  it("adds a second language and round-trips through serialization", () => {
    const doc = loadDoc(FIXTURE);
    applyMutation(doc, { kind: "add-source", key: "bar", name: "Bar", lang: "en", sliceFile: "docs/slices/bar.md" }, TODAY);
    applyMutation(doc, { kind: "add-lang", source: "bar", lang: "es", scope: "pilot (1 page)" }, TODAY);
    const reparsed = validateDoc(loadDoc(doc.toString()));
    expect(Object.keys(reparsed.sources.bar.languages).sort()).toEqual(["en", "es"]);
    expect(reparsed.sources.bar.languages.es.scope).toBe("pilot (1 page)");
  });

  it("refuses to add a duplicate source or an existing language", () => {
    const doc = loadDoc(FIXTURE);
    expect(() => applyMutation(doc, { kind: "add-source", key: "foo", name: "Foo", lang: "en", sliceFile: "x" }, TODAY)).toThrow();
    expect(() => applyMutation(doc, { kind: "add-lang", source: "foo", lang: "en" }, TODAY)).toThrow();
  });
});

describe("parseArgv", () => {
  it("parses a multi-op set", () => {
    expect(
      parseArgv(["set", "--source", "foo", "--lang", "en", "--stage", "acquire=green", "--status", "done"]),
    ).toEqual({
      kind: "set",
      source: "foo",
      lang: "en",
      ops: [
        { op: "stage", stage: "acquire", state: "green" },
        { op: "status", status: "done" },
      ],
    });
  });

  it("parses --clear-blocker as a null blocker op", () => {
    expect(parseArgv(["set", "--source", "foo", "--lang", "en", "--clear-blocker"])).toEqual({
      kind: "set",
      source: "foo",
      lang: "en",
      ops: [{ op: "blocker", value: null }],
    });
  });

  it("parses add-source, add-lang, and check", () => {
    expect(parseArgv(["add-source", "--key", "bar", "--name", "Bar", "--lang", "en", "--slice-file", "docs/slices/bar.md"])).toEqual({
      kind: "add-source", key: "bar", name: "Bar", lang: "en", sliceFile: "docs/slices/bar.md",
    });
    expect(parseArgv(["add-lang", "--source", "bar", "--lang", "es", "--scope", "pilot"])).toEqual({
      kind: "add-lang", source: "bar", lang: "es", scope: "pilot",
    });
    expect(parseArgv(["check"])).toEqual({ kind: "check" });
  });

  it("rejects an invalid stage state or status enum", () => {
    expect(() => parseArgv(["set", "--source", "foo", "--lang", "en", "--stage", "acquire=blue"])).toThrow();
    expect(() => parseArgv(["set", "--source", "foo", "--lang", "en", "--status", "almost"])).toThrow();
  });
});
