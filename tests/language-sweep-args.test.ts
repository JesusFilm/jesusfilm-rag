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
