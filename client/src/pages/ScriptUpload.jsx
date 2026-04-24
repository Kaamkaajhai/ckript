import { useState, useContext, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Cropper from "react-easy-crop";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import { formatCurrency } from "../utils/currency";
import { getScriptCanonicalPath } from "../utils/scriptPath";
import { SCRIPT_UPLOAD_TERMS_TEXT, SCRIPT_UPLOAD_TERMS_VERSION } from "../constants/scriptUploadTerms";

// Format options
const formats = [
  { value: "feature", label: "Feature" },
  { value: "tv_1hour", label: "TV 1hr" },
  { value: "tv_halfhour", label: "TV 1/2hr" },
  { value: "short", label: "Short" },
  { value: "web_series", label: "Web Series" },
  { value: "drama_school", label: "Drama School" },
  { value: "anime", label: "Anime" },
  { value: "movie", label: "Movie" },
  { value: "tv_serial", label: "TV Serial" },
  { value: "cartoon", label: "Cartoon" },
  { value: "limited_series", label: "Limited Series" },
  { value: "documentary", label: "Documentary" },
  { value: "songs", label: "Songs" },
  { value: "standup_comedy", label: "Standup Comedy" },
  { value: "dialogues", label: "Dialogues" },
  { value: "poet", label: "Poet" },
  { value: "other", label: "Other" },
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

const FORMAT_PAGE_RANGES = {
  feature: { min: 70, max: 180, typical: "90-120", label: "Feature" },
  tv_1hour: { min: 45, max: 75, typical: "50-65", label: "TV 1-Hour" },
  tv_halfhour: { min: 22, max: 45, typical: "25-35", label: "TV Half-Hour" },
  short: { min: 1, max: 40, typical: "5-25", label: "Short" },
  web_series: { min: 20, max: 80, typical: "25-45", label: "Web Series" },
  drama_school: { min: 10, max: 60, typical: "15-35", label: "Drama School" },
  anime: { min: 18, max: 65, typical: "22-45", label: "Anime" },
  movie: { min: 70, max: 180, typical: "90-120", label: "Movie" },
  tv_serial: { min: 18, max: 50, typical: "20-35", label: "TV Serial" },
  cartoon: { min: 7, max: 45, typical: "10-25", label: "Cartoon" },
  limited_series: { min: 45, max: 75, typical: "50-65", label: "Limited Series" },
  documentary: { min: 60, max: 120, typical: "70-100", label: "Documentary" },
  songs: { min: 1, max: 30, typical: "2-10", label: "Songs" },
  standup_comedy: { min: 3, max: 50, typical: "8-20", label: "Standup Comedy" },
  dialogues: { min: 1, max: 80, typical: "5-25", label: "Dialogues" },
  poet: { min: 1, max: 60, typical: "3-20", label: "Poet" },
  other: { min: 1, max: 250, typical: "Varies", label: "Other" },
};

const getPageCountWarning = (format, pageCountValue) => {
  const range = FORMAT_PAGE_RANGES[format];
  const pageCount = Number(pageCountValue);

  if (!range || !Number.isFinite(pageCount) || pageCount <= 0) {
    return "";
  }

  if (pageCount < range.min) {
    return `${range.label} scripts are usually ${range.min}+ pages (typical ${range.typical}). You can continue, but this may feel short for the format.`;
  }

  if (pageCount > range.max) {
    return `${range.label} scripts are usually under ${range.max} pages (typical ${range.typical}). You can continue, but this may feel long for the format.`;
  }

  return "";
};

// Genre options
const genres = [
  "Action", "Adventure", "Animation", "Anime", "Art/Foreign", "Biographical",
  "Children/Family", "Comedy", "Coming of Age", "Crime", "Dark Comedy", "Documentary",
  "Drama", "Erotic", "Espionage", "Faith/Spirituality", "Family", "Fantasy",
  "Film Noir", "Historical", "Horror", "Indie", "Legal", "Martial Arts",
  "Medical", "Mockumentary", "Musical", "Mystery", "Noir", "Political",
  "Psychological", "Romance", "Romantic Comedy", "Satire", "Sci-Fi", "Short Film",
  "Slice of Life", "Sports", "Steampunk", "Superhero", "Supernatural", "Suspense",
  "Teen", "Thriller", "True Crime", "War", "Western", "Zombie"
];

// Classification options
const toneOptions = [
  "Absurdist", "Atmospheric", "Bleak", "Cerebral", "Claustrophobic", "Campy",
  "Cynical", "Dark", "Dreamlike", "Edgy", "Epic", "Fast-paced", "Gritty",
  "Heartwarming", "Hopeful", "Intense", "Irreverent", "Lighthearted",
  "Melancholic", "Mind-bending", "Noir", "Nostalgic", "Poetic", "Provocative",
  "Quirky", "Raw", "Romantic", "Satirical", "Sensual", "Slow-burn", "Surreal",
  "Suspenseful", "Tense", "Tragic", "Uplifting", "Whimsical"
];

const themeOptions = [
  "Abandonment", "Addiction", "Alienation", "Ambition", "Betrayal", "Brotherhood",
  "Capitalism", "Chosen One", "Class Struggle", "Colonialism", "Coming of Age",
  "Corruption", "Revenge", "Redemption", "Love Triangle", "Family Drama",
  "Social Justice", "Identity Crisis", "Survival", "Power Struggle",
  "Forbidden Love", "Loss & Grief", "Good vs Evil", "Man vs Nature",
  "Isolation", "Second Chance", "Underdog Story", "Fish Out of Water",
  "Quest", "Transformation", "Sacrifice", "Justice", "Freedom", "Mental Illness",
  "Existentialism", "Fate vs Free Will", "Man vs Technology", "War & Peace", "Grief", "Hope"
];

const settingOptions = [
  "Ancient", "Cyberpunk", "Contemporary", "Deep Space", "Desert", "Dystopian",
  "Future", "Haunted House", "Historical", "Hospital", "Jungle", "Medieval",
  "Military Base", "Ocean/Sea", "Post-Apocalyptic", "Prison", "Rural",
  "School/College", "Small Town", "Big City", "Space", "Suburban",
  "Alternate Reality", "Virtual Reality", "Underground", "Wilderness",
  "Wild West", "Victorian Era", "World War I", "World War II", "Secret Facility",
  "New York", "Isolated", "Los Angeles"
];
const ROLE_GENDER_OPTIONS = ["Any", "Female", "Male", "Non-binary", "Other"];

// Service pricing (in credits)
const SERVICE_PRICES = {
  hosting: 0, // Free
  evaluation: 50, // 50 credits for AI evaluation
  aiTrailer: 120, // 120 credits for AI trailer
  spotlight: 310, // 310 credits for spotlight activation
};

const THUMBNAIL_ASPECT = 3 / 4;
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
const MAX_TRAILER_SIZE = 250 * 1024 * 1024;
const MAX_PDF_SIZE = 30 * 1024 * 1024;
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

const getCroppedThumbnailBlob = async (imageSrc, pixelCrop, rotation = 0) => {
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
    cropCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
};

const STEPS = [
  { num: 1, label: "Basics", shortLabel: "Basic", desc: "Essentials" },
  { num: 2, label: "Classify", shortLabel: "Class", desc: "Tags & tone" },
  { num: 3, label: "Upload", shortLabel: "Upload", desc: "Files" },
  { num: 4, label: "Publish", shortLabel: "Publish", desc: "Plan & pricing" },
  { num: 5, label: "Review", shortLabel: "Review", desc: "Legal & checkout" },
];

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

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const ScriptUpload = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
  const editId = searchParams.get("edit");
  const [step, setStep] = useState(1);
  const [fromDraft, setFromDraft] = useState(false);
  const [scriptId, setScriptId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [agreementScrolled, setAgreementScrolled] = useState(true);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const agreementRef = useRef(null);
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const trailerInputRef = useRef(null);
  const reviewRedirectTimerRef = useRef(null);

  // Thumbnail and Trailer states
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [trailerFile, setTrailerFile] = useState(null);
  const [trailerOption, setTrailerOption] = useState("none"); // "none", "ai", "upload"
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [trailerPreviewUrl, setTrailerPreviewUrl] = useState("");
  const [trailerMeta, setTrailerMeta] = useState(null);
  const [trailerMetaLoading, setTrailerMetaLoading] = useState(false);
  const [thumbnailSourceName, setThumbnailSourceName] = useState("thumbnail");
  const [isThumbnailEditorOpen, setIsThumbnailEditorOpen] = useState(false);
  const [thumbnailSourceUrl, setThumbnailSourceUrl] = useState("");
  const [thumbnailCrop, setThumbnailCrop] = useState({ x: 0, y: 0 });
  const [thumbnailZoom, setThumbnailZoom] = useState(1);
  const [thumbnailRotation, setThumbnailRotation] = useState(0);
  const [thumbnailCropPixels, setThumbnailCropPixels] = useState(null);
  const [thumbnailApplying, setThumbnailApplying] = useState(false);
  const [showUnderReviewModal, setShowUnderReviewModal] = useState(false);
  const [postSubmitRedirectPath, setPostSubmitRedirectPath] = useState("/dashboard");

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    format: "feature",
    formatOther: "",
    pageCount: "",
    primaryGenre: "",
    logline: "",
    synopsis: "",
  });

  // Classification data
  const [classification, setClassification] = useState({
    tones: [],
    themes: [],
    settings: [],
  });

  // Services data
  const [services, setServices] = useState({
    hosting: true,
    evaluation: false,
    aiTrailer: false,
    spotlight: false,
  });

  // Legal data
  const [legal, setLegal] = useState({
    agreedToTerms: false,
    customInvestorTerms: "",
  });
  const [rightsLicensing, setRightsLicensing] = useState(() => createDefaultRightsLicensing());

  // Tags as comma-separated input
  const [tagsInput, setTagsInput] = useState("");
  const [roles, setRoles] = useState([]);

  // Script pricing
  const PRICE_PRESETS = [5, 10, 15, 25, 50];
  const BUYER_COMMISSION_RATE = 0.05;
  const [isPremium, setIsPremium] = useState(false);
  const [scriptPrice, setScriptPrice] = useState(10);
  const [customPriceInput, setCustomPriceInput] = useState("");
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const effectivePrice = isPremium ? (useCustomPrice ? Number(customPriceInput) || 0 : scriptPrice) : 0;
  const buyerCommissionAmount = Math.round(effectivePrice * BUYER_COMMISSION_RATE * 100) / 100;
  const buyerTotalPayable = Math.round((effectivePrice + buyerCommissionAmount) * 100) / 100;
  const writerPayout = Math.round(effectivePrice * 100) / 100;
  const FORMAT_PRICE_GUIDE = {
    feature:      { label: "Feature Film",  min: 15, max: 50, suggest: 25 },
    tv_1hour:     { label: "TV 1-Hour",     min: 10, max: 30, suggest: 15 },
    tv_halfhour:  { label: "TV Half-Hour",  min: 5,  max: 20, suggest: 10 },
    short:        { label: "Short Film",    min: 5,  max: 15, suggest: 5  },
    web_series:   { label: "Web Series",    min: 8,  max: 35, suggest: 15 },
    drama_school: { label: "Drama School",  min: 5,  max: 20, suggest: 10 },
    anime:        { label: "Anime",         min: 8,  max: 35, suggest: 15 },
    movie:        { label: "Movie",         min: 15, max: 50, suggest: 25 },
    tv_serial:    { label: "TV Serial",     min: 5,  max: 25, suggest: 10 },
    cartoon:      { label: "Cartoon",       min: 5,  max: 20, suggest: 10 },
    limited_series:{ label: "Limited Series", min: 10, max: 35, suggest: 15 },
    documentary:  { label: "Documentary",   min: 10, max: 40, suggest: 20 },
    songs:        { label: "Songs",         min: 5,  max: 30, suggest: 10 },
    standup_comedy:{ label: "Standup Comedy", min: 5, max: 35, suggest: 10 },
    dialogues:    { label: "Dialogues",     min: 5,  max: 25, suggest: 10 },
    poet:         { label: "Poet",          min: 5,  max: 25, suggest: 10 },
    other:        { label: "Other",         min: 5,  max: 50, suggest: 10 },
  };

  const buildRightsPayload = () => {
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
  };

  // Fetch credits balance on mount
  useEffect(() => {
    const fetchCreditsBalance = async () => {
      try {
        const { data } = await api.get("/credits/balance");
        setCreditsBalance(data.balance || 0);
      } catch {
        setCreditsBalance(0);
      }
    };
    if (user) {
      fetchCreditsBalance();
    }
  }, [user]);

  // Load existing published script when entering edit mode
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/scripts/${editId}`);
        setTextContent(data.textContent || "");
        setFormData({
          title: data.title || "",
          logline: data.logline || "",
          format: data.format || "feature",
          formatOther: data.formatOther || "",
          pageCount: data.pageCount ? String(data.pageCount) : "",
          primaryGenre: data.classification?.primaryGenre || data.primaryGenre || data.genre || "",
          synopsis: data.synopsis || data.description || "",
        });
        setTagsInput((data.tags || []).join(", "));
        setClassification({
          tones: data.classification?.tones || [],
          themes: data.classification?.themes || [],
          settings: data.classification?.settings || [],
        });
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
        setServices({
          hosting: data.services?.hosting ?? true,
          evaluation: data.services?.evaluation ?? false,
          aiTrailer: data.services?.aiTrailer ?? false,
          spotlight: data.services?.spotlight ?? false,
        });
        setLegal({
          agreedToTerms: Boolean(data?.legal?.agreedToTerms),
          customInvestorTerms: data?.legal?.customInvestorTerms || "",
        });
        setRightsLicensing(normalizeRightsLicensingState(data?.rightsLicensing || {}));
      } catch {
        // proceed normally
      }
    };
    load();
  }, [editId]);

  // Load draft when coming from Create Project editor
  useEffect(() => {
    if (!draftId) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/scripts/${draftId}`);
        setScriptId(data._id);
        setTextContent(data.textContent || "");
        setFormData((prev) => ({
          ...prev,
          title: data.title || "",
          logline: data.logline || "",
          format: data.format || "feature",
          formatOther: data.formatOther || "",
          pageCount: data.pageCount ? String(data.pageCount) : "",
          primaryGenre: data.classification?.primaryGenre || data.primaryGenre || "",
          synopsis: data.synopsis || data.description || "",
        }));
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
        setLegal((prev) => ({
          ...prev,
          agreedToTerms: Boolean(data?.legal?.agreedToTerms),
          customInvestorTerms: data?.legal?.customInvestorTerms || "",
        }));
        setRightsLicensing(normalizeRightsLicensingState(data?.rightsLicensing || {}));
        setFromDraft(true);
      } catch {
        // Draft not found, proceed normally
      }
    };
    load();
  }, [draftId]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "format") {
        return {
          ...prev,
          format: value,
          formatOther: value === "other" ? prev.formatOther : "",
        };
      }

      return { ...prev, [name]: value };
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

  const pageCountWarning = getPageCountWarning(formData.format, formData.pageCount);

  // Toggle classification chips (max 3 per category)
  const toggleClassification = (category, value) => {
    setClassification((prev) => {
      const current = prev[category] || [];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter((v) => v !== value) };
      } else if (current.length < 3) {
        return { ...prev, [category]: [...current, value] };
      } else {
        setError(`You can only select up to 3 ${category}. Please deselect one first.`);
        return prev;
      }
    });
  };

  // Handle file upload and text extraction
  const handleFileSelect = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      setError("PDF must be 30MB or smaller.");
      return;
    }

    setUploadProgress(0);
    setUploadedFile(null);
    setTextContent("");
    setIsExtracting(true);
    setError("");

    // Simulate upload progress while we process
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      // Call our new backend extraction endpoint
      const { data } = await api.post("/scripts/extract-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      clearInterval(interval);
      setUploadProgress(100);

      setUploadedFile({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      });

      // Populate the editor with extracted text
      if (data.text) {
        setTextContent(data.text);
      }
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.message || "Failed to extract text from PDF.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

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

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setError("Thumbnail must be an image under 5MB.");
      return;
    }

    setError("");
    setThumbnailSourceName(file.name || "thumbnail");
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

  // Handle thumbnail selection
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
      const croppedBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation);
      if (!croppedBlob) throw new Error("thumbnail-processing-failed");

      if (croppedBlob.size > MAX_THUMBNAIL_SIZE) {
        setError("Processed thumbnail exceeds 5MB. Reduce zoom/area and retry.");
        return;
      }

      const baseName = (thumbnailSourceName || "thumbnail").replace(/\.[^/.]+$/, "");
      const processedFile = new File([croppedBlob], `${baseName}-cover.jpg`, { type: "image/jpeg" });
      setThumbnailFile(processedFile);
      setError("");
      resetThumbnailEditor();
    } catch {
      setError("Could not process thumbnail. Please try another image.");
    } finally {
      setThumbnailApplying(false);
    }
  };

  // Handle trailer selection
  const handleTrailerSelect = (file) => {
    if (!file) return;
    
    console.log("Trailer file selected:", file.name, file.type, file.size);
    
    const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm", "video/x-m4v"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid video file (MP4, MPEG, MOV, or WebM).");
      return;
    }

    if (file.size > MAX_TRAILER_SIZE) {
      setError("Trailer must be under 250MB for high-quality upload.");
      return;
    }

    setTrailerFile(file);
    setTrailerOption("upload");
    setError("");
    console.log("Trailer file set successfully, trailerOption set to 'upload'");
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

  useEffect(() => () => {
    if (reviewRedirectTimerRef.current) {
      clearTimeout(reviewRedirectTimerRef.current);
    }
  }, []);

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

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = previewUrl;

    video.onloadedmetadata = () => {
      setTrailerMeta({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      });
      setTrailerMetaLoading(false);
    };

    video.onerror = () => {
      setTrailerMetaLoading(false);
      setTrailerMeta(null);
    };

    return () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(previewUrl);
    };
  }, [trailerFile]);

  // Handle agreement scroll
  useEffect(() => {
    if (step !== 5) return;

    const agreementElement = agreementRef.current;
    if (!agreementElement) return;

    const updateAgreementScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = agreementElement;
      const isScrollable = scrollHeight - clientHeight > 8;

      if (!isScrollable) {
        setAgreementScrolled(true);
        return;
      }

      // Allow a slightly larger threshold to avoid sub-pixel rounding issues on some devices.
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      setAgreementScrolled(distanceFromBottom <= 24);
    };

    updateAgreementScrollState();
    const rafId = window.requestAnimationFrame(updateAgreementScrollState);
    agreementElement.addEventListener("scroll", updateAgreementScrollState);
    window.addEventListener("resize", updateAgreementScrollState);

    return () => {
      window.cancelAnimationFrame(rafId);
      agreementElement.removeEventListener("scroll", updateAgreementScrollState);
      window.removeEventListener("resize", updateAgreementScrollState);
    };
  }, [step]);

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    if (services.hosting) total += SERVICE_PRICES.hosting;
    if (services.evaluation) total += SERVICE_PRICES.evaluation;
    if (trailerOption === "ai") total += SERVICE_PRICES.aiTrailer; // Use trailerOption instead
    if (services.spotlight) total += SERVICE_PRICES.spotlight;
    return total;
  };

  // Validate step
  const validateStep = (stepNum) => {
    setError("");

    switch (stepNum) {
      case 1:
        if (!formData.title) {
          setError("Title is required.");
          return false;
        }
        if (!formData.format) {
          setError("Format is required.");
          return false;
        }
        if (formData.format === "other" && !String(formData.formatOther || "").trim()) {
          setError("Please specify the format when selecting Other.");
          return false;
        }
        if (!formData.pageCount || Number(formData.pageCount) <= 0) {
          setError("Page count is required.");
          return false;
        }
        if (!formData.primaryGenre) {
          setError("Primary genre is required.");
          return false;
        }
        if (formData.logline && formData.logline.length > 50) {
          setError("Logline must be 50 characters or less.");
          return false;
        }
        if (!formData.synopsis || !formData.synopsis.trim()) {
          setError("Synopsis is required.");
          return false;
        }
        {
          const ageRangeError = getInvalidRoleAgeRangeMessage();
          if (ageRangeError) {
            setError(ageRangeError);
            return false;
          }
        }
        return true;

      case 2:
        // Step 2 is optional, but we can validate if needed
        return true;

      case 3:
        // If coming from the Create Project editor or in edit mode, content is already provided — skip validation
        if ((fromDraft || editId) && textContent.trim()) return true;
        if (!uploadedFile && !textContent.trim()) {
          setError("Please upload a PDF file to continue.");
          return false;
        }
        return true;

      case 4:
        {
          const rightsError = getRightsValidationMessage(buildRightsPayload());
          if (rightsError) {
            setError(rightsError);
            return false;
          }
        }
        return true;

      case 5:
        {
          const rightsError = getRightsValidationMessage(buildRightsPayload());
          if (rightsError) {
            setError(rightsError);
            return false;
          }
        }
        if (!legal.agreedToTerms) {
          setError("You must agree to the terms to continue.");
          return false;
        }
        if (String(legal.customInvestorTerms || "").trim().length > MAX_CUSTOM_INVESTOR_TERMS_LENGTH) {
          setError(`Custom investor terms cannot exceed ${MAX_CUSTOM_INVESTOR_TERMS_LENGTH} characters.`);
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Handle next step
  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < 5) {
      setStep(step + 1);
      setError("");
    }
  };

  // Handle back step
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  // Handle saving a draft
  const handleSaveDraft = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = {
        title: formData.title || "Untitled Draft",
        logline: formData.logline,
        synopsis: formData.synopsis,
        format: formData.format,
        contentType: getContentTypeFromFormat(formData.format),
        formatOther: formData.format === "other" ? String(formData.formatOther || "").trim() : "",
        pageCount: Number(formData.pageCount) || 0,
        textContent: textContent,
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
        classification: {
          primaryGenre: formData.primaryGenre,
          tones: classification.tones,
          themes: classification.themes,
          settings: classification.settings,
        },
        legal: {
          agreedToTerms: legal.agreedToTerms,
          termsVersion: SCRIPT_UPLOAD_TERMS_VERSION,
          customInvestorTerms: String(legal.customInvestorTerms || "").trim(),
        },
        rightsLicensing: buildRightsPayload(),
      };

      await api.post("/scripts/draft", payload);
      // We don't navigate away, just show success
      // In a real app we'd use a toast notification
      alert("Draft saved successfully! You can resume it from your dashboard.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save draft.");
    } finally {
      setLoading(false);
    }
  };

  // Handle final submission
  const openUnderReviewModal = (redirectPath) => {
    if (reviewRedirectTimerRef.current) {
      clearTimeout(reviewRedirectTimerRef.current);
    }

    setPostSubmitRedirectPath(redirectPath);
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
    navigate(postSubmitRedirectPath);
  };

  const downloadSubmissionSummaryPdf = async (targetScriptId, title) => {
    if (!targetScriptId) return;

    try {
      const response = await api.get(`/scripts/${targetScriptId}/submission-summary-pdf?download=1`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const safeTitle = String(title || "script")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "") || "script";

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeTitle}_submission_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    } catch (downloadError) {
      console.error("Failed to auto-download submission summary PDF:", downloadError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateStep(5)) return;

    // Check credits before submitting
    const creditsNeeded = calculateTotal();
    if (creditsNeeded > creditsBalance) {
      setError(`Insufficient credits. You need ${creditsNeeded} credits but have ${creditsBalance}. Please purchase more credits.`);
      return;
    }

    console.log("Starting script submission...");
    console.log("Thumbnail file:", thumbnailFile ? thumbnailFile.name : "none");
    console.log("Trailer file:", trailerFile ? trailerFile.name : "none");
    console.log("Trailer option:", trailerOption);

    setLoading(true);

    try {
      const tagsArr = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      // Build payload according to specification
      const payload = {
        title: formData.title,
        logline: formData.logline,
        synopsis: formData.synopsis,
        description: formData.synopsis,
        format: formData.format,
        contentType: getContentTypeFromFormat(formData.format),
        formatOther: formData.format === "other" ? String(formData.formatOther || "").trim() : "",
        pageCount: Number(formData.pageCount),
        textContent: textContent,
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
        tags: tagsArr,
        classification: {
          primaryGenre: formData.primaryGenre,
          secondaryGenre: null,
          tones: classification.tones,
          themes: classification.themes,
          settings: classification.settings,
        },
        // Only send scriptUrl if a real file was uploaded; skip to preserve existing fileUrl on edits
        ...(uploadedFile?.url ? { scriptUrl: uploadedFile.url } : {}),
        services: {
          hosting: services.hosting,
          evaluation: services.evaluation,
          aiTrailer: trailerOption === "ai",
          spotlight: services.spotlight,
        },
        legal: {
          agreedToTerms: legal.agreedToTerms,
          timestamp: new Date().toISOString(),
          termsVersion: SCRIPT_UPLOAD_TERMS_VERSION,
          customInvestorTerms: String(legal.customInvestorTerms || "").trim(),
        },
        rightsLicensing: buildRightsPayload(),
        premium: isPremium && effectivePrice > 0,
        price: isPremium && effectivePrice > 0 ? effectivePrice : 0,
        // If this was created via the editor, attach the draftId so the backend updates/converts it
        ...(scriptId ? { scriptId } : {}),
      };

      const uploadMediaForScript = async (targetScriptId, mode = "created") => {
        const mediaTasks = [];

        if (thumbnailFile) {
          mediaTasks.push((async () => {
            const thumbnailFormData = new FormData();
            thumbnailFormData.append("thumbnail", thumbnailFile);
            await api.post(`/scripts/${targetScriptId}/upload-thumbnail`, thumbnailFormData);
          })());
        }

        if (trailerFile && trailerOption === "upload") {
          mediaTasks.push((async () => {
            const trailerFormData = new FormData();
            trailerFormData.append("trailer", trailerFile);
            await api.post(`/scripts/${targetScriptId}/upload-trailer`, trailerFormData);
          })());
        }

        if (mediaTasks.length === 0) return;

        const results = await Promise.allSettled(mediaTasks);
        const failedCount = results.filter((r) => r.status === "rejected").length;
        if (failedCount > 0) {
          setError(`Project ${mode} but ${failedCount} media upload${failedCount > 1 ? "s" : ""} failed. You can retry from edit mode.`);
        }
      };

      if (editId) {
        await api.put(`/scripts/${editId}`, payload);
        await uploadMediaForScript(editId, "updated");
        await downloadSubmissionSummaryPdf(editId, payload.title);
        openUnderReviewModal(
          getScriptCanonicalPath({
            _id: editId,
            title: payload.title,
            creator: {
              writerProfile: { username: user?.writerProfile?.username },
              username: user?.username,
            },
          })
        );
      } else {
        const response = await api.post("/scripts/upload", payload);
        const newScriptId = response.data._id;
        await uploadMediaForScript(newScriptId, "created");
        await downloadSubmissionSummaryPdf(newScriptId, payload.title);

        // Refresh credits balance after successful upload
        const { data: creditsData } = await api.get("/credits/balance");
        setCreditsBalance(creditsData.balance || 0);
        openUnderReviewModal("/dashboard");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to upload script. Please try again.";
      setError(errorMsg);

      // If insufficient credits error, refresh balance
      if (err.response?.data?.requiresCredits) {
        try {
          const { data: creditsData } = await api.get("/credits/balance");
          setCreditsBalance(creditsData.balance || 0);
        } catch { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  };

  // Access control
  if (user?.role !== "creator") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 sm:p-10 max-w-sm text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-neutral-400">Only creators can upload scripts. Switch to a creator account.</p>
        </div>
      </div>
    );
  }

  const inputCls = isDarkMode
    ? "w-full p-2.5 border border-white/[0.08] rounded-xl text-sm text-white bg-white/[0.04] placeholder-neutral-600 focus:ring-2 focus:ring-white/30 focus:border-transparent transition"
    : "w-full p-2.5 border border-gray-200 rounded-xl text-sm text-[#1e3a5f] bg-white placeholder-gray-400 focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/50 transition";
  const chipCls = (selected) =>
    `px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer ${selected
      ? isDarkMode ? "bg-white text-black" : "bg-[#1e3a5f] text-white"
      : isDarkMode ? "bg-white/[0.08] text-neutral-300 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;
  const labelCls = isDarkMode ? "text-white" : "text-[#1e3a5f]";
  const totalServiceCost = calculateTotal();
  const creditsAfterPublish = creditsBalance - totalServiceCost;
  const selectedPublishServices = [
    { key: "hosting", label: "Hosting & Discovery", enabled: true, price: 0 },
    { key: "spotlight", label: "Activate Spotlight", enabled: services.spotlight, price: SERVICE_PRICES.spotlight },
    { key: "evaluation", label: "Professional Evaluation", enabled: services.evaluation, price: SERVICE_PRICES.evaluation },
    { key: "aiTrailer", label: "AI Concept Trailer", enabled: trailerOption === "ai", price: SERVICE_PRICES.aiTrailer },
  ];
  const paidPublishServices = selectedPublishServices.filter((item) => item.enabled && item.price > 0);
  const publishInvoiceRows = [
    {
      item: "Script Access Fee",
      type: "Revenue Setting",
      detail: isPremium ? "Premium reader purchase model" : "Public free access model",
      amount: isPremium ? formatCurrency(effectivePrice) : "Free",
    },
    {
      item: `Platform Commission (${Math.round(BUYER_COMMISSION_RATE * 100)}%)`,
      type: "Platform Commission",
      detail: isPremium ? "Added on top of the script access fee at checkout" : "No commission on free access",
      amount: isPremium ? formatCurrency(buyerCommissionAmount) : formatCurrency(0),
    },
    {
      item: "Optional Services",
      type: "Credit Charge",
      detail: paidPublishServices.length > 0 ? `${paidPublishServices.length} paid add-on${paidPublishServices.length === 1 ? "" : "s"} selected` : "No paid add-ons selected",
      amount: `${totalServiceCost} cr`,
    },
    {
      item: "Film Industry Professional Pays at Checkout",
      type: "Checkout Total",
      detail: isPremium ? "Script fee + platform commission" : "Not applicable for free access",
      amount: isPremium ? formatCurrency(buyerTotalPayable) : formatCurrency(0),
    },
    {
      item: "Projected Writer Payout",
      type: "Future Earnings",
      detail: isPremium ? "Writer receives full script access fee" : "No payout on free access",
      amount: isPremium ? formatCurrency(writerPayout) : formatCurrency(0),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 max-[640px]:px-2 max-[420px]:px-1.5 py-6 max-[640px]:py-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-[#1e3a5f]"}`}>{editId ? "Edit Your Project" : "Add Your Project"}</h1>
            <p className="text-sm text-neutral-500">{editId ? "Update your script details and republish" : "Complete the 5-step wizard to publish your script"}</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className={`mb-6 rounded-2xl border p-4 max-[640px]:p-2.5 ${isDarkMode ? "bg-[#0d1829] border-white/[0.06]" : "bg-gray-50 border-gray-200"}`}>
          {/* Mobile layout */}
          <div className="hidden max-[640px]:block">
            <div className="flex items-start justify-between gap-1">
              {STEPS.map((s) => (
                <button
                  key={`mobile-step-${s.num}`}
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`min-w-0 flex-1 flex flex-col items-center gap-1 ${s.num < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className={`w-6 h-6 max-[360px]:w-[22px] max-[360px]:h-[22px] rounded-lg flex items-center justify-center text-[10px] max-[360px]:text-[9px] font-black shrink-0 ${step === s.num
                    ? "bg-[#1e3a5f] text-white shadow-md"
                    : step > s.num
                      ? isDarkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                      : isDarkMode ? "bg-white/[0.06] text-neutral-500" : "bg-gray-200 text-gray-400"
                    }`}>
                    {step > s.num ? (
                      <svg className="w-3 h-3 max-[360px]:w-2.5 max-[360px]:h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s.num}
                  </span>
                  <span className={`text-[8px] max-[360px]:text-[7px] font-semibold leading-none truncate w-full text-center ${step === s.num
                    ? isDarkMode ? "text-white" : "text-[#1e3a5f]"
                    : step > s.num
                      ? isDarkMode ? "text-emerald-300" : "text-emerald-700"
                      : isDarkMode ? "text-neutral-500" : "text-gray-400"
                    }`}>
                    {s.shortLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tablet and desktop layout */}
          <div className="max-[640px]:hidden flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex flex-col items-center gap-1 min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-2.5 transition-all ${s.num < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${step === s.num
                    ? "bg-[#1e3a5f] text-white shadow-md"
                    : step > s.num
                      ? isDarkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                      : isDarkMode ? "bg-white/[0.06] text-neutral-500" : "bg-gray-200 text-gray-400"
                    }`}>
                    {step > s.num ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s.num}
                  </span>
                  <div className="block text-center min-[640px]:text-left min-w-0">
                    <p className={`text-xs font-bold leading-none truncate ${step === s.num
                      ? isDarkMode ? "text-white" : "text-[#1e3a5f]"
                      : step > s.num
                        ? isDarkMode ? "text-emerald-300" : "text-emerald-700"
                        : isDarkMode ? "text-neutral-500" : "text-gray-400"
                      }`}>{s.label}</p>
                    <p className={`hidden min-[768px]:block text-[10px] mt-0.5 ${isDarkMode ? "text-neutral-600" : "text-gray-400"}`}>{s.desc}</p>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-3 rounded-full ${step > s.num
                    ? isDarkMode ? "bg-emerald-500/40" : "bg-emerald-300"
                    : isDarkMode ? "bg-white/[0.06]" : "bg-gray-200"
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main form container */}
        <div className={`rounded-2xl border p-6 sm:p-8 max-[640px]:p-4 max-[420px]:p-3 ${isDarkMode ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"}`}>
          {error && (
            <div className="mb-5 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* ── Step 1: Project Essentials ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      placeholder="Enter your script title"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
                        Format *
                      </label>
                      <select
                        name="format"
                        value={formData.format}
                        onChange={handleChange}
                        required
                        className={inputCls}
                      >
                        {formats.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
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
                      <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
                        Page Count *
                      </label>
                      <input
                        type="number"
                        name="pageCount"
                        value={formData.pageCount}
                        onChange={handleChange}
                        required
                        min="1"
                        placeholder="110"
                        className={inputCls}
                      />
                      {pageCountWarning && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ {pageCountWarning}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
                      Primary Genre *
                    </label>
                    <select
                      name="primaryGenre"
                      value={formData.primaryGenre}
                      onChange={handleChange}
                      required
                      className={inputCls}
                    >
                      <option value="">Select a genre</option>
                      {genres.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
                      Logline <span className="text-neutral-500">(optional, max 50 characters)</span>
                    </label>
                    <textarea
                      name="logline"
                      value={formData.logline}
                      onChange={handleChange}
                      rows={3}
                      maxLength={50}
                      placeholder="A one-line hook that sells your concept..."
                      className={inputCls}
                    />
                    <p className="text-xs text-neutral-500 mt-1 text-right">
                      {formData.logline.length}/50
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
                      Synopsis * <span className="text-neutral-500">(shown on your project page)</span>
                    </label>
                    <textarea
                      name="synopsis"
                      value={formData.synopsis}
                      onChange={handleChange}
                      required
                      rows={3}
                      placeholder="A short synopsis of your project..."
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
                      Tags <span className="text-neutral-500">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="thriller, detective, serial-killer"
                      className={inputCls}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Deep Classification ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <p className="text-sm text-neutral-400 mb-4">
                    Select up to 3 options per category to power the Smart Match algorithm.
                  </p>

                  {/* Tones */}
                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
                      Tone ({classification.tones.length}/3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {toneOptions.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => toggleClassification("tones", tone)}
                          className={chipCls(classification.tones.includes(tone))}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Themes */}
                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
                      Theme ({classification.themes.length}/3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {themeOptions.map((theme) => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => toggleClassification("themes", theme)}
                          className={chipCls(classification.themes.includes(theme))}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Settings */}
                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
                      Setting ({classification.settings.length}/3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {settingOptions.map((setting) => (
                        <button
                          key={setting}
                          type="button"
                          onClick={() => toggleClassification("settings", setting)}
                          className={chipCls(classification.settings.includes(setting))}
                        >
                          {setting}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-4 sm:p-5 max-[640px]:p-3.5 max-[420px]:p-3 ${isDarkMode ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className={`text-sm font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Role Studio</h3>
                        <p className={`text-[11px] mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Build a professional role sheet for casting and investor clarity.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addRole}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isDarkMode ? "bg-white/[0.06] border-[#2a4a6a] text-blue-300 hover:bg-white/[0.1]" : "bg-white border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`}
                      >
                        + Add Role
                      </button>
                    </div>

                    {roles.length === 0 ? (
                      <div className={`rounded-xl border border-dashed px-4 py-5 text-center ${isDarkMode ? "border-[#1d3350] text-gray-500" : "border-gray-300 text-gray-400"}`}>
                        No roles added yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {roles.map((role, idx) => (
                          <div key={`role-${idx}`} className={`rounded-xl border p-3 ${isDarkMode ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-white"}`}>
                            <div className="flex items-center justify-between mb-3">
                              <p className={`text-xs font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Role {idx + 1}</p>
                              <button
                                type="button"
                                onClick={() => removeRole(idx)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${isDarkMode ? "text-red-300 border-red-500/30 hover:bg-red-500/10" : "text-red-600 border-red-200 hover:bg-red-50"}`}
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

                  <div className="flex gap-3 justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-2.5 border border-white/[0.08] text-neutral-400 rounded-xl text-sm hover:bg-white/[0.05] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: File Upload ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className={`rounded-2xl p-4 sm:p-5 max-[640px]:p-3.5 max-[420px]:p-3 ${isDarkMode ? "bg-[#0b1626]" : "bg-white"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`block text-sm ${labelCls} font-medium`}>
                        Script File (PDF) *
                      </label>
                    </div>

                    {fromDraft && textContent ? (
                      <div className={`flex items-center gap-3 p-4 rounded-xl mb-4 ${isDarkMode ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"}`}>
                        <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-green-300" : "text-green-700"}`}>Script content loaded from editor</p>
                          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-green-500/80" : "text-green-700/80"}`}>Your draft has been imported. You can optionally replace it with a PDF below.</p>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Upload your PDF to automatically extract script content.
                      </p>
                    )}

                    {/* PDF Uploader */}
                    {!uploadedFile ? (
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => !isExtracting && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${isExtracting ? isDarkMode ? "border-[#28415f] bg-[#0f1e30] cursor-wait" : "border-blue-300 bg-blue-50 cursor-wait" : isDarkMode ? "border-white/[0.12] cursor-pointer hover:border-white/40" : "border-gray-300 cursor-pointer hover:border-[#1e3a5f]/40 hover:bg-gray-50"}`}
                      >
                        <div className="mb-2 flex justify-center">
                          <svg className={`w-9 h-9 ${isExtracting ? isDarkMode ? "text-blue-300" : "text-blue-600" : isDarkMode ? "text-gray-300" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15A2.25 2.25 0 0 0 6.75 21.75h10.5A2.25 2.25 0 0 0 19.5 19.5v-1.125m-6.75-6.75h6.75m-6.75 3h4.5" />
                          </svg>
                        </div>
                        <p className={`text-sm font-medium ${labelCls} mb-1`}>
                          {isExtracting ? "Extracting text from PDF..." : "Drag & drop your PDF here"}
                        </p>
                        <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{isExtracting ? "Please wait..." : "or click to browse"}</p>
                        <p className={`text-[10px] mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>Accepted format: PDF only (max 30MB)</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileSelect(e.target.files[0])}
                          className="hidden"
                          disabled={isExtracting}
                        />
                      </div>
                    ) : (
                      <div className={`rounded-xl p-3 mb-4 ${isDarkMode ? "border border-green-500/20 bg-green-500/10" : "border border-green-200 bg-green-50"}`}>
                        <div className="flex flex-col items-start gap-2.5 min-[416px]:flex-row min-[416px]:items-center min-[416px]:gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-black/20" : "bg-white"}`}>
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0 w-full">
                            <p className={`text-sm font-bold break-all ${isDarkMode ? "text-green-400" : "text-green-700"}`}>
                              {uploadedFile.name} (Text Extracted)
                            </p>
                            <p className={`text-xs ${isDarkMode ? "text-green-500/90" : "text-green-700/80"}`}>
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFile(null);
                              setUploadProgress(0);
                              setTextContent("");
                            }}
                            className={`text-sm font-bold px-2 py-1 rounded-md border transition w-full min-[416px]:w-auto ${isDarkMode ? "text-red-400 bg-white/[0.08] border-red-500/20 hover:bg-white/[0.12]" : "text-red-600 bg-white border-red-200 hover:bg-red-50"}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="my-4">
                        <div className={`w-full rounded-full h-2 overflow-hidden relative ${isDarkMode ? "bg-white/[0.08]" : "bg-gray-200"}`}>
                          <div
                            className={`h-2 rounded-full transition-all duration-300 relative ${isDarkMode ? "bg-white" : "bg-[#1e3a5f]"}`}
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className={`text-xs mt-1 text-center font-medium animate-pulse ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          Processing file... {uploadProgress}%
                        </p>
                      </div>
                    )}

                  </div>

                  <div className={`rounded-2xl border p-4 sm:p-5 max-[640px]:p-3.5 max-[420px]:p-3 ${isDarkMode ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-white"}`}>
                    <div className="mb-4">
                      <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-[#1e3a5f]"}`}>Visual Assets</h3>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Add a cover image and trailer to improve profile quality and discovery.</p>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t ${isDarkMode ? "border-white/[0.06]" : "border-gray-100"}`}>
                    {/* Thumbnail Upload */}
                    <div className={`rounded-2xl p-4 ${isDarkMode ? "bg-[#0d1829]" : "bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Script Thumbnail <span className={`text-xs font-normal ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                      </label>
                      {!thumbnailFile ? (
                        <div onClick={() => thumbnailInputRef.current?.click()} className={`rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center ${isDarkMode ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-100/70"}`}>
                          <svg className={`w-8 h-8 mb-2 ${isDarkMode ? "text-[#1d3350]" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0L21.75 15m-10.5-9h.008v.008h-.008V6ZM3.75 19.5h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" /></svg>
                          <p className={`text-xs font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Upload & Adjust Cover</p>
                          <p className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>JPEG, PNG, WEBP (Max 5MB)</p>
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
                        <div className={`border rounded-xl p-3 flex items-center gap-3 ${isDarkMode ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                          <img src={thumbnailPreviewUrl} alt="Thumbnail Preview" className="w-12 h-16 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isDarkMode ? "text-green-400" : "text-green-700"}`}>{thumbnailFile.name}</p>
                            <p className={`text-[10px] ${isDarkMode ? "text-green-500/80" : "text-green-600/80"}`}>{(thumbnailFile.size / 1024).toFixed(1)} KB - Cover ready</p>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => openThumbnailEditor(thumbnailFile)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${isDarkMode ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                            >
                              Adjust
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setThumbnailFile(null);
                                setError("");
                              }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${isDarkMode ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Trailer Upload */}
                    <div className={`rounded-2xl p-4 ${isDarkMode ? "bg-[#0d1829]" : "bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Trailer Video <span className={`text-xs font-normal ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
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
                        <div onClick={() => trailerInputRef.current?.click()} className={`rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center ${isDarkMode ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-100/70"}`}>
                          <svg className={`w-8 h-8 mb-2 ${isDarkMode ? "text-[#1d3350]" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36A.75.75 0 0 1 21.75 8.8v6.4a.75.75 0 0 1-1.28.53l-4.72-2.36m-1.5 3.98V6.67A2.25 2.25 0 0 0 12 4.42H4.5a2.25 2.25 0 0 0-2.25 2.25v10.66A2.25 2.25 0 0 0 4.5 19.58H12a2.25 2.25 0 0 0 2.25-2.25Z" /></svg>
                          <p className={`text-xs font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Upload High-Quality Trailer</p>
                          <p className={`text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>MP4, MOV, MPEG, WebM (Max 250MB)</p>
                        </div>
                      ) : (
                        <div className={`border rounded-xl p-3 space-y-3 ${isDarkMode ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
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
                              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${isDarkMode ? "text-green-400" : "text-green-700"}`}>{trailerFile.name}</p>
                              <p className={`text-[10px] ${isDarkMode ? "text-green-500/80" : "text-green-600/80"}`}>
                                {(trailerFile.size / 1024 / 1024).toFixed(1)} MB
                                {trailerMetaLoading ? " - reading video info..." : trailerMeta ? ` - ${formatDuration(trailerMeta.duration)} - ${trailerMeta.width}x${trailerMeta.height}` : ""}
                              </p>
                              <p className={`text-[10px] mt-1 ${isDarkMode ? "text-green-500/80" : "text-green-700/80"}`}>Original quality will be preserved on upload.</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => trailerInputRef.current?.click()}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${isDarkMode ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTrailerFile(null);
                                  setTrailerOption("none");
                                  setError("");
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${isDarkMode ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
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

                  <div className="flex gap-3 justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className={`px-6 py-2.5 rounded-xl text-sm transition ${isDarkMode ? "border border-white/[0.08] text-neutral-400 hover:bg-white/[0.05]" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className={`px-6 py-2.5 rounded-xl text-sm font-medium transition ${isDarkMode ? "bg-white text-black hover:bg-neutral-200" : "bg-[#1e3a5f] text-white hover:bg-[#22456f]"}`}
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Services & Strategy ── */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className={`rounded-2xl p-4 min-[420px]:p-5 sm:p-8 max-[640px]:p-2.5 max-[420px]:p-2 space-y-5 min-[420px]:space-y-6 ${isDarkMode ? "bg-[#0d1829]" : "bg-white shadow-sm"}`}>
                    <div>
                      <h2 className={`text-lg font-bold mb-1 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Submission Setup</h2>
                      <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Choose access, set price, select services, and accept terms.</p>
                    </div>

                    <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 max-[640px]:-mx-1 max-[420px]:-mx-0.5 space-y-4 min-[420px]:space-y-5 ${isDarkMode ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                      <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
                        <div>
                          <h3 className={`text-[15px] min-[420px]:text-base font-bold mt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Access & Monetization</h3>
                          <p className={`text-[11px] min-[420px]:text-[12px] mt-1 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Pick either free public access or paid premium access.</p>
                        </div>
                        <div className={`w-full min-[460px]:w-auto px-3 py-2 rounded-xl text-left min-[460px]:text-right ${isDarkMode ? "bg-white/[0.04] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Current Plan</p>
                          <p className={`text-sm font-bold mt-1 ${isPremium ? isDarkMode ? "text-emerald-300" : "text-emerald-700" : isDarkMode ? "text-blue-300" : "text-blue-700"}`}>{isPremium ? "Premium Access" : "Free Public Access"}</p>
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 min-[446px]:grid-cols-2 gap-2.5 min-[420px]:gap-3 p-1.5 rounded-2xl ${isDarkMode ? "bg-white/[0.04]" : "bg-white border border-gray-200"}`}>
                        <button
                          type="button"
                          onClick={() => setIsPremium(false)}
                          className={`text-left rounded-xl px-3.5 min-[420px]:px-4 py-3.5 min-[420px]:py-4 border transition-all ${!isPremium
                            ? isDarkMode ? "bg-[#122338] border-[#24456b] text-white shadow-lg shadow-black/20" : "bg-[#1e3a5f] border-[#1e3a5f] text-white shadow-sm"
                            : isDarkMode ? "border-transparent text-gray-400 hover:bg-white/[0.04]" : "border-transparent text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-[420px]:gap-2.5">
                            <div className={`w-8 h-8 min-[420px]:w-9 min-[420px]:h-9 rounded-xl flex items-center justify-center ${!isPremium ? "bg-white/15" : isDarkMode ? "bg-white/[0.06]" : "bg-blue-50"}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                            </div>
                            <div>
                              <p className="text-[15px] min-[420px]:text-sm font-bold">Free Access</p>
                              <p className={`text-[10px] min-[420px]:text-[11px] leading-snug ${!isPremium ? "text-white/80" : isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Best for reach and discovery</p>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsPremium(true)}
                          className={`text-left rounded-xl px-3.5 min-[420px]:px-4 py-3.5 min-[420px]:py-4 border transition-all ${isPremium
                            ? isDarkMode ? "bg-emerald-600/15 border-emerald-500/40 text-white shadow-lg shadow-black/20" : "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : isDarkMode ? "border-transparent text-gray-400 hover:bg-white/[0.04]" : "border-transparent text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-[420px]:gap-2.5">
                            <div className={`w-8 h-8 min-[420px]:w-9 min-[420px]:h-9 rounded-xl flex items-center justify-center ${isPremium ? "bg-white/15" : isDarkMode ? "bg-white/[0.06]" : "bg-emerald-50"}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                            </div>
                            <div>
                              <p className="text-[15px] min-[420px]:text-sm font-bold">Premium Access</p>
                              <p className={`text-[10px] min-[420px]:text-[11px] leading-snug ${isPremium ? "text-white/80" : isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Monetize full-script reading</p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {!isPremium ? (
                        <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${isDarkMode ? "bg-blue-500/8 border border-blue-500/15" : "bg-blue-50 border border-blue-100"}`}>
                          <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                          <div>
                            <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Public discovery mode</p>
                            <p className={`text-[12px] mt-1 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Your script is fully readable to all users.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <div className={`rounded-xl p-4 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                              <label className={`block text-[11px] font-bold uppercase tracking-[0.14em] mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Set Price</label>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="relative w-full sm:w-40">
                                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>₹</span>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={scriptPrice}
                                    onChange={(e) => {
                                      const normalized = String(e.target.value || "").replace(/^0+(?=\d)/, "");
                                      setScriptPrice(Number(normalized) || 0);
                                      setCustomPriceInput(normalized);
                                      setUseCustomPrice(false);
                                    }}
                                    placeholder="0"
                                    className={`w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-bold border-2 outline-none transition-all ${isDarkMode ? "bg-white/[0.04] border-emerald-500/50 text-white focus:border-emerald-500" : "bg-white border-emerald-300 text-gray-900 focus:border-emerald-500"}`}
                                  />
                                </div>
                                <p className={`text-[12px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Enter any amount (minimum ₹1).</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 max-[640px]:-mx-1 max-[420px]:-mx-0.5 ${isDarkMode ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.07]"}`}>
                          <svg className={`w-4 h-4 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h16.5A2.25 2.25 0 0122.5 5.25V9M3.75 3l5.25 5.25m0 0L12 11.25m-3-3L6 11.25m3-3v8.25" /></svg>
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Optional Services</h3>
                          <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Select only services you want to add now.</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 min-[416px]:space-y-3">
                        {[
                          {
                            key: "hosting",
                            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>,
                            name: "Hosting & Discovery",
                            price: "FREE",
                            desc: "Marketplace listing and public discovery",
                            locked: true,
                            enabled: true,
                          },
                          {
                            key: "spotlight",
                            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.75.75 0 011.04 0l1.838 1.783a.75.75 0 00.384.2l2.53.36a.75.75 0 01.607.51l.806 2.435a.75.75 0 00.286.37l2.108 1.498a.75.75 0 010 1.227l-2.108 1.498a.75.75 0 00-.286.37l-.806 2.435a.75.75 0 01-.607.51l-2.53.36a.75.75 0 00-.384.2l-1.838 1.783a.75.75 0 01-1.04 0l-1.838-1.783a.75.75 0 00-.384-.2l-2.53-.36a.75.75 0 01-.607-.51l-.806-2.435a.75.75 0 00-.286-.37L2.92 11.882a.75.75 0 010-1.227L5.028 9.157a.75.75 0 00.286-.37l.806-2.435a.75.75 0 01.607-.51l2.53-.36a.75.75 0 00.384-.2L11.48 3.5z" /></svg>,
                            name: "Activate Spotlight",
                            price: `${SERVICE_PRICES.spotlight} credits`,
                            desc: "Verified badge, evaluation + trailer service, and featured top placement",
                            enabled: services.spotlight,
                          },
                          {
                            key: "aiTrailer",
                            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>,
                            name: "AI Concept Trailer",
                            price: `${SERVICE_PRICES.aiTrailer} credits`,
                            desc: "60-second cinematic teaser",
                            badge: "BETA",
                            enabled: trailerOption === "ai",
                          },
                          {
                            key: "evaluation",
                            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08" /></svg>,
                            name: "Professional Evaluation",
                            price: `${SERVICE_PRICES.evaluation} credits`,
                            desc: "Reader scorecard with strengths and weaknesses",
                            enabled: services.evaluation,
                          },
                        ].map((service) => (
                          <button
                            key={service.key}
                            type="button"
                            onClick={() => {
                              if (service.locked) {
                                setError("Hosting is required for your script to be searchable.");
                                return;
                              }

                              if (service.key === "evaluation") {
                                setServices((current) => ({ ...current, evaluation: !current.evaluation }));
                              }

                              if (service.key === "spotlight") {
                                setServices((current) => ({ ...current, spotlight: !current.spotlight }));
                              }

                              if (service.key === "aiTrailer") {
                                if (trailerOption === "ai") {
                                  setTrailerOption(trailerFile ? "upload" : "none");
                                } else {
                                  setTrailerOption("ai");
                                }
                              }

                              setError("");
                            }}
                            className={`w-full text-left rounded-2xl border px-3.5 min-[416px]:px-4 py-3.5 min-[416px]:py-4 transition-all ${service.locked
                              ? isDarkMode ? "border-[#22405f] bg-[#0e2032] cursor-default" : "border-blue-100 bg-blue-50/70 cursor-default"
                              : service.enabled
                                ? isDarkMode ? "border-[#2b5d8f] bg-[#122338]" : "border-[#1e3a5f]/25 bg-[#1e3a5f]/[0.05]"
                                : isDarkMode ? "border-[#182840] hover:border-[#22405f] hover:bg-white/[0.02]" : "border-gray-200 hover:border-gray-300 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-[416px]:gap-3">
                              <div className={`w-9 h-9 min-[416px]:w-10 min-[416px]:h-10 rounded-xl flex items-center justify-center shrink-0 ${service.enabled || service.locked ? isDarkMode ? "bg-white/[0.08] text-white" : "bg-white text-[#1e3a5f]" : isDarkMode ? "bg-white/[0.04] text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                {service.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 min-[416px]:gap-2">
                                      <h4 className={`text-[13px] min-[416px]:text-sm font-bold leading-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>{service.name}</h4>
                                      {service.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">{service.badge}</span>}
                                      {service.locked && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-700"}`}>Included</span>}
                                      {service.key === "aiTrailer" && trailerOption === "upload" && trailerFile && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-700"}`}>Replaces uploaded trailer</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="hidden min-[416px]:block text-right shrink-0">
                                    <p className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{service.price}</p>
                                    {!service.locked && (
                                      <p className={`text-[11px] mt-1 ${service.enabled ? isDarkMode ? "text-emerald-300" : "text-emerald-700" : isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{service.enabled ? "Selected" : "Optional"}</p>
                                    )}
                                  </div>
                                </div>
                                <p className={`text-[12px] mt-1.5 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{service.desc}</p>
                                <div className="mt-2 min-[416px]:hidden flex items-center justify-between gap-2">
                                  <p className={`text-[13px] font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{service.price}</p>
                                  {!service.locked && (
                                    <p className={`text-[11px] ${service.enabled ? isDarkMode ? "text-emerald-300" : "text-emerald-700" : isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{service.enabled ? "Selected" : "Optional"}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 max-[640px]:-mx-1 max-[420px]:-mx-0.5 ${isDarkMode ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.07]"}`}>
                          <svg className={`w-4 h-4 ${isDarkMode ? "text-rose-300" : "text-rose-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m5.25-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Rights & Licensing Preferences</h3>
                          <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>These terms become the legal basis for buyer consent and generated agreements.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 ${labelCls}`}>Rights Type</label>
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
                          <label className={`block text-xs font-semibold mb-1 ${labelCls}`}>Modification Rights</label>
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
                          <label className={`block text-xs font-semibold mb-1 ${labelCls}`}>Payment Structure</label>
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
                          <label className={`block text-xs font-semibold mb-1 ${labelCls}`}>Negotiation Mode</label>
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
                            <label className={`block text-xs font-semibold mb-1 ${labelCls}`}>License Duration</label>
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
                                      <label className={`block text-[11px] font-semibold mb-1 ${labelCls}`}>Custom Duration (months)</label>
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
                            <label className={`block text-xs font-semibold mb-1 ${labelCls}`}>Royalty Percentage</label>
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
                        <label className={`block text-xs font-semibold mb-1 ${labelCls}`}>Custom Conditions (Optional)</label>
                        <textarea
                          rows={4}
                          value={rightsLicensing.customConditions}
                          onChange={(e) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                            ...prev,
                            customConditions: e.target.value,
                          }))}
                          placeholder="Add any contract-sensitive conditions that buyers must acknowledge."
                          className={`${inputCls} resize-y`}
                        />
                        <p className={`text-[11px] mt-1 text-right ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          {String(rightsLicensing.customConditions || "").length}/{MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH}
                        </p>
                      </div>

                      <div className={`mt-4 rounded-xl border px-3 py-3 ${isDarkMode ? "border-[#1b2e46] bg-[#07101c]" : "border-gray-200 bg-white"}`}>
                        <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Rights Summary Preview</p>
                        <p className={`text-sm font-semibold mt-1 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{RIGHTS_LABEL_MAP[rightsLicensing.rightsType]}</p>
                        <p className={`text-[12px] mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{MODIFICATION_LABEL_MAP[rightsLicensing.modificationRights]}</p>
                        <p className={`text-[12px] ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{PAYMENT_LABEL_MAP[rightsLicensing.paymentStructure]}</p>
                        <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">
                          EXCLUSIVE RIGHTS: this listing cannot be sold to multiple buyers once transaction is settled.
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2.5">
                        <label className={`flex items-start gap-2.5 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
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
                        <label className={`flex items-start gap-2.5 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
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
                          <span>I acknowledge these rights terms are governed under platform legal policies.</span>
                        </label>
                        <label className={`flex items-start gap-2.5 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
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
                          <span>I understand exclusivity prevents parallel multi-buyer transactions.</span>
                        </label>
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 max-[640px]:-mx-1 max-[420px]:-mx-0.5 ${isDarkMode ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.07]"}`}>
                          <svg className={`w-4 h-4 ${isDarkMode ? "text-purple-300" : "text-purple-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h3.75A2.625 2.625 0 0116.5 4.875v1.5H7.5v-1.5A2.625 2.625 0 0110.125 2.25zM7.5 9h9m-9 0v8.625A2.625 2.625 0 0010.125 20.25h3.75A2.625 2.625 0 0016.5 17.625V9m-9 0h9" /></svg>
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Submission Agreement</h3>
                          <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Read and accept before publishing.</p>
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        <div className={`rounded-xl px-3 py-3 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Rights</p>
                          <p className="text-[12px] mt-2 leading-relaxed">You retain ownership of your script.</p>
                        </div>
                        <div className={`rounded-xl px-3 py-3 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>License</p>
                          <p className="text-[12px] mt-2 leading-relaxed">Platform gets a non-exclusive display and promotion license.</p>
                        </div>
                        <div className={`rounded-xl px-3 py-3 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Refunds</p>
                          <p className="text-[12px] mt-2 leading-relaxed">Service charges are not refundable after processing starts.</p>
                        </div>
                      </div>

                      <div ref={agreementRef} className={`rounded-xl p-4 h-48 overflow-y-auto text-xs leading-relaxed border ${isDarkMode ? "border-[#182840] text-gray-400 bg-[#050b14]" : "border-gray-200 text-gray-500 bg-white"}`}>
                        <pre className="whitespace-pre-wrap font-sans">{LEGAL_AGREEMENT}</pre>
                      </div>

                      <p className={`text-xs mb-3 mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Review the full legal document:
                        {" "}
                        <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:text-blue-400 underline underline-offset-2">
                          Script Upload Terms & Conditions
                        </Link>
                      </p>

                      <label className="flex items-start gap-3 cursor-pointer mt-4">
                        <input
                          type="checkbox"
                          checked={legal.agreedToTerms}
                          onChange={(e) => setLegal({ ...legal, agreedToTerms: e.target.checked })}
                          className="w-5 h-5 rounded mt-0.5 accent-[#1e3a5f]"
                        />
                        <span className={`text-sm leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                          I confirm I own or control the rights to this script and agree to the Script Upload Terms & Conditions (v{SCRIPT_UPLOAD_TERMS_VERSION}).
                        </span>
                      </label>
                    </div>

                    <div className={`rounded-xl p-4 border ${isDarkMode ? "bg-white/[0.03] border-white/[0.08]" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex flex-col gap-2 min-[460px]:flex-row min-[460px]:items-center min-[460px]:justify-between">
                        <span className={`text-sm font-medium ${labelCls}`}>Total Credits Required</span>
                        <span className={`text-xl min-[420px]:text-2xl font-black ${isDarkMode ? "text-white" : "text-[#1e3a5f]"}`}>{calculateTotal()} credits</span>
                      </div>
                      <p className={`text-xs mt-2 ${isDarkMode ? "text-neutral-500" : "text-gray-500"}`}>
                        {services.hosting && <span>Hosting (FREE)</span>}
                        {services.evaluation && (
                          <span>{services.hosting ? " + " : ""}{SERVICE_PRICES.evaluation} credits evaluation</span>
                        )}
                        {services.spotlight && (
                          <span>{services.hosting || services.evaluation ? " + " : ""}{SERVICE_PRICES.spotlight} credits spotlight</span>
                        )}
                        {trailerOption === "ai" && (
                          <span>{services.hosting || services.evaluation || services.spotlight ? " + " : ""}{SERVICE_PRICES.aiTrailer} credits AI trailer</span>
                        )}
                        {trailerOption === "upload" && trailerFile && (
                          <span>{services.hosting || services.evaluation || services.spotlight ? " + " : ""}Trailer upload (FREE)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse min-[420px]:flex-row gap-2.5 min-[420px]:gap-3 justify-between pt-1 min-[420px]:pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="w-full min-[420px]:w-auto px-6 py-2.5 border border-white/[0.08] text-neutral-400 rounded-xl text-sm hover:bg-white/[0.05] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full min-[420px]:w-auto px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 5: Legal & Checkout ── */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className={`text-lg font-bold mb-1 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Final Review</h2>
                    <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Validate your invoice and submission details, then submit your project for admin review.</p>
                  </div>

                  <div className={`rounded-xl px-3 py-2 ${isDarkMode ? "bg-white/[0.04] border border-white/[0.06]" : "bg-gray-50 border border-gray-200"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Available Credits</p>
                    <p className={`text-sm font-bold mt-1 ${creditsBalance < totalServiceCost ? "text-red-400" : isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>{creditsBalance} credits</p>
                  </div>

                  <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? "border-[#223a58] bg-gradient-to-b from-[#0a1320] to-[#08111b] shadow-[0_12px_28px_rgba(2,6,23,0.35)]" : "border-gray-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]"}`}>
                    <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${isDarkMode ? "border-[#1b2e46]" : "border-gray-200"}`}>
                      <div>
                        <p className={`text-[10px] font-extrabold uppercase tracking-[0.16em] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Invoice Preview</p>
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Calculated from your current pricing and services.</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold border ${isDarkMode ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300" : "border-cyan-200 bg-cyan-50 text-cyan-700"}`}>Auto-updating</span>
                    </div>

                    <div className={`max-[520px]:hidden grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_110px] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? "bg-[#091525] text-gray-500 border-b border-[#1b2e46]" : "bg-gray-50 text-gray-500 border-b border-gray-200"}`}>
                      <span>Invoice Item</span>
                      <span>Type</span>
                      <span className="text-right">Amount</span>
                    </div>

                    <div>
                      {publishInvoiceRows.map((row, index) => (
                        <div key={row.item} className={`grid grid-cols-1 min-[521px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_110px] px-4 py-3.5 items-start gap-2 text-[12px] ${isDarkMode ? `${index % 2 === 0 ? "bg-white/[0.01]" : "bg-[#0b1625]"} border-b border-[#15273d] last:border-b-0` : `${index % 2 === 0 ? "bg-white" : "bg-gray-50/70"} border-b border-gray-100 last:border-b-0`}`}>
                          <div>
                            <p className={`font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>{row.item}</p>
                            <p className={`text-[11px] mt-0.5 leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{row.detail}</p>
                          </div>
                          <div className="pt-0.5 max-[520px]:pt-0">
                            <span className={`inline-flex items-center whitespace-nowrap text-[10px] font-semibold px-2.5 py-1 rounded-full border ${row.type === "Credit Charge"
                              ? isDarkMode ? "border-blue-400/30 bg-blue-500/12 text-blue-300" : "border-blue-200 bg-blue-100 text-blue-700"
                              : row.type === "Revenue Setting"
                                ? isDarkMode ? "border-indigo-400/30 bg-indigo-500/14 text-indigo-300" : "border-indigo-200 bg-indigo-100 text-indigo-700"
                              : row.type === "Platform Commission"
                                ? isDarkMode ? "border-amber-400/30 bg-amber-500/12 text-amber-300" : "border-amber-200 bg-amber-100 text-amber-700"
                              : row.type === "Checkout Total"
                                ? isDarkMode ? "border-cyan-400/30 bg-cyan-500/12 text-cyan-300" : "border-cyan-200 bg-cyan-100 text-cyan-700"
                              : row.type === "Future Earnings"
                                ? isDarkMode ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-300" : "border-emerald-200 bg-emerald-100 text-emerald-700"
                                : isDarkMode ? "border-white/[0.16] bg-white/[0.08] text-gray-300" : "border-gray-300 bg-gray-100 text-gray-700"
                              }`}>{row.type}</span>
                          </div>
                          <p className={`text-left min-[521px]:text-right font-extrabold tabular-nums tracking-tight pt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{row.amount}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`rounded-xl px-4 py-4 ${isDarkMode ? "bg-blue-500/10 border border-blue-500/15" : "bg-blue-50 border border-blue-100"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>Publish Cost</p>
                      <p className={`text-xl font-black mt-1 ${totalServiceCost > creditsBalance ? "text-red-400" : isDarkMode ? "text-white" : "text-gray-900"}`}>{totalServiceCost} cr</p>
                      <p className={`text-[11px] mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Charged from current balance</p>
                    </div>
                    <div className={`rounded-xl px-4 py-4 ${isDarkMode ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-emerald-50 border border-emerald-100"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>Remaining Credits</p>
                      <p className={`text-xl font-black mt-1 ${creditsAfterPublish < 0 ? "text-red-400" : isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>{creditsAfterPublish}</p>
                      <p className={`text-[11px] mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>After this publish action</p>
                    </div>
                    <div className={`rounded-xl px-4 py-4 ${isDarkMode ? "bg-purple-500/10 border border-purple-500/15" : "bg-purple-50 border border-purple-100"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? "text-purple-300" : "text-purple-700"}`}>Writer / Premium Sale</p>
                      <p className={`text-xl font-black mt-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{isPremium ? formatCurrency(writerPayout) : formatCurrency(0)}</p>
                      <p className={`text-[11px] mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>Writer gets full script fee per paid purchase</p>
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-5 ${isDarkMode ? "border-[#1d3350] bg-[#080f1a]" : "border-gray-200 bg-gray-50/60"}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className={`rounded-xl px-3 py-3 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Rights</p>
                        <p className={`text-[12px] mt-2 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>You retain ownership of your script.</p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>License</p>
                        <p className={`text-[12px] mt-2 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Platform gets a non-exclusive display and promotion license.</p>
                      </div>
                      <div className={`rounded-xl px-3 py-3 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Refunds</p>
                        <p className={`text-[12px] mt-2 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Service charges are non-refundable after processing starts.</p>
                      </div>
                    </div>

                    <p className={`text-xs mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Review the full legal document:
                      {" "}
                      <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:text-blue-400 underline underline-offset-2">
                        Script Upload Terms & Conditions
                      </Link>
                    </p>

                    <div
                      ref={agreementRef}
                      className={`rounded-xl p-4 h-48 overflow-y-auto text-xs leading-relaxed border ${isDarkMode ? "border-[#182840] text-gray-400 bg-[#050b14]" : "border-gray-200 text-gray-500 bg-white"}`}
                    >
                      <pre className="whitespace-pre-wrap font-sans">{LEGAL_AGREEMENT}</pre>
                    </div>

                    <div className={`rounded-xl px-4 py-4 mt-4 ${isDarkMode ? "bg-white/[0.03] border border-white/[0.06]" : "bg-gray-50 border border-gray-200"}`}>
                      <div className="flex items-start gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${legal.agreedToTerms ? isDarkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700" : isDarkMode ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                          {legal.agreedToTerms ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            "!"
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>{legal.agreedToTerms ? "Agreement confirmed" : "Agreement required"}</p>
                          <p className={`text-[11px] mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{legal.agreedToTerms ? "Everything is ready. You can submit for admin approval now." : "Please accept the submission agreement to continue."}</p>
                          <label className="flex items-start gap-2.5 cursor-pointer mt-3">
                            <input
                              type="checkbox"
                              checked={legal.agreedToTerms}
                              onChange={(e) => setLegal({ ...legal, agreedToTerms: e.target.checked })}
                              className="w-4 h-4 rounded mt-0.5 accent-[#1e3a5f] disabled:opacity-50"
                            />
                            <span className={`text-[11px] leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                              I agree to the Script Upload Terms & Conditions (v{SCRIPT_UPLOAD_TERMS_VERSION}) and confirm publishing rights.
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="flex gap-3 justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-2.5 border border-white/[0.08] text-neutral-400 rounded-xl text-sm hover:bg-white/[0.05] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !legal.agreedToTerms}
                      className="flex-1 px-6 py-3 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:bg-[#162d4a] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                    >
                      {loading ? "Submitting..." : "Submit for Approval"}
                    </button>
                  </div>
                  <p className={`text-[11px] text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Submitting will send your project for admin approval with the current pricing, services, and invoice settings.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>

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
              className={`w-full max-w-3xl max-h-[92vh] my-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode
                ? "bg-[#091322] border border-white/[0.08]"
                : "bg-white border border-gray-200"
                }`}
            >
              <div className={`px-4 sm:px-5 py-3 sm:py-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? "border-white/[0.08]" : "border-gray-100"}`}>
                <div>
                  <h3 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Set Script Cover Image</h3>
                  <p className={`text-[11px] mt-0.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Drag to frame the best angle. Cover ratio is 3:4.</p>
                </div>
                <button
                  type="button"
                  onClick={resetThumbnailEditor}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${isDarkMode
                    ? "text-gray-400 hover:bg-white/[0.08]"
                    : "text-gray-500 hover:bg-gray-100"
                    }`}
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className={`relative w-full h-[45vh] sm:h-[380px] min-h-[220px] rounded-xl overflow-hidden ${isDarkMode ? "bg-black/50" : "bg-gray-100"}`}>
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
                  <div className={`rounded-xl p-3 border ${isDarkMode ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Zoom</label>
                      <span className={`ml-auto text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{thumbnailZoom.toFixed(2)}x</span>
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

                  <div className={`rounded-xl p-3 border ${isDarkMode ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Rotation</label>
                      <span className={`ml-auto text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{Math.round(thumbnailRotation)} deg</span>
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

                <div className={`rounded-xl px-3 py-2 border flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between ${isDarkMode ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-200 bg-gray-50"}`}>
                  <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Tip: drag image to choose focal point, then fine-tune zoom and angle.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailCrop({ x: 0, y: 0 });
                      setThumbnailZoom(1);
                      setThumbnailRotation(0);
                    }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition ${isDarkMode
                      ? "bg-white/[0.08] text-gray-300 hover:bg-white/[0.12]"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className={`px-4 sm:px-5 pb-4 sm:pb-5 pt-3 flex gap-3 shrink-0 ${isDarkMode ? "border-t border-white/[0.06]" : "border-t border-gray-100"}`}>
                <button
                  type="button"
                  onClick={resetThumbnailEditor}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${isDarkMode
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
              className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? "bg-[#091322] border-white/[0.08]" : "bg-white border-gray-200"}`}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className={`text-lg font-extrabold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Script Submitted Successfully
              </h3>
              <p className={`text-sm mt-2 leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Your script is now under review. Please wait for admin approval. You will be notified once it is approved.
              </p>

              <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${isDarkMode ? "border-white/[0.08] bg-white/[0.03] text-gray-400" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
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
    </div>
  );
};

export default ScriptUpload;
