// Inline line-comment affordance. Shows a small comment icon at the right edge of the line the
// caret is on (the "active line"); clicking it asks React to open a floating composer anchored to
// that line. This complements — does NOT replace — the select-text-then-comment flow: a line
// comment simply anchors to the whole line's text (line start → line end), reusing the same
// buildAnchor(from,to) path as a selection.
//
// The icon is a CodeMirror widget so it tracks the line precisely across edits/scroll. The click
// is reported up via a StateField-held callback (set from React) carrying the line's doc range and
// on-screen coordinates, so the composer can be positioned next to the line.

import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";

// React pushes its "open the composer" handler in via this effect.
export const setLineCommentHandler = StateEffect.define();

const handlerField = StateField.define({
  create: () => ({ onOpen: null }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setLineCommentHandler)) return e.value;
    return value;
  },
});

class LineCommentIconWidget extends WidgetType {
  constructor(lineFrom) {
    super();
    this.lineFrom = lineFrom;
  }
  eq(other) { return other.lineFrom === this.lineFrom; }
  toDOM(view) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cm-sp-linecomment-btn";
    btn.title = "Comment on this line";
    btn.setAttribute("aria-label", "Comment on this line");
    // Speech-bubble glyph (inline SVG so it needs no icon dependency inside CM).
    btn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
    btn.addEventListener("mousedown", (e) => {
      // mousedown + preventDefault so the editor doesn't move the caret / lose the line first.
      e.preventDefault();
      e.stopPropagation();
      const { onOpen } = view.state.field(handlerField);
      if (!onOpen) return;
      const line = view.state.doc.lineAt(this.lineFrom);
      const coords = view.coordsAtPos(line.from);
      onOpen({
        from: line.from,
        to: line.to,
        text: line.text,
        // Viewport-relative coords of the line; React positions the composer from these.
        top: coords ? coords.top : 0,
        bottom: coords ? coords.bottom : 0,
      });
    });
    return btn;
  }
  ignoreEvent() { return false; }
}

// Decorate the active (caret) line with an end-of-line comment-icon widget — but only when there's
// no selection (a selection means the user is on the select-text comment path) and the line isn't
// blank (nothing to comment on).
const lineCommentDecorations = EditorView.decorations.compute(
  ["doc", "selection", handlerField],
  (state) => {
    const { onOpen } = state.field(handlerField);
    if (!onOpen) return Decoration.none;
    const sel = state.selection.main;
    if (sel.from !== sel.to) return Decoration.none; // a real selection → defer to select-to-comment
    const line = state.doc.lineAt(sel.head);
    if (!line.text.trim()) return Decoration.none;    // blank line → nothing to anchor to
    return Decoration.set([
      Decoration.widget({ widget: new LineCommentIconWidget(line.from), side: 1 }).range(line.to),
    ]);
  }
);

export const createLineCommentExtensions = () => [handlerField, lineCommentDecorations];
