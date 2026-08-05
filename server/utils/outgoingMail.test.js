// What every outgoing message must say about who sent it and how to reach us.
//
// This exists because the previous arrangement failed SILENTLY. EMAIL_USER is the SMTP login, but it
// was also the last fallback for the From header, so a deployment that configured the visible sender
// under a key the code did not read (EMAIL_FROM_ADDRESS) sent every message under the login address
// instead — a gmail account — and nothing errored. The suite was green throughout.
//
// So the assertions below are about the CONTRACT a recipient sees:
//
//   • the From header is the company, never the login;
//   • every template carries all three contact addresses, in HTML and in plain text;
//   • no template leaks an escaped newline into its markup.
//
// The addresses are written as LITERALS here on purpose. A test that imported the constants it
// checks would keep passing no matter what those constants were changed to.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";

const COMPANY = "info@ckript.com";
const SUPPORT = "support@ckript.com";
const CONTACT = "contact@ckript.com";
const FROM = `"CKRIPT" <${COMPANY}>`;

// Deliberately NOT the company address: if this ever appears in a From header, the login has leaked
// back into the fallback chain and the bug this file guards against has returned.
const FAKE_LOGIN = "smtp-login@example.net";

const sent = [];
let realCreateTransport;
let quietLog;

before(() => {
  realCreateTransport = nodemailer.createTransport;
  // The templates call nodemailer.createTransport lazily inside their own factory, so replacing it
  // on the shared module object captures every message without touching product code — and without
  // needing working credentials.
  nodemailer.createTransport = () => ({
    verify: async () => true,
    sendMail: async (options) => { sent.push(options); return { messageId: "captured" }; },
  });

  // The senders validate that a login exists before composing. Supplying an address that is NOT the
  // company address is the whole point: it proves the From is independent of it.
  process.env.EMAIL_USER = FAKE_LOGIN;
  process.env.EMAIL_PASSWORD = "not-a-real-password";
  delete process.env.EMAIL_FROM_ADDRESS;
  delete process.env.EMAIL_FROM;

  quietLog = console.log;
  console.log = () => {};   // the senders narrate every send; keep the test output readable
});

after(() => {
  nodemailer.createTransport = realCreateTransport;
  console.log = quietLog;
});

describe("the From header", () => {
  test("is the company, and is not derived from the SMTP login", async () => {
    const { default: mailFrom } = await import("./mailFrom.js");
    assert.equal(mailFrom(), FROM);
    assert.ok(!mailFrom().includes(FAKE_LOGIN), "the SMTP login must never reach the From header");
  });

  test("honours an explicitly configured sender address", async () => {
    const { default: mailFrom } = await import("./mailFrom.js");
    process.env.EMAIL_FROM_ADDRESS = "hello@ckript.com";
    assert.equal(mailFrom(), `"CKRIPT" <hello@ckript.com>`);
    delete process.env.EMAIL_FROM_ADDRESS;
  });
});

describe("every template", () => {
  // Rendered once; each assertion below reads the same captured set.
  before(async () => {
    const service = await import("./emailService.js");
    const notify = await import("./notify.js");

    const positional = ["writer@example.com", "Ujjwal", "123456", "Script Title", "a reason", "x", "y"];
    const calls = Object.entries(service)
      .filter(([name, fn]) => typeof fn === "function" && name.startsWith("send"))
      .map(([, fn]) => () => fn(...positional.slice(0, Math.max(fn.length, 1))));

    // The two object-signature senders.
    calls.push(() => service.sendAdminWorkflowAlertEmail({
      title: "New item", section: "admin", message: "Something happened", metadata: { a: 1 },
    }));
    calls.push(() => notify.sendInviteEmail({
      to: "writer@example.com", recipientName: "Ujjwal", scriptTitle: "My Script",
      token: "tok", role: "editor",
    }));

    for (const run of calls) {
      // A template whose arguments this harness cannot guess still must not fail the others.
      try { await run(); } catch { /* signature mismatch, not a contract failure */ }
    }
  });

  test("renders a representative number of messages", () => {
    // Guards the harness itself: if a refactor stops these from being callable, the assertions
    // below would all pass vacuously against an empty set.
    assert.ok(sent.length >= 20, `expected at least 20 rendered messages, got ${sent.length}`);
  });

  test("sends as the company", () => {
    for (const message of sent) assert.equal(message.from, FROM, `subject: ${message.subject}`);
  });

  test("carries all three contact addresses in both bodies", () => {
    for (const message of sent) {
      for (const [label, body] of [["HTML", message.html], ["text", message.text]]) {
        if (!body) continue;
        for (const address of [COMPANY, SUPPORT, CONTACT]) {
          assert.ok(String(body).includes(address),
            `${label} body of "${message.subject}" is missing ${address}`);
        }
      }
    }
  });

  test("never leaks an escaped newline into markup", () => {
    // Appending a plain-text signature to an HTML body is an easy mistake and renders as a visible
    // "\n" in the recipient's client.
    for (const message of sent) {
      assert.ok(!String(message.html || "").includes("\\n"),
        `HTML body of "${message.subject}" contains a literal \\n`);
    }
  });

  test("no longer mentions the old gmail address", () => {
    for (const message of sent) {
      const body = `${message.html || ""}${message.text || ""}`;
      assert.ok(!body.includes("info.ckript@gmail.com"),
        `"${message.subject}" still names the old sender`);
    }
  });
});
