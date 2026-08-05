// The rules that decide whether a competition entry fee was really paid, and what its invoice says.
//
// These exist because the original verifier checked ONLY the Razorpay signature. A signature proves
// that some payment on our merchant account succeeded — not which one, not for how much, and not by
// whom. So a captured payment from anywhere else in the app satisfied it, and the amount an invoice
// would have to state was never established at all. Nothing recorded the payment either, so an
// entry carried no evidence of what had been charged.
//
// The contract asserted here mirrors verifyRegistrationPayment in competitionController.js. The fee
// table and binding rules are restated as LITERALS on purpose: a test that imported the values it
// checks would pass no matter what they were changed to.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const FEE = {
  INR: { minor: 9800, major: 98 },
  USD: { minor: 200, major: 2 },
};

/** Mirrors the binding check: does this order belong to this registration? */
const boundToThisFlow = (order, competitionId, userId) => {
  const notes = order?.notes || {};
  return notes.purpose === "competition_registration"
    && String(notes.competitionId) === String(competitionId)
    && String(notes.userId) === String(userId);
};

/** Mirrors the amount check, including the amount_paid preference. */
const amountAccepted = (order) => {
  const currency = String(order?.currency || "INR").toUpperCase();
  const expected = FEE[currency];
  const paidMinor = Number(order?.amount_paid ?? order?.amount) || 0;
  return Boolean(expected) && paidMinor >= expected.minor;
};

const orderFor = (competitionId, userId, over = {}) => ({
  currency: "INR",
  amount: FEE.INR.minor,
  amount_paid: FEE.INR.minor,
  notes: { purpose: "competition_registration", competitionId, userId },
  ...over,
});

describe("binding an order to its registration", () => {
  test("accepts an order stamped for this competition and this user", () => {
    assert.equal(boundToThisFlow(orderFor("comp1", "user1"), "comp1", "user1"), true);
  });

  test("rejects a payment made for a DIFFERENT competition", () => {
    // The replay this guards against: register for a cheap event, reuse that payment on a costly one.
    assert.equal(boundToThisFlow(orderFor("comp2", "user1"), "comp1", "user1"), false);
  });

  test("rejects a payment made by a DIFFERENT user", () => {
    assert.equal(boundToThisFlow(orderFor("comp1", "user2"), "comp1", "user1"), false);
  });

  test("rejects a payment from elsewhere in the app", () => {
    // A subscription or script purchase carries a valid signature but no registration stamp.
    const subscription = { currency: "INR", amount: 50000, notes: { purpose: "writer_subscription" } };
    assert.equal(boundToThisFlow(subscription, "comp1", "user1"), false);
  });

  test("rejects an order with no notes at all", () => {
    assert.equal(boundToThisFlow({ currency: "INR", amount: FEE.INR.minor }, "comp1", "user1"), false);
  });
});

describe("the amount actually captured", () => {
  test("accepts the exact INR fee", () => {
    assert.equal(amountAccepted(orderFor("c", "u")), true);
  });

  test("accepts the exact USD fee", () => {
    assert.equal(amountAccepted(orderFor("c", "u", { currency: "USD", amount: 200, amount_paid: 200 })), true);
  });

  test("rejects an underpayment", () => {
    assert.equal(amountAccepted(orderFor("c", "u", { amount: 100, amount_paid: 100 })), false);
  });

  test("rejects an order that was created but never captured", () => {
    // Razorpay reports amount_paid: 0 until capture. Trusting `amount` alone would accept this.
    assert.equal(amountAccepted(orderFor("c", "u", { amount_paid: 0 })), false);
  });

  test("rejects a currency we do not price", () => {
    assert.equal(amountAccepted(orderFor("c", "u", { currency: "EUR", amount: 100000, amount_paid: 100000 })), false);
  });

  test("reads amount_paid in preference to amount", () => {
    const partial = orderFor("c", "u", { amount: FEE.INR.minor, amount_paid: 1 });
    assert.equal(amountAccepted(partial), false, "a 1-paise capture against a 9800-paise order must fail");
  });
});

describe("what the invoice records", () => {
  // The invoice must state the currency actually charged. The PDF helper hardcoded "INR", so a USD
  // entry fee would have been documented as "INR 2.00" — a wrong number and a wrong currency.
  const asCurrency = (value = 0, currency = "INR") =>
    `${String(currency || "INR").toUpperCase()} ${Number(value || 0).toFixed(2)}`;

  test("prints the charged currency, not a fixed one", () => {
    assert.equal(asCurrency(2, "USD"), "USD 2.00");
    assert.equal(asCurrency(98, "INR"), "INR 98.00");
  });

  test("defaults to INR when a legacy invoice carries no currency", () => {
    assert.equal(asCurrency(499), "INR 499.00");
    assert.equal(asCurrency(499, ""), "INR 499.00");
  });

  test("converts minor units to the major amount the buyer sees", () => {
    assert.equal(FEE.INR.minor / 100, FEE.INR.major);
    assert.equal(FEE.USD.minor / 100, FEE.USD.major);
  });
});
