import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TOP_LIST_RESULT_EXCLUDE,
  TOP_LIST_SORTS,
  parseTopListQuery,
  unpackTopListFacet,
} from "./topListQuery.js";

describe("top-list request contract", () => {
  it("types and bounds paging, filters and all five ranking modes", () => {
    for (const sort of TOP_LIST_SORTS) {
      assert.equal(parseTopListQuery({ sort }).sort, sort);
    }
    const parsed = parseTopListQuery({
      page: "4",
      limit: "999",
      genre: { $ne: "Drama" },
      premium: "maybe",
    });
    assert.equal(parsed.page, 4);
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.genre, "");
    assert.equal(parsed.premium, "");
    assert.equal(parsed.paged, true);
  });

  it("preserves the historical array contract unless page is explicit", () => {
    assert.equal(parseTopListQuery({ sort: "views", limit: "12" }).paged, false);
    assert.equal(parseTopListQuery({ sort: "unknown", page: "bad" }).paged, true);
    assert.equal(parseTopListQuery({ sort: "unknown" }).sort, "platform");
  });

  it("excludes qualification documents, bodies and private assets", () => {
    for (const field of ["creatorDoc", "textContent", "fullContent", "fountainContent", "fileUrl", "scriptPreviewPageTexts"]) {
      assert.equal(TOP_LIST_RESULT_EXCLUDE[field], 0);
    }
    assert.equal(Object.hasOwn(TOP_LIST_RESULT_EXCLUDE, "title"), false);
  });

  it("unpacks bounded metadata without trusting an empty facet", () => {
    assert.deepEqual(
      unpackTopListFacet([{ scripts: [{ _id: "a" }], meta: [{ total: 25 }] }], { page: 2, limit: 12 }),
      {
        scripts: [{ _id: "a" }],
        pagination: { page: 2, limit: 12, total: 25, hasMore: true },
      },
    );
    assert.deepEqual(
      unpackTopListFacet([], { page: 1, limit: 12 }),
      { scripts: [], pagination: { page: 1, limit: 12, total: 0, hasMore: false } },
    );
  });
});
