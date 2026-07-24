import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getCompetitionPhase,
  buildTimeline,
  canSubmitNow,
  SUBMIT_GRACE_MS,
} from "./competitionPhase.js";

// Fixed clock so the assertions are deterministic.
const T = (offsetMs) => new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + offsetMs);
const HOUR = 3600_000;

const competition = {
  dates: {
    regOpensAt: T(0),
    regClosesAt: T(10 * HOUR),
    startsAt: T(20 * HOUR),
    endsAt: T(68 * HOUR), // startsAt + 48h
    resultsAt: T(90 * HOUR),
  },
  resultsDeclaredAt: null,
};

test("phase progresses through the whole lifecycle", () => {
  assert.equal(getCompetitionPhase(competition, T(-1)), "announced");
  assert.equal(getCompetitionPhase(competition, T(5 * HOUR)), "registration_open");
  assert.equal(getCompetitionPhase(competition, T(15 * HOUR)), "registration_closed");
  assert.equal(getCompetitionPhase(competition, T(30 * HOUR)), "live");
  assert.equal(getCompetitionPhase(competition, T(70 * HOUR)), "judging");
});

test("boundaries are exact to the millisecond (start inclusive, end exclusive)", () => {
  // A boundary belongs to the phase it opens.
  assert.equal(getCompetitionPhase(competition, T(0)), "registration_open", "regOpensAt opens registration");
  assert.equal(getCompetitionPhase(competition, T(-1)), "announced");
  assert.equal(getCompetitionPhase(competition, T(10 * HOUR)), "registration_closed", "regClosesAt closes it");
  assert.equal(getCompetitionPhase(competition, T(10 * HOUR - 1)), "registration_open");
  assert.equal(getCompetitionPhase(competition, T(20 * HOUR)), "live", "startsAt goes live");
  assert.equal(getCompetitionPhase(competition, T(20 * HOUR - 1)), "registration_closed");
  assert.equal(getCompetitionPhase(competition, T(68 * HOUR)), "judging", "endsAt closes writing");
  assert.equal(getCompetitionPhase(competition, T(68 * HOUR - 1)), "live");
});

test("a declaration wins over the clock, at any time", () => {
  const declared = { ...competition, resultsDeclaredAt: T(69 * HOUR) };
  assert.equal(getCompetitionPhase(declared, T(100 * HOUR)), "results");
  // Declared early — even while the writing window would still be open.
  assert.equal(getCompetitionPhase(declared, T(30 * HOUR)), "results");
});

test("missing competition degrades safely", () => {
  assert.equal(getCompetitionPhase(null), "announced");
});

test("submission window includes the grace period but not the whole minute after", () => {
  assert.equal(canSubmitNow(competition, T(20 * HOUR)), true, "open at the bell");
  assert.equal(canSubmitNow(competition, T(20 * HOUR - 1)), false, "not before the start");
  assert.equal(canSubmitNow(competition, T(68 * HOUR)), true, "on the deadline");
  assert.equal(canSubmitNow(competition, T(68 * HOUR + SUBMIT_GRACE_MS)), true, "last grace ms");
  assert.equal(canSubmitNow(competition, T(68 * HOUR + SUBMIT_GRACE_MS + 1)), false, "past grace");
  assert.equal(canSubmitNow({ ...competition, resultsDeclaredAt: T(69 * HOUR) }, T(30 * HOUR)), false);
});

test("public timeline marks exactly one current step", () => {
  const steps = buildTimeline(competition, null, T(30 * HOUR));
  assert.equal(steps.filter((s) => s.status === "current").length, 1);
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s.status]));
  assert.equal(byKey.registration_opens, "done");
  assert.equal(byKey.registration_closes, "done");
  assert.equal(byKey.competition_starts, "done");
  assert.equal(byKey.results, "upcoming");
});

test("participant timeline reports the writer's own progress, not the clock", () => {
  const entry = {
    createdAt: T(2 * HOUR),
    status: "submitted",
    submittedAt: T(40 * HOUR),
    ai: { processedAt: null },
  };
  // Still inside the writing window, but this writer already submitted.
  const steps = buildTimeline(competition, entry, T(45 * HOUR));
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s.status]));
  assert.equal(byKey.registered, "done");
  assert.equal(byKey.writing, "done", "writing is finished once submitted");
  assert.equal(byKey.submission, "done");
  assert.equal(byKey.ai_review, "current", "AI review is what they are waiting on");
  assert.equal(byKey.rewards, "upcoming");
  assert.equal(steps.filter((s) => s.status === "current").length, 1);
});

test("a judged entry has every step done", () => {
  const entry = {
    createdAt: T(2 * HOUR),
    status: "judged",
    submittedAt: T(40 * HOUR),
    ai: { processedAt: T(41 * HOUR) },
  };
  const declared = { ...competition, resultsDeclaredAt: T(80 * HOUR) };
  const steps = buildTimeline(declared, entry, T(90 * HOUR));
  assert.ok(steps.every((s) => s.status === "done"), "no step left pending after judging");
});

// A timeline must read top-to-bottom as a sequence: done steps, then at most one current, then
// upcoming. The entry-driven and clock-driven flags can disagree, and when they do the result must
// still be monotonic — never a "done" step sitting below an unfinished one.
const isMonotonic = (steps) => {
  const rank = { done: 0, current: 1, upcoming: 2 };
  return steps.every((s, i) => i === 0 || rank[s.status] >= rank[steps[i - 1].status]);
};

test("a registrant who never submitted still gets a coherent timeline", () => {
  const declared = { ...competition, resultsDeclaredAt: T(80 * HOUR) };
  const entry = { createdAt: T(2 * HOUR), status: "registered", submittedAt: null, ai: {} };
  const steps = buildTimeline(declared, entry, T(90 * HOUR));

  assert.ok(isMonotonic(steps), `not monotonic: ${steps.map((s) => `${s.key}=${s.status}`).join(" ")}`);
  assert.equal(steps.filter((s) => s.status === "current").length, 1, "exactly one current");
  // The competition is over: its own steps must NOT still read as finished below the writer's.
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s.status]));
  assert.notEqual(byKey.judging, "done", "judging cannot be done while this writer never submitted");
  assert.notEqual(byKey.results, "done");
});

test("the public timeline of a finished competition is all done, with no current", () => {
  const declared = { ...competition, resultsDeclaredAt: T(80 * HOUR) };
  const steps = buildTimeline(declared, null, T(90 * HOUR));
  assert.ok(isMonotonic(steps));
  assert.ok(steps.every((s) => s.status === "done"), "every step done once results are declared");
  assert.equal(steps.filter((s) => s.status === "current").length, 0, "nothing is 'current' once finished");
});

test("every timeline shape stays monotonic", () => {
  const entries = [
    null,
    { createdAt: T(2 * HOUR), status: "registered", ai: {} },
    { createdAt: T(2 * HOUR), status: "writing", ai: {} },
    { createdAt: T(2 * HOUR), status: "submitted", submittedAt: T(40 * HOUR), ai: {} },
    { createdAt: T(2 * HOUR), status: "ai_processed", submittedAt: T(40 * HOUR), ai: { processedAt: T(41 * HOUR) } },
    { createdAt: T(2 * HOUR), status: "judged", submittedAt: T(40 * HOUR), ai: { processedAt: T(41 * HOUR) } },
  ];
  for (const declared of [false, true]) {
    const comp = declared ? { ...competition, resultsDeclaredAt: T(80 * HOUR) } : competition;
    for (const when of [-1, 5, 15, 30, 70, 100]) {
      for (const entry of entries) {
        const steps = buildTimeline(comp, entry, T(when * HOUR));
        assert.ok(isMonotonic(steps), `declared=${declared} t=${when}h status=${entry?.status || "none"}`);
        assert.ok(steps.filter((s) => s.status === "current").length <= 1, "never two current steps");
      }
    }
  }
});

test("timeline dates are ISO strings or null", () => {
  for (const step of buildTimeline(competition, null, T(5 * HOUR))) {
    assert.ok(step.date === null || !Number.isNaN(Date.parse(step.date)), `${step.key} date`);
    assert.ok(typeof step.label === "string" && step.label.length > 0);
  }
});
