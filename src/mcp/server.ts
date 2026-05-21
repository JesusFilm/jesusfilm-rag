/**
 * MCP server — read-only retrieval over the corpus.
 *
 * Transport: Streamable HTTP. Single endpoint, POST + optional SSE
 * upgrade, `Mcp-Session-Id` header. Validates Origin to defeat DNS rebinding,
 * checks a static Bearer token, and intersects the token's scope with the
 * caller-supplied filter on every search.
 *
 * Tools:
 *   - semantic_search({ query, filter?, top_k? })
 *   - keyword_search({ query, filter?, top_k? })
 *   - fetch_by_id({ chunk_id })
 */

import { randomUUID } from "node:crypto";
import http from "node:http";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { EMBEDDING_DIMS } from "@/db/schema.js";
import { getEnv } from "@/env.js";
import { OpenRouterEmbedder } from "@/embedder.js";

const MAX_TOP_K = 25;
const DEFAULT_TOP_K = 8;

const FilterSchema = z
  .object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  })
  .optional();

interface SearchHit {
  chunk_id: string;
  score: number;
  text: string;
  source: string;
  document_path: string;
  document_url: string | null;
  document_title: string | null;
  ord: number;
  tags: string[];
}

export function createMcpServer(): McpServer {
  const env = getEnv();
  const embedder = new OpenRouterEmbedder({
    apiKey: env.OPENROUTER_API_KEY,
    modelId: env.EMBED_MODEL_ID,
    expectedDimensions: EMBEDDING_DIMS,
  });
  const scopes = new Set(env.MCP_BEARER_SCOPES);

  const server = new McpServer({
    name: "jesusfilm-rag",
    version: "0.0.1",
  });

  server.registerTool(
    "semantic_search",
    {
      title: "Semantic search",
      description:
        "Embed the query and return the top-k cosine-nearest chunks from the corpus, filtered by the consumer's scope and optional tag filter.",
      inputSchema: {
        query: z.string().min(1).max(2000),
        filter: FilterSchema,
        top_k: z.number().int().min(1).max(MAX_TOP_K).optional(),
      },
    },
    async ({ query, filter, top_k }) => {
      const k = top_k ?? DEFAULT_TOP_K;
      const hits = await runSemanticSearch(query, filter, k, embedder, scopes);
      return toolJson({ query, top_k: k, hits });
    },
  );

  server.registerTool(
    "keyword_search",
    {
      title: "Keyword search",
      description:
        "Postgres full-text search over the chunk text, filtered by the consumer's scope and optional tag filter.",
      inputSchema: {
        query: z.string().min(1).max(2000),
        filter: FilterSchema,
        top_k: z.number().int().min(1).max(MAX_TOP_K).optional(),
      },
    },
    async ({ query, filter, top_k }) => {
      const k = top_k ?? DEFAULT_TOP_K;
      const hits = await runKeywordSearch(query, filter, k, scopes);
      return toolJson({ query, top_k: k, hits });
    },
  );

  server.registerTool(
    "fetch_by_id",
    {
      title: "Fetch chunk by id",
      description:
        "Return the full chunk text + document + source metadata for a chunk id. Returns null if the chunk is not in the caller's scope.",
      inputSchema: {
        chunk_id: z.string().uuid(),
      },
    },
    async ({ chunk_id }) => {
      const found = await fetchById(chunk_id, scopes);
      return toolJson(found);
    },
  );

  return server;
}

function toolJson(payload: unknown): {
  content: { type: "text"; text: string }[];
} {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

/**
 * The token's scope is the union of tag values the consumer is permitted to
 * see. A chunk is in-scope iff at least one of its tags appears in the scope
 * set. (Empty scope = no access — handled at auth time, not here.)
 *
 * Within scope, the query filter narrows further:
 *   - include: every listed tag must be on the chunk.
 *   - exclude: no listed tag may be on the chunk.
 */
function tagsInScope(chunkTags: string[], scope: Set<string>): boolean {
  if (scope.size === 0) return false;
  for (const t of chunkTags) {
    if (scope.has(t)) return true;
    // Support `media:*` wildcard tokens in scope.
    const ns = t.split(":")[0];
    if (scope.has(`${ns}:*`)) return true;
  }
  return false;
}

function filterAllows(
  chunkTags: string[],
  filter: { include?: string[]; exclude?: string[] } | undefined,
): boolean {
  if (!filter) return true;
  const set = new Set(chunkTags);
  if (filter.include) {
    for (const t of filter.include) if (!set.has(t)) return false;
  }
  if (filter.exclude) {
    for (const t of filter.exclude) if (set.has(t)) return false;
  }
  return true;
}

/**
 * The three query functions below are STUBBED during the port (step 1). Their
 * previous bodies queried the old MVP schema (documents keyed by file `path`,
 * sources keyed by `name`, post-hoc tag filtering). The real query path is the
 * Retrieval context (candidate fan-out → cosine rank → minScore cutoff → 3-key
 * dedup → citation assembly) behind the CorpusSearchStore port. This MCP server
 * is the thin Retrieval *adapter* — its transport, bearer auth, origin
 * validation, and tool registration are kept; only the query bodies are
 * rebuilt. See the port architecture doc §3 (Retrieval) and §8 steps 5–6.
 *
 * The `tagsInScope` / `filterAllows` scope helpers above are pure and survive
 * the port — they will be reused once Retrieval lands.
 *
 * TODO(step-5): implement Retrieval over CorpusSearchStore.vectorSearch and map
 *               RankedResult[] (with citation) onto the wire shape below.
 * TODO(step-6): re-attach keyword_search (optional FTS port) and fetch_by_id.
 */

async function runSemanticSearch(
  query: string,
  filter: { include?: string[]; exclude?: string[] } | undefined,
  topK: number,
  embedder: OpenRouterEmbedder,
  scope: Set<string>,
): Promise<SearchHit[]> {
  void query;
  void filter;
  void topK;
  void embedder;
  void scope;
  void tagsInScope;
  void filterAllows;
  throw new Error(
    "semantic_search: Retrieval not implemented — rebuilt in port build step 5. See src/mcp/server.ts.",
  );
}

async function runKeywordSearch(
  query: string,
  filter: { include?: string[]; exclude?: string[] } | undefined,
  topK: number,
  scope: Set<string>,
): Promise<SearchHit[]> {
  void query;
  void filter;
  void topK;
  void scope;
  throw new Error(
    "keyword_search: Retrieval not implemented — rebuilt in port build step 6. See src/mcp/server.ts.",
  );
}

async function fetchById(
  chunkId: string,
  scope: Set<string>,
): Promise<SearchHit | null> {
  void chunkId;
  void scope;
  throw new Error(
    "fetch_by_id: Retrieval not implemented — rebuilt in port build step 6. See src/mcp/server.ts.",
  );
}

/**
 * Wrap the McpServer in a Node http.Server that handles Bearer auth, Origin
 * validation, and routes to the StreamableHTTPServerTransport.
 */
export function startHttpServer(
  server: McpServer,
  port: number,
): http.Server {
  const env = getEnv();
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    // DNS rebinding protection — reject unknown Origins. Local dev allows
    // localhost/127.0.0.1; production hosts will be added via env later.
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "origin not allowed" }));
      return;
    }

    if (req.url === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.url !== "/mcp") {
      res.statusCode = 404;
      res.end();
      return;
    }

    // Bearer auth.
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("WWW-Authenticate", 'Bearer realm="jesusfilm-rag"');
      res.end();
      return;
    }
    const token = auth.slice("Bearer ".length).trim();
    if (token !== env.MCP_BEARER_TOKEN) {
      res.statusCode = 401;
      res.setHeader("WWW-Authenticate", 'Bearer realm="jesusfilm-rag"');
      res.end();
      return;
    }

    const sessionHeader = req.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionHeader)
      ? sessionHeader[0]
      : sessionHeader;

    let transport: StreamableHTTPServerTransport | undefined = sessionId
      ? transports.get(sessionId)
      : undefined;

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport!);
        },
      });
      transport.onclose = () => {
        if (transport!.sessionId) transports.delete(transport!.sessionId);
      };
      await server.connect(transport);
    }

    // The SDK transport reads the raw body itself; we pass the request through.
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("mcp handle error:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end();
      }
    }
  });

  httpServer.listen(port, () => {
    console.log(`MCP server listening on http://localhost:${port}/mcp`);
  });
  return httpServer;
}

function isAllowedOrigin(origin: string): boolean {
  const allow = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  ];
  return allow.some((r) => r.test(origin));
}
