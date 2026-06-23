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
    blocks.push({ type, text: clean(type, lines[i].trim()) });
  }
  while (blocks.length && blocks[blocks.length - 1].type === "spacer") blocks.pop();
  return blocks;
};
