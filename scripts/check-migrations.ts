/**
 * Migration-drift guard — the schema↔migrations analogue of the contract-drift
 * test (tests/contract-artifact.test.ts).
 *
 *   pnpm db:check        # fail if src/db/schema.ts is ahead of migrations/
 *
 * `src/db/schema.ts` is the single source of truth; migrations are GENERATED from
 * it via `pnpm db:generate`. If the schema changes without a regenerated
 * migration, `pnpm db:migrate` (run at boot and in CI) applies the OLD migrations
 * and the new column/table never reaches the database — a silent production break
 * that lint / typecheck / depcruise / test do NOT catch, because the Drizzle types
 * come from schema.ts and most tests never exercise the new column.
 *
 * This regenerates migrations and fails if that introduces any NEW change under
 * migrations/ (i.e. the schema was ahead of the committed migrations). It compares
 * the *delta* generate introduces — not merely "is the dir dirty" — so it never
 * trips on, or deletes, a migration you've generated but not yet committed. On a
 * miss it restores the tree to exactly how it found it and points at the fix.
 *
 * Needs no database: `drizzle-kit generate` diffs the schema against the snapshots
 * in migrations/meta, so this runs in the offline `static` CI job.
 *
 * The pure decision functions (computeDrift / restoreAction / preexistingDirty)
 * are exported and side-effect-free so tests/check-migrations.test.ts can import
 * and assert them without a database, git, or running `db:generate`. Only `main()`
 * touches the outside world, and it runs solely when invoked as the script.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MIGRATIONS = "migrations";

/** A `git status --porcelain` entry: the path and its two-column status code. */
export type StatusEntry = { path: string; code: string };

/** A path → status-code map, as produced by `git status --porcelain`. */
export type StatusMap = Map<string, string>;

/** `git status --porcelain` lines for migrations/, as a path → status-code map. */
function migrationStatus(): StatusMap {
  const out = execFileSync(
    "git",
    ["status", "--porcelain", "--", MIGRATIONS],
    { encoding: "utf8" },
  );
  const map: StatusMap = new Map();
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    // Porcelain v1: two status columns, a space, then the path.
    map.set(line.slice(3), line.slice(0, 2));
  }
  return map;
}

/**
 * Drift = entries `db:generate` newly created or changed (present/different in
 * `after` vs `before`). Pre-existing uncommitted migration work — identical in
 * both maps — is deliberately left untouched, so generating-then-checking never
 * trips on, or deletes, a migration you authored but have not yet committed.
 */
export function computeDrift(before: StatusMap, after: StatusMap): StatusEntry[] {
  const drift: StatusEntry[] = [];
  for (const [path, code] of after) {
    if (before.get(path) !== code) drift.push({ path, code });
  }
  return drift;
}

/**
 * How to undo a drift entry: untracked files (`??`) are removed via `git clean`;
 * tracked files are reverted via `git checkout`. The `?` test mirrors porcelain's
 * untracked marker.
 */
export function restoreAction(code: string): "clean" | "checkout" {
  return code.includes("?") ? "clean" : "checkout";
}

/**
 * Tracked files under migrations/ that are ALREADY dirty before generation.
 * `db:generate` may overwrite them, silently destroying local edits — and because
 * the status code is unchanged before/after, the drift delta would miss it. So
 * `main` refuses to run when this is non-empty. Untracked files (`??`) are fine:
 * generate's output is itself untracked and the drift/restore logic handles it.
 */
export function preexistingDirty(before: StatusMap): StatusEntry[] {
  const dirty: StatusEntry[] = [];
  for (const [path, code] of before) {
    if (restoreAction(code) === "checkout") dirty.push({ path, code });
  }
  return dirty;
}

const formatEntries = (entries: StatusEntry[]): string =>
  entries.map((e) => `    ${e.code} ${e.path}`).join("\n");

function main(): void {
  const before = migrationStatus();

  // Preflight: a tracked migration already dirty before we run would be silently
  // overwritten by `db:generate` (and missed by the drift delta, since its status
  // code stays the same). Refuse rather than clobber the user's local edits.
  const dirty = preexistingDirty(before);
  if (dirty.length > 0) {
    console.error(
      "\n✗ Refusing to run: migrations/ has uncommitted changes to tracked file(s).\n" +
        "  `pnpm db:check` regenerates migrations and would overwrite these local edits.\n" +
        "  Commit, stash, or revert them, then re-run:\n\n" +
        formatEntries(dirty) +
        "\n",
    );
    process.exit(1);
  }

  // Regenerate. stdin is /dev/null so an unexpected prompt can never hang CI.
  execFileSync("pnpm", ["db:generate"], { stdio: ["ignore", "inherit", "inherit"] });

  const after = migrationStatus();
  const drift = computeDrift(before, after);

  if (drift.length > 0) {
    // Undo only what this run generated, restoring the tree to how we found it.
    for (const { path, code } of drift) {
      if (restoreAction(code) === "clean") {
        execFileSync("git", ["clean", "-fq", "--", path]); // untracked → remove
      } else {
        execFileSync("git", ["checkout", "--", path]); // tracked → revert
      }
    }
    console.error(
      "\n✗ Drizzle schema and migrations are out of sync.\n" +
        "  src/db/schema.ts changed but no migration captures it, so `pnpm db:migrate`\n" +
        "  would apply stale SQL and the change would never reach the database.\n" +
        "  Fix: run `pnpm db:generate` and commit the new file(s) under migrations/.\n\n" +
        "  Un-captured change(s):\n" +
        formatEntries(drift) +
        "\n",
    );
    process.exit(1);
  }

  console.error("✓ Drizzle schema and migrations are in sync.");
}

// Run the side-effecting guard only when invoked directly (`tsx
// scripts/check-migrations.ts`), not when the test imports the pure functions.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
