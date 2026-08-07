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

const isAsciiLetter = (ch) => ch !== undefined && ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"));

/**
 * Remove one layer of tags, scanning the string exactly once.
 *
 * NOT a regex, deliberately. `/<\/?[a-zA-Z][^>]*>/g` looks linear — `[^>]*` cannot cross a ">" — but
 * it is not: on input like "<a<a<a<a…" with no ">" anywhere, the engine restarts at every "<a",
 * scans to the end looking for a ">", fails, and moves on. That is O(n²), and this runs on uploaded
 * screenplays. (CodeQL flagged the identical shape in screenplayPages.js; the same trap was here.)
 *
 * Both indexes below only ever move forward, so the whole scan is O(n) with no backtracking at all.
 * The exit when no ">" remains is what makes that true: once the rest of the string holds no closing
 * bracket, no later position can contain a tag either, so there is nothing left to look for.
 *
 * A tag is "<" or "</" followed immediately by a letter, or a "<!" declaration. Narrower than
 * `<[^>]*>` on purpose: that eats prose — in "5 < 7 and 9 > 3" it matches "< 7 and 9 >" and deletes
 * the middle of the sentence, a real loss in screenplay text where ">text<" is the centred-text
 * syntax. Requiring a letter costs nothing in safety, since a browser does not treat "< script>" as
 * a tag either.
 */
const stripTagsOnce = (text) => {
  let out = "";
  let i = 0;

  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt < 0) return out + text.slice(i);

    let nameAt = lt + 1;
    if (text[nameAt] === "/") nameAt += 1;
    const opensTag = isAsciiLetter(text[nameAt]) || text[lt + 1] === "!";

    if (!opensTag) {
      // A bare "<" in prose. Keep it and carry on past it.
      out += text.slice(i, lt + 1);
      i = lt + 1;
      continue;
    }

    const gt = text.indexOf(">", nameAt);
    // Unterminated: no ">" exists from here to the end, so no tag can start later either.
    if (gt < 0) return out + text.slice(i);

    out += text.slice(i, lt);
    i = gt + 1;
  }

  return out;
};

/**
 * Strip tags until the text stops changing.
 *
 * Repeated because one pass is not enough: "<<script>script>x" leaves "script>x" behind, and with
 * the right nesting a whole tag reassembles out of what the first sweep left. Every pass strictly
 * shortens the string or leaves it identical, so this terminates; the counter is a backstop against
 * a pathological input rather than an expected path.
 */
export const stripTagsCompletely = (value = "") => {
  let text = String(value ?? "");
  for (let pass = 0; pass < 20; pass += 1) {
    const next = stripTagsOnce(text);
    if (next === text) return next;
    text = next;
  }
  // Anything still tag-shaped after twenty passes is hostile; drop the brackets rather than return
  // something that might reassemble downstream.
  return text.split("<").join("");
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

/**
 * Does this text contain an HTML tag?
 *
 * Same single-pass scan as the stripper, for the same reason: the obvious regex,
 * `/<\/?[a-z][^>]*>/i.test(text)`, is quadratic on "<a<a<a…" because it retries from every "<a" and
 * scans to the end each time. On a whole uploaded document that is a denial of service, which is
 * exactly what CodeQL flagged in screenplayPages.js.
 */
export const looksLikeHtml = (value = "") => {
  const text = String(value ?? "");
  let i = 0;

  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt < 0) return false;

    let nameAt = lt + 1;
    if (text[nameAt] === "/") nameAt += 1;

    if (isAsciiLetter(text[nameAt])) {
      // One forward scan. If there is no ">" left in the string there is no tag anywhere after this
      // either, so this answers the whole question rather than just this position.
      return text.indexOf(">", nameAt) >= 0;
    }
    i = lt + 1;
  }

  return false;
};

export default { decodeEntitiesOnce, stripTagsCompletely, htmlToPlainText, looksLikeHtml };
