import { describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";
import Competition from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import CompetitionJudge from "../models/CompetitionJudge.js";
import JudgeScore from "../models/JudgeScore.js";
import JudgeNomination from "../models/JudgeNomination.js";
import { buildFixtures } from "./judgePanelFixtures.js";

/**
 * Do the smoke script's documents actually satisfy the schemas?
 *
 * Written after the first live run died at seeding on four required CompetitionEntry fields nothing
 * had ever exercised. Every other test for the judge panel hands a plain object to a pure function
 * or a stubbed handler, so the schema was never in the loop — and the only thing that could catch it
 * was a database run on someone else's machine.
 *
 * `validateSync()` runs the whole required/enum/maxlength chain with NO CONNECTION, in milliseconds.
 * So a required field added to CompetitionEntry tomorrow fails here, in the ordinary suite, instead
 * of the next time somebody runs the smoke script.
 */

const oid = () => new mongoose.Types.ObjectId();
const NOW = 1_756_400_000_000;   // fixed: fixtures must not depend on when the suite runs

/** validateSync returns an error rather than throwing; surface which paths failed. */
const assertValid = (Model, doc, label) => {
  const error = new Model(doc).validateSync();
  const detail = error ? Object.entries(error.errors).map(([p, e]) => `${p}: ${e.message}`).join("; ") : "";
  assert.equal(error, undefined, `${label} does not satisfy ${Model.modelName}: ${detail}`);
};

describe("judge panel smoke fixtures satisfy the real schemas", () => {
  const f = buildFixtures(NOW);
  const writerId = oid();
  const judgeId = oid();
  const competitionId = oid();
  const entryId = oid();

  test("the three seeded accounts are valid users", () => {
    assertValid(User, f.users.writer, "writer");
    assertValid(User, f.users.judge, "judge");
    assertValid(User, f.users.otherJudge, "second judge");
  });

  test("the judge accounts carry the judge role", () => {
    // Guards the ordering trap that made this feature possible in the first place: `judge` has to be
    // in User's enum, and the fixture has to actually use it, or the smoke run proves nothing.
    assert.equal(f.users.judge.role, "judge");
    assert.equal(f.users.otherJudge.role, "judge");
    assert.ok(User.schema.path("role").enumValues.includes("judge"));
  });

  test("both competitions are valid, including the judging rubric", () => {
    assertValid(Competition, f.competitions.main, "main competition");
    assertValid(Competition, f.competitions.other, "second competition");
  });

  test("the rubric registers on the schema rather than being silently dropped", () => {
    const doc = new Competition(f.competitions.main);
    assert.equal(doc.judging.criteria.length, 3);
    assert.equal(doc.judging.awards.length, 1);
    assert.equal(doc.judging.scale, 10);
    // A subdocument path that does not exist on the schema is discarded without complaint, so the
    // count above is the assertion that matters — not that `judging` was passed in.
    assert.equal(doc.judging.criteria[0].key, "structure");
  });

  test("every entry satisfies CompetitionEntry, required fields included", () => {
    const base = { competitionId, userId: writerId };
    assertValid(CompetitionEntry, { ...base, ...f.entries.a("Smoke Writer", "smoke@example.com") }, "entry A");
    assertValid(CompetitionEntry, { ...base, ...f.entries.b() }, "entry B");
    assertValid(CompetitionEntry, { ...base, ...f.entries.draft() }, "draft entry");
    assertValid(CompetitionEntry, { ...base, ...f.entries.foreign() }, "foreign entry");
  });

  test("entry A really does carry the identity the anonymisation test needs to strip", () => {
    // A fixture that quietly lost its leak-bait would make the smoke run pass for the wrong reason.
    const a = f.entries.a("Priya Raghunathan", "priya@example.com");
    assert.match(a.snapshot.fountainContent, /^Title:/);
    assert.match(a.snapshot.fountainContent, /Priya Raghunathan/);
    assert.match(a.snapshot.logline, /Priya Raghunathan/);
    assert.match(a.snapshot.synopsis, /priya@example\.com/);
    assert.ok(a.payment.orderId && a.ai.evaluation && a.registration.portfolioUrl);
  });

  test("the assignment, scores and nomination are valid", () => {
    assertValid(CompetitionJudge, { competition: competitionId, judge: judgeId, assignedBy: judgeId, status: "active" }, "assignment");
    const scoreBase = { competition: competitionId, entry: entryId, judge: judgeId };
    assertValid(JudgeScore, { ...scoreBase, ...f.scores.submitted }, "submitted score");
    assertValid(JudgeScore, { ...scoreBase, ...f.scores.second }, "second judge's score");
    assertValid(JudgeScore, { ...scoreBase, ...f.scores.draft }, "draft score");
    assertValid(JudgeNomination, { competition: competitionId, entry: entryId, judge: judgeId, ...f.nomination }, "nomination");
  });

  test("the criterion keys the scores use are the ones the rubric defines", () => {
    // Otherwise the aggregate silently reads nothing and every entry scores zero.
    const keys = f.competitions.main.judging.criteria.map((c) => c.key);
    for (const marked of Object.keys(f.scores.submitted.scores)) {
      assert.ok(keys.includes(marked), `score references "${marked}", which the rubric does not define`);
    }
    assert.ok(keys.includes(Object.keys(f.scores.draft.scores)[0]));
  });

  test("the nomination targets an award category that exists", () => {
    const awards = f.competitions.main.judging.awards.map((a) => a.key);
    assert.ok(awards.includes(f.nomination.awardKey));
  });

  test("ids stay unique per run, since eventId and slug are unique in Mongo", () => {
    const a = buildFixtures(1);
    const b = buildFixtures(2);
    assert.notEqual(a.eventIds.a, b.eventIds.a);
    assert.notEqual(a.competitions.main.slug, b.competitions.main.slug);
  });
});
