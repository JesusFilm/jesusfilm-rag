import { describe, expect, it } from "vitest";
import { validateDashboardSnapshot } from "../scripts/dashboard-validate-snapshot.js";

const valid = {
  fetched_at: "2026-08-07",
  ingested: [],
  acquired_keys: [],
  unclassified: [],
};

describe("dashboard production snapshot validation", () => {
  it("accepts the strict data-only shape", () => {
    expect(() => validateDashboardSnapshot(JSON.stringify(valid))).not.toThrow();
  });

  it.each([
    ["unexpected credential field", { ...valid, password: "hidden" }],
    ["connection string in an expected field", { ...valid, acquired_keys: ["postgres://user:pass@host/db"] }],
  ])("rejects %s", (_name, value) => {
    expect(() => validateDashboardSnapshot(JSON.stringify(value))).toThrow();
  });
});
