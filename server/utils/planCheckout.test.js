// The rules that decide what a plan payment actually buys.
//
// Both plan verifiers used to check ONLY the Razorpay signature and then read `tier` and `cycle`
// from the request body to decide what to grant. A signature proves that some payment on this
// merchant account succeeded — not which order, for how much, or by whom. Two live escalations
// followed, both reachable by any authenticated user holding one legitimate cheap payment:
//
//   • Buy Silver (₹399), verify with tier:"gold"   → Gold (₹699/mo, ₹7,130/yr) granted.
//   • Buy monthly, verify with cycle:"annual"      → 365 days granted instead of 30.
//
// The fix stamps plan and cycle into the order at creation, where the price is computed, and reads
// them back at verification. These tests assert that contract. Prices are restated as LITERALS: a
// test that imported the values it checks would pass no matter what they were changed to.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { planAmountMinor, planOrderNotes, readVerifiedPlanOrder, PLAN_PURPOSE } from "./planCheckout.js";

const USER = "507f1f77bcf86cd799439011";
const OTHER = "507f1f77bcf86cd799439012";

/** A Razorpay client stubbed to return one order. */
const clientFor = (order) => ({ orders: { fetch: async () => order } });

const orderFor = ({ planKey, tier = "", cycle = "monthly", currency = "INR", amount, paid, userId = USER }) => ({
  currency,
  amount,
  amount_paid: paid ?? amount,
  notes: { purpose: PLAN_PURPOSE, userId: String(userId), planKey, tier, cycle },
});

describe("plan prices", () => {
  test("monthly prices match the published matrix", () => {
    assert.equal(planAmountMinor("film_industry_professional", "INR", "monthly"), 199900); // ₹1,999
    assert.equal(planAmountMinor("writer_silver", "INR", "monthly"), 39900);               // ₹399
    assert.equal(planAmountMinor("writer_gold", "INR", "monthly"), 69900);                 // ₹699
    assert.equal(planAmountMinor("writer_gold", "USD", "monthly"), 900);                   // $9
  });

  test("annual is twelve months less fifteen percent", () => {
    assert.equal(planAmountMinor("writer_silver", "INR", "annual"), 407000);  // ₹4,070
    assert.equal(planAmountMinor("writer_gold", "INR", "annual"), 713000);    // ₹7,130
    assert.equal(planAmountMinor("film_industry_professional", "INR", "annual"), 2039000); // ₹20,390
  });

  test("an unknown currency falls back to the INR column rather than returning nothing", () => {
    // Returning null here would make every EUR order fail the amount check and block a real payment.
    assert.equal(planAmountMinor("writer_gold", "EUR", "monthly"), 69900);
  });

  test("an unknown plan has no price", () => {
    assert.equal(planAmountMinor("writer_platinum", "INR", "monthly"), null);
  });
});

describe("the order is authoritative, not the request body", () => {
  test("a paid Gold annual order verifies as gold/annual", async () => {
    const r = await readVerifiedPlanOrder(
      clientFor(orderFor({ planKey: "writer_gold", tier: "gold", cycle: "annual", amount: 713000 })),
      "order_x", USER,
    );
    assert.equal(r.error, undefined);
    assert.equal(r.tier, "gold");
    assert.equal(r.cycle, "annual");
    assert.equal(r.paidMajor, 7130);
  });

  test("THE ESCALATION: a Silver payment cannot yield Gold", async () => {
    // The caller may still send tier:"gold" — it is simply never read. The order says silver.
    const r = await readVerifiedPlanOrder(
      clientFor(orderFor({ planKey: "writer_silver", tier: "silver", amount: 39900 })),
      "order_x", USER,
    );
    assert.equal(r.error, undefined);
    assert.equal(r.tier, "silver", "the tier must come from the order, never from the body");
    assert.equal(r.paidMajor, 399);
  });

  test("THE ESCALATION: a monthly payment cannot yield an annual term", async () => {
    const r = await readVerifiedPlanOrder(
      clientFor(orderFor({ planKey: "writer_gold", tier: "gold", cycle: "monthly", amount: 69900 })),
      "order_x", USER,
    );
    assert.equal(r.cycle, "monthly");
  });

  test("an order whose amount is below its plan price is refused", async () => {
    // Guards against a tampered or partially-captured order claiming a dearer plan.
    const r = await readVerifiedPlanOrder(
      clientFor(orderFor({ planKey: "writer_gold", tier: "gold", amount: 39900 })),
      "order_x", USER,
    );
    assert.match(r.error, /amount paid/i);
    assert.equal(r.status, 400);
  });

  test("an order created but never captured is refused", async () => {
    // Razorpay reports amount_paid: 0 until capture; trusting `amount` alone would accept this.
    const r = await readVerifiedPlanOrder(
      clientFor(orderFor({ planKey: "writer_gold", tier: "gold", amount: 69900, paid: 0 })),
      "order_x", USER,
    );
    assert.match(r.error, /amount paid/i);
  });
});

describe("the order must belong to this buyer and this flow", () => {
  test("another user's plan payment is refused", async () => {
    const r = await readVerifiedPlanOrder(
      clientFor(orderFor({ planKey: "writer_gold", tier: "gold", amount: 69900, userId: OTHER })),
      "order_x", USER,
    );
    assert.match(r.error, /does not belong/i);
  });

  test("a payment from elsewhere in the app is refused", async () => {
    // A competition entry fee carries a valid signature but is not a plan purchase.
    const competitionOrder = {
      currency: "INR", amount: 9800, amount_paid: 9800,
      notes: { purpose: "competition_registration", competitionId: "c1", userId: USER },
    };
    const r = await readVerifiedPlanOrder(clientFor(competitionOrder), "order_x", USER);
    assert.match(r.error, /does not belong/i);
  });

  test("an order with no notes at all is refused", async () => {
    const r = await readVerifiedPlanOrder(
      clientFor({ currency: "INR", amount: 69900, amount_paid: 69900 }), "order_x", USER,
    );
    assert.match(r.error, /does not belong/i);
  });

  test("a missing order is refused rather than treated as paid", async () => {
    const r = await readVerifiedPlanOrder(clientFor(null), "order_x", USER);
    assert.equal(r.status, 400);
  });

  test("a Razorpay outage fails closed, as 502", async () => {
    const throwing = { orders: { fetch: async () => { throw new Error("network"); } } };
    const r = await readVerifiedPlanOrder(throwing, "order_x", USER);
    assert.equal(r.status, 502);
  });
});

describe("order notes", () => {
  test("carry the plan, the buyer and a normalised cycle", () => {
    const n = planOrderNotes({ userId: USER, planKey: "writer_gold", tier: "gold", cycle: "annual" });
    assert.deepEqual(n, {
      purpose: PLAN_PURPOSE, userId: USER, planKey: "writer_gold", tier: "gold", cycle: "annual",
    });
  });

  test("anything that is not 'annual' normalises to monthly", () => {
    // The cycle decides a 12× price difference, so it must never pass through unvalidated.
    for (const input of ["yearly", "ANNUAL", "", undefined, "monthly"]) {
      assert.equal(planOrderNotes({ userId: USER, planKey: "writer_gold", cycle: input }).cycle, "monthly");
    }
  });
});
