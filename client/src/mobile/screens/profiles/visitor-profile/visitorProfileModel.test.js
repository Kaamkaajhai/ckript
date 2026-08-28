import { describe, expect, it } from "vitest";
import { buildVisitorProfileView } from "./visitorProfileModel";

const viewer = {
  _id: "producer-1",
  role: "producer",
  email: "producer@studio.example",
  subscription: {
    contactsLimit: 10,
    revealedContacts: [],
  },
};

describe("visitorProfileModel", () => {
  it("derives relationship and contact capabilities without exposing raw profile contact", () => {
    const view = buildVisitorProfileView({
      viewer,
      profile: {
        _id: "writer-1",
        name: "Mira Sen",
        role: "writer",
        email: "must-not-render@example.com",
        phone: "+91 90000 00000",
        allowIndustryContact: true,
        followers: [{ _id: "producer-1" }],
        following: [],
        writerProfile: {
          username: "mira",
          genres: ["Drama"],
          membershipVerification: { wga: { status: "approved" } },
        },
      },
      relationship: { isFollowing: true },
    });

    expect(view).toMatchObject({
      name: "Mira Sen",
      followers: 1,
      followLabel: "Following",
      canMessage: true,
      canReveal: true,
      contactAlreadyRevealed: false,
      credentials: ["WGA verified"],
    });
    expect(JSON.stringify(view)).not.toContain("must-not-render@example.com");
    expect(JSON.stringify(view)).not.toContain("+91 90000 00000");
  });

  it("shows only contact returned by the reveal boundary and filters unsafe links", () => {
    const view = buildVisitorProfileView({
      viewer,
      profile: { _id: "writer-1", role: "writer", allowIndustryContact: true },
      contact: {
        email: "mira@example.com",
        phone: "+91 98888 88888",
        links: { portfolio: "https://example.com/work", bad: "javascript:alert(1)" },
      },
      contactStats: { contactsUsed: 1, contactsLimit: 10, remainingContacts: 9 },
    });

    expect(view.contact).toEqual({
      email: "mira@example.com",
      phone: "+91 98888 88888",
      links: [{ key: "portfolio", label: "Portfolio", url: "https://example.com/work" }],
    });
    expect(view.contactRemaining).toBe(9);
  });
});
