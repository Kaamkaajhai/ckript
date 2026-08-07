/**
 * A URL a browser will fetch as media, REBUILT rather than passed through.
 *
 * The previous guards were correct — they blocked every scheme but http/https/blob/data-media, and
 * checked the URL with control characters stripped so "java\tscript:" could not read as scheme-less.
 * What they did not do is break the DATA FLOW: a string typed into an input, or stored on somebody
 * else's profile, was validated and then returned byte-for-byte into a `src`. CodeQL is right to keep
 * flagging that shape, and the objection is not pedantic — a validator that returns its own input is
 * one edit away from validating the wrong thing, and nothing downstream can tell.
 *
 * So this parses with the URL API and returns `parsed.href`, a string the URL parser produced. The
 * only value that can reach a `src` is one the browser itself built from a protocol we allowlisted.
 *
 * The cost is that a URL comes back normalised — "example.com/a b" becomes "…/a%20b", a relative path
 * becomes absolute. For an <img> or <video> src that is exactly what the browser would have resolved
 * anyway, so nothing renders differently.
 */

/** Schemes the URL parser understands and a media element will fetch. */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

/**
 * data: URLs are handled separately — `new URL("data:…").href` keeps the whole payload, so parsing
 * buys nothing, and the media type lives in the URL body where `.protocol` cannot see it. Matching
 * the media type explicitly is the check that matters.
 */
const DATA_MEDIA = /^data:(image|video|audio)\/[a-z0-9][a-z0-9.+-]*[;,]/i;

/**
 * @param {unknown} url
 * @param {{ media?: ("image"|"video"|"audio")[] }} [options]
 *   Which data: media types are acceptable. Defaults to images only, which is what an avatar wants;
 *   a post preview that also accepts video passes them in.
 * @returns {string} a safe, browser-built URL, or "" when there is nothing safe to render
 */
export const safeMediaSrc = (url, { media = ["image"] } = {}) => {
  if (typeof url !== "string") return "";

  // Exactly what the URL parser itself removes, so the check sees what the parser will see:
  // leading/trailing C0 controls and spaces, and tab/newline/carriage-return from anywhere. That
  // second rule is what makes a tab-spliced "java<TAB>script:" read as "javascript:".
  //
  // Deliberately NOT every character at or below 0x20. Dropping those wholesale also deletes a
  // space INSIDE a path, so "/a b.png" would be fetched as "/ab.png" — a different file. The
  // parser percent-encodes that space instead, and so must this.
  //
  // Written as code-point comparisons rather than regex ranges: a control character inside a regex
  // literal is invisible in review and is nearly always a typo rather than an intent.
  const isControlOrSpace = (char) => char.charCodeAt(0) <= 0x20;
  const REMOVED_ANYWHERE = new Set(["\t", "\n", "\r"]);

  let from = 0;
  let to = url.length;
  while (from < to && isControlOrSpace(url[from])) from += 1;
  while (to > from && isControlOrSpace(url[to - 1])) to -= 1;

  const cleaned = Array.from(url.slice(from, to))
    .filter((char) => !REMOVED_ANYWHERE.has(char))
    .join("");
  if (!cleaned) return "";

  // A second look with EVERY control character removed, purely to reject obfuscation.
  //
  // A NUL-spliced "java<NUL>script:alert(1)" is not a javascript: URL to a browser — NUL is
  // percent-encoded rather than stripped, so it parses as a relative path and resolves to a
  // harmless same-origin URL. Safe, but it would still fire a pointless request at our own server
  // for what was plainly an attempt. If the de-obfuscated form names a scheme, it must be one we
  // allow.
  const deobfuscated = Array.from(cleaned)
    .filter((char) => !isControlOrSpace(char))
    .join("")
    .toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(deobfuscated);
  if (scheme && !ALLOWED_PROTOCOLS.has(`${scheme[1]}:`) && scheme[1] !== "data") return "";

  if (/^data:/i.test(cleaned)) {
    const match = DATA_MEDIA.exec(cleaned);
    if (!match) return "";
    return media.includes(match[1].toLowerCase()) ? cleaned : "";
  }

  let parsed;
  try {
    // The base lets a relative path resolve exactly as the browser would have resolved it.
    parsed = new URL(cleaned, typeof window !== "undefined" ? window.location.href : "http://localhost/");
  } catch {
    return "";
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return "";
  return parsed.href;
};

export default safeMediaSrc;
