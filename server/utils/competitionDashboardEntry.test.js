import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  COMPETITION_DASHBOARD_ENTRY_FIELDS,
  competitionDashboardEntry,
} from "./competitionDashboardEntry.js";

const controllerSource = fs.readFileSync(new URL("../controllers/competitionController.js", import.meta.url), "utf8");

describe("competition participant dashboard entry", () => {
  test("keeps operational status, story materials, result, and reward fields only", () => {
    const shaped = competitionDashboardEntry({
      _id: "entry-1",
      eventId: "CGSC-1234",
      scriptId: "script-1",
      status: "judged",
      createdAt: "2026-08-01T00:00:00.000Z",
      submittedAt: "2026-08-03T00:00:00.000Z",
      registration: { country: "India" },
      payment: { orderId: "order-secret", paymentId: "payment-secret" },
      snapshot: {
        title: "The Last Monsoon",
        wordCount: 2780,
        charCount: 16400,
        pageCount: 12,
        sceneCount: 18,
        fountainContent: "INT. A COMPLETE SCREENPLAY",
        textContent: "A COMPLETE SCREENPLAY",
      },
      ai: {
        logline: "A writer races a monsoon.",
        synopsis: "The visible participant synopsis.",
        evaluation: { overall: 88, feedback: "Visible feedback" },
        processedAt: "2026-08-04T00:00:00.000Z",
        error: "internal upstream failure",
      },
      result: { award: "special", specialTitle: "Best Dialogue", note: "Private judge note" },
      rewardsGranted: [{ type: "badge_special", at: "2026-08-05T00:00:00.000Z", internal: "secret" }],
      externalRegistration: { reference: "external-secret" },
    });

    assert.deepEqual(shaped, {
      _id: "entry-1",
      eventId: "CGSC-1234",
      scriptId: "script-1",
      status: "judged",
      createdAt: "2026-08-01T00:00:00.000Z",
      submittedAt: "2026-08-03T00:00:00.000Z",
      snapshot: { title: "The Last Monsoon", wordCount: 2780, charCount: 16400, pageCount: 12, sceneCount: 18 },
      ai: {
        logline: "A writer races a monsoon.",
        synopsis: "The visible participant synopsis.",
        evaluation: { overall: 88, feedback: "Visible feedback" },
        processedAt: "2026-08-04T00:00:00.000Z",
      },
      result: { award: "special", specialTitle: "Best Dialogue" },
      rewardsGranted: [{ type: "badge_special", at: "2026-08-05T00:00:00.000Z" }],
    });
    const json = JSON.stringify(shaped);
    for (const privateValue of ["order-secret", "SCREENPLAY", "upstream failure", "judge note", "external-secret"]) {
      assert.equal(json.includes(privateValue), false, privateValue);
    }
  });

  test("the database projection excludes bodies, registration, payment, and internal review fields", () => {
    for (const forbidden of [
      "snapshot.fountainContent",
      "snapshot.textContent",
      "registration",
      "payment",
      "externalRegistration",
      "ai.error",
      "result.note",
    ]) assert.equal(COMPETITION_DASHBOARD_ENTRY_FIELDS.includes(forbidden), false, forbidden);
  });

  test("the dashboard view applies both its projection and shaper", () => {
    const source = controllerSource.slice(
      controllerSource.indexOf("export const getMyEntry ="),
      controllerSource.indexOf("export const openCompetitionEditor ="),
    );
    assert.match(source, /req\.query\.view === ["']dashboard["']/);
    assert.match(source, /entryQuery\.select\(COMPETITION_DASHBOARD_ENTRY_FIELDS\)/);
    assert.match(source, /dashboardView[\s\S]*competitionDashboardEntry\(entry\)/);
  });
});
