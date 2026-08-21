// Who `POST /api/payment/reveal-contact/:writerId` will hand an email and a phone number to.
//
// DEF-29 (D29): the id comes from the URL and nothing checked what kind of account it pointed at,
// so any caller with FIP access could read ANY user's email and phone — another producer's, an
// admin's, a reader's — by passing their id. The endpoint is named for writers, the client only
// ever passes writers, and the opt-out check right below it was already writer-shaped, which is
// what made the gap visible: a non-writer could not opt out of a disclosure the product says is
// about writers.
//
// These tests are about the GATE, not the quota: `User.findById` is stubbed so no database is
// involved, and what is asserted is the status and whether contact details left the building.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";
import { revealWriterContact } from "./paymentController.js";

const originalFindById = User.findById;
const originalUpdateOne = User.updateOne;

const VIEWER_ID = new mongoose.Types.ObjectId().toString();
const TARGET_ID = new mongoose.Types.ObjectId().toString();

/** A viewer with a live plan, so the entitlement gate passes and the ROLE gate is what is tested. */
const viewer = () => ({
  _id: VIEWER_ID,
  role: "producer",
  email: "buyer@studio.com",
  subscription: {
    plan: "pro",
    accessStatus: "active",
    accessTier: "film_industry_professional",
    accessExpiresAt: new Date(Date.now() + 86400000),
    revealedContacts: [],
    contactsLimit: 10,
  },
});

const target = (extra = {}) => ({
  _id: TARGET_ID,
  name: "Mira Sen",
  email: "mira@writers.example",
  phone: "+91 90000 00000",
  role: "writer",
  writerProfile: { links: {} },
  ...extra,
});

/*
 * Stub the two model calls this controller makes.
 *
 * `findById` answers in the order the controller asks: the viewer, then the target, then the
 * viewer again (re-read for the quota it just spent). `updateOne` has to be stubbed as well or the
 * success path reaches a real Mongo write, buffers for ten seconds and answers 500 — which is a
 * green-looking refusal test for entirely the wrong reason.
 */
const stubUsers = (targetDoc) => {
  const queue = [viewer(), targetDoc, viewer()];
  User.findById = () => {
    const doc = queue.shift() ?? viewer();
    const chain = {
      select: () => chain,
      lean: async () => doc,
      then: (resolve) => resolve(doc),
    };
    return chain;
  };
  User.updateOne = async () => ({ acknowledged: true });
};

const call = async (writerId = TARGET_ID) => {
  const captured = { status: 200, body: null };
  const res = {
    status(code) { captured.status = code; return this; },
    json(body) { captured.body = body; return this; },
  };
  await revealWriterContact({ params: { writerId }, user: { _id: VIEWER_ID } }, res);
  return captured;
};

beforeEach(() => { stubUsers(target()); });
afterEach(() => {
  User.findById = originalFindById;
  User.updateOne = originalUpdateOne;
});

describe("the role gate", () => {
  test("a writer's contact is revealed", async () => {
    const { status, body } = await call();
    assert.equal(status, 200);
    assert.equal(body.contact.email, "mira@writers.example");
  });

  test("a 'creator' is a writer under its other name", async () => {
    stubUsers(target({ role: "creator" }));
    const { status } = await call();
    assert.equal(status, 200);
  });

  test("another industry account's contact is NOT revealed", async () => {
    stubUsers(target({ role: "producer" }));
    const { status, body } = await call();
    assert.equal(status, 404);
    assert.equal(body.contact, undefined);
  });

  test("an admin's contact is NOT revealed", async () => {
    stubUsers(target({ role: "admin" }));
    const { status, body } = await call();
    assert.equal(status, 404);
    assert.equal(body.contact, undefined);
  });

  test("a reader's contact is NOT revealed", async () => {
    stubUsers(target({ role: "reader" }));
    const { status, body } = await call();
    assert.equal(status, 404);
    assert.equal(body.contact, undefined);
  });
});

describe("the writer's own choice", () => {
  test("opting out refuses the reveal, and says so", async () => {
    stubUsers(target({ allowIndustryContact: false }));
    const { status, body } = await call();
    assert.equal(status, 403);
    assert.equal(body.optedOut, true);
    assert.equal(body.contact, undefined);
  });
});

describe("the id itself", () => {
  test("a malformed id is a bad request, not a lookup", async () => {
    const { status } = await call("not-an-id");
    assert.equal(status, 400);
  });
});
