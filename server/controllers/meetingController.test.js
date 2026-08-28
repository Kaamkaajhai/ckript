import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import mongoose from "mongoose";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { requestMeeting } from "./meetingController.js";

const originalUserFindById = User.findById;
const originalScriptFindById = Script.findById;
const producerId = new mongoose.Types.ObjectId();
const writerId = new mongoose.Types.ObjectId();
const scriptId = new mongoose.Types.ObjectId();

const chain = (value) => {
  const query = {
    select: () => query,
    lean: async () => value,
  };
  return query;
};

const producer = {
  _id: producerId,
  name: "Dev Shah",
  email: "dev@studio.example",
  role: "producer",
  googleCalendar: { connected: true, refreshTokenEnc: "encrypted" },
  subscription: {
    plan: "pro",
    accessTier: "film_industry_professional",
    accessStatus: "active",
    accessExpiresAt: new Date(Date.now() + 86_400_000),
    scheduledMeetings: [],
    meetingsLimit: 10,
  },
};

const request = () => ({
  user: { _id: producerId },
  body: {
    writerId: String(writerId),
    scriptId: String(scriptId),
    title: "Project discussion",
    scheduledDate: "2099-01-01",
    scheduledTime: "10:00",
    duration: 30,
    message: "Bring the new pages.",
    timeZone: "Asia/Kolkata",
  },
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
  User.findById = originalUserFindById;
  Script.findById = originalScriptFindById;
});

describe("meeting subject authorization", () => {
  test("refuses a non-writer target before loading the script", async () => {
    let scriptLookups = 0;
    User.findById = (id) => chain(String(id) === String(producerId)
      ? producer
      : { _id: writerId, name: "Industry Peer", email: "peer@example.com", role: "producer" });
    Script.findById = () => { scriptLookups += 1; return chain(null); };
    const { captured, res } = response();

    await requestMeeting(request(), res);

    assert.equal(captured.status, 400);
    assert.match(captured.body.message, /only be requested with a writer/);
    assert.equal(scriptLookups, 0);
  });

  test("refuses a valid writer paired with somebody else's project", async () => {
    User.findById = (id) => chain(String(id) === String(producerId)
      ? producer
      : { _id: writerId, name: "Mira Sen", email: "mira@example.com", role: "creator" });
    Script.findById = () => chain({
      _id: scriptId,
      title: "Someone Else's Story",
      creator: new mongoose.Types.ObjectId(),
    });
    const { captured, res } = response();

    await requestMeeting(request(), res);

    assert.equal(captured.status, 403);
    assert.match(captured.body.message, /does not belong/);
  });

  test("does not expose a writer's private project through a calendar event", async () => {
    User.findById = (id) => chain(String(id) === String(producerId)
      ? producer
      : { _id: writerId, name: "Mira Sen", email: "mira@example.com", role: "writer" });
    Script.findById = () => chain({
      _id: scriptId,
      title: "Unannounced Project",
      creator: writerId,
      status: "draft",
      isDeleted: false,
      isSold: false,
      unlockedBy: [],
      purchasedBy: [],
    });
    const { captured, res } = response();

    await requestMeeting(request(), res);

    assert.equal(captured.status, 403);
    assert.match(captured.body.message, /not available/);
  });
});
