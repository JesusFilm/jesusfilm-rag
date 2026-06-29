/**
 * TDD for the PR #52 hardening + the namespaced-credential integration:
 *  - resolveDatabaseUrl: prefers the namespaced prod var, falls back to
 *    DATABASE_URL, then a .env file — pure, so credential precedence is pinned
 *    without touching a real env.
 *  - prod-status-data.json carries `fetched_at` (the prod-read timestamp) so the
 *    build is a pure function of committed/local inputs (CodeRabbit #1).
 *  - the merge gate matches rows by data-key + data-language and checks that
 *    row's own cells, so a dropped shared-key row is caught (CodeRabbit #2).
 */
import { describe, it, expect } from "vitest";
import { resolveDatabaseUrl } from "../scripts/lib/dashboard/credentials.js";
import {
  prodReadSchema,
  prodStatusDataSchema,
} from "../scripts/lib/dashboard/types.js";
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

const PROD = "postgresql://prod_user:p@prod-host:5432/prod";
const DEV = "postgresql://dev_user:d@localhost:5434/jesusfilm_rag";

describe("resolveDatabaseUrl — credential precedence (namespaced var decouples dashboard from dev)", () => {
  it("prefers JFRAG_POSTGRESQL_DB_URL and reports its source", () => {
    expect(
      resolveDatabaseUrl({ JFRAG_POSTGRESQL_DB_URL: PROD, DATABASE_URL: DEV }),
    ).toEqual({ url: PROD, source: "JFRAG_POSTGRESQL_DB_URL" });
  });

  it("falls back to DATABASE_URL and reports it — so a dev/fallback read is never silent", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: DEV })).toEqual({
      url: DEV,
      source: "DATABASE_URL",
    });
  });

  it("falls back to a .env file's DATABASE_URL when neither env var is set", () => {
    expect(resolveDatabaseUrl({}, `FOO=bar\nDATABASE_URL=${DEV}\n`)).toEqual({
      url: DEV,
      source: ".env",
    });
  });

  it("throws (does not silently pick a wrong DB) when nothing provides a URL", () => {
    expect(() => resolveDatabaseUrl({}, "FOO=bar\n")).toThrow();
  });
});

describe("prod-status-data carries a fetched_at (determinism — CodeRabbit #1)", () => {
  it("prodStatusDataSchema requires fetched_at", () => {
    expect(() =>
      prodStatusDataSchema.parse({ ingested: [], acquired_keys: [] }),
    ).toThrow();
    expect(() =>
      prodStatusDataSchema.parse({ fetched_at: "2026-06-30", ingested: [], acquired_keys: [] }),
    ).not.toThrow();
  });

  it("prodReadSchema (the raw DB read) does NOT require fetched_at", () => {
    expect(() =>
      prodReadSchema.parse({ ingested: [], acquired_keys: [] }),
    ).not.toThrow();
  });
});

describe("merge gate matches per (data-key, data-language) — dropped shared-key row is caught (CodeRabbit #2)", () => {
  const registry: RegistrySource[] = [
    { key: "familylife", name: "FamilyLife", domain: "www.familylife.com", languages: ["en", "es"] },
  ];
  const yaml: YamlSources = {
    familylife: {
      name: "FamilyLife",
      status: "in-progress",
      languages: {
        en: { evaluateGreen: true, status: "done", note: null },
        es: { evaluateGreen: false, status: "in-progress", note: "pending" },
      },
    },
  };
  const prod: ProdStatusData = {
    fetched_at: "2026-06-30",
    ingested: [
      { key: "familylife", name: "FamilyLife", host: "www.familylife.com", language: "en", embedded_doc_count: 2239 },
    ],
    acquired_keys: ["familylife"],
  };
  const TEMPLATE = `<table><tbody><!-- DASHBOARD_ROWS --></tbody></table><p><!-- DASHBOARD_GENERATED_AT --></p><!-- DASHBOARD_SUMMARY -->`;

  function compiledAndHtml() {
    const data = buildCompiledData({ prod, yaml, registry, generatedAt: prod.fetched_at });
    return { data, html: renderHtml(TEMPLATE, data) };
  }

  it("passes when both familylife/en and familylife/es rows are present", () => {
    const { data, html } = compiledAndHtml();
    expect(assertHtmlContainsData(html, data)).toEqual([]);
  });

  it("catches a dropped familylife/es row even though familylife/en (same key) and 0-counts remain", () => {
    const { data, html } = compiledAndHtml();
    // Surgically remove only the es row's <tr>…</tr>; the en row (same data-key,
    // same source name "FamilyLife") and the '0' count both still exist globally.
    const broken = html.replace(/<tr data-key="familylife" data-language="es"[\s\S]*?<\/tr>/, "");
    expect(broken).toContain('data-language="en"'); // en row still there
    const misses = assertHtmlContainsData(broken, data);
    expect(misses.length).toBeGreaterThan(0);
    expect(misses.join(" ")).toContain("familylife/es");
  });
});
