import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { getConversations, toggleReaction } from "./messageController.js";

const originalAggregate = Message.aggregate;
const originalPopulate = Message.populate;
const originalFindById = Message.findById;

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
  Message.aggregate = originalAggregate;
  Message.populate = originalPopulate;
  Message.findById = originalFindById;
});

describe("message conversation boundaries", () => {
  test("inbox groups before limiting and returns the real unread total", async () => {
    const viewerId = new mongoose.Types.ObjectId();
    const otherId = new mongoose.Types.ObjectId();
    let pipeline;
    Message.aggregate = async (value) => {
      pipeline = value;
      return [{
        _id: "chat-1",
        latest: {
          chatId: "chat-1",
          sender: otherId,
          receiver: viewerId,
          text: "New pages are ready",
          createdAt: new Date("2026-08-21T10:00:00Z"),
        },
        unreadCount: 3,
      }];
    };
    Message.populate = async (threads) => {
      threads[0].latest.sender = { _id: otherId, name: "Asha", role: "writer" };
      threads[0].latest.receiver = { _id: viewerId, name: "Dev", role: "investor" };
      return threads;
    };

    const { captured, res } = response();
    await getConversations({ user: { _id: viewerId } }, res);

    assert.equal(captured.status, 200);
    assert.equal(captured.body[0].unreadCount, 3);
    assert.equal(captured.body[0].user.name, "Asha");
    assert.ok(pipeline.find((stage) => stage.$group), "messages must be grouped into chats before limiting");
    assert.deepEqual(pipeline.at(-1), { $limit: 50 });
  });

  test("reaction rejects a malformed id before database access", async () => {
    let lookups = 0;
    Message.findById = async () => { lookups += 1; };
    const { captured, res } = response();
    await toggleReaction({ user: { _id: new mongoose.Types.ObjectId() }, params: { messageId: "bad" }, body: { emoji: "👍" } }, res);
    assert.equal(captured.status, 400);
    assert.equal(lookups, 0);
  });

  test("reaction is limited to the message participants", async () => {
    const messageId = new mongoose.Types.ObjectId();
    Message.findById = async () => ({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      reactions: [],
      async save() { throw new Error("must not save"); },
    });
    const { captured, res } = response();
    await toggleReaction({ user: { _id: new mongoose.Types.ObjectId() }, params: { messageId: String(messageId) }, body: { emoji: "👍" } }, res);
    assert.equal(captured.status, 403);
  });
});
