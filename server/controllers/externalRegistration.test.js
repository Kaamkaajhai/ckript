// The rules of the "I already registered elsewhere" route.
//
// This is the only way into a paid challenge that proves nothing: the entrant paid Luma or
// BookMyShow, so there is no signature to check and a human decides. That makes the guarantees here
// unusual, and worth pinning:
//
//   • Approval creates an entry with NO payment, and must record the foregone fee in the ledger —
//     an entry that appeared with neither money nor a record against it is the exact hole the ledger
//     exists to close.
//   • Rejection must carry a reason, because the entrant can try again and needs to know what to fix.
//   • Resubmission must not create a second row, or the queue fills with duplicates of one person.
//
// No database: the schema validates in-process, and the handler contracts are read from the source.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExternalRegistration from "../models/ExternalRegistration.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import {
  EXTERNAL_EVENT_PROVIDERS,
  PROVIDER_SLUGS,
  providerName,
  isKnownProvider,
} from "../utils/externalEventProviders.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "externalRegistrationController.js"), "utf8");

const handler = (name) => {
  const start = source.indexOf(`export const ${name} = `);
  assert.notEqual(start, -1, `${name} is not exported any more — update this test`);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
};

const validClaim = {
  competition: "507f1f77bcf86cd799439011",
  user: "507f1f77bcf86cd799439012",
  provider: "luma",
  fullName: "Aditi Rao",
  phone: "+91 98765 43210",
  externalRef: "EVT-8841XY",
  // Required: the one-ticket rule compares this, not the raw string, so a claim without it would
  // silently sit outside the guard.
  externalRefKey: "evt8841xy",
  registration: {
    country: "India",
    language: "Hindi",
    genres: ["Drama"],
    experienceLevel: "intermediate",
  },
  acceptedRulesAt: new Date(),
  acceptedCopyrightAt: new Date(),
};

describe("the platform list is the contract between client and server", () => {
  test("every platform the user asked for is present", () => {
    // Named explicitly: a silent drop here means an entrant who paid on that platform cannot say so.
    for (const slug of [
      "luma", "allevents", "eventbrite", "unstop", "meraevents",
      "townscript", "bookmyshow", "district", "filmfreeway",
    ]) {
      assert.ok(PROVIDER_SLUGS.includes(slug), `${slug} is missing from the provider list`);
    }
    assert.equal(PROVIDER_SLUGS.length, 9);
  });

  test("slugs are unique and every entry has the fields the form renders", () => {
    assert.equal(new Set(PROVIDER_SLUGS).size, PROVIDER_SLUGS.length);
    for (const p of EXTERNAL_EVENT_PROVIDERS) {
      assert.ok(p.name, `${p.slug} has no name`);
      // Each platform calls its identifier something else; a generic label gets a blank field.
      assert.ok(p.refLabel, `${p.slug} has no reference label`);
    }
  });

  test("an unknown platform is refused rather than stored", () => {
    assert.equal(isKnownProvider("luma"), true);
    assert.equal(isKnownProvider("definitely-not-a-platform"), false);
    assert.equal(isKnownProvider(""), false);
    assert.equal(isKnownProvider(undefined), false);
  });

  test("providerName never renders undefined into an email", () => {
    assert.equal(providerName("bookmyshow"), "BookMyShow");
    assert.equal(providerName("nonsense"), "nonsense");
    assert.equal(providerName(undefined), "a third-party platform");
  });
});

describe("the claim document", () => {
  test("a complete claim validates", () => {
    assert.equal(new ExternalRegistration(validClaim).validateSync(), undefined);
  });

  test("it starts pending on its first attempt", () => {
    const doc = new ExternalRegistration(validClaim);
    assert.equal(doc.status, "pending");
    assert.equal(doc.attempt, 1);
    assert.deepEqual(doc.history, []);
    assert.equal(doc.entry, null);
  });

  for (const field of ["provider", "fullName", "phone", "externalRef"]) {
    test(`${field} is required — a reviewer cannot decide without it`, () => {
      const doc = new ExternalRegistration({ ...validClaim, [field]: undefined });
      assert.ok(doc.validateSync()?.errors?.[field], `${field} was accepted as empty`);
    });
  }

  test("a platform outside the enum is rejected", () => {
    const doc = new ExternalRegistration({ ...validClaim, provider: "craigslist" });
    assert.ok(doc.validateSync()?.errors?.provider);
  });

  test("the registration answers ride along, so approval needs nothing further from the entrant", () => {
    const doc = new ExternalRegistration(validClaim);
    assert.equal(doc.registration.country, "India");
    assert.equal(doc.registration.experienceLevel, "intermediate");
    assert.ok(doc.acceptedRulesAt instanceof Date);
  });

  test("the screenshot is optional", () => {
    const doc = new ExternalRegistration(validClaim);
    assert.equal(doc.validateSync(), undefined);
    assert.equal(doc.screenshotUrl, "");
  });

  test("one claim per person per competition", () => {
    // The unique index is what stops the queue filling with duplicates of one entrant retrying.
    const index = ExternalRegistration.schema.indexes()
      .find(([fields]) => fields.competition === 1 && fields.user === 1);
    assert.ok(index, "no (competition, user) index");
    assert.equal(index[1].unique, true, "the (competition, user) index is not unique");
  });
});

describe("an entry granted this way stays distinguishable from a paid one", () => {
  test("CompetitionEntry records who verified it and against what", () => {
    const entry = new CompetitionEntry({
      competitionId: "507f1f77bcf86cd799439011",
      userId: "507f1f77bcf86cd799439012",
      registration: validClaim.registration,
      acceptedRulesAt: new Date(),
      acceptedCopyrightAt: new Date(),
      externalRegistration: {
        provider: "luma",
        reference: "evt-8841XY",
        verifiedBy: "507f1f77bcf86cd799439013",
        verifiedAt: new Date(),
      },
    });
    assert.equal(entry.validateSync(), undefined);
    assert.equal(entry.externalRegistration.provider, "luma");
    // `payment` means "money Ckript received". A granted entry must leave it empty, or every revenue
    // report that reads it silently counts a sale that never happened.
    assert.equal(entry.payment.amount, 0);
    assert.equal(entry.payment.paidAt, null);
    assert.equal(entry.payment.currency, "");
  });
});

describe("the handler contracts", () => {
  test("approval records the foregone fee in the ledger", () => {
    const body = handler("approveExternalRegistration");
    assert.match(body, /recordGrant\(/, "an entry is granted with no ledger record of the lost fee");
    assert.match(body, /kind: "competition_registration"/);
    assert.match(body, /listPriceMinor: REGISTRATION_FEE_MINOR\.INR/);
  });

  test("approval creates the entry with no payment attached", () => {
    const body = handler("approveExternalRegistration");
    assert.match(body, /payment: \{ amount: 0, currency: "", paidAt: null \}/);
  });

  test("approval is idempotent — it never creates a second entry", () => {
    const body = handler("approveExternalRegistration");
    assert.match(body, /if \(request\.status === "approved"\)/, "a second approval is not refused");
    assert.match(body, /const existingEntry = await CompetitionEntry\.findOne/);
  });

  test("no invoice is issued for money Ckript never took", () => {
    const body = handler("approveExternalRegistration");
    assert.doesNotMatch(body, /issueInvoice\(/, "a Ckript invoice for a third-party payment is a false document");
  });

  test("rejection requires a reason", () => {
    const body = handler("rejectExternalRegistration");
    assert.match(body, /if \(!note\)/, "a rejection can be sent with no explanation");
    assert.match(body, /status\(400\)/);
  });

  test("both decisions email the entrant", () => {
    for (const name of ["approveExternalRegistration", "rejectExternalRegistration"]) {
      assert.match(handler(name), /sendExternalRegistrationDecisionEmail\(/, `${name} decides silently`);
    }
  });

  test("resubmission edits the existing claim and keeps the rejection history", () => {
    const body = handler("submitExternalRegistration");
    assert.match(body, /existing\.history\.push\(/, "the previous verdict is lost on resubmit");
    assert.match(body, /existing\.attempt \+= 1/, "attempts are not counted");
  });

  test("a pending claim cannot be resubmitted over", () => {
    const body = handler("submitExternalRegistration");
    assert.match(body, /existing\.status === "pending"/);
  });

  test("someone already registered is turned away before anything is written", () => {
    const body = handler("submitExternalRegistration");
    const entryCheck = body.indexOf("CompetitionEntry.findOne");
    const write = body.indexOf("ExternalRegistration.create");
    assert.ok(entryCheck > -1 && (write === -1 || entryCheck < write),
      "the existing-entry check does not precede the write");
  });

  test("the admin search escapes its input", () => {
    // An unescaped user string in a $regex is both an injection and a ReDoS.
    const body = handler("listExternalRegistrations");
    assert.match(body, /replace\(\/\[\.\*\+\?\^\$\{\}\(\)\|\[\\\]\\\\\]\/g/, "search input reaches RegExp unescaped");
  });
});

describe("one third-party ticket cannot admit two people", () => {
  // The abuse this flow is most exposed to: a single ₹98 Luma ticket posted to a group chat and
  // claimed by twenty accounts. Each claim looks perfectly ordinary on its own, so the guard has to
  // be in the code — a reviewer cannot hold every reference they have ever approved in their head.
  test("approval refuses a reference already approved for someone else", () => {
    const body = handler("approveExternalRegistration");
    assert.match(body, /const duplicate = await ExternalRegistration\.findOne\(/, "no duplicate check");
    assert.match(body, /status: "approved"/, "the duplicate check does not look at approved claims");
    assert.match(body, /_id: \{ \$ne: request\._id \}/, "the claim would match itself");
    assert.match(body, /status\(409\)/, "a clash is not refused");
  });

  test("the clash is keyed on competition AND provider AND reference", () => {
    // Not the reference alone: booking IDs are only unique within a platform, and the same person
    // legitimately holds different references for different challenges.
    const body = handler("approveExternalRegistration");
    const check = body.slice(body.indexOf("const duplicate ="), body.indexOf("}).populate"));
    for (const field of ["competition", "provider", "externalRef"]) {
      assert.ok(check.includes(field), `the duplicate check ignores ${field}`);
    }
  });

  test("the queue tells the reviewer before they click, not after", () => {
    const body = handler("listExternalRegistrations");
    assert.match(body, /duplicateOf/, "the queue does not surface a clash");
    // Only when it is a DIFFERENT entrant — someone correcting their own typo is not a duplicate.
    assert.match(body, /String\(clash\.user\?\._id\) !== String\(doc\.user\?\._id\)/);
  });
});

describe("fixes from the adversarial review", () => {
  test("the grant is written only when an entry was actually created", () => {
    // Outside the branch, approving a claim from somebody who gave up waiting and PAID would record
    // ₹98 of foregone revenue against a sale that really happened.
    const body = handler("approveExternalRegistration");
    const branch = body.slice(body.indexOf("if (!entry) {"), body.indexOf('request.status = "approved"'));
    assert.match(branch, /recordGrant\(/, "the grant is not scoped to entry creation");
  });

  test("the proof screenshot's storage path is not guessable", () => {
    // It used to be `ext-<competitionId>-<userId>-<attempt>`, every part of which is knowable, so
    // another entrant's ticket — name, booking reference, often a partial payment record — could be
    // fetched by constructing the URL.
    const body = handler("submitExternalRegistration");
    assert.match(body, /crypto\.randomBytes\(/, "the screenshot path is still derived from known ids");
    assert.doesNotMatch(body, /public_id: `ext-\$\{competition\._id\}-\$\{req\.user\._id\}/);
  });

  test("a resubmission with a changed reference drops the old screenshot", () => {
    // Otherwise the reviewer approves proof of a reference the claim no longer carries.
    const body = handler("submitExternalRegistration");
    assert.match(body, /refKey\(cleanRef\) !== existing\.externalRefKey/);
  });

  test("the queue's clash key matches the approval guard's", () => {
    // Two different rules would mean the warning shown to the reviewer and the rule that blocks them
    // disagree — the worst of both.
    const body = handler("listExternalRegistrations");
    assert.match(body, /externalRefKey/, "the queue still compares raw references");
    assert.doesNotMatch(body.slice(body.indexOf("const clashKey")), /\$\{doc\.provider\}/);
  });
});
