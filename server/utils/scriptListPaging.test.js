import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SCRIPT_LIST_BODY_FIELDS,
  SCRIPT_LIST_MAX_LIMIT,
  SCRIPT_LIST_RESULT_EXCLUDE,
  buildScriptListPagination,
  parseScriptListPaging,
  stripScriptBody,
  unpackScriptListFacet,
} from "./scriptListPaging.js";

describe("script list paging contract", () => {
  it("bounds page and limit and rejects operator objects", () => {
    const parsed = parseScriptListPaging({ page: "3", limit: "999" });
    assert.equal(parsed.page, 3);
    assert.equal(parsed.limit, SCRIPT_LIST_MAX_LIMIT);
    assert.equal(parsed.paged, true);
    assert.equal(parsed.limited, true);

    // The guarantee is not "unusual input is refused" but "whatever arrives,
    // a bounded integer reaches $skip/$limit". An array stringifies to its
    // first element and is still bounded; an operator object is NaN and falls
    // back. Both are safe, and only the second is a fallback.
    const hostile = parseScriptListPaging({ page: { $gt: 0 }, limit: ["999"] });
    assert.equal(hostile.page, 1);
    assert.equal(hostile.limit, SCRIPT_LIST_MAX_LIMIT);
    for (const value of [{ $ne: null }, null, undefined, "", "-5", "1e9", Number.NaN]) {
      const { page, limit } = parseScriptListPaging({ page: value, limit: value });
      assert.ok(Number.isInteger(page) && page >= 1 && page <= 1000, `page from ${String(value)}`);
      assert.ok(Number.isInteger(limit) && limit >= 1 && limit <= SCRIPT_LIST_MAX_LIMIT, `limit from ${String(value)}`);
    }
  });

  it("keeps the historical bare-array contract unless page is explicit", () => {
    assert.equal(parseScriptListPaging({}).paged, false);
    assert.equal(parseScriptListPaging({ limit: "8" }).paged, false);
    // A caller that asks for a page gets one even if the value is nonsense.
    assert.equal(parseScriptListPaging({ page: "bad" }).paged, true);
    assert.equal(parseScriptListPaging({ page: "bad" }).page, 1);
  });

  it("reports limit separately, because limit was accepted and ignored (DEF-22)", () => {
    assert.equal(parseScriptListPaging({}).limited, false);
    assert.equal(parseScriptListPaging({ limit: "8" }).limited, true);
    assert.equal(parseScriptListPaging({ limit: "8" }).limit, 8);
  });

  it("excludes every script body and the private asset URL (DEF-21)", () => {
    for (const field of ["fullContent", "textContent", "fountainContent", "fileUrl", "scriptPreviewPageTexts"]) {
      assert.equal(SCRIPT_LIST_RESULT_EXCLUDE[field], 0);
      assert.ok(SCRIPT_LIST_BODY_FIELDS.includes(field));
    }
    // An exclusion projection may not name a field to keep, or Mongo reads it
    // as an inclusion projection and returns only that field.
    assert.deepEqual(new Set(Object.values(SCRIPT_LIST_RESULT_EXCLUDE)), new Set([0]));
    assert.equal(Object.hasOwn(SCRIPT_LIST_RESULT_EXCLUDE, "title"), false);
  });

  it("strips bodies from a plain object without disturbing display fields", () => {
    const stripped = stripScriptBody({
      title: "A Quiet Ledger",
      synopsis: "kept",
      textContent: "FADE IN:",
      fountainContent: "INT. ROOM",
      fullContent: "everything",
      fileUrl: "https://private.example/script.pdf",
      scriptPreviewPageTexts: ["page one"],
    });
    assert.deepEqual(Object.keys(stripped).sort(), ["synopsis", "title"]);
    assert.equal(stripped.title, "A Quiet Ledger");
  });

  it("computes hasMore from the authoritative total, not the page length", () => {
    assert.deepEqual(buildScriptListPagination({ page: 1, limit: 12, total: 30 }), {
      page: 1, limit: 12, total: 30, hasMore: true,
    });
    assert.equal(buildScriptListPagination({ page: 3, limit: 12, total: 30 }).hasMore, false);
    // A final page that is exactly full is still the final page.
    assert.equal(buildScriptListPagination({ page: 2, limit: 12, total: 24 }).hasMore, false);
    assert.equal(buildScriptListPagination({ page: 1, limit: 12, total: undefined }).total, 0);
  });

  it("unpacks a facet, and an empty collection is not an error", () => {
    const unpacked = unpackScriptListFacet(
      [{ scripts: [{ _id: "a" }], meta: [{ total: 7 }] }],
      { page: 1, limit: 5 },
    );
    assert.equal(unpacked.scripts.length, 1);
    assert.equal(unpacked.pagination.total, 7);
    assert.equal(unpacked.pagination.hasMore, true);

    const empty = unpackScriptListFacet([{ scripts: [], meta: [] }], { page: 1, limit: 5 });
    assert.deepEqual(empty.scripts, []);
    assert.equal(empty.pagination.total, 0);
    assert.equal(empty.pagination.hasMore, false);

    assert.deepEqual(unpackScriptListFacet(null, { page: 1, limit: 5 }).scripts, []);
  });
});
