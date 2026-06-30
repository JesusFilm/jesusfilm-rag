/**
 * Unit tests for the pure dashboard compile step — the merge of prod-verified
 * inventory (prod-status-data.json) with the asserted tracker
 * (docs/source-status.yaml) and the registry, into compiled-data.json.
 *
 * No DB, no filesystem: buildCompiledData is a pure function over parsed inputs,
 * so the evaluate-rule and the multilingual/acquired-only edge cases are pinned
 * deterministically.
 */
import { describe, it, expect } from "vitest";
import {
  buildCompiledData,
  renderHtml,
  assertHtmlContainsData,
} from "../scripts/lib/dashboard/compile.js";
import type {
  ProdStatusData,
  RegistrySource,
  YamlSources,
} from "../scripts/lib/dashboard/types.js";

const registry: RegistrySource[] = [
  { key: "jesusfilm-org", name: "Jesus Film Project", domain: "www.jesusfilm.org", languages: ["en"] },
  { key: "thelife", name: "thelife", domain: "thelife.com", languages: ["en"] },
  { key: "thelife-fr", name: "thelife — French", domain: "laviejenparle.com", languages: ["fr"] },
  { key: "familylife", name: "FamilyLife", domain: "www.familylife.com", languages: ["en", "es"] },
];

const yaml: YamlSources = {
  "jesusfilm-org": {
    name: "Jesus Film Project",
    status: "done",
    languages: { en: { evaluateGreen: true, status: "done", note: null } },
  },
  thelife: {
    name: "thelife (Cru Canada)",
    status: "done",
    languages: { en: { evaluateGreen: true, status: "done", note: null } },
  },
  "thelife-fr": {
    name: "thelife — French (La Vie J'en Parle)",
    status: "in-progress",
    languages: { fr: { evaluateGreen: false, status: "in-progress", note: "pending embedder-model swap" } },
  },
  familylife: {
    name: "FamilyLife",
    status: "in-progress",
    languages: {
      en: { evaluateGreen: true, status: "done", note: null },
      es: { evaluateGreen: false, status: "in-progress", note: "pending embedder-model swap" },
    },
  },
  // yaml-only source (not in the registry): a blocked source must still surface.
  everystudent: {
    name: "EveryStudent",
    status: "blocked",
    languages: { en: { evaluateGreen: false, status: "blocked", note: "Cloudflare challenge" } },
  },
};

const prod: ProdStatusData = {
  fetched_at: "2026-06-29",
  ingested: [
    { key: "jesusfilm-org", name: "Jesus Film Project", host: "www.jesusfilm.org", language: "en", embedded_doc_count: 349 },
    { key: "thelife", name: "thelife", host: "thelife.com", language: "en", embedded_doc_count: 4485 },
    { key: "familylife", name: "FamilyLife", host: "www.familylife.com", language: "en", embedded_doc_count: 2239 },
  ],
  acquired_keys: ["jesusfilm-org", "thelife", "thelife-fr", "thelife-zh", "familylife"],
};

function build() {
  return buildCompiledData({ prod, yaml, registry, generatedAt: "2026-06-29" });
}

function rowFor(key: string, language: string) {
  const row = build().sources.find((r) => r.key === key && r.language === language);
  if (!row) throw new Error(`no compiled row for ${key}/${language}`);
  return row;
}

describe("buildCompiledData — evaluate rule", () => {
  it("evaluate is true only when prod-acquired AND prod-ingested AND yaml evaluate is green", () => {
    const jf = rowFor("jesusfilm-org", "en");
    expect([jf.acquire, jf.ingest, jf.evaluate]).toEqual([true, true, true]);
    expect(jf.embedded_doc_count).toBe(349);
  });

  it("ingested-but-yaml-not-green stays evaluate:false even with content in prod", () => {
    // familylife/en is prod-acquired AND prod-ingested; flip ONLY its yaml
    // evaluate flag to not-green and assert evaluate collapses to false. This
    // genuinely exercises the false branch — a regression that ignored
    // evaluateGreen would keep it true and fail here.
    const compiled = buildCompiledData({
      prod,
      yaml: {
        ...yaml,
        familylife: {
          ...yaml.familylife,
          languages: {
            ...yaml.familylife.languages,
            en: { ...yaml.familylife.languages.en, evaluateGreen: false },
          },
        },
      },
      registry,
      generatedAt: "2026-06-29",
    });
    const fl = compiled.sources.find((r) => r.key === "familylife" && r.language === "en");
    expect([fl?.acquire, fl?.ingest, fl?.evaluate]).toEqual([true, true, false]);
  });

  it("acquired-only row (no ingest) is acquire:true, ingest:false, evaluate:false", () => {
    const fr = rowFor("thelife-fr", "fr");
    expect([fr.acquire, fr.ingest, fr.evaluate]).toEqual([true, false, false]);
    expect(fr.embedded_doc_count).toBe(0);
  });

  it("multilingual single-key source: the un-ingested language is acquired via the shared key", () => {
    const es = rowFor("familylife", "es");
    // 'familylife' is in acquired_keys (shared raw_documents key) → es is acquired,
    // but es has no ingested docs → ingest false, evaluate false.
    expect([es.acquire, es.ingest, es.evaluate]).toEqual([true, false, false]);
  });

  it("a source absent from prod entirely is acquire:false (blocked source still listed)", () => {
    const es = rowFor("everystudent", "en");
    expect([es.acquire, es.ingest, es.evaluate]).toEqual([false, false, false]);
    expect(es.row_status).toBe("blocked");
    expect(es.note).toContain("Cloudflare");
  });
});

describe("buildCompiledData — row set & enrichment", () => {
  it("emits exactly one row per canonical (source × language), registry ∪ yaml ∪ prod", () => {
    const rows = build().sources;
    const ids = rows.map((r) => `${r.key}/${r.language}`).sort();
    expect(ids).toEqual(
      [
        "everystudent/en",
        "familylife/en",
        "familylife/es",
        "jesusfilm-org/en",
        "thelife-fr/fr",
        "thelife/en",
      ].sort(),
    );
  });

  it("prefers the registry host/name and never invents a host", () => {
    expect(rowFor("thelife-fr", "fr").host).toBe("laviejenparle.com");
    expect(rowFor("everystudent", "en").host).toBeNull(); // not in registry
  });

  it("is deterministic and sorted (stable across runs)", () => {
    expect(JSON.stringify(build())).toEqual(JSON.stringify(build()));
  });
});

describe("renderHtml + assertHtmlContainsData (the merge-gate contract)", () => {
  const TEMPLATE = `<!doctype html><html><body>
    <h1>JesusFilm RAG</h1>
    <p>Updated <!-- DASHBOARD_GENERATED_AT --></p>
    <table><tbody><!-- DASHBOARD_ROWS --></tbody></table>
  </body></html>`;

  it("renders every compiled row's source, language and count into the HTML", () => {
    const data = build();
    const html = renderHtml(TEMPLATE, data);
    expect(html).toContain("2026-06-29");
    for (const row of data.sources) {
      expect(html).toContain(row.source);
      expect(html).toContain(row.language);
      expect(html).toContain(row.embedded_doc_count.toLocaleString("en-US"));
    }
    // placeholders fully consumed
    expect(html).not.toContain("DASHBOARD_ROWS");
    expect(html).not.toContain("DASHBOARD_GENERATED_AT");
  });

  it("assertHtmlContainsData returns no misses for a faithfully-rendered page", () => {
    const data = build();
    const html = renderHtml(TEMPLATE, data);
    expect(assertHtmlContainsData(html, data)).toEqual([]);
  });

  it("assertHtmlContainsData catches a row dropped from the HTML (the gate bites)", () => {
    const data = build();
    // "Jesus Film Project" is a unique source name — corrupting it must be caught.
    const html = renderHtml(TEMPLATE, data).replace("Jesus Film Project", "Faketext");
    const misses = assertHtmlContainsData(html, data);
    expect(misses.length).toBeGreaterThan(0);
    expect(misses.join(" ")).toContain("Jesus Film Project");
  });
});
