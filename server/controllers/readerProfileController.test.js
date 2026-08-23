import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { getReaderProfile } from "./readerProfileController.js";

const originals = {
  userFindById: User.findById,
  scriptCount: Script.countDocuments,
  scriptFind: Script.find,
  reviewCount: Review.countDocuments,
  reviewFind: Review.find,
};

const viewerId = new mongoose.Types.ObjectId();
const readerId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();

const chain = (value) => {
  const query = {
    select: () => query,
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    lean: async () => value,
  };
  return query;
};

const request = ({ userId = viewerId, section = "read" } = {}) => ({
  user: { _id: userId },
  params: { id: String(readerId) },
  query: { section, page: "1", limit: "12" },
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

afterEach(() => {
  User.findById = originals.userFindById;
  Script.countDocuments = originals.scriptCount;
  Script.find = originals.scriptFind;
  Review.countDocuments = originals.reviewCount;
  Review.find = originals.reviewFind;
});

describe("reader profile authorization", () => {
  test("rejects a non-reader before collection queries", async () => {
    let collectionQueries = 0;
    User.findById = () => chain({ _id: readerId, role: "writer" });
    Script.countDocuments = async () => { collectionQueries += 1; return 0; };
    Review.countDocuments = async () => { collectionQueries += 1; return 0; };
    const { captured, res } = response();

    await getReaderProfile(request(), res);

    assert.equal(captured.status, 404);
    assert.equal(collectionQueries, 0);
  });

  test("enforces a private reader before exposing reviews or collections", async () => {
    let calls = 0;
    User.findById = (id) => chain(String(id) === String(readerId) ? {
      _id: readerId,
      role: "reader",
      isPrivate: true,
      followers: [],
      following: [],
      followRequests: [{ from: viewerId }],
      blockedUsers: [],
    } : { _id: viewerId, role: "reader", blockedUsers: [] });
    Script.countDocuments = async () => { calls += 1; return 0; };
    Review.countDocuments = async () => { calls += 1; return 0; };
    const { captured, res } = response();

    await getReaderProfile(request(), res);

    assert.equal(captured.status, 403);
    assert.equal(captured.body.privateAccount, true);
    assert.equal(captured.body.followRequestPending, true);
    assert.equal(calls, 0);
  });

  test("makes a public visitor's collections explicitly private while keeping reviews countable", async () => {
    let scriptQueries = 0;
    User.findById = (id) => chain(String(id) === String(readerId) ? {
      _id: readerId,
      name: "Ria",
      role: "reader",
      isPrivate: false,
      followers: [],
      following: [],
      blockedUsers: [],
      scriptsRead: [projectId],
      favoriteScripts: [projectId],
    } : { _id: viewerId, role: "reader", blockedUsers: [] });
    Script.countDocuments = async () => { scriptQueries += 1; return 1; };
    Script.find = () => { scriptQueries += 1; return chain([]); };
    Review.countDocuments = async () => 3;
    Review.find = () => chain([]);
    const { captured, res } = response();

    await getReaderProfile(request({ section: "favorites" }), res);

    assert.equal(captured.status, 200);
    assert.equal(captured.body.collectionsVisible, false);
    assert.equal(captured.body.counts.favorites, null);
    assert.equal(captured.body.pagination.privateCollection, true);
    assert.deepEqual(captured.body.items, []);
    assert.equal(captured.body.counts.reviews, 3);
    assert.equal(scriptQueries, 0);
    assert.equal(JSON.stringify(captured.body).includes(String(projectId)), false);
  });

  test("pages an owner's published reading history without returning raw collection arrays", async () => {
    User.findById = () => chain({
      _id: readerId,
      name: "Ria",
      role: "reader",
      followers: [],
      following: [],
      blockedUsers: [],
      scriptsRead: [projectId],
      favoriteScripts: [],
    });
    Script.countDocuments = async (filter) => filter._id.$in.length;
    Script.find = () => chain([{ _id: projectId, title: "A Read Project", status: "published" }]);
    Review.countDocuments = async () => 0;
    Review.find = () => chain([]);
    const { captured, res } = response();

    await getReaderProfile(request({ userId: readerId }), res);

    assert.equal(captured.status, 200);
    assert.equal(captured.body.own, true);
    assert.equal(captured.body.counts.read, 1);
    assert.equal(captured.body.items[0].title, "A Read Project");
    assert.equal(Object.hasOwn(captured.body.profile, "scriptsRead"), false);
    assert.equal(Object.hasOwn(captured.body.profile, "favoriteScripts"), false);
  });
});
