import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { serializeTransaction } from "./transactionController.js";

describe("owner transaction projection", () => {
  test("keeps ledger display fields and withholds gateway, bank, balance, admin, and metadata internals", () => {
    const row = serializeTransaction({
      _id: "t1",
      type: "withdrawal",
      amount: -500,
      currency: "USD",
      status: "pending",
      description: "Withdrawal",
      reference: "WD-1",
      paymentMethod: "bank_transfer",
      relatedScript: { _id: "s1", title: "A Script" },
      createdAt: new Date("2026-08-22T00:00:00Z"),
      bankTransferDetails: { accountNumber: "12345678", routingNumber: "HDFC0001234" },
      stripePaymentId: "secret-provider-id",
      metadata: { razorpay_payment_id: "pay_secret" },
      balanceBefore: 1000,
      balanceAfter: 500,
      processedBy: "admin-id",
      notes: "internal",
    });

    assert.equal(row.description, "Withdrawal");
    assert.equal(row.reference, "WD-1");
    assert.equal(row.currency, "USD");
    for (const key of ["bankTransferDetails", "stripePaymentId", "metadata", "balanceBefore", "balanceAfter", "processedBy", "notes"]) {
      assert.equal(Object.hasOwn(row, key), false, key);
    }
  });
});
