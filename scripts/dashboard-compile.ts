/**
 * `pnpm dashboard:build` — merge the prod read (dashboard/prod-status-data.json)
 * with the asserted tracker (docs/source-status.yaml) and the registry into
 * dashboard/compiled-data.json, then render dashboard/index.html from
 * dashboard/template.html.
 *
 * No DB and no secrets: it reads three committed/local inputs and writes two
 * outputs. Safe to run in CI or by anyone after a `dashboard:data` refresh.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { allSources } from "@/registry/index.js";
import { buildCompiledData, renderHtml } from "./lib/dashboard/compile.js";
import {
  prodStatusDataSchema,
  type RegistrySource,
  type YamlSources,
} from "./lib/dashboard/types.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const PROD_JSON = path.join(ROOT, "dashboard", "prod-status-data.json");
const YAML_FILE = path.join(ROOT, "docs", "source-status.yaml");
const TEMPLATE = path.join(ROOT, "dashboard", "template.html");
const COMPILED_JSON = path.join(ROOT, "dashboard", "compiled-data.json");
const INDEX_HTML = path.join(ROOT, "dashboard", "index.html");

/** Project the rich source-status.yaml into the minimal shape compile needs. */
function projectYaml(raw: string): YamlSources {
  const doc = parse(raw) as {
    sources?: Record<
      string,
      {
        name: string;
        status: string;
        languages: Record<
          string,
          { status: string; stages: { evaluate: string }; note?: string; blocker?: string }
        >;
      }
    >;
  };
  const out: YamlSources = {};
  for (const [key, src] of Object.entries(doc.sources ?? {})) {
    const languages: YamlSources[string]["languages"] = {};
    for (const [lang, entry] of Object.entries(src.languages)) {
      languages[lang] = {
        evaluateGreen: entry.stages.evaluate === "green",
        status: entry.status,
        // Surface a blocker as the note when there's no explicit note, so a
        // blocked row shows *why* on the dashboard rather than going silent.
        note: entry.note ?? entry.blocker ?? null,
      };
    }
    out[key] = { name: src.name, status: src.status, languages };
  }
  return out;
}

function projectRegistry(): RegistrySource[] {
  return allSources().map((s) => ({
    key: s.key,
    name: s.name,
    domain: s.domain,
    languages: [...s.languages],
  }));
}

async function main(): Promise<void> {
  const prod = prodStatusDataSchema.parse(JSON.parse(await readFile(PROD_JSON, "utf8")));
  const yaml = projectYaml(await readFile(YAML_FILE, "utf8"));
  const registry = projectRegistry();
  const template = await readFile(TEMPLATE, "utf8");

  // generated_at comes from the prod read (prod.fetched_at), NOT the build clock,
  // so rebuilding the same export reproduces identical output (CodeRabbit #1).
  const compiled = buildCompiledData({ prod, yaml, registry, generatedAt: prod.fetched_at });
  const html = renderHtml(template, compiled);

  await writeFile(COMPILED_JSON, JSON.stringify(compiled, null, 2) + "\n", "utf8");
  await writeFile(INDEX_HTML, html, "utf8");

  console.log(
    `✔ compiled ${compiled.sources.length} source×language row(s) → ${path.relative(process.cwd(), COMPILED_JSON)} + ${path.relative(process.cwd(), INDEX_HTML)}`,
  );
}

main().catch((e: unknown) => {
  console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
