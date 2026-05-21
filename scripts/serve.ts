import "@/env.js";
import { getEnv } from "@/env.js";
import { closeDb } from "@/db/index.js";
import { createMcpServer, startHttpServer } from "@/mcp/server.js";

async function main(): Promise<void> {
  const env = getEnv();
  const server = createMcpServer();
  const http = startHttpServer(server, env.MCP_PORT);

  const shutdown = async (sig: string): Promise<void> => {
    console.log(`\n${sig} received — shutting down`);
    http.close();
    await server.close();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  console.error("serve failed:", err);
  process.exit(1);
});
