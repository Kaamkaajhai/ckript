import { MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH } from "../constants";

/* Rights & licensing option lists, label maps, default/normalize helpers, and
   validation. Pure — no React. Shared by the Step-5 publish UI and the payload
   builders in the orchestrator. */

export const RIGHTS_TYPE_OPTIONS = [
  { value: "full_rights_sale", label: "Full Rights Sale (Ownership Transfer)" },
  { value: "exclusive_license", label: "Exclusive License" },
  { value: "custom_negotiation_required", label: "Custom Negotiation Required" },
];

export const MODIFICATION_RIGHTS_OPTIONS = [
  { value: "buyer_can_modify_freely", label: "Buyer can modify freely" },
  { value: "buyer_must_consult_writer", label: "Buyer must consult writer" },
  { value: "writer_retains_creative_approval_rights", label: "Writer retains creative approval rights" },
];

export const PAYMENT_STRUCTURE_OPTIONS = [
  { value: "one_time_upfront_payment", label: "One-time upfront payment" },
  { value: "lower_upfront_plus_royalty_percent", label: "Lower upfront + royalty %" },
  { value: "revenue_sharing_model", label: "Revenue sharing model" },
  { value: "custom_deal", label: "Custom deal" },
];

export const NEGOTIATION_MODE_OPTIONS = [
  { value: "fixed_terms_non_negotiable", label: "Fixed terms (non-negotiable)" },
  { value: "open_to_discussion_after_purchase", label: "Open to discussion after purchase" },
];

export const RIGHTS_LABEL_MAP = Object.fromEntries(RIGHTS_TYPE_OPTIONS.map((option) => [option.value, option.label]));
export const MODIFICATION_LABEL_MAP = Object.fromEntries(MODIFICATION_RIGHTS_OPTIONS.map((option) => [option.value, option.label]));
export const PAYMENT_LABEL_MAP = Object.fromEntries(PAYMENT_STRUCTURE_OPTIONS.map((option) => [option.value, option.label]));
export const NEGOTIATION_LABEL_MAP = Object.fromEntries(NEGOTIATION_MODE_OPTIONS.map((option) => [option.value, option.label]));
export const LICENSE_DURATION_PRESET_MONTHS = [12, 18, 24];
export const MIN_LICENSE_DURATION_MONTHS = 1;
export const MAX_LICENSE_DURATION_MONTHS = 120;

export const createDefaultRightsLicensing = () => ({
  rightsType: "full_rights_sale",
  exclusivity: true,
  modificationRights: "buyer_must_consult_writer",
  paymentStructure: "one_time_upfront_payment",
  royaltySettings: {
    percentage: 0,
    durationType: "none",
    durationYears: 0,
  },
  timeBound: {
    licenseDurationMonths: 12,
    autoRevertToWriter: true,
  },
  negotiationMode: "fixed_terms_non_negotiable",
  customConditions: "",
  legalAcknowledgement: {
    ownershipConfirmed: false,
    platformTermsAccepted: false,
    exclusivityUnderstood: false,
  },
});

export const normalizeRightsLicensingState = (incoming = {}) => {
  const defaults = createDefaultRightsLicensing();
  const normalizedRightsType = RIGHTS_LABEL_MAP[incoming?.rightsType] ? incoming.rightsType : defaults.rightsType;
  const normalizedPaymentStructure = PAYMENT_LABEL_MAP[incoming?.paymentStructure]
    ? incoming.paymentStructure
    : defaults.paymentStructure;
  const requestedDurationRaw = Number(incoming?.timeBound?.licenseDurationMonths ?? defaults.timeBound.licenseDurationMonths);
  const requestedDuration = Number.isFinite(requestedDurationRaw)
    ? Math.max(0, Math.min(MAX_LICENSE_DURATION_MONTHS, Math.round(requestedDurationRaw)))
    : defaults.timeBound.licenseDurationMonths;

  return {
    rightsType: normalizedRightsType,
    exclusivity: incoming?.exclusivity !== undefined ? Boolean(incoming.exclusivity) : defaults.exclusivity,
    modificationRights: MODIFICATION_LABEL_MAP[incoming?.modificationRights]
      ? incoming.modificationRights
      : defaults.modificationRights,
    paymentStructure: normalizedPaymentStructure,
    royaltySettings: {
      percentage: Number.isFinite(Number(incoming?.royaltySettings?.percentage))
        ? Math.max(0, Math.min(100, Number(incoming.royaltySettings.percentage)))
        : defaults.royaltySettings.percentage,
      durationType: ["none", "years", "project_lifetime"].includes(incoming?.royaltySettings?.durationType)
        ? incoming.royaltySettings.durationType
        : defaults.royaltySettings.durationType,
      durationYears: Number.isFinite(Number(incoming?.royaltySettings?.durationYears))
        ? Math.max(0, Math.min(99, Math.round(Number(incoming.royaltySettings.durationYears))))
        : defaults.royaltySettings.durationYears,
    },
    timeBound: {
      licenseDurationMonths: requestedDuration,
      autoRevertToWriter: incoming?.timeBound?.autoRevertToWriter !== undefined
        ? Boolean(incoming.timeBound.autoRevertToWriter)
        : defaults.timeBound.autoRevertToWriter,
    },
    negotiationMode: NEGOTIATION_LABEL_MAP[incoming?.negotiationMode]
      ? incoming.negotiationMode
      : defaults.negotiationMode,
    customConditions: String(incoming?.customConditions || "").slice(0, MAX_RIGHTS_CUSTOM_CONDITIONS_LENGTH),
    legalAcknowledgement: {
      ownershipConfirmed: Boolean(incoming?.legalAcknowledgement?.ownershipConfirmed),
      platformTermsAccepted: Boolean(incoming?.legalAcknowledgement?.platformTermsAccepted),
      exclusivityUnderstood: Boolean(incoming?.legalAcknowledgement?.exclusivityUnderstood),
    },
  };
};

export const getRightsValidationMessage = (rightsLicensing) => {
  if (!RIGHTS_LABEL_MAP[rightsLicensing?.rightsType]) {
    return "Rights type is required.";
  }

  if (!MODIFICATION_LABEL_MAP[rightsLicensing?.modificationRights]) {
    return "Modification rights selection is required.";
  }

  if (!PAYMENT_LABEL_MAP[rightsLicensing?.paymentStructure]) {
    return "Payment structure selection is required.";
  }

  if (!NEGOTIATION_LABEL_MAP[rightsLicensing?.negotiationMode]) {
    return "Negotiation mode selection is required.";
  }

  if (rightsLicensing?.rightsType === "exclusive_license") {
    const durationMonths = Number(rightsLicensing?.timeBound?.licenseDurationMonths);
    if (!Number.isInteger(durationMonths) || durationMonths < MIN_LICENSE_DURATION_MONTHS || durationMonths > MAX_LICENSE_DURATION_MONTHS) {
      return `Exclusive license requires duration between ${MIN_LICENSE_DURATION_MONTHS} and ${MAX_LICENSE_DURATION_MONTHS} months.`;
    }
  }

  const royaltyBased = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(rightsLicensing?.paymentStructure);
  if (royaltyBased) {
    const pct = Number(rightsLicensing?.royaltySettings?.percentage || 0);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return "Royalty percentage must be between 0 and 100 for royalty-based structures.";
    }
  }

  if (!rightsLicensing?.legalAcknowledgement?.ownershipConfirmed) {
    return "You must confirm script ownership rights.";
  }

  if (!rightsLicensing?.legalAcknowledgement?.platformTermsAccepted) {
    return "You must confirm platform legal acknowledgement.";
  }

  if (!rightsLicensing?.legalAcknowledgement?.exclusivityUnderstood) {
    return "You must acknowledge exclusivity enforcement.";
  }

  return "";
};
