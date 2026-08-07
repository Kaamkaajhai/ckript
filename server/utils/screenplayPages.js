// Server-side mirror of client/src/components/screenplay/pages.js.
//
// Splits a screenplay into per-page text using the SAME line-based pagination as the page count
// (utils/paginate.js), so the viewable-script preview window (pages X–Y) lines up with what the
// writer saw in the editor and with the exported PDF.
//
// Exists so the server can DERIVE preview pages for editor-authored scripts. Uploaded scripts get
// their preview text extracted from the PDF; editor scripts have no file to extract from, so if the
// client never sent scriptPreviewPageTexts the script would sit with viewableScript enabled and
// nothing to show. Keep this in step with the client copy.

import { paginate } from "./paginate.js";

const LEGACY_PAGE_BREAK = /^={3,}\s*$/;

export const splitScreenplayIntoPages = (text = "") => {
  const raw = String(text || "");
  if (!raw.trim()) return [];

  const lines = raw.split("\n");
  const { pageStarts } = paginate(raw);
  const pages = [];

  for (let p = 0; p < pageStarts.length; p += 1) {
    const start = pageStarts[p];
    const end = p + 1 < pageStarts.length ? pageStarts[p + 1] : lines.length;
    const pageText = lines
      .slice(start, end)
      .filter((line) => !LEGACY_PAGE_BREAK.test(line.trim()))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    pages.push(pageText);
  }

  return pages;
};

/**
 * Preview pages for a script that has none stored.
 *
 * Returns [] when there is nothing to derive from, so callers can leave the field untouched rather
 * than overwriting real data with an empty array.
 */
export const derivePreviewPageTexts = (script) => {
  const source = String(script?.fountainContent || "").trim()
    || String(script?.textContent || "").trim();
  if (!source) return [];
  // Prose/HTML content is not a screenplay — pagination would be meaningless.
  // [^>]* rather than [\s\S]*: the latter scans the entire screenplay and then backtracks hunting
  // for a ">", which is quadratic on input that contains none — and this input is a whole uploaded
  // document. [^>]* cannot cross a ">", so the match is linear. For deciding "does this look like
  // HTML?" the two are equivalent.
  if (/<\/?[a-z][^>]*>/i.test(source) && !String(script?.fountainContent || "").trim()) return [];
  return splitScreenplayIntoPages(source);
};

export default splitScreenplayIntoPages;
