import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildJudgingLeaderboard,
  normaliseWeights,
  scoreToTotal,
  tallyNominations,
} from "./judgeAggregate.js";

const criteria = [
  { key: "structure", label: "Structure", weight: 3 },
  { key: "dialogue", label: "Dialogue", weight: 2 },
  { key: "originality", label: "Originality", weight: 1 },
];

const entry = (id, eventId, title) => ({ _id: id, eventId, snapshot: { title } });

const score = (entryId, judgeId, marks, status = "submitted") => ({
  entry: entryId,
  judge: judgeId,
  scores: marks,
  status,
});

describe("weight normalisation", () => {
  test("turns relative weights into fractions that sum to 1", () => {
    const w = normaliseWeights(criteria);

    assert.equal(w.structure, 0.5);
    assert.equal(w.dialogue, 1 / 3);
    assert.equal(w.originality, 1 / 6);
    assert.equal(Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) < 1e-9, true);
  });

  test("treats an all-zero rubric as equal weighting rather than dividing by zero", () => {
    const w = normaliseWeights([{ key: "a", weight: 0 }, { key: "b", weight: 0 }]);

    assert.deepEqual(w, { a: 0.5, b: 0.5 });
  });

  test("treats missing and negative weights as zero", () => {
    const w = normaliseWeights([{ key: "a", weight: 2 }, { key: "b" }, { key: "c", weight: -5 }]);

    assert.equal(w.a, 1);
    assert.equal(w.b, 0);
    assert.equal(w.c, 0);
  });

  test("returns nothing for a rubric with no criteria", () => {
    assert.deepEqual(normaliseWeights([]), {});
    assert.deepEqual(normaliseWeights(), {});
  });
});

describe("one judge's total", () => {
  test("scales a full-marks score to 100", () => {
    const result = scoreToTotal({ scores: { structure: 10, dialogue: 10, originality: 10 } }, criteria, 10);

    assert.equal(result.total, 100);
    assert.equal(result.complete, true);
  });

  test("applies the weights rather than averaging the marks", () => {
    // 10 on the half-weighted criterion, 0 elsewhere → 50, not the flat mean of 33.33.
    const result = scoreToTotal({ scores: { structure: 10, dialogue: 0, originality: 0 } }, criteria, 10);

    assert.equal(result.total, 50);
  });

  test("renormalises across what was marked instead of imputing zero", () => {
    // Only `dialogue`, full marks. Counting the two unmarked criteria as zero would give 33.33 —
    // punishing the entry for a criterion this judge never addressed.
    const result = scoreToTotal({ scores: { dialogue: 10 } }, criteria, 10);

    assert.equal(result.total, 100);
    assert.equal(result.complete, false);
    assert.deepEqual(result.scored, ["dialogue"]);
  });

  test("honours a non-default scale", () => {
    const result = scoreToTotal({ scores: { structure: 50, dialogue: 50, originality: 50 } }, criteria, 100);

    assert.equal(result.total, 50);
  });

  test("clamps a mark above the scale rather than letting it exceed 100", () => {
    const result = scoreToTotal({ scores: { structure: 999, dialogue: 10, originality: 10 } }, criteria, 10);

    assert.equal(result.total, 100);
  });

  test("reads a Mongoose Map as readily as a lean plain object", () => {
    const asMap = new Map([["structure", 10], ["dialogue", 10], ["originality", 10]]);

    assert.equal(scoreToTotal({ scores: asMap }, criteria, 10).total, 100);
  });

  test("returns null when nothing was marked at all", () => {
    assert.equal(scoreToTotal({ scores: {} }, criteria, 10), null);
    assert.equal(scoreToTotal({}, criteria, 10), null);
    assert.equal(scoreToTotal({ scores: { structure: 10 } }, [], 10), null);
  });
});

describe("leaderboard", () => {
  const entries = [entry("e1", "CGSC-1", "One"), entry("e2", "CGSC-2", "Two"), entry("e3", "CGSC-3", "Three")];

  test("averages judges rather than summing them", () => {
    const scores = [
      score("e1", "j1", { structure: 10, dialogue: 10, originality: 10 }),  // 100
      score("e1", "j2", { structure: 0, dialogue: 0, originality: 0 }),     // 0
      // e2 read by ONE judge who loved it. A sum would put e2 (100) above e1 (100 total from two).
      score("e2", "j1", { structure: 10, dialogue: 10, originality: 10 }),  // 100
    ];

    const { rows } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);
    const byId = Object.fromEntries(rows.map((r) => [r.entryId, r]));

    assert.equal(byId.e1.weightedMean, 50);
    assert.equal(byId.e1.judgeCount, 2);
    assert.equal(byId.e2.weightedMean, 100);
    assert.equal(byId.e2.judgeCount, 1);
  });

  test("surfaces disagreement as spread", () => {
    const scores = [
      score("e1", "j1", { structure: 10, dialogue: 10, originality: 10 }),
      score("e1", "j2", { structure: 0, dialogue: 0, originality: 0 }),
    ];

    const { rows } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);

    assert.equal(rows.find((r) => r.entryId === "e1").spread, 100);
  });

  test("ignores drafts — a judge thinking is not a judge deciding", () => {
    const scores = [
      score("e1", "j1", { structure: 10, dialogue: 10, originality: 10 }, "draft"),
      score("e1", "j2", { structure: 0, dialogue: 0, originality: 0 }, "submitted"),
    ];

    const { rows, meta } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);

    assert.equal(rows.find((r) => r.entryId === "e1").weightedMean, 0);
    assert.equal(rows.find((r) => r.entryId === "e1").judgeCount, 1);
    assert.equal(meta.draftScoreCount, 1);
    assert.equal(meta.submittedScoreCount, 1);
  });

  test("ranks 1, 2, 2, 4 and names who is tied with whom", () => {
    const full = { structure: 10, dialogue: 10, originality: 10 };
    const half = { structure: 5, dialogue: 5, originality: 5 };
    const none = { structure: 0, dialogue: 0, originality: 0 };
    const four = [...entries, entry("e4", "CGSC-4", "Four")];
    const scores = [
      score("e1", "j1", full),   // 100 → rank 1
      score("e2", "j1", half),   // 50  → rank 2
      score("e3", "j1", half),   // 50  → rank 2
      score("e4", "j1", none),   // 0   → rank 4
    ];

    const { rows, meta } = buildJudgingLeaderboard({ criteria, scale: 10 }, four, scores);
    const byId = Object.fromEntries(rows.map((r) => [r.entryId, r]));

    assert.equal(byId.e1.suggestedRank, 1);
    assert.equal(byId.e2.suggestedRank, 2);
    assert.equal(byId.e3.suggestedRank, 2);
    assert.equal(byId.e4.suggestedRank, 4);
    assert.deepEqual(byId.e2.tiedWith, ["e3"]);
    assert.deepEqual(byId.e3.tiedWith, ["e2"]);
    assert.deepEqual(byId.e1.tiedWith, []);
    assert.equal(meta.hasTies, true);
  });

  test("never breaks a tie on its own, even when the signals differ", () => {
    // Same mean, wildly different agreement. A machine could "helpfully" prefer the consensus pick;
    // it must not — the admin decides, and gets the spread to decide with.
    const scores = [
      score("e1", "j1", { structure: 5, dialogue: 5, originality: 5 }),
      score("e1", "j2", { structure: 5, dialogue: 5, originality: 5 }),
      score("e2", "j1", { structure: 10, dialogue: 10, originality: 10 }),
      score("e2", "j2", { structure: 0, dialogue: 0, originality: 0 }),
    ];

    const { rows } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);
    const byId = Object.fromEntries(rows.map((r) => [r.entryId, r]));

    assert.equal(byId.e1.weightedMean, byId.e2.weightedMean);
    assert.equal(byId.e1.suggestedRank, byId.e2.suggestedRank);
    assert.equal(byId.e1.spread, 0);
    assert.equal(byId.e2.spread, 100);
  });

  test("keeps unscored entries in the table but out of the ranking", () => {
    const scores = [score("e1", "j1", { structure: 10, dialogue: 10, originality: 10 })];

    const { rows, meta } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);

    assert.equal(rows.length, 3);
    const unscored = rows.filter((r) => r.weightedMean === null);
    assert.equal(unscored.length, 2);
    // Not ranked last — they were never judged, which is different from judged badly.
    assert.equal(unscored.every((r) => r.suggestedRank === null), true);
    assert.equal(rows[0].entryId, "e1", "scored entries sort above unscored ones");
    assert.equal(meta.scoredEntryCount, 1);
    assert.equal(meta.entryCount, 3);
  });

  test("works for a single-judge panel", () => {
    const scores = [score("e1", "j1", { structure: 10, dialogue: 0, originality: 0 })];

    const { rows, meta } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);

    assert.equal(rows.find((r) => r.entryId === "e1").weightedMean, 50);
    assert.equal(rows.find((r) => r.entryId === "e1").spread, 0);
    assert.equal(meta.judgeCount, 1);
  });

  test("reports per-criterion means so an admin can see where a script won", () => {
    const scores = [
      score("e1", "j1", { structure: 10, dialogue: 2, originality: 6 }),
      score("e1", "j2", { structure: 8, dialogue: 4, originality: 6 }),
    ];

    const { rows } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);
    const row = rows.find((r) => r.entryId === "e1");

    assert.deepEqual(row.perCriterion.structure, { mean: 9, min: 8, max: 10, count: 2 });
    assert.deepEqual(row.perCriterion.dialogue, { mean: 3, min: 2, max: 4, count: 2 });
    assert.deepEqual(row.perCriterion.originality, { mean: 6, min: 6, max: 6, count: 2 });
  });

  test("flags an entry whose scores were cast against only part of the rubric", () => {
    const scores = [score("e1", "j1", { structure: 10 })];

    const { rows } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, scores);

    assert.equal(rows.find((r) => r.entryId === "e1").partialScores, true);
  });

  test("degrades to an empty ranking rather than throwing on an unconfigured competition", () => {
    const { rows, meta } = buildJudgingLeaderboard({}, entries, []);

    assert.equal(rows.length, 3);
    assert.equal(rows.every((r) => r.weightedMean === null), true);
    assert.equal(meta.judgeCount, 0);
    assert.deepEqual(buildJudgingLeaderboard().rows, []);
  });

  test("reports the normalised weights as percentages for display", () => {
    const { meta } = buildJudgingLeaderboard({ criteria, scale: 10 }, entries, []);

    assert.deepEqual(meta.criteria, [
      { key: "structure", label: "Structure", weight: 50 },
      { key: "dialogue", label: "Dialogue", weight: 33.33 },
      { key: "originality", label: "Originality", weight: 16.67 },
    ]);
  });
});

describe("nomination tally", () => {
  const awards = [{ key: "dialogue", label: "Best Dialogue" }, { key: "premise", label: "Boldest Premise" }];
  const entries = [entry("e1", "CGSC-1", "One"), entry("e2", "CGSC-2", "Two")];

  test("counts nominations per category and suggests a clear leader", () => {
    const noms = [
      { awardKey: "dialogue", entry: "e1", judge: "j1", reason: "Every line earns its place" },
      { awardKey: "dialogue", entry: "e1", judge: "j2", reason: "Distinct voices" },
      { awardKey: "dialogue", entry: "e2", judge: "j3", reason: "Sharp" },
    ];

    const [dialogue] = tallyNominations(awards, noms, entries);

    assert.equal(dialogue.nominations[0].entryId, "e1");
    assert.equal(dialogue.nominations[0].count, 2);
    assert.equal(dialogue.nominations[0].eventId, "CGSC-1");
    assert.equal(dialogue.suggested.entryId, "e1");
    assert.equal(dialogue.tied, false);
    assert.deepEqual(dialogue.nominations[0].reasons, ["Every line earns its place", "Distinct voices"]);
  });

  test("suggests nothing when a category is tied", () => {
    const noms = [
      { awardKey: "dialogue", entry: "e1", judge: "j1" },
      { awardKey: "dialogue", entry: "e2", judge: "j2" },
    ];

    const [dialogue] = tallyNominations(awards, noms, entries);

    assert.equal(dialogue.suggested, null);
    assert.equal(dialogue.tied, true);
  });

  test("returns an empty category rather than omitting it", () => {
    const [, premise] = tallyNominations(awards, [{ awardKey: "dialogue", entry: "e1" }], entries);

    assert.equal(premise.key, "premise");
    assert.deepEqual(premise.nominations, []);
    assert.equal(premise.suggested, null);
    assert.equal(premise.tied, false);
  });
});
