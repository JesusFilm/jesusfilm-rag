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

  it("every docs/sources.md status-legend label is a valid LifecycleLabel", () => {
    // CodeRabbit #4: don't pre-filter labels with the vocabulary we're validating
    // against (that hides a rogue label). Collect EVERY label in the Status-legend
    // table, then assert each against the schema. Scoped to the legend so other
    // tables (registry keys, Type values) aren't swept in.
    const md = read("docs/sources.md");
    const start = md.indexOf("**Status legend**");
    expect(start, "no Status legend in docs/sources.md").toBeGreaterThan(-1);
    const labels: string[] = [];
    for (const line of md.slice(start).split("\n").slice(1)) {
      const m = line.match(/^\|\s*`([^`]+)`\s*\|/);
      if (m) labels.push(m[1]);
      else if (labels.length > 0 && line.trim() === "") break; // table ended
    }
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(lifecycleLabelSchema.options as readonly string[]).toContain(label);
    }
  });
});
