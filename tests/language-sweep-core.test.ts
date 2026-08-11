import { describe, it, expect, vi } from "vitest";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  mapPool,
  buildReviewInput,
  partitionNullOutcomes,
  runSweep,
  SerialAppender,
} from "../scripts/lib/language-sweep-core.js";

describe("partitionNullOutcomes — report abstentions separately from failures", () => {
  it("does not classify an unchanged detector anomaly as an honest null", () => {
    const abstention = { new: null, anomaly: undefined, url: "honest-null" };
    const detectorFailure = {
      new: null,
      anomaly: "detection failed (truncated response) — left unchanged",
      url: "detector-failure",
    };
    const labelled = { new: "en", anomaly: undefined, url: "labelled" };

    const outcomes = partitionNullOutcomes([abstention, detectorFailure, labelled]);

    expect(outcomes.honestNulls).toEqual([abstention]);
    expect(outcomes.anomalies).toEqual([detectorFailure]);
  });

  it("names genuine abstentions and errors separately in the LLM review summary", () => {
    const result = (
      old: string | null,
      next: string | null,
      reason: "filled" | "still-null" | "kept",
      anomaly?: string,
    ) => ({
      id: reason,
      url: `https://example.com/${reason}`,
      old,
      new: next,
      reason,
      changed: reason === "filled",
      review: true,
      res: {
        language: next,
        basis: next === null ? "unresolved-null" : "detected",
        detected: next ?? "",
        confidence: next === null ? 0 : 1,
        evidence: "sample",
      },
      contentLen: 100,
      snippet: "sample",
      anomaly,
    });
    const reports = [{
      key: "thelife",
      declared: ["en"],
      inScope: 3,
      scanned: 3,
      missingRaw: 0,
      applied: 0,
      skippedGuard: 0,
      results: [
        result(null, "en", "filled"),
        result(null, null, "still-null"),
        result(null, null, "kept", "detection failed — left unchanged"),
      ],
    }];

    const { input } = buildReviewInput(reports as never);

    expect(input).toContain("1 genuine abstention(s)");
    expect(input).toContain("1 error(s)");
    expect(input).not.toContain("2 left null");
  });

  it("keeps a failed detection unchanged and out of apply/changelog/report abstentions", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "sweep-anomaly-"));
    const begin = vi.fn();
    const client = Object.assign(
      (strings: TemplateStringsArray) => {
        const sql = strings.join(" ");
        if (sql.trim() === "") return {};
        if (sql.includes("count(*)")) return Promise.resolve([{ n: 1 }]);
        if (sql.includes("select distinct on")) {
          return Promise.resolve([{
            id: "doc-1",
            canonical_url: "https://thelife.com/anomaly",
            old_language: null,
            raw_content: "A document body that reaches the detector.",
          }]);
        }
        throw new Error(`unexpected SQL: ${sql}`);
      },
      { begin },
    );
    const detector = {
      model: "fake/truncating-detector",
      detect: vi.fn().mockRejectedValue(
        new Error("response truncated at the output token limit"),
      ),
    };

    try {
      await runSweep(
        {
          kind: "sweep",
          sources: "thelife",
          mode: "blanks",
          apply: true,
          limit: null,
          sampleChars: 240,
          sampleLimit: 15,
          outDir: dir,
          verifyLog: false,
          concurrency: 1,
          maxDetectChars: 8000,
          llmReview: false,
        },
        { client: client as never, detector },
      );

      const files = await readdir(dir);
      const report = await readFile(path.join(dir, files.find((f) => f.startsWith("report-"))!), "utf8");
      const changelog = await readFile(
        path.join(dir, files.find((f) => f.startsWith("changelog-"))!),
        "utf8",
      );
      const csv = await readFile(path.join(dir, files.find((f) => f.startsWith("results-"))!), "utf8");

      expect(detector.detect).toHaveBeenCalledOnce();
      expect(begin).not.toHaveBeenCalled();
      expect(changelog).toBe("");
      expect(csv).toContain("detection failed");
      expect(report).toContain("| thelife | 1 | 0 | 0 | 0 | 1 |");
      expect(report).toContain("No genuine abstentions");
      expect(report).not.toContain("Every scanned document is labelled");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("mapPool — bounded, index-ordered concurrency", () => {
  it("returns results in input order regardless of completion order", async () => {
    const items = [40, 10, 30, 20, 5];
    const out = await mapPool(items, 3, async (n) => {
      await new Promise((r) => setTimeout(r, n)); // slower items finish later
      return n * 2;
    });
    expect(out).toEqual([80, 20, 60, 40, 10]); // aligned to input, not finish order
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);
    await mapPool(items, 3, async (i) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 3));
      inFlight--;
      return i;
    });
    expect(peak).toBe(3); // reaches, but never exceeds, the cap
  });

  it("handles an empty list", async () => {
    expect(await mapPool([], 3, async () => 1)).toEqual([]);
  });
});

describe("SerialAppender — no interleaving under concurrent appends", () => {
  it("writes every line intact and in call order", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "sweep-core-"));
    const file = path.join(dir, "log.jsonl");
    await writeFile(file, "", "utf8");
    try {
      const appender = new SerialAppender(file);
      // Lines of varied length maximise the chance of a torn write if unsafe.
      const lines = Array.from({ length: 60 }, (_, i) => `line-${i}-${"x".repeat(i)}`);
      // Fire them "all at once"; the appender must serialise them internally.
      await Promise.all(lines.map((l) => appender.append(l + "\n")));
      await appender.drain();

      const got = (await readFile(file, "utf8")).split("\n").filter(Boolean);
      expect(got).toEqual(lines); // all present, intact, in call order
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
