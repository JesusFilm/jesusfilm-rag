/**
 * Interactive PRODUCTION language sweep — the credential-gated counterpart of
 * `pnpm lang:sweep`, running the #73/#84 LLM re-derivation of `documents.language`
 * against the PRODUCTION corpus. Credentials are prompted interactively (never
 * read from .env/.env.local) or, headless, injected by Doppler
 * (`doppler run -- pnpm lang:sweep:production --non-interactive`); see
 * docs/ops/language-sweep.md.
 *
 *   pnpm lang:sweep:production --all                 # dry-run over the whole corpus
 *   pnpm lang:sweep:production --source cru --apply  # correct one source (writes)
 *   pnpm lang:sweep:production --revert <log> --apply
 *
 * Dry-run by default; `--apply` writes each source in one transaction behind an
 * optimistic guard, and demands JFRAG_ALLOW_PROD_WRITE=1 in --non-interactive
 * mode. Label-only: chunks/embeddings are never touched. The engine is the shared
 * `scripts/lib/language-sweep-core.ts` (imported statically — it reads no env; the
 * env-reading `@/main`/`@/db` are dynamic-imported AFTER installCreds so the
 * loader sees the prompted DATABASE_URL first).
 */
import path from "node:path";
import {
  promptProductionCredentials,
  installCreds,
  extractProdRunFlags,
} from "./lib/prompt-prod-creds.js";
import {
  parseArgs,
  runSweep,
  runRevertCore,
} from "./lib/language-sweep-core.js";

const HELP = `lang:sweep:production — PRODUCTION language sweep (issues #73/#84)

  pnpm lang:sweep:production --all                 # dry-run over the whole corpus
  pnpm lang:sweep:production --source <key> --apply
  pnpm lang:sweep:production --revert <log> --apply
  [--non-interactive] [--expect-host <substr>]     # headless (Doppler-injected creds)

Same sweep flags as pnpm lang:sweep (--mode, --limit, --concurrency,
--max-detect-chars, --out-dir, --verify-log, --llm-review). Dry-run by default;
--apply writes documents.language. See docs/ops/language-sweep.md.
`;

async function main(): Promise<void> {
  const { flags: runFlags, rest, error } = extractProdRunFlags(
    process.argv.slice(2),
  );
  if (error) {
    console.error(`error: ${error}`);
    process.exit(2);
  }

  let parsed;
  try {
    parsed = parseArgs(rest);
  } catch (e) {
    console.error(`error: ${(e as Error).message}\n`);
    console.error(HELP);
    process.exit(2);
  }

  if (parsed.kind === "help") {
    console.log(HELP);
    process.exit(0);
  }

  const willWrite = parsed.apply; // both sweep and revert carry `apply`
  const scope =
    parsed.kind === "revert"
      ? `revert ${path.basename(parsed.changelog)}`
      : parsed.sources === "all"
        ? "all sources"
        : `--source ${parsed.sources}`;
  const mode = parsed.kind === "revert" ? "revert" : parsed.mode;

  const creds = await promptProductionCredentials({
    operation: "language-sweep",
    intent: [
      "",
      "This RE-DERIVES documents.language across the PRODUCTION corpus using an",
      "LLM detector (LANG_DETECT_MODEL_ID, default google/gemini-2.5-flash-lite)",
      "reached via the prompted OPENROUTER_API_KEY. Label-only — it NEVER touches",
      "chunks or embeddings.",
      `Scope: ${scope} · mode: ${mode}`,
      willWrite
        ? "Mode: APPLY — writes documents.language (one transaction per source,"
        : "Mode: DRY-RUN — computes and logs proposed changes, writes NOTHING.",
      willWrite ? "guarded; revertible via the emitted change log)." : "",
      "",
      "Cost: ~one cheap LLM call per document (cents–single dollars for the corpus).",
      "Logs (report/CSV/changelog) go to --out-dir > $LANGUAGE_SWEEP_OUT_DIR > ./reports.",
    ].filter((l) => l !== undefined),
    summary: () => [
      `  scope:           ${scope}`,
      `  mode:            ${mode}`,
      `  write:           ${willWrite ? "APPLY (writes documents.language)" : "dry-run (no writes)"}`,
    ],
    writeOp: willWrite, // only an --apply run writes; a dry-run stays read-only
    runFlags,
  });
  if (!creds) process.exit(0);

  installCreds(creds);

  // Dynamic imports — AFTER installCreds() so the env loader sees our prompted
  // values first (see scripts/eval-production.ts for the same rationale). The
  // sweep core above is env-free, so it is safe to import statically.
  const { wire } = await import("@/main.js");
  const { getDb } = await import("@/db/index.js");

  const wiring = wire();
  const { client } = getDb();
  try {
    if (parsed.kind === "revert") {
      await runRevertCore(parsed, { client });
    } else {
      await runSweep(parsed, {
        client,
        detector: wiring.languageDetector,
        reviewer: wiring.llmReviewer,
      });
    }
  } finally {
    await wiring.shutdown();
  }
}

main().catch((err: unknown) => {
  console.error("lang:sweep:production failed:", err);
  process.exit(1);
});
