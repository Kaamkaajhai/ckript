// CodeMirror 6 screenplay "mode": live element detection + decoration, smart Enter
// (advances to the next logical element per the §1.2 transition table), Tab/Shift-Tab
// element cycling, and context-aware autocomplete. Visual element formatting (indents,
// uppercase) is driven by CSS classes (.cm-sp-*) so the underlying text stays clean
// Fountain — cycling an element never rewrites the writer's words.

import { StateField, StateEffect, Prec } from "@codemirror/state";
import { Decoration, ViewPlugin, EditorView, WidgetType, keymap, highlightActiveLine } from "@codemirror/view";
import { autocompletion, completionStatus } from "@codemirror/autocomplete";
// The classifier lives in its own pure module so the editor, reports, and FDX all share ONE
// implementation (see classify.js). screenplayMode just layers the forced-type overlay on top.
import { SECTION, PAREN, stripActToken, heuristicType, applyForcedToContext, classifyText, stripForceMarker, CENTERED } from "./classify";

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

// Fountain inline emphasis markers. These are STANDARD Fountain (and the FDX/PDF export already
// understands them via the formatter), so wrapping a selection keeps the text plain — the
// classifier still sees a normal line, only the emphasis renders. This is what "rich text" means
// in a screenplay: *italic*, **bold**, ***bold italic***, _underline_.
// Order matters for active-state detection: the longest marker (***) must be tested before its
// prefixes (** and *), otherwise "***x***" would match the italic (*) probe first.
const EMPHASIS = {
  bolditalic: { mark: "***", re: /^\*\*\*([\s\S]+)\*\*\*$/ },
  bold: { mark: "**", re: /^\*\*([\s\S]+)\*\*$/ },
  italic: { mark: "*", re: /^\*(?!\*)([\s\S]+?)(?<!\*)\*$/ },
  underline: { mark: "_", re: /^_([\s\S]+)_$/ },
};
const EMPHASIS_ORDER = ["bolditalic", "bold", "italic", "underline"];

// Which emphasis kinds currently wrap the selection (e.g. ["bold"] or ["bolditalic"]). Empty when
// there's no selection or the selection isn't an exact emphasis span. Used to light up the toolbar.
export const activeEmphasis = (view) => {
  if (!view) return [];
  const { from, to } = view.state.selection.main;
  if (from === to) return [];
  const sel = view.state.sliceDoc(from, to);
  const active = [];
  for (const kind of EMPHASIS_ORDER) {
    if (EMPHASIS[kind].re.test(sel)) {
      active.push(kind);
      // *** counts as both bold and italic for highlighting; underline can stack independently but
      // a single selection can't be exactly-wrapped by two different markers, so we stop here.
      if (kind === "bolditalic") active.push("bold", "italic");
      break;
    }
  }
  return active;
};

// Toggle a Fountain emphasis marker around the current selection. If the selection is already
// wrapped in that exact marker, unwrap it (toggle off); otherwise wrap it. No selection → insert an
// empty marker pair and place the caret inside, so the writer can type emphasized text.
export const applyEmphasis = (view, kind) => {
  if (!view) return false;
  const spec = EMPHASIS[kind];
  if (!spec) return false;
  const { from, to } = view.state.selection.main;
  const sel = view.state.sliceDoc(from, to);

  if (from === to) {
    const pair = `${spec.mark}${spec.mark}`;
    view.dispatch({ changes: { from, insert: pair }, selection: { anchor: from + spec.mark.length } });
    view.focus();
    return true;
  }

  const m = spec.re.exec(sel);
  if (m) {
    // Already wrapped → unwrap.
    view.dispatch({
      changes: { from, to, insert: m[1] },
      selection: { anchor: from, head: from + m[1].length },
    });
  } else {
    const wrapped = `${spec.mark}${sel}${spec.mark}`;
    view.dispatch({
      changes: { from, to, insert: wrapped },
      selection: { anchor: from, head: from + wrapped.length },
    });
  }
  view.focus();
  return true;
};

// Transform the selected text's CASE in place. This rewrites the actual characters (no markup), so
// it persists everywhere and the classifier/reports/export see the changed text exactly as written.
// kind: "upper" | "lower". No-op without a selection.
export const applyCase = (view, kind) => {
  if (!view) return false;
  const { from, to } = view.state.selection.main;
  if (from === to) return false;
  const sel = view.state.sliceDoc(from, to);
  const next = kind === "lower" ? sel.toLowerCase() : sel.toUpperCase();
  if (next === sel) return false;
  view.dispatch({
    changes: { from, to, insert: next },
    selection: { anchor: from, head: from + next.length },
  });
  view.focus();
  return true;
};

// Fountain centered text: a line wrapped ">text<". The classifier recognizes ">…<" (BOTH a leading
// ">" and trailing "<") as centered BEFORE the leading-">"-only transition force, so these never
// collide. Centering is line-level — we toggle the marker on every non-blank line the selection (or
// caret) touches.
const CENTERED_LINE = /^\s*>(.*?)<\s*$/;
export const applyCentered = (view) => {
  if (!view) return false;
  const { from, to } = view.state.selection.main;
  const startLine = view.state.doc.lineAt(from);
  const endLine = view.state.doc.lineAt(to);
  const lines = [];
  for (let n = startLine.number; n <= endLine.number; n++) lines.push(view.state.doc.line(n));
  const targets = lines.filter((l) => l.text.trim());
  if (!targets.length) return false;
  // If every targeted line is already centered, toggle OFF; otherwise center them all.
  const allCentered = targets.every((l) => CENTERED_LINE.test(l.text));
  const changes = targets.map((l) => {
    const m = CENTERED_LINE.exec(l.text);
    const inner = m ? m[1].trim() : l.text.trim();
    return { from: l.from, to: l.to, insert: allCentered ? inner : `>${inner}<` };
  });
  view.dispatch({ changes, selection: { anchor: startLine.from } });
  view.focus();
  return true;
};

// Is the caret's current line centered (>…<)? Lets the toolbar light up the Center button.
export const isCenteredLine = (view) => {
  if (!view) return false;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  return CENTERED_LINE.test(line.text);
};

// Insert a Fountain forced page break ("===") on its own line at the caret, with blank lines around
// it so it reads as a clean divider. Standard Fountain — the PDF export honors it as a hard page
// break. The caret lands on the line AFTER the break, ready to keep writing.
export const insertPageBreak = (view) => {
  if (!view) return false;
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.head);
  // If we're mid-line, push the break to the line's end; otherwise insert at the caret.
  const at = line.to;
  const atLineStart = line.from === line.to; // empty line
  const insert = (atLineStart ? "===\n\n" : "\n\n===\n\n");
  const caret = at + insert.length;
  view.dispatch({
    changes: { from: at, insert },
    selection: { anchor: caret },
    scrollIntoView: true,
  });
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
// One line decoration per (type, centered) combo. Centered text (">words<") classifies as action
// but needs the extra .cm-sp-centered class — folded into the SAME line decoration rather than a
// second Decoration.line at the same position (stacking two line decos at one pos is invalid and
// throws inside Decoration.set, which would silently disable the whole decoration plugin).
const decoFor = (type, centered = false) => {
  const key = centered ? `${type} c` : type;
  if (!lineDeco[key]) {
    lineDeco[key] = Decoration.line({ class: `cm-sp-line cm-sp-${type}${centered ? " cm-sp-centered" : ""}` });
  }
  return lineDeco[key];
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

// Inline Fountain emphasis decorations (style the text bold/italic/underlined) plus marker hiding
// (the * and _ characters render at zero width via the same non-atomic .cm-sp-marker as other
// markers, so click-to-cursor stays accurate). Order matters: *** before ** before * so the longest
// marker wins. Returns an array of { from, to, deco } for one line.
const boldItalicDeco = Decoration.mark({ class: "cm-sp-em cm-sp-em-bolditalic" });
const boldDeco = Decoration.mark({ class: "cm-sp-em cm-sp-em-bold" });
const italicDeco = Decoration.mark({ class: "cm-sp-em cm-sp-em-italic" });
const underlineDeco = Decoration.mark({ class: "cm-sp-em cm-sp-em-underline" });

const EMPHASIS_SCANS = [
  { re: /\*\*\*([^*\n]+)\*\*\*/g, mark: 3, deco: boldItalicDeco },
  { re: /\*\*([^*\n]+)\*\*/g, mark: 2, deco: boldDeco },
  { re: /\*([^*\n]+)\*/g, mark: 1, deco: italicDeco },
  { re: /_([^_\n]+)_/g, mark: 1, deco: underlineDeco },
];

const emphasisRanges = (line) => {
  const out = [];
  const claimed = []; // [from,to) spans already taken by a longer marker, so we don't double-mark
  const overlaps = (a, b) => claimed.some((c) => a < c.to && b > c.from);
  for (const scan of EMPHASIS_SCANS) {
    scan.re.lastIndex = 0;
    let m;
    while ((m = scan.re.exec(line.text)) !== null) {
      const start = line.from + m.index;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue;
      claimed.push({ from: start, to: end });
      const innerFrom = start + scan.mark;
      const innerTo = end - scan.mark;
      // Hide the opening + closing markers; style the inner text.
      out.push({ from: start, to: innerFrom, deco: hideDeco });
      out.push({ from: innerFrom, to: innerTo, deco: scan.deco });
      out.push({ from: innerTo, to: end, deco: hideDeco });
    }
  }
  return out;
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
      // Collect line decorations, marker-hide decorations, and inline emphasis decorations. They are
      // pushed in document order; Decoration.set(...,true) sorts by (from, side) so line decos sort
      // before marks at the same position. All marks are non-atomic, so the caret stays placeable.
      const deco = [];
      for (let i = 1; i <= view.state.doc.lines; i += 1) {
        const line = view.state.doc.line(i);
        const type = types[i - 1];
        if (!type || type === "blank") continue;
        // Centered text ">words<" (classified as action): fold the centering class into the single
        // line decoration and hide the ">" / "<" wrapper so the writer sees just the centered words.
        const isCentered = CENTERED.test(line.text);
        // Line-level formatting decoration (indent / case / weight / centering via .cm-sp-* class).
        deco.push(decoFor(type, isCentered).range(line.from));
        if (isCentered) {
          const open = line.text.indexOf(">");
          const close = line.text.lastIndexOf("<");
          if (open >= 0) deco.push(hideDeco.range(line.from + open, line.from + open + 1));
          if (close >= 0) deco.push(hideDeco.range(line.from + close, line.from + close + 1));
        }
        // Suppress any syntax markers on this line so the rendered text reads as a clean label.
        for (const r of markerHideRanges(type, line)) deco.push(hideDeco.range(r.from, r.to));
        // Inline Fountain emphasis (*italic* **bold** ***both*** _underline_).
        for (const r of emphasisRanges(line)) deco.push(r.deco.range(r.from, r.to));
      }
      // Sort by from then startSide so overlapping ranges are well-ordered for CodeMirror.
      deco.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
      // Defensive: if any single range is somehow invalid, Decoration.set throws and CodeMirror
      // PERMANENTLY disables this whole ViewPlugin — which silently kills ALL formatting (emphasis
      // styling + marker hiding) document-wide until reload. Degrade to no decorations for this one
      // build instead, so a bad line can never take the entire editor's formatting down with it.
      try {
        return Decoration.set(deco, true);
      } catch (err) {
        console.error("[screenplay] decoration build failed; skipping decorations this pass", err);
        return Decoration.none;
      }
    }
  },
  { decorations: (v) => v.decorations }
);

// ── Real page breaks ────────────────────────────────────────────────────────
// A "===" line is a genuine page break: we add a block widget AFTER it whose height fills the rest
// of the current page, so the following text actually starts at the top of the next page. The fill
// height is MEASURED from the real on-screen geometry (the break line's bottom, relative to the top
// of the page it sits on), so pages reflow from actual content — not a word-count estimate.
//
// The page boundary itself (desk gap + "next page" header) is drawn by the widget. Default page
// height is provided by the editor host via the `--sp-page-height` CSS var (so zoom scales it too).

const DEFAULT_PAGE_HEIGHT = 1056;

const pageHeightOf = (view) => {
  const raw = getComputedStyle(view.dom).getPropertyValue("--sp-page-height");
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 200 ? n : DEFAULT_PAGE_HEIGHT;
};

class PageBreakWidget extends WidgetType {
  constructor(height) { super(); this.height = Math.max(0, Math.round(height)); }
  eq(other) { return other.height === this.height; }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cm-sp-pagebreak-gap";
    wrap.style.height = `${this.height}px`;
    wrap.setAttribute("aria-hidden", "true");
    const inner = document.createElement("div");
    inner.className = "cm-sp-pagebreak-rule";
    wrap.appendChild(inner);
    return wrap;
  }
  get estimatedHeight() { return this.height; }
  ignoreEvent() { return true; }
}

// Spacer heights live in a StateField so the decorations are reactive and never loop: a measuring
// ViewPlugin reads the real geometry and DISPATCHES the computed heights (only when they change); the
// field turns them into block-widget decorations. The break line positions are mapped across edits.
export const setPageSpacers = StateEffect.define();

const pageSpacerField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setPageSpacers)) {
        const ranges = e.value
          .filter((s) => s.pos <= tr.state.doc.length)
          .map((s) => Decoration.widget({ widget: new PageBreakWidget(s.height), side: 1, block: true }).range(s.pos));
        try { deco = Decoration.set(ranges, true); } catch { deco = Decoration.none; }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Signature of the current spacer set in the field (pos:height,…) — so we only dispatch on change.
const spacerSignature = (deco) => {
  const out = []; const it = deco.iter();
  while (it.value) { out.push(`${it.from}:${it.value.spec.widget?.height}`); it.next(); }
  return out.join(",");
};

const pageBreakPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) { this.raf = 0; this.scheduleMeasure(view); }
    update(u) {
      // Re-measure whenever the doc, viewport, or geometry changes (typing, scroll, resize, zoom).
      if (u.docChanged || u.viewportChanged || u.geometryChanged) this.scheduleMeasure(u.view);
    }
    destroy() { if (this.raf) cancelAnimationFrame(this.raf); }
    // Schedule on the next frame (so layout is settled) and outside the current update cycle (so we
    // can dispatch the spacer heights without "dispatch during update" issues).
    scheduleMeasure(view) {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        let spacers = [];
        try { spacers = this.compute(view); } catch { spacers = []; }
        const next = spacers.map((s) => `${s.pos}:${s.height}`).join(",");
        if (next !== spacerSignature(view.state.field(pageSpacerField))) {
          view.dispatch({ effects: setPageSpacers.of(spacers) });
        }
      });
    }
    // For each "===" line, fill height = remaining space on its current page. Pages track cumulatively
    // (each break resets the running page top to just after the spacer it adds). lineBlockAt returns
    // document-space coords (0 = top of content), so the first page top is 0.
    compute(view) {
      const pageH = pageHeightOf(view);
      const types = classifyDocument(view.state);
      const spacers = [];
      let pageTop = 0;
      for (let i = 1; i <= view.state.doc.lines; i += 1) {
        if (types[i - 1] !== "pagebreak") continue;
        const line = view.state.doc.line(i);
        const block = view.lineBlockAt(line.from); // throws only if pos invalid — caught above
        const usedOnPage = block.bottom - pageTop;
        const remaining = pageH - (((usedOnPage % pageH) + pageH) % pageH);
        const fill = remaining < 24 ? pageH : remaining; // near a page edge → fill a whole gap
        spacers.push({ pos: line.to, height: Math.round(fill) });
        pageTop = block.bottom + fill;
      }
      return spacers;
    }
  }
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
  // fontSize reads a CSS var so the host can zoom the whole editor (the layout uses ch/em units, so
  // scaling the base size scales every indent proportionally). Falls back to 15px when unset.
  "&": { fontFamily: SCREENPLAY_FONT, fontSize: "var(--sp-font-size, 15px)", backgroundColor: "transparent" },
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
  // Centered text (">words<") — overrides the action left-anchor to center within the 62ch column.
  ".cm-sp-centered": { textAlign: "center", maxWidth: "62ch", marginLeft: "0", marginRight: "auto" },
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
  // Page break ("==="): the raw === characters are hidden, but the LINE always shows a clear labelled
  // divider ("⤓ PAGE BREAK ⤓"), so a break is visible even before the measured page-fill spacer is
  // applied. The block-widget spacer (.cm-sp-pagebreak-gap, added by pageBreakPlugin) then fills the
  // rest of the page so the next line starts a fresh page.
  ".cm-sp-pagebreak": {
    position: "relative",
    textAlign: "center",
    color: "transparent",          // hide the raw "==="
    userSelect: "none",
    paddingTop: "1.1em",
    paddingBottom: "1.1em",
    margin: "0.4em 0",
  },
  ".cm-sp-pagebreak::after": {
    content: '"⤓  PAGE BREAK  ⤓"',
    position: "absolute",
    left: "0",
    right: "0",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9aa3ad",
    fontSize: "0.68em",
    fontWeight: "700",
    letterSpacing: "0.2em",
    borderTop: "1px dashed #cfd6df",
    borderBottom: "1px dashed #cfd6df",
    padding: "0.4em 0",
  },
  // The page-fill spacer that pushes the next page down. Desk-coloured so it reads as the gap between
  // two pages; a dashed rule marks where the next page begins.
  ".cm-sp-pagebreak-gap": {
    position: "relative",
    width: "100%",
    margin: "0",
  },
  ".cm-sp-pagebreak-rule": {
    position: "absolute",
    left: "-4ch",
    right: "-4ch",
    bottom: "0",
    borderTop: "1px dashed #cfd6df",
  },
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
  pageSpacerField,
  pageBreakPlugin,
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
    // Page-break label + gutter + edge rule — desk colour on the dark page so it reads as a real gap.
    ".cm-sp-pagebreak::after": dark
      ? { color: "#5b6b7e", borderTopColor: "#243650", borderBottomColor: "#243650" }
      : {},
    ".cm-sp-pagebreak-gap": dark ? { background: "#0a0f17" } : { background: "#ece9e3" },
    ".cm-sp-pagebreak-rule": dark ? { borderTopColor: "#243650" } : { borderTopColor: "#cfd6df" },
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
