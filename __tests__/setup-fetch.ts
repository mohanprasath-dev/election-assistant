/**
 * Setup file for API tests running in Node environment.
 * Polyfills web API globals (Request, Response, Headers, fetch)
 * required by Next.js server components.
 */

// Node 18+ has these built-in but Jest's VM environment may not expose them
if (typeof globalThis.Request === "undefined") {
  // Use undici which is bundled with Node 18+
  try {
    const undici = require("undici");
    globalThis.Request = undici.Request;
    globalThis.Response = undici.Response;
    globalThis.Headers = undici.Headers;
    globalThis.fetch = undici.fetch;
  } catch {
    // Fallback: Node 22 has these in globalThis already
    // If undici is not available, they should exist natively
  }
}
