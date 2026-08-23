import test from "node:test";
import assert from "node:assert/strict";
import { INVESTOR_FEED_SCRIPT_FIELDS } from "./recommendationService.js";

test("investor feed uses a positive discovery projection", () => {
  const fields = new Set(INVESTOR_FEED_SCRIPT_FIELDS);
  for (const required of ["_id", "title", "logline", "creator", "scriptScore", "createdAt"]) {
    assert.equal(fields.has(required), true, `${required} should be projected`);
  }
  for (const privateField of ["fullContent", "textContent", "fileUrl", "pdfUrl", "scriptFile", "content"]) {
    assert.equal(fields.has(privateField), false, `${privateField} must not be projected`);
  }
});
