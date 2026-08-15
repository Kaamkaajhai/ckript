// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCRIPT_COMPLETION_OPTIONS } from "../../../../utils/scriptCompletion";
import { UPLOAD_SCREEN_ORDER, validateUploadScreen } from "../../../../utils/scriptUploadValidation";
import { UPLOAD_PANELS } from "./UploadPanels";

/*
 * The ten panels, tested for the four things a panel can actually get wrong:
 * which fields it draws, which of the vm's setters it calls, whether the shared
 * validation contract can find the control it named, and whether the states that
 * only exist on this platform (extracting, attached, locked) render at all.
 *
 * NOT tested here: the values, the rules and the copy. The values are the
 * orchestrator's, the rules are `utils/scriptUploadValidation.js`'s — both have
 * their own suites — and asserting copy through a chrome layer makes every
 * wording change a failing test.
 */

vi.mock("../../../../components/ScreenplayReadOnly", () => ({
  default: () => <div data-testid="screenplay-readonly" />,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

const baseVm = ({ state = {}, actions = {}, mode = {}, user = {}, ...rest } = {}) => ({
  user: { role: "creator", subscription: { plan: "gold" }, ...user },
  mode: { isContentOnlyEditMode: false, editId: null, draftId: null, ...mode },
  state: {
    step: 1, detailStep: 0,
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
    roles: [], filmDetails: { filmLanguage: "Hindi", filmLanguageCustom: "", dialoguesPresent: "yes" },
    tagsInput: "", uploadedFile: null, existingUploadedFile: null, textContent: "",
    pdfPageTexts: [], pdfTextExtracted: false, fromDraft: false, isExtracting: false,
    thumbnailFile: null, thumbnailPreviewUrl: "",
    isGeneratingAiCover: false, aiCoverAttempts: 0, aiCoverRemaining: 15, aiCoverHistory: [], aiCoverIndex: 0,
    trailerFile: null, trailerPreviewUrl: "", trailerMetaLabel: "",
    pitchVideoFile: null, pitchVideoPreviewUrl: "", pitchVideoMetaLabel: "",
    metaLoadingField: "", metaNotice: { field: "", text: "" },
    validationErrors: [], validationAttempt: 0,
    mediaRecoveryPending: false, pdfNotice: "",
    creationBlocked: false, scriptLimit: null, loading: false, agreementScrolled: false,
    isPremium: true, scriptPrice: 15, customPriceInput: "", useCustomPrice: false,
    mediaProgress: {},
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
    flushWorkingSnapshot: vi.fn(),
    ...actions,
  },
  elements: { agreementRef: { current: null } },
  options: {
    formats: [{ value: "feature", label: "Feature" }, { value: "other", label: "Other" }],
    formatRanges: { feature: { min: 70, max: 180, typical: "90-120", label: "Feature" } },
    genres: ["Drama", "Comedy"], tones: ["Gritty"], themes: ["Grief"], settings: ["Rural"],
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
    licenseDurations: [12, 18, 24], pricePresets: [5, 10, 15],
  },
  computed: {
    pageCountWarning: "", effectivePrice: 15, buyerTotalPayable: 15.75, writerPayout: 15,
    priceGuide: "Suggested ₹15–₹50 for Feature",
    legalAgreement: "TERMS AND CONDITIONS\n\nThe full agreement text.",
    publishInvoiceRows: [
      { item: "Script Access Fee", detail: "Premium", amount: "₹15.00" },
      { item: "Projected Writer Payout", detail: "You receive this", amount: "₹15.00" },
    ],
  },
  ...rest,
});

const renderPanel = (key, vm) => {
  const Panel = UPLOAD_PANELS[key];
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter><div className="ckm"><Panel vm={vm} /></div></MemoryRouter>
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

const control = (name) => Array.from(document.querySelectorAll("button, a, label")).find(
  (el) => accessibleName(el) === name,
);

const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

const type = (el, value) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
});

beforeEach(() => { document.body.innerHTML = ""; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

/* ─────────────────── The registry and the shared contract ────────────── */

describe("the panel registry", () => {
  it("covers every screen the shared validation module knows about", () => {
    // If a screen is added to `UPLOAD_SCREEN_ORDER` and not here, the flow would
    // route to `undefined` and render nothing.
    expect(Object.keys(UPLOAD_PANELS).sort()).toEqual([...UPLOAD_SCREEN_ORDER].sort());
  });

  it("renders an anchor for every field the validator can name", () => {
    /*
     * The load-bearing test of decision D11. `validateUploadScreen` returns a
     * `fieldId` that the orchestrator's focus routine looks up with
     * `getElementById`; if a panel does not carry that id, pressing Publish over
     * a missing field jumps to the right panel and then does nothing.
     *
     * The empty context below is what produces the required-field issues.
     */
    const empty = {
      formData: { viewableScript: true, previewWindowStart: "0", previewWindowEnd: "0", pageCount: "0" },
      roles: [{ characterName: "A", ageRange: { min: 9, max: 2 } }],
      filmDetails: {}, rightsLicensing: { legalAcknowledgement: {} }, legal: {},
    };

    const vm = baseVm({
      state: {
        formData: { ...baseVm().state.formData, format: "other", pageCount: "" },
        roles: [{ characterName: "A", type: "", description: "", gender: "Any", ageRange: { min: 9, max: 2 } }],
        filmDetails: { filmLanguage: "Other", filmLanguageCustom: "", dialoguesPresent: "yes" },
        rightsLicensing: { ...baseVm().state.rightsLicensing, rightsType: "exclusive_license" },
      },
    });

    const missing = [];
    for (const screen of UPLOAD_SCREEN_ORDER) {
      const issues = validateUploadScreen(screen, empty);
      if (!issues.length) continue;

      renderPanel(screen, vm);
      for (const issue of issues) {
        if (!document.getElementById(issue.fieldId)) missing.push(`${screen}:${issue.fieldId}`);
      }
      act(() => root.unmount());
      document.body.innerHTML = "";
    }

    expect(missing).toEqual([]);
  });
});

/* ───────────────────────── Panel 1 · the file picker ─────────────────── */

describe("UploadPanel", () => {
  it("offers a real file input behind a label, not a drag-and-drop div", () => {
    // Desktop's dropzone is a `<div role="button">` with onDrop/onDragOver. A
    // touch screen has nothing to drag a file from; what it has is a picker.
    renderPanel("upload", baseVm());
    const input = document.querySelector("input[type='file']");

    expect(input).toBeTruthy();
    expect(input.getAttribute("accept")).toContain(".pdf");
    expect(document.querySelector(`label[for='${input.id}']`)).toBeTruthy();
    expect(document.querySelector("[ondrop]")).toBeNull();
  });

  it("shows an INDETERMINATE busy state while extracting, never a percentage", () => {
    /*
     * DEF-9. `POST /scripts/extract-pdf` reports no progress, so desktop's bar
     * invents one — 10% every 200ms, capped at 90%. WCAG 4.1.3 treats a progress
     * bar as a status message; a status message that states something untrue is
     * worse than none.
     */
    renderPanel("upload", baseVm({ state: { isExtracting: true } }));

    expect(document.body.textContent).toMatch(/reading your script/i);
    expect(document.body.textContent).not.toMatch(/\d+%/);
    expect(document.querySelector("input[type='file']").disabled).toBe(true);
    expect(document.querySelector(".ckm-upload__picker").getAttribute("aria-busy")).toBe("true");
  });

  it("reports the attached file, its size, its page count and the extraction", () => {
    renderPanel("upload", baseVm({
      state: {
        uploadedFile: { name: "train.pdf", size: 2_411_233 },
        pdfTextExtracted: true,
      },
    }));

    const meta = document.querySelector(".ckm-upload__file-meta").textContent;
    expect(document.querySelector(".ckm-upload__file-name").textContent).toBe("train.pdf");
    expect(meta).toMatch(/2\.3 MB/);
    expect(meta).toMatch(/104 pages/);
    expect(meta).toMatch(/text extracted/);
  });

  it("hides the two alternative starts once a file is attached", () => {
    // They would abandon what was just uploaded.
    renderPanel("upload", baseVm());
    expect(control("Write in the screenplay editor")).toBeTruthy();

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("upload", baseVm({ state: { uploadedFile: { name: "a.pdf", size: 10 } } }));
    expect(control("Write in the screenplay editor")).toBeUndefined();
  });

  it("becomes ONE field for a content-only collaborator, with no picker at all", () => {
    renderPanel("upload", baseVm({ mode: { isContentOnlyEditMode: true, editId: "s1" } }));

    expect(document.querySelector("input[type='file']")).toBeNull();
    expect(document.getElementById("su-script-content")).toBeTruthy();
    expect(document.querySelectorAll("textarea")).toHaveLength(1);
  });
});

/* ───────────────────────── Panel 2.1 · basics ────────────────────────── */

describe("BasicsPanel", () => {
  it("reports the page count as a status, never as a disabled input", () => {
    // It is DETECTED by the extractor; neither platform offers a field for it,
    // and a greyed-out box invites someone to try to fix it on the wrong panel.
    renderPanel("basics", baseVm());

    const anchor = document.getElementById("su-page-count");
    expect(anchor.querySelector("input")).toBeNull();
    expect(anchor.textContent).toMatch(/104 pages/);
  });

  it("says where to fix a missing page count rather than just refusing", () => {
    renderPanel("basics", baseVm({ state: { formData: { ...baseVm().state.formData, pageCount: "" } } }));
    expect(document.getElementById("su-page-count").textContent).toMatch(/go back to upload/i);
  });

  it("asks for a custom format only when the format is 'other'", () => {
    renderPanel("basics", baseVm());
    expect(document.getElementById("su-format-other")).toBeNull();

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("basics", baseVm({ state: { formData: { ...baseVm().state.formData, format: "other" } } }));
    expect(document.getElementById("su-format-other")).toBeTruthy();
  });
});

/* ──────────────────────── Panels 2.2–2.4 ─────────────────────────────── */

describe("StoryPanel", () => {
  it("hands typing straight to the orchestrator's own handler", () => {
    const handleChange = vi.fn();
    renderPanel("story", baseVm({ actions: { handleChange } }));

    type(document.querySelector("#su-logline textarea"), "New logline");
    expect(handleChange).toHaveBeenCalled();
  });

  it("puts each AI generator AFTER its field, not inside the label", () => {
    // On a phone the label is the first thing read and the last thing that
    // should carry a second tab stop.
    renderPanel("story", baseVm());
    const generate = control("Generate a logline");
    const field = document.getElementById("su-logline");

    expect(generate).toBeTruthy();
    expect(field.compareDocumentPosition(generate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("disables every generator while one is running", () => {
    renderPanel("story", baseVm({ state: { metaLoadingField: "logline" } }));
    expect(control("Generate a synopsis").disabled).toBe(true);
  });
});

describe("CastPanel", () => {
  it("says the cast is optional rather than showing an empty list", () => {
    renderPanel("cast", baseVm());
    expect(document.getElementById("su-role-list").textContent).toMatch(/no roles yet/i);
  });

  it("draws each role as a card in an ordered list, with named actions", () => {
    renderPanel("cast", baseVm({
      state: {
        roles: [
          { characterName: "Arshad", type: "Lead", description: "", gender: "Male", ageRange: { min: 38, max: 48 } },
          { characterName: "Meher", type: "Lead", description: "", gender: "Female", ageRange: { min: "", max: "" } },
        ],
      },
    }));

    expect(document.querySelectorAll(".ckm-upload__stack > li")).toHaveLength(2);
    expect(document.getElementById("su-role-0-min-age")).toBeTruthy();
    expect(document.getElementById("su-role-1-max-age")).toBeTruthy();
  });

  it("routes an age edit to the orchestrator with the row index intact", () => {
    const updateRoleAge = vi.fn();
    renderPanel("cast", baseVm({
      state: { roles: [{ characterName: "A", type: "", description: "", gender: "Any", ageRange: { min: "", max: "" } }] },
      actions: { updateRoleAge },
    }));

    type(document.querySelector("#su-role-0-max-age input"), "48");
    expect(updateRoleAge).toHaveBeenCalledWith(0, "max", "48");
  });
});

describe("ProgressPanel", () => {
  it("is a fieldset with a legend, not two unrelated toggles", () => {
    renderPanel("progress", baseVm());
    expect(document.querySelector("fieldset legend")).toBeTruthy();
    expect(document.querySelectorAll("input[type='radio']").length).toBe(SCRIPT_COMPLETION_OPTIONS.length);
  });

  it("reveals the parts fields only when the script is not complete", () => {
    renderPanel("progress", baseVm());
    expect(document.getElementById("su-completed-parts")).toBeTruthy();

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("progress", baseVm({
      state: { formData: { ...baseVm().state.formData, completionStatus: "complete" } },
    }));
    expect(document.getElementById("su-completed-parts")).toBeNull();
  });
});

/* ───────────────────────── Panel 2.5 · access ────────────────────────── */

describe("AccessPanel", () => {
  it("summons the preview instead of embedding a document renderer", () => {
    // Desktop mounts ScreenplayPdfViewer inside the scrolling form; on a phone
    // that is a second document renderer living behind the keyboard.
    renderPanel("access", baseVm({ state: { pdfPageTexts: ["PAGE ONE", "PAGE TWO"] } }));

    expect(document.querySelector("[role='dialog']")).toBeNull();
    click(control("Preview 2 pages"));
    expect(document.querySelector("[role='dialog']")).toBeTruthy();
  });

  it("refuses the preview honestly when there is nothing extracted yet", () => {
    renderPanel("access", baseVm({ state: { pdfPageTexts: [] } }));
    const button = control("Nothing to preview yet");

    expect(button.disabled).toBe(true);
    expect(document.body.textContent).toMatch(/appears once the text has been read/i);
  });

  it("hides the range fields when the preview is switched off", () => {
    renderPanel("access", baseVm({
      state: { formData: { ...baseVm().state.formData, viewableScript: false } },
    }));
    expect(document.getElementById("su-preview-start")).toBeNull();
  });
});

/* ───────────────────────── Panel 2.6 · media ─────────────────────────── */

describe("MediaPanel", () => {
  it("draws all three slots for a paid plan", () => {
    renderPanel("media", baseVm());
    const labels = Array.from(document.querySelectorAll(".ckm-media__eyebrow")).map((el) => el.textContent);
    expect(labels).toEqual(["Cover image", "Trailer video", "Pitch video"]);
  });

  it("locks the pitch slot behind an upgrade for a free plan", () => {
    renderPanel("media", baseVm({ user: { subscription: { plan: "free" } } }));
    const labels = Array.from(document.querySelectorAll(".ckm-media__eyebrow")).map((el) => el.textContent);

    expect(labels).not.toContain("Pitch video");
    expect(document.body.textContent).toMatch(/premium feature/i);
  });

  it("re-opens the cropper through the orchestrator's own editor", () => {
    const openThumbnailEditor = vi.fn();
    const file = { name: "cover.jpg", size: 1024 };
    renderPanel("media", baseVm({
      state: { thumbnailFile: file, thumbnailPreviewUrl: "blob:x" },
      actions: { openThumbnailEditor },
    }));

    click(control("Adjust"));
    expect(openThumbnailEditor).toHaveBeenCalledWith(file);
  });

  it("shows a REAL upload figure when one is in flight (D14)", () => {
    renderPanel("media", baseVm({
      state: {
        thumbnailFile: { name: "cover.jpg", size: 1024 },
        thumbnailPreviewUrl: "blob:x",
        mediaProgress: { thumbnail: { percent: 62, status: "uploading" } },
      },
    }));

    const bar = document.querySelector("progress");
    expect(bar.value).toBe(62);
    // The percentage is in text as well as in the bar, and the live region is
    // the text — announcing a hundred increments would be noise.
    expect(document.querySelector(".ckm-media__progress-value").textContent).toMatch(/62%/);
  });

  it("hides the AI cover pager until there is more than one to step between", () => {
    const single = baseVm({
      state: {
        thumbnailFile: { name: "ai-cover-1.jpg", size: 1 }, thumbnailPreviewUrl: "blob:x",
        aiCoverHistory: [{ name: "ai-cover-1.jpg", size: 1 }], aiCoverIndex: 0,
      },
    });
    renderPanel("media", single);
    expect(document.querySelector(".ckm-media__history")).toBeNull();

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("media", baseVm({
      state: {
        thumbnailFile: { name: "ai-cover-2.jpg", size: 1 }, thumbnailPreviewUrl: "blob:x",
        aiCoverHistory: [{ name: "a", size: 1 }, { name: "b", size: 1 }], aiCoverIndex: 1,
        aiCoverAttempts: 2, aiCoverRemaining: 13,
      },
    }));
    expect(document.querySelector(".ckm-media__history")).toBeTruthy();
    expect(control("Previous generated cover")).toBeTruthy();
  });

  it("renders the spent plan-period quota before the writer taps generate", () => {
    renderPanel("media", baseVm({ state: { aiCoverRemaining: 0 } }));

    const generate = document.querySelector(".ckm-media__drop--alt");
    expect(generate.disabled).toBe(true);
    expect(generate.textContent).toMatch(/AI cover limit reached/i);
    expect(generate.textContent).toMatch(/this plan period/i);
  });

  it("tells the writer when media actually uploads, and the answer differs for an edit", () => {
    renderPanel("media", baseVm());
    expect(document.body.textContent).toMatch(/uploads when you submit, not now/i);

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("media", baseVm({ mode: { editId: "s1" } }));
    expect(document.body.textContent).toMatch(/existing public media stays in place/i);
  });
});

/* ───────────────────────── Panels 3 and 4 ────────────────────────────── */

describe("ClassifyPanel", () => {
  it("drives the capped groups one tag at a time through the shared toggle", () => {
    // `toggleClassification` owns the three-item cap AND the message shown when
    // a fourth is tapped. Two implementations of a cap is how the platforms end
    // up disagreeing about whether four tags are allowed.
    const toggleClassification = vi.fn();
    renderPanel("classify", baseVm({ actions: { toggleClassification } }));

    click(control("Gritty"));
    expect(toggleClassification).toHaveBeenCalledWith("tones", "Gritty");
  });
});

describe("FilmPanel", () => {
  it("uses two independent checkboxes for two independent answers", () => {
    // Wanting to direct and wanting to produce are not alternatives; desktop's
    // card pair looks like a segmented choice and toggles independently.
    renderPanel("film", baseVm());
    expect(document.querySelectorAll("fieldset input[type='checkbox']")).toHaveLength(2);
  });

  it("asks which language only after 'Other' is chosen", () => {
    renderPanel("film", baseVm());
    expect(document.getElementById("su-film-language-custom")).toBeNull();

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("film", baseVm({
      state: { filmDetails: { filmLanguage: "Other", filmLanguageCustom: "", dialoguesPresent: "yes" } },
    }));
    expect(document.getElementById("su-film-language-custom")).toBeTruthy();
  });
});

/* ───────────────────────── Panel 5 · publish ─────────────────────────── */

describe("PublishPanel", () => {
  it("shows the presets AND the custom box at once", () => {
    // Desktop hides the custom input behind a "Custom" chip, so a writer who
    // wants ₹75 must first discover that a chip reveals a field.
    renderPanel("publish", baseVm());

    expect(document.querySelectorAll(".ckm-chip").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector("#su-custom-price input")).toBeTruthy();
  });

  it("switches to the custom price the moment one is typed", () => {
    const setUseCustomPrice = vi.fn();
    const setCustomPriceInput = vi.fn();
    renderPanel("publish", baseVm({ actions: { setUseCustomPrice, setCustomPriceInput } }));

    type(document.querySelector("#su-custom-price input"), "075");
    expect(setUseCustomPrice).toHaveBeenCalledWith(true);
    // The desktop leading-zero strip, kept.
    expect(setCustomPriceInput).toHaveBeenCalledWith("75");
  });

  it("states what the buyer pays and what the writer receives", () => {
    renderPanel("publish", baseVm());
    const invoice = document.querySelector(".ckm-upload__invoice");

    expect(invoice.textContent).toMatch(/Script Access Fee/);
    expect(invoice.textContent).toMatch(/Projected Writer Payout/);
  });

  it("asks for the licence length only for an exclusive licence", () => {
    renderPanel("publish", baseVm());
    expect(document.getElementById("su-license-duration")).toBeNull();

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("publish", baseVm({
      state: { rightsLicensing: { ...baseVm().state.rightsLicensing, rightsType: "exclusive_license" } },
    }));
    expect(document.getElementById("su-license-duration")).toBeTruthy();
  });

  it("reveals the royalty fields only for a royalty-based structure", () => {
    renderPanel("publish", baseVm({
      state: {
        rightsLicensing: {
          ...baseVm().state.rightsLicensing,
          paymentStructure: "lower_upfront_plus_royalty_percent",
          royaltySettings: { percentage: 5, durationType: "years", durationYears: 3 },
        },
      },
    }));
    expect(document.getElementById("su-royalty-percentage")).toBeTruthy();
  });

  it("makes the agreement a NAMED, FOCUSABLE scroll region", () => {
    /*
     * WCAG 2.1.1: a scrollable region that is not focusable cannot be scrolled
     * by a keyboard or switch user at all, and a several-thousand-word agreement
     * in a 240px box is exactly the case that rule exists for.
     */
    renderPanel("publish", baseVm());
    const region = document.querySelector(".ckm-upload__agreement");

    expect(region.getAttribute("tabindex")).toBe("0");
    expect(region.getAttribute("role")).toBe("region");
    expect(region.getAttribute("aria-label")).toMatch(/terms/i);
  });

  it("writes BOTH flags from the one terms checkbox", () => {
    // The server reads `platformTermsAccepted`; the client validation reads
    // both. A writer who ticks one box has agreed once, not half.
    const setLegal = vi.fn();
    const setRightsLicensing = vi.fn();
    renderPanel("publish", baseVm({ actions: { setLegal, setRightsLicensing } }));

    // A click, not a synthetic `change`: React maps a checkbox's `onChange` onto
    // the native click event, so dispatching `change` directly never reaches it.
    click(document.querySelector("#su-legal-terms input[type='checkbox']"));

    expect(setLegal).toHaveBeenCalled();
    expect(setRightsLicensing).toHaveBeenCalled();
  });

  it("flushes recovery data before the full terms open in a new tab", () => {
    const flushWorkingSnapshot = vi.fn();
    renderPanel("publish", baseVm({ actions: { flushWorkingSnapshot } }));
    const link = Array.from(document.querySelectorAll("a"))
      .find((element) => element.textContent.includes("Open the full Script Upload Terms"));

    expect(link.getAttribute("target")).toBe("_blank");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => link.dispatchEvent(event));
    expect(flushWorkingSnapshot).toHaveBeenCalledTimes(1);
  });

  it("reports whether the agreement has actually been scrolled", () => {
    renderPanel("publish", baseVm());
    expect(document.querySelector(".ckm-upload__agreement-status").textContent)
      .toMatch(/scroll to the end/i);

    act(() => root.unmount());
    document.body.innerHTML = "";

    renderPanel("publish", baseVm({ state: { agreementScrolled: true } }));
    expect(document.querySelector(".ckm-upload__agreement-status").textContent)
      .toMatch(/reviewed/i);
  });
});
