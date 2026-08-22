import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPETITION_ENTRY_SUMMARY_FIELDS,
  competitionEntrySummary,
} from "./competitionEntrySummary.js";

describe("competition entry hub summary", () => {
  test("keeps only the status fields the owner list renders", () => {
    const summary = competitionEntrySummary({
      _id: "entry-1",
      eventId: "CGSC-1234",
      status: "judged",
      createdAt: "2026-08-01T00:00:00.000Z",
      submittedAt: "2026-08-03T00:00:00.000Z",
      registration: { country: "India", portfolioUrl: "https://private.example" },
      payment: { orderId: "order-secret", paymentId: "payment-secret" },
      scriptId: "script-private",
      snapshot: {
        title: "The Last Monsoon",
        pageCount: 12,
        wordCount: 2780,
        fountainContent: "INT. A COMPLETE SCREENPLAY",
        textContent: "A COMPLETE SCREENPLAY",
        synopsis: "Private synopsis",
      },
      ai: { processedAt: "2026-08-04T00:00:00.000Z", evaluation: { score: 99 }, error: "private" },
      result: { award: "special", specialTitle: "Best Dialogue", note: "Private judge note" },
      rewardsGranted: [{ type: "badge_special", at: "2026-08-05T00:00:00.000Z" }],
      externalRegistration: { reference: "external-secret", verifiedBy: "admin-1" },
    });

    assert.deepEqual(summary, {
      _id: "entry-1",
      eventId: "CGSC-1234",
      status: "judged",
      createdAt: "2026-08-01T00:00:00.000Z",
      submittedAt: "2026-08-03T00:00:00.000Z",
      snapshot: { title: "The Last Monsoon", pageCount: 12, wordCount: 2780 },
      ai: { processedAt: "2026-08-04T00:00:00.000Z" },
      result: { award: "special", specialTitle: "Best Dialogue" },
      rewardsGranted: [{ type: "badge_special" }],
    });
    assert.equal(JSON.stringify(summary).includes("order-secret"), false);
    assert.equal(JSON.stringify(summary).includes("SCREENPLAY"), false);
    assert.equal(JSON.stringify(summary).includes("judge note"), false);
  });

  test("the database projection excludes heavyweight and sensitive paths", () => {
    for (const forbidden of [
      "snapshot.fountainContent",
      "snapshot.textContent",
      "snapshot.synopsis",
      "registration",
      "payment",
      "externalRegistration",
      "scriptId",
      "ai.evaluation",
      "ai.error",
      "result.note",
    ]) {
      assert.equal(COMPETITION_ENTRY_SUMMARY_FIELDS.includes(forbidden), false, forbidden);
    }
  });
});
