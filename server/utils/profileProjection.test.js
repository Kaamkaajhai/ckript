import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBusinessEmailProfileDenial,
  buildPrivateProfileDenial,
  buildVisitorProfile,
  redactOwnerProfileSecrets,
  VISITOR_PROFILE_SCRIPT_FIELDS,
} from "./profileProjection.js";

describe("authenticated visitor profile projection", () => {
  test("keeps public workspace fields and drops account, contact, payment and session secrets", () => {
    const projected = buildVisitorProfile({
      _id: "writer-1",
      sid: "USR-ABCDEFGH",
      name: "Mira Sen",
      email: "private@example.com",
      phone: "+91 90000 00000",
      passwordResetToken: "reset-secret",
      emailVerificationToken: "verify-secret",
      pendingEmail: "pending@example.com",
      stripeAccountId: "acct_secret",
      activeSessions: [{ ip: "127.0.0.1", sessionId: "session-secret" }],
      googleCalendar: { calendarEmail: "calendar@example.com", accessToken: "oauth-secret" },
      accountDeletion: { archivedProfile: { email: "archived@example.com" } },
      role: "writer",
      bio: "Writes thrillers.",
      address: { street: "Private street", city: "Mumbai", state: "MH", country: "India", zipCode: "400001" },
      writerProfile: {
        username: "mira",
        legalName: "Private Legal Name",
        genres: ["Thriller"],
        links: { portfolio: "https://private.example" },
        membershipVerification: { wga: { status: "approved", proofUrl: "private-proof.pdf", adminNote: "private" } },
      },
      subscription: {
        plan: "pro",
        accessTier: "writer_gold",
        accessStatus: "active",
        paymentId: "pay_secret",
        checkoutReference: "order_secret",
        revealedContacts: [{ writerId: "someone-private" }],
      },
      followers: [{ _id: "u2", name: "Asha", email: "hidden@example.com", writerProfile: { username: "asha", legalName: "Hidden" } }],
    });

    assert.equal(projected.name, "Mira Sen");
    assert.equal(projected.address.city, "Mumbai");
    assert.deepEqual(projected.writerProfile.genres, ["Thriller"]);
    assert.equal(projected.writerProfile.membershipVerification.wga.status, "approved");
    assert.equal(projected.followers[0].writerProfile.username, "asha");

    const serialized = JSON.stringify(projected);
    for (const secret of [
      "private@example.com", "+91 90000 00000", "reset-secret", "verify-secret",
      "acct_secret", "session-secret", "oauth-secret", "archived@example.com",
      "Private street", "400001", "Private Legal Name", "private-proof.pdf",
      "https://private.example", "pay_secret", "order_secret", "someone-private",
      "hidden@example.com", "Hidden",
    ]) {
      assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
    }
  });

  test("the project list projection cannot become a second screenplay endpoint", () => {
    for (const privateField of ["fullContent", "textContent", "fountainContent", "fileUrl", "scriptPreviewPageTexts"]) {
      assert.equal(VISITOR_PROFILE_SCRIPT_FIELDS.includes(privateField), false);
    }
    assert.equal(VISITOR_PROFILE_SCRIPT_FIELDS.includes("title"), true);
    assert.equal(VISITOR_PROFILE_SCRIPT_FIELDS.includes("logline"), true);
  });
});

describe("own profile projection", () => {
  test("keeps settings fields but removes credentials, sessions, and payment references", () => {
    const projected = redactOwnerProfileSecrets({
      email: "owner@example.com",
      pendingEmail: "next@example.com",
      emailVerified: false,
      isPrivate: true,
      notificationPrefs: { viewAlerts: true },
      password: "hash",
      googleId: "provider-id",
      emailVerificationToken: "otp-hash",
      passwordResetToken: "reset-hash",
      activeSessions: [{ sessionId: "session-secret" }],
      stripeAccountId: "acct-secret",
      stripeCustomerId: "cus-secret",
      accountDeletion: { archivedProfile: { email: "archived@example.com" } },
      subscription: { plan: "pro", checkoutReference: "order-secret", paymentId: "pay-secret" },
      googleCalendar: { connected: true, calendarEmail: "calendar@example.com", accessToken: "oauth-secret", scopes: ["scope-secret"] },
      writerProfile: { username: "owner", membershipVerification: { wga: { status: "pending", proofUrl: "proof-secret", proofPublicId: "public-id-secret", proofFileName: "card.pdf", proofMimeType: "application/pdf", reviewedBy: "reviewer-secret" } } },
    });

    assert.equal(projected.email, "owner@example.com");
    assert.equal(projected.pendingEmail, "next@example.com");
    assert.equal(projected.isPrivate, true);
    assert.equal(projected.subscription.plan, "pro");
    assert.deepEqual(projected.googleCalendar, { connected: true, calendarEmail: "calendar@example.com" });
    assert.deepEqual(projected.writerProfile.membershipVerification.wga, {
      requested: false,
      status: "pending",
      proofFileName: "card.pdf",
      proofMimeType: "application/pdf",
      submittedAt: undefined,
      reviewedAt: undefined,
      adminNote: "",
    });

    const serialized = JSON.stringify(projected);
    for (const secret of ["hash", "provider-id", "session-secret", "acct-secret", "cus-secret", "archived@example.com", "order-secret", "pay-secret", "oauth-secret", "scope-secret", "proof-secret", "public-id-secret", "reviewer-secret"]) {
      assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
    }
  });
});

describe("profile access denials", () => {
  test("a private denial carries only the target id needed by follow actions", () => {
    assert.deepEqual(buildPrivateProfileDenial({
      userId: "writer-1",
      followRequestPending: true,
      blockedByCurrent: false,
      blockedByProfile: false,
    }), {
      message: "This account is private.",
      privateAccount: true,
      profileId: "writer-1",
      blockedByCurrent: false,
      blockedByProfile: false,
      followRequestPending: true,
    });
  });

  test("business-email denials use the flag both clients already understand", () => {
    assert.deepEqual(buildBusinessEmailProfileDenial("Upgrade required"), {
      message: "Upgrade required",
      personalEmailFipRestricted: true,
      requiresBusinessEmail: true,
    });
  });
});
