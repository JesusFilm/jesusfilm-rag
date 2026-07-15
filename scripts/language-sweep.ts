/**
 * language-sweep — the #73 corpus-wide language correction sweep.
 *
 * Re-derives `documents.language` for every document in a source (or `--all`) by
 * REPLAYING the real ingest path — `cleanText(raw_documents.raw_content)` →
 * `resolveLanguage(...)` — never a re-implementation of detection. It then either
 * reports the proposed corrections (dry-run, the default) or applies them
 * (`--apply`). It is:
 *
 *   • re-runnable & per-source   — point it at any source, now or six months from
 *     now; deterministic, so a re-run after an interruption simply reproduces the
 *     same proposals (idempotent).
 *   • label-only                 — the ONLY column it ever writes is
 *     `documents.language`. It never touches chunks, embeddings, or sources, and
 *     never imports the embedder. No content is re-acquired or re-embedded.
 *   • null-averse                — the purpose is that every document ends up
 *     labelled; `null` is the rare, documented exception (see resolve-language.ts)
 *     and every remaining null is highlighted at the end of the report.
 *   • safe & revertible          — dry-run by default; `--apply` writes each
 *     source inside ONE transaction (atomic; an interrupted run rolls back and is
 *     re-runnable) behind an optimistic guard (only writes a row still at its
 *     expected value), and appends a change log that `--revert <log>` replays to
 *     restore the previous labels with one command.
 *   • self-proving on coverage   — every run reports how many in-scope documents
 *     were scanned vs. changed; "0 changes" is provably "verified all N", not an
 *     early exit. `--verify-log` writes a per-document iteration ledger.
 *
 * Usage:
 *   tsx scripts/language-sweep.ts --source <key> [--mode full|blanks] [--apply]
 *   tsx scripts/language-sweep.ts --all         [--mode full|blanks] [--apply]
 *   tsx scripts/language-sweep.ts --revert <changelog.jsonl> [--apply]
 *
 * Options:
 *   --source <key>     one registered source (mutually exclusive with --all)
 *   --all              every registered source
 *   --mode full        re-scan every document in scope (default)
 *   --mode blanks      only documents where language IS NULL (the #74 worklist)
 *   --apply            write changes (default: dry-run, writes nothing)
 *   --limit <n>        cap documents scanned per source (testing)
 *   --sample-chars <n> content snippet length in the report (default 240)
 *   --sample-limit <n> max example rows per class in the markdown (default 25)
 *   --verify-log       also write a per-document iteration ledger (coverage proof)
 *   --out-dir <dir>    where the per-run logs land. Precedence:
 *                        --out-dir flag  >  $LANGUAGE_SWEEP_OUT_DIR env  >  <cwd>/reports
 *                      These are LOCAL run logs, not committed artifacts (the
 *                      default under the working directory is git-ignored).
 *   --help
 *
 * Pure arg parsing (`parseArgs`) is exported and unit-tested
 * (tests/language-sweep-args.test.ts); the label decision itself lives in
 * `decideSweep` (resolve-language.ts, also unit-tested). `main()` holds all I/O,
 * and is additionally exercised end-to-end by the dry-run simulation (sim-run.sh).
 */
import { mkdir, writeFile, appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { getDb, closeDb } from "@/db/index.js";
import { allSources, getSource } from "@/registry/index.js";
import type { SourceEntry } from "@/registry/index.js";
import { cleanText } from "@/ingestion/normalize.js";
import { resolveLanguage, decideSweep } from "@/ingestion/resolve-language.js";
import type { LanguageResolution, SweepReason } from "@/ingestion/resolve-language.js";

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
}

/** Env var that sets the default output directory (overridden by `--out-dir`). */
export const OUT_DIR_ENV = "LANGUAGE_SWEEP_OUT_DIR";

export interface RevertArgs {
  kind: "revert";
  changelog: string;
  apply: boolean;
}

export type ParsedArgs = SweepArgs | RevertArgs | { kind: "help" };

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
  ]);
  const boolean = new Set(["--all", "--apply", "--verify-log"]);

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

  // Revert is its own command; it ignores sweep flags.
  if (opts["--revert"] !== undefined) {
    if (flags.has("--all") || opts["--source"] !== undefined) {
      throw new Error("--revert cannot be combined with --source/--all");
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
  };
}

// ── per-document classification ──────────────────────────────────────────────
// The old→new decision itself lives in `decideSweep` (resolve-language.ts, pure +
// unit-tested). Here we only carry its result alongside the document metadata.

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
  anomaly?: string; // e.g. no raw snapshot, or an invalid proposed code
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

// ── sweep core (I/O) ─────────────────────────────────────────────────────────

function snippetOf(content: string, n: number): string {
  return content
    .slice(0, n + 16) // slice a little extra before trimming the noise prefix
    .replace(/\s+/g, " ")
    // Strip a leading run of scraper-noise tokens that are exactly "0" or "100"
    // (e.g. "0 100 0 " prefixes many cru pages) — display-only; detection ran on
    // the full cleaned content, not this snippet. Real leading numbers like "10"
    // do not match and are preserved.
    .replace(/^(?:0|100)(?:\s+(?:0|100))*\s+/, "")
    .slice(0, n)
    .trim();
}

/** Re-derive labels for one source. PURE of writes — computes the proposed
 *  changes only. Applying them is a separate step (`applySource`), so the change
 *  log can be persisted BEFORE any commit (crash-safe revert). */
async function analyzeSource(
  entry: SourceEntry,
  args: SweepArgs,
): Promise<SourceReport> {
  const { client } = getDb();
  const declared = entry.languages;

  // In-scope count (documents-only, so a missing raw snapshot is VISIBLE as a
  // gap rather than silently dropped by an inner join).
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

  // distinct on (d.id): one row per document even if a re-crawl ever left two
  // raw snapshots for a URL. LEFT JOIN: a document with no raw row still appears
  // (raw_content null) so we can flag it, not skip it silently.
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

  let missingRaw = 0;
  const results: DocResult[] = [];
  for (const row of rows) {
    if (row.raw_content === null) {
      // No raw snapshot to re-derive from — do NOT touch this row; surface it.
      missingRaw++;
      results.push({
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
        anomaly: "no raw snapshot — left unchanged",
      });
      continue;
    }
    const content = cleanText(row.raw_content);
    const res = resolveLanguage(content, { declared });
    // Guard: never write a malformed language code — keep the existing label.
    if (res.language !== null && !ISO_CODE.test(res.language)) {
      results.push({
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
      });
      continue;
    }
    const decision = decideSweep(row.old_language, res);
    results.push({
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
    });
  }

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

/**
 * Apply one source's proposed changes to the DB. ONE transaction (atomic: an
 * interruption rolls the whole source back and it re-runs cleanly), behind an
 * optimistic guard so a row that moved under us is skipped, never clobbered.
 * Marks each applied `DocResult.applied = true` and fills in the counts. Only
 * ever issues `update documents set language = …` — chunks/embeddings untouched.
 */
async function applySource(rep: SourceReport): Promise<void> {
  const { client } = getDb();
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

const CSV_HEADER = "source,url,old,new,reason,basis,detected,confidence,content_len,snippet";
const csvEsc = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** JSONL change-log lines for ONE source's proposed changes — the revert source.
 *  Written per-source BEFORE that source is applied, so a crash mid-`--all`
 *  never leaves committed changes without a revert record. The revert is guarded
 *  (only touches rows still at `new`), so a logged change that did not commit is
 *  harmlessly skipped on revert. */
function changelogLines(rep: SourceReport, ts: string): string[] {
  return rep.results
    .filter((r) => r.changed && !r.anomaly)
    .map((r) =>
      JSON.stringify({
        ts,
        source_key: rep.key,
        document_id: r.id,
        canonical_url: r.url,
        old: r.old,
        new: r.new,
        reason: r.reason,
        basis: r.res.basis,
        detected: r.res.detected,
        confidence: Number(r.res.confidence.toFixed(3)),
      }),
    );
}

/** CSV rows for ONE source's changes (no header). */
function csvLines(rep: SourceReport): string[] {
  return rep.results
    .filter((r) => r.changed && !r.anomaly)
    .map((r) =>
      [
        rep.key,
        csvEsc(r.url),
        r.old ?? "",
        r.new ?? "",
        r.reason,
        r.res.basis,
        r.res.detected,
        r.res.confidence.toFixed(3),
        String(r.contentLen),
        csvEsc(r.snippet),
      ].join(","),
    );
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

/** The human report (low-jargon, low-verbosity — Gate 3). */
function buildReport(
  reports: SourceReport[],
  args: SweepArgs,
  ts: string,
  files: { csv: string; changelog: string; verifyLog: string | null },
): string {
  const all = reports.flatMap((r) => r.results);
  const changed = all.filter((r) => r.changed); // relabel + filled (the DB writes)
  const relabels = all.filter((r) => r.reason === "relabel");
  const fills = all.filter((r) => r.reason === "filled");
  const nulls = all.filter((r) => r.new === null); // still-null + missing-raw
  // Eyeball list: fills that used a weak fallback, plus kept-but-disagreeing docs.
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
      `mode: ${args.mode} · ${ts}`,
  );
  L.push("");
  L.push(
    `_Legend: **∅** = no language label (null) · **detected@conf** = the detector's ` +
      `best-guess language @ its confidence (0–1)._`,
  );
  L.push("");

  // Headline.
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

  // Per-source.
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

  // Relabels — the real mislabels found (most important to eyeball).
  L.push(`## Relabelled — wrong language, now corrected`);
  L.push("");
  L.push(sampleTable(relabels, args.sampleLimit));

  // Filled blanks.
  L.push(`## Filled — was null, now labelled`);
  L.push("");
  L.push(sampleTable(fills, args.sampleLimit));

  // Review — the eyeball list. A GENUINE subset, not a repeat of "Filled":
  // the riskiest rows only, lowest detector confidence first, capped small, so a
  // reviewer's eye lands on the shakiest calls (e.g. es@0.53) rather than the
  // high-confidence ones already shown above.
  const EYEBALL_CAP = 12;
  const riskiest = [...review].sort((a, b) => a.res.confidence - b.res.confidence);
  L.push(`## Eyeball these — the ${Math.min(EYEBALL_CAP, riskiest.length)} least-confident calls`);
  L.push("");
  L.push(
    `The sweep's shakiest decisions, **lowest confidence first** — a fallback fill ` +
      `below the confidence/length bar, or a label KEPT despite the detector leaning ` +
      `elsewhere. A short foreign-language page read as its source's main language is ` +
      `#73's known blind spot (issue #73); this is where it would hide. ` +
      `(${review.length} rows are in this category in total; the full set is in the CSV.)`,
  );
  L.push("");
  L.push(sampleTable(riskiest, EYEBALL_CAP));

  // Coverage proof — three distinct states, so the wording never contradicts:
  // full (visited all, all re-derivable), a data gap (visited all, some missing a
  // raw snapshot), or a genuine partial scan (fewer visited than in scope, --limit).
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
    // Not a limit — every in-scope doc was visited, but some had no raw snapshot.
    L.push(
      `Every in-scope document was visited, but ⚠️ **${totalMissingRaw}** had no raw ` +
        `snapshot to re-derive from and were left untouched (a data gap, not a limit — ` +
        `listed in the null section below).`,
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

  // THE EXCEPTION — nulls, highlighted at the end as requested.
  L.push(`## ⚠️ Left null — the exception`);
  L.push("");
  if (nulls.length === 0) {
    L.push(`**None.** Every scanned document is labelled with a language.`);
  } else {
    L.push(
      `**${nulls.length}** document(s) could not be safely labelled and were left null ` +
        `(all were **already** null — the sweep never created a new null). A null is still ` +
        `retrievable; it is only excluded from \`language:<code>\` filters. Each is a ` +
        `multi-language source with too little or too ambiguous text, or a missing raw snapshot:`,
    );
    L.push("");
    const nullCap = nulls.length <= 50 ? nulls.length : args.sampleLimit;
    L.push(sampleTable(nulls, nullCap));
    const reasons = countBy(nulls, (r) => (r.anomaly ? "no-raw-snapshot" : r.res.basis));
    L.push(`Reasons: ${Object.entries(reasons).map(([k, v]) => `${k}: ${v}`).join(", ")}.`);
  }
  L.push("");

  // Revert / full record.
  L.push(`## Revert & full record`);
  L.push("");
  L.push(`- Full list of every change: \`${files.csv}\``);
  L.push(`- Machine change log (revert source): \`${files.changelog}\``);
  L.push(
    `- Undo everything this run applied: \`tsx scripts/language-sweep.ts --revert ${files.changelog} --apply\``,
  );
  L.push("");
  return L.join("\n");
}

// ── revert (I/O) ─────────────────────────────────────────────────────────────

interface ChangelogRecord {
  document_id: string;
  old: string | null;
  new: string | null;
}

async function runRevert(args: RevertArgs): Promise<void> {
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

  const { client } = getDb();
  let reverted = 0;
  let skipped = 0;
  await client.begin(async (tx) => {
    for (const rec of records) {
      // Only revert if the row is STILL at the value we wrote (don't clobber a
      // later manual correction).
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

// ── main ─────────────────────────────────────────────────────────────────────

const HELP = `language-sweep — re-derive documents.language across a source (issue #73)

  tsx scripts/language-sweep.ts --source <key> [--mode full|blanks] [--apply]
  tsx scripts/language-sweep.ts --all         [--mode full|blanks] [--apply]
  tsx scripts/language-sweep.ts --revert <changelog.jsonl> [--apply]

  --source <key>   one registered source        --all           every source
  --mode full      re-scan all (default)         --mode blanks   only null rows
  --apply          write changes (default: dry-run)
  --limit <n>      cap docs/source (testing)     --verify-log    per-doc ledger
  --sample-chars   snippet length (240)          --sample-limit  rows/class (25)
  --out-dir <dir>  logs dir (flag > $LANGUAGE_SWEEP_OUT_DIR > <cwd>/reports)
  --help
`;

async function main(): Promise<void> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`error: ${(e as Error).message}\n`);
    console.error(HELP);
    process.exitCode = 1;
    return;
  }

  if (parsed.kind === "help") {
    console.log(HELP);
    return;
  }

  try {
    if (parsed.kind === "revert") {
      await runRevert(parsed);
      return;
    }

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
    // Output dir precedence: --out-dir flag > $LANGUAGE_SWEEP_OUT_DIR env >
    // <cwd>/reports. These are per-run local logs (report/changelog/csv/ledger),
    // NOT committed artifacts — the default lives under the working directory and
    // is git-ignored.
    const outDir =
      parsed.outDir ?? process.env[OUT_DIR_ENV] ?? path.join(process.cwd(), "reports");
    await mkdir(outDir, { recursive: true });
    const files = {
      report: path.join(outDir, `report-${scope}-${ts}.md`),
      csv: path.join(outDir, `changes-${scope}-${ts}.csv`),
      changelog: path.join(outDir, `changelog-${scope}-${ts}.jsonl`),
      verifyLog: parsed.verifyLog
        ? path.join(outDir, `verify-${scope}-${ts}.jsonl`)
        : null,
    };

    // Create the change log + CSV up front, then write each source's rows
    // BEFORE that source is applied. A process crash mid-`--all --apply` therefore
    // always leaves a guarded revert log on disk for everything that could have
    // committed (the log is appended before each source's commit; the guard makes
    // a logged-but-uncommitted change a safe no-op on revert).
    await writeFile(files.changelog, "", "utf8");
    await writeFile(files.csv, CSV_HEADER + "\n", "utf8");

    const reports: SourceReport[] = [];
    let changelogCount = 0;
    for (const entry of entries) {
      process.stdout.write(`sweeping ${entry.key} … `);
      const rep = await analyzeSource(entry, parsed);

      // Persist this source's proposed changes to disk BEFORE committing them.
      const clLines = changelogLines(rep, ts);
      if (clLines.length) await appendFile(files.changelog, clLines.join("\n") + "\n", "utf8");
      const csvRows = csvLines(rep);
      if (csvRows.length) await appendFile(files.csv, csvRows.join("\n") + "\n", "utf8");
      changelogCount += clLines.length;

      // Now apply (each source is its own transaction).
      if (parsed.apply) await applySource(rep);

      const ch = rep.results.filter((r) => r.changed).length;
      console.log(
        `${rep.scanned} scanned, ${ch} change(s)` +
          (parsed.apply ? `, ${rep.applied} applied, ${rep.skippedGuard} skipped` : "") +
          (rep.missingRaw ? `, ⚠️ ${rep.missingRaw} missing raw` : ""),
      );
      reports.push(rep);
    }

    if (files.verifyLog) await writeVerifyLog(files.verifyLog, reports);
    const report = buildReport(reports, parsed, ts, files);
    await writeFile(files.report, report, "utf8");

    console.log(`\nreport:    ${files.report}`);
    console.log(`changes:   ${files.csv} (${changelogCount} rows)`);
    console.log(`changelog: ${files.changelog}`);
    if (files.verifyLog) console.log(`verify:    ${files.verifyLog}`);
    if (!parsed.apply && changelogCount > 0) {
      console.log(`\ndry-run: re-run with --apply to write these ${changelogCount} change(s).`);
    }
  } finally {
    await closeDb();
  }
}

// Only run when invoked directly (not when imported by a test).
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (e) {
    // Clean, non-zero exit for operational failures (DB down, missing changelog,
    // unknown source) — no raw stack trace, and never a partial write (each
    // source's apply is a single transaction, rolled back on throw).
    // AggregateError (e.g. a postgres ECONNREFUSED) can carry an empty message —
    // fall back to a code/name so the operator never sees a blank error line.
    let msg = e instanceof Error ? e.message : String(e);
    if (!msg && e && typeof e === "object") {
      const code = (e as { code?: string }).code;
      msg = code ? `database connection failed (${code})` : (e as Error).name || String(e);
    }
    console.error(`error: ${msg}`);
    process.exitCode = 1;
    await closeDb().catch(() => {});
  }
}
