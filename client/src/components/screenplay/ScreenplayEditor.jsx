import { useEffect, useRef, useState } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { closeBrackets, completionKeymap } from "@codemirror/autocomplete";
import { textToBlocks } from "./classify";
import { createScreenplayExtensions, applyElementType, applyEmphasis, activeEmphasis, applyCase, applyCentered, isCenteredLine } from "./screenplayMode";
import { createLockExtensions, setLockState, remoteSync } from "./lockLayer";
import { createCommentExtensions, setCommentState } from "./commentLayer";
import { createLineCommentExtensions, setLineCommentHandler } from "./lineCommentLayer";

// Derive live character/location lists from the current document for autocomplete.
const entitiesFromText = (text = "") => {
  const blocks = textToBlocks(text);
  const characters = new Set();
  const locations = new Set();
  for (const b of blocks) {
    if (b.type === "character" || b.type === "dual") characters.add(b.text.replace(/\s*\(.*\)$/, "").trim());
    else if (b.type === "scene") {
      const loc = b.text
        .replace(/^(?:\d+\s+)?(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)\s*/i, "")
        .replace(/\s*[-–—]\s*(?:DAY|NIGHT|EVENING|MORNING|AFTERNOON|CONTINUOUS|LATER|DUSK|DAWN).*$/i, "")
        .trim();
      if (loc) locations.add(loc);
    }
  }
  return { characters: [...characters].filter(Boolean), locations: [...locations].filter(Boolean) };
};

/**
 * Fountain-native screenplay editor (CodeMirror 6).
 * Controlled: `value` is the canonical Fountain text; `onChange(text)` fires on edits.
 */
export default function ScreenplayEditor({
  value = "",
  onChange,
  onElementChange,
  onEmphasisStateChange,
  onCaretLine,
  locks = {},
  myUserId = null,
  onRequestEdit,
  comments = [],
  focusedCommentId = null,
  onAddComment,
  apiRef,
  dark = false,
  placeholder = "INT. LOCATION - DAY",
  readOnly = false,
  zoom = 1,
  className = "",
}) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const readOnlyComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onElementChangeRef = useRef(onElementChange);
  onElementChangeRef.current = onElementChange;
  const onEmphasisStateChangeRef = useRef(onEmphasisStateChange);
  onEmphasisStateChangeRef.current = onEmphasisStateChange;
  const onCaretLineRef = useRef(onCaretLine);
  onCaretLineRef.current = onCaretLine;
  const onRequestEditRef = useRef(onRequestEdit);
  onRequestEditRef.current = onRequestEdit;
  const onAddCommentRef = useRef(onAddComment);
  onAddCommentRef.current = onAddComment;

  // Floating line-comment composer: { from, to, text, top } anchored to a clicked line, or null.
  const [composer, setComposer] = useState(null);
  const [composerBody, setComposerBody] = useState("");
  const [composerBusy, setComposerBusy] = useState(false);
  const composerInputRef = useRef(null);

  // Build the view once.
  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;

    const getEntities = () => entitiesFromText(viewRef.current?.state.doc.toString() || "");

    const state = EditorState.create({
      doc: value || "",
      extensions: [
        history(),
        closeBrackets(),
        keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap]),
        cmPlaceholder(placeholder),
        readOnlyComp.current.of([EditorView.editable.of(!readOnly), EditorState.readOnly.of(readOnly)]),
        ...createScreenplayExtensions({
          getEntities,
          dark,
          onElementChange: (type) => onElementChangeRef.current?.(type),
        }),
        ...createLockExtensions(),
        ...createCommentExtensions(),
        ...createLineCommentExtensions(),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && onChangeRef.current) {
            onChangeRef.current(u.state.doc.toString());
          }
          // Report the caret's line so the parent can map it to a scene (presence).
          if ((u.selectionSet || u.docChanged) && onCaretLineRef.current) {
            const line = u.state.doc.lineAt(u.state.selection.main.head).number;
            onCaretLineRef.current(line);
          }
          // Report the active formatting state (emphasis + centered + selection presence) so the
          // Format bar can light up its B/I/U/Center buttons and disable selection-only ones.
          if ((u.selectionSet || u.docChanged) && onEmphasisStateChangeRef.current) {
            const { from, to } = u.state.selection.main;
            onEmphasisStateChangeRef.current({
              active: activeEmphasis(viewRef.current),
              hasSelection: from !== to,
              centered: isCenteredLine(viewRef.current),
            });
          }
        }),
      ],
    });

    viewRef.current = new EditorView({ state, parent: hostRef.current });

    // Wire the inline line-comment icon: clicking it opens the floating composer anchored to that
    // line. The host is position:relative, so we convert the line's viewport coords to host-local.
    viewRef.current.dispatch({
      effects: setLineCommentHandler.of({
        onOpen: ({ from, to, text, top }) => {
          const hostRect = hostRef.current?.getBoundingClientRect();
          setComposerBody("");
          setComposer({ from, to, text, top: hostRect ? top - hostRect.top : top });
        },
      }),
    });

    // Report the caret's scene immediately on mount, so presence shows a scene without
    // waiting for the first caret move.
    if (onCaretLineRef.current) {
      const v = viewRef.current;
      onCaretLineRef.current(v.state.doc.lineAt(v.state.selection.main.head).number);
    }

    // Push fresh formatting state to the toolbar right after a command (the updateListener also
    // fires, but reporting here keeps the button highlights snappy).
    const reportFormatState = () => {
      if (!onEmphasisStateChangeRef.current || !viewRef.current) return;
      const { from, to } = viewRef.current.state.selection.main;
      onEmphasisStateChangeRef.current({
        active: activeEmphasis(viewRef.current),
        hasSelection: from !== to,
        centered: isCenteredLine(viewRef.current),
      });
    };

    // Imperative handle for the toolbar element-type dropdown.
    if (apiRef) {
      apiRef.current = {
        setElementType: (type) => applyElementType(viewRef.current, type),
        applyEmphasis: (kind) => {
          const ok = applyEmphasis(viewRef.current, kind);
          reportFormatState();
          return ok;
        },
        applyCase: (kind) => applyCase(viewRef.current, kind),
        applyCentered: () => {
          const ok = applyCentered(viewRef.current);
          reportFormatState();
          return ok;
        },
        activeEmphasis: () => activeEmphasis(viewRef.current),
        scrollToLine: (lineNo) => {
          const v = viewRef.current;
          if (!v) return;
          const n = Math.max(1, Math.min(Number(lineNo) || 1, v.state.doc.lines));
          const line = v.state.doc.line(n);
          v.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
          v.focus();
        },
        // Current selection (for "Add comment").
        getSelection: () => {
          const v = viewRef.current;
          if (!v) return null;
          const { from, to } = v.state.selection.main;
          if (from === to) return null;
          return { from, to, text: v.state.doc.sliceString(from, to) };
        },
        // Open the floating line composer on the caret's current line (toolbar/keyboard entry).
        commentLine: () => {
          const v = viewRef.current;
          if (!v) return;
          const line = v.state.doc.lineAt(v.state.selection.main.head);
          if (!line.text.trim()) return;
          const coords = v.coordsAtPos(line.from);
          const hostRect = hostRef.current?.getBoundingClientRect();
          setComposerBody("");
          setComposer({ from: line.from, to: line.to, text: line.text, top: coords && hostRect ? coords.top - hostRect.top : 0 });
        },
        // Select + reveal a document range (clicking a comment in the rail).
        scrollToRange: (from, to) => {
          const v = viewRef.current;
          if (!v) return;
          const max = v.state.doc.length;
          const a = Math.max(0, Math.min(from, max));
          const b = Math.max(a, Math.min(to, max));
          v.dispatch({ selection: { anchor: a, head: b }, scrollIntoView: true });
          v.focus();
        },
        focus: () => viewRef.current?.focus(),
        // Re-measure the viewport — used when the editor was hidden (e.g. the corkboard was
        // showing) and becomes visible again, so CodeMirror lays out against the real geometry.
        requestMeasure: () => viewRef.current?.requestMeasure(),
      };
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
      if (apiRef) apiRef.current = null;
    };
    // Intentionally build once; prop-driven updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor (e.g. loading a draft, AI fill, import).
  // Tagged remoteSync so the lock guard treats it as a programmatic sync, not a user edit.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value || "" },
        annotations: remoteSync.of(true),
      });
    }
  }, [value]);

  // Push the current lock state into the editor (drives read-only + tint + badges).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: setLockState.of({ locks: locks || {}, myUserId: myUserId || null, onRequestEdit: (id) => onRequestEditRef.current?.(id) }),
    });
  }, [locks, myUserId]);

  // Push comments + the focused comment into the editor (drives the underline highlights).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setCommentState.of({ comments: comments || [], focusedId: focusedCommentId || null }) });
  }, [comments, focusedCommentId]);

  // Reconfigure read-only when the prop changes (e.g. a commenter-role collaborator).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: readOnlyComp.current.reconfigure([EditorView.editable.of(!readOnly), EditorState.readOnly.of(readOnly)]) });
  }, [readOnly]);

  // Focus the composer input as soon as it opens, so the user can type immediately.
  useEffect(() => {
    if (composer) composerInputRef.current?.focus();
  }, [composer]);

  const closeComposer = () => { setComposer(null); setComposerBody(""); };

  const submitComposer = async () => {
    const body = composerBody.trim();
    if (!body || composerBusy || !composer) return;
    setComposerBusy(true);
    // Anchor to the whole line (line start → line end). buildAnchor lives in the parent's
    // handleAddComment, which accepts an explicit {from,to,text}; we pass the line range here.
    const ok = await onAddCommentRef.current?.(body, { from: composer.from, to: composer.to, text: composer.text });
    setComposerBusy(false);
    if (ok) closeComposer();
  };

  return (
    <div
      ref={hostRef}
      className={`screenplay-editor relative ${dark ? "screenplay-editor--dark" : ""} ${className}`.trim()}
      style={{
        "--sp-font-size": `${(15 * (Number(zoom) || 1)).toFixed(2)}px`,
      }}
    >
      {composer && (
        <>
          {/* Click-away closes the composer (mousedown so it beats the input blur). */}
          <div className="fixed inset-0 z-[60]" onMouseDown={closeComposer} />
          <div
            className={`absolute left-4 right-4 z-[61] flex items-center gap-2 rounded-xl border px-3 py-2 shadow-xl ${dark ? "bg-[#16263c] border-[#2a4a6a]" : "bg-white border-gray-200"}`}
            style={{ top: Math.max(4, (composer.top || 0) - 6) }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <svg className={`w-4 h-4 shrink-0 ${dark ? "text-gray-400" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
            <input
              ref={composerInputRef}
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComposer(); }
                if (e.key === "Escape") { e.preventDefault(); closeComposer(); }
              }}
              placeholder="Press Enter to add comment…"
              disabled={composerBusy}
              className={`flex-1 bg-transparent outline-none text-[13px] ${dark ? "text-gray-100 placeholder:text-gray-500" : "text-gray-800 placeholder:text-gray-400"}`}
            />
            <button type="button" onMouseDown={(e) => { e.preventDefault(); closeComposer(); }}
              className={`shrink-0 w-6 h-6 inline-flex items-center justify-center rounded-md ${dark ? "text-gray-400 hover:bg-white/[0.08]" : "text-gray-400 hover:bg-gray-100"}`} title="Close">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
