// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import ScriptUploadWorkspace from "./ScriptUploadWorkspace";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const renderWorkspace = (vm) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter><ScriptUploadWorkspace vm={vm} /></MemoryRouter>));
  return container;
};

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

const createVm = (stateOverrides = {}) => ({
  user: { subscription: { plan: "gold" } },
  mode: { isContentOnlyEditMode: false, editId: null, branchMode: false },
  state: {
    step: 1,
    detailStep: 0,
    formData: {
      title: "",
      format: "feature",
      formatOther: "",
      pageCount: "",
      viewableScript: true,
      previewWindowStart: "1",
      previewWindowEnd: "8",
      primaryGenre: "",
      logline: "",
      synopsis: "",
      completionStatus: "complete",
      completedParts: "",
      totalParts: "",
      futurePlans: "",
    },
    classification: { tones: [], themes: [], settings: [] },
    services: { hosting: true, evaluation: false, aiTrailer: false, spotlight: false },
    legal: { agreedToTerms: false, customInvestorTerms: "" },
    rightsLicensing: {
      rightsType: "full_rights_sale",
      modificationRights: "buyer_must_consult_writer",
      paymentStructure: "one_time_upfront_payment",
      negotiationMode: "fixed_terms_non_negotiable",
      customConditions: "",
      timeBound: { licenseDurationMonths: 12, autoRevertToWriter: true },
      royaltySettings: { percentage: 0, durationType: "none", durationYears: 0 },
      legalAcknowledgement: {
        ownershipConfirmed: false,
        platformTermsAccepted: false,
        exclusivityUnderstood: false,
      },
    },
    roles: [],
    filmDetails: {
      filmLanguage: "",
      filmLanguageCustom: "",
      dialoguesPresent: "yes",
      wantToDirect: false,
      wantToProduce: false,
      scriptStyle: [],
    },
    tagsInput: "",
    uploadedFile: null,
    uploadedPdfFile: null,
    existingUploadedFile: null,
    textContent: "",
    pdfPageTexts: [],
    pdfTextExtracted: false,
    fromDraft: false,
    isExtracting: false,
    uploadProgress: 0,
    thumbnailFile: null,
    thumbnailPreviewUrl: "",
    isGeneratingAiCover: false,
    aiCoverAttempts: 0,
    aiCoverHistory: [],
    aiCoverIndex: -1,
    trailerFile: null,
    trailerPreviewUrl: "",
    trailerMetaLabel: "",
    pitchVideoFile: null,
    pitchVideoPreviewUrl: "",
    pitchVideoMetaLabel: "",
    metaLoadingField: "",
    metaNotice: { field: "", text: "" },
    error: "",
    validationErrors: [],
    validationAttempt: 0,
    pdfNotice: "",
    creationBlocked: false,
    scriptLimit: { applies: true, used: 0, limit: 8, plan: "gold" },
    loading: false,
    agreementScrolled: true,
    isPremium: true,
    scriptPrice: 10,
    customPriceInput: "",
    useCustomPrice: false,
    toastMessage: null,
    ...stateOverrides,
  },
  actions: {
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleFileSelect: vi.fn(),
    handleChange: vi.fn(),
    setFormData: vi.fn(),
    setTextContent: vi.fn(),
    openEditor: vi.fn(),
    openDrafts: vi.fn(),
    openPricing: vi.fn(),
    handleGenerateMetadata: vi.fn(),
    setTagsInput: vi.fn(),
    addRole: vi.fn(),
    removeRole: vi.fn(),
    updateRoleField: vi.fn(),
    updateRoleAge: vi.fn(),
    setFilmDetails: vi.fn(),
    toggleClassification: vi.fn(),
    generateAiCover: vi.fn(),
    downloadWatermarkedImage: vi.fn(),
    setThumbnailFile: vi.fn(),
    handleThumbnailSelect: vi.fn(),
    setAiCoverHistoryIndex: vi.fn(),
    handleTrailerSelect: vi.fn(),
    setTrailerFile: vi.fn(),
    handlePitchVideoSelect: vi.fn(),
    setPitchVideoFile: vi.fn(),
    setIsPremium: vi.fn(),
    setScriptPrice: vi.fn(),
    setUseCustomPrice: vi.fn(),
    setCustomPriceInput: vi.fn(),
    setServices: vi.fn(),
    setLegal: vi.fn(),
    setRightsLicensing: vi.fn(),
    onStepSelect: vi.fn(),
    onDetailSelect: vi.fn(),
    dismissToast: vi.fn(),
    focusValidationIssue: vi.fn(),
    handleBack: vi.fn(),
    handleNext: vi.fn(),
    handleSaveDraft: vi.fn(),
    handleSubmit: vi.fn((event) => event.preventDefault()),
    cancelContentEdit: vi.fn(),
  },
  elements: {
    fileInputRef: createRef(),
    thumbnailInputRef: createRef(),
    trailerInputRef: createRef(),
    pitchVideoInputRef: createRef(),
    agreementRef: createRef(),
  },
  options: {
    formats: [{ value: "feature", label: "Feature" }],
    formatRanges: { feature: { min: 70, max: 180, typical: "90-120", label: "Feature" } },
    genres: ["Drama"],
    tones: ["Hopeful"],
    themes: ["Redemption"],
    settings: ["Contemporary"],
    roleGenders: ["Any"],
    languages: ["English", "Other"],
    styles: [{ id: "Professional", desc: "Industry-standard structure" }],
    completion: [
      { value: "complete", label: "Full script completed", helper: "The story is finished." },
      { value: "partial", label: "Partially completed", helper: "Only part is ready." },
      { value: "ongoing", label: "Ongoing / more coming", helper: "More parts are planned." },
    ],
    rights: [
      { value: "full_rights_sale", title: "Full Rights Sale", tag: "ownership transfer", short: "Full sale", desc: "Transfer ownership." },
      { value: "exclusive_license", title: "Exclusive License", tag: "time-bound", short: "Exclusive license", desc: "License for a term." },
    ],
    modification: [{ value: "buyer_must_consult_writer", label: "Buyer must consult writer" }],
    payments: [{ value: "one_time_upfront_payment", label: "One-time upfront payment" }],
    negotiations: [{ value: "fixed_terms_non_negotiable", label: "Fixed terms" }],
    licenseDurations: [12, 18, 24],
    pricePresets: [5, 10, 15],
  },
  computed: {
    pageCountWarning: "",
    effectivePrice: 10,
    buyerTotalPayable: 10.5,
    writerPayout: 10,
    priceGuide: "Suggested ₹15–₹50 for Feature Film",
    publishServices: [{ key: "hosting", label: "Hosting & Discovery", enabled: true, detail: "Listed in discovery.", meta: "Included", onToggle: vi.fn() }],
    legalAgreement: "Agreement text",
    publishInvoiceRows: [{ item: "Script Access Fee", detail: "Premium access", amount: "₹10" }],
  },
});

describe("ScriptUploadWorkspace", () => {
  it("renders the functional upload entry screen and forwards the primary action", () => {
    const vm = createVm();
    const view = renderWorkspace(vm);

    expect(view.textContent).toContain("Add your script");
    expect(view.querySelector("#su-project-title")).not.toBeNull();
    expect(view.querySelector('input[type="file"]').accept).toContain(".doc");

    const continueButton = view.querySelector(".su-action-bar .su-next");
    act(() => continueButton.click());
    expect(vm.actions.handleNext).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing ongoing completion state available in the prototype flow", () => {
    const vm = createVm({ step: 2, detailStep: 3 });
    const view = renderWorkspace(vm);

    expect(view.textContent).toContain("How complete is it?");
    const ongoingButton = Array.from(view.querySelectorAll("button")).find((button) => button.textContent.includes("Ongoing / more coming"));
    expect(ongoingButton).not.toBeUndefined();
    expect(ongoingButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps Publish actionable so incomplete legal fields can receive page-level feedback", () => {
    const vm = createVm({ step: 5 });
    const view = renderWorkspace(vm);

    expect(view.textContent).toContain("Full Rights Sale");
    expect(view.textContent).toContain("Set your price");
    expect(view.textContent).toContain("Legal acknowledgements");
    const publishButton = Array.from(view.querySelectorAll("button")).find((button) => button.textContent.includes("Publish for review"));
    expect(publishButton.disabled).toBe(false);
    act(() => publishButton.click());
    expect(vm.actions.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows validation only in the upload toast while marking the owning field", () => {
    const validationIssue = {
      screen: "story",
      step: 2,
      detailStep: 1,
      label: "Story",
      fieldId: "su-synopsis",
      code: "synopsis-required",
      message: "Write a synopsis before continuing.",
    };
    const vm = createVm({
      step: 2,
      detailStep: 1,
      validationErrors: [validationIssue],
      validationAttempt: 1,
      toastMessage: {
        id: "validation-toast",
        type: "error",
        title: "Story needs attention",
        text: validationIssue.message,
        duration: 8000,
        action: { label: "Review field", onClick: vi.fn() },
      },
    });
    const view = renderWorkspace(vm);

    expect(view.textContent).toContain("Story needs attention");
    expect(view.querySelector(".su-validation-card")).toBeNull();
    expect(view.querySelector(".su-alert--error")).toBeNull();
    expect(view.querySelector("#su-synopsis").getAttribute("aria-invalid")).toBe("true");
    expect(view.querySelector("#su-synopsis").getAttribute("aria-describedby")).toBe("su-upload-toast-message");
  });
});
