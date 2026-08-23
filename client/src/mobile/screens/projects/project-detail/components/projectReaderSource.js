const clean = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Resolve the one source a reader may receive.
 *
 * A stored PDF is a full document and is therefore selected only for a
 * full-access viewer. Preview mode uses the server-projected page texts (or
 * excerpt) so a client-side page range is never mistaken for authorization.
 */
export function resolveProjectReaderSource({ script = {}, mode = "none" } = {}) {
  const full = mode === "full";
  const previewAccess = script.scriptPreviewAccess || {};
  const start = Math.max(1, Number(previewAccess.start || 1));
  const end = Math.max(start, Number(previewAccess.end || start));
  const pages = Array.isArray(script.scriptPreviewPageTexts) ? script.scriptPreviewPageTexts : [];
  const previewPages = pages
    .slice(start - 1, end)
    .map((page, index) => ({ pageNumber: start + index, text: clean(page) }))
    .filter(({ text }) => text);

  const body = clean(script.fountainContent) || clean(script.textContent);
  const hasStoredPdf = Boolean(script.hasUploadedScriptFile) || Boolean(clean(script.fileUrl));

  if (full && hasStoredPdf && script._id) {
    return { kind: "pdf", pdfUrl: `/api/scripts/${script._id}/pdf`, start, end };
  }
  if (!full && previewPages.length) {
    return { kind: "preview-pages", pages: previewPages, text: previewPages.map(({ text }) => text).join("\n\n"), start, end };
  }
  if (!full && clean(script.previewExcerpt)) {
    return { kind: "screenplay", text: clean(script.previewExcerpt), start, end };
  }
  if (full && body) {
    return { kind: body.startsWith("<") ? "prose" : "screenplay", text: body, start, end };
  }
  return { kind: "empty", text: "", start, end };
}
