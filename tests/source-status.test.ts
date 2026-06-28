import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import {
  rowStatusSchema,
  lifecycleLabelSchema,
  sourceStatusFileSchema,
  deriveRowStatus,
} from "@/contracts/source-status.schema.js";

// Composition-level guard: the COMMITTED tracker files must conform to the one
// status contract. A malformed file — whether a tool bug or a stray hand-edit —
// fails this in the existing `test` CI job. Lives in tests/** because it reads
// the filesystem (the import law keeps that out of src/**).

const repoRoot = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(repoRoot, rel), "utf8");

describe("docs/source-status.yaml conforms to the contract", () => {
  const file = sourceStatusFileSchema.parse(YAML.parse(read("docs/source-status.yaml")));

  it("parses + validates against the per-language schema", () => {
    expect(Object.keys(file.sources).length).toBeGreaterThan(0);
  });

  it("every row's stored status equals the derived rollup", () => {
    for (const [key, row] of Object.entries(file.sources)) {
      expect(`${key}:${row.status}`).toBe(`${key}:${deriveRowStatus(row.languages)}`);
    }
  });
});

describe("the other trackers use only contract-defined vocabulary", () => {
  it("every slice file Status is a valid RowStatus", () => {
    const dir = path.join(repoRoot, "docs/slices");
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".md"))) {
      const m = read(`docs/slices/${f}`).match(/·\s*Status:\s*([a-z-]+)/);
      expect(m, `no Status header in docs/slices/${f}`).not.toBeNull();
      expect(rowStatusSchema.options as readonly string[]).toContain(m![1]);
    }
  });

  it("every docs/sources.md lifecycle label is a valid LifecycleLabel", () => {
    const legend = read("docs/sources.md")
      .split("\n")
      .map((l) => l.match(/^\|\s*`([A-Za-z ]+)`\s*\|/))
      .filter((m): m is RegExpMatchArray => m !== null && /started|Acquired|Ingested|Evaluated|Blocked|Deferred/.test(m[1]))
      .map((m) => m[1]);
    expect(legend.length).toBeGreaterThan(0);
    for (const label of legend) {
      expect(lifecycleLabelSchema.options as readonly string[]).toContain(label);
    }
  });
});
