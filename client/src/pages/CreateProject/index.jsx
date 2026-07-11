import { useState, useEffect, useCallback, useContext, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Cropper from "react-easy-crop";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useDarkMode } from "../../context/DarkModeContext";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { Move, ZoomIn, RotateCw } from "lucide-react";
import api from "../../services/api";
import { formatCurrency } from "../../utils/currency";
import { buildScriptCompletionPayload, createScriptCompletionFormState, getScriptCompletionValidationMessage } from "../../utils/scriptCompletion";
import ScreenplayFocusMode from "../../components/screenplay/ScreenplayFocusMode";
import { countPages } from "../../components/screenplay/paginate";
import { splitScreenplayIntoPages } from "../../components/screenplay/pages";
import VersionHistoryModal from "../../components/screenplay/VersionHistoryModal";
import { extractOutline } from "../../components/screenplay/screenplayMode";
import { getScenes } from "../../components/screenplay/sceneIdentity";
import { moveScene } from "../../components/screenplay/sceneReorder";
import { fdxToFountain } from "../../components/screenplay/fdx";
import { formatScreenplayLikeText } from "../../utils/screenplayText";
import { allFormats, DETAILS_STEPS, DRAFT_ENDPOINT, LOCAL_WORKING_DRAFT_KEY, SCRIPT_UPLOAD_TERMS_VERSION } from "./constants";
import { getContentTypeFromFormat, FORMAT_PAGE_RANGES } from "./lib/format";
import { THUMBNAIL_ASPECT } from "./lib/imageCrop";
import { useThumbnailEditor } from "./hooks/useThumbnailEditor";
import { useVideoUploads } from "./hooks/useVideoUploads";
import { usePdfExport } from "./hooks/usePdfExport";
import { useAiGeneration } from "./hooks/useAiGeneration";
import { useGrammarFix } from "./hooks/useGrammarFix";
import { useAiCover } from "./hooks/useAiCover";
import { useScreenplayCollab } from "./hooks/useScreenplayCollab";
import { usePayloads } from "./hooks/usePayloads";
import { buildPagePreviewTexts } from "./lib/preview";
import { createDefaultRightsLicensing, normalizeRightsLicensingState, getRightsValidationMessage } from "./lib/rights";
import TitlePageModal from "./components/TitlePageModal";
import DraftCard from "./components/DraftCard";
import { CreateProjectContext } from "./CreateProjectContext";
import Step1Write from "./steps/Step1Write";
import Step2Details from "./steps/Step2Details";
import Step3Classify from "./steps/Step3Classify";
import Step4FilmInfo from "./steps/Step4FilmInfo";
import Step5Publish from "./steps/Step5Publish";
import CreateProjectShell from "./CreateProjectShell";
import "./createProjectEditor.css";

const CreateProject = () => {
  const { isDarkMode: dark, toggleDarkMode } = useDarkMode();
  const { user } = useContext(AuthContext);
  const { openPricingModal } = useAuthModal();

  const navigate = useNavigate();
  const location = useLocation();
  const { draftId } = useParams();
  const shouldStartFresh = !draftId && (
    Boolean(location.state?.startFresh) || new URLSearchParams(location.search).get("fresh") === "1"
  );
  const agreementRef = useRef(null);
  const reviewRedirectTimerRef = useRef(null);

  // Wizard state
  const [step, setStep] = useState(1);
  // Sub-step index within Step 2 (Details), which is itself a mini-wizard paged by
  // the shell footer. Reset to 0 whenever we leave Details (effect below).
  const [detailsStep, setDetailsStep] = useState(0);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [scriptId, setScriptId] = useState(draftId || null);
  // Always-current mirror of scriptId. setScriptId is async, so back-to-back autosaves would each
  // fire with a stale (null) scriptId in their closure and CREATE a new draft every time. The ref
  // is updated synchronously on create, so every save after the first carries the id → it UPDATES
  // the one draft instead of spawning 15-20 duplicates.
  const scriptIdRef = useRef(scriptId);
  scriptIdRef.current = scriptId;
  const [loadedScriptStatus, setLoadedScriptStatus] = useState("draft");
  // Writer "scripts per plan" limit (e.g. Free = 1). Fetched on mount so the gate is visible UPFRONT
  // and blocks progression, rather than only erroring at submit. Shared rule with the server.
  const [scriptLimit, setScriptLimit] = useState(null);
  const [editApprovalLocked, setEditApprovalLocked] = useState(false);
  const [purchasedServiceCredits, setPurchasedServiceCredits] = useState({
    evaluation: false,
    aiTrailer: false,
    spotlight: false,
  });
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);
  // Exit-as-draft confirmation (asked when leaving with meaningful unsaved work).
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exiting, setExiting] = useState(false);
  const discardingRef = useRef(false); // suppresses the keepalive save while discarding on exit
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUnderReviewModal, setShowUnderReviewModal] = useState(false);
  const lastDraftSignatureRef = useRef("");
  const autoSaveInFlightRef = useRef(false);
  // Once the server rejects a NEW draft with a hard, non-transient error (e.g. 402 plan limit,
  // 403), stop the autosave loop from hammering the endpoint. Reset when the user edits again so a
  // later manual save can retry.
  const saveBlockedRef = useRef(false);
  const localDraftHydratedRef = useRef(false);
  const previewPageTextsSignatureRef = useRef("");

  const [previewPageTexts, setPreviewPageTexts] = useState([]);


  // Step 2: Details
  const [formData, setFormData] = useState({
    format: "feature_film",
    styleMedium: "",
    formatOther: "",
    viewableScript: false,
    previewWindowMode: "pages",
    previewWindowStart: "1",
    previewWindowEnd: "8",
    primaryGenre: "",
    logline: "",
    synopsis: "",
    writer: "",
    companyName: "",
    ...createScriptCompletionFormState(),
  });

  // Publishing Layer State
  const [targetFilm, setTargetFilm] = useState(true);
  const [targetPublishing, setTargetPublishing] = useState(false);

  // The active Details sub-steps for the current track (film vs. publishing). Drives
  // both the in-panel sub-stepper and the footer pager; validation is split per panel.
  const detailsIndustry = targetPublishing && !targetFilm ? "publishing" : "film";
  const detailsSubSteps = useMemo(
    () => DETAILS_STEPS.filter((s) => s.industries.includes(detailsIndustry)),
    [detailsIndustry]
  );
  // Keep the sub-step index in range and reset it whenever we leave Details, so
  // re-entering (rail jump, Back from Classify, draft load) always starts clean.
  useEffect(() => {
    if (step !== 2) { setDetailsStep(0); return; }
    setDetailsStep((i) => Math.min(i, detailsSubSteps.length - 1));
  }, [step, detailsSubSteps.length]);
  const [publishingDetails, setPublishingDetails] = useState({
    storyFormat: [],
    writingStyle: [],
    targetAudience: [],
    estimatedWordCount: "",
    seriesPotential: "",
    bookPitch: "",
    proseSample: "",
    previewContent: "none",
    publishingRights: {
      bookPublishing: false,
      digitalPublishing: false,
      audiobookRights: false,
      territory: [],
      languages: [],
      adaptationRights: [],
      exclusivity: "non_exclusive",
      durationYears: "",
      paymentType: "one_time_upfront",
      modificationRights: "buyer_must_consult_writer",
      rightsBundle: "custom",
    }
  });

  // File Upload State
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg, type = "error", action = null) => {
    setToastMessage({ text: msg, type, action });
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  const enforceGoldPlan = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const plan = user?.subscription?.plan || "free";
    if (plan !== "gold") {
      showToast(
        "Purchase the Gold plan to unlock premium tools.",
        "warning",
        { label: "Pricing Plan", onClick: () => openPricingModal("writer") }
      );
      return false;
    }
    return true;
  }, [user, openPricingModal, showToast]);
  const {
    trailerFile,
    setTrailerFile,
    trailerPreviewUrl,
    setTrailerPreviewUrl,
    trailerMeta,
    setTrailerMeta,
    trailerMetaLoading,
    setTrailerMetaLoading,
    trailerInputRef,
    handleTrailerSelect,
    pitchVideoFile,
    setPitchVideoFile,
    pitchVideoPreviewUrl,
    setPitchVideoPreviewUrl,
    pitchVideoMeta,
    setPitchVideoMeta,
    pitchVideoMetaLoading,
    setPitchVideoMetaLoading,
    pitchVideoInputRef,
    handlePitchVideoSelect,
  } = useVideoUploads({ setError });
  const thumbnailInputRef = useRef(null);
  const stepContentRef = useRef(null);

  const {
    isThumbnailEditorOpen,
    thumbnailSourceUrl,
    thumbnailCrop,
    setThumbnailCrop,
    thumbnailZoom,
    setThumbnailZoom,
    thumbnailRotation,
    setThumbnailRotation,
    thumbnailCropPixels,
    setThumbnailCropPixels,
    thumbnailApplying,
    resetThumbnailEditor,
    openThumbnailEditor,
    handleThumbnailSelect,
    handleApplyThumbnail,
  } = useThumbnailEditor({ showToast, setError, setThumbnailFile });

  const handleAnalyzeFormatting = async () => {
    if (!enforceGoldPlan()) return;
    if (!scriptId) return;
    // Implementation details...
  };

  const {
    isGeneratingAiCover,
    setIsGeneratingAiCover,
    aiCoverAttempts,
    setAiCoverAttempts,
    aiCoverHistory,
    setAiCoverHistory,
    aiCoverIndex,
    setAiCoverIndex,
    generateAiCover,
    downloadWatermarkedImage,
  } = useAiCover({ user, title, formData, showToast, openPricingModal, setThumbnailFile });

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [thumbnailFile]);

  const formatDuration = (seconds) => {
    if (!seconds || !Number.isFinite(seconds)) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    const scrollToTop = () => {
      stepContentRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    const frameId = window.requestAnimationFrame(scrollToTop);
    return () => window.cancelAnimationFrame(frameId);
  }, [step]);

  useEffect(() => () => {
    if (reviewRedirectTimerRef.current) {
      clearTimeout(reviewRedirectTimerRef.current);
    }
  }, []);

  // Page count + preview-window clamping are defined below, after the screenplay state.
  const [tagsInput, setTagsInput] = useState("");
  const [roles, setRoles] = useState([]);
  const [filmDetails, setFilmDetails] = useState({
    filmLanguage: "",
    filmLanguageCustom: "",
    dialoguesPresent: "yes",
    wantToDirect: false,
    wantToProduce: false,
    scriptStyle: [],
  });

  // Fountain screenplay editor (Module 1). Canonical Fountain text + enable toggle.
  const [screenplayValue, setScreenplayValue] = useState("");
  // Corkboard synopses (Phase 4 §2) — one-line summaries keyed by normalized heading. Pure
  // metadata: stored on the Script (sceneSynopses), never written into the Fountain text, so
  // they never export into the script.
  const [sceneSynopses, setSceneSynopses] = useState({});
  // Outline notes (Phase 4 §4) — free-form beats/notes kept alongside the script. Script
  // metadata only: autosaves with the draft, never exported into the screenplay.
  const [outlineNotes, setOutlineNotes] = useState("");
  // Transient notice after a Final Draft import (e.g. unmapped element types). Shown in focus mode.
  const [importNotice, setImportNotice] = useState("");
  const [screenplayEnabled, setScreenplayEnabled] = useState(true);

  // Auto-calculated page count. SCREENPLAYS paginate by LINES (industry standard ~55 lines/page,
  // matching the exported PDF via paginate.js) rather than word count; non-screenplay/book formats keep
  // the word estimate. This value is what gets saved as the script's pageCount and shown in the UI.
  const formatInfo = FORMAT_PAGE_RANGES[formData.format] || FORMAT_PAGE_RANGES.feature;
  const estimatedPages = getContentTypeFromFormat(formData.format) !== "book"
    ? countPages(screenplayValue)
    : Math.max(1, Math.round(wordCount / formatInfo.wordsPerPage));
  const pageStatus = estimatedPages < formatInfo.min ? "short" : estimatedPages > formatInfo.max ? "long" : "good";
  useEffect(() => {
    const pageCount = Number(estimatedPages || 0);
    const start = Math.max(1, Number(formData.previewWindowStart || 1) || 1);
    const currentEnd = Math.max(start, Number(formData.previewWindowEnd || 0) || start);

    if (Number(formData.previewWindowEnd || 0) > 0 && Number(formData.previewWindowEnd || 0) < start) {
      setFormData((prev) => ({
        ...prev,
        previewWindowEnd: String(start),
      }));
      return;
    }

    if (pageCount > 0 && (start > pageCount || currentEnd > pageCount)) {
      setFormData((prev) => ({
        ...prev,
        previewWindowStart: String(Math.min(Math.max(1, Number(prev.previewWindowStart || 1) || 1), pageCount)),
        previewWindowEnd: String(Math.min(Math.max(1, Number(prev.previewWindowEnd || 1) || 1), pageCount)),
      }));
    }
  }, [estimatedPages, formData.previewWindowStart, formData.previewWindowEnd]);

  const [currentElement, setCurrentElement] = useState("action");
  // Which inline emphasis wraps the current screenplay selection, so the Format bar lights up B/I/U.
  const [emphasisState, setEmphasisState] = useState({ active: [], hasSelection: false });
  // Industry title page (Title / Credit / Author / Source / Draft date). Stored as structured data
  // with the script — NOT interleaved into the editor body — so it never confuses the classifier;
  // the PDF + Fountain export render it. `null`/empty = no title page.
  const [titlePage, setTitlePage] = useState(null);
  const [showTitlePageModal, setShowTitlePageModal] = useState(false);
  const titlePageActive = Boolean(titlePage && Object.values(titlePage).some((v) => String(v || "").trim()));
  // Editor zoom — scales how big the text LOOKS while writing (like Ctrl +/− in Docs). Purely visual:
  // the underlying Fountain text, page count, and export are unaffected. 1 = 100%.
  const [editorZoom, setEditorZoom] = useState(1);
  const ZOOM_MIN = 0.7, ZOOM_MAX = 2, ZOOM_STEP = 0.1;
  const adjustZoom = useCallback((dir) => {
    if (dir === 0) { setEditorZoom(1); return; } // reset to 100%
    setEditorZoom((z) => {
      const next = Math.round((z + dir * ZOOM_STEP) * 100) / 100;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    });
  }, []);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [canEditContent, setCanEditContent] = useState(true); // false for commenter/viewer collaborators
  const [canComment, setCanComment] = useState(true);          // false for viewers
  // Navigator outline (sequences + scenes) — re-derived live from the current document.
  const screenplayOutline = useMemo(() => extractOutline(screenplayValue), [screenplayValue]);

  // Escape exits focus mode (drops back to Step 1 with all state intact).
  useEffect(() => {
    if (!focusMode) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setFocusMode(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);
  const screenplayMirrorTimer = useRef(null);
  const screenplayFileInputRef = useRef(null);
  const screenplayApiRef = useRef(null);

  // Step 3: Classification
  const [classification, setClassification] = useState({ tones: [], themes: [], settings: [] });

  // Step 4: Services & Legal
  const [services, setServices] = useState({ hosting: true, evaluation: false, aiTrailer: false, spotlight: false });
  const [legal, setLegal] = useState({ agreedToTerms: false, customInvestorTerms: "" });
  const [rightsLicensing, setRightsLicensing] = useState(() => createDefaultRightsLicensing());
  const [collabVisibility, setCollabVisibility] = useState("private");

  // Step 4: Script pricing
  const BUYER_COMMISSION_RATE = 0.05; // 5%
  const [isPremium, setIsPremium] = useState(true);
  const [scriptPrice, setScriptPrice] = useState(10);
  const effectivePrice = isPremium ? Number(scriptPrice) || 0 : 0;
  const buyerCommissionAmount = Math.round(effectivePrice * BUYER_COMMISSION_RATE * 100) / 100;
  const buyerTotalPayable = Math.round((effectivePrice + buyerCommissionAmount) * 100) / 100;
  const writerPayout = Math.round(effectivePrice * 100) / 100;
  const FORMAT_PRICE_GUIDE = {
    feature: { label: "Feature Film", min: 15, max: 50, suggest: 25 },
    tv_1hour: { label: "TV 1-Hour", min: 10, max: 30, suggest: 15 },
    tv_halfhour: { label: "TV Half-Hour", min: 5, max: 20, suggest: 10 },
    short: { label: "Short Film", min: 5, max: 15, suggest: 5 },
  };

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle, Color, Underline,
      Placeholder.configure({ placeholder: "Start writing your script here...  e.g.  INT. LIVING ROOM - DAY" }),
    ],
    editorProps: {
      attributes: { class: `prose max-w-none focus:outline-none min-h-[1123px] px-16 max-[1200px]:px-10 py-14 max-[1200px]:py-12 max-[640px]:px-6 max-[520px]:px-4 max-[420px]:px-3 max-[640px]:py-10 text-[15px] max-[520px]:text-[14px] leading-[1.65] ${dark ? "prose-invert" : ""}` },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;
        const { schema } = view.state;
        const { from, to } = view.state.selection;
        const nodes = text.split(/\r?\n/).map(line => {
          if (!line) return schema.nodes.paragraph.create();
          try { return schema.nodes.paragraph.create(null, [schema.text(line)]); }
          catch { return schema.nodes.paragraph.create(); }
        });
        if (!nodes.length) return false;
        view.dispatch(view.state.tr.replaceWith(from, to, nodes));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const t = editor.getText();
      setWordCount(t.split(/\s+/).filter(Boolean).length);
      setCharCount(t.length);
      setSaved(false);
    },
  });

  const {
    exportingScreenplay,
    setExportingScreenplay,
    exportMenuOpen,
    setExportMenuOpen,
    sanitizePdfFileName,
    downloadSubmissionSummaryPdf,
    handleDownloadMainContentPdf,
    handleExportScreenplay,
  } = usePdfExport({ editor, title, scriptId, screenplayValue, user, setError, enforceGoldPlan });

  useEffect(() => {
    if (!editor) return;
    // Screenplay projects keep their text in the screenplay editor (screenplayValue), NOT the prose
    // TipTap editor — so the viewable preview MUST paginate that, on the same line-based page
    // boundaries the editor and exported PDF use, so the producer/admin preview pages line up.
    // Book/prose projects keep the HTML line-chunk behaviour. (Reading the empty prose editor for
    // screenplays previously saved their viewable preview blank.)
    const screenplayMode = getContentTypeFromFormat(formData.format) !== "book" && screenplayEnabled;
    const nextPreviewTexts = screenplayMode
      ? splitScreenplayIntoPages(screenplayValue)
      : buildPagePreviewTexts(editor.getHTML?.() || "", estimatedPages);
    const nextSignature = JSON.stringify(nextPreviewTexts);
    if (nextSignature === previewPageTextsSignatureRef.current) return;
    previewPageTextsSignatureRef.current = nextSignature;
    setPreviewPageTexts(nextPreviewTexts);
  }, [editor, estimatedPages, formatInfo.wordsPerPage, screenplayValue, screenplayEnabled, formData.format]);

  // Load drafts
  const fetchDrafts = useCallback(async () => {
    try { setLoadingDrafts(true); const { data } = await api.get("/scripts/my-drafts"); setDrafts(Array.isArray(data) ? data : []); }
    catch { setDrafts([]); } finally { setLoadingDrafts(false); }
  }, []);
  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  // Load specific draft
  const loadDraft = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/scripts/${id}`);
      const isEditApprovalPending = data?.status === "pending_approval" && data?.approvalRequestType === "edit_submission";
      const purchasedFromHistory = {
        evaluation: Boolean(
          Number(data?.billing?.evaluationCreditsChargedAtUpload || 0) > 0
          || Number(data?.billing?.evaluationCreditsCharged || 0) > 0
          || data?.services?.evaluation
        ),
        aiTrailer: Boolean(
          Number(data?.billing?.aiTrailerCreditsChargedAtUpload || 0) > 0
          || Number(data?.billing?.aiTrailerCreditsCharged || 0) > 0
          || data?.services?.aiTrailer
        ),
        spotlight: Boolean(
          Number(data?.billing?.spotlightCreditsChargedAtUpload || 0) > 0
          || data?.services?.spotlight
        ),
      };
      setTitle(data.title || ""); setScriptId(data._id);
      {
        // Editing rights: owner, or a collaborator with editor/full_admin role. Commenters
        // and viewers get a read-only editor (they can still select text to comment).
        const me = String(user?._id || "");
        const isOwnerOfScript = String(data?.creator?._id || data?.creator || "") === me;
        const myCollab = (data?.collaborators || []).find((c) =>
          String(c?.userId?._id || c?.userId || "") === me && c?.status === "accepted" && c?.isActive !== false);
        const role = isOwnerOfScript ? "full_admin" : String(myCollab?.role || "");
        setCanEditContent(isOwnerOfScript || ["editor", "full_admin"].includes(role));
        // Commenters can comment (not edit); viewers can do neither. Owners always can.
        setCanComment(isOwnerOfScript || ["editor", "full_admin", "merger", "commenter"].includes(role));
      }
      setLoadedScriptStatus(data.status || "draft");
      setEditApprovalLocked(Boolean(isEditApprovalPending));
      setPurchasedServiceCredits(purchasedFromHistory);
      if (isEditApprovalPending) {
        setError("This script edit is already in admin review. You can edit again after approval or rejection.");
      }
      if (editor && data.textContent) editor.commands.setContent(data.textContent);
      // Seed the Fountain screenplay editor: prefer saved fountainContent, else derive
      // from the stored text for screenplay-format projects.
      {
        const isScreenplay = getContentTypeFromFormat(data.format) !== "book";
        const seeded = data.fountainContent
          || (isScreenplay ? formatScreenplayLikeText(String(data.textContent || "").replace(/<[^>]*>/g, " ")) : "");
        setScreenplayValue(seeded || "");
      }
      setSceneSynopses(data.sceneSynopses && typeof data.sceneSynopses === "object" ? data.sceneSynopses : {});
      setOutlineNotes(typeof data.outlineNotes === "string" ? data.outlineNotes : "");
      setTitlePage(data.titlePage && typeof data.titlePage === "object" && Object.keys(data.titlePage).length ? data.titlePage : null);
      if (data.format) setFormData(f => ({ ...f, format: data.format }));
      if (data.styleMedium !== undefined) setFormData(f => ({ ...f, styleMedium: data.styleMedium || "" }));
      if (data.formatOther !== undefined) setFormData(f => ({ ...f, formatOther: data.formatOther || "" }));
      if (data.pageCount) setFormData(f => ({ ...f, pageCount: String(data.pageCount) }));
      setFormData(f => ({ ...f, viewableScript: Boolean(data.viewableScript) }));
      if (data.scriptPreviewAccess?.start) setFormData(f => ({ ...f, previewWindowStart: String(data.scriptPreviewAccess.start) }));
      if (data.scriptPreviewAccess?.end) setFormData(f => ({ ...f, previewWindowEnd: String(data.scriptPreviewAccess.end) }));
      setPreviewPageTexts(Array.isArray(data.scriptPreviewPageTexts) ? data.scriptPreviewPageTexts : []);
      if (data.classification?.primaryGenre || data.genre) setFormData(f => ({ ...f, primaryGenre: data.classification?.primaryGenre || data.genre || "" }));
      if (data.companyName !== undefined) setFormData(f => ({ ...f, companyName: data.companyName || "" }));
      if (data.logline) setFormData(f => ({ ...f, logline: data.logline }));
      if (data.synopsis) setFormData(f => ({ ...f, synopsis: data.synopsis }));
      else if (data.description) setFormData(f => ({ ...f, synopsis: data.description }));
      setFormData(f => ({ ...f, ...createScriptCompletionFormState(data?.scriptCompletion || {}) }));
      if (data.tags?.length) setTagsInput(data.tags.join(", "));
      if (Array.isArray(data.roles)) {
        setRoles(data.roles.map((role) => ({
          characterName: role?.characterName || "",
          type: role?.type || "",
          description: role?.description || "",
          gender: role?.gender || "Any",
          ageRange: {
            min: role?.ageRange?.min ?? "",
            max: role?.ageRange?.max ?? "",
          },
        })));
      }
      if (data.classification) setClassification({ tones: data.classification.tones || [], themes: data.classification.themes || [], settings: data.classification.settings || [] });
      setServices({
        hosting: data.services?.hosting ?? true,
        evaluation: purchasedFromHistory.evaluation || data.services?.evaluation || false,
        aiTrailer: purchasedFromHistory.aiTrailer || data.services?.aiTrailer || false,
        spotlight: purchasedFromHistory.spotlight || data.services?.spotlight || false,
      });
      setLegal((prev) => ({
        ...prev,
        agreedToTerms: Boolean(data?.legal?.agreedToTerms),
        customInvestorTerms: data?.legal?.customInvestorTerms || "",
      }));
      setRightsLicensing(normalizeRightsLicensingState(data?.rightsLicensing || {}));
      if (data?.filmDetails) {
        setFilmDetails({
          filmLanguage: data.filmDetails.filmLanguage || "",
          filmLanguageCustom: "",
          dialoguesPresent: data.filmDetails.dialoguesPresent || "yes",
          wantToDirect: Boolean(data.filmDetails.wantToDirect),
          wantToProduce: Boolean(data.filmDetails.wantToProduce),
          scriptStyle: Array.isArray(data.filmDetails.scriptStyle) ? data.filmDetails.scriptStyle : [],
        });
      }
      setCollabVisibility(data?.collabVisibility === "open" ? "open" : "private");

      // Hydrate Publishing Layer
      if (data?.targetIndustry) {
        const hasPublishing = data.targetIndustry.includes("publishing");
        setTargetPublishing(hasPublishing);
        setTargetFilm(!hasPublishing);
      } else {
        setTargetFilm(true);
        setTargetPublishing(false);
      }
      
      if (data?.publishingDetails) {
        setPublishingDetails(prev => ({
          ...prev,
          enabled: Boolean(data.publishingDetails.enabled),
          storyFormat: Array.isArray(data.publishingDetails.storyFormat) ? data.publishingDetails.storyFormat : [],
          writingStyle: Array.isArray(data.publishingDetails.writingStyle) ? data.publishingDetails.writingStyle : [],
          targetAudience: Array.isArray(data.publishingDetails.targetAudience) ? data.publishingDetails.targetAudience : [],
          estimatedWordCount: data.publishingDetails.estimatedWordCount || "",
          seriesPotential: data.publishingDetails.seriesPotential || "",
          bookPitch: data.publishingDetails.bookPitch || "",
          proseSample: data.publishingDetails.proseSample || "",
          previewContent: data.publishingDetails.previewContent || "none",
          publishingRights: data.publishingDetails.publishingRights ? {
            ...prev.publishingRights,
            ...data.publishingDetails.publishingRights
          } : prev.publishingRights
        }));
      }
      lastDraftSignatureRef.current = `${(data.title || "Untitled Draft").trim()}::${String(data.textContent || "").length}:${String(data.textContent || "").slice(0, 120)}:${String(data.textContent || "").slice(-120)}`;
      setSaved(true);
      setShowDrafts(false);
    } catch { }
  }, [editor]);
  useEffect(() => { if (draftId && editor) loadDraft(draftId); }, [draftId, editor, loadDraft]);

  const { buildRightsPayload, buildScriptPreviewPayload, buildDraftPayload } = usePayloads({
    editor,
    formData,
    screenplayEnabled,
    title,
    screenplayValue,
    sceneSynopses,
    outlineNotes,
    titlePageActive,
    titlePage,
    targetFilm,
    targetPublishing,
    estimatedPages,
    classification,
    previewPageTexts,
    legal,
    collabVisibility,
    filmDetails,
    publishingDetails,
    scriptId,
    rightsLicensing,
  });

  const getDraftSignature = useCallback((payload) => {
    if (!payload) return "";
    const html = String(payload.textContent || "");
    const completion = payload.scriptCompletion || {};
    const classificationSignature = JSON.stringify(payload.classification || {});
    const synopsesSignature = JSON.stringify(payload.sceneSynopses || {});
    const outlineSignature = String(payload.outlineNotes || "");
    const titlePageSignature = JSON.stringify(payload.titlePage || null);
    return `${payload.title || ""}::${String(payload.companyName || "")}::${payload.format || ""}::${payload.primaryGenre || ""}::${payload.logline || ""}::${payload.synopsis || ""}::${payload.collabVisibility || "private"}::${completion.status || ""}::${completion.completedParts || 0}::${completion.totalParts || 0}::${completion.futurePlans || ""}::${classificationSignature}::${synopsesSignature}::${outlineSignature.length}:${outlineSignature.slice(0, 80)}::${titlePageSignature}::${html.length}:${html.slice(0, 120)}:${html.slice(-120)}`;
  }, []);

  // A script with 0 words AND no real title is empty — never save it as a draft. (Counts WORDS, not
  // characters: a blank/whitespace-only document has no words.) NOTE: buildDraftPayload defaults the
  // title to "Untitled Draft" because the server requires a title — so that placeholder must NOT
  // count as a real title here, or every blank editor would be saved as a draft.
  const hasMeaningfulDraft = useCallback((payload) => {
    if (!payload) return false;
    const realTitle = String(payload.title || "").trim();
    if (realTitle && realTitle !== "Untitled Draft") return true;
    const words = String(payload.textContent || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    return words >= 1;
  }, []);

  const queueKeepaliveDraftSave = useCallback((reason = "close") => {
    if (scriptId && loadedScriptStatus !== "draft") return false;
    // Don't fire a keepalive save we already know the server will reject (plan limit / 403),
    // or when the user chose to discard this script on exit.
    if (saveBlockedRef.current || discardingRef.current) return false;

    const payload = buildDraftPayload();
    if (!hasMeaningfulDraft(payload)) return false;
    // Update the existing draft (latest id from the ref), never create a duplicate on close.
    if (scriptIdRef.current && !payload.scriptId) payload.scriptId = scriptIdRef.current;

    const signature = getDraftSignature(payload);
    if (!signature || signature === lastDraftSignatureRef.current) return false;

    const stored = localStorage.getItem("user");
    let token = "";
    if (stored) {
      try {
        token = JSON.parse(stored)?.token || "";
      } catch {
        token = "";
      }
    }

    fetch(DRAFT_ENDPOINT, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Draft-Save-Reason": reason,
      },
      body: JSON.stringify(payload),
    }).catch(() => {});

    lastDraftSignatureRef.current = signature;
    return true;
  }, [buildDraftPayload, getDraftSignature, hasMeaningfulDraft, loadedScriptStatus, scriptId]);

  // Save draft
  const handleSave = useCallback(async (auto = false) => {
    if (!editor) return;
    if (discardingRef.current) return; // user chose to discard on exit — don't resurrect the draft
    // At the plan limit on a NEW script: don't even attempt the save — it would 402 and surface a
    // second (red) limit banner on top of the upfront amber gate.
    if (creationBlockedRef.current) return;
    if (auto && autoSaveInFlightRef.current) return;
    // A hard server rejection (plan limit / not authorized) latched the save off — don't keep the
    // autosave loop firing the same doomed request every few seconds. A manual click still retries
    // (clears the latch first), and any real edit clears it via handleScreenplayChange/TipTap onChange.
    if (auto && saveBlockedRef.current) return;
    if (!auto) saveBlockedRef.current = false;
    if (scriptId && loadedScriptStatus !== "draft") {
      if (editApprovalLocked && !auto) {
        setError("This script edit is already in admin review. You can edit again after approval or rejection.");
      }
      return;
    }

    const payload = buildDraftPayload();
    if (!hasMeaningfulDraft(payload)) return;
    // Attach the latest known draft id from the ref (beats a stale closure) so this save UPDATES the
    // existing draft instead of creating a duplicate.
    if (scriptIdRef.current && !payload.scriptId) payload.scriptId = scriptIdRef.current;

    const signature = getDraftSignature(payload);
    if (auto && signature === lastDraftSignatureRef.current) {
      setSaved(true);
      return;
    }

    if (auto) {
      autoSaveInFlightRef.current = true;
    } else {
      setSaving(true);
    }

    try {
      const { data } = await api.post("/scripts/draft", payload);
      // Synchronously record the id so a save that fires before React re-renders still UPDATES.
      scriptIdRef.current = data._id;
      setScriptId(data._id);
      setLoadedScriptStatus("draft");
      setSaved(true);
      setLastSaved(new Date());
      lastDraftSignatureRef.current = signature;
      saveBlockedRef.current = false;
      if (!auto) fetchDrafts();
    } catch (err) {
      console.error("Save failed:", err);
      const status = err?.response?.status;
      // Hard, non-transient failures: stop autosaving and tell the user once why. 402 = plan/credit
      // limit reached, 403 = not authorized. (Transient errors like 5xx/network are left to retry.)
      if (status === 402 || status === 403) {
        saveBlockedRef.current = true;
        setError(err?.response?.data?.message || "This project couldn't be saved. You may have reached your plan's project limit — upgrade to create more.");
      } else if (!auto) {
        setError(err?.response?.data?.message || "Couldn't save your project. Please try again.");
      }
    } finally {
      if (auto) {
        autoSaveInFlightRef.current = false;
      } else {
        setSaving(false);
      }
    }
  }, [buildDraftPayload, editApprovalLocked, editor, fetchDrafts, getDraftSignature, hasMeaningfulDraft, loadedScriptStatus, scriptId]);

  const clearLocalWorkingDraft = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_WORKING_DRAFT_KEY);
    } catch {
      // Ignore localStorage failures in private mode/restricted environments.
    }
  }, []);

  useEffect(() => {
    if (!shouldStartFresh) return;

    clearLocalWorkingDraft();
    localDraftHydratedRef.current = true;

    setStep(1);
    setScriptId(null);
    setLoadedScriptStatus("draft");
    setEditApprovalLocked(false);
    setPurchasedServiceCredits({ evaluation: false, aiTrailer: false, spotlight: false });
    setTitle("");
    setSaved(false);
    setLastSaved(null);
    setShowDrafts(false);
    setError("");
    setTagsInput("");
    setRoles([]);
    setClassification({ tones: [], themes: [], settings: [] });
    setServices({ hosting: true, evaluation: false, aiTrailer: false, spotlight: false });
    setLegal({ agreedToTerms: false, customInvestorTerms: "" });
    setRightsLicensing(createDefaultRightsLicensing());
    setCollabVisibility("private");
    setIsPremium(false);
    setScriptPrice(10);
    setThumbnailFile(null);
    setTrailerFile(null);
    setTrailerMeta(null);
    setFormData({
      format: "feature",
      formatOther: "",
      viewableScript: false,
      previewWindowMode: "pages",
      previewWindowStart: "1",
      previewWindowEnd: "8",
      primaryGenre: "",
      logline: "",
      synopsis: "",
      writer: "",
      companyName: "",
      ...createScriptCompletionFormState(),
    });

    if (editor) {
      editor.commands.clearContent();
    }
  }, [clearLocalWorkingDraft, editor, location.key, shouldStartFresh]);

  const restoreLocalWorkingDraft = useCallback(() => {
    if (!editor || localDraftHydratedRef.current || draftId || shouldStartFresh) return;

    localDraftHydratedRef.current = true;
    try {
      const raw = localStorage.getItem(LOCAL_WORKING_DRAFT_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;
      if (data.userId && user?._id && data.userId !== user._id) return;

      if (typeof data.title === "string") {
        setTitle(data.title);
      }

      if (typeof data.textContent === "string" && data.textContent.trim()) {
        editor.commands.setContent(data.textContent);
      }

      if (typeof data.step === "number" && data.step >= 1 && data.step <= 5) {
        setStep(data.step);
      }

      if (typeof data.scriptId === "string" && data.scriptId.trim()) {
        setScriptId(data.scriptId);
        setLoadedScriptStatus("draft");
      }
    } catch {
      // Ignore invalid/stale local snapshots.
    }
  }, [draftId, editor, shouldStartFresh, user?._id]);

  useEffect(() => {
    restoreLocalWorkingDraft();
  }, [restoreLocalWorkingDraft]);

  useEffect(() => {
    if (!editor || draftId) return;

    const html = editor.getHTML();
    const plainText = String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const trimmedTitle = title.trim();
    const hasContent = Boolean(trimmedTitle || plainText.length >= 10);

    if (!hasContent) {
      clearLocalWorkingDraft();
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(
          LOCAL_WORKING_DRAFT_KEY,
          JSON.stringify({
            userId: user?._id || null,
            scriptId: scriptId || null,
            title,
            textContent: html,
            step,
            updatedAt: Date.now(),
          })
        );
      } catch {
        // Ignore localStorage write failures.
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [charCount, clearLocalWorkingDraft, draftId, editor, scriptId, step, title, user?._id, wordCount]);

  // Debounced autosave while typing title/content.
  useEffect(() => {
    if (!editor) return;
    const payload = buildDraftPayload();
    if (!hasMeaningfulDraft(payload)) return;

    const timeoutId = setTimeout(() => {
      handleSave(true);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [title, charCount, wordCount, editor, buildDraftPayload, handleSave, hasMeaningfulDraft]);

  // Interval fallback autosave every 3 seconds.
  useEffect(() => {
    if (!editor) return;
    const iv = setInterval(() => {
      handleSave(true);
    }, 3000);
    return () => clearInterval(iv);
  }, [editor, handleSave]);

  // Keep the keepalive callback in a ref so the close/unmount listeners below DON'T re-bind on every
  // keystroke. queueKeepaliveDraftSave changes each keystroke (buildDraftPayload does), and if it
  // were an effect dependency the effect would tear down + re-run every keystroke — and its cleanup
  // fires a keepalive draft-save. That was creating a NEW draft on every keystroke (15-40 drafts for
  // a few lines). With the ref, the effect runs once and the keepalive only fires on a real unmount.
  const queueKeepaliveDraftSaveRef = useRef(queueKeepaliveDraftSave);
  queueKeepaliveDraftSaveRef.current = queueKeepaliveDraftSave;

  // Save draft when user closes tab, switches away, or navigates away.
  useEffect(() => {
    if (!editor) return;

    const handleBeforeUnload = (event) => {
      const queued = queueKeepaliveDraftSaveRef.current("beforeunload");
      if (!queued) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePageHide = () => {
      queueKeepaliveDraftSaveRef.current("pagehide");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        queueKeepaliveDraftSaveRef.current("hidden");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      queueKeepaliveDraftSaveRef.current("unmount");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Only (re)bind when the editor instance changes — NOT when the callback identity changes (the
    // callback is read from a ref, so it needs no dependency here).
  }, [editor]);

  // Delete draft
  const handleDeleteDraft = async (id) => {
    try {
      await api.delete(`/scripts/${id}`); setDrafts(p => p.filter(d => d._id !== id));
      if (scriptId === id) { setScriptId(null); setLoadedScriptStatus("draft"); setEditApprovalLocked(false); setPurchasedServiceCredits({ evaluation: false, aiTrailer: false, spotlight: false }); setTitle(""); editor?.commands.clearContent(); }
    } catch { }
  };

  // Exit the editor (back/close). If there's meaningful work in a draft flow, ask whether to keep it
  // as a draft; an empty script (no words, no title) just leaves without saving anything.
  const handleExitEditor = () => {
    const meaningful = hasMeaningfulDraft(buildDraftPayload());
    const isDraftFlow = loadedScriptStatus === "draft" && !editApprovalLocked;
    if (meaningful && isDraftFlow && !creationBlocked) {
      setShowExitConfirm(true);
    } else {
      navigate("/dashboard");
    }
  };

  const confirmExitSaveDraft = async () => {
    setExiting(true);
    try { await handleSave(false); } catch { /* unmount keepalive still attempts a save */ }
    navigate("/dashboard");
  };

  const confirmExitDiscard = async () => {
    setExiting(true);
    discardingRef.current = true; // stop autosave/keepalive from re-creating the draft
    try { if (scriptId) await handleDeleteDraft(scriptId); } catch { /* ignore */ }
    clearLocalWorkingDraft();
    navigate("/dashboard");
  };

  // Form handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    setFormData((f) => {
      if (name === "format") {
        return {
          ...f,
          format: value,
          formatOther: value === "other" ? f.formatOther : "",
        };
      }
      return { ...f, [name]: nextValue };
    });
  };
  const addRole = () => {
    setRoles((prev) => ([
      ...prev,
      {
        characterName: "",
        type: "",
        description: "",
        gender: "Any",
        ageRange: { min: "", max: "" },
      },
    ]));
  };
  const updateRoleField = (index, field, value) => {
    setRoles((prev) => prev.map((role, i) => (i === index ? { ...role, [field]: value } : role)));
  };
  const updateRoleAge = (index, field, value) => {
    setRoles((prev) => prev.map((role, i) => (
      i === index
        ? { ...role, ageRange: { ...role.ageRange, [field]: value === "" ? "" : Number(value) } }
        : role
    )));
  };
  const removeRole = (index) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };
  const getInvalidRoleAgeRangeMessage = () => {
    const invalidIndex = roles.findIndex((role) => {
      const min = role?.ageRange?.min;
      const max = role?.ageRange?.max;
      if (min === "" || max === "" || min === undefined || max === undefined || min === null || max === null) {
        return false;
      }
      const minAge = Number(min);
      const maxAge = Number(max);
      if (!Number.isFinite(minAge) || !Number.isFinite(maxAge)) {
        return true;
      }
      return maxAge < minAge;
    });

    if (invalidIndex >= 0) {
      return `Role ${invalidIndex + 1}: Max age must be greater than or equal to min age.`;
    }

    return "";
  };
  const toggleChip = (cat, val) => {
    setClassification(prev => {
      const arr = prev[cat]; return { ...prev, [cat]: arr.includes(val) ? arr.filter(v => v !== val) : arr.length < 3 ? [...arr, val] : arr };
    });
  };
  const isEditingExistingScriptFlow = Boolean(scriptId && loadedScriptStatus !== "draft");
  const selectedPublishServices = [
    { key: "hosting", name: "Hosting & Discovery", enabled: true, desc: "Listed in the marketplace for discovery" },
    { key: "spotlight", name: "Activate Spotlight", enabled: services.spotlight, desc: "Priority visibility boost in marketplace placements" },
    { key: "aiTrailer", name: "AI Concept Trailer", enabled: services.aiTrailer, desc: "60-second cinematic concept trailer" },
    { key: "evaluation", name: "Professional Evaluation", enabled: services.evaluation, desc: "Scorecard and editorial coverage from a vetted reader" },
  ];
  const trailerWorkflowHint = services.aiTrailer
    ? trailerFile
      ? {
          tone: "info",
          title: "Trailer workflow",
          text: "Your uploaded trailer is used immediately after publish. AI Concept Trailer will replace it only when AI output is approved and ready.",
        }
      : {
          tone: "warn",
          title: "Trailer workflow",
          text: "AI Concept Trailer is selected without an uploaded trailer. Your project may show no trailer until the AI trailer is generated.",
        }
    : trailerFile
      ? {
          tone: "success",
          title: "Trailer workflow",
          text: "Your uploaded trailer will be shown in your project after publish.",
        }
      : null;
  const publishSummaryRows = [
    {
      item: "Script Access Fee",
      detail: "Premium reader purchase model",
      type: "Revenue Setting",
      amount: formatCurrency(effectivePrice),
    },
    {
      item: `Platform Commission (${Math.round(BUYER_COMMISSION_RATE * 100)}%)`,
      detail: "Added on top of the script access fee at checkout",
      type: "Platform Commission",
      amount: formatCurrency(buyerCommissionAmount),
    },

    {
      item: "Film Industry Professional Pays at Checkout",
      detail: "Script fee + platform commission",
      type: "Checkout Total",
      amount: formatCurrency(buyerTotalPayable),
    },
    {
      item: "Projected Writer Payout",
      detail: "Writer receives full script access fee",
      type: "Future Earnings",
      amount: formatCurrency(writerPayout),
    },
  ];

  const publishReviewItems = [
    {
      label: "Format",
      value:
        formData.format === "other"
          ? (String(formData.formatOther || "").trim() || "Other")
          : (allFormats.find((item) => item.value === formData.format)?.label || "Not selected"),
    },
    { label: "Primary Genre", value: formData.primaryGenre || "Not selected" },
    { label: "Estimated Pages", value: `${estimatedPages} pages` },
    {
      label: "Viewable Script",
      value: buildScriptPreviewPayload(formData)
        ? `Pages ${buildScriptPreviewPayload(formData).start} to ${buildScriptPreviewPayload(formData).end}`
        : "Not viewable",
    },
    { label: "Access", value: isPremium ? "Premium paid access" : "Free public access" },
  ];
  const publishReadiness = [
    { label: "Title added", done: Boolean(title.trim()) },
    { label: "Logline added", done: Boolean(formData.logline.trim()) },
    { label: "Synopsis added", done: Boolean(formData.synopsis.trim()) },
    { label: "Primary genre selected", done: Boolean(formData.primaryGenre) },
    { label: "Agreement accepted", done: Boolean(legal.agreedToTerms) },
  ];

  // Per-panel validation for the Step 2 (Details) mini-wizard. Each panel only
  // gates its own fields, so an error surfaces on the panel that owns it instead
  // of at the end of a long form. `validateStep(2)` runs the whole set in order.
  const validateDetailsStep = (key) => {
    setError("");
    if (key === "basics") {
      if (!formData.format) { setError("Format is required."); return false; }
      if (formData.format === "other" && !String(formData.formatOther || "").trim()) {
        setError("Please specify the format when selecting Other."); return false;
      }
      return true;
    }
    if (key === "story") {
      if (targetFilm) {
        if (!formData.logline.trim()) { setError("Logline is required."); return false; }
        if (formData.logline.length > 500) { setError("Logline must be 500 characters or less."); return false; }
      }
      if (!formData.synopsis || !formData.synopsis.trim()) { setError("Synopsis is required."); return false; }
      return true;
    }
    if (key === "cast") {
      const ageRangeError = getInvalidRoleAgeRangeMessage();
      if (ageRangeError) { setError(ageRangeError); return false; }
      return true;
    }
    if (key === "progress") {
      const completionError = getScriptCompletionValidationMessage(formData);
      if (completionError) { setError(completionError); return false; }
      return true;
    }
    if (key === "access") {
      const previewPayload = buildScriptPreviewPayload(formData);
      if (previewPayload) {
        if (previewPayload.end < previewPayload.start) {
          setError("The ending page must be greater than or equal to the starting page."); return false;
        }
        if (Number(estimatedPages || 0) > 0 && (previewPayload.start > Number(estimatedPages || 0) || previewPayload.end > Number(estimatedPages || 0))) {
          setError("The viewable script range cannot exceed the estimated page count."); return false;
        }
      }
      return true;
    }
    return true; // "market", "media" — no hard gates
  };

  // Validation
  const validateStep = (s) => {
    setError("");
    if (s === 1) {
      if (!title.trim()) { setError("Title is required."); return false; }
      {
        const editorPlainText = (getContentTypeFromFormat(formData.format) !== "book" && screenplayEnabled)
          ? screenplayValue
          : (editor ? editor.getText() : "");
        if (!editor || editorPlainText.trim().length < 10) { setError("Please write at least a few lines of content."); return false; }
      }
      return true;
    }
    if (s === 2) {
      // Run every Details panel's gate in order; the first failure sets the error
      // and (via handleNext) will route the user to the owning panel.
      for (const sub of detailsSubSteps) {
        if (!validateDetailsStep(sub.key)) return false;
      }
      return true;
    }
    if (s === 3) {
      if (!formData.primaryGenre) { setError("Primary genre is required."); return false; }
      return true;
    }
    if (s === 4) {
      if (!String(filmDetails.filmLanguage || "").trim()) {
        setError("Film language is required.");
        return false;
      }
      if (filmDetails.filmLanguage === "Other" && !String(filmDetails.filmLanguageCustom || "").trim()) {
        setError("Please specify the film language.");
        return false;
      }
      return true;
    }
    if (s === 5) {
      const rightsError = getRightsValidationMessage(buildRightsPayload());
      if (rightsError) {
        setError(rightsError);
        return false;
      }
      if (!legal.agreedToTerms) { setError("Please accept the Submission Agreement."); return false; }
      return true;
    }
    return true;
  };
  // Fetch the writer's script-limit status once, so we can gate a NEW script before any work.
  useEffect(() => {
    let active = true;
    api.get("/scripts/script-limit")
      .then(({ data }) => {
        if (!active) return;
        setScriptLimit(data);
        // The amber gate is the single message — clear any limit error a racing autosave may have set.
        if (data?.limitReached) setError((e) => (String(e || "").toLowerCase().includes("limit") ? "" : e));
      })
      .catch(() => { if (active) setScriptLimit(null); });
    return () => { active = false; };
  }, []);

  // Block creating a NEW script when the plan limit is reached. Editing an already-saved script
  // (scriptId present) is never blocked — only the fresh "create another" path is.
  const creationBlocked = Boolean(scriptLimit?.limitReached) && !scriptId;
  // Ref mirror so the (memoized) autosave can bail without the limit message being set as a generic
  // error — the upfront amber gate is the single message; we don't want a duplicate red banner.
  const creationBlockedRef = useRef(false);
  creationBlockedRef.current = creationBlocked;

  // ── Browser/OS Back (back-swipe) → same "save as draft?" prompt as the in-app back button ──
  // BrowserRouter has no useBlocker, so we intercept the history pop. exitGuardRef holds a fresh
  // closure each render (read on Back) so the popstate effect can run once without re-binding.
  const exitGuardRef = useRef(() => false);
  exitGuardRef.current = () => {
    try {
      return hasMeaningfulDraft(buildDraftPayload()) && loadedScriptStatus === "draft" && !editApprovalLocked && !creationBlocked;
    } catch { return false; }
  };
  useEffect(() => {
    // Sentinel entry so the first Back is caught here instead of leaving the page immediately.
    window.history.pushState(null, "", window.location.href);
    const onPop = () => {
      if (exitGuardRef.current()) {
        window.history.pushState(null, "", window.location.href); // re-arm: stay put, then ask
        setShowExitConfirm(true);
      } else {
        navigate("/dashboard"); // nothing worth keeping — just leave
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // Bind once; current state is read through exitGuardRef.
  }, [navigate]);

  const handleNext = () => {
    // Two independent gates: the upfront amber script-limit gate (creationBlocked) and master's
    // gold-plan enforcement. The amber gate already explains itself, so it just bails silently.
    if (creationBlocked) return;
    if (!enforceGoldPlan()) return;
    // Step 2 is a mini-wizard: Next walks its sub-steps (validating only the current
    // panel) and advances to Step 3 only after the last panel clears.
    if (step === 2) {
      const key = detailsSubSteps[detailsStep]?.key;
      if (!validateDetailsStep(key)) return;
      if (detailsStep < detailsSubSteps.length - 1) { setDetailsStep(detailsStep + 1); setError(""); return; }
      setStep(3); setError(""); return;
    }
    if (validateStep(step) && step < 5) {
      const next = step + 1;
      setStep(next); setError("");
      if (next === 2) setDetailsStep(0); // entering Details forward → first panel
    }
  };
  const handleBack = () => {
    // Inside Details, Back steps through the panels before leaving to the Write step.
    if (step === 2 && detailsStep > 0) { setDetailsStep(detailsStep - 1); setError(""); return; }
    if (step > 1) {
      const prev = step - 1;
      setStep(prev); setError("");
      if (prev === 2) setDetailsStep(detailsSubSteps.length - 1); // re-entering Details → last panel
    }
  };

  const uploadSelectedProjectMedia = async (targetScriptId) => {
    if (!targetScriptId) return;

    const tasks = [];

    if (thumbnailFile) {
      const thumbnailFormData = new FormData();
      thumbnailFormData.append("thumbnail", thumbnailFile);
      tasks.push(api.post(`/scripts/${targetScriptId}/upload-thumbnail`, thumbnailFormData));
    }

    if (trailerFile) {
      const trailerFormData = new FormData();
      trailerFormData.append("trailer", trailerFile);
      tasks.push(api.post(`/scripts/${targetScriptId}/upload-trailer`, trailerFormData));
    }

    if (pitchVideoFile) {
      const pitchFormData = new FormData();
      pitchFormData.append("pitchVideo", pitchVideoFile);
      tasks.push(api.post(`/scripts/${targetScriptId}/upload-pitch-video`, pitchFormData));
    }

    if (tasks.length === 0) return;

    const results = await Promise.allSettled(tasks);
    const failed = results.find((result) => result.status === "rejected");

    if (failed?.status === "rejected") {
      const reason = failed.reason;
      const message = reason?.response?.data?.message || reason?.message || "Failed to upload project media.";
      throw new Error(message);
    }
  };

  const openUnderReviewModal = (redirectPath = "/dashboard") => {
    if (reviewRedirectTimerRef.current) {
      clearTimeout(reviewRedirectTimerRef.current);
    }

    setShowUnderReviewModal(true);
    reviewRedirectTimerRef.current = setTimeout(() => {
      navigate(redirectPath);
    }, 2400);
  };

  const handleUnderReviewContinue = () => {
    if (reviewRedirectTimerRef.current) {
      clearTimeout(reviewRedirectTimerRef.current);
      reviewRedirectTimerRef.current = null;
    }
    setShowUnderReviewModal(false);
    navigate("/dashboard");
  };

  // Publish
  const handlePublish = async () => {
    if (editApprovalLocked) {
      setError("This script edit is already in admin review. You can edit again after approval or rejection.");
      return;
    }

    if (!validateStep(6)) return;
    const ageRangeError = getInvalidRoleAgeRangeMessage();
    if (ageRangeError) { setError(ageRangeError); return; }

    setLoading(true); setError("");
    try {
      const tagsArr = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const payload = {
        title,
        logline: formData.logline,
        synopsis: formData.synopsis,
        description: formData.synopsis,
        companyName: String(formData.companyName || "").trim(),
        format: formData.format,
        styleMedium: targetFilm ? formData.styleMedium : undefined,
        contentType: getContentTypeFromFormat(formData.format),
        formatOther: formData.format === "other" ? String(formData.formatOther || "").trim() : "",
        pageCount: estimatedPages,
        textContent: (getContentTypeFromFormat(formData.format) !== "book" && screenplayEnabled) ? screenplayValue : editor.getHTML(),
        fountainContent: (getContentTypeFromFormat(formData.format) !== "book" && screenplayEnabled) ? screenplayValue : undefined,
        tags: tagsArr,
        classification: {
          primaryGenre: formData.primaryGenre,
          secondaryGenre: null,
          tones: classification.tones,
          themes: classification.themes,
          settings: classification.settings,
        },
        viewableScript: Boolean(formData.viewableScript),
        scriptPreviewAccess: buildScriptPreviewPayload(formData),
        scriptPreviewPageTexts: previewPageTexts,
        scriptCompletion: buildScriptCompletionPayload(formData),
        roles: roles
          .filter((role) => role.characterName?.trim())
          .map((role) => ({
            characterName: role.characterName.trim(),
            type: role.type?.trim() || "",
            description: role.description?.trim() || "",
            gender: role.gender || "Any",
            ageRange: {
              min: role.ageRange?.min === "" ? undefined : Number(role.ageRange?.min),
              max: role.ageRange?.max === "" ? undefined : Number(role.ageRange?.max),
            },
          })),
        services: { hosting: services.hosting, evaluation: services.evaluation, aiTrailer: services.aiTrailer, spotlight: services.spotlight },
        legal: {
          agreedToTerms: legal.agreedToTerms,
          timestamp: new Date().toISOString(),
          termsVersion: SCRIPT_UPLOAD_TERMS_VERSION,
          customInvestorTerms: String(legal.customInvestorTerms || "").trim(),
        },
        collabVisibility,
        rightsLicensing: buildRightsPayload(),
        filmDetails: {
          filmLanguage: filmDetails.filmLanguage === "Other" ? (filmDetails.filmLanguageCustom || "Other") : filmDetails.filmLanguage,
          dialoguesPresent: filmDetails.dialoguesPresent,
          wantToDirect: filmDetails.wantToDirect,
          wantToProduce: filmDetails.wantToProduce,
          scriptStyle: filmDetails.scriptStyle,
        },
        targetIndustry: [
          ...(targetFilm ? ["film"] : []),
          ...(targetPublishing ? ["publishing"] : [])
        ],
        publishingDetails,
        premium: isPremium && effectivePrice > 0,
        price: isPremium && effectivePrice > 0 ? effectivePrice : 0,
        ...(scriptId ? { scriptId } : {}),
      };
      let targetScriptId = scriptId;

      if (scriptId && loadedScriptStatus !== "draft") {
        await api.put(`/scripts/${scriptId}`, payload);
      } else {
        const { data } = await api.post("/scripts/upload", payload);
        targetScriptId = data?._id;
      }

      await uploadSelectedProjectMedia(targetScriptId);
      await downloadSubmissionSummaryPdf(targetScriptId, title);

      clearLocalWorkingDraft();
      openUnderReviewModal("/dashboard");
    } catch (err) { 
      setError(err.response?.data?.message || err.message || "Failed to publish."); 

    } finally { 
      setLoading(false); 
    }
  };

  const escapeHtml = (str = "") =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const textToParagraphHtml = (text = "") => {
    const blocks = text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (!blocks.length) return "";

    return blocks
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
      .join("");
  };

  // ── Fountain screenplay editor wiring ──────────────────────────────────────
  const isScreenplayFormat = getContentTypeFromFormat(formData.format) !== "book";
  const useScreenplayEditor = isScreenplayFormat && screenplayEnabled;

  // ── Phase 3 presence + scene comments (live "who's here + which scene") ─────
  const {
    screenplayValueRef,
    presenceEnabled,
    collabPeople,
    collabSetActiveScene,
    collabLocks,
    collabMyUserId,
    collabRequestEdit,
    collabReleaseHeld,
    collabEditRequest,
    collabClearEditRequest,
    collabCommentsVersion,
    sceneComments,
    addSceneComment,
    setCommentResolved,
    deleteSceneComment,
    focusedCommentId,
    setFocusedCommentId,
    handleAddComment,
    handleReplyComment,
    handleFocusComment,
    isCommentOrphaned,
    handleCaretLine,
    presenceScenes,
    peopleEnriched,
    presenceBySceneId,
    outlineWithSceneIds,
  } = useScreenplayCollab({
    screenplayValue,
    useScreenplayEditor,
    scriptId,
    user,
    canEditContent,
    screenplayApiRef,
    screenplayOutline,
    setError,
  });

  // Plain text the AI tools read — Fountain text in screenplay mode, else TipTap text.
  const getEditorPlainText = () => (useScreenplayEditor ? screenplayValue : (editor ? editor.getText() : "")).trim();

  const {
    proseLoading,
    setProseLoading,
    metaLoadingField,
    setMetaLoadingField,
    metaNotice,
    setMetaNotice,
    handleProseClick,
    handleGenerateProse,
    handleGenerateMetadata,
  } = useAiGeneration({
    editor,
    getEditorPlainText,
    scriptId,
    title,
    formData,
    setFormData,
    setRoles,
    setPublishingDetails,
    setSaved,
    setError,
    enforceGoldPlan,
  });

  const {
    grammarLoading,
    setGrammarLoading,
    grammarNotes,
    setGrammarNotes,
    preGrammarContent,
    setPreGrammarContent,
    showUndoBar,
    setShowUndoBar,
    handleGrammarClick,
    handleFixGrammar,
    handleGrammarUndo,
    handleGrammarKeep,
  } = useGrammarFix({ editor, getEditorPlainText, textToParagraphHtml, setError, setSaved });

  // Update Fountain text; mirror (debounced) into the hidden TipTap model so existing
  // word-count / AI-read flows keep working off editor.getText().
  const handleScreenplayChange = useCallback((text) => {
    setScreenplayValue(text);
    setWordCount(text.split(/\s+/).filter(Boolean).length);
    setCharCount(text.length);
    setSaved(false);
    if (screenplayMirrorTimer.current) clearTimeout(screenplayMirrorTimer.current);
    screenplayMirrorTimer.current = setTimeout(() => {
      if (editor) editor.commands.setContent(textToParagraphHtml(text));
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Corkboard reorder (Phase 4 §2.2). Moving a card rewrites the Fountain text by moving the
  // whole scene block; routing it through handleScreenplayChange feeds the new value to the
  // (mounted-but-hidden) editor, which applies it as ONE transaction → a single undo step that
  // survives switching back to the page. A scene locked by another writer is blocked here too,
  // since the value-sync path bypasses the editor's lock guard.
  const handleReorderScene = useCallback((fromIndex, toIndex) => {
    const text = screenplayValueRef.current;
    const scenes = getScenes(text);
    const source = scenes[fromIndex];
    const lock = source ? collabLocks[source.sceneId] : null;
    if (lock && String(lock.holderId) !== String(collabMyUserId)) return;
    const next = moveScene(text, fromIndex, toIndex);
    if (next !== text) handleScreenplayChange(next);
  }, [collabLocks, collabMyUserId, handleScreenplayChange, screenplayValueRef]);

  // Edit a scene's one-line synopsis (metadata only — never touches the script text).
  const handleSynopsisChange = useCallback((key, value) => {
    if (!key) return;
    setSceneSynopses((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  // Edit the outline notes (Phase 4 §4) — metadata only, autosaved with the draft.
  const handleOutlineChange = useCallback((value) => {
    setOutlineNotes(value);
    setSaved(false);
  }, []);

  // kind: "pdf" (clean) | "pdf-wm" (watermarked with the user's identity) | "fountain" | "fdx"
  const handleImportScreenplayFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
    const isDocx = name.endsWith(".docx") || name.endsWith(".doc")
      || file.type.includes("officedocument.wordprocessingml") || file.type === "application/msword";
    try {
      // PDF / DOCX are binary — extract their text server-side (pdf-parse / mammoth), then run it
      // through the screenplay formatter so the editor's ONE classifier can type the lines.
      if (isPdf || isDocx) {
        setImportNotice(`Importing ${isPdf ? "PDF" : "Word"} — extracting text…`);
        const form = new FormData();
        form.append("pdf", file); // the extract endpoint's field name (accepts PDF + DOCX)
        const { data } = await api.post("/scripts/extract-pdf", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const extracted = String(data?.text || "").trim();
        if (!extracted) {
          setImportNotice("");
          setError("We couldn't extract readable text from that file. If it's a scanned/image PDF, try a text-based export.");
          return;
        }
        
        // The server already runs formatScreenplayLikeText on PDF and DOCX, so we can use extracted directly.
        handleScreenplayChange(extracted);
        setScreenplayValue(extracted);
        setImportNotice(`${isPdf ? "PDF" : "Word document"} imported — review the formatting; some elements may need adjusting.`);
        return;
      }

      const raw = await file.text();
      const isFdx = /\.fdx$/i.test(file.name) || /^\s*<\?xml|<FinalDraft/i.test(raw);
      if (isFdx) {
        // Parse .fdx CLIENT-SIDE → Fountain that the editor's classifier re-reads (§0). High
        // fidelity, so no review step — but surface a notice if any unknown paragraph types fell
        // back to Action so the gap is visible rather than silent.
        const { fountain, unmapped } = fdxToFountain(raw);
        handleScreenplayChange(fountain);
        setScreenplayValue(fountain);
        setImportNotice(unmapped.length
          ? `Imported. ${unmapped.length} unrecognized Final Draft element type${unmapped.length > 1 ? "s" : ""} kept as Action: ${unmapped.join(", ")}.`
          : "Final Draft file imported.");
        return;
      }
      const { data } = await api.post("/scripts/import/fountain", { text: raw });
      const imported = data?.fountainContent || raw;
      handleScreenplayChange(imported);
      setScreenplayValue(imported);
    } catch (err) {
      setImportNotice("");
      setError(err.response?.data?.message || "Could not import that file.");
    }
  };

  // Click "Fix Grammar"
  // Styling helpers
  const cardCls = `rounded-2xl border backdrop-blur-sm ${dark ? "bg-[#0d1520]/80 border-[#182840]" : "bg-white/90 border-gray-200 shadow-sm"}`;
  const aiBtnCls = `shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition disabled:opacity-50 disabled:cursor-not-allowed ${dark ? "bg-white/[0.06] border-[#2a4a6a] text-blue-300 hover:bg-white/[0.1]" : "bg-white border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`;
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none ${dark
    ? "bg-white/[0.04] border border-[#1d3350] text-gray-100 placeholder:text-gray-600 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/30"
    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#1e3a5f]/50 focus:ring-1 focus:ring-[#1e3a5f]/10"}`;
  const chipCls = (sel) => `px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${sel
    ? dark ? "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20" : "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20"
    : dark ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] border border-[#1d3350]" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`;

  const ctx = {
    BUYER_COMMISSION_RATE, FORMAT_PRICE_GUIDE, ZOOM_MIN, addRole, addSceneComment, adjustZoom, agreementRef, aiBtnCls, aiCoverAttempts, aiCoverHistory, aiCoverIndex, autoSaveInFlightRef, buildDraftPayload, buildRightsPayload, buildScriptPreviewPayload, buyerCommissionAmount, buyerTotalPayable, canComment, canEditContent, cardCls, charCount, chipCls, classification, clearLocalWorkingDraft, collabClearEditRequest, collabCommentsVersion, collabEditRequest, collabLocks, collabMyUserId, collabPeople, collabReleaseHeld, collabRequestEdit, collabSetActiveScene, collabVisibility, confirmExitDiscard, confirmExitSaveDraft, creationBlocked, creationBlockedRef, currentElement, dark, deleteSceneComment, detailsStep, detailsSubSteps, discardingRef, downloadSubmissionSummaryPdf, downloadWatermarkedImage, draftId, drafts, editApprovalLocked, editor, editorZoom, effectivePrice, emphasisState, enforceGoldPlan, error, escapeHtml, estimatedPages, exitGuardRef, exiting, exportMenuOpen, exportingScreenplay, fetchDrafts, filmDetails, focusMode, focusedCommentId, formData, formatDuration, formatInfo, generateAiCover, getDraftSignature, getEditorPlainText, getInvalidRoleAgeRangeMessage, grammarLoading, grammarNotes, handleAddComment, handleAnalyzeFormatting, handleApplyThumbnail, handleBack, handleCaretLine, handleChange, handleDeleteDraft, handleDownloadMainContentPdf, handleExitEditor, handleExportScreenplay, handleFixGrammar, handleFocusComment, handleGenerateMetadata, handleGenerateProse, handleGrammarClick, handleGrammarKeep, handleGrammarUndo, handleImportScreenplayFile, handleNext, handleOutlineChange, handlePitchVideoSelect, handleProseClick, handlePublish, handleReorderScene, handleReplyComment, handleSave, handleScreenplayChange, handleSynopsisChange, handleThumbnailSelect, handleTrailerSelect, handleUnderReviewContinue, hasMeaningfulDraft, importNotice, inputCls, isCommentOrphaned, isEditingExistingScriptFlow, isGeneratingAiCover, isPremium, isScreenplayFormat, isThumbnailEditorOpen, lastDraftSignatureRef, lastSaved, legal, loadDraft, loadedScriptStatus, loading, loadingDrafts, localDraftHydratedRef, location, metaLoadingField, metaNotice, moreMenuOpen, navigate, openPricingModal, openThumbnailEditor, openUnderReviewModal, outlineNotes, outlineWithSceneIds, pageStatus, peopleEnriched, pitchVideoFile, pitchVideoInputRef, pitchVideoMeta, pitchVideoMetaLoading, pitchVideoPreviewUrl, preGrammarContent, presenceBySceneId, presenceEnabled, presenceScenes, previewPageTexts, previewPageTextsSignatureRef, proseLoading, publishReadiness, publishReviewItems, publishSummaryRows, publishingDetails, purchasedServiceCredits, queueKeepaliveDraftSave, queueKeepaliveDraftSaveRef, removeRole, resetThumbnailEditor, restoreLocalWorkingDraft, reviewRedirectTimerRef, rightsLicensing, roles, sanitizePdfFileName, saveBlockedRef, saved, saving, sceneComments, sceneSynopses, screenplayApiRef, screenplayEnabled, screenplayFileInputRef, screenplayMirrorTimer, screenplayOutline, screenplayValue, screenplayValueRef, scriptId, scriptIdRef, scriptLimit, scriptPrice, selectedPublishServices, services, setAiCoverAttempts, setAiCoverHistory, setAiCoverIndex, setCanComment, setCanEditContent, setCharCount, setClassification, setCollabVisibility, setCommentResolved, setCurrentElement, setDetailsStep, setDrafts, setEditApprovalLocked, setEditorZoom, setEmphasisState, setError, setExiting, setExportMenuOpen, setExportingScreenplay, setFilmDetails, setFocusMode, setFocusedCommentId, setFormData, setGrammarLoading, setGrammarNotes, setImportNotice, setIsGeneratingAiCover, setIsPremium, setLastSaved, setLegal, setLoadedScriptStatus, setLoading, setLoadingDrafts, setMetaLoadingField, setMetaNotice, setMoreMenuOpen, setOutlineNotes, setPitchVideoFile, setPitchVideoMeta, setPitchVideoMetaLoading, setPitchVideoPreviewUrl, setPreGrammarContent, setPreviewPageTexts, setProseLoading, setPublishingDetails, setPurchasedServiceCredits, setRightsLicensing, setRoles, setSaved, setSaving, setSceneSynopses, setScreenplayEnabled, setScreenplayValue, setScriptId, setScriptLimit, setScriptPrice, setServices, setShowDrafts, setShowExitConfirm, setShowTitlePageModal, setShowUnderReviewModal, setShowUndoBar, setShowVersionHistory, setStep, setTagsInput, setTargetFilm, setTargetPublishing, setThumbnailCrop, setThumbnailCropPixels, setThumbnailFile, setThumbnailPreviewUrl, setThumbnailRotation, setThumbnailZoom, setTitle, setTitlePage, setToastMessage, setTrailerFile, setTrailerMeta, setTrailerMetaLoading, setTrailerPreviewUrl, setWordCount, shouldStartFresh, showDrafts, showExitConfirm, showTitlePageModal, showToast, showUnderReviewModal, showUndoBar, showVersionHistory, step, stepContentRef, tagsInput, targetFilm, targetPublishing, textToParagraphHtml, thumbnailApplying, thumbnailCrop, thumbnailCropPixels, thumbnailFile, thumbnailInputRef, thumbnailPreviewUrl, thumbnailRotation, thumbnailSourceUrl, thumbnailZoom, title, titlePage, titlePageActive, toastMessage, toggleChip, toggleDarkMode, trailerFile, trailerInputRef, trailerMeta, trailerMetaLoading, trailerPreviewUrl, trailerWorkflowHint, updateRoleAge, updateRoleField, uploadSelectedProjectMedia, useScreenplayEditor, user, validateStep, wordCount, writerPayout,
  };

  return (
    <CreateProjectContext.Provider value={ctx}>
    <div className="max-w-5xl mx-auto px-4 max-[768px]:px-2.5 max-[420px]:px-1.5 py-4 overflow-x-hidden">
      {/* -- Exit-as-draft confirmation -- */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => { if (!exiting) setShowExitConfirm(false); }}>
          <div onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 ${dark ? "bg-[#0d1520] border-[#1d3350]" : "bg-white border-gray-200"}`}>
            <h3 className={`text-base font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Save as draft?</h3>
            <p className={`text-sm mt-1.5 leading-relaxed ${dark ? "text-gray-400" : "text-gray-500"}`}>
              This script will be saved as a draft so you can finish it later from <span className="font-semibold">My projects</span>. Discard it if you don't want to keep it.
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <button type="button" disabled={exiting} onClick={confirmExitSaveDraft}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition disabled:opacity-50">
                {exiting ? "Saving…" : "Save as draft & exit"}
              </button>
              <button type="button" disabled={exiting} onClick={confirmExitDiscard}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition disabled:opacity-50 ${dark ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50"}`}>
                Discard &amp; exit
              </button>
              <button type="button" disabled={exiting} onClick={() => setShowExitConfirm(false)}
                className={`w-full py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}>
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header, the "Project setup" step navigator, and Back/Next/Submit all live in
          CreateProjectShell now (rendered below) — one shell wraps every step. */}

      {/* -- Drafts Drawer -- */}
      <AnimatePresence>
        {showDrafts && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className={`${cardCls} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>My Drafts</h3>
                <button onClick={() => { setScriptId(null); setLoadedScriptStatus("draft"); setEditApprovalLocked(false); setPurchasedServiceCredits({ evaluation: false, aiTrailer: false, spotlight: false }); setTitle(""); editor?.commands.clearContent(); clearLocalWorkingDraft(); setShowDrafts(false); setStep(1); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}>+ New Draft</button>
              </div>
              {loadingDrafts ? <div className="flex gap-3">{[1, 2, 3].map(i => <div key={i} className={`h-16 flex-1 rounded-xl animate-pulse ${dark ? "bg-[#182840]" : "bg-gray-100"}`} />)}</div>
                : drafts.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{drafts.map(d => (
                  <DraftCard key={d._id} draft={d} dark={dark} isActive={scriptId === d._id} onClick={() => loadDraft(d._id)} onDelete={handleDeleteDraft} />
                ))}</div>
                  : <p className={`text-center py-4 text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>No drafts yet. Start writing!</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Grammar Credit Confirmation Modal (portal) --- */}
      {focusMode && useScreenplayEditor && (
        <ScreenplayFocusMode
          value={screenplayValue}
          onChange={handleScreenplayChange}
          onElementChange={setCurrentElement}
          onCaretLine={handleCaretLine}
          apiRef={screenplayApiRef}
          dark={dark}
          title={title}
          currentElement={currentElement}
          scriptId={scriptId}
          onSetElement={(t) => screenplayApiRef.current?.setElementType(t)}
          onEmphasis={(kind) => screenplayApiRef.current?.applyEmphasis(kind)}
          onCase={(kind) => screenplayApiRef.current?.applyCase(kind)}
          onCentered={() => screenplayApiRef.current?.applyCentered()}
          onConfigureTitlePage={() => setShowTitlePageModal(true)}
          hasTitlePage={titlePageActive}
          titlePageFields={titlePage}
          onZoom={adjustZoom}
          zoom={editorZoom}
          emphasisState={emphasisState}
          onEmphasisStateChange={setEmphasisState}
          outline={outlineWithSceneIds}
          presenceBySceneId={presenceBySceneId}
          people={peopleEnriched}
          myUserId={collabMyUserId}
          locks={collabLocks}
          onRequestEdit={collabRequestEdit}
          editRequest={collabEditRequest}
          onReleaseHeld={collabReleaseHeld}
          onDismissEditRequest={collabClearEditRequest}
          comments={sceneComments}
          focusedCommentId={focusedCommentId}
          canComment={canComment}
          canEdit={canEditContent}
          isCommentOrphaned={isCommentOrphaned}
          onAddComment={handleAddComment}
          onReplyComment={handleReplyComment}
          onResolveComment={setCommentResolved}
          onDeleteComment={deleteSceneComment}
          onFocusComment={handleFocusComment}
          onSceneClick={(line) => screenplayApiRef.current?.scrollToLine(line)}
          synopses={sceneSynopses}
          onSynopsisChange={handleSynopsisChange}
          onReorderScene={handleReorderScene}
          outlineNotes={outlineNotes}
          onOutlineChange={handleOutlineChange}
          importNotice={importNotice}
          onDismissImportNotice={() => setImportNotice("")}
          notice={error}
          onDismissNotice={() => setError("")}
          onImport={() => screenplayFileInputRef.current?.click()}
          onExport={handleExportScreenplay}
          exporting={exportingScreenplay}
          onOpenHistory={() => setShowVersionHistory(true)}
          onExit={() => setFocusMode(false)}
        />
      )}

      <TitlePageModal
        key={showTitlePageModal ? "tp-open" : "tp-closed"}
        open={showTitlePageModal}
        initial={titlePage}
        defaultTitle={title}
        dark={dark}
        onClose={() => setShowTitlePageModal(false)}
        onSave={(fields) => {
          const cleaned = fields && Object.values(fields).some((v) => String(v || "").trim()) ? fields : null;
          setTitlePage(cleaned);
          setSaved(false);
        }}
      />

      <VersionHistoryModal
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        scriptId={scriptId}
        currentText={useScreenplayEditor ? screenplayValue : (editor ? editor.getText() : "")}
        dark={dark}
        onRestored={(fountainText) => {
          setScreenplayValue(fountainText);
          handleScreenplayChange(fountainText);
          setSaved(false);
        }}
      />



      {showUnderReviewModal && createPortal(
        <AnimatePresence>
          <motion.div
            key="under-review-modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ background: "rgba(3, 10, 19, 0.72)", backdropFilter: "blur(6px)" }}
          >
            <motion.div
              key="under-review-modal"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${dark ? "bg-[#091322] border-white/[0.08]" : "bg-white border-gray-200"}`}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className={`text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
                Script Submitted Successfully
              </h3>
              <p className={`text-sm mt-2 leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
                Your script is now under review. Please wait for admin approval. You will be notified once it is approved.
              </p>

              <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${dark ? "border-white/[0.08] bg-white/[0.03] text-gray-400" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                Redirecting automatically...
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={handleUnderReviewContinue}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* --- Undo/Keep Bar - fixed bottom (always visible) --- */}
      {showUndoBar && createPortal(
        <AnimatePresence>
          <motion.div
            key="grammar-undo-bar"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 max-[420px]:left-2 max-[420px]:right-2 max-[420px]:bottom-3 max-[420px]:translate-x-0"
          >
            <div className={`rounded-2xl shadow-2xl px-5 py-3.5 flex items-center gap-4 min-w-[340px] max-w-[520px] w-full max-[420px]:min-w-0 max-[420px]:max-w-none max-[420px]:px-3 max-[420px]:py-2.5 max-[420px]:gap-2.5 max-[420px]:flex-col max-[420px]:items-stretch ${
              dark
                ? "bg-[#0c1424] border border-white/[0.12] shadow-black/60"
                : "bg-white border border-gray-200 shadow-gray-300/40"
            }`}>
              {/* Status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className={`text-xs font-bold ${
                    dark ? "text-emerald-400" : "text-emerald-600"
                  }`}>Grammar Fixed</span>

                </div>
                {grammarNotes.length > 0 && (
                  <p className={`text-[10px] truncate leading-snug ${
                    dark ? "text-neutral-500" : "text-gray-400"
                  }`}>
                    {grammarNotes[0]}{grammarNotes.length > 1 ? ` +${grammarNotes.length - 1} more` : ""}
                  </p>
                )}
              </div>

              {/* Undo */}
              <button
                type="button"
                onClick={handleGrammarUndo}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.96] shrink-0 max-[420px]:w-full ${
                  dark
                    ? "text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-400/40"
                    : "text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3M3 10l4-4M3 10l4 4" />
                </svg>
                Undo
              </button>

              {/* Keep */}
              <button
                type="button"
                onClick={handleGrammarKeep}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.96] shrink-0 max-[420px]:w-full ${
                  dark
                    ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-400/40"
                    : "text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Keep
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* --- Thumbnail Crop/Rotate Modal --- */}
      {isThumbnailEditorOpen && thumbnailSourceUrl && createPortal(
        <AnimatePresence>
          <motion.div
            key="thumbnail-modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
            style={{ background: "rgba(0,0,0,0.76)", backdropFilter: "blur(8px)" }}
            onClick={resetThumbnailEditor}
          >
            <motion.div
              key="thumbnail-modal"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-3xl max-h-[92vh] my-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${dark
                ? "bg-[#091322] border border-white/[0.08]"
                : "bg-white border border-gray-200"
                }`}
            >
              <div className={`px-4 sm:px-5 py-3 sm:py-4 border-b flex items-center justify-between shrink-0 ${dark ? "border-white/[0.08]" : "border-gray-100"}`}>
                <div>
                  <h3 className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>Set Script Cover Image</h3>
                  <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Drag to frame the best angle. Cover ratio is 3:4.</p>
                </div>
                <button
                  type="button"
                  onClick={resetThumbnailEditor}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${dark
                    ? "text-gray-400 hover:bg-white/[0.08]"
                    : "text-gray-500 hover:bg-gray-100"
                    }`}
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className={`relative w-full h-[45vh] sm:h-[380px] min-h-[220px] rounded-xl overflow-hidden ${dark ? "bg-black/50" : "bg-gray-100"}`}>
                  <Cropper
                    image={thumbnailSourceUrl}
                    crop={thumbnailCrop}
                    zoom={thumbnailZoom}
                    minZoom={0.1}
                    rotation={thumbnailRotation}
                    aspect={THUMBNAIL_ASPECT}
                    showGrid
                    objectFit="cover"
                    onCropChange={setThumbnailCrop}
                    onZoomChange={setThumbnailZoom}
                    onRotationChange={setThumbnailRotation}
                    onCropComplete={(_, croppedAreaPixels) => setThumbnailCropPixels(croppedAreaPixels)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`rounded-xl p-3 border ${dark ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ZoomIn className={`w-4 h-4 ${dark ? "text-gray-400" : "text-gray-600"}`} />
                      <label className={`text-xs font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>Zoom</label>
                      <span className={`ml-auto text-[11px] ${dark ? "text-gray-500" : "text-gray-500"}`}>{thumbnailZoom.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.01}
                      value={thumbnailZoom}
                      onChange={(e) => setThumbnailZoom(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className={`rounded-xl p-3 border ${dark ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCw className={`w-4 h-4 ${dark ? "text-gray-400" : "text-gray-600"}`} />
                      <label className={`text-xs font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>Rotation</label>
                      <span className={`ml-auto text-[11px] ${dark ? "text-gray-500" : "text-gray-500"}`}>{Math.round(thumbnailRotation)} deg</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={thumbnailRotation}
                      onChange={(e) => setThumbnailRotation(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className={`rounded-xl px-3 py-2 border flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between ${dark ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center gap-2">
                    <Move className={`w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-500"}`} />
                    <p className={`text-[11px] ${dark ? "text-gray-400" : "text-gray-500"}`}>Tip: drag image to choose focal point, then fine-tune zoom and angle.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailCrop({ x: 0, y: 0 });
                      setThumbnailZoom(1);
                      setThumbnailRotation(0);
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition ${dark
                      ? "bg-white/[0.08] text-gray-300 hover:bg-white/[0.12]"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className={`px-4 sm:px-5 pb-4 sm:pb-5 pt-3 flex gap-3 shrink-0 ${dark ? "border-t border-white/[0.06]" : "border-t border-gray-100"}`}>
                <button
                  type="button"
                  onClick={resetThumbnailEditor}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${dark
                    ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyThumbnail}
                  disabled={thumbnailApplying}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
                >
                  {thumbnailApplying ? "Saving Cover..." : "Save Cover"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      <div ref={stepContentRef} />

      {/* -- Step Content (wrapped by the unified shell) ------ */}
      <CreateProjectShell>
        {step === 1 ? <Step1Write />
          : step === 2 ? <Step2Details />
            : step === 3 ? <Step3Classify />
              : step === 4 ? <Step4FilmInfo />
                : <Step5Publish />}
      </CreateProjectShell>

      {/* Professional Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border ${
            toastMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' :
            toastMessage.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200' :
            'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}>
            {toastMessage.type === 'error' ? (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <p className="text-sm font-medium">{toastMessage.text}</p>
            {toastMessage.action && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setToastMessage(null);
                  toastMessage.action.onClick();
                }} 
                className="ml-3 px-3 py-1.5 text-xs font-bold bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-md transition whitespace-nowrap"
              >
                {toastMessage.action.label}
              </button>
            )}
            <button onClick={() => setToastMessage(null)} className="ml-2 opacity-70 hover:opacity-100 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

    </div>

      </CreateProjectContext.Provider>
  );
};

export default CreateProject;
