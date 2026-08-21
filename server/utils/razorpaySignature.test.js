// The check that decides whether money was really paid.
//
// Razorpay signs `order_id|payment_id` with the key secret; this is what separates a genuine callback
// from someone POSTing plausible-looking ids at the verify endpoint. It was written out six times
// across three controllers, every copy comparing with `!==`, which returns the moment two bytes
// differ and so leaks — through timing — how much of a guessed signature was right.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const SECRET = "test_secret_value";
process.env.RAZORPAY_KEY_SECRET = SECRET;

const { verifyRazorpaySignature } = await import("./razorpaySignature.js");

const ORDER = "order_ABC123";
const PAYMENT = "pay_XYZ789";
const sign = (orderId, paymentId, secret = SECRET) =>
  crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

describe("a genuine signature is accepted", () => {
  test("the real HMAC passes", () => {
    assert.equal(
      verifyRazorpaySignature({ orderId: ORDER, paymentId: PAYMENT, signature: sign(ORDER, PAYMENT) }),
      true,
    );
  });
});

describe("anything else is refused", () => {
  const good = sign(ORDER, PAYMENT);

  for (const [label, args] of [
    ["one character changed", { orderId: ORDER, paymentId: PAYMENT, signature: good.slice(0, -1) + (good.endsWith("a") ? "b" : "a") }],
    ["truncated", { orderId: ORDER, paymentId: PAYMENT, signature: good.slice(0, 32) }],
    ["empty", { orderId: ORDER, paymentId: PAYMENT, signature: "" }],
    ["signed with a different secret", { orderId: ORDER, paymentId: PAYMENT, signature: sign(ORDER, PAYMENT, "wrong") }],
    ["a signature for a DIFFERENT order", { orderId: "order_OTHER", paymentId: PAYMENT, signature: good }],
    ["a signature for a DIFFERENT payment", { orderId: ORDER, paymentId: "pay_OTHER", signature: good }],
    ["missing orderId", { paymentId: PAYMENT, signature: good }],
    ["missing paymentId", { orderId: ORDER, signature: good }],
    ["missing signature", { orderId: ORDER, paymentId: PAYMENT }],
    ["no arguments at all", undefined],
  ]) {
    test(`refuses: ${label}`, () => {
      assert.equal(verifyRazorpaySignature(args), false);
    });
  }

  test("a non-string signature is refused, not thrown", () => {
    // timingSafeEqual throws on mismatched buffer lengths; a crash here would be a 500 on a route
    // that should simply answer "invalid".
    for (const weird of [{}, [], 42, null, true]) {
      assert.equal(verifyRazorpaySignature({ orderId: ORDER, paymentId: PAYMENT, signature: weird }), false);
    }
  });
});

describe("it fails closed", () => {
  test("no secret configured means nothing verifies", () => {
    const saved = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_SECRET;
    try {
      // Must NOT accept, and must not throw: an unconfigured server has to reject payments, not
      // crash on them and not wave them through.
      assert.equal(
        verifyRazorpaySignature({ orderId: ORDER, paymentId: PAYMENT, signature: sign(ORDER, PAYMENT) }),
        false,
      );
    } finally {
      process.env.RAZORPAY_KEY_SECRET = saved;
    }
  });

  test("the secret is read at call time, not at import", () => {
    // dotenv.config() runs inside server.js's body, after every import has been evaluated. A
    // module-level read would capture undefined and reject every real payment.
    const saved = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_SECRET = "rotated_secret";
    try {
      assert.equal(
        verifyRazorpaySignature({ orderId: ORDER, paymentId: PAYMENT, signature: sign(ORDER, PAYMENT, "rotated_secret") }),
        true,
        "a secret set after import must be picked up",
      );
    } finally {
      process.env.RAZORPAY_KEY_SECRET = saved;
    }
  });
});

describe("every controller uses the shared verifier", () => {
  test("no inline Razorpay HMAC survives", async () => {
    // Six copies had already drifted in their error messages. A seventh would drift again, and
    // nothing would fail loudly if it were written without the constant-time compare.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(import.meta.dirname, "..", "controllers");
    const offenders = [];
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js") && !f.includes(".test."))) {
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      if (src.includes('createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)')) offenders.push(file);
    }
    assert.deepEqual(offenders, [], `these still verify inline: ${offenders.join(", ")}`);
  });
});
