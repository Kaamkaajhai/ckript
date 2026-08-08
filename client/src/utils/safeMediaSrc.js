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
 * buys nothing, and the media type lives in the URL body where `.protocol` cannot see it.
 *
 * base64 is REQUIRED, and that is the substantive rule here rather than a formatting preference.
 * A comma-form data URL carries its payload as literal text, so `data:image/svg+xml,<svg
 * onload=...>` arrives with real angle brackets in it and the previous version of this function
 * returned it verbatim. Percent-encoding those would have been theatre — the browser decodes the
 * payload straight back. Requiring base64 is what actually settles it: the base64 alphabet contains
 * no `<`, `>`, `"`, `'` or backtick, so the string cannot carry an attribute-breaking character no
 * matter what it decodes to.
 *
 * Nothing real is lost. Every preview in this app is a `blob:` URL from `URL.createObjectURL`, and
 * the comma form is useless for binary media anyway; only a hand-typed URL reaches this branch.
 *
 * SVG stays allowed. It is markup, but an <img> or <video> renders SVG in the browser's secure
 * static mode, where scripts and external references do not run.
 */
const DATA_MEDIA = /^data:(image|video|audio)\/([a-z0-9][a-z0-9.+-]*);base64,([a-z0-9+/]+={0,2})$/i;

/**
 * The characters that could end the attribute this value is about to sit in.
 *
 * Very nearly a no-op, and worth being exact about rather than hand-waving. On the data: branch it
 * provably cannot fire: the string is rebuilt from a fixed media kind, a `[a-z0-9.+-]` subtype and a
 * base64 payload, and none of those alphabets contains any of the five. On http/https the URL parser
 * has already encoded `<`, `>` and `"`, so only two cases actually change bytes — a bare `'` in a
 * path and a backtick in a query — and both are percent-encodings every server decodes before it
 * resolves anything, so the same resource is fetched. A `blob:` URL has an opaque path the parser
 * barely touches, so all five would survive there; every blob here comes from createObjectURL and is
 * hex and dashes, and a hand-typed one carrying a quote is the case where changing it is right.
 *
 * It earns its place by making the guarantee LOCAL. Without it, "the returned string cannot break
 * out of an attribute" is a property inherited from the URL spec's encode sets — true, but true
 * somewhere else, and it silently stops being true the day someone adds a branch that returns a
 * string the parser never touched. That is exactly how the data: branch went wrong: it returned its
 * input verbatim, angle brackets and all, while every other path was safe. Enforcing the invariant
 * at the single exit means a new branch inherits it instead of having to remember it.
 */
const ATTRIBUTE_BREAKERS = /["'<>`]/g;

const encodeAttributeBreakers = (value) =>
  value.replace(ATTRIBUTE_BREAKERS, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

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
    const [, kind, subtype, payload] = match;
    if (!media.includes(kind.toLowerCase())) return "";
    // Reassembled from the matched parts rather than returned as-is, so the string handed back is
    // built here out of pieces that have each been checked, not the caller's string waved through.
    return encodeAttributeBreakers(`data:${kind.toLowerCase()}/${subtype.toLowerCase()};base64,${payload}`);
  }

  let parsed;
  try {
    // The base lets a relative path resolve exactly as the browser would have resolved it.
    parsed = new URL(cleaned, typeof window !== "undefined" ? window.location.href : "http://localhost/");
  } catch {
    return "";
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return "";
  return encodeAttributeBreakers(parsed.href);
};

export default safeMediaSrc;
