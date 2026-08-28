/**
 * End-to-end smoke test for the judge panel, against a REAL database.
 *
 * Every other test for this feature is a pure function or a stubbed handler — fast, and blind to
 * everything Mongo actually does: the unique indexes, the Map field round-trip, the pre-save
 * password hook, the populate paths. This exercises those.
 *
 * Run it:
 *     cd server && node scripts/judgePanelSmoke.js
 *
 * It uses MONGO_URI from your .env, exactly like the server does. Every document it creates is
 * prefixed `smoke-judge-` and deleted at the end, pass or fail — including on Ctrl+C. It does NOT
 * touch existing data: no updates, no deletes, outside the documents it made itself.
 *
 * Add --keep to leave the seeded competition, judge and entries in place so you can click through
 * the UI with them.
 */

import "dotenv/config";
import mongoose from "mongoose";

import User from "../models/User.js";
import Competition from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import CompetitionJudge from "../models/CompetitionJudge.js";
import JudgeScore from "../models/JudgeScore.js";
import JudgeNomination from "../models/JudgeNomination.js";
import { toJudgeEntryView } from "../utils/judgeEntryView.js";
import { buildJudgingLeaderboard, tallyNominations } from "../utils/judgeAggregate.js";

const KEEP = process.argv.includes("--keep");
const TAG = "smoke-judge-";

let passed = 0;
let failed = 0;
const check = (label, condition, detail = "") => {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
};

const created = { users: [], competitions: [], entries: [], judges: [], scores: [], nominations: [] };

const cleanup = async () => {
  // Nothing to remove, and nothing to remove it with. Without this, a run that failed to connect
  // still issues deletes, which Mongoose buffers for ten seconds before timing out — so the actual
  // error (a bad MONGO_URI) ends up buried under a misleading one about deleteMany.
  if (mongoose.connection.readyState !== 1) return;
  if (!Object.values(created).some((ids) => ids.length)) return;

  if (KEEP) {
    console.log("\n--keep: leaving seeded data in place.");
    console.log(`  Competition: ${created.competitions[0]}`);
    console.log(`  Judge login: ${TAG}judge@example.com`);
    return;
  }
  await Promise.all([
    JudgeScore.deleteMany({ _id: { $in: created.scores } }),
    JudgeNomination.deleteMany({ _id: { $in: created.nominations } }),
    CompetitionJudge.deleteMany({ _id: { $in: created.judges } }),
    CompetitionEntry.deleteMany({ _id: { $in: created.entries } }),
    Competition.deleteMany({ _id: { $in: created.competitions } }),
    User.deleteMany({ _id: { $in: created.users } }),
  ]);
  console.log("\nSeeded data removed.");
};

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is not set — this script reads the same .env the server does.");

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  // ── Seed ────────────────────────────────────────────────────────────────
  console.log("Seeding");

  const writer = await User.create({
    name: "Smoke Writer", email: `${TAG}writer@example.com`,
    password: "Smoke!Pass9", role: "creator", emailVerified: true,
  });
  const judge = await User.create({
    name: "Smoke Judge", email: `${TAG}judge@example.com`,
    password: "Smoke!Pass9", role: "judge", emailVerified: true,
  });
  const otherJudge = await User.create({
    name: "Smoke Judge Two", email: `${TAG}judge2@example.com`,
    password: "Smoke!Pass9", role: "judge", emailVerified: true,
  });
  created.users.push(writer._id, judge._id, otherJudge._id);

  check("a judge account's password is stored hashed, never in plain text",
    judge.password !== "Smoke!Pass9" && judge.password.startsWith("$2"),
    `stored: ${String(judge.password).slice(0, 12)}…`);

  const now = Date.now();
  const day = 86_400_000;
  // Dated so getCompetitionPhase() derives "judging": submissions have closed, results are not out.
  const competition = await Competition.create({
    name: `${TAG}Challenge`, slug: `${TAG}challenge-${now}`,
    dates: {
      regOpensAt: new Date(now - 10 * day), regClosesAt: new Date(now - 5 * day),
      startsAt: new Date(now - 4 * day), endsAt: new Date(now - day),
    },
    judging: {
      scale: 10,
      criteria: [
        { key: "structure", label: "Structure", weight: 3, order: 0 },
        { key: "dialogue", label: "Dialogue", weight: 2, order: 1 },
        { key: "originality", label: "Originality", weight: 1, order: 2 },
      ],
      awards: [{ key: "dialogue-award", label: "Best Dialogue", order: 0 }],
    },
  });
  created.competitions.push(competition._id);

  const secondCompetition = await Competition.create({
    name: `${TAG}Other`, slug: `${TAG}other-${now}`,
    dates: {
      regOpensAt: new Date(now - 10 * day), regClosesAt: new Date(now - 5 * day),
      startsAt: new Date(now - 4 * day), endsAt: new Date(now - day),
    },
  });
  created.competitions.push(secondCompetition._id);

  // An entry carrying every identifying field, plus a TYPED-IN Fountain title page.
  const entryA = await CompetitionEntry.create({
    competitionId: competition._id, userId: writer._id, eventId: `${TAG}A1`,
    status: "submitted", submittedAt: new Date(now - 2 * day),
    registration: { country: "India", city: "Kochi", portfolioUrl: "https://smoke-writer.example.com" },
    payment: { orderId: "order_SMOKE_LEAK", paymentId: "pay_SMOKE_LEAK", amount: 499 },
    ai: { evaluation: { overall: 91, notes: "AI thinks this is strong" } },
    snapshot: {
      title: "The Last Monsoon",
      logline: `A village resurfaces. Written by ${writer.name}.`,
      synopsis: `Reach me at ${writer.email}.`,
      fountainContent: `Title: The Last Monsoon\nAuthor: ${writer.name}\nContact: ${writer.email}\n\nINT. FERRY JETTY - DAWN\n\nRain hammers the tin roof.`,
      textContent: "INT. FERRY JETTY - DAWN",
      pageCount: 12, wordCount: 2780, sceneCount: 9,
    },
  });
  const entryB = await CompetitionEntry.create({
    competitionId: competition._id, userId: writer._id, eventId: `${TAG}B2`,
    status: "submitted", submittedAt: new Date(now - 2 * day),
    snapshot: { title: "Second Script", fountainContent: "INT. KITCHEN - NIGHT", pageCount: 8, wordCount: 1900, sceneCount: 5 },
  });
  const draft = await CompetitionEntry.create({
    competitionId: competition._id, userId: otherJudge._id, eventId: `${TAG}D3`,
    status: "registered",
    snapshot: { title: "Not Submitted", fountainContent: "INT. NOWHERE - DAY" },
  });
  const foreign = await CompetitionEntry.create({
    competitionId: secondCompetition._id, userId: writer._id, eventId: `${TAG}F4`,
    status: "submitted",
    snapshot: { title: "Other Competition", fountainContent: "INT. ELSEWHERE - DAY" },
  });
  created.entries.push(entryA._id, entryB._id, draft._id, foreign._id);

  const assignment = await CompetitionJudge.create({
    competition: competition._id, judge: judge._id, assignedBy: judge._id, status: "active",
  });
  created.judges.push(assignment._id);

  console.log("\nAnonymisation (the guarantee)");

  const view = toJudgeEntryView(entryA.toObject());
  const serialised = JSON.stringify(view);
  check("the writer's name never reaches the judge's view", !serialised.includes(writer.name));
  check("the writer's email never reaches the judge's view", !serialised.includes(writer.email));
  check("payment ids never reach the judge's view", !serialised.includes("order_SMOKE_LEAK") && !serialised.includes("pay_SMOKE_LEAK"));
  check("registration answers never reach the judge's view", !serialised.includes("Kochi"));
  check("the AI evaluation never reaches the judge's view", !serialised.includes("AI thinks this is strong"));
  check("logline and synopsis are withheld", !("logline" in view) && !("synopsis" in view));
  check("a typed-in Fountain title page is stripped from the body", !view.body.includes(writer.name) && view.body.startsWith("INT. FERRY JETTY"));
  check("the entry code and title survive, so the judge has something to work with", view.eventId === `${TAG}A1` && view.title === "The Last Monsoon");

  console.log("\nDatabase constraints (what stubs cannot test)");

  const score = await JudgeScore.create({
    competition: competition._id, entry: entryA._id, judge: judge._id,
    scores: { structure: 10, dialogue: 6, originality: 8 },
    status: "submitted", submittedAt: new Date(),
  });
  created.scores.push(score._id);

  const reread = await JudgeScore.findById(score._id).lean();
  const marks = reread.scores instanceof Map ? Object.fromEntries(reread.scores) : reread.scores;
  check("a Map of criterion marks round-trips through Mongo intact",
    Number(marks.structure) === 10 && Number(marks.dialogue) === 6 && Number(marks.originality) === 8,
    `read back: ${JSON.stringify(marks)}`);

  let duplicateRejected = false;
  try {
    await JudgeScore.create({ competition: competition._id, entry: entryA._id, judge: judge._id, scores: { structure: 1 } });
  } catch (error) {
    duplicateRejected = error?.code === 11000;
  }
  check("a second score for the same (entry, judge) is refused by the unique index", duplicateRejected);

  const nomination = await JudgeNomination.create({
    competition: competition._id, entry: entryA._id, judge: judge._id,
    awardKey: "dialogue-award", reason: "Every line earns its place",
  });
  created.nominations.push(nomination._id);

  let dupeNomination = false;
  try {
    await JudgeNomination.create({
      competition: competition._id, entry: entryB._id, judge: judge._id,
      awardKey: "dialogue-award", reason: "Second nomination, same category",
    });
  } catch (error) {
    dupeNomination = error?.code === 11000;
  }
  check("a judge cannot nominate twice in one award category", dupeNomination);

  let dupeAssignment = false;
  try {
    await CompetitionJudge.create({ competition: competition._id, judge: judge._id, assignedBy: judge._id });
  } catch (error) {
    dupeAssignment = error?.code === 11000;
  }
  check("a judge cannot hold two seats on the same panel", dupeAssignment);

  console.log("\nScoping (what a judge can actually load)");

  const JUDGEABLE = { $in: ["submitted", "ai_processed", "judged"] };
  const queue = await CompetitionEntry.find({ competitionId: competition._id, status: JUDGEABLE }).lean();
  check("the queue shows submitted entries only — a draft is not a submission",
    queue.length === 2 && !queue.some((e) => String(e._id) === String(draft._id)));

  const crossRead = await CompetitionEntry.findOne({ _id: foreign._id, competitionId: competition._id, status: JUDGEABLE }).lean();
  check("an entry id from another competition cannot be read through this one (IDOR)", crossRead === null);

  const offPanel = await CompetitionJudge.findOne({ competition: secondCompetition._id, judge: judge._id, status: "active" }).lean();
  check("the judge has no seat on the competition they were not assigned to", offPanel === null);

  await CompetitionJudge.updateOne({ _id: assignment._id }, { $set: { status: "revoked" } });
  const afterRevoke = await CompetitionJudge.findOne({ competition: competition._id, judge: judge._id, status: "active" }).lean();
  check("revoking a seat takes effect immediately on the next lookup", afterRevoke === null);
  await CompetitionJudge.updateOne({ _id: assignment._id }, { $set: { status: "active" } });

  const survived = await JudgeScore.countDocuments({ _id: score._id });
  check("a revoked judge's submitted score survives the revocation", survived === 1);

  console.log("\nAggregation (real documents, not fixtures)");

  const secondScore = await JudgeScore.create({
    competition: competition._id, entry: entryA._id, judge: otherJudge._id,
    scores: { structure: 6, dialogue: 8, originality: 4 },
    status: "submitted", submittedAt: new Date(),
  });
  created.scores.push(secondScore._id);

  const entries = await CompetitionEntry.find({ competitionId: competition._id, status: JUDGEABLE }).lean();
  const scores = await JudgeScore.find({ competition: competition._id }).lean();
  const { rows, meta } = buildJudgingLeaderboard(competition.judging, entries, scores);
  const rowA = rows.find((r) => String(r.entryId) === String(entryA._id));

  // judge 1: (10/10)*.5 + (6/10)*(1/3) + (8/10)*(1/6) = 50 + 20 + 13.33 = 83.33
  // judge 2: (6/10)*.5  + (8/10)*(1/3) + (4/10)*(1/6) = 30 + 26.67 + 6.67 = 63.33
  // mean = 73.33
  check("the weighted mean matches the hand calculation",
    Math.abs(rowA.weightedMean - 73.33) < 0.02, `got ${rowA.weightedMean}, expected ~73.33`);
  check("both judges are counted", rowA.judgeCount === 2);
  check("disagreement is reported as spread", Math.abs(rowA.spread - 20) < 0.02, `got ${rowA.spread}`);
  check("an entry nobody scored stays in the table but out of the ranking",
    rows.some((r) => String(r.entryId) === String(entryB._id) && r.weightedMean === null && r.suggestedRank === null));
  check("the scored entry ranks first", rowA.suggestedRank === 1);
  check("meta counts the panel", meta.judgeCount === 2 && meta.scoredEntryCount === 1 && meta.entryCount === 2);

  const nominations = await JudgeNomination.find({ competition: competition._id }).lean();
  const [award] = tallyNominations(competition.judging.awards, nominations, entries);
  check("the nomination tally names a clear leader",
    award.suggested && String(award.suggested.entryId) === String(entryA._id) && !award.tied);

  console.log("\nDrafts");
  const draftScore = await JudgeScore.create({
    competition: competition._id, entry: entryB._id, judge: judge._id,
    scores: { structure: 9 }, status: "draft",
  });
  created.scores.push(draftScore._id);
  const withDraft = buildJudgingLeaderboard(
    competition.judging, entries, await JudgeScore.find({ competition: competition._id }).lean()
  );
  check("a draft is excluded from the aggregate",
    withDraft.rows.find((r) => String(r.entryId) === String(entryB._id)).weightedMean === null);
  check("but the draft is counted for the admin's progress view", withDraft.meta.draftScoreCount === 1);
};

// The docblock promises cleanup on Ctrl+C, so it has to actually happen: an interrupted run that
// leaves smoke-judge- documents behind is exactly the mess the promise is about.
let interrupted = false;
process.on("SIGINT", async () => {
  if (interrupted) process.exit(130);   // a second Ctrl+C means "stop waiting and go"
  interrupted = true;
  console.log("\n\nInterrupted — removing seeded data…");
  try { await cleanup(); } catch (e) { console.error("Cleanup failed:", e?.message || e); }
  await mongoose.disconnect().catch(() => {});
  process.exit(130);
});

let exitCode = 0;
try {
  await run();
} catch (error) {
  console.error("\nSmoke run failed:", error?.message || error);
  exitCode = 1;
} finally {
  try { await cleanup(); } catch (e) { console.error("Cleanup failed:", e?.message || e); }
  await mongoose.disconnect().catch(() => {});
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : exitCode);
