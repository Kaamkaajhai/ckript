import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import CompetitionEntry from "../models/CompetitionEntry.js";
import JudgeEntryAssignment from "../models/JudgeEntryAssignment.js";
import JudgeScore from "../models/JudgeScore.js";
import JudgeNomination from "../models/JudgeNomination.js";
import { getJudgeEntry, listJudgeEntries } from "./judgeController.js";

/**
 * A judge sees only the scripts they were given.
 *
 * The panel seat (CompetitionJudge) says which competition a judge works on; this says which ENTRIES
 * within it. Without the second, five judges each read all forty scripts — the duplicated effort
 * this exists to end.
 *
 * These tests are about the gate holding, so most of them are about what a judge CANNOT reach. The
 * important property is that it gates rather than filters: an entry nobody assigned must 404 when
 * its id is pasted in, not merely be missing from a list.
 */

const controllerSource = fs.readFileSync(new URL("./judgeController.js", import.meta.url), "utf8");

const originals = {
  entryFind: CompetitionEntry.find,
  entryFindOne: CompetitionEntry.findOne,
  entryCount: CompetitionEntry.countDocuments,
  assignFind: JudgeEntryAssignment.find,
  scoreFind: JudgeScore.find,
  scoreFindOne: JudgeScore.findOne,
  nominationFind: JudgeNomination.find,
};
afterEach(() => Object.assign(CompetitionEntry, {
  find: originals.entryFind,
  findOne: originals.entryFindOne,
  countDocuments: originals.entryCount,
}) && Object.assign(JudgeEntryAssignment, { find: originals.assignFind })
  && Object.assign(JudgeScore, { find: originals.scoreFind, findOne: originals.scoreFindOne })
  && Object.assign(JudgeNomination, { find: originals.nominationFind }));

const response = () => {
  const captured = { status: 200, body: null };
  return {
    captured,
    res: {
      status(code) { captured.status = code; return this; },
      json(body) { captured.body = body; return this; },
    },
  };
};

/** A thenable stub for a Mongoose chain, whatever combination of helpers the caller uses. */
const chain = (value) => {
  const self = {
    select: () => self, sort: () => self, skip: () => self, limit: () => self, populate: () => self,
    lean: () => Promise.resolve(value),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return self;
};

const COMP = "507f1f77bcf86cd799439012";
const MINE = "507f1f77bcf86cd799439011";
const THEIRS = "507f1f77bcf86cd799439099";
const JUDGE = "judge-1";

const req = (entryId) => ({ params: { competitionId: COMP, entryId }, query: {}, user: { _id: JUDGE } });

/** Only MINE is assigned to this judge. */
const assignOnlyMine = () => {
  JudgeEntryAssignment.find = () => chain([{ entry: MINE }]);
};

describe("the assignment gate", () => {
  test("the entry query is scoped to the assigned ids", async () => {
    assignOnlyMine();
    let filter = null;
    CompetitionEntry.findOne = (f) => { filter = f; return chain(null); };

    await getJudgeEntry(req(MINE), response().res);

    assert.ok(filter._id, "the query must pin an id");
    assert.ok(filter._id.$in, "the query must restrict to the assigned set");
    assert.deepEqual(filter._id.$in.map(String), [MINE]);
    assert.equal(String(filter.competitionId), COMP, "and still be scoped to the competition");
  });

  test("an unassigned entry is a 404 even with its id in hand", async () => {
    // The gating property. A filter would merely hide it from a list; this must refuse it outright.
    assignOnlyMine();
    // The real query would find nothing, since THEIRS is not in the assigned $in.
    CompetitionEntry.findOne = (f) => chain(f._id?.$in?.map(String).includes(THEIRS) ? { _id: THEIRS } : null);

    const target = response();
    await getJudgeEntry(req(THEIRS), target.res);

    assert.equal(target.captured.status, 404);
  });

  test("no assignments means an EMPTY queue, never the whole competition", async () => {
    // The failure that would quietly undo the feature: falling back to "all entries" when nothing is
    // allocated yet puts every script back in front of every judge.
    JudgeEntryAssignment.find = () => chain([]);
    let filter = null;
    CompetitionEntry.find = (f) => { filter = f; return chain([]); };
    CompetitionEntry.countDocuments = () => Promise.resolve(0);
    JudgeScore.find = () => chain([]);
    JudgeNomination.find = () => chain([]);

    const target = response();
    await listJudgeEntries(req(), target.res);

    assert.deepEqual(filter._id.$in, [], "an empty assignment set must stay empty, not become unfiltered");
    assert.deepEqual(target.captured.body.entries, []);
  });

  test("the assignment lookup is scoped to the session judge, never the request", async () => {
    let assignFilter = null;
    JudgeEntryAssignment.find = (f) => { assignFilter = f; return chain([]); };
    CompetitionEntry.findOne = () => chain(null);

    await getJudgeEntry(
      { params: { competitionId: COMP, entryId: MINE }, body: { judgeId: "someone-else" }, user: { _id: JUDGE } },
      response().res
    );

    assert.equal(assignFilter.judge, JUDGE);
    assert.equal(String(assignFilter.competition), COMP);
  });

  test("still refuses entries that are not submitted", async () => {
    // Assignment narrows what a judge sees; it must not widen it to drafts.
    assignOnlyMine();
    let filter = null;
    CompetitionEntry.findOne = (f) => { filter = f; return chain(null); };

    await getJudgeEntry(req(MINE), response().res);

    assert.deepEqual(filter.status, { $in: ["submitted", "ai_processed", "judged"] });
  });

  test("the queue lists only assigned entries", async () => {
    assignOnlyMine();
    CompetitionEntry.find = () => chain([
      { _id: MINE, eventId: "CGSC-MINE", snapshot: { title: "Mine", fountainContent: "INT. X" } },
    ]);
    CompetitionEntry.countDocuments = () => Promise.resolve(1);
    JudgeScore.find = () => chain([]);
    JudgeNomination.find = () => chain([]);

    const target = response();
    await listJudgeEntries(req(), target.res);

    assert.equal(target.captured.body.entries.length, 1);
    assert.equal(target.captured.body.entries[0].eventId, "CGSC-MINE");
  });
});

describe("the gate is applied everywhere, asserted against the source", () => {
  test("every judge-facing entry query goes through judgeableFilter", () => {
    /*
     * The reason this is a source assertion rather than a behavioural one: a NEW handler added later
     * is exactly how a gate gets bypassed, and no behavioural test covers a function nobody has
     * written yet. Any direct CompetitionEntry query that skips the filter fails here.
     */
    const direct = [...controllerSource.matchAll(/CompetitionEntry\.(find|findOne|countDocuments|exists)\(/g)];
    assert.ok(direct.length >= 5, `expected the entry queries, found ${direct.length}`);

    for (const match of direct) {
      // Looks BACKWARDS as well as forwards: one call site resolves the filter into a `gate` const on
      // an earlier line and spreads it, which is still gated. A forward-only window would call that a
      // bypass and push someone to inline the call just to satisfy the test.
      const window = controllerSource.slice(Math.max(0, match.index - 400), match.index + 220);
      assert.match(
        window,
        /judgeableFilter\(|\.\.\.gate\b/,
        `an entry query bypasses the assignment gate:\n${controllerSource.slice(match.index, match.index + 160).split("\n").slice(0, 3).join("\n")}`
      );
    }
  });

  test("judgeableFilter restricts by assigned id, not just competition and status", () => {
    const start = controllerSource.indexOf("const judgeableFilter");
    assert.ok(start > -1);
    const body = controllerSource.slice(start, start + 600);
    assert.match(body, /_id: \{ \$in: await assignedEntryIds\(/);
  });

  test("progress counts what is assigned, not what exists", () => {
    // Counting every entry would tell a judge given three scripts that they are 3 of 40 done.
    assert.match(controllerSource, /JudgeEntryAssignment\.aggregate\(/);
    assert.equal(
      /CompetitionEntry\.aggregate\(/.test(controllerSource),
      false,
      "progress still counts all entries rather than the judge's own allocation"
    );
  });
});
