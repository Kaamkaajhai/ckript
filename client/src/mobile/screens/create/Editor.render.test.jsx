// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectContext } from "../../../pages/CreateProject/CreateProjectContext";
import Editor from "./Editor";

/*
 * The mobile editor is CHROME over shared state, so what is worth testing here
 * is exactly the seam: does the chrome read the orchestrator honestly, and does
 * it hand the writer's intent back without inventing behaviour of its own.
 *
 * The heavy dependencies are stubbed on purpose. CodeMirror and TipTap have
 * their own suites (components/screenplay/*.test.js is 4,500 lines of them);
 * mounting them here would test someone else's code slowly and tell us nothing
 * about whether "Discard & exit" is wired to the right handler.
 */

vi.mock("../../../components/screenplay/ScreenplayEditor", () => ({
  default: (props) => <div data-testid="screenplay-editor" data-readonly={String(props.readOnly)} />,
}));
vi.mock("../../../components/screenplay/ScreenplayFocusMode", () => ({
  TitlePageSheet: () => <div data-testid="title-page-sheet" />,
}));
vi.mock("@tiptap/react", () => ({
  EditorContent: () => <div data-testid="prose-editor" />,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

/*
 * A faithful slice of CreateProjectContext: only the keys this chrome reads, so
 * a key the chrome starts reading without anyone noticing shows up here as an
 * `undefined` rather than silently inheriting a desktop default.
 */
const baseContext = (overrides = {}) => ({
  canEditContent: true,
  collabLocks: {},
  collabMyUserId: "me",
  collabRequestEdit: vi.fn(),
  competitionMode: false,
  creationBlocked: false,
  currentElement: "action",
  dark: true,
  editor: null,
  editorZoom: 1,
  emphasisState: { active: [], centered: false, hasSelection: false },
  enforceGoldPlan: vi.fn(() => true),
  error: "",
  exiting: false,
  exportingScreenplay: null,
  focusedCommentId: null,
  handleCaretLine: vi.fn(),
  handleExitEditor: vi.fn(),
  handleExportScreenplay: vi.fn(),
  handleImportScreenplayFile: vi.fn(),
  handleNext: vi.fn(),
  handleScreenplayChange: vi.fn(),
  hasFullAccess: true,
  importNotice: "",
  isScreenplayFormat: true,
  lastSaved: null,
  saved: false,
  saving: false,
  sceneComments: [],
  screenplayApiRef: { current: { setElementType: vi.fn(), applyEmphasis: vi.fn(), applyCase: vi.fn(), applyCentered: vi.fn() } },
  screenplayEnabled: true,
  screenplayFileInputRef: { current: null },
  screenplayValue: "",
  setCurrentElement: vi.fn(),
  setEmphasisState: vi.fn(),
  setError: vi.fn(),
  setScreenplayEnabled: vi.fn(),
  setShowExitConfirm: vi.fn(),
  setShowTitlePageModal: vi.fn(),
  setTitle: vi.fn(),
  setSaved: vi.fn(),
  showExitConfirm: false,
  title: "",
  titlePage: {},
  titlePageActive: false,
  useScreenplayEditor: true,
  confirmExitDiscard: vi.fn(),
  confirmExitSaveDraft: vi.fn(),
  pendingRecovery: null,
  acceptPendingRecovery: vi.fn(),
  dismissPendingRecovery: vi.fn(),
  ...overrides,
});

const render = (ctx) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter>
        <div className="ckm">
          <CreateProjectContext.Provider value={ctx}>
            <Editor />
          </CreateProjectContext.Provider>
        </div>
      </MemoryRouter>
    );
  });
};

const accessibleName = (el) => {
  const label = el.getAttribute("aria-label");
  if (label) return label.trim();
  const clone = el.cloneNode(true);
  for (const hidden of clone.querySelectorAll("[aria-hidden='true']")) hidden.remove();
  return clone.textContent.trim();
};

/*
 * Searched across the whole document, because every overlay portals out of the
 * container. An action-sheet row's name is its label, not label + hint: the hint
 * is a second line of the same control, and matching the concatenation would
 * make these tests break every time a hint is reworded.
 */
const control = (name) => Array.from(document.querySelectorAll("button, a")).find((el) => {
  const label = el.querySelector(".ckm-action-sheet__label");
  if (label) return label.textContent.trim() === name;
  return accessibleName(el) === name;
});

const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

/* React tracks an input's value on the node, so assigning `.value` directly is
   invisible to it. The prototype setter is the documented way in. */
const type = (input, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")
    .set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

beforeEach(() => { vi.clearAllMocks(); });

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Editor — the shell contract (D2)", () => {
  it("is an immersive surface that keeps both chrome slots", () => {
    render(baseContext());
    const shell = container.querySelector(".ckm-shell");
    expect(shell.getAttribute("data-shell-mode")).toBe("immersive");
    // The override is published in the DOM, so "why does an immersive screen
    // have bars?" is answerable without reading the screen's source.
    expect(shell.getAttribute("data-shell-slots")).toBe("appBar bottomNav");
    expect(container.querySelector(".ckm-shell__app-bar")).toBeTruthy();
    expect(container.querySelector(".ckm-shell__bottom")).toBeTruthy();
  });

  it("renders exactly one shell and one scroll surface", () => {
    render(baseContext());
    expect(container.querySelectorAll(".ckm-shell")).toHaveLength(1);
    expect(container.querySelectorAll(".ckm-shell__scroll")).toHaveLength(1);
  });
});

describe("Editor — the editor itself (D1)", () => {
  it("mounts the shared ScreenplayEditor rather than a mobile fork", () => {
    render(baseContext());
    expect(container.querySelector("[data-testid='screenplay-editor']")).toBeTruthy();
    expect(container.querySelector("[data-testid='prose-editor']")).toBeFalsy();
  });

  it("passes the collaborator's read-only state through to the engine", () => {
    render(baseContext({ canEditContent: false }));
    expect(container.querySelector("[data-testid='screenplay-editor']").dataset.readonly).toBe("true");
  });

  it("mounts the prose editor and hides the element bar in book mode", () => {
    render(baseContext({ useScreenplayEditor: false }));
    expect(container.querySelector("[data-testid='prose-editor']")).toBeTruthy();
    // The dock is a screenplay-element bar. Prose has no scene headings, so the
    // shell's bottom slot is genuinely empty rather than a bar of dead chips.
    expect(container.querySelector(".ckm-editor__dock")).toBeFalsy();
  });

  it("shows the title page as its own sheet when one is configured", () => {
    render(baseContext({ titlePageActive: true }));
    expect(container.querySelector("[data-testid='title-page-sheet']")).toBeTruthy();
  });
});

describe("Editor — save state", () => {
  it("reports one state at a time, never Saving and Saved together", () => {
    render(baseContext({ saving: true, saved: true }));
    const status = container.querySelector(".ckm-editor__bar-save");
    expect(status.textContent).toContain("Saving…");
    expect(status.textContent).not.toContain("Saved");
  });

  it("names the time of the last save so the writer can trust it", () => {
    const at = new Date(2026, 7, 9, 14, 32);
    render(baseContext({ saved: true, lastSaved: at }));
    expect(container.querySelector(".ckm-editor__bar-save").textContent)
      .toContain(at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  });

  it("announces politely — a save is a status, not an interruption", () => {
    render(baseContext());
    const status = container.querySelector(".ckm-editor__bar-save");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });
});

describe("Editor — the title field", () => {
  it("marks the draft dirty as well as setting the title", () => {
    // setSaved(false) is what tells the autosave loop the signature moved. A
    // title typed and then abandoned is otherwise lost.
    const ctx = baseContext();
    render(ctx);
    type(container.querySelector(".ckm-editor__bar-title"), "The Last Scene");
    expect(ctx.setTitle).toHaveBeenCalledWith("The Last Scene");
    expect(ctx.setSaved).toHaveBeenCalledWith(false);
  });

  it("is not editable by someone without content access", () => {
    render(baseContext({ canEditContent: false }));
    expect(container.querySelector(".ckm-editor__bar-title").readOnly).toBe(true);
  });
});

describe("Editor — unsaved-change protection", () => {
  it("asks the orchestrator to run its exit guard rather than leaving on its own", () => {
    const ctx = baseContext();
    render(ctx);
    click(control("Exit the editor"));
    expect(ctx.handleExitEditor).toHaveBeenCalled();
  });

  it("offers three outcomes, with discard separated as destructive", () => {
    render(baseContext({ showExitConfirm: true }));
    expect(control("Save as draft & exit")).toBeTruthy();
    expect(control("Keep editing")).toBeTruthy();
    const discard = control("Discard & exit");
    expect(discard.className).toContain("ckm-action-sheet__action--destructive");
  });

  it("saves as a draft through the shared handler", () => {
    const ctx = baseContext({ showExitConfirm: true });
    render(ctx);
    click(control("Save as draft & exit"));
    expect(ctx.confirmExitSaveDraft).toHaveBeenCalled();
  });

  it("does not discard on the first tap — it confirms first", () => {
    const ctx = baseContext({ showExitConfirm: true });
    render(ctx);
    click(control("Discard & exit"));
    expect(ctx.confirmExitDiscard).not.toHaveBeenCalled();

    const dialog = document.querySelector(".ckm-confirm");
    expect(dialog).toBeTruthy();
    expect(dialog.closest("[role='alertdialog']")).toBeTruthy();

    click(Array.from(dialog.querySelectorAll("button"))
      .find((b) => accessibleName(b) === "Discard & exit"));
    expect(ctx.confirmExitDiscard).toHaveBeenCalled();
  });

  it("blocks both exits while a save is already in flight", () => {
    render(baseContext({ showExitConfirm: true, exiting: true }));
    expect(control("Discard & exit").disabled).toBe(true);
    expect(control("Saving…").disabled).toBe(true);
  });
});

describe("Editor — save/resume recovery (D7)", () => {
  const recovery = { updatedAt: new Date(2026, 7, 8, 21, 5).toISOString() };

  it("offers the local snapshot instead of applying it", () => {
    render(baseContext({ pendingRecovery: recovery }));
    expect(control("Restore my changes")).toBeTruthy();
    expect(control("Keep the saved version")).toBeTruthy();
  });

  it("dates the snapshot, because 'unsaved changes' alone is not a choice", () => {
    render(baseContext({ pendingRecovery: recovery }));
    expect(container.querySelector(".ckm-editor__notice").textContent).toContain("2026");
  });

  it("routes both answers to the shared decision handlers", () => {
    const ctx = baseContext({ pendingRecovery: recovery });
    render(ctx);
    click(control("Restore my changes"));
    expect(ctx.acceptPendingRecovery).toHaveBeenCalled();
    click(control("Keep the saved version"));
    expect(ctx.dismissPendingRecovery).toHaveBeenCalled();
  });

  it("keeps notices in the fixed chrome, not in the scrolling script", () => {
    // A plan limit or a failed save that scrolls away is one the writer never
    // sees again.
    render(baseContext({ pendingRecovery: recovery, error: "Could not save." }));
    const appBar = container.querySelector(".ckm-shell__app-bar");
    expect(appBar.querySelectorAll(".ckm-editor__notice").length).toBe(2);
    expect(container.querySelector(".ckm-shell__scroll .ckm-editor__notice")).toBeFalsy();
  });
});

describe("Editor — the overflow (D5)", () => {
  const openOverflow = () => click(control("More editor actions"));

  it("offers export, and hands the format choice to a second sheet", () => {
    const ctx = baseContext();
    render(ctx);
    openOverflow();
    click(control("Export"));
    click(control("Final Draft (.fdx)"));
    expect(ctx.handleExportScreenplay).toHaveBeenCalledWith("fdx");
  });

  it("gates import behind the plan check the desktop editor uses", () => {
    const ctx = baseContext({ enforceGoldPlan: vi.fn(() => false) });
    const clickSpy = vi.fn();
    ctx.screenplayFileInputRef = { current: { click: clickSpy } };
    render(ctx);
    openOverflow();
    click(control("Import a script"));
    expect(ctx.enforceGoldPlan).toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("does not offer the publish wizard to a competition entry", () => {
    // A competition entry is written, submitted and judged — it never goes
    // through publishing, so the step would be a dead end.
    render(baseContext({ competitionMode: true }));
    openOverflow();
    expect(control("Continue to details")).toBeFalsy();
  });

  it("does not offer the publish wizard to a content-only collaborator", () => {
    render(baseContext({ hasFullAccess: false }));
    openOverflow();
    expect(control("Continue to details")).toBeFalsy();
  });

  it("continues into the wizard through the orchestrator's own handler", () => {
    const ctx = baseContext();
    render(ctx);
    openOverflow();
    click(control("Continue to details"));
    expect(ctx.handleNext).toHaveBeenCalled();
  });
});

describe("Editor — the dock is wired to the engine", () => {
  it("sets the element type through the imperative API", () => {
    const ctx = baseContext();
    render(ctx);
    click(control("Character"));
    expect(ctx.screenplayApiRef.current.setElementType).toHaveBeenCalledWith("character");
  });

  it("maps each format control to its own API method (D4)", () => {
    const ctx = baseContext();
    render(ctx);
    click(control("Format"));

    click(control("Bold"));
    expect(ctx.screenplayApiRef.current.applyEmphasis).toHaveBeenCalledWith("bold");

    click(control("lowercase"));
    expect(ctx.screenplayApiRef.current.applyCase).toHaveBeenCalledWith("lower");

    click(control("Centre line"));
    expect(ctx.screenplayApiRef.current.applyCentered).toHaveBeenCalled();
  });

  it("survives an editor that has not mounted its API yet", () => {
    const ctx = baseContext({ screenplayApiRef: { current: null } });
    render(ctx);
    expect(() => click(control("Scene"))).not.toThrow();
  });
});
