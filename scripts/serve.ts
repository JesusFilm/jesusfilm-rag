/**
 * Serve runner — starts the versioned /v1 HTTP serving adapter (architecture
 * §3) over the wired Retriever.
 *
 *   pnpm serve   # binds PORT (Railway-injected; default 8080)
 *
 * Thin entry point: read env, parse the bearer-token registry, wire the
 * adapters (main.wire()), inject the Retriever + tokens into createApp, and bind
 * the listener. All adapter construction stays in main.wire(); no adapter or
 * write store is constructed here (read-only surface — architecture §3, README
 * Layer 1). See docs/architecture.md §3.1 for the versioning policy.
 */
import "@/env.js";
import { serve } from "@hono/node-server";
import { getEnv } from "@/env.js";
import { wire } from "@/main.js";
import { createApp, parseTokenRegistry } from "@/serving/http/index.js";

async function main(): Promise<void> {
  const env = getEnv();
  if (!env.SERVE_BEARER_TOKENS) {
    throw new Error(
      "SERVE_BEARER_TOKENS is required — set a JSON map of bearer token → allowed source keys " +
        '(e.g. {"tok-abc":["jesusfilm-org"]}, or ["*"] for all). See src/serving/http/auth.ts.',
    );
  }
  const tokens = parseTokenRegistry(env.SERVE_BEARER_TOKENS);
  const { retriever, shutdown } = wire();
  const app = createApp({ retriever, tokens });

  const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.error(`serve: /v1 listening on :${info.port}`);
  });

  const close = (): void => {
    server.close();
    void shutdown().finally(() => process.exit(0));
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

main().catch((err: unknown) => {
  console.error("serve failed:", err);
  process.exit(1);
});
