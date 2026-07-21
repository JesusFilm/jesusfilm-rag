import { describe, it, expect } from "vitest";
import { parseArgs } from "../scripts/lib/acquire-core.js";

describe("parseArgs — the acquire CLI contract (shared by both runners)", () => {
  it("parses a single-source acquire with defaults", () => {
    expect(parseArgs(["--source", "thelife"])).toEqual({
      all: false,
      source: "thelife",
      dryRun: false, // fetches by default
      resume: false, // full crawl by default
    });
  });

  it("parses --all with --dry-run and --resume", () => {
    expect(parseArgs(["--all", "--dry-run", "--resume"])).toEqual({
      all: true,
      source: undefined,
      dryRun: true,
      resume: true,
    });
  });

  it("leaves source undefined when --source has no value", () => {
    expect(parseArgs(["--source"]).source).toBeUndefined();
  });
});
