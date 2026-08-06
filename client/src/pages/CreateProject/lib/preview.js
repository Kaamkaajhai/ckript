/* Builds the short, per-page plain-text snippets shown in the publish preview.
   Strips HTML to text, then slices it into page-sized chunks. Pure functions. */

export const MAX_PREVIEW_SNIPPET_LENGTH = 900;
export const PREVIEW_LINES_PER_PAGE = 42;

/**
 * Strip tags until the text stops changing.
 *
 * A single pass is not enough: "<<script>script>x" leaves "script>x" behind, and with the right
 * nesting a whole tag reassembles out of what the first sweep left. Each pass strictly shortens the
 * string or leaves it identical, so this terminates.
 */
// Narrower than <[^>]*> on purpose: that pattern matches "< 7 and 9 >" in "5 < 7 and 9 > 3" and
// deletes the middle of the sentence. Requiring a letter after "<" costs nothing in safety, since a
// browser does not treat "< script>" as a tag either.
const TAG = /<\/?[a-zA-Z][^>]*>|<![^>]*>/g;

const stripTagsCompletely = (value) => {
  let text = value;
  for (let pass = 0; pass < 20; pass += 1) {
    const next = text.replace(TAG, "");
    if (next === text) return next;
    text = next;
  }
  return text.replace(/</g, "");
};

export const normalizePreviewContent = (value = "") =>
  // Entities are decoded BEFORE tags are stripped. The other order lets the sanitiser build the
  // thing it exists to remove — "&lt;img src=x onerror=alert(1)&gt;" holds no tag while the stripper
  // runs, and would come out of it as a live element. Decoded exactly once, because "&amp;lt;" is
  // the encoding of the literal text "&lt;" and a second pass would turn that into markup.
  stripTagsCompletely(
    String(value || "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;|&apos;/gi, "'")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n"),
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const getPreviewPageSnippet = (pageTexts = [], pageNumber = 1) => {
  const index = Math.max(0, Number(pageNumber || 0) - 1);
  const raw = String(pageTexts?.[index] || "").trim();
  if (!raw) return "";
  return raw.length > MAX_PREVIEW_SNIPPET_LENGTH
    ? `${raw.slice(0, MAX_PREVIEW_SNIPPET_LENGTH).trimEnd()}...`
    : raw;
};

export const buildPagePreviewTexts = (html = "", pageCount = 1) => {
  const plainText = normalizePreviewContent(html);
  if (!plainText) return [];

  const lines = plainText.split("\n");
  const safePages = Math.max(1, Number(pageCount) || 1);
  const chunks = [];

  for (let pageIndex = 0; pageIndex < safePages; pageIndex += 1) {
    const startLine = pageIndex * PREVIEW_LINES_PER_PAGE;
    const endLine = Math.min(lines.length, (pageIndex + 1) * PREVIEW_LINES_PER_PAGE);
    const pageText = startLine < lines.length
      ? lines.slice(startLine, endLine).join("\n").trimEnd()
      : "";
    chunks.push(pageText);
  }

  return chunks;
};
