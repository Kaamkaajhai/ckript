import { useRef, useState } from "react";
import Icon from "../../components/Icon";
import ActionSheet from "../../components/overlays/ActionSheet";
import useKeyboardInset from "../../hooks/useKeyboardInset";
import {
  EDITOR_DOCK_TAB,
  EDITOR_DOCK_TABS,
  EDITOR_ELEMENT_CHIPS,
  EDITOR_FORMAT_CONTROLS,
  EDITOR_MORE_ELEMENT_GROUPS,
} from "./editorChrome";

/*
 * EditorDock — the one bar between the script and the keyboard
 * (prefix: ckm-editor, plan §11 Phase 3, decisions D3 and D4).
 *
 * WHY THIS SHAPE
 * --------------
 * A screenplay is typed in six element types, and on desktop you cycle them
 * with Tab. A phone has no Tab key, so the element the writer is about to type
 * has to be *selectable* — and selectable within thumb reach of the caret,
 * which means docked to the keyboard, not parked in a menu three taps away.
 * That is WriterDuet's one-touch row and Final Draft Go's iPhone menu, and it
 * is the research answer §4.2 recorded.
 *
 * It is ONE bar with a tab switch rather than two stacked bars (approved
 * wireframe, frame B). Two rows cost about 110px, and with the keyboard up a
 * 640px viewport has roughly 260px of script left — a fifth of it is not
 * something a toolbar gets to take.
 *
 * IT RIDES THE KEYBOARD, IT DOES NOT COVER THE SCRIPT
 * ---------------------------------------------------
 * The dock renders into MobileShell's bottom slot (see EDITOR_SHELL_SLOTS), so
 * it is a flex sibling of the scroll surface: the script gets shorter, the caret
 * line stays visible. A `position: fixed` bar would have sat on the line being
 * typed. `useKeyboardInset` then pads the dock by exactly what the virtual
 * keyboard covers, because on iOS the layout viewport does not shrink and the
 * bar would otherwise be underneath it — invisible and untappable.
 *
 * NO SELECTION-PRESERVING TRICKERY (D4)
 * -------------------------------------
 * The desktop formatter keeps the selection alive with `onMouseDown` +
 * `preventDefault()`. On touch there is no mousedown before the selection
 * settles and a synthesized mouse event is not the selection. These are ordinary
 * buttons; the editor holds the range in its own state across the blur, and
 * `apiRef` applies to whatever `getSelection()` reports. Whether the Android
 * keyboard stays up across that blur is a real-device question, recorded with
 * DEF-5 rather than guessed at here.
 */
export default function EditorDock({
  tab = EDITOR_DOCK_TAB.ELEMENTS,
  onTabChange = null,
  currentElement = "action",
  onSelectElement = null,
  emphasis = null,
  onFormat = null,
  readOnly = false,
  className = "",
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const keyboardInset = useKeyboardInset();

  const isElements = tab !== EDITOR_DOCK_TAB.FORMAT;
  const activeEmphasis = emphasis?.active || [];

  const moreItems = EDITOR_MORE_ELEMENT_GROUPS.flat().map((element) => ({
    id: element.value,
    label: element.label,
    icon: element.glyph,
    onSelect: () => onSelectElement?.(element.value),
  }));

  return (
    <div
      className={["ckm-editor__dock", className].filter(Boolean).join(" ")}
      style={keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined}
    >
      <div className="ckm-editor__dock-row">
        {/* A two-state toggle, not an APG tablist. The tablist contract brings
            roving tabindex and arrow-key navigation — a desktop keyboard model
            that replaces behaviour a phone user already has (Tab moves on) with
            behaviour they would have to discover. `aria-pressed` says the same
            thing with none of it. Same argument as ActionSheet's. */}
        <div className="ckm-editor__dock-switch" role="group" aria-label="Toolbar mode">
          {EDITOR_DOCK_TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="ckm-editor__dock-tab"
              aria-pressed={tab === entry.id}
              onClick={() => onTabChange?.(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {/* One horizontally scrolling track. The controls are wider than any
            phone, and a wrapping bar would change height as the writer types —
            the script would jump under the caret every time the row rewrapped. */}
        <div className="ckm-editor__dock-track ckm-scroll">
          {isElements ? (
            <>
              {EDITOR_ELEMENT_CHIPS.map((element) => (
                <button
                  key={element.value}
                  type="button"
                  className="ckm-editor__dock-chip"
                  aria-pressed={currentElement === element.value}
                  disabled={readOnly}
                  onClick={() => onSelectElement?.(element.value)}
                >
                  <Icon name={element.glyph} size={18} className="ckm-editor__dock-glyph" />
                  <span className="ckm-editor__dock-label">{element.label}</span>
                </button>
              ))}

              <button
                ref={moreRef}
                type="button"
                className="ckm-editor__dock-chip ckm-editor__dock-chip--more"
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                disabled={readOnly}
                onClick={() => setMoreOpen(true)}
              >
                <Icon name="more_horiz" size={18} className="ckm-editor__dock-glyph" />
                <span className="ckm-editor__dock-label">More</span>
              </button>
            </>
          ) : (
            EDITOR_FORMAT_CONTROLS.map((control) => {
              const active = control.action === "centered"
                ? Boolean(emphasis?.centered)
                : activeEmphasis.includes(control.kind);
              return (
                <button
                  key={control.id}
                  type="button"
                  className={`ckm-editor__dock-fmt ckm-editor__dock-fmt--${control.id}`}
                  // Case changes are transformations, not toggles: there is no
                  // "currently uppercase" state to report, so they never claim one.
                  aria-pressed={control.action === "case" ? undefined : active}
                  aria-label={control.label}
                  disabled={readOnly}
                  onClick={() => onFormat?.(control)}
                >
                  {control.glyph
                    ? <Icon name={control.glyph} size={20} />
                    : <span className="ckm-editor__dock-fmt-text" aria-hidden="true">{control.text}</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      <ActionSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More elements"
        description="Shots, act breaks, lyrics and dual dialogue."
        items={moreItems}
        returnFocusTo={moreRef}
      />
    </div>
  );
}
