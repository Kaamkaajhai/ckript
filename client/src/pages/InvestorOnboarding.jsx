import { useState, useContext, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import OTPVerification from "../components/OTPVerification";
import {
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Users,
  AlertCircle,
  Globe,
  Briefcase,
  Instagram,
  Twitter,
  FileText,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./onboarding-theme.css";
import PasswordInput from "../components/PasswordInput";


// Comprehensive email validation
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  email = email.trim().toLowerCase();
  if (email.length > 254 || email.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (localPart.length > 64 || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return false;
  if (!domain.includes('.') || domain.startsWith('-') || domain.endsWith('-') || domain.includes('..')) return false;
  const tld = domain.split('.').pop();
  return tld.length >= 2;
};

// Password validation criteria
const validatePassword = (password) => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
};

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,15}$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MotionDiv = motion.div;

const INVESTOR_ONBOARDING_DRAFT_KEY = "sb-investor-onboarding-draft-v1";

const DEFAULT_ACCOUNT_DATA = {
  name: "",
  email: "",
  phone: "",
  password: "",
  referralCode: "",
};

const DEFAULT_INVESTOR_PROFILE = {
  username: "",
  subRole: "",
  subRoleOther: "",
  jobTitle: "",
  gender: "",
  nationality: "",
  company: "",
  investmentRange: "",
  previousCredits: "",
  portfolioUrl: "",
  linkedInUrl: "",
  imdbUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
  websiteUrl: "",
  bio: "",
};

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

const INDUSTRY_ROLE_VALUE_SET = new Set(INDUSTRY_ROLE_OPTIONS.map((option) => option.value));
const INVESTOR_GENDER_OPTIONS = [
  "Male",
  "Female",
  "Trans",
  "Prefer not to say",
  "Other",
];
const INVESTOR_NATIONALITY_OPTIONS = [
  "Indian",
  "American",
  "British",
  "Canadian",
  "Australian",
  "German",
  "French",
  "Italian",
  "Spanish",
  "Japanese",
  "South Korean",
  "Chinese",
  "Singaporean",
  "Emirati",
  "Saudi Arabian",
  "Pakistani",
  "Bangladeshi",
  "Nepalese",
  "Sri Lankan",
  "Other",
];
const NOTABLE_CREDIT_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",
]);
const NOTABLE_CREDIT_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".mp4",
  ".mov",
  ".webm",
  ".avi",
  ".mkv",
];
const NOTABLE_CREDIT_ACCEPT = NOTABLE_CREDIT_ALLOWED_EXTENSIONS.join(",");
const MAX_NOTABLE_CREDIT_UPLOAD_FILES = 6;
const MAX_NOTABLE_CREDIT_TOTAL_FILES = 12;

const normalizeUrlInput = (value = "") => value.trim();
const normalizeIndustryRole = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const isValidHttpUrl = (value = "") => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const loadInvestorOnboardingDraft = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(INVESTOR_ONBOARDING_DRAFT_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
};

const INVESTOR_TERMS_ROUTE = "/terms-conditions?tab=investor";
const INVESTOR_TERMS_VERSION = "investor-onboarding-v2026-03-24";
const PRIVACY_POLICY_VERSION = "registration-privacy-v2026-03-24";
const REGISTRATION_PRIVACY_ROUTE = "/registration-privacy-policy";

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
  { value: "micro_drama", label: "Micro Drama" },
  { value: "songs", label: "Songs" },
  { value: "standup_comedy", label: "Standup Comedy" },
  { value: "dialogues", label: "Dialogues" },
  { value: "poet", label: "Poet" },
  { value: "other", label: "Other" },
];

const normalizePreferredFormat = (value = "") => {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";

  const aliases = {
    feature_film: "feature",
    "feature film": "feature",
    "tv pilot": "tv_1hour",
    "tv series": "tv_serial",
    "short film": "short",
    "web series": "web_series",
    "limited series": "limited_series",
    "drama school": "drama_school",
    "micro drama": "micro_drama",
    "standup comedy": "standup_comedy",
  };

  if (aliases[raw]) return aliases[raw];
  if (raw.includes("tv pilot") && (raw.includes("30") || raw.includes("half"))) return "tv_halfhour";
  if (raw.includes("tv pilot") || raw.includes("tv 1-hour")) return "tv_1hour";
  if (raw.includes("standup") || raw.includes("stand-up")) return "standup_comedy";
  if (raw.includes("dialogue")) return "dialogues";
  if (raw.includes("poet") || raw.includes("poetry")) return "poet";

  return raw.replace(/[\s-]+/g, "_");
};

const isAllowedNotableCreditFile = (file) => {
  const mimeType = String(file?.type || "").toLowerCase();
  if (NOTABLE_CREDIT_ALLOWED_MIME_TYPES.has(mimeType)) return true;
  const fileName = String(file?.name || "").toLowerCase();
  return NOTABLE_CREDIT_ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
};

const InvestorOnboarding = () => {
  const { join, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const initialDraftRef = useRef(loadInvestorOnboardingDraft());
  const initialDraft = initialDraftRef.current;

  const [currentStep, setCurrentStep] = useState(() => {
    const step = Number(initialDraft?.currentStep);
    return Number.isInteger(step) && step >= 1 && step <= 8 ? step : 1;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [firmNameError, setFirmNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState({
    state: "idle",
    message: "Use 3-30 characters: a-z, 0-9, or _.",
  });
  const [roleFocusError, setRoleFocusError] = useState("");
  const [jobTitleError, setJobTitleError] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [bioError, setBioError] = useState("");
  const [socialLinkError, setSocialLinkError] = useState("");
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(Boolean(initialDraft?.showOTPVerification));
  const [userEmail, setUserEmail] = useState(initialDraft?.userEmail || "");
  const [otpConfig, setOtpConfig] = useState(() => ({
    otpExpirySeconds: initialDraft?.otpConfig?.otpExpirySeconds,
    resendCooldownSeconds: initialDraft?.otpConfig?.resendCooldownSeconds,
    startCooldownOnMount: Boolean(initialDraft?.otpConfig?.startCooldownOnMount),
  }));

  // Step 1: Account
  const [accountData, setAccountData] = useState(() => ({
    ...DEFAULT_ACCOUNT_DATA,
    ...(initialDraft?.accountData || {}),
  }));
  const usernameCheckRequestRef = useRef(0);

  // Email Verification (keeping for compatibility, but using OTP now)
  const [verificationCode, setVerificationCode] = useState(initialDraft?.verificationCode || "");
  const [verificationSent] = useState(false);

  // Step 2: Investor Profile
  const [investorProfile, setInvestorProfile] = useState(() => ({
    ...DEFAULT_INVESTOR_PROFILE,
    ...(initialDraft?.investorProfile || {}),
  }));
  const [creditAttachments, setCreditAttachments] = useState(() => (
    Array.isArray(initialDraft?.creditAttachments) ? initialDraft.creditAttachments : []
  ));
  const [pendingCreditFiles, setPendingCreditFiles] = useState([]);
  const [creditAttachmentError, setCreditAttachmentError] = useState("");
  const [creditUploadNotice, setCreditUploadNotice] = useState("");
  const [creditUploadInProgress, setCreditUploadInProgress] = useState(false);
  const [removingCreditAttachmentId, setRemovingCreditAttachmentId] = useState("");

  // Step 3: Preferences
  const [selectedGenres, setSelectedGenres] = useState(
    Array.isArray(initialDraft?.selectedGenres) ? initialDraft.selectedGenres : []
  );
  const [selectedFormats, setSelectedFormats] = useState(() => {
    const initialFormats = Array.isArray(initialDraft?.selectedFormats) ? initialDraft.selectedFormats : [];
    return [...new Set(initialFormats.map(normalizePreferredFormat).filter(Boolean))];
  });

  // Step 4: Legal
  const [agreementAccepted, setAgreementAccepted] = useState(Boolean(initialDraft?.agreementAccepted));
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const safeAccountData = {
      ...accountData,
      password: "",
    };

    const draft = {
      currentStep,
      showOTPVerification,
      userEmail,
      otpConfig,
      accountData: safeAccountData,
      verificationCode,
      verificationSent,
      investorProfile,
      creditAttachments,
      selectedGenres,
      selectedFormats,
      agreementAccepted,
    };

    window.sessionStorage.setItem(INVESTOR_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  }, [
    accountData,
    agreementAccepted,
    currentStep,
    creditAttachments,
    investorProfile,
    selectedFormats,
    selectedGenres,
    showOTPVerification,
    userEmail,
    otpConfig,
    verificationCode,
    verificationSent,
  ]);

  useEffect(() => {
    const username = String(investorProfile.username || "").trim().toLowerCase();

    if (!username) {
      setUsernameStatus({ state: "idle", message: "Use 3-30 characters: a-z, 0-9, or _." });
      return;
    }

    if (username.length < 3) {
      setUsernameStatus({ state: "invalid", message: "Username must be at least 3 characters." });
      return;
    }

    if (!USERNAME_PATTERN.test(username)) {
      setUsernameStatus({
        state: "invalid",
        message: "Use only lowercase letters, numbers, and underscores (max 30).",
      });
      return;
    }

    const requestId = Date.now();
    usernameCheckRequestRef.current = requestId;
    setUsernameStatus({ state: "checking", message: "Checking username availability..." });
    let isActive = true;

    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await api.get("/onboarding/check-username", {
          params: { username },
        });

        if (!isActive || usernameCheckRequestRef.current !== requestId) return;

        if (data?.available) {
          setUsernameStatus({ state: "available", message: "Username is available." });
        } else {
          setUsernameStatus({ state: "unavailable", message: "Username is already taken." });
        }
      } catch {
        if (!isActive || usernameCheckRequestRef.current !== requestId) return;
        setUsernameStatus({ state: "error", message: "Could not verify username right now." });
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [investorProfile.username]);

  const steps = [
    { num: 1, title: "Name" },
    { num: 2, title: "Contact" },
    { num: 3, title: "Password" },
    { num: 4, title: "Identity" },
    { num: 5, title: "About" },
    { num: 6, title: "Credits" },
    { num: 7, title: "Discover" },
    { num: 8, title: "Terms" },
  ];

  const TOTAL_STEPS = 8;
  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  const handleSubStepContinue = useCallback((e) => {
    if (e) e.preventDefault();
    setError(""); setEmailError(""); setPhoneError(""); setUsernameError("");
    setRoleFocusError(""); setJobTitleError(""); setFirmNameError(""); setIdentityError(""); setBioError("");
    switch (currentStep) {
      case 1:
        if (!accountData.name.trim()) { setError("Please enter your name"); return; }
        setCurrentStep(2);
        break;
      case 2:
        if (!isValidEmail(accountData.email.trim().toLowerCase())) { setEmailError("Please enter a valid email"); return; }
        if (!accountData.phone.trim()) { setPhoneError("Phone number is required"); return; }
        if (!PHONE_REGEX.test(accountData.phone)) { setPhoneError("Enter a valid phone number"); return; }
        setCurrentStep(3);
        break;
      case 4: {
        const u = String(investorProfile.username || "").trim().toLowerCase();
        if (!u) { setUsernameError("Username is required"); return; }
        if (!USERNAME_PATTERN.test(u)) { setUsernameError("Use 3-30 lowercase letters, numbers, or _"); return; }
        if (usernameStatus.state === "checking") { setUsernameError("Checking..."); return; }
        if (usernameStatus.state === "unavailable") { setUsernameError("Username taken"); return; }
        const r = normalizeIndustryRole(investorProfile.subRole);
        if (!r || !INDUSTRY_ROLE_VALUE_SET.has(r)) { setRoleFocusError("Role focus is required"); return; }
        if (!investorProfile.jobTitle?.trim()) { setJobTitleError("Job title is required"); return; }
        if (!investorProfile.company?.trim()) { setFirmNameError("Production house / firm is required"); return; }
        setCurrentStep(5);
        break;
      }
      case 5:
        if (!investorProfile.gender?.trim() || !investorProfile.nationality?.trim()) { setIdentityError("Gender and nationality required"); return; }
        if (!investorProfile.bio?.trim()) { setBioError("Bio is required"); return; }
        setCurrentStep(6);
        break;
      case 6: setCurrentStep(7); break;
      default: setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  }, [currentStep, accountData, investorProfile, usernameStatus.state]);

  const handleFinishLater = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(INVESTOR_ONBOARDING_DRAFT_KEY);
    }
    navigate("/dashboard");
  };

  const investmentRanges = [
    { value: "under_50k", label: "Under ₹50L" },
    { value: "50k_250k", label: "₹50L – ₹2Cr" },
    { value: "250k_1m", label: "₹2Cr – ₹10Cr" },
    { value: "1m_5m", label: "₹10Cr – ₹50Cr" },
    { value: "over_5m", label: "Over ₹50Cr" },
  ];

  const genreOptions = [
    "Action", "Comedy", "Drama", "Horror", "Thriller",
    "Romance", "Sci-Fi", "Fantasy", "Mystery", "Adventure",
    "Crime", "Documentary", "Historical", "Animation", "Musical",
  ];

  const toggle = (arr, setArr, val) => {
    setArr((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  // ── Step 1: Account Creation ───────────────────────────────
  const handleAccountCreation = async (e) => {
    e.preventDefault();
    setError("");
    setUsernameError("");
    setEmailError("");
    setPhoneError("");

    const phone = String(accountData.phone || "").trim();
    if (!phone) {
      setPhoneError("Phone number is required");
      return;
    }

    if (!PHONE_REGEX.test(phone)) {
      setPhoneError("Please enter a valid phone number (e.g. +91 00000 00000)");
      return;
    }

    // Trim and sanitize email
    const sanitizedEmail = accountData.email.trim().toLowerCase();

    // Validate email
    if (!isValidEmail(sanitizedEmail)) {
      setEmailError("Please enter a valid email address (e.g., user@example.com)");
      return;
    }

    // Validate password
    const passwordCheck = validatePassword(accountData.password);
    if (!Object.values(passwordCheck).every(Boolean)) {
      setError("Password does not meet all requirements");
      return;
    }

    setLoading(true);
    try {
      const response = await join({
        name: accountData.name,
        email: sanitizedEmail,
        phone,
        password: accountData.password,
        role: "investor",
        referralCode: accountData.referralCode,
      });

      // Check if OTP verification is required
      if (response?.requiresVerification) {
        setUserEmail(response?.email || sanitizedEmail);
        setOtpConfig({
          otpExpirySeconds: response?.otpExpirySeconds,
          resendCooldownSeconds: response?.resendCooldownSeconds,
          startCooldownOnMount: true,
        });
        setShowOTPVerification(true);
      } else if (response?.token) {
        // Direct login (shouldn't happen with new flow)
        setCurrentStep(4);
      }

      setError("");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      if (/phone/i.test(msg)) {
        setPhoneError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = (userData) => {
    // Update auth context with user data/session.
    setUser(userData);
    if (userData?.token) {
      localStorage.setItem("user", JSON.stringify(userData));
    }
    setShowOTPVerification(false);
    setCurrentStep(4);
  };

  const handleBackToSignup = () => {
    setShowOTPVerification(false);
    setUserEmail("");
    setOtpConfig({
      otpExpirySeconds: undefined,
      resendCooldownSeconds: undefined,
      startCooldownOnMount: false,
    });
    setError("");
  };

  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/onboarding/verify-email", { code: verificationCode });
      if (res.data.success) setCurrentStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleNotableCreditFileSelection = async (event) => {
    setCreditAttachmentError("");
    setCreditUploadNotice("");

    const inputEl = event.target;
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setPendingCreditFiles([]);
      return;
    }

    if (files.length > MAX_NOTABLE_CREDIT_UPLOAD_FILES) {
      setCreditAttachmentError(`You can select up to ${MAX_NOTABLE_CREDIT_UPLOAD_FILES} files at once`);
      setPendingCreditFiles([]);
      return;
    }

    const invalidFile = files.find((file) => !isAllowedNotableCreditFile(file));
    if (invalidFile) {
      setCreditAttachmentError("Only image, PDF, and video files are allowed");
      setPendingCreditFiles([]);
      return;
    }

    if (creditAttachments.length + files.length > MAX_NOTABLE_CREDIT_TOTAL_FILES) {
      setCreditAttachmentError(`You can store up to ${MAX_NOTABLE_CREDIT_TOTAL_FILES} notable credit files`);
      setPendingCreditFiles([]);
      return;
    }

    setPendingCreditFiles(files);
    setCreditUploadInProgress(true);
    setCreditUploadNotice(`Uploading ${files.length} file(s)...`);

    try {
      const attachmentForm = new FormData();
      files.forEach((file) => attachmentForm.append("attachments", file));

      const uploadResponse = await api.post("/users/industry-credit-attachments", attachmentForm, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (Array.isArray(uploadResponse?.data?.attachments)) {
        setCreditAttachments(uploadResponse.data.attachments);
      }

      setPendingCreditFiles([]);
      setCreditUploadNotice("Notable credit files uploaded successfully");
    } catch (err) {
      setCreditAttachmentError(err.response?.data?.message || "Failed to upload notable credit files");
    } finally {
      setCreditUploadInProgress(false);
      if (inputEl) inputEl.value = "";
    }
  };

  const handleRemoveNotableCreditAttachment = async (attachment) => {
    const targetId = String(attachment?.publicId || attachment?.url || "");
    if (!targetId) return;

    setCreditAttachmentError("");
    setCreditUploadNotice("");
    setRemovingCreditAttachmentId(targetId);

    try {
      const response = await api.delete("/users/industry-credit-attachments", {
        data: {
          publicId: attachment?.publicId,
          url: attachment?.url,
        },
      });

      if (Array.isArray(response?.data?.attachments)) {
        setCreditAttachments(response.data.attachments);
      } else {
        setCreditAttachments((prev) => prev.filter((item) => {
          if (attachment?.publicId && item?.publicId === attachment.publicId) return false;
          if (attachment?.url && item?.url === attachment.url) return false;
          return true;
        }));
      }

      setCreditUploadNotice("Attachment removed");
    } catch (err) {
      setCreditAttachmentError(err.response?.data?.message || "Failed to remove attachment");
    } finally {
      setRemovingCreditAttachmentId("");
    }
  };

  const handleOpenNotableCreditAttachment = async (event, attachment) => {
    event.preventDefault();

    const fallbackUrl = String(attachment?.url || "");
    if (!fallbackUrl) return;

    const mimeType = String(attachment?.mimeType || "").toLowerCase();
    if (mimeType !== "application/pdf") {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const response = await api.get("/users/industry-credit-attachments/file", {
        params: {
          publicId: attachment?.publicId,
          url: attachment?.url,
        },
        responseType: "blob",
      });

      const blob = response?.data instanceof Blob
        ? response.data
        : new Blob([response?.data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60 * 1000);
    } catch {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  };

  // ── Step 2: Industry Professional Profile ─────────────────
  const handleInvestorProfile = async (e) => {
    e.preventDefault();
    setFirmNameError("");
    setUsernameError("");
    setRoleFocusError("");
    setJobTitleError("");
    setIdentityError("");
    setBioError("");
    setSocialLinkError("");
    setError("");

    const normalizedUsername = String(investorProfile.username || "").trim().toLowerCase();
    if (!normalizedUsername) {
      setUsernameError("Username is required");
      return;
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setUsernameError("Use 3-30 lowercase letters, numbers, or underscores");
      return;
    }

    if (usernameStatus.state === "checking") {
      setUsernameError("Please wait while we verify username availability");
      return;
    }

    if (usernameStatus.state === "unavailable") {
      setUsernameError("Username is already taken");
      return;
    }

    const sanitizedSubRole = normalizeIndustryRole(investorProfile.subRole);
    const sanitizedSubRoleOther = normalizeUrlInput(investorProfile.subRoleOther);
    if (!sanitizedSubRole) {
      setRoleFocusError("Role focus is required");
      return;
    }

    if (!INDUSTRY_ROLE_VALUE_SET.has(sanitizedSubRole)) {
      setRoleFocusError("Please select a valid role focus");
      return;
    }

    if (sanitizedSubRole === "other" && !sanitizedSubRoleOther) {
      setRoleFocusError("Please specify your role focus");
      return;
    }

    const sanitizedJobTitle = normalizeUrlInput(investorProfile.jobTitle);
    if (!sanitizedJobTitle) {
      setJobTitleError("Job title is required");
      return;
    }

    const sanitizedGender = normalizeUrlInput(investorProfile.gender);
    const sanitizedNationality = normalizeUrlInput(investorProfile.nationality);
    if (!sanitizedGender || !sanitizedNationality) {
      setIdentityError("Gender and nationality are required");
      return;
    }

    const sanitizedCompany = (investorProfile.company || "").trim();
    if (!sanitizedCompany) {
      setFirmNameError("Production house / firm name is required");
      return;
    }

    const sanitizedBio = normalizeUrlInput(investorProfile.bio);
    if (!sanitizedBio) {
      setBioError("Bio is required");
      return;
    }

    const urlFields = {
      portfolioUrl: normalizeUrlInput(investorProfile.portfolioUrl),
      linkedInUrl: normalizeUrlInput(investorProfile.linkedInUrl),
      imdbUrl: normalizeUrlInput(investorProfile.imdbUrl),
      instagramUrl: normalizeUrlInput(investorProfile.instagramUrl),
      twitterUrl: normalizeUrlInput(investorProfile.twitterUrl),
      facebookUrl: normalizeUrlInput(investorProfile.facebookUrl),
      youtubeUrl: normalizeUrlInput(investorProfile.youtubeUrl),
      websiteUrl: normalizeUrlInput(investorProfile.websiteUrl),
    };

    const invalidUrlEntries = Object.values(urlFields).filter((value) => value && !isValidHttpUrl(value));
    if (invalidUrlEntries.length > 0) {
      setSocialLinkError("Please enter valid URLs starting with http:// or https://");
      return;
    }

    if (creditUploadInProgress) {
      setCreditAttachmentError("Please wait for credit file upload to finish");
      return;
    }

    if (creditAttachments.length + pendingCreditFiles.length > MAX_NOTABLE_CREDIT_TOTAL_FILES) {
      setCreditAttachmentError(`You can store up to ${MAX_NOTABLE_CREDIT_TOTAL_FILES} notable credit files`);
      return;
    }

    setLoading(true);
    try {
      await api.put("/users/update", {
        username: normalizedUsername,
        subRole: sanitizedSubRole,
        subRoleOther: sanitizedSubRole === "other" ? sanitizedSubRoleOther : "",
        jobTitle: sanitizedJobTitle,
        bio: sanitizedBio,
        company: sanitizedCompany,
        previousCredits: normalizeUrlInput(investorProfile.previousCredits),
        linkedInUrl: urlFields.linkedInUrl,
        imdbUrl: urlFields.imdbUrl,
        otherUrl: urlFields.portfolioUrl,
        socialLinks: {
          instagram: urlFields.instagramUrl,
          twitter: urlFields.twitterUrl,
          facebook: urlFields.facebookUrl,
          youtube: urlFields.youtubeUrl,
          website: urlFields.websiteUrl,
        },
        demographics: {
          gender: sanitizedGender,
          nationality: sanitizedNationality,
        },
        investmentRange: investorProfile.investmentRange,
      });

      setCurrentStep(7);
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Preferences ────────────────────────────────────
  const handlePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.put("/users/update", {
        preferredGenres: selectedGenres,
        preferredFormats: selectedFormats,
      });
      setCurrentStep(8);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Legal & Complete ───────────────────────────────
  const handleComplete = async () => {
    if (!agreementAccepted) {
      setError("Please accept the agreement to continue");
      return;
    }
    if (!privacyPolicyAccepted) {
      setError("Please accept the privacy policy to continue");
      return;
    }
    setLoading(true);
    try {
      await api.put("/users/update", {
        onboardingComplete: true,
        privacyPolicyAccepted,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(INVESTOR_ONBOARDING_DRAFT_KEY);
      }
      navigate("/?investorReview=pending", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared UI helpers ──────────────────────────────────────
  const inputClass = "w-full h-11 px-4 border border-gray-200 rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#1e3a5f]/40 focus:ring-2 focus:ring-[#1e3a5f]/5 transition-all bg-gray-50 text-gray-900 placeholder:text-gray-400";
  const labelClass = "block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5";

  const ChipButton = ({ label, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${active
          ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
          : "bg-white text-gray-500 border-gray-200 hover:border-[#1e3a5f]/40 hover:text-[#1e3a5f]"
        }`}
    >
      {label}
    </button>
  );


  // Show OTP verification screen if needed
  if (showOTPVerification) {
    return (
      <OTPVerification
        email={userEmail}
        onSuccess={handleOTPSuccess}
        onBack={handleBackToSignup}
        otpExpirySeconds={otpConfig.otpExpirySeconds}
        initialResendCooldownSeconds={otpConfig.resendCooldownSeconds}
        startCooldownOnMount={otpConfig.startCooldownOnMount}
        darkBackground
      />
    );
  }

  const MotionCard = motion.div;
  const cardAnim = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } };

  const PwReq = ({ ok, text }) => (
    <div className={`ob-pw-req ${ok ? "ob-pw-req--pass" : "ob-pw-req--fail"}`}>
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} /></svg>
      {text}
    </div>
  );

  const ErrorBox = ({ msg }) => msg ? <div className="ob-error-box"><AlertCircle size={14} className="shrink-0" />{msg}</div> : null;

  const FinishLaterBtn = () => currentStep >= 4 ? (
    <button type="button" onClick={handleFinishLater} className="ob-btn ob-btn-finish">I'll finish later →</button>
  ) : null;

  const BackBtn = ({ to }) => (
    <button type="button" onClick={() => { setError(""); setCurrentStep(to); }} className="ob-btn ob-btn-ghost" style={{ width: "auto", padding: "0 20px" }}>
      ← Back
    </button>
  );

  return (
    <div className="ob-page">
      {/* Progress bar */}
      <div className="ob-progress-wrap">
        <div className="ob-progress-track">
          <div className="ob-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="ob-progress-meta">
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.8rem", color: "#F9FAFB", fontWeight: 600 }}>Ckript</span>
          <span style={{ fontSize: "0.7rem", color: "#6B7280", fontWeight: 500 }}>Step {currentStep} of {TOTAL_STEPS}</span>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "80px 16px 40px", minHeight: "100dvh" }}>
        <AnimatePresence mode="wait">

          {/* Step 1: Name */}
          {currentStep === 1 && (
            <MotionCard key="s1" {...cardAnim} className="ob-card">
              <h1 className="ob-title">What's your <em>name</em>?</h1>
              <p className="ob-subtitle">Let's start with the basics.</p>
              <ErrorBox msg={error} />
              <div className="ob-field">
                <label className="ob-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: 14, top: 16, color: "#6B7280" }} />
                  <input autoFocus type="text" className="ob-input" style={{ paddingLeft: 40 }} placeholder="e.g. Rajesh Kumar" value={accountData.name} onChange={(e) => setAccountData({ ...accountData, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSubStepContinue(e)} required />
                </div>
              </div>
              <div className="ob-actions">
                <button type="button" onClick={handleSubStepContinue} className="ob-btn ob-btn-primary">Continue <ArrowRight size={16} /></button>
              </div>
              <div className="ob-footer-links" style={{ marginTop: 20 }}>Already have an account? <Link to="/login" className="ob-link">Sign in</Link></div>
            </MotionCard>
          )}

          {/* Step 2: Contact */}
          {currentStep === 2 && (
            <MotionCard key="s2" {...cardAnim} className="ob-card">
              <h1 className="ob-title">How do we <em>reach</em> you?</h1>
              <p className="ob-subtitle">Your email for verification and phone for account security.</p>
              <ErrorBox msg={error} />
              <div className="ob-field">
                <label className="ob-label">Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: 14, top: 16, color: "#6B7280" }} />
                  <input autoFocus type="email" className={`ob-input ${emailError ? "ob-input--error" : ""}`} style={{ paddingLeft: 40 }} placeholder="producer@example.com" value={accountData.email} onChange={(e) => { setAccountData({ ...accountData, email: e.target.value }); setEmailError(""); }} required />
                </div>
                {emailError && <p className="ob-hint ob-hint--err">{emailError}</p>}
              </div>
              <div className="ob-field">
                <label className="ob-label">Phone Number</label>
                <div style={{ position: "relative" }}>
                  <Phone size={16} style={{ position: "absolute", left: 14, top: 16, color: "#6B7280" }} />
                  <input type="tel" className={`ob-input ${phoneError ? "ob-input--error" : ""}`} style={{ paddingLeft: 40 }} placeholder="+91 00000 00000" value={accountData.phone} onChange={(e) => { setAccountData({ ...accountData, phone: e.target.value }); setPhoneError(""); }} required />
                </div>
                {phoneError && <p className="ob-hint ob-hint--err">{phoneError}</p>}
              </div>
              <div className="ob-actions">
                <button type="button" onClick={handleSubStepContinue} className="ob-btn ob-btn-primary">Continue <ArrowRight size={16} /></button>
                <BackBtn to={1} />
              </div>
            </MotionCard>
          )}

          {/* Step 3: Password -> Create Account */}
          {currentStep === 3 && (
            <MotionCard key="s3" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Secure your <em>account</em></h1>
              <p className="ob-subtitle">Choose a strong password to protect your account.</p>
              <ErrorBox msg={error} />
              <form onSubmit={handleAccountCreation}>
                <div className="ob-field">
                  <label className="ob-label">Password</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", left: 14, top: 16, color: "#6B7280" }} />
                    <PasswordInput autoFocus className="ob-input" style={{ paddingLeft: 40 }} placeholder="Min. 8 characters" value={accountData.password} onChange={(e) => { setAccountData({ ...accountData, password: e.target.value }); if (!showPasswordReqs) setShowPasswordReqs(true); }} onFocus={() => setShowPasswordReqs(true)} required />
                  </div>
                  {showPasswordReqs && (() => { const v = validatePassword(accountData.password); return (
                    <div className="ob-pw-reqs">
                      <PwReq ok={v.length} text="At least 8 characters" />
                      <PwReq ok={v.uppercase} text="One uppercase letter (A-Z)" />
                      <PwReq ok={v.lowercase} text="One lowercase letter (a-z)" />
                      <PwReq ok={v.number} text="One number (0-9)" />
                      <PwReq ok={v.special} text="One special character (!@#$%^&*)" />
                    </div>
                  ); })()}
                </div>
                <div className="ob-field">
                  <label className="ob-label">Referral Code / Username <span style={{ opacity: 0.5, textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" className="ob-input" placeholder="Enter referral code or referrer's username" value={accountData.referralCode} onChange={(e) => { setAccountData({ ...accountData, referralCode: e.target.value.slice(0, 40) }); setError(""); }} />
                </div>
                <div className="ob-actions">
                  <button type="submit" disabled={loading} className="ob-btn ob-btn-primary">{loading ? "Creating account..." : <><span>Create Account</span> <ArrowRight size={16} /></>}</button>
                  <BackBtn to={2} />
                </div>
              </form>
            </MotionCard>
          )}

          {/* Step 4: Industry Identity */}
          {currentStep === 4 && (
            <MotionCard key="s4" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Your industry <em>identity</em></h1>
              <p className="ob-subtitle">Tell us about your role in the entertainment industry.</p>
              <ErrorBox msg={error} />
              <div className="ob-field">
                <label className="ob-label">Username</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: 13, color: "#6B7280", fontSize: "0.9375rem", fontWeight: 500 }}>@</span>
                  <input autoFocus type="text" className={`ob-input ${usernameError || usernameStatus.state === "unavailable" ? "ob-input--error" : ""}`} style={{ paddingLeft: 34 }} placeholder="e.g. aryan_visuals" value={investorProfile.username} onChange={(e) => { setInvestorProfile({ ...investorProfile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }); if (usernameError) setUsernameError(""); }} required />
                </div>
                {usernameError && <p className="ob-hint ob-hint--err">{usernameError}</p>}
                {!usernameError && usernameStatus.message && (
                  <p className={`ob-hint ${usernameStatus.state === "available" ? "ob-hint--ok" : usernameStatus.state === "unavailable" || usernameStatus.state === "invalid" ? "ob-hint--err" : ""}`}>{usernameStatus.message}</p>
                )}
              </div>
              <div className="ob-field">
                <label className="ob-label">Role Focus *</label>
                <select className="ob-input ob-select" value={investorProfile.subRole} onChange={(e) => { setInvestorProfile({ ...investorProfile, subRole: e.target.value }); setRoleFocusError(""); }} required>
                  <option value="">Select your role</option>
                  {INDUSTRY_ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {roleFocusError && <p className="ob-hint ob-hint--err">{roleFocusError}</p>}
              </div>
              <div className="ob-row">
                <div className="ob-field">
                  <label className="ob-label">Job Title *</label>
                  <input type="text" className="ob-input" placeholder="e.g. Creative Producer" value={investorProfile.jobTitle} onChange={(e) => { setInvestorProfile({ ...investorProfile, jobTitle: e.target.value }); setJobTitleError(""); }} required />
                  {jobTitleError && <p className="ob-hint ob-hint--err">{jobTitleError}</p>}
                </div>
                <div className="ob-field">
                  <label className="ob-label">Production House / Firm *</label>
                  <input type="text" className="ob-input" placeholder="e.g. Novastride Pictures" value={investorProfile.company} onChange={(e) => { setInvestorProfile({ ...investorProfile, company: e.target.value }); setFirmNameError(""); }} required />
                  {firmNameError && <p className="ob-hint ob-hint--err">{firmNameError}</p>}
                </div>
              </div>
              <div className="ob-actions">
                <button type="button" onClick={handleSubStepContinue} className="ob-btn ob-btn-primary">Continue <ArrowRight size={16} /></button>
                <FinishLaterBtn />
              </div>
            </MotionCard>
          )}

          {/* Step 5: About */}
          {currentStep === 5 && (
            <MotionCard key="s5" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Tell us about <em>yourself</em></h1>
              <p className="ob-subtitle">A few more details for your producer profile.</p>
              <ErrorBox msg={error} />
              <div className="ob-field">
                <label className="ob-label">Short Bio *</label>
                <textarea className="ob-input ob-textarea" placeholder="Producer with 10+ years in Bollywood. Passionate about untold stories..." value={investorProfile.bio} onChange={(e) => { setInvestorProfile({ ...investorProfile, bio: e.target.value }); setBioError(""); }} rows={3} required />
                {bioError && <p className="ob-hint ob-hint--err">{bioError}</p>}
              </div>
              <div className="ob-row">
                <div className="ob-field">
                  <label className="ob-label">Gender *</label>
                  <select className="ob-input ob-select" value={investorProfile.gender} onChange={(e) => { setInvestorProfile({ ...investorProfile, gender: e.target.value }); setIdentityError(""); }} required>
                    <option value="">Select</option>
                    {INVESTOR_GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="ob-field">
                  <label className="ob-label">Nationality *</label>
                  <select className="ob-input ob-select" value={investorProfile.nationality} onChange={(e) => { setInvestorProfile({ ...investorProfile, nationality: e.target.value }); setIdentityError(""); }} required>
                    <option value="">Select</option>
                    {INVESTOR_NATIONALITY_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {identityError && <p className="ob-hint ob-hint--err" style={{ marginBottom: 12 }}>{identityError}</p>}
              <div className="ob-actions">
                <button type="button" onClick={handleSubStepContinue} className="ob-btn ob-btn-primary">Continue <ArrowRight size={16} /></button>
                <div className="ob-actions-row"><BackBtn to={4} /><FinishLaterBtn /></div>
              </div>
            </MotionCard>
          )}

          {/* Step 6: Notable Credits -> triggers profile save */}
          {currentStep === 6 && (
            <MotionCard key="s6" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Notable <em>credits</em></h1>
              <p className="ob-subtitle">Share your previous work and notable credits. Optional — you can skip.</p>
              <ErrorBox msg={error} />
              {creditUploadNotice && <div className="ob-error-box" style={{ background: "rgba(120,80,0,0.2)", borderColor: "rgba(251,191,36,0.3)", color: "#FBBF24" }}>{creditUploadNotice}</div>}
              <form onSubmit={handleInvestorProfile}>
                <div className="ob-field">
                  <label className="ob-label">Previous Credits</label>
                  <textarea className="ob-input ob-textarea" placeholder="List films, shows, or projects you've been involved with..." value={investorProfile.previousCredits} onChange={(e) => setInvestorProfile({ ...investorProfile, previousCredits: e.target.value })} rows={3} />
                </div>
                <div className="ob-field">
                  <label className="ob-label">Social Links <span style={{ opacity: 0.5, textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                  <div className="ob-row" style={{ marginBottom: 8 }}>
                    <input type="url" className="ob-input" placeholder="LinkedIn URL" value={investorProfile.linkedinUrl} onChange={(e) => setInvestorProfile({ ...investorProfile, linkedinUrl: e.target.value })} />
                    <input type="url" className="ob-input" placeholder="IMDB URL" value={investorProfile.imdbUrl} onChange={(e) => setInvestorProfile({ ...investorProfile, imdbUrl: e.target.value })} />
                  </div>
                  <div className="ob-row">
                    <input type="url" className="ob-input" placeholder="Instagram URL" value={investorProfile.instagramUrl} onChange={(e) => setInvestorProfile({ ...investorProfile, instagramUrl: e.target.value })} />
                    <input type="url" className="ob-input" placeholder="Twitter / X URL" value={investorProfile.twitterUrl} onChange={(e) => setInvestorProfile({ ...investorProfile, twitterUrl: e.target.value })} />
                  </div>
                  {socialLinkError && <p className="ob-hint ob-hint--err">{socialLinkError}</p>}
                </div>
                <div className="ob-field">
                  <label className="ob-label">Credit Attachments</label>
                  {creditAttachmentError && <p className="ob-hint ob-hint--err" style={{ marginBottom: 8 }}>{creditAttachmentError}</p>}
                  <label className="ob-upload-zone">
                    <input type="file" style={{ display: "none" }} multiple accept={NOTABLE_CREDIT_ALLOWED_EXTENSIONS.join(",")} onChange={handleNotableCreditFileSelection} />
                    <FileText size={16} style={{ marginRight: 8 }} />Upload images, PDFs, or videos
                  </label>
                  {(creditAttachments.length > 0 || pendingCreditFiles.length > 0) && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {creditAttachments.map(a => (
                        <div key={a.attachmentId} className="ob-chip ob-chip--active" style={{ gap: 6 }}>
                          {a.originalName || "file"}
                          <button type="button" onClick={() => handleRemoveNotableCreditAttachment(a)} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      {pendingCreditFiles.map((f, i) => (
                        <div key={`pending-${i}`} className="ob-chip" style={{ opacity: 0.6 }}>{f.name} (uploading...)</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ob-actions">
                  <button type="submit" disabled={loading || creditUploadInProgress} className="ob-btn ob-btn-primary">{loading ? "Saving profile..." : <><span>Save & Continue</span> <ArrowRight size={16} /></>}</button>
                  <div className="ob-actions-row"><BackBtn to={5} /><FinishLaterBtn /></div>
                </div>
              </form>
            </MotionCard>
          )}

          {/* Step 7: Genre & Format Preferences */}
          {currentStep === 7 && (
            <MotionCard key="s7" {...cardAnim} className="ob-card" style={{ maxWidth: 600 }}>
              <h1 className="ob-title">What scripts <em>interest</em> you?</h1>
              <p className="ob-subtitle">Select genres and formats to tailor your discovery feed.</p>
              <ErrorBox msg={error} />
              <form onSubmit={handlePreferences}>
                <div className="ob-field">
                  <label className="ob-label">Genres</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {genreOptions.map(g => (<button key={g} type="button" onClick={() => toggle(selectedGenres, setSelectedGenres, g)} className={`ob-chip ${selectedGenres.includes(g) ? "ob-chip--active" : ""}`}>{g}</button>))}
                  </div>
                </div>
                <div className="ob-divider" />
                <div className="ob-field">
                  <label className="ob-label">Preferred Formats</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {FORMAT_OPTIONS.map(f => (<button key={f.value} type="button" onClick={() => toggle(selectedFormats, setSelectedFormats, f.value)} className={`ob-chip ${selectedFormats.includes(f.value) ? "ob-chip--active" : ""}`}>{f.label}</button>))}
                  </div>
                </div>
                <div className="ob-actions">
                  <button type="submit" disabled={loading} className="ob-btn ob-btn-primary">{loading ? "Saving..." : <><span>Continue</span> <ArrowRight size={16} /></>}</button>
                  <div className="ob-actions-row"><BackBtn to={6} /><FinishLaterBtn /></div>
                </div>
              </form>
            </MotionCard>
          )}

          {/* Step 8: Terms & Complete */}
          {currentStep === 8 && (
            <MotionCard key="s8" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Almost <em>there</em>!</h1>
              <p className="ob-subtitle">Review and accept our terms to enter the platform.</p>
              <ErrorBox msg={error} />
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <Link to={INVESTOR_TERMS_ROUTE} target="_blank" rel="noopener noreferrer" className="ob-btn ob-btn-ghost" style={{ flex: 1, fontSize: "0.75rem", height: 40 }}>Terms & Conditions <ArrowRight size={12} /></Link>
                <Link to={REGISTRATION_PRIVACY_ROUTE} target="_blank" rel="noopener noreferrer" className="ob-btn ob-btn-ghost" style={{ flex: 1, fontSize: "0.75rem", height: 40 }}>Privacy Policy <ArrowRight size={12} /></Link>
              </div>
              <div className="ob-divider" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                  <input type="checkbox" className="ob-checkbox" checked={agreementAccepted} onChange={(e) => setAgreementAccepted(e.target.checked)} style={{ marginTop: 2 }} />
                  <span style={{ fontSize: "0.8125rem", color: "#CBD5E1", lineHeight: 1.5 }}>I have read and agree to the Investor Registration Terms and Conditions</span>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                  <input type="checkbox" className="ob-checkbox" checked={privacyPolicyAccepted} onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)} style={{ marginTop: 2 }} />
                  <span style={{ fontSize: "0.8125rem", color: "#CBD5E1", lineHeight: 1.5 }}>I have read and agree to the Registration Privacy Policy</span>
                </label>
              </div>
              <div className="ob-actions">
                <button type="button" onClick={handleComplete} disabled={!agreementAccepted || !privacyPolicyAccepted || loading} className="ob-btn ob-btn-primary">{loading ? "Completing..." : <><TrendingUp size={16} /> Enter Platform</>}</button>
                <div className="ob-actions-row"><BackBtn to={7} /><FinishLaterBtn /></div>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#4B5563" }}>
                <span>Terms: {INVESTOR_TERMS_VERSION}</span>
                <span>Privacy: {PRIVACY_POLICY_VERSION}</span>
              </div>
            </MotionCard>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default InvestorOnboarding;
