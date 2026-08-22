import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { evaluateAuthenticatedProfileAccess } from "./profileAccess.js";

describe("authenticated profile access", () => {
  test("lets an owner through before privacy rules", () => {
    const access = evaluateAuthenticatedProfileAccess({
      profile: { _id: "writer-1", role: "writer", isPrivate: true, isDeactivated: true },
      viewer: { _id: "writer-1", role: "writer" },
      viewerId: "writer-1",
      own: true,
    });
    assert.equal(access.allowed, true);
  });

  test("enforces blocks and private follow-request state", () => {
    const blocked = evaluateAuthenticatedProfileAccess({
      profile: { _id: "writer-1", role: "writer", blockedUsers: ["viewer-1"] },
      viewer: { _id: "viewer-1", role: "producer", blockedUsers: [] },
      viewerId: "viewer-1",
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.blockedByProfile, true);

    const privateProfile = evaluateAuthenticatedProfileAccess({
      profile: {
        _id: "writer-1",
        role: "writer",
        isPrivate: true,
        followers: [],
        followRequests: [{ from: "viewer-1" }],
      },
      viewer: { _id: "viewer-1", role: "producer", blockedUsers: [] },
      viewerId: "viewer-1",
    });
    assert.equal(privateProfile.allowed, false);
    assert.equal(privateProfile.body.privateAccount, true);
    assert.equal(privateProfile.body.followRequestPending, true);
  });

  test("keeps deactivated profiles hidden from non-admin visitors", () => {
    const hidden = evaluateAuthenticatedProfileAccess({
      profile: { _id: "writer-1", role: "writer", isDeactivated: true },
      viewer: { _id: "viewer-1", role: "producer" },
      viewerId: "viewer-1",
    });
    assert.equal(hidden.allowed, false);
    assert.equal(hidden.status, 404);
  });
});
