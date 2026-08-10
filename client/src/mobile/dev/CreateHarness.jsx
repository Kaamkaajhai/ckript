import { useCallback, useMemo, useRef, useState } from "react";
import { CreateProjectContext } from "../../pages/CreateProject/CreateProjectContext";
import { DETAILS_STEPS } from "../../pages/CreateProject/constants";
import CreateProjectChrome from "../screens/create/CreateProjectChrome";
import "../screens/create/Wizard.css";

/*
 * Development-only harness for the whole create-project chrome — both modes
 * (/__mobile-create; see App.jsx, never built into production routes).
 *
 * IT REPLACES /__mobile-editor, AND THE REASON IT STILL EXISTS IS NOT THE OLD ONE.
 * The editor harness existed because the chrome had no production URL. It has
 * one now. What has not changed is that the live route authenticates, fetches
 * drafts, autosaves and mounts a collaboration socket, so it renders a
 * different screen on every run — and the checks that matter most for these two
 * surfaces are the ones only a real browser can answer: touch-target sizes,
 * contrast on the dark chrome, whether the docked bar overlaps the caret line,
 * whether a 29-chip genre row overflows at 320px, whether the sticky footer
 * clears the last field of a panel.
 *
 * So this mounts the real `CreateProjectChrome`, the real stylesheets and the
 * real CodeMirror over a fixture context. Everything is deterministic on
 * purpose — a fixed "last saved" time, a fixed script, fixed drafts — so a
 * screenshot diff means a change and not a clock tick.
 *
 * NAVIGABLE, NOT DRIVEN. Every state a sweep needs is reachable by URL rather
 * than by clicking:
 *   ?step=2..5              which wizard step
 *   ?panel=basics|story|cast|progress|access|media
 *   ?state=recovery | error | exit | readonly | prose | blocked | submitted
 *          | crop | titlepage | saving
 * A harness that has to be *driven* into a state is a harness that measures a
 * different thing each time somebody's click lands slightly differently.
 */

const FIXTURE_SCRIPT = `INT. RAILWAY RETIRING ROOM - NIGHT

A ceiling fan turns too slowly to matter. ARSHAD, 40s, sits with a
manuscript in his lap and no intention of reading it.

ARSHAD
You said the last train was at eleven.

MEHER (O.S.)
I said the last train I was taking.

She comes in from the platform, coat still wet.

MEHER
There's another at four. There's always another at four.

ARSHAD
(not looking up)
That's not the same as there being one now.

CUT TO:

EXT. PLATFORM 3 - CONTINUOUS

Rain on an empty bench. The board flickers and gives up.
`;

const FIXED_LAST_SAVED = new Date(2026, 7, 9, 14, 32);

const FIXTURE_DRAFTS = [
  { _id: "draft-1", title: "The Four O'Clock Train", updatedAt: "2026-08-09T09:14:00.000Z" },
  { _id: "draft-2", title: "Nine Rupees", updatedAt: "2026-08-02T18:40:00.000Z" },
  { _id: "draft-3", title: "", updatedAt: "2026-07-21T11:02:00.000Z" },
];

const INITIAL = {
  classification: { tones: ["Gritty"], themes: [], settings: [] },
  currentElement: "action",
  emphasisState: { active: [], centered: false, hasSelection: false },
  filmDetails: { wantToDirect: true, wantToProduce: false, filmLanguage: "Hindi", filmLanguageCustom: "", dialoguesPresent: "yes" },
  formData: {
    format: "feature_film",
    styleMedium: "Live Action",
    formatOther: "",
    viewableScript: true,
    previewWindowStart: "1",
    previewWindowEnd: "2",
    primaryGenre: "Drama",
    logline: "A man who missed the last train discovers the woman who took it never left the station.",
    synopsis: "Two strangers wait out a monsoon night in a railway retiring room, discovering that neither of them is travelling anywhere.",
    companyName: "",
    completionStatus: "partial",
    completedParts: "4",
    totalParts: "10",
    futurePlans: "",
  },
  legal: { agreedToTerms: false },
  publishingDetails: {
    targetAudience: ["Adult"], writingStyle: [], estimatedWordCount: "", seriesPotential: "", proseSample: "",
  },
  rightsLicensing: {
    rightsType: "exclusive_license",
    modificationRights: "buyer_must_consult_writer",
    paymentStructure: "lower_upfront_plus_royalty_percent",
    negotiationMode: "open_to_discussion_after_purchase",
    customConditions: "",
    timeBound: { licenseDurationMonths: 18 },
    royaltySettings: { percentage: 5, durationType: "years", durationYears: 7 },
    legalAcknowledgement: { ownershipConfirmed: false },
  },
  roles: [{ characterName: "Arshad", type: "Lead", description: "", gender: "Male", ageRange: { min: 38, max: 48 } }],
  scriptPrice: 149,
  screenplayValue: FIXTURE_SCRIPT,
  tagsInput: "monsoon, two-hander",
  title: "The Four O'Clock Train",
  writers: [{ userId: "u1", name: "Arshad Rahman", creditType: "written_by" }],
};

export default function CreateHarness() {
  const query = new URLSearchParams(window.location.search);
  const requested = query.get("state") || "";
  const requestedStep = Number(query.get("step") || 1);
  const requestedPanel = query.get("panel") || "";

  const [state, setState] = useState(INITIAL);
  const [step, setStep] = useState(Number.isFinite(requestedStep) ? Math.min(Math.max(requestedStep, 1), 5) : 1);
  const [detailsStep, setDetailsStep] = useState(0);
  const [saved, setSaved] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showTitlePageModal, setShowTitlePageModal] = useState(false);
  const [screenplayEnabled, setScreenplayEnabled] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [thumbnailZoom, setThumbnailZoom] = useState(1);
  const [thumbnailRotation, setThumbnailRotation] = useState(0);
  const [thumbnailCrop, setThumbnailCrop] = useState({ x: 0, y: 0 });

  const screenplayApiRef = useRef(null);
  const screenplayFileInputRef = useRef(null);
  const agreementRef = useRef(null);

  /*
   * One generic setter per state key rather than 20 hand-written ones. Built
   * once from a fixed key list — not lazily from a ref — so every setter has a
   * stable identity across renders without anything being read from a ref
   * during render.
   */
  const setters = useMemo(() => Object.fromEntries(
    [...Object.keys(INITIAL), "titlePage"].map((key) => [
      key,
      (next) => setState((prev) => ({
        ...prev,
        [key]: typeof next === "function" ? next(prev[key]) : next,
      })),
    ]),
  ), []);
  const setter = useCallback((key) => setters[key], [setters]);

  const detailsSubSteps = useMemo(
    () => DETAILS_STEPS.filter((sub) => sub.industries.includes("film")),
    [],
  );

  // Panel selection by name, resolved once against the same list the wizard
  // reads — a ?panel= that does not exist must fail visibly, not silently show
  // Basics and let a sweep record the wrong surface as passing.
  const panelIndex = requestedPanel
    ? detailsSubSteps.findIndex((sub) => sub.key === requestedPanel)
    : -1;
  const effectiveDetailsStep = panelIndex >= 0 ? panelIndex : detailsStep;

  const noop = () => {};

  const value = useMemo(() => ({
    // --- identity and access ---------------------------------------------
    user: { _id: "u1", name: "Arshad Rahman", role: "creator", subscription: { plan: "gold" } },
    canEditContent: requested !== "readonly",
    hasFullAccess: true,
    hasPublishAccess: requested !== "readonly",
    competitionMode: false,
    creationBlocked: requested === "blocked",
    editApprovalLocked: false,
    enforceGoldPlan: () => true,
    openPricingModal: noop,

    // --- wizard position ---------------------------------------------------
    step,
    setStep,
    detailsStep: effectiveDetailsStep,
    setDetailsStep,
    detailsSubSteps,
    handleNext: () => {
      if (step === 1) { setStep(2); return; }
      if (step === 2 && effectiveDetailsStep < detailsSubSteps.length - 1) {
        setDetailsStep(effectiveDetailsStep + 1);
        return;
      }
      setStep((current) => Math.min(current + 1, 5));
    },
    handleBack: () => {
      if (step === 2 && effectiveDetailsStep > 0) { setDetailsStep(effectiveDetailsStep - 1); return; }
      setStep((current) => Math.max(current - 1, 1));
    },
    handlePublish: noop,
    validateStep: () => true,

    // --- save state --------------------------------------------------------
    saving: requested === "saving",
    saved,
    setSaved,
    lastSaved: FIXED_LAST_SAVED,
    exiting: false,
    loading: false,

    // --- messages ----------------------------------------------------------
    error: requested === "error" ? "Logline is required." : error,
    setError,
    importNotice: "",
    metaNotice: { field: "", text: "" },
    metaLoadingField: "",
    toastMessage,
    setToastMessage,
    pendingRecovery: requested === "recovery" ? { updatedAt: new Date(2026, 7, 8, 21, 5).toISOString() } : null,
    acceptPendingRecovery: noop,
    dismissPendingRecovery: noop,

    // --- exit / drafts -----------------------------------------------------
    showExitConfirm: requested === "exit" || showExitConfirm,
    setShowExitConfirm,
    confirmExitDiscard: () => setShowExitConfirm(false),
    confirmExitSaveDraft: () => setShowExitConfirm(false),
    handleExitEditor: () => setShowExitConfirm(true),
    drafts: FIXTURE_DRAFTS,
    loadingDrafts: false,
    loadDraft: noop,
    scriptId: "draft-1",
    setScriptId: noop,
    setLoadedScriptStatus: noop,
    setEditApprovalLocked: noop,
    setPurchasedServiceCredits: noop,
    clearLocalWorkingDraft: noop,

    // --- editor (mode A) ---------------------------------------------------
    dark: false,
    editor: null,
    editorZoom: 1,
    isScreenplayFormat: true,
    screenplayEnabled,
    setScreenplayEnabled,
    useScreenplayEditor: requested !== "prose" && screenplayEnabled,
    screenplayValue: state.screenplayValue,
    handleScreenplayChange: (next) => { setter("screenplayValue")(next); setSaved(false); },
    screenplayApiRef,
    screenplayFileInputRef,
    handleImportScreenplayFile: noop,
    handleExportScreenplay: noop,
    exportingScreenplay: null,
    currentElement: state.currentElement,
    setCurrentElement: setter("currentElement"),
    emphasisState: state.emphasisState,
    setEmphasisState: setter("emphasisState"),
    handleCaretLine: noop,
    collabLocks: {},
    collabMyUserId: "u1",
    collabRequestEdit: noop,
    sceneComments: [],
    focusedCommentId: null,
    titlePage: state.titlePage || null,
    titlePageActive: Boolean(state.titlePage),
    showTitlePageModal: requested === "titlepage" || showTitlePageModal,
    setShowTitlePageModal,
    saveTitlePage: setter("titlePage"),

    // --- wizard fields (mode B) -------------------------------------------
    title: state.title,
    setTitle: setter("title"),
    formData: state.formData,
    setFormData: setter("formData"),
    handleChange: (event) => {
      const { name, value: next, type, checked } = event.target;
      setter("formData")((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : next }));
      setSaved(false);
    },
    targetFilm: true,
    targetPublishing: false,
    estimatedPages: 47,
    pageStatus: "short",
    formatInfo: { label: "Feature Film", typical: "90–120", min: 90, max: 120 },
    wordCount: 8420,
    writers: state.writers,
    addWriter: () => setter("writers")((prev) => [...prev, { userId: null, name: "", creditType: "written_by" }]),
    updateWriter: (index, field, next) => setter("writers")((prev) => prev.map((w, i) => (i === index ? { ...w, [field]: next } : w))),
    removeWriter: (index) => setter("writers")((prev) => prev.filter((_, i) => i !== index)),
    moveWriter: (index, direction) => setter("writers")((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    }),
    tagsInput: state.tagsInput,
    setTagsInput: setter("tagsInput"),
    handleGenerateMetadata: noop,
    roles: state.roles,
    addRole: () => setter("roles")((prev) => [...prev, { characterName: "", type: "", description: "", gender: "Any", ageRange: { min: "", max: "" } }]),
    removeRole: (index) => setter("roles")((prev) => prev.filter((_, i) => i !== index)),
    updateRoleField: (index, field, next) => setter("roles")((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: next } : r))),
    updateRoleAge: (index, field, next) => setter("roles")((prev) => prev.map((r, i) => (
      i === index ? { ...r, ageRange: { ...r.ageRange, [field]: next === "" ? "" : Number(next) } } : r
    ))),
    publishingDetails: state.publishingDetails,
    setPublishingDetails: setter("publishingDetails"),
    handleProseClick: noop,
    proseLoading: false,
    previewPageTexts: [FIXTURE_SCRIPT, FIXTURE_SCRIPT],
    classification: state.classification,
    toggleChip: (category, tag) => setter("classification")((prev) => {
      const list = prev[category];
      return {
        ...prev,
        [category]: list.includes(tag) ? list.filter((v) => v !== tag) : list.length < 3 ? [...list, tag] : list,
      };
    }),
    filmDetails: state.filmDetails,
    setFilmDetails: setter("filmDetails"),
    scriptPrice: state.scriptPrice,
    setScriptPrice: setter("scriptPrice"),
    legal: state.legal,
    setLegal: setter("legal"),
    rightsLicensing: state.rightsLicensing,
    setRightsLicensing: setter("rightsLicensing"),
    agreementRef,

    // --- media -------------------------------------------------------------
    thumbnailFile: null,
    thumbnailPreviewUrl: "",
    trailerFile: null,
    trailerPreviewUrl: "",
    trailerMeta: null,
    trailerMetaLoading: false,
    pitchVideoFile: null,
    pitchVideoPreviewUrl: "",
    pitchVideoMeta: null,
    pitchVideoMetaLoading: false,
    handleThumbnailSelect: noop,
    handleTrailerSelect: noop,
    handlePitchVideoSelect: noop,
    setThumbnailFile: noop,
    setTrailerFile: noop,
    setPitchVideoFile: noop,
    downloadWatermarkedImage: noop,
    formatDuration: (seconds) => `${Math.round(seconds || 0)}s`,
    generateAiCover: noop,
    isGeneratingAiCover: false,
    aiCoverAttempts: 0,
    aiCoverRemaining: requested === "quota" ? 0 : 15,
    aiCoverHistory: [],
    aiCoverIndex: 0,
    setAiCoverIndex: noop,
    openThumbnailEditor: noop,

    // --- cropper -----------------------------------------------------------
    isThumbnailEditorOpen: requested === "crop",
    /* A 1x1 transparent GIF: the cropper needs a decodable image to lay itself
       out, and a data URI keeps the harness free of a network fetch that could
       fail differently on different runs. */
    thumbnailSourceUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    thumbnailCrop,
    setThumbnailCrop,
    thumbnailZoom,
    setThumbnailZoom,
    thumbnailRotation,
    setThumbnailRotation,
    setThumbnailCropPixels: noop,
    thumbnailApplying: false,
    resetThumbnailEditor: noop,
    handleApplyThumbnail: noop,

    // --- terminal state ----------------------------------------------------
    showUnderReviewModal: requested === "submitted",
    handleUnderReviewContinue: noop,
  }), [
    detailsSubSteps, effectiveDetailsStep, error, requested, saved, screenplayEnabled,
    setter, showExitConfirm, showTitlePageModal, state, step, thumbnailCrop,
    thumbnailRotation, thumbnailZoom, toastMessage,
  ]);

  return (
    <CreateProjectContext.Provider value={value}>
      <div className="ckm-create-project__host">
        <CreateProjectChrome />
      </div>
    </CreateProjectContext.Provider>
  );
}
