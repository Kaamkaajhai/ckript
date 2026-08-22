import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  normalizeProfileCollectionQuery,
  profileCollectionMeta,
  projectProfileActivityPost,
} from "./profileCollections.js";

describe("general profile collection contract", () => {
  test("normalizes sections, paging, search, and sorting at the API boundary", () => {
    assert.deepEqual(normalizeProfileCollectionQuery({}), {
      section: "activity",
      page: 1,
      limit: 12,
      query: "",
      sort: "recent",
    });
    assert.deepEqual(normalizeProfileCollectionQuery({
      section: "saved",
      page: "3",
      limit: "999",
      q: `  ${"x".repeat(110)}  `,
      sort: "views",
    }), {
      section: "saved",
      page: 3,
      limit: 20,
      query: "x".repeat(100),
      sort: "views",
    });
    assert.equal(normalizeProfileCollectionQuery({ section: "private", page: "-4", limit: "0", sort: "unknown" }).section, "activity");
  });

  test("projects activity into counts without exposing relationship ids", () => {
    const projected = projectProfileActivityPost({
      _id: "post-1",
      content: "  A production update  ",
      image: "https://assets.example/post.jpg",
      likes: ["viewer-1"],
      comments: [{ user: "viewer-2", text: "private relationship" }],
      saves: ["viewer-3"],
      likesCount: 1,
      commentsCount: 2,
      savesCount: 3,
      internalModerationNote: "secret",
    });

    assert.deepEqual(projected.counts, { likes: 1, comments: 2, saves: 3 });
    assert.equal(projected.content, "A production update");
    for (const key of ["likes", "comments", "saves", "internalModerationNote"]) {
      assert.equal(Object.hasOwn(projected, key), false);
    }
  });

  test("builds bounded page metadata and marks visitor saved data private", () => {
    assert.deepEqual(profileCollectionMeta({ section: "activity", page: 2, limit: 12, total: 25, own: false }), {
      section: "activity",
      page: 2,
      limit: 12,
      total: 25,
      totalPages: 3,
      hasPrevious: true,
      hasNext: true,
      privateCollection: false,
    });
    assert.equal(profileCollectionMeta({ section: "saved", page: 1, limit: 12, total: 0, own: false }).privateCollection, true);
  });
});
