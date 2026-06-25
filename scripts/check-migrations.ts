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
 */
import { execFileSync } from "node:child_process";

const MIGRATIONS = "migrations";

/** `git status --porcelain` lines for migrations/, as a path → status-code map. */
function migrationStatus(): Map<string, string> {
  const out = execFileSync(
    "git",
    ["status", "--porcelain", "--", MIGRATIONS],
    { encoding: "utf8" },
  );
  const map = new Map<string, string>();
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    // Porcelain v1: two status columns, a space, then the path.
    map.set(line.slice(3), line.slice(0, 2));
  }
  return map;
}

const before = migrationStatus();

// Regenerate. stdin is /dev/null so an unexpected prompt can never hang CI.
execFileSync("pnpm", ["db:generate"], { stdio: ["ignore", "inherit", "inherit"] });

const after = migrationStatus();

// Drift = entries generate newly created or changed (present/different in `after`
// vs `before`). Pre-existing uncommitted migration work is left untouched.
const drift: { path: string; code: string }[] = [];
for (const [path, code] of after) {
  if (before.get(path) !== code) drift.push({ path, code });
}

if (drift.length > 0) {
  // Undo only what this run generated, restoring the tree to how we found it.
  for (const { path, code } of drift) {
    if (code.includes("?")) {
      execFileSync("git", ["clean", "-fq", "--", path]); // untracked → remove
    } else {
      execFileSync("git", ["checkout", "--", path]); // tracked → revert
    }
  }
  const list = drift.map((d) => `    ${d.code} ${d.path}`).join("\n");
  console.error(
    "\n✗ Drizzle schema and migrations are out of sync.\n" +
      "  src/db/schema.ts changed but no migration captures it, so `pnpm db:migrate`\n" +
      "  would apply stale SQL and the change would never reach the database.\n" +
      "  Fix: run `pnpm db:generate` and commit the new file(s) under migrations/.\n\n" +
      "  Un-captured change(s):\n" +
      list +
      "\n",
  );
  process.exit(1);
}

console.error("✓ Drizzle schema and migrations are in sync.");
