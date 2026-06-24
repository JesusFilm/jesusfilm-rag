/**
 * check-solutions — the mechanical gate for the compounding knowledge store.
 *
 *   pnpm check:solutions
 *
 * The compound-engineering loop (docs/workflow/ways-of-working.md) is only real
 * if a malformed or orphaned learning fails the build — the same philosophy as
 * the import law (architecture.md §5: "a boundary that doesn't fail the build
 * isn't real"). This script is that gate for `docs/solutions/`. It checks three
 * things and exits non-zero on any breach so CI can block the merge:
 *
 *   1. Frontmatter present + required fields  (title, date, problem_type, component)
 *   2. YAML parse-safety  — the silent-corruption traps (unquoted ` #` and `: `
 *      in scalar values, broken `---` delimiters) that a YAML parser swallows
 *      without erroring. Replaces CE's scripts/validate-frontmatter.py.
 *   3. Lessons-Index consistency  — every doc is linked from README.md, and
 *      every solutions link in README.md resolves to a real file.
 *
 * Dependency-free (no YAML lib, no glob): a line-based scan is enough for the
 * presence + parse-safety checks, and avoids adding a dep to a gate that runs on
 * every PR. `/ce-compound` keeps docs and the index in sync automatically; this
 * is the backstop for hand-edits.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOLUTIONS_DIR = path.join(ROOT, "docs", "solutions");
const README = path.join(SOLUTIONS_DIR, "README.md");
const REQUIRED_FIELDS = ["title", "date", "problem_type", "component"] as const;

const problems: string[] = [];
const note = (rel: string, msg: string) => problems.push(`${rel}: ${msg}`);

/** Every *.md under docs/solutions/ except the index itself, as repo-relative paths. */
function findSolutionDocs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...findSolutionDocs(abs));
    else if (entry.endsWith(".md") && abs !== README) out.push(abs);
  }
  return out;
}

/** Pull the frontmatter block (lines between the opening and closing `---`). */
function frontmatter(text: string): { lines: string[]; ok: boolean } {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") return { lines: [], ok: false };
  const close = lines.indexOf("---", 1);
  if (close === -1) return { lines: [], ok: false };
  return { lines: lines.slice(1, close), ok: true };
}

/**
 * Flag the silent-corruption traps in a scalar value: an unquoted ` #` (YAML
 * truncates the value at the comment) or an unquoted `: ` (YAML may read it as a
 * nested mapping). Quoted values are safe.
 */
function unsafeScalar(value: string): string | null {
  const v = value.trim();
  if (v === "" || v.startsWith('"') || v.startsWith("'") || v.startsWith("[")) return null;
  if (v.startsWith("|") || v.startsWith(">")) return null; // block scalars
  if (v.includes(" #")) return "unquoted ` #` truncates the value at a comment — quote it";
  if (v.includes(": ")) return "unquoted `: ` reads as a nested mapping — quote it";
  return null;
}

function checkDoc(abs: string): void {
  const rel = path.relative(ROOT, abs);
  const fm = frontmatter(readFileSync(abs, "utf8"));
  if (!fm.ok) {
    note(rel, "missing or unterminated `---` YAML frontmatter block");
    return;
  }
  const keys = new Set<string>();
  for (const line of fm.lines) {
    const m = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (m) {
      keys.add(m[1]);
      const bad = unsafeScalar(m[2]);
      if (bad) note(rel, `field \`${m[1]}\` — ${bad}`);
    } else if (/^\s*-\s+/.test(line)) {
      const bad = unsafeScalar(line.replace(/^\s*-\s+/, ""));
      if (bad) note(rel, `list item — ${bad}`);
    }
  }
  for (const field of REQUIRED_FIELDS) {
    if (!keys.has(field)) note(rel, `missing required frontmatter field \`${field}\``);
  }
}

/** Forward + reverse index consistency between the docs and README.md. */
function checkIndex(docs: string[]): void {
  const readme = readFileSync(README, "utf8");
  // Strip HTML comments so the format example/markers don't read as real links.
  const live = readme.replace(/<!--[\s\S]*?-->/g, "");
  for (const abs of docs) {
    const fromSolutions = path.relative(SOLUTIONS_DIR, abs);
    if (!live.includes(fromSolutions)) {
      note(
        path.relative(ROOT, abs),
        "not linked in docs/solutions/README.md (the Lessons Index) — add a row",
      );
    }
  }
  for (const link of live.matchAll(/]\(([^)]+\.md)\)/g)) {
    const target = link[1];
    if (target.startsWith("../") || target.startsWith("http")) continue; // points outside solutions
    try {
      statSync(path.join(SOLUTIONS_DIR, target));
    } catch {
      note("docs/solutions/README.md", `index links a missing file: ${target}`);
    }
  }
}

function main(): void {
  let docs: string[] = [];
  try {
    docs = findSolutionDocs(SOLUTIONS_DIR);
  } catch {
    console.log("check-solutions: docs/solutions/ not found — nothing to check.");
    return;
  }
  docs.forEach(checkDoc);
  checkIndex(docs);

  if (problems.length > 0) {
    console.error("check-solutions: FAIL\n");
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error(`\n${problems.length} problem(s). See docs/solutions/README.md.`);
    process.exit(1);
  }
  console.log(`check-solutions: OK — ${docs.length} learning doc(s), index in sync.`);
}

main();
