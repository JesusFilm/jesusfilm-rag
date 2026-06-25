import { describe, it, expect } from "vitest";
import {
  computeDrift,
  restoreAction,
  preexistingDirty,
  type StatusMap,
} from "../scripts/check-migrations.js";

/**
 * The migration-drift guard (scripts/check-migrations.ts) catches schema.ts
 * drifting ahead of migrations/. Its pure decisions — what counts as drift, how
 * to undo it, and whether it's safe to run at all — are exported and asserted
 * here so a regression to any of them fails CI instead of silently mis-guarding.
 * (The runnable `main()` still owns git + `db:generate`; these need neither.)
 */
const status = (entries: Record<string, string>): StatusMap =>
  new Map(Object.entries(entries));

describe("migration-drift guard", () => {
  describe("computeDrift", () => {
    it("flags an entry generate newly created", () => {
      const before = status({});
      const after = status({ "migrations/0001_new.sql": "??" });
      expect(computeDrift(before, after)).toEqual([
        { path: "migrations/0001_new.sql", code: "??" },
      ]);
    });

    it("flags an entry whose status code changed", () => {
      const before = status({ "migrations/0000_x.sql": "??" });
      const after = status({ "migrations/0000_x.sql": " M" });
      expect(computeDrift(before, after)).toEqual([
        { path: "migrations/0000_x.sql", code: " M" },
      ]);
    });

    it("reports no drift when before and after are identical (clean tree)", () => {
      const before = status({});
      const after = status({});
      expect(computeDrift(before, after)).toEqual([]);
    });

    it("does NOT flag an uncommitted-but-correct migration unchanged by generate", () => {
      // A migration you generated but haven't committed shows in BOTH maps with
      // the same code; generate is a no-op on it. This must never be treated as
      // drift (and so never deleted) — a deliberate design property.
      const both = { "migrations/0001_wip.sql": "??" };
      expect(computeDrift(status(both), status(both))).toEqual([]);
    });
  });

  describe("preexistingDirty (preflight)", () => {
    it("flags a tracked file already modified before generation runs", () => {
      // The Finding-1 case: a tracked ` M` migration present BEFORE we generate
      // would be silently overwritten and missed by the drift delta. Refusing to
      // run is the fix; without the preflight this list would be ignored entirely.
      const before = status({ "migrations/0000_garia.sql": " M" });
      expect(preexistingDirty(before)).toEqual([
        { path: "migrations/0000_garia.sql", code: " M" },
      ]);
    });

    it("does not flag untracked files — generate's own output is untracked", () => {
      const before = status({ "migrations/0001_new.sql": "??" });
      expect(preexistingDirty(before)).toEqual([]);
    });

    it("is empty for a clean tree", () => {
      expect(preexistingDirty(status({}))).toEqual([]);
    });
  });

  describe("restoreAction", () => {
    it("removes untracked files (??) via clean", () => {
      expect(restoreAction("??")).toBe("clean");
    });

    it("reverts tracked files (M) via checkout", () => {
      expect(restoreAction(" M")).toBe("checkout");
      expect(restoreAction("MM")).toBe("checkout");
    });
  });
});
