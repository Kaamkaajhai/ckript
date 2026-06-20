import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, FileText } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import api from "../services/api";
import OTPVerification from "./OTPVerification";
import PasswordInput from "./PasswordInput";
import "./WriterOnboardingModal.css";

/* ─────────────────────────────────────────────────────────────
   Ckript — Writer onboarding modal.

   Port of the "Writer Onboarding Modal.dc.html" Claude Design handoff
   (Variation A: split editorial). It is the redesigned, canonical writer
   onboarding surface — the visual sibling of the producer/director modal —
   reachable two ways:
     • inline from the sign-up modal's "Join as Writer" card (no page nav), and
     • as the /writer-onboarding route (rendered over a backdrop), so deep links,
       the sidebar "Become a Writer" entry, the Terms page, the landing CTAs and
       the SEO sitemap all keep working.

   It deliberately reuses the writer flow's existing, battle-tested data layer
   rather than reinventing it: AuthContext.join (role "creator") for sign-up,
   OTPVerification for email verification, the live username-availability
   endpoint, the writer-profile + guild-membership-proof endpoints, and the
   /onboarding/complete contract — with the same progressive-save points so a
   drop-off never loses a created account.

   Nine steps, matching the writer data model 1:1:
     1 Account · 2 Contact · 3 Password · 4 Username · 5 About ·
     6 Guilds · 7 Links · 8 Tags · 9 Terms
   ───────────────────────────────────────────────────────────── */

const UNSPLASH = (id, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/* Per-step editorial stills — the writer-themed set from the design handoff;
   they crossfade as the writer advances. */
const STEP_IMAGES = [
  "photo-1455390582262-044cdead277a", // writing by hand
  "photo-1486312338219-ce68d2c6f44d", // laptop workspace
  "photo-1554080353-a576cf803bda", // light & shadow
  "photo-1488998427799-e3362cec87c3", // typewriter
  "photo-1457369804613-52c61a468e7d", // open book
  "photo-1481627834876-b7833e8f5570", // library stacks
  "photo-1519682337058-a94d519337bc", // desk at work
  "photo-1517842645767-c639042777db", // notebook & coffee
  "photo-1506880018603-83d5b814b5a6", // books
].map((id) => UNSPLASH(id));

const STEP_META = [
  { name: "Account", title: "What's your name", sub: "Let's start with the basics." },
  { name: "Contact", title: "How we reach you", sub: "Email for verification, phone for security." },
  { name: "Password", title: "Secure your account", sub: "Choose a strong password to protect your account." },
  { name: "Username", title: "Pick a username", sub: "This is how other writers will find you on Ckript." },
  { name: "About", title: "Tell us about yourself", sub: "A few details to help others discover your work." },
  { name: "Guilds", title: "Guild memberships", sub: "A member of a writers' guild? Optional — you can skip." },
  { name: "Links", title: "Your online presence", sub: "Add your portfolio and social links. All optional." },
  { name: "Tags", title: "What do you write", sub: "Select genres you love and up to 5 story tags." },
  { name: "Terms", title: "Almost there", sub: "Review and accept to complete your writer setup." },
];

const TOTAL_STEPS = 9;
const MAX_TAGS = 5;

const GENDER_OPTIONS = ["Male", "Female", "Trans", "Prefer not to say", "Other"];
const NATIONALITY_OPTIONS = [
  "Indian", "American", "British", "Canadian", "Australian", "New Zealander", "Irish",
  "French", "German", "Italian", "Spanish", "Portuguese", "Dutch", "Swedish", "Norwegian",
  "Danish", "Swiss", "Austrian", "Belgian", "Polish", "Russian", "Ukrainian", "Turkish",
  "Brazilian", "Mexican", "Argentinian", "South African", "Nigerian", "Egyptian", "Kenyan",
  "Saudi Arabian", "Emirati", "Pakistani", "Bangladeshi", "Nepalese", "Sri Lankan",
  "Singaporean", "Malaysian", "Indonesian", "Filipino", "Thai", "Vietnamese", "Chinese",
  "Japanese", "South Korean", "Other",
];

/* The full taxonomy the rest of the product (search, discovery, feeds) indexes
   against — kept comprehensive rather than the design's sample subset. */
const GENRE_OPTIONS = [
  "Action", "Adventure", "Animation", "Anime", "Art/Foreign", "Biographical",
  "Children/Family", "Comedy", "Coming of Age", "Crime", "Dark Comedy", "Documentary",
  "Drama", "Erotic", "Espionage", "Faith/Spirituality", "Family", "Fantasy",
  "Film Noir", "Historical", "Horror", "Indie", "Legal", "Martial Arts",
  "Medical", "Mockumentary", "Musical", "Mystery", "Noir", "Political",
  "Psychological", "Romance", "Romantic Comedy", "Satire", "Sci-Fi", "Short Film",
  "Slice of Life", "Sports", "Steampunk", "Superhero", "Supernatural", "Suspense",
  "Teen", "Thriller", "True Crime", "War", "Western", "Zombie",
];
const TAG_OPTIONS = [
  "Abandonment", "Addiction", "Alienation", "Ambition", "Betrayal", "Brotherhood",
  "Capitalism", "Chosen One", "Class Struggle", "Colonialism", "Coming of Age",
  "Corruption", "Revenge", "Redemption", "Love Triangle", "Family Drama",
  "Social Justice", "Identity Crisis", "Survival", "Power Struggle",
  "Forbidden Love", "Loss & Grief", "Good vs Evil", "Man vs Nature",
  "Isolation", "Second Chance", "Underdog Story", "Fish Out of Water",
  "Quest", "Transformation", "Sacrifice", "Justice", "Freedom", "Mental Illness",
  "Existentialism", "Fate vs Free Will", "Man vs Technology", "War & Peace",
  "Ancient", "Cyberpunk", "Contemporary", "Deep Space", "Desert", "Dystopian",
  "Future", "Haunted House", "Hospital", "Jungle", "Medieval",
  "Military Base", "Ocean/Sea", "Post-Apocalyptic", "Prison", "Rural",
  "School/College", "Small Town", "Big City", "Space", "Suburban",
  "Alternate Reality", "Virtual Reality", "Underground", "Wilderness",
  "Wild West", "Victorian Era", "World War I", "World War II", "Secret Facility",
  "Absurdist", "Atmospheric", "Bleak", "Cerebral", "Claustrophobic", "Campy",
  "Cynical", "Dark", "Dreamlike", "Edgy", "Epic", "Fast-paced", "Gritty",
  "Heartwarming", "Hopeful", "Intense", "Irreverent", "Lighthearted",
  "Melancholic", "Mind-bending", "Nostalgic", "Poetic", "Provocative",
  "Quirky", "Raw", "Romantic", "Satirical", "Sensual", "Slow-burn", "Surreal",
  "Suspenseful", "Tense", "Tragic", "Uplifting", "Whimsical",
];

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,15}$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const REFERRAL_MAX_LENGTH = 40;
const REFERRAL_STORAGE_KEY = "sb:referral-code";

const WRITER_TERMS_VERSION = "writer-onboarding-v2026-03-24";
const WRITER_TERMS_ROUTE = "/terms-conditions?tab=writer";
const PRIVACY_POLICY_VERSION = "registration-privacy-v2026-03-24";
const REGISTRATION_PRIVACY_ROUTE = "/registration-privacy-policy";

const PROOF_ALLOWED_ACCEPT = "image/*,.pdf";

const DRAFT_KEY = "sb-writer-onboarding-modal-draft-v1";

const isValidEmail = (value) => {
  if (!value || typeof value !== "string") return false;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || email.length < 5) return false;
  const re =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!re.test(email)) return false;
  const [local, domain] = email.split("@");
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!domain.includes(".") || domain.startsWith("-") || domain.endsWith("-") || domain.includes("..")) return false;
  return domain.split(".").pop().length >= 2;
};

const validatePassword = (password = "") => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
});

const isValidHttpUrl = (value = "") => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeReferralInput = (value = "") => {
  const str = String(value || "").trim();
  if (str === "null" || str === "undefined") return "";
  return str.slice(0, REFERRAL_MAX_LENGTH);
};

const EMPTY_MEMBERSHIP_REVIEW = {
  requested: false,
  status: "not_submitted",
  proofUrl: "",
  proofPublicId: "",
  proofFileName: "",
  proofMimeType: "",
  submittedAt: undefined,
  reviewedAt: undefined,
  reviewedBy: undefined,
  adminNote: "",
};

const DEFAULT_WRITER_PROFILE = {
  username: "",
  bio: "",
  representationStatus: "unrepresented",
  wgaMember: false,
  sgaMember: false,
  membershipVerification: {
    wga: { ...EMPTY_MEMBERSHIP_REVIEW },
    swa: { ...EMPTY_MEMBERSHIP_REVIEW },
  },
  links: { portfolio: "", instagram: "", twitter: "", linkedin: "", imdb: "", facebook: "" },
  diversity: { gender: "", nationality: "", lgbtqStatus: "", disabilityStatus: "" },
  demographicPrivacy: "searchable",
};

/* Reconcile any persisted / server-returned profile into a fully-formed shape,
   keeping the two member booleans and their verification records in sync. */
const mergeWriterProfile = (profile) => ({
  ...DEFAULT_WRITER_PROFILE,
  ...(profile || {}),
  wgaMember: Boolean(profile?.membershipVerification?.wga?.requested ?? profile?.wgaMember ?? false),
  sgaMember: Boolean(profile?.membershipVerification?.swa?.requested ?? profile?.sgaMember ?? false),
  membershipVerification: {
    wga: {
      ...EMPTY_MEMBERSHIP_REVIEW,
      ...(profile?.membershipVerification?.wga || {}),
      requested: Boolean(profile?.membershipVerification?.wga?.requested ?? profile?.wgaMember ?? false),
    },
    swa: {
      ...EMPTY_MEMBERSHIP_REVIEW,
      ...(profile?.membershipVerification?.swa || {}),
      requested: Boolean(profile?.membershipVerification?.swa?.requested ?? profile?.sgaMember ?? false),
    },
  },
  links: { ...DEFAULT_WRITER_PROFILE.links, ...(profile?.links || {}) },
  diversity: { ...DEFAULT_WRITER_PROFILE.diversity, ...(profile?.diversity || {}) },
});

const DEFAULT_ACCOUNT = { name: "", email: "", phone: "", password: "", referralCode: "", dateOfBirth: "" };

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])';

/* Load the brand webfonts once, lazily, via <link> — never an @import in the
   bundled sheet — so the modal can lay out instantly on the system stack and
   swap to Baskervville / PT Serif when they arrive (display=swap). The id is
   shared with AuthModal + the producer modal so the surfaces only ever inject
   one font link between them. */
const FONT_LINK_ID = "ckript-authmodal-fonts";
function ensureModalFonts() {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "anonymous";
  const sheet = document.createElement("link");
  sheet.id = FONT_LINK_ID;
  sheet.rel = "stylesheet";
  sheet.href =
    "https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap";
  document.head.append(pre1, pre2, sheet);
}

const loadDraft = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
};
const clearDraft = () => {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(DRAFT_KEY);
};

const GUILDS = [
  { key: "wga", review: "wga", member: "wgaMember", title: "WGA Member", desc: "Writers Guild of America" },
  { key: "sga", review: "swa", member: "sgaMember", title: "SWA Member", desc: "Screenwriters Association (India)" },
];

const STATUS_META = {
  approved: { label: "Approved", cls: "wom-status--approved" },
  pending: { label: "Pending review", cls: "wom-status--pending" },
  rejected: { label: "Rejected", cls: "wom-status--rejected" },
};

function WriterOnboardingModalInner({ onClose, onComplete }) {
  const { join, setUser } = useContext(AuthContext);
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const titleId = useId();

  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);
  const firstFieldRef = useRef(null);
  const usernameRequestRef = useRef(0);
  const referralRequestRef = useRef(0);
  const membershipUploadPromiseRef = useRef(Promise.resolve());

  const draftRef = useRef(loadDraft());
  const draft = draftRef.current;

  const [step, setStep] = useState(() => {
    const s = Number(draft?.step);
    return Number.isInteger(s) && s >= 1 && s <= TOTAL_STEPS ? s : 1;
  });
  const [account, setAccount] = useState({ ...DEFAULT_ACCOUNT, ...(draft?.account || {}) });
  const [profile, setProfile] = useState(() => mergeWriterProfile(draft?.profile));
  const [genres, setGenres] = useState(Array.isArray(draft?.genres) ? draft.genres : []);
  const [tags, setTags] = useState(Array.isArray(draft?.tags) ? draft.tags : []);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [accountCreated, setAccountCreated] = useState(Boolean(draft?.accountCreated));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPwReqs, setShowPwReqs] = useState(false);
  const [tagLimitHit, setTagLimitHit] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({
    state: "idle",
    message: "Use 3–30 characters: a–z, 0–9, or _.",
  });
  const [referralStatus, setReferralStatus] = useState({ state: "idle", message: "" });

  // Guild proof files held locally until the profile saves (step 7), then
  // uploaded in the background — exactly as the original writer flow did.
  const [proofFiles, setProofFiles] = useState({ wga: null, swa: null });
  const [uploadsInProgress, setUploadsInProgress] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");

  // OTP step (mirrors AuthModal / producer modal).
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpConfig, setOtpConfig] = useState({
    otpExpirySeconds: undefined,
    resendCooldownSeconds: undefined,
    startCooldownOnMount: false,
  });

  const meta = STEP_META[step - 1];
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  const primaryLabel =
    step === 3 ? "Create Account" : step === 7 ? "Save & Continue" : step === TOTAL_STEPS ? "Complete Setup" : "Continue";

  // ── Capture referral from URL / storage on mount ────────────
  useEffect(() => {
    const fromUrl = normalizeReferralInput(
      searchParams.get("ref") || searchParams.get("referral") || searchParams.get("referralCode")
    );
    if (fromUrl) {
      setAccount((prev) => ({ ...prev, referralCode: fromUrl }));
      if (typeof window !== "undefined") localStorage.setItem(REFERRAL_STORAGE_KEY, fromUrl);
      return;
    }
    if (typeof window !== "undefined") {
      const stored = normalizeReferralInput(localStorage.getItem(REFERRAL_STORAGE_KEY));
      if (stored) setAccount((prev) => (normalizeReferralInput(prev.referralCode) === stored ? prev : { ...prev, referralCode: stored }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist a sanitised draft (never the password) ──────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      step,
      account: { ...account, password: "" },
      profile,
      genres,
      tags,
      accountCreated,
    };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [step, account, profile, genres, tags, accountCreated]);

  // ── Live username availability (debounced) ──────────────────
  useEffect(() => {
    if (step !== 4) return undefined;
    const username = String(profile.username || "").trim().toLowerCase();
    if (!username) {
      setUsernameStatus({ state: "idle", message: "Use 3–30 characters: a–z, 0–9, or _." });
      return undefined;
    }
    if (username.length < 3) {
      setUsernameStatus({ state: "invalid", message: "Username must be at least 3 characters." });
      return undefined;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameStatus({ state: "invalid", message: "Use only lowercase letters, numbers, and underscores." });
      return undefined;
    }
    const requestId = Date.now();
    usernameRequestRef.current = requestId;
    setUsernameStatus({ state: "checking", message: "Checking availability…" });
    let active = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/onboarding/check-username", { params: { username } });
        if (!active || usernameRequestRef.current !== requestId) return;
        setUsernameStatus(
          data?.available
            ? { state: "available", message: "Username is available." }
            : { state: "unavailable", message: "Username is already taken." }
        );
      } catch {
        if (!active || usernameRequestRef.current !== requestId) return;
        setUsernameStatus({ state: "error", message: "Could not verify username right now." });
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [profile.username, step]);

  // ── Live referral validation (debounced, step 3) ────────────
  useEffect(() => {
    if (step !== 3) return undefined;
    const referral = normalizeReferralInput(account.referralCode);
    if (!referral) {
      setReferralStatus({ state: "idle", message: "" });
      return undefined;
    }
    if (referral.length < 3) {
      setReferralStatus({ state: "invalid", message: "Use at least 3 characters." });
      return undefined;
    }
    const requestId = Date.now();
    referralRequestRef.current = requestId;
    setReferralStatus({ state: "checking", message: "Checking referral…" });
    let active = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/validate-referral/${encodeURIComponent(referral)}`);
        if (!active || referralRequestRef.current !== requestId) return;
        const name = String(data?.referrer?.name || "").trim();
        const uname = String(data?.referrer?.username || "").trim();
        const label = name || (uname ? `@${uname}` : "valid referrer");
        setReferralStatus({ state: "valid", message: `Referral applied: ${label}` });
      } catch (err) {
        if (!active || referralRequestRef.current !== requestId) return;
        if (err?.response?.status === 404) {
          setReferralStatus({ state: "invalid", message: "Referral code or username not found." });
          return;
        }
        setReferralStatus({ state: "warning", message: "Couldn't validate now — we'll re-check at signup." });
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [account.referralCode, step]);

  const setField = (key, value) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
    setError("");
    return value;
  };

  const setProfileField = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const setLink = (key, value) =>
    setProfile((p) => ({ ...p, links: { ...p.links, [key]: value } }));
  const setDiversity = (key, value) =>
    setProfile((p) => ({ ...p, diversity: { ...p.diversity, [key]: value } }));

  const toggleGenre = (g) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((v) => v !== g) : [...prev, g]));
  const toggleTag = (t) =>
    setTags((prev) => {
      if (prev.includes(t)) return prev.filter((v) => v !== t);
      if (prev.length >= MAX_TAGS) {
        setTagLimitHit(true);
        return prev;
      }
      return [...prev, t];
    });

  const toggleGuild = (guild) => {
    setError("");
    let nowOff = false;
    setProfile((prev) => {
      const checked = !prev[guild.member];
      nowOff = !checked;
      const current = prev.membershipVerification?.[guild.review] || EMPTY_MEMBERSHIP_REVIEW;
      return {
        ...prev,
        [guild.member]: checked,
        membershipVerification: {
          ...prev.membershipVerification,
          [guild.review]: checked
            ? { ...current, requested: true }
            : { ...EMPTY_MEMBERSHIP_REVIEW, requested: false },
        },
      };
    });
    // Turning a guild off drops any locally-staged proof for it.
    if (nowOff) setProofFiles((prev) => ({ ...prev, [guild.review]: null }));
  };

  const openProof = async (review, fallbackUrl) => {
    try {
      const { data } = await api.get("/onboarding/writer-membership-proof/access-url", {
        params: { membershipType: review },
      });
      const url = data?.url || fallbackUrl;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else setError("Proof link unavailable.");
    } catch {
      if (fallbackUrl) window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  };

  // ── Account creation (step 3 primary) ───────────────────────
  const handleCreateAccount = async () => {
    setError("");
    setFieldErrors({});
    const pw = validatePassword(account.password);
    if (!Object.values(pw).every(Boolean)) {
      setShowPwReqs(true);
      setError("Password does not meet all requirements.");
      return;
    }
    if (normalizeReferralInput(account.referralCode) && referralStatus.state === "invalid") {
      setError("Referral code or username not found.");
      return;
    }
    setLoading(true);
    try {
      const email = account.email.trim().toLowerCase();
      const referralCode = normalizeReferralInput(account.referralCode);
      if (typeof window !== "undefined") {
        if (referralCode) localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);
        else localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
      const response = await join({
        name: account.name.trim(),
        email,
        phone: account.phone.trim(),
        password: account.password,
        role: "creator",
        referralCode,
      });
      if (response?.requiresVerification) {
        setOtpEmail(response?.email || email);
        setOtpConfig({
          otpExpirySeconds: response?.otpExpirySeconds,
          resendCooldownSeconds: response?.resendCooldownSeconds,
          startCooldownOnMount: true,
        });
        setShowOTP(true);
      } else if (response?.token) {
        setAccountCreated(true);
        setStep(4);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      if (/phone/i.test(msg)) setFieldErrors((p) => ({ ...p, phone: msg }));
      else if (/email/i.test(msg)) setFieldErrors((p) => ({ ...p, email: msg }));
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = (userData) => {
    setUser(userData);
    if (userData?.token) localStorage.setItem("user", JSON.stringify(userData));
    setShowOTP(false);
    setAccountCreated(true);
    setStep(4);
  };

  // ── Persist writer profile (step 7 → 8) ─────────────────────
  // Saves the whole profile collected across steps 4–7, then uploads any
  // staged guild-proof files in the background so the writer isn't blocked.
  const saveWriterProfile = async () => {
    const links = profile.links;
    if (Object.values(links).some((v) => v && !isValidHttpUrl(v))) {
      setFieldErrors((p) => ({ ...p, links: "Enter valid URLs starting with http:// or https://." }));
      return false;
    }

    // A selected guild needs proof (a staged file or an already-stored one)
    // unless it's already approved.
    for (const guild of GUILDS) {
      if (!profile[guild.member]) continue;
      const review = profile.membershipVerification?.[guild.review] || EMPTY_MEMBERSHIP_REVIEW;
      const hasProof = Boolean(proofFiles[guild.review] || review.proofUrl);
      if (review.status !== "approved" && !hasProof) {
        setStep(6);
        setError(`Please upload ${guild.title.split(" ")[0]} proof before continuing.`);
        return false;
      }
    }

    setLoading(true);
    try {
      const payload = {
        ...profile,
        username: profile.username.trim().toLowerCase(),
        phone: account.phone.trim(),
      };
      if (account.dateOfBirth) payload.dateOfBirth = account.dateOfBirth;

      const response = await api.put("/onboarding/writer-profile", payload);
      if (response?.data?.user?.writerProfile) {
        setProfile(mergeWriterProfile(response.data.user.writerProfile));
      }

      // Stage → background upload, mirroring the original flow.
      const queued = {
        wga: profile.wgaMember ? proofFiles.wga : null,
        swa: profile.sgaMember ? proofFiles.swa : null,
      };
      setProofFiles({ wga: null, swa: null });

      if (queued.wga || queued.swa) {
        setUploadsInProgress(true);
        setUploadNotice("Membership proof is uploading in the background — you can keep going.");
        membershipUploadPromiseRef.current = (async () => {
          let merged = null;
          const submit = async (membershipType, file) => {
            const form = new FormData();
            form.append("membershipType", membershipType);
            form.append("proof", file);
            const res = await api.post("/onboarding/writer-membership-proof", form, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            if (res?.data?.user?.writerProfile) merged = mergeWriterProfile(res.data.user.writerProfile);
          };
          if (queued.wga) await submit("wga", queued.wga);
          if (queued.swa) await submit("swa", queued.swa);
          return merged;
        })()
          .then((merged) => {
            if (merged) setProfile(merged);
            setUploadNotice("");
          })
          .catch((err) => {
            setUploadNotice("");
            setError(err?.response?.data?.message || "Profile saved, but proof upload failed. Re-upload before completing.");
          })
          .finally(() => setUploadsInProgress(false));
      } else {
        membershipUploadPromiseRef.current = Promise.resolve();
        setUploadsInProgress(false);
        setUploadNotice("");
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your profile. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── Complete (step 9) ───────────────────────────────────────
  const handleComplete = async () => {
    if (!agreeTerms) {
      setError("Please accept the Terms & Conditions to continue.");
      return;
    }
    if (!agreePrivacy) {
      setError("Please accept the Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      if (uploadsInProgress) {
        setUploadNotice("Finishing proof upload before completing setup…");
        await membershipUploadPromiseRef.current;
        setUploadNotice("");
      }
      const response = await api.post("/onboarding/complete", {
        genres,
        tags,
        plan: "free",
        agreementAccepted: agreeTerms,
        termsVersion: WRITER_TERMS_VERSION,
        privacyPolicyAccepted: agreePrivacy,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      });
      if (response?.data?.success !== false) {
        clearDraft();
        onComplete();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Primary action dispatcher ───────────────────────────────
  const handlePrimary = useCallback(async () => {
    if (loading) return;
    setError("");
    switch (step) {
      case 1:
        if (!account.name.trim()) return setFieldErrors((p) => ({ ...p, name: "Please enter your name." }));
        return setStep(2);
      case 2: {
        const errs = {};
        if (!isValidEmail(account.email)) errs.email = "Please enter a valid email.";
        if (!account.phone.trim()) errs.phone = "Phone number is required.";
        else if (!PHONE_REGEX.test(account.phone)) errs.phone = "Enter a valid phone number.";
        if (Object.keys(errs).length) return setFieldErrors((p) => ({ ...p, ...errs }));
        return setStep(3);
      }
      case 3:
        return handleCreateAccount();
      case 4: {
        const u = String(profile.username || "").trim().toLowerCase();
        const errs = {};
        if (!USERNAME_PATTERN.test(u)) errs.username = "Use 3–30 lowercase letters, numbers, or _.";
        else if (usernameStatus.state === "checking") errs.username = "Checking availability…";
        else if (usernameStatus.state === "unavailable") errs.username = "Username is already taken.";
        if (Object.keys(errs).length) return setFieldErrors((p) => ({ ...p, ...errs }));
        return setStep(5);
      }
      case 5: {
        const errs = {};
        if (!profile.bio.trim()) errs.bio = "A short bio is required.";
        if (!profile.diversity.gender) errs.gender = "Required.";
        if (!profile.diversity.nationality) errs.nationality = "Required.";
        if (Object.keys(errs).length) return setFieldErrors((p) => ({ ...p, ...errs }));
        return setStep(6);
      }
      case 6:
        return setStep(7);
      case 7:
        if (await saveWriterProfile()) setStep(8);
        return undefined;
      case 8:
        return setStep(9);
      case 9:
        return handleComplete();
      default:
        return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, account, profile, usernameStatus.state, referralStatus.state, agreeTerms, agreePrivacy, genres, tags, proofFiles, uploadsInProgress, loading]);

  const goBack = () => {
    setError("");
    setFieldErrors({});
    // Never let "Back" return to the account-creation steps once the account
    // exists — those are done. Profile editing starts at step 4.
    setStep((s) => Math.max(accountCreated ? 4 : 1, s - 1));
  };

  const handleFinishLater = () => {
    clearDraft();
    onClose();
    navigate("/profile");
  };

  const handleSignIn = () => {
    onClose();
    openAuthModal();
  };

  // ── Modal chrome: focus management, scroll lock, Esc + trap ──
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      // Enter advances only from a text field — never from textareas, buttons,
      // selects, or the toggle rows (which handle their own keys).
      if (e.key === "Enter" && e.target?.tagName === "INPUT" && e.target?.type !== "file") {
        e.preventDefault();
        handlePrimary();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const nodes = Array.from(cardRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose, handlePrimary]
  );

  useEffect(() => {
    ensureModalFonts();
    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    };
  }, []);

  // Move focus to the first field whenever the visible step changes.
  useEffect(() => {
    if (showOTP) return;
    const t = setTimeout(() => firstFieldRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [step, showOTP]);

  // Auto-dismiss the transient "max tags" warning.
  useEffect(() => {
    if (!tagLimitHit) return undefined;
    const t = setTimeout(() => setTagLimitHit(false), 2200);
    return () => clearTimeout(t);
  }, [tagLimitHit]);

  if (showOTP) {
    return (
      <motion.div
        className="wom-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ padding: 0, background: "#080e18" }}
      >
        <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
          <OTPVerification
            email={otpEmail}
            darkBackground
            otpExpirySeconds={otpConfig.otpExpirySeconds}
            initialResendCooldownSeconds={otpConfig.resendCooldownSeconds}
            startCooldownOnMount={otpConfig.startCooldownOnMount}
            onSuccess={handleOTPSuccess}
            onBack={() => setShowOTP(false)}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="wom-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={cardRef}
        className="wom-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {/* Left editorial image — crossfades per step. */}
        <div className="wom-img-col" aria-hidden="true">
          <div className="wom-img-frame">
            {STEP_IMAGES.map((src, i) => (
              <img
                key={src}
                className="wom-img"
                src={src}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
                style={{
                  opacity: step === i + 1 ? 1 : 0,
                  transform: step === i + 1 ? "scale(1.04)" : "scale(1)",
                }}
              />
            ))}
            <div className="wom-img-scrim" />
            <div className="wom-img-tag">
              <i />
              <span>Writer Onboarding</span>
            </div>
            <div className="wom-img-caption">
              <div className="wom-img-num">{String(step).padStart(2, "0")}</div>
              <div className="wom-img-name">{meta.name}</div>
              <div className="wom-img-quote">Where words become film.</div>
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="wom-content">
          <div className="wom-stepline">Step {step} of {TOTAL_STEPS}</div>
          <div className="wom-progress" aria-hidden="true">
            <div className="wom-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="wom-kicker">
            {String(step).padStart(2, "0")} / 09 · {meta.name.toUpperCase()}
          </div>
          <h2 className="wom-title" id={titleId}>{meta.title}</h2>
          <p className="wom-sub">{meta.sub}</p>

          {error && (
            <div className="wom-error" role="alert">
              <AlertCircle size={16} style={{ flex: "none" }} />
              <span>{error}</span>
            </div>
          )}

          <div className="wom-body">{renderStep()}</div>

          <div className="wom-actions">
            <button type="button" className="wom-primary" onClick={handlePrimary} disabled={loading}>
              {loading && <span className="wom-spinner" />}
              {!loading && primaryLabel}
              {!loading && <ArrowRight size={16} />}
            </button>
            <div className="wom-subrow">
              {step > 1 && (accountCreated ? step > 4 : true) ? (
                <button type="button" className="wom-back" onClick={goBack}>← Back</button>
              ) : (
                <span />
              )}
              {step === 1 && (
                <span className="wom-signin">
                  Already a member? <button type="button" onClick={handleSignIn}>Sign in</button>
                </span>
              )}
              {step >= 4 && (
                <button type="button" className="wom-finish" onClick={handleFinishLater}>
                  I'll finish later →
                </button>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="wom-close" aria-label="Close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );

  // ── Per-step form bodies ────────────────────────────────────
  function renderStep() {
    switch (step) {
      case 1:
        return (
          <div className="wom-field">
            <label className="wom-label" htmlFor={`${titleId}-name`}>Full Name</label>
            <input
              id={`${titleId}-name`}
              ref={firstFieldRef}
              className="wom-input"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={account.name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(e) => setAccount({ ...account, name: setField("name", e.target.value) })}
            />
            {fieldErrors.name && <p className="wom-hint wom-hint--err">{fieldErrors.name}</p>}
          </div>
        );
      case 2:
        return (
          <>
            <div className="wom-field">
              <label className="wom-label" htmlFor={`${titleId}-email`}>Email Address</label>
              <input
                id={`${titleId}-email`}
                ref={firstFieldRef}
                className="wom-input"
                type="email"
                autoComplete="email"
                placeholder="writer@example.com"
                value={account.email}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={(e) => setAccount({ ...account, email: setField("email", e.target.value) })}
              />
              {fieldErrors.email && <p className="wom-hint wom-hint--err">{fieldErrors.email}</p>}
            </div>
            <div className="wom-field">
              <label className="wom-label" htmlFor={`${titleId}-phone`}>Phone Number</label>
              <input
                id={`${titleId}-phone`}
                className="wom-input"
                type="tel"
                autoComplete="tel"
                placeholder="+91 00000 00000"
                value={account.phone}
                aria-invalid={Boolean(fieldErrors.phone)}
                onChange={(e) => setAccount({ ...account, phone: setField("phone", e.target.value) })}
              />
              {fieldErrors.phone && <p className="wom-hint wom-hint--err">{fieldErrors.phone}</p>}
            </div>
          </>
        );
      case 3: {
        const v = validatePassword(account.password);
        const reqs = [
          [v.length, "At least 8 characters"],
          [v.uppercase, "One uppercase letter (A–Z)"],
          [v.lowercase, "One lowercase letter (a–z)"],
          [v.number, "One number (0–9)"],
          [v.special, "One special character (!@#$%^&*)"],
        ];
        const refClass =
          referralStatus.state === "valid"
            ? "wom-hint--ok"
            : referralStatus.state === "invalid"
            ? "wom-hint--err"
            : referralStatus.state === "warning"
            ? "wom-hint--warn"
            : "wom-hint--muted";
        return (
          <>
            <div className="wom-field wom-password">
              <label className="wom-label" htmlFor={`${titleId}-pw`}>Password</label>
              <PasswordInput
                id={`${titleId}-pw`}
                className="wom-input"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={account.password}
                onFocus={() => setShowPwReqs(true)}
                onChange={(e) => {
                  setShowPwReqs(true);
                  setAccount({ ...account, password: setField("password", e.target.value) });
                }}
              />
              {showPwReqs && (
                <div className="wom-pwreqs">
                  {reqs.map(([ok, text]) => (
                    <div key={text} className={`wom-pwreq ${ok ? "wom-pwreq--ok" : ""}`}>
                      <i>{ok ? "✓" : "○"}</i>{text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="wom-field">
              <label className="wom-label" htmlFor={`${titleId}-ref`}>
                Referral Code <span className="wom-opt">(optional)</span>
              </label>
              <input
                id={`${titleId}-ref`}
                className="wom-input"
                type="text"
                placeholder="Enter referral code or referrer's username"
                value={account.referralCode}
                onChange={(e) => setAccount({ ...account, referralCode: setField("referralCode", e.target.value.slice(0, REFERRAL_MAX_LENGTH)) })}
              />
              {account.referralCode && referralStatus.message && (
                <p className={`wom-hint ${refClass}`}>{referralStatus.message}</p>
              )}
            </div>
          </>
        );
      }
      case 4:
        return (
          <div className="wom-field">
            <label className="wom-label" htmlFor={`${titleId}-user`}>Username</label>
            <div className="wom-input-prefix">
              <span>@</span>
              <input
                id={`${titleId}-user`}
                ref={firstFieldRef}
                className="wom-input"
                type="text"
                placeholder="rahul_writes"
                value={profile.username}
                aria-invalid={Boolean(fieldErrors.username) || usernameStatus.state === "unavailable"}
                onChange={(e) =>
                  setProfileField("username", setField("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")))
                }
              />
            </div>
            {fieldErrors.username ? (
              <p className="wom-hint wom-hint--err">{fieldErrors.username}</p>
            ) : (
              usernameStatus.message && (
                <p
                  className={`wom-hint ${
                    usernameStatus.state === "available"
                      ? "wom-hint--ok"
                      : ["unavailable", "invalid"].includes(usernameStatus.state)
                      ? "wom-hint--err"
                      : "wom-hint--muted"
                  }`}
                >
                  {usernameStatus.message}
                </p>
              )
            )}
          </div>
        );
      case 5:
        return (
          <>
            <div className="wom-field">
              <label className="wom-label" htmlFor={`${titleId}-bio`}>Short Bio</label>
              <textarea
                id={`${titleId}-bio`}
                ref={firstFieldRef}
                className="wom-textarea"
                rows={3}
                placeholder="Screenwriter based in Mumbai with a love for noir thrillers…"
                value={profile.bio}
                aria-invalid={Boolean(fieldErrors.bio)}
                onChange={(e) => setProfileField("bio", setField("bio", e.target.value))}
              />
              {fieldErrors.bio && <p className="wom-hint wom-hint--err">{fieldErrors.bio}</p>}
            </div>
            <div className="wom-row">
              <div className="wom-field">
                <label className="wom-label" htmlFor={`${titleId}-gender`}>Gender</label>
                <select
                  id={`${titleId}-gender`}
                  className="wom-select"
                  value={profile.diversity.gender}
                  aria-invalid={Boolean(fieldErrors.gender)}
                  onChange={(e) => setDiversity("gender", setField("gender", e.target.value))}
                >
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {fieldErrors.gender && <p className="wom-hint wom-hint--err">{fieldErrors.gender}</p>}
              </div>
              <div className="wom-field">
                <label className="wom-label" htmlFor={`${titleId}-nat`}>Nationality</label>
                <select
                  id={`${titleId}-nat`}
                  className="wom-select"
                  value={profile.diversity.nationality}
                  aria-invalid={Boolean(fieldErrors.nationality)}
                  onChange={(e) => setDiversity("nationality", setField("nationality", e.target.value))}
                >
                  <option value="">Select</option>
                  {NATIONALITY_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {fieldErrors.nationality && <p className="wom-hint wom-hint--err">{fieldErrors.nationality}</p>}
              </div>
            </div>
            <div className="wom-field">
              <label className="wom-label" htmlFor={`${titleId}-dob`}>
                Date of Birth <span className="wom-opt">(optional)</span>
              </label>
              <input
                id={`${titleId}-dob`}
                className="wom-input"
                type="date"
                value={account.dateOfBirth}
                onChange={(e) => setAccount({ ...account, dateOfBirth: e.target.value })}
              />
            </div>
          </>
        );
      case 6:
        return (
          <>
            {GUILDS.map((guild) => {
              const on = profile[guild.member];
              const review = profile.membershipVerification?.[guild.review] || EMPTY_MEMBERSHIP_REVIEW;
              const statusMeta = STATUS_META[String(review.status || "").toLowerCase()];
              const file = proofFiles[guild.review];
              return (
                <div key={guild.key} style={{ marginBottom: 12 }}>
                  <div
                    className={`wom-toggle ${on ? "wom-toggle--on" : ""}`}
                    role="checkbox"
                    aria-checked={on}
                    tabIndex={0}
                    onClick={() => toggleGuild(guild)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleGuild(guild);
                      }
                    }}
                  >
                    <div>
                      <div className="wom-toggle-title">{guild.title}</div>
                      <div className="wom-toggle-desc">{guild.desc}</div>
                    </div>
                    <span className={`wom-toggle-box ${on ? "wom-toggle-box--on" : ""}`}>{on ? "✓" : ""}</span>
                  </div>
                  {on && (
                    <div className="wom-proof">
                      {review.status === "approved" ? (
                        <span className={`wom-status ${statusMeta?.cls || ""}`}>{statusMeta?.label}</span>
                      ) : (
                        <>
                          <label className={`wom-upload ${file || review.proofUrl ? "wom-upload--filled" : ""}`}>
                            <input
                              type="file"
                              hidden
                              accept={PROOF_ALLOWED_ACCEPT}
                              onChange={(e) => {
                                setError("");
                                setProofFiles((prev) => ({ ...prev, [guild.review]: e.target.files?.[0] || null }));
                              }}
                            />
                            <FileText size={16} />
                            {file
                              ? file.name
                              : review.proofFileName
                              ? `Replace ${review.proofFileName}`
                              : `Upload ${guild.title.split(" ")[0]} proof (image or PDF)`}
                          </label>
                          {statusMeta && (
                            <span className={`wom-status ${statusMeta.cls}`}>
                              {statusMeta.label}
                              {review.proofUrl && (
                                <button
                                  type="button"
                                  onClick={() => openProof(guild.review, review.proofUrl)}
                                  style={{ background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                                >
                                  view
                                </button>
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        );
      case 7:
        return (
          <>
            {uploadNotice && <div className="wom-notice">{uploadNotice}</div>}
            <div className="wom-field">
              <label className="wom-label" htmlFor={`${titleId}-portfolio`}>Portfolio / Website</label>
              <input
                id={`${titleId}-portfolio`}
                ref={firstFieldRef}
                className="wom-input"
                type="url"
                placeholder="https://yourportfolio.com"
                value={profile.links.portfolio}
                onChange={(e) => setLink("portfolio", setField("links", e.target.value))}
              />
            </div>
            <div className="wom-row" style={{ marginBottom: 11 }}>
              <input className="wom-input" type="url" placeholder="Instagram URL" value={profile.links.instagram}
                onChange={(e) => setLink("instagram", setField("links", e.target.value))} />
              <input className="wom-input" type="url" placeholder="Twitter / X URL" value={profile.links.twitter}
                onChange={(e) => setLink("twitter", setField("links", e.target.value))} />
            </div>
            <div className="wom-row">
              <input className="wom-input" type="url" placeholder="LinkedIn URL" value={profile.links.linkedin}
                onChange={(e) => setLink("linkedin", setField("links", e.target.value))} />
              <input className="wom-input" type="url" placeholder="IMDb URL" value={profile.links.imdb}
                onChange={(e) => setLink("imdb", setField("links", e.target.value))} />
            </div>
            {fieldErrors.links && <p className="wom-hint wom-hint--err" style={{ marginTop: 10 }}>{fieldErrors.links}</p>}
          </>
        );
      case 8:
        return (
          <>
            <div className="wom-field">
              <label className="wom-label">Genres</label>
              <div className="wom-chips">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`wom-chip ${genres.includes(g) ? "wom-chip--active" : ""}`}
                    aria-pressed={genres.includes(g)}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="wom-rule" />
            <div className="wom-field">
              <label className="wom-label">
                Story Tags <span className="wom-opt">(max {MAX_TAGS})</span>
              </label>
              {tagLimitHit && <p className="wom-hint wom-hint--err" style={{ margin: "0 0 8px" }}>Maximum of {MAX_TAGS} tags allowed.</p>}
              <div className="wom-chips">
                {TAG_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`wom-chip ${tags.includes(t) ? "wom-chip--active" : ""}`}
                    aria-pressed={tags.includes(t)}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      case 9:
        return (
          <>
            {uploadNotice && <div className="wom-notice">{uploadNotice}</div>}
            <div className="wom-legal-links">
              <a className="wom-legal-link" href={WRITER_TERMS_ROUTE} target="_blank" rel="noopener noreferrer">
                Terms &amp; Conditions →
              </a>
              <a className="wom-legal-link" href={REGISTRATION_PRIVACY_ROUTE} target="_blank" rel="noopener noreferrer">
                Privacy Policy →
              </a>
            </div>
            <div className="wom-rule" style={{ margin: "0 0 16px" }} />
            <div
              className="wom-agree"
              role="checkbox"
              aria-checked={agreeTerms}
              tabIndex={0}
              onClick={() => { setAgreeTerms((a) => !a); setError(""); }}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAgreeTerms((a) => !a); setError(""); } }}
            >
              <span className={`wom-agree-box ${agreeTerms ? "wom-agree-box--on" : ""}`}>{agreeTerms ? "✓" : ""}</span>
              <span className="wom-agree-text">I have read and agree to the Writer Onboard Terms &amp; Conditions.</span>
            </div>
            <div
              className="wom-agree"
              role="checkbox"
              aria-checked={agreePrivacy}
              tabIndex={0}
              onClick={() => { setAgreePrivacy((a) => !a); setError(""); }}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAgreePrivacy((a) => !a); setError(""); } }}
            >
              <span className={`wom-agree-box ${agreePrivacy ? "wom-agree-box--on" : ""}`}>{agreePrivacy ? "✓" : ""}</span>
              <span className="wom-agree-text">I have read and agree to the Registration Privacy Policy.</span>
            </div>
          </>
        );
      default:
        return null;
    }
  }
}

/* Public component. `onComplete` defaults to landing the new writer on their
   profile, matching the original writer onboarding flow. */
export default function WriterOnboardingModal({ open, onClose, onComplete }) {
  const navigate = useNavigate();
  const complete = useMemo(
    () => onComplete || (() => navigate("/profile", { replace: true })),
    [onComplete, navigate]
  );
  return (
    <AnimatePresence>
      {open && (
        <WriterOnboardingModalInner key="writer-onboarding-modal" onClose={onClose} onComplete={complete} />
      )}
    </AnimatePresence>
  );
}
