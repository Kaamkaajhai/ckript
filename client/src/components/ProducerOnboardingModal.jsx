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
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, FileText } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import api from "../services/api";
import OTPVerification from "./OTPVerification";
import PasswordInput from "./PasswordInput";
import "./ProducerOnboardingModal.css";

/* ─────────────────────────────────────────────────────────────
   Ckript — Producer / Director onboarding modal.

   Port of the "Producer Onboarding Modal.dc.html" Claude Design handoff
   (Variation A: split editorial). This is the single, canonical producer
   onboarding surface: it replaces the old full-page InvestorOnboarding flow
   and is reachable two ways —
     • inline from the sign-up modal's "Join as Producer" card, and
     • as the /producer-director-onboarding route (rendered over a backdrop),
       so deep links, the sidebar entry, upgrade CTAs and SEO all keep working.

   It deliberately reuses the app's existing, battle-tested machinery rather
   than reinventing it: AuthContext.join for sign-up, OTPVerification for email
   verification, the live username-availability endpoint, the industry credit
   upload endpoints, and the same /users/update profile contract as before.

   Eight steps, matching the producer data model 1:1:
     1 Account · 2 Contact · 3 Password · 4 Identity ·
     5 About · 6 Credits · 7 Discover · 8 Terms
   ───────────────────────────────────────────────────────────── */

const UNSPLASH = (id, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/* Per-step film stills — crossfade as the producer advances. */
const STEP_IMAGES = [
  "photo-1485846234645-a62644f84728", // cinema auditorium
  "photo-1598899134739-24c46f58b8c0", // contact / reach
  "photo-1489599849927-2ee91cede3ba", // projector light
  "photo-1517604931442-7e0c8ed2963c", // director's chair
  "photo-1455390582262-044cdead277a", // writing / craft
  "photo-1478720568477-152d9b164e26", // film reel
  "photo-1536440136628-849c177e76a1", // clapperboard
  "photo-1581905764498-f1b60bae941a", // theatre seats
].map((id) => UNSPLASH(id));

const STEP_META = [
  { name: "Account", title: "Your name", sub: "Every great production starts with a name." },
  { name: "Contact", title: "How we reach you", sub: "Email for verification, phone for security." },
  { name: "Password", title: "Secure your account", sub: "Choose a password worthy of your slate." },
  { name: "Identity", title: "Industry identity", sub: "Your standing in the business of film." },
  { name: "About", title: "About you", sub: "A few details for your producer profile." },
  { name: "Credits", title: "Notable credits", sub: "The work that speaks for you. Optional." },
  { name: "Discover", title: "What moves you", sub: "Genres and formats to shape your feed." },
  { name: "Terms", title: "Almost there", sub: "Review and accept to enter Ckript." },
];

const TOTAL_STEPS = 8;

const INDUSTRY_ROLE_OPTIONS = [
  { value: "producer", label: "Producer" },
  { value: "director", label: "Director" },
  { value: "executive_producer", label: "Executive Producer" },
  { value: "line_producer", label: "Line Producer" },
  { value: "showrunner", label: "Showrunner" },
  { value: "development_executive", label: "Development Executive" },
  { value: "studio_executive", label: "Studio Executive" },
  { value: "agent", label: "Agent" },
  { value: "actor", label: "Actor" },
  { value: "other", label: "Other" },
];
const INDUSTRY_ROLE_VALUE_SET = new Set(INDUSTRY_ROLE_OPTIONS.map((o) => o.value));

const GENDER_OPTIONS = ["Male", "Female", "Trans", "Prefer not to say", "Other"];
const NATIONALITY_OPTIONS = [
  "Indian", "American", "British", "Canadian", "Australian", "German", "French",
  "Italian", "Spanish", "Japanese", "South Korean", "Chinese", "Singaporean",
  "Emirati", "Saudi Arabian", "Pakistani", "Bangladeshi", "Nepalese", "Sri Lankan", "Other",
];
const GENRE_OPTIONS = [
  "Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "Sci-Fi",
  "Fantasy", "Mystery", "Adventure", "Crime", "Documentary", "Historical",
  "Animation", "Musical",
];
const FORMAT_OPTIONS = [
  { value: "feature", label: "Feature Film" },
  { value: "movie", label: "Movie" },
  { value: "tv_1hour", label: "TV Pilot (1-Hour)" },
  { value: "tv_halfhour", label: "TV Pilot (Half-Hour)" },
  { value: "limited_series", label: "Limited Series" },
  { value: "tv_serial", label: "TV Serial" },
  { value: "short", label: "Short Film" },
  { value: "web_series", label: "Web Series" },
  { value: "documentary", label: "Documentary" },
  { value: "anime", label: "Anime" },
  { value: "cartoon", label: "Cartoon" },
  { value: "drama_school", label: "Drama School" },
  { value: "songs", label: "Songs" },
  { value: "standup_comedy", label: "Standup Comedy" },
  { value: "dialogues", label: "Dialogues" },
  { value: "poet", label: "Poet" },
  { value: "other", label: "Other" },
];

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,15}$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const INVESTOR_TERMS_ROUTE = "/terms-conditions?tab=investor";
const INVESTOR_TERMS_VERSION = "investor-onboarding-v2026-03-24";
const PRIVACY_POLICY_VERSION = "registration-privacy-v2026-03-24";
const REGISTRATION_PRIVACY_ROUTE = "/registration-privacy-policy";

const NOTABLE_CREDIT_ALLOWED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".mp4", ".mov", ".webm", ".avi", ".mkv",
];
const NOTABLE_CREDIT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
  "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska",
]);
const MAX_NOTABLE_CREDIT_TOTAL_FILES = 12;

const DRAFT_KEY = "sb-producer-onboarding-draft-v1";

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

const isAllowedCreditFile = (file) => {
  const mime = String(file?.type || "").toLowerCase();
  if (NOTABLE_CREDIT_ALLOWED_MIME_TYPES.has(mime)) return true;
  const name = String(file?.name || "").toLowerCase();
  return NOTABLE_CREDIT_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const DEFAULT_ACCOUNT = { name: "", email: "", phone: "", password: "", referralCode: "" };
const DEFAULT_PROFILE = {
  username: "", subRole: "", subRoleOther: "", jobTitle: "", company: "",
  bio: "", gender: "", nationality: "", previousCredits: "",
  linkedInUrl: "", imdbUrl: "", instagramUrl: "", twitterUrl: "",
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])';

/* Load the brand webfonts once, lazily, via <link> — never an @import in the
   bundled sheet — so the modal can lay out instantly on the system stack and
   swap to Baskervville / PT Serif when they arrive (display=swap). The id is
   shared with AuthModal so the two surfaces only ever inject one font link. */
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

function ProducerOnboardingModalInner({ onClose, onComplete }) {
  const { join, setUser } = useContext(AuthContext);
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const titleId = useId();

  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);
  const firstFieldRef = useRef(null);
  const usernameRequestRef = useRef(0);

  const draftRef = useRef(loadDraft());
  const draft = draftRef.current;

  const [step, setStep] = useState(() => {
    const s = Number(draft?.step);
    return Number.isInteger(s) && s >= 1 && s <= TOTAL_STEPS ? s : 1;
  });
  const [account, setAccount] = useState({ ...DEFAULT_ACCOUNT, ...(draft?.account || {}) });
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE, ...(draft?.profile || {}) });
  const [genres, setGenres] = useState(Array.isArray(draft?.genres) ? draft.genres : []);
  const [formats, setFormats] = useState(Array.isArray(draft?.formats) ? draft.formats : []);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [accountCreated, setAccountCreated] = useState(Boolean(draft?.accountCreated));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPwReqs, setShowPwReqs] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({
    state: "idle",
    message: "Use 3–30 characters: a–z, 0–9, or _.",
  });

  const [creditAttachments, setCreditAttachments] = useState(
    Array.isArray(draft?.creditAttachments) ? draft.creditAttachments : []
  );
  const [pendingCreditFiles, setPendingCreditFiles] = useState([]);
  const [creditUploading, setCreditUploading] = useState(false);
  const [creditNotice, setCreditNotice] = useState("");

  // OTP step (mirrors AuthModal / the old onboarding page).
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpConfig, setOtpConfig] = useState({
    otpExpirySeconds: undefined,
    resendCooldownSeconds: undefined,
    startCooldownOnMount: false,
  });

  const meta = STEP_META[step - 1];
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  const primaryLabel = step === 3 ? "Create Account" : step === TOTAL_STEPS ? "Enter Platform" : "Continue";

  // ── Persist a sanitised draft (never the password) ──────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      step,
      account: { ...account, password: "" },
      profile,
      genres,
      formats,
      accountCreated,
      creditAttachments,
    };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [step, account, profile, genres, formats, accountCreated, creditAttachments]);

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

  const setField = (key, value) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
    setError("");
    return value;
  };

  const toggle = (list, setList, value) =>
    setList((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

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
    setLoading(true);
    try {
      const email = account.email.trim().toLowerCase();
      const response = await join({
        name: account.name.trim(),
        email,
        phone: account.phone.trim(),
        password: account.password,
        role: "investor",
        referralCode: account.referralCode,
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

  // ── Credit attachments (step 6, optional, immediate upload) ──
  const handleCreditFiles = async (event) => {
    setError("");
    setCreditNotice("");
    const inputEl = event.target;
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    if (files.some((f) => !isAllowedCreditFile(f))) {
      setFieldErrors((p) => ({ ...p, credit: "Only image, PDF, and video files are allowed." }));
      if (inputEl) inputEl.value = "";
      return;
    }
    if (creditAttachments.length + files.length > MAX_NOTABLE_CREDIT_TOTAL_FILES) {
      setFieldErrors((p) => ({ ...p, credit: `You can store up to ${MAX_NOTABLE_CREDIT_TOTAL_FILES} files.` }));
      if (inputEl) inputEl.value = "";
      return;
    }
    setFieldErrors((p) => ({ ...p, credit: "" }));
    setPendingCreditFiles(files);
    setCreditUploading(true);
    setCreditNotice(`Uploading ${files.length} file(s)…`);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("attachments", f));
      const res = await api.post("/users/industry-credit-attachments", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (Array.isArray(res?.data?.attachments)) setCreditAttachments(res.data.attachments);
      setCreditNotice("Files uploaded.");
    } catch (err) {
      setFieldErrors((p) => ({ ...p, credit: err.response?.data?.message || "Failed to upload files." }));
      setCreditNotice("");
    } finally {
      setPendingCreditFiles([]);
      setCreditUploading(false);
      if (inputEl) inputEl.value = "";
    }
  };

  const handleRemoveCredit = async (attachment) => {
    try {
      const res = await api.delete("/users/industry-credit-attachments", {
        data: { publicId: attachment?.publicId, url: attachment?.url },
      });
      if (Array.isArray(res?.data?.attachments)) {
        setCreditAttachments(res.data.attachments);
      } else {
        setCreditAttachments((prev) =>
          prev.filter((it) =>
            !((attachment?.publicId && it?.publicId === attachment.publicId) ||
              (attachment?.url && it?.url === attachment.url))
          )
        );
      }
    } catch (err) {
      setFieldErrors((p) => ({ ...p, credit: err.response?.data?.message || "Failed to remove attachment." }));
    }
  };

  // ── Persist profile (step 6 → 7) ────────────────────────────
  const saveProfile = async () => {
    const urlFields = {
      linkedInUrl: profile.linkedInUrl.trim(),
      imdbUrl: profile.imdbUrl.trim(),
      instagramUrl: profile.instagramUrl.trim(),
      twitterUrl: profile.twitterUrl.trim(),
    };
    if (Object.values(urlFields).some((v) => v && !isValidHttpUrl(v))) {
      setFieldErrors((p) => ({ ...p, social: "Enter valid URLs starting with http:// or https://." }));
      return false;
    }
    if (creditUploading) {
      setFieldErrors((p) => ({ ...p, credit: "Please wait for the upload to finish." }));
      return false;
    }
    setLoading(true);
    try {
      await api.put("/users/update", {
        username: profile.username.trim().toLowerCase(),
        subRole: profile.subRole,
        subRoleOther: profile.subRole === "other" ? profile.subRoleOther.trim() : "",
        jobTitle: profile.jobTitle.trim(),
        company: profile.company.trim(),
        bio: profile.bio.trim(),
        previousCredits: profile.previousCredits.trim(),
        linkedInUrl: urlFields.linkedInUrl,
        imdbUrl: urlFields.imdbUrl,
        socialLinks: { instagram: urlFields.instagramUrl, twitter: urlFields.twitterUrl },
        demographics: { gender: profile.gender, nationality: profile.nationality },
      });
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your profile. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── Persist preferences (step 7 → 8) ────────────────────────
  const savePreferences = async () => {
    setLoading(true);
    try {
      await api.put("/users/update", { preferredGenres: genres, preferredFormats: formats });
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your preferences. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ── Complete (step 8) ───────────────────────────────────────
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
      await api.put("/users/update", {
        onboardingComplete: true,
        privacyPolicyAccepted: true,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: INVESTOR_TERMS_VERSION,
      });
      clearDraft();
      onComplete();
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
        if (!INDUSTRY_ROLE_VALUE_SET.has(profile.subRole)) errs.subRole = "Role focus is required.";
        else if (profile.subRole === "other" && !profile.subRoleOther.trim()) errs.subRole = "Please specify your role focus.";
        if (!profile.jobTitle.trim()) errs.jobTitle = "Job title is required.";
        if (!profile.company.trim()) errs.company = "Production house / firm is required.";
        if (Object.keys(errs).length) return setFieldErrors((p) => ({ ...p, ...errs }));
        return setStep(5);
      }
      case 5: {
        const errs = {};
        if (!profile.bio.trim()) errs.bio = "A short bio is required.";
        if (!profile.gender) errs.gender = "Required.";
        if (!profile.nationality) errs.nationality = "Required.";
        if (Object.keys(errs).length) return setFieldErrors((p) => ({ ...p, ...errs }));
        return setStep(6);
      }
      case 6:
        if (await saveProfile()) setStep(7);
        return undefined;
      case 7:
        if (await savePreferences()) setStep(8);
        return undefined;
      case 8:
        return handleComplete();
      default:
        return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, account, profile, usernameStatus.state, agreeTerms, agreePrivacy, genres, formats, creditUploading, loading]);

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
    navigate("/dashboard");
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
      // selects, or the toggle "checkbox" rows (which handle their own keys).
      if (e.key === "Enter" && e.target?.tagName === "INPUT") {
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

  if (showOTP) {
    return (
      <motion.div
        className="pom-overlay"
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
      className="pom-overlay"
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
        className="pom-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {/* Left editorial image — crossfades per step. */}
        <div className="pom-img-col" aria-hidden="true">
          <div className="pom-img-frame">
            {STEP_IMAGES.map((src, i) => (
              <img
                key={src}
                className="pom-img"
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
            <div className="pom-img-scrim" />
            <div className="pom-img-tag">
              <i />
              <span>Producer Onboarding</span>
            </div>
            <div className="pom-img-caption">
              <div className="pom-img-num">{String(step).padStart(2, "0")}</div>
              <div className="pom-img-name">{meta.name}</div>
              <div className="pom-img-quote">Where stories become films.</div>
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="pom-content">
          <div className="pom-stepline">Step {step} of {TOTAL_STEPS}</div>
          <div className="pom-progress" aria-hidden="true">
            <div className="pom-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="pom-kicker">
            {String(step).padStart(2, "0")} / 08 · {meta.name.toUpperCase()}
          </div>
          <h2 className="pom-title" id={titleId}>{meta.title}</h2>
          <p className="pom-sub">{meta.sub}</p>

          {error && (
            <div className="pom-error" role="alert">
              <AlertCircle size={16} style={{ flex: "none" }} />
              <span>{error}</span>
            </div>
          )}

          <div className="pom-body">{renderStep()}</div>

          <div className="pom-actions">
            <button type="button" className="pom-primary" onClick={handlePrimary} disabled={loading}>
              {loading && <span className="pom-spinner" />}
              {!loading && primaryLabel}
              {!loading && <ArrowRight size={16} />}
            </button>
            <div className="pom-subrow">
              {step > 1 && (accountCreated ? step > 4 : true) ? (
                <button type="button" className="pom-back" onClick={goBack}>← Back</button>
              ) : (
                <span />
              )}
              {step === 1 && (
                <span className="pom-signin">
                  Already a member? <button type="button" onClick={handleSignIn}>Sign in</button>
                </span>
              )}
              {step >= 4 && (
                <button type="button" className="pom-finish" onClick={handleFinishLater}>
                  I'll finish later →
                </button>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="pom-close" aria-label="Close" onClick={onClose}>
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
          <div className="pom-field">
            <label className="pom-label" htmlFor={`${titleId}-name`}>Full Name</label>
            <input
              id={`${titleId}-name`}
              ref={firstFieldRef}
              className="pom-input"
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={account.name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(e) => setAccount({ ...account, name: setField("name", e.target.value) })}
            />
            {fieldErrors.name && <p className="pom-hint pom-hint--err">{fieldErrors.name}</p>}
          </div>
        );
      case 2:
        return (
          <>
            <div className="pom-field">
              <label className="pom-label" htmlFor={`${titleId}-email`}>Email Address</label>
              <input
                id={`${titleId}-email`}
                ref={firstFieldRef}
                className="pom-input"
                type="email"
                autoComplete="email"
                placeholder="producer@example.com"
                value={account.email}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={(e) => setAccount({ ...account, email: setField("email", e.target.value) })}
              />
              {fieldErrors.email && <p className="pom-hint pom-hint--err">{fieldErrors.email}</p>}
            </div>
            <div className="pom-field">
              <label className="pom-label" htmlFor={`${titleId}-phone`}>Phone Number</label>
              <input
                id={`${titleId}-phone`}
                className="pom-input"
                type="tel"
                autoComplete="tel"
                placeholder="+91 00000 00000"
                value={account.phone}
                aria-invalid={Boolean(fieldErrors.phone)}
                onChange={(e) => setAccount({ ...account, phone: setField("phone", e.target.value) })}
              />
              {fieldErrors.phone && <p className="pom-hint pom-hint--err">{fieldErrors.phone}</p>}
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
        return (
          <>
            <div className="pom-field pom-password">
              <label className="pom-label" htmlFor={`${titleId}-pw`}>Password</label>
              <PasswordInput
                id={`${titleId}-pw`}
                className="pom-input"
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
                <div className="pom-pwreqs">
                  {reqs.map(([ok, text]) => (
                    <div key={text} className={`pom-pwreq ${ok ? "pom-pwreq--ok" : ""}`}>
                      <i>{ok ? "✓" : "○"}</i>{text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pom-field">
              <label className="pom-label" htmlFor={`${titleId}-ref`}>
                Referral Code <span className="pom-opt">(optional)</span>
              </label>
              <input
                id={`${titleId}-ref`}
                className="pom-input"
                type="text"
                placeholder="Enter referral code or referrer's username"
                value={account.referralCode}
                onChange={(e) => setAccount({ ...account, referralCode: setField("referralCode", e.target.value.slice(0, 40)) })}
              />
            </div>
          </>
        );
      }
      case 4:
        return (
          <>
            <div className="pom-field">
              <label className="pom-label" htmlFor={`${titleId}-user`}>Username</label>
              <div className="pom-input-prefix">
                <span>@</span>
                <input
                  id={`${titleId}-user`}
                  ref={firstFieldRef}
                  className="pom-input"
                  type="text"
                  placeholder="aryan_visuals"
                  value={profile.username}
                  aria-invalid={Boolean(fieldErrors.username) || usernameStatus.state === "unavailable"}
                  onChange={(e) =>
                    setProfile({ ...profile, username: setField("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")) })
                  }
                />
              </div>
              {fieldErrors.username ? (
                <p className="pom-hint pom-hint--err">{fieldErrors.username}</p>
              ) : (
                usernameStatus.message && (
                  <p
                    className={`pom-hint ${
                      usernameStatus.state === "available"
                        ? "pom-hint--ok"
                        : ["unavailable", "invalid"].includes(usernameStatus.state)
                        ? "pom-hint--err"
                        : "pom-hint--muted"
                    }`}
                  >
                    {usernameStatus.message}
                  </p>
                )
              )}
            </div>
            <div className="pom-field">
              <label className="pom-label" htmlFor={`${titleId}-role`}>Role Focus</label>
              <select
                id={`${titleId}-role`}
                className="pom-select"
                value={profile.subRole}
                aria-invalid={Boolean(fieldErrors.subRole)}
                onChange={(e) => setProfile({ ...profile, subRole: setField("subRole", e.target.value) })}
              >
                <option value="">Select your role</option>
                {INDUSTRY_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {profile.subRole === "other" && (
                <input
                  className="pom-input"
                  style={{ marginTop: 8 }}
                  type="text"
                  placeholder="Specify your role focus"
                  value={profile.subRoleOther}
                  onChange={(e) => setProfile({ ...profile, subRoleOther: setField("subRole", e.target.value) })}
                />
              )}
              {fieldErrors.subRole && <p className="pom-hint pom-hint--err">{fieldErrors.subRole}</p>}
            </div>
            <div className="pom-row">
              <div className="pom-field">
                <label className="pom-label" htmlFor={`${titleId}-job`}>Job Title</label>
                <input
                  id={`${titleId}-job`}
                  className="pom-input"
                  type="text"
                  placeholder="Creative Producer"
                  value={profile.jobTitle}
                  aria-invalid={Boolean(fieldErrors.jobTitle)}
                  onChange={(e) => setProfile({ ...profile, jobTitle: setField("jobTitle", e.target.value) })}
                />
                {fieldErrors.jobTitle && <p className="pom-hint pom-hint--err">{fieldErrors.jobTitle}</p>}
              </div>
              <div className="pom-field">
                <label className="pom-label" htmlFor={`${titleId}-firm`}>Production House / Firm</label>
                <input
                  id={`${titleId}-firm`}
                  className="pom-input"
                  type="text"
                  placeholder="Novastride Pictures"
                  value={profile.company}
                  aria-invalid={Boolean(fieldErrors.company)}
                  onChange={(e) => setProfile({ ...profile, company: setField("company", e.target.value) })}
                />
                {fieldErrors.company && <p className="pom-hint pom-hint--err">{fieldErrors.company}</p>}
              </div>
            </div>
          </>
        );
      case 5:
        return (
          <>
            <div className="pom-field">
              <label className="pom-label" htmlFor={`${titleId}-bio`}>Short Bio</label>
              <textarea
                id={`${titleId}-bio`}
                ref={firstFieldRef}
                className="pom-textarea"
                rows={3}
                placeholder="Producer with 10+ years in Bollywood. Passionate about untold stories…"
                value={profile.bio}
                aria-invalid={Boolean(fieldErrors.bio)}
                onChange={(e) => setProfile({ ...profile, bio: setField("bio", e.target.value) })}
              />
              {fieldErrors.bio && <p className="pom-hint pom-hint--err">{fieldErrors.bio}</p>}
            </div>
            <div className="pom-row">
              <div className="pom-field">
                <label className="pom-label" htmlFor={`${titleId}-gender`}>Gender</label>
                <select
                  id={`${titleId}-gender`}
                  className="pom-select"
                  value={profile.gender}
                  aria-invalid={Boolean(fieldErrors.gender)}
                  onChange={(e) => setProfile({ ...profile, gender: setField("gender", e.target.value) })}
                >
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {fieldErrors.gender && <p className="pom-hint pom-hint--err">{fieldErrors.gender}</p>}
              </div>
              <div className="pom-field">
                <label className="pom-label" htmlFor={`${titleId}-nat`}>Nationality</label>
                <select
                  id={`${titleId}-nat`}
                  className="pom-select"
                  value={profile.nationality}
                  aria-invalid={Boolean(fieldErrors.nationality)}
                  onChange={(e) => setProfile({ ...profile, nationality: setField("nationality", e.target.value) })}
                >
                  <option value="">Select</option>
                  {NATIONALITY_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {fieldErrors.nationality && <p className="pom-hint pom-hint--err">{fieldErrors.nationality}</p>}
              </div>
            </div>
          </>
        );
      case 6:
        return (
          <>
            {creditNotice && <div className="pom-notice">{creditNotice}</div>}
            <div className="pom-field">
              <label className="pom-label" htmlFor={`${titleId}-credits`}>Previous Credits</label>
              <textarea
                id={`${titleId}-credits`}
                ref={firstFieldRef}
                className="pom-textarea"
                rows={2}
                style={{ minHeight: 62 }}
                placeholder="List films, shows, or projects you've been involved with…"
                value={profile.previousCredits}
                onChange={(e) => setProfile({ ...profile, previousCredits: setField("previousCredits", e.target.value) })}
              />
            </div>
            <div className="pom-field">
              <label className="pom-label">Social Links <span className="pom-opt">(optional)</span></label>
              <div className="pom-row" style={{ marginBottom: 9 }}>
                <input className="pom-input" type="url" placeholder="LinkedIn URL" value={profile.linkedInUrl}
                  onChange={(e) => setProfile({ ...profile, linkedInUrl: setField("social", e.target.value) })} />
                <input className="pom-input" type="url" placeholder="IMDb URL" value={profile.imdbUrl}
                  onChange={(e) => setProfile({ ...profile, imdbUrl: setField("social", e.target.value) })} />
              </div>
              <div className="pom-row">
                <input className="pom-input" type="url" placeholder="Instagram URL" value={profile.instagramUrl}
                  onChange={(e) => setProfile({ ...profile, instagramUrl: setField("social", e.target.value) })} />
                <input className="pom-input" type="url" placeholder="Twitter / X URL" value={profile.twitterUrl}
                  onChange={(e) => setProfile({ ...profile, twitterUrl: setField("social", e.target.value) })} />
              </div>
              {fieldErrors.social && <p className="pom-hint pom-hint--err">{fieldErrors.social}</p>}
            </div>
            <div className="pom-field">
              <label className="pom-label">Credit Attachments <span className="pom-opt">(optional)</span></label>
              <label className="pom-upload">
                <input type="file" hidden multiple accept={NOTABLE_CREDIT_ALLOWED_EXTENSIONS.join(",")} onChange={handleCreditFiles} />
                <FileText size={16} />
                Upload images, PDFs, or videos
              </label>
              {(creditAttachments.length > 0 || pendingCreditFiles.length > 0) && (
                <div className="pom-files">
                  {creditAttachments.map((a) => (
                    <span key={a.publicId || a.url} className="pom-file">
                      <span>{a.originalName || a.fileName || "file"}</span>
                      <button type="button" aria-label="Remove" onClick={() => handleRemoveCredit(a)}>×</button>
                    </span>
                  ))}
                  {pendingCreditFiles.map((f, i) => (
                    <span key={`p-${i}`} className="pom-file pom-file--pending"><span>{f.name}</span></span>
                  ))}
                </div>
              )}
              {fieldErrors.credit && <p className="pom-hint pom-hint--err">{fieldErrors.credit}</p>}
            </div>
          </>
        );
      case 7:
        return (
          <>
            <div className="pom-field">
              <label className="pom-label">Genres</label>
              <div className="pom-chips">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`pom-chip ${genres.includes(g) ? "pom-chip--active" : ""}`}
                    aria-pressed={genres.includes(g)}
                    onClick={() => toggle(genres, setGenres, g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="pom-rule" />
            <div className="pom-field">
              <label className="pom-label">Preferred Formats</label>
              <div className="pom-chips">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`pom-chip ${formats.includes(f.value) ? "pom-chip--active" : ""}`}
                    aria-pressed={formats.includes(f.value)}
                    onClick={() => toggle(formats, setFormats, f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      case 8:
        return (
          <>
            <div className="pom-legal-links">
              <a className="pom-legal-link" href={INVESTOR_TERMS_ROUTE} target="_blank" rel="noopener noreferrer">
                Terms &amp; Conditions →
              </a>
              <a className="pom-legal-link" href={REGISTRATION_PRIVACY_ROUTE} target="_blank" rel="noopener noreferrer">
                Privacy Policy →
              </a>
            </div>
            <div className="pom-rule" style={{ margin: "0 0 16px" }} />
            <div
              className="pom-agree"
              role="checkbox"
              aria-checked={agreeTerms}
              tabIndex={0}
              onClick={() => { setAgreeTerms((a) => !a); setError(""); }}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAgreeTerms((a) => !a); setError(""); } }}
            >
              <span className={`pom-agree-box ${agreeTerms ? "pom-agree-box--on" : ""}`}>{agreeTerms ? "✓" : ""}</span>
              <span className="pom-agree-text">I have read and agree to the Producer Registration Terms &amp; Conditions.</span>
            </div>
            <div
              className="pom-agree"
              role="checkbox"
              aria-checked={agreePrivacy}
              tabIndex={0}
              onClick={() => { setAgreePrivacy((a) => !a); setError(""); }}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAgreePrivacy((a) => !a); setError(""); } }}
            >
              <span className={`pom-agree-box ${agreePrivacy ? "pom-agree-box--on" : ""}`}>{agreePrivacy ? "✓" : ""}</span>
              <span className="pom-agree-text">I have read and agree to the Registration Privacy Policy.</span>
            </div>
          </>
        );
      default:
        return null;
    }
  }
}

/* Public component. `redirect` is accepted for call-site parity with AuthModal
   but the producer flow always lands on the review page on completion. */
export default function ProducerOnboardingModal({ open, onClose, onComplete }) {
  const navigate = useNavigate();
  const complete = useMemo(
    () => onComplete || (() => navigate("/?investorReview=pending", { replace: true })),
    [onComplete, navigate]
  );
  return (
    <AnimatePresence>
      {open && (
        <ProducerOnboardingModalInner key="producer-onboarding-modal" onClose={onClose} onComplete={complete} />
      )}
    </AnimatePresence>
  );
}
