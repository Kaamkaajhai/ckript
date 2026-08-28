import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProfileImageUpdate } from "./profileUpdate.js";

describe("profile image updates", () => {
  it("keeps the image only when the field is omitted", () => {
    assert.equal(resolveProfileImageUpdate("old.webp", undefined), "old.webp");
  });

  it("allows the edit-profile remove action to clear the image", () => {
    assert.equal(resolveProfileImageUpdate("old.webp", ""), "");
    assert.equal(resolveProfileImageUpdate("old.webp", "   "), "");
  });

  it("normalizes a replacement URL", () => {
    assert.equal(resolveProfileImageUpdate("old.webp", " new.webp "), "new.webp");
  });

  it("does not turn malformed non-string payloads into a remove action", () => {
    assert.equal(resolveProfileImageUpdate("old.webp", null), "old.webp");
    assert.equal(resolveProfileImageUpdate("old.webp", { $unset: true }), "old.webp");
  });
});
