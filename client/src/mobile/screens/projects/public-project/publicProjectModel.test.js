import { describe, expect, it } from "vitest";
import { buildPublicProjectSections, formatPublicBudget, formatPublicPrice } from "./publicProjectModel";

describe("publicProjectModel", () => {
  it("formats public commercial facts without inventing values", () => {
    expect(formatPublicPrice(250000)).toBe("₹2,50,000");
    expect(formatPublicPrice(0)).toBe("Contact the writer");
    expect(formatPublicBudget("medium")).toBe("Medium (₹10Cr–₹150Cr)");
    expect(formatPublicBudget("unknown")).toBe("Not specified");
  });

  it("builds only sections supported by the public projection", () => {
    const sections = buildPublicProjectSections({
      logline: "A lost reel changes a family.",
      classification: { primaryGenre: "Drama", tones: ["Hopeful"] },
      roles: [],
      synopsis: "A public teaser.",
      fountainContent: "PRIVATE BODY MUST NOT BE CONSUMED",
      fileUrl: "https://private.example/script.pdf",
    });

    expect(sections.map(({ id }) => id)).toEqual(["overview", "classification", "synopsis"]);
    expect(JSON.stringify(sections)).not.toContain("PRIVATE BODY");
    expect(JSON.stringify(sections)).not.toContain("private.example");
  });
});
