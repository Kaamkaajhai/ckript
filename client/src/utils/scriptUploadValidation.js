import { getScriptCompletionValidationMessage } from "./scriptCompletion";

export const UPLOAD_SCREEN_LOCATIONS = Object.freeze({
  upload: { step: 1, detailStep: 0, label: "Upload" },
  basics: { step: 2, detailStep: 0, label: "Project basics" },
  story: { step: 2, detailStep: 1, label: "Story" },
  cast: { step: 2, detailStep: 2, label: "Cast & roles" },
  progress: { step: 2, detailStep: 3, label: "Progress" },
  access: { step: 2, detailStep: 4, label: "Preview access" },
  media: { step: 2, detailStep: 5, label: "Visual assets" },
  classify: { step: 3, detailStep: 0, label: "Classification" },
  film: { step: 4, detailStep: 0, label: "Film info" },
  publish: { step: 5, detailStep: 0, label: "Publish" },
});

export const UPLOAD_SCREEN_ORDER = Object.freeze([
  "upload",
  "basics",
  "story",
  "cast",
  "progress",
  "access",
  "media",
  "classify",
  "film",
  "publish",
]);

export const DETAIL_SCREEN_ORDER = Object.freeze([
  "basics",
  "story",
  "cast",
  "progress",
  "access",
  "media",
]);

const RIGHTS_TYPES = new Set(["full_rights_sale", "exclusive_license", "custom_negotiation_required"]);
const MODIFICATION_RIGHTS = new Set([
  "buyer_can_modify_freely",
  "buyer_must_consult_writer",
  "writer_retains_creative_approval_rights",
]);
const PAYMENT_STRUCTURES = new Set([
  "one_time_upfront_payment",
  "lower_upfront_plus_royalty_percent",
  "revenue_sharing_model",
  "custom_deal",
]);
const NEGOTIATION_MODES = new Set(["fixed_terms_non_negotiable", "open_to_discussion_after_purchase"]);
const ROYALTY_PAYMENTS = new Set(["lower_upfront_plus_royalty_percent", "revenue_sharing_model"]);

const issue = (screen, fieldId, message, code) => ({
  ...UPLOAD_SCREEN_LOCATIONS[screen],
  screen,
  fieldId,
  message,
  code,
});

const isBlank = (value) => !String(value ?? "").trim();

const roleAgeIssues = (roles = []) => {
  const issues = [];
  roles.forEach((role, index) => {
    const minRaw = role?.ageRange?.min;
    const maxRaw = role?.ageRange?.max;
    const hasMin = minRaw !== "" && minRaw !== null && minRaw !== undefined;
    const hasMax = maxRaw !== "" && maxRaw !== null && maxRaw !== undefined;
    const min = Number(minRaw);
    const max = Number(maxRaw);

    if (hasMin && (!Number.isInteger(min) || min < 0)) {
      issues.push(issue("cast", `su-role-${index}-min-age`, `Role ${index + 1}: Minimum age must be a whole number of 0 or more.`, `role-${index}-min-age`));
    }
    if (hasMax && (!Number.isInteger(max) || max < 0)) {
      issues.push(issue("cast", `su-role-${index}-max-age`, `Role ${index + 1}: Maximum age must be a whole number of 0 or more.`, `role-${index}-max-age`));
    }
    if (hasMin && hasMax && Number.isFinite(min) && Number.isFinite(max) && max < min) {
      issues.push(issue("cast", `su-role-${index}-max-age`, `Role ${index + 1}: Maximum age must be greater than or equal to minimum age.`, `role-${index}-age-order`));
    }
  });
  return issues;
};

export const getUploadScreenKey = (step, detailStep = 0) => {
  if (Number(step) === 1) return "upload";
  if (Number(step) === 2) return DETAIL_SCREEN_ORDER[Math.max(0, Math.min(5, Number(detailStep) || 0))];
  if (Number(step) === 3) return "classify";
  if (Number(step) === 4) return "film";
  return "publish";
};

export const validateUploadScreen = (screen, context = {}) => {
  const {
    formData = {},
    textContent = "",
    uploadedFile = null,
    existingUploadedFile = null,
    roles = [],
    filmDetails = {},
    rightsLicensing = {},
    legal = {},
    isPremium = false,
    effectivePrice = 0,
    maxInvestorTermsLength = 3000,
    maxRightsConditionsLength = 5000,
    contentOnly = false,
  } = context;
  const issues = [];

  if (screen === "upload") {
    if (contentOnly) {
      if (isBlank(textContent)) {
        issues.push(issue("upload", "su-script-content", "Script content cannot be empty.", "script-content-required"));
      }
      return issues;
    }
    if (isBlank(formData.title)) {
      issues.push(issue("upload", "su-project-title", "Add a project title before continuing.", "title-required"));
    }
    if (!uploadedFile && !existingUploadedFile && isBlank(textContent)) {
      issues.push(issue("upload", "su-file-picker", "Upload a PDF, DOCX, or DOC file, or continue from the screenplay editor.", "script-source-required"));
    }
  }

  if (screen === "basics") {
    if (isBlank(formData.format)) {
      issues.push(issue("basics", "su-format", "Choose the format that best matches this project.", "format-required"));
    }
    if (formData.format === "other" && isBlank(formData.formatOther)) {
      issues.push(issue("basics", "su-format-other", "Specify the custom format.", "format-other-required"));
    }
    const pageCount = Number(formData.pageCount);
    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      issues.push(issue("basics", "su-page-count", "Page count was not detected. Return to Upload and replace the script file.", "page-count-required"));
    }
  }

  if (screen === "story") {
    if (isBlank(formData.logline)) {
      issues.push(issue("story", "su-logline", "Write a logline before continuing.", "logline-required"));
    } else if (String(formData.logline).length > 500) {
      issues.push(issue("story", "su-logline", "Keep the logline to 500 characters or fewer.", "logline-too-long"));
    }
    if (isBlank(formData.synopsis)) {
      issues.push(issue("story", "su-synopsis", "Write a synopsis before continuing.", "synopsis-required"));
    }
  }

  if (screen === "cast") {
    issues.push(...roleAgeIssues(roles));
  }

  if (screen === "progress") {
    const completionMessage = getScriptCompletionValidationMessage(formData);
    if (completionMessage) {
      const fieldId = completionMessage.toLowerCase().startsWith("completed")
        ? "su-completed-parts"
        : "su-total-parts";
      issues.push(issue("progress", fieldId, completionMessage, "completion-invalid"));
    }
  }

  if (screen === "access" && formData.viewableScript) {
    const start = Number(formData.previewWindowStart);
    const end = Number(formData.previewWindowEnd);
    const pageCount = Number(formData.pageCount);
    if (!Number.isInteger(start) || start < 1) {
      issues.push(issue("access", "su-preview-start", "Preview start page must be a whole number of 1 or more.", "preview-start-invalid"));
    }
    if (!Number.isInteger(end) || end < 1) {
      issues.push(issue("access", "su-preview-end", "Preview end page must be a whole number of 1 or more.", "preview-end-invalid"));
    } else if (Number.isInteger(start) && end < start) {
      issues.push(issue("access", "su-preview-end", "Preview end page cannot be before the start page.", "preview-order-invalid"));
    } else if (Number.isInteger(pageCount) && pageCount > 0 && end > pageCount) {
      issues.push(issue("access", "su-preview-end", `Preview cannot extend beyond page ${pageCount}.`, "preview-exceeds-pages"));
    }
  }

  if (screen === "classify" && isBlank(formData.primaryGenre)) {
    issues.push(issue("classify", "su-primary-genre", "Choose a primary genre before continuing.", "genre-required"));
  }

  if (screen === "film") {
    if (isBlank(filmDetails.filmLanguage)) {
      issues.push(issue("film", "su-film-language", "Choose the film language before continuing.", "film-language-required"));
    } else if (filmDetails.filmLanguage === "Other" && isBlank(filmDetails.filmLanguageCustom)) {
      issues.push(issue("film", "su-film-language-custom", "Specify the custom film language.", "film-language-custom-required"));
    }
  }

  if (screen === "publish") {
    if (Number(effectivePrice) <= 0) {
      issues.push(issue("publish", "su-custom-price", "Enter a valid paid-access price.", "price-required"));
    }
    if (!legal.agreedToTerms || !rightsLicensing.legalAcknowledgement?.platformTermsAccepted) {
      issues.push(issue("publish", "su-legal-terms", "Accept the Script Upload Terms & Conditions.", "platform-terms-required"));
    }
  }

  return issues;
};

export const validateUploadWorkflow = (context = {}) => (
  UPLOAD_SCREEN_ORDER.flatMap((screen) => validateUploadScreen(screen, context))
);

const SERVER_ERROR_ROUTES = [
  { pattern: /title/i, screen: "upload", fieldId: "su-project-title", code: "server-title" },
  { pattern: /(script content|text content|upload.*file|pdf|docx|document)/i, screen: "upload", fieldId: "su-file-picker", code: "server-script-source" },
  { pattern: /page count/i, screen: "basics", fieldId: "su-page-count", code: "server-page-count" },
  { pattern: /format/i, screen: "basics", fieldId: "su-format", code: "server-format" },
  { pattern: /synopsis/i, screen: "story", fieldId: "su-synopsis", code: "server-synopsis" },
  { pattern: /logline/i, screen: "story", fieldId: "su-logline", code: "server-logline" },
  { pattern: /(role|cast|age range|max age|min age)/i, screen: "cast", fieldId: "su-role-list", code: "server-cast" },
  { pattern: /(completion|completed parts|total planned|future update)/i, screen: "progress", fieldId: "su-completion-status", code: "server-progress" },
  { pattern: /(preview|start page|end page)/i, screen: "access", fieldId: "su-preview-start", code: "server-preview" },
  { pattern: /(genre|classification|tone|theme|setting)/i, screen: "classify", fieldId: "su-primary-genre", code: "server-classification" },
  { pattern: /(film language|dialogue|script style|direct|produce)/i, screen: "film", fieldId: "su-film-language", code: "server-film" },
  { pattern: /(premium service|upgrade|plan)/i, screen: "publish", fieldId: "su-services", code: "server-services" },
  { pattern: /(cover|thumbnail|trailer|pitch video|media)/i, screen: "media", fieldId: "su-media", code: "server-media" },
  { pattern: /ownership/i, screen: "publish", fieldId: "su-legal-ownership", code: "server-ownership" },
  { pattern: /(platform terms|terms.*accept|terms.*acknowledg)/i, screen: "publish", fieldId: "su-legal-terms", code: "server-terms" },
  { pattern: /exclusiv.*acknowledg/i, screen: "publish", fieldId: "su-legal-exclusivity", code: "server-exclusivity" },
  { pattern: /license duration/i, screen: "publish", fieldId: "su-license-duration", code: "server-license-duration" },
  { pattern: /modification rights/i, screen: "publish", fieldId: "su-publish-modification", code: "server-modification" },
  { pattern: /payment structure/i, screen: "publish", fieldId: "su-publish-payment", code: "server-payment" },
  { pattern: /royalty/i, screen: "publish", fieldId: "su-royalty-percentage", code: "server-royalty" },
  { pattern: /negotiation mode/i, screen: "publish", fieldId: "su-publish-negotiation", code: "server-negotiation" },
  { pattern: /(price|premium)/i, screen: "publish", fieldId: "su-custom-price", code: "server-price" },
  { pattern: /(right|license|payment|royalty|negotiat|ownership|exclusiv|terms|legal|price|premium|service|plan|upgrade)/i, screen: "publish", fieldId: "su-rights-type", code: "server-publish" },
];

export const resolveUploadServerIssue = (message, fallbackScreen = "publish") => {
  const normalizedMessage = String(message || "Something went wrong. Please try again.");
  const match = SERVER_ERROR_ROUTES.find((route) => route.pattern.test(normalizedMessage));
  const target = match || {
    screen: UPLOAD_SCREEN_LOCATIONS[fallbackScreen] ? fallbackScreen : "publish",
    fieldId: "su-page-validation",
    code: "server-general",
  };
  return issue(target.screen, target.fieldId, normalizedMessage, target.code);
};
