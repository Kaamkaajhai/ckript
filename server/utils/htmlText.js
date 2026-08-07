/**
 * Turn HTML into plain text, safely.
 *
 * Two mistakes were baked into the previous copies of this logic, and both are the kind that look
 * fine in review:
 *
 *   1. ONE PASS OF TAG STRIPPING. `replace(/<[^>]*>/g, "")` is a single sweep, so a tag hidden
 *      inside another tag survives it: "<<script>script>x" leaves "script>x" behind, and with the
 *      right nesting a complete tag reassembles out of the leftovers. Stripping must repeat until
 *      the text stops changing.
 *
 *   2. DECODING ENTITIES AFTER STRIPPING. That order lets the sanitiser BUILD the thing it exists to
 *      remove: "&lt;img src=x onerror=alert(1)&gt;" contains no tag when the stripper runs, and comes
 *      out the other side as a live <img> element. Entities must be decoded first, so anything that
 *      was an encoded tag becomes a real tag in time to be stripped.
 *
 * Entities are decoded EXACTLY ONCE. Repeating that would reintroduce the same class of bug from the
 * other direction: "&amp;lt;" is the encoding of the literal text "&lt;", and a second pass would
 * turn text the author typed into markup.
 */

/** The entities these documents actually carry. Numeric forms are handled separately. */
const NAMED_ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  "#x27": "'",
};

/** Decode once. Not idempotent by design — see the note above about "&amp;lt;". */
export const decodeEntitiesOnce = (value = "") =>
  String(value ?? "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name) => {
    const key = String(name).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key)) return NAMED_ENTITIES[key];
    if (key.startsWith("#x")) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });

/**
 * A tag: "<" or "</" followed immediately by a letter, or a "<!" declaration or comment.
 *
 * Deliberately narrower than `<[^>]*>`, which is what the old copies used and which eats prose. In
 * "5 < 7 and 9 > 3" that pattern matches "< 7 and 9 >" and silently deletes the middle of the
 * sentence — a real loss in screenplay text, where "<" and ">" are ordinary characters and ">text<"
 * is the centred-text syntax. Requiring a letter costs nothing in safety: a browser does not treat
 * "< script>" as a tag either, so what survives here is not markup anywhere else.
 *
 * [^>]* throughout, never [\s\S]*, so matching stays linear on input with no closing bracket.
 */
const TAG = /<\/?[a-zA-Z][^>]*>|<![^>]*>/g;

/**
 * Strip tags until the text stops changing.
 *
 * Every pass strictly shortens the string or leaves it identical, so this terminates; the counter is
 * a backstop against a pathological input rather than an expected path.
 */
export const stripTagsCompletely = (value = "") => {
  let text = String(value ?? "");
  for (let pass = 0; pass < 20; pass += 1) {
    const next = text.replace(TAG, "");
    if (next === text) return next;
    text = next;
  }
  // Anything still tag-shaped after twenty passes is hostile; drop the brackets rather than return
  // something that might reassemble downstream.
  return text.replace(/</g, "");
};

/**
 * HTML → plain text, with block-level tags becoming line breaks.
 *
 * Order matters and is the whole point: decode, then turn blocks into newlines, then strip whatever
 * markup is left, repeatedly.
 */
export const htmlToPlainText = (value = "") => {
  const decoded = decodeEntitiesOnce(value);
  const withBreaks = decoded
    .replace(/<\s*(br|p|div|li|h[1-6]|tr)\b[^>]*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n");
  return stripTagsCompletely(withBreaks);
};

export default { decodeEntitiesOnce, stripTagsCompletely, htmlToPlainText };
