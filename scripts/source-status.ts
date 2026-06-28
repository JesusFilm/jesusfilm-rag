/**
 * The deterministic writer for docs/source-status.yaml — the ONLY sanctioned
 * way to mutate that file. /slice (and any agent) calls `pnpm status:*` instead
 * of free-typing YAML, so the tracker can't silently drift.
 *
 *   pnpm status:set  --source <key> --lang <code> --stage <name>=<green|pending|red>
 *   pnpm status:set  --source <key> --lang <code> --status <in-progress|blocked|done|deferred>
 *   pnpm status:set  --source <key> --lang <code> --blocker "<text>"   # --clear-blocker
 *   pnpm status:set  --source <key> --lang <code> --note "<text>"      # --clear-note
 *   pnpm status:set  --source <key> --lang <code> --scope "<text>"     # --clear-scope
 *   pnpm status:add-source --key <key> --name "<name>" --lang <code> --slice-file <path>
 *   pnpm status:add-lang   --source <key> --lang <code> [--scope "<text>"]
 *   pnpm status:check       # validate the committed file (CI gate)
 *
 * Guarantees (the reason this exists):
 *   - comments/notes survive every write (yaml Document API, not re-serialised JS);
 *   - the top-level row `status` is DERIVED from the languages, never hand-set;
 *   - `last_updated` is bumped to today on every mutation;
 *   - every write is validated against src/contracts/source-status.schema.ts —
 *     an invariant violation aborts with a non-zero exit BEFORE the file is touched.
 *
 * Scope: this file is the ASSERTED per-language stage state, decoupled from
 * production — nothing here reads or reconciles the prod DB, and the
 * `*:production` scripts never write back. `status:check` validates shape +
 * invariants only, not whether prod matches. Inventory/counts belong in SQL +
 * docs/sources.md (issue #48 "out of scope"), never in this file.
 *
 * Pure core (loadDoc/applyMutation/validateDoc/parseArgv) is exported and unit-
 * tested from tests/source-status-cli.test.ts; main() holds the fs + argv I/O.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument, isMap } from "yaml";
import type { Document, YAMLMap } from "yaml";
import {
  STAGES,
  stageStateSchema,
  rowStatusSchema,
  sourceStatusFileSchema,
  deriveRowStatus,
} from "@/contracts/source-status.schema.js";
import type {
  Stage,
  StageState,
  RowStatus,
  SourceStatusFile,
} from "@/contracts/source-status.schema.js";

// ── command model ──────────────────────────────────────────────────────────

export type SetOp =
  | { op: "stage"; stage: Stage; state: StageState }
  | { op: "status"; status: RowStatus }
  | { op: "blocker"; value: string | null }
  | { op: "note"; value: string | null }
  | { op: "scope"; value: string | null };

export type Mutation =
  | { kind: "set"; source: string; lang: string; ops: SetOp[] }
  | { kind: "add-source"; key: string; name: string; lang: string; sliceFile: string }
  | { kind: "add-lang"; source: string; lang: string; scope?: string };

export type Command = Mutation | { kind: "check" };

const PENDING_STAGES = {
  acquire: "pending",
  ingest: "pending",
  retrieve: "pending",
  evaluate: "pending",
} as const;

// ── pure core ────────────────────────────────────────────────────────────────

/** Parse a YAML string into a Document, failing loudly on syntax errors. */
export function loadDoc(raw: string): Document {
  const doc = parseDocument(raw);
  if (doc.errors.length > 0) {
    throw new Error(`invalid YAML: ${doc.errors.map((e) => e.message).join("; ")}`);
  }
  return doc;
}

/** Validate a Document against the contract; throws (ZodError) on any violation. */
export function validateDoc(doc: Document): SourceStatusFile {
  return sourceStatusFileSchema.parse(doc.toJS());
}

/** Mutate the Document in place: apply the change, re-derive `status`, bump `last_updated`. */
export function applyMutation(doc: Document, m: Mutation, today: string): void {
  switch (m.kind) {
    case "set": {
      requireSource(doc, m.source);
      requireLang(doc, m.source, m.lang);
      for (const op of m.ops) applySetOp(doc, m.source, m.lang, op);
      deriveAndStamp(doc, m.source, today);
      break;
    }
    case "add-source": {
      if (doc.getIn(["sources", m.key]) !== undefined) {
        throw new Error(`source '${m.key}' already exists — use status:set / status:add-lang`);
      }
      doc.setIn(["sources", m.key], buildRow(doc, m, today));
      deriveAndStamp(doc, m.key, today);
      break;
    }
    case "add-lang": {
      requireSource(doc, m.source);
      if (doc.getIn(["sources", m.source, "languages", m.lang]) !== undefined) {
        throw new Error(`language '${m.lang}' already exists on '${m.source}'`);
      }
      doc.setIn(["sources", m.source, "languages", m.lang], buildLangEntry(doc, m.scope));
      deriveAndStamp(doc, m.source, today);
      break;
    }
  }
}

function applySetOp(doc: Document, source: string, lang: string, op: SetOp): void {
  const base = ["sources", source, "languages", lang];
  switch (op.op) {
    case "stage":
      doc.setIn([...base, "stages", op.stage], op.state);
      break;
    case "status":
      doc.setIn([...base, "status"], op.status);
      break;
    case "blocker":
    case "note":
    case "scope":
      if (op.value === null) doc.deleteIn([...base, op.op]);
      else doc.setIn([...base, op.op], op.value);
      break;
  }
}

function deriveAndStamp(doc: Document, key: string, today: string): void {
  const js = doc.toJS() as {
    sources?: Record<string, { languages?: Record<string, { status: RowStatus }> }>;
  };
  const languages = js.sources?.[key]?.languages;
  if (!languages) throw new Error(`source '${key}' has no languages`);
  doc.setIn(["sources", key, "status"], deriveRowStatus(languages));
  doc.setIn(["sources", key, "last_updated"], today);
}

function buildRow(doc: Document, m: Extract<Mutation, { kind: "add-source" }>, today: string): YAMLMap {
  const row = doc.createNode({
    name: m.name,
    status: "in-progress", // placeholder — overwritten by deriveAndStamp
    languages: { [m.lang]: { status: "in-progress", stages: { ...PENDING_STAGES } } },
    slice_file: m.sliceFile,
    last_updated: today,
  }) as unknown as YAMLMap;
  setFlow(row.getIn(["languages", m.lang, "stages"], true));
  return row;
}

function buildLangEntry(doc: Document, scope?: string): YAMLMap {
  const entry: Record<string, unknown> = {
    status: "in-progress",
    stages: { ...PENDING_STAGES },
  };
  if (scope) entry.scope = scope;
  const node = doc.createNode(entry) as unknown as YAMLMap;
  setFlow(node.getIn(["stages"], true));
  return node;
}

/** Render a stages map inline ({ … }) to match the file's existing style. */
function setFlow(node: unknown): void {
  if (isMap(node)) node.flow = true;
}

function requireSource(doc: Document, source: string): void {
  if (doc.getIn(["sources", source]) === undefined) {
    throw new Error(`unknown source '${source}'`);
  }
}

function requireLang(doc: Document, source: string, lang: string): void {
  if (doc.getIn(["sources", source, "languages", lang]) === undefined) {
    throw new Error(`unknown language '${lang}' on '${source}' — use status:add-lang`);
  }
}

// ── argv parsing ─────────────────────────────────────────────────────────────

export function parseArgv(argv: string[]): Command {
  const [sub, ...rest] = argv;
  switch (sub) {
    case "check":
      return { kind: "check" };
    case "set":
      return parseSet(rest);
    case "add-source": {
      const f = collectFlags(rest);
      return {
        kind: "add-source",
        key: req(f, "key"),
        name: req(f, "name"),
        lang: req(f, "lang"),
        sliceFile: req(f, "slice-file"),
      };
    }
    case "add-lang": {
      const f = collectFlags(rest);
      const cmd: Extract<Mutation, { kind: "add-lang" }> = {
        kind: "add-lang",
        source: req(f, "source"),
        lang: req(f, "lang"),
      };
      if (typeof f.scope === "string") cmd.scope = f.scope;
      return cmd;
    }
    default:
      throw new Error(`unknown subcommand '${sub ?? ""}' — expected set | add-source | add-lang | check`);
  }
}

function parseSet(rest: string[]): Command {
  let source: string | undefined;
  let lang: string | undefined;
  const ops: SetOp[] = [];
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const value = (): string => {
      const v = rest[++i];
      if (v === undefined) throw new Error(`missing value for ${flag}`);
      return v;
    };
    switch (flag) {
      case "--source": source = value(); break;
      case "--lang": lang = value(); break;
      case "--stage": {
        const [stage, state] = value().split("=");
        ops.push({ op: "stage", stage: asStage(stage), state: stageStateSchema.parse(state) });
        break;
      }
      case "--status": ops.push({ op: "status", status: rowStatusSchema.parse(value()) }); break;
      case "--blocker": ops.push({ op: "blocker", value: value() }); break;
      case "--clear-blocker": ops.push({ op: "blocker", value: null }); break;
      case "--note": ops.push({ op: "note", value: value() }); break;
      case "--clear-note": ops.push({ op: "note", value: null }); break;
      case "--scope": ops.push({ op: "scope", value: value() }); break;
      case "--clear-scope": ops.push({ op: "scope", value: null }); break;
      default: throw new Error(`unknown flag '${flag}' for set`);
    }
  }
  if (!source) throw new Error("set requires --source");
  if (!lang) throw new Error("set requires --lang");
  return { kind: "set", source, lang, ops };
}

function asStage(stage: string | undefined): Stage {
  if (stage !== undefined && (STAGES as readonly string[]).includes(stage)) return stage as Stage;
  throw new Error(`invalid stage '${stage ?? ""}' — expected one of ${STAGES.join(", ")}`);
}

function collectFlags(rest: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) continue;
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[a.slice(2)] = true;
    } else {
      out[a.slice(2)] = next;
      i++;
    }
  }
  return out;
}

function req(flags: Record<string, string | true>, key: string): string {
  const v = flags[key];
  if (typeof v !== "string") throw new Error(`missing --${key}`);
  return v;
}

// ── I/O entrypoint ───────────────────────────────────────────────────────────

const FILE = path.resolve(import.meta.dirname, "..", "docs", "source-status.yaml");

function fail(e: unknown): never {
  console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

function todayISO(): string {
  // Local date (not UTC) so last_updated matches the operator's calendar day —
  // a UTC toISOString reads off-by-one for a NZ/early-day write.
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function main(argv: string[]): Promise<void> {
  let cmd: Command;
  try {
    cmd = parseArgv(argv);
  } catch (e) {
    fail(e);
  }

  const raw = await readFile(FILE, "utf8");

  if (cmd.kind === "check") {
    try {
      validateDoc(loadDoc(raw));
    } catch (e) {
      fail(e);
    }
    console.log("✔ docs/source-status.yaml is valid");
    return;
  }

  const doc = loadDoc(raw);
  try {
    applyMutation(doc, cmd, todayISO());
    validateDoc(doc); // gate — must pass before we touch the file
  } catch (e) {
    fail(e);
  }
  await writeFile(FILE, doc.toString());
  const target = cmd.kind === "add-source" ? cmd.key : cmd.source;
  console.log(`✔ updated '${target}' in docs/source-status.yaml`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2));
}
