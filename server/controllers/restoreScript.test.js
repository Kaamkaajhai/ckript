import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Script from "../models/Script.js";
import Notification from "../models/Notification.js";
import { restoreScript } from "./adminController.js";

/**
 * Undoing a writer's delete.
 *
 * Deleting a project is a SOFT delete, so everything survives and restoring is a two-field flip.
 * What these tests pin down is the part that is easy to get wrong: restoring must undo ONLY what the
 * delete did, and must not resurrect state the delete deliberately released.
 */

const scriptSource = fs.readFileSync(new URL("./scriptController.js", import.meta.url), "utf8");

const originals = { findById: Script.findById, create: Notification.create };
afterEach(() => { Script.findById = originals.findById; Notification.create = originals.create; });

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

const deletedScript = (overrides = {}) => ({
  _id: "s1",
  sid: "SCR-1",
  title: "My Challenge Draft",
  creator: "writer-1",
  isDeleted: true,
  deletedAt: new Date("2026-08-01T00:00:00.000Z"),
  // Released by the delete, and must STAY released.
  purchaseRequestLocked: false,
  purchaseRequestLockedBy: null,
  purchaseRequestLockedAt: null,
  saved: false,
  async save() { this.saved = true; },
  ...overrides,
});

const req = (id = "s1") => ({ params: { id }, user: { _id: "admin-1", role: "admin" } });

describe("restoring a deleted project", () => {
  test("clears exactly the two fields the delete set", async () => {
    const script = deletedScript();
    Script.findById = () => Promise.resolve(script);
    Notification.create = () => Promise.resolve({});

    const target = response();
    await restoreScript(req(), target.res);

    assert.equal(script.isDeleted, false);
    assert.equal(script.deletedAt, null);
    assert.equal(script.saved, true);
    assert.equal(target.captured.status, 200);
  });

  test("does NOT re-apply the purchase-request lock the delete released", async () => {
    // Re-locking a stale purchase request would be a second bug stacked on the first: the request it
    // referred to has had every chance to move on since.
    const script = deletedScript();
    Script.findById = () => Promise.resolve(script);
    Notification.create = () => Promise.resolve({});

    await restoreScript(req(), response().res);

    assert.equal(script.purchaseRequestLocked, false);
    assert.equal(script.purchaseRequestLockedBy, null);
    assert.equal(script.purchaseRequestLockedAt, null);
  });

  test("leaves the writer, title and content alone", async () => {
    const script = deletedScript({ fountainContent: "INT. ROOM - DAY" });
    Script.findById = () => Promise.resolve(script);
    Notification.create = () => Promise.resolve({});

    await restoreScript(req(), response().res);

    assert.equal(script.creator, "writer-1");
    assert.equal(script.title, "My Challenge Draft");
    assert.equal(script.fountainContent, "INT. ROOM - DAY");
  });

  test("tells the writer, since the project just reappears otherwise", async () => {
    const script = deletedScript();
    Script.findById = () => Promise.resolve(script);
    let notification = null;
    Notification.create = (doc) => { notification = doc; return Promise.resolve(doc); };

    await restoreScript(req(), response().res);

    assert.equal(notification.user, "writer-1");
    assert.match(notification.message, /restored/i);
  });

  test("a failed notification does not undo a successful restore", async () => {
    const script = deletedScript();
    Script.findById = () => Promise.resolve(script);
    Notification.create = () => Promise.reject(new Error("notifications down"));

    const target = response();
    await restoreScript(req(), target.res);

    assert.equal(script.isDeleted, false);
    assert.equal(target.captured.status, 200);
  });

  test("restoring an already-live project is a no-op, not an error", async () => {
    // Two admins clicking the same row is a race with an obviously right answer.
    const script = deletedScript({ isDeleted: false, deletedAt: null });
    Script.findById = () => Promise.resolve(script);

    const target = response();
    await restoreScript(req(), target.res);

    assert.equal(target.captured.status, 200);
    assert.equal(target.captured.body.alreadyRestored, true);
    assert.equal(script.saved, false, "an already-live script must not be written again");
  });

  test("a missing script is a 404", async () => {
    Script.findById = () => Promise.resolve(null);

    const target = response();
    await restoreScript(req("nope"), target.res);

    assert.equal(target.captured.status, 404);
  });

  test("a thrown query is a 500 that does not echo the internal error", async () => {
    Script.findById = () => { throw new Error("mongo exploded: connection string ..."); };

    const target = response();
    await restoreScript(req(), target.res);

    assert.equal(target.captured.status, 500);
    assert.equal(target.captured.body.message.includes("mongo exploded"), false);
  });
});

describe("the owner is told their project was deleted, not that access was revoked", () => {
  test("getScriptById returns reason:'deleted' to the owner", () => {
    assert.match(scriptSource, /if \(isOwner\) \{[\s\S]{0,200}reason: "deleted"/);
  });

  test("and stays opaque for everyone else", () => {
    /*
     * A deleted script must read as never-existed to a non-owner, or the distinction becomes a way
     * to confirm which script ids are real.
     *
     * Two details this assertion learned the hard way. It reads a fixed window rather than matching
     * braces — the branch nests now, and a [\s\S]*? brace pattern stops at the first inner `}` and
     * then "passes" against half the code. And it is scoped to getScriptById, because getScriptPdf
     * carries an identical isDeleted branch that a bare indexOf finds first; only getScriptById
     * serves GET /scripts/:id, which is what the editor loads.
     */
    const fnStart = scriptSource.indexOf("export const getScriptById");
    assert.ok(fnStart > -1, "could not locate getScriptById");
    const start = scriptSource.indexOf("if (script.isDeleted && !isAdmin && !isBuyer) {", fnStart);
    assert.ok(start > -1, "could not locate the deleted-script branch inside getScriptById");
    // Wide enough to clear the explanatory comment above the guard and still reach the fallback
    // return beneath it — a window that stops short would fail for the wrong reason.
    const branch = scriptSource.slice(start, start + 1800);

    // The bare 404 for everyone else is still there.
    assert.match(branch, /return res\.status\(404\)\.json\(\{ message: "Script not found" \}\);/);

    // And the informative one sits INSIDE the isOwner guard, never after it.
    const ownerIdx = branch.indexOf("if (isOwner)");
    const reasonIdx = branch.indexOf('reason: "deleted"');
    assert.ok(ownerIdx > -1, "the owner guard is missing");
    assert.ok(reasonIdx > ownerIdx, "reason:'deleted' must be gated on isOwner");
    assert.ok(branch.indexOf('message: "Script not found"') > reasonIdx, "the opaque 404 must remain the fallback");
  });
});
