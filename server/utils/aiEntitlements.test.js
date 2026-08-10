import test from "node:test";
import assert from "node:assert/strict";

import {
  AI_FREE_PLANS,
  AI_IMAGE_ALLOWANCE,
  aiImagesRemaining,
  aiLockedResponse,
  aiQuotaExhaustedResponse,
  hasAiAccess,
  normalizePlan,
} from "../config/aiEntitlements.js";

// The plan enum as declared on User.subscription.plan. Every value must resolve to a decision, and
// the split must match the product rule: free is locked, everything sold or granted is not.
const PLAN_ENUM = ["free", "pro", "enterprise", "silver", "gold", "diamond"];

test("every plan in the User.subscription.plan enum resolves to a decision", () => {
  const decided = PLAN_ENUM.map((plan) => [plan, hasAiAccess(plan)]);
  assert.deepEqual(decided, [
    ["free", false],
    ["pro", true],
    ["enterprise", true],
    ["silver", true],
    ["gold", true],
    ["diamond", true],
  ]);
});

test("the gold-only rule the client used to enforce is gone", () => {
  // This is the defect this module exists to fix: a diamond subscriber was refused AI metadata
  // generation on /create-project by `enforceGoldPlan`, while /upload served them the same endpoint.
  for (const plan of ["silver", "diamond", "pro", "enterprise"]) {
    assert.equal(hasAiAccess(plan), true, `${plan} must have AI access`);
  }
});

test("absent, empty and explicit none plan values are treated as free, not as access", () => {
  for (const value of [undefined, null, "", "   ", "none", "NONE"]) {
    assert.equal(hasAiAccess(value), false, `${JSON.stringify(value)} must be locked`);
  }
});

test("plan matching is case- and whitespace-insensitive", () => {
  assert.equal(hasAiAccess("  GOLD  "), true);
  assert.equal(hasAiAccess("Gold"), true);
  assert.equal(hasAiAccess("  FREE "), false);
  assert.equal(normalizePlan("  Gold "), "gold");
});

test("an unrecognised plan value is treated as paid, matching the server's historical behaviour", () => {
  // The gate is a deny-list, not an allow-list. A plan added to the enum later unlocks AI by
  // default rather than silently locking out people who paid for it — the failure mode that
  // produced the original defect. Tightening this is a deliberate decision, not an accident.
  assert.equal(hasAiAccess("platinum"), true);
});

test("remaining images clamps at both ends", () => {
  assert.equal(aiImagesRemaining(0), AI_IMAGE_ALLOWANCE);
  assert.equal(aiImagesRemaining(1), AI_IMAGE_ALLOWANCE - 1);
  assert.equal(aiImagesRemaining(AI_IMAGE_ALLOWANCE), 0);
  // A counter past the allowance reports 0 left, never a negative.
  assert.equal(aiImagesRemaining(AI_IMAGE_ALLOWANCE + 40), 0);
});

test("a missing or malformed counter reports the full allowance rather than zero", () => {
  // Documents saved before `aiImagesGeneratedTotal` existed have no value. Reading that as "used
  // everything" would lock out paying writers, so it reads as "used nothing".
  for (const value of [undefined, null, NaN, "", "abc", -3]) {
    assert.equal(aiImagesRemaining(value), AI_IMAGE_ALLOWANCE);
  }
});

test("a locked response carries the machine-readable upgrade flag", () => {
  const body = aiLockedResponse("AI cover generation");
  assert.equal(body.requiresUpgrade, true);
  assert.match(body.message, /AI cover generation/);
  assert.match(body.message, /paid plan/i);
  assert.equal(body.quotaExhausted, undefined);
});

test("an exhausted-quota response is distinguishable from a locked one", () => {
  // The distinction is load-bearing for the client: a locked feature offers an upgrade, an
  // exhausted allowance must NOT — the writer already paid, they have simply spent the period.
  const body = aiQuotaExhaustedResponse();
  assert.equal(body.quotaExhausted, true);
  assert.equal(body.requiresUpgrade, undefined);
  assert.equal(body.remaining, 0);
  assert.equal(body.allowance, AI_IMAGE_ALLOWANCE);
  assert.match(body.message, new RegExp(String(AI_IMAGE_ALLOWANCE)));
});

test("the free-plan list is frozen so a caller cannot mutate the entitlement rule", () => {
  assert.throws(() => AI_FREE_PLANS.push("gold"));
  assert.equal(hasAiAccess("gold"), true);
});
