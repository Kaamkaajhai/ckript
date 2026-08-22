import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  loadProfileCollection,
  normalizeProfileCollectionResponse,
  readProfileCollectionLocation,
  removeSavedProfileProject,
  writeProfileCollectionLocation,
} from "./profileCollections";

vi.mock("../../services/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("profile collection client contract", () => {
  it("owns the Activity/Saved page in the canonical query without dropping unrelated values", () => {
    expect(readProfileCollectionLocation("?tab=saved&page=3", { own: true })).toEqual({ section: "bookmarks", page: 3 });
    expect(readProfileCollectionLocation("?tab=bookmarks&page=9", { own: false })).toEqual({ section: "activity", page: 1 });

    const written = writeProfileCollectionLocation("scope=people&tab=activity&page=4", { section: "bookmarks", page: 1 });
    expect(written.get("scope")).toBe("people");
    expect(written.get("tab")).toBe("bookmarks");
    expect(written.has("page")).toBe(false);
  });

  it("normalizes counts and paging while preserving only valid list entries", () => {
    expect(normalizeProfileCollectionResponse({
      profileId: "writer-1",
      own: true,
      counts: { activity: "4", saved: "2" },
      items: [null, { _id: "post-1" }, { title: "missing id" }],
      pagination: { section: "saved", page: 2, limit: 12, total: 13, totalPages: 2, hasPrevious: true },
    })).toEqual({
      profileId: "writer-1",
      own: true,
      counts: { activity: 4, bookmarks: 2 },
      items: [{ _id: "post-1" }],
      pagination: {
        section: "bookmarks",
        page: 2,
        limit: 12,
        total: 13,
        totalPages: 2,
        hasPrevious: true,
        hasNext: false,
        privateCollection: false,
      },
    });
  });

  it("loads a bounded saved page with server-side search and sorting", async () => {
    api.get.mockResolvedValueOnce({ data: {
      profileId: "writer-1",
      own: true,
      counts: { activity: 3, saved: 1 },
      items: [{ _id: "project-1", title: "Archive" }],
      pagination: { section: "saved", page: 2, limit: 12, total: 1, totalPages: 1 },
    } });
    const controller = new AbortController();

    const result = await loadProfileCollection({
      profileId: "writer/1",
      section: "bookmarks",
      page: 2,
      query: " archive ",
      sort: "title",
      signal: controller.signal,
    });

    expect(result.ok).toBe(true);
    expect(api.get).toHaveBeenCalledWith("/users/writer%2F1/profile-collections", {
      params: { section: "saved", page: 2, q: "archive", sort: "title" },
      signal: controller.signal,
    });
  });

  it("accepts removal only when the server confirms the project is no longer saved", async () => {
    api.post.mockResolvedValueOnce({ data: { favorited: false } });
    await expect(removeSavedProfileProject("project/1")).resolves.toEqual({ ok: true, data: { projectId: "project/1" } });
    expect(api.post).toHaveBeenCalledWith("/scripts/project%2F1/favorite");

    api.post.mockResolvedValueOnce({ data: { favorited: true } });
    await expect(removeSavedProfileProject("project-2")).resolves.toMatchObject({ ok: false, message: expect.stringMatching(/still saved/i) });
  });
});
