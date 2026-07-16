import { describe, expect, it } from "vitest";
import {
  resolveUploadServerIssue,
  validateUploadScreen,
  validateUploadWorkflow,
} from "./scriptUploadValidation";

const validContext = (overrides = {}) => ({
  formData: {
    title: "A Monsoon Story",
    format: "feature",
    formatOther: "",
    pageCount: "102",
    logline: "A detective races a storm to uncover the truth.",
    synopsis: "A complete synopsis.",
    completionStatus: "complete",
    completedParts: "",
    totalParts: "",
    futurePlans: "",
    viewableScript: true,
    previewWindowStart: "1",
    previewWindowEnd: "8",
    primaryGenre: "Drama",
  },
  textContent: "INT. STATION - NIGHT\nA train arrives through the rain.",
  uploadedFile: null,
  existingUploadedFile: null,
  roles: [],
  filmDetails: { filmLanguage: "English", filmLanguageCustom: "" },
  rightsLicensing: {
    rightsType: "full_rights_sale",
    modificationRights: "buyer_must_consult_writer",
    paymentStructure: "one_time_upfront_payment",
    royaltySettings: { percentage: 0, durationType: "none", durationYears: 0 },
    timeBound: { licenseDurationMonths: 0 },
    negotiationMode: "fixed_terms_non_negotiable",
    customConditions: "",
    legalAcknowledgement: {
      ownershipConfirmed: true,
      platformTermsAccepted: true,
      exclusivityUnderstood: true,
    },
  },
  legal: { agreedToTerms: true, customInvestorTerms: "" },
  isPremium: true,
  effectivePrice: 25,
  ...overrides,
});

describe("script upload validation", () => {
  it("returns issues in workflow order so Publish routes to the earliest invalid page", () => {
    const context = validContext({
      formData: { ...validContext().formData, title: "", logline: "" },
      textContent: "",
    });

    const issues = validateUploadWorkflow(context);

    expect(issues[0]).toMatchObject({ screen: "upload", step: 1, fieldId: "su-project-title" });
    expect(issues.some((validationIssue) => validationIssue.screen === "story")).toBe(true);
  });

  it("keeps story validation on the Story detail page", () => {
    const context = validContext({ formData: { ...validContext().formData, synopsis: "" } });

    expect(validateUploadScreen("story", context)).toEqual([
      expect.objectContaining({ screen: "story", step: 2, detailStep: 1, fieldId: "su-synopsis" }),
    ]);
  });

  it("reports each legal acknowledgement on its real Publish control", () => {
    const context = validContext({
      legal: { agreedToTerms: false, customInvestorTerms: "" },
      rightsLicensing: {
        ...validContext().rightsLicensing,
        legalAcknowledgement: {
          ownershipConfirmed: false,
          platformTermsAccepted: false,
          exclusivityUnderstood: false,
        },
      },
    });

    expect(validateUploadScreen("publish", context).map((validationIssue) => validationIssue.fieldId)).toEqual([
      "su-legal-ownership",
      "su-legal-terms",
      "su-legal-exclusivity",
    ]);
  });

  it("routes server failures back to the owning screen", () => {
    expect(resolveUploadServerIssue("Synopsis is required")).toMatchObject({ screen: "story", fieldId: "su-synopsis" });
    expect(resolveUploadServerIssue("Royalty percentage must be greater than 0")).toMatchObject({ screen: "publish", fieldId: "su-royalty-percentage" });
    expect(resolveUploadServerIssue("Trailer upload failed")).toMatchObject({ screen: "media", fieldId: "su-media" });
  });
});
