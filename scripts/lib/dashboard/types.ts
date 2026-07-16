/**
 * Data shapes for the public status dashboard pipeline.
 *
 *   prod DB ──(dashboard:data)──▶ prod-status-data.json
 *   prod-status-data.json + docs/source-status.yaml + registry
 *           ──(dashboard:build)──▶ compiled-data.json ──▶ dashboard/index.html
 *
 * Two flag families, kept deliberately distinct:
 *   - acquire / ingest come from the PROD database (verified inventory).
 *   - evaluate is a DECISION: true only when prod has acquired AND ingested the
 *     row AND the engineer marked `stages.evaluate: green` in
 *     docs/source-status.yaml (the shipped-via-PR signal that source-quality
 *     evaluation actually happened). The prod eval script is a non-gating
 *     sanity check and is intentionally NOT consulted here.
 */
import { z } from "zod";

/** One ingested (source × language) row as observed in the prod DB. */
export const prodIngestedRowSchema = z
  .object({
    key: z.string().min(1), // canonical registry/source key (sources.key)
    name: z.string().min(1), // prod-observed display name (sources.name)
    host: z.string().nullable(), // sources.domain — bare host, may be null
    language: z.string().min(1), // documents.language
    embedded_doc_count: z.number().int().nonnegative(),
  })
  .strict();
export type ProdIngestedRow = z.infer<typeof prodIngestedRowSchema>;

/** One source's tally of embedded documents with NO detected language
 *  (`documents.language IS NULL`). These are in the index and retrievable —
 *  just unattributed to a language — so they are surfaced separately rather
 *  than dropped, which would silently under-report the index (#86). Only
 *  sources with at least one such document appear. */
export const prodUnclassifiedRowSchema = z
  .object({
    key: z.string().min(1), // canonical registry/source key (sources.key)
    name: z.string().min(1), // prod-observed display name (sources.name)
    host: z.string().nullable(), // sources.domain — bare host, may be null
    embedded_doc_count: z.number().int().positive(), // > 0: only listed when non-empty
  })
  .strict();
export type ProdUnclassifiedRow = z.infer<typeof prodUnclassifiedRowSchema>;

/** The raw DB read result — exactly what `fetchProdStatus`/`shapeProdStatus`
 *  produce, with no timestamp (those are pure data-shaping). */
export const prodReadSchema = z
  .object({
    ingested: z.array(prodIngestedRowSchema),
    // Every source key present in raw_documents (the acquisition signal). A key
    // here means "raw documents captured" — acquire is true for every canonical
    // (source × language) row whose key appears in this set.
    acquired_keys: z.array(z.string().min(1)),
    // Per-source tally of embedded docs with no detected language (#86).
    // Optional + default `[]` so exports written before this field still parse.
    unclassified: z.array(prodUnclassifiedRowSchema).default([]),
  })
  .strict();
export type ProdRead = z.infer<typeof prodReadSchema>;

/**
 * The raw prod export written by `pnpm dashboard:data`: the DB read plus
 * `fetched_at`, the date the prod read actually happened. `fetched_at` is the
 * SINGLE source of the published "Updated" label and of compiled-data.json's
 * `generated_at`, so `dashboard:build` is a pure function of its committed/local
 * inputs — rebuilding the same export reproduces byte-identical artifacts (no
 * hidden build-time clock). See docs/ops/dashboard.md.
 */
export const prodStatusDataSchema = prodReadSchema
  .extend({
    fetched_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  })
  .strict();
export type ProdStatusData = z.infer<typeof prodStatusDataSchema>;

/** One compiled dashboard row — exactly one source × language combination. */
export const compiledRowSchema = z
  .object({
    source: z.string().min(1), // display name
    key: z.string().min(1), // canonical key (stable join id / sort)
    host: z.string().nullable(), // bare host URL, or null when unknown
    language: z.string().min(1), // language code
    acquire: z.boolean(),
    ingest: z.boolean(),
    evaluate: z.boolean(),
    embedded_doc_count: z.number().int().nonnegative(),
    // Honest enrichment from docs/source-status.yaml so a blocked/deferred row
    // is never silently shown as merely "not yet done".
    row_status: z.enum(["in-progress", "blocked", "done", "deferred", "unknown"]),
    note: z.string().nullable(),
  })
  .strict();
export type CompiledRow = z.infer<typeof compiledRowSchema>;

/** One compiled "unclassified documents" row — a source with embedded docs that
 *  have no detected language. No lifecycle flags/stage: it is a count, not a
 *  (source × language) coverage cell (#86). */
export const compiledUnclassifiedRowSchema = z
  .object({
    source: z.string().min(1), // display name
    key: z.string().min(1), // canonical key (stable join id / sort)
    host: z.string().nullable(), // bare host URL, or null when unknown
    embedded_doc_count: z.number().int().positive(),
  })
  .strict();
export type CompiledUnclassifiedRow = z.infer<typeof compiledUnclassifiedRowSchema>;

/** The curated data source that feeds the HTML (committed; the CI merge gate
 *  asserts the compiled HTML contains every row below). */
export const compiledDataSchema = z
  .object({
    generated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
    sources: z.array(compiledRowSchema),
    // Sources with embedded docs that have no detected language (#86). Optional
    // + default `[]` so compiled artifacts written before this field still parse.
    unclassified: z.array(compiledUnclassifiedRowSchema).default([]),
  })
  .strict();
export type CompiledData = z.infer<typeof compiledDataSchema>;

/** Minimal registry projection the compile step needs (decoupled from the full
 *  SourceEntry so the pure builder stays trivially testable). */
export interface RegistrySource {
  key: string;
  name: string;
  domain: string;
  languages: string[];
}

/** Minimal yaml projection: per source key, its display name, row status, and
 *  per-language evaluate stage + optional note. */
export interface YamlLanguage {
  evaluateGreen: boolean;
  status: string;
  note: string | null;
}
export interface YamlSource {
  name: string;
  status: string;
  languages: Record<string, YamlLanguage>;
}
export type YamlSources = Record<string, YamlSource>;
