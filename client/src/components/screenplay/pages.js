// Split a screenplay into an array of per-page text strings using the SAME line-based pagination as
// the page count (paginate.js). This is used to define the producer "viewable script" preview window
// (pages X–Y) — NOT to render page sheets (the editor and viewer are continuous). Any stray legacy
// "===" line (a removed forced-break marker) is dropped so it never shows as text. Empty pages are
// preserved so the array index maps 1:1 to page number (page N === pages[N-1]).
import { paginate } from "./paginate";

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
