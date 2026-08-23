import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { acceptFollowRequest, rejectFollowRequest } from "./userController.js";

const originalFindById = User.findById;
const originalUpdateOne = User.updateOne;
const originalCreateNotification = Notification.create;
const originalDeleteNotifications = Notification.deleteMany;

const OWNER_ID = new mongoose.Types.ObjectId();
const REQUESTER_ID = new mongoose.Types.ObjectId();

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
  User.findById = originalFindById;
  User.updateOne = originalUpdateOne;
  Notification.create = originalCreateNotification;
  Notification.deleteMany = originalDeleteNotifications;
});

describe("incoming follow request ids", () => {
  for (const [label, controller] of [["accept", acceptFollowRequest], ["reject", rejectFollowRequest]]) {
    test(`${label} rejects a malformed requester before any database lookup`, async () => {
      let lookups = 0;
      User.findById = () => { lookups += 1; };
      const { captured, res } = response();
      await controller({ body: { fromUserId: "not-an-object-id" }, user: { _id: OWNER_ID } }, res);
      assert.equal(captured.status, 400);
      assert.equal(lookups, 0);
    });
  }

  test("accept consumes the request notification as part of the server mutation", async () => {
    const me = {
      _id: OWNER_ID,
      followRequests: [{ from: REQUESTER_ID }],
      followers: { addToSet(value) { assert.equal(String(value), String(REQUESTER_ID)); } },
      async save() {},
    };
    const requester = {
      _id: REQUESTER_ID,
      following: { addToSet(value) { assert.equal(String(value), String(OWNER_ID)); } },
      async save() {},
    };
    const users = [me, requester];
    User.findById = async () => users.shift();
    let deletedQuery;
    Notification.deleteMany = async (query) => { deletedQuery = query; };
    Notification.create = async () => ({});

    const { captured, res } = response();
    await acceptFollowRequest({ body: { fromUserId: String(REQUESTER_ID) }, user: { _id: OWNER_ID } }, res);

    assert.equal(captured.status, 200);
    assert.equal(me.followRequests.length, 0);
    assert.deepEqual(deletedQuery, {
      user: OWNER_ID,
      type: "follow_request",
      from: REQUESTER_ID,
    });
  });
});
