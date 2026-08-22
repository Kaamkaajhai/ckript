import api from "../../services/api";

export const PAYOUT_ACCOUNT_TYPES = Object.freeze([
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "business", label: "Business" },
]);
export const MEMBERSHIP_PROOF_TYPES = Object.freeze(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
export const MEMBERSHIP_PROOF_MAX_BYTES = 10 * 1024 * 1024;

const ACCOUNT_NUMBER_PATTERN = /^\d{8,20}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ROUTING_PATTERN = /^[A-Z0-9-]{4,20}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const text = (value) => String(value ?? "").trim();
const failure = (cause, fallback) => ({
  ok: false,
  message: cause?.response?.data?.message || fallback,
  status: Number(cause?.response?.status || 0),
  cause,
});

export const EMPTY_PAYOUT_DRAFT = Object.freeze({
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  routingNumber: "",
  accountType: "checking",
  swiftCode: "",
  iban: "",
  country: "IN",
  currency: "INR",
});

export function normalizePayoutState(payload = {}) {
  const review = payload.bankDetailsReview || { status: "not_submitted" };
  const approved = payload.bankDetails || null;
  const requested = review.requestedDetails || null;
  const display = requested || approved;
  return {
    approved,
    review: {
      status: text(review.status) || "not_submitted",
      submittedAt: review.submittedAt || null,
      dueAt: review.dueAt || null,
      reviewedAt: review.reviewedAt || null,
      adminNote: text(review.adminNote),
      requestedDetails: requested,
    },
    security: {
      invalidAttempts: Math.max(0, Number(payload.bankDetailsSecurity?.invalidAttempts || 0)),
      isLocked: Boolean(payload.bankDetailsSecurity?.isLocked),
      lockedAt: payload.bankDetailsSecurity?.lockedAt || null,
    },
    display,
    draft: {
      ...EMPTY_PAYOUT_DRAFT,
      accountHolderName: text(display?.accountHolderName),
      bankName: text(display?.bankName),
      routingNumber: text(display?.routingNumber).toUpperCase(),
      accountType: text(display?.accountType) || "checking",
      swiftCode: text(display?.swiftCode).toUpperCase(),
      iban: text(display?.iban).toUpperCase(),
      country: text(display?.country).toUpperCase() || "IN",
      currency: text(display?.currency).toUpperCase() || "INR",
      // A masked response is a display value, never a form value. Every change
      // is deliberately re-authorized by entering the complete account number.
      accountNumber: "",
    },
  };
}

export function buildPayoutSubmission(draft = {}) {
  const data = {
    accountHolderName: text(draft.accountHolderName),
    bankName: text(draft.bankName),
    accountNumber: text(draft.accountNumber).replace(/\s+/g, ""),
    routingNumber: text(draft.routingNumber).replace(/\s+/g, "").toUpperCase(),
    accountType: text(draft.accountType).toLowerCase() || "checking",
    swiftCode: text(draft.swiftCode).replace(/\s+/g, "").toUpperCase(),
    iban: text(draft.iban).replace(/\s+/g, "").toUpperCase(),
    country: text(draft.country).toUpperCase() || "IN",
    currency: text(draft.currency).toUpperCase() || "INR",
  };
  const fieldErrors = {};
  if (!data.accountHolderName) fieldErrors.accountHolderName = "Enter the account holder name.";
  if (!data.bankName) fieldErrors.bankName = "Enter the bank name.";
  if (!ACCOUNT_NUMBER_PATTERN.test(data.accountNumber)) fieldErrors.accountNumber = "Enter the full 8–20 digit account number.";
  if (!COUNTRY_PATTERN.test(data.country)) fieldErrors.country = "Use a two-letter country code.";
  if (!CURRENCY_PATTERN.test(data.currency)) fieldErrors.currency = "Use a three-letter currency code.";
  if (!PAYOUT_ACCOUNT_TYPES.some(({ value }) => value === data.accountType)) fieldErrors.accountType = "Choose a supported account type.";
  if (!data.routingNumber) fieldErrors.routingNumber = "Enter a routing or IFSC number.";
  else if (data.country === "IN" && !IFSC_PATTERN.test(data.routingNumber)) fieldErrors.routingNumber = "Enter a valid IFSC code, such as HDFC0001234.";
  else if (data.country !== "IN" && !ROUTING_PATTERN.test(data.routingNumber)) fieldErrors.routingNumber = "Use 4–20 letters, numbers, or hyphens.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Review the highlighted payout fields.", fieldErrors };
  if (data.country === "IN") data.currency = "INR";
  return { ok: true, data };
}

export async function loadPayoutDetails() {
  try {
    const { data } = await api.get("/transactions/bank-details");
    return { ok: true, data: normalizePayoutState(data) };
  } catch (cause) {
    return failure(cause, "Could not load payout details.");
  }
}

export async function submitPayoutDetails(draft) {
  const payload = buildPayoutSubmission(draft);
  if (!payload.ok) return payload;
  try {
    const { data } = await api.put("/transactions/bank-details", payload.data);
    return { ok: true, data: normalizePayoutState(data), message: data?.message || "Payout details submitted for review." };
  } catch (cause) {
    return failure(cause, "Could not submit payout details.");
  }
}

const EMPTY_MEMBERSHIP_REVIEW = Object.freeze({ requested: false, status: "not_submitted", proofFileName: "", proofMimeType: "", submittedAt: null, reviewedAt: null, adminNote: "", hasProof: false });

export function normalizeMembershipReviews(writerProfile = {}) {
  const verification = writerProfile.membershipVerification || {};
  return Object.fromEntries(["wga", "swa"].map((type) => {
    const entry = verification[type] || {};
    return [type, {
      ...EMPTY_MEMBERSHIP_REVIEW,
      requested: Boolean(entry.requested),
      status: text(entry.status) || "not_submitted",
      proofFileName: text(entry.proofFileName),
      proofMimeType: text(entry.proofMimeType),
      submittedAt: entry.submittedAt || null,
      reviewedAt: entry.reviewedAt || null,
      adminNote: text(entry.adminNote),
      hasProof: Boolean(entry.proofUrl || entry.proofPublicId || entry.proofFileName),
    }];
  }));
}

export function validateMembershipProof(file) {
  if (!file) return { ok: false, message: "Choose a proof file." };
  if (!MEMBERSHIP_PROOF_TYPES.includes(text(file.type).toLowerCase())) {
    return { ok: false, message: "Choose a PDF, JPG, PNG, or WebP file." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, message: "The selected file is empty." };
  if (file.size > MEMBERSHIP_PROOF_MAX_BYTES) return { ok: false, message: "Proof files must be 10 MB or smaller." };
  return { ok: true };
}

export async function submitMembershipProof({ membershipType, file, onProgress } = {}) {
  const type = text(membershipType).toLowerCase();
  if (!["wga", "swa"].includes(type)) return { ok: false, message: "Choose WGA or SWA membership." };
  const validation = validateMembershipProof(file);
  if (!validation.ok) return validation;
  const body = new FormData();
  body.append("membershipType", type);
  body.append("proof", file);
  try {
    const { data } = await api.post("/onboarding/writer-membership-proof", body, {
      onUploadProgress: (event) => {
        if (!event.total) return;
        onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      },
    });
    return { ok: true, data: data?.user?.writerProfile || {}, message: data?.message || `${type.toUpperCase()} proof submitted for review.` };
  } catch (cause) {
    return failure(cause, "Could not upload membership proof.");
  }
}

export async function loadMembershipProofAccessUrl(membershipType) {
  const type = text(membershipType).toLowerCase();
  if (!["wga", "swa"].includes(type)) return { ok: false, message: "Choose WGA or SWA membership." };
  try {
    const { data } = await api.get("/onboarding/writer-membership-proof/access-url", { params: { membershipType: type } });
    if (!data?.url) return { ok: false, message: "Proof link unavailable." };
    return { ok: true, data: { url: data.url } };
  } catch (cause) {
    return failure(cause, "Could not open the proof file.");
  }
}
