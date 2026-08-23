import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { searchScriptsReader } from "./scriptController.js";

const originals = {
  scriptCount: Script.countDocuments,
  scriptFind: Script.find,
  userFind: User.find,
  userFindById: User.findById,
};
const readerId = new mongoose.Types.ObjectId();

const response = () => {
  const captured = { status: 200, body: null };
  return { captured, res: { status(code) { captured.status = code; return this; }, json(body) { captured.body = body; return this; } } };
};

const readerQuery = (items, capture) => {
  const query = {
    select(value) { capture.select = value; return query; },
    populate(path, value) { capture.populate = { path, value }; return query; },
    sort(value) { capture.sort = value; return query; },
    skip(value) { capture.skip = value; return query; },
    limit(value) { capture.limit = value; return query; },
    lean: async () => items,
  };
  return query;
};

const leanQuery = (value) => ({ select() { return this; }, lean: async () => value });

afterEach(() => {
  Script.countDocuments = originals.scriptCount;
  Script.find = originals.scriptFind;
  User.find = originals.userFind;
  User.findById = originals.userFindById;
});
describe("reader discovery boundary", () => {
  test("refuses every non-reader role before database work", async () => {
    let queries = 0;
    Script.countDocuments = async () => { queries += 1; return 0; };
    Script.find = () => { queries += 1; return readerQuery([], {}); };
    User.find = () => { queries += 1; return leanQuery([]); };
    User.findById = () => { queries += 1; return leanQuery(null); };
    for (const role of ["writer", "creator", "investor", "producer", "director", "industry", "professional", "actor", "admin"]) {
      const target = response();
      await searchScriptsReader({ user: { _id: readerId, role }, query: {} }, target.res);
      assert.equal(target.captured.status, 403);
    }
    assert.equal(queries, 0);
  });

  test("caps pages, escapes search text, and uses a positive display projection", async () => {
    const capture = {};
    let filter;
    User.findById = () => leanQuery({ blockedUsers: [] });
    User.find = () => leanQuery([]);
    Script.countDocuments = async () => 25;
    Script.find = (value) => { filter = value; return readerQuery([{ _id: "p1", title: "Archive" }], capture); };
    const target = response();
    await searchScriptsReader({ user: { _id: readerId, role: "reader" }, query: { q: "((((", page: "2", limit: "999", genre: "Drama", category: "movie" } }, target.res);
    assert.equal(target.captured.status, 200);
    assert.equal(capture.limit, 24);
    assert.equal(capture.skip, 24);
    assert.match(capture.select, /title/);
    for (const privateField of ["fullContent", "textContent", "fountainContent", "fileUrl", "scriptPreviewPageTexts", "purchasedBy", "unlockedBy"]) {
      assert.doesNotMatch(capture.select, new RegExp(privateField));
    }
    assert.equal(filter.genre, "Drama");
    assert.equal(filter.contentType, "movie");
    assert.equal(filter.$or[0].sid.test("(((("), true);
    assert.deepEqual(target.captured.body, { scripts: [{ _id: "p1", title: "Archive" }], totalPages: 2, page: 2, total: 25 });
  });
});
