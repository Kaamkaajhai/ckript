/**
 * Outbound HTTP the server makes on a user's behalf.
 *
 * Any request whose URL is built from request data is a server-side request forgery risk: the server
 * sits inside the network perimeter, so "fetch this URL for me" reaches cloud metadata endpoints,
 * localhost admin ports and internal services that the caller could never reach directly.
 *
 * The defence is an allowlist checked at the SINK. Validating in the caller works right up until
 * someone adds a second caller — which is how these holes reappear — so the check lives here, and
 * every postal lookup goes through it.
 */

/** Postal-code providers. Nothing else is reachable from a user-supplied value. */
export const POSTAL_API_ORIGINS = Object.freeze([
  "https://api.postalpincode.in",
  "https://api.zippopotam.us",
]);

/**
 * Resolve a URL and prove it points at an allowlisted origin.
 *
 * Compares `URL.origin`, which is scheme + host + port together. That matters:
 *   - "https://api.postalpincode.in@attacker.example/x" has origin https://attacker.example — the
 *     part before "@" is credentials, not the host, and reading the string left to right is exactly
 *     how this bypass gets missed.
 *   - "https://api.postalpincode.in.attacker.example" is a different host, not a suffix match.
 *   - "http://api.postalpincode.in" is a different origin, so a silent downgrade to plaintext is
 *     refused rather than allowed.
 */
export const resolveAllowedUrl = (url, allowedOrigins = POSTAL_API_ORIGINS) => {
  let target;
  try {
    target = new URL(url);
  } catch {
    throw new Error("Refusing an outbound request to a malformed URL");
  }
  if (!allowedOrigins.includes(target.origin)) {
    throw new Error(`Refusing an outbound request to a non-allowlisted origin: ${target.origin}`);
  }
  return target;
};

/**
 * A postal code safe to place in a URL path, or "" when it is not one.
 *
 * Spaces and hyphens are allowed because "SW1A 1AA" and "K1A-0B1" are real postal codes and
 * rejecting them would break signup outside India; encodeURIComponent then makes a space %20 rather
 * than a break in the path. Everything else — traversal, a query string, a fragment, CRLF, a whole
 * URL — fails the shape test and is refused rather than escaped, because a postal code that needs
 * escaping is not a postal code.
 */
const POSTAL_CODE_SHAPE = /^[a-zA-Z0-9][a-zA-Z0-9\s-]{2,11}$/;

export const asPostalPathSegment = (value) => {
  const text = String(value ?? "").trim();
  if (!POSTAL_CODE_SHAPE.test(text)) return "";
  return encodeURIComponent(text);
};

export default { POSTAL_API_ORIGINS, resolveAllowedUrl, asPostalPathSegment };
