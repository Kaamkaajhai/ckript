// The ledger's two load-bearing guarantees: it is append-only, and a grant is never counted as
// revenue. Both are properties the finance panel's numbers rest on.
//
// These exercise the real schema (validation, defaults, the immutability hooks) without a database:
// Mongoose validates and runs pre-hooks in-process, so no connection is required.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import LedgerEntry from "../models/LedgerEntry.js";

const base = {
  kind: "plan_subscription",
  settlement: "paid",
  user: "507f1f77bcf86cd799439011",
  amountMinor: 199900,
  currency: "INR",
};

describe("an entry records what actually happened", () => {
  test("a valid payment passes validation", () => {
    assert.equal(new LedgerEntry(base).validateSync(), undefined);
  });

  test("amounts are integer minor units, never a float of rupees", () => {
    // ₹1,999 must be 199900, not 1999.00 — floats do not survive being summed.
    const e = new LedgerEntry(base);
    assert.equal(e.amountMinor, 199900);
    assert.equal(Number.isInteger(e.amountMinor), true);
  });

  test("an unknown kind is rejected rather than silently stored", () => {
    const e = new LedgerEntry({ ...base, kind: "mystery_income" });
    assert.ok(e.validateSync()?.errors?.kind, "kind must be enum-checked");
  });

  test("an unknown settlement is rejected", () => {
    const e = new LedgerEntry({ ...base, settlement: "maybe" });
    assert.ok(e.validateSync()?.errors?.settlement);
  });

  test("currency is normalised to upper case so INR and inr never split a total", () => {
    assert.equal(new LedgerEntry({ ...base, currency: "inr" }).currency, "INR");
  });

  test("an entry with no user is refused — every figure must be attributable", () => {
    const { user, ...noUser } = base;
    assert.ok(new LedgerEntry(noUser).validateSync()?.errors?.user);
  });
});

describe("a grant is recorded, but is not revenue", () => {
  const grant = {
    kind: "plan_subscription",
    settlement: "granted",
    user: "507f1f77bcf86cd799439011",
    amountMinor: 0,
    listPriceMinor: 199900,
  };

  test("carries zero amount and the price foregone", () => {
    const e = new LedgerEntry(grant);
    assert.equal(e.validateSync(), undefined);
    assert.equal(e.amountMinor, 0, "a comp must never add to revenue");
    assert.equal(e.listPriceMinor, 199900, "but what it was worth must still be visible");
  });

  test("defaults to no payment provider", () => {
    // Free access has no Razorpay id, which is also why the unique index on it must stay sparse.
    assert.equal(new LedgerEntry(grant).provider, "none");
    assert.equal(new LedgerEntry(grant).providerPaymentId, undefined);
  });
});

describe("append-only", () => {
  // Without these the ledger is only append-only by convention, and the first updateOne written in a
  // hurry silently breaks every historical total.
  test("updateOne is refused", async () => {
    await assert.rejects(
      LedgerEntry.updateOne({ _id: "507f1f77bcf86cd799439011" }, { $set: { amountMinor: 1 } }),
      /append-only/,
    );
  });

  test("findOneAndUpdate is refused", async () => {
    await assert.rejects(
      LedgerEntry.findOneAndUpdate({}, { $set: { amountMinor: 1 } }),
      /append-only/,
    );
  });

  test("updateMany is refused", async () => {
    await assert.rejects(LedgerEntry.updateMany({}, { $set: { amountMinor: 1 } }), /append-only/);
  });

  test("deleteOne is refused", async () => {
    await assert.rejects(LedgerEntry.deleteOne({ _id: "507f1f77bcf86cd799439011" }), /append-only/);
  });

  test("deleteMany is refused", async () => {
    await assert.rejects(LedgerEntry.deleteMany({}), /append-only/);
  });

  test("re-saving an existing document is refused", async () => {
    const e = new LedgerEntry(base);
    e.isNew = false;                       // as it would be after a findById
    await assert.rejects(e.save(), /append-only/);
  });

  test("the refusal explains the correct alternative", async () => {
    await assert.rejects(
      LedgerEntry.deleteMany({}),
      (err) => /reversed/.test(err.message) && /reversalOf/.test(err.message),
    );
  });
});

describe("a reversal is a new entry, not an edit", () => {
  test("carries a negative amount and points at the original", () => {
    const e = new LedgerEntry({
      ...base,
      settlement: "reversed",
      amountMinor: -199900,
      reversalOf: "507f1f77bcf86cd799439099",
    });
    assert.equal(e.validateSync(), undefined);
    assert.ok(e.amountMinor < 0, "so that summing paid + reversed yields the net");
    assert.ok(e.reversalOf, "the original must remain findable");
  });
});
