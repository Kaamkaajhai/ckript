import { describe, test } from "node:test";
import assert from "node:assert/strict";
import CompetitionRegistrationIntent from "../models/CompetitionRegistrationIntent.js";
import {
  COMPETITION_REGISTRATION_MODE,
  competitionRegistrationCharge,
  competitionRegistrationMode,
  normalizeCompetitionRegistration,
  registrationOrderStanding,
} from "./competitionRegistration.js";

const knownCountry = (value) => value === "India";
const valid = {
  country: "India",
  language: "Hindi",
  genres: ["Drama", "Thriller"],
  experienceLevel: "Intermediate",
  portfolioUrl: "https://example.com/work",
  acceptRules: true,
  acceptCopyright: true,
};

describe("competition registration policy", () => {
  test("existing competitions remain paid and free entry must be explicit", () => {
    assert.equal(competitionRegistrationMode({}), COMPETITION_REGISTRATION_MODE.PAID);
    assert.equal(competitionRegistrationMode({ entryFee: { mode: "paid" } }), "paid");
    assert.equal(competitionRegistrationMode({ entryFee: { mode: "free" } }), "free");
  });

  test("uses configured minor-unit fees with the shipped values as fallback", () => {
    assert.deepEqual(competitionRegistrationCharge({}, "INR"), { currency: "INR", amountMinor: 9800, amountMajor: 98 });
    assert.deepEqual(competitionRegistrationCharge({}, "USD"), { currency: "USD", amountMinor: 200, amountMajor: 2 });
    assert.equal(competitionRegistrationCharge({ entryFee: { inrMinor: 12500 } }, "INR").amountMajor, 125);
  });
});

describe("one registration answer contract", () => {
  test("normalizes the payload used by free, paid and external entry paths", () => {
    const result = normalizeCompetitionRegistration(valid, { isKnownCountry: knownCountry });
    assert.equal(result.ok, true);
    assert.equal(result.registration.experienceLevel, "intermediate");
    assert.deepEqual(result.registration.genres, ["Drama", "Thriller"]);
  });

  for (const [name, patch, message] of [
    ["country", { country: "Atlantis" }, /country/],
    ["language", { language: "" }, /language/],
    ["genres", { genres: [] }, /genres/],
    ["experience", { experienceLevel: "expert" }, /experience/],
    ["portfolio", { portfolioUrl: "example.com" }, /http/],
    ["rules", { acceptRules: false }, /rules/],
    ["copyright", { acceptCopyright: false }, /copyright/],
  ]) {
    test(`rejects invalid ${name}`, () => {
      const result = normalizeCompetitionRegistration({ ...valid, ...patch }, { isKnownCountry: knownCountry });
      assert.equal(result.ok, false);
      assert.match(result.message, message);
    });
  }
});

describe("server-authoritative paid order standing", () => {
  const intent = { orderId: "order_1", currency: "INR", amountMinor: 9800 };
  const order = {
    id: "order_1",
    amount: 9800,
    amount_paid: 9800,
    currency: "INR",
    status: "paid",
    notes: { purpose: "competition_registration", competitionId: "comp", userId: "user" },
  };

  test("accepts only the persisted order after exact capture", () => {
    assert.deepEqual(
      registrationOrderStanding({ order, intent, competitionId: "comp", userId: "user" }),
      { ok: true, currency: "INR", amountMinor: 9800, amountMajor: 98 },
    );
  });

  for (const [name, changed] of [
    ["different order", { id: "order_2" }],
    ["different user", { notes: { ...order.notes, userId: "other" } }],
    ["underpayment", { amount_paid: 1 }],
    ["wrong order amount", { amount: 1 }],
    ["uncaptured order", { status: "attempted", amount_paid: 0 }],
  ]) {
    test(`rejects a ${name}`, () => {
      assert.equal(registrationOrderStanding({ order: { ...order, ...changed }, intent, competitionId: "comp", userId: "user" }).ok, false);
    });
  }

  test("stores one intent per writer and competition without making missing order ids collide", () => {
    const indexes = CompetitionRegistrationIntent.schema.indexes();
    const compound = indexes
      .find(([fields]) => fields.competition === 1 && fields.user === 1);
    assert.equal(compound?.[1]?.unique, true);
    assert.equal(CompetitionRegistrationIntent.schema.path("orderId").defaultValue, undefined);
    assert.equal(indexes.filter(([fields]) => fields.orderId === 1).length, 1);
  });
});
