import User from "../models/User.js";
import Script from "../models/Script.js";
import Subscription from "../models/Subscription.js";
import Notification from "../models/Notification.js";
import multer from "multer";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { sendOTPEmail, sendWriterSignupCreditsEmail } from "../utils/emailService.js";
import { getProfileCompletion } from "../utils/profileCompletion.js";
import {
  generateOTP,
  generateOTPExpiry,
  hashOTP,
  isHashedOTP,
  isOTPExpired,
  verifyHashedOTP,
} from "../utils/otpHelper.js";

const normalizeString = (value) =>
  value === undefined || value === null ? "" : String(value).trim();
const LOCALHOST_URL_REGEX = /\bhttps?:\/\/(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?[^\s]*/gi;
const sanitizePreviousCredits = (value) =>
  normalizeString(value).replace(LOCALHOST_URL_REGEX, "").replace(/\s{2,}/g, " ").trim();

const normalizeOptionalDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const WRITER_REPRESENTATION_STATUSES = ["unrepresented", "manager", "agent", "manager_and_agent"];
const WRITER_ROLE_SET = new Set(["writer", "creator"]);
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const MEMBERSHIP_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
const MEMBERSHIP_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const WRITER_SIGNUP_BONUS_CREDITS = 180;

const buildWriterSignupCreditTransaction = (amount = WRITER_SIGNUP_BONUS_CREDITS) => ({
  type: "bonus",
  amount,
  description: "Writer signup bonus credits",
  reference: `WRITER-SIGNUP-${Date.now().toString(36).toUpperCase()}`,
  createdAt: new Date(),
});

const normalizeOtpInput = (otp) => String(otp || "").trim();
const isValidOtpInput = (otp) => /^\d{6}$/.test(otp);

const normalizeMandateFormat = (value = "") => {
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

const normalizeFormatArray = (formats = []) => {
  if (!Array.isArray(formats)) return [];
  return [...new Set(
    formats
      .map((f) => normalizeMandateFormat(f))
      .filter(Boolean)
  )];
};

// @desc    Check writer username availability
// @route   GET /api/onboarding/check-username?username=foo
// @access  Public (optionally auth-aware)
export const checkUsernameAvailability = async (req, res) => {
  try {
    const normalizedUsername = normalizeString(req.query?.username).toLowerCase();

    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters and contain only lowercase letters, numbers, or underscores",
      });
    }

    const usernameLookupQuery = {
      "writerProfile.username": normalizedUsername,
    };

    // When authenticated, ignore current user's own username to avoid false "taken".
    if (req.user?._id) {
      usernameLookupQuery._id = { $ne: req.user._id };
    }

    const existingUserWithUsername = await User.exists(usernameLookupQuery);

    return res.json({
      success: true,
      username: normalizedUsername,
      available: !existingUserWithUsername,
    });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to check username availability",
    });
  }
};

const createEmptyMembershipReview = () => ({
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
});

const ensureWriterMembershipVerification = (user) => {
  if (!user.writerProfile) user.writerProfile = {};
  if (!user.writerProfile.membershipVerification) {
    user.writerProfile.membershipVerification = {
      wga: createEmptyMembershipReview(),
      swa: createEmptyMembershipReview(),
    };
  }

  if (!user.writerProfile.membershipVerification.wga) {
    user.writerProfile.membershipVerification.wga = createEmptyMembershipReview();
  }

  if (!user.writerProfile.membershipVerification.swa) {
    user.writerProfile.membershipVerification.swa = createEmptyMembershipReview();
  }

  return user.writerProfile.membershipVerification;
};

const resetMembershipReview = (entry) => {
  entry.status = "not_submitted";
  entry.proofUrl = "";
  entry.proofPublicId = "";
  entry.proofFileName = "";
  entry.proofMimeType = "";
  entry.submittedAt = undefined;
  entry.reviewedAt = undefined;
  entry.reviewedBy = undefined;
  entry.adminNote = "";
};

const applyWriterMembershipSelection = (user, membershipType, selected) => {
  const verification = ensureWriterMembershipVerification(user);
  const key = membershipType === "wga" ? "wga" : "swa";
  const entry = verification[key];
  const memberField = key === "wga" ? "wgaMember" : "sgaMember";

  entry.requested = Boolean(selected);

  if (!selected) {
    resetMembershipReview(entry);
    user.writerProfile[memberField] = false;
    return;
  }

  if (entry.status === "approved") {
    user.writerProfile[memberField] = true;
    return;
  }

  user.writerProfile[memberField] = false;
  if (!entry.proofUrl && entry.status === "pending") {
    entry.status = "not_submitted";
  }
};

const membershipProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEMBERSHIP_UPLOAD_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (MEMBERSHIP_FILE_MIME_TYPES.has(file?.mimetype)) return cb(null, true);
    return cb(new Error("Only PDF, JPG, PNG, and WebP files are allowed"));
  },
}).single("proof");

export const uploadWriterMembershipProofFile = (req, res, next) => {
  membershipProofUpload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ success: false, message: "Proof file must be 10MB or smaller" });
      }
      return res.status(400).json({ success: false, message: err.message || "Proof upload failed" });
    }

    return res.status(400).json({ success: false, message: err.message || "Proof upload failed" });
  });
};

// @desc    Submit writer guild membership proof for admin review
// @route   POST /api/onboarding/writer-membership-proof
// @access  Private
export const submitWriterMembershipProof = async (req, res) => {
  try {
    const membershipType = normalizeString(req.body?.membershipType).toLowerCase();
    if (!["wga", "swa"].includes(membershipType)) {
      return res.status(400).json({ success: false, message: "membershipType must be 'wga' or 'swa'" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Proof file is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!WRITER_ROLE_SET.has(String(user.role || "").toLowerCase())) {
      return res.status(403).json({ success: false, message: "Only writer accounts can submit membership proofs" });
    }

    const verification = ensureWriterMembershipVerification(user);
    const entry = verification[membershipType];

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: `scriptbridge/membership-proofs/${membershipType}`,
      resource_type: "auto",
      public_id: `${membershipType}-${user._id}-${Date.now()}`,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    entry.requested = true;
    entry.status = "pending";
    entry.proofUrl = uploadResult.secure_url;
    entry.proofPublicId = uploadResult.public_id;
    entry.proofFileName = req.file.originalname;
    entry.proofMimeType = req.file.mimetype;
    entry.submittedAt = new Date();
    entry.reviewedAt = undefined;
    entry.reviewedBy = undefined;
    entry.adminNote = "";

    if (membershipType === "wga") {
      user.writerProfile.wgaMember = false;
    } else {
      user.writerProfile.sgaMember = false;
    }

    user.markModified("writerProfile");
    await user.save();

    return res.json({
      success: true,
      message: `${membershipType.toUpperCase()} proof submitted for admin review`,
      user: {
        _id: user._id,
        writerProfile: user.writerProfile,
      },
    });
  } catch (error) {
    console.error("Error submitting writer membership proof:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update writer profile (Phase 2: Identity)
// @route   PUT /api/onboarding/writer-profile
// @access  Private
export const updateWriterProfile = async (req, res) => {
  try {
    const { 
      username,
      bio, 
      representationStatus, 
      agencyName, 
      wgaMember,
      sgaMember,
      diversity,
      links,
      accomplishments,
      representation,
      demographicPrivacy,
      dateOfBirth,
      phone,
      address,
    } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const nextGender = String(diversity?.gender ?? user.writerProfile?.diversity?.gender ?? "").trim();
    const nextNationality = String(diversity?.nationality ?? user.writerProfile?.diversity?.nationality ?? "").trim();

    if (!nextGender || !nextNationality) {
      return res.status(400).json({
        success: false,
        message: "Gender and Nationality are required",
      });
    }
    
    if (!user.writerProfile) {
      user.writerProfile = {};
    }

    const nextRepresentationStatus = normalizeString(
      representationStatus !== undefined
        ? representationStatus
        : user.writerProfile.representationStatus || "unrepresented"
    );

    if (!WRITER_REPRESENTATION_STATUSES.includes(nextRepresentationStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid representation status",
      });
    }

    const nextAgencyName = normalizeString(
      agencyName !== undefined ? agencyName : user.writerProfile.agencyName
    );

    // Update writer profile
    if (username !== undefined) {
      const normalizedUsername = normalizeString(username).toLowerCase();

      if (!normalizedUsername) {
        return res.status(400).json({
          success: false,
          message: "Username is required",
        });
      }

      const existingUserWithUsername = await User.exists({
        _id: { $ne: user._id },
        "writerProfile.username": normalizedUsername,
      });

      if (existingUserWithUsername) {
        return res.status(409).json({
          success: false,
          message: "Username is already taken",
        });
      }

      user.writerProfile.username = normalizedUsername;
    }
    user.bio = bio || user.bio;
    user.writerProfile.representationStatus = nextRepresentationStatus;
    user.writerProfile.agencyName =
      nextRepresentationStatus === "unrepresented" ? "" : nextAgencyName;
    if (wgaMember !== undefined) {
      applyWriterMembershipSelection(user, "wga", Boolean(wgaMember));
    }

    if (sgaMember !== undefined) {
      applyWriterMembershipSelection(user, "swa", Boolean(sgaMember));
    }

    if (demographicPrivacy !== undefined) {
      const normalizedPrivacy = normalizeString(demographicPrivacy);
      if (["searchable", "private"].includes(normalizedPrivacy)) {
        user.writerProfile.demographicPrivacy = normalizedPrivacy;
      }
    }

    if (links !== undefined) {
      user.writerProfile.links = {
        portfolio: normalizeString(links?.portfolio),
        instagram: normalizeString(links?.instagram),
        twitter: normalizeString(links?.twitter),
        linkedin: normalizeString(links?.linkedin),
        imdb: normalizeString(links?.imdb),
        facebook: normalizeString(links?.facebook),
      };
    }

    if (accomplishments !== undefined) {
      user.writerProfile.accomplishments = Array.isArray(accomplishments)
        ? accomplishments.map((item) => normalizeString(item)).filter(Boolean)
        : [];
    }

    if (representation !== undefined) {
      const nextRepresentation = {
        filmTv: {
          agency: normalizeString(representation?.filmTv?.agency),
          agent: normalizeString(representation?.filmTv?.agent),
          managementCompany: normalizeString(representation?.filmTv?.managementCompany),
          manager: normalizeString(representation?.filmTv?.manager),
          lawFirm: normalizeString(representation?.filmTv?.lawFirm),
          lawyer: normalizeString(representation?.filmTv?.lawyer),
        },
        theater: {
          agency: normalizeString(representation?.theater?.agency),
          agent: normalizeString(representation?.theater?.agent),
          managementCompany: normalizeString(representation?.theater?.managementCompany),
          manager: normalizeString(representation?.theater?.manager),
          lawFirm: normalizeString(representation?.theater?.lawFirm),
          lawyer: normalizeString(representation?.theater?.lawyer),
        },
        literary: {
          agency: normalizeString(representation?.literary?.agency),
          agent: normalizeString(representation?.literary?.agent),
          managementCompany: normalizeString(representation?.literary?.managementCompany),
          manager: normalizeString(representation?.literary?.manager),
          lawFirm: normalizeString(representation?.literary?.lawFirm),
          lawyer: normalizeString(representation?.literary?.lawyer),
        },
      };
      user.writerProfile.representation = nextRepresentation;
    }

    if (phone !== undefined) {
      user.phone = normalizeString(phone);
    }

    if (dateOfBirth !== undefined) {
      const parsedDob = normalizeOptionalDate(dateOfBirth);
      if (parsedDob) {
        user.dateOfBirth = parsedDob;
      }
    }

    if (address !== undefined) {
      user.address = {
        street: normalizeString(address?.street),
        city: normalizeString(address?.city),
        state: normalizeString(address?.state),
        zipCode: normalizeString(address?.zipCode),
        country: normalizeString(address?.country),
        formatted: normalizeString(address?.formatted),
      };
    }
    
    if (diversity) {
      user.writerProfile.diversity = {
        ...user.writerProfile.diversity,
        ...diversity,
        gender: nextGender,
        nationality: nextNationality,
      };
    } else {
      user.writerProfile.diversity = {
        ...user.writerProfile.diversity,
        gender: nextGender,
        nationality: nextNationality,
      };
    }
    
    // Update onboarding step
    if (user.writerProfile.onboardingStep < 2) {
      user.writerProfile.onboardingStep = 2;
    }

    user.markModified("writerProfile");
    user.markModified("address");
    
    await user.save();
    
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        writerProfile: user.writerProfile
      }
    });
  } catch (error) {
    console.error("Error updating writer profile:", error);
    if (error?.code === 11000 && error?.keyPattern?.["writerProfile.username"]) {
      return res.status(409).json({
        success: false,
        message: "Username is already taken",
      });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Upload script with metadata (Phase 3 & 4)
// @route   POST /api/onboarding/upload-script
// @access  Private
export const uploadScript = async (req, res) => {
  try {
    const {
      title,
      logline,
      description,
      format,
      primaryGenre,
      subGenres,
      tagIds,
      contentIndicators,
      fileUrl,
      pageCount
    } = req.body;
    
    // Validate required fields
    if (!title || !logline || !fileUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "Title, logline, and script file are required" 
      });
    }
    
    // Create the script
    const script = await Script.create({
      creator: req.user._id,
      title,
      logline,
      description,
      format,
      primaryGenre,
      subGenres: subGenres || [],
      tagIds: tagIds || [],
      contentIndicators: contentIndicators || {},
      fileUrl,
      pageCount,
      contentType: format === "feature_film" ? "movie" : "tv_series"
    });
    
    // Update user's onboarding step
    const user = await User.findById(req.user._id);
    if (user.writerProfile.onboardingStep < 3) {
      user.writerProfile.onboardingStep = 3;
      await user.save();
    }
    
    res.status(201).json({ 
      success: true, 
      script,
      message: "Script uploaded successfully" 
    });
  } catch (error) {
    console.error("Error uploading script:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Accept submission agreement and create subscription (Phase 5)
// @desc    Complete writer onboarding
// @route   POST /api/onboarding/complete
// @access  Private
export const completeOnboarding = async (req, res) => {
  try {
    const {
      genres,
      tags,
      plan,
      agreementAccepted,
      termsVersion,
      privacyPolicyAccepted,
      privacyPolicyVersion,
      stripePaymentMethodId
    } = req.body;

    if (plan && !["free", "paid"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selection",
      });
    }
    
    if (!agreementAccepted) {
      return res.status(400).json({ 
        success: false, 
        message: "You must accept the terms and conditions" 
      });
    }

    if (!privacyPolicyAccepted) {
      return res.status(400).json({
        success: false,
        message: "You must accept the privacy policy"
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (!["creator", "writer"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only writers can complete writer onboarding"
      });
    }

    const wasOnboardingComplete = Boolean(user?.writerProfile?.onboardingComplete);
    
    // Update user profile with genres and tags
    if (genres && genres.length > 0) {
      user.writerProfile.genres = genres;
    }
    
    if (tags && tags.length > 0) {
      user.writerProfile.specializedTags = tags;
    }
    
    // Mark onboarding as complete
    user.writerProfile.onboardingComplete = true;
    user.writerProfile.onboardingStep = 4;
    user.writerProfile.plan = plan || "free";
    user.writerProfile.writerOnboardingTermsAccepted = true;
    user.writerProfile.writerOnboardingTermsAcceptedAt = new Date();
    user.writerProfile.writerOnboardingTermsVersion = termsVersion || "writer-onboarding-v1";
    user.privacyPolicyAccepted = true;
    user.privacyPolicyAcceptedAt = new Date();
    user.privacyPolicyVersion = privacyPolicyVersion || "registration-privacy-v1";

    let awardedWriterSignupBonus = false;
    if (!wasOnboardingComplete) {
      if (!user.credits) {
        user.credits = {
          balance: 0,
          totalPurchased: 0,
          totalSpent: 0,
          transactions: [],
        };
      }

      user.credits.balance = Number(user.credits.balance || 0) + WRITER_SIGNUP_BONUS_CREDITS;
      user.credits.totalPurchased = Number(user.credits.totalPurchased || 0) + WRITER_SIGNUP_BONUS_CREDITS;
      user.credits.transactions.push(buildWriterSignupCreditTransaction());
      awardedWriterSignupBonus = true;
    }

    await user.save();

    if (awardedWriterSignupBonus) {
      await Notification.create({
        user: user._id,
        type: "admin_alert",
        message: `Your ${WRITER_SIGNUP_BONUS_CREDITS} signup credits are ready. Use them for AI trailer generation and AI script evaluation.`,
      }).catch(() => null);

      const emailResult = await sendWriterSignupCreditsEmail(user.email, user.name, {
        amount: WRITER_SIGNUP_BONUS_CREDITS,
        balanceAfter: Number(user?.credits?.balance || 0),
        clientBaseUrl: String(req.get("origin") || "").trim(),
      });

      if (!emailResult?.success) {
        console.error("Failed to send writer signup credits email after onboarding completion:", emailResult?.error || "Unknown email error");
      }
    }
    
    // Create subscription record if paid plan
    let subscription = null;
    if (plan === "paid") {
      const baseAmount = 3000; // ₹30.00 in paise (hosting)
      const evaluationFee = 10000; // ₹100.00 in paise
      const totalAmount = baseAmount + evaluationFee;
      
      subscription = await Subscription.create({
        user: req.user._id,
        // Must match Subscription schema enum values
        plan: "hosting_plus_evaluation",
        amount: totalAmount,
        status: "pending", // Will be updated after Stripe payment
        billingCycle: "monthly",
        includesEvaluation: true,
        submissionAgreementAccepted: true,
        submissionAgreementAcceptedAt: new Date(),
        submissionAgreementIp: req.ip,
        stripePaymentMethodId
      });
      
      // TODO: Integrate with Stripe to process payment
      // This would create a Stripe customer and subscription
    }
    
    res.status(201).json({ 
      success: true, 
      subscription,
      message: "Onboarding completed successfully",
      writerSignupBonusCredits: awardedWriterSignupBonus ? WRITER_SIGNUP_BONUS_CREDITS : 0,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        writerProfile: user.writerProfile
      }
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Send email verification code
// @route   POST /api/onboarding/send-verification
// @access  Private
export const sendEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already verified" 
      });
    }
    
    // Generate 6-digit code
    const verificationCode = generateOTP();

    user.emailVerificationToken = hashOTP(verificationCode);
    user.emailVerificationExpires = generateOTPExpiry();
    await user.save();

    const emailResult = await sendOTPEmail(user.email, user.name, verificationCode);
    if (!emailResult.success) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
      return res.status(500).json({
        success: false,
        message: emailResult.error?.includes("Invalid login") || emailResult.error?.includes("authentication")
          ? "Email service configuration error. Please contact support."
          : "Failed to send verification email. Please try again.",
      });
    }
    
    res.json({ 
      success: true, 
      message: "Verification code sent to your email"
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Verify email with code
// @route   POST /api/onboarding/verify-email
// @access  Private
export const verifyEmail = async (req, res) => {
  try {
    const code = normalizeOtpInput(req.body?.code);
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: "Verification code required" 
      });
    }

    if (!isValidOtpInput(code)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already verified" 
      });
    }
    
    if (!user.emailVerificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    if (!isHashedOTP(user.emailVerificationToken)) {
      user.emailVerificationToken = hashOTP(user.emailVerificationToken);
      await user.save();
    }

    if (isOTPExpired(user.emailVerificationExpires)) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    if (!verifyHashedOTP(user.emailVerificationToken, code)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired verification code" 
      });
    }
    
    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.writerProfile.onboardingStep = Math.max(user.writerProfile.onboardingStep, 1);
    await user.save();
    
    res.json({ 
      success: true, 
      message: "Email verified successfully" 
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update industry professional identity (Phase 2)
// @route   PUT /api/onboarding/professional-identity
// @access  Private
export const updateProfessionalIdentity = async (req, res) => {
  try {
    const { 
      username,
      company, 
      jobTitle, 
      imdbUrl, 
      linkedInUrl,
      previousCredits 
    } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.role !== "professional") {
      return res.status(403).json({ 
        success: false, 
        message: "This endpoint is for industry professionals only" 
      });
    }

    const normalizedUsername = normalizeString(username).toLowerCase();
    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters and contain only lowercase letters, numbers, or underscores",
      });
    }

    const existingUserWithUsername = await User.exists({
      _id: { $ne: user._id },
      "writerProfile.username": normalizedUsername,
    });

    if (existingUserWithUsername) {
      return res.status(409).json({
        success: false,
        message: "Username is already taken",
      });
    }

    if (!user.writerProfile) user.writerProfile = {};
    user.writerProfile.username = normalizedUsername;
    
    // Update industry profile
    user.industryProfile.company = company || user.industryProfile.company;
    user.industryProfile.jobTitle = jobTitle || user.industryProfile.jobTitle;
    user.industryProfile.imdbUrl = imdbUrl || user.industryProfile.imdbUrl;
    user.industryProfile.linkedInUrl = linkedInUrl || user.industryProfile.linkedInUrl;
    if (previousCredits !== undefined) {
      user.industryProfile.previousCredits = sanitizePreviousCredits(previousCredits);
    }
    
    // Update onboarding step
    if (user.industryProfile.onboardingStep < 2) {
      user.industryProfile.onboardingStep = 2;
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        industryProfile: user.industryProfile
      }
    });
  } catch (error) {
    console.error("Error updating professional identity:", error);
    if (error?.code === 11000 && error?.keyPattern?.["writerProfile.username"]) {
      return res.status(409).json({ success: false, message: "Username is already taken" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update investor/professional mandates
// @route   PUT /api/onboarding/mandates
// @access  Private
export const updateMandates = async (req, res) => {
  try {
    const { mandates } = req.body;

    if (!mandates) {
      return res.status(400).json({ success: false, message: "Mandates data is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.industryProfile) {
      user.industryProfile = {};
    }

    user.industryProfile.mandates = {
      formats: normalizeFormatArray(mandates.formats),
      budgetTiers: mandates.budgetTiers || [],
      genres: mandates.genres || [],
      excludeGenres: mandates.excludeGenres || [],
      specificHooks: mandates.specificHooks || [],
    };

    await user.save();

    res.json({
      success: true,
      message: "Mandates updated successfully",
      mandates: user.industryProfile.mandates,
    });
  } catch (error) {
    console.error("Error updating mandates:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Complete industry professional onboarding
// @route   POST /api/onboarding/complete-industry
// @access  Private
export const completeIndustryOnboarding = async (req, res) => {
  try {
    const {
      mandates,
      agreementAccepted
    } = req.body;
    
    if (!agreementAccepted) {
      return res.status(400).json({ 
        success: false, 
        message: "You must accept the terms and conditions" 
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.role !== "professional") {
      return res.status(403).json({ 
        success: false, 
        message: "This endpoint is for industry professionals only" 
      });
    }
    
    // Update mandates
    if (mandates) {
      user.industryProfile.mandates = {
        formats: normalizeFormatArray(mandates.formats),
        budgetTiers: mandates.budgetTiers || [],
        genres: mandates.genres || [],
        excludeGenres: mandates.excludeGenres || [],
        specificHooks: mandates.specificHooks || []
      };
    }
    
    // Mark onboarding as complete
    user.industryProfile.onboardingComplete = true;
    user.industryProfile.onboardingStep = 4;
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Onboarding completed successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        industryProfile: user.industryProfile
      }
    });
  } catch (error) {
    console.error("Error completing industry onboarding:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get onboarding status
// @route   GET /api/onboarding/status
// @access  Private
export const getOnboardingStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    res.json({ 
      success: true, 
      onboarding: {
        emailVerified: user.emailVerified,
        currentStep: user.writerProfile.onboardingStep,
        complete: user.writerProfile.onboardingComplete,
        writerProfile: user.writerProfile,
        profileCompletion: getProfileCompletion(user)
      }
    });
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
