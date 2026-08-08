// THE screenplay line classifier — the single source of truth for "what element is this line".
//
// This module is intentionally pure (no CodeMirror, no DOM) so EVERYTHING that needs element
// types reads the same logic: the live editor (classifyDocument in screenplayMode.js layers the
// forced-type overlay on top of heuristicType here), the reports, and the FDX import/export.
// Phase 4 shipped a bug from two parallel classifiers disagreeing — keep it to ONE. Anything that
// needs to know a line's element type imports from here; nobody writes a second parser.

// Slug detection is intentionally loose (period optional) for nicer live typing.
export const SCENE = /^(?:\d+\s+)?(?:INT|EXT|INT\/EXT|EXT\/INT|I\/E|EST)\.?\b/i;
export const TRANSITION = /^(?:CUT TO:|FADE IN:|FADE OUT\.|SMASH CUT TO:|SMASH CUT:|DISSOLVE TO:|MATCH CUT TO:|BACK TO SCENE:)\s*$/i;
export const TRANSITION_LOOSE = /^[A-Z][A-Z .'-]+TO:$/;
export const SHOT = /^(?:CLOSE ON:|ANGLE ON:|INSERT:|SUPER:|POV:)/i;
export const PAREN = /^\(.*\)$/;
export const CUE = /^[A-Z][A-Z0-9 .'’-]{0,30}(?:\s*\([^)]*\))?$/;
// An "end of act" divider (END ACT / END OF ACT / END OF ACT TWO) — detected first so the
// generic ACT_BREAK below doesn't claim it.
export const END_ACT = /^END(?:\s+OF)?\s+ACT\b[A-Z0-9 .'-]*$/i;
// An act-start divider — classic act headers ("ACT TWO", "ACT 1") or a "NEW ACT" line.
export const ACT_BREAK = /^(?:NEW\s+)?ACT\b[A-Z0-9 .'-]*$|^[A-Z0-9 .'-]*\bNEW\s+ACT$/i;
// Strip any leading act token ("ACT "/"NEW ACT "/"END ACT "/"END OF ACT ") so re-applying or
// toggling act⇄endact never stacks tokens — leaves just the writer's words.
export const ACT_TOKEN = /^(?:END\s+(?:OF\s+)?ACT|NEW\s+ACT|ACT)\b\s*/i;
export const stripActToken = (text) => text.replace(ACT_TOKEN, "").trim();
export const LYRIC = /^~/;                                  // Fountain lyric marker (~)
export const SECTION = /^#{1,3}\s/;                         // Fountain section → sequence/outline
// Forced page breaks were removed by design — page count is purely line-based (paginate.js). A stray
// legacy "===" line is treated as a no-op marker and dropped from display (see textToBlocks), so it
// never renders as text and never forces a break.
const LEGACY_PAGE_BREAK = /^={3,}\s*$/;
export const DUAL_CUE = /^[A-Z][A-Z0-9 .'’-]{0,30}(?:\s*\([^)]*\))?\s*\^\s*$/; // dual-dialogue cue (trailing ^)

// ── Fountain "forced element" syntax ──────────────────────────────────────────
// When the writer manually tags a line whose words the heuristics wouldn't catch (e.g. taps
// "Scene" on a line reading just "LOCATION"), we write a self-describing Fountain marker into the
// text so the ONE classifier recognizes it everywhere — navigator, reports, viewer, PDF export —
// and it survives a cold reload. This replaces the old in-memory forced-type overlay, which never
// persisted. Markers: "." forces a scene heading, "@" forces a character cue, ">" forces a
// transition (a trailing ">" would be centered text, so we only honor a LEADING ">"). A leading
// ".." is an escaped literal dot (Fountain), not a forced scene, so the forced-scene test excludes it.
export const FORCE_SCENE = /^\.(?!\.)/;          // leading "." (but not "..") → scene
export const FORCE_CHARACTER = /^@/;             // leading "@" → character cue
export const FORCE_TRANSITION = /^>(?!\s*$)/;    // leading ">" (with content) → transition
// Fountain centered text: ">text<" (BOTH a leading ">" AND a trailing "<"). It must be tested
// BEFORE FORCE_TRANSITION (which honors a leading ">" alone), so "> FADE OUT" stays a transition
// but ">THE END<" is centered. Centered lines classify as ACTION (a styled paragraph) — no new
// element type — so reports / FDX / PDF treat them safely; the editor centers them visually and the
// markers are stripped for display. The marker round-trips in the stored Fountain text.
// Linear by construction: one greedy quantifier, no nesting. The previous form —
// /^>\s*(.*?)\s*<$/ — nested three, so a ">" followed by n spaces and no closing "<" made the engine
// try every split between them. That is quadratic, screenplay text is uploaded by users, and a
// single 10,000-character line stalled the process for minutes.
//
// `.*` runs to the end and backtracks once to the final "<" — a single pass, and the same meaning.
// The surrounding \s* only ever trimmed the capture, so the trim moved into clean() below.
export const CENTERED = /^>(.*)<$/;              // ">text<" → centered (rendered as action)
// Strip a leading forcing marker (and the whitespace hugging it) to recover the writer's words.
export const stripForceMarker = (text = "") => String(text).replace(/^[.@>]\s*/, "");

// The element types that put the classifier into running-dialogue context.
const DIALOGUE_CONTEXT = ["character", "parenthetical", "dialogue", "lyrics", "dual"];

// Heuristic classification of one line given running dialogue context (ctx.inDialogue).
export const heuristicType = (raw, ctx) => {
  const t = String(raw).trim();
  if (!t) { ctx.inDialogue = false; return "blank"; }
  // Forced-element markers win over every heuristic: a manual tag is an explicit instruction.
  if (FORCE_SCENE.test(t)) { ctx.inDialogue = false; return "scene"; }
  // ">text<" is centered text (rendered as action), checked before the leading-">" transition force.
  if (CENTERED.test(t)) { ctx.inDialogue = false; return "action"; }
  if (FORCE_TRANSITION.test(t)) { ctx.inDialogue = false; return "transition"; }
  if (FORCE_CHARACTER.test(t)) { ctx.inDialogue = true; return "character"; }
  if (SECTION.test(t)) { ctx.inDialogue = false; return "sequence"; }
  if (LYRIC.test(t)) { ctx.inDialogue = true; return "lyrics"; }
  if (SCENE.test(t)) { ctx.inDialogue = false; return "scene"; }
  if (TRANSITION.test(t) || TRANSITION_LOOSE.test(t)) { ctx.inDialogue = false; return "transition"; }
  if (SHOT.test(t)) { ctx.inDialogue = false; return "shot"; }
  if (END_ACT.test(t)) { ctx.inDialogue = false; return "endact"; }
  if (ACT_BREAK.test(t)) { ctx.inDialogue = false; return "act"; }
  if (DUAL_CUE.test(t)) { ctx.inDialogue = true; return "dual"; }
  if (PAREN.test(t)) { ctx.inDialogue = true; return "parenthetical"; }
  if (CUE.test(t)) { ctx.inDialogue = true; return "character"; }
  if (ctx.inDialogue) return "dialogue";
  return "action";
};

// When the editor pins a forced type to a line, the running context follows that type.
export const applyForcedToContext = (type, ctx) => {
  ctx.inDialogue = DIALOGUE_CONTEXT.includes(type);
};

// Classify every line of RAW Fountain text into element types (1:1 with lines). This is what
// off-text consumers (reports, FDX export) read — it matches a cold reload of the editor, since
// forced-type overlays are live-session state that don't exist for stored text.
export const classifyText = (text = "") => {
  const types = [];
  const ctx = { inDialogue: false };
  for (const line of String(text).split("\n")) types.push(heuristicType(line, ctx));
  return types;
};

// Display-ready blocks for read-only rendering (the script viewer) — { type, text } per non-blank
// line with a "spacer" between paragraphs, built from the ONE classifier so the viewer renders a
// line exactly as the editor classifies it (no second cue parser). Fountain markers (~ # ^) are
// stripped so the shown text is clean, matching the editor's on-screen suppression.
export const textToBlocks = (text = "") => {
  const lines = String(text).split("\n");
  const types = classifyText(text);
  const clean = (type, t) => {
    if (type === "lyrics") return t.replace(/^~\s*/, "");
    if (type === "sequence") return t.replace(/^#{1,3}\s*/, "");
    if (type === "dual") return t.replace(/\s*\^\s*$/, "");
    // Centered text ">words<" classifies as action; show just the words (markers are syntax).
    const cm = CENTERED.exec(t);
    if (cm) return cm[1].trim();
    // Forced scene/character/transition markers (.@>) are syntax, not content — strip them so the
    // viewer and PDF show the writer's words, matching the editor's on-screen marker suppression.
    if ((type === "scene" || type === "character" || type === "transition") && /^[.@>]/.test(t)) {
      return stripForceMarker(t);
    }
    return t;
  };
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const type = types[i];
    if (type === "blank") {
      if (blocks.length && blocks[blocks.length - 1].type !== "spacer") blocks.push({ type: "spacer", text: "" });
      continue;
    }
    const raw = lines[i].trim();
    // Legacy "===" forced-break markers are dropped (page breaks were removed) so they never show as
    // text — the viewer/PDF stay clean and page count stays purely line-based.
    if (LEGACY_PAGE_BREAK.test(raw)) continue;
    const block = { type, text: clean(type, raw) };
    // ">words<" is centered action — flag it so read-only renderers (viewer, PDF) center it exactly
    // as the editor does (the marker is already stripped by clean()).
    if (CENTERED.test(raw)) block.centered = true;
    blocks.push(block);
  }
  while (blocks.length && blocks[blocks.length - 1].type === "spacer") blocks.pop();
  return blocks;
};

// ── Inline Fountain emphasis → styled runs (the ONE emphasis parser) ────────────
// Splits a line into segments carrying bold/italic/underline, matching the editor's inline decoration
// EXACTLY (same markers, same longest-first precedence, same non-overlap rule) so *italic* / **bold** /
// ***both*** / _underline_ render identically in the read-only viewer and the exported PDF as they do
// while typing. Markers are removed from the returned text. Returns [{ text, bold, italic, underline }].
const EMPHASIS_SPANS = [
  { re: /\*\*\*([^*\n]+)\*\*\*/g, mark: 3, style: { bold: true, italic: true } },
  { re: /\*\*([^*\n]+)\*\*/g, mark: 2, style: { bold: true } },
  { re: /\*([^*\n]+)\*/g, mark: 1, style: { italic: true } },
  { re: /_([^_\n]+)_/g, mark: 1, style: { underline: true } },
];

export const parseInlineEmphasis = (text = "") => {
  const src = String(text || "");
  if (!src) return [];
  // Longest-marker-first. As each span is claimed we BLANK it (markers + inner) in a working copy so
  // shorter scans can't reuse a leftover marker char — e.g. the closing "*" of **bold** must not pair
  // with the "*" of a following *italic*. Blanking keeps indices aligned (same-length spaces), and we
  // read the inner text from the ORIGINAL `src`, so nothing is lost.
  let work = src;
  const ranges = [];
  for (const scan of EMPHASIS_SPANS) {
    scan.re.lastIndex = 0;
    let m;
    while ((m = scan.re.exec(work)) !== null) {
      const from = m.index;
      const to = from + m[0].length;
      ranges.push({ from, to, innerFrom: from + scan.mark, innerTo: to - scan.mark, style: scan.style });
      work = work.slice(0, from) + " ".repeat(to - from) + work.slice(to);
      scan.re.lastIndex = to;
    }
  }
  if (!ranges.length) return [{ text: src, bold: false, italic: false, underline: false }];
  ranges.sort((a, b) => a.from - b.from);
  const out = [];
  const push = (t, style = {}) => { if (t) out.push({ text: t, bold: !!style.bold, italic: !!style.italic, underline: !!style.underline }); };
  let cursor = 0;
  for (const r of ranges) {
    if (r.from > cursor) push(src.slice(cursor, r.from));
    push(src.slice(r.innerFrom, r.innerTo), r.style);
    cursor = r.to;
  }
  if (cursor < src.length) push(src.slice(cursor));
  return out;
};

// ── Fountain title page ────────────────────────────────────────────────────────
// A title page is a block of "Key: Value" lines at the VERY TOP of the document, ended by the first
// blank line. It's standard Fountain (Title:, Credit:, Author:, Source:, Draft date:, Contact:,
// Copyright:, Notes:). We keep it as structured data the configurator edits and the PDF/Fountain
// export render. The fields we surface in the UI (industry core) — others are preserved if present.
export const TITLE_PAGE_FIELDS = [
  { key: "title", label: "Title", fountain: "Title" },
  { key: "credit", label: "Credit", fountain: "Credit", placeholder: "Written by" },
  { key: "author", label: "Author", fountain: "Author" },
  { key: "source", label: "Source", fountain: "Source", placeholder: "Based on…" },
  { key: "draftDate", label: "Draft date", fountain: "Draft date" },
];
const FOUNTAIN_BY_KEY = Object.fromEntries(TITLE_PAGE_FIELDS.map((f) => [f.key, f.fountain]));
const KEY_BY_FOUNTAIN = Object.fromEntries(TITLE_PAGE_FIELDS.map((f) => [f.fountain.toLowerCase(), f.key]));
const TITLE_PAGE_KEY_LINE = /^([A-Za-z][A-Za-z ]*?):\s*(.*)$/; // "Key: value"

// Does the text begin with a title-page block? (first non-blank line is "Known Key: ...").
export const hasTitlePage = (text = "") => {
  const first = String(text).split("\n").find((l) => l.trim() !== "");
  if (!first) return false;
  const m = TITLE_PAGE_KEY_LINE.exec(first.trim());
  return Boolean(m && KEY_BY_FOUNTAIN[m[1].trim().toLowerCase()]);
};

// Parse the leading title-page block → { title, credit, author, source, draftDate, ...extras }.
// Returns {} when there is no title page. Multi-line values (indented continuations) are joined.
export const parseTitlePage = (text = "") => {
  if (!hasTitlePage(text)) return {};
  const lines = String(text).split("\n");
  const fields = {};
  let curKey = null;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === "") break; // blank line ends the title page
    const m = TITLE_PAGE_KEY_LINE.exec(raw);
    if (m && KEY_BY_FOUNTAIN[m[1].trim().toLowerCase()] !== undefined) {
      curKey = KEY_BY_FOUNTAIN[m[1].trim().toLowerCase()] || m[1].trim();
      fields[curKey] = m[2].trim();
    } else if (m) {
      // A key we don't surface — preserve it under its raw label so round-trips don't drop it.
      curKey = m[1].trim();
      fields[curKey] = m[2].trim();
    } else if (curKey) {
      // Indented continuation line of the current field.
      fields[curKey] = `${fields[curKey]} ${raw.trim()}`.trim();
    }
  }
  return fields;
};

// Strip the leading title-page block (and the blank line after it) → just the screenplay body.
export const stripTitlePage = (text = "") => {
  if (!hasTitlePage(text)) return String(text);
  const lines = String(text).split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() !== "") i += 1; // skip the block
  while (i < lines.length && lines[i].trim() === "") i += 1; // skip the blank separator(s)
  return lines.slice(i).join("\n");
};

// Serialize fields → the Fountain title-page block (only non-empty values), ending with a blank line.
export const serializeTitlePage = (fields = {}) => {
  const order = TITLE_PAGE_FIELDS.map((f) => f.key);
  const extras = Object.keys(fields).filter((k) => !order.includes(k));
  const out = [];
  for (const key of [...order, ...extras]) {
    const val = String(fields[key] ?? "").trim();
    if (!val) continue;
    const label = FOUNTAIN_BY_KEY[key] || key;
    out.push(`${label}: ${val}`);
  }
  return out.length ? out.join("\n") + "\n\n" : "";
};

// Replace (or add/remove) the title-page block at the top of `text`, preserving the body.
export const withTitlePage = (text = "", fields = {}) => {
  const body = stripTitlePage(text);
  return serializeTitlePage(fields) + body;
};
