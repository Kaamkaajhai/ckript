import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canRevokeRemoteSession, retainCurrentSession } from "./accountSecurity.js";

describe("account session security", () => {
  it("keeps only the authenticated device after a password change", () => {
    const sessions = [{ sessionId: "current" }, { sessionId: "other" }, { sessionId: "third" }];
    assert.deepEqual(retainCurrentSession(sessions, "current"), [{ sessionId: "current" }]);
    assert.deepEqual(retainCurrentSession(sessions, "missing"), []);
    assert.deepEqual(retainCurrentSession(sessions, ""), []);
  });

  it("reserves current-device removal for the logout endpoint", () => {
    assert.equal(canRevokeRemoteSession("other", "current"), true);
    assert.equal(canRevokeRemoteSession("current", "current"), false);
    assert.equal(canRevokeRemoteSession("", "current"), false);
  });
});
