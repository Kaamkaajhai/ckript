import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMeetingRequest } from "./meetingRequest.js";

const valid = {
  writerId: "writer-id",
  scriptId: "script-id",
  title: "  Story meeting  ",
  scheduledDate: "2026-08-22",
  scheduledTime: "10:30",
  duration: "30",
  message: "  Bring notes  ",
  timeZone: "Asia/Kolkata",
};
const now = new Date("2026-08-21T00:00:00.000Z");

test("normalizes an allowed future meeting into Google calendar values", () => {
  const result = normalizeMeetingRequest(valid, now);
  assert.equal(result.ok, true);
  assert.equal(result.value.title, "Story meeting");
  assert.equal(result.value.message, "Bring notes");
  assert.equal(result.value.duration, 30);
  assert.equal(result.value.startAt.toISOString(), "2026-08-22T05:00:00.000Z");
  assert.equal(result.value.startISO, "2026-08-22T10:30:00.000");
  assert.equal(result.value.endISO, "2026-08-22T11:00:00.000");
});

test("rejects unsupported durations and overlong calendar content", () => {
  assert.match(normalizeMeetingRequest({ ...valid, duration: 90 }, now).message, /15, 30, 45, or 60/);
  assert.match(normalizeMeetingRequest({ ...valid, title: "x".repeat(121) }, now).message, /120/);
  assert.match(normalizeMeetingRequest({ ...valid, message: "x".repeat(501) }, now).message, /500/);
});

test("rejects invalid zones and instants that are no longer in the future", () => {
  assert.match(normalizeMeetingRequest({ ...valid, timeZone: "Not/AZone" }, now).message, /Invalid/);
  assert.match(normalizeMeetingRequest({ ...valid, scheduledDate: "2026-08-22junk" }, now).message, /Invalid/);
  assert.match(normalizeMeetingRequest({ ...valid, title: { $ne: "" } }, now).message, /required/);
  assert.match(
    normalizeMeetingRequest({ ...valid, scheduledDate: "2026-08-21", scheduledTime: "05:29" }, now).message,
    /future/,
  );
});
