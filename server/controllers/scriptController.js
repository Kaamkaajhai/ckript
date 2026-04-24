import Script from "../models/Script.js";
import mongoose from "mongoose";
import ScriptOption from "../models/ScriptOption.js";
import ScriptPurchaseRequest from "../models/ScriptPurchaseRequest.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";
import Invoice from "../models/Invoice.js";
import Agreement from "../models/Agreement.js";
import {
  sendPurchaseRequestEmail,
  sendPurchaseApprovedEmail,
  sendPurchaseRejectedEmail,
} from "../utils/emailService.js";
import { generateAndSaveInvoicePdf } from "../utils/invoicePdf.js";
import { generateAndUploadAgreementPdfs } from "../utils/agreementPdf.js";
import { generateAndUploadScriptSubmissionPdf } from "../utils/scriptSubmissionPdf.js";
import { generateAndUploadPurchaseRequestAcceptancePdf } from "../utils/purchaseRequestAcceptancePdf.js";
import { notifyAdminWorkflowEvent } from "../utils/adminWorkflowAlerts.js";
import { CREDIT_PRICES } from "./creditsController.js";
import { buildScriptShareMeta } from "../utils/shareMeta.js";
import { getCurrentPurchaseTermsPolicy } from "../utils/termsPolicyService.js";
import { createRequire } from 'module';
import Razorpay from "razorpay";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { uploadToCloudinary } from "../config/cloudinary.js";
import {
  buildInvestorFeed,
  trackInvestorInteraction,
} from "../services/recommendationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization of Razorpay
let razorpayInstance = null;

const getRazorpay = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

const PUBLIC_SCRIPT_FILTER = {
  status: "published",
  isSold: { $ne: true },
  transactionStatus: { $ne: "sold_licensed" },
  purchaseRequestLocked: { $ne: true },
  isDeleted: { $ne: true },
};

const PROJECT_SPOTLIGHT_ACTIVATION_CREDITS = 310;
const PROJECT_SPOTLIGHT_EXTENSION_CREDITS = 150;
const PROJECT_SPOTLIGHT_DURATION_DAYS = 30;
const SCRIPT_UPLOAD_TERMS_VERSION = process.env.SCRIPT_UPLOAD_TERMS_VERSION || "2026-03-24";
const MAX_CUSTOM_INVESTOR_TERMS_LENGTH = 3000;
const SCRIPT_PURCHASE_PLATFORM_TAX_RATE = 0.05;
const MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH = 5000;
const LEGAL_MARKETPLACE_DISCLAIMER = "Please accept all required terms before continuing.";

const RIGHTS_TYPE_LABELS = {
  full_rights_sale: "Full Rights Sale (Ownership Transfer)",
  exclusive_license: "Exclusive License",
  custom_negotiation_required: "Custom Negotiation Required",
};

const MODIFICATION_RIGHTS_LABELS = {
  buyer_can_modify_freely: "Buyer can modify freely",
  buyer_must_consult_writer: "Buyer must consult writer before modification",
  writer_retains_creative_approval_rights: "Writer retains creative approval rights",
};

const PAYMENT_STRUCTURE_LABELS = {
  one_time_upfront_payment: "One-time upfront payment",
  lower_upfront_plus_royalty_percent: "Lower upfront + royalty %",
  revenue_sharing_model: "Revenue sharing model",
  custom_deal: "Custom deal",
};

const NEGOTIATION_MODE_LABELS = {
  fixed_terms_non_negotiable: "Fixed terms (non-negotiable)",
  open_to_discussion_after_purchase: "Open to discussion after purchase",
  ckript_not_involved: "Ckript not involved in negotiation",
};

const RIGHTS_TYPE_OPTIONS = new Set(Object.keys(RIGHTS_TYPE_LABELS));
const MODIFICATION_RIGHTS_OPTIONS = new Set(Object.keys(MODIFICATION_RIGHTS_LABELS));
const PAYMENT_STRUCTURE_OPTIONS = new Set(Object.keys(PAYMENT_STRUCTURE_LABELS));
const NEGOTIATION_MODE_OPTIONS = new Set(Object.keys(NEGOTIATION_MODE_LABELS));
const MIN_LICENSE_DURATION_MONTHS = 1;
const MAX_LICENSE_DURATION_MONTHS = 120;

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return Boolean(value);
};

const normalizeRightsLicensingInput = (incoming = {}, fallback = {}) => {
  const nextRightsType = RIGHTS_TYPE_OPTIONS.has(incoming?.rightsType)
    ? incoming.rightsType
    : (RIGHTS_TYPE_OPTIONS.has(fallback?.rightsType) ? fallback.rightsType : "custom_negotiation_required");

  const nextModificationRights = MODIFICATION_RIGHTS_OPTIONS.has(incoming?.modificationRights)
    ? incoming.modificationRights
    : (MODIFICATION_RIGHTS_OPTIONS.has(fallback?.modificationRights)
      ? fallback.modificationRights
      : "buyer_must_consult_writer");

  const nextPaymentStructure = PAYMENT_STRUCTURE_OPTIONS.has(incoming?.paymentStructure)
    ? incoming.paymentStructure
    : (PAYMENT_STRUCTURE_OPTIONS.has(fallback?.paymentStructure)
      ? fallback.paymentStructure
      : "one_time_upfront_payment");

  const nextNegotiationMode = NEGOTIATION_MODE_OPTIONS.has(incoming?.negotiationMode)
    ? incoming.negotiationMode
    : (NEGOTIATION_MODE_OPTIONS.has(fallback?.negotiationMode)
      ? fallback.negotiationMode
      : "fixed_terms_non_negotiable");

  const requestedDurationRaw = Number(incoming?.timeBound?.licenseDurationMonths);
  const fallbackDurationRaw = Number(fallback?.timeBound?.licenseDurationMonths);
  const requestedDuration = Number.isFinite(requestedDurationRaw)
    ? Math.max(0, Math.min(MAX_LICENSE_DURATION_MONTHS, Math.round(requestedDurationRaw)))
    : 0;
  const fallbackDuration = Number.isFinite(fallbackDurationRaw)
    ? Math.max(0, Math.min(MAX_LICENSE_DURATION_MONTHS, Math.round(fallbackDurationRaw)))
    : 0;
  let licenseDurationMonths = 0;
  if (nextRightsType === "exclusive_license") {
    if (requestedDuration >= MIN_LICENSE_DURATION_MONTHS) {
      licenseDurationMonths = requestedDuration;
    } else if (fallbackDuration >= MIN_LICENSE_DURATION_MONTHS) {
      licenseDurationMonths = fallbackDuration;
    } else {
      licenseDurationMonths = 12;
    }
  }

  const rawCustomConditions = String(
    incoming?.customConditions !== undefined
      ? incoming?.customConditions
      : (fallback?.customConditions || "")
  ).trim();

  const royaltyPercentageRaw = Number(
    incoming?.royaltySettings?.percentage !== undefined
      ? incoming?.royaltySettings?.percentage
      : fallback?.royaltySettings?.percentage
  );
  const royaltyPercentage = Number.isFinite(royaltyPercentageRaw)
    ? Math.min(100, Math.max(0, royaltyPercentageRaw))
    : 0;

  const requestedDurationType = String(
    incoming?.royaltySettings?.durationType !== undefined
      ? incoming?.royaltySettings?.durationType
      : (fallback?.royaltySettings?.durationType || "none")
  ).trim();
  const royaltyDurationType = ["none", "years", "project_lifetime"].includes(requestedDurationType)
    ? requestedDurationType
    : "none";

  const royaltyYearsRaw = Number(
    incoming?.royaltySettings?.durationYears !== undefined
      ? incoming?.royaltySettings?.durationYears
      : fallback?.royaltySettings?.durationYears
  );
  const royaltyDurationYears = Number.isFinite(royaltyYearsRaw)
    ? Math.max(0, Math.min(99, Math.round(royaltyYearsRaw)))
    : 0;

  const nextLegalAckIncoming = incoming?.legalAcknowledgement || {};
  const nextLegalAckFallback = fallback?.legalAcknowledgement || {};

  const normalized = {
    rightsType: nextRightsType,
    exclusivity: true,
    modificationRights: nextModificationRights,
    paymentStructure: nextPaymentStructure,
    royaltySettings: {
      percentage: royaltyPercentage,
      durationType: royaltyDurationType,
      durationYears: royaltyDurationType === "years" ? royaltyDurationYears : 0,
    },
    timeBound: {
      licenseDurationMonths,
      autoRevertToWriter: toBoolean(
        incoming?.timeBound?.autoRevertToWriter,
        toBoolean(fallback?.timeBound?.autoRevertToWriter, false)
      ),
    },
    negotiationMode: nextNegotiationMode,
    customConditions: rawCustomConditions.slice(0, MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH),
    legalAcknowledgement: {
      ownershipConfirmed: toBoolean(
        nextLegalAckIncoming?.ownershipConfirmed,
        toBoolean(nextLegalAckFallback?.ownershipConfirmed, false)
      ),
      platformTermsAccepted: toBoolean(
        nextLegalAckIncoming?.platformTermsAccepted,
        toBoolean(nextLegalAckFallback?.platformTermsAccepted, false)
      ),
      exclusivityUnderstood: toBoolean(
        nextLegalAckIncoming?.exclusivityUnderstood,
        toBoolean(nextLegalAckFallback?.exclusivityUnderstood, false)
      ),
      acknowledgedAt: nextLegalAckIncoming?.acknowledgedAt
        || nextLegalAckFallback?.acknowledgedAt
        || undefined,
      ipAddress: String(nextLegalAckIncoming?.ipAddress || nextLegalAckFallback?.ipAddress || "").trim(),
    },
    termsVersion: String(incoming?.termsVersion || fallback?.termsVersion || SCRIPT_UPLOAD_TERMS_VERSION).trim(),
    termsVersionNumber: Number(incoming?.termsVersionNumber || fallback?.termsVersionNumber || 1) || 1,
    lastUpdatedAt: new Date(),
  };

  const isRoyaltyStructure = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(nextPaymentStructure);
  if (!isRoyaltyStructure) {
    normalized.royaltySettings = {
      percentage: 0,
      durationType: "none",
      durationYears: 0,
    };
  }

  return normalized;
};

const validateRightsLicensingPayload = (rightsLicensing = {}) => {
  const errors = [];
  if (!RIGHTS_TYPE_OPTIONS.has(rightsLicensing?.rightsType)) {
    errors.push("Rights type is required.");
  }
  if (!MODIFICATION_RIGHTS_OPTIONS.has(rightsLicensing?.modificationRights)) {
    errors.push("Modification rights selection is required.");
  }
  if (!PAYMENT_STRUCTURE_OPTIONS.has(rightsLicensing?.paymentStructure)) {
    errors.push("Payment structure selection is required.");
  }
  if (!NEGOTIATION_MODE_OPTIONS.has(rightsLicensing?.negotiationMode)) {
    errors.push("Negotiation mode selection is required.");
  }

  if (rightsLicensing?.rightsType === "exclusive_license") {
    const durationMonths = Number(rightsLicensing?.timeBound?.licenseDurationMonths);
    if (!Number.isInteger(durationMonths)
      || durationMonths < MIN_LICENSE_DURATION_MONTHS
      || durationMonths > MAX_LICENSE_DURATION_MONTHS) {
      errors.push(`Exclusive license requires duration between ${MIN_LICENSE_DURATION_MONTHS} and ${MAX_LICENSE_DURATION_MONTHS} months.`);
    }
  }

  const isRoyaltyStructure = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(
    rightsLicensing?.paymentStructure
  );
  if (isRoyaltyStructure) {
    const pct = Number(rightsLicensing?.royaltySettings?.percentage || 0);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      errors.push("Royalty percentage must be between 0 and 100 for royalty-based structures.");
    }
  }

  const ack = rightsLicensing?.legalAcknowledgement || {};
  if (!ack?.ownershipConfirmed || !ack?.platformTermsAccepted || !ack?.exclusivityUnderstood) {
    errors.push("Writer legal acknowledgement is required for rights and licensing preferences.");
  }

  return errors;
};

const buildRightsLabels = (rights = {}) => {
  const durationMonths = Number(rights?.timeBound?.licenseDurationMonths || 0);
  return {
    rightsTypeLabel: RIGHTS_TYPE_LABELS[rights?.rightsType] || rights?.rightsType || "-",
    modificationRightsLabel: MODIFICATION_RIGHTS_LABELS[rights?.modificationRights] || rights?.modificationRights || "-",
    paymentStructureLabel: PAYMENT_STRUCTURE_LABELS[rights?.paymentStructure] || rights?.paymentStructure || "-",
    negotiationModeLabel: NEGOTIATION_MODE_LABELS[rights?.negotiationMode] || rights?.negotiationMode || "-",
    licenseDurationLabel:
      rights?.rightsType === "exclusive_license"
        ? (durationMonths ? `${durationMonths} months` : "Time-bound")
        : "Not time-bound",
  };
};

const getRequestIpAddress = (req) =>
  String(req.ip || req.connection?.remoteAddress || req.headers?.["x-forwarded-for"] || "").trim();

const getRequestUserAgent = (req) => String(req.get("user-agent") || "").trim();

const sanitizePdfFileName = (value = "script-submission-summary") => {
  const normalized = String(value || "script-submission-summary")
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim();
  if (!normalized) return "script-submission-summary.pdf";
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized}.pdf`;
};

const attachSubmissionSummaryPdfToScript = async ({ script, creator }) => {
  if (!script?._id) return script;

  const creatorDoc = creator?._id
    ? creator
    : await User.findById(script.creator).select("name email sid");

  if (!creatorDoc) {
    throw new Error("Writer record not found for submission PDF generation.");
  }

  const submissionSummaryPdf = await generateAndUploadScriptSubmissionPdf({
    script,
    creator: creatorDoc,
  });

  script.submissionSummaryPdf = {
    url: submissionSummaryPdf.url || "",
    publicId: submissionSummaryPdf.publicId || "",
    generatedAt: submissionSummaryPdf.generatedAt || new Date(),
  };
  script.markModified("submissionSummaryPdf");
  await script.save();
  return script;
};

const attachPurchaseRequestAcceptancePdf = async ({
  purchaseRequest,
  script,
  investor,
  writer,
  agreementPdfUrl = "",
}) => {
  if (!purchaseRequest?._id) return purchaseRequest;

  const [scriptDoc, investorDoc, writerDoc] = await Promise.all([
    script?._id ? script : Script.findById(purchaseRequest.script).select("title sid price"),
    investor?._id ? investor : User.findById(purchaseRequest.investor).select("name email sid role"),
    writer?._id ? writer : User.findById(purchaseRequest.writer).select("name email sid role"),
  ]);

  if (!scriptDoc || !investorDoc || !writerDoc) {
    throw new Error("Unable to load purchase request PDF participants.");
  }

  const acceptancePdf = await generateAndUploadPurchaseRequestAcceptancePdf({
    purchaseRequest,
    script: scriptDoc,
    investor: investorDoc,
    writer: writerDoc,
    agreementPdfUrl,
  });

  purchaseRequest.acceptancePdf = {
    url: acceptancePdf.url || "",
    publicId: acceptancePdf.publicId || "",
    generatedAt: acceptancePdf.generatedAt || new Date(),
  };
  purchaseRequest.markModified("acceptancePdf");
  await purchaseRequest.save();
  return purchaseRequest;
};

const markScriptAsLocked = async (script, buyerId) => {
  script.purchaseRequestLocked = true;
  script.purchaseRequestLockedBy = buyerId;
  script.purchaseRequestLockedAt = new Date();
  script.transactionStatus = "locked";
  await script.save();
};

const markScriptAsAvailable = async (script) => {
  script.purchaseRequestLocked = false;
  script.purchaseRequestLockedBy = null;
  script.purchaseRequestLockedAt = null;
  if (!script.isSold) {
    script.transactionStatus = "available";
  }
  await script.save();
};

const buildAgreementTermsSnapshot = ({
  script,
  writerUser,
  buyerUser,
  purchaseRequest,
  termsPolicy,
  pricing,
}) => {
  const rights = normalizeRightsLicensingInput(script?.rightsLicensing || {});
  const labels = buildRightsLabels(rights);
  const now = new Date();
  const licenseMonths = Number(rights?.timeBound?.licenseDurationMonths || 0);
  const expiresAt =
    rights?.rightsType === "exclusive_license" && licenseMonths > 0
      ? new Date(now.getTime() + licenseMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

  const royaltyTerms = rights?.royaltySettings?.percentage > 0
    ? `${rights.royaltySettings.percentage}% (${rights.royaltySettings.durationType === "years"
      ? `${rights.royaltySettings.durationYears} years`
      : rights.royaltySettings.durationType === "project_lifetime"
        ? "project lifetime"
        : "no duration specified"
    })`
    : "Not applicable";

  return {
    script: {
      scriptId: String(script?._id || ""),
      sid: script?.sid || "",
      title: script?.title || "",
      genre: script?.genre || script?.primaryGenre || "",
    },
    writer: {
      userId: String(writerUser?._id || script?.creator || ""),
      sid: writerUser?.sid || "",
      name: writerUser?.name || "",
      email: writerUser?.email || "",
    },
    buyer: {
      userId: String(buyerUser?._id || purchaseRequest?.investor || ""),
      sid: buyerUser?.sid || "",
      name: buyerUser?.name || "",
      email: buyerUser?.email || "",
      role: getPurchaseRequesterLabel(buyerUser || {}),
    },
    rights: {
      ...rights,
      ...labels,
      exclusivityClause: "Exclusive transaction: no parallel sale/license while this agreement is active.",
      licenseExpiryAt: expiresAt,
      customConditions: rights?.customConditions || "",
    },
    payment: {
      paymentStructure: rights?.paymentStructure,
      paymentStructureLabel: labels.paymentStructureLabel,
      baseAmount: pricing?.baseAmount || 0,
      baseAmountLabel: `INR ${Number(pricing?.baseAmount || 0).toFixed(2)}`,
      platformCharges: pricing?.platformTaxAmount || 0,
      platformChargesLabel: `INR ${Number(pricing?.platformTaxAmount || 0).toFixed(2)} (${Number(pricing?.platformTaxPercent || 0)}%)`,
      totalAmount: pricing?.totalAmount || pricing?.baseAmount || 0,
      totalAmountLabel: `INR ${Number(pricing?.totalAmount || pricing?.baseAmount || 0).toFixed(2)}`,
      royaltyTerms,
    },
    consentTimestamp: purchaseRequest?.termsAcceptance?.acceptedAt || now,
    legalDisclaimer: LEGAL_MARKETPLACE_DISCLAIMER,
    platformTermsVersion: termsPolicy?.version || "",
    platformTermsTitle: termsPolicy?.title || "",
    platformTermsContent: termsPolicy?.content || "",
  };
};

const createAgreementForSettledPurchase = async ({
  script,
  purchaseRequest,
  writerUser,
  buyerUser,
  pricing,
  req,
}) => {
  const termsPolicy = await getCurrentPurchaseTermsPolicy();
  const termsSnapshot = buildAgreementTermsSnapshot({
    script,
    writerUser,
    buyerUser,
    purchaseRequest,
    termsPolicy,
    pricing,
  });

  const expiresAt = termsSnapshot?.rights?.licenseExpiryAt || null;
  const agreement = await Agreement.create({
    script_id: script._id,
    writer_id: purchaseRequest.writer,
    buyer_id: purchaseRequest.investor,
    terms_json: termsSnapshot,
    status: "active",
    terms_policy_version: termsPolicy?.version || "",
    terms_policy_title: termsPolicy?.title || "",
    expires_at: expiresAt,
    activated_at: new Date(),
    consent_logs: {
      writer: {
        acknowledgedAt:
          script?.rightsLicensing?.legalAcknowledgement?.acknowledgedAt
          || script?.legal?.timestamp
          || script?.updatedAt
          || script?.createdAt
          || new Date(),
        ipAddress: script?.rightsLicensing?.legalAcknowledgement?.ipAddress || script?.legal?.ipAddress || "",
        userAgent: "",
      },
      buyer: {
        acknowledgedAt: purchaseRequest?.termsAcceptance?.acceptedAt || new Date(),
        ipAddress: purchaseRequest?.termsAcceptance?.acceptedIp || getRequestIpAddress(req),
        userAgent: purchaseRequest?.termsAcceptance?.acceptedUserAgent || getRequestUserAgent(req),
        acceptedPlatformTerms: Boolean(purchaseRequest?.termsAcceptance?.platformTermsAccepted),
        acceptedWriterTerms: Boolean(purchaseRequest?.termsAcceptance?.writerTermsAccepted),
        acceptedCustomWriterTerms: Boolean(purchaseRequest?.termsAcceptance?.customWriterTermsAccepted),
      },
      disclaimerAcknowledged: Boolean(purchaseRequest?.termsAcceptance?.legalDisclaimerAccepted),
    },
  });

  const pdfResult = await generateAndUploadAgreementPdfs({ agreement });

  agreement.writer_pdf_url = pdfResult?.writerPdfUrl || "";
  agreement.buyer_pdf_url = pdfResult?.buyerPdfUrl || "";
  await agreement.save();

  return agreement;
};

const expireActiveExclusiveLicenses = async ({ scriptId } = {}) => {
  const now = new Date();
  const query = {
    status: "active",
    expires_at: { $lte: now },
    "terms_json.rights.rightsType": "exclusive_license",
    "terms_json.rights.timeBound.autoRevertToWriter": true,
  };
  if (scriptId) {
    query.script_id = scriptId;
  }

  const expiredAgreements = await Agreement.find(query).lean();
  if (!expiredAgreements.length) return;

  const agreementIds = expiredAgreements.map((row) => row._id);
  await Agreement.updateMany(
    { _id: { $in: agreementIds } },
    { $set: { status: "expired" } }
  );

  for (const row of expiredAgreements) {
    const script = await Script.findById(row.script_id);
    if (!script) continue;
    if (script.isDeleted) continue;

    const buyerId = String(row.buyer_id || "");
    if (buyerId) {
      script.unlockedBy = (script.unlockedBy || []).filter((id) => String(id) !== buyerId);
      script.purchasedBy = (script.purchasedBy || []).filter((id) => String(id) !== buyerId);
    }

    script.isSold = false;
    script.purchaseRequestLocked = false;
    script.purchaseRequestLockedBy = null;
    script.purchaseRequestLockedAt = null;
    script.transactionStatus = "available";
    await script.save();
  }
};

const roundCurrencyAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getScriptPurchasePricing = (baseAmount) => {
  const cleanBaseAmount = roundCurrencyAmount(baseAmount);
  const platformTaxAmount = roundCurrencyAmount(cleanBaseAmount * SCRIPT_PURCHASE_PLATFORM_TAX_RATE);
  const totalAmount = roundCurrencyAmount(cleanBaseAmount + platformTaxAmount);

  return {
    baseAmount: cleanBaseAmount,
    platformTaxRate: SCRIPT_PURCHASE_PLATFORM_TAX_RATE,
    platformTaxPercent: Math.round(SCRIPT_PURCHASE_PLATFORM_TAX_RATE * 100),
    platformTaxAmount,
    totalAmount,
  };
};

const sanitizeCustomInvestorTerms = (value = "") => String(value || "").trim();

const getContentTypeFromFormat = (format = "", explicitContentType = "") => {
  if (explicitContentType) return explicitContentType;

  const raw = String(format || "").toLowerCase().trim();
  if (!raw) return "movie";
  if (raw.includes("song")) return "songs";
  if (raw.includes("standup") || raw.includes("stand-up")) return "standup_comedy";
  if (raw.includes("dialogue")) return "dialogues";
  if (raw.includes("poet") || raw.includes("poetry")) return "poet";
  if (raw.includes("web")) return "web_series";
  if (raw.includes("documentary")) return "documentary";
  if (raw.includes("anime") || raw.includes("cartoon") || raw.includes("animation")) return "anime";
  if (raw.includes("short")) return "short_film";
  if (raw.includes("tv") || raw.includes("series")) return "tv_series";
  if (raw.includes("book")) return "book";
  if (raw.includes("startup")) return "startup";
  return "movie";
};

const getInvalidRoleAgeRangeMessage = (roles = []) => {
  if (!Array.isArray(roles)) return "";

  for (let i = 0; i < roles.length; i += 1) {
    const role = roles[i] || {};
    const min = role?.ageRange?.min;
    const max = role?.ageRange?.max;

    if (min === undefined || min === null || min === "" || max === undefined || max === null || max === "") {
      continue;
    }

    const minAge = Number(min);
    const maxAge = Number(max);
    if (!Number.isFinite(minAge) || !Number.isFinite(maxAge) || minAge >= maxAge) {
      return `Role ${i + 1}: Min age must be less than max age.`;
    }
  }

  return "";
};

const PROJECT_CREATOR_ROLES = new Set(["writer", "creator"]);

const hasProjectCreatorAccess = (user) => {
  const role = String(user?.role || "").trim().toLowerCase();
  return PROJECT_CREATOR_ROLES.has(role);
};

const requireProjectCreatorAccess = (req, res) => {
  if (hasProjectCreatorAccess(req.user)) return true;
  res.status(403).json({ message: "Only writer accounts can create or submit projects." });
  return false;
};

const isSpotlightActive = (script, now = new Date()) => {
  const endAt = script?.promotion?.spotlightEndAt;
  return Boolean(endAt && new Date(endAt) >= now);
};

const shouldAutoSyncUploadSpotlight = (script, now = new Date()) => {
  if (!script) return false;
  if (script.status !== "published") return false;
  if (isSpotlightActive(script, now)) return false;
  if (script.promotion?.lastSpotlightPurchaseAt) return false;
  return Number(script.billing?.spotlightCreditsChargedAtUpload || 0) > 0;
};

const isAdminUploadedTrailer = (script) => {
  const hasUploadedTrailer = Boolean(script?.uploadedTrailerUrl && script?.trailerSource === "uploaded");
  if (!hasUploadedTrailer) return false;
  return (script?.trailerWriterFeedback?.note || "").trim() === "Trailer uploaded by admin";
};

const shouldQueueSpotlightAiTrailer = (script) => {
  const hasAiTrailer = Boolean(script?.trailerUrl);
  if (hasAiTrailer) return false;
  return !isAdminUploadedTrailer(script);
};

const applySpotlightPackageState = (script, now = new Date()) => {
  const spotlightEndsAt = new Date(now.getTime() + PROJECT_SPOTLIGHT_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const chargedAtUpload = Number(script.billing?.spotlightCreditsChargedAtUpload || 0);

  script.premium = true;
  script.isFeatured = true;
  script.verifiedBadge = true;
  script.services = {
    hosting: true,
    evaluation: true,
    aiTrailer: true,
    spotlight: true,
  };
  script.evaluationStatus = script.scriptScore?.overall ? "completed" : "requested";

  if (shouldQueueSpotlightAiTrailer(script) && !["requested", "generating"].includes(script.trailerStatus)) {
    script.trailerStatus = "requested";
  }

  script.promotion = {
    spotlightActive: true,
    pendingSpotlightActivation: false,
    spotlightStartAt: now,
    spotlightEndAt: spotlightEndsAt,
    lastSpotlightPurchaseAt: now,
    totalSpotlightCreditsSpent: Math.max(
      Number(script.promotion?.totalSpotlightCreditsSpent || 0),
      chargedAtUpload,
      PROJECT_SPOTLIGHT_ACTIVATION_CREDITS
    ),
  };

  script.billing = {
    ...(script.billing || {}),
    spotlightCreditsSpent: Math.max(
      Number(script.billing?.spotlightCreditsSpent || 0),
      chargedAtUpload,
      PROJECT_SPOTLIGHT_ACTIVATION_CREDITS
    ),
    lastSpotlightActivatedAt: now,
  };

  script.markModified("services");
  script.markModified("promotion");
  script.markModified("billing");
};

const getBlockedUserIdsForViewer = async (viewerId) => {
  if (!viewerId) return [];
  const currentUser = await User.findById(viewerId).select("blockedUsers").lean();
  const usersWhoBlockedCurrent = await User.find({ blockedUsers: viewerId }).select("_id").lean();
  return [
    ...(currentUser?.blockedUsers || []),
    ...usersWhoBlockedCurrent.map((u) => u._id),
  ];
};

const hasUserInIdArray = (arr = [], userId) =>
  Array.isArray(arr) && arr.some((id) => id?.toString?.() === userId?.toString?.());

const safeDecodePathSegment = (value = "") => {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (_error) {
    return String(value || "");
  }
};

const normalizeProjectHeadingSegment = (value = "") =>
  safeDecodePathSegment(value)
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeWriterUsernameSegment = (value = "") =>
  safeDecodePathSegment(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "");

const resolveScriptIdByPath = async ({ projectHeading, writerUsername }) => {
  const normalizedHeading = normalizeProjectHeadingSegment(projectHeading);
  const normalizedWriterUsername = normalizeWriterUsernameSegment(writerUsername);

  if (!normalizedHeading || !normalizedWriterUsername) {
    return "";
  }

  const creators = await User.find({
    $or: [
      { "writerProfile.username": normalizedWriterUsername },
      { username: normalizedWriterUsername },
    ],
  }).select("_id").lean();

  if (!creators.length) {
    return "";
  }

  const scripts = await Script.find({
    creator: { $in: creators.map((creator) => creator._id) },
  })
    .select("_id title createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const matchedScript = scripts.find(
    (scriptDoc) => normalizeProjectHeadingSegment(scriptDoc?.title) === normalizedHeading
  );

  return matchedScript?._id ? String(matchedScript._id) : "";
};

const resolveClientOriginFromRequest = (req) => {
  const originHeader = String(req.get("origin") || "").trim();
  if (originHeader) return originHeader;

  const refererHeader = String(req.get("referer") || "").trim();
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin;
    } catch (_error) {
      // Ignore malformed referer headers and fall back to env-based URL resolution.
    }
  }

  return "";
};

const getPurchaseRequesterLabel = (user = {}) => {
  const rawRole = String(user?.industryProfile?.subRole || user?.role || "").trim().toLowerCase();
  if (rawRole === "producer") return "Producer";
  if (rawRole === "director") return "Director";
  if (rawRole === "investor") return "Investor";
  if (rawRole === "industry" || rawRole === "professional") return "Industry Professional";
  return "Buyer";
};

const PURCHASE_INVOICE_PREFIX = "INV-SCP";

const buildScriptPurchaseInvoiceNumber = (paymentId = "") => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const paymentSuffix = String(paymentId || "").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase() || Date.now().toString().slice(-8);
  return `${PURCHASE_INVOICE_PREFIX}-${stamp}-${paymentSuffix}`;
};

const getSettledPurchaseQuery = (extra = {}) => ({
  ...extra,
  status: "approved",
  $or: [
    { paymentStatus: "released" },
    { amount: { $lte: 0 } },
  ],
});

const APPROVED_UNPAID_EXPIRY_HOURS = 72;
const APPROVED_UNPAID_EXPIRY_MS = APPROVED_UNPAID_EXPIRY_HOURS * 60 * 60 * 1000;
const APPROVED_UNPAID_EXPIRY_NOTE = `Auto-cancelled: buyer did not complete payment within ${APPROVED_UNPAID_EXPIRY_HOURS} hours of approval.`;
const APPROVED_UNPAID_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastApprovedUnpaidSweepAt = 0;

const getApprovedUnpaidExpiryCutoff = (now = new Date()) =>
  new Date(now.getTime() - APPROVED_UNPAID_EXPIRY_MS);

const getApprovedPaymentDueAt = (approvedAt = new Date()) =>
  new Date(new Date(approvedAt).getTime() + APPROVED_UNPAID_EXPIRY_MS);

const getApprovedUnpaidActiveClause = (now = new Date()) => ({
  status: "approved",
  paymentStatus: { $ne: "released" },
  amount: { $gt: 0 },
  $or: [
    { paymentDueAt: { $gt: now } },
    { paymentDueAt: { $exists: false }, updatedAt: { $gt: getApprovedUnpaidExpiryCutoff(now) } },
  ],
});

const expireApprovedUnpaidRequests = async ({ scriptId, userId, force = false } = {}) => {
  const now = new Date();
  const shouldRunGlobalSweep = !scriptId && !userId;
  if (shouldRunGlobalSweep && !force && Date.now() - lastApprovedUnpaidSweepAt < APPROVED_UNPAID_SWEEP_INTERVAL_MS) {
    return;
  }
  if (shouldRunGlobalSweep) {
    lastApprovedUnpaidSweepAt = Date.now();
  }

  const filters = [
    { status: "approved" },
    { paymentStatus: { $ne: "released" } },
    { amount: { $gt: 0 } },
    { $or: [{ paymentDueAt: { $exists: false } }, { paymentDueAt: { $lte: now } }] },
  ];
  if (scriptId) filters.push({ script: scriptId });
  if (userId) filters.push({ $or: [{ investor: userId }, { writer: userId }] });

  const requestsToProcess = await ScriptPurchaseRequest.find({ $and: filters })
    .select("_id script paymentDueAt updatedAt createdAt note")
    .lean();

  if (requestsToProcess.length === 0) {
    return;
  }

  const bulkOps = [];
  const scriptIdsToCheck = new Set();

  requestsToProcess.forEach((request) => {
    const approvedAt = request?.updatedAt || request?.createdAt || now;
    const dueAt = request?.paymentDueAt ? new Date(request.paymentDueAt) : getApprovedPaymentDueAt(approvedAt);
    const expiresNow = dueAt <= now;

    if (expiresNow) {
      const existingNote = String(request?.note || "").trim();
      const nextNote = existingNote.includes(APPROVED_UNPAID_EXPIRY_NOTE)
        ? existingNote
        : existingNote
          ? `${existingNote}\n${APPROVED_UNPAID_EXPIRY_NOTE}`
          : APPROVED_UNPAID_EXPIRY_NOTE;

      bulkOps.push({
        updateOne: {
          filter: { _id: request._id },
          update: {
            $set: {
              status: "cancelled",
              paymentStatus: "failed",
              settledAt: now,
              paymentDueAt: dueAt,
              note: nextNote,
            },
          },
        },
      });
      scriptIdsToCheck.add(request.script.toString());
      return;
    }

    if (!request?.paymentDueAt) {
      bulkOps.push({
        updateOne: {
          filter: { _id: request._id },
          update: {
            $set: {
              paymentDueAt: dueAt,
            },
          },
        },
      });
    }
  });

  if (bulkOps.length > 0) {
    await ScriptPurchaseRequest.bulkWrite(bulkOps);
  }

  if (scriptId) {
    scriptIdsToCheck.add(scriptId.toString());
  }

  const expiryCutoff = getApprovedUnpaidExpiryCutoff(now);
  for (const sid of scriptIdsToCheck) {
    const hasActiveRequests = await ScriptPurchaseRequest.exists({
      script: sid,
      $or: [
        { status: "pending" },
        {
          status: "approved",
          paymentStatus: { $ne: "released" },
          amount: { $gt: 0 },
          $or: [
            { paymentDueAt: { $gt: now } },
            { paymentDueAt: { $exists: false }, updatedAt: { $gt: expiryCutoff } },
          ],
        },
      ],
    });

    if (!hasActiveRequests) {
      const targetScript = await Script.findById(sid).select("isSold purchaseRequestLocked purchaseRequestLockedBy purchaseRequestLockedAt transactionStatus");
      if (targetScript) {
        targetScript.purchaseRequestLocked = false;
        targetScript.purchaseRequestLockedBy = null;
        targetScript.purchaseRequestLockedAt = null;
        if (!targetScript.isSold) {
          targetScript.transactionStatus = "available";
        }
        await targetScript.save();
      }
    }
  }
};

const getPurchasedUserIdSet = async (script) => {
  const approvedPurchaseRequests = await ScriptPurchaseRequest.find(
    getSettledPurchaseQuery({ script: script._id })
  ).select("investor").lean();

  const convertedOptions = await ScriptOption.find({
    script: script._id,
    status: "converted",
  }).select("holder").lean();

  return new Set(
    [
      ...(Array.isArray(script.unlockedBy) ? script.unlockedBy.map((id) => id?.toString?.()) : []),
      ...(Array.isArray(script.purchasedBy) ? script.purchasedBy.map((id) => id?.toString?.()) : []),
      ...approvedPurchaseRequests.map((row) => row?.investor?.toString?.()),
      ...convertedOptions.map((row) => row?.holder?.toString?.()),
    ].filter(Boolean)
  );
};

export const extractPdfText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file provided" });
    }

    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');

    const data = await pdfParse(req.file.buffer);

    // Quick sanitization: replace weird null bytes or excessive whitespace
    let text = data.text || "";
    // Standardize newlines
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    res.json({ text, numItems: data.numpages });
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    res.status(500).json({ message: "Failed to extract text from PDF", error: error.message });
  }
};

export const saveDraft = async (req, res) => {
  try {
    if (!requireProjectCreatorAccess(req, res)) {
      return;
    }

    const { scriptId, title, textContent, ...otherData } = req.body;

    // If we have an ID, update the existing draft
    if (scriptId) {
      const script = await Script.findById(scriptId);
      if (!script) return res.status(404).json({ message: "Script not found" });
      if (script.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (script.isDeleted) {
        return res.status(410).json({ message: "This project was deleted by creator and can no longer be edited." });
      }

      script.title = title || script.title;
      script.textContent = textContent !== undefined ? textContent : script.textContent;
      if (otherData.companyName !== undefined) script.companyName = String(otherData.companyName || "").trim();
      if (otherData.logline !== undefined) script.logline = otherData.logline;
      if (otherData.synopsis !== undefined) {
        script.synopsis = otherData.synopsis;
        script.description = otherData.synopsis;
      }
      if (otherData.format !== undefined) {
        script.format = otherData.format;
        if (otherData.format !== "other") {
          script.formatOther = "";
        }
        script.contentType = getContentTypeFromFormat(otherData.format);
      }
      if (otherData.contentType !== undefined) script.contentType = otherData.contentType;
      if (otherData.formatOther !== undefined) {
        script.formatOther = String(otherData.formatOther || "").trim();
      }
      if (otherData.pageCount !== undefined) script.pageCount = Number(otherData.pageCount) || 0;
      if (otherData.primaryGenre !== undefined) script.primaryGenre = otherData.primaryGenre;
      if (otherData.tags !== undefined) script.tags = Array.isArray(otherData.tags) ? otherData.tags : [];
      if (otherData.roles !== undefined) {
        const nextRoles = Array.isArray(otherData.roles) ? otherData.roles : [];
        const ageRangeError = getInvalidRoleAgeRangeMessage(nextRoles);
        if (ageRangeError) {
          return res.status(400).json({ message: ageRangeError });
        }
        script.roles = nextRoles;
      }
      if (otherData.classification !== undefined) {
        script.classification = {
          primaryGenre: otherData.classification?.primaryGenre ?? script.classification?.primaryGenre,
          secondaryGenre: otherData.classification?.secondaryGenre ?? script.classification?.secondaryGenre,
          tones: otherData.classification?.tones ?? script.classification?.tones ?? [],
          themes: otherData.classification?.themes ?? script.classification?.themes ?? [],
          settings: otherData.classification?.settings ?? script.classification?.settings ?? [],
        };
        script.markModified("classification");
      }

      if (otherData.legal !== undefined) {
        const incomingLegal = otherData.legal || {};
        const nextCustomInvestorTerms = sanitizeCustomInvestorTerms(incomingLegal.customInvestorTerms);
        if (nextCustomInvestorTerms.length > MAX_CUSTOM_INVESTOR_TERMS_LENGTH) {
          return res.status(400).json({ message: `Custom investor terms must be ${MAX_CUSTOM_INVESTOR_TERMS_LENGTH} characters or fewer.` });
        }

        const previousCustomInvestorTerms = sanitizeCustomInvestorTerms(script.legal?.customInvestorTerms);
        const hasChangedCustomTerms = previousCustomInvestorTerms !== nextCustomInvestorTerms;

        script.legal = {
          ...(script.legal || {}),
          agreedToTerms: incomingLegal.agreedToTerms ?? script.legal?.agreedToTerms ?? false,
          termsVersion: incomingLegal.termsVersion || script.legal?.termsVersion || SCRIPT_UPLOAD_TERMS_VERSION,
          customInvestorTerms: nextCustomInvestorTerms,
          customInvestorTermsUpdatedAt: hasChangedCustomTerms
            ? new Date()
            : (script.legal?.customInvestorTermsUpdatedAt || undefined),
        };
      }

      if (otherData.rightsLicensing !== undefined) {
        const normalizedRights = normalizeRightsLicensingInput(
          otherData.rightsLicensing || {},
          script.rightsLicensing || {}
        );
        script.rightsLicensing = {
          ...(script.rightsLicensing || {}),
          ...normalizedRights,
        };
        script.markModified("rightsLicensing");
      }

      await script.save();
      return res.json(script);
    }

    // Otherwise create a new draft
    const { _id, id, sid, ...safeOtherData } = otherData || {};

    if (safeOtherData.legal !== undefined) {
      const incomingLegal = safeOtherData.legal || {};
      const nextCustomInvestorTerms = sanitizeCustomInvestorTerms(incomingLegal.customInvestorTerms);
      if (nextCustomInvestorTerms.length > MAX_CUSTOM_INVESTOR_TERMS_LENGTH) {
        return res.status(400).json({ message: `Custom investor terms must be ${MAX_CUSTOM_INVESTOR_TERMS_LENGTH} characters or fewer.` });
      }

      safeOtherData.legal = {
        ...(incomingLegal || {}),
        customInvestorTerms: nextCustomInvestorTerms,
        customInvestorTermsUpdatedAt: nextCustomInvestorTerms ? new Date() : undefined,
      };
    }

    if (safeOtherData.rightsLicensing !== undefined) {
      safeOtherData.rightsLicensing = normalizeRightsLicensingInput(
        safeOtherData.rightsLicensing || {},
        {}
      );
    }

    const newDraft = await Script.create({
      creator: req.user._id,
      title: title || "Untitled Draft",
      textContent: textContent || "",
      status: "draft",
      ...safeOtherData,
      contentType: getContentTypeFromFormat(safeOtherData.format, safeOtherData.contentType),
    });

    res.status(201).json(newDraft);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteScript = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (script.isDeleted) {
      return res.json({ message: "Project already deleted", softDeleted: true });
    }

    const purchasedUserIds = await getPurchasedUserIdSet(script);
    if (purchasedUserIds.size > 0) {
      const mergedIds = Array.from(purchasedUserIds).map((id) => new mongoose.Types.ObjectId(id));
      script.unlockedBy = mergedIds;
      script.purchasedBy = mergedIds;
    }

    script.isDeleted = true;
    script.deletedAt = new Date();
    script.purchaseRequestLocked = false;
    script.purchaseRequestLockedBy = null;
    script.purchaseRequestLockedAt = null;
    await script.save();

    console.info("[AUDIT] Script soft deleted", {
      scriptId: script._id.toString(),
      scriptSid: script.sid || "",
      deletedBy: req.user._id.toString(),
      purchasedUserCount: purchasedUserIds.size,
      deletedAt: script.deletedAt.toISOString(),
    });

    await notifyAdminWorkflowEvent({
      title: "Writer Project Deleted",
      section: "approvals",
      actorId: req.user._id,
      scriptId: script._id,
      message: `Project "${script.title}" was deleted by the creator (soft-delete).`,
      metadata: {
        scriptId: script._id,
        scriptSid: script.sid || "",
        writerId: req.user._id,
        isDeleted: true,
        purchasedUserCount: purchasedUserIds.size,
      },
    }).catch(() => null);

    return res.json({
      message: purchasedUserIds.size > 0
        ? "Project removed from platform listings. Existing buyers retain access."
        : "Project removed from platform listings.",
      softDeleted: true,
      isDeleted: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyDrafts = async (req, res) => {
  try {
    const drafts = await Script.find({ creator: req.user._id, status: "draft", isDeleted: { $ne: true } })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyScripts = async (req, res) => {
  try {
    const scripts = await Script.find({ creator: req.user._id, status: { $ne: "draft" }, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .select("_id title logline description synopsis genre contentType coverImage premium price views services scriptScore platformScore status adminApproved rejectionReason creator createdAt publishedAt")
      .populate("creator", "name profileImage")
      .lean();
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateScript = async (req, res) => {
  try {
    if (!requireProjectCreatorAccess(req, res)) {
      return;
    }

    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this script" });
    }
    if (script.isDeleted) {
      return res.status(410).json({ message: "This project was deleted by creator and can no longer be edited." });
    }

    const {
      title, logline, format, pageCount, classification,
      formatOther,
      scriptUrl, description, synopsis, textContent, fileUrl,
      coverImage, genre, contentType, premium, price, roles, tags, budget, holdFee, services, legal,
      rightsLicensing,
    } = req.body;

    if (!legal?.agreedToTerms) {
      return res.status(400).json({ message: "Script Upload Terms & Conditions acceptance is required." });
    }

    const normalizedRights = normalizeRightsLicensingInput(
      rightsLicensing || script.rightsLicensing || {},
      script.rightsLicensing || {}
    );
    normalizedRights.legalAcknowledgement = {
      ...(normalizedRights.legalAcknowledgement || {}),
      acknowledgedAt: normalizedRights?.legalAcknowledgement?.acknowledgedAt || new Date(),
      ipAddress: normalizedRights?.legalAcknowledgement?.ipAddress || getRequestIpAddress(req),
    };

    const rightsValidationErrors = validateRightsLicensingPayload(normalizedRights);
    if (rightsValidationErrors.length > 0) {
      return res.status(400).json({ message: rightsValidationErrors[0] });
    }

    if (logline !== undefined && String(logline).trim().length > 50) {
      return res.status(400).json({ message: "Logline must be 50 characters or fewer" });
    }

    if (format === "other" && !String(formatOther || script.formatOther || "").trim()) {
      return res.status(400).json({ message: "Please specify the format when selecting Other." });
    }

    if (title) script.title = title;
    if (logline !== undefined) script.logline = logline;
    if (format) {
      script.format = format;
      if (format !== "other") {
        script.formatOther = "";
      }
      if (contentType === undefined) {
        script.contentType = getContentTypeFromFormat(format);
      }
    }
    if (contentType !== undefined) script.contentType = contentType;
    if (formatOther !== undefined) {
      script.formatOther = String(formatOther || "").trim();
    }
    if (pageCount) script.pageCount = Number(pageCount);
    if (textContent !== undefined) script.textContent = textContent;
    if (description !== undefined) script.description = description;
    if (synopsis !== undefined) script.synopsis = synopsis;
    const realUrl = scriptUrl || fileUrl;
    if (realUrl && !realUrl.includes("placeholder-url.com")) script.fileUrl = realUrl;
    if (coverImage) script.coverImage = coverImage;
    if (premium !== undefined) script.premium = premium;
    if (price !== undefined) script.price = Number(price);
    if (roles) script.roles = roles;
    if (tags) script.tags = tags;
    if (budget) script.budget = budget;
    if (holdFee) script.holdFee = holdFee;

    if (classification) {
      const g = classification.primaryGenre || script.classification?.primaryGenre;
      script.genre = genre || g;
      script.primaryGenre = g;
      script.classification = {
        primaryGenre: classification.primaryGenre ?? script.classification?.primaryGenre,
        secondaryGenre: classification.secondaryGenre ?? script.classification?.secondaryGenre,
        tones: classification.tones ?? script.classification?.tones ?? [],
        themes: classification.themes ?? script.classification?.themes ?? [],
        settings: classification.settings ?? script.classification?.settings ?? [],
      };
      script.markModified("classification");
    } else if (genre) {
      script.genre = genre;
    }

    if (services) {
      script.services = {
        hosting: services.hosting ?? script.services?.hosting ?? true,
        evaluation: services.evaluation ?? script.services?.evaluation ?? false,
        aiTrailer: services.aiTrailer ?? script.services?.aiTrailer ?? false,
        spotlight: services.spotlight ?? script.services?.spotlight ?? false,
      };
      script.markModified("services");
    }

    if (legal?.agreedToTerms !== undefined) {
      const nextCustomInvestorTerms = sanitizeCustomInvestorTerms(legal?.customInvestorTerms);
      if (nextCustomInvestorTerms.length > MAX_CUSTOM_INVESTOR_TERMS_LENGTH) {
        return res.status(400).json({ message: `Custom investor terms must be ${MAX_CUSTOM_INVESTOR_TERMS_LENGTH} characters or fewer.` });
      }

      const previousCustomInvestorTerms = sanitizeCustomInvestorTerms(script.legal?.customInvestorTerms);
      const hasChangedCustomTerms = previousCustomInvestorTerms !== nextCustomInvestorTerms;

      script.legal = {
        agreedToTerms: legal.agreedToTerms,
        timestamp: legal.timestamp || script.legal?.timestamp || new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        termsVersion: legal.termsVersion || script.legal?.termsVersion || SCRIPT_UPLOAD_TERMS_VERSION,
        customInvestorTerms: nextCustomInvestorTerms,
        customInvestorTermsUpdatedAt: hasChangedCustomTerms
          ? new Date()
          : (script.legal?.customInvestorTermsUpdatedAt || undefined),
      };
    }

    script.rightsLicensing = normalizedRights;
    script.markModified("rightsLicensing");

    const wasPendingApproval = script.status === "pending_approval";
    script.status = "pending_approval";
    await script.save();
    try {
      await attachSubmissionSummaryPdfToScript({ script, creator: req.user });
    } catch (pdfError) {
      console.error("[updateScript] Failed to generate submission summary PDF:", pdfError.message);
    }

    res.json(script);

    // Non-critical notifications run after response to reduce submit latency.
    (async () => {
      const tasks = [];

      if (!wasPendingApproval) {
        tasks.push(
          notifyAdminWorkflowEvent({
            title: "Writer Project Submitted For Approval",
            section: "approvals",
            actorId: req.user._id,
            scriptId: script._id,
            message: `Project "${script.title}" was submitted for admin approval by ${req.user.name || "a writer"}.`,
            metadata: {
              scriptId: script._id,
              writerId: req.user._id,
              writerEmail: req.user.email || "",
              source: "update-script",
            },
          })
        );
      }

      if (script.services?.aiTrailer && ["requested", "generating"].includes(script.trailerStatus)) {
        tasks.push(
          notifyAdminWorkflowEvent({
            title: "AI Trailer Approval Request",
            section: "trailers",
            actorId: req.user._id,
            scriptId: script._id,
            message: `AI trailer requested for "${script.title}" and is waiting in admin queue.`,
            metadata: {
              scriptId: script._id,
              writerId: req.user._id,
              trailerStatus: script.trailerStatus,
              source: "update-script",
            },
          })
        );
      }

      if (tasks.length) {
        const results = await Promise.allSettled(tasks);
        const rejected = results.filter((r) => r.status === "rejected");
        if (rejected.length > 0) {
          console.error(`[updateScript] ${rejected.length} post-submit notification task(s) failed`);
        }
      }
    })();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadScript = async (req, res) => {
  try {
    if (!requireProjectCreatorAccess(req, res)) {
      return;
    }

    const {
      scriptId,
      title,
      companyName,
      logline,
      format,
      formatOther,
      pageCount,
      classification,
      scriptUrl,
      services,
      legal,
      rightsLicensing,
      // Legacy fields for backward compatibility
      description,
      synopsis,
      fullContent,
      textContent,
      fileUrl,
      coverImage,
      genre,
      contentType,
      isPremium,
      premium,
      price,
      roles,
      tags,
      budget,
      holdFee
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (logline !== undefined && String(logline).trim().length > 50) {
      return res.status(400).json({ message: "Logline must be 50 characters or fewer" });
    }
    if (format === "other" && !String(formatOther || "").trim()) {
      return res.status(400).json({ message: "Please specify the format when selecting Other." });
    }
    if (!synopsis || String(synopsis).trim().length === 0) {
      return res.status(400).json({ message: "Synopsis is required" });
    }
    if (!scriptUrl && !fileUrl && !textContent) {
      return res.status(400).json({ message: "Script file or text content is required" });
    }
    const ageRangeError = getInvalidRoleAgeRangeMessage(roles);
    if (ageRangeError) {
      return res.status(400).json({ message: ageRangeError });
    }

    const customInvestorTerms = sanitizeCustomInvestorTerms(legal?.customInvestorTerms);
    if (customInvestorTerms.length > MAX_CUSTOM_INVESTOR_TERMS_LENGTH) {
      return res.status(400).json({ message: `Custom investor terms must be ${MAX_CUSTOM_INVESTOR_TERMS_LENGTH} characters or fewer.` });
    }

    const normalizedRights = normalizeRightsLicensingInput(rightsLicensing || {}, {});
    normalizedRights.legalAcknowledgement = {
      ...(normalizedRights.legalAcknowledgement || {}),
      acknowledgedAt: normalizedRights?.legalAcknowledgement?.acknowledgedAt || new Date(),
      ipAddress: normalizedRights?.legalAcknowledgement?.ipAddress || getRequestIpAddress(req),
    };

    const rightsValidationErrors = validateRightsLicensingPayload(normalizedRights);
    if (rightsValidationErrors.length > 0) {
      return res.status(400).json({ message: rightsValidationErrors[0] });
    }

    const isPremiumAccess = Boolean(isPremium || premium) && Number(price || 0) > 0;
    const effectivePrice = isPremiumAccess ? Number(price || 0) : 0;

    // Calculate credits needed for selected services
    let creditsRequired = 0;
    if (services?.evaluation) creditsRequired += CREDIT_PRICES.AI_EVALUATION;
    if (services?.aiTrailer) creditsRequired += CREDIT_PRICES.AI_TRAILER;
    if (services?.spotlight) creditsRequired += PROJECT_SPOTLIGHT_ACTIVATION_CREDITS;

    const creator = await User.findById(req.user._id);
    if (!creator) {
      return res.status(404).json({ message: "User not found" });
    }
    const creditsBalanceBefore = creator.credits?.balance || 0;
    let creditsBalanceAfter = creditsBalanceBefore;

    // Check and deduct credits if services are selected
    if (creditsRequired > 0) {
      const userBalance = creator.credits?.balance || 0;

      if (userBalance < creditsRequired) {
        return res.status(402).json({
          message: `Insufficient credits. You need ${creditsRequired} credits but have ${userBalance}.`,
          requiresCredits: true,
          required: creditsRequired,
          balance: userBalance,
          shortfall: creditsRequired - userBalance
        });
      }

      // Deduct credits
      creator.credits.balance -= creditsRequired;
      creator.credits.totalSpent += creditsRequired;

      // Add transaction record for each service
      if (services?.evaluation) {
        creator.credits.transactions.push({
          type: "spent",
          amount: -CREDIT_PRICES.AI_EVALUATION,
          description: `AI Evaluation for "${title}"`,
          reference: `EVAL-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date()
        });
      }

      if (services?.aiTrailer) {
        creator.credits.transactions.push({
          type: "spent",
          amount: -CREDIT_PRICES.AI_TRAILER,
          description: `AI Trailer for "${title}"`,
          reference: `TRAILER-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date()
        });
      }

      if (services?.spotlight) {
        creator.credits.transactions.push({
          type: "spent",
          amount: -PROJECT_SPOTLIGHT_ACTIVATION_CREDITS,
          description: `Project Spotlight package for "${title}"`,
          reference: `SPOTUP-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date()
        });
      }

      await creator.save();
      creditsBalanceAfter = creator.credits?.balance || 0;
    }

    // Build the script document
    const scriptData = {
      creator: req.user._id,
      title,
      companyName: String(companyName || "").trim(),
      logline: logline ? String(logline).trim() : "",
      description: synopsis,
      synopsis: synopsis,
      fullContent,
      textContent,
      fileUrl: scriptUrl || fileUrl,
      pageCount,
      coverImage,
      genre: genre || classification?.primaryGenre,
      contentType: getContentTypeFromFormat(format, contentType),
      premium: isPremium || premium || false,
      price: price || 0,
      roles: roles || [],
      tags: tags || [],
      budget,
      holdFee: holdFee || 200,

      // New fields from the 5-step wizard
      format: format || "feature_film",
      formatOther: format === "other" ? String(formatOther || "").trim() : "",
      primaryGenre: classification?.primaryGenre || genre,
      classification: classification ? {
        primaryGenre: classification.primaryGenre,
        secondaryGenre: classification.secondaryGenre,
        tones: classification.tones || [],
        themes: classification.themes || [],
        settings: classification.settings || []
      } : undefined,

      // Services tracking
      services: services ? {
        hosting: services.hosting !== undefined ? services.hosting : true,
        evaluation: services.evaluation || false,
        aiTrailer: services.aiTrailer || false,
        spotlight: services.spotlight || false,
      } : { hosting: true, evaluation: false, aiTrailer: false, spotlight: false },
      billing: {
        evaluationCreditsCharged: services?.evaluation ? CREDIT_PRICES.AI_EVALUATION : 0,
        aiTrailerCreditsCharged: services?.aiTrailer ? CREDIT_PRICES.AI_TRAILER : 0,
        spotlightCreditsChargedAtUpload: services?.spotlight ? PROJECT_SPOTLIGHT_ACTIVATION_CREDITS : 0,
        evaluationCreditsChargedAtUpload: services?.evaluation ? CREDIT_PRICES.AI_EVALUATION : 0,
        aiTrailerCreditsChargedAtUpload: services?.aiTrailer ? CREDIT_PRICES.AI_TRAILER : 0,
        evaluationCreditsRefunded: 0,
        aiTrailerCreditsRefunded: 0,
        spotlightCreditsSpent: services?.spotlight ? PROJECT_SPOTLIGHT_ACTIVATION_CREDITS : 0,
        lastSpotlightRefundCredits: 0,
      },
      promotion: services?.spotlight
        ? {
            spotlightActive: false,
            pendingSpotlightActivation: true,
            totalSpotlightCreditsSpent: PROJECT_SPOTLIGHT_ACTIVATION_CREDITS,
          }
        : undefined,
      evaluationStatus: services?.evaluation ? "requested" : "none",

      // Legal compliance
      legal: legal ? {
        agreedToTerms: legal.agreedToTerms || false,
        timestamp: legal.timestamp || new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        termsVersion: legal.termsVersion || SCRIPT_UPLOAD_TERMS_VERSION,
        customInvestorTerms,
        customInvestorTermsUpdatedAt: customInvestorTerms ? new Date() : undefined,
      } : undefined,

      rightsLicensing: {
        ...normalizedRights,
        termsVersion: normalizedRights.termsVersion || legal?.termsVersion || SCRIPT_UPLOAD_TERMS_VERSION,
      },

      // AI Trailer status initialization
      trailerStatus: services?.aiTrailer ? "generating" : "none",

      status: "pending_approval" // Requires admin approval before publishing
    };

    let script;

    if (scriptId) {
      const existingDraft = await Script.findById(scriptId);

      if (!existingDraft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (existingDraft.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to publish this draft" });
      }

      if (existingDraft.isDeleted) {
        return res.status(410).json({ message: "This draft was deleted and cannot be published." });
      }

      if (existingDraft.status !== "draft") {
        return res.status(409).json({ message: "This project is already submitted." });
      }

      existingDraft.set(scriptData);
      script = await existingDraft.save();
    } else {
      script = await Script.create(scriptData);
    }

    try {
      script = await attachSubmissionSummaryPdfToScript({ script, creator });
    } catch (pdfError) {
      console.error("[uploadScript] Failed to generate submission summary PDF:", pdfError.message);
    }

    res.status(201).json(script);

    // Run non-critical tasks post-response to keep submit API fast.
    (async () => {
      const tasks = [
        notifyAdminWorkflowEvent({
          title: "Writer Project Submitted For Approval",
          section: "approvals",
          actorId: req.user._id,
          scriptId: script._id,
          message: `Project "${script.title}" was submitted for admin approval by ${creator.name || "a writer"}.`,
          metadata: {
            scriptId: script._id,
            writerId: req.user._id,
            writerEmail: creator.email || "",
            aiTrailerRequested: Boolean(services?.aiTrailer),
            source: "upload-script",
          },
        }),
      ];

      if (services?.aiTrailer) {
        tasks.push(
          notifyAdminWorkflowEvent({
            title: "AI Trailer Approval Request",
            section: "trailers",
            actorId: req.user._id,
            scriptId: script._id,
            message: `AI trailer requested for "${script.title}" and is waiting in admin queue.`,
            metadata: {
              scriptId: script._id,
              writerId: req.user._id,
              trailerStatus: script.trailerStatus,
              source: "upload-script",
            },
          })
        );
      }

      // --- Async Service Processing ---
      // TODO: Implement these async workflows:
      if (services?.hosting) {
        console.log(`[SERVICE] Hosting activated for script ${script._id}`);
      }
      if (services?.evaluation) {
        console.log(`[SERVICE] Evaluation requested for script ${script._id}`);
      }
      if (services?.aiTrailer) {
        console.log(`[SERVICE] AI Trailer generation started for script ${script._id}`);
        console.log(`Logline: ${logline}`);
        console.log(`Genre: ${classification?.primaryGenre}`);
        console.log(`Tones: ${classification?.tones?.join(', ')}`);
      }

      const results = await Promise.allSettled(tasks);
      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length > 0) {
        console.error(`[uploadScript] ${rejected.length} post-submit task(s) failed`);
      }
    })();
  } catch (error) {
    console.error("Script upload error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getScripts = async (req, res) => {
  try {
    await expireApprovedUnpaidRequests();
    await expireActiveExclusiveLicenses();

    const { genre, contentType, budget, sort, search, premium, minPrice, maxPrice } = req.query;
    const query = { ...PUBLIC_SCRIPT_FILTER };
    if (genre) query.genre = genre;
    if (contentType) query.contentType = contentType;
    if (budget) query.budget = budget;
    if (premium === "true") query.premium = true;
    else if (premium === "false") query.premium = { $ne: true };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), "i");
      query.$or = [
        { sid: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Use aggregation pipeline for computed sort fields (engagement, platform)
    if (sort === "engagement" || sort === "platform") {
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            unlockCount: { $size: { $ifNull: ["$unlockedBy", []] } },
            engagementScore: {
              $min: [
                100,
                {
                  $add: [
                    { $multiply: [{ $divide: [{ $ifNull: ["$views", 0] }, 500] }, 40] },
                    { $multiply: [{ $divide: [{ $size: { $ifNull: ["$unlockedBy", []] } }, 50] }, 40] },
                    {
                      $cond: [
                        { $gt: [{ $ifNull: ["$views", 0] }, 0] },
                        { $multiply: [{ $divide: [{ $size: { $ifNull: ["$unlockedBy", []] } }, { $ifNull: ["$views", 1] }] }, 100] },
                        0,
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ];

      if (sort === "platform") {
        // Platform score = weighted combo of AI score (60%) + engagement (40%)
        pipeline.push({
          $addFields: {
            platformScore: {
              $add: [
                { $multiply: [{ $ifNull: ["$scriptScore.overall", 0] }, 0.6] },
                { $multiply: ["$engagementScore", 0.4] },
              ],
            },
          },
        });
        pipeline.push({ $sort: { platformScore: -1 } });
      } else {
        pipeline.push({ $sort: { engagementScore: -1 } });
      }

      // Populate creator
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "creator",
          foreignField: "_id",
          as: "creator",
          pipeline: [{ $project: { name: 1, profileImage: 1, role: 1 } }],
        },
      });
      pipeline.push({ $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } });

      const scripts = await Script.aggregate(pipeline);
      // Strip full synopsis and fullContent from list view
      const sanitized = scripts.map(s => ({
        ...s,
        synopsis: s.synopsis ? s.synopsis.substring(0, 120) + (s.synopsis.length > 120 ? '...' : '') : null,
        fullContent: undefined,
      }));
      return res.json(sanitized);
    }

    let sortObj = { createdAt: -1 };
    if (sort === "views") sortObj = { views: -1 };
    if (sort === "score") sortObj = { "scriptScore.overall": -1 };
    if (sort === "price_low") sortObj = { price: 1 };
    if (sort === "price_high") sortObj = { price: -1 };

    const scripts = await Script.find(query)
      .populate("creator", "name profileImage role")
      .sort(sortObj);

    await Promise.all(
      scripts.map(async (doc) => {
        if (!doc.sid) {
          await doc.save();
        }
      })
    );

    // Strip full synopsis and fullContent from list view
    const sanitized = scripts.map(s => {
      const obj = s.toObject();
      return {
        ...obj,
        synopsis: obj.synopsis ? obj.synopsis.substring(0, 120) + (obj.synopsis.length > 120 ? '...' : '') : null,
        fullContent: undefined,
      };
    });
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScriptSubmissionSummaryPdf = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id)
      .select("title creator submissionSummaryPdf")
      .lean();

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    const isOwner = String(script.creator || "") === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to access this submission PDF." });
    }

    const pdfUrl = String(script?.submissionSummaryPdf?.url || "").trim();
    if (!pdfUrl) {
      return res.status(404).json({ message: "Submission summary PDF not available." });
    }

    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return res.status(502).json({ message: "Failed to fetch submission summary PDF from storage." });
    }

    const fileBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const shouldDownload = String(req.query.download || "") === "1";
    const disposition = shouldDownload ? "attachment" : "inline";
    const filename = sanitizePdfFileName(`${script.title || "script"}-submission-summary.pdf`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    return res.send(fileBuffer);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load submission summary PDF." });
  }
};

export const getPurchaseRequestAcceptancePdf = async (req, res) => {
  try {
    const purchaseRequest = await ScriptPurchaseRequest.findById(req.params.id)
      .select("acceptancePdf investor writer script")
      .lean();

    if (!purchaseRequest) {
      return res.status(404).json({ message: "Purchase request not found." });
    }

    const userId = req.user._id.toString();
    const isBuyer = String(purchaseRequest.investor || "") === userId;
    const isWriter = String(purchaseRequest.writer || "") === userId;
    const isAdmin = req.user.role === "admin";

    if (!isBuyer && !isWriter && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to access this acceptance PDF." });
    }

    const pdfUrl = String(purchaseRequest?.acceptancePdf?.url || "").trim();
    if (!pdfUrl) {
      return res.status(404).json({ message: "Acceptance PDF not available." });
    }

    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return res.status(502).json({ message: "Failed to fetch acceptance PDF from storage." });
    }

    const fileBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const shouldDownload = String(req.query.download || "") === "1";
    const disposition = shouldDownload ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="purchase-request-${purchaseRequest._id}-acceptance.pdf"`
    );
    return res.send(fileBuffer);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load acceptance PDF." });
  }
};

export const getScriptById = async (req, res) => {
  try {
    await expireApprovedUnpaidRequests({ scriptId: req.params.id });
    await expireActiveExclusiveLicenses({ scriptId: req.params.id });

    const script = await Script.findById(req.params.id)
      .populate("creator", "name profileImage role bio followers username writerProfile.username")
      .populate("heldBy", "name role");

    if (!script) return res.status(404).json({ message: "Script not found" });

    const now = new Date();
    if (shouldAutoSyncUploadSpotlight(script, now)) {
      applySpotlightPackageState(script, now);
      await script.save();
    }

    const isOwner = script.creator._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    let isBuyer = hasUserInIdArray(script.unlockedBy, req.user._id) || hasUserInIdArray(script.purchasedBy, req.user._id);

    if (!isBuyer) {
      const [approvedPurchase, convertedOption] = await Promise.all([
        ScriptPurchaseRequest.exists(getSettledPurchaseQuery({ script: script._id, investor: req.user._id })),
        ScriptOption.exists({ script: script._id, holder: req.user._id, status: "converted" }),
      ]);
      isBuyer = Boolean(approvedPurchase || convertedOption);
    }

    // Deleted projects are hidden from writer/public but remain visible to purchasers and admins.
    if (script.isDeleted && !isAdmin && !isBuyer) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (script.status === "draft" && !isOwner) {
      return res.status(403).json({ message: "This draft is private" });
    }

    // Block access to sold scripts — only allow creator, buyer, and admins
    if (script.isSold && !isOwner && !isBuyer && !isAdmin) {
      return res.status(403).json({ message: "This script has been purchased and is no longer publicly available" });
    }

    // Block access while an investor purchase request is pending.
    // Allow creator, admin, current buyer, or the investor who owns the pending request.
    if (script.purchaseRequestLocked) {
      const lockOwnerId = script.purchaseRequestLockedBy?.toString?.() || "";
      const isLockOwner = lockOwnerId && lockOwnerId === req.user._id.toString();
      let hasMyPendingRequest = false;
      const nowForLockCheck = new Date();
      const activeApprovedClause = getApprovedUnpaidActiveClause(nowForLockCheck);

      if (!isLockOwner && !isOwner && !isAdmin && !isBuyer) {
        hasMyPendingRequest = Boolean(
          await ScriptPurchaseRequest.findOne({
            script: script._id,
            investor: req.user._id,
            $or: [
              { status: "pending" },
              activeApprovedClause,
            ],
          }).select("_id").lean()
        );
      }

      if (!isOwner && !isAdmin && !isBuyer && !isLockOwner && !hasMyPendingRequest) {
        return res.status(403).json({ message: "This script is temporarily unavailable while a purchase request is under review." });
      }
    }

    // Track valid views: count only unique viewers (same user should not increase views again).
    script.viewedBy = Array.isArray(script.viewedBy) ? script.viewedBy : [];
    const viewedByBeforeCount = script.viewedBy.length;
    const viewerId = req.user._id.toString();
    const creatorId = script.creator?._id?.toString?.() || script.creator?.toString?.();

    const uniqueViewerIds = new Set(
      script.viewedBy
        .map((entry) => entry?.user?.toString?.())
        .filter(Boolean)
    );

    const alreadyViewed = uniqueViewerIds.has(viewerId);
    if (!alreadyViewed) {
      script.viewedBy.push({ user: req.user._id });
    }

    // Exclude creator self-view from the public views metric.
    if (creatorId) {
      uniqueViewerIds.delete(creatorId);
    }
    if (!alreadyViewed && viewerId !== creatorId) {
      uniqueViewerIds.add(viewerId);
    }

    const validViews = uniqueViewerIds.size;
    const currentViews = Number(script.views || 0);
    const viewsChanged = currentViews !== validViews;
    if (viewsChanged) {
      script.views = validViews;
    }

    if (script.viewedBy.length !== viewedByBeforeCount || viewsChanged) {
      await script.save();
    }

    // Update viewer's viewHistory so investor dashboard stats are accurate
    if (!isOwner) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          viewHistory: {
            $each: [{ script: script._id, viewedAt: new Date() }],
            $slice: -200, // keep last 200 entries
          },
        },
      });

      // Track recommendation interaction signals for personalized investor feed.
      trackInvestorInteraction({
        userId: req.user._id,
        scriptId: script._id,
        type: "view",
        source: "script_detail",
      }).catch(() => null);
    }

    // Check if user has unlocked this script
    const isUnlocked = isBuyer || hasUserInIdArray(script.unlockedBy, req.user._id) || hasUserInIdArray(script.purchasedBy, req.user._id);
    const isCreator = script.creator._id.toString() === req.user._id.toString();
    const canViewFullScript = isUnlocked || isCreator || isAdmin;
    const userRole = req.user.role;
    const isWriter = userRole === 'writer' || userRole === 'creator';
    const canPurchase = ['investor', 'producer', 'director', 'industry', 'professional'].includes(userRole);

    // Get audition count
    const Audition = (await import("../models/Audition.js")).default;
    const auditionCount = await Audition.countDocuments({ script: script._id });

    // Keep synopsis fully visible; lock applies to full script content, not synopsis text.
    const isSynopsisLocked = !canViewFullScript;

    // Check if the viewer has a pending purchase request for this script
    let myPendingRequest = null;
    if (canPurchase && !isUnlocked) {
      const nowForPendingRequest = new Date();
      const activeApprovedClause = getApprovedUnpaidActiveClause(nowForPendingRequest);
      myPendingRequest = await ScriptPurchaseRequest.findOne({
        script: script._id,
        investor: req.user._id,
        $or: [
          { status: "pending" },
          activeApprovedClause,
        ],
      }).sort({ createdAt: -1 }).lean();
    }

    // For creators, count how many pending purchase requests exist for this script
    let pendingRequestsCount = 0;
    if (isCreator) {
      pendingRequestsCount = await ScriptPurchaseRequest.countDocuments({
        script: script._id,
        status: "pending",
      });
    }

    const viewBreakdown = {
      reader: 0,
      writer: 0,
      investor: 0,
    };

    const reviewBreakdown = {
      reader: 0,
      writer: 0,
      investor: 0,
    };

    const uniqueViewedUserIds = [
      ...new Set(
        (script.viewedBy || [])
          .map((entry) => entry?.user?.toString?.() || "")
          .filter(Boolean)
      ),
    ];

    if (uniqueViewedUserIds.length > 0) {
      const viewerRoles = await User.find({ _id: { $in: uniqueViewedUserIds } })
        .select("role")
        .lean();

      viewerRoles.forEach((viewer) => {
        const role = String(viewer?.role || "").toLowerCase();
        if (role === "reader") {
          viewBreakdown.reader += 1;
          return;
        }
        if (role === "writer" || role === "creator") {
          viewBreakdown.writer += 1;
          return;
        }
        if (["investor", "producer", "director", "industry", "professional"].includes(role)) {
          viewBreakdown.investor += 1;
        }
      });
    }

    const reviewRoleStats = await Review.aggregate([
      { $match: { script: script._id } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "reviewer",
        },
      },
      { $unwind: "$reviewer" },
      {
        $project: {
          role: { $toLower: { $ifNull: ["$reviewer.role", ""] } },
        },
      },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    reviewRoleStats.forEach((item) => {
      const role = String(item?._id || "");
      const count = Number(item?.count || 0);
      if (role === "reader") {
        reviewBreakdown.reader += count;
        return;
      }
      if (role === "writer" || role === "creator") {
        reviewBreakdown.writer += count;
        return;
      }
      if (["investor", "producer", "director", "industry", "professional"].includes(role)) {
        reviewBreakdown.investor += count;
      }
    });

    const response = {
      ...script.toObject(),
      isUnlocked,
      isCreator,
      isAdmin,
      canViewFullScript,
      isSynopsisLocked,
      canPurchase,
      isWriter: isWriter && !isCreator,
      auditionCount,
      myPendingRequest,
      pendingRequestsCount,
      viewBreakdown,
      reviewBreakdown,
      // Always return full synopsis. Only script body/content remains gated.
      synopsis: script.synopsis,
      // Hide full content unless unlocked, creator, or admin.
      fullContent: canViewFullScript ? script.fullContent : null,
      // Hide script text unless unlocked, creator, or admin.
      textContent: canViewFullScript ? script.textContent : null,
      shareMeta: buildScriptShareMeta(req, script),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScriptByPath = async (req, res) => {
  try {
    const scriptId = await resolveScriptIdByPath({
      projectHeading: req.params.projectHeading,
      writerUsername: req.params.writerUsername,
    });

    if (!scriptId) {
      return res.status(404).json({ message: "Script not found" });
    }

    req.params.id = scriptId;
    return getScriptById(req, res);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to resolve script path" });
  }
};

export const getPublicScriptById = async (req, res) => {
  try {
    const scriptId = String(req.params.id || "").trim();
    if (!scriptId) {
      return res.status(400).json({ message: "Invalid script id" });
    }

    await expireActiveExclusiveLicenses({ scriptId });

    const script = await Script.findById(scriptId)
      .populate("creator", "name profileImage role bio isPrivate isDeactivated writerProfile.username")
      .lean();

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    const creator = script.creator || {};
    const isCreatorPrivate = Boolean(creator.isPrivate);
    const isCreatorDeactivated = Boolean(creator.isDeactivated);

    const isPubliclyViewable =
      script.status === "published" &&
      !script.isDeleted &&
      !script.isSold &&
      !script.purchaseRequestLocked &&
      !isCreatorDeactivated &&
      !isCreatorPrivate;

    if (!isPubliclyViewable) {
      return res.status(404).json({ message: "Script not found" });
    }

    const synopsis = String(script.synopsis || "");
    const synopsisTeaser = synopsis
      ? `${synopsis.slice(0, 320)}${synopsis.length > 320 ? "..." : ""}`
      : "";

    const publicScript = {
      _id: script._id,
      sid: script.sid,
      title: script.title,
      companyName: script.companyName || "",
      logline: script.logline || "",
      description: script.description || "",
      synopsis: synopsisTeaser,
      genre: script.genre || "",
      primaryGenre: script.primaryGenre || "",
      subGenres: Array.isArray(script.subGenres) ? script.subGenres : [],
      format: script.format || "",
      formatOther: script.formatOther || "",
      price: Number(script.price || 0),
      pageCount: Number(script.pageCount || 0),
      budget: script.budget || "",
      views: Number(script.views || 0),
      tags: Array.isArray(script.tags) ? script.tags.slice(0, 20) : [],
      classification: {
        primaryGenre: script.classification?.primaryGenre || "",
        secondaryGenre: script.classification?.secondaryGenre || "",
        tones: Array.isArray(script.classification?.tones) ? script.classification.tones.slice(0, 8) : [],
        themes: Array.isArray(script.classification?.themes) ? script.classification.themes.slice(0, 8) : [],
        settings: Array.isArray(script.classification?.settings) ? script.classification.settings.slice(0, 8) : [],
      },
      contentIndicators: {
        bechdelTest: Boolean(script.contentIndicators?.bechdelTest),
        basedOnTrueStory: Boolean(script.contentIndicators?.basedOnTrueStory),
        adaptation: Boolean(script.contentIndicators?.adaptation),
        adaptationSource: script.contentIndicators?.adaptationSource || "",
      },
      evaluation: script.scriptScore?.overall
        ? {
            overall: Number(script.scriptScore.overall || 0),
            plot: Number(script.scriptScore.plot || 0),
            characters: Number(script.scriptScore.characters || 0),
            dialogue: Number(script.scriptScore.dialogue || 0),
            pacing: Number(script.scriptScore.pacing || 0),
            marketability: Number(script.scriptScore.marketability || 0),
            feedback: script.scriptScore.feedback || "",
          }
        : null,
      roles: Array.isArray(script.roles)
        ? script.roles.slice(0, 30).map((role) => ({
            _id: role?._id,
            characterName: role?.characterName || "",
            description: role?.description || "",
            type: role?.type || "",
            ageRange: {
              min: Number(role?.ageRange?.min || 0) || undefined,
              max: Number(role?.ageRange?.max || 0) || undefined,
            },
            gender: role?.gender || "",
          }))
        : [],
      coverImage: script.coverImage || "",
      trailerUrl: script.trailerUrl || "",
      uploadedTrailerUrl: script.uploadedTrailerUrl || "",
      trailerSource: script.trailerSource || "none",
      createdAt: script.createdAt,
      publishedAt: script.publishedAt,
      creator: {
        _id: creator._id,
        name: creator.name || "",
        role: creator.role || "",
        profileImage: creator.profileImage || "",
        bio: creator.bio || "",
        username: creator.writerProfile?.username || "",
      },
      shareMeta: buildScriptShareMeta(req, script),
    };

    return res.json(publicScript);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch shared project" });
  }
};

export const unlockScript = async (req, res) => {
  try {
    const script = await Script.findById(req.body.scriptId);
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.isDeleted) {
      return res.status(410).json({ message: "This project was deleted by creator and is no longer available for new purchases." });
    }

    await expireApprovedUnpaidRequests({ scriptId: script._id });
    await expireActiveExclusiveLicenses({ scriptId: script._id });

    // Only investors, producers, directors, and industry professionals can unlock
    const allowedRoles = ['investor', 'producer', 'director', 'industry', 'professional'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Only investors, producers, and directors can unlock scripts. Writers cannot purchase synopsis access."
      });
    }

    // Cannot unlock own script
    if (script.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You already have access to your own script" });
    }

    return res.status(409).json({
      message: "Direct unlock is disabled. Submit a purchase request and complete legal acceptance in the payment flow.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PURCHASE REQUEST WORKFLOW ────────────────────────────────────────────────

// Investor submits a purchase request for a script (no upfront payment)
export const requestScriptPurchase = async (req, res) => {
  try {
    const { scriptId, note } = req.body;
    const defaultRequestNote = "I like your synopsis and I want to buy your project.";

    const allowedRoles = ["investor", "producer", "director", "industry", "professional"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Only investors and industry professionals can request script purchases." });
    }

    const script = await Script.findById(scriptId).populate("creator", "name email");
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.isDeleted) {
      return res.status(410).json({ message: "This project was deleted by creator and is no longer available for new purchases." });
    }

    if (script.creator._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot purchase your own script." });
    }

    if (hasUserInIdArray(script.unlockedBy, req.user._id) || hasUserInIdArray(script.purchasedBy, req.user._id)) {
      return res.status(400).json({ message: "You already have access to this script." });
    }

    if (script.isSold || script.transactionStatus === "sold_licensed") {
      return res.status(409).json({ message: "This script is no longer available for additional buyers." });
    }

    await expireApprovedUnpaidRequests({ scriptId: script._id });
    const now = new Date();
    const activeApprovedClause = getApprovedUnpaidActiveClause(now);

    if (script.purchaseRequestLocked) {
      const lockOwnerId = script.purchaseRequestLockedBy?.toString?.() || "";
      if (!lockOwnerId || lockOwnerId !== req.user._id.toString()) {
        return res.status(409).json({ message: "This script is currently unavailable because a purchase request is already in progress." });
      }
    }

    // Prevent duplicate active request flows for same investor/script.
    const existing = await ScriptPurchaseRequest.findOne({
      script: scriptId,
      investor: req.user._id,
      $or: [
        { status: "pending" },
        activeApprovedClause,
      ],
    }).sort({ createdAt: -1 });

    if (existing) {
      const lockOwnerId = script.purchaseRequestLockedBy?.toString?.() || "";
      if (!script.purchaseRequestLocked || lockOwnerId !== req.user._id.toString()) {
        await markScriptAsLocked(script, req.user._id);
      }
      if (existing.status === "approved" && existing.paymentStatus !== "released" && Number(existing.amount || 0) > 0) {
        return res.status(400).json({ message: "Your request is already approved. Complete payment to unlock full script access." });
      }
      return res.status(400).json({ message: "You already have a pending purchase request for this script." });
    }

    const investor = await User.findById(req.user._id).select("name email role industryProfile.subRole");
    const amount = Number(script.price || 0);
    const sanitizedNote = String(note || defaultRequestNote).trim() || defaultRequestNote;

    const purchaseRequest = await ScriptPurchaseRequest.create({
      script: scriptId,
      investor: req.user._id,
      writer: script.creator._id,
      amount,
      frozenAmount: 0,
      paymentMethod: "manual",
      paymentStatus: "pending",
      note: sanitizedNote,
    });

    await markScriptAsLocked(script, req.user._id);

    const requesterType = getPurchaseRequesterLabel(investor);

    // Notify writer in-app
    await Notification.create({
      user: script.creator._id,
      type: "purchase_request",
      from: req.user._id,
      script: script._id,
      message: `${investor.name} (${requesterType}) requested to buy "${script.title}"${amount > 0 ? ` for ₹${amount.toLocaleString("en-IN")}` : ""}. Request message: "${sanitizedNote}". Review in your dashboard.`,
    });

    // Email writer
    sendPurchaseRequestEmail(
      script.creator.email,
      script.creator.name,
      investor.name,
      requesterType,
      script.title,
      amount,
      sanitizedNote,
      {
        clientBaseUrl: resolveClientOriginFromRequest(req),
      }
    ).catch((err) => console.error("[Purchase] Failed to send request email:", err.message));

    res.status(201).json({
      message: amount > 0
        ? "Purchase request sent. Complete payment after writer approval."
        : "Purchase request submitted successfully.",
      purchaseRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Writer approves a purchase request
export const approveScriptPurchase = async (req, res) => {
  try {
    const purchaseRequest = await ScriptPurchaseRequest.findById(req.params.id)
      .populate("script")
      .populate("investor", "name email wallet");

    if (!purchaseRequest) return res.status(404).json({ message: "Purchase request not found." });
    if (purchaseRequest.writer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script writer can approve this request." });
    }
    if (purchaseRequest.status !== "pending") {
      return res.status(400).json({ message: "This request has already been processed." });
    }

    const script = purchaseRequest.script;
    if (script.isDeleted) {
      return res.status(410).json({ message: "This project was deleted by creator and cannot be approved for new purchase." });
    }
    const investor = purchaseRequest.investor;
    const writer = await User.findById(req.user._id);
    const amountToRelease = Number(purchaseRequest.frozenAmount || purchaseRequest.amount || 0);
    const payableAmount = amountToRelease > 0
      ? getScriptPurchasePricing(amountToRelease).totalAmount
      : 0;
    const paymentMethod = purchaseRequest.paymentMethod || "wallet";
    const hasEscrowHold = amountToRelease > 0 && purchaseRequest.paymentStatus === "escrow_held";

    // New request-first flow: approve first, then ask buyer to pay.
    if (!hasEscrowHold && amountToRelease > 0) {
      const paymentDueAt = getApprovedPaymentDueAt(new Date());
      purchaseRequest.status = "approved";
      purchaseRequest.paymentStatus = "pending";
      purchaseRequest.paymentMethod = "manual";
      purchaseRequest.frozenAmount = 0;
      purchaseRequest.paymentDueAt = paymentDueAt;
      purchaseRequest.settledAt = undefined;
      await purchaseRequest.save();

      await markScriptAsLocked(script, investor._id);

      await Notification.create({
        user: investor._id,
        type: "purchase_approved",
        from: req.user._id,
        script: script._id,
        message: `${writer.name} approved your request for "${script.title}". Please pay ₹${payableAmount.toLocaleString("en-IN")} (includes 5% platform commission) within ${APPROVED_UNPAID_EXPIRY_HOURS} hours to unlock full script access.`,
      });

      sendPurchaseApprovedEmail(
        investor.email,
        investor.name,
        writer.name,
        script.title,
        script._id.toString(),
        {
          requiresPayment: true,
          amount: payableAmount,
          paymentDueAt,
          clientBaseUrl: resolveClientOriginFromRequest(req),
        }
      ).catch((err) => console.error("[Purchase] Failed to send approval email:", err.message));

      return res.json({
        message: "Purchase request approved. Buyer has been notified to complete payment for access.",
        purchaseRequest,
      });
    }

    const investorDoc = await User.findById(investor._id);
    if (!investorDoc) {
      return res.status(404).json({ message: "Investor account not found." });
    }

    if (!investorDoc.wallet) {
      investorDoc.wallet = {
        balance: 0,
        currency: "INR",
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
      };
    }

    if (!writer.wallet) {
      writer.wallet = {
        balance: 0,
        currency: "INR",
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
      };
    }

    if (amountToRelease > 0) {
      if (paymentMethod === "wallet") {
        if ((investorDoc.wallet.pendingBalance || 0) < amountToRelease) {
          return res.status(409).json({
            message: "Escrow amount is unavailable. Please contact support.",
          });
        }
        investorDoc.wallet.pendingBalance -= amountToRelease;
      }

      const writerBalanceBefore = writer.wallet.balance || 0;
      writer.wallet.balance = writerBalanceBefore + amountToRelease;
      writer.wallet.totalEarnings = (writer.wallet.totalEarnings || 0) + amountToRelease;

      await investorDoc.save();
      await writer.save();

      const pendingEscrowTx = await Transaction.findOne({
        user: investor._id,
        relatedScript: script._id,
        status: "pending",
        "metadata.purchaseRequestId": purchaseRequest._id.toString(),
      }).sort({ createdAt: -1 });

      if (pendingEscrowTx) {
        const existingMetadata = pendingEscrowTx.metadata instanceof Map
          ? Object.fromEntries(pendingEscrowTx.metadata)
          : (pendingEscrowTx.metadata || {});
        pendingEscrowTx.status = "completed";
        pendingEscrowTx.description = `Purchased script: "${script.title}"`;
        pendingEscrowTx.metadata = {
          ...existingMetadata,
          stage: "settled_to_writer",
          settledAt: new Date().toISOString(),
          settlementMethod: paymentMethod,
          writerId: writer._id.toString(),
        };
        await pendingEscrowTx.save();
      }

      await Transaction.create({
        user: writer._id,
        type: "credit",
        amount: amountToRelease,
        currency: "INR",
        status: "completed",
        description: `Script purchase payout: "${script.title}"`,
        reference: `PRP-${Date.now()}-${purchaseRequest._id.toString().slice(-6).toUpperCase()}`,
        paymentMethod: paymentMethod === "razorpay" ? "razorpay" : "wallet",
        relatedScript: script._id,
        balanceBefore: writerBalanceBefore,
        balanceAfter: writer.wallet.balance,
        metadata: {
          purchaseRequestId: purchaseRequest._id.toString(),
          investorId: investor._id.toString(),
          scriptId: script._id.toString(),
        },
      });
    }

    // Grant access to the script
    if (!hasUserInIdArray(script.unlockedBy, investor._id)) {
      script.unlockedBy.push(investor._id);
    }
    script.purchasedBy = Array.isArray(script.purchasedBy) ? script.purchasedBy : [];
    if (!hasUserInIdArray(script.purchasedBy, investor._id)) {
      script.purchasedBy.push(investor._id);
    }

    script.isSold = true;
    script.purchaseRequestLocked = false;
    script.purchaseRequestLockedBy = null;
    script.purchaseRequestLockedAt = null;
    script.transactionStatus = "sold_licensed";
    await script.save();

    purchaseRequest.status = "approved";
    purchaseRequest.paymentStatus = "released";
    purchaseRequest.paymentDueAt = undefined;
    purchaseRequest.settledAt = new Date();
    await purchaseRequest.save();

    try {
      await createAgreementForSettledPurchase({
        script,
        purchaseRequest,
        writerUser: writer,
        buyerUser: investor,
        pricing: getScriptPurchasePricing(amountToRelease),
        req,
      });
    } catch (agreementError) {
      console.error("[Purchase] Agreement generation failed on legacy settlement path:", agreementError?.message || agreementError);
    }

    // Notify investor in-app
    await Notification.create({
      user: investor._id,
      type: "purchase_approved",
      from: req.user._id,
      script: script._id,
      message: `${writer.name} approved your purchase request for "${script.title}". You now have full access${amountToRelease > 0 ? " and escrow was released to the writer" : ""}!`,
    });

    // Email investor
    sendPurchaseApprovedEmail(
      investor.email,
      investor.name,
      writer.name,
      script.title,
      script._id.toString(),
      {
        requiresPayment: false,
        amount: amountToRelease,
        clientBaseUrl: resolveClientOriginFromRequest(req),
      }
    ).catch((err) => console.error("[Purchase] Failed to send approval email:", err.message));

    res.json({
      message: "Purchase request approved. Investor now has full script access and funds were transferred to the writer.",
      purchaseRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Writer rejects a purchase request
export const rejectScriptPurchase = async (req, res) => {
  try {
    const { note } = req.body;

    const purchaseRequest = await ScriptPurchaseRequest.findById(req.params.id)
      .populate("script")
      .populate("investor", "name email wallet");

    if (!purchaseRequest) return res.status(404).json({ message: "Purchase request not found." });
    if (purchaseRequest.writer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script writer can reject this request." });
    }
    if (purchaseRequest.status !== "pending") {
      return res.status(400).json({ message: "This request has already been processed." });
    }

    const script = purchaseRequest.script;
    const investor = purchaseRequest.investor;
    const writer = await User.findById(req.user._id);
    const hasEscrowHold = Number(purchaseRequest.frozenAmount || 0) > 0 && purchaseRequest.paymentStatus === "escrow_held";
    const amountToRefund = hasEscrowHold ? Number(purchaseRequest.frozenAmount || purchaseRequest.amount || 0) : 0;
    const paymentMethod = purchaseRequest.paymentMethod || "wallet";
    let gatewayRefundId = "";

    if (amountToRefund > 0) {
      if (paymentMethod === "wallet") {
        const investorDoc = await User.findById(investor._id);
        if (!investorDoc) {
          return res.status(404).json({ message: "Investor account not found." });
        }

        if (!investorDoc.wallet) {
          investorDoc.wallet = {
            balance: 0,
            currency: "INR",
            pendingBalance: 0,
            totalEarnings: 0,
            totalWithdrawals: 0,
          };
        }

        const pendingBefore = investorDoc.wallet.pendingBalance || 0;
        const balanceBefore = investorDoc.wallet.balance || 0;

        investorDoc.wallet.pendingBalance = Math.max(0, pendingBefore - amountToRefund);
        investorDoc.wallet.balance = balanceBefore + amountToRefund;
        const balanceAfter = investorDoc.wallet.balance;
        await investorDoc.save();

        await Transaction.create({
          user: investor._id,
          type: "refund",
          amount: amountToRefund,
          currency: "INR",
          status: "completed",
          description: `Refund for rejected purchase request: "${script.title}"`,
          reference: `PRR-${Date.now()}-${purchaseRequest._id.toString().slice(-6).toUpperCase()}`,
          paymentMethod: "wallet",
          relatedScript: script._id,
          balanceBefore,
          balanceAfter,
          metadata: {
            purchaseRequestId: purchaseRequest._id.toString(),
            writerId: writer._id.toString(),
            scriptId: script._id.toString(),
            rejectionNote: note || "",
          },
        });
      } else if (paymentMethod === "razorpay") {
        if (!purchaseRequest.paymentGatewayPaymentId) {
          return res.status(409).json({ message: "Payment reference missing for refund. Please contact support." });
        }

        const razorpay = getRazorpay();
        const refund = await razorpay.payments.refund(purchaseRequest.paymentGatewayPaymentId, {
          amount: Math.round(amountToRefund * 100),
          notes: {
            purchaseRequestId: purchaseRequest._id.toString(),
            scriptId: script._id.toString(),
            writerId: writer._id.toString(),
          },
        });
        gatewayRefundId = refund?.id || "";

        await Transaction.create({
          user: investor._id,
          type: "refund",
          amount: amountToRefund,
          currency: "INR",
          status: "completed",
          description: `Refund to original payment method for rejected request: "${script.title}"`,
          reference: `PRR-RZP-${purchaseRequest.paymentGatewayPaymentId}`,
          paymentMethod: "razorpay",
          relatedScript: script._id,
          metadata: {
            purchaseRequestId: purchaseRequest._id.toString(),
            writerId: writer._id.toString(),
            scriptId: script._id.toString(),
            gatewayPaymentId: purchaseRequest.paymentGatewayPaymentId,
            gatewayOrderId: purchaseRequest.paymentGatewayOrderId || "",
            gatewayRefundId,
            rejectionNote: note || "",
          },
        });
      }

      const pendingEscrowTx = await Transaction.findOne({
        user: investor._id,
        relatedScript: script._id,
        status: "pending",
        "metadata.purchaseRequestId": purchaseRequest._id.toString(),
      }).sort({ createdAt: -1 });

      if (pendingEscrowTx) {
        const existingMetadata = pendingEscrowTx.metadata instanceof Map
          ? Object.fromEntries(pendingEscrowTx.metadata)
          : (pendingEscrowTx.metadata || {});
        pendingEscrowTx.status = "cancelled";
        pendingEscrowTx.description = `Escrow released back to wallet: "${script.title}"`;
        pendingEscrowTx.metadata = {
          ...existingMetadata,
          stage: "refunded_to_investor",
          refundedAt: new Date().toISOString(),
          refundMethod: paymentMethod,
          gatewayRefundId,
          rejectionNote: note || "",
        };
        await pendingEscrowTx.save();
      }
    }

    purchaseRequest.status = "rejected";
    purchaseRequest.paymentStatus = amountToRefund > 0 ? "refunded" : purchaseRequest.paymentStatus;
    purchaseRequest.settledAt = new Date();
    if (note) purchaseRequest.note = note;
    await purchaseRequest.save();

    const hasPendingRequests = await ScriptPurchaseRequest.exists({
      script: script._id,
      status: "pending",
    });

    if (!hasPendingRequests) {
      script.purchaseRequestLocked = false;
      script.purchaseRequestLockedBy = null;
      script.purchaseRequestLockedAt = null;
      if (!script.isSold) {
        script.transactionStatus = "available";
      }
      await script.save();
    }

    // Notify investor in-app
    await Notification.create({
      user: investor._id,
      type: "purchase_rejected",
      from: req.user._id,
      script: script._id,
      message: `${writer.name} denied your request to buy "${script.title}"${amountToRefund > 0 ? ` and ₹${amountToRefund} was refunded` : ""}.`,
    });

    // Email investor
    sendPurchaseRejectedEmail(
      investor.email,
      investor.name,
      writer.name,
      script.title,
      note || "",
      {
        refundAmount: amountToRefund,
        clientBaseUrl: resolveClientOriginFromRequest(req),
      }
    ).catch((err) => console.error("[Purchase] Failed to send rejection email:", err.message));

    res.json({
      message: amountToRefund > 0
        ? "Purchase request rejected. Payment was refunded to the investor."
        : "Purchase request rejected. Buyer was notified.",
      purchaseRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get purchase requests — writers see incoming requests, investors see their own
export const getMyPurchaseRequests = async (req, res) => {
  try {
    await expireApprovedUnpaidRequests({ userId: req.user._id });

    const { role } = req.user;
    const isWriterRole = ["writer", "creator"].includes(role);
    const isInvestorRole = ["investor", "producer", "director", "industry", "professional"].includes(role);

    let requests;

    if (isWriterRole) {
      requests = await ScriptPurchaseRequest.find({ writer: req.user._id })
        .populate("script", "title price thumbnailUrl isDeleted deletedAt")
        .populate("investor", "name profileImage role")
        .sort({ createdAt: -1 });
    } else if (isInvestorRole) {
      requests = await ScriptPurchaseRequest.find({ investor: req.user._id })
        .populate("script", "title price thumbnailUrl creator isDeleted deletedAt")
        .populate("writer", "name profileImage role")
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

// Hold/Option a script (for producers - ₹200 default, 30 days)
export const holdScript = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);

    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.isDeleted) {
      return res.status(410).json({ message: "This project was deleted by creator and is no longer available." });
    }
    if (script.holdStatus === "held") {
      return res.status(400).json({ message: "This script is already on hold by another party" });
    }
    if (script.holdStatus === "sold") {
      return res.status(400).json({ message: "This script has been sold" });
    }

    const user = await User.findById(req.user._id);
    if (!["investor", "producer", "director"].includes(user.role)) {
      return res.status(403).json({ message: "Only industry professionals can hold scripts" });
    }

    const fee = script.holdFee || 200;
    const pricing = getScriptPurchasePricing(fee);
    const platformCut = pricing.platformTaxAmount;
    const creatorPayout = pricing.baseAmount;
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create option record
    const option = await ScriptOption.create({
      script: scriptId,
      holder: req.user._id,
      fee,
      platformCut,
      creatorPayout,
      endDate,
      status: "active",
    });

    // Update script
    script.holdStatus = "held";
    script.heldBy = req.user._id;
    script.holdStartDate = new Date();
    script.holdEndDate = endDate;
    await script.save();

    // Notify the creator
    await Notification.create({
      user: script.creator,
      type: "hold",
      from: req.user._id,
      script: script._id,
      message: `${user.name} has placed a hold on "${script.title}" for ₹${fee} (30 days). You earn ₹${creatorPayout}!`,
    });

    res.json({
      message: "Script held successfully",
      option,
      holdDetails: {
        fee: pricing.baseAmount,
        buyerCommission: platformCut,
        totalPayable: pricing.totalAmount,
        platformCut,
        creatorPayout,
        expiresAt: endDate,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Release a hold
export const releaseHold = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);

    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.heldBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not holding this script" });
    }

    script.holdStatus = "available";
    script.heldBy = null;
    script.holdStartDate = null;
    script.holdEndDate = null;
    await script.save();

    // Update option
    await ScriptOption.findOneAndUpdate(
      { script: scriptId, holder: req.user._id, status: "active" },
      { status: "cancelled" }
    );

    res.json({ message: "Hold released" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get script options/holds for current user
export const getMyHolds = async (req, res) => {
  try {
    const options = await ScriptOption.find({ holder: req.user._id })
      .populate({
        path: "script",
        select: "title genre coverImage creator price trailerThumbnail",
        populate: { path: "creator", select: "name profileImage" }
      })
      .sort({ createdAt: -1 });

    res.json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add roles to a script
export const addRoles = async (req, res) => {
  try {
    const { scriptId, roles } = req.body;
    const script = await Script.findById(scriptId);

    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can add roles" });
    }

    script.roles.push(...roles);
    await script.save();

    res.json({ message: "Roles added", roles: script.roles });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Reader Endpoints ───

export const getFeaturedScripts = async (req, res) => {
  try {
    const now = new Date();
    const activeSpotlightFilter = {
      "promotion.spotlightActive": true,
      "promotion.spotlightEndAt": { $gte: now },
    };

    // Step 1: rank published scripts by trendScore via aggregation
    const ranked = await Script.aggregate([
      { $match: { ...PUBLIC_SCRIPT_FILTER, ...activeSpotlightFilter } },
      {
        $addFields: {
          verifiedPriority: {
            $cond: [{ $eq: [{ $ifNull: ["$verifiedBadge", false] }, true] }, 1, 0],
          },
          aiTrailerPriority: {
            $cond: [{ $eq: [{ $ifNull: ["$services.aiTrailer", false] }, true] }, 1, 0],
          },
          evaluationPriority: {
            $cond: [{ $eq: [{ $ifNull: ["$services.evaluation", false] }, true] }, 1, 0],
          },
          spotlightPriority: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$promotion.spotlightActive", false] },
                  { $gte: ["$promotion.spotlightEndAt", now] },
                ],
              },
              1,
              0,
            ],
          },
          trendScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$reviewCount", 0] }, 3] },
              { $multiply: [{ $ifNull: ["$readsCount", 0] }, 2] },
              { $ifNull: ["$views", 0] },
            ],
          },
        },
      },
      { $sort: { verifiedPriority: -1, aiTrailerPriority: -1, evaluationPriority: -1, spotlightPriority: -1, trendScore: -1, rating: -1, createdAt: -1 } },
      { $limit: 12 },
      { $project: { _id: 1 } },
    ]);

    if (!ranked.length) return res.json([]);

    const ids = ranked.map((s) => s._id);

    // Step 2: fetch full documents with populated creator (preserving sort order)
    const docs = await Script.find({ _id: { $in: ids }, ...PUBLIC_SCRIPT_FILTER, ...activeSpotlightFilter }).populate(
      "creator",
      "name profileImage role"
    );

    const idStr = (id) => id.toString();
    const docMap = Object.fromEntries(docs.map((d) => [idStr(d._id), d]));
    const ordered = ids.map((id) => docMap[idStr(id)]).filter(Boolean);

    res.json(ordered);
  } catch (error) {
    console.error("getFeaturedScripts error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getTopScripts = async (req, res) => {
  try {
    const now = new Date();
    const blockedUserIds = await getBlockedUserIdsForViewer(req.user._id);
    const sortBy = req.query.sort || "rating";
    let sortObj = { rating: -1 };
    if (sortBy === "reads") sortObj = { readsCount: -1 };
    if (sortBy === "purchases") sortObj = { "unlockedBy": -1 };
    const query = { ...PUBLIC_SCRIPT_FILTER };
    if (blockedUserIds.length > 0) {
      query.creator = { $nin: blockedUserIds };
    }
    const scripts = await Script.find(query)
      .populate("creator", "name profileImage role")
      .sort(sortObj)
      .limit(20);

    const boostedFirst = [...scripts].sort((a, b) => {
      const aVerified = a?.verifiedBadge ? 1 : 0;
      const bVerified = b?.verifiedBadge ? 1 : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;

      const aTrailer = a?.services?.aiTrailer ? 1 : 0;
      const bTrailer = b?.services?.aiTrailer ? 1 : 0;
      if (aTrailer !== bTrailer) return bTrailer - aTrailer;

      const aEvaluation = a?.services?.evaluation ? 1 : 0;
      const bEvaluation = b?.services?.evaluation ? 1 : 0;
      if (aEvaluation !== bEvaluation) return bEvaluation - aEvaluation;

      const aBoost = isSpotlightActive(a, now) ? 1 : 0;
      const bBoost = isSpotlightActive(b, now) ? 1 : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      return 0;
    });

    res.json(boostedFirst);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchScriptsReader = async (req, res) => {
  try {
    const { q, category, genre, page = 1, limit = 20 } = req.query;
    const query = { ...PUBLIC_SCRIPT_FILTER };
    const blockedUserIds = await getBlockedUserIdsForViewer(req.user._id);
    if (blockedUserIds.length > 0) {
      query.creator = { $nin: blockedUserIds };
    }
    if (q) {
      const regex = new RegExp(escapeRegExp(q), "i");
      query.$or = [{ sid: regex }, { title: regex }, { description: regex }, { logline: regex }, { tags: regex }];
    }
    if (category) query.contentType = category;
    if (genre) query.genre = genre;
    const total = await Script.countDocuments(query);
    const scripts = await Script.find(query)
      .populate("creator", "name profileImage role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    await Promise.all(
      scripts.map(async (doc) => {
        if (!doc.sid) {
          await doc.save();
        }
      })
    );

    res.json({ scripts, totalPages: Math.ceil(total / limit), page: parseInt(page), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLatestScripts = async (req, res) => {
  try {
    const scripts = await Script.find({ ...PUBLIC_SCRIPT_FILTER })
      .populate("creator", "name profileImage role")
      .sort({ createdAt: -1 })
      .limit(18);
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const recordRead = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    script.readsCount = (script.readsCount || 0) + 1;
    await script.save();
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { scriptsRead: script._id } });

    trackInvestorInteraction({
      userId: req.user._id,
      scriptId: script._id,
      type: "read",
      source: "script_reader",
    }).catch(() => null);

    res.json({ message: "Read recorded" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.favoriteScripts.indexOf(req.params.id);
    if (idx > -1) {
      user.favoriteScripts.splice(idx, 1);
      await user.save();
      res.json({ favorited: false });
    } else {
      user.favoriteScripts.push(req.params.id);
      await user.save();

      trackInvestorInteraction({
        userId: req.user._id,
        scriptId: req.params.id,
        type: "save",
        source: "favorite_toggle",
      }).catch(() => null);

      res.json({ favorited: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const trackScriptInteraction = async (req, res) => {
  try {
    const { type, timeSpentMs, source, metadata } = req.body || {};
    const allowedTypes = new Set(["view", "like", "save", "click", "time_spent", "read"]);
    if (!allowedTypes.has(type)) {
      return res.status(400).json({ message: "Invalid interaction type" });
    }

    const script = await Script.findById(req.params.id).select("_id status");
    if (!script || script.status !== "published") {
      return res.status(404).json({ message: "Script not found" });
    }

    if (type === "read") {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { scriptsRead: script._id },
      });
    }

    await trackInvestorInteraction({
      userId: req.user._id,
      scriptId: req.params.id,
      type,
      timeSpentMs: Number(timeSpentMs) > 0 ? Number(timeSpentMs) : 0,
      source: source || "client",
      metadata: metadata || {},
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const contentTypes = await Script.distinct("contentType", { ...PUBLIC_SCRIPT_FILTER });
    const genres = await Script.distinct("genre", { ...PUBLIC_SCRIPT_FILTER });
    res.json({ contentTypes: contentTypes.filter(Boolean), genres: genres.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeGenre = (value = "") => {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";
  const compact = raw.replace(/[\s_]+/g, "-");
  const aliases = {
    "science-fiction": "sci-fi",
    scifi: "sci-fi",
    "sci fi": "sci-fi",
    thriller: "thriller",
    drama: "drama",
    horror: "horror",
    comedy: "comedy",
    romance: "romance",
    action: "action",
    mystery: "mystery",
    fantasy: "fantasy",
    documentary: "documentary",
    crime: "crime",
    animation: "animation",
    adventure: "adventure",
    historical: "historical",
    musical: "musical",
  };
  return aliases[compact] || compact;
};

const normalizeFormat = (value = "") => {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";
  if (raw.includes("song")) return "songs";
  if (raw.includes("standup") || raw.includes("stand-up")) return "standup-comedy";
  if (raw.includes("dialogue")) return "dialogues";
  if (raw.includes("poet") || raw.includes("poetry")) return "poet";
  if (raw.includes("feature")) return "feature";
  if (raw.includes("short")) return "short";
  if (raw.includes("limited")) return "limited-series";
  if (raw.includes("web")) return "web-series";
  if (raw.includes("documentary")) return "documentary";
  if (raw.includes("animation")) return "animation";
  if (raw.includes("tv")) return "tv-series";
  return raw.replace(/[\s_]+/g, "-");
};

const normalizeBudgetTier = (value = "") => {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";
  if (raw.includes("micro")) return "micro";
  if (raw.includes("low")) return "low";
  if (raw.includes("mid") || raw.includes("medium")) return "medium";
  if (raw.includes("high")) return "high";
  if (raw.includes("tentpole") || raw.includes("blockbuster")) return "blockbuster";
  return raw;
};

const formatMatches = (script = {}, preferred = []) => {
  if (!preferred.length) return false;
  const scriptFormats = [script?.format, script?.contentType]
    .map(normalizeFormat)
    .filter(Boolean);
  return preferred.some((f) => scriptFormats.includes(f));
};

const budgetMatches = (script = {}, preferred = []) => {
  if (!preferred.length) return false;
  const sb = normalizeBudgetTier(script?.budget || "");
  if (!sb) return false;
  return preferred.includes(sb);
};

const inferGenresFromProfileText = (text = "") => {
  const source = String(text || "").toLowerCase();
  if (!source) return [];

  const keywordMap = {
    horror: ["horror", "slasher", "supernatural", "haunted"],
    drama: ["drama", "dramatic", "family drama", "emotional"],
    thriller: ["thriller", "suspense", "psychological thriller", "crime thriller"],
    comedy: ["comedy", "comic", "satire", "humor"],
    romance: ["romance", "romantic", "love story"],
    action: ["action", "adventure action", "high-octane"],
    mystery: ["mystery", "detective", "whodunit"],
    "sci-fi": ["sci-fi", "science fiction", "scifi", "futuristic"],
    fantasy: ["fantasy", "mythic", "magic"],
    documentary: ["documentary", "docu"],
  };

  const inferred = [];
  for (const [genre, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((k) => source.includes(k))) inferred.push(genre);
  }
  return inferred;
};

const inferFormatsFromProfileText = (text = "") => {
  const source = String(text || "").toLowerCase();
  if (!source) return [];

  const inferred = [];
  if (source.includes("song")) inferred.push("songs");
  if (source.includes("standup") || source.includes("stand-up") || source.includes("comedy special")) inferred.push("standup-comedy");
  if (source.includes("dialogue")) inferred.push("dialogues");
  if (source.includes("poet") || source.includes("poetry")) inferred.push("poet");
  if (source.includes("feature")) inferred.push("feature");
  if (source.includes("short")) inferred.push("short");
  if (source.includes("web series") || source.includes("web-series")) inferred.push("web-series");
  if (source.includes("limited series") || source.includes("limited-series")) inferred.push("limited-series");
  if (source.includes("tv") || source.includes("series")) inferred.push("tv-series");
  if (source.includes("documentary")) inferred.push("documentary");
  if (source.includes("animation") || source.includes("animated")) inferred.push("animation");
  return [...new Set(inferred)];
};

const inferBudgetsFromInvestmentRange = (range = "") => {
  const r = String(range || "").toLowerCase();
  if (!r) return [];
  if (r.includes("under_50k")) return ["micro", "low"];
  if (r.includes("50k_250k")) return ["low", "medium"];
  if (r.includes("250k_1m")) return ["medium", "high"];
  if (r.includes("1m_5m")) return ["high", "blockbuster"];
  if (r.includes("over_5m")) return ["blockbuster", "high"];
  return [];
};

const scoreScriptByInvestorProfile = (
  script,
  { preferredGenres = [], preferredFormats = [], preferredBudgets = [] } = {}
) => {
  const ordered = preferredGenres.map(normalizeGenre).filter(Boolean);
  const orderIndex = new Map(ordered.map((g, idx) => [g, idx]));

  const primary = normalizeGenre(
    script?.genre || script?.primaryGenre || script?.classification?.primaryGenre || ""
  );

  const secondary = [
    script?.classification?.secondaryGenre,
    ...(script?.subGenres || []),
    ...(script?.classification?.themes || []),
    ...(script?.classification?.tones || []),
  ]
    .map(normalizeGenre)
    .filter(Boolean);

  let score = 0;
  if (orderIndex.has(primary)) {
    score += 1000 - orderIndex.get(primary) * 40;
  }

  const bestSecondaryBoost = secondary.reduce((acc, g) => {
    if (!orderIndex.has(g)) return acc;
    const boost = 240 - orderIndex.get(g) * 20;
    return Math.max(acc, boost);
  }, 0);
  score += bestSecondaryBoost;

  score += (script?.rating || 0) * 10;
  score += Math.min(80, (script?.readsCount || 0) * 0.2);
  score += Math.min(80, (script?.views || 0) * 0.05);

  if (formatMatches(script, preferredFormats)) score += 180;
  if (budgetMatches(script, preferredBudgets)) score += 160;

  return score;
};

const rankScriptsForInvestor = (
  scripts = [],
  profileSignals = { preferredGenres: [], preferredFormats: [], preferredBudgets: [] }
) => {
  if (!Array.isArray(scripts) || scripts.length === 0) return [];
  const hasSignals =
    profileSignals?.preferredGenres?.length ||
    profileSignals?.preferredFormats?.length ||
    profileSignals?.preferredBudgets?.length;
  if (!hasSignals) return scripts;

  return scripts
    .map((script, idx) => ({
      script,
      idx,
      score: scoreScriptByInvestorProfile(script, profileSignals),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    })
    .map((item) => item.script);
};

// ═══════════════════════════════════════════════════════════
//  INVESTOR HOME FEED — Personalised by genre / mandate prefs
// ═══════════════════════════════════════════════════════════
export const getInvestorHomeFeed = async (req, res) => {
  try {
    const feed = await buildInvestorFeed(req.user._id);
    res.json(feed);
  } catch (error) {
    console.error("getInvestorHomeFeed error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
//  TOP LIST — merged Top Ranked + Featured + Trending
// ═══════════════════════════════════════════════════════════
export const getTopList = async (req, res) => {
  try {
    const { genre, contentType, budget, sort = "platform", premium, limit } = req.query;
    const now = new Date();
    const blockedUserIds = await getBlockedUserIdsForViewer(req.user?._id);
    const parsedLimit = Math.max(1, Math.min(Number(limit) || 24, 50));
    const match = { ...PUBLIC_SCRIPT_FILTER };
    if (genre) match.genre = genre;
    if (contentType) match.contentType = contentType;
    if (budget) match.budget = budget;
    if (premium === "true") match.premium = true;
    else if (premium === "false") match.premium = { $ne: true };
    if (blockedUserIds.length > 0) {
      match.creator = { $nin: blockedUserIds };
    }

    // AI Score tab should only show scripts with paid/included evaluation and a generated score.
    if (sort === "score") {
      match["scriptScore.overall"] = { $gt: 0 };
      match.$or = [
        { "services.evaluation": true },
        { "services.spotlight": true },
        { "billing.evaluationCreditsCharged": { $gt: 0 } },
        { "billing.evaluationCreditsChargedAtUpload": { $gt: 0 } },
      ];
    }

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          verifiedPriority: {
            $cond: [{ $eq: [{ $ifNull: ["$verifiedBadge", false] }, true] }, 1, 0],
          },
          aiTrailerPriority: {
            $cond: [{ $eq: [{ $ifNull: ["$services.aiTrailer", false] }, true] }, 1, 0],
          },
          evaluationPriority: {
            $cond: [{ $eq: [{ $ifNull: ["$services.evaluation", false] }, true] }, 1, 0],
          },
          spotlightPriority: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$promotion.spotlightActive", false] },
                  { $gte: ["$promotion.spotlightEndAt", now] },
                ],
              },
              1,
              0,
            ],
          },
          unlockCount: { $size: { $ifNull: ["$unlockedBy", []] } },
          trendScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$reviewCount", 0] }, 3] },
              { $multiply: [{ $ifNull: ["$readsCount", 0] }, 2] },
              { $ifNull: ["$views", 0] },
            ],
          },
          engagementScore: {
            $min: [
              100,
              {
                $add: [
                  { $multiply: [{ $divide: [{ $ifNull: ["$views", 0] }, 500] }, 40] },
                  { $multiply: [{ $divide: [{ $size: { $ifNull: ["$unlockedBy", []] } }, 50] }, 40] },
                  {
                    $cond: [
                      { $gt: [{ $ifNull: ["$views", 0] }, 0] },
                      { $multiply: [{ $divide: [{ $size: { $ifNull: ["$unlockedBy", []] } }, { $ifNull: ["$views", 1] }] }, 100] },
                      0,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          platformScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$scriptScore.overall", 0] }, 0.6] },
              { $multiply: ["$engagementScore", 0.4] },
            ],
          },
        },
      },
    ];

    // Sort based on tab
    if (sort === "trending") pipeline.push({ $sort: { verifiedPriority: -1, aiTrailerPriority: -1, evaluationPriority: -1, spotlightPriority: -1, trendScore: -1 } });
    else if (sort === "featured") pipeline.push({ $sort: { verifiedPriority: -1, aiTrailerPriority: -1, evaluationPriority: -1, spotlightPriority: -1, engagementScore: -1, trendScore: -1 } });
    else if (sort === "score") pipeline.push({ $sort: { verifiedPriority: -1, aiTrailerPriority: -1, evaluationPriority: -1, spotlightPriority: -1, "scriptScore.overall": -1 } });
    else if (sort === "views") pipeline.push({ $sort: { verifiedPriority: -1, aiTrailerPriority: -1, evaluationPriority: -1, spotlightPriority: -1, views: -1 } });
    else pipeline.push({ $sort: { verifiedPriority: -1, aiTrailerPriority: -1, evaluationPriority: -1, spotlightPriority: -1, platformScore: -1 } }); // default: platform

    // Populate creator
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "creator",
        foreignField: "_id",
        as: "creator",
        pipeline: [{ $project: { name: 1, profileImage: 1, role: 1 } }],
      },
    });
    pipeline.push({ $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } });
    pipeline.push({ $limit: parsedLimit });

    const scripts = await Script.aggregate(pipeline);
    const sanitized = scripts.map((s) => ({
      ...s,
      synopsis: s.synopsis ? s.synopsis.substring(0, 120) + (s.synopsis.length > 120 ? "..." : "") : null,
      fullContent: undefined,
    }));
    res.json(sanitized);
  } catch (error) {
    console.error("getTopList error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
//  RAZORPAY PAYMENT INTEGRATION FOR SCRIPTS
// ═══════════════════════════════════════════════════════════

// @desc    Create Razorpay order for script purchase after writer approval
// @route   POST /api/scripts/purchase/create-order
// @access  Private
export const createScriptPurchaseOrder = async (req, res) => {
  try {
    const {
      scriptId,
      acceptedPlatformTerms,
      acceptedWriterTerms,
      acceptedCustomWriterTerms,
      acceptedRightsSummary,
      acceptedLegalDisclaimer,
    } = req.body;

    const script = await Script.findById(scriptId).populate("creator", "name");
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }
    if (script.isDeleted) {
      return res.status(410).json({ message: "This project was deleted by creator and is no longer available for new purchases." });
    }

    await expireActiveExclusiveLicenses({ scriptId: script._id });

    // Check if already purchased
    if (hasUserInIdArray(script.unlockedBy, req.user._id) || hasUserInIdArray(script.purchasedBy, req.user._id)) {
      return res.status(400).json({ message: "You already have full access to this script." });
    }

    // Check if trying to buy own script
    if (script.creator._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot purchase your own script" });
    }

    if (script.isSold || script.transactionStatus === "sold_licensed") {
      return res.status(409).json({ message: "This script is no longer available for payment." });
    }

    if (script.purchaseRequestLocked) {
      const lockOwnerId = script.purchaseRequestLockedBy?.toString?.() || "";
      if (lockOwnerId && lockOwnerId !== req.user._id.toString()) {
        return res.status(409).json({
          message: "This script is currently locked in another transaction.",
        });
      }
    }

    const now = new Date();
    const activeApprovedClause = getApprovedUnpaidActiveClause(now);
    const purchaseRequest = await ScriptPurchaseRequest.findOne({
      script: scriptId,
      investor: req.user._id,
      $or: [{ status: "pending" }, activeApprovedClause],
    }).sort({ createdAt: -1 });

    if (!purchaseRequest) {
      return res.status(400).json({
        message: "Send a purchase request first. If approved, payment must be completed within 72 hours.",
      });
    }

    if (purchaseRequest.status === "pending") {
      return res.status(409).json({
        message: "Your request is still pending writer approval. Payment will unlock after approval.",
      });
    }

    if (purchaseRequest.paymentStatus === "released") {
      return res.status(400).json({
        message: "Payment is already completed for this approved request.",
      });
    }

    const paymentDueAt = purchaseRequest.paymentDueAt
      ? new Date(purchaseRequest.paymentDueAt)
      : getApprovedPaymentDueAt(purchaseRequest.updatedAt || purchaseRequest.createdAt || now);

    if (paymentDueAt <= now) {
      await expireApprovedUnpaidRequests({ scriptId: script._id, force: true });
      return res.status(410).json({
        message: "Payment window expired for this approved request. Send a new purchase request.",
      });
    }

    if (!acceptedPlatformTerms || !acceptedWriterTerms) {
      return res.status(400).json({
        message: "Accept Platform and Writer terms before proceeding to payment.",
      });
    }

    if (!acceptedRightsSummary) {
      return res.status(400).json({
        message: "Accept rights summary before proceeding to payment.",
      });
    }

    if (!acceptedLegalDisclaimer) {
      return res.status(400).json({
        message: LEGAL_MARKETPLACE_DISCLAIMER,
      });
    }

    const customInvestorTerms = sanitizeCustomInvestorTerms(script.legal?.customInvestorTerms);
    if (customInvestorTerms && !acceptedCustomWriterTerms) {
      return res.status(400).json({
        message: "Accept writer custom terms before proceeding to payment.",
      });
    }

    const currentTermsPolicy = await getCurrentPurchaseTermsPolicy();
    const normalizedRights = normalizeRightsLicensingInput(script.rightsLicensing || {}, {});
    const rightsLabels = buildRightsLabels(normalizedRights);

    purchaseRequest.termsAcceptance = {
      platformTermsAccepted: true,
      writerTermsAccepted: true,
      customWriterTermsAccepted: Boolean(customInvestorTerms && acceptedCustomWriterTerms),
      rightsSummaryAccepted: true,
      legalDisclaimerAccepted: true,
      customWriterTermsSnapshot: customInvestorTerms,
      rightsTermsSnapshot: {
        ...normalizedRights,
        ...rightsLabels,
      },
      termsPolicyVersion: currentTermsPolicy?.version || "",
      acceptedAt: new Date(),
      acceptedIp: req.ip || req.connection.remoteAddress || "",
      acceptedUserAgent: getRequestUserAgent(req),
    };
    await purchaseRequest.save();

    try {
      await attachPurchaseRequestAcceptancePdf({
        purchaseRequest,
        script,
      });
    } catch (pdfError) {
      console.error("[Purchase] Acceptance PDF generation failed during order creation:", pdfError?.message || pdfError);
    }

    const baseAmount = Number(purchaseRequest.amount || script.price || 0);
    const pricing = getScriptPurchasePricing(Math.max(0, baseAmount));

    if (baseAmount <= 0) {
      return res.json({
        success: true,
        noPaymentRequired: true,
        amount: 0,
        currency: "INR",
        scriptDetails: {
          id: script._id,
          title: script.title,
          price: 0,
          creator: script.creator.name,
        },
        pricing,
        purchaseRequestId: purchaseRequest._id,
        paymentDueAt,
        rightsSummary: {
          ...rightsLabels,
          exclusivity: "Exclusive transaction enforced",
        },
        legalDisclaimer: LEGAL_MARKETPLACE_DISCLAIMER,
        message: "No payment required. Confirm free access to unlock full script.",
      });
    }

    // Check if Razorpay is configured for paid requests.
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        message: "Payment system not configured. Please contact support.",
        error: "Razorpay credentials missing"
      });
    }

    // Create Razorpay order after writer approval
    const options = {
      amount: Math.round(pricing.totalAmount * 100),
      currency: "INR",
      receipt: `script_purchase_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        scriptId: scriptId,
        scriptTitle: script.title,
        creatorId: script.creator._id.toString(),
        purchaseRequestId: purchaseRequest._id.toString(),
        baseAmount: pricing.baseAmount.toFixed(2),
        platformTaxPercent: String(pricing.platformTaxPercent),
        platformTaxAmount: pricing.platformTaxAmount.toFixed(2),
        totalAmount: pricing.totalAmount.toFixed(2),
        type: "script_purchase_after_approval",
      }
    };

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      scriptDetails: {
        id: script._id,
        title: script.title,
        price: pricing.baseAmount,
        creator: script.creator.name
      },
      pricing,
      purchaseRequestId: purchaseRequest._id,
      paymentDueAt,
      rightsSummary: {
        ...rightsLabels,
        exclusivity: "Exclusive transaction enforced",
      },
      legalDisclaimer: LEGAL_MARKETPLACE_DISCLAIMER,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ message: "Failed to create payment order", error: error.message });
  }
};

// @desc    Activate project spotlight package for a script
// @route   POST /api/scripts/:id/activate-spotlight
// @access  Private (script owner)
export const activateProjectSpotlight = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let script;
    let user;
    let endAt;
    let isExtensionPurchase = false;
    let spotlightCreditsCharged = PROJECT_SPOTLIGHT_ACTIVATION_CREDITS;
    let refundCredits = 0;
    let refundBreakdown = { evaluation: 0, aiTrailer: 0 };
    const scriptId = req.params?.id || req.body?.scriptId || req.query?.scriptId;

    if (!scriptId) {
      return res.status(400).json({ message: "Script ID is required" });
    }

    await session.withTransaction(async () => {
      script = await Script.findById(scriptId).session(session);
      if (!script) {
        const error = new Error("Script not found");
        error.statusCode = 404;
        throw error;
      }

      if (script.isDeleted) {
        const error = new Error("This project was deleted and spotlight cannot be activated.");
        error.statusCode = 410;
        throw error;
      }

      if (script.isSold || script.holdStatus === "sold") {
        const error = new Error("Spotlight cannot be activated after this project is sold.");
        error.statusCode = 400;
        throw error;
      }

      if (script.creator.toString() !== req.user._id.toString()) {
        const error = new Error("Only the script creator can activate spotlight");
        error.statusCode = 403;
        throw error;
      }

      if (script.services?.spotlight && script.promotion?.pendingSpotlightActivation && script.status !== "published") {
        const error = new Error("Spotlight is already purchased for this project and will auto-activate after admin approval.");
        error.statusCode = 409;
        throw error;
      }

      if (script.status !== "published") {
        const error = new Error("Publish the project before activating spotlight");
        error.statusCode = 400;
        throw error;
      }

      user = await User.findById(req.user._id).session(session);
      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }

      if (!user.credits) {
        user.credits = { balance: 0, totalPurchased: 0, totalSpent: 0, transactions: [] };
      }

      const now = new Date();

      const spotlightCurrentlyActive = isSpotlightActive(script, now);
      let spotlightChargedAtUpload = Number(script.billing?.spotlightCreditsChargedAtUpload || 0);
      if (!spotlightChargedAtUpload) {
        const uploadInvoice = await Invoice.findOne({ script: script._id, creator: req.user._id })
          .sort({ createdAt: -1 })
          .session(session)
          .lean();
        if (uploadInvoice?.services?.spotlight) {
          spotlightChargedAtUpload = PROJECT_SPOTLIGHT_ACTIVATION_CREDITS;
        }
      }

      const hasUnusedUploadSpotlightPayment =
        !spotlightCurrentlyActive &&
        spotlightChargedAtUpload > 0 &&
        !script.promotion?.lastSpotlightPurchaseAt;

      const spotlightCreditsRequired = hasUnusedUploadSpotlightPayment
        ? 0
        : spotlightCurrentlyActive
          ? PROJECT_SPOTLIGHT_EXTENSION_CREDITS
          : PROJECT_SPOTLIGHT_ACTIVATION_CREDITS;
      isExtensionPurchase = spotlightCurrentlyActive;
      spotlightCreditsCharged = spotlightCreditsRequired;

      // Prefer billing-tracked service charges, then backfill from upload invoice for older scripts.
      const currentBilling = script.billing || {};
      let evaluationCharged = Number(currentBilling.evaluationCreditsCharged || 0);
      let aiTrailerCharged = Number(currentBilling.aiTrailerCreditsCharged || 0);
      let evaluationChargedAtUpload = Number(currentBilling.evaluationCreditsChargedAtUpload || 0);
      let aiTrailerChargedAtUpload = Number(currentBilling.aiTrailerCreditsChargedAtUpload || 0);
      let evaluationRefunded = Number(currentBilling.evaluationCreditsRefunded || 0);
      let aiTrailerRefunded = Number(currentBilling.aiTrailerCreditsRefunded || 0);

      const needsUploadBackfill =
        (evaluationCharged > 0 && evaluationChargedAtUpload === 0) ||
        (aiTrailerCharged > 0 && aiTrailerChargedAtUpload === 0);

      // Backfill upload-time charge markers for legacy or partially-migrated scripts.
      if (needsUploadBackfill) {
        const uploadInvoice = await Invoice.findOne({ script: script._id, creator: req.user._id })
          .sort({ createdAt: -1 })
          .session(session)
          .lean();

        if (uploadInvoice?.services?.evaluation) {
          evaluationCharged = Math.max(evaluationCharged, CREDIT_PRICES.AI_EVALUATION);
          evaluationChargedAtUpload = CREDIT_PRICES.AI_EVALUATION;
        }
        if (uploadInvoice?.services?.aiTrailer) {
          aiTrailerCharged = Math.max(aiTrailerCharged, CREDIT_PRICES.AI_TRAILER);
          aiTrailerChargedAtUpload = CREDIT_PRICES.AI_TRAILER;
        }
      }

      const hasPaidEvaluation = evaluationCharged > 0;
      const refundableEvaluation = 0;
      const nonUploadTrailerCharged = Math.max(0, aiTrailerCharged - aiTrailerChargedAtUpload);
      const refundableTrailer = hasPaidEvaluation ? Math.max(0, nonUploadTrailerCharged - aiTrailerRefunded) : 0;
      const refundableCredits = refundableEvaluation + refundableTrailer;

      const balance = user.credits.balance || 0;
      const effectiveBalance = balance + refundableCredits;
      if (effectiveBalance < spotlightCreditsRequired) {
        const actionLabel = spotlightCurrentlyActive ? "Spotlight extension" : "Project Spotlight activation";
        const error = new Error(`Insufficient credits. ${actionLabel} requires ${spotlightCreditsRequired} credits.`);
        error.statusCode = 402;
        error.payload = {
          requiresCredits: true,
          required: spotlightCreditsRequired,
          balance: effectiveBalance,
          shortfall: spotlightCreditsRequired - effectiveBalance,
        };
        throw error;
      }

      if (refundableCredits > 0) {
        const balanceBeforeRefund = user.credits.balance || 0;
        user.credits.balance = balanceBeforeRefund + refundableCredits;
        user.credits.totalSpent = Math.max(0, (user.credits.totalSpent || 0) - refundableCredits);
        user.credits.transactions.push({
          type: "refund",
          amount: refundableCredits,
          description: `Spotlight package credit adjustment for "${script.title}"`,
          reference: `SPRF-${Date.now().toString(36).toUpperCase()}`,
          createdAt: now,
        });

        await Transaction.create([
          {
            user: req.user._id,
            type: "refund",
            amount: refundableCredits,
            currency: "INR",
            status: "completed",
            description: `Credit refund for previously paid services on "${script.title}"`,
            reference: `SPRF-TX-${Date.now().toString(36).toUpperCase()}`,
            paymentMethod: "wallet",
            relatedScript: script._id,
            balanceBefore: balanceBeforeRefund,
            balanceAfter: user.credits.balance,
            metadata: {
              package: "project_spotlight_refund",
              refundedEvaluationCredits: refundableEvaluation,
              refundedAiTrailerCredits: refundableTrailer,
            },
          },
        ], { session });

        refundCredits = refundableCredits;
        refundBreakdown = {
          evaluation: refundableEvaluation,
          aiTrailer: refundableTrailer,
        };

        evaluationRefunded += refundableEvaluation;
        aiTrailerRefunded += refundableTrailer;
      }

      const currentEnd = script.promotion?.spotlightEndAt ? new Date(script.promotion.spotlightEndAt) : null;
      const extensionStart = currentEnd && currentEnd > now ? currentEnd : now;
      endAt = new Date(extensionStart.getTime() + PROJECT_SPOTLIGHT_DURATION_DAYS * 24 * 60 * 60 * 1000);

      if (spotlightCreditsRequired > 0) {
        user.credits.balance = (user.credits.balance || 0) - spotlightCreditsRequired;
        user.credits.totalSpent = (user.credits.totalSpent || 0) + spotlightCreditsRequired;
        user.credits.transactions.push({
          type: "spent",
          amount: -spotlightCreditsRequired,
          description: `${spotlightCurrentlyActive ? "Project Spotlight extended" : "Project Spotlight activated"} for "${script.title}"`,
          reference: `SPOT-${Date.now().toString(36).toUpperCase()}`,
          createdAt: now,
        });
      }
      await user.save({ session });

      script.premium = true;
      script.isFeatured = true;
      script.verifiedBadge = true;
      script.services = {
        hosting: true,
        evaluation: true,
        aiTrailer: true,
        spotlight: true,
      };
      script.evaluationStatus = script.scriptScore?.overall ? "completed" : "requested";

      if (shouldQueueSpotlightAiTrailer(script) && !["requested", "generating"].includes(script.trailerStatus)) {
        script.trailerStatus = "requested";
      }

      const previousSpent = script.promotion?.totalSpotlightCreditsSpent || 0;
      script.promotion = {
        spotlightActive: true,
        pendingSpotlightActivation: false,
        spotlightStartAt: now,
        spotlightEndAt: endAt,
        lastSpotlightPurchaseAt: now,
        totalSpotlightCreditsSpent: previousSpent + spotlightCreditsRequired,
      };
      script.billing = {
        evaluationCreditsCharged: evaluationCharged,
        aiTrailerCreditsCharged: aiTrailerCharged,
        spotlightCreditsChargedAtUpload: spotlightChargedAtUpload,
        evaluationCreditsChargedAtUpload: evaluationChargedAtUpload,
        aiTrailerCreditsChargedAtUpload: aiTrailerChargedAtUpload,
        evaluationCreditsRefunded: evaluationRefunded,
        aiTrailerCreditsRefunded: aiTrailerRefunded,
        spotlightCreditsSpent: Number(currentBilling.spotlightCreditsSpent || 0) + spotlightCreditsRequired,
        lastSpotlightRefundCredits: refundableCredits,
        lastSpotlightActivatedAt: now,
      };
      script.markModified("services");
      script.markModified("promotion");
      script.markModified("billing");
      await script.save({ session });

      if (spotlightCreditsRequired > 0) {
        await Transaction.create([
          {
            user: req.user._id,
            type: "debit",
            amount: -spotlightCreditsRequired,
            currency: "INR",
            status: "completed",
            description: `Project Spotlight ${spotlightCurrentlyActive ? "extension" : "package"} for "${script.title}"`,
            reference: `SPTD-${Date.now().toString(36).toUpperCase()}`,
            paymentMethod: "wallet",
            relatedScript: script._id,
            metadata: {
              package: spotlightCurrentlyActive ? "project_spotlight_extension" : "project_spotlight",
              isExtension: spotlightCurrentlyActive,
              includesVerifiedBadge: true,
              includesFreeEvaluation: true,
              includesFreeAITrailer: true,
              featuredDurationDays: PROJECT_SPOTLIGHT_DURATION_DAYS,
              spotlightEndAt: endAt.toISOString(),
            },
          },
        ], { session });
      }
    });

    await notifyAdminWorkflowEvent({
      title: isExtensionPurchase ? "Project Spotlight Extended" : "Project Spotlight Activated",
      section: "approvals",
      actorId: req.user._id,
      scriptId: script._id,
      message: `Project Spotlight ${isExtensionPurchase ? "extended" : "activated"} for "${script.title}". Featured placement is active for 1 month and verified badge remains permanent once unlocked.`,
      metadata: {
        scriptId: script._id,
        writerId: req.user._id,
        spotlightEndAt: endAt.toISOString(),
      },
    });

    res.json({
      message: isExtensionPurchase
        ? "Project Spotlight extended successfully"
        : "Project Spotlight activated successfully",
      package: {
        name: "Project Spotlight",
        isExtension: isExtensionPurchase,
        creditsCharged: spotlightCreditsCharged,
        creditsRefunded: refundCredits,
        refundBreakdown,
        spotlightEndAt: endAt,
        benefits: [
          "Verified project badge (permanent once unlocked)",
          "Free script evaluation",
          "Free AI trailer",
          "Featured and top placement for 1 month",
        ],
      },
      credits: {
        balance: user.credits.balance,
        spent: spotlightCreditsCharged,
        refunded: refundCredits,
      },
      script,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      message: error.message,
      ...(error.payload || {}),
    });
  } finally {
    await session.endSession();
  }
};

// @desc    Verify Razorpay payment for approved request and unlock script
// @route   POST /api/scripts/purchase/verify-payment
// @access  Private
export const verifyScriptPurchase = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      scriptId,
      freeAccess,
    } = req.body;

    console.log("Script purchase verification:", { razorpay_order_id, razorpay_payment_id, scriptId });

    if (!scriptId) {
      return res.status(400).json({
        message: "Script id is required.",
        success: false,
      });
    }

    const script = await Script.findById(scriptId).populate("creator", "name email");
    if (!script) {
      console.error("Script not found:", scriptId);
      return res.status(404).json({
        message: "Script not found",
        success: false
      });
    }
    if (script.isDeleted) {
      return res.status(410).json({
        message: "This project was deleted by creator and is no longer available for new purchases.",
        success: false,
      });
    }

    await expireActiveExclusiveLicenses({ scriptId: script._id });

    await expireApprovedUnpaidRequests({ scriptId: script._id });

    // Check if already unlocked
    if (hasUserInIdArray(script.unlockedBy, req.user._id) || hasUserInIdArray(script.purchasedBy, req.user._id)) {
      return res.status(400).json({
        message: "Script already purchased",
        success: false
      });
    }

    if (script.isSold || script.transactionStatus === "sold_licensed") {
      return res.status(409).json({
        message: "This script is already sold/licensed and unavailable for duplicate purchases.",
        success: false,
      });
    }

    const alreadyReleased = await ScriptPurchaseRequest.findOne({
      script: script._id,
      investor: req.user._id,
      status: "approved",
      paymentStatus: "released",
    }).select("_id");

    if (alreadyReleased) {
      const existingInvoice = await Invoice.findOne({
        creator: req.user._id,
        script: script._id,
      })
        .sort({ createdAt: -1 })
        .select("_id invoiceNumber pdfPath");

      return res.json({
        success: true,
        message: existingInvoice ? "Payment already completed. Full access is already active." : "Access already granted for this request.",
        purchaseRequestId: alreadyReleased._id,
        invoice: existingInvoice
          ? {
              _id: existingInvoice._id,
              invoiceNumber: existingInvoice.invoiceNumber,
              pdfPath: existingInvoice.pdfPath || "",
            }
          : null,
      });
    }

    const pendingRequest = await ScriptPurchaseRequest.findOne({
      script: script._id,
      investor: req.user._id,
      status: "pending",
    }).select("_id");

    if (pendingRequest) {
      return res.status(409).json({
        message: "Your request is still pending writer approval. Complete payment after approval.",
        success: false,
      });
    }

    const now = new Date();
    const activeApprovedClause = getApprovedUnpaidActiveClause(now);
    const purchaseRequest = await ScriptPurchaseRequest.findOne({
      script: script._id,
      investor: req.user._id,
      ...activeApprovedClause,
    });

    if (!purchaseRequest) {
      return res.status(400).json({
        message: "No approved purchase request found for payment.",
        success: false,
      });
    }

    if (!purchaseRequest?.termsAcceptance?.platformTermsAccepted || !purchaseRequest?.termsAcceptance?.writerTermsAccepted) {
      return res.status(400).json({
        message: "Required legal terms were not accepted for this purchase request.",
        success: false,
      });
    }

    if (!purchaseRequest?.termsAcceptance?.rightsSummaryAccepted) {
      return res.status(400).json({
        message: "Rights summary acceptance is missing for this request.",
        success: false,
      });
    }

    if (!purchaseRequest?.termsAcceptance?.legalDisclaimerAccepted) {
      return res.status(400).json({
        message: LEGAL_MARKETPLACE_DISCLAIMER,
        success: false,
      });
    }

    const paymentDueAt = purchaseRequest.paymentDueAt
      ? new Date(purchaseRequest.paymentDueAt)
      : getApprovedPaymentDueAt(purchaseRequest.updatedAt || purchaseRequest.createdAt || now);

    if (paymentDueAt <= now) {
      await expireApprovedUnpaidRequests({ scriptId: script._id, force: true });
      return res.status(410).json({
        message: "Payment window expired for this approved request. Send a new purchase request.",
        success: false,
      });
    }

    const baseAmount = Number(purchaseRequest.amount || script.price || 0);
    const isFreeAccessRequest = baseAmount <= 0;

    if (isFreeAccessRequest) {
      const hasAcceptedCoreTerms = Boolean(
        purchaseRequest?.termsAcceptance?.platformTermsAccepted &&
        purchaseRequest?.termsAcceptance?.writerTermsAccepted
      );

      if (!hasAcceptedCoreTerms) {
        return res.status(400).json({
          message: "Accept Platform and Writer terms before confirming free access.",
          success: false,
        });
      }

      if (!purchaseRequest?.termsAcceptance?.rightsSummaryAccepted) {
        return res.status(400).json({
          message: "Accept rights summary before confirming free access.",
          success: false,
        });
      }

      if (!purchaseRequest?.termsAcceptance?.legalDisclaimerAccepted) {
        return res.status(400).json({
          message: LEGAL_MARKETPLACE_DISCLAIMER,
          success: false,
        });
      }

      const customInvestorTerms = sanitizeCustomInvestorTerms(script.legal?.customInvestorTerms);
      if (customInvestorTerms && !purchaseRequest?.termsAcceptance?.customWriterTermsAccepted) {
        return res.status(400).json({
          message: "Accept writer custom terms before confirming free access.",
          success: false,
        });
      }

      if (!freeAccess && !razorpay_order_id && !razorpay_payment_id && !razorpay_signature) {
        return res.status(400).json({
          message: "Use free access confirmation from the payment page.",
          success: false,
        });
      }
    } else {
      if (!process.env.RAZORPAY_KEY_SECRET) {
        console.error("RAZORPAY_KEY_SECRET not found in environment");
        return res.status(500).json({
          message: "Payment system not configured",
          success: false
        });
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          message: "Payment verification payload is incomplete.",
          success: false,
        });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      const isAuthentic = expectedSignature === razorpay_signature;

      if (!isAuthentic) {
        console.error("Signature verification failed");
        return res.status(400).json({
          message: "Payment verification failed - Invalid signature",
          success: false
        });
      }
    }

    const pricing = getScriptPurchasePricing(baseAmount);
    const paymentReference = isFreeAccessRequest ? "" : `RZP-${razorpay_payment_id}`;

    const [investorDoc, writerDoc] = await Promise.all([
      User.findById(req.user._id).select("name email sid role industryProfile"),
      User.findById(purchaseRequest.writer).select("name wallet"),
    ]);

    if (!writerDoc) {
      return res.status(404).json({
        message: "Writer account not found.",
        success: false,
      });
    }

    if (!writerDoc.wallet) {
      writerDoc.wallet = {
        balance: 0,
        currency: "INR",
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawals: 0,
      };
    }

    if (!isFreeAccessRequest) {
      const writerBalanceBefore = writerDoc.wallet.balance || 0;
      writerDoc.wallet.balance = writerBalanceBefore + pricing.baseAmount;
      writerDoc.wallet.totalEarnings = (writerDoc.wallet.totalEarnings || 0) + pricing.baseAmount;
      await writerDoc.save();

      await Transaction.create([
        {
          user: req.user._id,
          type: "payment",
          amount: -pricing.totalAmount,
          currency: "INR",
          status: "completed",
          description: `Purchased script after approval: "${script.title}"`,
          reference: `PRP-RZP-${razorpay_payment_id}`,
          paymentMethod: "razorpay",
          relatedScript: script._id,
          metadata: {
            purchaseRequestId: purchaseRequest._id.toString(),
            writerId: purchaseRequest.writer.toString(),
            scriptId: script._id.toString(),
            razorpay_order_id,
            razorpay_payment_id,
          },
        },
        {
          user: purchaseRequest.writer,
          type: "credit",
          amount: pricing.baseAmount,
          currency: "INR",
          status: "completed",
          description: `Script purchase payout: "${script.title}"`,
          reference: `PRP-${Date.now()}-${purchaseRequest._id.toString().slice(-6).toUpperCase()}`,
          paymentMethod: "razorpay",
          relatedScript: script._id,
          balanceBefore: writerBalanceBefore,
          balanceAfter: writerDoc.wallet.balance,
          metadata: {
            purchaseRequestId: purchaseRequest._id.toString(),
            investorId: req.user._id.toString(),
            scriptId: script._id.toString(),
            razorpay_order_id,
            razorpay_payment_id,
          },
        },
      ]);
    }

    if (!hasUserInIdArray(script.unlockedBy, req.user._id)) {
      script.unlockedBy.push(req.user._id);
    }
    script.purchasedBy = Array.isArray(script.purchasedBy) ? script.purchasedBy : [];
    if (!hasUserInIdArray(script.purchasedBy, req.user._id)) {
      script.purchasedBy.push(req.user._id);
    }
    script.isSold = true;
    script.purchaseRequestLocked = false;
    script.purchaseRequestLockedBy = null;
    script.purchaseRequestLockedAt = null;
    script.transactionStatus = "sold_licensed";
    await script.save();

    purchaseRequest.frozenAmount = isFreeAccessRequest ? 0 : pricing.totalAmount;
    purchaseRequest.paymentMethod = isFreeAccessRequest ? "free_access" : "razorpay";
    purchaseRequest.paymentStatus = "released";
    purchaseRequest.paymentDueAt = undefined;
    purchaseRequest.paymentGatewayOrderId = isFreeAccessRequest ? undefined : razorpay_order_id;
    purchaseRequest.paymentGatewayPaymentId = isFreeAccessRequest ? undefined : razorpay_payment_id;
    purchaseRequest.paymentGatewaySignature = isFreeAccessRequest ? undefined : razorpay_signature;
    purchaseRequest.settledAt = new Date();
    await purchaseRequest.save();

    let agreementRecord = null;
    try {
      agreementRecord = await createAgreementForSettledPurchase({
        script,
        purchaseRequest,
        writerUser: script.creator,
        buyerUser: investorDoc || req.user,
        pricing,
        req,
      });
    } catch (agreementError) {
      console.error("[Purchase] Agreement generation failed:", agreementError?.message || agreementError);
    }

    try {
      await attachPurchaseRequestAcceptancePdf({
        purchaseRequest,
        script,
        investor: investorDoc || req.user,
        agreementPdfUrl: agreementRecord?.buyer_pdf_url || agreementRecord?.writer_pdf_url || "",
      });
    } catch (pdfError) {
      console.error("[Purchase] Acceptance PDF refresh failed after settlement:", pdfError?.message || pdfError);
    }

    let purchaseInvoice = null;
    if (!isFreeAccessRequest) {
      purchaseInvoice = await Invoice.findOne({ paymentReference }).select("_id invoiceNumber pdfPath");
    }
    if (!purchaseInvoice && !isFreeAccessRequest) {
      try {
        const buyerLabel = getPurchaseRequesterLabel(investorDoc || req.user);
        const createdInvoice = await Invoice.create({
          paymentReference,
          invoiceNumber: buildScriptPurchaseInvoiceNumber(razorpay_payment_id),
          invoiceDate: new Date(),
          creator: req.user._id,
          creatorSid: investorDoc?.sid || req.user?.sid || "",
          script: script._id,
          scriptSid: script?.sid || "",
          accessType: "premium",
          scriptPrice: pricing.baseAmount,
          platformFeeRate: pricing.platformTaxRate,
          writerEarnsPerSale: pricing.baseAmount,
          services: {
            hosting: false,
            evaluation: false,
            aiTrailer: false,
            trailerUpload: false,
          },
          totalCreditsRequired: 0,
          creditsBalanceBefore: 0,
          creditsBalanceAfter: 0,
          rows: [
            {
              item: "Script Purchase",
              type: "Payment",
              detail: `${buyerLabel} purchased full access for \"${script.title}\".`,
              amountLabel: `INR ${pricing.baseAmount.toFixed(2)}`,
              amountValue: pricing.baseAmount,
            },
            {
              item: `Platform Commission (${pricing.platformTaxPercent}%)`,
              type: "Tax",
              detail: "Buyer-side commission charged on script purchase.",
              amountLabel: `INR ${pricing.platformTaxAmount.toFixed(2)}`,
              amountValue: pricing.platformTaxAmount,
            },
            {
              item: "Total Paid",
              type: "Total",
              detail: "Total charged via payment gateway.",
              amountLabel: `INR ${pricing.totalAmount.toFixed(2)}`,
              amountValue: pricing.totalAmount,
            },
            {
              item: "Payment Gateway",
              type: "Reference",
              detail: `Razorpay Payment ID: ${razorpay_payment_id}`,
              amountLabel: "Verified",
              amountValue: 0,
            },
            {
              item: "Writer Payout",
              type: "Settlement",
              detail: `Credited to writer wallet: ${writerDoc.name || "Writer"}`,
              amountLabel: `INR ${pricing.baseAmount.toFixed(2)}`,
              amountValue: pricing.baseAmount,
            },
          ],
        });

        try {
          const buyerIdentity = investorDoc || req.user;
          const generatedPdf = await generateAndSaveInvoicePdf({
            invoice: createdInvoice,
            creatorName: buyerIdentity?.name,
            creatorEmail: buyerIdentity?.email,
            creatorSid: createdInvoice.creatorSid || buyerIdentity?.sid,
            scriptTitle: script?.title,
            scriptSid: createdInvoice.scriptSid || script?.sid,
          });

          if (generatedPdf?.relativePath) {
            createdInvoice.pdfPath = generatedPdf.relativePath;
            createdInvoice.pdfGeneratedAt = new Date();
            await createdInvoice.save();
          }
        } catch (pdfError) {
          console.error("Purchase invoice PDF generation error:", pdfError?.message || pdfError);
        }

        purchaseInvoice = {
          _id: createdInvoice._id,
          invoiceNumber: createdInvoice.invoiceNumber,
          pdfPath: createdInvoice.pdfPath || "",
        };
      } catch (invoiceError) {
        if (invoiceError?.code === 11000) {
          const duplicateInvoice = await Invoice.findOne({ paymentReference }).select("_id invoiceNumber pdfPath");
          purchaseInvoice = duplicateInvoice
            ? {
                _id: duplicateInvoice._id,
                invoiceNumber: duplicateInvoice.invoiceNumber,
                pdfPath: duplicateInvoice.pdfPath || "",
              }
            : null;
        } else {
          console.error("Purchase invoice creation error:", invoiceError);
        }
      }
    }

    await Notification.create({
      user: req.user._id,
      type: "purchase_approved",
      from: purchaseRequest.writer,
      script: script._id,
      message: isFreeAccessRequest
        ? `Free access confirmed for "${script.title}". Full script access is now unlocked.`
        : `Payment successful for "${script.title}". Full script access is now unlocked.`,
    });

    await Notification.create({
      user: purchaseRequest.writer,
      type: "purchase",
      from: req.user._id,
      script: script._id,
      message: isFreeAccessRequest
        ? `${investorDoc?.name || "An investor"} confirmed free access for "${script.title}" after approval.`
        : `${investorDoc?.name || "A buyer"} completed payment for "${script.title}". Payout of ₹${pricing.baseAmount.toLocaleString("en-IN")} has been credited to your wallet.`,
    });

    console.log("Script purchase settled:", {
      scriptId,
      buyerId: req.user._id,
      baseAmount: pricing.baseAmount,
      platformTaxAmount: pricing.platformTaxAmount,
      totalAmount: pricing.totalAmount,
      freeAccess: isFreeAccessRequest,
    });

    res.json({
      success: true,
      message: isFreeAccessRequest
        ? "Access granted. This project is free, so no payment or invoice was required."
        : "Payment successful. Full script access granted.",
      purchaseRequest: {
        id: purchaseRequest._id,
        status: purchaseRequest.status,
        paymentStatus: purchaseRequest.paymentStatus,
        acceptancePdfAvailable: Boolean(purchaseRequest?.acceptancePdf?.url),
      },
      invoice: purchaseInvoice || null,
      agreement: agreementRecord
        ? {
            id: agreementRecord._id,
            writerPdfUrl: agreementRecord.writer_pdf_url,
            buyerPdfUrl: agreementRecord.buyer_pdf_url,
            status: agreementRecord.status,
          }
        : null,
    });
  } catch (error) {
    console.error("Script purchase verification error:", error);
    res.status(500).json({
      message: "Failed to verify payment",
      error: error.message,
      success: false
    });
  }
};

// @desc    Create Razorpay order for script hold/option
// @route   POST /api/scripts/hold/create-order
// @access  Private
export const createScriptHoldOrder = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        message: "Payment system not configured. Please contact support.",
        error: "Razorpay credentials missing"
      });
    }

    const { scriptId } = req.body;

    const script = await Script.findById(scriptId).populate("creator", "name");
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    // Check if already held
    if (script.holdStatus === "held") {
      return res.status(400).json({ message: "This script is already on hold by another party" });
    }
    if (script.holdStatus === "sold") {
      return res.status(400).json({ message: "This script has been sold" });
    }

    const user = await User.findById(req.user._id);
    if (!["investor", "producer", "director"].includes(user.role)) {
      return res.status(403).json({ message: "Only industry professionals can hold scripts" });
    }

    const holdFee = script.holdFee || 200;
    const holdPricing = getScriptPurchasePricing(holdFee);

    // Create Razorpay order
    const options = {
      amount: Math.round(holdPricing.totalAmount * 100), // Amount in paise (INR)
      currency: "INR",
      receipt: `script_hold_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        scriptId: scriptId,
        scriptTitle: script.title,
        creatorId: script.creator._id.toString(),
        holdFee: holdPricing.baseAmount,
        buyerCommissionPercent: String(holdPricing.platformTaxPercent),
        buyerCommissionAmount: holdPricing.platformTaxAmount.toFixed(2),
        totalAmount: holdPricing.totalAmount.toFixed(2),
        type: "script_hold"
      }
    };

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      scriptDetails: {
        id: script._id,
        title: script.title,
        holdFee: holdPricing.baseAmount,
        creator: script.creator.name
      },
      pricing: holdPricing,
    });
  } catch (error) {
    console.error("Razorpay hold order creation error:", error);
    res.status(500).json({ message: "Failed to create payment order", error: error.message });
  }
};

// @desc    Verify Razorpay payment and place hold on script
// @route   POST /api/scripts/hold/verify-payment
// @access  Private
export const verifyScriptHold = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      scriptId
    } = req.body;

    console.log("Script hold verification:", { razorpay_order_id, razorpay_payment_id, scriptId });

    // Check if Razorpay key secret is available
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET not found in environment");
      return res.status(500).json({
        message: "Payment system not configured",
        success: false
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.error("Signature verification failed");
      return res.status(400).json({
        message: "Payment verification failed - Invalid signature",
        success: false
      });
    }

    // Payment verified successfully, place hold on script
    const script = await Script.findById(scriptId).populate("creator", "name email");
    if (!script) {
      console.error("Script not found:", scriptId);
      return res.status(404).json({
        message: "Script not found",
        success: false
      });
    }

    // Double-check hold status
    if (script.holdStatus === "held") {
      return res.status(400).json({
        message: "Script is already held",
        success: false
      });
    }

    const user = await User.findById(req.user._id);
    const fee = script.holdFee || 200;
    const pricing = getScriptPurchasePricing(fee);
    const platformCut = pricing.platformTaxAmount;
    const creatorPayout = pricing.baseAmount;
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create option record
    const option = await ScriptOption.create({
      script: scriptId,
      holder: req.user._id,
      fee,
      platformCut,
      creatorPayout,
      endDate,
      status: "active",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    });

    // Update script
    script.holdStatus = "held";
    script.heldBy = req.user._id;
    script.holdStartDate = new Date();
    script.holdEndDate = endDate;
    await script.save();

    const reference = `SCRIPT-HOLD-${razorpay_payment_id}`;

    // Create transaction record for holder (payment)
    await Transaction.create({
      user: req.user._id,
      type: "payment",
      amount: -pricing.totalAmount,
      currency: "INR",
      status: "completed",
      description: `Placed hold on script: "${script.title}" (30 days)`,
      reference,
      paymentMethod: "razorpay",
      relatedScript: script._id,
      metadata: {
        razorpay_order_id,
        razorpay_payment_id,
        holdEndDate: endDate,
        buyerCommissionAmount: platformCut,
        creatorPayout,
        totalPaid: pricing.totalAmount,
      }
    });

    // Credit the creator
    const creator = await User.findById(script.creator._id);
    if (!creator.wallet) {
      creator.wallet = { balance: 0, totalEarnings: 0 };
    }
    creator.wallet.balance += creatorPayout;
    creator.wallet.totalEarnings += creatorPayout;
    await creator.save();

    // Create transaction record for creator (earnings)
    await Transaction.create({
      user: creator._id,
      type: "credit",
      amount: creatorPayout,
      currency: "INR",
      status: "completed",
      description: `Earned from script hold: "${script.title}"`,
      reference: `SCRIPT-HOLD-EARNING-${razorpay_payment_id}`,
      paymentMethod: "razorpay",
      relatedScript: script._id,
      metadata: {
        holderId: req.user._id.toString(),
        buyerCommissionAmount: platformCut,
        originalAmount: pricing.baseAmount,
        holdEndDate: endDate
      }
    });

    // Notify the creator
    await Notification.create({
      user: script.creator._id,
      type: "hold",
      from: req.user._id,
      script: script._id,
      message: `${user.name} has placed a hold on "${script.title}" for ₹${pricing.totalAmount.toFixed(2)} (includes 5% platform commission, 30 days). You earn ₹${creatorPayout.toFixed(2)}.`,
    });

    console.log("Script hold completed:", { scriptId, holderId: req.user._id, fee });

    res.json({
      success: true,
      message: "Hold placed successfully!",
      option,
      holdDetails: {
        fee: pricing.baseAmount,
        buyerCommission: platformCut,
        totalPaid: pricing.totalAmount,
        platformCut,
        creatorPayout,
        expiresAt: endDate,
      },
      transaction: {
        reference,
        amount: pricing.totalAmount,
      }
    });
  } catch (error) {
    console.error("Script hold verification error:", error);
    res.status(500).json({
      message: "Failed to verify payment",
      error: error.message,
      success: false
    });
  }
};

// ── Multer Configuration for Thumbnail & Trailer Uploads (Memory Storage → Cloudinary) ──

// File filters
const imageFileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "image/gif",
  ];
  const ext = path.extname(file.originalname || "").toLowerCase();
  const extensionAllowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);

  if (allowed.includes(file.mimetype) || extensionAllowed) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed"), false);
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm", "video/x-m4v"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only MP4, MPEG, MOV, M4V and WebM videos are allowed"), false);
  }
};

// Export multer upload instances (memory storage for Cloudinary)
export const uploadThumbnail = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadTrailer = multer({
  storage: multer.memoryStorage(),
  fileFilter: videoFileFilter,
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit
});

// ── Upload Thumbnail Controller (Cloudinary) ──
export const uploadScriptThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No thumbnail file provided" });
    }

    const scriptId = req.params.id;
    const script = await Script.findById(scriptId);

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can upload a thumbnail" });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "scriptbridge/thumbnails",
      resource_type: "image",
      public_id: `thumb-${scriptId}-${Date.now()}`,
    });

    const thumbnailUrl = result.secure_url;
    script.coverImage = thumbnailUrl;
    await script.save();

    res.json({
      message: "Thumbnail uploaded successfully",
      thumbnailUrl,
      script
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Upload Trailer Controller (Cloudinary) ──
export const uploadScriptTrailer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No trailer file provided" });
    }

    const scriptId = req.params.id;
    const script = await Script.findById(scriptId);

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can upload a trailer" });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "scriptbridge/trailers",
      resource_type: "video",
      public_id: `trailer-${scriptId}-${Date.now()}`,
    });

    const trailerUrl = result.secure_url;
    script.uploadedTrailerUrl = trailerUrl;
    script.trailerSource = "uploaded";

    const shouldKeepAiQueue = Boolean(script.services?.aiTrailer && !script.trailerUrl);
    if (shouldKeepAiQueue) {
      if (!["requested", "generating"].includes(script.trailerStatus)) {
        script.trailerStatus = "requested";
      }
      script.trailerWriterFeedback = {
        status: "pending",
        note: script.trailerWriterFeedback?.note || "",
        updatedAt: new Date(),
      };
    } else {
      script.trailerStatus = "ready";
      script.trailerWriterFeedback = {
        status: "approved",
        note: "",
        updatedAt: new Date(),
      };
    }
    await script.save();

    res.json({
      message: shouldKeepAiQueue
        ? "Trailer uploaded successfully. AI trailer request is still active."
        : "Trailer uploaded successfully (free)",
      trailerUrl,
      trailerSource: "uploaded",
      script
    });
  } catch (error) {
    console.error("Trailer upload error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Writer Requests AI Trailer from Platform ──
export const requestScriptAITrailer = async (req, res) => {
  try {
    const scriptId = req.params.id;
    const { note } = req.body || {};

    const script = await Script.findById(scriptId);
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can request an AI trailer" });
    }

    if (script.trailerStatus === "ready" && script.trailerUrl) {
      return res.status(400).json({ message: "AI trailer is already ready for this script" });
    }

    const alreadyPaid = Boolean(
      script.services?.aiTrailer || Number(script.billing?.spotlightCreditsChargedAtUpload || 0) > 0
    );

    if (!alreadyPaid) {
      const user = await User.findById(req.user._id);
      const requiredCredits = CREDIT_PRICES.AI_TRAILER;
      const userBalance = user?.credits?.balance || 0;

      if (userBalance < requiredCredits) {
        return res.status(402).json({
          message: `Insufficient credits. AI Trailer generation requires ${requiredCredits} credits.`,
          requiresCredits: true,
          required: requiredCredits,
          balance: userBalance,
          shortfall: requiredCredits - userBalance,
        });
      }

      user.credits.balance -= requiredCredits;
      user.credits.totalSpent += requiredCredits;
      user.credits.transactions.push({
        type: "spent",
        amount: -requiredCredits,
        description: `AI Trailer generation for "${script.title}"`,
        reference: `TRAILER-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date(),
      });
      await user.save();

      const currentBilling = script.billing || {};
      script.billing = {
        ...currentBilling,
        evaluationCreditsCharged: Number(currentBilling.evaluationCreditsCharged || 0),
        aiTrailerCreditsCharged: Number(currentBilling.aiTrailerCreditsCharged || 0) + requiredCredits,
        evaluationCreditsRefunded: Number(currentBilling.evaluationCreditsRefunded || 0),
        aiTrailerCreditsRefunded: Number(currentBilling.aiTrailerCreditsRefunded || 0),
        spotlightCreditsSpent: Number(currentBilling.spotlightCreditsSpent || 0),
        lastSpotlightRefundCredits: Number(currentBilling.lastSpotlightRefundCredits || 0),
        lastSpotlightActivatedAt: currentBilling.lastSpotlightActivatedAt,
      };
      script.markModified("billing");
    }

    script.services = {
      hosting: script.services?.hosting ?? true,
      evaluation: script.services?.evaluation ?? false,
      aiTrailer: true,
      spotlight: script.services?.spotlight ?? false,
    };
    script.trailerStatus = "requested";
    script.trailerWriterFeedback = {
      status: "pending",
      note: note?.trim() || "",
      updatedAt: new Date(),
    };
    await script.save();

    await notifyAdminWorkflowEvent({
      title: "AI Trailer Approval Request",
      section: "trailers",
      actorId: req.user._id,
      scriptId: script._id,
      message: `AI trailer requested by writer for "${script.title}"${note ? `. Note: ${note}` : ""}`,
      metadata: {
        scriptId: script._id,
        writerId: req.user._id,
        writerNote: note?.trim() || "",
      },
    });

    res.json({
      message: "AI trailer request submitted to platform",
      script,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Writer Feedback for Platform AI Trailer ──
export const submitTrailerFeedback = async (req, res) => {
  try {
    const scriptId = req.params.id;
    const { action, note } = req.body || {};

    if (!["approved", "revision_requested"].includes(action)) {
      return res.status(400).json({ message: "action must be approved or revision_requested" });
    }

    const script = await Script.findById(scriptId);
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can submit trailer feedback" });
    }

    if (!script.trailerUrl) {
      return res.status(400).json({ message: "No AI trailer available for feedback" });
    }

    script.trailerWriterFeedback = {
      status: action,
      note: note?.trim() || "",
      updatedAt: new Date(),
    };

    if (action === "revision_requested") {
      script.trailerStatus = "requested";
    } else {
      script.trailerStatus = "ready";
    }

    await script.save();

    if (action === "revision_requested") {
      await notifyAdminWorkflowEvent({
        title: "AI Trailer Revision Requested",
        section: "trailers",
        actorId: req.user._id,
        scriptId: script._id,
        message: `Writer requested a better AI trailer version for "${script.title}"${note?.trim() ? `. Note: ${note.trim()}` : ""}`,
        metadata: {
          scriptId: script._id,
          writerId: req.user._id,
          writerNote: note?.trim() || "",
        },
      });
    }

    res.json({
      message:
        action === "approved"
          ? "Trailer marked as approved"
          : "Trailer revision request submitted",
      script,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

