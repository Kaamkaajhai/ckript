import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractOutline } from "../../components/screenplay/screenplayMode";
import { getScenes } from "../../components/screenplay/sceneIdentity";
import { moveScene } from "../../components/screenplay/sceneReorder";
import { CreateProjectContext } from "../../pages/CreateProject/CreateProjectContext";
import { DETAILS_STEPS } from "../../pages/CreateProject/constants";
import CreateProjectChrome from "../screens/create/CreateProjectChrome";
import "../screens/create/Wizard.css";

/*
 * Development-only harness for the whole create-project chrome — every surface
 * (/__mobile-create; see App.jsx, never built into production routes).
 *
 * IT REPLACES /__mobile-editor, AND THE REASON IT STILL EXISTS IS NOT THE OLD ONE.
 * The editor harness existed because the chrome had no production URL. It has
 * one now. What has not changed is that the live route authenticates, fetches
 * drafts, autosaves and mounts a collaboration socket, so it renders a
 * different screen on every run — and the checks that matter most for these
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
 *          | locked | titled | competition | competition-submitted
 *          | crop | titlepage | saving | reports-empty | reports-long
 *          | media-attached | media-preflight | media-uploading | media-failed | media-cancelled
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

const FIXTURE_TITLE_PAGE = {
  title: "THE FOUR O'CLOCK TRAIN",
  credit: "Written by",
  author: "Arshad Rahman",
  contact: "arshad@example.com",
};

const FIXTURE_COMMENTS = [
  { _id: "c1", body: "This beat repeats the one on page 2 — cut it or make it land differently.", authorId: "u1", authorName: "Arshad Rahman", anchor: { quote: "A ceiling fan turns too slowly to matter." } },
  { _id: "c1r", parentId: "c1", body: "Agreed. Losing it.", authorId: "u2", authorName: "Meher Qureshi" },
  { _id: "c2", body: "Lovely.", authorId: "u2", authorName: "Meher Qureshi", resolved: true, anchor: { quote: "There's another at four." } },
  { _id: "c3", body: "Whose coat is wet?", authorId: "u2", authorName: "Meher Qureshi", anchor: { quote: "a line that has since been rewritten" } },
];

/* Sixty rows make the report body genuinely scroll at every phone height. A
   two-scene fixture can prove card geometry but cannot prove that the dialog
   keeps ONE scroll surface when the report becomes feature-length. */
const FIXTURE_LONG_REPORT = Array.from({ length: 60 }, (_, index) => [
  `${index % 2 ? "EXT." : "INT."} REPORT LOCATION ${index + 1} - ${index % 3 ? "DAY" : "NIGHT"}`,
  "",
  index % 2 ? "MEHER" : "ARSHAD",
  `This is report line ${index + 1}.`,
  "",
]).flat().join("\n");

const FIXED_LAST_SAVED = new Date(2026, 7, 9, 14, 32);
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const fixtureFile = (name, size, type) => ({ name, size, type });

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
  /* One filled, one empty — see the fixture note on sceneSynopses below. */
  sceneSynopses: { "INT. RAILWAY RETIRING ROOM - NIGHT": "Arshad waits out a train he has no intention of catching." },
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
  const effectiveScreenplayValue = requested === "reports-empty"
    ? "A note without screenplay structure."
    : requested === "reports-long"
      ? FIXTURE_LONG_REPORT
      : state.screenplayValue;
  const mediaAttached = ["media-attached", "media-preflight", "media-uploading", "media-failed", "media-cancelled"].includes(requested);

  const noop = () => {};

  /*
   * DEV-ONLY HANDLE, and it exists so a sweep can measure the real thing.
   * The comments composer refuses without a selection (D17), and a selection is
   * something only the real CodeMirror can hold — there is no fixture for it.
   * Exposing the same `apiRef` the screen uses lets the sweep call the real
   * `scrollToRange`, so what it then measures is the genuine enabled composer
   * rather than a mock of one. Never reachable in production: this file is only
   * mounted by /__mobile-create.
   */
  useEffect(() => { window.__ckmEditorApi = screenplayApiRef; }, []);

  const value = useMemo(() => ({
    // --- identity and access ---------------------------------------------
    user: { _id: "u1", name: "Arshad Rahman", role: "creator", subscription: { plan: "gold" } },
    canEditContent: requested !== "readonly" && requested !== "competition-submitted",
    hasFullAccess: true,
    hasPublishAccess: requested !== "readonly",
    competitionMode: requested === "competition" || requested === "competition-submitted",
    competition: requested.startsWith("competition") ? {
      _id: "competition-48h",
      name: "Forty Eight Hour Script Challenge",
      slug: "48-hour-2026",
      dates: { endsAt: "2026-08-15T12:00:00.000Z" },
    } : null,
    competitionEntry: requested === "competition-submitted" ? { status: "ai_processed" } : { status: "writing" },
    competitionError: "",
    competitionLoading: false,
    competitionServerNow: "2026-08-13T12:00:00.000Z",
    refreshCompetition: noop,
    setCanEditContent: noop,
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
    handleSave: async () => true,
    lastSaved: FIXED_LAST_SAVED,
    exiting: false,
    loading: requested === "media-uploading",

    // --- messages ----------------------------------------------------------
    error: requested === "error" ? "Logline is required." : error,
    setError,
    importNotice: "",
    metaNotice: { field: "", text: "" },
    metaLoadingField: "",
    toastMessage,
    setToastMessage,
    pendingRecovery: requested === "recovery" ? { updatedAt: new Date(2026, 7, 8, 21, 5).toISOString() } : null,
    pendingMediaRecovery: requested === "media-failed"
      ? { targetScriptId: "script-7", failedTypes: ["trailer"], cancelledTypes: [], title: state.title }
      : requested === "media-cancelled"
        ? { targetScriptId: "script-7", failedTypes: [], cancelledTypes: ["trailer"], title: state.title }
        : null,
    mediaUploadActive: requested === "media-uploading",
    mediaUploadPreflight: requested === "media-preflight"
      ? {
        signature: "trailer:four-oclock-trailer.mp4:184000000:0",
        files: [{ type: "trailer", label: "Trailer video", name: "four-oclock-trailer.mp4", size: 184_000_000 }],
        totalBytes: 184_000_000,
      }
      : null,
    cancelProjectMediaUpload: noop,
    confirmMediaUploadPreflight: noop,
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
    screenplayValue: effectiveScreenplayValue,
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
    /*
     * Scene cards (D15). Two fixture decisions, both learned from the
     * `MediaSlot` lesson in §19.1 — a sweep only measures the state it rendered,
     * and a fixture that never fills a control never tests the filled control:
     *
     *   • ONE card carries a synopsis and one does not, so both the filled and
     *     the placeholder textarea are on screen at 320px;
     *   • `?state=locked` puts a lock held by ANOTHER writer on scene 2, which
     *     is the only way the lock badge and the withheld reorder controls ever
     *     get measured. With `collabLocks: {}` they never render at all.
     */
    collabLocks: requested === "locked"
      ? { [getScenes(state.screenplayValue)[1]?.sceneId]: { holderId: "u2", holderName: "Meher", color: "#c46a3f" } }
      : {},
    collabMyUserId: "u1",
    collabRequestEdit: noop,
    /*
     * The Navigator's outline, built the way `useScreenplayCollab` builds it —
     * `extractOutline` plus the sceneId each row's locks and presence key off.
     * Derived from the live fixture text rather than hand-listed, so a reorder
     * performed during a sweep is reflected in the navigator that sweep then
     * measures.
     */
    outlineWithSceneIds: extractOutline(state.screenplayValue).map((item) => (
      item.type === "scene"
        ? {
          ...item,
          sceneId: getScenes(state.screenplayValue)
            .find((scene) => scene.startLine <= item.line && item.line <= scene.endLine)?.sceneId,
        }
        : item
    )),
    screenplayOutline: extractOutline(effectiveScreenplayValue),
    presenceBySceneId: {},
    /*
     * Live presence for the People surface. Two people, one of them me, one
     * editing a named scene and one merely viewing — so the sweep renders both
     * activity strings rather than only the interesting one.
     */
    collabPeople: [
      { userId: "u1", name: "Arshad Rahman", color: "#c46a3f", state: "editing", sceneHeading: "INT. RAILWAY RETIRING ROOM - NIGHT" },
      { userId: "u2", name: "Meher Qureshi", color: "#3f6ec4", state: "viewing" },
    ],
    sceneSynopses: state.sceneSynopses,
    handleSynopsisChange: (key, value) => setter("sceneSynopses")((prev) => ({ ...prev, [key]: value })),
    /* Wired to the REAL transform, not a spy. A sweep that dispatches Move down
       and then measures the board has to see the board actually change, or it is
       measuring a static grid and calling it a reorder. */
    handleReorderScene: (from, to) => {
      setter("screenplayValue")((text) => moveScene(text, from, to));
      setSaved(false);
    },
    /*
     * Comment fixtures covering the four shapes a thread can have — a thread
     * with replies, one of mine (deletable) and one of someone else's (not), a
     * resolved one behind the filter, and an orphaned one. The `MediaSlot`
     * lesson again: the delete confirmation and the orphan notice cannot be
     * measured by a sweep that renders neither.
     */
    sceneComments: FIXTURE_COMMENTS,
    canComment: requested !== "readonly",
    presenceEnabled: true,
    isCommentOrphaned: (comment) => comment?._id === "c3",
    handleAddComment: noop,
    handleReplyComment: noop,
    setCommentResolved: noop,
    deleteSceneComment: noop,
    handleFocusComment: noop,
    focusedCommentId: null,
    /*
     * `?state=titled` is a CONFIGURED title page; `?state=titlepage` is the
     * configurator OPEN over a script that has none. They are different states
     * and the first sweep of the Navigator conflated them — it asked for
     * `titlepage` expecting a title-page row in the Pages list and measured a
     * list that did not have one, then reported a pass. A fixture that does not
     * enter the state cannot test the state.
     */
    titlePage: state.titlePage || (requested === "titled" ? FIXTURE_TITLE_PAGE : null),
    titlePageActive: Boolean(state.titlePage) || requested === "titled",
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
    charCount: effectiveScreenplayValue.length,
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
    thumbnailFile: mediaAttached ? fixtureFile("four-oclock-cover.jpg", 812_004, "image/jpeg") : null,
    thumbnailPreviewUrl: mediaAttached ? PIXEL : "",
    trailerFile: mediaAttached ? fixtureFile("four-oclock-trailer.mp4", 184_000_000, "video/mp4") : null,
    trailerPreviewUrl: "",
    trailerMeta: mediaAttached ? { duration: 72, width: 1920, height: 1080 } : null,
    trailerMetaLoading: false,
    pitchVideoFile: null,
    pitchVideoPreviewUrl: "",
    pitchVideoMeta: null,
    pitchVideoMetaLoading: false,
    mediaProgress: requested === "media-uploading"
      ? {
        thumbnail: { percent: 100, status: "done" },
        trailer: { percent: 41, status: "uploading" },
      }
      : requested === "media-failed"
        ? { trailer: { percent: 87, status: "failed" } }
        : requested === "media-cancelled"
          ? { trailer: { percent: 41, status: "cancelled" } }
        : {},
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
    detailsSubSteps, effectiveDetailsStep, effectiveScreenplayValue, error, mediaAttached, requested, saved, screenplayEnabled,
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
