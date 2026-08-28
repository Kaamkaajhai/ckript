// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  buildOwnProfilePayload,
  checkProfileUsername,
  createOwnProfileDraft,
  mergeOwnProfileUpdate,
  saveOwnProfile,
  uploadOwnProfileImage,
  validateProfileImage,
} from "./profileEditor";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe("own profile draft contract", () => {
  it("normalizes the server profile into stable form values", () => {
    const draft = createOwnProfileDraft({
      name: " Mira ",
      dateOfBirth: "1990-03-04T00:00:00.000Z",
      skills: ["Dialogue", "Structure"],
      writerProfile: { username: "MIRA", specializedTags: ["Raw", "Epic"] },
      industryProfile: { mandates: { formats: ["Feature Film", "tv pilot"] } },
    });
    expect(draft).toMatchObject({
      name: "Mira",
      username: "mira",
      dateOfBirth: "1990-03-04",
      skills: "Dialogue, Structure",
      specializedTags: ["Raw", "Epic"],
      preferredFormats: ["feature", "tv_1hour"],
    });
  });

  it("builds a bounded writer overview payload and never adds banking or security fields", () => {
    const result = buildOwnProfilePayload({
      name: "Mira",
      username: "mira_writer",
      phone: "123",
      addressCity: "Mumbai",
      addressCountry: "India",
      bio: "Writer",
      skills: "Dialogue, Structure, Dialogue",
      profileImage: "",
      representationStatus: "manager",
      agencyName: "North",
      genres: ["Drama"],
      specializedTags: ["Raw"],
      diversityGender: "woman",
      diversityEthnicity: "Indian",
    }, { role: "creator" });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      username: "mira_writer",
      profileImage: "",
      skills: ["Dialogue", "Structure", "Dialogue"],
      writerProfile: {
        representationStatus: "manager",
        agencyName: "North",
        genres: ["Drama"],
        specializedTags: ["Raw"],
      },
    });
    expect(result.data).not.toHaveProperty("bankDetails");
    expect(result.data).not.toHaveProperty("password");
    expect(result.data).not.toHaveProperty("notificationPrefs");
  });

  it("supports every industry account role, not only the legacy investor name", () => {
    for (const role of ["investor", "producer", "director", "industry", "professional"]) {
      const result = buildOwnProfilePayload({
        name: "Asha",
        username: "asha_film",
        bio: "Producer",
        subRole: "producer",
        company: "Cedar Films",
        preferredGenres: ["Drama"],
        preferredFormats: ["Feature Film"],
      }, { role });
      expect(result.ok, role).toBe(true);
      expect(result.data).toMatchObject({
        company: "Cedar Films",
        preferredGenres: ["Drama"],
        preferredFormats: ["feature"],
      });
    }
  });

  it("returns field errors before sending an invalid identity", () => {
    expect(buildOwnProfilePayload({ name: "", username: "Bad Name" }, { role: "writer" })).toMatchObject({
      ok: false,
      fieldErrors: { name: expect.any(String), username: expect.any(String) },
    });
  });

  it("requires the custom industry role before sending it to the server", () => {
    expect(buildOwnProfilePayload({
      name: "Asha",
      username: "asha_film",
      bio: "Producer",
      subRole: "other",
      subRoleOther: "",
    }, { role: "producer" })).toMatchObject({
      ok: false,
      fieldErrors: { subRoleOther: expect.any(String) },
    });
  });
});

describe("own profile mutations", () => {
  it("validates image type and size at the shared boundary", () => {
    expect(validateProfileImage({ type: "application/pdf", size: 10 }).ok).toBe(false);
    expect(validateProfileImage({ type: "image/png", size: 6 * 1024 * 1024 }).ok).toBe(false);
    expect(validateProfileImage({ type: "image/webp", size: 1024 }).ok).toBe(true);
  });

  it("leaves multipart boundaries to the browser", async () => {
    api.post.mockResolvedValueOnce({ data: { profileImage: "https://cdn.test/me.webp" } });
    const file = new File(["image"], "me.webp", { type: "image/webp" });
    const result = await uploadOwnProfileImage(file);
    expect(result.ok).toBe(true);
    expect(api.post).toHaveBeenCalledWith("/users/upload-image", expect.any(FormData));
  });

  it("normalizes username checks and profile saves", async () => {
    api.get.mockResolvedValueOnce({ data: { available: true } });
    expect(await checkProfileUsername("  MIRA_writer ")).toMatchObject({
      ok: true,
      data: { username: "mira_writer", available: true },
    });
    expect(api.get).toHaveBeenCalledWith("/onboarding/check-username", expect.objectContaining({
      params: { username: "mira_writer" },
    }));

    api.put.mockResolvedValueOnce({ data: { name: "Mira", profileCompletion: { percentage: 100 } } });
    const saved = await saveOwnProfile({
      profile: { role: "reader" },
      draft: { name: "Mira", skills: "Review" },
    });
    expect(saved.ok).toBe(true);
    expect(api.put).toHaveBeenCalledWith("/users/update", expect.objectContaining({ name: "Mira" }));
  });

  it("merges nested profile responses without dropping data omitted by the update endpoint", () => {
    const merged = mergeOwnProfileUpdate({
      subscription: { plan: "gold" },
      writerProfile: { username: "mira", genres: ["Drama"] },
    }, {
      bio: "New",
      writerProfile: { genres: ["Comedy"] },
    });
    expect(merged).toMatchObject({
      bio: "New",
      subscription: { plan: "gold" },
      writerProfile: { username: "mira", genres: ["Comedy"] },
    });
  });
});
