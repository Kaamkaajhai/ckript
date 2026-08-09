import { CORE_ELEMENTS, MORE_ELEMENT_GROUPS } from "../../../components/screenplay/screenplayElements";
import { CP_ELEMENT_GLYPH } from "../../../pages/CreateProject/constants";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";

/*
 * Ckript Mobile — the screenplay editor's chrome model (plan §11 Phase 3,
 * decisions D2–D5 and the approved low-fidelity wireframe of 2026-08-09).
 *
 * Everything here is data, not JSX: what the docked bar contains, what the
 * overflow sheet offers, and which shell slots the editor overrides. Keeping it
 * out of the components is what makes the chrome testable without mounting
 * CodeMirror, and what makes "which controls exist on this bar?" a question with
 * one answer instead of a scan through render code.
 */

/*
 * D2 — the one documented shell-slot override in the app.
 *
 * The editor is an `immersive` surface: it owns the whole viewport and paints
 * its own dark ground. But immersive's default is *no* chrome slots at all, and
 * the editor has two bars it must keep — the top bar (exit · title · save state
 * · overflow) and the docked Elements/Format row.
 *
 * They go in the shell's slots rather than being hand-rolled inside the body for
 * one reason worth stating: the shell's slots are `flex: none` siblings of the
 * one scroll surface, so the docked bar *displaces* the script instead of
 * covering it. A `position: fixed` bar of our own would sit on top of the caret
 * line the writer is typing on, which is the single failure this whole surface
 * exists to avoid.
 *
 * A correction to D2 as written: D2 assumed the manifest entry stays `flow` and
 * step 1 overrides two slots. Under `flow` the app bar is already allowed and
 * the bottom nav already forbidden, so "override two slots" would have been a
 * no-op; the honest expression is immersive + both slots forced back on. The
 * mode this constant belongs to is therefore named alongside it.
 */
export const EDITOR_SHELL_MODE = MOBILE_SHELL_MODE.IMMERSIVE;

export const EDITOR_SHELL_SLOTS = Object.freeze({
  appBar: true,
  bottomNav: true,
});

/*
 * D3/D4 — ONE docked bar with a tab switch, not two stacked bars (approved
 * wireframe, frame B). Two bars would eat ~110px of a 640px-tall viewport with
 * the keyboard up, which is most of what is left of the page.
 */
export const EDITOR_DOCK_TAB = Object.freeze({
  ELEMENTS: "elements",
  FORMAT: "format",
});

export const EDITOR_DOCK_TABS = Object.freeze([
  { id: EDITOR_DOCK_TAB.ELEMENTS, label: "Elements" },
  { id: EDITOR_DOCK_TAB.FORMAT, label: "Format" },
]);

/*
 * The core six, in Tab-cycle order, with the glyph vocabulary the desktop editor
 * already uses. Imported rather than re-listed: a seventh core element added to
 * `screenplayElements.js` must appear here without anyone remembering to do it
 * (D1 — one engine, two chromes).
 */
export const EDITOR_ELEMENT_CHIPS = Object.freeze(
  CORE_ELEMENTS.map((element) => Object.freeze({
    value: element.value,
    label: element.label,
    glyph: CP_ELEMENT_GLYPH[element.value],
    /* The desktop bar shows "Tab 3" as a hint. On a phone there is no Tab key,
       so the number is noise — but it is still the element's position in the
       cycle, which is worth saying to a screen reader that cannot see the row. */
    position: element.tab,
  })),
);

export const EDITOR_MORE_ELEMENT_GROUPS = Object.freeze(
  MORE_ELEMENT_GROUPS.map((group) => Object.freeze(
    group.map((element) => Object.freeze({
      value: element.value,
      label: element.label,
      glyph: CP_ELEMENT_GLYPH[element.value],
    })),
  )),
);

/*
 * D4 — the Format row applies to whatever `apiRef.getSelection()` reports.
 *
 * The desktop pill preserves the selection with `onMouseDown` +
 * `preventDefault()`. That trick has nothing to preserve on touch: there is no
 * mousedown before a touch selection settles, and preventing a synthesized
 * mouse event does not hold a native one. So these are ordinary buttons, and
 * the editor keeps the selection in its own state across the blur.
 *
 * `kind` is the argument to the imperative API; `action` says which method.
 */
export const EDITOR_FORMAT_CONTROLS = Object.freeze([
  { id: "bold", action: "emphasis", kind: "bold", label: "Bold", glyph: "format_bold" },
  { id: "italic", action: "emphasis", kind: "italic", label: "Italic", glyph: "format_italic" },
  { id: "underline", action: "emphasis", kind: "underline", label: "Underline", glyph: "format_underlined" },
  { id: "upper", action: "case", kind: "upper", label: "UPPERCASE", text: "AA" },
  { id: "lower", action: "case", kind: "lower", label: "lowercase", text: "aa" },
  { id: "centered", action: "centered", kind: null, label: "Centre line", glyph: "format_align_center" },
]);

/*
 * D5 — every desktop rail becomes a bottom sheet, summoned one at a time from
 * the overflow. This list is the editor's whole "what else can I do?" surface,
 * so an item that is not built yet is *absent*, never present-and-inert: a menu
 * entry that does nothing is the placeholder dead end §2.8 forbids.
 *
 * Built here (Phase 3 bullet 2): the writing-surface controls and the two exits.
 * Bullet 4 adds Navigator, Corkboard, Comments, People, Reports, Outline notes,
 * Title page and Version history — each a `ckm-bottom-sheet`, each appended to
 * this array with its own `capability` guard.
 *
 * Descriptors only: which items exist, and what each one says. The handlers are
 * attached by the screen, keyed on `id`. That split is what keeps this function
 * a pure policy decision that a unit test can read.
 */
export function buildEditorOverflowItems({
  canEditContent = false,
  canImport = false,
  isScreenplayFormat = false,
  screenplayEnabled = false,
  hasFullAccess = false,
  competitionMode = false,
  exporting = false,
} = {}) {
  const items = [];

  if (canImport) {
    items.push({
      id: "import",
      label: "Import a script",
      hint: "Fountain, Final Draft, PDF or Word",
      icon: "file_upload",
    });
  }

  items.push({
    id: "export",
    label: "Export",
    hint: exporting ? "Preparing your file…" : "PDF, Fountain or Final Draft",
    icon: "file_download",
    disabled: exporting,
  });

  // Only offered where it is real: prose mode exists for book formats, and the
  // toggle is meaningless — and destructive-looking — on a screenplay-only one.
  if (isScreenplayFormat && canEditContent) {
    items.push({
      id: "prose",
      label: screenplayEnabled ? "Switch to rich text" : "Switch to screenplay",
      hint: screenplayEnabled ? "Write as prose instead" : "Back to screenplay formatting",
      icon: screenplayEnabled ? "notes" : "movie",
    });
  }

  // A competition entry is written, submitted and judged — it never goes
  // through the publish wizard, so offering its first step is a dead end.
  if (hasFullAccess && !competitionMode) {
    items.push({
      id: "continue",
      label: "Continue to details",
      hint: "Genre, cast, pricing and publishing",
      icon: "arrow_forward",
    });
  }

  return items;
}

/*
 * The save state as one value, because the three states are mutually exclusive
 * and rendering them from three booleans is how "Saving…" and "Saved" end up on
 * screen at the same time.
 */
export function describeSaveState({ saving = false, saved = false, lastSaved = null } = {}) {
  if (saving) return { state: "saving", label: "Saving…" };
  if (saved) {
    const at = lastSaved instanceof Date && !Number.isNaN(lastSaved.getTime())
      ? lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    return { state: "saved", label: at ? `Saved ${at}` : "Saved" };
  }
  return { state: "unsaved", label: "Unsaved changes" };
}
