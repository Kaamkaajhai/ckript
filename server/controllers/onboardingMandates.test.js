import test, { afterEach, describe } from "node:test";
import assert from "node:assert/strict";
import User from "../models/User.js";
import { updateMandates } from "./onboardingController.js";

const originalFindById = User.findById;
afterEach(() => { User.findById = originalFindById; });

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

describe("mandates mutation boundary", () => {
  test("rejects actors and writers before an account lookup", async () => {
    let lookups = 0;
    User.findById = async () => { lookups += 1; return null; };
    for (const role of ["actor", "writer", "reader", "admin"]) {
      const { captured, res } = response();
      await updateMandates({ user: { _id: "u1", role }, body: { mandates: {} } }, res);
      assert.equal(captured.status, 403);
    }
    assert.equal(lookups, 0);
  });

  test("persists only canonical allow-listed arrays for a professional", async () => {
    let saves = 0;
    const user = { _id: "u1", role: "producer", industryProfile: {}, async save() { saves += 1; } };
    User.findById = async () => user;
    const { captured, res } = response();
    await updateMandates({
      user: { _id: "u1", role: "producer" },
      body: { mandates: {
        formats: ["Feature Film", "unknown"],
        genres: ["drama", "not-real"],
        excludeGenres: ["HORROR"],
        specificHooks: ["true story", "custom"],
        budgetTiers: ["100m"],
      } },
    }, res);
    assert.equal(captured.status, 200);
    assert.equal(saves, 1);
    assert.deepEqual(user.industryProfile.mandates, {
      formats: ["feature"], genres: ["Drama"], excludeGenres: ["Horror"], specificHooks: ["True Story"],
    });
    assert.deepEqual(captured.body.mandates, user.industryProfile.mandates);
  });
});
