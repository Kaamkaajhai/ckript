// CodeMirror 6 screenplay "mode": live element detection + decoration, smart Enter
// (advances to the next logical element per the §1.2 transition table), Tab/Shift-Tab
// element cycling, and context-aware autocomplete. Visual element formatting (indents,
// uppercase) is driven by CSS classes (.cm-sp-*) so the underlying text stays clean
// Fountain — cycling an element never rewrites the writer's words.

import { StateField, StateEffect, Prec } from "@codemirror/state";
import { Decoration, ViewPlugin, EditorView, keymap, highlightActiveLine } from "@codemirror/view";
import { autocompletion, completionStatus } from "@codemirror/autocomplete";
// The classifier lives in its own pure module so the editor, reports, and FDX all share ONE
// implementation (see classify.js). screenplayMode just layers the forced-type overlay on top.
import { SECTION, PAREN, stripActToken, heuristicType, applyForcedToContext, classifyText, stripForceMarker } from "./classify";

export { classifyText };

// The orderable core elements a writer cycles through with Tab.
export const ELEMENT_CYCLE = ["scene", "action", "character", "parenthetical", "dialogue", "transition"];

// §1.2 Enter-transition table: current element → element of the new line.
const NEXT_AFTER = {
  scene: "action",
  action: "action",
  character: "dialogue",
  dialogue: "action",
  parenthetical: "dialogue",
  transition: "scene",
  shot: "action",
  blank: "action",
};

// Slug/element regexes + heuristicType now live in ./classify (the single classifier). The two
// editor-local lists below feed autocomplete only.
const TIMES = ["DAY", "NIGHT", "MORNING", "EVENING", "AFTERNOON", "CONTINUOUS", "LATER", "DUSK", "DAWN"];
const TRANSITIONS = ["CUT TO:", "DISSOLVE TO:", "SMASH CUT:", "MATCH CUT TO:", "FADE OUT.", "FADE IN:"];

// ── Forced-type overlay (Tab cycling, smart Enter, dropdown override) ─────────
// We anchor a forced element type to a line's start position; positions are remapped
// across edits so the override sticks to the right line.
export const setForcedType = StateEffect.define();
export const clearForcedTypes = StateEffect.define();

const forcedField = StateField.define({
  create: () => [],
  update(value, tr) {
    let next = value;
    if (tr.docChanged) {
      next = value
        .map((e) => ({ pos: tr.changes.mapPos(e.pos, -1), type: e.type }))
        .filter((e) => e.pos != null);
    }
    for (const eff of tr.effects) {
      if (eff.is(setForcedType)) {
        next = next.filter((e) => e.pos !== eff.value.pos);
        if (eff.value.type) next = [...next, { pos: eff.value.pos, type: eff.value.type }];
      } else if (eff.is(clearForcedTypes)) {
        next = [];
      }
    }
    return next;
  },
});

const forcedTypeAt = (state, lineFrom) => {
  const hit = state.field(forcedField, false)?.find((e) => e.pos === lineFrom);
  return hit ? hit.type : null;
};

// Classify every line of the document → array of element type strings (1:1 with lines).
export const classifyDocument = (state) => {
  const types = [];
  const ctx = { inDialogue: false };
  for (let i = 1; i <= state.doc.lines; i += 1) {
    const line = state.doc.line(i);
    const forced = forcedTypeAt(state, line.from);
    if (forced) {
      applyForcedToContext(forced, ctx);
      types.push(forced);
    } else {
      types.push(heuristicType(line.text, ctx));
    }
  }
  return types;
};

// Derive the scene list from the ONE classifier (not a bare regex) so a line forced to a scene
// (Fountain ".LOCATION") shows up in the navigator exactly as it does in the reports and the
// editor. The leading "." marker is stripped from the displayed heading. Returns 1-based line
// numbers so the navigator can scroll the editor.
export const extractScenes = (text = "") => {
  const lines = String(text).split("\n");
  const types = classifyText(text);
  const scenes = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (types[i] === "scene") scenes.push({ line: i + 1, text: stripForceMarker(lines[i].trim()) });
  }
  return scenes;
};

// Navigator outline — interleaves sequence/section headers with scene headings so the
// left panel can group scenes under sequences. Uses the ONE classifier so forced scenes and
// sequences are picked up consistently with the reports and editor.
export const extractOutline = (text = "") => {
  const lines = String(text).split("\n");
  const types = classifyText(text);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (!t) continue;
    if (types[i] === "sequence") out.push({ type: "sequence", line: i + 1, text: t.replace(/^#+\s*/, "") });
    else if (types[i] === "scene") out.push({ type: "scene", line: i + 1, text: stripForceMarker(t) });
  }
  return out;
};

// Element type of the line the caret is on.
export const currentElementType = (state) => {
  const types = classifyDocument(state);
  const line = state.doc.lineAt(state.selection.main.head);
  return types[line.number - 1] || "action";
};

// Rewrite the line AND pin a forced element type in the same dispatch, so the new text is
// guaranteed to classify as `type` even when its content wouldn't trip the heuristic.
const forceRewrite = (view, line, insert, type, caretFromStart) => {
  view.dispatch({
    changes: { from: line.from, to: line.to, insert },
    selection: { anchor: line.from + (caretFromStart ?? insert.length) },
    effects: [setForcedType.of({ pos: line.from, type })],
  });
  view.focus();
};

// Force the current line to a given element type (used by Tab cycling + toolbar menus).
// Core types use the forced-type overlay (text untouched). The Stage-2 marker types edit
// the text so the marker persists and round-trips (Fountain ~, #, ^, ACT …).
export const applyElementType = (view, type) => {
  if (!view) return false;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const text = line.text;

  switch (type) {
    case "parenthetical": {
      if (PAREN.test(text.trim())) break;
      const inner = text.trim().replace(/^\(|\)$/g, "");
      const wrapped = `(${inner})`;
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: wrapped },
        selection: { anchor: line.from + wrapped.length - 1 },
        effects: [setForcedType.of({ pos: line.from, type })],
      });
      view.focus();
      return true;
    }
    case "act":
    case "endact": {
      // Act breaks KEEP the writer's own words AND round-trip. We prepend a self-describing
      // Fountain token ("ACT "/"END ACT ") and uppercase, so the line reads as an act break from
      // text ALONE — it survives a cold reload and exports to the PDF, not just the in-memory
      // overlay. The token is suppressed on screen by the decoration layer (see markerHideRanges),
      // so the writer still sees only their words, centered + underlined. "The Reckoning" →
      // stored "ACT THE RECKONING", shown "THE RECKONING".
      const body = stripActToken(text).toUpperCase();
      const prefix = type === "endact" ? "END ACT" : "ACT";
      forceRewrite(view, line, body ? `${prefix} ${body}` : prefix, type);
      return true;
    }
    // Marker types: rewrite the text to carry the Fountain marker AND pin the forced type, so
    // the line is classified as this type regardless of casing/content. That guarantees the
    // decoration layer (formatting + marker suppression) fires — otherwise a marker like the
    // trailing "^" on a non-uppercase cue ("Dual ^") would slip past heuristic detection and
    // render raw. forceRewrite = rewriteLine + setForcedType in one dispatch.
    case "lyrics": {
      const body = text.replace(/^~\s*/, "");
      forceRewrite(view, line, `~ ${body}`, type);
      return true;
    }
    case "sequence": {
      const body = text.replace(/^#+\s*/, "");
      forceRewrite(view, line, `# ${body}`, type);
      return true;
    }
    case "dual": {
      const body = text.replace(/\s*\^\s*$/, "").trimEnd();
      forceRewrite(view, line, `${body} ^`, type);
      return true;
    }
    // Scene / character / transition: if the line's own words ALREADY classify as this type, leave
    // the text alone (just pin the overlay for the live look). Otherwise write the Fountain forcing
    // marker (".", "@", ">") into the text so the tag is self-describing and the ONE classifier
    // recognizes it everywhere — navigator, reports, viewer, PDF — and survives a cold reload. This
    // is the persistence the old overlay-only path lacked; see screenplay-act-break-roundtrip.
    case "scene":
    case "character":
    case "transition": {
      const bare = stripForceMarker(text); // drop any existing forcing marker first (avoids stacking)
      // Does the bare text classify as `type` on its own (real slug / all-caps cue / "… TO:")?
      const selfClassifies = classifyText(bare)[0] === type;
      if (selfClassifies) {
        // Real heading/cue/transition — keep the writer's words; if a stray marker was present, drop it.
        if (bare !== text) {
          forceRewrite(view, line, bare, type);
          return true;
        }
        break; // fall through to overlay-only pin below
      }
      const marker = type === "scene" ? "." : type === "character" ? "@" : "> ";
      forceRewrite(view, line, `${marker}${bare}`, type);
      return true;
    }
    default:
      break;
  }

  // Overlay-only types (scene/action/character/dialogue/transition/shot AND act/endact): the
  // writer's text is left exactly as typed; the forced-type overlay drives the formatting
  // (act/endact → centered, uppercased, underlined via the decoration layer). Applying "New Act"
  // to a line keeps that line's words and simply formats them as an act break — it does not
  // replace them with a literal "NEW ACT" label.
  view.dispatch({ effects: [setForcedType.of({ pos: line.from, type })] });
  view.focus();
  return true;
};

const cycle = (view, dir) => {
  const current = currentElementType(view.state);
  const base = current === "shot" ? "scene" : current;
  let idx = ELEMENT_CYCLE.indexOf(base);
  if (idx < 0) idx = 1; // default to "action"
  const nextType = ELEMENT_CYCLE[(idx + dir + ELEMENT_CYCLE.length) % ELEMENT_CYCLE.length];
  return applyElementType(view, nextType);
};

// §1.2 Enter: commit current line, create a new line pre-typed to the next element.
const smartEnter = (view) => {
  // Let the autocomplete popup handle Enter (accept the highlighted suggestion).
  if (completionStatus(view.state) === "active") return false;
  const sel = view.state.selection.main;
  const current = currentElementType(view.state);
  const nextType = NEXT_AFTER[current] || "action";
  const isParen = nextType === "parenthetical";
  const insert = isParen ? "\n()" : "\n";
  const newLineFrom = sel.from + 1; // post-insert start of the new line
  const caret = isParen ? sel.from + 2 : sel.from + 1;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: { anchor: caret },
    effects: [setForcedType.of({ pos: newLineFrom, type: nextType })],
    scrollIntoView: true,
  });
  return true;
};

const screenplayKeymap = Prec.highest(
  keymap.of([
    { key: "Enter", run: smartEnter },
    { key: "Tab", run: (v) => cycle(v, 1), shift: (v) => cycle(v, -1) },
  ])
);

const lineDeco = {};
const decoFor = (type) => {
  if (!lineDeco[type]) lineDeco[type] = Decoration.line({ class: `cm-sp-line cm-sp-${type}` });
  return lineDeco[type];
};

// "Hide" decoration: visually collapses a marker span (the Fountain syntax characters ~, #,
// trailing ^, and the forced-element markers . @ >) so they don't show through as raw markup.
// We use a MARK decoration (CSS-driven, see .cm-sp-marker in index.css) rather than an atomic
// Decoration.replace: a replace span makes that part of the line atomic, which broke click-to-
// place-cursor on element lines (you couldn't click some text lines). A mark keeps every
// character individually addressable, so clicking anywhere on the line places the caret normally
// while the marker still renders at zero width. The underlying text is untouched either way.
const hideDeco = Decoration.mark({ class: "cm-sp-marker" });

// For a classified line, return the [from, to) document ranges of marker text to hide so the
// rendered line reads as a clean label ("LYRICS" not "~ Lyrics", "SEQUENCE" not "# Sequence",
// "DUAL" not "Dual ^").
const markerHideRanges = (type, line) => {
  const text = line.text;
  const ranges = [];
  const push = (start, end) => { if (end > start) ranges.push({ from: line.from + start, to: line.from + end }); };
  switch (type) {
    case "lyrics": {
      // Leading "~" plus the following whitespace.
      const m = /^~\s*/.exec(text);
      if (m) push(0, m[0].length);
      break;
    }
    case "sequence": {
      // Leading "#"/"##"/"###" plus the following whitespace.
      const m = /^#{1,3}\s*/.exec(text);
      if (m) push(0, m[0].length);
      break;
    }
    case "dual": {
      // Trailing "^" (and any whitespace hugging it).
      const m = /\s*\^\s*$/.exec(text);
      if (m) push(m.index, text.length);
      break;
    }
    case "scene":
    case "character":
    case "transition": {
      // Leading Fountain forcing marker (".", "@", "> ") plus the whitespace hugging it — hidden so
      // the writer sees only their words while the marker keeps the line self-describing in the text.
      const m = /^[.@>]\s*/.exec(text);
      if (m) push(0, m[0].length);
      break;
    }
    default:
      break;
  }
  return ranges;
};

const decorationPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.build(view);
    }
    update(u) {
      if (u.docChanged || u.viewportChanged || u.transactions.some((t) => t.effects.length)) {
        this.decorations = this.build(u.view);
      }
    }
    build(view) {
      const types = classifyDocument(view.state);
      // Line decorations and marker-hide (mark) decorations can both start at line.from; collect
      // them in document order and let Decoration.set sort by side (line decos sort before marks at
      // the same position). Mark decos are non-atomic, so the caret stays placeable on every line.
      const deco = [];
      for (let i = 1; i <= view.state.doc.lines; i += 1) {
        const line = view.state.doc.line(i);
        const type = types[i - 1];
        if (!type || type === "blank") continue;
        // Line-level formatting decoration (indent / case / weight via .cm-sp-* class).
        deco.push(decoFor(type).range(line.from));
        // Suppress any syntax markers on this line so the rendered text reads as a clean label.
        for (const r of markerHideRanges(type, line)) deco.push(hideDeco.range(r.from, r.to));
      }
      return Decoration.set(deco, true);
    }
  },
  { decorations: (v) => v.decorations }
);

// ── Autocomplete: characters, scene scaffolds, locations, times, transitions ──
const buildCompletionSource = (getEntities) => (context) => {
  const line = context.state.doc.lineAt(context.pos);
  const beforeText = line.text.slice(0, context.pos - line.from);
  const word = context.matchBefore(/[A-Za-z.'/-]+\s?[A-Za-z.'-]*$/);
  if (!word && !context.explicit) return null;

  const { characters = [], locations = [] } = getEntities ? getEntities() : {};
  const options = [];

  // Scene heading scaffolding when a line starts like a slug.
  if (/^(?:I|E|INT|EXT)/i.test(beforeText.trim())) {
    options.push(
      { label: "INT. ", type: "keyword", detail: "scene" },
      { label: "EXT. ", type: "keyword", detail: "scene" },
      { label: "INT./EXT. ", type: "keyword", detail: "scene" }
    );
    for (const loc of locations) options.push({ label: loc, type: "constant", detail: "location" });
    for (const tod of TIMES) options.push({ label: `- ${tod}`, type: "enum", detail: "time" });
  }

  // Transitions when the line is uppercase-ish.
  if (/^[A-Z]/.test(beforeText.trim())) {
    for (const tr of TRANSITIONS) options.push({ label: tr, type: "keyword", detail: "transition" });
  }

  // Character cues — always available.
  for (const name of characters) options.push({ label: name, type: "variable", detail: "character" });

  if (!options.length) return null;
  return {
    from: word ? word.from : context.pos,
    options,
    validFor: /[A-Za-z.'/ -]*$/,
  };
};

// Editor element layout. Because the font is monospace, indents use `ch` units so each
// element lands on an exact character column (like a real screenplay page) and holds its
// position when the panel resizes. Values are eyeballed against a printed page — nudge by
// a character or two as needed; the unit (ch) is what matters.
const SCREENPLAY_FONT = "'Courier Prime','Courier New',Courier,monospace";
const screenplayTheme = EditorView.theme({
  "&": { fontFamily: SCREENPLAY_FONT, fontSize: "15px", backgroundColor: "transparent" },
  // CodeMirror's baseTheme sets font-family directly on .cm-scroller/.cm-content, which beats
  // inheritance from "&" (.cm-editor). Set the font on the actual text containers too so
  // Courier Prime wins the cascade instead of silently falling back to the base monospace.
  ".cm-scroller": { fontFamily: SCREENPLAY_FONT, backgroundColor: "transparent" },
  // Constrain the writing surface to a standard ~62ch screenplay column. The page's internal
  // margins come from the scroller's padding (asymmetric: wider on the left like a real
  // screenplay page, ~1.5" L / 1" R), so the text block sits INSIDE the sheet rather than flush
  // against its left border. We left-anchor the column here (no auto-centering) so it pins to
  // that left margin instead of floating in the middle of a wide sheet.
  ".cm-content": { fontFamily: SCREENPLAY_FONT, lineHeight: "1.7", padding: "1.5rem 0", width: "62ch", maxWidth: "100%", marginLeft: "0", marginRight: "auto", backgroundColor: "transparent" },
  ".cm-line": { fontFamily: SCREENPLAY_FONT, padding: "0" },
  ".cm-sp-line": { whiteSpace: "pre-wrap" },
  // Spacing rhythm — intentionally uneven, not a uniform list. Structural elements (scene
  // headings, act/sequence breaks) get generous air above them so they read as section
  // starts; a character cue couples TIGHTLY to the dialogue beneath it (almost no gap),
  // and dialogue gets a little air below to separate one speech from the next beat.
  //
  // IMPORTANT: vertical spacing is PADDING, never margin. CodeMirror measures each .cm-line's box
  // for coordinate mapping (posAtCoords / click-to-caret); vertical margins sit OUTSIDE that box
  // and aren't measured, so margin-based spacing makes clicks land on the wrong line (the caret
  // drifts down by the accumulated margin). Padding is inside the measured box, so spacing stays
  // visually identical while click hit-testing stays exact. Horizontal indent keeps marginLeft —
  // horizontal offset doesn't affect vertical line hit-testing.
  // ~3 line-heights of air above each scene so scenes visibly separate as new units.
  ".cm-sp-scene, .cm-sp-shot": { fontWeight: "700", textTransform: "uppercase", paddingTop: "3.2em", paddingBottom: "0.4em" },
  ".cm-sp-action": { maxWidth: "62ch", paddingTop: "0.5em" },
  // Cue: air ABOVE (separates from prior beat), hugs the dialogue BELOW (no bottom gap).
  ".cm-sp-character": { textTransform: "uppercase", fontWeight: "700", marginLeft: "22ch", paddingTop: "1.2em", paddingBottom: "0" },
  ".cm-sp-parenthetical": { marginLeft: "16ch", paddingTop: "0" },
  ".cm-sp-dialogue": { marginLeft: "10ch", maxWidth: "35ch", paddingTop: "0", paddingBottom: "0.35em" },
  ".cm-sp-transition": { textTransform: "uppercase", fontWeight: "700", textAlign: "right", paddingTop: "1.2em", paddingBottom: "0.4em" },
  // ── Stage 2 element types (structure via weight/case/position, no new accent) ──
  // Act breaks are structural dividers — centered, uppercase, underlined (WriterDuet style).
  ".cm-sp-act, .cm-sp-endact": {
    textTransform: "uppercase",
    fontWeight: "700",
    textAlign: "center",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    paddingTop: "3.4em",
    paddingBottom: "1.8em",
    letterSpacing: "0.08em",
  },
  ".cm-sp-sequence": { textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.08em", paddingTop: "2.4em", paddingBottom: "0.6em", fontSize: "0.85em" },
  ".cm-sp-lyrics": { marginLeft: "10ch", maxWidth: "35ch", fontStyle: "italic", paddingTop: "0", paddingBottom: "0.35em" },
  // Dual cue hints the second (right-hand) speaker; true side-by-side columns are a later pass.
  // Dual dialogue — Stage 1: render the second (^-marked) speaker as a normal stacked cue+dialogue
  // block (matching the character indent so it aligns over its dialogue), with a muted "(dual)" tag
  // marking it as simultaneous. True side-by-side two-column layout is Stage 2.
  ".cm-sp-dual": { textTransform: "uppercase", fontWeight: "700", marginLeft: "22ch", paddingTop: "0.8em" },
  ".cm-sp-dual::after": { content: '" (dual)"', textTransform: "none", fontWeight: "400", fontStyle: "italic", opacity: "0.5" },
});

/**
 * Build the full set of screenplay extensions.
 * @param {object} opts
 * @param {() => {characters:string[], locations:string[]}} opts.getEntities - live entity source for autocomplete
 * @param {boolean} [opts.dark]
 * @param {(type:string)=>void} [opts.onElementChange] - fired with the caret's element type
 */
export const createScreenplayExtensions = ({ getEntities, dark, onElementChange } = {}) => [
  forcedField,
  decorationPlugin,
  screenplayTheme,
  // Color model — deliberately minimal. Sluglines are the ONE accent (muted navy);
  // everything else is near-black on white / off-white on dark. Character cues are
  // distinguished by weight+case (not color); parentheticals recede in lighter grey italic.
  EditorView.theme({
    ".cm-content": { color: dark ? "#e6e6e6" : "#1a1a1a" },
    // Slugline accent — brighter/more saturated on the dark page so it still reads as
    // the anchor element (a desaturated blue can wash out on the dark blue-grey sheet).
    ".cm-sp-scene": { color: dark ? "#a3c5f2" : "#1e3a5f" },
    ".cm-sp-shot": { color: dark ? "#e6e6e6" : "#1a1a1a" },
    ".cm-sp-character": { color: dark ? "#e6e6e6" : "#1a1a1a" },
    ".cm-sp-transition": { color: dark ? "#e6e6e6" : "#1a1a1a" },
    // Parentheticals recede but stay readable — they carry performance direction.
    ".cm-sp-parenthetical": { color: dark ? "#9aa3ad" : "#595959", fontStyle: "italic" },
    // Stage 2: act breaks & dual cues are structure (near-black/off-white); sequences recede.
    ".cm-sp-act, .cm-sp-endact": { color: dark ? "#e6e6e6" : "#1a1a1a" },
    ".cm-sp-dual": { color: dark ? "#e6e6e6" : "#1a1a1a" },
    ".cm-sp-lyrics": { color: dark ? "#e6e6e6" : "#1a1a1a" },
    // Sequence headers are subordinate structure, not disabled — darker than a faint grey so
    // they read as a deliberate, quieter tier (sits just above the parenthetical grey).
    ".cm-sp-sequence": { color: dark ? "#aeb8c4" : "#555555" },
    // The ONLY line background: a barely-there neutral tint on the caret's current line.
    // Kept very faint so it reads as a soft band, never a solid grey row. It is constrained to
    // the text column (not the full page sheet) because .cm-content is itself 62ch and centered,
    // so the line box never spans the sheet. No background bands behind element types.
    ".cm-activeLine": {
      backgroundColor: dark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.013)",
      borderRadius: "3px",
    },
    // Selection highlight: a soft tint in the same neutral family, never a hard blue block.
    "& .cm-selectionBackground, &.cm-focused .cm-selectionBackground, & ::selection": {
      backgroundColor: dark ? "rgba(120,150,200,0.16)" : "rgba(30,58,95,0.10)",
    },
  }),
  EditorView.lineWrapping,
  highlightActiveLine(),
  autocompletion({ override: [buildCompletionSource(getEntities)] }),
  screenplayKeymap,
  EditorView.updateListener.of((u) => {
    if (onElementChange && (u.selectionSet || u.docChanged)) {
      onElementChange(currentElementType(u.state));
    }
  }),
];
