// CodeMirror lock layer (Phase 3 §4). Given the current scene locks, it:
//   - makes scenes locked by OTHERS read-only (a transaction filter blocks edits there),
//   - tints those scenes, and
//   - renders a "Locked by <name> · Request edit" badge above each.
// Scenes you hold (or that are free) edit normally. Lock state is pushed in from React via
// the setLockState effect; scene ranges are re-derived live from the document.
//
// NOTE: the badge is a BLOCK widget, which CodeMirror only allows from a StateField (not a
// ViewPlugin) — so all lock decorations live in lockDecoField below.

import { StateField, StateEffect, EditorState, Annotation } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { getScenes } from "./sceneIdentity";

// value: { locks: {sceneId:{holderId,holderName,color}}, myUserId, onRequestEdit }
export const setLockState = StateEffect.define();

// Programmatic full-document syncs (controlled value updates, restore, import) carry this
// annotation so the lock guard lets them through — it only blocks USER edits in locked scenes.
export const remoteSync = Annotation.define();

const lockField = StateField.define({
  create: () => ({ locks: {}, myUserId: null, onRequestEdit: null }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setLockState)) return e.value;
    return value;
  },
});

// Scenes locked by someone other than me → their document ranges + lock info.
const foreignLockedRanges = (state) => {
  const { locks, myUserId } = state.field(lockField);
  const byScene = {};
  for (const lock of Object.values(locks || {})) {
    if (lock && String(lock.holderId) !== String(myUserId)) byScene[lock.sceneId] = lock;
  }
  if (!Object.keys(byScene).length) return [];

  const scenes = getScenes(state.doc.toString());
  const out = [];
  const lastLine = state.doc.lines;
  for (const s of scenes) {
    const lock = byScene[s.sceneId];
    if (!lock) continue;
    const startLine = Math.min(s.startLine, lastLine);
    const endLine = Math.min(s.endLine, lastLine);
    out.push({
      lock,
      startLine,
      endLine,
      from: state.doc.line(startLine).from,
      to: state.doc.line(endLine).to,
    });
  }
  return out;
};

// Block any edit that touches a foreign-locked scene (read-only for non-holders).
const lockGuard = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr;
  if (tr.annotation(remoteSync)) return tr; // programmatic sync, not a user edit
  const ranges = foreignLockedRanges(tr.startState);
  if (!ranges.length) return tr;
  let blocked = false;
  tr.changes.iterChangedRanges((fromA, toA) => {
    for (const r of ranges) if (fromA <= r.to && toA >= r.from) { blocked = true; break; }
  });
  return blocked ? [] : tr;
});

class LockBadgeWidget extends WidgetType {
  constructor(lock, onRequestEdit) {
    super();
    this.lock = lock;
    this.onRequestEdit = onRequestEdit;
  }
  eq(other) { return other.lock?.holderName === this.lock?.holderName && other.lock?.sceneId === this.lock?.sceneId; }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cm-sp-lockbadge";
    const dot = document.createElement("span");
    dot.className = "cm-sp-lockdot";
    dot.style.backgroundColor = this.lock?.color || "#888";
    const label = document.createElement("span");
    label.className = "cm-sp-locklabel";
    label.textContent = `Locked by ${this.lock?.holderName || "another writer"}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cm-sp-lockbtn";
    btn.textContent = "Request edit";
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onRequestEdit?.(this.lock?.sceneId);
    });
    wrap.append(dot, label, btn);
    return wrap;
  }
  ignoreEvent() { return false; }
}

const buildLockDeco = (state) => {
  const { onRequestEdit } = state.field(lockField);
  const ranges = foreignLockedRanges(state);
  const deco = [];
  for (const r of ranges) {
    const start = state.doc.line(r.startLine);
    deco.push(
      Decoration.widget({ widget: new LockBadgeWidget(r.lock, onRequestEdit), block: true, side: -1 }).range(start.from)
    );
    for (let ln = r.startLine; ln <= r.endLine; ln += 1) {
      deco.push(Decoration.line({ class: "cm-sp-locked" }).range(state.doc.line(ln).from));
    }
  }
  return Decoration.set(deco, true);
};

// Block decorations must come from a StateField (not a ViewPlugin).
const lockDecoField = StateField.define({
  create: (state) => buildLockDeco(state),
  update(deco, tr) {
    if (tr.docChanged || tr.effects.some((e) => e.is(setLockState))) return buildLockDeco(tr.state);
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// lockField must come before lockDecoField so the latter can read it during init.
export const createLockExtensions = () => [lockField, lockGuard, lockDecoField];
