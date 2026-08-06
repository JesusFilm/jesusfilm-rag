import { describe, expect, it } from "vitest";
import { lstatSync, readFileSync, realpathSync, readdirSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

const ROOT = process.cwd();
const SKILLS = ["adr", "golden", "slice", "status-dashboard"] as const;
const IMPLICIT = { adr: false, golden: true, slice: false, "status-dashboard": false } as const;

function frontmatter(file: string): Record<string, unknown> {
  const content = readFileSync(file, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  expect(match, `${file} must start with YAML frontmatter`).not.toBeNull();
  return YAML.parse(match![1]) as Record<string, unknown>;
}

describe("cross-agent skill packaging", () => {
  it("publishes only the supported canonical skills", () => {
    expect(readdirSync(path.join(ROOT, "skills")).sort()).toEqual([...SKILLS].sort());
  });

  for (const skill of SKILLS) {
    it(`exposes ${skill} to Codex through a repository symlink`, () => {
      const link = path.join(ROOT, ".agents", "skills", skill);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(realpathSync(link)).toBe(realpathSync(path.join(ROOT, "skills", skill)));
      expect(frontmatter(path.join(link, "SKILL.md")).name).toBe(skill);
    });

    it(`exposes ${skill} to Claude with tool and invocation policy`, () => {
      const launcher = path.join(ROOT, ".claude", "skills", skill, "SKILL.md");
      const metadata = frontmatter(launcher);
      const content = readFileSync(launcher, "utf8");

      expect(metadata.name).toBe(skill);
      expect(metadata["allowed-tools"]).toBeTypeOf("string");
      expect(metadata["disable-model-invocation"] === true).toBe(!IMPLICIT[skill]);
      expect(content).toContain(`../../../skills/${skill}/SKILL.md`);
    });

    it(`sets the matching Codex invocation policy for ${skill}`, () => {
      const metadata = YAML.parse(
        readFileSync(path.join(ROOT, "skills", skill, "agents", "openai.yaml"), "utf8"),
      ) as { policy?: { allow_implicit_invocation?: boolean } };

      expect(metadata.policy?.allow_implicit_invocation).toBe(IMPLICIT[skill]);
    });
  }
});
