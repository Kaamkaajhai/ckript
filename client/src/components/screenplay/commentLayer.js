// CodeMirror comment-highlight layer (Phase 3 §5). Underlines the anchored text of open
// comments; the focused comment (clicked in the rail) gets a stronger highlight. Resolved or
// orphaned comments are NOT highlighted on the page (they still appear in the rail). Comments
// are pushed in from React via setCommentState; anchors are resolved live against the doc.

import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { resolveAnchor } from "./commentAnchor";

export const setCommentState = StateEffect.define(); // { comments:[{_id,anchor,resolved,parentId}], focusedId }

const commentField = StateField.define({
  create: () => ({ comments: [], focusedId: null }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setCommentState)) return e.value;
    return value;
  },
});

const buildCommentDeco = (state) => {
  const { comments, focusedId } = state.field(commentField);
  const text = state.doc.toString();
  const ranges = [];
  for (const c of comments || []) {
    if (c.parentId) continue;   // replies don't carry their own anchor
    if (c.resolved) continue;   // resolved → no on-page highlight
    const r = resolveAnchor(text, c.anchor);
    if (!r || r.to <= r.from) continue; // orphaned → no highlight (shown in rail instead)
    const cls = String(c._id) === String(focusedId) ? "cm-sp-comment cm-sp-comment--focus" : "cm-sp-comment";
    ranges.push(Decoration.mark({ class: cls }).range(r.from, r.to));
  }
  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges, true);
};

const commentDecoField = StateField.define({
  create: (s) => buildCommentDeco(s),
  update(deco, tr) {
    if (tr.docChanged || tr.effects.some((e) => e.is(setCommentState))) return buildCommentDeco(tr.state);
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const createCommentExtensions = () => [commentField, commentDecoField];
