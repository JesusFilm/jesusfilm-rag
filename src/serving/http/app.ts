/**
 * The /v1 HTTP delivery adapter over an injected `Retriever` (architecture §3).
 * Versioned from the first line: routes live under `/v1` so a breaking change
 * ships as `/v2` beside it (versioning policy, architecture §3.1). Validates
 * every request/response against the PUBLISHED Zod contract (contracts module),
 * so the wire shape can never drift from `contracts/openapi.v1.json`.
 *
 * Boundary (§5): imports only `contracts` + this dir + external libs. The
 * concrete `Retriever` and token registry are injected by the runner
 * (scripts/serve.ts) — never constructed here. Pure of process/port concerns
 * (no listener, no env read), so it is exercised in-process via `app.request()`.
 */
import { Hono } from "hono";
import type { Retriever } from "@/contracts/index.js";
import { searchRequestSchema, searchResponseSchema } from "@/contracts/index.js";
import { lookupScope, resolveScope, type TokenRegistry } from "./auth.js";

export interface AppDeps {
  retriever: Retriever;
  tokens: TokenRegistry;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  // Any uncaught error (e.g. a retrieval or embedding-provider failure, or the
  // response-side drift guard below) returns a contract-shaped JSON 500 — never
  // Hono's default plain-text body — so a consumer that always JSON-parses the
  // response never chokes. Documented as 500 in contracts/openapi.v1.json.
  app.onError((err, c) => {
    console.error("serve: unhandled error", err);
    return c.json({ error: "internal" }, 500);
  });

  // Unauthenticated liveness probe (Railway healthcheck hits this).
  app.get("/v1/health", (c) => c.json({ status: "ok" }));

  app.post("/v1/search", async (c) => {
    const scope = lookupScope(deps.tokens, c.req.header("Authorization"));
    if (!scope) {
      // RFC 7235 §3.1: a 401 carries a WWW-Authenticate challenge.
      return c.json({ error: "unauthorized" }, 401, {
        "WWW-Authenticate": "Bearer",
      });
    }

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }

    const parsed = searchRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", issues: parsed.error.issues },
        400,
      );
    }

    const { query, policy = {} } = parsed.data;
    const effective = resolveScope(scope, policy.allowedSourceKeys);

    // Empty intersection = nothing this token may see for this request. Return
    // empty without embedding the query (no cost, no leak of what exists).
    if (Array.isArray(effective) && effective.length === 0) {
      return c.json({ results: [] });
    }

    const results = await deps.retriever.search(query, {
      ...policy,
      allowedSourceKeys: effective,
    });
    return c.json(searchResponseSchema.parse({ results }));
  });

  return app;
}
