/**
 * check-skills — the mechanical gate for skill discoverability + wiring.
 *
 *   pnpm check:skills
 *
 * A skill the agent docs don't point at is a skill no agent reaches for — the
 * compound-engineering loop (AGENT.md "Ways of working") is only real if every
 * skill is wired into the agent's entry doc and stays wired. Same philosophy as
 * check-solutions and the import law (architecture.md §5: "a boundary that
 * doesn't fail the build isn't real"). This script is that gate for
 * `.claude/skills/`. It checks two things and exits non-zero on any breach so CI
 * can block the merge:
 *
 *   1. Index completeness — every skill under `.claude/skills/` is linked, by a
 *      resolving markdown link to its own SKILL.md, from the canonical index in
 *      AGENT.md. A skill present on disk but absent from the index fails.
 *   2. No dangling skill links — every `.claude/skills/<name>/SKILL.md` link in
 *      the agentic docs resolves to a real file. A pointer at a renamed or
 *      removed skill fails (catches the "skill index drifts from the tree" rot).
 *
 * Dependency-free (no markdown parser, no glob): a regex over link targets is
 * enough, and avoids adding a dep to a gate that runs on every PR. Links are
 * resolved relative to each doc's own directory, like a markdown renderer.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, ".claude", "skills");

/** The canonical, agent-facing skill index — every skill must be linked here. */
const INDEX_DOC = path.join(ROOT, "AGENT.md");

/** Every doc whose `.claude/skills/.../SKILL.md` links must resolve. */
const WIRING_DOCS = [
  INDEX_DOC,
  path.join(ROOT, "compound-engineering.local.md"),
  path.join(ROOT, "docs", "workflow", "ways-of-working.md"),
  path.join(ROOT, "docs", "solutions", "README.md"),
];

const problems: string[] = [];
const note = (rel: string, msg: string) => problems.push(`${rel}: ${msg}`);

/** Skill names: every directory under `.claude/skills/` that holds a SKILL.md. */
function findSkills(): string[] {
  return readdirSync(SKILLS_DIR)
    .filter((entry) => {
      const skill = path.join(SKILLS_DIR, entry);
      try {
        return statSync(skill).isDirectory() && statSync(path.join(skill, "SKILL.md")).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

/** Markdown link targets in a file, resolved (absolute) relative to its dir. */
function resolvedLinkTargets(docAbs: string): string[] {
  const text = readFileSync(docAbs, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const dir = path.dirname(docAbs);
  const out: string[] = [];
  for (const m of text.matchAll(/]\(([^)]+)\)/g)) {
    const target = m[1].split("#")[0].trim(); // drop any #anchor
    if (target === "" || target.startsWith("http")) continue;
    out.push(path.resolve(dir, target));
  }
  return out;
}

/** 1. Every skill is linked from AGENT.md by a resolving link to its SKILL.md. */
function checkIndexCompleteness(skills: string[]): void {
  const linked = new Set(resolvedLinkTargets(INDEX_DOC));
  for (const skill of skills) {
    const skillDoc = path.join(SKILLS_DIR, skill, "SKILL.md");
    if (!linked.has(skillDoc)) {
      note(
        path.relative(ROOT, INDEX_DOC),
        `skill \`${skill}\` is not linked — add a markdown link to ` +
          `\`.claude/skills/${skill}/SKILL.md\` in the skill index`,
      );
    }
  }
}

/** 2. Every `.claude/skills/.../SKILL.md` link in the agentic docs resolves. */
function checkNoDanglingSkillLinks(): void {
  for (const docAbs of WIRING_DOCS) {
    let targets: string[];
    try {
      targets = resolvedLinkTargets(docAbs);
    } catch {
      continue; // a missing optional doc is not this gate's concern
    }
    for (const abs of targets) {
      const rel = path.relative(ROOT, abs);
      if (!rel.startsWith(path.join(".claude", "skills"))) continue;
      if (!rel.endsWith(".md")) continue;
      try {
        statSync(abs);
      } catch {
        note(
          path.relative(ROOT, docAbs),
          `links a missing skill file: ${rel} (renamed or removed?)`,
        );
      }
    }
  }
}

function main(): void {
  let skills: string[];
  try {
    skills = findSkills();
  } catch {
    console.log("check-skills: .claude/skills/ not found — nothing to check.");
    return;
  }
  checkIndexCompleteness(skills);
  checkNoDanglingSkillLinks();

  if (problems.length > 0) {
    console.error("check-skills: FAIL\n");
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error(
      `\n${problems.length} problem(s). Every skill must be linked from the ` +
        `AGENT.md skill index, and every skill link must resolve.`,
    );
    process.exit(1);
  }
  console.log(`check-skills: OK — ${skills.length} skill(s), all linked and resolving.`);
}

main();
