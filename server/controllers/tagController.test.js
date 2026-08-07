// The exact filter /api/tags builds from a query string.
//
// The hardening pass coerced `type` with asTrimmedString, which turns the ARRAY form —
// "?type=GENRE&type=TONE", which Express parses to ["GENRE","TONE"] and Mongoose casts to $in — into
// "". That dropped the facet entirely and answered 200 with EVERY tag of every type. Silent widening:
// no error, no empty set, just the wrong rows, which is the worst way for a filter to fail.
//
// So these assert the FILTER OBJECT rather than the response. No database: Tag.find is stubbed and
// the query is captured, which is the only part that was ever in question.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Tag from "../models/Tag.js";
import { getTags } from "./tagController.js";

let captured;
const originalFind = Tag.find;

const chainable = () => ({ sort: () => Promise.resolve([]) });

beforeEach(() => {
  captured = undefined;
  Tag.find = (query) => {
    captured = query;
    return chainable();
  };
});

/** Run getTags with a query string's worth of params and hand back the filter it built. */
const filterFor = async (query) => {
  const res = { json() {}, status() { return this; } };
  await getTags({ query }, res);
  Tag.find = originalFind;
  return captured;
};

describe("type filtering", () => {
  test("a single type is an equality match", async () => {
    assert.deepEqual(await filterFor({ type: "GENRE" }), { type: "GENRE" });
  });

  test("repeated ?type= keeps working as a multi-type filter", async () => {
    // Express parses "?type=GENRE&type=TONE" into an array. This must stay a filter.
    assert.deepEqual(await filterFor({ type: ["GENRE", "TONE"] }), { type: { $in: ["GENRE", "TONE"] } });
  });

  test("an operator object is refused rather than passed to Mongo", async () => {
    assert.deepEqual(await filterFor({ type: { $ne: "GENRE" } }), {});
  });

  test("an array of operator objects yields no facet, not a partial one", async () => {
    assert.deepEqual(await filterFor({ type: [{ $ne: "x" }, { $gt: "" }] }), {});
  });

  test("a mixed array keeps only the strings", async () => {
    assert.deepEqual(await filterFor({ type: ["GENRE", { $ne: "x" }] }), { type: { $in: ["GENRE"] } });
  });
});

describe("search filtering never widens the result", () => {
  test("a normal search is a case-insensitive contains", async () => {
    const filter = await filterFor({ search: "york" });
    assert.ok(filter.name instanceof RegExp);
    assert.equal(filter.name.test("New York"), true);
    assert.equal(filter.name.test("Drama"), false);
  });

  test("metacharacters are matched literally, not executed", async () => {
    const filter = await filterFor({ search: "a.b" });
    assert.equal(filter.name.test("aXb"), false, "the dot ran as a pattern");
    assert.equal(filter.name.test("a.b"), true);
  });

  test("a whitespace-only search still filters instead of returning everything", async () => {
    // Trimming first made this empty, which dropped the facet — a request that asked for LESS came
    // back with more. A search that was asked for must never return more than one that was not.
    const filter = await filterFor({ search: " " });
    assert.ok(filter.name instanceof RegExp, "the whitespace search dropped the name filter");
    assert.equal(filter.name.test("New York"), true);
    assert.equal(filter.name.test("Drama"), false);
  });

  test("no search parameter means no name facet", async () => {
    assert.deepEqual(await filterFor({}), {});
    assert.deepEqual(await filterFor({ search: "" }), {});
  });

  test("a non-string search is refused", async () => {
    assert.deepEqual(await filterFor({ search: { $ne: null } }), {});
  });

  test("a pathological pattern is escaped and bounded", async () => {
    const filter = await filterFor({ search: "(a+)+$".repeat(50) });
    assert.ok(filter.name.source.length <= 400, "pattern was not bounded");
    const started = Date.now();
    filter.name.test("a".repeat(5000));
    assert.ok(Date.now() - started < 500, "escaped pattern still backtracked");
  });
});

describe("type and search combine", () => {
  test("both facets apply together", async () => {
    const filter = await filterFor({ type: ["GENRE", "TONE"], search: "york" });
    assert.deepEqual(filter.type, { $in: ["GENRE", "TONE"] });
    assert.ok(filter.name instanceof RegExp);
  });
});
