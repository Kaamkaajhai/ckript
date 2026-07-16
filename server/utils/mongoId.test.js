import assert from "node:assert/strict";
import test from "node:test";

import { parseMongoObjectId } from "./mongoId.js";

test("parses only canonical 24-character hexadecimal ObjectIds", () => {
  const parsed = parseMongoObjectId(" 507f1f77bcf86cd799439011 ");
  assert.equal(parsed?.toHexString(), "507f1f77bcf86cd799439011");
  assert.equal(parseMongoObjectId("507F1F77BCF86CD799439011")?.toHexString(), "507f1f77bcf86cd799439011");
});

test("rejects NoSQL operator objects and non-canonical identifier values", () => {
  const rejected = [
    { $ne: null },
    { $gt: "" },
    ["507f1f77bcf86cd799439011"],
    123,
    null,
    undefined,
    "507f1f77bcf86cd79943901",
    "not-an-object-id",
  ];
  for (const candidate of rejected) {
    assert.equal(parseMongoObjectId(candidate), null);
  }
});
