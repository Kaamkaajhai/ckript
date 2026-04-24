import { useState, useEffect, useCallback, useContext, useRef } from "react";
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
import { SCRIPT_UPLOAD_TERMS_TEXT, SCRIPT_UPLOAD_TERMS_VERSION } from "../constants/scriptUploadTerms";

const DRAFT_ENDPOINT = `${(import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "")}/api/scripts/draft`;
const LOCAL_WORKING_DRAFT_KEY = "create-project-working-draft-v1";

/* -- Constants --------------------------------------- */
const formats = [
  { value: "feature", label: "Feature Film", icon: "FILM" },
  { value: "tv_1hour", label: "TV 1-Hour", icon: "TV" },
  { value: "tv_halfhour", label: "TV Half-Hour", icon: "TV" },
  { value: "short", label: "Short Film", icon: "SHORT" },
  { value: "limited_series", label: "Limited Series", icon: "SERIES" },
  { value: "documentary", label: "Documentary", icon: "DOC" },
  { value: "web_series", label: "Web Series", icon: "SERIES" },
  { value: "drama_school", label: "Drama School", icon: "DOC" },
  { value: "anime", label: "Anime", icon: "TV" },
  { value: "movie", label: "Movie", icon: "FILM" },
  { value: "tv_serial", label: "TV Serial", icon: "TV" },
  { value: "cartoon", label: "Cartoon", icon: "SHORT" },
  { value: "songs", label: "Songs", icon: "DOC" },
  { value: "standup_comedy", label: "Standup Comedy", icon: "DOC" },
  { value: "dialogues", label: "Dialogues", icon: "DOC" },
  { value: "poet", label: "Poet", icon: "DOC" },
  { value: "other", label: "Other", icon: "DOC" },
];
const CONTENT_TYPE_BY_FORMAT = {
  movie: "movie",
  feature: "movie",
  tv_1hour: "tv_series",
  tv_halfhour: "tv_series",
  limited_series: "tv_series",
  tv_serial: "tv_series",
  short: "short_film",
  web_series: "web_series",
  documentary: "documentary",
  anime: "anime",
  cartoon: "anime",
  songs: "songs",
  standup_comedy: "standup_comedy",
  dialogues: "dialogues",
  poet: "poet",
};

const getContentTypeFromFormat = (format) => CONTENT_TYPE_BY_FORMAT[format] || "movie";
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
  { value: "ckript_not_involved", label: "Ckript not involved" },
];

const RIGHTS_LABEL_MAP = Object.fromEntries(RIGHTS_TYPE_OPTIONS.map((option) => [option.value, option.label]));
const MODIFICATION_LABEL_MAP = Object.fromEntries(MODIFICATION_RIGHTS_OPTIONS.map((option) => [option.value, option.label]));
const PAYMENT_LABEL_MAP = Object.fromEntries(PAYMENT_STRUCTURE_OPTIONS.map((option) => [option.value, option.label]));
const NEGOTIATION_LABEL_MAP = Object.fromEntries(NEGOTIATION_MODE_OPTIONS.map((option) => [option.value, option.label]));
const LICENSE_DURATION_PRESET_MONTHS = [12, 18, 24];
const MIN_LICENSE_DURATION_MONTHS = 1;
const MAX_LICENSE_DURATION_MONTHS = 120;

const createDefaultRightsLicensing = () => ({
  rightsType: "exclusive_license",
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
  { num: 4, label: "Publish", shortLabel: "Pub", desc: "Pricing & services" },
  { num: 5, label: "Review", shortLabel: "Review", desc: "Final review" },
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
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUnderReviewModal, setShowUnderReviewModal] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarNotes, setGrammarNotes] = useState([]);
  const lastDraftSignatureRef = useRef("");
  const autoSaveInFlightRef = useRef(false);
  const localDraftHydratedRef = useRef(false);

  // Grammar credit confirmation + undo/keep
  const GRAMMAR_COST = 5;
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [grammarCreditBalance, setGrammarCreditBalance] = useState(null);
  const [grammarCreditLoading, setGrammarCreditLoading] = useState(false);
  const [preGrammarContent, setPreGrammarContent] = useState(null); // for undo
  const [showUndoBar, setShowUndoBar] = useState(false);

  // Step 2: Details
  const [formData, setFormData] = useState({ format: "feature", formatOther: "", primaryGenre: "", logline: "", synopsis: "", writer: "", companyName: "" });

  // File Upload State
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [trailerFile, setTrailerFile] = useState(null);
  const [trailerPreviewUrl, setTrailerPreviewUrl] = useState("");
  const [trailerMeta, setTrailerMeta] = useState(null);
  const [trailerMetaLoading, setTrailerMetaLoading] = useState(false);
  const thumbnailInputRef = useRef(null);
  const trailerInputRef = useRef(null);
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
  const renderPageMarkers = () => Array.from({ length: Math.max(estimatedPages, 1) }, (_, pageIndex) => (
    <div
      key={pageIndex}
      className="absolute left-3 flex items-center justify-center max-[1200px]:hidden"
      style={{ top: pageIndex * 1122 + 48, height: 28 }}
    >
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dark ? "bg-[#0d1520] text-gray-600 border border-[#182840]" : "bg-white text-gray-400 border border-gray-300 shadow-sm"}`}>
        {pageIndex + 1}
      </span>
    </div>
  ));
  const [tagsInput, setTagsInput] = useState("");
  const [roles, setRoles] = useState([]);

  // Step 3: Classification
  const [classification, setClassification] = useState({ tones: [], themes: [], settings: [] });

  // Step 4: Services & Legal
  const [services, setServices] = useState({ hosting: true, evaluation: false, aiTrailer: false, spotlight: false });
  const [legal, setLegal] = useState({ agreedToTerms: false, customInvestorTerms: "" });
  const [rightsLicensing, setRightsLicensing] = useState(() => createDefaultRightsLicensing());
  const [creditsBalance, setCreditsBalance] = useState(0);

  // Step 4: Script pricing
  const BUYER_COMMISSION_RATE = 0.05; // 5%
  const [isPremium, setIsPremium] = useState(false);
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

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle, Color, Underline,
      Placeholder.configure({ placeholder: "Start writing your script here...  e.g.  INT. LIVING ROOM - DAY" }),
    ],
    editorProps: { attributes: { class: `prose max-w-none focus:outline-none min-h-[1056px] px-16 max-[1200px]:px-10 py-14 max-[1200px]:py-12 max-[640px]:px-6 max-[520px]:px-4 max-[420px]:px-3 max-[640px]:py-10 text-[15px] max-[520px]:text-[14px] leading-[1.65] ${dark ? "prose-invert" : ""}` } },
    onUpdate: ({ editor }) => {
      const t = editor.getText();
      setWordCount(t.split(/\s+/).filter(Boolean).length);
      setCharCount(t.length);
      setSaved(false);
    },
  });

  // Fetch credits
  useEffect(() => {
    if (user) api.get("/credits/balance").then(({ data }) => setCreditsBalance(data.balance || 0)).catch(() => { });
  }, [user]);

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
      setTitle(data.title || ""); setScriptId(data._id);
      if (editor && data.textContent) editor.commands.setContent(data.textContent);
      if (data.format) setFormData(f => ({ ...f, format: data.format }));
      if (data.formatOther !== undefined) setFormData(f => ({ ...f, formatOther: data.formatOther || "" }));
      if (data.pageCount) setFormData(f => ({ ...f, pageCount: String(data.pageCount) }));
      if (data.classification?.primaryGenre || data.genre) setFormData(f => ({ ...f, primaryGenre: data.classification?.primaryGenre || data.genre || "" }));
      if (data.companyName !== undefined) setFormData(f => ({ ...f, companyName: data.companyName || "" }));
      if (data.logline) setFormData(f => ({ ...f, logline: data.logline }));
      if (data.synopsis) setFormData(f => ({ ...f, synopsis: data.synopsis }));
      else if (data.description) setFormData(f => ({ ...f, synopsis: data.description }));
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
      setLegal((prev) => ({
        ...prev,
        agreedToTerms: Boolean(data?.legal?.agreedToTerms),
        customInvestorTerms: data?.legal?.customInvestorTerms || "",
      }));
      setRightsLicensing(normalizeRightsLicensingState(data?.rightsLicensing || {}));
      lastDraftSignatureRef.current = `${(data.title || "Untitled Draft").trim()}::${String(data.textContent || "").length}:${String(data.textContent || "").slice(0, 120)}:${String(data.textContent || "").slice(-120)}`;
      setSaved(true);
      setShowDrafts(false);
    } catch { }
  }, [editor]);
  useEffect(() => { if (draftId && editor) loadDraft(draftId); }, [draftId, editor, loadDraft]);

  const buildDraftPayload = useCallback(() => {
    if (!editor) return null;
    return {
      title: title?.trim() ? title.trim() : "Untitled Draft",
      textContent: editor.getHTML(),
      companyName: String(formData.companyName || "").trim(),
      legal: {
        agreedToTerms: Boolean(legal.agreedToTerms),
        termsVersion: SCRIPT_UPLOAD_TERMS_VERSION,
        customInvestorTerms: String(legal.customInvestorTerms || "").trim(),
      },
      rightsLicensing: buildRightsPayload(),
      ...(scriptId ? { scriptId } : {}),
    };
  }, [buildRightsPayload, editor, formData.companyName, legal.agreedToTerms, legal.customInvestorTerms, scriptId, title]);

  const getDraftSignature = useCallback((payload) => {
    if (!payload) return "";
    const html = String(payload.textContent || "");
    return `${payload.title || ""}::${String(payload.companyName || "")}::${html.length}:${html.slice(0, 120)}:${html.slice(-120)}`;
  }, []);

  const hasMeaningfulDraft = useCallback((payload) => {
    if (!payload) return false;
    const htmlText = String(payload.textContent || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return Boolean((payload.title || "").trim() || htmlText.length >= 10);
  }, []);

  const queueKeepaliveDraftSave = useCallback((reason = "close") => {
    const payload = buildDraftPayload();
    if (!hasMeaningfulDraft(payload)) return false;

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
  }, [buildDraftPayload, getDraftSignature, hasMeaningfulDraft]);

  // Save draft
  const handleSave = useCallback(async (auto = false) => {
    if (!editor) return;
    if (auto && autoSaveInFlightRef.current) return;

    const payload = buildDraftPayload();
    if (!hasMeaningfulDraft(payload)) return;

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
      setScriptId(data._id);
      setSaved(true);
      setLastSaved(new Date());
      lastDraftSignatureRef.current = signature;
      if (!auto) fetchDrafts();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      if (auto) {
        autoSaveInFlightRef.current = false;
      } else {
        setSaving(false);
      }
    }
  }, [buildDraftPayload, editor, fetchDrafts, getDraftSignature, hasMeaningfulDraft]);

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
    setIsPremium(false);
    setScriptPrice(10);
    setThumbnailFile(null);
    setTrailerFile(null);
    setTrailerMeta(null);
    setFormData({
      format: "feature",
      formatOther: "",
      primaryGenre: "",
      logline: "",
      synopsis: "",
      writer: "",
      companyName: "",
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

  // Save draft when user closes tab, switches away, or navigates away.
  useEffect(() => {
    if (!editor) return;

    const handleBeforeUnload = (event) => {
      const queued = queueKeepaliveDraftSave("beforeunload");
      if (!queued) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePageHide = () => {
      queueKeepaliveDraftSave("pagehide");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        queueKeepaliveDraftSave("hidden");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      queueKeepaliveDraftSave("unmount");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [editor, queueKeepaliveDraftSave]);

  // Delete draft
  const handleDeleteDraft = async (id) => {
    try {
      await api.delete(`/scripts/${id}`); setDrafts(p => p.filter(d => d._id !== id));
      if (scriptId === id) { setScriptId(null); setTitle(""); editor?.commands.clearContent(); }
    } catch { }
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
    const { name, value } = e.target;
    setFormData((f) => {
      if (name === "format") {
        return {
          ...f,
          format: value,
          formatOther: value === "other" ? f.formatOther : "",
        };
      }
      return { ...f, [name]: value };
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
  const calculateTotal = () =>
    (services.evaluation ? SERVICE_PRICES.evaluation : 0)
    + (services.aiTrailer ? SERVICE_PRICES.aiTrailer : 0)
    + (services.spotlight ? SERVICE_PRICES.spotlight : 0);
  const totalServiceCost = calculateTotal();
  const selectedPublishServices = [
    { key: "hosting", name: "Hosting & Discovery", price: 0, enabled: true, desc: "Listed in the marketplace for discovery" },
    { key: "spotlight", name: "Activate Spotlight", price: SERVICE_PRICES.spotlight, enabled: services.spotlight, desc: "Priority visibility boost in marketplace placements" },
    { key: "aiTrailer", name: "AI Concept Trailer", price: SERVICE_PRICES.aiTrailer, enabled: services.aiTrailer, desc: "60-second cinematic concept trailer" },
    { key: "evaluation", name: "Professional Evaluation", price: SERVICE_PRICES.evaluation, enabled: services.evaluation, desc: "Scorecard and editorial coverage from a vetted reader" },
  ];
  const paidPublishServices = selectedPublishServices.filter((item) => item.enabled && item.price > 0);
  const creditsAfterPublish = creditsBalance - totalServiceCost;
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
      detail: isPremium ? "Premium reader purchase model" : "Public free access model",
      type: "Revenue Setting",
      amount: isPremium ? formatCurrency(effectivePrice) : "Free",
    },
    {
      item: `Platform Commission (${Math.round(BUYER_COMMISSION_RATE * 100)}%)`,
      detail: isPremium ? "Added on top of the script access fee at checkout" : "No commission on free access",
      type: "Platform Commission",
      amount: isPremium ? formatCurrency(buyerCommissionAmount) : formatCurrency(0),
    },
    {
      item: "Optional Services",
      detail: paidPublishServices.length > 0 ? `${paidPublishServices.length} paid add-on${paidPublishServices.length === 1 ? "" : "s"} selected` : "No paid add-ons selected",
      type: "Credit Charge",
      amount: `${totalServiceCost} cr`,
    },
    {
      item: "Film Industry Professional Pays at Checkout",
      detail: isPremium ? "Script fee + platform commission" : "Not applicable for free access",
      type: "Checkout Total",
      amount: isPremium ? formatCurrency(buyerTotalPayable) : formatCurrency(0),
    },
    {
      item: "Projected Writer Payout",
      detail: isPremium ? "Writer receives full script access fee" : "No payout on free access",
      type: "Future Earnings",
      amount: isPremium ? formatCurrency(writerPayout) : formatCurrency(0),
    },
  ];

  const publishReviewItems = [
    {
      label: "Format",
      value:
        formData.format === "other"
          ? (String(formData.formatOther || "").trim() || "Other")
          : (formats.find((item) => item.value === formData.format)?.label || "Not selected"),
    },
    { label: "Primary Genre", value: formData.primaryGenre || "Not selected" },
    { label: "Estimated Pages", value: `${estimatedPages} pages` },
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
      if (!editor || editor.getText().trim().length < 10) { setError("Please write at least a few lines of content."); return false; }
      return true;
    }
    if (s === 2) {
      if (!formData.format) { setError("Format is required."); return false; }
      if (formData.format === "other" && !String(formData.formatOther || "").trim()) {
        setError("Please specify the format when selecting Other.");
        return false;
      }
      if (!formData.primaryGenre) { setError("Primary genre is required."); return false; }
      if (formData.logline && formData.logline.length > 50) { setError("Logline must be 50 chars or less."); return false; }
      if (!formData.synopsis || !formData.synopsis.trim()) { setError("Synopsis is required."); return false; }
      const ageRangeError = getInvalidRoleAgeRangeMessage();
      if (ageRangeError) { setError(ageRangeError); return false; }
      return true;
    }
    if (s === 3) return true;
    if (s === 4) {
      const rightsError = getRightsValidationMessage(buildRightsPayload());
      if (rightsError) {
        setError(rightsError);
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
      if (!legal.agreedToTerms) { setError("You must agree to the terms."); return false; }
      if (String(legal.customInvestorTerms || "").trim().length > MAX_CUSTOM_INVESTOR_TERMS_LENGTH) {
        setError(`Custom investor terms cannot exceed ${MAX_CUSTOM_INVESTOR_TERMS_LENGTH} characters.`);
        return false;
      }
      return true;
    }
    return true;
  };
  const handleNext = () => { if (validateStep(step) && step < 5) { setStep(step + 1); setError(""); } };
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
    if (!validateStep(5)) return;
    const ageRangeError = getInvalidRoleAgeRangeMessage();
    if (ageRangeError) { setError(ageRangeError); return; }
    const creditsNeeded = calculateTotal();
    if (creditsNeeded > creditsBalance) { setError(`Insufficient credits. Need ${creditsNeeded} but have ${creditsBalance}.`); return; }
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
        contentType: getContentTypeFromFormat(formData.format),
        formatOther: formData.format === "other" ? String(formData.formatOther || "").trim() : "",
        pageCount: estimatedPages, textContent: editor.getHTML(), tags: tagsArr,
        classification: { primaryGenre: formData.primaryGenre, secondaryGenre: null, tones: classification.tones, themes: classification.themes, settings: classification.settings },
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
        rightsLicensing: buildRightsPayload(),
        premium: isPremium && effectivePrice > 0,
        price: isPremium && effectivePrice > 0 ? effectivePrice : 0,
        ...(scriptId ? { scriptId } : {}),
      };
      const { data } = await api.post("/scripts/upload", payload);
      await uploadSelectedProjectMedia(data?._id);
      await downloadSubmissionSummaryPdf(data?._id, title);

      clearLocalWorkingDraft();
      openUnderReviewModal("/dashboard");
    } catch (err) { setError(err.response?.data?.message || err.message || "Failed to publish."); } finally { setLoading(false); }
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

  // Fetch credits for grammar modal
  const fetchGrammarCredits = useCallback(async () => {
    setGrammarCreditLoading(true);
    try {
      const { data } = await api.get("/credits/balance");
      setGrammarCreditBalance(data.balance || 0);
    } catch {
      setGrammarCreditBalance(0);
    } finally {
      setGrammarCreditLoading(false);
    }
  }, []);

  // Click "Fix Grammar" - show credit confirmation first
  const handleGrammarClick = () => {
    if (!editor) return;
    const plainText = editor.getText().trim();
    if (!plainText || plainText.length < 10) {
      setError("Write some script text before running grammar correction.");
      return;
    }
    fetchGrammarCredits();
    setShowGrammarModal(true);
  };

  // Confirmed - actually run grammar fix
  const handleFixGrammar = async () => {
    setShowGrammarModal(false);
    if (!editor) return;
    const plainText = editor.getText().trim();
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
      // Refresh balance
      api.get("/credits/balance").then(({ data: d }) => {
        setCreditsBalance(d.balance || 0);
        setGrammarCreditBalance(d.balance || 0);
      }).catch(() => {});
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to correct script text.";
      // If credit error, show modal again
      if (err.response?.status === 402) {
        setGrammarCreditBalance(err.response.data?.balance ?? 0);
        setShowGrammarModal(true);
      }
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

  // Styling helpers
  const cardCls = `rounded-2xl border backdrop-blur-sm ${dark ? "bg-[#0d1520]/80 border-[#182840]" : "bg-white/90 border-gray-200 shadow-sm"}`;
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none ${dark
    ? "bg-white/[0.04] border border-[#1d3350] text-gray-100 placeholder:text-gray-600 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/30"
    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#1e3a5f]/50 focus:ring-1 focus:ring-[#1e3a5f]/10"}`;
  const chipCls = (sel) => `px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${sel
    ? dark ? "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20" : "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20"
    : dark ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] border border-[#1d3350]" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`;

  return (
    <div className="max-w-5xl mx-auto px-4 max-[768px]:px-2.5 max-[420px]:px-1.5 py-4 overflow-x-hidden">
      {/* -- Header -------------------------------- */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className={`p-2 rounded-xl transition ${dark ? "hover:bg-white/[0.06] text-gray-400" : "hover:bg-gray-100 text-gray-400"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>Create Project</h1>
              <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Write, classify, and publish your script - all in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-2 max-[640px]:w-full max-[640px]:flex-wrap max-[640px]:justify-between max-[380px]:gap-1.5">
            <button onClick={() => setShowDrafts(!showDrafts)}
              className={`flex items-center gap-2 px-4 max-[380px]:px-3 py-2 max-[380px]:py-1.5 rounded-xl text-xs font-semibold border transition-all ${dark
                ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              Drafts {drafts.length > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${dark ? "bg-white/[0.08]" : "bg-gray-100"}`}>{drafts.length}</span>}
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
                <button onClick={() => { setScriptId(null); setTitle(""); editor?.commands.clearContent(); clearLocalWorkingDraft(); setShowDrafts(false); setStep(1); }}
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
      {showGrammarModal && createPortal(
        <AnimatePresence>
          <motion.div
            key="grammar-modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowGrammarModal(false)}
          >
            <motion.div
              key="grammar-modal"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${
                dark
                  ? "bg-[#0a1120] border border-white/[0.08]"
                  : "bg-white border border-gray-200"
              }`}
            >
              {/* Header */}
              <div className={`px-6 pt-6 pb-4 border-b ${
                dark ? "border-white/[0.06]" : "border-gray-100"
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    dark
                      ? "bg-gradient-to-br from-emerald-500/15 to-teal-600/15 border border-emerald-500/20"
                      : "bg-emerald-50 border border-emerald-200"
                  }`}>
                    <span className="text-xs font-bold">AI</span>
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${
                      dark ? "text-white" : "text-gray-900"
                    }`}>AI Grammar Fix</h3>
                    <p className={`text-[11px] ${
                      dark ? "text-neutral-500" : "text-gray-400"
                    }`}>Powered by Gemini AI</p>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${
                  dark ? "text-neutral-400" : "text-gray-500"
                }`}>
                  Fix grammar, spelling, punctuation, and readability with professional AI proofreading.
                </p>
              </div>

              {/* Credit info */}
              <div className="px-6 py-5 space-y-3">
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                  dark ? "bg-white/[0.03] border border-white/[0.05]" : "bg-gray-50 border border-gray-100"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">₹</span>
                    <span className={`text-xs font-medium ${
                      dark ? "text-neutral-300" : "text-gray-600"
                    }`}>Cost</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    dark ? "text-amber-300" : "text-amber-600"
                  }`}>{GRAMMAR_COST} credits</span>
                </div>

                <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                  dark ? "bg-white/[0.03] border border-white/[0.05]" : "bg-gray-50 border border-gray-100"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">CR</span>
                    <span className={`text-xs font-medium ${
                      dark ? "text-neutral-300" : "text-gray-600"
                    }`}>Your Balance</span>
                  </div>
                  {grammarCreditLoading ? (
                    <span className={`text-xs ${
                      dark ? "text-neutral-500" : "text-gray-400"
                    }`}>Loading...</span>
                  ) : (
                    <span className={`text-sm font-bold ${
                      grammarCreditBalance >= GRAMMAR_COST
                        ? dark ? "text-emerald-400" : "text-emerald-600"
                        : "text-red-400"
                    }`}>
                      {grammarCreditBalance ?? "-"} credits
                    </span>
                  )}
                </div>

                {!grammarCreditLoading && grammarCreditBalance !== null && grammarCreditBalance < GRAMMAR_COST && (
                  <div className={`px-4 py-3 rounded-xl ${
                    dark ? "bg-red-500/10 border border-red-500/15" : "bg-red-50 border border-red-100"
                  }`}>
                    <p className={`text-xs leading-relaxed ${
                      dark ? "text-red-300" : "text-red-600"
                    }`}>
                      Not enough credits. You need {GRAMMAR_COST - grammarCreditBalance} more credit{GRAMMAR_COST - grammarCreditBalance > 1 ? "s" : ""} to use this feature.
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGrammarModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    dark
                      ? "bg-white/[0.04] border border-white/[0.06] text-neutral-400 hover:bg-white/[0.08] hover:text-white"
                      : "bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFixGrammar}
                  disabled={grammarCreditLoading || grammarCreditBalance === null || grammarCreditBalance < GRAMMAR_COST}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                    dark
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-emerald-200"
                  }`}
                >
                  Pay {GRAMMAR_COST} Credits & Fix
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

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
                  <span className={`text-[10px] ${
                    dark ? "text-neutral-500" : "text-gray-400"
                  }`}>- {GRAMMAR_COST} credits used</span>
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
            className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="flex items-center gap-2 shrink-0 max-[860px]:w-full max-[860px]:grid max-[860px]:grid-cols-3 max-[860px]:gap-2 max-[419px]:grid-cols-1 max-[380px]:gap-1.5">
                  {saving && <span className={`flex items-center gap-1.5 text-xs max-[860px]:col-span-3 max-[419px]:col-span-1 ${dark ? "text-gray-500" : "text-gray-400"}`}><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Saving...</span>}
                  {saved && !saving && <span className={`flex items-center gap-1 text-xs max-[860px]:col-span-3 max-[419px]:col-span-1 ${dark ? "text-emerald-400" : "text-emerald-600"}`}><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Saved</span>}
                  <button onClick={() => handleSave(false)} disabled={saving}
                    className={`px-3 py-1.5 max-[520px]:py-2 rounded-lg text-xs font-semibold border transition max-[860px]:w-full ${dark ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06] hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                    Save Draft
                  </button>
                  <button
                    onClick={handleDownloadMainContentPdf}
                    disabled={saving}
                    className={`px-3 py-1.5 max-[520px]:py-2 rounded-lg text-xs font-semibold border transition max-[860px]:w-full ${dark ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06] hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                  >
                    Download PDF
                  </button>
                  <button onClick={handleGrammarClick} disabled={grammarLoading || saving}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 max-[520px]:py-2 rounded-lg text-xs font-bold border transition disabled:opacity-40 max-[860px]:w-full ${dark ? "border-emerald-500/25 text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}>
                    {grammarLoading ? <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Fixing...</> : <>AI Fix Grammar <span className={`text-[9px] px-1 py-0.5 rounded ${dark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600"}`}>{GRAMMAR_COST}cr</span></>}
                  </button>
                </div>
              </div>

              {/* -- Toolbar -- */}
              <EditorToolbar editor={editor} dark={dark} />

              {/* -- Page Gutter + Document Canvas -- */}
              <div className={`relative overflow-y-auto overflow-x-auto max-[1200px]:overflow-x-hidden max-h-[72vh] ${dark ? "bg-[#05090f]" : "bg-[#e8eaed]"}`}
                style={{ backgroundImage: dark ? "radial-gradient(circle, #1a2a3a 1px, transparent 1px)" : "radial-gradient(circle, #c8cdd5 1px, transparent 1px)", backgroundSize: "20px 20px" }}>

                {/* Page number gutter labels */}
                <div className="sticky top-0 left-0 z-10 pointer-events-none">
                  {renderPageMarkers()}
                </div>

                {/* The actual page(s) */}
                <div className="flex flex-col items-center max-[1200px]:items-start gap-0 py-8 max-[580px]:py-4 px-14 max-[1200px]:px-2 max-[380px]:px-1">
                  <div
                    className={`relative w-full max-w-[760px] max-[1200px]:max-w-none shadow-2xl ${dark ? "bg-[#111827]" : "bg-white"}`}
                    style={{ minHeight: Math.max(estimatedPages, 1) * 1056 + "px" }}>

                    {/* Page break lines */}
                    {Array.from({ length: Math.max(estimatedPages - 1, 0) }).map((_, i) => (
                      <div key={i} style={{ position: "absolute", top: (i + 1) * 1056, left: 0, right: 0, zIndex: 5 }}>
                        <div className={`w-full flex items-center gap-3 px-4 ${dark ? "bg-[#05090f]" : "bg-[#e8eaed]"}`} style={{ height: 32 }}>
                          <div className={`flex-1 h-px ${dark ? "bg-[#1a2a3a]" : "bg-gray-300"}`} />
                          <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${dark ? "bg-[#0d1520] text-gray-600 border border-[#182840]" : "bg-white text-gray-400 border border-gray-300"}`}>
                            Page {i + 2}
                          </span>
                          <div className={`flex-1 h-px ${dark ? "bg-[#1a2a3a]" : "bg-gray-300"}`} />
                        </div>
                      </div>
                    ))}

                    {/* TipTap content */}
                    <div className={`relative z-0 ${dark
                      ? "[&_.tiptap]:text-gray-200 [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-700 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_h1]:text-white [&_.tiptap_h2]:text-gray-100 [&_.tiptap_blockquote]:border-[#1d3350] [&_.tiptap_blockquote]:text-gray-400 [&_.tiptap_code]:bg-white/[0.06] [&_.tiptap_pre]:bg-[#0a1220] [&_.tiptap_hr]:border-[#1e2a3a]"
                      : "[&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-300 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_code]:bg-gray-100 [&_.tiptap_pre]:bg-gray-50 [&_.tiptap_blockquote]:border-gray-200 [&_.tiptap_hr]:border-gray-200 [&_.tiptap]:text-gray-900"}`}>
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </div>
              </div>

              {/* -- Status Bar -- */}
              <div className={`flex items-center justify-between px-4 py-2 border-t text-[11px] ${dark ? "border-[#182840] bg-[#080f1a] text-gray-600" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
                <div className="flex items-center gap-4">
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
                    {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  {formData.format === "other" && (
                    <input
                      type="text"
                      name="formatOther"
                      value={formData.formatOther}
                      onChange={handleChange}
                      required
                      placeholder="Please specify format"
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>
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
              </div>
              {/* Format-aware page hint */}
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
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>Primary Genre *</label>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map(g => (
                    <button key={g} type="button"
                      onClick={() => setFormData(fd => ({ ...fd, primaryGenre: fd.primaryGenre === g ? "" : g }))}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${formData.primaryGenre === g
                          ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                          : dark ? "border-[#1d3350] text-gray-400 hover:border-[#2a4a6a] hover:text-gray-200" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Logline <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional, {formData.logline.length}/50)</span></label>
                <textarea name="logline" value={formData.logline} onChange={handleChange} rows={3} maxLength={50} placeholder="A one-sentence summary of your story..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Synopsis *</label>
                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="A longer synopsis of your script..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Tags <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(comma separated)</span></label>
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. heist, ensemble, twist ending" className={inputCls} />
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Role Studio</h3>
                    <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Add cast roles with demographics and creative direction. Leave blank if not casting yet.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addRole}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${dark ? "bg-white/[0.06] border-[#2a4a6a] text-blue-300 hover:bg-white/[0.1]" : "bg-white border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`}
                  >
                    + Add Role
                  </button>
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
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Select up to 3 in each category. This helps readers discover your script.</p>
              </div>
              {[{ label: "Tones", key: "tones", opts: toneOptions }, { label: "Themes", key: "themes", opts: themeOptions }, { label: "Settings", key: "settings", opts: settingOptions }].map(({ label, key, opts }) => (
                <div key={key}>
                  <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>{label} <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>({classification[key].length}/3)</span></h3>
                  <div className="flex flex-wrap gap-2">
                    {opts.map(v => <button key={v} type="button" onClick={() => toggleChip(key, v)} className={chipCls(classification[key].includes(v))}>{v}</button>)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* -- STEP 4: Publish Setup -- */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className="space-y-6">
                <div className={`${cardCls} p-4 min-[420px]:p-5 sm:p-8 space-y-5 min-[420px]:space-y-6`}>
                  <div>
                    <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Submission Setup</h2>
                    <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Choose access, set price, select services, and accept terms.</p>
                  </div>

                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 space-y-4 min-[420px]:space-y-5 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
                      <div>
                        <h3 className={`text-[15px] min-[420px]:text-base font-bold mt-0.5 ${dark ? "text-white" : "text-gray-900"}`}>Access & Monetization</h3>
                        <p className={`text-[11px] min-[420px]:text-[12px] mt-1 leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>Pick either free public access or paid premium access.</p>
                      </div>
                      <div className={`w-full min-[460px]:w-auto px-3 py-2 rounded-xl text-left min-[460px]:text-right ${dark ? "bg-white/[0.04] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${dark ? "text-gray-500" : "text-gray-400"}`}>Current Plan</p>
                        <p className={`text-sm font-bold mt-1 ${isPremium ? dark ? "text-emerald-300" : "text-emerald-700" : dark ? "text-blue-300" : "text-blue-700"}`}>{isPremium ? "Premium Access" : "Free Public Access"}</p>
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 min-[446px]:grid-cols-2 gap-2.5 min-[420px]:gap-3 p-1.5 rounded-2xl ${dark ? "bg-white/[0.04]" : "bg-white border border-gray-200"}`}>
                      <button type="button" onClick={() => setIsPremium(false)}
                        className={`text-left rounded-xl px-3.5 min-[420px]:px-4 py-3.5 min-[420px]:py-4 border transition-all ${!isPremium
                          ? dark ? "bg-[#122338] border-[#24456b] text-white shadow-lg shadow-black/20" : "bg-[#1e3a5f] border-[#1e3a5f] text-white shadow-sm"
                          : dark ? "border-transparent text-gray-400 hover:bg-white/[0.04]" : "border-transparent text-gray-600 hover:bg-gray-50"
                        }`}>
                        <div className="flex items-center gap-2 min-[420px]:gap-2.5">
                          <div className={`w-8 h-8 min-[420px]:w-9 min-[420px]:h-9 rounded-xl flex items-center justify-center ${!isPremium ? "bg-white/15" : dark ? "bg-white/[0.06]" : "bg-blue-50"}`}>
                            <svg className="w-3.5 h-3.5 min-[420px]:w-4 min-[420px]:h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                          </div>
                          <div>
                            <p className="text-[15px] min-[420px]:text-sm font-bold">Free Access</p>
                            <p className={`text-[10px] min-[420px]:text-[11px] leading-snug ${!isPremium ? "text-white/80" : dark ? "text-gray-500" : "text-gray-500"}`}>Best for reach and discovery</p>
                          </div>
                        </div>
                      </button>

                      <button type="button" onClick={() => setIsPremium(true)}
                        className={`text-left rounded-xl px-3.5 min-[420px]:px-4 py-3.5 min-[420px]:py-4 border transition-all ${isPremium
                          ? dark ? "bg-emerald-600/15 border-emerald-500/40 text-white shadow-lg shadow-black/20" : "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                          : dark ? "border-transparent text-gray-400 hover:bg-white/[0.04]" : "border-transparent text-gray-600 hover:bg-gray-50"
                        }`}>
                        <div className="flex items-center gap-2 min-[420px]:gap-2.5">
                          <div className={`w-8 h-8 min-[420px]:w-9 min-[420px]:h-9 rounded-xl flex items-center justify-center ${isPremium ? "bg-white/15" : dark ? "bg-white/[0.06]" : "bg-emerald-50"}`}>
                            <svg className="w-3.5 h-3.5 min-[420px]:w-4 min-[420px]:h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                          </div>
                          <div>
                            <p className="text-[15px] min-[420px]:text-sm font-bold">Premium Access</p>
                            <p className={`text-[10px] min-[420px]:text-[11px] leading-snug ${isPremium ? "text-white/80" : dark ? "text-gray-500" : "text-gray-500"}`}>Monetize full-script reading</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {!isPremium ? (
                      <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${dark ? "bg-blue-500/8 border border-blue-500/15" : "bg-blue-50 border border-blue-100"}`}>
                        <svg className={`w-4 h-4 mt-0.5 shrink-0 ${dark ? "text-blue-300" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                        <div>
                          <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Public discovery mode</p>
                          <p className={`text-[12px] mt-1 leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>Your script is fully readable to all users.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <div className={`rounded-xl p-4 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                            <label className={`block text-[11px] font-bold uppercase tracking-[0.14em] mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Set Price</label>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="relative w-full sm:w-40">
                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${dark ? "text-gray-400" : "text-gray-500"}`}>₹</span>
                                <input
                                  type="number" min="1" step="1"
                                  value={scriptPrice}
                                  onChange={(e) => {
                                    const normalized = String(e.target.value || "").replace(/^0+(?=\d)/, "");
                                    setScriptPrice(Number(normalized) || 0);
                                  }}
                                  placeholder="0"
                                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-bold border-2 outline-none transition-all ${dark ? "bg-white/[0.04] border-emerald-500/50 text-white focus:border-emerald-500" : "bg-white border-emerald-300 text-gray-900 focus:border-emerald-500"}`}
                                />
                              </div>
                              <p className={`text-[12px] ${dark ? "text-gray-500" : "text-gray-500"}`}>Enter any amount (minimum ₹1).</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 ${dark ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.07]"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-blue-300" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h16.5A2.25 2.25 0 0122.5 5.25V9M3.75 3l5.25 5.25m0 0L12 11.25m-3-3L6 11.25m3-3v8.25" /></svg>
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Optional Services</h3>
                        <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Select only services you want to add now.</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 min-[416px]:space-y-3">
                      {[
                        { key: "hosting", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>, name: "Hosting & Discovery", price: "FREE", desc: "Marketplace listing and public discovery", locked: true },
                        { key: "spotlight", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.75.75 0 011.04 0l1.838 1.783a.75.75 0 00.384.2l2.53.36a.75.75 0 01.607.51l.806 2.435a.75.75 0 00.286.37l2.108 1.498a.75.75 0 010 1.227l-2.108 1.498a.75.75 0 00-.286.37l-.806 2.435a.75.75 0 01-.607.51l-2.53.36a.75.75 0 00-.384.2l-1.838 1.783a.75.75 0 01-1.04 0l-1.838-1.783a.75.75 0 00-.384-.2l-2.53-.36a.75.75 0 01-.607-.51l-.806-2.435a.75.75 0 00-.286-.37L2.92 11.882a.75.75 0 010-1.227L5.028 9.157a.75.75 0 00.286-.37l.806-2.435a.75.75 0 01.607-.51l2.53-.36a.75.75 0 00.384-.2L11.48 3.5z" /></svg>, name: "Activate Spotlight", price: `${SERVICE_PRICES.spotlight} credits`, desc: "Verified badge, evaluation + trailer service, and featured top placement" },
                        { key: "aiTrailer", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>, name: "AI Concept Trailer", price: `${SERVICE_PRICES.aiTrailer} credits`, desc: "60-second cinematic teaser", badge: "BETA" },
                        { key: "evaluation", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08" /></svg>, name: "Professional Evaluation", price: `${SERVICE_PRICES.evaluation} credits`, desc: "Reader scorecard with strengths and weaknesses" },
                      ].map((service) => (
                        <button
                          key={service.key}
                          type="button"
                          onClick={() => !service.locked && setServices((current) => ({ ...current, [service.key]: !current[service.key] }))}
                          className={`w-full text-left rounded-2xl border px-3.5 min-[416px]:px-4 py-3.5 min-[416px]:py-4 transition-all ${service.locked
                            ? dark ? "border-[#22405f] bg-[#0e2032] cursor-default" : "border-blue-100 bg-blue-50/70 cursor-default"
                            : services[service.key]
                              ? dark ? "border-[#2b5d8f] bg-[#122338]" : "border-[#1e3a5f]/25 bg-[#1e3a5f]/[0.05]"
                              : dark ? "border-[#182840] hover:border-[#22405f] hover:bg-white/[0.02]" : "border-gray-200 hover:border-gray-300 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-[416px]:gap-3">
                            <div className={`w-9 h-9 min-[416px]:w-10 min-[416px]:h-10 rounded-xl flex items-center justify-center shrink-0 ${services[service.key] || service.locked ? dark ? "bg-white/[0.08] text-white" : "bg-white text-[#1e3a5f]" : dark ? "bg-white/[0.04] text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                              {service.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 min-[416px]:gap-2">
                                    <h4 className={`text-[13px] min-[416px]:text-sm font-bold leading-tight ${dark ? "text-white" : "text-gray-900"}`}>{service.name}</h4>
                                    {service.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">{service.badge}</span>}
                                    {service.locked && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dark ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-700"}`}>Included</span>}
                                  </div>
                                </div>
                                <div className="hidden min-[416px]:block text-right shrink-0">
                                  <p className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>{service.price}</p>
                                  {!service.locked && (
                                    <p className={`text-[11px] mt-1 ${services[service.key] ? dark ? "text-emerald-300" : "text-emerald-700" : dark ? "text-gray-500" : "text-gray-500"}`}>{services[service.key] ? "Selected" : "Optional"}</p>
                                  )}
                                </div>
                              </div>
                              <p className={`text-[12px] mt-1.5 leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>{service.desc}</p>
                              <div className="mt-2 min-[416px]:hidden flex items-center justify-between gap-2">
                                <p className={`text-[13px] font-bold ${dark ? "text-white" : "text-gray-900"}`}>{service.price}</p>
                                {!service.locked && (
                                  <p className={`text-[11px] ${services[service.key] ? dark ? "text-emerald-300" : "text-emerald-700" : dark ? "text-gray-500" : "text-gray-500"}`}>{services[service.key] ? "Selected" : "Optional"}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {trailerWorkflowHint && (
                      <div className={`mt-4 rounded-xl border px-3.5 py-3 ${trailerWorkflowHint.tone === "warn"
                        ? dark
                          ? "bg-amber-500/8 border-amber-400/25"
                          : "bg-amber-50 border-amber-200"
                        : trailerWorkflowHint.tone === "success"
                          ? dark
                            ? "bg-emerald-500/8 border-emerald-400/20"
                            : "bg-emerald-50 border-emerald-200"
                          : dark
                            ? "bg-blue-500/8 border-blue-400/20"
                            : "bg-blue-50 border-blue-200"
                        }`}>
                        <p className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                          {trailerWorkflowHint.title}
                        </p>
                        <p className={`text-[12px] leading-relaxed ${dark ? "text-gray-300" : "text-gray-700"}`}>
                          {trailerWorkflowHint.text}
                        </p>
                      </div>
                    )}
                  </div>

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

        {/* -- STEP 5: Final Review -- */}
        {step === 5 && (
          <motion.div key="s5" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={`${cardCls} p-6 sm:p-8 space-y-6`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Final Review</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Validate submission details, then submit your project for admin review.</p>
              </div>

              <div className={`rounded-3xl border overflow-hidden ${dark ? "border-[#223a58] bg-gradient-to-b from-[#0a1320] to-[#08111b] shadow-[0_12px_28px_rgba(2,6,23,0.35)]" : "border-gray-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]"}`}>
                <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${dark ? "border-[#1b2e46]" : "border-gray-200"}`}>
                  <div>
                    <p className={`text-[10px] font-extrabold uppercase tracking-[0.16em] ${dark ? "text-gray-400" : "text-gray-500"}`}>Invoice Preview</p>
                    <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>Calculated from your current pricing and services.</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold border ${dark ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>Auto-updating</span>
                </div>

                <div className={`max-[520px]:hidden grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_110px] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "bg-[#091525] text-gray-500 border-b border-[#1b2e46]" : "bg-gray-50 text-gray-500 border-b border-gray-200"}`}>
                  <span>Summary Item</span>
                  <span>Type</span>
                  <span className="text-right">Amount</span>
                </div>

                <div>
                  {publishSummaryRows.map((row, index) => (
                    <div key={row.item} className={`grid grid-cols-1 min-[521px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_110px] px-4 py-3.5 items-start gap-2 text-[12px] ${dark ? `${index % 2 === 0 ? "bg-white/[0.01]" : "bg-[#0b1625]"} border-b border-[#15273d] last:border-b-0` : `${index % 2 === 0 ? "bg-white" : "bg-gray-50/70"} border-b border-gray-100 last:border-b-0`}`}>
                      <div>
                        <p className={`font-semibold ${dark ? "text-gray-100" : "text-gray-800"}`}>{row.item}</p>
                        <p className={`text-[11px] mt-0.5 leading-relaxed ${dark ? "text-gray-500" : "text-gray-500"}`}>{row.detail}</p>
                      </div>
                      <div className="pt-0.5 max-[520px]:pt-0">
                        <span className={`inline-flex items-center whitespace-nowrap text-[10px] font-semibold px-2.5 py-1 rounded-full border ${row.type === "Credit Charge"
                          ? dark ? "border-blue-400/30 bg-blue-500/12 text-blue-300" : "border-blue-200 bg-blue-100 text-blue-700"
                          : row.type === "Revenue Setting"
                            ? dark ? "border-indigo-400/30 bg-indigo-500/14 text-indigo-300" : "border-indigo-200 bg-indigo-100 text-indigo-700"
                          : row.type === "Platform Commission"
                            ? dark ? "border-amber-400/30 bg-amber-500/12 text-amber-300" : "border-amber-200 bg-amber-100 text-amber-700"
                          : row.type === "Checkout Total"
                            ? dark ? "border-cyan-400/30 bg-cyan-500/12 text-cyan-300" : "border-cyan-200 bg-cyan-100 text-cyan-700"
                          : row.type === "Future Earnings"
                            ? dark ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-300" : "border-emerald-200 bg-emerald-100 text-emerald-700"
                            : dark ? "border-white/[0.16] bg-white/[0.08] text-gray-300" : "border-gray-300 bg-gray-100 text-gray-700"
                          }`}>{row.type}</span>
                      </div>
                      <p className={`text-left min-[521px]:text-right font-extrabold tabular-nums tracking-tight pt-0.5 ${dark ? "text-white" : "text-gray-900"}`}>{row.amount}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`rounded-xl px-4 py-4 ${dark ? "bg-blue-500/10 border border-blue-500/15" : "bg-blue-50 border border-blue-100"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-blue-300" : "text-blue-700"}`}>Publish Cost</p>
                  <p className={`text-xl font-black mt-1 ${totalServiceCost > creditsBalance ? "text-red-400" : dark ? "text-white" : "text-gray-900"}`}>{totalServiceCost} cr</p>
                  <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Charged from current balance</p>
                </div>
                <div className={`rounded-xl px-4 py-4 ${dark ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-emerald-50 border border-emerald-100"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-emerald-300" : "text-emerald-700"}`}>Remaining Credits</p>
                  <p className={`text-xl font-black mt-1 ${creditsAfterPublish < 0 ? "text-red-400" : dark ? "text-emerald-300" : "text-emerald-700"}`}>{creditsAfterPublish}</p>
                  <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>After this publish action</p>
                </div>
                <div className={`rounded-xl px-4 py-4 ${dark ? "bg-purple-500/10 border border-purple-500/15" : "bg-purple-50 border border-purple-100"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-purple-300" : "text-purple-700"}`}>Writer / Premium Sale</p>
                  <p className={`text-xl font-black mt-1 ${dark ? "text-white" : "text-gray-900"}`}>{isPremium ? `₹${writerPayout}` : "₹0"}</p>
                  <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Writer gets full script fee per paid purchase</p>
                </div>
              </div>

              <div className={`rounded-xl px-4 py-4 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-gray-50 border border-gray-200"}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${legal.agreedToTerms ? dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700" : dark ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                    {legal.agreedToTerms ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      "!"
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>{legal.agreedToTerms ? "Agreement confirmed" : "Agreement required"}</p>
                    <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>{legal.agreedToTerms ? "Everything is ready. You can submit for admin approval now." : "Please accept the submission agreement to continue."}</p>
                    {!legal.agreedToTerms && (
                      <label className="flex items-start gap-2.5 cursor-pointer mt-3">
                        <input
                          type="checkbox"
                          checked={legal.agreedToTerms}
                          onChange={e => setLegal((prev) => ({ ...prev, agreedToTerms: e.target.checked }))}
                          className="w-4 h-4 rounded mt-0.5 accent-[#1e3a5f]"
                        />
                        <span className={`text-[11px] leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
                          I agree to the Script Upload Terms & Conditions (v{SCRIPT_UPLOAD_TERMS_VERSION}) and confirm publishing rights.
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={handlePublish} disabled={loading || !legal.agreedToTerms}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1e3a5f] hover:bg-[#162d4a] text-white shadow-md">
                {loading ? "Submitting..." : "Submit for Approval"}
              </button>
              <p className={`text-[11px] text-center ${dark ? "text-gray-500" : "text-gray-400"}`}>Submitting will send your project for admin approval with the current pricing and services.</p>
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
          {step < 5 && (
            <button onClick={handleNext}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${dark
                ? "bg-[#1e3a5f] text-white hover:bg-[#2a4a70] shadow-lg shadow-[#1e3a5f]/20"
                : "bg-[#1e3a5f] text-white hover:bg-[#162d4a] shadow-lg shadow-[#1e3a5f]/20"}`}>
              Next -
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CreateProject;



