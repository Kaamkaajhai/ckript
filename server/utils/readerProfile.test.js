import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getReaderProfileRelationship,
  normalizeReaderProfileQuery,
  projectReaderProfile,
  readerCollectionMeta,
} from "./readerProfile.js";

describe("reader profile contract", () => {
  test("normalizes section and bounded pagination", () => {
    assert.deepEqual(normalizeReaderProfileQuery({ section: "favorites", page: "3", limit: "50" }), {
      section: "favorites", page: 3, limit: 20,
    });
    assert.deepEqual(normalizeReaderProfileQuery({ section: "hidden", page: "0", limit: "0" }), {
      section: "read", page: 1, limit: 12,
    });
  });

  test("projects visitor identity without collection ids or privacy internals", () => {
    const projected = projectReaderProfile({
      _id: "reader-1", name: "Ria", role: "reader", bio: "Reads drama.",
      scriptsRead: ["script-secret"], favoriteScripts: ["favorite-secret"],
      blockedUsers: ["blocked-secret"], followRequests: [{ from: "request-secret" }],
      followers: [{ _id: "viewer-1", name: "Dev" }], following: [],
    });
    assert.equal(projected.name, "Ria");
    const serialized = JSON.stringify(projected);
    for (const secret of ["script-secret", "favorite-secret", "blocked-secret", "request-secret"]) {
      assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
    }
  });

  test("keeps the owner-only fields required by the shared identity editor", () => {
    const projected = projectReaderProfile({
      _id: "reader-1",
      name: "Ria",
      role: "reader",
      phone: "+91 90000 00000",
      dateOfBirth: "1992-04-03",
      address: { street: "Owner street", city: "Mumbai", state: "MH", zipCode: "400001", country: "India" },
    }, { own: true });
    assert.equal(projected.phone, "+91 90000 00000");
    assert.equal(projected.dateOfBirth, "1992-04-03");
    assert.equal(projected.address.street, "Owner street");
    assert.equal(projected.address.zipCode, "400001");
  });

  test("derives relationship and explicit private collection metadata", () => {
    assert.deepEqual(getReaderProfileRelationship({
      followers: [{ _id: "viewer-1" }],
      following: ["viewer-1"],
      followRequests: [{ from: "viewer-1" }],
    }, "viewer-1"), {
      isFollowing: true,
      followsMe: true,
      followRequestPending: true,
      blockedByCurrent: false,
      blockedByProfile: false,
    });
    assert.deepEqual(readerCollectionMeta({ section: "favorites", page: 2, limit: 12, total: 25, collectionsVisible: false }), {
      section: "favorites", page: 2, limit: 12, total: 25, totalPages: 3,
      hasPrevious: true, hasNext: true, privateCollection: true,
    });
  });
});
