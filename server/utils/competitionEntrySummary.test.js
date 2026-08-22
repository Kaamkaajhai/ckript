import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  COMPETITION_ENTRY_SUMMARY_FIELDS,
  competitionEntrySummary,
} from "./competitionEntrySummary.js";

const controllerSource = fs.readFileSync(new URL("../controllers/competitionController.js", import.meta.url), "utf8");

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

  test("both owner list and detail summary reads apply the projection and shaper", () => {
    const getMyEntry = controllerSource.slice(
      controllerSource.indexOf("export const getMyEntry ="),
      controllerSource.indexOf("export const openCompetitionEditor ="),
    );
    assert.match(getMyEntry, /req\.query\.view === ["']summary["']/);
    assert.match(getMyEntry, /entryQuery\.select\(COMPETITION_ENTRY_SUMMARY_FIELDS\)/);
    assert.match(getMyEntry, /summaryView \? competitionEntrySummary\(entry\) : entry/);
    assert.match(getMyEntry, /if \(!summaryView\)[\s\S]*getReferralProgress/);

    const getMine = controllerSource.slice(
      controllerSource.indexOf("export const getMyCompetitions ="),
    );
    assert.match(getMine, /\.select\(COMPETITION_ENTRY_SUMMARY_FIELDS\)/);
    assert.match(getMine, /entry: competitionEntrySummary\(entry\)/);
  });

  test("the public detail response derives participation instead of reading a nonexistent schema field", () => {
    const getActive = controllerSource.slice(
      controllerSource.indexOf("export const getActiveCompetition ="),
      controllerSource.indexOf("export const registerForCompetition ="),
    );
    assert.match(getActive, /const stats = await buildCompetitionStats\(competition\._id\)/);
    assert.match(getActive, /competition: \{ \.\.\.publicCompetition\(competition, phase\), \.\.\.stats \}/);
  });
});
