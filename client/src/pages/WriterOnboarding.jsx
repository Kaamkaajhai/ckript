import { useState, useContext, useRef, useEffect } from "react";
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
  ArrowLeft,
  Mail,
  Lock,
  User,
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  Link as LinkIcon,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Film,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


// Comprehensive email validation
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  email = email.trim().toLowerCase();
  if (email.length > 254 || email.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
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
  confirmPassword: "",
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
    return Number.isInteger(step) && step >= 1 && step <= 4 ? step : 1;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [dobError, setDobError] = useState("");
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
  const [isOutsideIndia, setIsOutsideIndia] = useState(() => {
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
  const [agreementScrolled, setAgreementScrolled] = useState(Boolean(initialDraft?.agreementScrolled));
  const [agreementAccepted, setAgreementAccepted] = useState(Boolean(initialDraft?.agreementAccepted));
  const agreementRef = useRef(null);
  const [selectedPlan, setSelectedPlan] = useState("free");
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
      confirmPassword: "",
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
      agreementScrolled,
      agreementAccepted,
    };

    window.sessionStorage.setItem(WRITER_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  }, [
    accountData,
    addressFields,
    agreementAccepted,
    agreementScrolled,
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
    { num: 1, title: "Account" },
    { num: 2, title: "Profile" },
    { num: 3, title: "Tags" },
    { num: 4, title: "Checkout" }
  ];

  // Handle account creation and email verification
  const handleAccountCreation = async (e) => {
    e.preventDefault();
    setError("");
    setPhoneError("");
    setAddressError("");
    setDobError("");
    setEmailError("");

    if (!accountData.dateOfBirth) {
      setDobError("Date of birth is required");
      return;
    }

    if (!accountData.phone) {
      setPhoneError("Phone number is required");
      return;
    }

    const street = addressFields.street.trim();
    const city = addressFields.city.trim();
    const state = addressFields.state.trim();
    const zipCode = addressFields.zipCode.trim();
    const country = isOutsideIndia ? addressFields.country.trim() : INDIA_COUNTRY_NAME;

    if (!street || !city || !state || !zipCode || !country) {
      setAddressError("Street, city, state, postal code, and country are required");
      return;
    }

    if (!isOutsideIndia) {
      if (!INDIA_ZIP_REGEX.test(zipCode)) {
        setAddressError("ZIP code must be exactly 6 digits");
        return;
      }
    } else if (!INTERNATIONAL_POSTAL_REGEX.test(zipCode)) {
      setAddressError("Enter a valid postal code (3-12 letters, numbers, spaces, or hyphen)");
      return;
    }

    const cityStatePattern = /^[a-zA-Z][a-zA-Z\s.'-]{1,}$/;
    if (!cityStatePattern.test(city) || !cityStatePattern.test(state)) {
      setAddressError("Enter a valid city and state name");
      return;
    }

    const formattedAddress = isOutsideIndia
      ? `${street}, ${city}, ${state}, ${zipCode}, ${country}`
      : `${street}, ${city}, ${state}, ${zipCode}`;
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
    
    // Check password confirmation
    if (accountData.password !== accountData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const normalizedReferralCode = normalizeReferralInput(accountData.referralCode);
    if (normalizedReferralCode && referralStatus.state === "invalid") {
      setError("Referral code or username not found");
      return;
    }
    
    setLoading(true);
    try {
      // Validate ZIP, state and city consistency for India addresses.
      if (!isOutsideIndia) {
        await api.post("/auth/validate-address", {
          address: formattedAddress,
        });
      }

      // Create account using AuthContext join function
      const joinPayload = {
        name: accountData.name,
        email: sanitizedEmail,
        password: accountData.password,
        role: "creator",
        dateOfBirth: accountData.dateOfBirth,
        phone: accountData.phone,
        address: {
          street,
          city,
          state,
          zipCode,
          country,
          formatted: formattedAddress,
        },
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
    setCurrentStep(2);
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
      const response = await api.put("/onboarding/writer-profile", {
        ...writerProfile,
        username: normalizedUsername,
        dateOfBirth: accountData.dateOfBirth,
        phone: accountData.phone,
        address: {
          street: addressFields.street,
          city: addressFields.city,
          state: addressFields.state,
          zipCode: addressFields.zipCode,
          country: isOutsideIndia ? addressFields.country : INDIA_COUNTRY_NAME,
          formatted: isOutsideIndia
            ? `${addressFields.street}, ${addressFields.city}, ${addressFields.state}, ${addressFields.zipCode}, ${addressFields.country}`
            : `${addressFields.street}, ${addressFields.city}, ${addressFields.state}, ${addressFields.zipCode}`,
        },
      });

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
        setCurrentStep(3); // Move to tags step

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
    setCurrentStep(4);
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



  const renderStep = () => {
    switch (currentStep) {
      case 1:
        if (!verificationSent) {
          return (
            <form onSubmit={handleAccountCreation} className="space-y-6">
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Create Writer Account</h2>
              <p className="text-sm text-gray-600">Join the Ckript community</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={accountData.name}
                    onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    value={accountData.dateOfBirth}
                    onChange={(e) => setAccountData({...accountData, dateOfBirth: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent ${accountData.dateOfBirth ? "text-gray-900" : "text-gray-400"}`}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                {dobError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {dobError}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={accountData.email}
                    onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="writer@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referral code (optional)
                </label>
                <input
                  type="text"
                  value={accountData.referralCode}
                  onChange={(e) => {
                    const nextReferral = e.target.value.slice(0, REFERRAL_MAX_LENGTH);
                    setAccountData({ ...accountData, referralCode: nextReferral });
                    setError("");
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                  placeholder="Enter referral code"
                />
                {accountData.referralCode ? (
                  <p className={`mt-1.5 text-xs flex items-center gap-1 ${
                    referralStatus.state === "valid"
                      ? "text-emerald-600"
                      : referralStatus.state === "invalid"
                        ? "text-red-500"
                        : referralStatus.state === "warning"
                          ? "text-amber-600"
                          : "text-gray-500"
                  }`}>
                    <AlertCircle size={12} /> {referralStatus.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white/80 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="text-gray-500" size={16} />
                  <label className="text-sm font-semibold text-gray-800">Address Details</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAddressFields((prev) => ({
                        ...prev,
                        country: isOutsideIndia ? INDIA_COUNTRY_NAME : "",
                        zipCode: "",
                        city: "",
                        state: "",
                      }));
                      setIsOutsideIndia((prev) => !prev);
                      setAddressError("");
                      setZipLookupLoading(false);
                    }}
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      isOutsideIndia
                        ? "border-black bg-black text-white"
                        : "border-black bg-white text-black hover:bg-gray-100"
                    }`}
                  >
                    {isOutsideIndia && (
                      <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isOutsideIndia ? "Outside India Enabled" : "Outside India"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {isOutsideIndia && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Country</label>
                      <input
                        type="text"
                        value={addressFields.country}
                        onChange={(e) => {
                          setAddressFields({ ...addressFields, country: e.target.value });
                          setAddressError("");
                        }}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="United Kingdom"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {isOutsideIndia ? "Postal Code" : "ZIP Code"}
                    </label>
                    <input
                      type="text"
                      inputMode={isOutsideIndia ? "text" : "numeric"}
                      maxLength={isOutsideIndia ? 12 : 6}
                      value={addressFields.zipCode}
                      onChange={(e) => {
                        const nextPostalValue = isOutsideIndia
                          ? e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "").slice(0, 12)
                          : e.target.value.replace(/\D/g, "").slice(0, 6);
                        setAddressFields({ ...addressFields, zipCode: nextPostalValue });
                        setAddressError("");
                      }}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                      placeholder={isOutsideIndia ? "SW1A 1AA" : "400001"}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">State</label>
                    <input
                      type="text"
                      value={addressFields.state}
                      onChange={(e) => {
                        setAddressFields({ ...addressFields, state: e.target.value });
                        setAddressError("");
                      }}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                      placeholder={isOutsideIndia ? "State / Province" : "Maharashtra"}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">City</label>
                    <input
                      type="text"
                      value={addressFields.city}
                      onChange={(e) => {
                        setAddressFields({ ...addressFields, city: e.target.value });
                        setAddressError("");
                      }}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                      placeholder={isOutsideIndia ? "London" : "Mumbai"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Street Address</label>
                  <input
                    type="text"
                    value={addressFields.street}
                    onChange={(e) => {
                      setAddressFields({ ...addressFields, street: e.target.value });
                      setAddressError("");
                    }}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="House/Flat, Street, Area"
                    required
                  />
                </div>

                {zipLookupLoading && !isOutsideIndia && (
                  <p className="text-[11px] text-gray-500">Looking up ZIP code and auto-filling city/state...</p>
                )}

                {isOutsideIndia && (
                  <p className="text-[11px] text-gray-500">Enter country and postal code exactly as used in your region.</p>
                )}

                {addressError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {addressError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={accountData.phone}
                    onChange={(e) => { setAccountData({...accountData, phone: e.target.value}); setPhoneError(""); }}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 ${
                      phoneError ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-[#1a365d]"
                    }`}
                    placeholder="+91 00000 00000"
                    required
                  />
                </div>
                {phoneError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={accountData.password}
                    onChange={(e) => {
                      setAccountData({...accountData, password: e.target.value});
                      if (!showPasswordReqs) setShowPasswordReqs(true);
                    }}
                    onFocus={() => setShowPasswordReqs(true)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {showPasswordReqs && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-600 mb-2">Password Requirements:</p>
                    <div className="space-y-1">
                      {(() => {
                        const validation = validatePassword(accountData.password);
                        return (
                          <>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.length ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.length ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              At least 8 characters
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.uppercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One uppercase letter (A-Z)
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.lowercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One lowercase letter (a-z)
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.number ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.number ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One number (0-9)
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.special ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.special ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One special character (!@#$%^&*)
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({...accountData, confirmPassword: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              {emailError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                  {emailError}
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Creating Account..." : "Create Account"}
                <ArrowRight size={16} />
              </button>
            </form>
          );
        } else {
          return (
            <form onSubmit={handleEmailVerification} className="space-y-6">
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Verify Your Email</h2>
              <p className="text-gray-600">
                We've sent a 6-digit code to <strong>{accountData.email}</strong>
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-center text-2xl tracking-widest text-gray-900"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1e3a5f] text-white py-3 rounded-lg font-semibold hover:bg-[#162d4a] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Verifying..." : "Verify Email"}
                <ArrowRight size={20} />
              </button>
            </form>
          );
        }
      
      case 2:
        return (
          <form onSubmit={handleWriterProfile} className="space-y-6">
            <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Tell Us About Yourself</h2>
            <p className="text-gray-600">Help industry professionals discover you</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                <input
                  type="text"
                  value={writerProfile.username}
                  onChange={(e) => {
                    setWriterProfile({
                      ...writerProfile,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    });
                    if (usernameError) setUsernameError("");
                  }}
                  className={`w-full pl-7 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900 ${
                    usernameError || usernameStatus.state === "unavailable" || usernameStatus.state === "invalid"
                      ? "border-red-400"
                      : usernameStatus.state === "available"
                        ? "border-emerald-400"
                        : "border-gray-200"
                  }`}
                  placeholder="e.g. john_doe"
                  required
                />
              </div>
              {!usernameError && usernameStatus.message && (
                <p className={`mt-1.5 text-xs flex items-center gap-1 ${
                  usernameStatus.state === "available"
                    ? "text-emerald-600"
                    : usernameStatus.state === "unavailable" || usernameStatus.state === "invalid" || usernameStatus.state === "error"
                      ? "text-red-500"
                      : "text-gray-500"
                }`}>
                  <AlertCircle size={12} /> {usernameStatus.message}
                </p>
              )}
              {usernameError && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {usernameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio <span className="text-xs font-normal text-gray-500">(Max 500 characters)</span>
              </label>
              <textarea
                value={writerProfile.bio}
                onChange={(e) => setWriterProfile({...writerProfile, bio: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent resize-none text-gray-900"
                rows={4}
                maxLength={500}
                placeholder="Tell us about your background, voice, and experience..."
                required
              />
              <p className="text-sm text-gray-500 mt-1">{writerProfile.bio.length}/500</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border-2 transition ${
                writerProfile.wgaMember
                  ? "border-[#0f2544] bg-[#0f2544]/5"
                  : "border-gray-200"
              }`}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(writerProfile.wgaMember)}
                    onChange={(e) => handleMembershipToggle("wga", e.target.checked)}
                    className="w-4 h-4 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d] accent-[#0f2544]"
                  />
                  <span className={`text-sm font-semibold ${writerProfile.wgaMember ? "text-gray-900" : "text-gray-700"}`}>I am a WGA member</span>
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getMembershipStatusMeta(writerProfile.membershipVerification?.wga?.status).className}`}>
                    {getMembershipStatusMeta(writerProfile.membershipVerification?.wga?.status).label}
                  </span>
                </div>
                {writerProfile.wgaMember && writerProfile.membershipVerification?.wga?.status !== "approved" && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-600">Upload your WGA certificate or proof (PDF, JPG, PNG, WebP)</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setMembershipProofFiles((prev) => ({ ...prev, wga: file }));
                      }}
                      className="block w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#0f2544] file:text-white file:font-semibold"
                    />
                    {membershipProofFiles.wga && (
                      <p className="text-xs text-emerald-700 font-medium">Selected: {membershipProofFiles.wga.name}</p>
                    )}
                    {!membershipProofFiles.wga && writerProfile.membershipVerification?.wga?.proofUrl && (
                      <a
                        href={writerProfile.membershipVerification.wga.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#1a365d] hover:underline"
                      >
                        View latest uploaded proof
                      </a>
                    )}
                    {writerProfile.membershipVerification?.wga?.status === "rejected" && writerProfile.membershipVerification?.wga?.adminNote && (
                      <p className="text-xs text-red-600">Admin note: {writerProfile.membershipVerification.wga.adminNote}</p>
                    )}
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-lg border-2 transition ${
                writerProfile.sgaMember
                  ? "border-[#0f2544] bg-[#0f2544]/5"
                  : "border-gray-200"
              }`}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(writerProfile.sgaMember)}
                    onChange={(e) => handleMembershipToggle("swa", e.target.checked)}
                    className="w-4 h-4 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d] accent-[#0f2544]"
                  />
                  <span className={`text-sm font-semibold ${writerProfile.sgaMember ? "text-gray-900" : "text-gray-700"}`}>I am a SWA member</span>
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getMembershipStatusMeta(writerProfile.membershipVerification?.swa?.status).className}`}>
                    {getMembershipStatusMeta(writerProfile.membershipVerification?.swa?.status).label}
                  </span>
                </div>
                {writerProfile.sgaMember && writerProfile.membershipVerification?.swa?.status !== "approved" && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-600">Upload your SWA certificate or proof (PDF, JPG, PNG, WebP)</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setMembershipProofFiles((prev) => ({ ...prev, swa: file }));
                      }}
                      className="block w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#0f2544] file:text-white file:font-semibold"
                    />
                    {membershipProofFiles.swa && (
                      <p className="text-xs text-emerald-700 font-medium">Selected: {membershipProofFiles.swa.name}</p>
                    )}
                    {!membershipProofFiles.swa && writerProfile.membershipVerification?.swa?.proofUrl && (
                      <a
                        href={writerProfile.membershipVerification.swa.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#1a365d] hover:underline"
                      >
                        View latest uploaded proof
                      </a>
                    )}
                    {writerProfile.membershipVerification?.swa?.status === "rejected" && writerProfile.membershipVerification?.swa?.adminNote && (
                      <p className="text-xs text-red-600">Admin note: {writerProfile.membershipVerification.swa.adminNote}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Diversity Information
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Gender and Nationality are required.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={writerProfile.diversity.gender}
                    onChange={(e) => setWriterProfile({
                      ...writerProfile, 
                      diversity: {...writerProfile.diversity, gender: e.target.value}
                    })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    required
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <select
                    value={writerProfile.diversity.nationality}
                    onChange={(e) => setWriterProfile({
                      ...writerProfile, 
                      diversity: {...writerProfile.diversity, nationality: e.target.value}
                    })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    required
                  >
                    <option value="">Select nationality</option>
                    {NATIONALITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Links & Social Media <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio / Website</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="url" value={writerProfile.links.portfolio}
                      onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, portfolio: e.target.value}})}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                      placeholder="https://yourwebsite.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.instagram}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, instagram: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://instagram.com/..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter / X</label>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.twitter}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, twitter: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://x.com/..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.linkedin}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, linkedin: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.facebook}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, facebook: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://facebook.com/..." />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">IMDb</label>
                    <div className="relative">
                      <Film className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.imdb}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, imdb: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://imdb.com/name/..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accomplishments */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accomplishments <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role / Credit</label>
                <select
                  value={writerProfile.accomplishments[0] || ""}
                  onChange={(e) => setWriterProfile({...writerProfile, accomplishments: e.target.value ? [e.target.value] : []})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                >
                  <option value="">Optional — select a credit</option>
                  <option value="co-executive-producer">Co-Executive Producer</option>
                  <option value="co-producer">Co-Producer</option>
                  <option value="executive-producer">Executive Producer</option>
                  <option value="executive-story-editor">Executive Story Editor</option>
                  <option value="producer">Producer</option>
                  <option value="showrunner">Showrunner</option>
                  <option value="staff-writer">Staff Writer</option>
                  <option value="story-editor">Story Editor</option>
                  <option value="supervising-producer">Supervising Producer</option>
                </select>
              </div>
            </div>

            {/* Representation */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Representation <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>

              {[
                {
                  key: "filmTv",
                  label: "Film & TV Writer Representation",
                  placeholders: {
                    agency: "e.g., CAA, WME, UTA",
                    agent: "e.g., Priya Mehta",
                    managementCompany: "e.g., Anonymous Content",
                    manager: "e.g., Rahul Khanna",
                    lawFirm: "e.g., Loeb & Loeb",
                    lawyer: "e.g., Neha Sinha",
                  },
                },
                {
                  key: "theater",
                  label: "Theater Representation",
                  placeholders: {
                    agency: "e.g., Paradigm Theatrical",
                    agent: "e.g., Aaron Clarke",
                    managementCompany: "e.g., Stage Door Management",
                    manager: "e.g., Maria Lopez",
                    lawFirm: "e.g., Schreck Rose Dapello",
                    lawyer: "e.g., David Lin",
                  },
                },
                {
                  key: "literary",
                  label: "Literary Representation",
                  placeholders: {
                    agency: "e.g., Writers House",
                    agent: "e.g., Sarah Reed",
                    managementCompany: "e.g., Literary Collective",
                    manager: "e.g., Tom Bennett",
                    lawFirm: "e.g., Frankfurt Kurnit",
                    lawyer: "e.g., Kavya Rao",
                  },
                },
              ].map(({ key, label, placeholders }) => (
                <div key={key} className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenRepSections(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                  >
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-500 transition-transform duration-200 ${openRepSections[key] ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openRepSections[key] && (
                    <div className="grid grid-cols-2 gap-4 p-4">
                      {[
                        { field: "agency", label: "Agency" },
                        { field: "agent", label: "Agent" },
                        { field: "managementCompany", label: "Management Company" },
                        { field: "manager", label: "Manager" },
                        { field: "lawFirm", label: "Law Firm" },
                        { field: "lawyer", label: "Lawyer" }
                      ].map(({ field, label: fieldLabel }) => (
                        <div key={field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{fieldLabel}</label>
                          <input
                            type="text"
                            value={writerProfile.representation[key][field]}
                            onChange={(e) => setWriterProfile({
                              ...writerProfile,
                              representation: {
                                ...writerProfile.representation,
                                [key]: { ...writerProfile.representation[key], [field]: e.target.value }
                              }
                            })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                            placeholder={placeholders[field] || "Enter details"}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Privacy */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please note that unless you choose otherwise in your privacy settings, your demographic information will be searchable on the website.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                  writerProfile.demographicPrivacy === "searchable"
                    ? "border-[#0f2544] bg-[#0f2544]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="demographicPrivacy"
                    value="searchable"
                    checked={writerProfile.demographicPrivacy === "searchable"}
                    onChange={() => setWriterProfile({...writerProfile, demographicPrivacy: "searchable"})}
                    className="mt-0.5 accent-[#0f2544]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Use in search filtering</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                  writerProfile.demographicPrivacy === "private"
                    ? "border-[#0f2544] bg-[#0f2544]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="demographicPrivacy"
                    value="private"
                    checked={writerProfile.demographicPrivacy === "private"}
                    onChange={() => setWriterProfile({...writerProfile, demographicPrivacy: "private"})}
                    className="mt-0.5 accent-[#0f2544]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Keep private</p>
                  </div>
                </label>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            {membershipUploadNotice && (
              <div className="bg-amber-50 text-amber-700 p-4 rounded-lg">
                {membershipUploadNotice}
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2.5 border border-slate-300 bg-white !text-black rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-400 hover:!text-black transition flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <ArrowLeft size={20} className="!text-black" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading || usernameStatus.state === "checking"}
                className="flex-1 bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Saving..." : "Continue"}
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        );
      
      case 3:
        return (
          <form onSubmit={handleTagsSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Select Your Genres & Tags</h2>
              <p className="text-gray-600 mt-2">Help us match you with the right opportunities</p>
            </div>

            {/* Genre Selection - Card Grid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Primary Genres (Select all that apply)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all border-2 ${
                      selectedGenres.includes(genre)
                        ? 'bg-[#0f2544] text-white !text-white border-[#0f2544]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Nuanced Tags - Selectable Chips */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialized Tags (Select up to 5)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Choose themes, tones, or settings you specialize in
              </p>
              
              {/* Error Message */}
              <AnimatePresence>
                {showTagError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 mb-3 text-red-600 text-sm bg-red-50 p-3 rounded-lg"
                  >
                    <AlertCircle size={16} />
                    <span>Please choose your top 5 only.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selectable Tag Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {allNuancedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleNuancedTag(tag)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      nuancedTags.includes(tag)
                        ? 'bg-[#0f2544] text-white !text-white border-[#0f2544]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-3 flex items-center justify-between">
                <span>{nuancedTags.length}/5 tags selected</span>
                {nuancedTags.length > 0 && (
                  <span className="font-medium text-[#0f2544]">
                    Selected: {nuancedTags.join(', ')}
                  </span>
                )}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 border border-slate-300 bg-white !text-black rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-400 hover:!text-black transition flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <ArrowLeft size={20} className="!text-black" />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm flex items-center justify-center gap-2"
              >
                {membershipUploadsInProgress ? "Continue (Uploading proof...)" : "Continue"}
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        );

      case 4:
        return (
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Final Review</h2>
              <p className="text-gray-600 mt-2">Hosting is free. Review and accept terms to complete setup.</p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Hosting Plan</h3>
                <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
                  Free
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Your script hosting is free with no subscription required.</p>
            </div>

            {/* Legal Agreement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Legal Agreements
              </label>
              
              <div className="border-2 border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-gray-50">
                <p className="leading-relaxed mb-4">
                  Please review our Terms and Conditions and Privacy Policy before completing your registration. This applies to your content and data.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <Link
                    to={WRITER_TERMS_ROUTE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0f2544] text-white hover:bg-[#1a365d] transition font-semibold flex-1"
                  >
                    Open Terms & Conditions
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to={REGISTRATION_PRIVACY_ROUTE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0f2544] text-white hover:bg-[#1a365d] transition font-semibold flex-1"
                  >
                    Open Privacy Policy
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="space-y-3 mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="agreement"
                      checked={agreementAccepted}
                      onChange={(e) => setAgreementAccepted(e.target.checked)}
                      className="w-5 h-5 border-gray-300 rounded focus:ring-[#1e3a5f] mt-0.5"
                      style={{ accentColor: '#1e3a5f' }}
                    />
                    <label
                      htmlFor="agreement"
                      className="ml-3 text-sm font-medium text-gray-900"
                    >
                      I have read and agree to the Writer Onboard Terms and Conditions
                    </label>
                  </div>
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="privacy-policy"
                      checked={privacyPolicyAccepted}
                      onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)}
                      className="w-5 h-5 border-gray-300 rounded focus:ring-[#1e3a5f] mt-0.5"
                      style={{ accentColor: '#1e3a5f' }}
                    />
                    <label
                      htmlFor="privacy-policy"
                      className="ml-3 text-sm font-medium text-gray-900"
                    >
                      I have read and agree to the Registration Privacy Policy
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row justify-between text-xs text-gray-400">
                  <span>Terms version: {WRITER_TERMS_VERSION}</span>
                  <span>Privacy policy version: {PRIVACY_POLICY_VERSION}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            {membershipUploadNotice && (
              <div className="bg-amber-50 text-amber-700 p-4 rounded-lg">
                {membershipUploadNotice}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 border border-slate-300 bg-white !text-black rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-400 hover:!text-black transition flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <ArrowLeft size={20} className="!text-black" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !agreementAccepted || !privacyPolicyAccepted}
                className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-lg font-semibold hover:bg-[#162d4a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : "Complete Setup"}
                <CheckCircle size={20} />
              </button>
            </div>
          </form>
        );

      
      default:
        return null;
    }
  };

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
    <div className="writer-onboarding-page min-h-screen !bg-[#080e18] pt-2 pb-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-3">
          <div className="flex items-center justify-center mb-1">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-[#0d1520] border border-[#1a2433] rounded-xl flex items-center justify-center shadow-lg shadow-black/25">
              <FileText className="text-white" size={32} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-sm sm:text-base text-white font-medium">Writer Onboarding</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-4 gap-2 sm:hidden">
            {steps.map((step) => {
              const isActive = currentStep === step.num;
              const isComplete = currentStep > step.num;

              return (
                <div key={step.num} className="flex flex-col items-center gap-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition text-[11px] font-semibold ${
                    isComplete
                      ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                      : isActive
                        ? 'bg-[#0f2544] border-[#0f2544] text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isComplete ? '✓' : step.num}
                  </div>
                  <span className={`text-[11px] font-semibold ${
                    isComplete || isActive ? 'text-white' : 'text-slate-300'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = currentStep === step.num;
              const isComplete = currentStep > step.num;
              
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition text-xs font-semibold ${
                    isComplete 
                      ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white' 
                      : isActive 
                        ? 'bg-[#0f2544] border-[#0f2544] text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isComplete ? '✓' : step.num}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className={`text-xs font-semibold ${
                      isComplete || isActive ? 'text-white' : 'text-slate-300'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 md:mx-4 ${
                      isComplete ? 'bg-[#1e3a5f]' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Form Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100"
        >
          {renderStep()}
        </motion.div>
      </div>
    </div>
  );
};

export default WriterOnboarding;
