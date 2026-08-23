import { describe, expect, it } from "vitest";
import { buildAccountSettingsView } from "./accountSettingsModel";

describe("account settings view", () => {
  it("normalizes owner settings and puts the current session first", () => {
    const view = buildAccountSettingsView({
      profile: {
        role: "writer",
        email: "mira@example.com",
        pendingEmail: "next@example.com",
        emailVerified: true,
        blockedUsers: [{ _id: "u2", name: "Asha", role: "producer" }],
      },
      sessions: [
        { sessionId: "old", browser: "Chrome", os: "Windows", isCurrent: false },
        { sessionId: "now", browser: "Safari", os: "iOS", isCurrent: true },
        { browser: "invalid" },
      ],
      deletedScripts: [{ _id: "s1", title: "Archive", genre: "Drama", format: "feature_film" }],
    });

    expect(view).toMatchObject({
      email: "mira@example.com",
      pendingEmail: "next@example.com",
      emailVerified: false,
      writer: true,
      industry: false,
      canDelete: true,
      sessions: [{ sessionId: "now", title: "Safari on iOS", isCurrent: true }, { sessionId: "old" }],
      blockedUsers: [{ id: "u2", name: "Asha", role: "producer" }],
      deletedProjects: [{ id: "s1", title: "Archive", detail: "Drama · feature film" }],
    });
  });

  it("recognizes industry integrations and protects admin deletion", () => {
    expect(buildAccountSettingsView({ profile: { role: "producer" } })).toMatchObject({ industry: true, writer: false, canDelete: true });
    expect(buildAccountSettingsView({ profile: { role: "admin" } }).canDelete).toBe(false);
  });
});
