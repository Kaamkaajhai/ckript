import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "./userController.js";

const originals = {
  scriptExists: Script.exists,
  scriptFind: Script.find,
  userFindById: User.findById,
};

const viewerId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const professionalRoles = ["investor", "producer", "director", "industry", "professional"];

const response = () => {
  const captured = { status: 200, body: null };
  return {
    captured,
    res: {
      status(code) { captured.status = code; return this; },
      json(body) { captured.body = body; return this; },
    },
  };
};

const request = ({ role = "producer", body = {}, query = {} } = {}) => ({
  user: { _id: viewerId, role },
  body,
  query,
});

const documentQuery = (value, capture = {}) => {
  const query = {
    select(fields) { capture.select = fields; return query; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
  return query;
};

const scriptQuery = (value, capture = {}) => {
  const query = {
    select(fields) { capture.select = fields; return query; },
    populate(path, fields) { capture.populate = { path, fields }; return query; },
    sort(sort) { capture.sort = sort; return query; },
    limit(limit) { capture.limit = limit; return query; },
    lean: async () => value,
  };
  return query;
};

afterEach(() => {
  Script.exists = originals.scriptExists;
  Script.find = originals.scriptFind;
  User.findById = originals.userFindById;
});

describe("industry watchlist boundary", () => {
  test("refuses non-professional roles before account or project lookup", async () => {
    let queries = 0;
    User.findById = () => { queries += 1; return documentQuery(null); };
    Script.find = () => { queries += 1; return scriptQuery([]); };
    Script.exists = async () => { queries += 1; return true; };

    for (const role of ["writer", "creator", "reader", "actor", "admin"]) {
      const read = response();
      await getWatchlist(request({ role }), read.res);
      assert.equal(read.captured.status, 403);

      const add = response();
      await addToWatchlist(request({ role, body: { scriptId: String(projectId) } }), add.res);
      assert.equal(add.captured.status, 403);
    }

    assert.equal(queries, 0);
  });

  test("returns a bounded, positively projected list of available projects", async () => {
    const findCapture = {};
    let filter;
    User.findById = () => documentQuery({ industryProfile: { savedScripts: [projectId] } });
    Script.find = (value) => {
      filter = value;
      return scriptQuery([{ _id: projectId, title: "The Archive" }], findCapture);
    };
    const target = response();

    await getWatchlist(request({ role: "industry", query: { limit: "999" } }), target.res);

    assert.equal(target.captured.status, 200);
    assert.equal(target.captured.body.length, 1);
    assert.equal(filter.status, "published");
    assert.deepEqual(filter.isSold, { $ne: true });
    assert.deepEqual(filter.isDeleted, { $ne: true });
    assert.equal(findCapture.limit, 24);
    assert.match(findCapture.select, /title/);
    assert.doesNotMatch(findCapture.select, /pdfUrl|fullText|purchasedBy|unlockedBy/);
  });

  test("accepts all five professional roles and validates availability before saving", async () => {
    Script.exists = async () => true;

    for (const role of professionalRoles) {
      let saved = 0;
      const user = {
        industryProfile: { savedScripts: [] },
        async save() { saved += 1; },
      };
      User.findById = async () => user;
      const target = response();

      await addToWatchlist(request({ role, body: { scriptId: String(projectId) } }), target.res);

      assert.equal(target.captured.status, 200);
      assert.equal(target.captured.body.saved, true);
      assert.equal(saved, 1);
      assert.equal(String(user.industryProfile.savedScripts[0]), String(projectId));
    }
  });

  test("rejects malformed ids and makes removal idempotently confirm absence", async () => {
    let userLookups = 0;
    User.findById = async () => {
      userLookups += 1;
      return { industryProfile: { savedScripts: [] }, async save() {} };
    };
    const invalid = response();
    await removeFromWatchlist(request({ body: { scriptId: "not-an-id" } }), invalid.res);
    assert.equal(invalid.captured.status, 400);
    assert.equal(userLookups, 0);

    const absent = response();
    await removeFromWatchlist(request({ body: { scriptId: String(projectId) } }), absent.res);
    assert.equal(absent.captured.status, 200);
    assert.equal(absent.captured.body.saved, false);
  });
});
