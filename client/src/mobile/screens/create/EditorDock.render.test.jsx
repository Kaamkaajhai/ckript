// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorDock from "./EditorDock";
import { EDITOR_DOCK_TAB, EDITOR_ELEMENT_CHIPS, EDITOR_FORMAT_CONTROLS } from "./editorChrome";

/*
 * The docked bar is the one control surface a phone screenwriter uses on every
 * line, so this file is about the properties that would make it unusable rather
 * than merely ugly:
 *
 *   • ONE bar. The approved wireframe (frame B) is explicit that Elements and
 *     Format share a row with a switch. Two stacked bars would take about 110px
 *     of the ~260px of script left once the keyboard is up, and "someone will
 *     notice in review" is not a test.
 *   • the current element is announced, not just coloured. A writer who cannot
 *     see the fill still has to know whether the next line is dialogue.
 *   • the format controls reach the editor's imperative API with the right
 *     method and argument (D4). Wiring "underline" to applyCase is the kind of
 *     mistake that reads correctly and destroys a page.
 *   • read-only really is read-only. A commenter or viewer tapping Scene must
 *     not be offered a control that silently does nothing.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const render = (props = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter>
        <div className="ckm">
          <EditorDock {...props} />
        </div>
      </MemoryRouter>
    );
  });
};

const buttons = () => Array.from(container.querySelectorAll("button"));

/*
 * The accessible name, not the text content. Every glyph here is an `aria-hidden`
 * Icon whose text content is the ligature name ("movie", "format_bold"), so
 * matching on textContent would both fail and quietly stop checking that the
 * decoration is hidden in the first place.
 */
const accessibleName = (el) => {
  const label = el.getAttribute("aria-label");
  if (label) return label.trim();
  const clone = el.cloneNode(true);
  for (const hidden of clone.querySelectorAll("[aria-hidden='true']")) hidden.remove();
  return clone.textContent.trim();
};

const named = (name) => buttons().find((b) => accessibleName(b) === name);
const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

beforeEach(() => { vi.restoreAllMocks(); });

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("EditorDock — one bar", () => {
  it("renders a single dock row, not one per tab", () => {
    render();
    expect(container.querySelectorAll(".ckm-editor__dock-row")).toHaveLength(1);
    expect(container.querySelectorAll(".ckm-editor__dock-track")).toHaveLength(1);
  });

  it("offers both toolbar modes and marks the active one pressed", () => {
    render({ tab: EDITOR_DOCK_TAB.ELEMENTS });
    expect(named("Elements").getAttribute("aria-pressed")).toBe("true");
    expect(named("Format").getAttribute("aria-pressed")).toBe("false");
  });

  it("shows elements OR formats, never both at once", () => {
    render({ tab: EDITOR_DOCK_TAB.ELEMENTS });
    expect(named("Scene")).toBeTruthy();
    expect(named("Bold")).toBeFalsy();

    act(() => root.unmount());
    container.remove();

    render({ tab: EDITOR_DOCK_TAB.FORMAT });
    expect(named("Bold")).toBeTruthy();
    expect(named("Scene")).toBeFalsy();
  });

  it("asks the caller to change tab rather than changing it itself", () => {
    const onTabChange = vi.fn();
    render({ tab: EDITOR_DOCK_TAB.ELEMENTS, onTabChange });
    click(named("Format"));
    expect(onTabChange).toHaveBeenCalledWith(EDITOR_DOCK_TAB.FORMAT);
  });
});

describe("EditorDock — elements", () => {
  it("carries every core element the shared engine defines", () => {
    render();
    for (const chip of EDITOR_ELEMENT_CHIPS) expect(named(chip.label)).toBeTruthy();
    expect(EDITOR_ELEMENT_CHIPS.length).toBe(6);
  });

  it("announces the current element as pressed, and only that one", () => {
    render({ currentElement: "dialogue" });
    const pressed = container.querySelectorAll(".ckm-editor__dock-chip[aria-pressed='true']");
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toContain("Dialogue");
  });

  it("reports the chosen element by its engine value, not its label", () => {
    const onSelectElement = vi.fn();
    render({ onSelectElement });
    click(named("Paren."));
    expect(onSelectElement).toHaveBeenCalledWith("parenthetical");
  });

  it("opens the rarer elements in a sheet rather than crowding the row", () => {
    render();
    const more = named("More");
    expect(more.getAttribute("aria-haspopup")).toBe("dialog");
    expect(more.getAttribute("aria-expanded")).toBe("false");
    click(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.textContent).toContain("New Act");
  });

  it("selects a rare element through the same callback", () => {
    const onSelectElement = vi.fn();
    render({ onSelectElement });
    click(named("More"));
    const lyrics = Array.from(document.querySelectorAll(".ckm-action-sheet__action"))
      .find((el) => el.textContent.includes("Lyrics"));
    click(lyrics);
    expect(onSelectElement).toHaveBeenCalledWith("lyrics");
  });
});

describe("EditorDock — formatting (D4)", () => {
  it("passes the API method and argument through untouched", () => {
    const onFormat = vi.fn();
    render({ tab: EDITOR_DOCK_TAB.FORMAT, onFormat });

    click(named("Bold"));
    expect(onFormat).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: "emphasis", kind: "bold" }),
    );

    click(named("UPPERCASE"));
    expect(onFormat).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: "case", kind: "upper" }),
    );

    click(named("Centre line"));
    expect(onFormat).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: "centered" }),
    );
  });

  it("reflects the editor's reported emphasis state", () => {
    render({
      tab: EDITOR_DOCK_TAB.FORMAT,
      emphasis: { active: ["italic"], centered: true, hasSelection: true },
    });
    expect(named("Italic").getAttribute("aria-pressed")).toBe("true");
    expect(named("Bold").getAttribute("aria-pressed")).toBe("false");
    expect(named("Centre line").getAttribute("aria-pressed")).toBe("true");
  });

  it("does not claim a toggle state for a one-way transformation", () => {
    render({ tab: EDITOR_DOCK_TAB.FORMAT });
    // "UPPERCASE" changes the text; there is no state of being uppercase to
    // report, and aria-pressed="false" would tell a screen reader there is.
    expect(named("UPPERCASE").hasAttribute("aria-pressed")).toBe(false);
    expect(named("lowercase").hasAttribute("aria-pressed")).toBe(false);
  });

  it("gives every icon-only control a name", () => {
    render({ tab: EDITOR_DOCK_TAB.FORMAT });
    for (const control of EDITOR_FORMAT_CONTROLS) expect(named(control.label)).toBeTruthy();
  });
});

describe("EditorDock — read-only", () => {
  it("disables every writing control for a commenter or viewer", () => {
    render({ readOnly: true });
    const enabled = Array.from(container.querySelectorAll(".ckm-editor__dock-chip"))
      .filter((b) => !b.disabled);
    expect(enabled).toEqual([]);
  });

  it("still lets a read-only user switch to the Format tab", () => {
    // The tabs are navigation within the bar, not an edit. Disabling them would
    // hide the fact that formatting exists at all.
    render({ readOnly: true });
    expect(named("Format").disabled).toBe(false);
  });
});
