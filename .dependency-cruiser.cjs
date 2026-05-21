/**
 * Boundary enforcement for the three-context architecture (docs/architecture.md §5).
 * Run with `pnpm depcruise`; a violation fails the build / CI gate.
 *
 * The import law (§5.2): everything depends on interfaces in src/contracts; only
 * src/main.ts may touch concrete adapters. Legacy bare-strip files at src root
 * (chunker.ts, embedder.ts, sources.ts, db/, mcp/) are unconstrained until they
 * migrate into the new dirs during build steps 2-6.
 */
module.exports = {
  forbidden: [
    {
      name: "contracts-are-pure",
      comment:
        "src/contracts is types + port interfaces only; it imports nothing internal.",
      severity: "error",
      from: { path: "^src/contracts/" },
      to: { path: "^src/(?!contracts/)" },
    },
    {
      name: "registry-is-pure",
      comment: "src/registry imports only contracts (pure data + lookups).",
      severity: "error",
      from: { path: "^src/registry/" },
      to: { path: "^src/(?!(contracts|registry)/)" },
    },
    {
      name: "acquisition-stays-in-lane",
      comment:
        "Acquisition may import contracts/registry only — never another context or an adapter.",
      severity: "error",
      from: { path: "^src/acquisition/" },
      to: { path: "^src/(ingestion|retrieval|serving|adapters)/" },
    },
    {
      name: "ingestion-stays-in-lane",
      severity: "error",
      from: { path: "^src/ingestion/" },
      to: { path: "^src/(acquisition|retrieval|serving|adapters)/" },
    },
    {
      name: "retrieval-stays-in-lane",
      severity: "error",
      from: { path: "^src/retrieval/" },
      to: { path: "^src/(acquisition|ingestion|serving|adapters)/" },
    },
    {
      name: "serving-stays-in-lane",
      comment:
        "Serving calls an injected Retriever (a contracts interface); never the retrieval impl or an adapter.",
      severity: "error",
      from: { path: "^src/serving/" },
      to: { path: "^src/(acquisition|ingestion|retrieval|adapters)/" },
    },
    {
      name: "adapters-import-only-contracts",
      comment: "Adapters implement contract ports; they never import a context.",
      severity: "error",
      from: { path: "^src/adapters/" },
      to: { path: "^src/(?!(contracts|adapters)/)" },
    },
    {
      name: "only-main-is-the-root",
      comment:
        "Nothing imports the composition root; main wires dependencies, it is not one.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/main\\.ts$" },
      to: { path: "^src/main\\.ts$" },
    },
    {
      name: "tests-never-touch-adapters",
      comment:
        "Context/unit tests run on fakes — they may not import a real adapter. (An adapter's own co-located *.test.ts integration test is exempt.)",
      severity: "error",
      from: { path: "\\.test\\.ts$", pathNot: "^src/adapters/" },
      to: { path: "^src/adapters/" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
  },
};
