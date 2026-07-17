import { describe, expect, it } from "vitest";
import { deriveScriptJourney, getRecommendedAction, getViewerCapabilities } from "./scriptDetailModel";

const project = {
  _id: "s1",
  title: "Monsoon Ledger",
  logline: "A forensic accountant follows a trail of impossible payments.",
  synopsis: "A grounded political thriller.",
  creator: { _id: "owner", name: "Maya Rao" },
  format: "feature",
  status: "published",
  scriptCompletion: { status: "complete" },
  viewableScript: true,
  scriptPreviewAccess: { start: 1, end: 8 },
  scriptPreviewPageTexts: ["INT. OFFICE - NIGHT"],
  fountainContent: "INT. OFFICE - NIGHT\n\nRain strikes the glass.",
  classification: { primaryGenre: "Thriller", tones: ["Tense"] },
  filmDetails: { filmLanguage: "Hindi" },
  coverImage: "/cover.jpg",
  tags: ["political"],
  scriptScore: { overall: 86, feedback: "Strong", strengths: ["Plot"] },
  platformScore: { overall: 82 },
  producerRating: { average: 4.6, count: 3 },
  reviewCount: 12,
  price: 275000,
  rightsLicensing: { rightsType: "exclusive_license", modificationRights: "buyer_must_consult_writer", paymentStructure: "one_time_upfront_payment" },
  transactionStatus: "available",
};

describe("script detail view model", () => {
  it("maps owner and collaborator permissions without broadening access", () => {
    expect(getViewerCapabilities({ script: { ...project, isCreator: true }, user: { _id: "owner", role: "creator" } }).owner).toBe(true);
    const collaborator = getViewerCapabilities({
      script: { ...project, collaborators: [{ userId: "editor", status: "accepted", role: "editor" }] },
      user: { _id: "editor", role: "creator" },
    });
    expect(collaborator.fullScript).toBe(true);
    expect(collaborator.canEdit).toBe(true);
    expect(collaborator.canPurchase).toBe(false);
  });

  it("derives readiness from real fields and identifies the missing trailer", () => {
    const capabilities = getViewerCapabilities({ script: { ...project, isCreator: true }, user: { _id: "owner", role: "creator" } });
    const journey = deriveScriptJourney({ script: project, capabilities });
    expect(journey.readiness).toBe(96);
    expect(journey.currentStage).toBe("discovery");
    expect(getRecommendedAction({ capabilities, journey, script: project })).toEqual({ id: "trailer", label: "Complete the listing" });
  });

  it("routes an approved buyer request to payment without pretending it is purchased", () => {
    const script = { ...project, canPurchase: true, myPendingRequest: { status: "approved" } };
    const capabilities = getViewerCapabilities({ script, user: { _id: "buyer", role: "investor" } });
    const journey = deriveScriptJourney({ script, capabilities });
    expect(getRecommendedAction({ capabilities, journey, script }).id).toBe("payment");
    expect(capabilities.fullScript).toBe(false);
  });
});
