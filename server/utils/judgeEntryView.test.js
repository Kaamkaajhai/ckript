import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { JUDGE_ENTRY_FIELDS, JUDGEABLE_STATUSES, toJudgeEntryView } from "./judgeEntryView.js";

/**
 * Blind judging is a claim about what a judge CANNOT see, and a claim like that is only worth the
 * test behind it. So the fixture below is deliberately hostile: every identifying field a
 * CompetitionEntry can carry is populated with a string that would be unmistakable in the output.
 * The assertions then search the SERIALISED view for those strings, rather than checking the fields
 * we happened to remember — a field added to the model tomorrow is caught by the exact-key-set test
 * whether or not anyone updates this file.
 */
const identifying = {
  name: "Priya Raghunathan",
  email: "priya.raghunathan@example.com",
  phone: "+91 98765 43210",
  portfolio: "https://priya-writes.example.com",
  city: "Kochi",
  orderId: "order_LEAKED_ORDER",
  paymentId: "pay_LEAKED_PAYMENT",
  reference: "EXT-LEAKED-REF",
  note: "Admin private note about this writer",
};

const fullyPopulatedEntry = () => ({
  _id: "entry-abc123",
  eventId: "CGSC-4F2A9B11",
  // The single identity link on the entry, populated the way a careless .populate() would leave it.
  userId: {
    _id: "user-999",
    name: identifying.name,
    email: identifying.email,
    phone: identifying.phone,
    role: "creator",
  },
  scriptId: { _id: "script-777", creator: "user-999", title: "The Last Monsoon" },
  competitionId: "comp-1",
  status: "submitted",
  createdAt: "2026-08-01T00:00:00.000Z",
  submittedAt: "2026-08-03T09:41:00.000Z",
  registration: {
    country: "India",
    city: identifying.city,
    language: "Malayalam",
    experienceLevel: "emerging",
    portfolioUrl: identifying.portfolio,
    phone: identifying.phone,
  },
  payment: { orderId: identifying.orderId, paymentId: identifying.paymentId, amount: 499 },
  externalRegistration: { reference: identifying.reference, verifiedBy: "admin-1" },
  ai: { processedAt: "2026-08-04T00:00:00.000Z", evaluation: { overall: 87, notes: "AI says strong" } },
  result: { award: "runnerUp", rank: 2, note: identifying.note },
  rewardsGranted: [{ type: "badge_special", at: "2026-08-05T00:00:00.000Z" }],
  snapshot: {
    title: "The Last Monsoon",
    // Writer-authored free text. Excluded precisely BECAUSE a writer can sign it.
    logline: "A drowned village resurfaces. Written by " + identifying.name + ".",
    synopsis: "Contact me at " + identifying.email + " for the full draft.",
    fountainContent: "INT. FERRY JETTY - DAWN\n\nRain hammers the tin roof.",
    textContent: "INT. FERRY JETTY - DAWN",
    pageCount: 12,
    wordCount: 2780,
    sceneCount: 9,
    charCount: 15400,
  },
});

describe("judge entry view — the anonymisation boundary", () => {
  test("exposes exactly the documented field set, and nothing else", () => {
    const view = toJudgeEntryView(fullyPopulatedEntry());

    // Exact equality, not a subset check. A field ADDED here later fails this test, which is the
    // difference between "we looked for a leak" and "a leak cannot be introduced quietly".
    assert.deepEqual(Object.keys(view).sort(), [...JUDGE_ENTRY_FIELDS].sort());
  });

  test("carries no trace of the writer, their payment, or their registration answers", () => {
    const serialised = JSON.stringify(toJudgeEntryView(fullyPopulatedEntry()));

    for (const [label, value] of Object.entries(identifying)) {
      assert.equal(
        serialised.includes(value),
        false,
        `judge view leaked ${label} (${value}) — every judge-facing response goes through this function`
      );
    }
  });

  test("drops a populated userId rather than carrying the object through", () => {
    const view = toJudgeEntryView(fullyPopulatedEntry());

    assert.equal("userId" in view, false);
    assert.equal("scriptId" in view, false);
    assert.equal(JSON.stringify(view).includes("user-999"), false);
  });

  test("withholds the AI evaluation, so it cannot anchor the judge's own score", () => {
    const serialised = JSON.stringify(toJudgeEntryView(fullyPopulatedEntry()));

    assert.equal(serialised.includes("AI says strong"), false);
    assert.equal(serialised.includes("evaluation"), false);
  });

  test("withholds the declared result, so a judge cannot see the outcome they are scoring toward", () => {
    const view = toJudgeEntryView(fullyPopulatedEntry());

    assert.equal("result" in view, false);
    assert.equal("rewardsGranted" in view, false);
  });

  test("withholds logline and synopsis, which are writer-authored free text", () => {
    const view = toJudgeEntryView(fullyPopulatedEntry());

    assert.equal("logline" in view, false);
    assert.equal("synopsis" in view, false);
  });

  test("withholds submission timing, which maps back to the registration order", () => {
    const view = toJudgeEntryView(fullyPopulatedEntry());

    assert.equal("submittedAt" in view, false);
    assert.equal("createdAt" in view, false);
  });

  test("keeps the entry code, title and counts a judge actually needs", () => {
    const view = toJudgeEntryView(fullyPopulatedEntry());

    assert.equal(view.eventId, "CGSC-4F2A9B11");
    assert.equal(view.title, "The Last Monsoon");
    assert.equal(view.pageCount, 12);
    assert.equal(view.wordCount, 2780);
    assert.equal(view.sceneCount, 9);
    assert.match(view.body, /FERRY JETTY/);
  });
});

describe("judge entry view — typed-in title pages", () => {
  test("strips a Fountain title page the writer typed into the body", () => {
    const entry = fullyPopulatedEntry();
    entry.snapshot.fountainContent = [
      "Title: The Last Monsoon",
      "Credit: Written by",
      "Author: " + identifying.name,
      "Draft date: 12/08/2026",
      "",
      "INT. FERRY JETTY - DAWN",
      "",
      "Rain hammers the tin roof.",
    ].join("\n");

    const view = toJudgeEntryView(entry);

    assert.equal(view.body.includes(identifying.name), false, "author line survived into the judge's copy");
    assert.equal(view.body.includes("Draft date"), false);
    assert.match(view.body, /^INT\. FERRY JETTY - DAWN/);
  });

  test("leaves a script that has no title page completely intact", () => {
    // The regression that matters in the other direction: over-stripping would silently delete the
    // opening scene, and the judge would score a script missing its first page without ever knowing.
    const entry = fullyPopulatedEntry();
    entry.snapshot.fountainContent = "FADE IN:\n\nINT. FERRY JETTY - DAWN\n\nRain hammers the tin roof.";

    const view = toJudgeEntryView(entry);

    assert.equal(view.body, "FADE IN:\n\nINT. FERRY JETTY - DAWN\n\nRain hammers the tin roof.");
  });

  test("strips the title page from textContent too, when that is the copy being served", () => {
    // Older entries were frozen before the editor stored fountain. Whichever field wins the fallback
    // is the one the judge reads, so both have to be scrubbed.
    const entry = fullyPopulatedEntry();
    entry.snapshot.fountainContent = "";
    entry.snapshot.textContent =
      "Title: The Last Monsoon\nAuthor: " + identifying.name + "\n\nINT. FERRY JETTY - DAWN";

    const view = toJudgeEntryView(entry);

    assert.equal(view.body.includes(identifying.name), false);
    assert.match(view.body, /INT\. FERRY JETTY/);
  });
});

describe("judge entry view — defensive shapes", () => {
  test("survives an empty or partial entry without throwing", () => {
    assert.deepEqual(Object.keys(toJudgeEntryView()).sort(), [...JUDGE_ENTRY_FIELDS].sort());
    assert.deepEqual(Object.keys(toJudgeEntryView({})).sort(), [...JUDGE_ENTRY_FIELDS].sort());

    const bare = toJudgeEntryView({ _id: "x" });
    assert.equal(bare.title, "");
    assert.equal(bare.body, "");
    assert.equal(bare.pageCount, 0);
  });

  test("coerces junk counts to 0 rather than passing NaN to the client", () => {
    const view = toJudgeEntryView({ snapshot: { pageCount: "twelve", wordCount: -5, sceneCount: null } });

    assert.equal(view.pageCount, 0);
    assert.equal(view.wordCount, 0);
    assert.equal(view.sceneCount, 0);
  });

  test("never treats a draft as judgeable", () => {
    assert.equal(JUDGEABLE_STATUSES.includes("draft"), false);
    assert.equal(JUDGEABLE_STATUSES.includes("registered"), false);
    assert.deepEqual([...JUDGEABLE_STATUSES], ["submitted", "ai_processed", "judged"]);
  });
});
