import { describe, expect, it } from "vitest";
import { buildPublicProfileView, safePublicUrl } from "./publicProfileModel";

describe("publicProfileModel", () => {
  it("keeps only web-safe public links", () => {
    expect(safePublicUrl("https://example.com/work")).toBe("https://example.com/work");
    expect(safePublicUrl("javascript:alert(1)")).toBe("");
    expect(safePublicUrl("https://user:secret@example.com/work")).toBe("");
    expect(safePublicUrl("not a url")).toBe("");
  });

  it("models a writer without reading contact or private relationship fields", () => {
    const view = buildPublicProfileView({
      name: "Mira Sen",
      role: "writer",
      email: "private@example.com",
      phone: "+91 00000 00000",
      followers: [{ email: "also-private@example.com" }],
      followerCount: "8.9",
      followingCount: "not-a-number",
      skills: ["Research", { private: true }, ""],
      writerProfile: {
        representationStatus: "manager_and_agent",
        genres: ["Drama"],
        links: { portfolio: "https://example.com", bad: "javascript:alert(1)" },
      },
    }, [
      { _id: "project/1", title: "The Archive", primaryGenre: "Drama", logline: "A public logline." },
      { title: "Missing id must not become a link" },
    ]);
    expect(view).toMatchObject({
      name: "Mira Sen",
      writer: true,
      followers: 8,
      following: 0,
      genres: ["Drama"],
      projects: [{ id: "project/1", title: "The Archive", genre: "Drama", summary: "A public logline." }],
    });
    expect(view.skills).toEqual(["Research"]);
    expect(JSON.stringify(view)).not.toContain("private@example.com");
    expect(view.links).toHaveLength(1);
  });
});
