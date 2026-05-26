/** Public surface of the HTTP serving adapter. */
export { createApp, type AppDeps } from "./app.js";
export {
  parseTokenRegistry,
  resolveScope,
  lookupScope,
  bearerToken,
  tokenConfigSchema,
  type TokenRegistry,
  type TokenScope,
} from "./auth.js";
