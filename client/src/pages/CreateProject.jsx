import { useState, useEffect, useCallback, useContext, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Cropper from "react-easy-crop";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { jsPDF } from "jspdf";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import { Image as ImageIcon, Film, CheckCircle2, Move, ZoomIn, RotateCw } from "lucide-react";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import ScreenplayPdfViewer from "../components/ScreenplayPdfViewer";
import { SCRIPT_UPLOAD_TERMS_TEXT, SCRIPT_UPLOAD_TERMS_VERSION } from "../constants/scriptUploadTerms";
import {
  SCRIPT_COMPLETION_OPTIONS,
  buildScriptCompletionPayload,
  createScriptCompletionFormState,
  getScriptCompletionValidationMessage,
} from "../utils/scriptCompletion";
import ScreenplayEditor from "../components/screenplay/ScreenplayEditor";
import ScreenplayFocusMode, { TitlePageSheet } from "../components/screenplay/ScreenplayFocusMode";
import ScreenplayElementBar from "../components/screenplay/ScreenplayElementBar";
import { CORE_ELEMENTS, MORE_ELEMENT_GROUPS, SCREENPLAY_ELEMENT_BAR } from "../components/screenplay/screenplayElements";
import { TITLE_PAGE_FIELDS } from "../components/screenplay/classify";
import VersionHistoryModal from "../components/screenplay/VersionHistoryModal";
import { extractOutline } from "../components/screenplay/screenplayMode";
import { getScenes, sceneIdAtLine } from "../components/screenplay/sceneIdentity";
import { moveScene } from "../components/screenplay/sceneReorder";
import { fountainToFdx, fdxToFountain } from "../components/screenplay/fdx";
import PresenceAvatars from "../components/screenplay/PresenceAvatars";
import useScenePresence from "../hooks/useScenePresence";
import useSceneComments from "../hooks/useSceneComments";
import { buildAnchor, resolveAnchor } from "../components/screenplay/commentAnchor";
import { formatScreenplayLikeText } from "../utils/screenplayText";

const DRAFT_ENDPOINT = `${(import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "")}/api/scripts/draft`;
const LOCAL_WORKING_DRAFT_KEY = "create-project-working-draft-v1";

/* -- Constants --------------------------------------- */
const filmFormats = [
  { value: "feature_film", label: "Feature Film", icon: "FILM" },
  { value: "short_film", label: "Short Film", icon: "SHORT" },
  { value: "web_series", label: "Web Series", icon: "SERIES" },
  { value: "tv_1hour", label: "TV Series (1 hr)", icon: "TV" },
  { value: "tv_halfhour", label: "TV Series (30 min)", icon: "TV" },
  { value: "limited_series", label: "Limited Series", icon: "SERIES" },
  { value: "documentary", label: "Documentary", icon: "DOC" },
  { value: "micro_drama", label: "Micro Drama", icon: "SHORT" },
];

const publishingFormats = [
  { value: "fiction_novel", label: "Fiction Novel", icon: "DOC" },
  { value: "non_fiction", label: "Non-fiction", icon: "DOC" },
  { value: "novella", label: "Novella", icon: "DOC" },
  { value: "short_story_collection", label: "Short Story Collection", icon: "DOC" },
  { value: "poetry", label: "Poetry", icon: "DOC" },
];

const styleOptions = [
  "Live Action",
  "Animation",
  "Anime",
  "Experimental"
];

const allFormats = [...filmFormats, ...publishingFormats];

const CONTENT_TYPE_BY_FORMAT = {
  feature_film: "movie",
  short_film: "short_film",
  web_series: "web_series",
  tv_1hour: "tv_series",
  tv_halfhour: "tv_series",
  limited_series: "tv_series",
  documentary: "documentary",
  micro_drama: "micro_drama",
  fiction_novel: "book",
  non_fiction: "book",
  novella: "book",
  short_story_collection: "book",
  poetry: "book",
};

const getContentTypeFromFormat = (format) => CONTENT_TYPE_BY_FORMAT[format] || "movie";

// Screenplay element dropdown — each option is rendered styled as its element, with a
// The element-type list (all eleven, with Tab-order badges for the core six) lives with the
// compact toolbar that renders it — see ScreenplayElementBar.
const genres = [
  "Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "Sci-Fi", "Fantasy",
  "Mystery", "Adventure", "Crime", "Western", "Animation", "Documentary", "Historical",
  "War", "Musical", "Biographical", "Sports", "Political", "Legal", "Medical",
  "Supernatural", "Psychological", "Noir", "Family", "Teen", "Satire", "Dark Comedy",
];
const toneOptions = [
  "Dark", "Quirky", "Fast-Paced", "Slow-Burn", "Feel-Good", "Gritty", "Lighthearted",
  "Noir", "Uplifting", "Tragic", "Suspenseful", "Whimsical", "Intense", "Edgy",
  "Heartwarming", "Cynical", "Hopeful", "Melancholic", "Surreal", "Cerebral",
];
const themeOptions = [
  "Revenge", "Coming of Age", "AI", "Survival", "Redemption", "Love Triangle",
  "Betrayal", "Family Drama", "Social Justice", "Identity Crisis", "Power Struggle",
  "Forbidden Love", "Loss & Grief", "Ambition", "Good vs Evil", "Man vs Nature",
  "Isolation", "Corruption", "Second Chance", "Underdog Story",
];
const settingOptions = [
  "New York", "Space", "High School", "Dystopia", "Isolated", "Los Angeles", "Urban",
  "Rural", "Suburban", "Historical", "Contemporary", "Post-Apocalyptic", "Small Town",
  "Big City", "Wilderness", "Ocean/Sea", "Desert", "Medieval", "Future",
];
const ROLE_GENDER_OPTIONS = ["Any", "Female", "Male", "Non-binary", "Other"];
const SERVICE_PRICES = { hosting: 0, evaluation: 50, aiTrailer: 120, spotlight: 310 };
const THUMBNAIL_ASPECT = 3 / 4;
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
const MAX_THUMBNAIL_SOURCE_SIZE = 25 * 1024 * 1024;
const MAX_TRAILER_SIZE = 250 * 1024 * 1024;
const MAX_CUSTOM_INVESTOR_TERMS_LENGTH = 3000;
const MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH = 5000;

const createImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener("load", () => resolve(image));
  image.addEventListener("error", reject);
  image.setAttribute("crossOrigin", "anonymous");
  image.src = url;
});

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const getRotatedSize = (width, height, rotation) => {
  const r = toRadians(rotation);
  return {
    width: Math.abs(Math.cos(r) * width) + Math.abs(Math.sin(r) * height),
    height: Math.abs(Math.sin(r) * width) + Math.abs(Math.cos(r) * height),
  };
};

const getCroppedThumbnailBlob = async (imageSrc, pixelCrop, rotation = 0, outputType = "image/jpeg", jpegQuality = 0.92) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  const rotated = getRotatedSize(image.width, image.height, rotation);
  canvas.width = rotated.width;
  canvas.height = rotated.height;

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(toRadians(rotation));
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d");

  if (!cropCtx) return null;

  cropCanvas.width = pixelCrop.width;
  cropCanvas.height = pixelCrop.height;

  cropCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    const quality = outputType === "image/jpeg" ? jpegQuality : undefined;
    cropCanvas.toBlob((blob) => resolve(blob), outputType, quality);
  });
};

// Page geometry for the screenplay sheet view. PAGE_CONTENT_H is the on-screen height of one page's
// text area (kept in sync with the editor's --sp-page-height, which drives the REAL === page-break
// spacers). PAGE_MARGIN_Y is the top/bottom paper margin so text never touches the sheet edge.
const PAGE_CONTENT_H = 1056;
const PAGE_MARGIN_Y = 56;

/* -- Format-aware page ranges (industry standards) -- */
const FORMAT_PAGE_RANGES = {
  feature: { min: 70, max: 180, typical: "90-120", label: "Feature Film", wordsPerPage: 250 },
  tv_1hour: { min: 45, max: 75, typical: "50-65", label: "TV 1-Hour", wordsPerPage: 250 },
  tv_halfhour: { min: 22, max: 45, typical: "25-35", label: "TV Half-Hour", wordsPerPage: 250 },
  short: { min: 1, max: 40, typical: "5-25", label: "Short Film", wordsPerPage: 250 },
  limited_series: { min: 45, max: 75, typical: "50-65", label: "Limited Series", wordsPerPage: 250 },
  documentary: { min: 60, max: 120, typical: "70-100", label: "Documentary", wordsPerPage: 250 },
  web_series: { min: 20, max: 80, typical: "25-45", label: "Web Series", wordsPerPage: 250 },
  drama_school: { min: 10, max: 60, typical: "15-35", label: "Drama School", wordsPerPage: 250 },
  micro_drama: { min: 1, max: 15, typical: "3-10", label: "Micro Drama", wordsPerPage: 250 },
  anime: { min: 18, max: 65, typical: "22-45", label: "Anime", wordsPerPage: 250 },
  movie: { min: 70, max: 180, typical: "90-120", label: "Movie", wordsPerPage: 250 },
  tv_serial: { min: 18, max: 50, typical: "20-35", label: "TV Serial", wordsPerPage: 250 },
  cartoon: { min: 7, max: 45, typical: "10-25", label: "Cartoon", wordsPerPage: 250 },
  songs: { min: 1, max: 30, typical: "2-10", label: "Songs", wordsPerPage: 250 },
  standup_comedy: { min: 3, max: 50, typical: "8-20", label: "Standup Comedy", wordsPerPage: 250 },
  dialogues: { min: 1, max: 80, typical: "5-25", label: "Dialogues", wordsPerPage: 250 },
  poet: { min: 1, max: 60, typical: "3-20", label: "Poet", wordsPerPage: 250 },
  other: { min: 1, max: 250, typical: "Varies", label: "Other", wordsPerPage: 250 },
};
const MAX_PREVIEW_SNIPPET_LENGTH = 900;
const PREVIEW_LINES_PER_PAGE = 42;

const normalizePreviewContent = (value = "") =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getPreviewPageSnippet = (pageTexts = [], pageNumber = 1) => {
  const index = Math.max(0, Number(pageNumber || 0) - 1);
  const raw = String(pageTexts?.[index] || "").trim();
  if (!raw) return "";
  return raw.length > MAX_PREVIEW_SNIPPET_LENGTH
    ? `${raw.slice(0, MAX_PREVIEW_SNIPPET_LENGTH).trimEnd()}...`
    : raw;
};
const buildPagePreviewTexts = (html = "", pageCount = 1) => {
  const plainText = normalizePreviewContent(html);
  if (!plainText) return [];

  const lines = plainText.split("\n");
  const safePages = Math.max(1, Number(pageCount) || 1);
  const chunks = [];

  for (let pageIndex = 0; pageIndex < safePages; pageIndex += 1) {
    const startLine = pageIndex * PREVIEW_LINES_PER_PAGE;
    const endLine = Math.min(lines.length, (pageIndex + 1) * PREVIEW_LINES_PER_PAGE);
    const pageText = startLine < lines.length
      ? lines.slice(startLine, endLine).join("\n").trimEnd()
      : "";
    chunks.push(pageText);
  }

  return chunks;
};
const LEGAL_AGREEMENT = SCRIPT_UPLOAD_TERMS_TEXT;

const RIGHTS_TYPE_OPTIONS = [
  { value: "full_rights_sale", label: "Full Rights Sale (Ownership Transfer)" },
  { value: "exclusive_license", label: "Exclusive License" },
  { value: "custom_negotiation_required", label: "Custom Negotiation Required" },
];

const MODIFICATION_RIGHTS_OPTIONS = [
  { value: "buyer_can_modify_freely", label: "Buyer can modify freely" },
  { value: "buyer_must_consult_writer", label: "Buyer must consult writer" },
  { value: "writer_retains_creative_approval_rights", label: "Writer retains creative approval rights" },
];

const PAYMENT_STRUCTURE_OPTIONS = [
  { value: "one_time_upfront_payment", label: "One-time upfront payment" },
  { value: "lower_upfront_plus_royalty_percent", label: "Lower upfront + royalty %" },
  { value: "revenue_sharing_model", label: "Revenue sharing model" },
  { value: "custom_deal", label: "Custom deal" },
];

const NEGOTIATION_MODE_OPTIONS = [
  { value: "fixed_terms_non_negotiable", label: "Fixed terms (non-negotiable)" },
  { value: "open_to_discussion_after_purchase", label: "Open to discussion after purchase" },
];

const RIGHTS_LABEL_MAP = Object.fromEntries(RIGHTS_TYPE_OPTIONS.map((option) => [option.value, option.label]));
const MODIFICATION_LABEL_MAP = Object.fromEntries(MODIFICATION_RIGHTS_OPTIONS.map((option) => [option.value, option.label]));
const PAYMENT_LABEL_MAP = Object.fromEntries(PAYMENT_STRUCTURE_OPTIONS.map((option) => [option.value, option.label]));
const NEGOTIATION_LABEL_MAP = Object.fromEntries(NEGOTIATION_MODE_OPTIONS.map((option) => [option.value, option.label]));
const LICENSE_DURATION_PRESET_MONTHS = [12, 18, 24];
const MIN_LICENSE_DURATION_MONTHS = 1;
const MAX_LICENSE_DURATION_MONTHS = 120;

const createDefaultRightsLicensing = () => ({
  rightsType: "full_rights_sale",
  exclusivity: true,
  modificationRights: "buyer_must_consult_writer",
  paymentStructure: "one_time_upfront_payment",
  royaltySettings: {
    percentage: 0,
    durationType: "none",
    durationYears: 0,
  },
  timeBound: {
    licenseDurationMonths: 12,
    autoRevertToWriter: true,
  },
  negotiationMode: "fixed_terms_non_negotiable",
  customConditions: "",
  legalAcknowledgement: {
    ownershipConfirmed: false,
    platformTermsAccepted: false,
    exclusivityUnderstood: false,
  },
});

const normalizeRightsLicensingState = (incoming = {}) => {
  const defaults = createDefaultRightsLicensing();
  const normalizedRightsType = RIGHTS_LABEL_MAP[incoming?.rightsType] ? incoming.rightsType : defaults.rightsType;
  const normalizedPaymentStructure = PAYMENT_LABEL_MAP[incoming?.paymentStructure]
    ? incoming.paymentStructure
    : defaults.paymentStructure;
  const requestedDurationRaw = Number(incoming?.timeBound?.licenseDurationMonths ?? defaults.timeBound.licenseDurationMonths);
  const requestedDuration = Number.isFinite(requestedDurationRaw)
    ? Math.max(0, Math.min(MAX_LICENSE_DURATION_MONTHS, Math.round(requestedDurationRaw)))
    : defaults.timeBound.licenseDurationMonths;

  return {
    rightsType: normalizedRightsType,
    exclusivity: true,
    modificationRights: MODIFICATION_LABEL_MAP[incoming?.modificationRights]
      ? incoming.modificationRights
      : defaults.modificationRights,
    paymentStructure: normalizedPaymentStructure,
    royaltySettings: {
      percentage: Number.isFinite(Number(incoming?.royaltySettings?.percentage))
        ? Math.max(0, Math.min(100, Number(incoming.royaltySettings.percentage)))
        : defaults.royaltySettings.percentage,
      durationType: ["none", "years", "project_lifetime"].includes(incoming?.royaltySettings?.durationType)
        ? incoming.royaltySettings.durationType
        : defaults.royaltySettings.durationType,
      durationYears: Number.isFinite(Number(incoming?.royaltySettings?.durationYears))
        ? Math.max(0, Math.min(99, Math.round(Number(incoming.royaltySettings.durationYears))))
        : defaults.royaltySettings.durationYears,
    },
    timeBound: {
      licenseDurationMonths: requestedDuration,
      autoRevertToWriter: incoming?.timeBound?.autoRevertToWriter !== undefined
        ? Boolean(incoming.timeBound.autoRevertToWriter)
        : defaults.timeBound.autoRevertToWriter,
    },
    negotiationMode: NEGOTIATION_LABEL_MAP[incoming?.negotiationMode]
      ? incoming.negotiationMode
      : defaults.negotiationMode,
    customConditions: String(incoming?.customConditions || "").slice(0, MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH),
    legalAcknowledgement: {
      ownershipConfirmed: Boolean(incoming?.legalAcknowledgement?.ownershipConfirmed),
      platformTermsAccepted: Boolean(incoming?.legalAcknowledgement?.platformTermsAccepted),
      exclusivityUnderstood: Boolean(incoming?.legalAcknowledgement?.exclusivityUnderstood),
    },
  };
};

const getRightsValidationMessage = (rightsLicensing) => {
  if (!RIGHTS_LABEL_MAP[rightsLicensing?.rightsType]) {
    return "Rights type is required.";
  }

  if (!MODIFICATION_LABEL_MAP[rightsLicensing?.modificationRights]) {
    return "Modification rights selection is required.";
  }

  if (!PAYMENT_LABEL_MAP[rightsLicensing?.paymentStructure]) {
    return "Payment structure selection is required.";
  }

  if (!NEGOTIATION_LABEL_MAP[rightsLicensing?.negotiationMode]) {
    return "Negotiation mode selection is required.";
  }

  if (rightsLicensing?.rightsType === "exclusive_license") {
    const durationMonths = Number(rightsLicensing?.timeBound?.licenseDurationMonths);
    if (!Number.isInteger(durationMonths) || durationMonths < MIN_LICENSE_DURATION_MONTHS || durationMonths > MAX_LICENSE_DURATION_MONTHS) {
      return `Exclusive license requires duration between ${MIN_LICENSE_DURATION_MONTHS} and ${MAX_LICENSE_DURATION_MONTHS} months.`;
    }
  }

  const royaltyBased = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(rightsLicensing?.paymentStructure);
  if (royaltyBased) {
    const pct = Number(rightsLicensing?.royaltySettings?.percentage || 0);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return "Royalty percentage must be between 0 and 100 for royalty-based structures.";
    }
  }

  if (!rightsLicensing?.legalAcknowledgement?.ownershipConfirmed) {
    return "You must confirm script ownership rights.";
  }

  if (!rightsLicensing?.legalAcknowledgement?.platformTermsAccepted) {
    return "You must confirm platform legal acknowledgement.";
  }

  if (!rightsLicensing?.legalAcknowledgement?.exclusivityUnderstood) {
    return "You must acknowledge exclusivity enforcement.";
  }

  return "";
};

const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Black", value: "#000000" },
  { label: "Slate", value: "#64748b" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Yellow", value: "#eab308" },
  { label: "Lime", value: "#84cc16" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
  { label: "White", value: "#ffffff" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Purple", value: "#e9d5ff" },
  { label: "Orange", value: "#fed7aa" },
];

const STEPS = [
  { num: 1, label: "Write", shortLabel: "Write", desc: "Script content" },
  { num: 2, label: "Details", shortLabel: "Detail", desc: "Genre & media" },
  { num: 3, label: "Classify", shortLabel: "Class", desc: "Tones & themes" },
  { num: 4, label: "Film Info", shortLabel: "Film", desc: "Direction & language" },
  { num: 5, label: "Publish", shortLabel: "Pub", desc: "Pricing & services" },
];

const CP_FILM_LANGUAGE_OPTIONS = [
  "Hindi", "English", "Hinglish", "Sindhi", "Urdu", "Tamil", "Telugu", "Marathi",
  "Bengali", "Kannada", "Malayalam", "Punjabi", "Gujarati", "Odia", "Other",
];

const CP_SCRIPT_STYLE_OPTIONS = [
  { id: "Professional", desc: "Industry-standard structure", path: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { id: "Modern", desc: "Contemporary voice & fresh approach", path: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  { id: "Clean", desc: "Minimal prose, tight & uncluttered", path: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
  { id: "Concise", desc: "Every scene earns its place", path: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" },
  { id: "Commercial", desc: "Broad appeal, market-friendly", path: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" },
  { id: "Realistic", desc: "Grounded characters & authentic dialogue", path: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { id: "Poetic", desc: "Lyrical prose & metaphorical language", path: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" },
  { id: "Experimental", desc: "Non-linear, unconventional structure", path: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5" },
  { id: "Dialogue-Heavy", desc: "Character-driven through conversation", path: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" },
  { id: "Visual-Heavy", desc: "Scene-led, strong visual prose", path: "M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
];

/* -- Toolbar Icon Button ---------------------------- */
const TBtn = ({ active, onClick, title, children, dark, disabled = false }) => (
  <button type="button" onClick={onClick} title={title} disabled={disabled}
    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${active
        ? "bg-[#1e3a5f] text-white shadow-sm"
        : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}>{children}</button>
);

/* -- Divider ----------------------------------------- */
const D = ({ dark }) => <div className={`w-px self-stretch mx-0.5 ${dark ? "bg-white/[0.08]" : "bg-gray-200"}`} />;

/* -- Editor Toolbar ---------------------------------- */
const EditorToolbar = ({ editor, dark }) => {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const textColorRef = useRef(null);
  const highlightRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (textColorRef.current && !textColorRef.current.contains(e.target)) setShowTextColor(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target)) setShowHighlight(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editor) return null;

  const Section = ({ children }) => <div className="flex items-center gap-0.5">{children}</div>;

  return (
    <div className={`flex flex-wrap items-center gap-1 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-200 bg-white"
      }`}>

      {/* -- Headings -- */}
      <Section>
        <TBtn dark={dark} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</TBtn>
        <TBtn dark={dark} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</TBtn>
        <TBtn dark={dark} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Text Style -- */}
      <Section>
        {/* Bold */}
        <TBtn dark={dark} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" /></svg>
        </TBtn>
        {/* Italic */}
        <TBtn dark={dark} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" /></svg>
        </TBtn>
        {/* Underline */}
        <TBtn dark={dark} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" /></svg>
        </TBtn>
        {/* Strikethrough */}
        <TBtn dark={dark} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" /></svg>
        </TBtn>
        {/* Inline Code */}
        <TBtn dark={dark} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" /></svg>
        </TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Alignment -- */}
      <Section>
        <TBtn dark={dark} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" /></svg>
        </TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Lists -- */}
      <Section>
        <TBtn dark={dark} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 10h-3v3h-2v-3H9v-2h3V8h2v3h3v2z" /></svg>
        </TBtn>
        <TBtn dark={dark} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 11h18v2H3z" /></svg>
        </TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Text Color -- */}
      <div className="relative" ref={textColorRef}>
        <button type="button" title="Text Color"
          onClick={() => { setShowTextColor(v => !v); setShowHighlight(false); }}
          className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${showTextColor ? "bg-[#1e3a5f] text-white" : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100"
            }`}>
          <svg className="w-[13px] h-[13px]" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z" /></svg>
          <div className="w-4 h-[3px] rounded-full mt-0.5" style={{ backgroundColor: editor.getAttributes("textStyle").color || (dark ? "#6b7280" : "#374151") }} />
        </button>
        {showTextColor && (
          <div className={`absolute top-full left-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0a1624] border-[#1d3350]" : "bg-white border-gray-200"
            }`} style={{ width: 220 }}>
            <div className={`px-3 py-2 border-b text-[10px] font-bold tracking-widest uppercase ${dark ? "border-[#182840] text-gray-600" : "border-gray-100 text-gray-400"
              }`}>Text Color</div>
            <div className="p-3 grid grid-cols-6 gap-1.5">
              {TEXT_COLORS.map(c => (
                <button key={c.label} type="button" title={c.label}
                  onClick={() => { c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run(); setShowTextColor(false); }}
                  className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center ${(editor.getAttributes("textStyle").color === c.value) ? "border-[#1e3a5f] scale-110" : dark ? "border-white/10" : "border-gray-200"
                    }`}
                  style={{ backgroundColor: c.value || (dark ? "#1a2a3a" : "#f3f4f6") }}>
                  {!c.value && <svg className={`w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -- Highlight -- */}
      <div className="relative" ref={highlightRef}>
        <button type="button" title="Highlight"
          onClick={() => { setShowHighlight(v => !v); setShowTextColor(false); }}
          className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${showHighlight ? "bg-[#1e3a5f] text-white" : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100"
            }`}>
          <svg className="w-[13px] h-[13px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <div className="w-4 h-[3px] rounded-full mt-0.5 bg-yellow-300" />
        </button>
        {showHighlight && (
          <div className={`absolute top-full left-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0a1624] border-[#1d3350]" : "bg-white border-gray-200"
            }`} style={{ width: 200 }}>
            <div className={`px-3 py-2 border-b text-[10px] font-bold tracking-widest uppercase ${dark ? "border-[#182840] text-gray-600" : "border-gray-100 text-gray-400"
              }`}>Highlight</div>
            <div className="p-3 grid grid-cols-6 gap-1.5">
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.label} type="button" title={c.label}
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c.value }).run(); setShowHighlight(false); }}
                  className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${editor.isActive("highlight", { color: c.value }) ? "border-[#1e3a5f] scale-110" : dark ? "border-white/10" : "border-gray-200"
                    }`}
                  style={{ backgroundColor: c.value }} />
              ))}
              <button type="button" title="Remove Highlight"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
                  }`}>
                <svg className={`w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <D dark={dark} />

      {/* -- History -- */}
      <Section>
        <TBtn dark={dark} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" /></svg>
        </TBtn>
        <TBtn dark={dark} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M5.13 3L4 4.13l7.36 7.37-4.6 9.5H9l3.64-7.54 5.23 5.23L17 17.87 5.13 3zm11.93-1.01l-3.09 3.09L12 4 9.38 9.38l1.41 1.41 1.62-3.35L16.87 12H13l1.41 1.41 2.09-2.09L18.87 13l1.13-1.13-2.94-9.88z" /></svg>
        </TBtn>
      </Section>
    </div>
  );
};

/* -- Screenplay Format Bar --------------------------------------------------
   The "Rich text" lower bar for SCREENPLAY mode. Every control writes through the
   Fountain-native machinery (applyEmphasis / setElementType), so what the writer
   formats is exactly what the classifier, reports, page count, and PDF/Fountain/FDX
   export all see — no separate document model, nothing that can drift. Only controls
   with a real Fountain representation live here (inline emphasis + element styles);
   colour/highlight/headings deliberately do NOT, because Fountain can't store them. */
const ScreenplayFormatBar = ({ onSetElement, onEmphasis, onCase, onCentered, onInsertPageBreak, onZoom, zoom = 1, onSwitchToProse, currentElement, emphasisState, dark }) => {
  const [styleOpen, setStyleOpen] = useState(false);
  const styleRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (styleRef.current && !styleRef.current.contains(e.target)) setStyleOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = emphasisState?.active || [];
  const hasSelection = Boolean(emphasisState?.hasSelection);
  const currentLabel = (SCREENPLAY_ELEMENT_BAR.find((e) => e.value === currentElement)?.label)
    || (currentElement === "blank" ? "Action" : "Action");

  // mousedown + preventDefault keeps the editor selection alive while clicking the button.
  const emBtn = (kind, glyph, title, cls) => (
    <button key={kind} type="button" title={hasSelection ? title : `${title} — select text first`}
      onMouseDown={(e) => { e.preventDefault(); onEmphasis?.(kind); }}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[13px] ${cls} transition ${
        active.includes(kind)
          ? "bg-[#1e3a5f] text-white shadow-sm"
          : dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
      }`}>{glyph}</button>
  );

  return (
    <div className={`relative z-20 flex flex-wrap items-center gap-2 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-200 bg-white"}`}>
      {/* Style dropdown — the document's element styles (Scene / Action / Character …), Word-style. */}
      <div className="relative" ref={styleRef}>
        <button type="button" onClick={() => setStyleOpen((o) => !o)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-semibold border min-w-[120px] justify-between transition ${dark ? "border-[#2a4a6a] text-gray-200 hover:bg-white/[0.06]" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
          <span className="truncate">{currentLabel}</span>
          <svg className="w-3 h-3 opacity-60 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {styleOpen && (
          <>
            <div className="fixed inset-0 z-[55]" onClick={() => setStyleOpen(false)} />
            <div className={`absolute left-0 mt-1 w-52 rounded-lg border shadow-xl z-[60] py-1 text-[12px] max-h-[60vh] overflow-y-auto ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
              {SCREENPLAY_ELEMENT_BAR.map((el) => (
                <button key={el.value} type="button"
                  onClick={() => { setStyleOpen(false); onSetElement?.(el.value); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 ${
                    currentElement === el.value ? (dark ? "bg-white/[0.08] text-white" : "bg-gray-100 text-gray-900") : (dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50")
                  }`}>
                  <el.Icon className="w-3.5 h-3.5 opacity-70" strokeWidth={1.8} aria-hidden="true" />
                  <span className="flex-1 text-left">{el.label}</span>
                  {el.tab && <span className={`text-[10px] font-mono ${dark ? "text-gray-600" : "text-gray-400"}`}>{el.tab}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <D dark={dark} />

      {/* Inline emphasis — standard Fountain *italic* / **bold** / ***both*** / _underline_. */}
      <div className="flex items-center gap-0.5">
        {emBtn("bold", "B", "Bold", "font-bold")}
        {emBtn("italic", "I", "Italic", "italic font-serif")}
        {emBtn("underline", "U", "Underline", "underline")}
        {emBtn("bolditalic", "BI", "Bold Italic", "font-bold italic font-serif text-[11px]")}
      </div>

      <D dark={dark} />

      {/* Case transforms — rewrite the selected characters (persists, classifier-safe). */}
      <div className="flex items-center gap-0.5">
        <button type="button" title={hasSelection ? "UPPERCASE" : "UPPERCASE — select text first"}
          onMouseDown={(e) => { e.preventDefault(); onCase?.("upper"); }}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[12px] font-bold tracking-tight transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>AA</button>
        <button type="button" title={hasSelection ? "lowercase" : "lowercase — select text first"}
          onMouseDown={(e) => { e.preventDefault(); onCase?.("lower"); }}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[12px] font-bold tracking-tight lowercase transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>aa</button>
      </div>

      <D dark={dark} />

      {/* Center — wraps the line(s) as Fountain ">centered<" (line-level, export-safe in Fountain). */}
      <button type="button" title="Center line"
        onMouseDown={(e) => { e.preventDefault(); onCentered?.(); }}
        className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition ${
          emphasisState?.centered ? "bg-[#1e3a5f] text-white shadow-sm" : dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>
        <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
      </button>

      {onInsertPageBreak && (
        <>
          <D dark={dark} />
          {/* Insert a real page break (=== ): content after it starts on a fresh page. */}
          <button type="button" title="Insert page break"
            onMouseDown={(e) => { e.preventDefault(); onInsertPageBreak(); }}
            className={`flex items-center gap-1 px-2 h-8 rounded-md text-[11px] font-semibold transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>
            <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 17h18M8 12h8" /></svg>
            Page break
          </button>
        </>
      )}

      {onZoom && (
        <>
          <D dark={dark} />
          {/* Editor zoom — scales how big the text LOOKS (view only); text/page count/export unchanged. */}
          <div className="flex items-center gap-0.5">
            <button type="button" title="Zoom out" onClick={() => onZoom(-1)}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>
              <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z" /></svg>
            </button>
            <button type="button" title="Reset zoom to 100%" onClick={() => onZoom(0)}
              className={`min-w-[3.25rem] h-8 px-1 inline-flex items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition ${dark ? "text-gray-300 hover:bg-white/[0.08]" : "text-gray-600 hover:bg-gray-100"}`}>
              {Math.round((Number(zoom) || 1) * 100)}%
            </button>
            <button type="button" title="Zoom in" onClick={() => onZoom(1)}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>
              <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            </button>
          </div>
        </>
      )}

      <span className={`text-[10px] max-[1100px]:hidden ${dark ? "text-gray-600" : "text-gray-400"}`}>
        Select text, then format
      </span>

      {/* Mode switch — screenplay uses Fountain emphasis; "Rich text (prose)" hands off to the full
          TipTap editor (headings, colour, lists) for non-screenplay writing. Kept here so every
          formatting choice lives under Text Format. */}
      {onSwitchToProse && (
        <button type="button" onClick={onSwitchToProse}
          title="Switch to the prose / rich-text editor (headings, colour, lists)"
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${dark ? "border-[#2a4a6a] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M3 12h18M3 19h12" /></svg>
          Rich text (prose)
        </button>
      )}
    </div>
  );
};

/* -- Title Page Configurator ------------------------------------------------
   Industry-standard title page: Title, Credit ("Written by"), Author, Source
   ("Based on…"), Draft date. Stored as structured data and rendered by the PDF /
   Fountain export — NOT mixed into the editor body (keeps the classifier clean). */
const TitlePageModal = ({ open, initial, defaultTitle, dark, onSave, onClose }) => {
  // Seed once at mount. The call site remounts this (via `key`) each time it opens, so lazy initial
  // state is the right place to seed — no setState-in-effect (which triggers cascading renders).
  const [fields, setFields] = useState(() => {
    const seed = { ...Object.fromEntries(TITLE_PAGE_FIELDS.map((f) => [f.key, ""])), ...(initial || {}) };
    if (!String(seed.title || "").trim() && defaultTitle) seed.title = defaultTitle;
    if (!String(seed.credit || "").trim()) seed.credit = "Written by";
    return seed;
  });

  if (!open) return null;
  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));
  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border outline-none transition ${dark ? "bg-[#0a1322] border-[#22364f] text-gray-100 focus:border-[#3a5a82] placeholder:text-gray-600" : "bg-white border-gray-200 text-gray-900 focus:border-[#1e3a5f] placeholder:text-gray-300"}`;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div onMouseDown={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0d1520] border-[#1d3350]" : "bg-white border-gray-200"}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? "border-[#182840]" : "border-gray-100"}`}>
          <div>
            <h3 className={`text-base font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Title Page</h3>
            <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Industry-standard fields — shown on the exported PDF.</p>
          </div>
          <button type="button" onClick={onClose} className={`w-8 h-8 inline-flex items-center justify-center rounded-lg ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-100"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Centered preview of the title block */}
        <div className={`mx-5 mt-4 rounded-lg border px-4 py-6 text-center font-mono ${dark ? "border-[#22364f] bg-[#0a1322]" : "border-gray-200 bg-gray-50"}`}>
          <div className={`text-base font-bold uppercase tracking-wide ${dark ? "text-gray-100" : "text-gray-900"}`}>{fields.title?.trim() || "TITLE"}</div>
          {fields.credit?.trim() && <div className={`text-[12px] mt-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>{fields.credit}</div>}
          {fields.author?.trim() && <div className={`text-[13px] ${dark ? "text-gray-200" : "text-gray-700"}`}>{fields.author}</div>}
          {fields.source?.trim() && <div className={`text-[11px] mt-3 italic ${dark ? "text-gray-500" : "text-gray-400"}`}>{fields.source}</div>}
          {fields.draftDate?.trim() && <div className={`text-[11px] mt-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>{fields.draftDate}</div>}
        </div>

        <div className="p-5 space-y-3">
          {TITLE_PAGE_FIELDS.map((f) => (
            <div key={f.key}>
              <label className={`block text-[11px] font-semibold mb-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{f.label}</label>
              <input type="text" value={fields[f.key] || ""} placeholder={f.placeholder || ""}
                onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
            </div>
          ))}
        </div>

        <div className={`px-5 py-4 border-t flex items-center gap-2 ${dark ? "border-[#182840]" : "border-gray-100"}`}>
          <button type="button" onClick={() => { onSave(null); onClose(); }}
            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition mr-auto ${dark ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50"}`}>
            Remove title page
          </button>
          <button type="button" onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${dark ? "border-[#22364f] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}>Cancel</button>
          <button type="button" onClick={() => { onSave(fields); onClose(); }}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition">Save title page</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -- Draft Card -------------------------------------- */
const DraftCard = ({ draft, onClick, onDelete, dark, isActive }) => {
  const wc = draft.textContent ? draft.textContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length : 0;
  const updated = new Date(draft.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`group rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${isActive
        ? dark ? "bg-[#1e3a5f]/20 border-[#1e3a5f]/60 ring-1 ring-[#1e3a5f]/30" : "bg-[#1e3a5f]/[0.06] border-[#1e3a5f]/30 ring-1 ring-[#1e3a5f]/10"
        : dark ? "bg-[#0d1520] border-[#182840] hover:border-[#1d3350]" : "bg-white border-gray-100 hover:border-gray-200"
        }`} onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className={`font-semibold text-sm truncate ${dark ? "text-gray-100" : "text-gray-900"}`}>{draft.title || "Untitled"}</h4>
          <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{wc} words -+ {updated}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(draft._id); }}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition ${dark ? "hover:bg-red-500/10 text-gray-600 hover:text-red-400" : "hover:bg-red-50 text-gray-300 hover:text-red-500"}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------
   CREATE PROJECT - 4-Step Wizard
   ------------------------------------------------------- */
const CreateProject = () => {
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext);
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
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarNotes, setGrammarNotes] = useState([]);
  const lastDraftSignatureRef = useRef("");
  const autoSaveInFlightRef = useRef(false);
  // Once the server rejects a NEW draft with a hard, non-transient error (e.g. 402 plan limit,
  // 403), stop the autosave loop from hammering the endpoint. Reset when the user edits again so a
  // later manual save can retry.
  const saveBlockedRef = useRef(false);
  const localDraftHydratedRef = useRef(false);
  const previewPageTextsSignatureRef = useRef("");

  // Grammar credit confirmation + undo/keep
  const [preGrammarContent, setPreGrammarContent] = useState(null); // for undo
  const [showUndoBar, setShowUndoBar] = useState(false);
  const [previewPageTexts, setPreviewPageTexts] = useState([]);

  // AI Prose Sample Generation
  const [proseLoading, setProseLoading] = useState(false);

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
  const [trailerFile, setTrailerFile] = useState(null);
  const [trailerPreviewUrl, setTrailerPreviewUrl] = useState("");
  const [trailerMeta, setTrailerMeta] = useState(null);
  const [trailerMetaLoading, setTrailerMetaLoading] = useState(false);
  const [pitchVideoFile, setPitchVideoFile] = useState(null);
  const [pitchVideoPreviewUrl, setPitchVideoPreviewUrl] = useState("");
  const [pitchVideoMeta, setPitchVideoMeta] = useState(null);
  const [pitchVideoMetaLoading, setPitchVideoMetaLoading] = useState(false);
  const thumbnailInputRef = useRef(null);
  const trailerInputRef = useRef(null);
  const pitchVideoInputRef = useRef(null);
  const stepContentRef = useRef(null);

  const [isThumbnailEditorOpen, setIsThumbnailEditorOpen] = useState(false);
  const [thumbnailSourceUrl, setThumbnailSourceUrl] = useState("");
  const [thumbnailCrop, setThumbnailCrop] = useState({ x: 0, y: 0 });
  const [thumbnailZoom, setThumbnailZoom] = useState(1);
  const [thumbnailRotation, setThumbnailRotation] = useState(0);
  const [thumbnailCropPixels, setThumbnailCropPixels] = useState(null);
  const [thumbnailApplying, setThumbnailApplying] = useState(false);
  const [thumbnailSourceName, setThumbnailSourceName] = useState("thumbnail");
  const [thumbnailSourceType, setThumbnailSourceType] = useState("image/jpeg");

  const resetThumbnailEditor = useCallback(() => {
    setIsThumbnailEditorOpen(false);
    setThumbnailCrop({ x: 0, y: 0 });
    setThumbnailZoom(1);
    setThumbnailRotation(0);
    setThumbnailCropPixels(null);
    setThumbnailSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, []);

  const openThumbnailEditor = useCallback((file) => {
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      setError("Please select an image file for thumbnail.");
      return;
    }
    if (file.size > MAX_THUMBNAIL_SOURCE_SIZE) {
      setError("Thumbnail source image is too large. Please choose an image under 25MB.");
      return;
    }

    setError("");
    setThumbnailSourceName(file.name || "thumbnail");
    setThumbnailSourceType(file.type || "image/jpeg");
    const sourceUrl = URL.createObjectURL(file);
    setThumbnailSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return sourceUrl;
    });
    setThumbnailCrop({ x: 0, y: 0 });
    setThumbnailZoom(1);
    setThumbnailRotation(0);
    setThumbnailCropPixels(null);
    setIsThumbnailEditorOpen(true);
  }, []);

  const handleThumbnailSelect = (file) => {
    if (!file) return;
    openThumbnailEditor(file);
  };

  const handleApplyThumbnail = async () => {
    if (!thumbnailSourceUrl || !thumbnailCropPixels) {
      setError("Adjust thumbnail and try again.");
      return;
    }

    setThumbnailApplying(true);
    try {
      const preferredType = ["image/png", "image/webp", "image/gif", "image/jpeg", "image/jpg"].includes(thumbnailSourceType)
        ? thumbnailSourceType.replace("image/jpg", "image/jpeg")
        : "image/jpeg";

      let outputType = preferredType;
      let croppedBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, outputType);

      if (!croppedBlob && outputType !== "image/jpeg") {
        outputType = "image/jpeg";
        croppedBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, outputType);
      }

      if (!croppedBlob) throw new Error("thumbnail-processing-failed");

      if (croppedBlob.size > MAX_THUMBNAIL_SIZE && outputType !== "image/jpeg") {
        outputType = "image/jpeg";
        croppedBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, outputType, 0.9);
      }

      if (croppedBlob?.size > MAX_THUMBNAIL_SIZE && outputType === "image/jpeg") {
        for (let quality = 0.82; quality >= 0.6; quality -= 0.08) {
          const retryBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, "image/jpeg", quality);
          if (retryBlob) croppedBlob = retryBlob;
          if (croppedBlob?.size <= MAX_THUMBNAIL_SIZE) break;
        }
      }

      if (croppedBlob.size > MAX_THUMBNAIL_SIZE) {
        setError("Processed thumbnail is still above 5MB. Crop a smaller area and retry.");
        return;
      }

      const baseName = (thumbnailSourceName || "thumbnail").replace(/\.[^/.]+$/, "");
      const ext = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : outputType === "image/gif" ? "gif" : "jpg";
      const processedFile = new File([croppedBlob], `${baseName}-cover.${ext}`, { type: outputType });
      setThumbnailFile(processedFile);
      setError("");
      resetThumbnailEditor();
    } catch (err) {
      setError(err?.message || "Could not process thumbnail. Please try another image.");
    } finally {
      setThumbnailApplying(false);
    }
  };

  const handleTrailerSelect = (file) => {
    if (!file) return;

    if (!file.type?.startsWith("video/")) {
      setError("Please select a valid video file for trailer.");
      return;
    }

    if (file.size > MAX_TRAILER_SIZE) {
      setError("Trailer must be under 250MB for high-quality upload.");
      return;
    }

    setTrailerFile(file);
    setError("");
  };

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [thumbnailFile]);

  useEffect(() => {
    if (!trailerFile) {
      setTrailerPreviewUrl("");
      setTrailerMeta(null);
      setTrailerMetaLoading(false);
      return;
    }

    const previewUrl = URL.createObjectURL(trailerFile);
    setTrailerPreviewUrl(previewUrl);
    setTrailerMeta(null);
    setTrailerMetaLoading(true);

    let active = true;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = previewUrl;

    video.onloadedmetadata = () => {
      if (!active) return;
      setTrailerMeta({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      });
      setTrailerMetaLoading(false);
    };

    video.onerror = () => {
      if (!active) return;
      setTrailerMetaLoading(false);
      setTrailerMeta(null);
    };

    return () => {
      active = false;
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(previewUrl);
    };
  }, [trailerFile]);

  const handlePitchVideoSelect = (file) => {
    if (!file) return;
    const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm", "video/x-m4v"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid video file (MP4, MPEG, MOV, or WebM) for the pitch video.");
      return;
    }
    if (file.size > 90 * 1024 * 1024) {
      setError("Pitch video must be under 90MB.");
      return;
    }
    setPitchVideoFile(file);
    setError("");
  };

  useEffect(() => {
    if (!pitchVideoFile) {
      setPitchVideoPreviewUrl("");
      setPitchVideoMeta(null);
      setPitchVideoMetaLoading(false);
      return;
    }
    const previewUrl = URL.createObjectURL(pitchVideoFile);
    setPitchVideoPreviewUrl(previewUrl);
    setPitchVideoMeta(null);
    setPitchVideoMetaLoading(true);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = previewUrl;
    video.onloadedmetadata = () => {
      if (video.duration > 90) {
        setError("Pitch video must be 1 minute 30 seconds (90 seconds) or less.");
        setPitchVideoFile(null);
        setPitchVideoPreviewUrl("");
        setPitchVideoMeta(null);
        setPitchVideoMetaLoading(false);
        URL.revokeObjectURL(previewUrl);
        return;
      }
      setPitchVideoMeta({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      });
      setPitchVideoMetaLoading(false);
    };
    video.onerror = () => {
      setPitchVideoMetaLoading(false);
      setPitchVideoMeta(null);
    };
    return () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(previewUrl);
    };
  }, [pitchVideoFile]);

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

  // Auto-calculated page count from word count + format
  const formatInfo = FORMAT_PAGE_RANGES[formData.format] || FORMAT_PAGE_RANGES.feature;
  const estimatedPages = Math.max(1, Math.round(wordCount / formatInfo.wordsPerPage));
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

  // AI metadata generation (per-section: "logline" | "synopsis" | "roles")
  const [metaLoadingField, setMetaLoadingField] = useState("");
  const [metaNotice, setMetaNotice] = useState({ field: "", text: "" });

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
  const [exportingScreenplay, setExportingScreenplay] = useState("");
  const [currentElement, setCurrentElement] = useState("action");
  // Lower toolbar mode — "elements" (Scene/Action/Character…) or "format" (Word-style B/I/U etc.).
  // The "Text Format" button in the top bar toggles between them, ribbon-tab style.
  const [lowerBarMode, setLowerBarMode] = useState("elements");
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [canEditContent, setCanEditContent] = useState(true); // false for commenter/viewer collaborators
  const [canComment, setCanComment] = useState(true);          // false for viewers
  const [focusedCommentId, setFocusedCommentId] = useState(null);
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

  const buildRightsPayload = useCallback(() => {
    const normalized = normalizeRightsLicensingState(rightsLicensing || {});
    const royaltyBased = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(normalized.paymentStructure);

    return {
      ...normalized,
      legalAcknowledgement: {
        ...normalized.legalAcknowledgement,
        platformTermsAccepted: Boolean(legal.agreedToTerms) && Boolean(normalized.legalAcknowledgement.platformTermsAccepted),
      },
      royaltySettings: royaltyBased
        ? normalized.royaltySettings
        : { percentage: 0, durationType: "none", durationYears: 0 },
      timeBound: {
        ...normalized.timeBound,
        licenseDurationMonths: normalized.rightsType === "exclusive_license"
          ? normalized.timeBound.licenseDurationMonths
          : 0,
      },
      termsVersion: SCRIPT_UPLOAD_TERMS_VERSION,
      lastUpdatedAt: new Date().toISOString(),
    };
  }, [legal.agreedToTerms, rightsLicensing]);

  const buildScriptPreviewPayload = useCallback((source = formData) => {
    if (!source.viewableScript) {
      return null;
    }

    const mode = "pages";
    const start = Math.max(1, Number(source.previewWindowStart || 1) || 1);
    const end = Math.max(start, Number(source.previewWindowEnd || 8) || 8);
    return { mode, start, end };
  }, [formData]);

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

  useEffect(() => {
    if (!editor) return;
    const editorHtmlForPreview = editor.getHTML?.() || "";
    const nextPreviewTexts = buildPagePreviewTexts(editorHtmlForPreview, estimatedPages);
    const nextSignature = JSON.stringify(nextPreviewTexts);
    if (nextSignature === previewPageTextsSignatureRef.current) return;
    previewPageTextsSignatureRef.current = nextSignature;
    setPreviewPageTexts(nextPreviewTexts);
  }, [editor, estimatedPages, formatInfo.wordsPerPage]);

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

  const buildDraftPayload = useCallback(() => {
    if (!editor) return null;
    const screenplayMode = getContentTypeFromFormat(formData.format) !== "book" && screenplayEnabled;
    return {
      title: title?.trim() ? title.trim() : "Untitled Draft",
      textContent: screenplayMode ? screenplayValue : editor.getHTML(),
      fountainContent: screenplayMode ? screenplayValue : undefined,
      sceneSynopses: screenplayMode ? sceneSynopses : undefined,
      outlineNotes: screenplayMode ? outlineNotes : undefined,
      titlePage: screenplayMode ? (titlePageActive ? titlePage : null) : undefined,
      companyName: String(formData.companyName || "").trim(),
      format: formData.format,
      styleMedium: targetFilm ? formData.styleMedium : undefined,
      contentType: getContentTypeFromFormat(formData.format),
      formatOther: formData.format === "other" ? String(formData.formatOther || "").trim() : "",
      logline: formData.logline,
      synopsis: formData.synopsis,
      pageCount: estimatedPages,
      primaryGenre: formData.primaryGenre,
      classification: {
        primaryGenre: formData.primaryGenre || "",
        secondaryGenre: "",
        tones: classification.tones,
        themes: classification.themes,
        settings: classification.settings,
      },
      viewableScript: Boolean(formData.viewableScript),
      scriptPreviewAccess: buildScriptPreviewPayload(formData),
      scriptPreviewPageTexts: previewPageTexts,
      scriptCompletion: buildScriptCompletionPayload(formData),
      legal: {
        agreedToTerms: Boolean(legal.agreedToTerms),
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
      ...(scriptId ? { scriptId } : {}),
    };
  }, [buildRightsPayload, classification.settings, classification.themes, classification.tones, collabVisibility, editor, estimatedPages, filmDetails, formData, legal.agreedToTerms, legal.customInvestorTerms, scriptId, title, targetFilm, targetPublishing, publishingDetails, screenplayValue, screenplayEnabled, sceneSynopses, outlineNotes, titlePage, titlePageActive]);

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

  const sanitizePdfFileName = (value = "") => {
    const safe = String(value)
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ");
    return safe || "script";
  };

  const downloadSubmissionSummaryPdf = async (targetScriptId, currentTitle) => {
    if (!targetScriptId) return;

    const confirmed = window.confirm("Your project was submitted successfully! Would you like to download your submission summary PDF?");
    if (!confirmed) return;

    try {
      const response = await api.get(`/scripts/${targetScriptId}/submission-summary-pdf?download=1`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const fileBase = sanitizePdfFileName(currentTitle || "script").replace(/\s+/g, "_");

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${fileBase}_submission_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    } catch {
      // Non-blocking: publishing should still succeed if the browser download fails.
    }
  };

  const handleDownloadMainContentPdf = () => {
    if (!editor) return;

    const plainText = editor.getText({ blockSeparator: "\n\n" }).trim();
    if (!plainText) {
      setError("Write some main content before downloading PDF.");
      return;
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 48;
      const marginTop = 56;
      const lineHeight = 16;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginTop * 2;

      const scriptTitle = title?.trim() || "Untitled Draft";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(scriptTitle, usableWidth);
      let y = marginTop;
      doc.text(titleLines, marginX, y);
      y += titleLines.length * 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const contentLines = doc.splitTextToSize(plainText, usableWidth);

      for (const line of contentLines) {
        if (y + lineHeight > marginTop + usableHeight) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(line, marginX, y);
        y += lineHeight;
      }

      const fileBase = sanitizePdfFileName(scriptTitle);
      doc.save(`${fileBase}.pdf`);
    } catch {
      setError("Failed to generate PDF. Please try again.");
    }
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
      if (!formData.format) { setError("Format is required."); return false; }
      if (formData.format === "other" && !String(formData.formatOther || "").trim()) {
        setError("Please specify the format when selecting Other.");
        return false;
      }

      if (!formData.logline.trim()) { setError("Logline is required."); return false; }
      if (formData.logline.length > 500) { setError("Logline must be 500 characters or less."); return false; }
      {
        const completionError = getScriptCompletionValidationMessage(formData);
        if (completionError) {
          setError(completionError);
          return false;
        }
      }
      {
        const previewPayload = buildScriptPreviewPayload(formData);
        if (previewPayload) {
          if (previewPayload.end < previewPayload.start) {
            setError("The ending page must be greater than or equal to the starting page.");
            return false;
          }
          if (Number(estimatedPages || 0) > 0 && (previewPayload.start > Number(estimatedPages || 0) || previewPayload.end > Number(estimatedPages || 0))) {
            setError("The viewable script range cannot exceed the estimated page count.");
            return false;
          }
        }
      }
      if (!formData.synopsis || !formData.synopsis.trim()) { setError("Synopsis is required."); return false; }
      const ageRangeError = getInvalidRoleAgeRangeMessage();
      if (ageRangeError) { setError(ageRangeError); return false; }
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
    // The persistent amber gate already explains why; don't also set a generic error (avoids a
    // duplicate banner).
    if (creationBlocked) return;
    if (validateStep(step) && step < 5) { setStep(step + 1); setError(""); }
  };
  const handleBack = () => { if (step > 1) { setStep(step - 1); setError(""); } };

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

  // ── Phase 3 presence (live "who's here + which scene") ──────────────────────
  const screenplayValueRef = useRef(screenplayValue);
  screenplayValueRef.current = screenplayValue;
  const presenceEnabled = useScreenplayEditor && Boolean(scriptId);
  const {
    people: collabPeople,
    setActiveScene: collabSetActiveScene,
    locks: collabLocks,
    myUserId: collabMyUserId,
    requestEdit: collabRequestEdit,
    releaseHeld: collabReleaseHeld,
    editRequest: collabEditRequest,
    clearEditRequest: collabClearEditRequest,
    commentsVersion: collabCommentsVersion,
  } = useScenePresence({ scriptId, enabled: presenceEnabled, user, canEdit: canEditContent });

  // Comments (Phase 3 — Slice 2); live-refreshes on the socket comment-change signal.
  const { comments: sceneComments, addComment: addSceneComment, setResolved: setCommentResolved, deleteComment: deleteSceneComment } =
    useSceneComments({ scriptId, enabled: presenceEnabled, refreshKey: collabCommentsVersion });

  // "Add comment" — anchor to either an explicit range (the inline line-comment composer passes the
  // clicked line's {from,to}) or, when none is given, the current editor selection (the rail flow).
  const handleAddComment = useCallback(async (body, range) => {
    const target = (range && Number.isFinite(range.from) && range.to > range.from)
      ? range
      : screenplayApiRef.current?.getSelection?.();
    if (!target || !(target.to > target.from)) { setError("Select some script text — or use the line comment icon — to comment on first."); return false; }
    const anchor = buildAnchor(screenplayValueRef.current, target.from, target.to);
    return addSceneComment({ anchor, body });
  }, [addSceneComment]);

  // Reply to a thread.
  const handleReplyComment = useCallback((parentId, body) => addSceneComment({ anchor: {}, body, parentId }), [addSceneComment]);

  // Click a comment in the rail → scroll to + flash its anchored text.
  const handleFocusComment = useCallback((comment) => {
    const r = comment?.anchor ? resolveAnchor(screenplayValueRef.current, comment.anchor) : null;
    if (r) screenplayApiRef.current?.scrollToRange?.(r.from, r.to);
    setFocusedCommentId(comment?._id || null);
  }, []);

  // Is a comment's anchored text still present? (false → orphaned)
  const isCommentOrphaned = useCallback((comment) => {
    if (!comment?.anchor?.quote) return false;
    return resolveAnchor(screenplayValueRef.current, comment.anchor) == null;
  }, []);
  // As the caret moves, tell the sync layer which scene we're in (it debounces).
  const handleCaretLine = useCallback((line) => {
    collabSetActiveScene(sceneIdAtLine(screenplayValueRef.current, line));
  }, [collabSetActiveScene]);

  // Enrich presence for the UI: scene heading per person + people-by-scene for navigator dots.
  const presenceScenes = useMemo(() => getScenes(screenplayValue), [screenplayValue]);
  const peopleEnriched = useMemo(() => collabPeople.map((p) => {
    const scene = presenceScenes.find((s) => s.sceneId === p.activeSceneId);
    return { ...p, sceneHeading: scene ? scene.heading : "" };
  }), [collabPeople, presenceScenes]);
  const presenceBySceneId = useMemo(() => {
    const map = {};
    for (const p of collabPeople) {
      if (!p.activeSceneId) continue;
      (map[p.activeSceneId] = map[p.activeSceneId] || []).push(p);
    }
    return map;
  }, [collabPeople]);
  // Navigator outline with each scene's sceneId attached (for presence/lock dots).
  const outlineWithSceneIds = useMemo(() => {
    const resolve = (line) => {
      for (const s of presenceScenes) if (line >= s.startLine && line <= s.endLine) return s.sceneId;
      return presenceScenes[presenceScenes.length - 1]?.sceneId;
    };
    return screenplayOutline.map((item) => item.type === "scene" ? { ...item, sceneId: resolve(item.line) } : item);
  }, [screenplayOutline, presenceScenes]);

  // Plain text the AI tools read — Fountain text in screenplay mode, else TipTap text.
  const getEditorPlainText = () => (useScreenplayEditor ? screenplayValue : (editor ? editor.getText() : "")).trim();

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
  }, [collabLocks, collabMyUserId, handleScreenplayChange]);

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
  const handleExportScreenplay = async (kind) => {
    setExportMenuOpen(false);

    // .fdx is generated CLIENT-SIDE so its element types come from the editor's one classifier
    // (classifyText), never the server's separate parser (§0). No save/scriptId needed.
    if (kind === "fdx") {
      setExportingScreenplay(kind);
      setError("");
      try {
        const xml = fountainToFdx(screenplayValue);
        const url = window.URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "script").replace(/[^\w.-]+/g, "_")}.fdx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch {
        setError("Could not generate the Final Draft file.");
      } finally {
        setExportingScreenplay("");
      }
      return;
    }

    if (!scriptId) {
      setError("Save your project once before exporting.");
      return;
    }
    setExportingScreenplay(kind);
    setError("");
    try {
      let path;
      if (kind === "fountain") {
        path = `/scripts/${scriptId}/export/fountain`;
      } else if (kind === "pdf-wm") {
        const stamp = encodeURIComponent(user?.email || user?.name || "Shared copy");
        path = `/scripts/${scriptId}/export/pdf?download=1&titlePage=1&watermark=${stamp}`;
      } else {
        path = `/scripts/${scriptId}/export/pdf?download=1&titlePage=1`;
      }
      const { data } = await api.get(path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const ext = kind === "fountain" ? "fountain" : "pdf";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "script").replace(/[^\w.-]+/g, "_")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Export failed. Try again after saving.");
    } finally {
      setExportingScreenplay("");
    }
  };

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
        const formatted = formatScreenplayLikeText(extracted);
        handleScreenplayChange(formatted);
        setScreenplayValue(formatted);
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
  const handleGrammarClick = () => {
    if (!editor) return;
    const plainText = getEditorPlainText();
    if (!plainText || plainText.length < 10) {
      setError("Write some script text before running grammar correction.");
      return;
    }
    handleFixGrammar();
  };

  // Confirmed - actually run grammar fix
  const handleFixGrammar = async () => {
    if (!editor) return;
    const plainText = getEditorPlainText();
    if (!plainText) return;

    // Save current content for undo
    setPreGrammarContent(editor.getHTML());
    setGrammarLoading(true);
    setError("");
    setGrammarNotes([]);
    setShowUndoBar(false);

    try {
      const { data } = await api.post("/ai/correct-script-text", { text: plainText });
      const correctedText = data?.correctedText?.trim();

      if (correctedText) {
        editor.commands.setContent(textToParagraphHtml(correctedText));
        setSaved(false);
        // Show undo/keep bar after a small delay
        setTimeout(() => setShowUndoBar(true), 150);
      }

      setGrammarNotes(Array.isArray(data?.notes) ? data.notes : []);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to correct script text.";
      setError(msg);
    } finally {
      setGrammarLoading(false);
    }
  };

  // Undo grammar changes
  const handleGrammarUndo = () => {
    if (preGrammarContent && editor) {
      editor.commands.setContent(preGrammarContent);
      setSaved(false);
    }
    setShowUndoBar(false);
    setPreGrammarContent(null);
    setGrammarNotes([]);
  };

  // Keep grammar changes
  const handleGrammarKeep = () => {
    setShowUndoBar(false);
    setPreGrammarContent(null);
  };



  const handleProseClick = () => {
    if (!editor) return;
    const plainText = getEditorPlainText();
    if (!plainText || plainText.length < 50) {
      setError("Write at least 50 characters of script text before generating a prose sample.");
      return;
    }
    handleGenerateProse();
  };

  const handleGenerateProse = async () => {
    if (!editor) return;
    const plainText = getEditorPlainText();
    if (!plainText) return;

    setProseLoading(true);
    setError("");

    try {
      const { data } = await api.post("/ai/prose-sample", { text: plainText });
      const generatedProse = data?.proseSample?.trim();

      if (generatedProse) {
        setPublishingDetails(prev => ({ ...prev, proseSample: generatedProse }));
        setSaved(false);
      }

    } catch (err) {
      const msg = err.response?.data?.message || "Failed to generate prose sample.";
      setError(msg);
    } finally {
      setProseLoading(false);
    }
  };

  // Generate a single section (logline / synopsis / roles) by parsing the project content with AI
  const handleGenerateMetadata = async (field) => {
    if (!editor || metaLoadingField) return;
    const plainText = getEditorPlainText();
    if (!plainText || plainText.length < 50) {
      setError("Write at least 50 characters of script content before generating with AI.");
      return;
    }

    setMetaLoadingField(field);
    setMetaNotice({ field: "", text: "" });
    setError("");

    try {
      const { data } = await api.post("/ai/generate-metadata", {
        text: plainText,
        fields: [field],
        title,
        primaryGenre: formData.primaryGenre,
        contentType: getContentTypeFromFormat(formData.format),
      });

      let filled = false;
      if (field === "logline" && typeof data.logline === "string" && data.logline.trim()) {
        setFormData((f) => ({ ...f, logline: data.logline.trim().slice(0, 500) }));
        filled = true;
      }
      if (field === "synopsis" && typeof data.synopsis === "string" && data.synopsis.trim()) {
        setFormData((f) => ({ ...f, synopsis: data.synopsis.trim() }));
        filled = true;
      }
      if (field === "roles" && Array.isArray(data.roles) && data.roles.length) {
        setRoles(data.roles.map((role) => ({
          characterName: role.characterName || "",
          type: role.type || "",
          description: role.description || "",
          gender: role.gender || "Any",
          ageRange: {
            min: role.ageRange?.min ?? "",
            max: role.ageRange?.max ?? "",
          },
        })));
        filled = true;
      }

      setSaved(false);
      if (data.usedFallback) {
        setMetaNotice({ field, text: "AI is busy right now — please try again in a moment." });
      } else if (filled) {
        setMetaNotice({ field, text: "Generated by AI — review and edit before submitting." });
      } else {
        setMetaNotice({ field, text: "Not enough story detail — add more script content and try again." });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate. Please try again.");
    } finally {
      setMetaLoadingField("");
    }
  };

  // Styling helpers
  const cardCls = `rounded-2xl border backdrop-blur-sm ${dark ? "bg-[#0d1520]/80 border-[#182840]" : "bg-white/90 border-gray-200 shadow-sm"}`;
  const aiBtnCls = `shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition disabled:opacity-50 disabled:cursor-not-allowed ${dark ? "bg-white/[0.06] border-[#2a4a6a] text-blue-300 hover:bg-white/[0.1]" : "bg-white border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`;
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none ${dark
    ? "bg-white/[0.04] border border-[#1d3350] text-gray-100 placeholder:text-gray-600 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/30"
    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#1e3a5f]/50 focus:ring-1 focus:ring-[#1e3a5f]/10"}`;
  const chipCls = (sel) => `px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${sel
    ? dark ? "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20" : "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20"
    : dark ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] border border-[#1d3350]" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`;
  return (
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

      {/* -- Header -------------------------------- */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
          <div className="flex items-center gap-3">
            <button onClick={handleExitEditor} className={`p-2 rounded-xl transition ${dark ? "hover:bg-white/[0.06] text-gray-400" : "hover:bg-gray-100 text-gray-400"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>Create Project</h1>
              <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Write, classify, and publish your script - all in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-2 max-[640px]:w-full max-[640px]:flex-wrap max-[640px]:justify-between max-[380px]:gap-1.5">
            <button onClick={() => setShowDrafts(!showDrafts)}
              title="Switch between your projects"
              className={`flex items-center gap-2 px-3.5 max-[380px]:px-3 py-2 max-[380px]:py-1.5 rounded-xl text-xs font-semibold border transition-all ${dark
                ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>
              My projects {drafts.length > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${dark ? "bg-white/[0.08]" : "bg-gray-100"}`}>{drafts.length}</span>}
            </button>
            <button onClick={() => setShowVersionHistory(true)}
              title="View and restore earlier versions of this project"
              className={`flex items-center gap-2 px-3.5 max-[380px]:px-3 py-2 max-[380px]:py-1.5 rounded-xl text-xs font-semibold border transition-all ${dark
                ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              History
            </button>
            {/* Save indicator */}
            {saving && <span className={`flex items-center gap-1.5 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}><div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />Saving...</span>}
            {saved && !saving && <span className={`flex items-center gap-1 text-xs ${dark ? "text-green-400" : "text-green-700"}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Saved{lastSaved && ` ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>}
          </div>
        </div>

        {/* -- Step Indicator -- */}
        <div className={`mt-5 rounded-2xl border p-4 max-[415px]:p-2.5 max-[340px]:p-2 ${dark ? "bg-[#0d1520] border-[#182840]" : "bg-gray-50 border-gray-100"}`}>
          {/* Desktop and tablet stepper */}
          <div className="max-[415px]:hidden flex items-center max-[640px]:grid max-[640px]:grid-cols-5 max-[640px]:gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1 min-w-0 max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:gap-1">
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-2.5 transition-all max-[640px]:flex-col max-[640px]:gap-1 max-[640px]:justify-center ${s.num < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className={`w-8 h-8 max-[640px]:w-7 max-[640px]:h-7 rounded-xl flex items-center justify-center text-xs max-[640px]:text-[11px] font-black shrink-0 ${step === s.num ? "bg-[#1e3a5f] text-white shadow-md"
                    : step > s.num ? dark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                      : dark ? "bg-white/[0.06] text-gray-600" : "bg-gray-200 text-gray-400"
                    }`}>
                    {step > s.num ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : s.num}
                  </span>
                  <div className="text-left max-[640px]:text-center">
                    <p className={`text-xs max-[640px]:text-[10px] font-bold max-[640px]:font-semibold leading-none truncate ${step === s.num ? dark ? "text-white" : "text-gray-900"
                      : step > s.num ? dark ? "text-emerald-400" : "text-emerald-700"
                        : dark ? "text-gray-600" : "text-gray-400"
                      }`}>{s.label}</p>
                    <p className={`text-[10px] mt-0.5 max-[640px]:hidden ${dark ? "text-gray-700" : "text-gray-400"}`}>{s.desc}</p>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-3 max-[640px]:hidden rounded-full ${step > s.num ? dark ? "bg-emerald-500/40" : "bg-emerald-300" : dark ? "bg-white/[0.06]" : "bg-gray-200"
                    }`} />
                )}
              </div>
            ))}
          </div>

          {/* Small-phone stepper (415px to 300px) */}
          <div className="hidden max-[415px]:block">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className={`text-[10px] max-[340px]:text-[9px] font-semibold ${dark ? "text-gray-400" : "text-gray-600"}`}>
                Step {step} of {STEPS.length}
              </p>
              <p className={`text-[10px] max-[340px]:text-[9px] font-bold px-2 py-0.5 rounded-full ${dark ? "bg-white/[0.06] text-gray-300" : "bg-white text-gray-700 border border-gray-200"}`}>
                {STEPS[step - 1]?.label}
              </p>
            </div>

            <div className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/[0.08]" : "bg-gray-200"}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${dark ? "bg-emerald-500/45" : "bg-emerald-400"}`}
                style={{ width: `${(Math.max(step, 1) / Math.max(STEPS.length, 1)) * 100}%` }}
              />
            </div>

            <div className="mt-2.5 flex items-start justify-between gap-1">
              {STEPS.map((s) => (
                <button
                  key={`mobile-step-${s.num}`}
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`min-w-0 flex-1 flex flex-col items-center gap-1 ${s.num < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className={`w-6 h-6 max-[340px]:w-[22px] max-[340px]:h-[22px] rounded-lg flex items-center justify-center text-[10px] max-[340px]:text-[9px] font-black shrink-0 ${step === s.num ? "bg-[#1e3a5f] text-white shadow-md"
                    : step > s.num ? dark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                      : dark ? "bg-white/[0.06] text-gray-600" : "bg-gray-200 text-gray-400"
                    }`}>
                    {step > s.num ? <svg className="w-3 h-3 max-[340px]:w-2.5 max-[340px]:h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : s.num}
                  </span>
                  <span className={`text-[8px] max-[340px]:text-[7px] font-semibold leading-none truncate w-full text-center ${step === s.num ? dark ? "text-white" : "text-gray-900"
                    : step > s.num ? dark ? "text-emerald-400" : "text-emerald-700"
                      : dark ? "text-gray-600" : "text-gray-400"
                    }`}>
                    {s.shortLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

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
          onInsertPageBreak={() => screenplayApiRef.current?.insertPageBreak()}
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
          wordsPerPage={formatInfo.wordsPerPage}
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
                      min={1}
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

      {/* -- Error -- */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes("limit") && (
              <button 
                type="button"
                onClick={() => window.open('/pricing', '_blank')} 
                className="shrink-0 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm">
                Get Plan
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Plan script-limit gate: shown UPFRONT, blocks progression on a new script -- */}
      {creationBlocked && (
        <div className={`mb-5 rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5 ${dark ? "border-amber-500/25 bg-amber-500/[0.08]" : "border-amber-200 bg-amber-50"}`}>
          <svg className={`w-6 h-6 shrink-0 mt-0.5 ${dark ? "text-amber-400" : "text-amber-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${dark ? "text-amber-300" : "text-amber-800"}`}>
              You've reached your {scriptLimit?.plan === "free" ? "Free plan" : "plan"} limit of {scriptLimit?.limit} script{scriptLimit?.limit > 1 ? "s" : ""}.
            </p>
            <p className={`text-[13px] mt-0.5 ${dark ? "text-amber-200/80" : "text-amber-700"}`}>
              You already have {scriptLimit?.used} published {scriptLimit?.used === 1 ? "script" : "scripts"}. Upgrade your plan to create another — you can't proceed until then.
            </p>
            <Link to="/pricing" className={`inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 rounded-lg text-[13px] font-bold transition ${dark ? "bg-amber-400 text-[#1a1206] hover:bg-amber-300" : "bg-amber-500 text-white hover:bg-amber-600"}`}>
              View plans &amp; upgrade
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
        </div>
      )}

      {/* -- Step Content --------------------------- */}
      <AnimatePresence mode="wait">
        {/* -- STEP 1: Write -- */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            {/* -- Editor Shell -- */}
            <div className={`rounded-2xl max-[768px]:rounded-xl max-[640px]:rounded-none border overflow-hidden max-[768px]:-mx-2.5 max-[420px]:-mx-1.5 ${dark ? "bg-[#0d1520] border-[#182840]" : "bg-white border-gray-200 shadow-sm"}`}>

              {/* -- Top Bar: title + save -- */}
              <div className={`flex items-center gap-3 px-5 max-[640px]:px-3 max-[380px]:px-2.5 py-3 border-b max-[860px]:flex-col max-[860px]:items-stretch ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-100 bg-gray-50"}`}>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={title}
                    onChange={e => { setTitle(e.target.value); setSaved(false); }}
                    placeholder="Untitled Script"
                    className={`w-full text-base max-[520px]:text-[15px] font-bold bg-transparent outline-none truncate ${dark ? "text-gray-100 placeholder:text-gray-700" : "text-gray-900 placeholder:text-gray-300"}`}
                  />
                </div>
                <div className="flex items-center justify-end flex-wrap gap-2 shrink-0 max-[860px]:w-full">
                  {/* Autosave handles saving; status lives in the page header. No manual Save Draft button. */}
                  {!useScreenplayEditor && (
                    <button
                      onClick={handleDownloadMainContentPdf}
                      disabled={saving}
                      className={`px-3 py-1.5 max-[520px]:py-2 rounded-lg text-xs font-semibold border transition ${dark ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06] hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                    >
                      Download PDF
                    </button>
                  )}
                  <button onClick={handleGrammarClick} disabled={grammarLoading || saving}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 max-[520px]:py-2 rounded-lg text-xs font-bold border transition disabled:opacity-40 max-[860px]:w-full ${dark ? "border-emerald-500/25 text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}>
                    {grammarLoading ? <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Fixing...</> : <>AI Fix Grammar</>}
                  </button>
                </div>
              </div>

              {/* -- Toolbar / Screenplay controls -- */}
              {useScreenplayEditor ? (
                <>
                  {/* ── TOP ACTION BAR: file/mode actions + the Text Format ribbon-tab toggle ── */}
                  <div className={`relative z-20 flex flex-wrap items-center gap-1.5 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-200 bg-white"}`}>
                    {/* Ribbon-tab toggle: swaps the lower bar between Elements and Text Format. */}
                    <div className={`flex items-center rounded-lg p-0.5 ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`}>
                      <button type="button" onClick={() => setLowerBarMode("elements")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${lowerBarMode === "elements" ? (dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-white text-gray-900 shadow-sm") : (dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800")}`}>
                        Elements
                      </button>
                      <button type="button" onClick={() => setLowerBarMode("format")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${lowerBarMode === "format" ? (dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-white text-gray-900 shadow-sm") : (dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800")}`}
                        title="Text formatting — bold, italic, underline & element styles">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 4v3h5.5v12h3V7H19V4z" /></svg>
                        Text Format
                      </button>
                    </div>

                    <span className={`text-[10px] ml-1 max-[1100px]:hidden ${dark ? "text-gray-600" : "text-gray-400"}`}>Enter · Tab to cycle</span>

                    {/* ── RIGHT GROUP: file / mode actions ── */}
                    <div className="ml-auto flex items-center gap-1.5">
                      {collabPeople.length > 1 && (
                        <PresenceAvatars people={peopleEnriched} dark={dark} onClick={() => setFocusMode(true)} />
                      )}
                      <button type="button" onClick={() => screenplayFileInputRef.current?.click()}
                        title="Import a script — Fountain, Final Draft (.fdx), PDF, or Word (.docx)"
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${dark ? "border-[#2a4a6a] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>Import</button>

                      {/* Single Export ▾ menu: PDF · Watermarked PDF · Fountain · Final Draft */}
                      <div className="relative">
                        <button type="button" onClick={() => setExportMenuOpen((o) => !o)} disabled={Boolean(exportingScreenplay)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition disabled:opacity-50 ${dark ? "bg-[#1e3a5f] border-[#2a4a6a] text-white hover:bg-[#244873]" : "bg-[#1e3a5f] border-[#1e3a5f] text-white hover:bg-[#244873]"}`}>
                          {exportingScreenplay ? "Exporting…" : "Export"}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {exportMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-[55]" onClick={() => setExportMenuOpen(false)} />
                            <div className={`absolute right-0 mt-1 w-52 rounded-lg border shadow-xl z-[60] py-1 text-[12px] ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
                              <button type="button" onClick={() => handleExportScreenplay("pdf")} className={`w-full text-left px-3 py-2 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>PDF</button>
                              <button type="button" onClick={() => handleExportScreenplay("pdf-wm")} className={`w-full text-left px-3 py-2 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>Watermarked PDF</button>
                              <button type="button" onClick={() => handleExportScreenplay("fountain")} className={`w-full text-left px-3 py-2 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>Fountain</button>
                              <button type="button" onClick={() => handleExportScreenplay("fdx")} className={`w-full text-left px-3 py-2 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>Final Draft (.fdx)</button>
                            </div>
                          </>
                        )}
                      </div>

                      <button type="button" onClick={() => setFocusMode(true)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${dark ? "bg-[#1e3a5f] border-[#2a4a6a] text-white hover:bg-[#244873]" : "bg-[#1e3a5f] border-[#1e3a5f] text-white hover:bg-[#244873]"}`}
                        title="Full-screen distraction-free writing">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                        Focus
                      </button>
                      {/* The screenplay⇄prose mode switch now lives inside the Text Format bar (below),
                          so all formatting choices sit in one place — no stray "Rich text" button here. */}
                    </div>
                    <input ref={screenplayFileInputRef} type="file" accept=".fountain,.txt,.fdx,.pdf,.docx,.doc,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="hidden" onChange={handleImportScreenplayFile} />
                  </div>

                  {/* ── LOWER BAR: Elements (writing) OR Text Format (Word-style) — toggled above ── */}
                  {lowerBarMode === "format" ? (
                    <ScreenplayFormatBar
                      onSetElement={(t) => screenplayApiRef.current?.setElementType(t)}
                      onEmphasis={(kind) => screenplayApiRef.current?.applyEmphasis(kind)}
                      onCase={(kind) => screenplayApiRef.current?.applyCase(kind)}
                      onCentered={() => screenplayApiRef.current?.applyCentered()}
                      onInsertPageBreak={() => screenplayApiRef.current?.insertPageBreak()}
                      onZoom={adjustZoom}
                      zoom={editorZoom}
                      onSwitchToProse={() => setScreenplayEnabled(false)}
                      currentElement={currentElement}
                      emphasisState={emphasisState}
                      dark={dark}
                    />
                  ) : (
                    <div className={`relative z-20 flex flex-wrap items-center gap-2 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-200 bg-white"}`}>
                      {/* core six + More */}
                      <ScreenplayElementBar
                        items={CORE_ELEMENTS}
                        currentElement={currentElement}
                        onSetElement={(t) => screenplayApiRef.current?.setElementType(t)}
                        dark={dark}
                      />
                      <div className="relative">
                        <button type="button" onClick={() => setMoreMenuOpen((o) => !o)}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold border transition ${dark ? "border-[#2a4a6a] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                          More
                          <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {moreMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-[55]" onClick={() => setMoreMenuOpen(false)} />
                            <div className={`absolute left-0 mt-1 w-48 rounded-lg border shadow-xl z-[60] py-1 text-[12px] ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
                              {MORE_ELEMENT_GROUPS.map((group, gi) => (
                                <div key={gi} className={gi > 0 ? `mt-1 pt-1 border-t ${dark ? "border-[#1d3350]" : "border-gray-100"}` : ""}>
                                  {group.map((el) => (
                                    <button key={el.value} type="button"
                                      onClick={() => { setMoreMenuOpen(false); screenplayApiRef.current?.setElementType(el.value); }}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>
                                      <el.Icon className="w-3.5 h-3.5 opacity-70" strokeWidth={1.8} aria-hidden="true" />
                                      {el.label}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Book / prose mode IS a Word-style HTML editor already — keep its full TipTap
                      toolbar (headings, colour, lists, alignment) visible; those formats are valid
                      here because book content is stored as HTML, not Fountain. */}
                  <EditorToolbar editor={editor} dark={dark} />
                  {isScreenplayFormat && (
                    <div className={`px-3 py-1.5 border-b text-[11px] ${dark ? "border-[#182840] bg-[#080f1a] text-gray-500" : "border-gray-200 bg-white text-gray-400"}`}>
                      <button type="button" onClick={() => setScreenplayEnabled(true)}
                        className={`font-bold ${dark ? "text-blue-300" : "text-[#1e3a5f]"}`}>🎬 Switch to Screenplay mode</button>
                      <span> — auto-format sluglines, character cues & dialogue.</span>
                    </div>
                  )}
                </>
              )}

              {/* -- Document Canvas -- */}
              <div className={`relative overflow-y-auto overflow-x-auto max-[1200px]:overflow-x-hidden max-h-[72vh] ${dark ? "bg-[#0a0f17]" : "bg-[#ece9e3]"}`}>

                {/* Title page renders as its own sheet above the script page (click to edit). */}
                {useScreenplayEditor && titlePageActive && (
                  <div className="px-14 max-[1200px]:px-2 max-[380px]:px-1 pt-8 max-[580px]:pt-4 flex justify-center max-[1200px]:justify-start">
                    <div className="w-full max-w-[760px] max-[1200px]:max-w-none">
                      <TitlePageSheet fields={titlePage} hasTitlePage onEdit={() => setShowTitlePageModal(true)} dark={dark} />
                    </div>
                  </div>
                )}

                {/* The actual page(s) — the sheet sizes to its content. Real page breaks come from the
                    editor itself (=== inserts a measured page-fill spacer); we no longer draw fake
                    fixed-interval (word-count-estimated) divider overlays here. */}
                <div className="flex flex-col items-center max-[1200px]:items-start gap-0 py-8 max-[580px]:py-4 px-14 max-[1200px]:px-2 max-[380px]:px-1">
                  <div
                    className={`relative w-full max-w-[760px] max-[1200px]:max-w-none shadow-2xl ${dark ? "bg-[#111827]" : "bg-white"}`}
                    style={{
                      minHeight: useScreenplayEditor ? PAGE_CONTENT_H : undefined,
                      // Top/bottom paper margin so text never touches the sheet edge.
                      paddingTop: useScreenplayEditor ? PAGE_MARGIN_Y : 0,
                      paddingBottom: useScreenplayEditor ? PAGE_MARGIN_Y : 0,
                    }}>

                    {/* Page number on the sheet's top-right corner (per spec) */}
                    {useScreenplayEditor && (
                      <span className={`absolute top-6 right-8 max-[640px]:right-4 z-[6] text-[12px] font-mono select-none ${dark ? "text-gray-500" : "text-gray-400"}`}>1.</span>
                    )}

                    {/* Editor content — Fountain screenplay editor or rich-text */}
                    {useScreenplayEditor && focusMode ? (
                      <div className={`relative z-0 flex items-center justify-center py-24 text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>
                        Editing in focus mode…
                      </div>
                    ) : useScreenplayEditor ? (
                      <div className="relative z-0">
                        <ScreenplayEditor
                          value={screenplayValue}
                          onChange={handleScreenplayChange}
                          onElementChange={setCurrentElement}
                          onEmphasisStateChange={setEmphasisState}
                          onCaretLine={handleCaretLine}
                          locks={collabLocks}
                          myUserId={collabMyUserId}
                          onRequestEdit={collabRequestEdit}
                          comments={sceneComments}
                          focusedCommentId={focusedCommentId}
                          readOnly={!canEditContent}
                          apiRef={screenplayApiRef}
                          zoom={editorZoom}
                          dark={dark}
                        />
                      </div>
                    ) : (
                      <div className={`relative z-0 ${dark
                        ? "[&_.tiptap]:text-gray-200 [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-700 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_h1]:text-white [&_.tiptap_h2]:text-gray-100 [&_.tiptap_blockquote]:border-[#1d3350] [&_.tiptap_blockquote]:text-gray-400 [&_.tiptap_code]:bg-white/[0.06] [&_.tiptap_pre]:bg-[#0a1220] [&_.tiptap_hr]:border-[#1e2a3a]"
                        : "[&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-300 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_code]:bg-gray-100 [&_.tiptap_pre]:bg-gray-50 [&_.tiptap_blockquote]:border-gray-200 [&_.tiptap_hr]:border-gray-200 [&_.tiptap]:text-gray-900"}`}>
                        <EditorContent editor={editor} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* -- Status Bar -- */}
              <div className={`flex items-center justify-between px-4 py-2 border-t text-[11px] ${dark ? "border-[#182840] bg-[#080f1a] text-gray-600" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
                <div className="flex items-center gap-4">
                  {useScreenplayEditor && (
                    <span className={`font-semibold uppercase tracking-wide ${dark ? "text-blue-400" : "text-[#1e3a5f]"}`}>
                      {(currentElement === "blank" || currentElement === "shot" ? "action" : currentElement)}
                    </span>
                  )}
                  <span>{wordCount} <span className={dark ? "text-gray-700" : "text-gray-300"}>words</span></span>
                  <span>{charCount} <span className={dark ? "text-gray-700" : "text-gray-300"}>chars</span></span>
                  <span className={`font-semibold ${pageStatus === "good" ? dark ? "text-emerald-400" : "text-emerald-600" : pageStatus === "short" ? dark ? "text-amber-400" : "text-amber-600" : dark ? "text-blue-400" : "text-blue-600"}`}>
                    ~{estimatedPages} page{estimatedPages !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] ${pageStatus === "good" ? dark ? "text-emerald-500" : "text-emerald-600" : pageStatus === "short" ? dark ? "text-amber-500" : "text-amber-600" : dark ? "text-blue-400" : "text-blue-600"}`}>
                  {pageStatus === "good" ? "- Good length" : pageStatus === "short" ? "- Keep writing" : "- Consider trimming"}
                  <span className={dark ? "text-gray-700" : "text-gray-300"}>-+ {formatInfo.label} typical: {formatInfo.typical} pages</span>
                </div>
              </div>

              {grammarNotes.length > 0 && (
                <div className={`px-4 py-3 text-xs border-t ${dark ? "border-[#182840] text-gray-400" : "border-gray-100 text-gray-600"}`}>
                  <p className={`font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>AI Notes</p>
                  <ul className="space-y-0.5">{grammarNotes.slice(0, 3).map((note, idx) => <li key={`${note}-${idx}`}>- {note}</li>)}</ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* -- STEP 2: Details -- */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={`${cardCls} p-6 sm:p-8 space-y-5`}>
              
              {/* -- Target Industry Toggle -- */}
              <div className={`rounded-xl border p-4 ${dark ? "bg-[#0d1520] border-[#1d3350]" : "bg-gray-50 border-gray-200"}`}>
                <h3 className={`text-sm font-bold mb-3 ${dark ? "text-gray-200" : "text-gray-800"}`}>Make this script available for:</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetIndustry" checked={targetFilm} onChange={() => { setTargetFilm(true); setTargetPublishing(false); setFormData(f => ({ ...f, format: "feature_film" })); }} className="w-4 h-4 text-[#1e3a5f] focus:ring-[#1e3a5f]" />
                    <span className={`text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Film & TV Industry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetIndustry" checked={targetPublishing} onChange={() => { setTargetPublishing(true); setTargetFilm(false); setFormData(f => ({ ...f, format: "fiction_novel" })); }} className="w-4 h-4 text-[#1e3a5f] focus:ring-[#1e3a5f]" />
                    <span className={`text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Publishing Houses (Novel/Adaptation)</span>
                  </label>
                </div>
              </div>

              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Project Details</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Tell us about your script so we can categorize it properly.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Writer *</label>
                  <input type="text" name="writer" value={formData.writer} onChange={handleChange} placeholder="Writer's name" className={inputCls} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Company Name</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company name" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Format *</label>
                  <select name="format" value={formData.format} onChange={handleChange} className={inputCls}>
                    {(targetFilm ? filmFormats : publishingFormats).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                {targetFilm && (
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Style (Medium) <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span></label>
                    <select name="styleMedium" value={formData.styleMedium} onChange={handleChange} className={inputCls}>
                      <option value="">Select style...</option>
                      {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {targetFilm && (
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Estimated Pages</label>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${dark ? "bg-white/[0.04] border border-[#1d3350]" : "bg-gray-50 border border-gray-200"}`}>
                      <span className={`text-2xl font-bold ${pageStatus === "good" ? dark ? "text-green-400" : "text-green-600" : pageStatus === "short" ? dark ? "text-amber-400" : "text-amber-600" : dark ? "text-blue-400" : "text-[#1e3a5f]"}`}>{estimatedPages}</span>
                      <div>
                        <p className={`text-xs font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>pages</p>
                        <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Auto-calculated from {wordCount} words</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Format-aware page hint */}
              {targetFilm && (
                <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs ${pageStatus === "good"
                  ? dark ? "bg-green-500/5 border border-green-500/10 text-green-400" : "bg-green-50 border border-green-100 text-green-700"
                  : pageStatus === "short"
                    ? dark ? "bg-amber-500/5 border border-amber-500/10 text-amber-400" : "bg-amber-50 border border-amber-100 text-amber-700"
                    : dark ? "bg-blue-500/5 border border-blue-500/10 text-blue-400" : "bg-[#1e3a5f]/[0.06] border border-[#1e3a5f]/15 text-[#1e3a5f]"
                  }`}>
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  <div>
                    <p className="font-medium">{formatInfo.label}: typical range is {formatInfo.typical} pages</p>
                    <p className={`mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      {pageStatus === "good" ? "Your script length looks good for this format!"
                        : pageStatus === "short" ? `Your script is shorter than typical. That's okay for early drafts - keep writing!`
                          : `Your script exceeds the typical range. Consider trimming or changing the format.`}
                    </p>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Viewable Script</h3>
                    <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-500"}`}>
                      Turn this on if you want buyers to see a preview window from your uploaded script.
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${formData.viewableScript ? (dark ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200") : (dark ? "bg-white/[0.04] text-gray-300 border border-white/[0.08]" : "bg-white text-gray-600 border border-gray-200")}`}>
                    {formData.viewableScript ? "Enabled" : "Hidden"}
                  </span>
                </div>
                <label className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${dark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"}`}>
                  <input
                    type="checkbox"
                    name="viewableScript"
                    checked={Boolean(formData.viewableScript)}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-900"}`}>
                    Add a viewable script preview
                  </span>
                </label>
                {!formData.viewableScript && (
                  <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${dark ? "border-white/10 bg-white/[0.03] text-gray-400" : "border-gray-200 bg-white text-gray-600"}`}>
                    No preview will be shown until you enable the viewable script option.
                  </div>
                )}
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`} style={formData.viewableScript ? undefined : { display: "none" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Preview Range</h3>
                    <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-500"}`}>
                      Set the exact pages film professionals can view before unlocking the rest.
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${dark ? "bg-white/[0.04] text-gray-300 border border-white/[0.08]" : "bg-white text-gray-600 border border-gray-200"}`}>
                    Free preview
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min="1"
                      name="previewWindowStart"
                      value={formData.previewWindowStart}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={Math.max(1, Number(formData.previewWindowStart || 1) || 1)}
                      name="previewWindowEnd"
                      value={formData.previewWindowEnd}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="e.g. 8"
                    />
                  </div>
                </div>

                <div className={`mt-4 rounded-xl px-4 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                  <p className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-900"}`}>
                    Film professionals will see pages {formData.previewWindowStart || "—"} to {formData.previewWindowEnd || "—"}
                  </p>
                  <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                    Admin review will also show this exact page range before approval.
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Viewable Script Preview</h3>
                    <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                      This is the exact page block buyers and admins will see.
                    </p>
                  </div>
                </div>
                <ScreenplayPdfViewer
                  pdfUrl=""
                  title={title || "Script"}
                  startPage={Number(formData.previewWindowStart || 1)}
                  endPage={Number(formData.previewWindowEnd || 1)}
                  fallbackPages={previewPageTexts.slice(
                    Math.max(0, Number(formData.previewWindowStart || 1) - 1),
                    Math.max(0, Number(formData.previewWindowEnd || 1))
                  ).map((pageText, index) => ({
                    pageNumber: Number(formData.previewWindowStart || 1) + index,
                    text: String(pageText || ""),
                  }))}
                  fallbackText={previewPageTexts.join("\n\n")}
                />
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                <div>
                  <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Script Completion</h3>
                  <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                    Let buyers know how much of the script is ready.
                  </p>
                </div>

                {/* Status picker */}
                <div className="mt-4">
                  <p className={`text-xs font-semibold mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>Where is your script right now?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: "complete", label: "Fully Written", desc: "All parts are done and ready to share" },
                      { value: "partial", label: "Partially Done", desc: "Some episodes or acts are ready, more coming" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, completionStatus: opt.value }))}
                        className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                          formData.completionStatus === opt.value
                            ? dark
                              ? "border-[#2a5080] bg-[#0f2035] ring-1 ring-[#2a5080]"
                              : "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                            : dark
                              ? "border-[#1d3350] bg-[#0d1826] hover:border-[#2a4a6a]"
                              : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className={`text-[13px] font-semibold ${
                          formData.completionStatus === opt.value
                            ? dark ? "text-white" : "text-blue-800"
                            : dark ? "text-gray-200" : "text-gray-800"
                        }`}>{opt.label}</span>
                        <span className={`text-[11px] leading-snug ${
                          formData.completionStatus === opt.value
                            ? dark ? "text-blue-300" : "text-blue-600"
                            : dark ? "text-gray-500" : "text-gray-400"
                        }`}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parts inputs — only relevant for partial */}
                {formData.completionStatus !== "complete" && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                        Parts / episodes done so far
                      </label>
                      <input type="number" min="0" name="completedParts" value={formData.completedParts} onChange={handleChange} placeholder="e.g. 4" className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                        Total parts / episodes planned
                      </label>
                      <input type="number" min="0" name="totalParts" value={formData.totalParts} onChange={handleChange} placeholder="e.g. 10" className={inputCls} />
                    </div>
                  </div>
                )}

                {/* Future note */}
                <div className="mt-4">
                  <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    Anything else buyers should know? <span className={`font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                  </label>
                  <textarea
                    name="futurePlans"
                    value={formData.futurePlans}
                    onChange={handleChange}
                    rows={2}
                    maxLength={300}
                    placeholder={
                      formData.completionStatus === "complete"
                        ? "e.g. This is the final locked version, ready for production."
                        : "e.g. Remaining episodes are still being written and will be uploaded soon."
                    }
                    className={`${inputCls} resize-none`}
                  />
                  <p className={`text-[10px] mt-1 text-right ${dark ? "text-gray-600" : "text-gray-400"}`}>
                    {String(formData.futurePlans || "").length}/300
                  </p>
                </div>
              </div>

              {targetFilm && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className={`block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Logline * <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>{formData.logline.length}/500</span></label>
                    <button type="button" onClick={() => handleGenerateMetadata("logline")} disabled={Boolean(metaLoadingField)}
                      className={aiBtnCls}>{metaLoadingField === "logline" ? "Generating…" : "✨ Generate with AI"}</button>
                  </div>
                  <textarea name="logline" value={formData.logline} onChange={handleChange} rows={3} maxLength={500} placeholder="A one-sentence summary of your story..."
                    className={`${inputCls} resize-none`} />
                  {metaNotice.field === "logline" && <p className={`text-[11px] mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{metaNotice.text}</p>}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className={`block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Synopsis *</label>
                  <button type="button" onClick={() => handleGenerateMetadata("synopsis")} disabled={Boolean(metaLoadingField)}
                    className={aiBtnCls}>{metaLoadingField === "synopsis" ? "Generating…" : "✨ Generate with AI"}</button>
                </div>
                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="A longer synopsis of your script..."
                  className={`${inputCls} resize-none`} />
                {metaNotice.field === "synopsis" && <p className={`text-[11px] mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{metaNotice.text}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Tags</label>
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. heist, ensemble, twist ending" className={inputCls} />
              </div>

              {targetFilm && (
                <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Role Studio</h3>
                      <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Add cast roles with demographics and creative direction. Leave blank if not casting yet.</p>
                      {metaNotice.field === "roles" && <p className={`text-[11px] mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{metaNotice.text}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleGenerateMetadata("roles")}
                        disabled={Boolean(metaLoadingField)}
                        className={aiBtnCls}
                      >
                        {metaLoadingField === "roles" ? "Generating…" : "✨ Generate with AI"}
                      </button>
                      <button
                        type="button"
                        onClick={addRole}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${dark ? "bg-white/[0.06] border-[#2a4a6a] text-blue-300 hover:bg-white/[0.1]" : "bg-white border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`}
                      >
                        + Add Role
                      </button>
                    </div>
                  </div>

                  {roles.length === 0 ? (
                    <div className={`rounded-xl border border-dashed px-4 py-5 text-center ${dark ? "border-[#1d3350] text-gray-500" : "border-gray-300 text-gray-400"}`}>
                      No roles added yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {roles.map((role, idx) => (
                        <div key={`role-${idx}`} className={`rounded-xl border p-3 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-white"}`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className={`text-xs font-bold ${dark ? "text-gray-300" : "text-gray-700"}`}>Role {idx + 1}</p>
                            <button
                              type="button"
                              onClick={() => removeRole(idx)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "text-red-300 border-red-500/30 hover:bg-red-500/10" : "text-red-600 border-red-200 hover:bg-red-50"}`}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={role.characterName}
                              onChange={(e) => updateRoleField(idx, "characterName", e.target.value)}
                              placeholder="Character name"
                              className={inputCls}
                            />
                            <input
                              type="text"
                              value={role.type}
                              onChange={(e) => updateRoleField(idx, "type", e.target.value)}
                              placeholder="Archetype (e.g. Lead, Antagonist)"
                              className={inputCls}
                            />
                            <select value={role.gender} onChange={(e) => updateRoleField(idx, "gender", e.target.value)} className={inputCls}>
                              {ROLE_GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="Min age"
                                value={role.ageRange?.min ?? ""}
                                onChange={(e) => updateRoleAge(idx, "min", e.target.value)}
                                className={inputCls}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="Max age"
                                value={role.ageRange?.max ?? ""}
                                onChange={(e) => updateRoleAge(idx, "max", e.target.value)}
                                className={inputCls}
                              />
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={role.description}
                            onChange={(e) => updateRoleField(idx, "description", e.target.value)}
                            placeholder="Performance notes, emotional range, or casting vibe..."
                            className={`${inputCls} mt-3 resize-none`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* -- Publishing Details Section -- */}
              {/* -- Publishing Market Positioning Section -- */}
              {targetPublishing && (
                <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50"}`}>
                  <div className="mb-4">
                    <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Market Positioning</h3>
                    <p className={`text-[11px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Provide important metadata for publishers.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Target Audience *</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["Young Adult", "Adult", "Mass Market", "Niche / Literary"].map(f => (
                          <button key={f} type="button" onClick={() => {
                            setPublishingDetails(prev => {
                              const curr = prev.targetAudience || [];
                              return { ...prev, targetAudience: curr.includes(f) ? curr.filter(x => x !== f) : [...curr, f] };
                            });
                          }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${publishingDetails.targetAudience?.includes(f) ? "bg-emerald-600 text-white border-emerald-600" : dark ? "border-emerald-500/30 text-emerald-400 hover:border-emerald-400" : "border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>{f}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Writing Style <span className="font-normal text-[11px]">(optional)</span></label>
                      <div className="flex flex-wrap gap-1.5">
                        {["Descriptive", "Dialogue-driven", "Literary", "Commercial"].map(f => (
                          <button key={f} type="button" onClick={() => {
                            setPublishingDetails(prev => {
                              const curr = prev.writingStyle || [];
                              return { ...prev, writingStyle: curr.includes(f) ? curr.filter(x => x !== f) : [...curr, f] };
                            });
                          }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${publishingDetails.writingStyle?.includes(f) ? "bg-emerald-600 text-white border-emerald-600" : dark ? "border-emerald-500/30 text-emerald-400 hover:border-emerald-400" : "border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>{f}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Estimated Book Length <span className="font-normal text-[11px]">(optional)</span></label>
                      <input type="text" value={publishingDetails.estimatedWordCount} onChange={(e) => setPublishingDetails(p => ({ ...p, estimatedWordCount: e.target.value }))} placeholder="e.g. 60,000 - 90,000 words" className={inputCls} />
                    </div>
                  </div>
                </div>
              )}

              {/* -- Advanced Publishing Details (Collapsed) -- */}
              {targetPublishing && (
                <details className={`rounded-2xl border overflow-hidden ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-white"}`}>
                  <summary className={`px-4 py-4 cursor-pointer font-bold text-sm select-none hover:bg-black/5 transition-colors ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    Advanced Publishing Details (Optional)
                  </summary>
                  <div className={`px-4 pb-5 space-y-4 border-t pt-4 ${dark ? "border-[#1d3350]" : "border-gray-200"}`}>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Series Potential</label>
                      <select value={publishingDetails.seriesPotential} onChange={(e) => setPublishingDetails(p => ({ ...p, seriesPotential: e.target.value }))} className={inputCls}>
                        <option value="">Select potential...</option>
                        <option value="Standalone">Standalone</option>
                        <option value="Trilogy">Trilogy</option>
                        <option value="Multi-part universe">Multi-part universe</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Prose Sample <span className="font-normal text-[11px]">(Novel-formatted excerpt)</span></label>
                        <button
                          type="button"
                          onClick={handleProseClick}
                          disabled={proseLoading}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${dark ? "bg-white/[0.06] text-blue-300 border border-[#2a4a6a] hover:bg-white/[0.1]" : "bg-white border border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`}
                        >
                          <svg className={`w-3 h-3 ${proseLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          {proseLoading ? "Generating..." : "AI Generate Prose"}
                        </button>
                      </div>
                      <textarea rows={6} value={publishingDetails.proseSample || ""} onChange={(e) => setPublishingDetails(p => ({ ...p, proseSample: e.target.value }))} placeholder="A sample chapter or converted prose excerpt to demonstrate the writing quality..." className={`${inputCls} resize-y font-serif text-sm leading-relaxed`} />
                    </div>
                  </div>
                </details>
              )}

              {/* Media Uploads */}
              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-white"}`}>
                <div className="mb-4">
                  <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-[#1e3a5f]"}`}>Visual Assets</h3>
                  <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Add a cover image and trailer to improve profile quality and discovery.</p>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                  {/* Thumbnail Upload */}
                  <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                    <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                      Script Thumbnail <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                    </label>
                    {!thumbnailFile ? (
                      <div onClick={() => thumbnailInputRef.current?.click()} className={`rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center ${dark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-100/70"}`}>
                        <ImageIcon className={`w-8 h-8 mb-2 ${dark ? "text-[#1d3350]" : "text-gray-400"}`} />
                        <p className={`text-xs font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upload & Adjust Cover</p>
                        <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>JPEG, PNG, WEBP (Max 5MB)</p>
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            handleThumbnailSelect(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className={`border rounded-xl p-3 flex items-center gap-3 ${dark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                        <img src={thumbnailPreviewUrl} alt="Thumbnail Preview" className="w-12 h-16 object-cover rounded" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${dark ? "text-green-400" : "text-green-700"}`}>{thumbnailFile.name}</p>
                          <p className={`text-[10px] ${dark ? "text-green-500/80" : "text-green-600/80"}`}>{(thumbnailFile.size / 1024).toFixed(1)} KB - Cover ready</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => openThumbnailEditor(thumbnailFile)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setThumbnailFile(null);
                              setError("");
                            }}
                            className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trailer Upload */}
                  {targetFilm && (
                    <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                        Trailer Video <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                      </label>
                      <input
                        ref={trailerInputRef}
                        type="file"
                        accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
                        onChange={(e) => {
                          handleTrailerSelect(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />

                      {!trailerFile ? (
                        <div onClick={() => trailerInputRef.current?.click()} className={`rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center ${dark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-100/70"}`}>
                          <Film className={`w-8 h-8 mb-2 ${dark ? "text-[#1d3350]" : "text-gray-400"}`} />
                          <p className={`text-xs font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upload High-Quality Trailer</p>
                          <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>MP4, MOV, MPEG, WebM (Max 250MB)</p>
                        </div>
                      ) : (
                        <div className={`border rounded-xl p-3 space-y-3 ${dark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                          <div className="relative overflow-hidden rounded-lg">
                            <video
                              src={trailerPreviewUrl}
                              controls
                              preload="metadata"
                              className="w-full h-44 object-contain bg-black"
                            />
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${dark ? "text-green-400" : "text-green-700"}`}>{trailerFile.name}</p>
                              <p className={`text-[10px] ${dark ? "text-green-500/80" : "text-green-600/80"}`}>
                                {(trailerFile.size / 1024 / 1024).toFixed(1)} MB
                                {trailerMetaLoading ? " - reading video info..." : trailerMeta ? ` - ${formatDuration(trailerMeta.duration)} - ${trailerMeta.width}x${trailerMeta.height}` : ""}
                              </p>
                              <p className={`text-[10px] mt-1 ${dark ? "text-green-500/80" : "text-green-700/80"}`}>Original quality will be preserved on upload.</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => trailerInputRef.current?.click()}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTrailerFile(null);
                                  setError("");
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pitch Video Upload */}
                  {["writer", "creator"].includes(user?.role) && (["free", "silver"].includes(user?.subscription?.plan) || !user?.subscription?.plan) ? (
                    <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-0.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                        Pitch Video <span className={`text-xs font-normal text-red-500`}>Locked</span>
                      </label>
                      <p className={`text-[11px] mb-2.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Upload Pitch Video is a premium feature.</p>
                      <Link to="/pricing" className="block text-center rounded-xl p-4 transition flex flex-col items-center bg-gray-100/50 hover:bg-gray-200/50 cursor-pointer">
                        <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        <p className={`text-xs font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upgrade to Unlock</p>
                      </Link>
                    </div>
                  ) : (
                    <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-0.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                        Pitch Video <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                      </label>
                    <p className={`text-[11px] mb-2.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>A short video pitch for your project. Max 1:30 min · Max 90MB</p>
                    <input
                      ref={pitchVideoInputRef}
                      type="file"
                      accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
                      onChange={(e) => {
                        handlePitchVideoSelect(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    {!pitchVideoFile ? (
                      <div onClick={() => pitchVideoInputRef.current?.click()} className={`rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center ${dark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-100/70"}`}>
                        <Film className={`w-8 h-8 mb-2 ${dark ? "text-[#1d3350]" : "text-gray-400"}`} />
                        <p className={`text-xs font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upload Pitch Video</p>
                        <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>MP4, MOV, MPEG, WebM · Max 1:30 min · Max 90MB</p>
                      </div>
                    ) : (
                      <div className={`border rounded-xl p-3 space-y-3 ${dark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                        <div className="relative overflow-hidden rounded-lg">
                          <video
                            src={pitchVideoPreviewUrl}
                            controls
                            preload="metadata"
                            className="w-full h-44 object-contain bg-black"
                          />
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${dark ? "text-green-400" : "text-green-700"}`}>{pitchVideoFile.name}</p>
                            <p className={`text-[10px] ${dark ? "text-green-500/80" : "text-green-600/80"}`}>
                              {(pitchVideoFile.size / 1024 / 1024).toFixed(1)} MB
                              {pitchVideoMetaLoading ? " · reading..." : pitchVideoMeta ? ` · ${formatDuration(pitchVideoMeta.duration)}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => pitchVideoInputRef.current?.click()}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPitchVideoFile(null); setError(""); }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* -- STEP 3: Classification -- */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={`${cardCls} p-6 sm:p-8 space-y-6`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Deep Classification</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Help readers discover your script by specifying its genre and tone.</p>
              </div>

              <div>
                <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Primary Genre *</h3>
                <select
                  name="primaryGenre"
                  value={formData.primaryGenre}
                  onChange={(e) => setFormData(fd => ({ ...fd, primaryGenre: e.target.value }))}
                  className={inputCls}
                >
                  <option value="" disabled>Select a Primary Genre...</option>
                  {genres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              {[{ label: "Tones", key: "tones", opts: toneOptions }, { label: "Themes", key: "themes", opts: themeOptions }, { label: "Settings", key: "settings", opts: settingOptions }].map(({ label, key, opts }) => (
                <div key={key}>
                  <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>{label} <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>({classification[key].length}/3)</span></h3>
                  <select
                    className={inputCls}
                    value=""
                    onChange={(e) => {
                      if (e.target.value && classification[key].length < 3 && !classification[key].includes(e.target.value)) {
                        toggleChip(key, e.target.value);
                      }
                    }}
                    disabled={classification[key].length >= 3}
                  >
                    <option value="" disabled>Select {label.toLowerCase().slice(0, -1)}...</option>
                    {opts.filter(v => !classification[key].includes(v)).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  {classification[key].length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {classification[key].map(v => (
                        <button key={v} type="button" onClick={() => toggleChip(key, v)} className={chipCls(true)}>
                          {v} <span className="ml-1 opacity-60">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* -- STEP 4: Film Info -- */}
        {step === 4 && (
          <motion.div key="s4-film" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={`${cardCls} p-6 sm:p-8 space-y-6`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Film Production Details</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Help industry professionals understand your vision, involvement, and script style. Film language is required.</p>
              </div>

              {/* Creative Role */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${dark ? "text-gray-300" : "text-gray-700"}`}>Your Creative Role</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "wantToDirect", label: "Want to Direct", sub: "I want to direct this script myself", color: dark ? "border-violet-500/50 bg-violet-500/10" : "border-violet-400 bg-violet-50", textColor: dark ? "text-violet-200" : "text-violet-700" },
                    { key: "wantToProduce", label: "Want to Produce", sub: "I am also the producer of this project", color: dark ? "border-amber-500/50 bg-amber-500/10" : "border-amber-400 bg-amber-50", textColor: dark ? "text-amber-200" : "text-amber-700" },
                  ].map(({ key, label, sub, color, textColor }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilmDetails((fd) => ({ ...fd, [key]: !fd[key] }))}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${filmDetails[key]
                        ? color
                        : dark ? "border-[#1d3350] bg-[#080f1a] hover:border-[#2a4a6a]" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-bold ${filmDetails[key] ? textColor : dark ? "text-gray-200" : "text-gray-800"}`}>{label}</p>
                        <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>{sub}</p>
                      </div>
                      {filmDetails[key] && (
                        <svg className={`w-4 h-4 ml-auto shrink-0 ${textColor}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Film Language */}
              <div>
                <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Film Language <span className="text-red-500">*</span></h3>
                <div className="flex flex-wrap gap-2">
                  {CP_FILM_LANGUAGE_OPTIONS.map((lang) => (
                    <button key={lang} type="button"
                      onClick={() => setFilmDetails((fd) => ({ ...fd, filmLanguage: fd.filmLanguage === lang ? "" : lang }))}
                      className={chipCls(filmDetails.filmLanguage === lang)}>
                      {lang}
                    </button>
                  ))}
                </div>
                {filmDetails.filmLanguage === "Other" && (
                  <input type="text" placeholder="Specify language..." value={filmDetails.filmLanguageCustom || ""}
                    onChange={(e) => setFilmDetails((fd) => ({ ...fd, filmLanguageCustom: e.target.value }))}
                    className={`${inputCls} mt-3`} maxLength={80} />
                )}
              </div>

              {/* Dialogues */}
              <div>
                <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Dialogues</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "yes", label: "Yes — Full Dialogues" },
                    { value: "partial", label: "Partial — Some Dialogues" },
                    { value: "no", label: "No — Action/Direction Only" },
                  ].map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setFilmDetails((fd) => ({ ...fd, dialoguesPresent: opt.value }))}
                      className={chipCls(filmDetails.dialoguesPresent === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* -- STEP 5: Publish Setup -- */}
        {step === 5 && (
          <motion.div key="s4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className="space-y-6">
                <div className={`${cardCls} p-4 min-[420px]:p-5 sm:p-8 space-y-5 min-[420px]:space-y-6`}>
                  <div>
                    <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Submission Setup</h2>
                    <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Choose access, set price, select services, and accept terms.</p>
                  </div>

                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 space-y-5 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                        <svg className={`w-4.5 h-4.5 ${dark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                      </div>
                      <div>
                        <h3 className={`text-[15px] min-[420px]:text-base font-bold ${dark ? "text-white" : "text-gray-900"}`}>Monetization</h3>
                        <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>Set what buyers pay to access your script and rights terms.</p>
                      </div>
                    </div>

                    {/* Price input */}
                    <div className={`rounded-xl p-4 sm:p-5 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Your Asking Price</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="relative w-full sm:w-44">
                          <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold ${dark ? "text-emerald-400" : "text-emerald-600"}`}>₹</span>
                          <input
                            type="number" min="1" step="1"
                            value={scriptPrice}
                            onChange={(e) => {
                              const normalized = String(e.target.value || "").replace(/^0+(?=\d)/, "");
                              setScriptPrice(Number(normalized) || 0);
                            }}
                            placeholder="0"
                            className={`w-full pl-8 pr-4 py-3 rounded-xl text-lg font-bold border-2 outline-none transition-all ${dark ? "bg-white/[0.04] border-emerald-500/40 text-white focus:border-emerald-400" : "bg-emerald-50/60 border-emerald-200 text-gray-900 focus:border-emerald-500 focus:bg-white"}`}
                          />
                        </div>
                        <p className={`text-[12px] leading-relaxed ${dark ? "text-gray-500" : "text-gray-500"}`}>
                          This is the amount buyers pay to unlock your script. You can update it anytime before publishing.
                        </p>
                      </div>
                    </div>

                    {/* How it works */}
                    <div className={`rounded-xl p-4 space-y-2.5 ${dark ? "bg-amber-500/5 border border-amber-500/15" : "bg-amber-50/70 border border-amber-100"}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${dark ? "text-amber-300" : "text-amber-700"}`}>Before you set your price</p>
                      <ul className="space-y-2">
                        {[
                          "Buyers are evaluating rights — for films, web series, TV serials, remakes, or adaptations.",
                          "They're not paying just to read — they're assessing your script for a potential deal.",
                          "Price it based on what those rights are worth, not just the read.",
                        ].map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${dark ? "bg-amber-400" : "bg-amber-500"}`} />
                            <p className={`text-[12px] leading-relaxed ${dark ? "text-amber-200/70" : "text-amber-800"}`}>{tip}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>



                  {targetFilm && (
                    <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.07]"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-rose-300" : "text-rose-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m5.25-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Rights & Licensing Preferences</h3>
                        <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>These terms are included in buyer consent and legal agreement PDFs.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Rights Type</label>
                        <select
                          value={rightsLicensing.rightsType}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({ ...prev, rightsType: e.target.value }))}
                          className={inputCls}
                        >
                          {RIGHTS_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Modification Rights</label>
                        <select
                          value={rightsLicensing.modificationRights}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({ ...prev, modificationRights: e.target.value }))}
                          className={inputCls}
                        >
                          {MODIFICATION_RIGHTS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Payment Structure</label>
                        <select
                          value={rightsLicensing.paymentStructure}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({ ...prev, paymentStructure: e.target.value }))}
                          className={inputCls}
                        >
                          {PAYMENT_STRUCTURE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Negotiation Mode</label>
                        <select
                          value={rightsLicensing.negotiationMode}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({ ...prev, negotiationMode: e.target.value }))}
                          className={inputCls}
                        >
                          {NEGOTIATION_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      {rightsLicensing.rightsType === "exclusive_license" && (
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>License Duration</label>
                          {(() => {
                            const currentDuration = Number(rightsLicensing?.timeBound?.licenseDurationMonths || 12);
                            const isCustomDuration = !LICENSE_DURATION_PRESET_MONTHS.includes(currentDuration);
                            const customDurationFallback = isCustomDuration && currentDuration > 0 ? currentDuration : 30;

                            return (
                              <>
                                <select
                                  value={isCustomDuration ? "custom" : String(currentDuration)}
                                  onChange={(e) => {
                                    const selected = e.target.value;
                                    setRightsLicensing((prev) => normalizeRightsLicensingState({
                                      ...prev,
                                      timeBound: {
                                        ...prev.timeBound,
                                        licenseDurationMonths: selected === "custom" ? customDurationFallback : Number(selected),
                                      },
                                    }));
                                  }}
                                  className={inputCls}
                                >
                                  <option value="12">12 months</option>
                                  <option value="18">18 months</option>
                                  <option value="24">24 months</option>
                                  <option value="custom">Custom duration...</option>
                                </select>

                                {isCustomDuration && (
                                  <div className="mt-2">
                                    <label className={`block text-[11px] font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Custom Duration (months)</label>
                                    <input
                                      type="number"
                                      min={MIN_LICENSE_DURATION_MONTHS}
                                      max={MAX_LICENSE_DURATION_MONTHS}
                                      step="1"
                                      value={currentDuration}
                                      onChange={(e) => {
                                        const nextRaw = Number(e.target.value);
                                        const nextDuration = Number.isFinite(nextRaw)
                                          ? Math.max(MIN_LICENSE_DURATION_MONTHS, Math.min(MAX_LICENSE_DURATION_MONTHS, Math.round(nextRaw)))
                                          : MIN_LICENSE_DURATION_MONTHS;

                                        setRightsLicensing((prev) => normalizeRightsLicensingState({
                                          ...prev,
                                          timeBound: {
                                            ...prev.timeBound,
                                            licenseDurationMonths: nextDuration,
                                          },
                                        }));
                                      }}
                                      className={inputCls}
                                    />
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(rightsLicensing.paymentStructure) && (
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Royalty Percentage</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={rightsLicensing?.royaltySettings?.percentage ?? 0}
                            onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                              ...prev,
                              royaltySettings: {
                                ...prev.royaltySettings,
                                percentage: Number(e.target.value || 0),
                              },
                            }))}
                            className={inputCls}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Custom Conditions (Optional)</label>
                      <textarea
                        rows={4}
                        value={rightsLicensing.customConditions}
                        onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                          ...prev,
                          customConditions: e.target.value,
                        }))}
                        className={`${inputCls} resize-y`}
                        placeholder="Add contract-sensitive terms buyers must accept."
                      />
                      <p className={`text-[11px] mt-1 text-right ${dark ? "text-gray-500" : "text-gray-500"}`}>
                        {String(rightsLicensing.customConditions || "").length}/{MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH}
                      </p>
                    </div>

                    <div className={`mt-4 rounded-xl border px-3 py-3 ${dark ? "border-[#1b2e46] bg-[#07101c]" : "border-gray-200 bg-white"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${dark ? "text-gray-500" : "text-gray-400"}`}>Rights Summary Preview</p>
                      <p className={`text-sm font-semibold mt-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>{RIGHTS_LABEL_MAP[rightsLicensing.rightsType]}</p>
                      <p className={`text-[12px] mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{MODIFICATION_LABEL_MAP[rightsLicensing.modificationRights]}</p>
                      <p className={`text-[12px] ${dark ? "text-gray-400" : "text-gray-600"}`}>{PAYMENT_LABEL_MAP[rightsLicensing.paymentStructure]}</p>
                      <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">
                        EXCLUSIVE RIGHTS: no multi-buyer sales once agreement is settled.
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2.5">
                      <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(rightsLicensing?.legalAcknowledgement?.ownershipConfirmed)}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                            ...prev,
                            legalAcknowledgement: {
                              ...prev.legalAcknowledgement,
                              ownershipConfirmed: e.target.checked,
                            },
                          }))}
                          className="mt-0.5"
                        />
                        <span>I confirm I own or control all rights required for this listing.</span>
                      </label>
                      <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(rightsLicensing?.legalAcknowledgement?.platformTermsAccepted)}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                            ...prev,
                            legalAcknowledgement: {
                              ...prev.legalAcknowledgement,
                              platformTermsAccepted: e.target.checked,
                            },
                          }))}
                          className="mt-0.5"
                        />
                        <span>I acknowledge these rights terms under platform legal policy.</span>
                      </label>
                      <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(rightsLicensing?.legalAcknowledgement?.exclusivityUnderstood)}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                            ...prev,
                            legalAcknowledgement: {
                              ...prev.legalAcknowledgement,
                              exclusivityUnderstood: e.target.checked,
                            },
                          }))}
                          className="mt-0.5"
                        />
                        <span>I understand exclusivity enforcement for settled transactions.</span>
                      </label>
                    </div>
                    </div>
                  )}

                  {targetPublishing && (
                    <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 ${dark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50/60"}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-emerald-500/10" : "bg-emerald-100"}`}>
                            <svg className={`w-4 h-4 ${dark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Publishing Rights</h3>
                            <p className={`text-[11px] ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Do you want to sell publishing rights?</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={publishingDetails.sellPublishingRights || false} onChange={(e) => setPublishingDetails(p => ({ ...p, sellPublishingRights: e.target.checked }))} />
                          <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${dark ? "bg-gray-700 peer-checked:bg-emerald-500" : "bg-gray-200 peer-checked:bg-emerald-500"}`}></div>
                        </label>
                      </div>

                      {publishingDetails.sellPublishingRights && (
                        <div className={`mt-5 pt-5 border-t ${dark ? "border-emerald-500/20" : "border-emerald-200"}`}>
                          <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>Auto-fill Presets</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                            <button type="button" onClick={() => {
                              setPublishingDetails(p => ({
                                ...p,
                                publishingRights: {
                                  ...p.publishingRights,
                                  rightsBundle: "basic",
                                  exclusivity: "non_exclusive",
                                  digitalPublishing: true,
                                  bookPublishing: false,
                                  audiobookRights: false,
                                  adaptationIncluded: false,
                                  territory: ["worldwide"],
                                  languages: ["all_languages"],
                                  durationYears: "3 years",
                                  paymentType: "royalty_based",
                                  negotiationMode: "fixed_terms"
                                }
                              }))
                            }} 
                              className={`rounded-xl p-4 text-left transition-all border ${publishingDetails.publishingRights?.rightsBundle === "basic" ? dark ? "bg-emerald-600/20 border-emerald-500" : "bg-emerald-100 border-emerald-600" : dark ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                              <h4 className={`text-sm font-bold ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Basic Entry</h4>
                              <p className={`text-[10px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Digital-only, non-exclusive, 3 years.</p>
                            </button>
                            <button type="button" onClick={() => {
                              setPublishingDetails(p => ({
                                ...p,
                                publishingRights: {
                                  ...p.publishingRights,
                                  rightsBundle: "full",
                                  exclusivity: "exclusive",
                                  digitalPublishing: true,
                                  bookPublishing: true,
                                  audiobookRights: true,
                                  adaptationIncluded: true,
                                  territory: ["worldwide"],
                                  languages: ["all_languages"],
                                  durationYears: "perpetual",
                                  paymentType: "advance_plus_royalty",
                                  negotiationMode: "open_to_negotiation"
                                }
                              }))
                            }} 
                              className={`rounded-xl p-4 text-left transition-all border ${publishingDetails.publishingRights?.rightsBundle === "full" ? dark ? "bg-emerald-600/20 border-emerald-500" : "bg-emerald-100 border-emerald-600" : dark ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                              <h4 className={`text-sm font-bold ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Full Traditional</h4>
                              <p className={`text-[10px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>All formats, exclusive, long-term.</p>
                            </button>
                            <button type="button" onClick={() => {
                              setPublishingDetails(p => ({
                                ...p,
                                publishingRights: {
                                  ...p.publishingRights,
                                  rightsBundle: "custom",
                                }
                              }))
                            }} 
                              className={`rounded-xl p-4 text-left transition-all border ${publishingDetails.publishingRights?.rightsBundle === "custom" ? dark ? "bg-emerald-600/20 border-emerald-500" : "bg-emerald-100 border-emerald-600" : dark ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                              <h4 className={`text-sm font-bold ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Custom Setup</h4>
                              <p className={`text-[10px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Build your own rights configuration.</p>
                            </button>
                          </div>

                          <div className="space-y-6">
                            {/* 1. Rights Scope */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>1. Rights Scope</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Rights Type</label>
                                  <select value={publishingDetails.publishingRights?.exclusivity || "non_exclusive"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, exclusivity: e.target.value } }))} className={inputCls}>
                                    <option value="exclusive">Exclusive</option>
                                    <option value="non_exclusive">Non-Exclusive</option>
                                  </select>
                                </div>
                                <div className="sm:col-span-2">
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Formats Included</label>
                                  <div className="flex flex-wrap gap-4 mt-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={publishingDetails.publishingRights?.bookPublishing || false} onChange={e => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, bookPublishing: e.target.checked } }))} /> Print</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={publishingDetails.publishingRights?.digitalPublishing || false} onChange={e => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, digitalPublishing: e.target.checked } }))} /> Digital (eBook)</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={publishingDetails.publishingRights?.audiobookRights || false} onChange={e => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, audiobookRights: e.target.checked } }))} /> Audio (Audiobook)</label>
                                  </div>
                                </div>
                                <div className="sm:col-span-3">
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Adaptation Rights (Film/TV)</label>
                                  <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="adaptationIncluded" checked={publishingDetails.publishingRights?.adaptationIncluded === true} onChange={() => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, adaptationIncluded: true } }))} /> Included</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="adaptationIncluded" checked={publishingDetails.publishingRights?.adaptationIncluded !== true} onChange={() => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, adaptationIncluded: false } }))} /> Not Included</label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 2. Territory & Language */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>2. Territory & Language</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Territory</label>
                                  <select value={(publishingDetails.publishingRights?.territory && publishingDetails.publishingRights.territory[0]) || "worldwide"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, territory: [e.target.value] } }))} className={inputCls}>
                                    <option value="worldwide">Worldwide</option>
                                    <option value="specific_regions">Specific Regions</option>
                                    <option value="india_only">India Only</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Language Rights</label>
                                  <select value={(publishingDetails.publishingRights?.languages && publishingDetails.publishingRights.languages[0]) || "all_languages"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, languages: [e.target.value] } }))} className={inputCls}>
                                    <option value="all_languages">All Languages</option>
                                    <option value="english">English Only</option>
                                    <option value="hindi">Hindi Only</option>
                                    <option value="regional">Regional Languages</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* 3. Duration */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>3. License Duration</h4>
                              <div className="flex flex-wrap gap-2">
                                {["3 years", "5 years", "10 years", "perpetual"].map(dur => (
                                  <button key={dur} type="button" onClick={() => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, durationYears: dur } }))} className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${publishingDetails.publishingRights?.durationYears === dur ? "bg-emerald-600 text-white border-emerald-600" : dark ? "border-[#1d3350] text-gray-400 hover:border-[#2a4a6a]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                    {dur.charAt(0).toUpperCase() + dur.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 4. Payment Structure */}
                            <div>
                              <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>4. Payment Structure</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="sm:col-span-2 lg:col-span-1">
                                  <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Payment Type</label>
                                  <select value={publishingDetails.publishingRights?.paymentType || "one_time_upfront"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, paymentType: e.target.value } }))} className={inputCls}>
                                    <option value="one_time_upfront">One-time Buyout</option>
                                    <option value="royalty_based">Royalty-based</option>
                                    <option value="advance_plus_royalty">Advance + Royalty</option>
                                  </select>
                                </div>
                                {["royalty_based", "advance_plus_royalty"].includes(publishingDetails.publishingRights?.paymentType) && (
                                  <div>
                                    <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Royalty % (Optional)</label>
                                    <div className="relative">
                                      <input type="number" min="0" max="100" placeholder="e.g. 15" value={publishingDetails.publishingRights?.royaltyPercentage || ""} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, royaltyPercentage: Number(e.target.value) } }))} className={inputCls} />
                                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                    </div>
                                  </div>
                                )}
                                {publishingDetails.publishingRights?.paymentType === "advance_plus_royalty" && (
                                  <div>
                                    <label className={`block text-xs font-semibold mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Advance (Optional)</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                      <input type="number" min="0" placeholder="e.g. 50000" value={publishingDetails.publishingRights?.advanceAmount || ""} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, advanceAmount: Number(e.target.value) } }))} className={`${inputCls} pl-8`} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 5 & 6. Control and Deal Mode */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>5. Creative Control</h4>
                                <select value={publishingDetails.publishingRights?.modificationRights || "buyer_must_consult_writer"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, modificationRights: e.target.value } }))} className={inputCls}>
                                  <option value="buyer_can_freely_modify">Publisher can modify freely</option>
                                  <option value="buyer_must_consult_writer">Must consult writer</option>
                                  <option value="writer_approval_required">Writer approval required</option>
                                </select>
                              </div>
                              <div>
                                <h4 className={`text-[13px] font-bold mb-3 ${dark ? "text-emerald-400" : "text-emerald-700"}`}>6. Negotiation Mode</h4>
                                <select value={publishingDetails.publishingRights?.negotiationMode || "fixed_terms"} onChange={(e) => setPublishingDetails(p => ({ ...p, publishingRights: { ...p.publishingRights, negotiationMode: e.target.value } }))} className={inputCls}>
                                  <option value="fixed_terms">Fixed terms</option>
                                  <option value="open_to_negotiation">Open to negotiation</option>
                                </select>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      <div className={`mt-5 pt-5 border-t ${dark ? "border-emerald-500/20" : "border-emerald-200"}`}>
                        <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${dark ? "text-emerald-500" : "text-emerald-700"}`}>
                          Rights Acknowledgements
                        </h4>
                        <div className="grid grid-cols-1 gap-2.5">
                          <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(rightsLicensing?.legalAcknowledgement?.ownershipConfirmed)}
                              onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                                ...prev,
                                legalAcknowledgement: {
                                  ...prev.legalAcknowledgement,
                                  ownershipConfirmed: e.target.checked,
                                },
                              }))}
                              className="mt-0.5"
                            />
                            <span>I confirm I own or control all rights required for this listing.</span>
                          </label>
                          <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(rightsLicensing?.legalAcknowledgement?.platformTermsAccepted)}
                              onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                                ...prev,
                                legalAcknowledgement: {
                                  ...prev.legalAcknowledgement,
                                  platformTermsAccepted: e.target.checked,
                                },
                              }))}
                              className="mt-0.5"
                            />
                            <span>I acknowledge these rights terms under platform legal policy.</span>
                          </label>
                          <label className={`flex items-start gap-2.5 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(rightsLicensing?.legalAcknowledgement?.exclusivityUnderstood)}
                              onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                                ...prev,
                                legalAcknowledgement: {
                                  ...prev.legalAcknowledgement,
                                  exclusivityUnderstood: e.target.checked,
                                },
                              }))}
                              className="mt-0.5"
                            />
                            <span>I understand exclusivity enforcement for settled transactions.</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.07]"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-purple-300" : "text-purple-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h3.75A2.625 2.625 0 0116.5 4.875v1.5H7.5v-1.5A2.625 2.625 0 0110.125 2.25zM7.5 9h9m-9 0v8.625A2.625 2.625 0 0010.125 20.25h3.75A2.625 2.625 0 0016.5 17.625V9m-9 0h9" /></svg>
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Submission Agreement</h3>
                        <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Read and accept before publishing.</p>
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                      <div className={`rounded-xl px-3 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? "text-gray-500" : "text-gray-400"}`}>Rights</p>
                        <p className="text-[12px] mt-2 leading-relaxed">You retain ownership of your script.</p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? "text-gray-500" : "text-gray-400"}`}>License</p>
                        <p className="text-[12px] mt-2 leading-relaxed">Platform gets a non-exclusive display and promotion license.</p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? "text-gray-500" : "text-gray-400"}`}>Refunds</p>
                        <p className="text-[12px] mt-2 leading-relaxed">Service charges are not refundable after processing starts.</p>
                      </div>
                    </div>

                    <div ref={agreementRef} className={`rounded-xl p-4 h-48 overflow-y-auto text-xs leading-relaxed border ${dark ? "border-[#182840] text-gray-400 bg-[#050b14]" : "border-gray-200 text-gray-500 bg-white"}`}>
                      <pre className="whitespace-pre-wrap font-sans">{LEGAL_AGREEMENT}</pre>
                    </div>

                    <p className={`text-xs mb-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                      Review the full legal document:
                      {" "}
                      <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:text-blue-400 underline underline-offset-2">
                        Script Upload Terms & Conditions
                      </Link>
                    </p>

                    <label className="flex items-start gap-3 cursor-pointer mt-4">
                      <input type="checkbox" checked={legal.agreedToTerms} onChange={e => setLegal((prev) => ({ ...prev, agreedToTerms: e.target.checked }))}
                        className="w-5 h-5 rounded mt-0.5 accent-[#1e3a5f]" />
                      <span className={`text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
                        I confirm I own or control the rights to this script and agree to the Script Upload Terms & Conditions (v{SCRIPT_UPLOAD_TERMS_VERSION}).
                      </span>
                    </label>
                  </div>
                </div>
            </div>
          </motion.div>
        )}


      </AnimatePresence>

      {/* -- Navigation Buttons -- */}
      {step > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between mt-5">
          <button onClick={handleBack} disabled={step === 1}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-30 ${dark
              ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            Back
          </button>
          {step < 5 ? (
            <button onClick={handleNext} disabled={creationBlocked}
              title={creationBlocked ? "Upgrade your plan to create another script" : undefined}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${dark
                ? "bg-[#1e3a5f] text-white hover:bg-[#2a4a70] shadow-lg shadow-[#1e3a5f]/20"
                : "bg-[#1e3a5f] text-white hover:bg-[#162d4a] shadow-lg shadow-[#1e3a5f]/20"}`}>
              Next -
            </button>
          ) : (
            <button onClick={handlePublish} disabled={loading || !legal.agreedToTerms || creationBlocked}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1e3a5f] hover:bg-[#162d4a] text-white shadow-md`}>
              {loading ? "Submitting..." : "Submit for Approval"}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CreateProject;




