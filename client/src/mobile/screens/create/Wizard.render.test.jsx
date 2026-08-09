// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectContext } from "../../../pages/CreateProject/CreateProjectContext";
import { DETAILS_STEPS } from "../../../pages/CreateProject/constants";
import Wizard from "./Wizard";

/*
 * The wizard is chrome over the orchestrator's state, exactly as the editor is,
 * so these tests cover the same seam: does it read the context honestly, does it
 * route to the panel the context says it is on, and does it hand the writer's
 * intent back without inventing behaviour.
 *
 * What is NOT tested here, deliberately: the values in the fields. Those belong
 * to the orchestrator, are already covered by its own suite, and asserting them
 * again through a chrome layer tests the same code twice while making every
 * copy edit break a test.
 *
 * `react-easy-crop` is stubbed. It measures a DOM box on mount, which happy-dom
 * reports as zero, and it has nothing to say about whether the wizard is wired
 * correctly.
 */

vi.mock("react-easy-crop", () => ({ default: () => <div data-testid="cropper" /> }));
vi.mock("../../../components/ScreenplayReadOnly", () => ({
  default: () => <div data-testid="screenplay-readonly" />,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const filmSubSteps = DETAILS_STEPS.filter((sub) => sub.industries.includes("film"));

/*
 * Only the keys this chrome and its panels read. A key the wizard starts
 * reading without anyone noticing shows up here as `undefined` rather than
 * silently inheriting whatever the real orchestrator happens to hold.
 */
const baseContext = (overrides = {}) => ({
  // position + navigation
  step: 2,
  setStep: vi.fn(),
  detailsStep: 0,
  setDetailsStep: vi.fn(),
  detailsSubSteps: filmSubSteps,
  handleNext: vi.fn(),
  handleBack: vi.fn(),
  handlePublish: vi.fn(),
  handleExitEditor: vi.fn(),

  // save + gates
  saving: false,
  saved: true,
  lastSaved: new Date(2026, 7, 9, 14, 32),
  loading: false,
  exiting: false,
  creationBlocked: false,
  competitionMode: false,
  hasPublishAccess: true,
  legal: { agreedToTerms: false },
  rightsLicensing: { legalAcknowledgement: { ownershipConfirmed: false }, royaltySettings: {} },

  // messages
  error: "",
  setError: vi.fn(),
  pendingRecovery: null,
  acceptPendingRecovery: vi.fn(),
  dismissPendingRecovery: vi.fn(),
  toastMessage: null,
  setToastMessage: vi.fn(),

  // drafts
  drafts: [],
  loadingDrafts: false,
  loadDraft: vi.fn(),
  scriptId: null,
  setScriptId: vi.fn(),
  setLoadedScriptStatus: vi.fn(),
  setEditApprovalLocked: vi.fn(),
  setPurchasedServiceCredits: vi.fn(),
  clearLocalWorkingDraft: vi.fn(),
  editor: null,

  // overlays
  showExitConfirm: false,
  setShowExitConfirm: vi.fn(),
  confirmExitDiscard: vi.fn(),
  confirmExitSaveDraft: vi.fn(),
  showUnderReviewModal: false,
  handleUnderReviewContinue: vi.fn(),
  isThumbnailEditorOpen: false,
  thumbnailSourceUrl: "",
  thumbnailCrop: { x: 0, y: 0 },
  setThumbnailCrop: vi.fn(),
  thumbnailZoom: 1,
  setThumbnailZoom: vi.fn(),
  thumbnailRotation: 0,
  setThumbnailRotation: vi.fn(),
  setThumbnailCropPixels: vi.fn(),
  thumbnailApplying: false,
  resetThumbnailEditor: vi.fn(),
  handleApplyThumbnail: vi.fn(),

  // panel data
  title: "The Four O'Clock Train",
  setTitle: vi.fn(),
  formData: {
    format: "feature_film", styleMedium: "", companyName: "", logline: "", synopsis: "",
    primaryGenre: "", completionStatus: "complete", completedParts: "", totalParts: "",
    futurePlans: "", viewableScript: false, previewWindowStart: "1", previewWindowEnd: "2",
  },
  setFormData: vi.fn(),
  handleChange: vi.fn(),
  targetFilm: true,
  estimatedPages: 47,
  pageStatus: "short",
  formatInfo: { label: "Feature Film", typical: "90–120" },
  wordCount: 8420,
  writers: [{ userId: "u1", name: "Arshad Rahman", creditType: "written_by" }],
  addWriter: vi.fn(),
  updateWriter: vi.fn(),
  removeWriter: vi.fn(),
  moveWriter: vi.fn(),
  tagsInput: "",
  setTagsInput: vi.fn(),
  handleGenerateMetadata: vi.fn(),
  metaLoadingField: "",
  metaNotice: { field: "", text: "" },
  roles: [],
  addRole: vi.fn(),
  removeRole: vi.fn(),
  updateRoleField: vi.fn(),
  updateRoleAge: vi.fn(),
  publishingDetails: { targetAudience: [], writingStyle: [], estimatedWordCount: "", seriesPotential: "", proseSample: "" },
  setPublishingDetails: vi.fn(),
  handleProseClick: vi.fn(),
  proseLoading: false,
  previewPageTexts: [],
  classification: { tones: [], themes: [], settings: [] },
  toggleChip: vi.fn(),
  filmDetails: { wantToDirect: false, wantToProduce: false, filmLanguage: "", dialoguesPresent: "" },
  setFilmDetails: vi.fn(),
  scriptPrice: 149,
  setScriptPrice: vi.fn(),
  setLegal: vi.fn(),
  setRightsLicensing: vi.fn(),
  agreementRef: { current: null },
  user: { role: "creator", subscription: { plan: "gold" } },

  // media
  thumbnailFile: null, thumbnailPreviewUrl: "", trailerFile: null, trailerPreviewUrl: "",
  trailerMeta: null, trailerMetaLoading: false, pitchVideoFile: null, pitchVideoPreviewUrl: "",
  pitchVideoMeta: null, pitchVideoMetaLoading: false,
  handleThumbnailSelect: vi.fn(), handleTrailerSelect: vi.fn(), handlePitchVideoSelect: vi.fn(),
  setThumbnailFile: vi.fn(), setTrailerFile: vi.fn(), setPitchVideoFile: vi.fn(),
  downloadWatermarkedImage: vi.fn(), formatDuration: () => "0s", generateAiCover: vi.fn(),
  isGeneratingAiCover: false, aiCoverAttempts: 0, aiCoverHistory: [], aiCoverIndex: 0,
  setAiCoverIndex: vi.fn(), openThumbnailEditor: vi.fn(),

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
            <Wizard />
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

const control = (name) => Array.from(document.querySelectorAll("button, a")).find((el) => {
  const label = el.querySelector(".ckm-action-sheet__label");
  if (label) return label.textContent.trim() === name;
  return accessibleName(el) === name;
});

const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

beforeEach(() => { document.body.innerHTML = ""; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  container = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

/* ─────────────────────────── Shell and chrome ────────────────────────── */

describe("Wizard — the shell", () => {
  it("is a flow screen that declares its footer as a slot override", () => {
    render(baseContext());
    const shell = document.querySelector(".ckm-shell");

    expect(shell.getAttribute("data-shell-mode")).toBe("flow");
    // The DOM answers "why does a flow screen have bottom chrome?" — the whole
    // point of `data-shell-slots` being published at all.
    expect(shell.getAttribute("data-shell-slots")).toBe("bottomNav");
    expect(shell.getAttribute("data-screen-id")).toBe("create-project-wizard");
  });

  it("puts the footer in the shell's bottom slot, not inside the scroll surface", () => {
    // Load-bearing: a slot is a `flex: none` sibling of the scroll body, so it
    // displaces the form. A footer inside the scroll body would sit on top of
    // the last field of every panel.
    render(baseContext());

    expect(document.querySelector(".ckm-shell__bottom .ckm-create-project__footer")).toBeTruthy();
    expect(document.querySelector(".ckm-shell__scroll .ckm-create-project__footer")).toBeNull();
  });
});

describe("Wizard — the app bar", () => {
  it("names the project as the screen's only h1", () => {
    render(baseContext());
    const headings = document.querySelectorAll("h1");

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("The Four O'Clock Train");
  });

  it("falls back to a placeholder rather than an empty bar for an untitled project", () => {
    render(baseContext({ title: "   " }));
    expect(document.querySelector("h1").textContent).toBe("Untitled project");
  });

  it("says the position and the Details panel in one string", () => {
    render(baseContext({ step: 2, detailsStep: 2 }));

    expect(document.querySelector(".ckm-create-project__bar-position").textContent)
      .toBe(`Step 2 of 5 · Details · ${filmSubSteps[2].label}`);
  });

  it("drops the panel clause outside Details", () => {
    render(baseContext({ step: 4 }));

    expect(document.querySelector(".ckm-create-project__bar-position").textContent)
      .toBe("Step 4 of 5 · Film Info");
  });

  it("leaves the project rather than stepping back — the footer owns step navigation", () => {
    // Two controls in one bar that both mean "back" and do different things is
    // the ambiguity this split removes.
    const handleExitEditor = vi.fn();
    const handleBack = vi.fn();
    render(baseContext({ handleExitEditor, handleBack }));

    click(control("Leave this project"));

    expect(handleExitEditor).toHaveBeenCalledTimes(1);
    expect(handleBack).not.toHaveBeenCalled();
  });

  it("reports one save state at a time, politely", () => {
    render(baseContext({ saving: true, saved: true }));
    const save = document.querySelector(".ckm-create-project__save");

    expect(save.getAttribute("role")).toBe("status");
    expect(save.getAttribute("aria-live")).toBe("polite");
    // Both booleans are true; "Saving…" wins, and "Saved" is not also on screen.
    expect(save.textContent).toContain("Saving…");
    expect(save.textContent).not.toContain("Saved");
  });

  it("does not announce the progress bar, because the line above already says it in words", () => {
    render(baseContext({ step: 3 }));
    const progress = document.querySelector(".ckm-create-project__progress");

    expect(progress.getAttribute("aria-hidden")).toBe("true");
    expect(progress.querySelector(".ckm-create-project__progress-fill").style.width).toBe("60%");
  });
});

/* ───────────────────────────── Panel routing ─────────────────────────── */

describe("Wizard — which panel is drawn", () => {
  it.each([
    [3, "Classification"],
    [4, "Film details"],
    [5, "Price & terms"],
  ])("draws step %i as %s", (step, heading) => {
    render(baseContext({ step }));
    expect(document.querySelector(".ckm-create-project__panel-title").textContent).toBe(heading);
  });

  it("resolves step 2 through the orchestrator's sub-step list, not a list of its own", () => {
    // The list is derived from the film/publishing track upstream. If the
    // wizard kept its own copy the two platforms could disagree about what
    // step 2 contains.
    render(baseContext({ step: 2, detailsStep: 1 }));
    expect(document.querySelector(".ckm-create-project__panel-title").textContent).toBe("Story");
  });

  it("falls back to Basics rather than blanking on an unknown panel key", () => {
    render(baseContext({ step: 2, detailsStep: 0, detailsSubSteps: [{ key: "nonsense", label: "?" }] }));
    expect(document.querySelector(".ckm-create-project__panel-title").textContent).toBe("Project basics");
  });

  it("gives every panel heading an h2 under the project's h1", () => {
    render(baseContext({ step: 3 }));
    const title = document.querySelector(".ckm-create-project__panel-title");
    expect(title.tagName).toBe("H2");
  });
});

/* ───────────────────────────── The footer ────────────────────────────── */

describe("Wizard — the footer", () => {
  it("advances through the orchestrator's handler rather than moving the step itself", () => {
    const handleNext = vi.fn();
    const setStep = vi.fn();
    render(baseContext({ step: 3, handleNext, setStep }));

    click(control("Next"));

    // handleNext is what runs per-panel validation. A wizard that moved `step`
    // directly would walk straight past every gate.
    expect(handleNext).toHaveBeenCalledTimes(1);
    expect(setStep).not.toHaveBeenCalled();
  });

  it("submits on the last step instead of advancing", () => {
    const handleNext = vi.fn();
    const handlePublish = vi.fn();
    render(baseContext({
      step: 5,
      handleNext,
      handlePublish,
      legal: { agreedToTerms: true },
      rightsLicensing: { legalAcknowledgement: { ownershipConfirmed: true }, royaltySettings: {} },
    }));

    click(control("Submit for approval"));

    expect(handlePublish).toHaveBeenCalledTimes(1);
    expect(handleNext).not.toHaveBeenCalled();
  });

  /*
   * The reason this wizard exists in its own file rather than as a reflow of
   * the desktop shell. Desktop's refusal reason is a `title` attribute, which
   * never appears on a touch device.
   */
  it("shows why Submit is refused, in text, and points the button at it", () => {
    render(baseContext({ step: 5, hasPublishAccess: false }));

    const reason = document.querySelector(".ckm-create-project__footer-reason");
    expect(reason.textContent).toMatch(/publishing access/i);

    const submit = control("Submit for approval");
    expect(submit.getAttribute("aria-describedby")).toBe(reason.id);
  });

  it("has no reason line when nothing is refused", () => {
    render(baseContext({
      step: 5,
      legal: { agreedToTerms: true },
      rightsLicensing: { legalAcknowledgement: { ownershipConfirmed: true }, royaltySettings: {} },
    }));

    expect(document.querySelector(".ckm-create-project__footer-reason")).toBeNull();
    expect(control("Submit for approval").getAttribute("aria-describedby")).toBeNull();
  });

  it("refuses to fire the refused action when it is tapped anyway", () => {
    const handlePublish = vi.fn();
    render(baseContext({ step: 5, handlePublish }));

    click(control("Submit for approval"));

    expect(handlePublish).not.toHaveBeenCalled();
  });
});

/* ────────────────────────────── Notices ──────────────────────────────── */

describe("Wizard — notices", () => {
  /*
   * The placement that makes validation work at all. `handleNext` refuses to
   * advance and sets `error`; if that message renders 400px down a scrolling
   * panel, the writer sees a Next button that simply stopped responding.
   */
  it("pins every notice in the fixed chrome, never in the scroll body", () => {
    render(baseContext({
      error: "Logline is required.",
      creationBlocked: true,
      pendingRecovery: { updatedAt: "2026-08-08T21:05:00.000Z" },
    }));

    expect(document.querySelectorAll(".ckm-shell__app-bar .ckm-create-project__notice")).toHaveLength(3);
    expect(document.querySelectorAll(".ckm-shell__scroll .ckm-create-project__notice")).toHaveLength(0);
  });

  it("announces an error assertively and offers a way to clear it", () => {
    const setError = vi.fn();
    render(baseContext({ error: "Logline is required.", setError }));

    const message = document.querySelector(".ckm-message--error");
    expect(message.getAttribute("role")).toBe("alert");

    click(control("Dismiss"));
    expect(setError).toHaveBeenCalledWith("");
  });

  it("offers recovery as a choice and never applies it on its own", () => {
    const acceptPendingRecovery = vi.fn();
    const dismissPendingRecovery = vi.fn();
    render(baseContext({
      pendingRecovery: { updatedAt: "2026-08-08T21:05:00.000Z" },
      acceptPendingRecovery,
      dismissPendingRecovery,
    }));

    expect(acceptPendingRecovery).not.toHaveBeenCalled();

    click(control("Restore my changes"));
    expect(acceptPendingRecovery).toHaveBeenCalledTimes(1);

    click(control("Keep the saved version"));
    expect(dismissPendingRecovery).toHaveBeenCalledTimes(1);
  });
});

/* ───────────────────────────── Overflow ──────────────────────────────── */

describe("Wizard — the overflow sheet", () => {
  it("returns to the editor through the orchestrator's step, clearing any stale error", () => {
    const setStep = vi.fn();
    const setError = vi.fn();
    render(baseContext({ setStep, setError }));

    click(control("More project actions"));
    click(control("Back to the script"));

    expect(setStep).toHaveBeenCalledWith(1);
    expect(setError).toHaveBeenCalledWith("");
  });

  it("opens the drafts sheet rather than navigating away", () => {
    render(baseContext({ drafts: [{ _id: "d1", title: "Nine Rupees", updatedAt: "2026-08-02T18:40:00.000Z" }] }));

    click(control("More project actions"));
    click(control("My projects"));

    expect(document.querySelector(".ckm-bottom-sheet")).toBeTruthy();
    expect(document.body.textContent).toContain("Nine Rupees");
  });

  it("does not offer project switching in competition mode", () => {
    render(baseContext({ competitionMode: true }));

    click(control("More project actions"));

    expect(control("My projects")).toBeUndefined();
    expect(control("Back to the script")).toBeTruthy();
  });
});

/* ───────────────────────────── Overlays ──────────────────────────────── */

describe("Wizard — overlays", () => {
  it("keeps every overlay closed until something asks for it", () => {
    render(baseContext());

    expect(document.querySelector(".ckm-dialog")).toBeNull();
    expect(document.querySelector(".ckm-bottom-sheet")).toBeNull();
    expect(document.querySelector(".ckm-action-sheet")).toBeNull();
  });

  it("acknowledges a submission in a real dialog rather than a floating card", () => {
    render(baseContext({ step: 5, showUnderReviewModal: true }));
    const dialog = document.querySelector(".ckm-dialog");

    expect(dialog).toBeTruthy();
    expect(document.body.textContent).toContain("Submitted for review");
  });

  it("hands Continue back to the orchestrator, which cancels the redirect timer", () => {
    const handleUnderReviewContinue = vi.fn();
    render(baseContext({ step: 5, showUnderReviewModal: true, handleUnderReviewContinue }));

    click(control("Continue"));

    expect(handleUnderReviewContinue).toHaveBeenCalledTimes(1);
  });

  it("opens the cropper from the orchestrator's own editor state", () => {
    render(baseContext({ isThumbnailEditorOpen: true, thumbnailSourceUrl: "blob:cover" }));

    expect(document.querySelector("[data-testid='cropper']")).toBeTruthy();
  });

  it("mounts the exit flow so the browser back gesture has something to open", () => {
    // `showExitConfirm` is reached from three places — the bar, popstate and a
    // tab close — and all three go through this one surface.
    render(baseContext({ showExitConfirm: true }));

    expect(control("Save as draft & exit")).toBeTruthy();
    expect(control("Discard & exit")).toBeTruthy();
  });
});
