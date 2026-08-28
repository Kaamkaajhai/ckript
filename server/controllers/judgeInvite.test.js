import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import fs from "node:fs";
import User from "../models/User.js";
import { acceptJudgeInvite, checkJudgeInvite } from "./authController.js";

/**
 * The judge invite exists for exactly one reason: so the ADMIN never learns a judge's password.
 *
 * If the admin picked it, the admin could sign in as that judge and score in their name, and "each
 * score is attributable to a named judge" would be a convention rather than something the system
 * enforces. These tests are about that property, so most of them are about what is NOT stored and
 * what is NOT returned.
 */

const adminSource = fs.readFileSync(new URL("./competitionJudgingAdminController.js", import.meta.url), "utf8");

// The success path signs a session token. generateToken reads JWT_SECRET at CALL time, so setting
// it here is enough — there is no .env in the test process.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-judge-invite";

const originals = { findOne: User.findOne, create: User.create };
afterEach(() => { User.findOne = originals.findOne; User.create = originals.create; });

const response = () => {
  const captured = { status: 200, body: null };
  return {
    captured,
    res: {
      status(code) { captured.status = code; return this; },
      json(body) { captured.body = body; return this; },
    },
  };
};

/** Express always supplies these; addSessionToUser reads req.headers["user-agent"]. */
const request = (body) => ({ body, headers: { "user-agent": "node-test" }, ip: "127.0.0.1" });

const RAW = "a".repeat(64);
const HASH = crypto.createHash("sha256").update(RAW).digest("hex");
const STRONG = "Judge!Pass9";

/** A judge document with a live invite, plus the save() the handler will call. */
const judgeWithInvite = (overrides = {}) => {
  const doc = {
    _id: "j1",
    name: "Priya Raghunathan",
    email: "priya@example.com",
    role: "judge",
    isFrozen: false,
    judgeInvite: { tokenHash: HASH, expiresAt: new Date(Date.now() + 3600_000), acceptedAt: null, invitedBy: "admin-1" },
    saved: false,
    async save() { this.saved = true; },
    ...overrides,
  };
  return doc;
};

const chain = (value) => ({ select: function () { return this; }, lean: () => Promise.resolve(value), then: undefined });

describe("accepting a judge invite", () => {
  test("looks the judge up by the token's HASH, never the raw token", async () => {
    let filter = null;
    const judge = judgeWithInvite();
    User.findOne = (f) => { filter = f; return Promise.resolve(judge); };

    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), response().res);

    assert.equal(filter["judgeInvite.tokenHash"], HASH);
    assert.notEqual(filter["judgeInvite.tokenHash"], RAW, "the raw token must never be a query value");
    assert.equal(filter.role, "judge", "a non-judge account must not be claimable through this route");
  });

  test("sets the password the judge chose and stamps the invite accepted", async () => {
    const judge = judgeWithInvite();
    User.findOne = () => Promise.resolve(judge);

    const target = response();
    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), target.res);

    assert.equal(judge.password, STRONG, "assigned in plaintext so the pre-save hook hashes it");
    assert.equal(judge.saved, true);
    assert.ok(judge.judgeInvite.acceptedAt);
    assert.equal(target.captured.status, 200);
  });

  test("burns the token, so a link that leaks afterwards opens nothing", async () => {
    const judge = judgeWithInvite();
    User.findOne = () => Promise.resolve(judge);

    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), response().res);

    assert.equal(judge.judgeInvite.tokenHash, "");
    assert.equal(judge.judgeInvite.expiresAt, null);
  });

  test("never returns the password back to the caller", async () => {
    const judge = judgeWithInvite();
    User.findOne = () => Promise.resolve(judge);

    const target = response();
    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), target.res);

    assert.equal(JSON.stringify(target.captured.body).includes(STRONG), false);
    assert.equal("password" in target.captured.body, false);
  });

  test("refuses an invite that was already used", async () => {
    const judge = judgeWithInvite({
      judgeInvite: { tokenHash: HASH, expiresAt: new Date(Date.now() + 3600_000), acceptedAt: new Date() },
    });
    User.findOne = () => Promise.resolve(judge);

    const target = response();
    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), target.res);

    assert.equal(target.captured.status, 409);
    assert.equal(judge.saved, false, "an already-used invite must not rewrite the password");
  });

  test("refuses an expired invite", async () => {
    const judge = judgeWithInvite({
      judgeInvite: { tokenHash: HASH, expiresAt: new Date(Date.now() - 1000), acceptedAt: null },
    });
    User.findOne = () => Promise.resolve(judge);

    const target = response();
    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), target.res);

    assert.equal(target.captured.status, 410);
    assert.equal(judge.saved, false);
  });

  test("refuses a frozen account", async () => {
    const judge = judgeWithInvite({ isFrozen: true });
    User.findOne = () => Promise.resolve(judge);

    const target = response();
    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), target.res);

    assert.equal(target.captured.status, 403);
    assert.equal(judge.saved, false);
  });

  test("rejects a malformed token before Mongo is touched", async () => {
    User.findOne = () => { throw new Error("must not query"); };

    for (const token of ["", "short", "../../etc", "z".repeat(64), { $ne: null }]) {
      const target = response();
      await acceptJudgeInvite(request({ token, password: STRONG }), target.res);
      assert.equal(target.captured.status, 400, `token ${JSON.stringify(token)} should be refused up front`);
    }
  });

  test("enforces the same password rules as ordinary signup", async () => {
    User.findOne = () => { throw new Error("must not query"); };

    for (const weak of ["Sh1!aB", "alllowercase9!", "NOLOWERCASE9!", "NoDigits!!", "NoSymbol99"]) {
      const target = response();
      await acceptJudgeInvite(request({ token: RAW, password: weak }), target.res);
      assert.equal(target.captured.status, 400, `"${weak}" should be refused`);
    }
  });

  test("an unknown token is a 404, not a hint", async () => {
    User.findOne = () => Promise.resolve(null);

    const target = response();
    await acceptJudgeInvite(request({ token: RAW, password: STRONG }), target.res);

    assert.equal(target.captured.status, 404);
  });
});

describe("checking a judge invite before showing the form", () => {
  test("returns the name but NOT the email", async () => {
    // A valid token proves possession of the link, not of the mailbox. Echoing the address would
    // turn a leaked link into a way to learn whose account it opens.
    User.findOne = () => chain({
      name: "Priya Raghunathan",
      email: "priya@example.com",
      judgeInvite: { acceptedAt: null, expiresAt: new Date(Date.now() + 3600_000) },
    });

    const target = response();
    await checkJudgeInvite({ params: { token: RAW } }, target.res);

    assert.equal(target.captured.body.valid, true);
    assert.equal(target.captured.body.name, "Priya Raghunathan");
    assert.equal(JSON.stringify(target.captured.body).includes("priya@example.com"), false);
  });

  test("reports used and expired invites distinctly, so the page can say which", async () => {
    User.findOne = () => chain({ name: "P", judgeInvite: { acceptedAt: new Date() } });
    let target = response();
    await checkJudgeInvite({ params: { token: RAW } }, target.res);
    assert.equal(target.captured.status, 409);

    User.findOne = () => chain({ name: "P", judgeInvite: { acceptedAt: null, expiresAt: new Date(Date.now() - 1000) } });
    target = response();
    await checkJudgeInvite({ params: { token: RAW } }, target.res);
    assert.equal(target.captured.status, 410);
  });
});

describe("the admin never learns a judge's password", () => {
  test("no admin endpoint generates, returns or stores a readable password", () => {
    // The point of the whole flow, asserted against the source so it cannot quietly come back.
    assert.equal(/password:\s*password\b/.test(adminSource), false, "an admin response returns a password");
    assert.equal(adminSource.includes("generatePassword"), false, "the admin still mints passwords");
    assert.match(adminSource, /unusablePassword/, "the created account must get a password nobody knows");
  });

  test("the invite stores only a hash, and the raw token leaves exactly once", () => {
    assert.match(adminSource, /createHash\("sha256"\)\.update\(token\)/, "the invite must be stored hashed");
    assert.equal(/tokenHash:\s*token\b/.test(adminSource), false, "the raw token must never be stored");

    // The raw token reaches the admin only as a link, and only from the two issuing endpoints.
    const returns = [...adminSource.matchAll(/invitePath\(token\)/g)];
    assert.equal(returns.length, 2, "expected exactly create + resend to return an invite link");

    // Built from a path, not CLIENT_URL: a correct invite must not depend on an env var being right
    // in every environment. The admin console is the client app, so the browser adds the origin.
    //
    // Comments are stripped first — the controller explains this same reasoning in prose, and a rule
    // that forbids explaining itself is a rule someone deletes.
    const code = adminSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    assert.equal(code.includes("CLIENT_URL"), false, "the invite link must not depend on CLIENT_URL");
  });

  test("re-inviting invalidates whatever password the judge had", () => {
    // Otherwise an admin "resetting" an account would leave the old password working beside the new
    // link, and a compromised judge account would stay compromised.
    assert.match(
      adminSource,
      /judge\.password = unusablePassword\(\);\s*\/\/[^\n]*\n\s*const token = await issueInvite/,
      "resend must replace the password before issuing a new invite"
    );
  });
});
