import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildOpenApiDoc, ARTIFACT_PATH } from "../scripts/gen-contract.js";

/**
 * The committed artifact (contracts/openapi.v1.json) is GENERATED from the Zod
 * source. If a schema changes without regenerating, the published contract
 * silently lies to consumers — so fail loudly here and point at the fix.
 */
describe("published contract artifact", () => {
  it("is in sync with the Zod source (run `pnpm gen:contract` if this fails)", () => {
    const committed: unknown = JSON.parse(
      readFileSync(path.resolve(process.cwd(), ARTIFACT_PATH), "utf8"),
    );
    expect(committed).toEqual(buildOpenApiDoc());
  });
});
