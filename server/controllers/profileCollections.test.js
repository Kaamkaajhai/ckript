import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import ScriptOption from "../models/ScriptOption.js";
import ScriptPurchaseRequest from "../models/ScriptPurchaseRequest.js";
import User from "../models/User.js";
import { getProfileCollections, getUserProfile } from "./userController.js";

const originals = {
  userFindOne: User.findOne,
  userFindById: User.findById,
  postCount: Post.countDocuments,
  postAggregate: Post.aggregate,
  postFind: Post.find,
  scriptCount: Script.countDocuments,
  scriptFind: Script.find,
  optionDistinct: ScriptOption.distinct,
  purchaseDistinct: ScriptPurchaseRequest.distinct,
};

const viewerId = new mongoose.Types.ObjectId();
const writerId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();

const chain = (value, capture = {}) => {
  const query = {
    select(fields) { capture.select = fields; return query; },
    populate(path, fields) { capture.populate = { path, fields }; return query; },
    sort(sort) { capture.sort = sort; return query; },
    skip(skip) { capture.skip = skip; return query; },
    limit(limit) { capture.limit = limit; return query; },
    lean: async () => value,
  };
  return query;
};

const documentChain = (value) => {
  const query = {
    select() { return query; },
    populate() { return query; },
    sort() { return query; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
  return query;
};

const request = ({ userId = viewerId, section = "activity", page = "1", q, sort } = {}) => ({
  user: { _id: userId },
  params: { id: String(writerId) },
  query: { section, page, ...(q ? { q } : {}), ...(sort ? { sort } : {}) },
  protocol: "https",
  get: (name) => name === "origin" ? "https://ckript.test" : "",
});

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

const publicWriter = (overrides = {}) => ({
  _id: writerId,
  name: "Mira",
  role: "writer",
  writerProfile: { username: "mira" },
  followers: [],
  followRequests: [],
  blockedUsers: [],
  favoriteScripts: [projectId],
  ...overrides,
});

afterEach(() => {
  User.findOne = originals.userFindOne;
  User.findById = originals.userFindById;
  Post.countDocuments = originals.postCount;
  Post.aggregate = originals.postAggregate;
  Post.find = originals.postFind;
  Script.countDocuments = originals.scriptCount;
  Script.find = originals.scriptFind;
  ScriptOption.distinct = originals.optionDistinct;
  ScriptPurchaseRequest.distinct = originals.purchaseDistinct;
});

describe("general profile collections endpoint", () => {
  test("rejects a visitor saved request before any collection query or id exposure", async () => {
    let collectionQueries = 0;
    User.findOne = () => chain(publicWriter());
    User.findById = () => chain({ _id: viewerId, role: "producer", email: "producer@studio.example", blockedUsers: [] });
    Post.countDocuments = async () => { collectionQueries += 1; return 0; };
    Script.countDocuments = async () => { collectionQueries += 1; return 0; };
    Script.find = () => { collectionQueries += 1; return chain([]); };
    const { captured, res } = response();

    await getProfileCollections(request({ section: "saved" }), res);

    assert.equal(captured.status, 403);
    assert.equal(captured.body.privateCollection, true);
    assert.equal(collectionQueries, 0);
    assert.equal(JSON.stringify(captured.body).includes(String(projectId)), false);
  });

  test("pages public activity and returns counts instead of relationship arrays", async () => {
    let pipeline;
    let scriptQueries = 0;
    User.findOne = () => chain(publicWriter());
    User.findById = () => chain({ _id: viewerId, role: "producer", email: "producer@studio.example", blockedUsers: [] });
    Post.countDocuments = async () => 13;
    Post.aggregate = async (value) => {
      pipeline = value;
      return [{
        _id: "post-1",
        content: "Update",
        likesCount: 4,
        commentsCount: 2,
        savesCount: 1,
        likes: [viewerId],
        comments: [viewerId],
        saves: [viewerId],
      }];
    };
    Script.countDocuments = async () => { scriptQueries += 1; return 0; };
    const { captured, res } = response();

    await getProfileCollections(request({ page: "2" }), res);

    assert.equal(captured.status, 200);
    assert.equal(captured.body.own, false);
    assert.deepEqual(captured.body.counts, { activity: 13, saved: null });
    assert.deepEqual(captured.body.items[0].counts, { likes: 4, comments: 2, saves: 1 });
    assert.equal(Object.hasOwn(captured.body.items[0], "likes"), false);
    assert.equal(Object.hasOwn(captured.body.items[0], "comments"), false);
    assert.equal(Object.hasOwn(captured.body.items[0], "saves"), false);
    assert.equal(pipeline.find((stage) => stage.$skip).$skip, 12);
    assert.equal(pipeline.find((stage) => stage.$limit).$limit, 12);
    assert.equal(scriptQueries, 0);
  });

  test("returns an owner's allowlisted, sorted saved-project page", async () => {
    const findCapture = {};
    let savedFilter;
    User.findOne = () => chain(publicWriter());
    User.findById = () => { throw new Error("owner must not be looked up twice"); };
    Post.countDocuments = async () => 2;
    Script.countDocuments = async (filter) => { savedFilter = filter; return 1; };
    Script.find = (filter) => {
      savedFilter = filter;
      return chain([{
        _id: projectId,
        title: "The Archive",
        status: "published",
        creator: { _id: writerId, name: "Mira", writerProfile: { username: "mira" } },
      }], findCapture);
    };
    const { captured, res } = response();

    await getProfileCollections(request({ userId: writerId, section: "saved", sort: "title" }), res);

    assert.equal(captured.status, 200);
    assert.equal(captured.body.own, true);
    assert.equal(captured.body.savedSource, "favorites");
    assert.deepEqual(captured.body.counts, { activity: 2, saved: 1 });
    assert.equal(captured.body.items[0].canonicalPath, "/the-archive/mira");
    assert.deepEqual(savedFilter._id.$in, [projectId]);
    assert.match(findCapture.select, /title/);
    assert.doesNotMatch(findCapture.select, /pdfUrl|fullText|purchasedBy|unlockedBy/);
    assert.deepEqual(findCapture.sort, { title: 1, _id: 1 });
    assert.equal(findCapture.skip, 0);
    assert.equal(findCapture.limit, 12);
  });

  test("uses the industry watchlist as the five professional roles' saved profile collection", async () => {
    const findCapture = {};
    let savedFilter;
    User.findOne = () => chain(publicWriter({
      role: "professional",
      favoriteScripts: [new mongoose.Types.ObjectId()],
      industryProfile: { savedScripts: [projectId] },
    }));
    Post.countDocuments = async () => 0;
    Script.countDocuments = async (filter) => { savedFilter = filter; return 1; };
    Script.find = (filter) => {
      savedFilter = filter;
      return chain([{ _id: projectId, title: "The Watchlist Project" }], findCapture);
    };
    const { captured, res } = response();

    await getProfileCollections(request({ userId: writerId, section: "saved" }), res);

    assert.equal(captured.status, 200);
    assert.equal(captured.body.savedSource, "watchlist");
    assert.deepEqual(savedFilter._id.$in, [projectId]);
    assert.match(findCapture.select, /title/);
  });

  test("loads purchases for every film-professional own profile role", async () => {
    for (const role of ["investor", "producer", "director", "industry", "professional"]) {
      let purchaseLookups = 0;
      const user = {
        ...publicWriter({ role }),
        language: "en",
        async populate() {},
        toObject() { return { ...this }; },
      };
      User.findOne = () => documentChain(user);
      Script.find = () => documentChain([]);
      ScriptPurchaseRequest.distinct = async () => { purchaseLookups += 1; return []; };
      ScriptOption.distinct = async () => { purchaseLookups += 1; return []; };
      const { captured, res } = response();

      await getUserProfile(request({ userId: writerId }), res);

      assert.equal(captured.status, 200);
      assert.equal(purchaseLookups, 2, `${role} should load both purchase sources`);
    }
  });

  test("enforces profile privacy before collection queries", async () => {
    let collectionQueries = 0;
    User.findOne = () => chain(publicWriter({ isPrivate: true, followRequests: [{ from: viewerId }] }));
    User.findById = () => chain({ _id: viewerId, role: "producer", blockedUsers: [] });
    Post.countDocuments = async () => { collectionQueries += 1; return 0; };
    Script.countDocuments = async () => { collectionQueries += 1; return 0; };
    const { captured, res } = response();

    await getProfileCollections(request(), res);

    assert.equal(captured.status, 403);
    assert.equal(captured.body.privateAccount, true);
    assert.equal(captured.body.followRequestPending, true);
    assert.equal(collectionQueries, 0);
  });

  test("keeps collection documents and ids out of the base own-profile response", async () => {
    let postQueries = 0;
    const user = {
      ...publicWriter(),
      scriptsRead: [projectId],
      industryProfile: { company: "North Star", savedScripts: [projectId] },
      language: "en",
      async populate() {},
      toObject() {
        return {
          ...this,
          favoriteScripts: [projectId],
          scriptsRead: [projectId],
          industryProfile: { company: "North Star", savedScripts: [projectId] },
        };
      },
    };
    User.findOne = () => documentChain(user);
    Script.find = () => documentChain([]);
    Post.find = () => { postQueries += 1; return documentChain([]); };
    const { captured, res } = response();

    await getUserProfile(request({ userId: writerId }), res);

    assert.equal(captured.status, 200);
    assert.equal(postQueries, 0);
    assert.equal(Object.hasOwn(captured.body, "posts"), false);
    assert.equal(Object.hasOwn(captured.body, "bookmarkedScripts"), false);
    assert.equal(Object.hasOwn(captured.body.user, "favoriteScripts"), false);
    assert.equal(Object.hasOwn(captured.body.user, "scriptsRead"), false);
    assert.equal(Object.hasOwn(captured.body.user.industryProfile, "savedScripts"), false);
  });
});
