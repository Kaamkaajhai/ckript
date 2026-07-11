/* Builds the short, per-page plain-text snippets shown in the publish preview.
   Strips HTML to text, then slices it into page-sized chunks. Pure functions. */

export const MAX_PREVIEW_SNIPPET_LENGTH = 900;
export const PREVIEW_LINES_PER_PAGE = 42;

export const normalizePreviewContent = (value = "") => {
  // Turn block boundaries into newlines BEFORE stripping tags, then extract text
  // via the DOM. Regex tag-stripping is fragile (nesting bypasses, undecoded
  // entities); `textContent` off a parsed document cannot contain live markup and
  // decodes entities correctly. Falls back to a regex strip if DOMParser is absent.
  const withBreaks = String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n");

  const text =
    typeof DOMParser !== "undefined"
      ? new DOMParser().parseFromString(withBreaks, "text/html").body.textContent || ""
      : withBreaks.replace(/<[^>]*>/g, "");

  return text
    .replace(/\u00A0/g, " ") // collapse non-breaking spaces (what &nbsp; decodes to)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

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
