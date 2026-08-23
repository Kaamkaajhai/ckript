import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import {
  getScriptBookmarkSource,
  readScriptBookmarkIds,
  requestScriptBookmark,
  SCRIPT_BOOKMARK_SOURCE,
  updateScriptBookmarkViewer,
} from "./useScriptBookmark";

vi.mock("../services/api", () => ({ default: { post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("script bookmark source", () => {
  it.each(["investor", "producer", "director", "industry", "professional"])(
    "uses the watchlist for the %s role",
    (role) => expect(getScriptBookmarkSource({ role })).toBe(SCRIPT_BOOKMARK_SOURCE.WATCHLIST),
  );

  it("keeps general and discovery-only actor saves in favorites", () => {
    expect(getScriptBookmarkSource({ role: "writer" })).toBe(SCRIPT_BOOKMARK_SOURCE.FAVORITES);
    expect(getScriptBookmarkSource({ role: "reader" })).toBe(SCRIPT_BOOKMARK_SOURCE.FAVORITES);
    expect(getScriptBookmarkSource({ role: "actor" })).toBe(SCRIPT_BOOKMARK_SOURCE.FAVORITES);
  });

  it("reads and updates the selected account collection without changing the other source", () => {
    const viewer = {
      favoriteScripts: ["favorite-1"],
      industryProfile: { savedScripts: [{ _id: "watch-1" }] },
    };
    expect(readScriptBookmarkIds(viewer, SCRIPT_BOOKMARK_SOURCE.WATCHLIST)).toEqual(["watch-1"]);
    expect(updateScriptBookmarkViewer(viewer, "watch-2", true, SCRIPT_BOOKMARK_SOURCE.WATCHLIST)).toEqual({
      favoriteScripts: ["favorite-1"],
      industryProfile: { savedScripts: ["watch-1", "watch-2"] },
    });
  });

  it("uses authoritative add/remove watchlist responses and preserves the favorite endpoint", async () => {
    api.post
      .mockResolvedValueOnce({ data: { saved: true } })
      .mockResolvedValueOnce({ data: { saved: false } })
      .mockResolvedValueOnce({ data: { favorited: true } });

    await expect(requestScriptBookmark({ scriptId: "project-1", bookmarked: false, source: "watchlist" })).resolves.toBe(true);
    await expect(requestScriptBookmark({ scriptId: "project-1", bookmarked: true, source: "watchlist" })).resolves.toBe(false);
    await expect(requestScriptBookmark({ scriptId: "project-2", bookmarked: false, source: "favorites" })).resolves.toBe(true);

    expect(api.post.mock.calls).toEqual([
      ["/users/watchlist/add", { scriptId: "project-1" }],
      ["/users/watchlist/remove", { scriptId: "project-1" }],
      ["/scripts/project-2/favorite"],
    ]);
  });
});
