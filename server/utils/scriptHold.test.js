import { describe, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { readFileSync } from "node:fs";
import { isValidRazorpaySignature, validateScriptHoldPayment } from "./scriptHold.js";

const base = () => ({
  orderId: "order_1",
  paymentId: "pay_1",
  userId: "user_1",
  scriptId: "script_1",
  expectedTotalInr: 210,
  order: {
    id: "order_1",
    amount: 21000,
    amount_paid: 21000,
    currency: "INR",
    status: "paid",
    notes: { type: "script_hold", userId: "user_1", scriptId: "script_1", totalAmountInr: "210.00", fxRate: "1" },
  },
  payment: { id: "pay_1", order_id: "order_1", amount: 21000, currency: "INR", status: "captured", captured: true },
});

describe("script hold payment boundary", () => {
  test("accepts the exact paid and captured account/project order", () => {
    assert.deepEqual(validateScriptHoldPayment(base()), {
      ok: true,
      charge: { currency: "INR", chargedTotal: 210, fxRate: 1 },
    });
  });

  for (const [name, patch] of [
    ["different account", { order: { notes: { userId: "other" } } }],
    ["different project", { order: { notes: { scriptId: "other" } } }],
    ["wrong purpose", { order: { notes: { type: "script_purchase" } } }],
    ["changed INR price", { order: { notes: { totalAmountInr: "1.00" } } }],
    ["unpaid order", { order: { status: "created", amount_paid: 0 } }],
    ["uncaptured payment", { payment: { status: "authorized", captured: false } }],
    ["different amount", { payment: { amount: 100 } }],
  ]) {
    test(`refuses ${name}`, () => {
      const input = base();
      if (patch.order) input.order = { ...input.order, ...patch.order, notes: { ...input.order.notes, ...(patch.order.notes || {}) } };
      if (patch.payment) input.payment = { ...input.payment, ...patch.payment };
      assert.equal(validateScriptHoldPayment(input).ok, false);
    });
  }

  test("compares callback signatures without a plain string equality", () => {
    const secret = "secret";
    const signature = crypto.createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    assert.equal(isValidRazorpaySignature({ orderId: "order_1", paymentId: "pay_1", signature, secret }), true);
    assert.equal(isValidRazorpaySignature({ orderId: "order_1", paymentId: "pay_1", signature: "bad", secret }), false);
  });

  test("the legacy no-payment hold route is not registered", () => {
    const routes = readFileSync(new URL("../routes/scriptRoutes.js", import.meta.url), "utf8");
    assert.doesNotMatch(routes, /router\.post\(["']\/hold["']/);
    assert.match(routes, /router\.post\(["']\/hold\/verify-payment["']/);
  });
});
