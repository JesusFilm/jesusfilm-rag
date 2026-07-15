/**
 * language-sweep-core — the engine behind the #73/#84 corpus language sweep,
 * shared by the local (`scripts/language-sweep.ts`) and production
 * (`scripts/language-sweep-production.ts`) runners. Split out so the production
 * runner can dynamic-import it AFTER installing prod credentials, while the local
 * runner imports it directly.
 *
 * It re-derives `documents.language` for every in-scope document by REPLAYING the
 * real ingest text path — `cleanText(raw_documents.raw_content)` — and then asking
 * an injected **`LanguageDetector`** (the OpenRouter LLM, #84) for the language,
 * accurate regardless of length. It never re-implements detection, never touches
 * chunks/embeddings, and only ever writes `documents.language`. Properties:
 *
 *   • LLM-accurate, no length floor — the LLM is authoritative at any length and
 *     honestly abstains (→ `null`) when it can't tell, so short foreign pages that
 *     tinyld mislabels (#84's Spanish-tagged-`vi`) are corrected, not left wrong.
 *   • label-only & null-averse — every doc ends labelled unless the model abstains;
 *     each remaining null is highlighted at the end of the report.
 *   • parallel but safe — documents are detected through a small concurrency pool
 *     (by index), and a single serialized append-writer owns each log file so the
 *     workers never interleave partial lines.
 *   • safe & revertible — dry-run by default; `--apply` writes each source in ONE
 *     transaction behind an optimistic guard, and appends a change log that
 *     `--revert <log>` replays.
 *   • self-proving on coverage — reports scanned vs. in-scope; `--verify-log`
 *     writes a per-document ledger.
 *
 * Pure arg parsing (`parseArgs`) and the label decision (`decideSweep`,
 * `resolveFromLlm` in resolve-language.ts) are unit-tested; this module owns I/O.
 */
import { mkdir, writeFile, appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import type postgres from "postgres";
import { allSources, getSource } from "@/registry/index.js";
import type { SourceEntry } from "@/registry/index.js";
import { cleanText } from "@/ingestion/normalize.js";
import { resolveFromLlm, decideSweep } from "@/ingestion/resolve-language.js";
import type { LanguageResolution, SweepReason } from "@/ingestion/resolve-language.js";
import type { LanguageDetector, LlmReviewer } from "@/contracts/index.js";

// ── arg model ────────────────────────────────────────────────────────────────

export type SweepMode = "full" | "blanks";

export interface SweepArgs {
  kind: "sweep";
  sources: "all" | string; // 'all' or a single source key
  mode: SweepMode;
  apply: boolean;
  limit: number | null;
  sampleChars: number;
  sampleLimit: number;
  /** Output dir from `--out-dir`, or null to resolve from env/default at run time. */
  outDir: string | null;
  verifyLog: boolean;
  /** Max concurrent detector calls per source (default 3). */
  concurrency: number;
  /** Max chars of cleaned content sent to the detector (default 8000). */
  maxDetectChars: number;
  /** Run a post-run LLM sanity review over the change log. */
  llmReview: boolean;
}

/** Env var that sets the default output directory (overridden by `--out-dir`). */
export const OUT_DIR_ENV = "LANGUAGE_SWEEP_OUT_DIR";

export interface RevertArgs {
  kind: "revert";
  changelog: string;
  apply: boolean;
}

export type ParsedArgs = SweepArgs | RevertArgs | { kind: "help" };

/** Injected run dependencies — the DB client and the language detector. Supplied
 *  by the local runner (from `wire()`) or the production runner (after creds). */
export interface SweepDeps {
  client: postgres.Sql;
  detector: LanguageDetector;
  /** Optional reviewer for the `--llm-review` sanity pass; omitted ⇒ skipped. */
  reviewer?: LlmReviewer;
}

/** Parse argv (without node/script prefix). Throws on any invalid combination. */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  if (argv.includes("--help") || argv.includes("-h")) return { kind: "help" };

  // Flags that take a value, and boolean flags — anything else is an error.
  const valued = new Set([
    "--source",
    "--mode",
    "--limit",
    "--sample-chars",
    "--sample-limit",
    "--out-dir",
    "--revert",
    "--concurrency",
    "--max-detect-chars",
  ]);
  const boolean = new Set(["--all", "--apply", "--verify-log", "--llm-review"]);

  const opts: Record<string, string> = {};
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (boolean.has(a)) {
      flags.add(a);
    } else if (valued.has(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) {
        throw new Error(`flag ${a} requires a value`);
      }
      opts[a] = v;
      i++;
    } else {
      throw new Error(`unknown or misplaced argument: ${a}`);
    }
  }

  // Revert is its own command: it accepts ONLY --revert and an optional --apply.
  if (opts["--revert"] !== undefined) {
    const stray =
      Object.keys(opts).find((k) => k !== "--revert") ??
      [...flags].find((f) => f !== "--apply");
    if (stray) {
      throw new Error(`--revert takes only an optional --apply; remove ${stray}`);
    }
    return {
      kind: "revert",
      changelog: opts["--revert"],
      apply: flags.has("--apply"),
    };
  }

  // Sweep: exactly one of --source / --all.
  const hasAll = flags.has("--all");
  const source = opts["--source"];
  if (hasAll && source !== undefined) {
    throw new Error("use exactly one of --source <key> or --all, not both");
  }
  if (!hasAll && source === undefined) {
    throw new Error("specify a source: --source <key> or --all");
  }

  const mode = (opts["--mode"] ?? "full") as SweepMode;
  if (mode !== "full" && mode !== "blanks") {
    throw new Error(`--mode must be 'full' or 'blanks', got '${mode}'`);
  }

  const num = (flag: string, def: number): number => {
    if (opts[flag] === undefined) return def;
    const n = Number(opts[flag]);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`${flag} must be a positive integer, got '${opts[flag]}'`);
    }
    return n;
  };

  return {
    kind: "sweep",
    sources: hasAll ? "all" : source!,
    mode,
    apply: flags.has("--apply"),
    limit: opts["--limit"] !== undefined ? num("--limit", 0) : null,
    sampleChars: num("--sample-chars", 240),
    sampleLimit: num("--sample-limit", 15),
    outDir: opts["--out-dir"] ?? null,
    verifyLog: flags.has("--verify-log"),
    concurrency: num("--concurrency", 3),
    maxDetectChars: num("--max-detect-chars", 8000),
    llmReview: flags.has("--llm-review"),
  };
}

// ── per-document classification ──────────────────────────────────────────────

const ISO_CODE = /^[a-z]{2,3}$/;

interface DocRow {
  id: string;
  canonical_url: string;
  old_language: string | null;
  raw_content: string | null;
}

interface DocResult {
  id: string;
  url: string;
  old: string | null;
  new: string | null; // the label decideSweep chose (== old unless it changed)
  reason: SweepReason;
  changed: boolean; // a DB write is needed (relabel or filled)
  review: boolean; // human should eyeball
  applied?: boolean; // set true once the guarded UPDATE actually wrote this row
  res: LanguageResolution;
  contentLen: number;
  snippet: string;
  anomaly?: string; // e.g. no raw snapshot, an invalid code, or a detection failure
}

interface SourceReport {
  key: string;
  declared: string[];
  inScope: number;
  scanned: number;
  missingRaw: number;
  results: DocResult[];
  applied: number;
  skippedGuard: number;
}

// ── serialized append writer ─────────────────────────────────────────────────

/**
 * One serialized writer per log file: chains every `append` onto a single
 * promise so concurrent detector workers never interleave partial lines. Writes
 * complete in call order per file; `drain()` awaits the tail.
 */
export class SerialAppender {
  private tail: Promise<void> = Promise.resolve();
  constructor(private readonly file: string) {}
  append(line: string): Promise<void> {
    this.tail = this.tail.then(() => appendFile(this.file, line, "utf8"));
    return this.tail;
  }
  drain(): Promise<void> {
    return this.tail;
  }
}

/** Run `fn` over `items` with at most `limit` in flight, dispatched by index. */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

// ── sweep core (I/O) ─────────────────────────────────────────────────────────

function snippetOf(content: string, n: number): string {
  return content
    .slice(0, n + 16) // slice a little extra before trimming the noise prefix
    .replace(/\s+/g, " ")
    // Strip a leading run of scraper-noise tokens that are exactly "0" or "100"
    // (e.g. "0 100 0 " prefixes many cru pages) — display-only; detection ran on
    // the full cleaned content, not this snippet.
    .replace(/^(?:0|100)(?:\s+(?:0|100))*\s+/, "")
    .slice(0, n)
    .trim();
}

/** Re-derive labels for one source via the LLM detector. Streams each document's
 *  changelog/CSV lines through the serialized appenders as it completes (live +
 *  crash-safe: a source's changelog is fully flushed before it is applied). PURE
 *  of DB writes — computes the proposed changes only. */
async function analyzeSource(
  entry: SourceEntry,
  args: SweepArgs,
  deps: SweepDeps,
  ts: string,
  writers: { changelog: SerialAppender; csv: SerialAppender },
): Promise<SourceReport> {
  const { client } = deps;
  const declared = entry.languages;

  const scopeCount = args.mode === "blanks"
    ? await client<{ n: number }[]>`
        select count(*)::int n from documents d
        join sources s on s.id = d.source_id
        where s.key = ${entry.key} and d.language is null`
    : await client<{ n: number }[]>`
        select count(*)::int n from documents d
        join sources s on s.id = d.source_id
        where s.key = ${entry.key}`;
  const inScope = scopeCount[0].n;

  const rows = args.mode === "blanks"
    ? await client<DocRow[]>`
        select distinct on (d.id) d.id, d.canonical_url,
               d.language as old_language, r.raw_content
        from documents d
        join sources s on s.id = d.source_id
        left join raw_documents r
          on r.source_key = s.key and r.canonical_url = d.canonical_url
        where s.key = ${entry.key} and d.language is null
        order by d.id, r.fetched_at desc nulls last
        ${args.limit ? client`limit ${args.limit}` : client``}`
    : await client<DocRow[]>`
        select distinct on (d.id) d.id, d.canonical_url,
               d.language as old_language, r.raw_content
        from documents d
        join sources s on s.id = d.source_id
        left join raw_documents r
          on r.source_key = s.key and r.canonical_url = d.canonical_url
        where s.key = ${entry.key}
        order by d.id, r.fetched_at desc nulls last
        ${args.limit ? client`limit ${args.limit}` : client``}`;

  // Detect every document through the concurrency pool. Each worker streams its
  // own changelog/CSV lines via the serialized appenders as it finishes.
  const results = await mapPool(rows, args.concurrency, async (row): Promise<DocResult> => {
    const result = await classifyDoc(row, args, deps, declared);
    await writers.csv.append(csvLine(entry.key, result) + "\n");
    if (result.changed && !result.anomaly) {
      await writers.changelog.append(changelogLine(entry.key, result, ts) + "\n");
    }
    return result;
  });

  const missingRaw = results.filter(
    (r) => r.anomaly === MISSING_RAW_ANOMALY,
  ).length;

  return {
    key: entry.key,
    declared: [...declared],
    inScope,
    scanned: rows.length,
    missingRaw,
    results,
    applied: 0,
    skippedGuard: 0,
  };
}

const MISSING_RAW_ANOMALY = "no raw snapshot — left unchanged";

/** Classify ONE document: detect (LLM) → resolve → decide. Never throws — a
 *  detection failure or missing snapshot becomes an anomaly, so one bad row can
 *  never abort the run. */
async function classifyDoc(
  row: DocRow,
  args: SweepArgs,
  deps: SweepDeps,
  declared: readonly string[],
): Promise<DocResult> {
  if (row.raw_content === null) {
    return {
      id: row.id,
      url: row.canonical_url,
      old: row.old_language,
      new: row.old_language,
      reason: "kept",
      changed: false,
      review: true,
      res: { language: row.old_language, basis: "unresolved-null", detected: "", confidence: 0 },
      contentLen: 0,
      snippet: "",
      anomaly: MISSING_RAW_ANOMALY,
    };
  }

  const content = cleanText(row.raw_content);
  let res: LanguageResolution;
  try {
    const det = await deps.detector.detect(content.slice(0, args.maxDetectChars), {
      declared,
    });
    res = resolveFromLlm(det, { declared });
  } catch (err) {
    // Hard detector failure (after retries) — surface, never touch the row.
    const msg = err instanceof Error ? err.message : String(err);
    return {
      id: row.id,
      url: row.canonical_url,
      old: row.old_language,
      new: row.old_language,
      reason: "kept",
      changed: false,
      review: true,
      res: { language: row.old_language, basis: "unresolved-null", detected: "", confidence: 0 },
      contentLen: content.length,
      snippet: snippetOf(content, args.sampleChars),
      anomaly: `detection failed (${msg.slice(0, 120)}) — left unchanged`,
    };
  }

  // Guard: never write a malformed language code — keep the existing label.
  if (res.language !== null && !ISO_CODE.test(res.language)) {
    return {
      id: row.id,
      url: row.canonical_url,
      old: row.old_language,
      new: row.old_language,
      reason: "kept",
      changed: false,
      review: true,
      res,
      contentLen: content.length,
      snippet: snippetOf(content, args.sampleChars),
      anomaly: `proposed code '${res.language}' is not a valid ISO code — left unchanged`,
    };
  }

  const decision = decideSweep(row.old_language, res);
  return {
    id: row.id,
    url: row.canonical_url,
    old: row.old_language,
    new: decision.final,
    reason: decision.reason,
    changed: decision.changed,
    review: decision.review,
    res,
    contentLen: content.length,
    snippet: snippetOf(content, args.sampleChars),
  };
}

/**
 * Apply one source's proposed changes. ONE transaction, behind an optimistic
 * guard so a row that moved under us is skipped, never clobbered. Only ever
 * issues `update documents set language = …`.
 */
async function applySource(rep: SourceReport, deps: SweepDeps): Promise<void> {
  const { client } = deps;
  const changes = rep.results.filter((r) => r.changed && !r.anomaly);
  if (changes.length === 0) return;
  await client.begin(async (tx) => {
    for (const c of changes) {
      const updated = c.old === null
        ? await tx`update documents set language = ${c.new}
                   where id = ${c.id} and language is null`
        : await tx`update documents set language = ${c.new}
                   where id = ${c.id} and language = ${c.old}`;
      if (updated.count === 1) {
        c.applied = true;
        rep.applied++;
      } else {
        rep.skippedGuard++;
      }
    }
  });
}

// ── outputs ──────────────────────────────────────────────────────────────────

const REASON_LABEL: Record<SweepReason, string> = {
  confirmed: "confirmed (already correct)",
  relabel: "relabelled (wrong → corrected)",
  filled: "filled (null → language)",
  "still-null": "left null (unresolved)",
  kept: "kept (weak signal, not overridden)",
};

function countBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

const CSV_HEADER =
  "source,url,old,new,reason,basis,detected,confidence,content_len,changed,anomaly,evidence,snippet";
/** Quote a CSV field, neutralising spreadsheet formula injection. */
const csvEsc = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** One JSONL change-log line for a changed document (the revert source). */
function changelogLine(sourceKey: string, r: DocResult, ts: string): string {
  return JSON.stringify({
    ts,
    source_key: sourceKey,
    document_id: r.id,
    canonical_url: r.url,
    old: r.old,
    new: r.new,
    reason: r.reason,
    basis: r.res.basis,
    detected: r.res.detected,
    confidence: Number(r.res.confidence.toFixed(3)),
    evidence: r.res.evidence ?? "",
  });
}

/** One CSV row for a scanned document (every doc, not just the changes). */
function csvLine(sourceKey: string, r: DocResult): string {
  return [
    sourceKey,
    csvEsc(r.url),
    r.old ?? "",
    r.new ?? "",
    r.reason,
    r.res.basis,
    r.res.detected,
    r.res.confidence.toFixed(3),
    String(r.contentLen),
    r.changed ? "1" : "0",
    csvEsc(r.anomaly ?? ""),
    csvEsc(r.res.evidence ?? ""),
    csvEsc(r.snippet),
  ].join(",");
}

/** Per-document iteration ledger — proves every scanned doc was re-derived. */
async function writeVerifyLog(file: string, reports: SourceReport[]): Promise<void> {
  const lines: string[] = [];
  for (const rep of reports) {
    for (const r of rep.results) {
      lines.push(
        JSON.stringify({
          source_key: rep.key,
          document_id: r.id,
          old: r.old,
          new: r.new,
          reason: r.reason,
          basis: r.res.basis,
        }),
      );
    }
  }
  await writeFile(file, lines.join("\n") + "\n", "utf8");
}

function sampleTable(rows: DocResult[], limit: number): string {
  if (rows.length === 0) return "_none_\n";
  const head = "| url | old → new | detected@conf | content sample |\n|---|---|---|---|";
  const body = rows.slice(0, limit).map((r) => {
    const url = r.url.replace(/^https?:\/\//, "");
    const conf = `${r.res.detected || "—"}@${r.res.confidence.toFixed(2)}`;
    const snip = r.snippet.slice(0, 160).replace(/\|/g, "\\|");
    return `| ${url} | ${r.old ?? "∅"} → ${r.new ?? "∅"} | ${conf} | ${snip} |`;
  });
  const more = rows.length > limit ? `\n\n_…and ${rows.length - limit} more (see the CSV)._\n` : "\n";
  return [head, ...body].join("\n") + more;
}

/** The human report (low-jargon, low-verbosity). */
function buildReport(
  reports: SourceReport[],
  args: SweepArgs,
  ts: string,
  detectorModel: string,
  files: { csv: string; changelog: string; verifyLog: string | null },
): string {
  const all = reports.flatMap((r) => r.results);
  const changed = all.filter((r) => r.changed);
  const relabels = all.filter((r) => r.reason === "relabel");
  const fills = all.filter((r) => r.reason === "filled");
  const nulls = all.filter((r) => r.new === null);
  const anomalies = all.filter((r) => r.anomaly);
  const review = all.filter(
    (r) => r.review && r.reason !== "still-null" && !r.anomaly,
  );
  const totalScanned = reports.reduce((a, r) => a + r.scanned, 0);
  const totalInScope = reports.reduce((a, r) => a + r.inScope, 0);
  const totalMissingRaw = reports.reduce((a, r) => a + r.missingRaw, 0);
  const totalApplied = reports.reduce((a, r) => a + r.applied, 0);
  const totalSkipped = reports.reduce((a, r) => a + r.skippedGuard, 0);
  const reasonCounts = countBy(all, (r) => r.reason);
  const pct = totalScanned ? ((changed.length / totalScanned) * 100).toFixed(1) : "0.0";
  const fullCoverage = totalScanned === totalInScope && totalMissingRaw === 0;
  const coveragePct = totalInScope
    ? ((totalScanned / totalInScope) * 100).toFixed(totalScanned === totalInScope ? 0 : 1)
    : "0";

  const L: string[] = [];
  L.push(`# Language sweep report`);
  L.push("");
  L.push(
    `**${args.apply ? "APPLIED" : "DRY-RUN (no changes written)"}** · ` +
      `scope: ${args.sources === "all" ? "all sources" : args.sources} · ` +
      `mode: ${args.mode} · detector: \`${detectorModel}\` · ${ts}`,
  );
  L.push("");
  L.push(
    `_Legend: **∅** = no language label (null) · **detected@conf** = the detector's ` +
      `language @ its confidence (0–1)._`,
  );
  L.push("");

  L.push(`## How much of the corpus had problems`);
  L.push("");
  L.push(
    `**${changed.length} of ${totalScanned}** scanned documents were corrected (**${pct}%**): ` +
      `**${relabels.length}** relabelled (wrong language fixed) and **${fills.length}** ` +
      `filled in from null. No existing label was ever blanked or overridden on a weak signal.`,
  );
  if (args.apply) {
    L.push("");
    L.push(
      `Applied to the database: **${totalApplied}** written` +
        (totalSkipped ? `, **${totalSkipped}** skipped by the guard (row changed under us)` : "") +
        `. Undo command at the end of this report.`,
    );
  }
  L.push("");
  L.push(`| outcome | count |`);
  L.push(`|---|---:|`);
  for (const reason of ["relabel", "filled", "confirmed", "kept", "still-null"] as SweepReason[]) {
    if (reasonCounts[reason]) L.push(`| ${REASON_LABEL[reason]} | ${reasonCounts[reason]} |`);
  }
  L.push("");

  L.push(`## By source`);
  L.push("");
  L.push(`| source | scanned | relabelled | filled | left null |`);
  L.push(`|---|---:|---:|---:|---:|`);
  for (const rep of reports) {
    const rl = rep.results.filter((r) => r.reason === "relabel").length;
    const fl = rep.results.filter((r) => r.reason === "filled").length;
    const nn = rep.results.filter((r) => r.new === null).length;
    L.push(`| ${rep.key} | ${rep.scanned} | ${rl} | ${fl} | ${nn} |`);
  }
  L.push("");

  L.push(`## Relabelled — wrong language, now corrected`);
  L.push("");
  L.push(sampleTable(relabels, args.sampleLimit));

  L.push(`## Filled — was null, now labelled`);
  L.push("");
  L.push(sampleTable(fills, args.sampleLimit));

  const EYEBALL_CAP = 12;
  const riskiest = [...review].sort((a, b) => a.res.confidence - b.res.confidence);
  L.push(`## Eyeball these — the ${Math.min(EYEBALL_CAP, riskiest.length)} least-confident calls`);
  L.push("");
  L.push(
    `The sweep's shakiest decisions, **lowest confidence first**. ` +
      `(${review.length} rows are in this category in total; the full set is in the CSV.)`,
  );
  L.push("");
  L.push(sampleTable(riskiest, EYEBALL_CAP));

  const visitedAll = totalScanned === totalInScope;
  L.push(`## Coverage`);
  L.push("");
  L.push(
    `Scanned **${totalScanned}** of **${totalInScope}** in-scope documents (**${coveragePct}%**).`,
  );
  L.push("");
  if (fullCoverage) {
    L.push(
      `Every in-scope document was re-derived and verified — where nothing changed, ` +
        `that is a verified no-op, not an early exit.`,
    );
  } else if (visitedAll) {
    L.push(
      `Every in-scope document was visited, but ⚠️ **${totalMissingRaw}** had no raw ` +
        `snapshot to re-derive from and were left untouched (a data gap, not a limit — ` +
        `listed under *Left unchanged* below).`,
    );
  } else {
    L.push(
      `⚠️ This was a **partial** scan (fewer scanned than in scope — e.g. via \`--limit\`); ` +
        `it does **not** cover the whole source. Re-run without a limit for full coverage.`,
    );
  }
  if (files.verifyLog) {
    L.push("");
    L.push(`Full per-document iteration ledger: \`${files.verifyLog}\`.`);
  }
  L.push("");

  if (anomalies.length > 0) {
    L.push(`## ⚠️ Left unchanged — needs a human`);
    L.push("");
    L.push(
      `**${anomalies.length}** document(s) were kept exactly as-is because they could not ` +
        `be re-derived (no raw snapshot / detection failed) or produced an invalid code. ` +
        `Their existing label (shown under *old → new*, unchanged) was never touched:`,
    );
    L.push("");
    L.push(sampleTable(anomalies, args.sampleLimit));
  }

  L.push(`## ⚠️ Left null — the exception`);
  L.push("");
  if (nulls.length === 0) {
    L.push(`**None.** Every scanned document is labelled with a language.`);
  } else {
    L.push(
      `**${nulls.length}** document(s) could not be safely labelled and were left null ` +
        `(all were **already** null — the sweep never created a new null). A null is still ` +
        `retrievable; it is only excluded from \`language:<code>\` filters. Each is a doc the ` +
        `detector abstained on, or a missing raw snapshot:`,
    );
    L.push("");
    const nullCap = nulls.length <= 50 ? nulls.length : args.sampleLimit;
    L.push(sampleTable(nulls, nullCap));
    const reasons = countBy(nulls, (r) => (r.anomaly ? "no-raw-snapshot" : r.res.basis));
    L.push(`Reasons: ${Object.entries(reasons).map(([k, v]) => `${k}: ${v}`).join(", ")}.`);
  }
  L.push("");

  L.push(`## Revert & full record`);
  L.push("");
  L.push(
    `- Every scanned document — changes, kept, null and gaps (filter \`changed=1\` ` +
      `for just the corrections): \`${files.csv}\``,
  );
  L.push(`- Machine change log, changes only (revert source): \`${files.changelog}\``);
  L.push(
    `- Undo everything this run applied: \`pnpm lang:sweep --revert ${files.changelog} --apply\``,
  );
  L.push("");
  return L.join("\n");
}

// ── optional LLM review pass ─────────────────────────────────────────────────

const REVIEW_INSTRUCTION =
  "You are auditing an automated language-relabelling run for another engineer. " +
  "You are given a compact summary of proposed changes to a document's stored " +
  "`language` column, each with the detector's new language, its confidence, and " +
  "a short EVIDENCE quote from the document. Flag ONLY changes that look wrong or " +
  "suspicious — e.g. an EVIDENCE quote whose actual language does not match the " +
  "proposed code, or a language implausible for the source. Be concise: a few " +
  "bullet points naming the suspicious rows (by url), then a final verdict line " +
  "`VERDICT: PASS` (nothing suspicious) or `VERDICT: NEEDS-REVIEW` (list them). " +
  "Low jargon; this is read by a busy human and by an agent.";

/** A compact, agent-readable digest of the run for the reviewer to audit. */
function buildReviewInput(reports: SourceReport[]): string {
  const all = reports.flatMap((r) => r.results);
  const relabels = all.filter((r) => r.reason === "relabel");
  const fills = all.filter((r) => r.reason === "filled");
  const nulls = all.filter((r) => r.new === null);
  const L: string[] = [];
  L.push(
    `Run summary: ${relabels.length} relabelled, ${fills.length} filled from null, ` +
      `${nulls.length} left null, across ${reports.length} source(s).`,
  );
  L.push("");
  L.push(`RELABELS (old → new @confidence | evidence | url):`);
  for (const r of relabels.slice(0, 60)) {
    const url = r.url.replace(/^https?:\/\//, "");
    L.push(
      `- ${r.old ?? "∅"} → ${r.new} @${r.res.confidence.toFixed(2)} | ` +
        `${(r.res.evidence || r.snippet).slice(0, 140)} | ${url}`,
    );
  }
  if (relabels.length > 60) L.push(`  …and ${relabels.length - 60} more relabels.`);
  L.push("");
  L.push(`FILLS (null → new @confidence | evidence | url):`);
  for (const r of fills.slice(0, 30)) {
    const url = r.url.replace(/^https?:\/\//, "");
    L.push(
      `- ∅ → ${r.new} @${r.res.confidence.toFixed(2)} | ` +
        `${(r.res.evidence || r.snippet).slice(0, 140)} | ${url}`,
    );
  }
  if (fills.length > 30) L.push(`  …and ${fills.length - 30} more fills.`);
  return L.join("\n");
}

// ── revert (I/O) ─────────────────────────────────────────────────────────────

interface ChangelogRecord {
  document_id: string;
  old: string | null;
  new: string | null;
}

/** Replay a change log to restore the previous labels. Uses the injected client. */
export async function runRevertCore(
  args: RevertArgs,
  deps: { client: postgres.Sql },
): Promise<void> {
  const raw = await readFile(args.changelog, "utf8");
  const records: ChangelogRecord[] = raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as ChangelogRecord);

  console.log(
    `Revert ${args.apply ? "(APPLY)" : "(dry-run)"}: ${records.length} change(s) from ${path.basename(args.changelog)}`,
  );
  if (records.length === 0) return;

  if (!args.apply) {
    console.log("Would restore each document.language from 'new' back to 'old'. Re-run with --apply.");
    return;
  }

  const { client } = deps;
  let reverted = 0;
  let skipped = 0;
  await client.begin(async (tx) => {
    for (const rec of records) {
      const res = rec.new === null
        ? await tx`update documents set language = ${rec.old}
                   where id = ${rec.document_id} and language is null`
        : await tx`update documents set language = ${rec.old}
                   where id = ${rec.document_id} and language = ${rec.new}`;
      if (res.count === 1) reverted++;
      else skipped++;
    }
  });
  console.log(`Reverted ${reverted}; skipped ${skipped} (row no longer at the applied value).`);
}

// ── sweep entrypoint (I/O) ───────────────────────────────────────────────────

/** Run the sweep for the parsed args using the injected DB client + detector. */
export async function runSweep(parsed: SweepArgs, deps: SweepDeps): Promise<void> {
  // Resolve the source list; unknown key fails BEFORE any work.
  const entries: SourceEntry[] =
    parsed.sources === "all"
      ? [...allSources()]
      : (() => {
          const e = getSource(parsed.sources);
          if (!e) {
            throw new Error(
              `unknown source '${parsed.sources}'. Known: ${allSources().map((s) => s.key).join(", ")}`,
            );
          }
          return [e];
        })();

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const scope = parsed.sources === "all" ? "all" : parsed.sources;
  const outDir =
    parsed.outDir ?? process.env[OUT_DIR_ENV] ?? path.join(process.cwd(), "reports");
  await mkdir(outDir, { recursive: true });
  const files = {
    report: path.join(outDir, `report-${scope}-${ts}.md`),
    csv: path.join(outDir, `results-${scope}-${ts}.csv`),
    changelog: path.join(outDir, `changelog-${scope}-${ts}.jsonl`),
    verifyLog: parsed.verifyLog
      ? path.join(outDir, `verify-${scope}-${ts}.jsonl`)
      : null,
  };

  // Seed the files, then stream per-document rows into them as workers finish.
  await writeFile(files.changelog, "", "utf8");
  await writeFile(files.csv, CSV_HEADER + "\n", "utf8");
  const writers = {
    changelog: new SerialAppender(files.changelog),
    csv: new SerialAppender(files.csv),
  };

  const reports: SourceReport[] = [];
  let changelogCount = 0;
  for (const entry of entries) {
    process.stdout.write(`sweeping ${entry.key} … `);
    const rep = await analyzeSource(entry, parsed, deps, ts, writers);
    // All of this source's lines are flushed (each append awaited) before apply.
    await Promise.all([writers.changelog.drain(), writers.csv.drain()]);

    const clCount = rep.results.filter((r) => r.changed && !r.anomaly).length;
    changelogCount += clCount;

    if (parsed.apply) await applySource(rep, deps);

    const ch = rep.results.filter((r) => r.changed).length;
    console.log(
      `${rep.scanned} scanned, ${ch} change(s)` +
        (parsed.apply ? `, ${rep.applied} applied, ${rep.skippedGuard} skipped` : "") +
        (rep.missingRaw ? `, ⚠️ ${rep.missingRaw} missing raw` : ""),
    );
    reports.push(rep);
  }

  if (files.verifyLog) await writeVerifyLog(files.verifyLog, reports);
  const report = buildReport(reports, parsed, ts, deps.detector.model, files);
  await writeFile(files.report, report, "utf8");

  // Optional LLM sanity pass over the proposed changes (`--llm-review`) — the
  // "an agent processes the work with a quick LLM pass" step. Best-effort: a
  // reviewer failure never fails the run (the report + logs already exist).
  let reviewFile: string | null = null;
  if (parsed.llmReview) {
    if (!deps.reviewer) {
      console.warn("⚠️ --llm-review requested but no reviewer is wired — skipping.");
    } else {
      const changed = reports.flatMap((r) => r.results).filter((r) => r.changed);
      if (changed.length === 0) {
        console.log("llm-review: no changes to review — skipped.");
      } else {
        try {
          process.stdout.write("llm-review: auditing proposed changes … ");
          const verdict = await deps.reviewer.review(
            REVIEW_INSTRUCTION,
            buildReviewInput(reports),
          );
          reviewFile = path.join(outDir, `review-${scope}-${ts}.md`);
          await writeFile(
            reviewFile,
            `# Language sweep — LLM review\n\n` +
              `_Model: \`${deps.reviewer.model}\` · ${ts} · ${changed.length} change(s) audited._\n\n` +
              verdict + "\n",
            "utf8",
          );
          const pass = /VERDICT:\s*PASS/i.test(verdict);
          console.log(pass ? "PASS" : "NEEDS-REVIEW (see file)");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`\n⚠️ llm-review failed (${msg.slice(0, 120)}) — logs are unaffected.`);
        }
      }
    }
  }

  const totalScanned = reports.reduce((a, r) => a + r.scanned, 0);
  console.log(`\nreport:    ${files.report}`);
  console.log(`results:   ${files.csv} (${totalScanned} scanned, ${changelogCount} changed)`);
  console.log(`changelog: ${files.changelog} (${changelogCount} rows, revert source)`);
  if (files.verifyLog) console.log(`verify:    ${files.verifyLog}`);
  if (reviewFile) console.log(`review:    ${reviewFile}`);
  if (!parsed.apply && changelogCount > 0) {
    console.log(`\ndry-run: re-run with --apply to write these ${changelogCount} change(s).`);
  }
}
