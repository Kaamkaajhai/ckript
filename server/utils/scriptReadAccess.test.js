import test from "node:test";
import assert from "node:assert/strict";
import { canReadFullScript } from "./scriptReadAccess.js";

test("full screenplay access is granted only by an explicit full-access relationship", () => {
  for (const key of ["isOwner", "isAdmin", "isBuyer", "canCollaboratorRead"]) {
    assert.equal(canReadFullScript({ [key]: true }), true, key);
  }
});

test("marketplace and preview facts cannot grant full screenplay access", () => {
  assert.equal(canReadFullScript({
    isPublished: true,
    isIndustryProfessional: true,
    hasBusinessEmail: true,
    hasActivePlan: true,
    viewableScript: true,
  }), false);
});
