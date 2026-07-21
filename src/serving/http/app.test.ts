import { describe, it, expect, vi } from "vitest";
import type {
  RankedResult,
  RetrievalPolicy,
  Retriever,
} from "@/contracts/index.js";
import { rankedResultSchema } from "@/contracts/index.js";
import { createApp } from "./app.js";
import { parseTokenRegistry, type TokenRegistry } from "./auth.js";

const SAMPLE: RankedResult = {
  chunkId: "c1",
  score: 0.81,
  text: "Pray like this…",
  ord: 0,
  tags: ["topic:prayer"],
  citation: {
    sourceKey: "jesusfilm-org",
    sourceName: "Jesus Film",
    title: "How to pray",
    url: "https://example.org/pray",
  },
};

/** Records the policy it was called with; returns a fixed result set. */
function spyRetriever(results: RankedResult[] = [SAMPLE]) {
  const calls: { query: string; policy?: RetrievalPolicy }[] = [];
  const retriever: Retriever = {
    search: async (query, policy) => {
      calls.push({ query, policy });
      return results;
    },
  };
  return { retriever, calls };
}

const TOKENS: TokenRegistry = parseTokenRegistry(
  JSON.stringify({
    "tok-jfo": ["jesusfilm-org"],
    "tok-all": ["*"],
  }),
);

function post(body: unknown, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request("http://local/v1/search", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /v1/health", () => {
  it("returns ok without auth", async () => {
    const { retriever } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      "/v1/health",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("POST /v1/search — auth", () => {
  it("401s a missing token", async () => {
    const { retriever, calls } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "how to pray" }),
    );
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("401s an unknown token", async () => {
    const { retriever } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "how to pray" }, "nope"),
    );
    expect(res.status).toBe(401);
  });

  it("carries a WWW-Authenticate challenge on 401 (RFC 7235)", async () => {
    const { retriever } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "x" }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe("Bearer");
  });

  it("accepts a case-insensitive Bearer scheme", async () => {
    const { retriever } = spyRetriever();
    const req = new Request("http://local/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "bearer tok-all" },
      body: JSON.stringify({ query: "how to pray" }),
    });
    const res = await createApp({ retriever, tokens: TOKENS }).request(req);
    expect(res.status).toBe(200);
  });
});

describe("POST /v1/search — validation", () => {
  it("400s invalid JSON", async () => {
    const { retriever } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post("{not json", "tok-all"),
    );
    expect(res.status).toBe(400);
  });

  it("400s an unknown policy field (strict contract)", async () => {
    const { retriever } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "x", policy: { audience: "seeker" } }, "tok-all"),
    );
    expect(res.status).toBe(400);
  });

  it("400s an empty query", async () => {
    const { retriever } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "" }, "tok-all"),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /v1/search — happy path + contract", () => {
  it("returns contract-valid results", async () => {
    const { retriever } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "how to pray" }, "tok-all"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: unknown[] };
    expect(body.results).toHaveLength(1);
    expect(rankedResultSchema.parse(body.results[0])).toEqual(SAMPLE);
  });
});

describe("POST /v1/search — Layer-1 scope intersection", () => {
  it("passes the token's scope when the request omits one", async () => {
    const { retriever, calls } = spyRetriever();
    await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "x" }, "tok-jfo"),
    );
    expect(calls[0].policy?.allowedSourceKeys).toEqual(["jesusfilm-org"]);
  });

  it("narrows a wildcard token to the request's own scope", async () => {
    const { retriever, calls } = spyRetriever();
    await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "x", policy: { allowedSourceKeys: ["jesusfilm-org"] } }, "tok-all"),
    );
    expect(calls[0].policy?.allowedSourceKeys).toEqual(["jesusfilm-org"]);
  });

  it("returns empty without calling the engine when scope can't widen", async () => {
    const { retriever, calls } = spyRetriever();
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "x", policy: { allowedSourceKeys: ["other-source"] } }, "tok-jfo"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [] });
    expect(calls).toHaveLength(0);
  });
});

describe("POST /v1/search — error handling", () => {
  it("returns a contract-shaped JSON 500 when the retriever throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const retriever: Retriever = {
      search: async () => {
        throw new Error("db down");
      },
    };
    const res = await createApp({ retriever, tokens: TOKENS }).request(
      post({ query: "how to pray" }, "tok-all"),
    );
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "internal" });
    // The terminal log states the outcome — the closing entry after any
    // query-embed retry lines when a reader correlates serve logs with a
    // caller's failure.
    expect(errSpy).toHaveBeenCalledWith(
      "serve: request failed — returning 500 to the caller",
      expect.any(Error),
    );
    errSpy.mockRestore();
  });
});
