/**
 * Generate the published contract artifact (contracts/openapi.v1.json) FROM the
 * single-source Zod schemas (src/contracts/retrieval.schema.ts). Consumers pin
 * / codegen against the committed file; it is never hand-edited.
 *
 *   pnpm gen:contract        # regenerate contracts/openapi.v1.json
 *
 * This is dev tooling, NOT a context — it lives in scripts/ and must never
 * become an import target for src/ (architecture §5; #12 boundary). The drift
 * test (tests/contract-artifact.test.ts) imports `buildOpenApiDoc` and fails if
 * the committed file is out of sync, so the artifact can't silently rot.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  citationSchema,
  rankedResultSchema,
  retrievalPolicySchema,
  searchRequestSchema,
  searchResponseSchema,
} from "@/contracts/index.js";

export const ARTIFACT_PATH = "contracts/openapi.v1.json";

type JsonObj = Record<string, unknown>;

/** Generate an OpenAPI 3 schema from a Zod schema, as a mutable object. */
const jsonSchema = (schema: Parameters<typeof zodToJsonSchema>[0]): JsonObj =>
  zodToJsonSchema(schema, { target: "openApi3", $refStrategy: "none" }) as JsonObj;

const ref = (name: string): JsonObj => ({ $ref: `#/components/schemas/${name}` });
const propsOf = (schema: JsonObj): JsonObj => schema.properties as JsonObj;

const ERROR_SCHEMA = {
  type: "object",
  properties: { error: { type: "string" }, issues: { type: "array" } },
  required: ["error"],
} as const;

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: ref("Error") } },
});

/** The OpenAPI 3 document — the canonical published shape of the /v1 surface. */
export function buildOpenApiDoc(): Record<string, unknown> {
  // Composite schemas $ref their parts (rather than inlining) so every named
  // component is referenced — consumers codegen RankedResult / RetrievalPolicy /
  // Citation as first-class types, with no duplicated anonymous copies.
  const citation = jsonSchema(citationSchema);
  const retrievalPolicy = jsonSchema(retrievalPolicySchema);
  const rankedResult = jsonSchema(rankedResultSchema);
  propsOf(rankedResult).citation = ref("Citation");
  const searchRequest = jsonSchema(searchRequestSchema);
  propsOf(searchRequest).policy = ref("RetrievalPolicy");
  const searchResponse = jsonSchema(searchResponseSchema);
  (propsOf(searchResponse).results as JsonObj).items = ref("RankedResult");

  return {
    openapi: "3.0.3",
    info: {
      title: "JesusFilm RAG — Retrieval API",
      version: "1.0.0",
      description:
        "Read-only retrieval over a curated, cited corpus. The canonical " +
        "shape consumers map onto; the engine does not bend. Versioning: " +
        "additive change = same major; breaking change = a new /v2 beside /v1.",
    },
    paths: {
      "/v1/health": {
        get: {
          summary: "Liveness probe (unauthenticated).",
          responses: {
            "200": {
              description: "Service is up.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { status: { type: "string", enum: ["ok"] } },
                    required: ["status"],
                  },
                },
              },
            },
          },
        },
      },
      "/v1/search": {
        post: {
          summary: "Retrieve ranked, cited results for a query.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Ranked results (possibly empty).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SearchResponse" },
                },
              },
            },
            "400": errorResponse("Malformed JSON or request failing the contract."),
            "401": errorResponse("Missing or unknown bearer token."),
            "500": errorResponse("Internal error — e.g. a retrieval or embedding-provider failure."),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
      schemas: {
        RetrievalPolicy: retrievalPolicy,
        RankedResult: rankedResult,
        Citation: citation,
        SearchRequest: searchRequest,
        SearchResponse: searchResponse,
        Error: ERROR_SCHEMA,
      },
    },
  };
}

function main(): void {
  const out = path.resolve(process.cwd(), ARTIFACT_PATH);
  writeFileSync(out, JSON.stringify(buildOpenApiDoc(), null, 2) + "\n");
  console.error(`gen:contract → ${ARTIFACT_PATH}`);
}

// Run the writer only when invoked directly (`tsx scripts/gen-contract.ts`),
// not when the drift test imports buildOpenApiDoc.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
