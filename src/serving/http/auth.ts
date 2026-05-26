/**
 * Layer-1 access control for the serving adapter (README "Access & filtering").
 * A consumer presents a Bearer token; the token carries the set of source keys
 * it may see. The server intersects that scope with the request's
 * `allowedSourceKeys` — a request may NARROW its visibility but never widen it
 * beyond the token. This maps directly onto `RetrievalPolicy.allowedSourceKeys`
 * (what the engine already enforces); the engine gains no new surface.
 *
 * Pure module — no I/O, no transport. Imports only the contract + zod.
 */
import { z } from "zod";

/** A token's visibility scope: an explicit set of source keys, or every source. */
export interface TokenScope {
  allowedSourceKeys: string[] | "all";
}

export type TokenRegistry = ReadonlyMap<string, TokenScope>;

/**
 * Shape of `SERVE_BEARER_TOKENS` (JSON): bearer token → the source keys it may
 * see. The sentinel `["*"]` grants all sources (e.g. a trusted first-party
 * consumer). Issued one per consumer, rotated per consumer (README §Access).
 */
export const tokenConfigSchema = z.record(
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
);

/** Parse + validate the env JSON into a lookup registry. Throws on malformed input. */
export function parseTokenRegistry(json: string): TokenRegistry {
  const parsed = tokenConfigSchema.parse(JSON.parse(json));
  const registry = new Map<string, TokenScope>();
  for (const [token, keys] of Object.entries(parsed)) {
    registry.set(token, {
      allowedSourceKeys: keys.includes("*") ? "all" : keys,
    });
  }
  return registry;
}

/** Extract a Bearer token from an Authorization header, or null if absent/malformed. */
export function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  // RFC 7235: the auth-scheme is case-insensitive (`Bearer`/`bearer` both ok).
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1].trim() : null;
}

/** Resolve the presented token to its scope, or null if unknown. */
export function lookupScope(
  registry: TokenRegistry,
  authorization: string | undefined,
): TokenScope | null {
  const token = bearerToken(authorization);
  if (!token) return null;
  return registry.get(token) ?? null;
}

/**
 * The effective `allowedSourceKeys` to hand the retriever, given the token's
 * scope and the request's requested scope:
 *   - token "all"        → request's own set (or undefined = all)
 *   - request omitted    → the token's set
 *   - both present       → the intersection (may be [] = nothing visible)
 * `undefined` means no restriction; `[]` means "match nothing" — both stores
 * treat `[]` as zero results, so an out-of-scope request leaks nothing.
 */
export function resolveScope(
  scope: TokenScope,
  requested: string[] | undefined,
): string[] | undefined {
  if (scope.allowedSourceKeys === "all") return requested;
  if (!requested) return scope.allowedSourceKeys;
  const allowed = new Set(scope.allowedSourceKeys);
  return requested.filter((key) => allowed.has(key));
}
