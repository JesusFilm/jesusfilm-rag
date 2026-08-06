import { describe, expect, it } from "vitest";
import {
  DEFAULT_INGEST_CONCURRENCY,
  parseIngestConcurrency,
} from "../scripts/lib/ingest-concurrency.js";

describe("parseIngestConcurrency", () => {
  it("defaults to the shared safe concurrency", () => {
    expect(parseIngestConcurrency([])).toEqual({
      concurrency: DEFAULT_INGEST_CONCURRENCY,
    });
  });

  it.each(["0", "5", "2.5", "abc", "9007199254740992"])(
    "rejects unsafe concurrency %s",
    (raw) => {
      expect(parseIngestConcurrency(["--concurrency", raw]).error).toMatch(
        /safe integer from 1 to 4/,
      );
    },
  );
});
