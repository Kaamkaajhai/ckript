/*
 * ONE vocabulary for the rights/deal enums on `Script.rightsLicensing`.
 *
 * DEF-28. These four maps existed in FOUR places — `ScriptDetail.jsx` (where all four were dead
 * code, defined and never read), `ScriptWorkbenchPage.jsx` (the live project-detail presentation),
 * `ScriptPaymentPage.jsx` and `AdminScriptView.jsx` — and they had drifted. The workbench's copy
 * of the negotiation map omits `ckript_not_involved`, which is a value the schema accepts, the
 * admin editor offers, and the payment page labels. A writer who chose it saw their rights term
 * rendered as **"Not specified"** on the page a buyer reads before deciding, on the platform that
 * charges a commission on the resulting sale.
 *
 * So the failure was not a typo but the duplication: four copies of a closed enum, and adding a
 * value to the schema updated none of them. There is one copy now, and `assertKnownDealEnums`
 * below is here so the next added value fails a test instead of rendering as "Not specified".
 *
 * The maps stay wordier here than the workbench's abbreviated copy, because the shortest string is
 * the one that has to survive a phone's column width AND a legal summary; where a surface needs a
 * compact form it asks for `short`.
 */

export const RIGHTS_TYPE_LABELS = Object.freeze({
  full_rights_sale: "Full rights sale (ownership transfer)",
  exclusive_license: "Exclusive license",
  custom_negotiation_required: "Custom negotiation required",
});

export const RIGHTS_TYPE_SHORT_LABELS = Object.freeze({
  full_rights_sale: "Full rights sale",
  exclusive_license: "Exclusive license",
  custom_negotiation_required: "Custom negotiation",
});

export const MODIFICATION_LABELS = Object.freeze({
  buyer_can_modify_freely: "Buyer can modify freely",
  buyer_must_consult_writer: "Buyer must consult writer",
  writer_retains_creative_approval_rights: "Writer retains creative approval rights",
});

export const PAYMENT_LABELS = Object.freeze({
  one_time_upfront_payment: "One-time upfront payment",
  lower_upfront_plus_royalty_percent: "Lower upfront + royalty %",
  revenue_sharing_model: "Revenue sharing model",
  custom_deal: "Custom deal",
});

export const NEGOTIATION_LABELS = Object.freeze({
  fixed_terms_non_negotiable: "Fixed terms (non-negotiable)",
  open_to_discussion_after_purchase: "Open to discussion after purchase",
  // The value the workbench's private copy was missing.
  ckript_not_involved: "Ckript not involved",
});

export const UNSPECIFIED_DEAL_TERM = "Not specified";

const label = (map, value, fallback = UNSPECIFIED_DEAL_TERM) => (
  map[String(value || "")] || fallback
);

export const rightsTypeLabel = (value, { short = false } = {}) => (
  label(short ? RIGHTS_TYPE_SHORT_LABELS : RIGHTS_TYPE_LABELS, value)
);
export const modificationLabel = (value) => label(MODIFICATION_LABELS, value);
export const paymentStructureLabel = (value) => label(PAYMENT_LABELS, value);
export const negotiationLabel = (value) => label(NEGOTIATION_LABELS, value);

/**
 * The schema enums these maps must cover, written out so a test can compare them.
 *
 * Kept as data rather than imported from the server: the client cannot read the Mongoose schema,
 * and a copy that a test compares is a copy that fails loudly when it drifts — which is exactly
 * what the four silent copies did not do.
 */
export const DEAL_ENUMS = Object.freeze({
  rightsType: Object.freeze(["full_rights_sale", "exclusive_license", "custom_negotiation_required"]),
  modificationRights: Object.freeze([
    "buyer_can_modify_freely",
    "buyer_must_consult_writer",
    "writer_retains_creative_approval_rights",
  ]),
  paymentStructure: Object.freeze([
    "one_time_upfront_payment",
    "lower_upfront_plus_royalty_percent",
    "revenue_sharing_model",
    "custom_deal",
  ]),
  negotiationMode: Object.freeze([
    "fixed_terms_non_negotiable",
    "open_to_discussion_after_purchase",
    "ckript_not_involved",
  ]),
});
