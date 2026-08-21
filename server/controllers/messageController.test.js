import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import {
  authorizeMessageAttachmentTarget,
  deleteMessage,
  getConversations,
  sendMessage,
  toggleReaction,
} from "./messageController.js";

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

  test("reaction rejects unsupported values before database access", async () => {
    let lookups = 0;
    Message.findById = async () => { lookups += 1; };
    const { captured, res } = response();
    await toggleReaction({ user: { _id: new mongoose.Types.ObjectId() }, params: { messageId: String(new mongoose.Types.ObjectId()) }, body: { emoji: "custom" } }, res);
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

  test("reaction socket delivery contains only the saved authoritative state", async () => {
    const viewerId = new mongoose.Types.ObjectId();
    const messageId = new mongoose.Types.ObjectId();
    const receiverId = new mongoose.Types.ObjectId();
    const emitted = [];
    const message = {
      _id: messageId,
      chatId: "chat-1",
      sender: viewerId,
      receiver: receiverId,
      reactions: [],
      async save() {},
    };
    Message.findById = async () => message;
    const req = {
      user: { _id: viewerId },
      params: { messageId: String(messageId) },
      body: { emoji: "👍" },
      app: { get: () => ({ to: () => ({ emit: (...args) => emitted.push(args) }) }) },
    };
    const { captured, res } = response();
    await toggleReaction(req, res);
    assert.equal(captured.status, 200);
    assert.deepEqual(emitted[0], ["message-reaction", {
      chatId: "chat-1",
      messageId,
      reactions: [{ emoji: "👍", userId: viewerId }],
    }]);
  });

  test("attachment sends require a server-issued grant before database access", async () => {
    let lookups = 0;
    Message.findById = async () => { lookups += 1; };
    const { captured, res } = response();
    await sendMessage({
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        receiverId: String(new mongoose.Types.ObjectId()),
        text: "",
        fileUrl: "https://files.example.test/forged.pdf",
      },
    }, res);
    assert.equal(captured.status, 400);
    assert.match(captured.body.message, /grant/i);
    assert.equal(lookups, 0);
  });

  test("attachment authorization runs before multipart parsing and reserves generic uploads for admins", async () => {
    const { captured, res } = response();
    let nextCalls = 0;
    await authorizeMessageAttachmentTarget({
      user: { _id: new mongoose.Types.ObjectId(), role: "writer" },
      query: {},
    }, res, () => { nextCalls += 1; });
    assert.equal(captured.status, 400);
    assert.equal(nextCalls, 0);

    const adminResponse = response();
    await authorizeMessageAttachmentTarget({
      user: { _id: new mongoose.Types.ObjectId(), role: "admin" },
      query: {},
    }, adminResponse.res, () => { nextCalls += 1; });
    assert.equal(nextCalls, 1);
    assert.equal(adminResponse.captured.body, null);
  });

  test("deletion validates ids and broadcasts only after clearing message content", async () => {
    const viewerId = new mongoose.Types.ObjectId();
    const { captured: malformed, res: malformedRes } = response();
    await deleteMessage({ user: { _id: viewerId }, params: { messageId: "bad" } }, malformedRes);
    assert.equal(malformed.status, 400);

    const messageId = new mongoose.Types.ObjectId();
    const emitted = [];
    const message = {
      _id: messageId,
      chatId: "chat-1",
      sender: viewerId,
      text: "Private draft",
      fileUrl: "https://files.test/draft.pdf",
      fileType: "document",
      fileName: "draft.pdf",
      fileSize: 123,
      reactions: [{ emoji: "👍", userId: viewerId }],
      async save() {
        assert.equal(this.deleted, true);
        assert.equal(this.text, "");
        assert.equal(this.fileUrl, undefined);
        assert.deepEqual(this.reactions, []);
      },
    };
    Message.findById = async () => message;
    const { captured, res } = response();
    await deleteMessage({
      user: { _id: viewerId },
      params: { messageId: String(messageId) },
      app: { get: () => ({ to: () => ({ emit: (...args) => emitted.push(args) }) }) },
    }, res);
    assert.equal(captured.status, 200);
    assert.equal(captured.body.success, true);
    assert.equal(emitted[0][0], "message-deleted");
    assert.equal(String(emitted[0][1].messageId), String(messageId));
  });
});
