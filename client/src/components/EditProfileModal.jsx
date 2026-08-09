import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AlertCircle, Building2, Linkedin, IndianRupee, Film, TrendingUp, User, CreditCard, Briefcase, Globe, Target, Heart, BadgeCheck, Sparkles, Clapperboard, Link as LinkIcon } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";

const GENRE_OPTIONS = [
  "Action", "Comedy", "Drama", "Horror", "Thriller",
  "Romance", "Sci-Fi", "Fantasy", "Mystery", "Adventure",
  "Crime", "Western", "Animation", "Documentary", "Historical",
  "War", "Musical", "Biographical", "Sports", "Political",
  "Legal", "Medical", "Supernatural", "Psychological", "Noir",
  "Family", "Teen", "Satire", "Dark Comedy", "Mockumentary"
];

const NUANCED_TAGS = [
  "Revenge", "Redemption", "Coming of Age", "Love Triangle", "Betrayal",
  "Family Drama", "Social Justice", "Identity Crisis", "Survival",
  "Power Struggle", "Forbidden Love", "Loss & Grief", "Ambition",
  "Good vs Evil", "Man vs Nature", "Isolation", "Corruption",
  "Second Chance", "Underdog Story", "Fish Out of Water", "Chosen One",
  "Quest", "Transformation", "Sacrifice", "Justice", "Freedom",
  "Urban", "Rural", "Suburban", "Space", "Historical", "Contemporary",
  "Post-Apocalyptic", "Dystopian", "Small Town", "Big City",
  "Wilderness", "Ocean/Sea", "Desert", "Jungle", "Medieval",
  "Future", "Alternate Reality", "Virtual Reality", "Underground",
  "Prison", "Hospital", "School/College", "Military Base",
  "Dark", "Satirical", "Gritty", "Lighthearted", "Noir",
  "Uplifting", "Tragic", "Suspenseful", "Whimsical", "Intense",
  "Edgy", "Heartwarming", "Cynical", "Hopeful", "Melancholic",
  "Surreal", "Cerebral", "Raw", "Poetic", "Epic"
];

const INVESTOR_GENRE_OPTIONS = [
  "Action", "Comedy", "Drama", "Horror", "Thriller",
  "Romance", "Sci-Fi", "Fantasy", "Mystery", "Documentary",
  "Crime", "Animation", "Historical", "Biographical", "Sports",
  "Family", "Musical", "War", "Western", "Adventure"
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

const ACCOUNT_NUMBER_REGEX = /^\d{8,20}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GENERIC_ROUTING_REGEX = /^[A-Z0-9-]{4,20}$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const INDIA_COUNTRY_NAME = "India";
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

const EditProfileModal = ({ profile, onClose, onUpdate }) => {
  const { isDarkMode: dark } = useDarkMode();
  const isWriter = profile.role === "creator" || profile.role === "writer";
  const isInvestor = profile.role === "investor";
  const wp = profile.writerProfile || {};
  const ip = profile.industryProfile || {};
  const mandates = ip.mandates || {};

  const [formData, setFormData] = useState({
    name: profile.name || "",
    phone: profile.phone || "",
    dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split("T")[0] : "",
    addressStreet: profile.address?.street || "",
    addressCity: profile.address?.city || "",
    addressState: profile.address?.state || "",
    addressZipCode: profile.address?.zipCode || "",
    addressCountry: profile.address?.country || INDIA_COUNTRY_NAME,
    addressFormatted: profile.address?.formatted || "",
    bio: profile.bio || "",
    skills: profile.skills?.join(", ") || "",
    profileImage: profile.profileImage || "",
  });
  const initialUsername = String(wp.username || "").trim().toLowerCase();
  const [username, setUsername] = useState(initialUsername);
  const [usernameError, setUsernameError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState({
    state: initialUsername ? "current" : "idle",
    message: initialUsername
      ? "This is your current username."
      : "Use 3-30 characters: a-z, 0-9, or _.",
  });

  // Investor-specific state
  const [investorData, setInvestorData] = useState({
    subRole: ip.subRole || "producer",
    subRoleOther: ip.subRoleOther || "",
    jobTitle: ip.jobTitle || "",
    company: ip.company || "",
    imdbUrl: ip.imdbUrl || "",
    linkedInUrl: ip.linkedInUrl || "",
    otherUrl: ip.otherUrl || "",
    previousCredits: ip.previousCredits || "",
    investmentRange: ip.investmentRange || "",
  });
  const [investorGenres, setInvestorGenres] = useState(mandates.genres || profile.preferences?.genres || []);
  const [investorFormats, setInvestorFormats] = useState(() => {
    const raw = Array.isArray(mandates.formats) ? mandates.formats : [];
    return [...new Set(raw.map(normalizePreferredFormat).filter(Boolean))];
  });

  // Writer-specific state
  const [representationStatus, setRepresentationStatus] = useState(wp.representationStatus || "unrepresented");
  const [agencyName, setAgencyName] = useState(wp.agencyName || "");
  const initialMembershipVerification = {
    wga: {
      ...EMPTY_MEMBERSHIP_REVIEW,
      ...(wp.membershipVerification?.wga || {}),
      requested: Boolean(wp.membershipVerification?.wga?.requested ?? wp.wgaMember ?? false),
    },
    swa: {
      ...EMPTY_MEMBERSHIP_REVIEW,
      ...(wp.membershipVerification?.swa || {}),
      requested: Boolean(wp.membershipVerification?.swa?.requested ?? wp.sgaMember ?? false),
    },
  };
  const [membershipVerification, setMembershipVerification] = useState(initialMembershipVerification);
  const [membershipProofFiles, setMembershipProofFiles] = useState({ wga: null, swa: null });
  const [wgaMember, setWgaMember] = useState(initialMembershipVerification.wga.requested);
  const [sgaMember, setSgaMember] = useState(initialMembershipVerification.swa.requested);
  const [selectedGenres, setSelectedGenres] = useState(wp.genres || []);
  const [specializedTags, setSpecializedTags] = useState(wp.specializedTags || []);
  const [diversity, setDiversity] = useState({
    gender: wp.diversity?.gender || "",
    ethnicity: wp.diversity?.ethnicity || "",
  });
  const [showTagError, setShowTagError] = useState(false);
  const maskedAccountNumber =
    typeof profile.bankDetails?.accountNumber === "string" &&
      profile.bankDetails.accountNumber.startsWith("****")
      ? profile.bankDetails.accountNumber
      : "";
  const initialBankSnapshot = {
    accountHolderName: (profile.bankDetails?.accountHolderName || "").trim(),
    bankName: (profile.bankDetails?.bankName || "").trim(),
    routingNumber: (profile.bankDetails?.routingNumber || "").replace(/\s+/g, "").toUpperCase(),
    accountType: profile.bankDetails?.accountType || "checking",
    swiftCode: (profile.bankDetails?.swiftCode || "").trim().toUpperCase(),
    iban: (profile.bankDetails?.iban || "").trim().toUpperCase(),
    country: (profile.bankDetails?.country || "IN").trim().toUpperCase(),
    currency: (profile.bankDetails?.currency || "INR").trim().toUpperCase(),
  };

  // Bank details state
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: profile.bankDetails?.accountHolderName || "",
    bankName: profile.bankDetails?.bankName || "",
    accountNumber: "",
    routingNumber: profile.bankDetails?.routingNumber || "",
    accountType: profile.bankDetails?.accountType || "checking",
    swiftCode: profile.bankDetails?.swiftCode || "",
    iban: profile.bankDetails?.iban || "",
    country: profile.bankDetails?.country || "IN",
    currency: profile.bankDetails?.currency || "INR"
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(profile.profileImage || "");
  const fileInputRef = useRef(null);
  const usernameCheckRequestRef = useRef(0);

  // Active section for mobile-friendly navigation
  const [activeSection, setActiveSection] = useState("basic");
  const shouldShowAgencyName = representationStatus !== "unrepresented";

  const sections = isWriter
    ? [
      { key: "basic", label: "Basic", icon: <User size={13} /> },
      { key: "writer", label: "Writer", icon: <Briefcase size={13} /> },
      { key: "genres", label: "Genres", icon: <Film size={13} /> },
      { key: "tags", label: "Tags", icon: <Target size={13} /> },
      { key: "diversity", label: "Diversity", icon: <Heart size={13} /> },
      { key: "bank", label: "Banking", icon: <CreditCard size={13} /> },
    ]
    : isInvestor
      ? [
        { key: "basic", label: "Basic", icon: <User size={13} /> },
        { key: "investor", label: "Professional", icon: <BadgeCheck size={13} /> },
        { key: "preferences", label: "Preferences", icon: <Film size={13} /> },
        { key: "bank", label: "Banking", icon: <CreditCard size={13} /> },
      ]
      : [
        { key: "basic", label: "Basic", icon: <User size={13} /> },
        { key: "bank", label: "Banking", icon: <CreditCard size={13} /> },
      ];

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleTag = (tag) => {
    if (specializedTags.includes(tag)) {
      setSpecializedTags(specializedTags.filter((t) => t !== tag));
    } else {
      if (specializedTags.length >= 5) {
        setShowTagError(true);
        setTimeout(() => setShowTagError(false), 2000);
        return;
      }
      setSpecializedTags([...specializedTags, tag]);
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

  const handleMembershipToggle = (type, checked) => {
    const key = type === "wga" ? "wga" : "swa";

    if (key === "wga") {
      setWgaMember(checked);
    } else {
      setSgaMember(checked);
    }

    setMembershipVerification((prev) => {
      const current = prev[key] || EMPTY_MEMBERSHIP_REVIEW;
      return {
        ...prev,
        [key]: checked
          ? { ...current, requested: true }
          : { ...EMPTY_MEMBERSHIP_REVIEW, requested: false },
      };
    });

    if (!checked) {
      setMembershipProofFiles((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handleOpenMembershipProof = async (event, membershipType, fallbackUrl) => {
    event.preventDefault();
    const normalizedType = String(membershipType || "").toLowerCase();
    if (!["wga", "swa"].includes(normalizedType)) return;

    try {
      const { data } = await api.get("/onboarding/writer-membership-proof/access-url", {
        params: { membershipType: normalizedType },
      });
      const accessUrl = data?.url || fallbackUrl;
      if (accessUrl) {
        window.open(accessUrl, "_blank", "noopener,noreferrer");
      } else {
        setError("Proof link unavailable");
      }
    } catch (err) {
      console.error(err);
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        return;
      }
      setError(err?.response?.data?.message || "Failed to open proof");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, WebP and GIF images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("profileImage", file);
      const { data } = await api.post("/users/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData({ ...formData, profileImage: data.profileImage });
      setImagePreview(`${(import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "")}${data.profileImage}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload image");
      setImagePreview(profile.profileImage || "");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, profileImage: "" });
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUsernameError("");
    setLoading(true);

    try {
      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      if (isWriter && specializedTags.length > 5) {
        setError("Please keep specialized tags to 5 or fewer.");
        setLoading(false);
        return;
      }

      if (isWriter) {
        const wgaStatus = membershipVerification?.wga?.status || "not_submitted";
        const swaStatus = membershipVerification?.swa?.status || "not_submitted";

        const needsWgaProof = Boolean(
          wgaMember &&
          wgaStatus !== "approved" &&
          !membershipProofFiles.wga &&
          !membershipVerification?.wga?.proofUrl
        );

        const needsSwaProof = Boolean(
          sgaMember &&
          swaStatus !== "approved" &&
          !membershipProofFiles.swa &&
          !membershipVerification?.swa?.proofUrl
        );

        if (needsWgaProof || needsSwaProof) {
          setError("Please upload proof for each selected WGA/SWA membership.");
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        skills: skillsArray,
      };

      const normalizedUsername = String(username || "").trim().toLowerCase();
      if (!normalizedUsername && initialUsername) {
        setUsernameError("Username cannot be empty");
        setLoading(false);
        return;
      }

      if (normalizedUsername && !USERNAME_PATTERN.test(normalizedUsername)) {
        setUsernameError("Use 3-30 lowercase letters, numbers, or underscores");
        setLoading(false);
        return;
      }

      if (normalizedUsername !== initialUsername) {
        if (usernameStatus.state === "checking") {
          setUsernameError("Please wait while we verify username availability");
          setLoading(false);
          return;
        }

        if (usernameStatus.state === "unavailable") {
          setUsernameError("Username is already taken");
          setLoading(false);
          return;
        }

        if (usernameStatus.state === "error") {
          setUsernameError("Could not verify username right now. Please try again.");
          setLoading(false);
          return;
        }
      }

      if (normalizedUsername) {
        payload.username = normalizedUsername;
      }

      const addressStreet = formData.addressStreet.trim();
      const addressCity = formData.addressCity.trim();
      const addressState = formData.addressState.trim();
      const addressZipCode = formData.addressZipCode.trim();
      const addressCountry = formData.addressCountry.trim() || INDIA_COUNTRY_NAME;
      const computedAddressParts = [addressStreet, addressCity, addressState, addressZipCode].filter(Boolean);
      if (addressCountry && addressCountry.toLowerCase() !== "india") {
        computedAddressParts.push(addressCountry);
      }
      const computedAddress = computedAddressParts.join(", ");

      payload.phone = formData.phone.trim();
      payload.dateOfBirth = formData.dateOfBirth ? formData.dateOfBirth : undefined;
      payload.address = {
        street: addressStreet,
        city: addressCity,
        state: addressState,
        zipCode: addressZipCode,
        country: addressCountry,
        formatted: formData.addressFormatted.trim() || computedAddress,
      };

      if (isWriter) {
        payload.writerProfile = {
          representationStatus,
          agencyName: shouldShowAgencyName ? agencyName.trim() : "",
          wgaMember,
          sgaMember,
          genres: selectedGenres,
          specializedTags,
          diversity,
        };
      }

      if (isInvestor) {
        payload.subRole = investorData.subRole;
        payload.subRoleOther = investorData.subRole === "other" ? investorData.subRoleOther : "";
        payload.jobTitle = investorData.jobTitle;
        payload.company = investorData.company;
        payload.imdbUrl = investorData.imdbUrl;
        payload.linkedInUrl = investorData.linkedInUrl;
        payload.otherUrl = investorData.otherUrl;
        payload.previousCredits = investorData.previousCredits;
        payload.investmentRange = investorData.investmentRange;
        payload.preferredGenres = investorGenres;
        payload.preferredFormats = investorFormats;
      }

      const normalizedBankDetails = {
        accountHolderName: bankDetails.accountHolderName.trim(),
        bankName: bankDetails.bankName.trim(),
        accountNumber: bankDetails.accountNumber.replace(/\s+/g, ""),
        routingNumber: bankDetails.routingNumber.replace(/\s+/g, "").toUpperCase(),
        accountType: bankDetails.accountType || "checking",
        swiftCode: bankDetails.swiftCode.trim().toUpperCase(),
        iban: bankDetails.iban.trim().toUpperCase(),
        country: (bankDetails.country || "IN").trim().toUpperCase(),
        currency: (bankDetails.currency || "INR").trim().toUpperCase(),
      };

      const hasBankChanges =
        normalizedBankDetails.accountHolderName !== initialBankSnapshot.accountHolderName ||
        normalizedBankDetails.bankName !== initialBankSnapshot.bankName ||
        normalizedBankDetails.routingNumber !== initialBankSnapshot.routingNumber ||
        normalizedBankDetails.accountType !== initialBankSnapshot.accountType ||
        normalizedBankDetails.swiftCode !== initialBankSnapshot.swiftCode ||
        normalizedBankDetails.iban !== initialBankSnapshot.iban ||
        normalizedBankDetails.country !== initialBankSnapshot.country ||
        normalizedBankDetails.currency !== initialBankSnapshot.currency ||
        Boolean(normalizedBankDetails.accountNumber);

      if (hasBankChanges) {
        if (!normalizedBankDetails.accountHolderName || !normalizedBankDetails.bankName) {
          setError("Account holder name and bank name are required for bank details.");
          setLoading(false);
          return;
        }

        if (!normalizedBankDetails.accountNumber && !maskedAccountNumber) {
          setError("Account number is required for bank details.");
          setLoading(false);
          return;
        }

        if (normalizedBankDetails.accountNumber && !ACCOUNT_NUMBER_REGEX.test(normalizedBankDetails.accountNumber)) {
          setError("Account number must be 8-20 digits.");
          setLoading(false);
          return;
        }

        if (!normalizedBankDetails.routingNumber) {
          setError("Routing / IFSC number is required for bank details.");
          setLoading(false);
          return;
        }

        if (normalizedBankDetails.country === "IN") {
          if (!IFSC_REGEX.test(normalizedBankDetails.routingNumber)) {
            setError("Please enter a valid IFSC code (example: HDFC0001234).");
            setLoading(false);
            return;
          }
        } else if (!GENERIC_ROUTING_REGEX.test(normalizedBankDetails.routingNumber)) {
          setError("Routing number must be 4-20 letters, numbers, or hyphen.");
          setLoading(false);
          return;
        }

        // Keep existing account number if the user did not provide a new one.
        if (!normalizedBankDetails.accountNumber && maskedAccountNumber) {
          delete normalizedBankDetails.accountNumber;
        }

        payload.bankDetails = normalizedBankDetails;
      }

      const { data } = await api.put("/users/update", payload);
      let latestData = data;

      const uploadMembershipProof = async (membershipType, file) => {
        const formData = new FormData();
        formData.append("membershipType", membershipType);
        formData.append("proof", file);
        const proofResponse = await api.post("/onboarding/writer-membership-proof", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (proofResponse?.data?.user?.writerProfile) {
          latestData = {
            ...latestData,
            writerProfile: proofResponse.data.user.writerProfile,
          };
          setMembershipVerification((prev) => ({
            ...prev,
            wga: {
              ...EMPTY_MEMBERSHIP_REVIEW,
              ...(proofResponse.data.user.writerProfile?.membershipVerification?.wga || prev.wga),
            },
            swa: {
              ...EMPTY_MEMBERSHIP_REVIEW,
              ...(proofResponse.data.user.writerProfile?.membershipVerification?.swa || prev.swa),
            },
          }));
        }
      };

      if (isWriter && wgaMember && membershipProofFiles.wga) {
        await uploadMembershipProof("wga", membershipProofFiles.wga);
      }

      if (isWriter && sgaMember && membershipProofFiles.swa) {
        await uploadMembershipProof("swa", membershipProofFiles.swa);
      }

      setMembershipProofFiles({ wga: null, swa: null });
      onUpdate(latestData);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const displayImage = imagePreview
    ? imagePreview.startsWith("data:") || imagePreview.startsWith("http")
      ? imagePreview
      : `${(import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "")}${imagePreview}`
    : "";

  const inputClass = dark
    ? "w-full px-3.5 py-2.5 bg-[#242424] border border-[#444] rounded-lg text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 focus:bg-[#101e30] transition-colors"
    : "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors";
  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`;
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const normalizedPreviewUsername = String(username || "").trim().toLowerCase();
  const usernamePreviewUrl = normalizedPreviewUsername
    ? `${browserOrigin}/share/profile/${encodeURIComponent(normalizedPreviewUsername)}`
    : "";

  useEffect(() => {
    const normalizedUsername = String(username || "").trim().toLowerCase();

    if (!normalizedUsername) {
      setUsernameStatus({
        state: "idle",
        message: "Use 3-30 characters: a-z, 0-9, or _.",
      });
      return;
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setUsernameStatus({
        state: "invalid",
        message: "Use 3-30 lowercase letters, numbers, or underscores.",
      });
      return;
    }

    if (normalizedUsername === initialUsername) {
      setUsernameStatus({
        state: "current",
        message: "This is your current username.",
      });
      return;
    }

    const requestId = Date.now();
    usernameCheckRequestRef.current = requestId;
    setUsernameStatus({
      state: "checking",
      message: "Checking username availability...",
    });

    let isActive = true;
    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await api.get("/onboarding/check-username", {
          params: { username: normalizedUsername },
        });

        if (!isActive || usernameCheckRequestRef.current !== requestId) return;

        if (data?.available) {
          setUsernameStatus({
            state: "available",
            message: "Username is available.",
          });
        } else {
          setUsernameStatus({
            state: "unavailable",
            message: "Username is already taken.",
          });
        }
      } catch {
        if (!isActive || usernameCheckRequestRef.current !== requestId) return;
        setUsernameStatus({
          state: "error",
          message: "Could not verify username right now.",
        });
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [username, initialUsername]);

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[1200] p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={`rounded-xl border w-full overflow-hidden flex flex-col my-2 ${dark ? 'bg-[#101e30] border-[#444]' : 'bg-white border-gray-200/80'}`}
        style={{ maxWidth: isInvestor ? "580px" : "520px", maxHeight: "calc(100dvh - 16px)" }}
      >
        {/* Header */}
        <div className={`sticky top-0 z-20 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b ${dark ? 'bg-[#101e30] border-[#333]' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-base font-bold ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Edit Profile</h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-colors ${dark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            aria-label="Close edit profile"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section Tabs */}
        {sections.length > 1 && (
          <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 pb-2 overflow-x-auto">
            {sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSection(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeSection === s.key
                  ? "bg-[#0f2544] text-white !text-white shadow-lg shadow-[#0f2544]/20"
                    : dark ? "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-5 mt-3 px-3 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto min-h-0" style={{ maxHeight: "calc(100dvh - 150px)" }}>
          {/* === BASIC SECTION === */}
          {activeSection === "basic" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Profile Image Upload */}
              <div>
                <label className={labelClass}>Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt="Profile"
                        className="w-[72px] h-[72px] rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-full bg-[#1e3a5f]/10 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <span className={`text-2xl font-bold ${dark ? 'text-white/80' : 'text-[#1e3a5f]'}`}>
                          {formData.name ? formData.name.charAt(0).toUpperCase() : "?"}
                        </span>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3.5 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-semibold hover:bg-[#162d4a] transition-colors disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </button>
                    {displayImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${dark ? 'bg-[#242424] text-gray-400 border-[#444] hover:text-red-400 hover:border-red-500/40' : 'bg-white text-gray-500 border-gray-200 hover:text-red-500 hover:border-red-200'}`}
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400">JPG, PNG, WebP or GIF. Max 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Username</label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold ${dark ? "text-gray-500" : "text-gray-400"}`}>@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const nextValue = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      setUsername(nextValue);
                      if (usernameError) setUsernameError("");
                    }}
                    className={`${inputClass} pl-8 ${usernameError ? "border-red-400 focus:border-red-400" : ""}`}
                    placeholder="your_username"
                    maxLength={30}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                {usernameError ? (
                  <p className="text-[11px] text-red-500 mt-1.5">{usernameError}</p>
                ) : (
                  <>
                    <p className={`text-[11px] mt-1.5 ${
                      usernameStatus.state === "available" || usernameStatus.state === "current"
                        ? "text-emerald-500"
                        : usernameStatus.state === "unavailable" || usernameStatus.state === "invalid" || usernameStatus.state === "error"
                          ? "text-red-500"
                          : "text-gray-500"
                    }`}>
                      {usernameStatus.message}
                    </p>
                    {usernamePreviewUrl && (
                      <p className="text-[11px] text-gray-500 mt-1">Share link: {usernamePreviewUrl}</p>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    placeholder="+91 00000 00000"
                  />
                </div>

                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Street Address</label>
                <input
                  type="text"
                  value={formData.addressStreet}
                  onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                  className={inputClass}
                  placeholder="House/Flat, Street, Area"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={formData.addressCity}
                    onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>State</label>
                  <input
                    type="text"
                    value={formData.addressState}
                    onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>ZIP Code</label>
                  <input
                    type="text"
                    value={formData.addressZipCode}
                    onChange={(e) => setFormData({ ...formData, addressZipCode: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    type="text"
                    value={formData.addressCountry}
                    onChange={(e) => setFormData({ ...formData, addressCountry: e.target.value })}
                    className={inputClass}
                    placeholder="India"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows="3"
                  maxLength={500}
                  placeholder="Tell us about yourself..."
                />
                <p className="text-[10px] text-gray-400 mt-1">{formData.bio.length}/500</p>
              </div>

              <div>
                <label className={labelClass}>Skills</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className={inputClass}
                  placeholder="Writing, Directing, Acting"
                />
                <p className="text-[11px] text-gray-400 mt-1">Separate skills with commas</p>
              </div>
            </motion.div>
          )}

          {/* === WRITER DETAILS SECTION === */}
          {activeSection === "writer" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Writer Details</h3>
                <p className={`text-xs mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Professional information visible to industry contacts</p>
              </div>

              <div>
                <label className={labelClass}>Representation Status</label>
                <select
                  value={representationStatus}
                  onChange={(e) => setRepresentationStatus(e.target.value)}
                  className={inputClass}
                >
                  <option value="unrepresented">Unrepresented</option>
                  <option value="manager">Manager</option>
                  <option value="agent">Agent</option>
                  <option value="manager_and_agent">Manager & Agent</option>
                </select>
              </div>

              {shouldShowAgencyName && (
                <div>
                <label className={labelClass}>Agency Name</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g., CAA, WME, UTA"
                  />
                </div>
              )}

              <div className={`p-3 rounded-lg border ${dark ? 'bg-white/[0.03] border-[#444]' : 'bg-gray-50 border-gray-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="wgaMemberEdit"
                    checked={wgaMember}
                    onChange={(e) => handleMembershipToggle("wga", e.target.checked)}
                    className="w-5 h-5 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d]"
                  />
                  <span className={`text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    I am a WGA member
                  </span>
                </label>
                <div className="mt-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getMembershipStatusMeta(membershipVerification?.wga?.status).className}`}>
                    {getMembershipStatusMeta(membershipVerification?.wga?.status).label}
                  </span>
                </div>
                {wgaMember && membershipVerification?.wga?.status !== "approved" && (
                  <div className="mt-2 space-y-2">
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Upload WGA proof (PDF, JPG, PNG, WebP)</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setMembershipProofFiles((prev) => ({ ...prev, wga: file }));
                      }}
                      className="block w-full text-xs"
                    />
                    {membershipProofFiles.wga && (
                      <p className="text-xs text-emerald-500 font-semibold">Selected: {membershipProofFiles.wga.name}</p>
                    )}
                    {!membershipProofFiles.wga && membershipVerification?.wga?.proofUrl && (
                      <a
                        href={membershipVerification.wga.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => handleOpenMembershipProof(event, "wga", membershipVerification.wga.proofUrl)}
                        className="text-xs font-semibold text-blue-500 hover:underline"
                      >
                        View latest uploaded proof
                      </a>
                    )}
                    {membershipVerification?.wga?.status === "rejected" && membershipVerification?.wga?.adminNote && (
                      <p className="text-xs text-red-500">Admin note: {membershipVerification.wga.adminNote}</p>
                    )}
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-lg border ${dark ? 'bg-white/[0.03] border-[#444]' : 'bg-gray-50 border-gray-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="sgaMemberEdit"
                    checked={sgaMember}
                    onChange={(e) => handleMembershipToggle("swa", e.target.checked)}
                    className="w-5 h-5 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d]"
                  />
                  <span className={`text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    I am a SWA member
                  </span>
                </label>
                <div className="mt-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getMembershipStatusMeta(membershipVerification?.swa?.status).className}`}>
                    {getMembershipStatusMeta(membershipVerification?.swa?.status).label}
                  </span>
                </div>
                {sgaMember && membershipVerification?.swa?.status !== "approved" && (
                  <div className="mt-2 space-y-2">
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Upload SWA proof (PDF, JPG, PNG, WebP)</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setMembershipProofFiles((prev) => ({ ...prev, swa: file }));
                      }}
                      className="block w-full text-xs"
                    />
                    {membershipProofFiles.swa && (
                      <p className="text-xs text-emerald-500 font-semibold">Selected: {membershipProofFiles.swa.name}</p>
                    )}
                    {!membershipProofFiles.swa && membershipVerification?.swa?.proofUrl && (
                      <a
                        href={membershipVerification.swa.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => handleOpenMembershipProof(event, "swa", membershipVerification.swa.proofUrl)}
                        className="text-xs font-semibold text-blue-500 hover:underline"
                      >
                        View latest uploaded proof
                      </a>
                    )}
                    {membershipVerification?.swa?.status === "rejected" && membershipVerification?.swa?.adminNote && (
                      <p className="text-xs text-red-500">Admin note: {membershipVerification.swa.adminNote}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* === GENRES SECTION === */}
          {activeSection === "genres" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Primary Genres</h3>
                <p className={`text-xs mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Select all genres that apply to your work</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-2.5 rounded-lg font-medium text-xs transition-all border-2 ${selectedGenres.includes(genre)
                      ? "bg-[#0f2544] text-white !text-white border-[#0f2544]"
                        : dark ? "bg-[#242424] text-gray-300 border-[#444] hover:border-blue-500" : "bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]"
                      }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              {selectedGenres.length > 0 && (
                <p className="text-xs text-gray-500">
                  <span className={`font-semibold ${dark ? 'text-white/80' : 'text-[#0f2544]'}`}>{selectedGenres.length}</span> genre{selectedGenres.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </motion.div>
          )}

          {/* === SPECIALIZED TAGS SECTION === */}
          {activeSection === "tags" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Specialized Tags</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Choose themes, tones, or settings you specialize in (max 5)
                </p>
              </div>

              <AnimatePresence>
                {showTagError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-lg"
                  >
                    <AlertCircle size={14} />
                    <span>Please choose your top 5 only.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg ${dark ? 'border-[#444] bg-[#242424]' : 'border-gray-200 bg-gray-50'}`}>
                {NUANCED_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${specializedTags.includes(tag)
                      ? "bg-[#0f2544] text-white !text-white border-[#0f2544]"
                        : dark ? "bg-[#101e30] text-gray-300 border-[#444] hover:border-blue-500" : "bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 flex items-center justify-between">
                <span>{specializedTags.length}/5 tags selected</span>
                {specializedTags.length > 0 && (
                  <span className={`font-medium ${dark ? 'text-white/80' : 'text-[#0f2544]'}`}>{specializedTags.join(", ")}</span>
                )}
              </p>
            </motion.div>
          )}

          {/* === DIVERSITY SECTION === */}
          {activeSection === "diversity" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Diversity Information</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Optional — helps producers find underrepresented voices
                </p>
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <input
                  type="text"
                  value={diversity.gender}
                  onChange={(e) => setDiversity({ ...diversity, gender: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className={labelClass}>Ethnicity</label>
                <input
                  type="text"
                  value={diversity.ethnicity}
                  onChange={(e) => setDiversity({ ...diversity, ethnicity: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </motion.div>
          )}

          {/* === INVESTOR DETAILS SECTION === */}
          {activeSection === "investor" && isInvestor && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Investor Professional Profile</h3>
                <p className={`text-xs mb-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>These details help writers and readers understand your domain, credibility, and investment fit.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5"><Briefcase size={12} /> Investor Role</span>
                  </label>
                  <select
                    value={investorData.subRole}
                    onChange={(e) => {
                      const nextSubRole = e.target.value;
                      setInvestorData((prev) => ({
                        ...prev,
                        subRole: nextSubRole,
                        subRoleOther: nextSubRole === "other" ? prev.subRoleOther : "",
                      }));
                    }}
                    className={inputClass}
                  >
                    {INDUSTRY_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {investorData.subRole === "other" && (
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5"><Briefcase size={12} /> Other Role</span>
                    </label>
                    <input
                      type="text"
                      value={investorData.subRoleOther}
                      onChange={(e) => setInvestorData({ ...investorData, subRoleOther: e.target.value })}
                      className={inputClass}
                      placeholder="Please specify your role focus"
                      maxLength={80}
                    />
                  </div>
                )}

                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5"><BadgeCheck size={12} /> Job Title</span>
                  </label>
                  <input
                    type="text"
                    value={investorData.jobTitle}
                    onChange={(e) => setInvestorData({ ...investorData, jobTitle: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., Creative Producer"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5"><Building2 size={12} /> Company / Firm</span>
                </label>
                <input
                  type="text"
                  value={investorData.company}
                  onChange={(e) => setInvestorData({ ...investorData, company: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., Novastride Pictures, Vantara Films"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5"><Clapperboard size={12} /> Previous Credits</span>
                </label>
                <textarea
                  value={investorData.previousCredits}
                  onChange={(e) => setInvestorData({ ...investorData, previousCredits: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows="3"
                  maxLength={400}
                  placeholder="Mention films, series, campaigns, funded projects, festivals, or distribution credits"
                />
                <p className="text-[10px] text-gray-400 mt-1">{investorData.previousCredits.length}/400</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5"><LinkIcon size={12} /> IMDb URL</span>
                  </label>
                  <input
                    type="url"
                    value={investorData.imdbUrl}
                    onChange={(e) => setInvestorData({ ...investorData, imdbUrl: e.target.value })}
                    className={inputClass}
                    placeholder="https://www.imdb.com/name/..."
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5"><Linkedin size={12} /> LinkedIn URL</span>
                  </label>
                  <input
                    type="url"
                    value={investorData.linkedInUrl}
                    onChange={(e) => setInvestorData({ ...investorData, linkedInUrl: e.target.value })}
                    className={inputClass}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5"><Globe size={12} /> Other URL</span>
                  </label>
                  <input
                    type="url"
                    value={investorData.otherUrl}
                    onChange={(e) => setInvestorData({ ...investorData, otherUrl: e.target.value })}
                    className={inputClass}
                    placeholder="https://your-website.com or any relevant profile link"
                  />
                </div>
              </div>

            </motion.div>
          )}

          {/* === INVESTOR PREFERENCES SECTION === */}
          {activeSection === "preferences" && isInvestor && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className={`rounded-xl border p-3.5 ${dark ? 'bg-white/[0.03] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start gap-2.5">
                  <Sparkles size={15} className={`mt-0.5 ${dark ? 'text-blue-300' : 'text-[#1e3a5f]'}`} />
                  <p className={`text-[11px] leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Keep your mandates specific. Clear genre, format, and budget preferences improve your recommendation quality and reduce irrelevant requests.
                  </p>
                </div>
              </div>

              {/* Preferred Genres */}
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Preferred Genres</h3>
                <p className={`text-xs mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Select genres you're interested in investing in</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {INVESTOR_GENRE_OPTIONS.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setInvestorGenres((prev) => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre])}
                      className={`px-2.5 py-2 rounded-lg font-medium text-xs transition-all border ${investorGenres.includes(genre)
                        ? dark ? "bg-[#0f2544] text-white !text-white border-[#1e3a5f] shadow-md shadow-[#0f2544]/20" : "bg-[#0f2544] text-white !text-white border-[#0f2544]"
                        : dark ? "bg-white/[0.03] text-gray-400 border-[#333] hover:border-[#1e3a5f]/50" : "bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]/40"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                {investorGenres.length > 0 && (
                  <p className={`text-xs mt-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span className={`font-semibold ${dark ? 'text-white/80' : 'text-[#0f2544]'}`}>{investorGenres.length}</span> genre{investorGenres.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Content Formats */}
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Content Formats</h3>
                <p className={`text-xs mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>What types of content do you fund?</p>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => setInvestorFormats((prev) => prev.includes(fmt.value) ? prev.filter(f => f !== fmt.value) : [...prev, fmt.value])}
                      className={`px-3 py-2.5 rounded-lg font-medium text-xs transition-all border ${investorFormats.includes(fmt.value)
                        ? dark ? "bg-[#0f2544] text-white !text-white border-[#1e3a5f] shadow-md shadow-[#0f2544]/20" : "bg-[#0f2544] text-white !text-white border-[#0f2544]"
                        : dark ? "bg-white/[0.03] text-gray-400 border-[#333] hover:border-[#1e3a5f]/50" : "bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]/40"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* === BANK DETAILS SECTION === */}
          {activeSection === "bank" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className={`text-sm font-bold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Bank Account Details</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Secure payment information for receiving funds
                </p>
              </div>

              <div>
                <label className={labelClass}>Account Holder Name</label>
                <input
                  type="text"
                  value={bankDetails.accountHolderName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                  className={inputClass}
                  placeholder="Full name as it appears on your account"
                />
              </div>

              <div>
                <label className={labelClass}>Bank Name</label>
                <input
                  type="text"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., HDFC Bank, ICICI Bank, SBI"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 20) })}
                    className={inputClass}
                    placeholder={maskedAccountNumber ? `Current: ${maskedAccountNumber}` : "Account number"}
                  />
                </div>
                <div>
                  <label className={labelClass}>Routing Number</label>
                  <input
                    type="text"
                    value={bankDetails.routingNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, bankDetails.country?.toUpperCase() === "IN" ? 11 : 20) })}
                    className={inputClass}
                    placeholder={bankDetails.country?.toUpperCase() === "IN" ? "IFSC code (e.g., HDFC0001234)" : "Routing number"}
                    maxLength={bankDetails.country?.toUpperCase() === "IN" ? 11 : 20}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Account Type</label>
                  <select
                    value={bankDetails.accountType}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountType: e.target.value })}
                    className={inputClass}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    type="text"
                    value={bankDetails.country}
                    onChange={(e) => setBankDetails({ ...bankDetails, country: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) })}
                    className={inputClass}
                    placeholder="IN"
                  />
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <input
                    type="text"
                    value={bankDetails.currency}
                    onChange={(e) => setBankDetails({ ...bankDetails, currency: e.target.value })}
                    className={inputClass}
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className={`p-3 rounded-lg ${dark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                <p className={`text-xs font-semibold mb-2 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  International Transfers (Optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>SWIFT Code</label>
                    <input
                      type="text"
                      value={bankDetails.swiftCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, swiftCode: e.target.value })}
                      className={inputClass}
                      placeholder="e.g., CHASUS33"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>IBAN</label>
                    <input
                      type="text"
                      value={bankDetails.iban}
                      onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value })}
                      className={inputClass}
                      placeholder="International number"
                    />
                  </div>
                </div>
              </div>

              <div className={`flex items-start gap-2 p-3 rounded-lg ${dark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                <svg className={`w-4 h-4 mt-0.5 shrink-0 ${dark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className={`text-xs ${dark ? 'text-blue-300' : 'text-blue-700'}`}>
                  All bank details are encrypted and stored securely. This information is used only for payment processing.
                </p>
              </div>
            </motion.div>
          )}

          {/* Action Buttons - always visible */}
          <div className={`flex items-center gap-2.5 pt-3 border-t ${dark ? 'border-[#333]' : 'border-gray-100'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${dark ? 'bg-[#242424] text-gray-300 border-[#444] hover:bg-[#333]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#162d4a] transition-colors disabled:opacity-50 text-sm font-bold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
};

export default EditProfileModal;
