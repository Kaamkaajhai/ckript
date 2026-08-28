import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import CompetitionEntry from "../models/CompetitionEntry.js";
import CompetitionJudge from "../models/CompetitionJudge.js";
import JudgeScore from "../models/JudgeScore.js";
import JudgeNomination from "../models/JudgeNomination.js";
import judgeOnly, { requireJudgeAssignment } from "../middleware/judgeMiddleware.js";
import { getJudgeEntry } from "./judgeController.js";

const controllerSource = fs.readFileSync(new URL("./judgeController.js", import.meta.url), "utf8");
const routesSource = fs.readFileSync(new URL("../routes/judgeRoutes.js", import.meta.url), "utf8");

const originals = {
  entryFindOne: CompetitionEntry.findOne,
  judgeFindOne: CompetitionJudge.findOne,
  scoreFindOne: JudgeScore.findOne,
  nominationFind: JudgeNomination.find,
};

afterEach(() => {
  CompetitionEntry.findOne = originals.entryFindOne;
  CompetitionJudge.findOne = originals.judgeFindOne;
  JudgeScore.findOne = originals.scoreFindOne;
  JudgeNomination.find = originals.nominationFind;
});

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

/** A thenable stub standing in for a Mongoose query chain ending in .lean(). */
const leanResult = (value) => ({ lean: () => Promise.resolve(value), select: function () { return this; } });

describe("judgeOnly — who reaches the panel at all", () => {
  const call = (user) => {
    const target = response();
    let nexted = false;
    judgeOnly({ user }, target.res, () => { nexted = true; });
    return { ...target, nexted };
  };

  test("admits a judge", () => {
    assert.equal(call({ role: "judge" }).nexted, true);
  });

  test("refuses an admin", () => {
    // Deliberate divergence from financeOnly, which DOES admit admin. These routes write: an admin
    // posting a score would create a row carrying their own id, and it would then be averaged into
    // the panel's result as a judge nobody assigned.
    const result = call({ role: "admin" });
    assert.equal(result.nexted, false);
    assert.equal(result.captured.status, 403);
  });

  test("refuses finance, a writer, and an unauthenticated request", () => {
    for (const user of [{ role: "finance" }, { role: "creator" }, { role: "producer" }, null, undefined]) {
      const result = call(user);
      assert.equal(result.nexted, false, `role ${user?.role ?? user} should not reach the judge panel`);
      assert.equal(result.captured.status, 403);
    }
  });

  test("refuses a role that merely contains the word judge", () => {
    assert.equal(call({ role: "judgemental" }).nexted, false);
    assert.equal(call({ role: "Judge" }).nexted, false);
  });
});

describe("requireJudgeAssignment — judging THIS competition", () => {
  test("passes a judge with an active seat, and attaches it", async () => {
    const assignment = { _id: "a1", competition: "c1", judge: "j1", status: "active" };
    CompetitionJudge.findOne = () => leanResult(assignment);

    const req = { params: { competitionId: "c1" }, user: { _id: "j1" } };
    const target = response();
    let nexted = false;
    await requireJudgeAssignment(req, target.res, () => { nexted = true; });

    assert.equal(nexted, true);
    assert.deepEqual(req.judgeAssignment, assignment);
  });

  test("answers 404, NOT 403, for a competition the judge is not on", async () => {
    // A 403 would confirm the competition exists, letting an assigned judge walk ObjectIds and
    // enumerate every unannounced competition on the platform. Off-panel must be indistinguishable
    // from not there.
    CompetitionJudge.findOne = () => leanResult(null);

    const target = response();
    let nexted = false;
    await requireJudgeAssignment({ params: { competitionId: "c2" }, user: { _id: "j1" } }, target.res, () => { nexted = true; });

    assert.equal(nexted, false);
    assert.equal(target.captured.status, 404);
    assert.match(target.captured.body.message, /not found/i);
  });

  test("only ever looks for an ACTIVE seat, so revoking takes effect on the next request", async () => {
    let filter = null;
    CompetitionJudge.findOne = (f) => { filter = f; return leanResult(null); };

    await requireJudgeAssignment({ params: { competitionId: "c1" }, user: { _id: "j1" } }, response().res, () => {});

    assert.equal(filter.status, "active");
    assert.equal(filter.judge, "j1");
    assert.equal(filter.competition, "c1");
  });

  test("scopes to the CALLER, never to an id from the request", async () => {
    let filter = null;
    CompetitionJudge.findOne = (f) => { filter = f; return leanResult(null); };

    await requireJudgeAssignment(
      { params: { competitionId: "c1" }, body: { judgeId: "someone-else" }, query: { judge: "someone-else" }, user: { _id: "j1" } },
      response().res,
      () => {}
    );

    assert.equal(filter.judge, "j1");
  });

  test("a thrown query is a 500, not an open door", async () => {
    CompetitionJudge.findOne = () => { throw new Error("mongo down"); };

    const target = response();
    let nexted = false;
    await requireJudgeAssignment({ params: { competitionId: "c1" }, user: { _id: "j1" } }, target.res, () => { nexted = true; });

    assert.equal(nexted, false);
    assert.equal(target.captured.status, 500);
  });
});

describe("entry reads are scoped to the competition (IDOR)", () => {
  test("an entry is queried by BOTH ids, never by _id alone", async () => {
    let filter = null;
    CompetitionEntry.findOne = (f) => { filter = f; return leanResult(null); };

    const validEntry = "507f1f77bcf86cd799439011";
    const validComp = "507f1f77bcf86cd799439012";
    const target = response();
    await getJudgeEntry({ params: { competitionId: validComp, entryId: validEntry }, user: { _id: "j1" } }, target.res);

    assert.notEqual(filter, null, "the entry query never ran");
    assert.ok(filter._id, "query must pin the entry id");
    assert.ok(filter.competitionId, "query must ALSO pin the competition — otherwise a judge on A reads B's entries");
    assert.equal(target.captured.status, 404);
  });

  test("only submitted entries are visible — a draft is not a submission", async () => {
    let filter = null;
    CompetitionEntry.findOne = (f) => { filter = f; return leanResult(null); };

    await getJudgeEntry(
      { params: { competitionId: "507f1f77bcf86cd799439012", entryId: "507f1f77bcf86cd799439011" }, user: { _id: "j1" } },
      response().res
    );

    assert.deepEqual(filter.status, { $in: ["submitted", "ai_processed", "judged"] });
  });

  test("a malformed entry id is a 404 before Mongo is touched", async () => {
    CompetitionEntry.findOne = () => { throw new Error("must not query"); };

    const target = response();
    await getJudgeEntry({ params: { competitionId: "507f1f77bcf86cd799439012", entryId: "not-an-id" }, user: { _id: "j1" } }, target.res);

    assert.equal(target.captured.status, 404);
  });

  test("a judge's own score and nominations are read by their session id", async () => {
    const entry = { _id: "e1", eventId: "CGSC-1", snapshot: { title: "T", fountainContent: "INT. X" } };
    CompetitionEntry.findOne = () => leanResult(entry);
    let scoreFilter = null;
    let nominationFilter = null;
    JudgeScore.findOne = (f) => { scoreFilter = f; return leanResult(null); };
    JudgeNomination.find = (f) => { nominationFilter = f; return leanResult([]); };

    const target = response();
    await getJudgeEntry(
      { params: { competitionId: "507f1f77bcf86cd799439012", entryId: "507f1f77bcf86cd799439011" }, user: { _id: "j1" } },
      target.res
    );

    assert.equal(scoreFilter.judge, "j1");
    assert.equal(nominationFilter.judge, "j1");
    // And the entry came back through the projection, not raw.
    assert.deepEqual(Object.keys(target.captured.body.entry).sort(), ["body", "eventId", "id", "pageCount", "sceneCount", "title", "wordCount"]);
  });
});

describe("the judge controller's standing rules, asserted against its own source", () => {
  test("never populates — a populate is how the writer's name reaches a judge", () => {
    // Scoped to entry queries: populating the judge's OWN user record would be harmless, but there
    // is no reason to do it either, so the flat rule is easier to keep than a nuanced one.
    assert.equal(
      /CompetitionEntry[\s\S]{0,400}?\.populate\(/.test(controllerSource),
      false,
      "judgeController populates a CompetitionEntry query — the projection cannot protect what populate attaches"
    );
  });

  test("returns entries only through toJudgeEntryView", () => {
    assert.match(controllerSource, /import \{ toJudgeEntryView/);
    // Every place an entry reaches a response goes through the projection. If a raw `entry` is ever
    // handed to res.json, this is the line that should start failing.
    assert.equal(
      /res\.json\(\{[^}]*\bentry\b\s*[,}]/.test(controllerSource),
      false,
      "an entry is being returned without passing through toJudgeEntryView"
    );
  });

  test("scopes every score and nomination query to the session judge", () => {
    // Matched by scanning forward from each call site rather than trying to balance braces with a
    // regex — a filter like `{ competition: { $in: ids }, judge: ... }` nests, and a [^}]* pattern
    // silently truncates at the inner brace and then "passes" for the wrong reason.
    const callSites = [...controllerSource.matchAll(
      /Judge(?:Score|Nomination)\.(?:find|findOne|findOneAndUpdate|deleteOne|countDocuments)\(/g
    )];
    assert.ok(callSites.length >= 6, `expected the judge's own score/nomination queries, found ${callSites.length}`);

    for (const site of callSites) {
      const window = controllerSource.slice(site.index, site.index + 260);
      assert.match(
        window,
        /judge: req\.user\._id/,
        `unscoped judge query — a judge must only ever read their own opinions:\n${window.split("\n").slice(0, 4).join("\n")}`
      );
    }
  });

  test("has no route that could serve an aggregate or another judge's opinion", () => {
    // Note what is NOT forbidden: CompetitionEntry.aggregate, which counts how many entries exist so
    // a judge can see their own progress. Counting entries is not reading opinions.
    for (const forbidden of ["leaderboard", "buildJudgingLeaderboard", "tallyNominations", "JudgeScore.aggregate", "judgeAggregate"]) {
      assert.equal(
        controllerSource.includes(forbidden),
        false,
        `judgeController references ${forbidden} — a judge must not see the panel's aggregate`
      );
    }
  });
});

describe("judge routes are gated", () => {
  test("the router applies protect and judgeOnly to everything", () => {
    assert.match(routesSource, /router\.use\(protect, judgeOnly\)/);
  });

  test("every competition-scoped route also carries requireJudgeAssignment", () => {
    const routes = routesSource.match(/router\.(get|put|post|delete)\([^\n]*\)/g) || [];
    const scoped = routes.filter((r) => r.includes(":competitionId"));
    assert.ok(scoped.length >= 7, `expected the competition-scoped routes, found ${scoped.length}`);
    for (const route of scoped) {
      assert.match(route, /requireJudgeAssignment/, `unscoped route: ${route}`);
    }
  });

  test("no admin controller is reachable from the judge router", () => {
    assert.equal(/controllers\/(admin|competitionAdmin|competitionJudgingAdmin)/.test(routesSource), false);
  });
});
