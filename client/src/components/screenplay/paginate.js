// Line-based screenplay pagination — the industry standard (~55 lines per US-Letter page), the way
// Final Draft / WriterDuet paginate. This REPLACES the old word-count estimate (words ÷ 250).
//
// It mirrors the server PDF exporter (server/utils/screenplayPdf.js) so the on-screen page count and
// the printed PDF agree: US Letter, 12pt Courier, 1" top/bottom/right + 1.5" left margins → a 9" text
// column = 54 single-spaced 12pt lines per page. Courier is monospace, so wrapped-line counts are
// computed analytically (chars ÷ chars-per-line) — no canvas/font measurement needed.
//
// A SERVER COPY lives at server/utils/paginate.js and MUST stay byte-for-byte identical below the
// import line (same as the classify.js parity contract) so client and server always agree.
import { classifyText } from "./classify";

const PT = 72;                 // points per inch
const LINE = 12;               // 12pt single-spaced line
// 11" page − 1" top − 1" bottom = 9" text column = 648pt ÷ 12pt = 54 lines.
export const LINES_PER_PAGE = Math.floor((11 * PT - 1 * PT - 1 * PT) / LINE);
const CHAR_W = 0.6 * LINE;     // Courier advance width at 12pt ≈ 7.2pt
const cols = (inches) => Math.max(1, Math.floor((inches * PT) / CHAR_W));
const ACTION_COLS = cols(8.5 - 1.5 - 1); // full text column (also scene/shot/transition/act/sequence)
const CHAR_COLS = cols(2.5);             // character cue column
const PAREN_COLS = cols(2.0);            // parenthetical column
const DIAL_COLS = cols(3.3);             // dialogue column

// Per-element cost, matching screenplayPdf.js LAYOUT: `before`/`after` are blank-line spacing (in LINE
// units) around the element; `w` is the wrapping column width. Unknown types fall back to action.
const COST = {
  scene: { w: ACTION_COLS, before: 1, after: 1 },
  shot: { w: ACTION_COLS, before: 1, after: 0 },
  action: { w: ACTION_COLS, before: 0, after: 1 },
  character: { w: CHAR_COLS, before: 1, after: 0 },
  dual: { w: CHAR_COLS, before: 1, after: 0 },
  parenthetical: { w: PAREN_COLS, before: 0, after: 0 },
  dialogue: { w: DIAL_COLS, before: 0, after: 1 },
  transition: { w: ACTION_COLS, before: 1, after: 1 },
  act: { w: ACTION_COLS, before: 2, after: 1.5 },
  endact: { w: ACTION_COLS, before: 2, after: 1.5 },
  sequence: { w: ACTION_COLS, before: 1.5, after: 0.5 },
  lyrics: { w: DIAL_COLS, before: 0, after: 1 },
};

// Wrapped line count for monospace Courier: characters ÷ columns. Empirically this tracks the printed
// PDF within ±1 page (exact on typical feature-length scripts), which is all a page count needs.
const wrapped = (text, w) => Math.max(1, Math.ceil(String(text).trim().length / w));

/**
 * Paginate a screenplay by lines — a WriterDuet-style content estimate (no forced "===" breaks; page
 * breaks are purely where content fills a US-Letter page).
 * @param {string} text canonical Fountain / screenplay text
 * @returns {{ pageCount: number, pageStarts: number[] }} pageStarts = 0-based document line index where
 *   each page begins (pageStarts[0] === 0). Length === pageCount.
 */
export const paginate = (text = "") => {
  const lines = String(text).split("\n");
  const types = classifyText(text);
  const pageStarts = [0];
  let used = 0;              // LINE units consumed on the current page
  let sawContent = false;    // has a real element landed on this page yet
  let pendingSpacer = false; // collapse a blank run to a single spacer line (like textToBlocks)
  const breakBefore = (lineIdx) => { pageStarts.push(lineIdx); used = 0; sawContent = false; pendingSpacer = false; };

  let i = 0;
  while (i < lines.length) {
    const type = types[i];
    if (type === "blank") {
      if (sawContent && !pendingSpacer) { used += 1; pendingSpacer = true; } // one blank line between elements
      i += 1;
      continue;
    }
    // A BLOCK is a run of consecutive non-blank lines — e.g. a whole speech (CHARACTER + parenthetical
    // + dialogue). It's kept together as one unit so a page break never splits it mid-element (splitting
    // a parenthetical from its dialogue, or a cue from its speech, is what made breaks land badly). If
    // the whole block won't fit on what's left of the page, the ENTIRE block moves to the next page.
    const blockStart = i;
    let blockCost = 0;
    let j = i;
    while (j < lines.length && types[j] !== "blank") {
      const cfg = COST[types[j]] || COST.action;
      blockCost += cfg.before + wrapped(lines[j].trim(), cfg.w) + cfg.after;
      j += 1;
    }
    if (sawContent && used + blockCost > LINES_PER_PAGE) breakBefore(blockStart);
    used += blockCost;
    sawContent = true;
    pendingSpacer = false;
    i = j;
  }
  return { pageCount: pageStarts.length, pageStarts };
};

/** Total page count (line-based, matches the exported PDF). Always ≥ 1. */
export const countPages = (text = "") => paginate(text).pageCount;

/** 1-based page number that a given 0-based document line falls on. */
export const pageOfLine = (text = "", lineIdx = 0) => {
  const { pageStarts } = paginate(text);
  let page = 1;
  for (let p = 0; p < pageStarts.length; p += 1) if (lineIdx >= pageStarts[p]) page = p + 1;
  return page;
};
