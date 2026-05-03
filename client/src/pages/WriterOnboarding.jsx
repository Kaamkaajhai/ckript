import { useState, useContext, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import OTPVerification from "../components/OTPVerification";
import { 
  FileText, 
  UserCircle, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  Mail,
  Lock,
  User,
  AlertCircle,
  Phone,
  Link as LinkIcon,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Film,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./onboarding-theme.css";


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

const INDIA_COUNTRY_NAME = "India";
const INDIA_ZIP_REGEX = /^\d{6}$/;
const INTERNATIONAL_POSTAL_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\s-]{2,11}$/;
const REFERRAL_STORAGE_KEY = "sb:referral-code";
const REFERRAL_MAX_LENGTH = 40;

const WRITER_ONBOARDING_DRAFT_KEY = "sb-writer-onboarding-draft-v1";

const normalizeReferralInput = (value = "") =>
  String(value || "")
    .trim()
    .slice(0, REFERRAL_MAX_LENGTH);

const DEFAULT_ACCOUNT_DATA = {
  name: "",
  dateOfBirth: "",
  email: "",
  referralCode: "",
  password: "",
  address: "",
  phone: "",
  role: "creator"
};

const DEFAULT_ADDRESS_FIELDS = {
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: INDIA_COUNTRY_NAME,
};

const DEFAULT_OPEN_REP_SECTIONS = { filmTv: false, theater: false, literary: false };

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
  agencyName: "",
  wgaMember: false,
  sgaMember: false,
  membershipVerification: {
    wga: { ...EMPTY_MEMBERSHIP_REVIEW },
    swa: { ...EMPTY_MEMBERSHIP_REVIEW },
  },
  links: {
    portfolio: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    imdb: "",
    facebook: ""
  },
  accomplishments: [],
  representation: {
    filmTv: { agency: "", agent: "", managementCompany: "", manager: "", lawFirm: "", lawyer: "" },
    theater: { agency: "", agent: "", managementCompany: "", manager: "", lawFirm: "", lawyer: "" },
    literary: { agency: "", agent: "", managementCompany: "", manager: "", lawFirm: "", lawyer: "" }
  },
  demographicPrivacy: "searchable",
  diversity: {
    gender: "",
    nationality: "",
    lgbtqStatus: "",
    disabilityStatus: ""
  }
};

const loadWriterOnboardingDraft = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(WRITER_ONBOARDING_DRAFT_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
};

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
  links: {
    ...DEFAULT_WRITER_PROFILE.links,
    ...(profile?.links || {}),
  },
  accomplishments: Array.isArray(profile?.accomplishments) ? profile.accomplishments : [],
  representation: {
    filmTv: {
      ...DEFAULT_WRITER_PROFILE.representation.filmTv,
      ...(profile?.representation?.filmTv || {}),
    },
    theater: {
      ...DEFAULT_WRITER_PROFILE.representation.theater,
      ...(profile?.representation?.theater || {}),
    },
    literary: {
      ...DEFAULT_WRITER_PROFILE.representation.literary,
      ...(profile?.representation?.literary || {}),
    },
  },
  diversity: {
    ...DEFAULT_WRITER_PROFILE.diversity,
    ...(profile?.diversity || {}),
  },
});

const WRITER_TERMS_VERSION = "writer-onboarding-v2026-03-24";
const WRITER_TERMS_ROUTE = "/terms-conditions?tab=writer";
const PRIVACY_POLICY_VERSION = "registration-privacy-v2026-03-24";
const REGISTRATION_PRIVACY_ROUTE = "/registration-privacy-policy";
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MotionDiv = motion.div;
const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Trans",
  "Prefer not to say",
  "Other",
];

const NATIONALITY_OPTIONS = [
  "Indian",
  "American",
  "British",
  "Canadian",
  "Australian",
  "New Zealander",
  "Irish",
  "French",
  "German",
  "Italian",
  "Spanish",
  "Portuguese",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Swiss",
  "Austrian",
  "Belgian",
  "Polish",
  "Russian",
  "Ukrainian",
  "Turkish",
  "Brazilian",
  "Mexican",
  "Argentinian",
  "South African",
  "Nigerian",
  "Egyptian",
  "Kenyan",
  "Saudi Arabian",
  "Emirati",
  "Pakistani",
  "Bangladeshi",
  "Nepalese",
  "Sri Lankan",
  "Singaporean",
  "Malaysian",
  "Indonesian",
  "Filipino",
  "Thai",
  "Vietnamese",
  "Chinese",
  "Japanese",
  "South Korean",
  "Other",
];

const WriterOnboarding = () => {
  const { join, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDraftRef = useRef(loadWriterOnboardingDraft());
  const initialDraft = initialDraftRef.current;
  
  const [currentStep, setCurrentStep] = useState(() => {
    const step = Number(initialDraft?.currentStep);
    return Number.isInteger(step) && step >= 1 && step <= 9 ? step : 1;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [, setAddressError] = useState("");
  const [, setZipLookupLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState({ state: "idle", message: "" });
  const [openRepSections, setOpenRepSections] = useState(() => ({
    ...DEFAULT_OPEN_REP_SECTIONS,
    ...(initialDraft?.openRepSections || {}),
  }));
  const [emailError, setEmailError] = useState("");
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(Boolean(initialDraft?.showOTPVerification));
  const [userEmail, setUserEmail] = useState(initialDraft?.userEmail || "");
  const [otpConfig, setOtpConfig] = useState(() => ({
    otpExpirySeconds: initialDraft?.otpConfig?.otpExpirySeconds,
    resendCooldownSeconds: initialDraft?.otpConfig?.resendCooldownSeconds,
    startCooldownOnMount: Boolean(initialDraft?.otpConfig?.startCooldownOnMount),
  }));
  
  // Step 1: Account Creation
  const [accountData, setAccountData] = useState(() => ({
    ...DEFAULT_ACCOUNT_DATA,
    ...(initialDraft?.accountData || {}),
  }));
  const [addressFields, setAddressFields] = useState(() => ({
    ...DEFAULT_ADDRESS_FIELDS,
    ...(initialDraft?.addressFields || {}),
  }));
  const [isOutsideIndia] = useState(() => {
    const draftCountry = String(initialDraft?.addressFields?.country || INDIA_COUNTRY_NAME).trim().toLowerCase();
    return Boolean(draftCountry) && draftCountry !== "india";
  });
  
  // Email Verification (keeping for compatibility, but using OTP now)
  const [verificationCode, setVerificationCode] = useState(initialDraft?.verificationCode || "");
  const [verificationSent] = useState(false);
  
  // Step 2: Writer Profile
  const [writerProfile, setWriterProfile] = useState(() => mergeWriterProfile(initialDraft?.writerProfile));
  const [membershipProofFiles, setMembershipProofFiles] = useState({ wga: null, swa: null });
  const membershipUploadPromiseRef = useRef(Promise.resolve());
  const [membershipUploadsInProgress, setMembershipUploadsInProgress] = useState(false);
  const [membershipUploadNotice, setMembershipUploadNotice] = useState("");

  // Step 3: Tags
  const [selectedGenres, setSelectedGenres] = useState(
    Array.isArray(initialDraft?.selectedGenres) ? initialDraft.selectedGenres : []
  );
  const [nuancedTags, setNuancedTags] = useState(
    Array.isArray(initialDraft?.nuancedTags) ? initialDraft.nuancedTags : []
  );
  const [showTagError, setShowTagError] = useState(false);

  // Step 4: Legal & Checkout
  const [agreementAccepted, setAgreementAccepted] = useState(Boolean(initialDraft?.agreementAccepted));
  const [selectedPlan] = useState("free");
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const zipLookupRequestRef = useRef(0);
  const usernameCheckRequestRef = useRef(0);
  const referralCheckRequestRef = useRef(0);
  const [referralStatus, setReferralStatus] = useState({
    state: "idle",
    message: "Optional: enter referral code or writer username.",
  });

  const handleMembershipToggle = (type, checked) => {
    const verificationKey = type === "wga" ? "wga" : "swa";
    const memberField = type === "wga" ? "wgaMember" : "sgaMember";

    setWriterProfile((prev) => {
      const currentReview = prev.membershipVerification?.[verificationKey] || EMPTY_MEMBERSHIP_REVIEW;
      const nextReview = checked
        ? {
            ...currentReview,
            requested: true,
          }
        : {
            ...EMPTY_MEMBERSHIP_REVIEW,
            requested: false,
          };

      return {
        ...prev,
        [memberField]: checked,
        membershipVerification: {
          ...(prev.membershipVerification || {}),
          [verificationKey]: nextReview,
        },
      };
    });

    if (!checked) {
      setMembershipProofFiles((prev) => ({ ...prev, [verificationKey]: null }));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const safeAccountData = {
      ...accountData,
      password: "",
    };

    const draft = {
      currentStep,
      openRepSections,
      showOTPVerification,
      userEmail,
      otpConfig,
      accountData: safeAccountData,
      addressFields,
      verificationCode,
      verificationSent,
      writerProfile,
      selectedGenres,
      nuancedTags,
      agreementAccepted,
    };

    window.sessionStorage.setItem(WRITER_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  }, [
    accountData,
    addressFields,
    agreementAccepted,
    currentStep,
    nuancedTags,
    openRepSections,
    selectedGenres,
    showOTPVerification,
    userEmail,
    otpConfig,
    verificationCode,
    verificationSent,
    writerProfile,
  ]);

  useEffect(() => {
    const referralFromUrl = normalizeReferralInput(
      searchParams.get("ref") || searchParams.get("referral") || searchParams.get("referralCode")
    );

    if (referralFromUrl) {
      setAccountData((prev) => ({ ...prev, referralCode: referralFromUrl }));
      if (typeof window !== "undefined") {
        localStorage.setItem(REFERRAL_STORAGE_KEY, referralFromUrl);
      }
      return;
    }

    if (typeof window !== "undefined") {
      const storedReferral = normalizeReferralInput(localStorage.getItem(REFERRAL_STORAGE_KEY));
      if (storedReferral) {
        setAccountData((prev) => {
          if (normalizeReferralInput(prev.referralCode) === storedReferral) return prev;
          return { ...prev, referralCode: storedReferral };
        });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (isOutsideIndia) {
      setZipLookupLoading(false);
      return;
    }

    const zipCode = String(addressFields.zipCode || "").trim();
    if (!INDIA_ZIP_REGEX.test(zipCode)) {
      setZipLookupLoading(false);
      return;
    }

    const requestId = Date.now();
    zipLookupRequestRef.current = requestId;
    let isActive = true;

    const lookupZipInfo = async () => {
      setZipLookupLoading(true);
      try {
        const { data } = await api.get(`/auth/zip-info/${zipCode}`);
        if (!isActive || zipLookupRequestRef.current !== requestId) return;

        if (data?.valid === false) {
          if (data?.message) {
            setAddressError(data.message);
          }
          return;
        }

        const resolvedCity = String(data?.city || "").trim();
        const resolvedState = String(data?.state || "").trim();

        setAddressFields((prev) => {
          if (prev.zipCode !== zipCode) return prev;
          return {
            ...prev,
            city: resolvedCity || prev.city,
            state: resolvedState || prev.state,
          };
        });

        setAddressError("");
      } catch (err) {
        if (!isActive || zipLookupRequestRef.current !== requestId) return;
        const message = err?.response?.data?.message;
        if (message) {
          setAddressError(message);
        }
      } finally {
        if (isActive && zipLookupRequestRef.current === requestId) {
          setZipLookupLoading(false);
        }
      }
    };

    lookupZipInfo();

    return () => {
      isActive = false;
    };
  }, [addressFields.zipCode, isOutsideIndia]);

  useEffect(() => {
    const username = String(writerProfile.username || "").trim().toLowerCase();

    if (!username) {
      setUsernameStatus({ state: "idle", message: "Use 3-30 characters: a-z, 0-9, or _." });
      return;
    }

    if (username.length < 3) {
      setUsernameStatus({ state: "invalid", message: "Username must be at least 3 characters." });
      return;
    }

    if (username.length > 30 || !USERNAME_PATTERN.test(username)) {
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
  }, [writerProfile.username]);

  useEffect(() => {
    const referralInput = normalizeReferralInput(accountData.referralCode);

    if (!referralInput) {
      setReferralStatus({
        state: "idle",
        message: "Optional: enter referral code or writer username.",
      });
      return;
    }

    if (referralInput.length < 3) {
      setReferralStatus({
        state: "invalid",
        message: "Use at least 3 characters.",
      });
      return;
    }

    const requestId = Date.now();
    referralCheckRequestRef.current = requestId;
    setReferralStatus({ state: "checking", message: "Checking referral..." });
    let isActive = true;

    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/validate-referral/${encodeURIComponent(referralInput)}`);
        if (!isActive || referralCheckRequestRef.current !== requestId) return;

        const referrerName = String(data?.referrer?.name || "").trim();
        const referrerUsername = String(data?.referrer?.username || "").trim();
        const resolvedLabel = referrerName || (referrerUsername ? `@${referrerUsername}` : "Valid referrer");

        setReferralStatus({
          state: "valid",
          message: `Referral applied: ${resolvedLabel}`,
        });
      } catch (err) {
        if (!isActive || referralCheckRequestRef.current !== requestId) return;

        if (err?.response?.status === 404) {
          setReferralStatus({
            state: "invalid",
            message: "Referral code or username not found.",
          });
          return;
        }

        setReferralStatus({
          state: "warning",
          message: "Unable to validate referral right now. It will be checked at signup.",
        });
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [accountData.referralCode]);

  const steps = [
    { num: 1, title: "Name" },
    { num: 2, title: "Contact" },
    { num: 3, title: "Password" },
    { num: 4, title: "Username" },
    { num: 5, title: "About" },
    { num: 6, title: "Guilds" },
    { num: 7, title: "Links" },
    { num: 8, title: "Tags" },
    { num: 9, title: "Terms" },
  ];

  const TOTAL_STEPS = 9;
  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  const handleSubStepContinue = useCallback((e) => {
    if (e) e.preventDefault();
    setError(""); setEmailError(""); setPhoneError(""); setUsernameError("");
    switch (currentStep) {
      case 1:
        if (!accountData.name.trim()) { setError("Please enter your name"); return; }
        setCurrentStep(2);
        break;
      case 2:
        if (!isValidEmail(accountData.email.trim().toLowerCase())) { setEmailError("Please enter a valid email"); return; }
        if (!accountData.phone.trim()) { setPhoneError("Phone number is required"); return; }
        if (!/^[+]?[\d\s\-().]{7,15}$/.test(accountData.phone)) { setPhoneError("Enter a valid phone number"); return; }
        setCurrentStep(3);
        break;
      case 4: {
        const u = String(writerProfile.username || "").trim().toLowerCase();
        if (!u) { setUsernameError("Username is required"); return; }
        if (!USERNAME_PATTERN.test(u)) { setUsernameError("Use 3-30 lowercase letters, numbers, or _"); return; }
        if (usernameStatus.state === "checking") { setUsernameError("Checking availability..."); return; }
        if (usernameStatus.state === "unavailable") { setUsernameError("Username is taken"); return; }
        setCurrentStep(5);
        break;
      }
      case 5:
        if (!writerProfile.diversity.gender?.trim() || !writerProfile.diversity.nationality?.trim()) {
          setError("Gender and nationality are required"); return;
        }
        setCurrentStep(6);
        break;
      case 6: setCurrentStep(7); break;
      case 8: setCurrentStep(9); break;
      default: setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  }, [currentStep, accountData, writerProfile, usernameStatus.state]);

  // Handle account creation and email verification
  const handleAccountCreation = async (e) => {
    e.preventDefault();
    setError("");
    setPhoneError("");
    setAddressError("");
    setEmailError("");

    if (!accountData.phone) {
      setPhoneError("Phone number is required");
      return;
    }

    const phoneRegex = /^[+]?[\d\s\-().]{7,15}$/;
    if (!phoneRegex.test(accountData.phone)) {
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
    
    const normalizedReferralCode = normalizeReferralInput(accountData.referralCode);
    if (normalizedReferralCode && referralStatus.state === "invalid") {
      setError("Referral code or username not found");
      return;
    }
    
    setLoading(true);
    try {
      // Create account using AuthContext join function
      const joinPayload = {
        name: accountData.name,
        email: sanitizedEmail,
        password: accountData.password,
        role: "creator",
        phone: accountData.phone,
        referralCode: normalizedReferralCode,
      };

      if (normalizedReferralCode) {
        if (typeof window !== "undefined") {
          localStorage.setItem(REFERRAL_STORAGE_KEY, normalizedReferralCode);
        }
      } else if (typeof window !== "undefined") {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }

      const response = await join(joinPayload);
      
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
        setCurrentStep(2);
      }
      
      setError("");
    } catch (err) {
      const msg = err.response?.data?.message || "Join failed";
      if (/zip|city|state|address/i.test(msg)) {
        setAddressError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = (userData) => {
    // Update auth context with user data
    setUser(userData);
    setShowOTPVerification(false);
    // Move to next step
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
  };

  const handleFinishLater = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(WRITER_ONBOARDING_DRAFT_KEY);
    }
    navigate("/dashboard");
  };

  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await api.post("/onboarding/verify-email", {
        code: verificationCode
      });
      
      if (response.data.success) {
        setCurrentStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWriterProfile = async (e) => {
    e.preventDefault();
    setUsernameError("");
    setError("");

    const normalizedUsername = String(writerProfile.username || "").trim().toLowerCase();

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

    if (!writerProfile.diversity.gender?.trim() || !writerProfile.diversity.nationality?.trim()) {
      setError("Gender and Nationality are required");
      return;
    }

    const wgaReview = writerProfile.membershipVerification?.wga || EMPTY_MEMBERSHIP_REVIEW;
    const swaReview = writerProfile.membershipVerification?.swa || EMPTY_MEMBERSHIP_REVIEW;

    const needsWgaProof = Boolean(
      writerProfile.wgaMember &&
      wgaReview.status !== "approved" &&
      !membershipProofFiles.wga &&
      !wgaReview.proofUrl
    );

    const needsSwaProof = Boolean(
      writerProfile.sgaMember &&
      swaReview.status !== "approved" &&
      !membershipProofFiles.swa &&
      !swaReview.proofUrl
    );

    if (needsWgaProof || needsSwaProof) {
      setError("Please upload membership proof for each selected guild before continuing.");
      return;
    }

    setLoading(true);
    
    try {
      const writerProfilePayload = {
        ...writerProfile,
        username: normalizedUsername,
        phone: accountData.phone,
      };

      if (accountData.dateOfBirth) {
        writerProfilePayload.dateOfBirth = accountData.dateOfBirth;
      }

      if (
        addressFields.street ||
        addressFields.city ||
        addressFields.state ||
        addressFields.zipCode ||
        (isOutsideIndia && addressFields.country)
      ) {
        writerProfilePayload.address = {
          street: addressFields.street,
          city: addressFields.city,
          state: addressFields.state,
          zipCode: addressFields.zipCode,
          country: isOutsideIndia ? addressFields.country : INDIA_COUNTRY_NAME,
          formatted: isOutsideIndia
            ? `${addressFields.street}, ${addressFields.city}, ${addressFields.state}, ${addressFields.zipCode}, ${addressFields.country}`
            : `${addressFields.street}, ${addressFields.city}, ${addressFields.state}, ${addressFields.zipCode}`,
        };
      }

      const response = await api.put("/onboarding/writer-profile", writerProfilePayload);

      const latestWriterProfile = response?.data?.user?.writerProfile
        ? mergeWriterProfile(response.data.user.writerProfile)
        : writerProfile;
      
      if (response.data.success) {
        setWriterProfile(latestWriterProfile);
        const queuedProofFiles = {
          wga: membershipProofFiles.wga,
          swa: membershipProofFiles.swa,
        };
        setMembershipProofFiles({ wga: null, swa: null });
        setCurrentStep(8); // Move to tags step

        const hasQueuedUploads = Boolean(
          (writerProfile.wgaMember && queuedProofFiles.wga) ||
          (writerProfile.sgaMember && queuedProofFiles.swa)
        );

        if (hasQueuedUploads) {
          setMembershipUploadsInProgress(true);
          setMembershipUploadNotice("Membership proof is uploading in the background. You can continue to the next step.");

          membershipUploadPromiseRef.current = (async () => {
            let mergedProfile = latestWriterProfile;

            const submitMembershipProof = async (membershipType, file) => {
              const formData = new FormData();
              formData.append("membershipType", membershipType);
              formData.append("proof", file);
              const proofResponse = await api.post("/onboarding/writer-membership-proof", formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              if (proofResponse?.data?.user?.writerProfile) {
                mergedProfile = mergeWriterProfile(proofResponse.data.user.writerProfile);
              }
            };

            if (writerProfile.wgaMember && queuedProofFiles.wga) {
              await submitMembershipProof("wga", queuedProofFiles.wga);
            }

            if (writerProfile.sgaMember && queuedProofFiles.swa) {
              await submitMembershipProof("swa", queuedProofFiles.swa);
            }

            return mergedProfile;
          })()
            .then((mergedProfile) => {
              if (mergedProfile) {
                setWriterProfile(mergedProfile);
              }
              setMembershipUploadNotice("");
            })
            .catch((uploadErr) => {
              console.error("Membership proof upload failed:", uploadErr);
              setMembershipUploadNotice("");
              setError(uploadErr?.response?.data?.message || "Profile saved, but membership proof upload failed. Please re-upload before completion.");
            })
            .finally(() => {
              setMembershipUploadsInProgress(false);
            });
        } else {
          membershipUploadPromiseRef.current = Promise.resolve();
          setMembershipUploadsInProgress(false);
          setMembershipUploadNotice("");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const getMembershipStatusMeta = (status) => {
    const normalized = String(status || "not_submitted").toLowerCase();
    if (normalized === "approved") {
      return { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (normalized === "pending") {
      return { label: "Pending review", className: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    if (normalized === "rejected") {
      return { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" };
    }
    return { label: "Not submitted", className: "bg-slate-50 text-slate-600 border-slate-200" };
  };

  // Genre and Tag Options
  const genreOptions = [
    "Action", "Adventure", "Animation", "Anime", "Art/Foreign", "Biographical",
    "Children/Family", "Comedy", "Coming of Age", "Crime", "Dark Comedy", "Documentary",
    "Drama", "Erotic", "Espionage", "Faith/Spirituality", "Family", "Fantasy",
    "Film Noir", "Historical", "Horror", "Indie", "Legal", "Martial Arts",
    "Medical", "Mockumentary", "Musical", "Mystery", "Noir", "Political",
    "Psychological", "Romance", "Romantic Comedy", "Satire", "Sci-Fi", "Short Film",
    "Slice of Life", "Sports", "Steampunk", "Superhero", "Supernatural", "Suspense",
    "Teen", "Thriller", "True Crime", "War", "Western", "Zombie"
  ];

  const allNuancedTags = [
    // Themes
    "Abandonment", "Addiction", "Alienation", "Ambition", "Betrayal", "Brotherhood",
    "Capitalism", "Chosen One", "Class Struggle", "Colonialism", "Coming of Age",
    "Corruption", "Revenge", "Redemption", "Love Triangle", "Family Drama",
    "Social Justice", "Identity Crisis", "Survival", "Power Struggle",
    "Forbidden Love", "Loss & Grief", "Good vs Evil", "Man vs Nature",
    "Isolation", "Second Chance", "Underdog Story", "Fish Out of Water",
    "Quest", "Transformation", "Sacrifice", "Justice", "Freedom", "Mental Illness",
    "Existentialism", "Fate vs Free Will", "Man vs Technology", "War & Peace",
    // Settings
    "Ancient", "Cyberpunk", "Contemporary", "Deep Space", "Desert", "Dystopian",
    "Future", "Haunted House", "Historical", "Hospital", "Jungle", "Medieval",
    "Military Base", "Ocean/Sea", "Post-Apocalyptic", "Prison", "Rural",
    "School/College", "Small Town", "Big City", "Space", "Suburban",
    "Alternate Reality", "Virtual Reality", "Underground", "Wilderness",
    "Wild West", "Victorian Era", "World War I", "World War II", "Secret Facility",
    // Tones
    "Absurdist", "Atmospheric", "Bleak", "Cerebral", "Claustrophobic", "Campy",
    "Cynical", "Dark", "Dreamlike", "Edgy", "Epic", "Fast-paced", "Gritty",
    "Heartwarming", "Hopeful", "Intense", "Irreverent", "Lighthearted",
    "Melancholic", "Mind-bending", "Noir", "Nostalgic", "Poetic", "Provocative",
    "Quirky", "Raw", "Romantic", "Satirical", "Sensual", "Slow-burn", "Surreal",
    "Suspenseful", "Tense", "Tragic", "Uplifting", "Whimsical"
  ];

  // Tag handlers
  const toggleGenre = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const toggleNuancedTag = (tag) => {
    if (nuancedTags.includes(tag)) {
      // Remove tag
      setNuancedTags(nuancedTags.filter(t => t !== tag));
    } else {
      // Add tag with limit check
      if (nuancedTags.length >= 5) {
        setShowTagError(true);
        setTimeout(() => setShowTagError(false), 2000);
        return;
      }
      setNuancedTags([...nuancedTags, tag]);
    }
  };

  const handleTagsSubmit = (e) => {
    e.preventDefault();
    setCurrentStep(9);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (membershipUploadsInProgress) {
        setMembershipUploadNotice("Finishing membership proof upload before completing setup...");
        await membershipUploadPromiseRef.current;
        setMembershipUploadNotice("");
      }

      const response = await api.post("/onboarding/complete", {
        genres: selectedGenres,
        tags: nuancedTags,
        plan: selectedPlan,
        agreementAccepted,
        termsVersion: WRITER_TERMS_VERSION,
        privacyPolicyAccepted,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      });
      
      if (response.data.success) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(WRITER_ONBOARDING_DRAFT_KEY);
        }
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };




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
                  <input autoFocus type="text" className="ob-input" style={{ paddingLeft: 40 }} placeholder="e.g. Rahul Sharma" value={accountData.name} onChange={(e) => setAccountData({ ...accountData, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSubStepContinue(e)} required />
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
                  <input autoFocus type="email" className={`ob-input ${emailError ? "ob-input--error" : ""}`} style={{ paddingLeft: 40 }} placeholder="writer@example.com" value={accountData.email} onChange={(e) => { setAccountData({ ...accountData, email: e.target.value }); setEmailError(""); }} required />
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

          {/* Step 3: Password + Referral -> Create Account */}
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
                    <input autoFocus type="password" className="ob-input" style={{ paddingLeft: 40 }} placeholder="Min. 8 characters" value={accountData.password} onChange={(e) => { setAccountData({ ...accountData, password: e.target.value }); if (!showPasswordReqs) setShowPasswordReqs(true); }} onFocus={() => setShowPasswordReqs(true)} required />
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
                  <label className="ob-label">Referral Code <span style={{ opacity: 0.5, textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" className="ob-input" placeholder="Enter referral code or username" value={accountData.referralCode} onChange={(e) => { setAccountData({ ...accountData, referralCode: e.target.value.slice(0, REFERRAL_MAX_LENGTH) }); setError(""); }} />
                  {accountData.referralCode && (
                    <p className={`ob-hint ${referralStatus.state === "valid" ? "ob-hint--ok" : referralStatus.state === "invalid" ? "ob-hint--err" : referralStatus.state === "warning" ? "ob-hint--warn" : ""}`}>{referralStatus.message}</p>
                  )}
                </div>
                <ErrorBox msg={emailError} />
                <div className="ob-actions">
                  <button type="submit" disabled={loading} className="ob-btn ob-btn-primary">{loading ? "Creating account..." : <><span>Create Account</span> <ArrowRight size={16} /></>}</button>
                  <BackBtn to={2} />
                </div>
              </form>
            </MotionCard>
          )}

          {/* Step 4: Username */}
          {currentStep === 4 && (
            <MotionCard key="s4" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Pick a <em>username</em></h1>
              <p className="ob-subtitle">This is how other users will find you on Ckript.</p>
              <ErrorBox msg={error} />
              <div className="ob-field">
                <label className="ob-label">Username</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: 13, color: "#6B7280", fontSize: "0.9375rem", fontWeight: 500 }}>@</span>
                  <input autoFocus type="text" className={`ob-input ${usernameError || usernameStatus.state === "unavailable" ? "ob-input--error" : ""}`} style={{ paddingLeft: 34 }} placeholder="e.g. rahul_writes" value={writerProfile.username} onChange={(e) => { setWriterProfile({ ...writerProfile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }); if (usernameError) setUsernameError(""); }} onKeyDown={(e) => e.key === "Enter" && handleSubStepContinue(e)} required />
                </div>
                {usernameError && <p className="ob-hint ob-hint--err">{usernameError}</p>}
                {!usernameError && usernameStatus.message && (
                  <p className={`ob-hint ${usernameStatus.state === "available" ? "ob-hint--ok" : usernameStatus.state === "unavailable" || usernameStatus.state === "invalid" ? "ob-hint--err" : ""}`}>{usernameStatus.message}</p>
                )}
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
              <p className="ob-subtitle">A few details to help others discover your work.</p>
              <ErrorBox msg={error} />
              <div className="ob-field">
                <label className="ob-label">Short Bio</label>
                <textarea className="ob-input ob-textarea" placeholder="Screenwriter based in Mumbai with a love for noir thrillers..." value={writerProfile.bio} onChange={(e) => setWriterProfile({ ...writerProfile, bio: e.target.value })} rows={3} />
              </div>
              <div className="ob-row">
                <div className="ob-field">
                  <label className="ob-label">Gender *</label>
                  <select className="ob-input ob-select" value={writerProfile.diversity.gender} onChange={(e) => setWriterProfile({ ...writerProfile, diversity: { ...writerProfile.diversity, gender: e.target.value } })} required>
                    <option value="">Select</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="ob-field">
                  <label className="ob-label">Nationality *</label>
                  <select className="ob-input ob-select" value={writerProfile.diversity.nationality} onChange={(e) => setWriterProfile({ ...writerProfile, diversity: { ...writerProfile.diversity, nationality: e.target.value } })} required>
                    <option value="">Select</option>
                    {NATIONALITY_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="ob-field">
                <label className="ob-label">Date of Birth <span style={{ opacity: 0.5, textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                <input type="date" className="ob-input" value={accountData.dateOfBirth} onChange={(e) => setAccountData({ ...accountData, dateOfBirth: e.target.value })} style={{ colorScheme: "dark" }} />
              </div>
              <div className="ob-actions">
                <button type="button" onClick={handleSubStepContinue} className="ob-btn ob-btn-primary">Continue <ArrowRight size={16} /></button>
                <div className="ob-actions-row"><BackBtn to={4} /><FinishLaterBtn /></div>
              </div>
            </MotionCard>
          )}

          {/* Step 6: Guild Memberships */}
          {currentStep === 6 && (
            <MotionCard key="s6" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Guild <em>memberships</em></h1>
              <p className="ob-subtitle">Are you a member of any writer's guild? Optional — you can skip.</p>
              <ErrorBox msg={error} />
              <div className={`ob-toggle-row ${writerProfile.wgaMember ? "ob-toggle-row--active" : ""}`} onClick={() => handleMembershipToggle("wga", !writerProfile.wgaMember)}>
                <div><div style={{ color: "#F9FAFB", fontSize: "0.875rem", fontWeight: 600 }}>WGA Member</div><div style={{ color: "#6B7280", fontSize: "0.75rem", marginTop: 2 }}>Writers Guild of America</div></div>
                <input type="checkbox" className="ob-checkbox" checked={writerProfile.wgaMember} onChange={() => {}} />
              </div>
              {writerProfile.wgaMember && (
                <div className="ob-field" style={{ marginTop: 8, marginBottom: 16 }}>
                  <label className="ob-label">WGA Proof Document</label>
                  <label className="ob-upload-zone">
                    <input type="file" style={{ display: "none" }} accept="image/*,.pdf" onChange={(e) => setMembershipProofFiles(prev => ({ ...prev, wga: e.target.files?.[0] || null }))} />
                    <Upload size={16} style={{ marginRight: 8 }} />{membershipProofFiles.wga ? membershipProofFiles.wga.name : "Upload proof (image or PDF)"}
                  </label>
                </div>
              )}
              <div className={`ob-toggle-row ${writerProfile.sgaMember ? "ob-toggle-row--active" : ""}`} onClick={() => handleMembershipToggle("sga", !writerProfile.sgaMember)}>
                <div><div style={{ color: "#F9FAFB", fontSize: "0.875rem", fontWeight: 600 }}>SWA Member</div><div style={{ color: "#6B7280", fontSize: "0.75rem", marginTop: 2 }}>Screenwriters Association (India)</div></div>
                <input type="checkbox" className="ob-checkbox" checked={writerProfile.sgaMember} onChange={() => {}} />
              </div>
              {writerProfile.sgaMember && (
                <div className="ob-field" style={{ marginTop: 8 }}>
                  <label className="ob-label">SWA Proof Document</label>
                  <label className="ob-upload-zone">
                    <input type="file" style={{ display: "none" }} accept="image/*,.pdf" onChange={(e) => setMembershipProofFiles(prev => ({ ...prev, swa: e.target.files?.[0] || null }))} />
                    <Upload size={16} style={{ marginRight: 8 }} />{membershipProofFiles.swa ? membershipProofFiles.swa.name : "Upload proof (image or PDF)"}
                  </label>
                </div>
              )}
              <div className="ob-actions">
                <button type="button" onClick={handleSubStepContinue} className="ob-btn ob-btn-primary">{writerProfile.wgaMember || writerProfile.sgaMember ? "Continue" : "Skip"} <ArrowRight size={16} /></button>
                <div className="ob-actions-row"><BackBtn to={5} /><FinishLaterBtn /></div>
              </div>
            </MotionCard>
          )}

          {/* Step 7: Links -> triggers profile save */}
          {currentStep === 7 && (
            <MotionCard key="s7" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Your online <em>presence</em></h1>
              <p className="ob-subtitle">Add your portfolio and social links — all optional.</p>
              <ErrorBox msg={error} />
              {membershipUploadNotice && <div className="ob-error-box" style={{ background: "rgba(120,80,0,0.2)", borderColor: "rgba(251,191,36,0.3)", color: "#FBBF24" }}>{membershipUploadNotice}</div>}
              <form onSubmit={handleWriterProfile}>
                <div className="ob-field">
                  <label className="ob-label">Portfolio / Website</label>
                  <input type="url" className="ob-input" placeholder="https://yourportfolio.com" value={writerProfile.links.portfolio} onChange={(e) => setWriterProfile({ ...writerProfile, links: { ...writerProfile.links, portfolio: e.target.value } })} />
                </div>
                <div className="ob-row">
                  <div className="ob-field">
                    <label className="ob-label"><Instagram size={12} style={{ display: "inline", marginRight: 4 }} />Instagram</label>
                    <input type="url" className="ob-input" placeholder="https://instagram.com/..." value={writerProfile.links.instagram} onChange={(e) => setWriterProfile({ ...writerProfile, links: { ...writerProfile.links, instagram: e.target.value } })} />
                  </div>
                  <div className="ob-field">
                    <label className="ob-label"><Twitter size={12} style={{ display: "inline", marginRight: 4 }} />Twitter / X</label>
                    <input type="url" className="ob-input" placeholder="https://x.com/..." value={writerProfile.links.twitter} onChange={(e) => setWriterProfile({ ...writerProfile, links: { ...writerProfile.links, twitter: e.target.value } })} />
                  </div>
                </div>
                <div className="ob-row">
                  <div className="ob-field">
                    <label className="ob-label"><Linkedin size={12} style={{ display: "inline", marginRight: 4 }} />LinkedIn</label>
                    <input type="url" className="ob-input" placeholder="https://linkedin.com/in/..." value={writerProfile.links.linkedin} onChange={(e) => setWriterProfile({ ...writerProfile, links: { ...writerProfile.links, linkedin: e.target.value } })} />
                  </div>
                  <div className="ob-field">
                    <label className="ob-label"><Film size={12} style={{ display: "inline", marginRight: 4 }} />IMDB</label>
                    <input type="url" className="ob-input" placeholder="https://imdb.com/name/..." value={writerProfile.links.imdb} onChange={(e) => setWriterProfile({ ...writerProfile, links: { ...writerProfile.links, imdb: e.target.value } })} />
                  </div>
                </div>
                <div className="ob-actions">
                  <button type="submit" disabled={loading} className="ob-btn ob-btn-primary">{loading ? "Saving profile..." : <><span>Save & Continue</span> <ArrowRight size={16} /></>}</button>
                  <div className="ob-actions-row"><BackBtn to={6} /><FinishLaterBtn /></div>
                </div>
              </form>
            </MotionCard>
          )}

          {/* Step 8: Tags */}
          {currentStep === 8 && (
            <MotionCard key="s8" {...cardAnim} className="ob-card" style={{ maxWidth: 600 }}>
              <h1 className="ob-title">What do you <em>write</em>?</h1>
              <p className="ob-subtitle">Select genres you love and up to 5 story tags.</p>
              <ErrorBox msg={error} />
              <form onSubmit={handleTagsSubmit}>
                <div className="ob-field">
                  <label className="ob-label">Genres</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {genreOptions.map(g => (<button key={g} type="button" onClick={() => toggleGenre(g)} className={`ob-chip ${selectedGenres.includes(g) ? "ob-chip--active" : ""}`}>{g}</button>))}
                  </div>
                </div>
                <div className="ob-divider" />
                <div className="ob-field">
                  <label className="ob-label">Story Tags <span style={{ opacity: 0.5, textTransform: "none", fontWeight: 400 }}>(max 5)</span></label>
                  {showTagError && <p className="ob-hint ob-hint--err" style={{ marginBottom: 8 }}>Maximum of 5 tags allowed</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                    {allNuancedTags.map(t => (<button key={t} type="button" onClick={() => toggleNuancedTag(t)} className={`ob-chip ${nuancedTags.includes(t) ? "ob-chip--active" : ""}`}>{t}</button>))}
                  </div>
                </div>
                <div className="ob-actions">
                  <button type="submit" className="ob-btn ob-btn-primary">Continue <ArrowRight size={16} /></button>
                  <div className="ob-actions-row"><BackBtn to={7} /><FinishLaterBtn /></div>
                </div>
              </form>
            </MotionCard>
          )}

          {/* Step 9: Terms & Complete */}
          {currentStep === 9 && (
            <MotionCard key="s9" {...cardAnim} className="ob-card">
              <h1 className="ob-title">Almost <em>there</em>!</h1>
              <p className="ob-subtitle">Review and accept our terms to complete your writer setup.</p>
              <ErrorBox msg={error} />
              {membershipUploadNotice && <div className="ob-error-box" style={{ background: "rgba(120,80,0,0.2)", borderColor: "rgba(251,191,36,0.3)", color: "#FBBF24" }}>{membershipUploadNotice}</div>}
              <form onSubmit={handleFinalSubmit}>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <Link to={WRITER_TERMS_ROUTE} target="_blank" rel="noopener noreferrer" className="ob-btn ob-btn-ghost" style={{ flex: 1, fontSize: "0.75rem", height: 40 }}>Terms & Conditions <ArrowRight size={12} /></Link>
                  <Link to={REGISTRATION_PRIVACY_ROUTE} target="_blank" rel="noopener noreferrer" className="ob-btn ob-btn-ghost" style={{ flex: 1, fontSize: "0.75rem", height: 40 }}>Privacy Policy <ArrowRight size={12} /></Link>
                </div>
                <div className="ob-divider" />
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" className="ob-checkbox" checked={agreementAccepted} onChange={(e) => setAgreementAccepted(e.target.checked)} style={{ marginTop: 2 }} />
                    <span style={{ fontSize: "0.8125rem", color: "#CBD5E1", lineHeight: 1.5 }}>I have read and agree to the Writer Onboard Terms and Conditions</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" className="ob-checkbox" checked={privacyPolicyAccepted} onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)} style={{ marginTop: 2 }} />
                    <span style={{ fontSize: "0.8125rem", color: "#CBD5E1", lineHeight: 1.5 }}>I have read and agree to the Registration Privacy Policy</span>
                  </label>
                </div>
                <div className="ob-actions">
                  <button type="submit" disabled={loading || !agreementAccepted || !privacyPolicyAccepted} className="ob-btn ob-btn-primary">{loading ? "Processing..." : <><CheckCircle size={16} /> Complete Setup</>}</button>
                  <div className="ob-actions-row"><BackBtn to={8} /><FinishLaterBtn /></div>
                </div>
                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#4B5563" }}>
                  <span>Terms: {WRITER_TERMS_VERSION}</span>
                  <span>Privacy: {PRIVACY_POLICY_VERSION}</span>
                </div>
              </form>
            </MotionCard>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default WriterOnboarding;
