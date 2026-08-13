import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SEARCH_SCRIPT_RESULT_PROJECT,
  SEARCH_USER_RESULT_PROJECT,
  getScriptSearchSort,
  parseSearchQuery,
  unpackSearchFacet,
} from "./searchQuery.js";

describe("search request contract", () => {
  it("types and bounds every untrusted query value", () => {
    const parsed = parseSearchQuery({
      q: "  thriller  ",
      type: "projects",
      sort: "score",
      page: "4",
      limit: "999",
      genre: { $ne: "Drama" },
    });

    assert.equal(parsed.q, "thriller");
    assert.equal(parsed.type, "projects");
    assert.equal(parsed.sort, "score");
    assert.equal(parsed.page, 4);
    assert.equal(parsed.limit, 30);
    assert.equal(parsed.genre, "");
    assert.equal(parsed.regex.test("A THRILLER"), true);
  });

  it("falls back to a stable first page for unknown values", () => {
    const parsed = parseSearchQuery({ type: "everything", sort: "random", page: "no", limit: "0" });
    assert.equal(parsed.type, "all");
    assert.equal(parsed.sort, "newest");
    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 1);
  });

  it("gives every script sort a deterministic id tie-breaker", () => {
    for (const sort of ["newest", "views", "score", "price_high", "price_low", "engagement"]) {
      assert.ok(Object.hasOwn(getScriptSearchSort(sort), "_id"));
    }
  });
});

describe("search result privacy boundary", () => {
  it("never projects script bodies or private asset fields", () => {
    for (const field of ["textContent", "fullContent", "fountainContent", "fileUrl", "scriptPreviewPageTexts"]) {
      assert.equal(Object.hasOwn(SEARCH_SCRIPT_RESULT_PROJECT, field), false);
    }
    assert.equal(SEARCH_SCRIPT_RESULT_PROJECT.title, 1);
    assert.equal(SEARCH_SCRIPT_RESULT_PROJECT.creator, 1);
  });

  it("does not return a user's email or private relationship arrays", () => {
    assert.equal(Object.hasOwn(SEARCH_USER_RESULT_PROJECT, "email"), false);
    assert.equal(Object.hasOwn(SEARCH_USER_RESULT_PROJECT, "followers"), false);
    assert.equal(Object.hasOwn(SEARCH_USER_RESULT_PROJECT, "following"), false);
  });
});

describe("search facet metadata", () => {
  it("reports items, total and whether another page exists", () => {
    assert.deepEqual(
      unpackSearchFacet([{ items: [{ _id: "a" }], meta: [{ total: 21 }] }], { page: 2, limit: 10 }),
      { items: [{ _id: "a" }], total: 21, hasMore: true },
    );
    assert.equal(unpackSearchFacet([], { page: 1, limit: 10 }).hasMore, false);
  });
});
