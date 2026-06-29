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

/** The raw prod export written by `pnpm dashboard:data`. */
export const prodStatusDataSchema = z
  .object({
    ingested: z.array(prodIngestedRowSchema),
    // Every source key present in raw_documents (the acquisition signal). A key
    // here means "raw documents captured" — acquire is true for every canonical
    // (source × language) row whose key appears in this set.
    acquired_keys: z.array(z.string().min(1)),
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

/** The curated data source that feeds the HTML (committed; the CI merge gate
 *  asserts the compiled HTML contains every row below). */
export const compiledDataSchema = z
  .object({
    generated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
    sources: z.array(compiledRowSchema),
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
