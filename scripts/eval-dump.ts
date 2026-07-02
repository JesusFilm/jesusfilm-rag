/**
 * Judge-harness dump (operator tooling, no CI hook): per-case retrieval
 * evidence as JSON for LLM-as-judge review — question, credited relevant set,
 * and the language-scoped top-10 with titles + chunk snippets. Mirrors
 * scripts/eval.ts retrieval exactly (same Retriever, same caseLanguage
 * scoping); read-only against the corpus.
 *
 *   pnpm tsx scripts/eval-dump.ts --out /path/dump.json [--source <key>]
 */
import "@/env.js";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { wire } from "@/main.js";
import { SOURCES } from "@/registry/index.js";
import { GoldenFileSchema, caseLanguage, safePathname } from "./eval-metrics.js";

const TOP_K = 10;

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

async function main(): Promise<void> {
  const out = arg("--out");
  if (!out) {
    console.error("usage: pnpm tsx scripts/eval-dump.ts --out <file> [--source <key>]");
    process.exit(2);
  }
  const source = arg("--source");
  const raw = await readFile(path.resolve(process.cwd(), "eval/qa-golden.yaml"), "utf8");
  const golden = GoldenFileSchema.parse(YAML.parse(raw));
  const cases = source
    ? golden.cases.filter((c) => Object.prototype.hasOwnProperty.call(c.relevant, source))
    : golden.cases;
  const languagesBySource = Object.fromEntries(SOURCES.map((s) => [s.key, s.languages]));

  const wiring = wire();
  try {
    const dump = [];
    for (const c of cases) {
      const language = caseLanguage(c, languagesBySource);
      const ranked = await wiring.retriever.search(c.question, {
        topK: TOP_K,
        ...(language ? { language } : {}),
      });
      dump.push({
        id: c.id,
        question: c.question,
        language,
        relevant: c.relevant,
        hits: ranked.map((r, i) => ({
          rank: i + 1,
          score: Number(r.score.toFixed(3)),
          sourceKey: r.citation.sourceKey,
          path: safePathname(r.citation.url),
          title: r.citation.title,
          snippet: r.text.replace(/\s+/g, " ").slice(0, 220),
        })),
      });
      console.log(`dumped ${c.id} (${dump[dump.length - 1].hits.length} hits)`);
    }
    await writeFile(out, JSON.stringify(dump, null, 1));
    console.log(`wrote ${dump.length} cases → ${out}`);
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
