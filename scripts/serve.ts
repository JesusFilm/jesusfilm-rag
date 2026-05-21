/**
 * Serve CLI — STUBBED until build step 6 (the Serving adapter).
 *
 *   pnpm serve
 *
 * The MCP transport + auth is rebuilt in src/serving/ over an injected Retriever
 * (which lands in step 5). See docs/architecture.md §3 (serving) and §9.
 */
import "@/env.js";

async function main(): Promise<void> {
  console.error(
    "serve: not implemented — the Serving (MCP) adapter is rebuilt in port build step 6. See docs/architecture.md §9.",
  );
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error("serve failed:", err);
  process.exit(1);
});
