import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mapPool, SerialAppender } from "../scripts/lib/language-sweep-core.js";

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
