/**
 * Smoke test — a consumer-perspective probe of the live /v1 serving layer.
 *
 *   SMOKE_TOKEN=<bearer> pnpm smoke "how do I become a Christian?"
 *
 * It is a black box: it sends only what a real consumer sends — a bearer token
 * and a query — to a RUNNING server and confirms the whole path answers, public
 * interface → RAG → back. It does NOT start a server, seed data, or mock
 * anything; it curls whatever is already up. The target is an environment URL:
 * locally that is your `pnpm serve`; in CD the pipeline injects the deployed URL.
 *
 *   SMOKE_BASE_URL  target origin            (default http://localhost:8080)
 *   SMOKE_TOKEN     bearer the server trusts (required)
 *   SMOKE_MAX_MS    hang ceiling, ms         (default 15000)
 *
 * The gate is CORRECTNESS: health is up, /v1/search returns 200 with a
 * contract-valid response. Latency is reported every run but is NOT a sub-second
 * SLA — it is dominated by the embedding provider's variable round-trip
 * (qwen/qwen3-embedding-8b via OpenRouter: ~1–11s observed, provider-routing
 * dependent; 3-small was ~0.8–1.4s), so failing a deploy on a tight budget
 * would flake. The ceiling only catches a true hang/outage. Exits non-zero on any correctness
 * breach so a CD pipeline can gate a deploy on it.
 */
import type { SearchResponse } from "@/contracts/index.js";
import { searchResponseSchema } from "@/contracts/index.js";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:8080";
const TOKEN = process.env.SMOKE_TOKEN;
const MAX_MS = Number(process.env.SMOKE_MAX_MS ?? "15000");
const QUERY =
  process.argv.slice(2).join(" ").trim() || "how do I become a Christian?";

function fail(msg: string): never {
  console.error(`smoke: FAIL — ${msg}`);
  process.exit(1);
}

/** One consumer round-trip: asserts 200 + contract, returns the latency + body. */
async function search(): Promise<{ ms: number; body: SearchResponse }> {
  const startedAt = Date.now();
  const res = await fetch(`${BASE_URL}/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN ?? ""}` },
    body: JSON.stringify({ query: QUERY, policy: { topK: 5 } }),
  });
  const ms = Date.now() - startedAt;
  if (res.status !== 200) fail(`POST /v1/search → ${res.status} (expected 200): ${await res.text()}`);
  const parsed = searchResponseSchema.safeParse(await res.json());
  if (!parsed.success) fail(`response did not match the published contract: ${parsed.error.message}`);
  return { ms, body: parsed.data };
}

async function main(): Promise<void> {
  if (!TOKEN) fail("SMOKE_TOKEN is required (a bearer token the target server trusts).");

  const health = await fetch(`${BASE_URL}/v1/health`);
  if (health.status !== 200) fail(`GET /v1/health → ${health.status} (expected 200)`);

  const probe = await search();
  const { results } = probe.body;

  console.error(`smoke: ${BASE_URL}`);
  console.error(`  query   : "${QUERY}"`);
  console.error(`  status  : 200 OK, contract-valid`);
  console.error(`  results : ${results.length}`);
  if (results[0]) {
    const c = results[0].citation;
    console.error(
      `  top hit : ${results[0].score.toFixed(3)}  ${c.sourceKey}  "${c.title ?? "(untitled)"}"`,
    );
  }
  console.error(`  latency : ${probe.ms}ms (reported; hang ceiling ${MAX_MS}ms)`);

  if (probe.ms > MAX_MS) fail(`/v1/search did not respond within ${MAX_MS}ms (hang/outage?)`);
  if (results.length === 0) {
    console.error("smoke: WARN — 0 results (corpus empty or query off-scope?)");
  }
  console.error("smoke: PASS");
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
