import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import CollabRequest from "../models/CollabRequest.js";
import Script from "../models/Script.js";
import {
  getActivityLog,
  getCollabRequestsInbox,
  getOutgoingCollabRequests,
  requestCollab,
} from "./collab.controller.js";

const originals = {
  scriptFind: Script.find,
  scriptFindById: Script.findById,
  requestFind: CollabRequest.find,
  requestFindOne: CollabRequest.findOne,
  requestCount: CollabRequest.countDocuments,
  auditFind: AuditLog.find,
  auditCount: AuditLog.countDocuments,
};

const ownerId = new mongoose.Types.ObjectId();
const requesterId = new mongoose.Types.ObjectId();
const scriptId = new mongoose.Types.ObjectId();

const chain = (value) => {
  const query = {
    select: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    populate: () => query,
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return query;
};

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
  Script.find = originals.scriptFind;
  Script.findById = originals.scriptFindById;
  CollabRequest.find = originals.requestFind;
  CollabRequest.findOne = originals.requestFindOne;
  CollabRequest.countDocuments = originals.requestCount;
  AuditLog.find = originals.auditFind;
  AuditLog.countDocuments = originals.auditCount;
});

describe("collaboration request authorization and paging", () => {
  test("refuses non-writer request senders before reading a script", async () => {
    let scriptQueries = 0;
    Script.findById = () => { scriptQueries += 1; return chain(null); };
    const { captured, res } = response();
    await requestCollab({ user: { _id: requesterId, role: "producer" }, params: { scriptId }, body: {} }, res);
    assert.equal(captured.status, 403);
    assert.match(captured.body.error, /writer accounts/i);
    assert.equal(scriptQueries, 0);
  });

  test("refuses a non-writer inbox before owner or request queries", async () => {
    let calls = 0;
    Script.find = () => { calls += 1; return chain([]); };
    CollabRequest.find = () => { calls += 1; return chain([]); };
    const { captured, res } = response();
    await getCollabRequestsInbox({ user: { _id: ownerId, role: "reader" }, query: {} }, res);
    assert.equal(captured.status, 403);
    assert.equal(calls, 0);
  });

  test("pages the owner's pending inbox and projects only the public requester identity", async () => {
    Script.find = () => chain([{ _id: scriptId, title: "Night Train" }]);
    CollabRequest.find = () => chain([{
      _id: new mongoose.Types.ObjectId(),
      scriptId,
      requesterId: { _id: requesterId, name: "Asha", email: "private@example.test", profileImage: "/asha.jpg" },
      requestedRole: "viewer",
      message: "May I read it?",
      status: "pending",
      createdAt: new Date(),
    }]);
    CollabRequest.countDocuments = async () => 13;
    const { captured, res } = response();
    await getCollabRequestsInbox({ user: { _id: ownerId, role: "writer" }, query: { page: "2", limit: "12" } }, res);
    assert.equal(captured.status, 200);
    assert.equal(captured.body.requests[0].scriptTitle, "Night Train");
    assert.equal(captured.body.requests[0].requester.name, "Asha");
    assert.equal(Object.hasOwn(captured.body.requests[0].requester, "email"), false);
    assert.deepEqual(captured.body.pagination, { page: 2, limit: 12, total: 13, pages: 2, hasNext: false, hasPrevious: true });
  });

  test("returns a paged outgoing history with project title and no collaborator document", async () => {
    CollabRequest.find = () => chain([{
      _id: new mongoose.Types.ObjectId(),
      scriptId: { _id: scriptId, title: "Night Train", collaborators: [{ userId: ownerId }] },
      requesterId,
      requestedRole: "editor",
      status: "accepted",
      createdAt: new Date(),
    }]);
    CollabRequest.countDocuments = async () => 1;
    const { captured, res } = response();
    await getOutgoingCollabRequests({ user: { _id: requesterId, role: "creator" }, query: {} }, res);
    assert.equal(captured.status, 200);
    assert.equal(captured.body.requests[0].scriptTitle, "Night Train");
    assert.equal(Object.hasOwn(captured.body.requests[0], "collaborators"), false);
  });
});

describe("collaboration activity projection", () => {
  test("pages activity without leaking invited email or internal metadata", async () => {
    AuditLog.find = () => chain([{
      _id: new mongoose.Types.ObjectId(),
      action: "invite_sent",
      actorId: { _id: ownerId, name: "Owner", profileImage: "" },
      metadata: { invitedEmail: "private@example.test", requestedRole: "viewer", mergeDetails: "private" },
      createdAt: new Date(),
    }]);
    AuditLog.countDocuments = async () => 1;
    const { captured, res } = response();
    await getActivityLog({ params: { scriptId }, query: {} }, res);
    assert.equal(captured.status, 200);
    assert.deepEqual(captured.body.activity[0].metadata, { role: "viewer" });
    assert.equal(JSON.stringify(captured.body).includes("private@example.test"), false);
    assert.equal(captured.body.pagination.total, 1);
  });
});
