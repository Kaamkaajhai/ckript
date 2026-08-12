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
/* PeopleDialog reads through the SHARED `useCollaborators` hook, so the seam to
   stub is the service, not the component — which is also what makes these tests
   prove the mobile surface really goes through the same four endpoints. */
const { collabApi, reportDownload } = vi.hoisted(() => ({
  collabApi: { get: vi.fn(), patch: vi.fn(), delete: vi.fn(), post: vi.fn() },
  reportDownload: vi.fn(),
}));
vi.mock("../../../services/api", () => ({ default: collabApi }));
vi.mock("../../../components/screenplay/screenplayReportExport", () => ({
  downloadScreenplayReport: reportDownload,
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
  screenplayApiRef: { current: { setElementType: vi.fn(), applyEmphasis: vi.fn(), applyCase: vi.fn(), applyCentered: vi.fn(), scrollToLine: vi.fn() } },
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
  sceneSynopses: {},
  handleSynopsisChange: vi.fn(),
  handleReorderScene: vi.fn(),
  presenceBySceneId: {},
  outlineWithSceneIds: [],
  presenceEnabled: true,
  canComment: true,
  handleAddComment: vi.fn(async () => true),
  handleReplyComment: vi.fn(),
  handleFocusComment: vi.fn(),
  setCommentResolved: vi.fn(),
  deleteSceneComment: vi.fn(),
  isCommentOrphaned: vi.fn(() => false),
  collabPeople: [],
  scriptId: "s1",
  setScreenplayValue: vi.fn(),
  ...overrides,
});

/* Two scenes and a title block, so the board has something to reorder and the
   frontmatter that must never become a card is present. */
const SCRIPT = [
  "Title: The Board",
  "",
  "INT. KITCHEN - DAY",
  "",
  "Ana burns the toast.",
  "",
  "EXT. STREET - NIGHT",
  "",
  "She walks.",
].join("\n");

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

describe("Editor — Scene cards (D15)", () => {
  const openCards = (ctx) => {
    render(ctx);
    click(control("More editor actions"));
    click(control("Scene cards"));
  };

  it("offers Scene cards in the overflow, and opens the board as a DIALOG not a sheet", () => {
    openCards(baseContext({ screenplayValue: SCRIPT }));
    const dialog = document.querySelector(".ckm-dialog");
    expect(dialog).toBeTruthy();
    // The distinction is the whole of D15, so it is asserted rather than assumed:
    // a bottom sheet cannot cover the frame, and this surface must.
    expect(document.querySelector(".ckm-bottom-sheet")).toBeFalsy();
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(document.querySelector(".ckm-dialog__title").textContent).toBe("Scene cards");
  });

  it("draws one card per scene and never a card for the title block", () => {
    openCards(baseContext({ screenplayValue: SCRIPT }));
    const headings = Array.from(document.querySelectorAll('[data-cork-control="heading"]'));
    expect(headings.map((el) => el.textContent)).toEqual([
      "INT. KITCHEN - DAY",
      "EXT. STREET - NIGHT",
    ]);
  });

  it("hands a reorder to the orchestrator's shared handler, not to a mobile copy", () => {
    const ctx = baseContext({ screenplayValue: SCRIPT });
    openCards(ctx);
    click(document.querySelector('[data-cork-index="0"][data-cork-control="down"]'));
    expect(ctx.handleReorderScene).toHaveBeenCalledWith(0, 1);
  });

  it("carries the accessible reorder path onto the phone (DEF-3), which is why it can be here at all", () => {
    openCards(baseContext({ screenplayValue: SCRIPT }));
    // Touch fires no drag events, so these three ARE the mobile reorder path.
    expect(document.querySelector('[data-cork-index="0"][data-cork-control="down"]')).toBeTruthy();
    expect(document.querySelector('[data-cork-index="1"][data-cork-control="up"]')).toBeTruthy();
    expect(document.querySelector('[data-cork-index="1"][data-cork-control="position"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="corkboard-announcer"]')).toBeTruthy();
  });

  it("edits a synopsis through the shared handler", () => {
    const ctx = baseContext({ screenplayValue: SCRIPT });
    openCards(ctx);
    const textarea = document.querySelector(".ckm-editor__cards textarea");
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")
        .set.call(textarea, "Ana ruins breakfast.");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(ctx.handleSynopsisChange).toHaveBeenCalledWith("INT. KITCHEN - DAY", "Ana ruins breakfast.");
  });

  it("closes the board FIRST, then scrolls the page to the scene", async () => {
    const ctx = baseContext({ screenplayValue: SCRIPT });
    ctx.screenplayApiRef.current.scrollToLine = vi.fn();
    openCards(ctx);
    click(document.querySelector('[data-cork-index="1"][data-cork-control="heading"]'));

    // The ordering is the assertion, not decoration: moving the caret under a
    // surface the writer is still looking at is the bug it exists to avoid. If
    // the scroll were inline it would already have run by now.
    expect(ctx.screenplayApiRef.current.scrollToLine).not.toHaveBeenCalled();

    await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)); });
    // Line 7 is EXT. STREET - NIGHT's slugline in SCRIPT — the scene's own start,
    // not the card's index.
    expect(ctx.screenplayApiRef.current.scrollToLine).toHaveBeenCalledWith(7);
  });

  it("keeps the board out of prose mode, where a book format has no sluglines", () => {
    render(baseContext({ useScreenplayEditor: false, screenplayEnabled: false, screenplayValue: SCRIPT }));
    click(control("More editor actions"));
    expect(control("Scene cards")).toBeFalsy();
  });

  it("shows a read-only viewer the shape of the script, with no control that writes", () => {
    openCards(baseContext({ screenplayValue: SCRIPT, canEditContent: false }));
    expect(document.querySelectorAll('[data-cork-control="heading"]')).toHaveLength(2);
    expect(document.querySelector('[data-cork-control="down"]')).toBeFalsy();
    expect(document.querySelector(".ckm-editor__cards textarea").disabled).toBe(true);
  });

  it("says so rather than drawing an empty grid when there are no scenes yet", () => {
    openCards(baseContext({ screenplayValue: "Just some notes, no slugline yet." }));
    expect(document.querySelector(".ckm-dialog__body").textContent)
      .toContain("No scenes yet.");
    expect(document.querySelector('[data-cork-control="heading"]')).toBeFalsy();
  });

  it("neutralises the desktop page padding and the nested scroller it would create", () => {
    openCards(baseContext({ screenplayValue: SCRIPT }));
    // The seam D15 depends on: the host owns a class, and the mobile stylesheet
    // corrects the two Tailwind utilities on it instead of reaching through them.
    expect(document.querySelector(".ckm-editor__cards")).toBeTruthy();
    expect(document.querySelector(".ckm-dialog__body.ckm-editor__cards-body")).toBeTruthy();
  });
});

describe("Editor — the Navigator (D16)", () => {
  const NAV_SCRIPT = [
    "# ACT ONE",
    "",
    "INT. KITCHEN - DAY",
    "",
    "Ana burns the toast.",
    "",
    "EXT. STREET - NIGHT",
    "",
    "She walks.",
  ].join("\n");

  const navOutline = () => [
    { type: "sequence", line: 1, text: "ACT ONE" },
    { type: "scene", line: 3, text: "INT. KITCHEN - DAY", sceneId: "scene:0:INT. KITCHEN - DAY" },
    { type: "scene", line: 7, text: "EXT. STREET - NIGHT", sceneId: "scene:1:EXT. STREET - NIGHT" },
  ];

  const openNavigator = (overrides = {}) => {
    const ctx = baseContext({
      screenplayValue: NAV_SCRIPT,
      outlineWithSceneIds: navOutline(),
      ...overrides,
    });
    ctx.screenplayApiRef.current.scrollToLine = vi.fn();
    render(ctx);
    click(control("More editor actions"));
    click(control("Navigator"));
    return ctx;
  };

  it("opens as a SHEET, not a dialog — the contrast with Scene cards is the point of D15/D16", () => {
    openNavigator();
    expect(document.querySelector(".ckm-bottom-sheet")).toBeTruthy();
    expect(document.querySelector(".ckm-dialog")).toBeFalsy();
    expect(document.querySelector(".ckm-bottom-sheet__title").textContent).toBe("Navigator");
  });

  it("lists scenes and sequence headings as real tabs over real lists", () => {
    openNavigator();
    const tablist = document.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    expect(Array.from(tablist.querySelectorAll('[role="tab"]')).map((t) => t.textContent))
      .toEqual(["Scenes (2)", "Pages (1)"]);
    const rows = document.querySelectorAll('[role="tabpanel"] .ckm-row__title');
    expect(Array.from(rows).map((r) => r.textContent))
      .toEqual(["ACT ONE", "INT. KITCHEN - DAY", "EXT. STREET - NIGHT"]);
  });

  it("closes FIRST, then scrolls the editor to the tapped scene's line", async () => {
    const ctx = openNavigator();
    const row = Array.from(document.querySelectorAll('.ckm-row__title'))
      .find((r) => r.textContent === "EXT. STREET - NIGHT")
      .closest("button, a, .ckm-row");
    click(row.querySelector("button") || row);
    expect(ctx.screenplayApiRef.current.scrollToLine).not.toHaveBeenCalled();
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)); });
    expect(ctx.screenplayApiRef.current.scrollToLine).toHaveBeenCalledWith(7);
  });

  it("says a lock in TEXT, not only as a coloured glyph", () => {
    openNavigator({
      collabMyUserId: "me",
      collabLocks: { "scene:1:EXT. STREET - NIGHT": { holderId: "other", holderName: "Ravi", color: "#c46a3f" } },
    });
    expect(document.querySelector('[role="tabpanel"]').textContent).toContain("Locked by Ravi");
  });

  it("opens the title-page configurator from the Pages tab — the only way in when there is no title page (DEF-13)", async () => {
    const ctx = openNavigator({ titlePageActive: false });
    click(document.querySelectorAll('[role="tab"]')[1]);
    const add = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "Add a title page");
    expect(add).toBeTruthy();
    click(add);
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)); });
    expect(ctx.setShowTitlePageModal).toHaveBeenCalledWith(true);
  });

  it("says Edit, and lists the title page as a row, once the script has one", () => {
    openNavigator({ titlePageActive: true });
    click(document.querySelectorAll('[role="tab"]')[1]);
    expect(Array.from(document.querySelectorAll("button")).some((b) => b.textContent.trim() === "Edit title page")).toBe(true);
    expect(Array.from(document.querySelectorAll(".ckm-row__title")).map((r) => r.textContent))
      .toContain("Title page");
  });

  it("keeps the Navigator out of prose mode, which has neither scenes nor screenplay pages", () => {
    render(baseContext({ useScreenplayEditor: false, screenplayEnabled: false }));
    click(control("More editor actions"));
    expect(control("Navigator")).toBeFalsy();
  });

  it("says so rather than showing an empty list when the script has no scenes", () => {
    openNavigator({ screenplayValue: "Just notes.", outlineWithSceneIds: [] });
    expect(document.querySelector('[role="tabpanel"]').textContent).toContain("No scenes yet");
  });
});

describe("Editor — Comments (D17)", () => {
  const COMMENTS = [
    { _id: "a", body: "Cut this beat", authorId: "me", authorName: "Ana", anchor: { quote: "INT. KITCHEN - DAY" } },
    { _id: "a1", parentId: "a", body: "Agreed", authorId: "u2", authorName: "Ravi" },
    { _id: "b", body: "Nice line", authorId: "u2", authorName: "Ravi", resolved: true },
  ];

  const openComments = (overrides = {}, selection = { from: 10, to: 28, text: "INT. KITCHEN - DAY" }) => {
    const ctx = baseContext({ sceneComments: COMMENTS, ...overrides });
    ctx.screenplayApiRef.current.getSelection = vi.fn(() => selection);
    render(ctx);
    click(control("More editor actions"));
    click(control("Comments"));
    return ctx;
  };

  const sheetText = () => document.querySelector(".ckm-bottom-sheet").textContent;

  it("opens as a Sheet and lists open threads with their replies", () => {
    openComments();
    expect(document.querySelector(".ckm-bottom-sheet")).toBeTruthy();
    expect(document.querySelector(".ckm-bottom-sheet__title").textContent).toBe("Comments");
    expect(sheetText()).toContain("Cut this beat");
    expect(sheetText()).toContain("Agreed");
    // Resolved threads are behind the filter, not in the open list.
    expect(sheetText()).not.toContain("Nice line");
  });

  it("carries the open-thread count on the overflow item, so it is visible without opening", () => {
    const ctx = baseContext({ sceneComments: COMMENTS });
    render(ctx);
    click(control("More editor actions"));
    const row = control("Comments").closest(".ckm-action-sheet__item") || control("Comments");
    // One OPEN thread; the reply and the resolved thread are not things to look at.
    expect(row.textContent).toContain("1 open note");
  });

  it("captures the selection when the sheet OPENS and passes it explicitly (the whole of D17)", async () => {
    const selection = { from: 10, to: 28, text: "INT. KITCHEN - DAY" };
    const ctx = openComments({}, selection);
    expect(ctx.screenplayApiRef.current.getSelection).toHaveBeenCalled();
    // The quote is shown, because behind a modal sheet the highlighted text is
    // not visible and the writer would be annotating something they cannot see.
    expect(sheetText()).toContain("INT. KITCHEN - DAY");

    const textarea = Array.from(document.querySelectorAll("textarea"))
      .find((t) => t.placeholder === "What should change here?");
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(textarea, "Trim it");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { click(control("Comment")); });

    // Explicitly, NOT left to getSelection() at submit time — by then the editor
    // has been blurred and inerted by the sheet.
    expect(ctx.handleAddComment).toHaveBeenCalledWith("Trim it", selection);
  });

  it("refuses BEFORE the typing when nothing is selected, rather than after", () => {
    openComments({}, null);
    expect(sheetText()).toMatch(/Select some script text first/i);
    expect(Array.from(document.querySelectorAll("textarea"))
      .find((t) => t.placeholder === "What should change here?")).toBeFalsy();
  });

  it("tells a view-only collaborator why, and still shows them the notes", () => {
    openComments({ canComment: false });
    expect(sheetText()).toMatch(/view-only/i);
    expect(sheetText()).toContain("Cut this beat");
    expect(control("Reply")).toBeFalsy();
  });

  it("resolves and reopens through the orchestrator's own handler", () => {
    const ctx = openComments();
    click(control("Resolve"));
    expect(ctx.setCommentResolved).toHaveBeenCalledWith("a", true);
  });

  it("asks before deleting, and only deletes on the second press", () => {
    const ctx = openComments();
    click(control("Delete"));
    expect(ctx.deleteSceneComment).not.toHaveBeenCalled();
    expect(sheetText()).toContain("Delete this comment?");
    click(control("Delete it"));
    expect(ctx.deleteSceneComment).toHaveBeenCalledWith("a");
  });

  it("offers delete only on my own comments", () => {
    openComments({ collabMyUserId: "u2" });
    // "Cut this beat" is Ana's; as Ravi I may resolve it but not delete it.
    expect(control("Delete")).toBeFalsy();
    expect(control("Resolve")).toBeTruthy();
  });

  it("shows an orphaned note rather than hiding it", () => {
    openComments({ isCommentOrphaned: vi.fn((c) => c._id === "a") });
    expect(sheetText()).toMatch(/Orphaned/);
    expect(sheetText()).toContain("Cut this beat");
  });

  it("closes FIRST, then jumps to the text a note is about", async () => {
    const ctx = openComments();
    const jump = document.querySelector(".ckm-editor__comments-jump");
    click(jump);
    expect(ctx.handleFocusComment).not.toHaveBeenCalled();
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)); });
    expect(ctx.handleFocusComment).toHaveBeenCalledWith(expect.objectContaining({ _id: "a" }));
  });

  it("has no Comments entry at all on a draft that was never saved", () => {
    // presenceEnabled is `useScreenplayEditor && Boolean(scriptId)` upstream, and
    // it is what the comment FETCH is gated on — an unsaved draft has no script
    // to hang notes off, so the item is absent rather than present-and-empty.
    render(baseContext({ presenceEnabled: false }));
    click(control("More editor actions"));
    expect(control("Comments")).toBeFalsy();
  });
});

describe("Editor — People (D18)", () => {
  const COLLABORATORS = {
    ownerId: "me",
    collabVisibility: "private",
    collaborators: [
      { _id: "e1", user: { _id: "u2", name: "Meher", email: "meher@example.com" }, role: "editor", accessLevel: "content_only", status: "accepted", isActive: true },
      { _id: "e2", invitedEmail: "new@example.com", role: "commenter", status: "pending", isActive: true },
    ],
  };

  const openPeople = async (overrides = {}, payload = COLLABORATORS) => {
    collabApi.get.mockResolvedValue({ data: payload });
    collabApi.delete.mockResolvedValue({ data: {} });
    collabApi.post.mockResolvedValue({ data: {} });
    const ctx = baseContext({
      collabPeople: [{ userId: "me", name: "Ana", color: "#c46a3f", state: "editing", sceneHeading: "INT. KITCHEN - DAY" }],
      ...overrides,
    });
    render(ctx);
    click(control("More editor actions"));
    click(control("People"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    return ctx;
  };

  const dialogText = () => document.querySelector(".ckm-dialog").textContent;

  it("opens as a DIALOG, not a sheet — it replaces the task, not the script", async () => {
    await openPeople();
    expect(document.querySelector(".ckm-dialog")).toBeTruthy();
    expect(document.querySelector(".ckm-bottom-sheet")).toBeFalsy();
    expect(document.querySelector(".ckm-dialog__title").textContent).toBe("People");
  });

  it("reads through the shared hook's endpoint, not a mobile copy of it", async () => {
    await openPeople();
    expect(collabApi.get).toHaveBeenCalledWith("/collab/s1/collaborators");
  });

  it("shows who is in the script now, and what they are doing", async () => {
    await openPeople();
    expect(dialogText()).toContain("Ana (you)");
    expect(dialogText()).toContain("Editing · INT. KITCHEN - DAY");
  });

  it("lists collaborators and pending invites separately, in words", async () => {
    await openPeople();
    expect(dialogText()).toContain("Meher");
    expect(dialogText()).toContain("Co-writer");
    expect(dialogText()).toContain("Content only");
    // DEF-15: an invite to an address with no Ckript account has no userId at
    // all, and the shared dedupe used to drop exactly those rows.
    expect(dialogText()).toContain("Invited, not accepted");
    expect(dialogText()).toContain("new@example.com");
  });

  it("asks before removing, and only removes on the second press (DEF-14)", async () => {
    await openPeople();
    click(control("Remove"));
    expect(collabApi.delete).not.toHaveBeenCalled();
    // The consequence is stated, not implied by a red button.
    expect(dialogText()).toMatch(/loses access to this script immediately/i);
    await act(async () => { click(control("Confirm remove")); });
    expect(collabApi.delete).toHaveBeenCalledWith("/collab/s1/collaborators/u2");
  });

  it("offers no management at all to a collaborator who is not the owner", async () => {
    await openPeople({}, { ...COLLABORATORS, ownerId: "someone-else" });
    expect(control("Remove")).toBeFalsy();
    expect(control("Cancel invite")).toBeFalsy();
    // …and says why the invite form is absent rather than just omitting it.
    expect(dialogText()).not.toContain("Invite someone");
  });

  it("sends an invitation through the shared endpoint once the address looks real", async () => {
    await openPeople();
    const email = Array.from(document.querySelectorAll("input")).find((i) => i.type === "email");
    expect(control("Send invitation").disabled).toBe(true);
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(email, "not-an-email");
      email.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(dialogText()).toMatch(/does not look like an email/i);
    expect(control("Send invitation").disabled).toBe(true);

    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(email, "ravi@example.com");
      email.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { click(control("Send invitation")); });
    expect(collabApi.post).toHaveBeenCalledWith("/collab/s1/invite", expect.objectContaining({
      email: "ravi@example.com",
      role: "editor",
    }));
  });

  it("says a saved script is needed rather than showing an empty access list", async () => {
    await openPeople({ scriptId: null });
    expect(dialogText()).toMatch(/Save this project once to invite people/i);
    expect(collabApi.get).not.toHaveBeenCalled();
  });

  it("surfaces a load failure instead of an empty list that looks like nobody", async () => {
    collabApi.get.mockRejectedValue({ response: { data: { error: "Failed to load collaborators" } } });
    const ctx = baseContext({ collabPeople: [] });
    render(ctx);
    click(control("More editor actions"));
    click(control("People"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(dialogText()).toContain("Failed to load collaborators");
  });
});

describe("Editor — the keyboard cannot bury the comment composer", () => {
  /*
   * `Sheet` pads its FOOTER by the keyboard inset; the comments composer lives
   * in the sheet BODY, so it gets no such padding. On iOS the layout viewport
   * does not shrink when the keyboard opens, which leaves the Comment button
   * under it. The spacer is the mechanism that lets the browser scroll a
   * focused field above the keyboard — a real device is still the only thing
   * that can confirm the RESULT, but this pins the mechanism.
   */
  const withVisualViewport = (coveredPx) => {
    const original = window.visualViewport;
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: window.innerHeight - coveredPx,
        offsetTop: 0,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    return () => Object.defineProperty(window, "visualViewport", { configurable: true, value: original });
  };

  it("adds no spacer when no keyboard is open, so it costs a desktop browser nothing", () => {
    const ctx = baseContext({ sceneComments: [] });
    ctx.screenplayApiRef.current.getSelection = vi.fn(() => ({ from: 0, to: 5, text: "INT. " }));
    render(ctx);
    click(control("More editor actions"));
    click(control("Comments"));
    expect(document.querySelector('[data-testid="comments-keyboard-spacer"]')).toBeFalsy();
  });

  it("ends the sheet body with a spacer as tall as the keyboard is covering", () => {
    const restore = withVisualViewport(300);
    try {
      const ctx = baseContext({ sceneComments: [] });
      ctx.screenplayApiRef.current.getSelection = vi.fn(() => ({ from: 0, to: 5, text: "INT. " }));
      render(ctx);
      click(control("More editor actions"));
      click(control("Comments"));
      const spacer = document.querySelector('[data-testid="comments-keyboard-spacer"]');
      expect(spacer).toBeTruthy();
      expect(spacer.style.height).toBe("300px");
      // Decorative: it must not become a stop for a screen reader.
      expect(spacer.getAttribute("aria-hidden")).toBe("true");
    } finally {
      restore();
    }
  });
});

describe("Editor — Reports (D20)", () => {
  const REPORT_SCRIPT = [
    "INT. KITCHEN - DAY",
    "",
    "ZARA",
    "First line.",
    "",
    "ZARA",
    "Second line.",
    "",
    "EXT. PLATFORM - NIGHT",
    "",
    "ANA",
    "Last train.",
  ].join("\n");

  const openReports = (overrides = {}) => {
    const ctx = baseContext({ title: "The Train", screenplayValue: REPORT_SCRIPT, ...overrides });
    render(ctx);
    click(control("More editor actions"));
    click(control("Reports"));
    return ctx;
  };

  const chooseTab = (id) => {
    const tab = document.querySelector(`[role="tab"][aria-controls="editor-reports-panel-${id}"]`);
    click(tab);
  };

  it("opens as a Dialog rather than squeezing the desktop rail into a sheet", () => {
    openReports();
    expect(document.querySelector(".ckm-dialog")).toBeTruthy();
    expect(document.querySelector(".ckm-bottom-sheet")).toBeFalsy();
    expect(document.querySelector(".ckm-dialog__title").textContent).toBe("Reports");
    expect(document.querySelectorAll(".ckm-editor__report-scene")).toHaveLength(2);
  });

  it("uses the APG tab family and keeps every metric labelled in the card view", () => {
    openReports();
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    expect(tabs).toHaveLength(2);
    expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
    chooseTab("characters");
    expect(document.querySelector('[role="tabpanel"]').textContent).toContain("ZARA");
    expect(document.querySelector('[role="tabpanel"]').textContent).toContain("ANA");
    expect(document.querySelector('[role="tabpanel"]').textContent).toContain("Lines");
    expect(document.querySelector('[role="tabpanel"]').textContent).toContain("Scenes");
  });

  it("sorts through a labelled native select, not desktop's tiny sort pills", () => {
    openReports();
    chooseTab("characters");
    const names = () => Array.from(document.querySelectorAll(".ckm-editor__report-name"))
      .map((node) => node.textContent);
    expect(names()).toEqual(["ZARA", "ANA"]); // most lines first

    const select = document.querySelector(".ckm-editor__report-sort select");
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")
        .set.call(select, "name:asc");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(names()).toEqual(["ANA", "ZARA"]);
    expect(select.labels[0].textContent).toContain("Sort characters");
  });

  it("downloads the active, sorted view through the shared desktop/mobile exporter", () => {
    openReports();
    chooseTab("characters");
    click(control("CSV"));
    expect(reportDownload).toHaveBeenCalledWith(expect.objectContaining({
      kind: "characters",
      format: "csv",
      title: "The Train",
      rows: [
        expect.objectContaining({ name: "ZARA", lines: 2 }),
        expect.objectContaining({ name: "ANA", lines: 1 }),
      ],
    }));
  });

  it("closes first, then jumps through the shared editor API", async () => {
    const ctx = openReports();
    click(document.querySelector(".ckm-editor__report-scene"));
    // AnimatePresence keeps the exiting surface in the DOM for its slide-out;
    // the load-bearing order is that the editor does not move in this frame.
    expect(ctx.screenplayApiRef.current.scrollToLine).not.toHaveBeenCalled();
    await act(async () => { await new Promise((resolve) => requestAnimationFrame(resolve)); });
    expect(ctx.screenplayApiRef.current.scrollToLine).toHaveBeenCalledWith(1);
  });

  it("states both empty views instead of rendering empty card stacks", () => {
    openReports({ screenplayValue: "A note without screenplay structure." });
    expect(document.querySelector(".ckm-dialog").textContent).toContain("No scenes yet");
    chooseTab("characters");
    expect(document.querySelector(".ckm-dialog").textContent).toContain("No speaking characters yet");
  });

  it("has no Reports entry in prose mode, where screenplay reports are meaningless", () => {
    render(baseContext({ useScreenplayEditor: false, screenplayEnabled: false }));
    click(control("More editor actions"));
    expect(control("Reports")).toBeFalsy();
  });
});

describe("Editor — Version history (D19)", () => {
  const VERSIONS = [
    { _id: "v1", label: "First draft", createdAt: new Date().toISOString(), authorName: "Ana", fountainSnapshot: "INT. KITCHEN - DAY\n\nAna burns the toast." },
    { _id: "v2", auto: true, createdAt: new Date().toISOString(), fountainSnapshot: "INT. KITCHEN - DAY" },
  ];
  const CURRENT = "INT. KITCHEN - DAY\n\nAna burns the toast.\n\nShe swears.";

  const openVersions = async (overrides = {}) => {
    collabApi.get.mockResolvedValue({ data: VERSIONS });
    collabApi.post.mockResolvedValue({ data: { fountainContent: "INT. KITCHEN - DAY", versions: VERSIONS } });
    const ctx = baseContext({ screenplayValue: CURRENT, ...overrides });
    render(ctx);
    click(control("More editor actions"));
    click(control("Version history"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    return ctx;
  };

  const dialogText = () => document.querySelector(".ckm-dialog").textContent;

  it("opens as a Dialog with a real role and title, which the desktop modal has neither of", async () => {
    await openVersions();
    const dialog = document.querySelector(".ckm-dialog");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(document.querySelector(".ckm-dialog__title").textContent).toBe("Version history");
  });

  it("reads through the shared hook's endpoint", async () => {
    await openVersions();
    expect(collabApi.get).toHaveBeenCalledWith("/scripts/s1/versions");
  });

  it("summarises each version in words, since the diff is a separate view", async () => {
    await openVersions();
    expect(dialogText()).toContain("First draft");
    expect(dialogText()).toContain("Auto snapshot");
    // DEF-18: one appended line is one added line, not two added and one removed.
    expect(dialogText()).toContain("1 line added since");
  });

  it("pushes the diff into its own view rather than expanding it inside a row", async () => {
    await openVersions();
    click(control("See what changed"));
    // The dialog's own title becomes the version's — this is a second view, not
    // a disclosure inside a list row inside the dialog's scroller.
    expect(document.querySelector(".ckm-dialog__title").textContent).toBe("First draft");
    expect(document.querySelector(".ckm-editor__diff")).toBeTruthy();
    expect(dialogText()).toContain("She swears.");
    click(control("Back to versions"));
    expect(document.querySelector(".ckm-dialog__title").textContent).toBe("Version history");
  });

  it("says added and removed in words, never by colour alone", async () => {
    await openVersions();
    click(control("See what changed"));
    const added = document.querySelector(".ckm-editor__diff-line--add");
    expect(added).toBeTruthy();
    expect(added.textContent).toContain("Added:");
  });

  it("asks before restoring, and explains that nothing is lost (D19)", async () => {
    const ctx = await openVersions();
    click(control("Restore"));
    expect(collabApi.post).not.toHaveBeenCalled();
    expect(dialogText()).toMatch(/saved as a new version first, so nothing is lost/i);
    await act(async () => { click(control("Yes, restore it")); });
    expect(collabApi.post).toHaveBeenCalledWith("/scripts/s1/versions/v1/restore", { content: CURRENT });
    expect(ctx.setScreenplayValue).toHaveBeenCalledWith("INT. KITCHEN - DAY");
  });

  it("saves a labelled version through the shared endpoint", async () => {
    await openVersions();
    // Scoped to the DIALOG: the editor's app-bar project-title input is also a
    // text input and comes first in the document.
    const label = document.querySelector(".ckm-dialog input");
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(label, "Before the rewrite");
      label.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { click(control("Save this version")); });
    expect(collabApi.post).toHaveBeenCalledWith("/scripts/s1/versions", {
      label: "Before the rewrite",
      content: CURRENT,
    });
  });

  it("refuses versioning on a project that was never saved, with the reason", async () => {
    collabApi.get.mockResolvedValue({ data: [] });
    const ctx = baseContext({ screenplayValue: CURRENT, scriptId: null });
    render(ctx);
    click(control("More editor actions"));
    click(control("Version history"));
    await act(async () => { await Promise.resolve(); });
    expect(dialogText()).toMatch(/Save this project once before you can keep versions/i);
    expect(control("Save this version").disabled).toBe(true);
  });

  it("says so rather than showing an empty list when there are no versions", async () => {
    collabApi.get.mockResolvedValue({ data: [] });
    const ctx = baseContext({ screenplayValue: CURRENT });
    render(ctx);
    click(control("More editor actions"));
    click(control("Version history"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(dialogText()).toContain("No versions yet");
  });
});

describe("Editor — leaving the diff view returns focus to its row", () => {
  it("puts focus back on the control that opened the diff, not the dialog container", async () => {
    collabApi.get.mockResolvedValue({ data: [
      { _id: "v1", label: "First draft", createdAt: new Date().toISOString(), fountainSnapshot: "INT. KITCHEN - DAY" },
      { _id: "v2", label: "Second pass", createdAt: new Date().toISOString(), fountainSnapshot: "INT. CAR - NIGHT" },
    ] });
    render(baseContext({ screenplayValue: "INT. KITCHEN - DAY\n\nNew line." }));
    click(control("More editor actions"));
    click(control("Version history"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Open the SECOND version's diff, so a wrong restore would be visible.
    const openers = Array.from(document.querySelectorAll("[data-version-diff]"));
    expect(openers).toHaveLength(2);
    click(openers[1]);
    expect(document.querySelector(".ckm-dialog__title").textContent).toBe("Second pass");

    click(control("Back to versions"));
    expect(document.activeElement.getAttribute("data-version-diff")).toBe("v2");
  });
});
