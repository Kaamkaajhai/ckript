import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import ScriptPurchaseRequest from "../models/ScriptPurchaseRequest.js";
import ScriptOption from "../models/ScriptOption.js";
import Notification from "../models/Notification.js";
import { sendOTPEmail } from "../utils/emailService.js";
import {
  INDUSTRY_BUSINESS_EMAIL_REQUIRED_MESSAGE,
  hasActiveFilmIndustryProfessionalAccess,
  isIndustryProfessionalWithPersonalEmail,
  isFilmIndustryProfessionalRole,
  isWriterRole,
  hasBusinessEmail,
} from "../utils/industryAccess.js";
import {
  generateOTP,
  generateOTPExpiry,
  hashOTP,
  isHashedOTP,
  isOTPExpired,
  verifyHashedOTP,
} from "../utils/otpHelper.js";
import { buildUserCanonicalPath, buildUserShareMeta, buildScriptCanonicalPath, buildScriptShareMeta } from "../utils/shareMeta.js";
import { asObjectId } from "../utils/requestValue.js";
import { getProfileCompletion } from "../utils/profileCompletion.js";
import multer from "multer";
import { uploadToCloudinary, deleteFromCloudinary, buildPrivateDownloadUrl } from "../config/cloudinary.js";
import { fetchTrustedPdfAsset, getCloudinaryResourceTypeFromUrl } from "../utils/remoteAssetPolicy.js";
import {
  buildBusinessEmailProfileDenial,
  buildPrivateProfileDenial,
  buildVisitorProfile,
  VISITOR_PROFILE_SCRIPT_FIELDS,
} from "../utils/profileProjection.js";
import { resolveProfileImageUpdate } from "../utils/profileUpdate.js";

const WRITER_REPRESENTATION_STATUSES = ["unrepresented", "manager", "agent", "manager_and_agent"];
const BANK_REVIEW_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_BANK_INVALID_ATTEMPTS = 5;
const ACCOUNT_NUMBER_REGEX = /^\d{8,20}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GENERIC_ROUTING_REGEX = /^[A-Z0-9-]{4,20}$/;
const BANK_DETAILS_BLOCKED_MESSAGE = "Too many invalid attempts. Bank detail updates are blocked. Please contact support team.";
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGE_CODES = new Set(["en", "hi", "es", "fr", "de", "ja", "ko", "zh-CN"]);
const LANGUAGE_CODE_ALIASES = {
  zh: "zh-CN",
  "zh-cn": "zh-CN",
};

const INDUSTRY_SUB_ROLE_VALUES = new Set([
  "producer",
  "director",
  "executive_producer",
  "line_producer",
  "showrunner",
  "development_executive",
  "studio_executive",
  "agent",
  "actor",
  "other",
]);

const INDUSTRY_PROFILE_UPLOAD_ROLES = new Set(["investor", "producer", "director"]);
const INDUSTRY_NOTABLE_ATTACHMENT_MAX_FILES = 6;
const INDUSTRY_NOTABLE_ATTACHMENT_MAX_TOTAL = 12;
const INDUSTRY_NOTABLE_ATTACHMENT_FILE_SIZE = 25 * 1024 * 1024;
const INDUSTRY_NOTABLE_ATTACHMENT_MIME_TYPES = new Set([
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

const normalizeLanguagePreference = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_LANGUAGE;

  const mapped = LANGUAGE_CODE_ALIASES[raw.toLowerCase()] || raw;
  return SUPPORTED_LANGUAGE_CODES.has(mapped) ? mapped : DEFAULT_LANGUAGE;
};

const normalizeProfileLookupKey = (value) => String(value || "").trim();
const isLikelyObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim());
const isLikelyUserSid = (value) => /^[a-z]{3}-[a-z0-9]{8}$/i.test(String(value || "").trim());

const buildUserProfileLookupQuery = (profileKey) => {
  const normalized = normalizeProfileLookupKey(profileKey);
  if (!normalized) return null;
  if (isLikelyObjectId(normalized)) {
    return { _id: normalized };
  }
  if (isLikelyUserSid(normalized)) {
    return { sid: normalized.toUpperCase() };
  }
  return { "writerProfile.username": normalized.toLowerCase() };
};

const normalizeString = (value) => (typeof value === "string" ? value.trim() : value);
const buildArchivedUserProfileSnapshot = (userDoc) => {
  const source = typeof userDoc?.toObject === "function"
    ? userDoc.toObject({ depopulate: false })
    : { ...(userDoc || {}) };

  delete source.password;
  delete source.emailVerificationToken;
  delete source.emailVerificationExpires;
  delete source.emailVerificationResendAvailableAt;
  delete source.resetPasswordToken;
  delete source.resetPasswordExpires;
  delete source.pendingEmail;

  return source;
};

const LOCALHOST_URL_REGEX = /\bhttps?:\/\/(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?[^\s]*/gi;
const sanitizePreviousCredits = (value) => {
  const normalized = normalizeString(value) || "";
  if (!normalized) return "";
  return normalized.replace(LOCALHOST_URL_REGEX, "").replace(/\s{2,}/g, " ").trim();
};
const normalizeIndustrySubRole = (value) =>
  String(normalizeString(value) || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
const normalizeOtpInput = (otp) => String(otp || "").trim();
const isValidOtpInput = (otp) => /^\d{6}$/.test(otp);

const normalizeOptionalDate = (value) => {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "INVALID_DATE" : parsed;
};

const normalizeAddressPayload = (value) => {
  if (!value || typeof value !== "object") return null;

  const street = normalizeString(value.street) || "";
  const city = normalizeString(value.city) || "";
  const state = normalizeString(value.state) || "";
  const zipCode = normalizeString(value.zipCode) || "";
  const country = normalizeString(value.country) || "";
  const computedFormattedParts = [street, city, state, zipCode].filter(Boolean);
  if (country && country.toLowerCase() !== "india") {
    computedFormattedParts.push(country);
  }
  const computedFormatted = computedFormattedParts.join(", ");

  return {
    street,
    city,
    state,
    zipCode,
    country,
    formatted: normalizeString(value.formatted) || computedFormatted,
  };
};

const normalizeStringArray = (value, maxItems) => {
  if (!Array.isArray(value)) return [];
  const unique = [];
  for (const item of value) {
    const normalized = normalizeString(item);
    if (!normalized) continue;
    if (!unique.includes(normalized)) unique.push(normalized);
    if (maxItems && unique.length >= maxItems) break;
  }
  return unique;
};

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

const getNotableAttachmentResourceType = (mimeType = "") => {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  return "document";
};

const getCloudinaryUploadResourceType = (mimeType = "") => {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  return "raw";
};

const resolveAttachmentCloudinaryResourceType = (attachment) =>
  normalizeString(attachment?.cloudinaryResourceType) ||
  getCloudinaryResourceTypeFromUrl(attachment?.url) ||
  (attachment?.resourceType === "video" ? "video" : attachment?.resourceType === "document" ? "raw" : "image");

const findNotableAttachment = (attachments = [], { publicId = "", fileUrl = "" } = {}) =>
  attachments.find((item) => {
    const itemPublicId = normalizeString(item?.publicId);
    const itemUrl = normalizeString(item?.url);
    if (publicId && itemPublicId === publicId) return true;
    if (fileUrl && itemUrl === fileUrl) return true;
    return false;
  });

const sanitizeInlineFileName = (fileName = "attachment.pdf") => {
  const normalized = String(fileName || "attachment.pdf")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim();
  if (!normalized) return "attachment.pdf";
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized}.pdf`;
};

const fetchPdfBufferFromCloudinary = async ({ publicId, attachmentUrl, preferredResourceType }) => {
  const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
  const resourceTypeCandidates = Array.from(new Set([
    preferredResourceType,
    "raw",
    "image",
  ].filter(Boolean)));

  for (const resourceType of resourceTypeCandidates) {
    try {
      const signedUrl = buildPrivateDownloadUrl(publicId, "pdf", {
        resource_type: resourceType,
        type: "upload",
        expires_at: expiresAt,
        attachment: false,
      });

      const { buffer } = await fetchTrustedPdfAsset(signedUrl);
      if (buffer.length > 0) return buffer;
    } catch {
      // Try fallback resource types.
    }
  }

  if (attachmentUrl) {
    try {
      const { buffer } = await fetchTrustedPdfAsset(attachmentUrl);
      if (buffer.length > 0) return buffer;
    } catch {
      // Final fallback failed; return null below.
    }
  }

  return null;
};

const sanitizeBankPayload = (bankDetails) => {
  if (!bankDetails || typeof bankDetails !== "object") return null;

  const clean = {
    accountHolderName: normalizeString(bankDetails.accountHolderName),
    bankName: normalizeString(bankDetails.bankName),
    accountNumber: typeof bankDetails.accountNumber === "string"
      ? bankDetails.accountNumber.replace(/\s+/g, "")
      : "",
    routingNumber: typeof bankDetails.routingNumber === "string"
      ? bankDetails.routingNumber.replace(/\s+/g, "").toUpperCase()
      : "",
    accountType: normalizeString(bankDetails.accountType) || "checking",
    swiftCode: normalizeString(bankDetails.swiftCode)?.toUpperCase() || "",
    iban: normalizeString(bankDetails.iban)?.toUpperCase() || "",
    country: (normalizeString(bankDetails.country) || "IN").toUpperCase(),
    currency: (normalizeString(bankDetails.currency) || "INR").toUpperCase(),
  };

  // Do not allow masked values to overwrite real account number.
  if (typeof clean.accountNumber === "string" && clean.accountNumber.startsWith("****")) {
    clean.accountNumber = undefined;
  }

  return clean;
};

const getInvalidBankDetailsMessage = (bankDetails) => {
  if (!ACCOUNT_NUMBER_REGEX.test(bankDetails.accountNumber || "")) {
    return "Account number must be 8-20 digits";
  }

  if (!bankDetails.routingNumber) {
    return "Routing / IFSC number is required";
  }

  if (bankDetails.country === "IN") {
    if (!IFSC_REGEX.test(bankDetails.routingNumber)) {
      return "Please enter a valid IFSC code (example: HDFC0001234)";
    }
  } else if (!GENERIC_ROUTING_REGEX.test(bankDetails.routingNumber)) {
    return "Routing number must be 4-20 letters, numbers, or hyphen";
  }

  return "";
};

const ensureBankDetailsSecurity = (user) => {
  if (!user.bankDetailsSecurity) {
    user.bankDetailsSecurity = {};
  }

  if (typeof user.bankDetailsSecurity.invalidAttempts !== "number") {
    user.bankDetailsSecurity.invalidAttempts = 0;
  }

  if (typeof user.bankDetailsSecurity.isLocked !== "boolean") {
    user.bankDetailsSecurity.isLocked = false;
  }

  return user.bankDetailsSecurity;
};

const recordInvalidBankAttempt = async (user, reason = "Invalid bank details") => {
  const security = ensureBankDetailsSecurity(user);
  security.invalidAttempts = Number(security.invalidAttempts || 0) + 1;
  security.lastInvalidAttemptAt = new Date();
  security.lastInvalidReason = String(reason || "Invalid bank details");

  if (security.invalidAttempts >= MAX_BANK_INVALID_ATTEMPTS) {
    security.isLocked = true;
    security.lockedAt = new Date();
  }

  user.markModified("bankDetailsSecurity");
  await user.save();

  return security;
};

const maskAccountNumber = (accountNumber = "") => {
  if (!accountNumber) return "";
  return `****${String(accountNumber).slice(-4)}`;
};

const sanitizeBankReviewForResponse = (bankDetailsReview) => {
  if (!bankDetailsReview) return { status: "not_submitted" };

  const plain = bankDetailsReview?.toObject ? bankDetailsReview.toObject() : bankDetailsReview;
  const requested = plain?.requestedDetails || {};

  return {
    status: plain.status || "not_submitted",
    submittedAt: plain.submittedAt,
    dueAt: plain.dueAt,
    reviewedAt: plain.reviewedAt,
    adminNote: plain.adminNote || "",
    requestedDetails: requested.accountNumber
      ? {
          ...requested,
          accountNumber: maskAccountNumber(requested.accountNumber),
        }
      : null,
  };
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

// Multer config for profile image uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed"), false);
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const notableCreditAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: INDUSTRY_NOTABLE_ATTACHMENT_FILE_SIZE,
    files: INDUSTRY_NOTABLE_ATTACHMENT_MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (INDUSTRY_NOTABLE_ATTACHMENT_MIME_TYPES.has(file?.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Only images, PDFs, and videos are allowed"));
  },
}).array("attachments", INDUSTRY_NOTABLE_ATTACHMENT_MAX_FILES);

export const uploadNotableCreditAttachmentsFile = (req, res, next) => {
  notableCreditAttachmentUpload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Each attachment must be 25MB or smaller" });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({ message: `You can upload up to ${INDUSTRY_NOTABLE_ATTACHMENT_MAX_FILES} files at once` });
      }
      return res.status(400).json({ message: err.message || "Attachment upload failed" });
    }

    return res.status(400).json({ message: err.message || "Attachment upload failed" });
  });
};

export const getWriters = async (req, res) => {
  try {
    const { sort, genre, search } = req.query;

    const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
    const usersWhoBlockedCurrent = await User.find({ blockedUsers: req.user._id }).select("_id").lean();
    const blockedUserIds = [
      ...(currentUser?.blockedUsers || []),
      ...usersWhoBlockedCurrent.map((u) => u._id),
    ];

    // Base match: include both writer and creator accounts
    const matchStage = {
      role: { $in: ["writer", "creator"] },
      isDeactivated: { $ne: true },
    };

    if (blockedUserIds.length > 0) {
      matchStage._id = { $nin: blockedUserIds };
    }

    // Name search (case-insensitive)
    if (search && search.trim()) {
      matchStage.name = { $regex: search.trim(), $options: "i" };
    }

    // Genre filter early (before lookup) when writerProfile.genres exists on the user doc
    if (genre && genre !== "All") {
      matchStage["writerProfile.genres"] = genre;
    }

    const pipeline = [
      { $match: matchStage },
      // Strip sensitive / heavy fields before the lookup so less data travels
      {
        $project: {
          password: 0,
          emailVerificationToken: 0,
          emailVerificationExpires: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
        },
      },
      // Pipeline-form lookup: only pull the three fields we actually need from each script
      {
        $lookup: {
          from: "scripts",
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$creator", "$$uid"] },
                status: "published",
                isDeleted: { $ne: true },
                isSold: { $ne: true },
              },
            },
            {
              $project: {
                views: 1,
                "scriptScore.overall": 1,
                unlockedByCount: { $size: { $ifNull: ["$unlockedBy", []] } },
              },
            },
          ],
          as: "scripts",
        },
      },
      {
        $addFields: {
          scriptCount: { $size: "$scripts" },
          totalViews: { $sum: "$scripts.views" },
          avgScore: {
            $let: {
              vars: {
                scored: {
                  $filter: { input: "$scripts", as: "s", cond: { $gt: ["$$s.scriptScore.overall", 0] } },
                },
              },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$scored" }, 0] },
                  { $avg: "$$scored.scriptScore.overall" },
                  0,
                ],
              },
            },
          },
          totalUnlocks: { $sum: "$scripts.unlockedByCount" },
          followerCount: { $size: { $ifNull: ["$followers", []] } },
        },
      },
      { $project: { scripts: 0 } },
    ];

    // Sort options
    if (sort === "score") {
      pipeline.push({ $sort: { avgScore: -1, followerCount: -1 } });
    } else if (sort === "views") {
      pipeline.push({ $sort: { totalViews: -1 } });
    } else if (sort === "followers") {
      pipeline.push({ $sort: { followerCount: -1 } });
    } else if (sort === "scripts") {
      pipeline.push({ $sort: { scriptCount: -1 } });
    } else {
      // Default: combined reputation (avgScore * 0.5 + totalViews/100 * 0.3 + followerCount * 0.2)
      pipeline.push({
        $addFields: {
          reputation: {
            $add: [
              { $multiply: [{ $ifNull: ["$avgScore", 0] }, 0.5] },
              { $multiply: [{ $divide: [{ $ifNull: ["$totalViews", 0] }, 100] }, 0.3] },
              { $multiply: [{ $ifNull: ["$followerCount", 0] }, 0.2] },
            ],
          },
        },
      });
      pipeline.push({ $sort: { reputation: -1 } });
    }

    // Cap results – 100 writers is more than enough for the browse page
    pipeline.push({ $limit: 100 });

    const writers = await User.aggregate(pipeline);
    res.json(writers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userObj = user.toObject();
    userObj.language = normalizeLanguagePreference(userObj.language);
    userObj.profileCompletion = getProfileCompletion(userObj);

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicUserProfile = async (req, res) => {
  try {
    const profileKey = normalizeProfileLookupKey(req.params.id);
    const profileLookupQuery = buildUserProfileLookupQuery(profileKey);
    if (!profileLookupQuery) {
      return res.status(400).json({ message: "Invalid profile id" });
    }

    const user = await User.findOne(profileLookupQuery)
      .select("name role bio skills profileImage coverImage writerProfile industryProfile followers following createdAt isPrivate isDeactivated subscription badges")
      .lean();

    if (!user || user.isDeactivated) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isPrivate) {
      return res.status(403).json({ message: "This account is private." });
    }

    const publicScripts = await Script.find({
      creator: user._id,
      status: "published",
      isDeleted: { $ne: true },
      isSold: { $ne: true },
    })
      .select("title sid logline description synopsis genre primaryGenre format formatOther coverImage trailerUrl uploadedTrailerUrl trailerSource createdAt publishedAt")
      .sort({ createdAt: -1 })
      .lean();

    const userForShareMeta = {
      _id: user._id,
      name: user.name,
      role: user.role,
      writerProfile: {
        username: user.writerProfile?.username || "",
      },
    };

    const publicUser = {
      _id: user._id,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      bio: user.bio || "",
      skills: Array.isArray(user.skills) ? user.skills.filter(Boolean).slice(0, 12) : [],
      profileImage: user.profileImage || "",
      coverImage: user.coverImage || "",
      // Competition badges are public achievements — that's the point of earning one.
      badges: Array.isArray(user.badges) ? user.badges : [],
      followerCount: Array.isArray(user.followers) ? user.followers.length : 0,
      followingCount: Array.isArray(user.following) ? user.following.length : 0,
      writerProfile: user.writerProfile
        ? {
            username: user.writerProfile.username || "",
            representationStatus: user.writerProfile.representationStatus || "",
            agencyName: user.writerProfile.agencyName || "",
            wgaMember: Boolean(user.writerProfile.wgaMember),
            sgaMember: Boolean(user.writerProfile.sgaMember),
            genres: Array.isArray(user.writerProfile.genres) ? user.writerProfile.genres : [],
            specializedTags: Array.isArray(user.writerProfile.specializedTags) ? user.writerProfile.specializedTags : [],
            links: (user.allowIndustryContact === false) ? {} : {
              portfolio: user.writerProfile.links?.portfolio || "",
              instagram: user.writerProfile.links?.instagram || "",
              twitter: user.writerProfile.links?.twitter || "",
              linkedin: user.writerProfile.links?.linkedin || "",
              imdb: user.writerProfile.links?.imdb || "",
              facebook: user.writerProfile.links?.facebook || "",
            },
          }
        : undefined,
      industryProfile: user.industryProfile
        ? {
            subRole: user.industryProfile.subRole || "",
            subRoleOther: user.industryProfile.subRoleOther || "",
            company: user.industryProfile.company || "",
            jobTitle: user.industryProfile.jobTitle || "",
            mandates: {
              genres: Array.isArray(user.industryProfile.mandates?.genres)
                ? user.industryProfile.mandates.genres.filter(Boolean).slice(0, 20)
                : [],
              formats: Array.isArray(user.industryProfile.mandates?.formats)
                ? user.industryProfile.mandates.formats.filter(Boolean).slice(0, 20)
                : [],
              specificHooks: Array.isArray(user.industryProfile.mandates?.specificHooks)
                ? user.industryProfile.mandates.specificHooks.filter(Boolean).slice(0, 20)
                : [],
              excludeGenres: Array.isArray(user.industryProfile.mandates?.excludeGenres)
                ? user.industryProfile.mandates.excludeGenres.filter(Boolean).slice(0, 20)
                : [],
            },
          }
        : undefined,
      shareMeta: buildUserShareMeta(req, userForShareMeta),
      canonicalPath: buildUserCanonicalPath(userForShareMeta),
      // Expose only the badge-relevant tier info — no sensitive billing data
      subscription: user.subscription
        ? {
            plan: user.subscription.plan || "",
            accessTier: user.subscription.accessTier || "",
            accessStatus: user.subscription.accessStatus || "",
            accessExpiresAt: user.subscription.accessExpiresAt || user.subscription.expiresAt || null,
          }
        : undefined,
    };

    const scripts = publicScripts.map((script) => {
      const synopsis = String(script.synopsis || "");
      const synopsisTeaser = synopsis
        ? `${synopsis.slice(0, 220)}${synopsis.length > 220 ? "..." : ""}`
        : "";

      return {
        ...script,
        synopsis: synopsisTeaser,
        writerUsername: user.writerProfile?.username || "",
        canonicalPath: buildScriptCanonicalPath({
          ...script,
          writerUsername: user.writerProfile?.username || "",
        }),
        shareMeta: buildScriptShareMeta(req, script),
      };
    });

    return res.json({
      user: publicUser,
      scripts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch public profile" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const profileKey = normalizeProfileLookupKey(req.params.id);
    const profileLookupQuery = buildUserProfileLookupQuery(profileKey);
    if (!profileLookupQuery) {
      return res.status(400).json({ message: "Invalid profile id" });
    }

    let user = await User.findOne(profileLookupQuery)
      .select("-password")
      .populate("followers", "name profileImage role writerProfile.username")
      .populate("following", "name profileImage role writerProfile.username");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetUserId = user?._id?.toString?.();
    const isOwnProfile = req.user?._id?.toString() === targetUserId;

    if (isOwnProfile) {
      await user.populate("blockedUsers", "name profileImage role writerProfile.username");
    }

    let blockedByCurrent = false;
    let blockedByProfile = false;

    if (!isOwnProfile) {
      const currentUser = await User.findById(req.user._id).select("blockedUsers role email name subscription");
      blockedByCurrent = currentUser?.blockedUsers?.some((uid) => uid.toString() === targetUserId) || false;
      blockedByProfile = user?.blockedUsers?.some((uid) => {
        const blockedId = uid?._id?.toString?.() || uid?.toString?.();
        return blockedId === req.user._id.toString();
      }) || false;

      if (blockedByProfile) {
        return res.status(403).json({
          message: "This user has blocked you.",
          blocked: true,
          blockedByCurrent,
          blockedByProfile,
        });
      }

      if (user?.isDeactivated && String(currentUser?.role || "").toLowerCase() !== "admin") {
        return res.status(404).json({ message: "User not found" });
      }

      const viewerId = req.user?._id?.toString();
      const isFollower = (user?.followers || []).some((follower) => {
        const followerId = follower?._id?.toString?.() || follower?.toString?.();
        return followerId === viewerId;
      });
      const isAdminViewer = String(currentUser?.role || "").toLowerCase() === "admin";

      if (
        isWriterRole(user) &&
        hasActiveFilmIndustryProfessionalAccess(currentUser)
      ) {
        const plan = currentUser.subscription?.plan || "free";
        if (plan === "free" && !hasBusinessEmail(currentUser.email)) {
          return res.status(403).json(buildBusinessEmailProfileDenial(
            "Viewing writer profiles requires a company email. Upgrade your plan or update your email."
          ));
        }
      }

      if (isWriterRole(user) && hasActiveFilmIndustryProfessionalAccess(currentUser)) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentNotif = await Notification.findOne({
          user: targetUserId,
          from: req.user._id,
          type: "profile_view",
          createdAt: { $gte: twentyFourHoursAgo }
        });
        if (!recentNotif) {
          await Notification.create({
            user: targetUserId,
            from: req.user._id,
            type: "profile_view",
            message: `${currentUser.name || "A film industry professional"} viewed your profile.`
          });
        }
      }

      if (user?.isPrivate && !isFollower && !isAdminViewer) {
        const followRequestPending = (user?.followRequests || []).some(
          (entry) => entry?.from?.toString() === req.user._id.toString()
        );
        return res.status(403).json(buildPrivateProfileDenial({
          userId: targetUserId,
          followRequestPending,
          blockedByCurrent,
          blockedByProfile,
        }));
      }

      const isWriterProfile = isWriterRole(user);
      if (
        isWriterProfile &&
        isIndustryProfessionalWithPersonalEmail(currentUser || req.user) &&
        !hasActiveFilmIndustryProfessionalAccess(currentUser || req.user)
      ) {
        return res.status(403).json({
            message: "To view scripts and writer profiles, sign up with a business email. To access writer contact details, purchase a Film Industry Professional plan.",
            requiresBusinessEmail: true,
          });
      }
      if (isWriterProfile) {
        await User.updateOne({ _id: user._id }, { $inc: { profileViews: 1 } });
        user.profileViews = Number(user.profileViews || 0) + 1;
      }
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "name profileImage role")
      .sort({ createdAt: -1 });

    const scriptQuery = isOwnProfile
      ? { creator: user._id, isDeleted: { $ne: true } }
      : {
          creator: user._id,
          status: { $ne: "draft" },
          isSold: { $ne: true },
          isDeleted: { $ne: true },
        };

    let scriptsQuery = Script.find(scriptQuery)
      .populate("creator", "name profileImage role writerProfile.username")
      .sort({ createdAt: -1 });
    if (!isOwnProfile) {
      scriptsQuery = scriptsQuery.select(VISITOR_PROFILE_SCRIPT_FIELDS.join(" "));
    }
    const scripts = await scriptsQuery;

    const isWriterUser = ["writer", "creator"].includes(user.role);

    let deletedScripts = [];
    if (isOwnProfile && isWriterUser) {
      deletedScripts = await Script.find({ creator: user._id, isDeleted: true })
        .populate("creator", "name profileImage role")
        .select("_id title genre format coverImage logline isDeleted deletedAt createdAt publishedAt")
        .sort({ deletedAt: -1, updatedAt: -1 });
    }

    // Fetch scripts purchased by this user (only for own profile or investor/producer viewing)
    const isPro = ["investor", "producer", "director"].includes(user.role);
    let purchasedScripts = [];
    if (isOwnProfile && isPro) {
      const [approvedPurchaseScriptIds, convertedOptionScriptIds] = await Promise.all([
        ScriptPurchaseRequest.distinct("script", { investor: user._id, status: "approved" }),
        ScriptOption.distinct("script", { holder: user._id, status: "converted" }),
      ]);

      const linkedPurchaseScriptIds = [
        ...approvedPurchaseScriptIds,
        ...convertedOptionScriptIds,
      ].filter(Boolean);

      const purchasedQuery = linkedPurchaseScriptIds.length > 0
        ? {
            $or: [
              { unlockedBy: user._id },
              { purchasedBy: user._id },
              { _id: { $in: linkedPurchaseScriptIds } },
            ],
          }
        : {
            $or: [
              { unlockedBy: user._id },
              { purchasedBy: user._id },
            ],
          };

      purchasedScripts = await Script.find(purchasedQuery)
        .populate("creator", "name profileImage role")
        .select("_id title genre format price coverImage creator premium createdAt publishedAt logline unlockedBy purchasedBy isDeleted deletedAt")
        .sort({ createdAt: -1 });
    }

    let bookmarkedScripts = [];
    if (isOwnProfile && Array.isArray(user.favoriteScripts) && user.favoriteScripts.length > 0) {
      bookmarkedScripts = await Script.find({
        _id: { $in: user.favoriteScripts },
        status: "published",
        isSold: { $ne: true },
        isDeleted: { $ne: true },
      })
        .populate("creator", "name profileImage role")
        .sort({ updatedAt: -1 });
    }

    // Sanitize bank details - only show to own profile
    let userObj = user.toObject();
    userObj.language = normalizeLanguagePreference(userObj.language);
    if (!isOwnProfile) {
      userObj = buildVisitorProfile(userObj);
    } else if (isOwnProfile && userObj.bankDetails && userObj.bankDetails.accountNumber) {
      // Sanitize account number even for own profile (for security)
      userObj.bankDetails.accountNumber = '****' + userObj.bankDetails.accountNumber.slice(-4);
    }

    userObj.blockedByCurrent = blockedByCurrent;
    userObj.blockedByProfile = blockedByProfile;
    if (!isOwnProfile) {
      userObj.followRequestPending = (user?.followRequests || []).some(
        (entry) => entry?.from?.toString() === req.user._id.toString()
      );
    } else {
      userObj.pendingFollowRequestCount = (user?.followRequests || []).length;
    }
    userObj.shareMeta = buildUserShareMeta(req, userObj);
    userObj.canonicalPath = buildUserCanonicalPath(userObj);
    if (isOwnProfile) userObj.profileCompletion = getProfileCompletion(userObj);

    const attachScriptShareMeta = (list = []) => list.map((scriptDoc) => {
      if (!scriptDoc) return scriptDoc;
      const scriptObj = typeof scriptDoc.toObject === "function" ? scriptDoc.toObject() : scriptDoc;
      const fallbackWriterUsername =
        String(userObj?.writerProfile?.username || "").trim() &&
        String(scriptObj?.creator?._id || scriptObj?.creator || "") === String(userObj?._id || "")
          ? String(userObj.writerProfile.username || "").trim()
          : "";
      return {
        ...scriptObj,
        writerUsername: scriptObj?.writerUsername || fallbackWriterUsername,
        canonicalPath: buildScriptCanonicalPath({
          ...scriptObj,
          writerUsername: scriptObj?.writerUsername || fallbackWriterUsername,
        }),
        shareMeta: buildScriptShareMeta(req, scriptObj),
      };
    });

    res.json({
      user: userObj,
      posts,
      scripts: attachScriptShareMeta(scripts),
      deletedScripts: attachScriptShareMeta(deletedScripts),
      purchasedScripts: attachScriptShareMeta(purchasedScripts),
      bookmarkedScripts: attachScriptShareMeta(bookmarkedScripts),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const {
      name, bio, skills, profileImage, writerProfile,
      username,
      phone, dateOfBirth, address,
      // Investor / industry preference fields (from onboarding Step 3)
      preferredGenres, preferredBudgets, preferredFormats,
      // onboarding completion
      onboardingComplete,
      privacyPolicyAccepted,
      privacyPolicyVersion,
      // investor profile fields
      subRole, subRoleOther, company, jobTitle, imdbUrl, linkedInUrl, otherUrl, previousCredits, investmentRange, socialLinks, demographics,
      // bank details
      bankDetails,
      // notification preferences
      notificationPrefs,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = normalizeString(name) || user.name;
    user.bio = bio !== undefined ? normalizeString(bio) : user.bio;
    if (skills !== undefined) {
      user.skills = normalizeStringArray(skills, 25);
    }
    user.profileImage = resolveProfileImageUpdate(user.profileImage, profileImage);

    if (phone !== undefined) {
      user.phone = normalizeString(phone) || "";
    }

    if (dateOfBirth !== undefined) {
      const normalizedDob = normalizeOptionalDate(dateOfBirth);
      if (normalizedDob === "INVALID_DATE") {
        return res.status(400).json({ message: "Invalid date of birth" });
      }
      user.dateOfBirth = normalizedDob || undefined;
    }

    if (address !== undefined) {
      if (address === null) {
        user.address = undefined;
      } else {
        const normalizedAddress = normalizeAddressPayload(address);
        if (!normalizedAddress) {
          return res.status(400).json({ message: "Invalid address payload" });
        }
        user.address = normalizedAddress;
      }
      user.markModified("address");
    }

    // Investor / industry preference genres — save to mandates AND preferences
    if (preferredGenres !== undefined) {
      if (!user.preferences) user.preferences = {};
      user.preferences.genres = preferredGenres;
      user.markModified("preferences");
      // Also persist to mandates so getInvestorFeed can read from industryProfile
      if (!user.industryProfile) user.industryProfile = {};
      if (!user.industryProfile.mandates) user.industryProfile.mandates = {};
      user.industryProfile.mandates.genres = preferredGenres;
      delete user.industryProfile.mandates.budgetTiers;
      user.markModified("industryProfile");
    }
    if (preferredFormats !== undefined) {
      // Store in mandates.formats (no enum restriction); skip preferences.contentTypes
      // because that field has a strict enum incompatible with onboarding format strings
      if (!user.industryProfile) user.industryProfile = {};
      if (!user.industryProfile.mandates) user.industryProfile.mandates = {};
      user.industryProfile.mandates.formats = normalizeStringArray(preferredFormats, 40)
        .map(normalizePreferredFormat)
        .filter(Boolean);
      delete user.industryProfile.mandates.budgetTiers;
      user.markModified("industryProfile");
    }

    if (username !== undefined) {
      const normalizedUsername = String(normalizeString(username) || "").toLowerCase();

      if (!normalizedUsername) {
        return res.status(400).json({ message: "Username is required" });
      }

      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        return res.status(400).json({ message: "Username must be 3-30 characters and contain only lowercase letters, numbers, or underscores" });
      }

      const existingUserWithUsername = await User.exists({
        _id: { $ne: user._id },
        "writerProfile.username": normalizedUsername,
      });

      if (existingUserWithUsername) {
        return res.status(409).json({ message: "Username is already taken" });
      }

      if (!user.writerProfile) user.writerProfile = {};
      user.writerProfile.username = normalizedUsername;
      user.markModified("writerProfile");
    }

    // Investor profile fields
    if (subRole !== undefined || subRoleOther !== undefined || company !== undefined || jobTitle !== undefined || imdbUrl !== undefined || linkedInUrl !== undefined || otherUrl !== undefined || previousCredits !== undefined || investmentRange !== undefined || socialLinks !== undefined || demographics !== undefined) {
      if (!user.industryProfile) user.industryProfile = {};

      const resultingBio = normalizeString(bio !== undefined ? bio : user.bio) || "";
      if (!resultingBio) {
        return res.status(400).json({ message: "Bio is required for industry professional profile" });
      }
      user.bio = resultingBio;

      let nextSubRole = normalizeIndustrySubRole(user.industryProfile.subRole);
      if (subRole !== undefined) {
        const normalizedSubRole = normalizeIndustrySubRole(subRole);
        if (normalizedSubRole && !INDUSTRY_SUB_ROLE_VALUES.has(normalizedSubRole)) {
          return res.status(400).json({ message: "Invalid role focus option" });
        }
        user.industryProfile.subRole = normalizedSubRole || undefined;
        nextSubRole = normalizedSubRole;
      }

      if (subRoleOther !== undefined || nextSubRole === "other") {
        const normalizedSubRoleOther = normalizeString(subRoleOther);
        if (nextSubRole === "other") {
          if (!normalizedSubRoleOther) {
            return res.status(400).json({ message: "Please specify your role focus for 'Other'" });
          }
          user.industryProfile.subRoleOther = normalizedSubRoleOther;
        } else {
          user.industryProfile.subRoleOther = "";
        }
      }

      if (company !== undefined) user.industryProfile.company = normalizeString(company);
      if (jobTitle !== undefined) user.industryProfile.jobTitle = normalizeString(jobTitle);
      if (imdbUrl !== undefined) user.industryProfile.imdbUrl = normalizeString(imdbUrl);
      if (linkedInUrl !== undefined) user.industryProfile.linkedInUrl = normalizeString(linkedInUrl);
      if (otherUrl !== undefined) user.industryProfile.otherUrl = normalizeString(otherUrl);
      if (socialLinks !== undefined) {
        if (!user.industryProfile.socialLinks) user.industryProfile.socialLinks = {};
        user.industryProfile.socialLinks.instagram = normalizeString(socialLinks?.instagram);
        user.industryProfile.socialLinks.twitter = normalizeString(socialLinks?.twitter);
        user.industryProfile.socialLinks.website = normalizeString(socialLinks?.website);
        user.industryProfile.socialLinks.youtube = normalizeString(socialLinks?.youtube);
        user.industryProfile.socialLinks.facebook = normalizeString(socialLinks?.facebook);
      }
      if (demographics !== undefined) {
        if (!user.industryProfile.demographics) user.industryProfile.demographics = {};
        if (demographics?.gender !== undefined) {
          user.industryProfile.demographics.gender = normalizeString(demographics.gender);
        }
        if (demographics?.nationality !== undefined) {
          user.industryProfile.demographics.nationality = normalizeString(demographics.nationality);
        }
      }
      if (previousCredits !== undefined) user.industryProfile.previousCredits = sanitizePreviousCredits(previousCredits);
      if (investmentRange !== undefined) user.industryProfile.investmentRange = normalizeString(investmentRange);
      user.markModified("industryProfile");
    }

    // Onboarding completion
    if (onboardingComplete !== undefined) {
      if (["writer", "creator"].includes(String(user.role || "").toLowerCase())) {
        if (!user.writerProfile) user.writerProfile = {};
        user.writerProfile.onboardingComplete = onboardingComplete;
        user.markModified("writerProfile");
      } else {
        if (onboardingComplete === true && user.role === "investor" && !privacyPolicyAccepted && !user.privacyPolicyAccepted) {
          return res.status(400).json({ message: "Privacy policy acceptance is required" });
        }
        if (!user.industryProfile) user.industryProfile = {};
        user.industryProfile.onboardingComplete = onboardingComplete;
        user.markModified("industryProfile");
      }
    }

    if (privacyPolicyAccepted !== undefined) {
      user.privacyPolicyAccepted = Boolean(privacyPolicyAccepted);
      user.privacyPolicyAcceptedAt = privacyPolicyAccepted ? new Date() : undefined;
      user.privacyPolicyVersion = normalizeString(privacyPolicyVersion) || user.privacyPolicyVersion || "registration-privacy-v1";
    }

    // Writer-specific fields
    if (writerProfile) {
      if (!user.writerProfile) user.writerProfile = {};
      if (writerProfile.representationStatus !== undefined) {
        const representationStatus = normalizeString(writerProfile.representationStatus);
        if (!WRITER_REPRESENTATION_STATUSES.includes(representationStatus)) {
          return res.status(400).json({ message: "Invalid representation status" });
        }
        user.writerProfile.representationStatus = representationStatus;
      }
      if (writerProfile.agencyName !== undefined) {
        user.writerProfile.agencyName = normalizeString(writerProfile.agencyName) || "";
      }
      if (writerProfile.wgaMember !== undefined) {
        applyWriterMembershipSelection(user, "wga", Boolean(writerProfile.wgaMember));
      }
      if (writerProfile.sgaMember !== undefined) {
        applyWriterMembershipSelection(user, "swa", Boolean(writerProfile.sgaMember));
      }
      if (writerProfile.genres !== undefined) {
        user.writerProfile.genres = normalizeStringArray(writerProfile.genres);
      }
      if (writerProfile.specializedTags !== undefined) {
        user.writerProfile.specializedTags = normalizeStringArray(writerProfile.specializedTags, 5);
      }
      if (writerProfile.diversity !== undefined) {
        if (!user.writerProfile.diversity) user.writerProfile.diversity = {};
        if (writerProfile.diversity.gender !== undefined) {
          user.writerProfile.diversity.gender = normalizeString(writerProfile.diversity.gender);
        }
        if (writerProfile.diversity.ethnicity !== undefined) {
          user.writerProfile.diversity.ethnicity = normalizeString(writerProfile.diversity.ethnicity);
        }
      }

      user.markModified("writerProfile");
    }

    // Bank details
    if (bankDetails) {
      const security = ensureBankDetailsSecurity(user);
      if (security.isLocked) {
        return res.status(403).json({ message: BANK_DETAILS_BLOCKED_MESSAGE });
      }

      const sanitizedBankDetails = sanitizeBankPayload(bankDetails);
      const shouldQueueForReview = ["writer", "creator"].includes(user.role);

      if (shouldQueueForReview) {
        const hasRequired = Boolean(
          sanitizedBankDetails.accountHolderName &&
          sanitizedBankDetails.bankName &&
          sanitizedBankDetails.accountNumber &&
          sanitizedBankDetails.routingNumber
        );

        if (!hasRequired) {
          const updatedSecurity = await recordInvalidBankAttempt(user, "Missing required bank details fields");
          if (updatedSecurity.isLocked) {
            return res.status(403).json({ message: BANK_DETAILS_BLOCKED_MESSAGE });
          }
          return res.status(400).json({ message: "Account holder name, bank name, account number, and routing / IFSC number are required" });
        }

        const invalidBankDetailsMessage = getInvalidBankDetailsMessage(sanitizedBankDetails);
        if (invalidBankDetailsMessage) {
          const updatedSecurity = await recordInvalidBankAttempt(user, invalidBankDetailsMessage);
          if (updatedSecurity.isLocked) {
            return res.status(403).json({ message: BANK_DETAILS_BLOCKED_MESSAGE });
          }
          return res.status(400).json({ message: invalidBankDetailsMessage });
        }

        if (sanitizedBankDetails.country === "IN") {
          sanitizedBankDetails.currency = "INR";
        }

        const now = new Date();
        user.bankDetailsReview = {
          status: "pending",
          requestedDetails: sanitizedBankDetails,
          submittedAt: now,
          dueAt: new Date(now.getTime() + BANK_REVIEW_WINDOW_MS),
          reviewedAt: undefined,
          reviewedBy: undefined,
          adminNote: "",
        };

        security.invalidAttempts = 0;
        security.lastInvalidAttemptAt = undefined;
        security.lastInvalidReason = "";
        user.markModified("bankDetailsSecurity");
      } else {
        if (!user.bankDetails) user.bankDetails = {};
        if (sanitizedBankDetails.accountHolderName !== undefined) {
          user.bankDetails.accountHolderName = sanitizedBankDetails.accountHolderName;
        }
        if (sanitizedBankDetails.bankName !== undefined) {
          user.bankDetails.bankName = sanitizedBankDetails.bankName;
        }
        if (sanitizedBankDetails.accountNumber !== undefined) {
          if (!ACCOUNT_NUMBER_REGEX.test(sanitizedBankDetails.accountNumber)) {
            const updatedSecurity = await recordInvalidBankAttempt(user, "Account number must be 8-20 digits");
            if (updatedSecurity.isLocked) {
              return res.status(403).json({ message: BANK_DETAILS_BLOCKED_MESSAGE });
            }
            return res.status(400).json({ message: "Account number must be 8-20 digits" });
          }
          user.bankDetails.accountNumber = sanitizedBankDetails.accountNumber;
        }
        if (sanitizedBankDetails.routingNumber !== undefined) {
          const countryForRouting = sanitizedBankDetails.country || user.bankDetails.country || "IN";
          if (countryForRouting === "IN") {
            if (!IFSC_REGEX.test(sanitizedBankDetails.routingNumber)) {
              const updatedSecurity = await recordInvalidBankAttempt(user, "Invalid IFSC code format");
              if (updatedSecurity.isLocked) {
                return res.status(403).json({ message: BANK_DETAILS_BLOCKED_MESSAGE });
              }
              return res.status(400).json({ message: "Please enter a valid IFSC code (example: HDFC0001234)" });
            }
          } else if (!GENERIC_ROUTING_REGEX.test(sanitizedBankDetails.routingNumber)) {
            const updatedSecurity = await recordInvalidBankAttempt(user, "Invalid routing number format");
            if (updatedSecurity.isLocked) {
              return res.status(403).json({ message: BANK_DETAILS_BLOCKED_MESSAGE });
            }
            return res.status(400).json({ message: "Routing number must be 4-20 letters, numbers, or hyphen" });
          }
          user.bankDetails.routingNumber = sanitizedBankDetails.routingNumber;
        }
        if (sanitizedBankDetails.accountType !== undefined) {
          user.bankDetails.accountType = sanitizedBankDetails.accountType;
        }
        if (sanitizedBankDetails.swiftCode !== undefined) {
          user.bankDetails.swiftCode = sanitizedBankDetails.swiftCode;
        }
        if (sanitizedBankDetails.iban !== undefined) {
          user.bankDetails.iban = sanitizedBankDetails.iban;
        }
        if (sanitizedBankDetails.country !== undefined) {
          user.bankDetails.country = sanitizedBankDetails.country;
        }
        if (sanitizedBankDetails.currency !== undefined) {
          user.bankDetails.currency = sanitizedBankDetails.currency;
        }

        if (user.bankDetails.country === "IN" && user.bankDetails.currency !== "INR") {
          user.bankDetails.currency = "INR";
        }

        if (!user.bankDetails.addedAt) {
          user.bankDetails.addedAt = new Date();
        }
        user.bankDetails.isVerified = false;

        security.invalidAttempts = 0;
        security.lastInvalidAttemptAt = undefined;
        security.lastInvalidReason = "";
        user.markModified("bankDetailsSecurity");
      }
    }

    // Notification preferences
    if (notificationPrefs) {
      if (!user.notificationPrefs) user.notificationPrefs = {};
      if (notificationPrefs.smartMatchAlerts !== undefined) user.notificationPrefs.smartMatchAlerts = notificationPrefs.smartMatchAlerts;
      if (notificationPrefs.auditionAlerts !== undefined) user.notificationPrefs.auditionAlerts = notificationPrefs.auditionAlerts;
      if (notificationPrefs.holdAlerts !== undefined) user.notificationPrefs.holdAlerts = notificationPrefs.holdAlerts;
      if (notificationPrefs.viewAlerts !== undefined) user.notificationPrefs.viewAlerts = notificationPrefs.viewAlerts;
      user.markModified("notificationPrefs");
    }

    await user.save();

    // Sanitize bank details for response (hide full account number)
    let sanitizedBankDetails = null;
    if (user.bankDetails && user.bankDetails.accountNumber) {
      sanitizedBankDetails = {
        ...user.bankDetails.toObject(),
        accountNumber: maskAccountNumber(user.bankDetails.accountNumber)
      };
    }
    const sanitizedBankReview = sanitizeBankReviewForResponse(user.bankDetailsReview);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      role: user.role,
      bio: user.bio,
      skills: user.skills,
      profileImage: user.profileImage,
      writerProfile: user.writerProfile,
      industryProfile: user.industryProfile,
      preferences: user.preferences,
      notificationPrefs: user.notificationPrefs,
      bankDetails: sanitizedBankDetails,
      bankDetailsReview: sanitizedBankReview,
      shareMeta: buildUserShareMeta(req, user),
      canonicalPath: buildUserCanonicalPath(user),
      profileCompletion: getProfileCompletion(user),
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.["writerProfile.username"]) {
      return res.status(409).json({ message: "Username is already taken" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const followUser = async (req, res) => {
  try {
    const targetUserId = asObjectId(req.body.userId);
    if (!targetUserId) {
      return res.status(400).json({ message: "A valid userId is required" });
    }
    // The canonical hex form: the identity checks below are string comparisons, and comparing against
    // the raw body value would let a padded or upper-cased id slip past the "cannot follow yourself" guard.
    const targetUserIdString = targetUserId.toString();

    const userToFollow = await User.findById(targetUserId);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUserIdString === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const currentBlockedTarget = currentUser.blockedUsers?.some(
      (id) => id.toString() === targetUserIdString
    );
    const targetBlockedCurrent = userToFollow.blockedUsers?.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (currentBlockedTarget || targetBlockedCurrent) {
      return res.status(403).json({ message: "Follow action is not allowed for blocked users" });
    }

    if (currentUser.following.includes(targetUserIdString)) {
      return res.status(400).json({ message: "Already following this user" });
    }

    // If the user to follow is already following the current user, it's a "follow back"
    // and we bypass the approval requirement.
    const isFollowBack = (userToFollow.following || []).some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (isFollowBack) {
      currentUser.following.addToSet(userToFollow._id);
      userToFollow.followers.addToSet(currentUser._id);

      // Clean up any pending request just in case
      userToFollow.followRequests = (userToFollow.followRequests || []).filter(
        (entry) => entry?.from?.toString() !== req.user._id.toString()
      );

      await currentUser.save();
      await userToFollow.save();

      await Notification.create({
        user: userToFollow._id,
        type: "follow",
        from: currentUser._id,
        message: "followed you back",
      });

      return res.json({ message: "Followed back successfully", status: "following" });
    }

    // Otherwise, normal follow request flow
    const requiresApproval = true;

    if (requiresApproval) {
      const alreadyRequested = (userToFollow.followRequests || []).some(
        (entry) => entry?.from?.toString() === req.user._id.toString()
      );
      if (alreadyRequested) {
        return res.status(200).json({ message: "Follow request already pending", status: "pending" });
      }

      userToFollow.followRequests = userToFollow.followRequests || [];
      userToFollow.followRequests.push({ from: req.user._id, createdAt: new Date() });
      
      // Immediately increase the requester's following count
      currentUser.following.addToSet(userToFollow._id);
      
      // Cleanup sentFollowRequests to eventually deprecate it
      currentUser.sentFollowRequests = (currentUser.sentFollowRequests || []).filter(
        (entry) => entry?.to?.toString() !== userToFollow._id.toString()
      );

      await currentUser.save();
      await userToFollow.save();

      await Notification.create({
        user: userToFollow._id,
        type: "follow_request",
        from: req.user._id,
        message: "requested to follow you",
      });

      return res.json({ message: "Follow request sent", status: "pending" });
    }

    currentUser.following.push(targetUserId);
    userToFollow.followers.push(req.user._id);

    await currentUser.save();
    await userToFollow.save();

    // Send notification to the followed user
    await Notification.create({
      user: targetUserId,
      type: "follow",
      from: req.user._id,
      message: "started following you",
    });

    res.json({ message: "User followed successfully", status: "following" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List pending follow requests received by the current user (writer)
export const getFollowRequests = async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .select("followRequests")
      .populate({
        path: "followRequests.from",
        select: "name profileImage role writerProfile.username bio",
      });

    if (!me) return res.status(404).json({ message: "User not found" });

    const requests = (me.followRequests || [])
      .filter((entry) => entry?.from)
      .map((entry) => ({
        _id: entry._id,
        createdAt: entry.createdAt,
        from: entry.from,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptFollowRequest = async (req, res) => {
  try {
    const fromUserId = String(req.body.fromUserId || "").trim();
    if (!fromUserId) {
      return res.status(400).json({ message: "fromUserId is required" });
    }

    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const pendingIndex = (me.followRequests || []).findIndex(
      (entry) => entry?.from?.toString() === fromUserId
    );
    if (pendingIndex === -1) {
      return res.status(404).json({ message: "No pending follow request from this user" });
    }

    const requester = await User.findById(fromUserId);
    if (!requester) {
      // Cleanup stale request
      me.followRequests.splice(pendingIndex, 1);
      await me.save();
      return res.status(404).json({ message: "Requesting user no longer exists" });
    }

    // Move from pending to followers
    me.followRequests.splice(pendingIndex, 1);
    me.followers.addToSet(requester._id);
    
    // Ensure requester has `me._id` in their `following` array just in case
    requester.following.addToSet(me._id);

    await me.save();
    await requester.save();

    await Notification.create({
      user: requester._id,
      type: "follow_request_accepted",
      from: me._id,
      message: "accepted your follow request",
    });

    res.json({ message: "Follow request accepted", status: "accepted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectFollowRequest = async (req, res) => {
  try {
    const fromUserId = String(req.body.fromUserId || "").trim();
    if (!fromUserId) {
      return res.status(400).json({ message: "fromUserId is required" });
    }

    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ message: "User not found" });

    const before = (me.followRequests || []).length;
    me.followRequests = (me.followRequests || []).filter(
      (entry) => entry?.from?.toString() !== fromUserId
    );

    if (me.followRequests.length === before) {
      return res.status(404).json({ message: "No pending follow request from this user" });
    }

    await me.save();

    // The requester is no longer allowed to follow, so remove me from their `following` array.
    await User.updateOne(
      { _id: fromUserId },
      { 
        $pull: { 
          sentFollowRequests: { to: req.user._id },
          following: req.user._id
        } 
      }
    );

    // Best-effort: remove the pending request notification so it disappears from their bell.
    await Notification.deleteMany({
      user: req.user._id,
      type: "follow_request",
      from: fromUserId,
    });

    res.json({ message: "Follow request rejected", status: "rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Used by the requester to cancel a pending follow request they sent.
export const cancelFollowRequest = async (req, res) => {
  try {
    const toUserId = String(req.body.userId || "").trim();
    if (!toUserId) return res.status(400).json({ message: "userId is required" });

    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ message: "User not found" });

    me.sentFollowRequests = (me.sentFollowRequests || []).filter(
      (entry) => entry?.to?.toString() !== toUserId
    );
    me.following = (me.following || []).filter(
      (id) => id.toString() !== toUserId
    );
    await me.save();

    await User.updateOne(
      { _id: toUserId },
      { $pull: { followRequests: { from: req.user._id } } }
    );

    await Notification.deleteMany({
      user: toUserId,
      type: "follow_request",
      from: req.user._id,
    });

    res.json({ message: "Follow request cancelled", status: "cancelled" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cloudUpload = await uploadToCloudinary(req.file.buffer, {
      folder: "scriptbridge/profiles",
      resource_type: "image",
      public_id: `profile-${user._id}-${Date.now()}`,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    const imageUrl = cloudUpload.secure_url;
    user.profileImage = imageUrl;
    await user.save();

    res.json({ profileImage: imageUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadNotableCreditAttachments = async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ message: "Please attach at least one file" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedRole = String(user.role || "").toLowerCase();
    if (!INDUSTRY_PROFILE_UPLOAD_ROLES.has(normalizedRole)) {
      return res.status(403).json({ message: "Only industry professional accounts can upload notable credit files" });
    }

    if (!user.industryProfile) user.industryProfile = {};
    if (!Array.isArray(user.industryProfile.notableCreditAttachments)) {
      user.industryProfile.notableCreditAttachments = [];
    }

    const existingCount = user.industryProfile.notableCreditAttachments.length;
    if (existingCount + files.length > INDUSTRY_NOTABLE_ATTACHMENT_MAX_TOTAL) {
      return res.status(400).json({
        message: `You can store up to ${INDUSTRY_NOTABLE_ATTACHMENT_MAX_TOTAL} notable credit attachments`,
      });
    }

    const uploadedFiles = [];
    for (const [index, file] of files.entries()) {
      const cloudinaryResourceType = getCloudinaryUploadResourceType(file.mimetype);
      const uploadResult = await uploadToCloudinary(file.buffer, {
        folder: `scriptbridge/notable-credits/${user._id}`,
        resource_type: cloudinaryResourceType,
        public_id: `notable-credit-${user._id}-${Date.now()}-${index}`,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
      });

      uploadedFiles.push({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        resourceType: getNotableAttachmentResourceType(file.mimetype),
        cloudinaryResourceType,
        uploadedAt: new Date(),
      });
    }

    user.industryProfile.notableCreditAttachments.push(...uploadedFiles);
    user.markModified("industryProfile");
    await user.save();

    return res.json({
      message: "Notable credit attachments uploaded successfully",
      attachments: user.industryProfile.notableCreditAttachments,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to upload notable credit attachments" });
  }
};

export const getNotableCreditAttachmentAccessUrl = async (req, res) => {
  try {
    const publicId = normalizeString(req.query?.publicId);
    const fileUrl = normalizeString(req.query?.url);

    if (!publicId && !fileUrl) {
      return res.status(400).json({ message: "publicId or url is required" });
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const attachments = Array.isArray(user?.industryProfile?.notableCreditAttachments)
      ? user.industryProfile.notableCreditAttachments
      : [];

    const attachment = findNotableAttachment(attachments, { publicId, fileUrl });

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const mimeType = String(attachment?.mimeType || "").toLowerCase();
    if (mimeType !== "application/pdf") {
      return res.json({ url: attachment.url });
    }

    const attachmentPublicId = normalizeString(attachment?.publicId);
    if (!attachmentPublicId) {
      return res.json({ url: attachment.url });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
    const cloudinaryResourceType = resolveAttachmentCloudinaryResourceType(attachment);

    const signedUrl = buildPrivateDownloadUrl(attachmentPublicId, "pdf", {
      resource_type: cloudinaryResourceType,
      type: "upload",
      expires_at: expiresAt,
      attachment: false,
    });

    return res.json({ url: signedUrl });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to build attachment access URL" });
  }
};

export const getNotableCreditAttachmentFile = async (req, res) => {
  try {
    const publicId = normalizeString(req.query?.publicId);
    const fileUrl = normalizeString(req.query?.url);

    if (!publicId && !fileUrl) {
      return res.status(400).json({ message: "publicId or url is required" });
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const attachments = Array.isArray(user?.industryProfile?.notableCreditAttachments)
      ? user.industryProfile.notableCreditAttachments
      : [];
    const attachment = findNotableAttachment(attachments, { publicId, fileUrl });

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const mimeType = String(attachment?.mimeType || "").toLowerCase();
    if (mimeType !== "application/pdf") {
      return res.redirect(attachment.url);
    }

    const attachmentPublicId = normalizeString(attachment?.publicId);
    if (!attachmentPublicId) {
      return res.redirect(attachment.url);
    }

    const pdfBuffer = await fetchPdfBufferFromCloudinary({
      publicId: attachmentPublicId,
      attachmentUrl: normalizeString(attachment?.url),
      preferredResourceType: resolveAttachmentCloudinaryResourceType(attachment),
    });

    if (!pdfBuffer) {
      return res.status(502).json({ message: "Unable to load PDF attachment" });
    }

    const fileName = sanitizeInlineFileName(attachment?.fileName || "attachment.pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load attachment file" });
  }
};

export const removeNotableCreditAttachment = async (req, res) => {
  try {
    const publicId = normalizeString(req.body?.publicId);
    const fileUrl = normalizeString(req.body?.url);

    if (!publicId && !fileUrl) {
      return res.status(400).json({ message: "publicId or url is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.industryProfile) user.industryProfile = {};
    const attachments = Array.isArray(user.industryProfile.notableCreditAttachments)
      ? user.industryProfile.notableCreditAttachments
      : [];

    const attachmentIndex = attachments.findIndex((item) => {
      const itemPublicId = normalizeString(item?.publicId);
      const itemUrl = normalizeString(item?.url);
      if (publicId && itemPublicId === publicId) return true;
      if (fileUrl && itemUrl === fileUrl) return true;
      return false;
    });

    if (attachmentIndex === -1) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const [attachment] = attachments.splice(attachmentIndex, 1);

    const resourceType = String(attachment?.resourceType || "").toLowerCase();
    const cloudinaryResourceType =
      normalizeString(attachment?.cloudinaryResourceType) ||
      (resourceType === "video" ? "video" : resourceType === "document" ? "raw" : "image");
    const attachmentPublicId = normalizeString(attachment?.publicId);

    if (attachmentPublicId) {
      try {
        await deleteFromCloudinary(attachmentPublicId, { resource_type: cloudinaryResourceType });
      } catch {
        // Ignore Cloudinary cleanup failures to avoid blocking profile updates.
      }
    }

    user.industryProfile.notableCreditAttachments = attachments;
    user.markModified("industryProfile");
    await user.save();

    return res.json({
      message: "Attachment removed successfully",
      attachments: user.industryProfile.notableCreditAttachments,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to remove attachment" });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const targetUserId = asObjectId(req.body.userId);
    if (!targetUserId) {
      return res.status(400).json({ message: "A valid userId is required" });
    }
    const targetUserIdString = targetUserId.toString();

    const userToUnfollow = await User.findById(targetUserId);
    const currentUser = await User.findById(req.user._id);

    if (!userToUnfollow) {
      return res.status(404).json({ message: "User not found" });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserIdString
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    // Also clear any pending follow request in either direction so unfollow doubles as cancel.
    currentUser.sentFollowRequests = (currentUser.sentFollowRequests || []).filter(
      (entry) => entry?.to?.toString() !== targetUserIdString
    );
    userToUnfollow.followRequests = (userToUnfollow.followRequests || []).filter(
      (entry) => entry?.from?.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({ message: "User unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const targetUserId = asObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ message: "A valid userId is required" });
    }
    const targetUserIdString = targetUserId.toString();

    if (targetUserIdString === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const userToBlock = await User.findById(targetUserId);
    const currentUser = await User.findById(req.user._id);

    if (!userToBlock) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyBlocked = currentUser.blockedUsers?.some((id) => id.toString() === targetUserIdString);
    if (!alreadyBlocked) {
      currentUser.blockedUsers.push(targetUserId);
    }

    // Remove follow relationship in both directions on block.
    currentUser.following = (currentUser.following || []).filter((id) => id.toString() !== targetUserIdString);
    currentUser.followers = (currentUser.followers || []).filter((id) => id.toString() !== targetUserIdString);
    userToBlock.following = (userToBlock.following || []).filter((id) => id.toString() !== req.user._id.toString());
    userToBlock.followers = (userToBlock.followers || []).filter((id) => id.toString() !== req.user._id.toString());

    await currentUser.save();
    await userToBlock.save();

    return res.json({ message: "User blocked successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const currentUser = await User.findById(req.user._id);
    currentUser.blockedUsers = (currentUser.blockedUsers || []).filter((id) => id.toString() !== userId);
    await currentUser.save();

    return res.json({ message: "User unblocked successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id)
      .select("blockedUsers")
      .populate("blockedUsers", "name profileImage role");

    return res.json(currentUser?.blockedUsers || []);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the savedScripts from industryProfile
    const savedScriptIds = user.industryProfile?.savedScripts || [];

    // Populate the script details
    const scripts = await Script.find({ _id: { $in: savedScriptIds }, isDeleted: { $ne: true } })
      .populate("creator", "name profileImage")
      .sort({ createdAt: -1 });

    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addToWatchlist = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize savedScripts if it doesn't exist
    if (!user.industryProfile) {
      user.industryProfile = {};
    }
    if (!user.industryProfile.savedScripts) {
      user.industryProfile.savedScripts = [];
    }

    // Check if already in watchlist
    if (user.industryProfile.savedScripts.includes(scriptId)) {
      return res.status(400).json({ message: "Script already in watchlist" });
    }

    user.industryProfile.savedScripts.push(scriptId);
    await user.save();

    res.json({ message: "Script added to watchlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFromWatchlist = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.industryProfile?.savedScripts) {
      return res.status(400).json({ message: "Watchlist is empty" });
    }

    user.industryProfile.savedScripts = user.industryProfile.savedScripts.filter(
      (id) => id.toString() !== scriptId
    );
    await user.save();

    res.json({ message: "Script removed from watchlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────── SETTINGS ────────

export const updateSettings = async (req, res) => {
  try {
    const { notificationPrefs, isPrivate, allowIndustryContact, language, timezone, preferredCurrency } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (notificationPrefs !== undefined) {
      if (!user.notificationPrefs) user.notificationPrefs = {};
      if (notificationPrefs.smartMatchAlerts !== undefined) user.notificationPrefs.smartMatchAlerts = notificationPrefs.smartMatchAlerts;
      if (notificationPrefs.auditionAlerts !== undefined) user.notificationPrefs.auditionAlerts = notificationPrefs.auditionAlerts;
      if (notificationPrefs.holdAlerts !== undefined) user.notificationPrefs.holdAlerts = notificationPrefs.holdAlerts;
      if (notificationPrefs.viewAlerts !== undefined) user.notificationPrefs.viewAlerts = notificationPrefs.viewAlerts;
      user.markModified("notificationPrefs");
    }

    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (allowIndustryContact !== undefined) user.allowIndustryContact = allowIndustryContact;
    if (language !== undefined) user.language = normalizeLanguagePreference(language);
    if (timezone !== undefined) user.timezone = timezone;
    if (preferredCurrency !== undefined && ["INR", "USD"].includes(String(preferredCurrency).toUpperCase())) {
      user.preferredCurrency = String(preferredCurrency).toUpperCase();
    }
    if (!user.language) user.language = DEFAULT_LANGUAGE;

    await user.save();
    res.json({ message: "Settings updated", user: { isPrivate: user.isPrivate, allowIndustryContact: user.allowIndustryContact, language: user.language, timezone: user.timezone, preferredCurrency: user.preferredCurrency, notificationPrefs: user.notificationPrefs } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changeEmail = async (req, res) => {
  try {
    const { password, newEmail } = req.body;
    if (!password || !newEmail) return res.status(400).json({ message: "Password and new email are required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Password is incorrect" });

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (normalizedEmail === user.email) {
      return res.status(400).json({ message: "New email must be different from current email" });
    }

    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (existing) return res.status(409).json({ message: "Email is already in use" });

    const existingPending = await User.findOne({ pendingEmail: normalizedEmail, _id: { $ne: user._id } });
    if (existingPending) return res.status(409).json({ message: "Email is already pending verification for another user" });

    const otp = generateOTP();

    const emailResult = await sendOTPEmail(normalizedEmail, user.name, otp);
    if (!emailResult.success) {
      return res.status(500).json({ message: emailResult.error || "Failed to send verification code" });
    }

    // Keep current email active until OTP verification succeeds.
    user.pendingEmail = normalizedEmail;
    user.emailVerificationToken = hashOTP(otp);
    user.emailVerificationExpires = generateOTPExpiry();
    await user.save();
    res.json({
      message: "Verification code sent to new email. Current email remains active until verification.",
      email: user.email,
      pendingEmail: user.pendingEmail,
      requiresVerification: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendEmailVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const targetEmail = user.pendingEmail || user.email;
    if (!user.pendingEmail && user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const otp = generateOTP();
    user.emailVerificationToken = hashOTP(otp);
    user.emailVerificationExpires = generateOTPExpiry();
    await user.save();

    const emailResult = await sendOTPEmail(targetEmail, user.name, otp);
    if (!emailResult.success) {
      return res.status(500).json({ message: emailResult.error || "Failed to send verification code" });
    }

    res.json({ message: `Verification code sent to ${targetEmail}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmailVerificationCode = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "Verification code is required" });

    const normalizedOtp = normalizeOtpInput(otp);
    if (!isValidOtpInput(normalizedOtp)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.emailVerificationToken) return res.status(400).json({ message: "No verification code found. Please resend code." });

    if (!isHashedOTP(user.emailVerificationToken)) {
      user.emailVerificationToken = hashOTP(user.emailVerificationToken);
      await user.save();
    }

    if (isOTPExpired(user.emailVerificationExpires)) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
      return res.status(400).json({ message: "Verification code expired. Please resend code." });
    }

    if (!verifyHashedOTP(user.emailVerificationToken, normalizedOtp)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (user.pendingEmail) {
      const emailOwner = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } });
      if (emailOwner) {
        return res.status(409).json({ message: "Pending email is already used by another account" });
      }

      user.email = user.pendingEmail;
      user.pendingEmail = undefined;
    }

    if (isFilmIndustryProfessionalRole(user) && hasBusinessEmail(user.email)) {
      if (!user.subscription) {
        user.subscription = {
          plan: "free",
          accessTier: "film_industry_professional",
          accessStatus: "active",
          accessActivatedAt: new Date(),
        };
      } else if (user.subscription.accessTier !== "film_industry_professional" || user.subscription.accessStatus !== "active") {
        user.subscription.accessTier = "film_industry_professional";
        user.subscription.accessStatus = "active";
        user.subscription.accessActivatedAt = new Date();
      }
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully", emailVerified: true, email: user.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (String(user.role || "").toLowerCase() === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted from profile settings." });
    }

    if (user.isDeactivated) {
      return res.json({ message: "Account already deleted" });
    }

    // Soft-delete: deactivate account rather than hard-delete
    const now = new Date();
    const originalName = String(user.name || "").trim();
    const originalEmail = String(user.email || "").trim();
    const archivedProfile = buildArchivedUserProfileSnapshot(user);

    archivedProfile.isDeactivated = true;
    archivedProfile.deactivatedAt = now;
    archivedProfile.deactivatedBy = req.user._id;
    archivedProfile.isFrozen = true;
    archivedProfile.frozenAt = now;
    archivedProfile.frozenReason = "Account deleted by user";
    archivedProfile.frozenBy = req.user._id;
    archivedProfile.accountDeletion = {
      reason,
      requestedAt: now,
      source: "user",
      originalName,
      originalEmail,
      archivedAt: now,
      archivedBy: req.user._id,
    };

    user.accountDeletion = {
      reason,
      requestedAt: now,
      source: "user",
      originalName,
      originalEmail,
      archivedAt: now,
      archivedBy: req.user._id,
      archivedProfile,
    };

    user.isFrozen = true;
    user.frozenAt = now;
    user.frozenReason = "Account deleted by user";
    user.frozenBy = req.user._id;
    user.isDeactivated = true;
    user.deactivatedAt = now;
    user.deactivatedBy = req.user._id;
    user.isPrivate = true;
    user.name = "Deleted User";
    user.bio = "";
    user.phone = "";
    user.address = undefined;
    user.skills = [];
    user.profileImage = "";
    user.coverImage = "";
    user.followers = [];
    user.following = [];
    user.blockedUsers = [];
    user.favoriteScripts = [];
    user.pendingEmail = undefined;
    user.emailVerified = false;
    user.email = `deleted_${user._id}@deleted.local`;
    await user.save();

    await Promise.all([
      User.updateMany(
        { _id: { $ne: user._id } },
        {
          $pull: {
            followers: user._id,
            following: user._id,
            blockedUsers: user._id,
          },
        }
      ),
      Script.updateMany(
        { creator: user._id, isDeleted: { $ne: true } },
        {
          $set: {
            isDeleted: true,
            deletedAt: now,
          },
        }
      ),
    ]);

    const admins = await User.find({ role: "admin", isDeactivated: { $ne: true } }).select("_id").lean();
    if (admins.length > 0) {
      await Notification.insertMany(
        admins.map((admin) => ({
          user: admin._id,
          from: req.user._id,
          type: "admin_alert",
          message: `Account deletion request from ${originalName || "a user"}: ${reason}`,
        }))
      ).catch(() => null);
    }

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
