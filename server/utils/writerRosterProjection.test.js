import test from "node:test";
import assert from "node:assert/strict";
import {
  WRITER_ROSTER_PUBLIC_FIELDS,
  WRITER_ROSTER_SOURCE_FIELDS,
  escapeWriterRosterSearch,
} from "./writerRosterProjection.js";

test("writer roster projections are positive allowlists without private account fields", () => {
  for (const projection of [WRITER_ROSTER_SOURCE_FIELDS, WRITER_ROSTER_PUBLIC_FIELDS]) {
    assert.ok(Object.values(projection).every((value) => value === 1));
    for (const field of ["email", "phone", "address", "subscription", "activeSessions", "password"]) {
      assert.equal(Object.hasOwn(projection, field), false);
    }
  }
});

test("writer roster search escapes regex control characters", () => {
  assert.equal(escapeWriterRosterSearch("(pilot) [2026]?"), "\\(pilot\\) \\[2026\\]\\?");
  assert.doesNotThrow(() => new RegExp(escapeWriterRosterSearch("("), "i"));
});
