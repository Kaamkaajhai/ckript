// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCRIPT_COMPLETION_OPTIONS } from "../../../utils/scriptCompletion";
import ToastProvider from "../../components/feedback/ToastProvider";
import ScriptUploadChrome from "./ScriptUploadChrome";
import Upload from "./Upload";

/*
 * The upload screen is chrome over `pages/ScriptUpload.jsx`'s view model, so
 * these tests cover that seam: does it read the `vm` honestly, does it draw the
 * panel the `vm` says it is on, and does it hand the writer's intent back
 * without inventing behaviour.
 *
 * What is NOT tested here, deliberately: the values in the fields and the rules
 * behind them. Those belong to the orchestrator and to
 * `utils/scriptUploadValidation.js`, both of which have their own suites;
 * asserting them again through a chrome layer tests the same code twice and
 * makes every copy edit break a test.
 *
 * Two libraries are stubbed for the same reason: `react-easy-crop` measures a
 * DOM box on mount, which happy-dom reports as zero, and `ScreenplayReadOnly`
 * mounts a real CodeMirror. Neither has anything to say about whether this
 * screen is wired correctly.
 */

vi.mock("react-easy-crop", () => ({ default: () => <div data-testid="cropper" /> }));
vi.mock("../../../components/ScreenplayReadOnly", () => ({
  default: () => <div data-testid="screenplay-readonly" />,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

/*
 * Only the keys this chrome and its panels read. A key the screen starts
 * reading without anyone noticing shows up here as `undefined` rather than
 * silently inheriting whatever the real orchestrator happens to hold.
 */
const baseVm = ({ state = {}, actions = {}, mode = {}, ...rest } = {}) => ({
  user: { role: "creator", subscription: { plan: "gold" } },
  mode: { isContentOnlyEditMode: false, editId: null, draftId: null, ...mode },
  state: {
    step: 1,
    detailStep: 0,
    formData: {
      title: "The Four O'Clock Train", format: "feature", formatOther: "", pageCount: "104",
      viewableScript: true, previewWindowStart: "1", previewWindowEnd: "2",
      primaryGenre: "Drama", logline: "A logline.", synopsis: "A synopsis.",
      completionStatus: "partial", completedParts: "4", totalParts: "10", futurePlans: "",
    },
    classification: { tones: [], themes: [], settings: [] },
    legal: { agreedToTerms: false },
    rightsLicensing: {
      rightsType: "full_rights_sale", modificationRights: "", paymentStructure: "",
      negotiationMode: "", customConditions: "", timeBound: {}, royaltySettings: {},
      legalAcknowledgement: {},
    },
    roles: [],
    filmDetails: { filmLanguage: "Hindi", filmLanguageCustom: "", dialoguesPresent: "yes" },
    tagsInput: "",
    uploadedFile: null,
    existingUploadedFile: null,
    textContent: "",
    pdfPageTexts: [],
    pdfTextExtracted: false,
    fromDraft: false,
    isExtracting: false,
    thumbnailFile: null, thumbnailPreviewUrl: "",
    isGeneratingAiCover: false, aiCoverAttempts: 0, aiCoverHistory: [], aiCoverIndex: 0,
    trailerFile: null, trailerPreviewUrl: "", trailerMetaLabel: "",
    pitchVideoFile: null, pitchVideoPreviewUrl: "", pitchVideoMetaLabel: "",
    metaLoadingField: "", metaNotice: { field: "", text: "" },
    validationErrors: [], validationAttempt: 0,
    mediaRecoveryPending: false, pdfNotice: "",
    creationBlocked: false, scriptLimit: null, loading: false, agreementScrolled: false,
    isPremium: true, scriptPrice: 15, customPriceInput: "", useCustomPrice: false,
    toastMessage: null,
    accessDenied: false, isEditModeResolving: false, submissionSuccess: null,
    editApprovalLocked: false, mediaProgress: {}, thumbnailEditor: { open: false, imageUrl: "" },
    ...state,
  },
  actions: {
    handleFileSelect: vi.fn(), handleChange: vi.fn(), setFormData: vi.fn(), setTextContent: vi.fn(),
    openEditor: vi.fn(), openDrafts: vi.fn(), openPricing: vi.fn(),
    handleGenerateMetadata: vi.fn(), setTagsInput: vi.fn(),
    addRole: vi.fn(), removeRole: vi.fn(), updateRoleField: vi.fn(), updateRoleAge: vi.fn(),
    setFilmDetails: vi.fn(), toggleClassification: vi.fn(),
    generateAiCover: vi.fn(), downloadWatermarkedImage: vi.fn(), setThumbnailFile: vi.fn(),
    handleThumbnailSelect: vi.fn(), openThumbnailEditor: vi.fn(), setAiCoverHistoryIndex: vi.fn(),
    handleTrailerSelect: vi.fn(), setTrailerFile: vi.fn(),
    handlePitchVideoSelect: vi.fn(), setPitchVideoFile: vi.fn(),
    setScriptPrice: vi.fn(), setUseCustomPrice: vi.fn(), setCustomPriceInput: vi.fn(),
    setLegal: vi.fn(), setRightsLicensing: vi.fn(),
    onStepSelect: vi.fn(), onDetailSelect: vi.fn(), dismissToast: vi.fn(),
    handleBack: vi.fn(), handleNext: vi.fn(), handleSaveDraft: vi.fn(), handleSubmit: vi.fn(),
    cancelContentEdit: vi.fn(),
    ...actions,
  },
  elements: { agreementRef: { current: null } },
  options: {
    formats: [{ value: "feature", label: "Feature" }, { value: "other", label: "Other" }],
    formatRanges: { feature: { min: 70, max: 180, typical: "90-120", label: "Feature" } },
    genres: ["Drama", "Comedy"],
    tones: ["Gritty"], themes: ["Grief"], settings: ["Rural"],
    roleGenders: ["Any", "Female", "Male"],
    languages: ["Hindi", "English", "Other"],
    completion: SCRIPT_COMPLETION_OPTIONS,
    rights: [
      { value: "full_rights_sale", short: "Full sale", desc: "Ownership transfers." },
      { value: "exclusive_license", short: "Exclusive license", desc: "Time-bound." },
    ],
    modification: [{ value: "buyer_can_modify_freely", label: "Buyer can modify freely" }],
    payments: [{ value: "one_time_upfront_payment", label: "One-time upfront payment" }],
    negotiations: [{ value: "fixed_terms_non_negotiable", label: "Fixed terms" }],
    licenseDurations: [12, 18, 24],
    pricePresets: [5, 10, 15],
  },
  computed: {
    pageCountWarning: "",
    effectivePrice: 15, buyerTotalPayable: 15.75, writerPayout: 15,
    priceGuide: "Suggested ₹15–₹50 for Feature",
    legalAgreement: "TERMS AND CONDITIONS\n\nThe full agreement text.",
    publishInvoiceRows: [{ item: "Script Access Fee", detail: "Premium", amount: "₹15.00" }],
  },
  ...rest,
});

const render = (node) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter>
        <div className="ckm"><ToastProvider>{node}</ToastProvider></div>
      </MemoryRouter>
    );
  });
};

const renderScreen = (vm) => render(<Upload vm={vm} />);

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
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

/* ─────────────────────────── Shell and chrome ────────────────────────── */

describe("Upload — the shell", () => {
  it("is a flow screen that declares its footer as a slot override", () => {
    renderScreen(baseVm());
    const shell = document.querySelector(".ckm-shell");

    expect(shell.getAttribute("data-shell-mode")).toBe("flow");
    // The DOM answers "why does a flow screen have bottom chrome?" — the whole
    // point of `data-shell-slots` being published at all.
    expect(shell.getAttribute("data-shell-slots")).toBe("bottomNav");
    expect(shell.getAttribute("data-screen-id")).toBe("upload");
  });

  it("puts the footer in the shell's bottom slot, not inside the scroll surface", () => {
    // Load-bearing: a slot is a `flex: none` sibling of the scroll body, so it
    // displaces the form. A footer inside the scroll body would sit on top of
    // the last field of every panel.
    renderScreen(baseVm());

    expect(document.querySelector(".ckm-shell__bottom .ckm-upload__footer")).toBeTruthy();
    expect(document.querySelector(".ckm-shell__scroll .ckm-upload__footer")).toBeNull();
  });
});

describe("Upload — the app bar", () => {
  it("names the project as the screen's only h1", () => {
    renderScreen(baseVm());
    const headings = document.querySelectorAll("h1");

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("The Four O'Clock Train");
  });

  it("falls back to a placeholder rather than an empty bar for an untitled upload", () => {
    renderScreen(baseVm({ state: { formData: { ...baseVm().state.formData, title: "   " } } }));
    expect(document.querySelector("h1").textContent).toBe("Upload a script");
  });

  it("says the position and the Details panel in one string", () => {
    renderScreen(baseVm({ state: { step: 2, detailStep: 2 } }));
    expect(document.querySelector(".ckm-upload__bar-position").textContent)
      .toBe("Step 2 of 5 · Details · Cast & roles");
  });

  it("SHOWS THE SAVE STATE, which desktop hides on every phone (DEF-4)", () => {
    renderScreen(baseVm());
    const save = document.querySelector(".ckm-upload__save");

    expect(save).toBeTruthy();
    expect(save.getAttribute("role")).toBe("status");
    expect(save.getAttribute("aria-live")).toBe("polite");
    // In words, not only a coloured dot (§14).
    expect(save.textContent.trim()).toMatch(/not saved yet/i);
  });

  it("hides the overflow control entirely when it would have no items", () => {
    // Content-only edit has one field and one action. §2.8: absent, never
    // present-and-inert.
    renderScreen(baseVm({ mode: { isContentOnlyEditMode: true, editId: "s1" } }));
    expect(control("More upload actions")).toBeUndefined();
  });
});

describe("Upload — notices live in the fixed chrome", () => {
  it("keeps the plan-limit gate out of the scroll body", () => {
    // A refusal that scrolls out of sight is a Next button that looks broken.
    renderScreen(baseVm({
      state: { creationBlocked: true, scriptLimit: { plan: "Free", used: 1, limit: 1 } },
    }));

    expect(document.querySelector(".ckm-shell__app-bar .ckm-upload__notice")).toBeTruthy();
    expect(document.querySelector(".ckm-shell__scroll .ckm-upload__notice")).toBeNull();
  });

  it("explains a partial media failure without re-asking for the whole form", () => {
    renderScreen(baseVm({ state: { step: 5, mediaRecoveryPending: true } }));
    const notice = document.querySelector(".ckm-upload__notice");

    expect(notice.textContent).toMatch(/your project is saved/i);
    expect(notice.textContent).toMatch(/nothing else needs re-entering/i);
  });
});

/* ───────────────────────────── The footer ────────────────────────────── */

describe("Upload — the footer", () => {
  it("advances through the orchestrator, never through local state", () => {
    const handleNext = vi.fn();
    renderScreen(baseVm({ actions: { handleNext } }));

    click(control("Continue"));
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it("submits through the orchestrator on the last step", () => {
    const handleSubmit = vi.fn();
    renderScreen(baseVm({ state: { step: 5 }, actions: { handleSubmit } }));

    click(control("Publish for review"));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("names a refused primary in VISIBLE text and points at it with aria-describedby", () => {
    /*
     * The one real improvement over desktop, and the reason `blockedReason` is
     * modelled at all: desktop puts this in a `title` attribute, which never
     * appears on a touch device — there is no hover — so a phone writer met a
     * greyed-out Publish with no way to discover what was wrong.
     */
    renderScreen(baseVm({ state: { step: 5, creationBlocked: true } }));

    const reason = document.querySelector(".ckm-upload__footer-reason");
    expect(reason.textContent).toMatch(/script limit/i);

    const publish = Array.from(document.querySelectorAll(".ckm-upload__footer button"))
      .find((button) => button.disabled);
    expect(publish.getAttribute("aria-describedby")).toBe(reason.id);
  });

  it("puts the reason ABOVE the actions in DOM order", () => {
    // `Button` renders a real `disabled` attribute, so the refused primary is out
    // of the tab order and its `aria-describedby` is never read. The reason is
    // therefore visible text that precedes the control it explains.
    renderScreen(baseVm({ state: { step: 5, creationBlocked: true } }));
    const footer = document.querySelector(".ckm-upload__footer");

    expect(footer.firstElementChild.className).toContain("footer-reason");
  });
});

/* ───────────────────────── Panel routing ─────────────────────────────── */

describe("Upload — panel routing", () => {
  const panelTitle = () => document.querySelector(".ckm-upload__panel-title").textContent;

  it("draws the panel the shared screen resolver names", () => {
    const cases = [
      [{ step: 1 }, "Add your script"],
      [{ step: 2, detailStep: 0 }, "Project basics"],
      [{ step: 2, detailStep: 1 }, "Tell the story"],
      [{ step: 2, detailStep: 2 }, "Cast & roles"],
      [{ step: 2, detailStep: 3 }, "How complete is it?"],
      [{ step: 2, detailStep: 4 }, "Viewable preview"],
      [{ step: 2, detailStep: 5 }, "Visual assets"],
      [{ step: 3 }, "Classification"],
      [{ step: 4 }, "Film production details"],
      [{ step: 5 }, "Price & terms"],
    ];

    for (const [state, expected] of cases) {
      renderScreen(baseVm({ state }));
      expect(panelTitle()).toBe(expected);
      act(() => root.unmount());
      document.body.innerHTML = "";
    }
  });

  it("remounts the panel on every move, so scroll resets to its top", () => {
    renderScreen(baseVm({ state: { step: 2, detailStep: 0 } }));
    const first = document.querySelector(".ckm-upload__panel");

    act(() => { root.unmount(); });
    document.body.innerHTML = "";
    renderScreen(baseVm({ state: { step: 2, detailStep: 1 } }));

    expect(document.querySelector(".ckm-upload__panel")).not.toBe(first);
  });
});

/* ───────────────────────── Leaving the flow ──────────────────────────── */

describe("Upload — leaving", () => {
  it("leaves straight away when there is nothing to lose", () => {
    const empty = baseVm();
    empty.state.formData = { ...empty.state.formData, title: "", logline: "", synopsis: "" };
    renderScreen(empty);

    click(control("Leave the upload"));
    // No sheet: an "are you sure?" over an empty form is noise.
    expect(document.querySelector(".ckm-action-sheet")).toBeNull();
  });

  it("asks before discarding real work, and the destructive item does not act", () => {
    /*
     * It matters more here than on /create-project: that flow autosaves every
     * three seconds and snapshots locally, so its discard costs seconds. This
     * one saves only when asked (DEF-7), so leaving costs everything typed.
     */
    renderScreen(baseVm());
    click(control("Leave the upload"));

    expect(document.querySelector(".ckm-action-sheet")).toBeTruthy();
    click(control("Leave without saving"));

    const confirm = document.querySelector("[role='alertdialog']");
    expect(confirm).toBeTruthy();
    expect(confirm.textContent).toMatch(/cannot be undone/i);
  });

  it("offers Save-a-draft-and-leave, but not while editing a published script", () => {
    renderScreen(baseVm());
    click(control("Leave the upload"));
    expect(control("Save a draft & leave")).toBeTruthy();

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderScreen(baseVm({ mode: { editId: "script-1" } }));
    click(control("Leave the upload"));
    // There is no draft to save: ?edit= submits an update to a live listing.
    expect(control("Save a draft & leave")).toBeUndefined();
  });
});

/* ──────────────────── The chrome's four surfaces ─────────────────────── */

describe("ScriptUploadChrome — the states desktop returns early for", () => {
  it("draws a real mobile refusal instead of the desktop card", () => {
    render(<ScriptUploadChrome vm={baseVm({ state: { accessDenied: true } })} />);

    expect(document.querySelector("[data-screen-id='upload-denied']")).toBeTruthy();
    expect(document.querySelector("h1").textContent).toMatch(/only writer accounts/i);
    // A refusal the visitor cannot retry offers destinations, not a retry.
    expect(control("Go to my dashboard")).toBeTruthy();
  });

  it("shows a skeleton rather than an empty form over a real listing", () => {
    render(<ScriptUploadChrome vm={baseVm({ state: { isEditModeResolving: true } })} />);

    expect(document.querySelector("[data-screen-id='upload-resolving']")).toBeTruthy();
    // Shapes are `aria-hidden` and announce nothing on their own, so the group
    // is what carries the label — and there must be exactly one group, or the
    // same load is announced twice.
    const groups = document.querySelectorAll(".ckm-skel__group");
    expect(groups).toHaveLength(1);
    expect(groups[0].getAttribute("role")).toBe("status");
    expect(groups[0].textContent).toMatch(/loading your script/i);
  });

  it("ends on a screen that says what happens next, and takes focus to it", () => {
    render(<ScriptUploadChrome vm={baseVm({
      state: { submissionSuccess: { projectTitle: "The Four O'Clock Train", reviewPath: "/script/1" } },
    })} />);

    const heading = document.querySelector("h1");
    expect(heading.textContent).toMatch(/with the review team/i);
    // A whole new screen replacing the form is a change of context, so moving
    // focus to its heading is what stops a screen-reader user being stranded on
    // a button that no longer exists.
    expect(heading.getAttribute("tabindex")).toBe("-1");
  });

  it("checks refusal before the resolving gate, exactly as the orchestrator does", () => {
    render(<ScriptUploadChrome vm={baseVm({ state: { accessDenied: true, isEditModeResolving: true } })} />);
    expect(document.querySelector("[data-screen-id='upload-denied']")).toBeTruthy();
  });

  it("draws the flow when none of the three states apply", () => {
    render(<ScriptUploadChrome vm={baseVm()} />);
    expect(document.querySelector("[data-screen-id='upload']")).toBeTruthy();
  });
});
