// Strip page furniture from screenplay text imported out of a PDF.
//
// A PDF carries per-page decoration — a running header (the title, a writer's name, an email
// address), page numbers, "(CONTINUED)" markers, "Page 3 / 121" footers. Text extraction pulls all
// of it in as body lines. Left in, that furniture shows up as script content in the viewable-script
// preview (a "page" that is just an email address) and inflates the page count, because it lands
// between elements.
//
// DELIBERATELY CONSERVATIVE. An earlier version stripped any short line repeated across many pages,
// which also deleted CHARACTER CUES — "ORISA", "JAKE", "PAIGE" repeat exactly like a running header
// does, and removing them detaches every speech from its speaker. Frequency alone cannot tell a
// running header from a character cue, so we only remove lines that are *unambiguously* furniture:
// numeric/CONTINUED patterns, contact details (email/URL/phone), and the script's own title.

const FURNITURE_PATTERNS = [
  /^\(?\s*continued\s*\)?[.:]?$/i,          // (CONTINUED) / CONTINUED:
  /^\(?\s*cont(inued)?['’]d\s*\)?$/i,       // (CONT'D) alone on a line
  /^page\s+\d+\s*(\/|of)\s*\d+$/i,          // Page 3 / 121, Page 3 of 121
  /^page\s+\d+[.:]?$/i,                     // Page 3
  /^\d+\s*[.)]?$/,                          // bare page number: 2, 2., 2)
  /^-\s*\d+\s*-$/,                          // - 2 -
  /^\d+\s*\/\s*\d+$/,                       // 2 / 121
];

// Contact details used as a running header/footer — the reported "half the pages are just an email".
const CONTACT_PATTERNS = [
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,                                   // bare email address
  /^(https?:\/\/|www\.)\S+$/i,                                    // bare URL
  /^\+?[\d][\d\s().-]{7,}$/,                                      // bare phone number
];

const norm = (value) => String(value || "").trim();

const isFurnitureLine = (line) => {
  const t = norm(line);
  if (!t) return false;
  if (FURNITURE_PATTERNS.some((re) => re.test(t))) return true;
  if (t.length <= 80 && CONTACT_PATTERNS.some((re) => re.test(t))) return true;
  return false;
};

/**
 * The script title repeated as a running header. Only treated as furniture when it recurs — a title
 * appearing once is the actual title page and must survive.
 */
const titleHeaderOccurrences = (lines, title) => {
  const wanted = norm(title).toLowerCase();
  if (!wanted || wanted.length < 3) return 0;
  return lines.filter((line) => norm(line).toLowerCase() === wanted).length;
};

/**
 * Remove PDF page furniture from extracted screenplay text.
 * `title` lets us drop a repeated title header while keeping the one on the title page.
 */
export const stripPdfPageFurniture = (text = "", { title = "" } = {}) => {
  const raw = String(text || "");
  if (!raw.trim()) return raw;

  const lines = raw.split("\n");
  const wantedTitle = norm(title).toLowerCase();
  const titleRepeats = titleHeaderOccurrences(lines, title);
  // Keep the first occurrence (title page), strip the rest (running header).
  let titleSeen = 0;

  const kept = lines.filter((line) => {
    const t = norm(line);
    if (!t) return true;                     // blanks separate elements — always keep
    if (isFurnitureLine(t)) return false;
    if (titleRepeats >= 3 && t.toLowerCase() === wantedTitle) {
      titleSeen += 1;
      return titleSeen === 1;
    }
    return true;
  });

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")              // collapse gaps the removals leave
    .trim();
};

/** Diagnostic: what would be removed, for logging and tests. */
export const describePageFurniture = (text = "", { title = "" } = {}) => {
  const lines = String(text || "").split("\n");
  const fixed = lines.filter((l) => isFurnitureLine(l)).length;
  const titleRepeats = titleHeaderOccurrences(lines, title);
  return {
    furnitureLines: fixed,
    titleHeaderLines: titleRepeats >= 3 ? titleRepeats - 1 : 0,
    removed: fixed + (titleRepeats >= 3 ? titleRepeats - 1 : 0),
  };
};

export default stripPdfPageFurniture;
