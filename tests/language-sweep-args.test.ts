import { describe, it, expect } from "vitest";
import { parseArgs } from "../scripts/language-sweep.js";

describe("parseArgs — the sweep CLI contract", () => {
  it("parses a basic single-source sweep with defaults", () => {
    expect(parseArgs(["--source", "thelife"])).toEqual({
      kind: "sweep",
      sources: "thelife",
      mode: "full", // default
      apply: false, // dry-run by default
      limit: null,
      sampleChars: 240,
      sampleLimit: 15,
      outDir: null, // resolved at run time: --out-dir > env > <cwd>/reports
      verifyLog: false,
      concurrency: 3, // default parallel detector calls
      maxDetectChars: 8000, // default content window sent to the LLM
      llmReview: false, // opt-in
    });
  });

  it("parses --all with mode, apply, limit, verify-log, out-dir", () => {
    const a = parseArgs([
      "--all", "--mode", "blanks", "--apply", "--limit", "50",
      "--verify-log", "--out-dir", "/tmp/x",
    ]);
    expect(a).toMatchObject({
      kind: "sweep", sources: "all", mode: "blanks", apply: true,
      limit: 50, verifyLog: true, outDir: "/tmp/x",
    });
  });

  it("parses the LLM flags: --concurrency, --max-detect-chars, --llm-review", () => {
    expect(
      parseArgs([
        "--source", "cru", "--concurrency", "5",
        "--max-detect-chars", "4000", "--llm-review",
      ]),
    ).toMatchObject({
      kind: "sweep", sources: "cru", concurrency: 5,
      maxDetectChars: 4000, llmReview: true,
    });
  });

  it("recognises --help", () => {
    expect(parseArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseArgs(["-h"])).toEqual({ kind: "help" });
  });

  it("parses a revert command", () => {
    expect(parseArgs(["--revert", "log.jsonl", "--apply"])).toEqual({
      kind: "revert", changelog: "log.jsonl", apply: true,
    });
  });

  it("parses a bare (dry-run) revert command", () => {
    expect(parseArgs(["--revert", "log.jsonl"])).toEqual({
      kind: "revert", changelog: "log.jsonl", apply: false,
    });
  });

  describe("rejects invalid combinations", () => {
    const cases: Array<[string, string[]]> = [
      ["unknown flag", ["--source", "x", "--bogus"]],
      ["missing value", ["--source"]],
      ["source AND all", ["--source", "x", "--all"]],
      ["no scope", []],
      ["bad mode", ["--source", "x", "--mode", "sideways"]],
      ["negative limit", ["--source", "x", "--limit", "-3"]],
      ["non-numeric limit", ["--source", "x", "--limit", "abc"]],
      ["zero limit", ["--source", "x", "--limit", "0"]],
      ["zero concurrency", ["--source", "x", "--concurrency", "0"]],
      ["bad max-detect-chars", ["--source", "x", "--max-detect-chars", "-1"]],
      ["revert + llm-review", ["--revert", "l.jsonl", "--llm-review"]],
      ["revert + concurrency", ["--revert", "l.jsonl", "--concurrency", "3"]],
      ["revert + source", ["--revert", "l.jsonl", "--source", "x"]],
      ["revert + all", ["--revert", "l.jsonl", "--all"]],
      ["revert + mode", ["--revert", "l.jsonl", "--mode", "blanks"]],
      ["revert + limit", ["--revert", "l.jsonl", "--limit", "5"]],
      ["revert + verify-log", ["--revert", "l.jsonl", "--verify-log"]],
      ["revert + out-dir", ["--revert", "l.jsonl", "--out-dir", "/tmp/x"]],
      ["flag value that looks like a flag", ["--source", "--all"]],
    ];
    for (const [name, argv] of cases) {
      it(name, () => expect(() => parseArgs(argv)).toThrow());
    }
  });

  it("empty argv is a 'no scope' error, not a crash", () => {
    expect(() => parseArgs([])).toThrow(/specify a source/);
  });
});
