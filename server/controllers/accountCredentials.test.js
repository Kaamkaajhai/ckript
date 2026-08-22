import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import User from "../models/User.js";
import { updateBankDetails } from "./transactionController.js";
import { getCurrentUser, updateUserProfile } from "./userController.js";
import { getWriterMembershipProofAccessUrl } from "./onboardingController.js";

const originalFindById = User.findById;

const response = () => {
  const captured = { status: 200, body: null, headers: {} };
  return {
    captured,
    res: {
      status(code) { captured.status = code; return this; },
      set(name, value) { captured.headers[name] = value; return this; },
      json(body) { captured.body = body; return this; },
    },
  };
};

afterEach(() => { User.findById = originalFindById; });

describe("writer account credential boundaries", () => {
  test("refuses writer payout data on the general profile mutation", async () => {
    let saves = 0;
    User.findById = async () => ({
      _id: "writer-1",
      role: "writer",
      name: "Mira",
      profileImage: "",
      markModified() {},
      async save() { saves += 1; },
    });
    const { captured, res } = response();
    await updateUserProfile({ user: { _id: "writer-1" }, body: { bankDetails: { accountNumber: "12345678" } } }, res);
    assert.equal(captured.status, 400);
    assert.match(captured.body.message, /payout account endpoint/i);
    assert.equal(saves, 0);
  });

  test("queues full writer payout details while returning only masked account values", async () => {
    const user = {
      _id: "writer-1",
      role: "writer",
      bankDetails: { accountHolderName: "Old", bankName: "Old bank", accountNumber: "87654321", routingNumber: "HDFC0000001" },
      bankDetailsReview: null,
      bankDetailsSecurity: { invalidAttempts: 2, isLocked: false },
      markModified() {},
      async save() {},
    };
    User.findById = async () => user;
    const { captured, res } = response();
    await updateBankDetails({
      user: { _id: "writer-1" },
      body: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "12345678", routingNumber: "HDFC0001234", accountType: "savings", country: "IN", currency: "USD" },
    }, res);
    assert.equal(captured.status, 200);
    assert.equal(user.bankDetails.accountNumber, "87654321");
    assert.equal(user.bankDetailsReview.requestedDetails.accountNumber, "12345678");
    assert.equal(user.bankDetailsReview.requestedDetails.currency, "INR");
    assert.equal(captured.body.bankDetails.accountNumber, "****4321");
    assert.equal(captured.body.bankDetailsReview.requestedDetails.accountNumber, "****5678");
    assert.equal(captured.body.bankDetailsSecurity.invalidAttempts, 0);
  });

  test("rejects unsupported payout values before mongoose can turn them into a 500", async () => {
    let saves = 0;
    const user = {
      _id: "writer-1",
      role: "writer",
      bankDetails: null,
      bankDetailsReview: null,
      bankDetailsSecurity: { invalidAttempts: 0, isLocked: false },
      markModified() {},
      async save() { saves += 1; },
    };
    User.findById = async () => user;
    const { captured, res } = response();
    await updateBankDetails({
      user: { _id: "writer-1" },
      body: { accountHolderName: "Mira", bankName: "HDFC", accountNumber: "12345678", routingNumber: "HDFC0001234", accountType: "wallet", country: "IND", currency: "RUPEES" },
    }, res);
    assert.equal(captured.status, 400);
    assert.match(captured.body.message, /account type/i);
    assert.equal(user.bankDetailsSecurity.invalidAttempts, 1);
    assert.equal(saves, 1);
  });

  test("gives the owner an expiring authenticated proof URL without returning the stored URL", async () => {
    process.env.CLOUDINARY_CLOUD_NAME ||= "test-cloud";
    process.env.CLOUDINARY_API_KEY ||= "test-key";
    process.env.CLOUDINARY_API_SECRET ||= "test-secret";
    const storedUrl = "https://res.cloudinary.com/test-cloud/image/authenticated/v1/membership/card.png";
    User.findById = () => ({
      lean: async () => ({
        writerProfile: {
          membershipVerification: {
            wga: {
              proofUrl: storedUrl,
              proofPublicId: "membership/card",
              proofMimeType: "image/png",
            },
          },
        },
      }),
    });
    const { captured, res } = response();
    await getWriterMembershipProofAccessUrl({ user: { _id: "writer-1" }, query: { membershipType: "wga" } }, res);
    assert.equal(captured.status, 200);
    assert.equal(captured.headers["Cache-Control"], "private, no-store");
    assert.notEqual(captured.body.url, storedUrl);
    assert.match(captured.body.url, /type=authenticated/);
    assert.match(captured.body.url, /format=png/);
  });

  test("redacts payout and proof secrets from the current-user endpoint too", async () => {
    User.findById = () => ({
      select: async () => ({
        toObject: () => ({
          _id: "writer-1",
          role: "writer",
          language: "en",
          password: "hash-secret",
          bankDetails: { accountNumber: "12345678", bankName: "HDFC" },
          bankDetailsReview: { status: "pending", requestedDetails: { accountNumber: "87654321", bankName: "ICICI" } },
          writerProfile: { membershipVerification: { wga: { status: "pending", proofUrl: "proof-secret", proofPublicId: "public-id-secret", proofFileName: "card.pdf" } } },
        }),
      }),
    });
    const { captured, res } = response();
    await getCurrentUser({ user: { _id: "writer-1" } }, res);
    assert.equal(captured.status, 200);
    assert.equal(captured.body.bankDetails.accountNumber, "****5678");
    assert.equal(captured.body.bankDetailsReview.requestedDetails.accountNumber, "****4321");
    const serialized = JSON.stringify(captured.body);
    for (const secret of ["hash-secret", "12345678", "87654321", "proof-secret", "public-id-secret"]) {
      assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
    }
  });
});
