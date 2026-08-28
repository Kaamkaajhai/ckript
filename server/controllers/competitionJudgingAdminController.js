import crypto from "crypto";
import User from "../models/User.js";
import Competition from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import CompetitionJudge from "../models/CompetitionJudge.js";
import JudgeScore from "../models/JudgeScore.js";
import JudgeNomination from "../models/JudgeNomination.js";
import { buildJudgingLeaderboard, tallyNominations } from "../utils/judgeAggregate.js";
import { toJudgeEntryView, JUDGEABLE_STATUSES } from "../utils/judgeEntryView.js";
import { asObjectId, asTrimmedString, asInt } from "../utils/requestValue.js";

/**
 * Admin side of the judge panel: creating judge logins, assigning them to competitions, defining the
 * rubric, and reading back what the panel decided.
 *
 * Kept out of competitionAdminController.js on purpose. That file is already large and owns
 * `adminDeclareResults` — the one irreversible action in the product, whose grant loop hands out
 * subscriptions and badges. Nothing here touches it: this controller SUGGESTS a ranking, and the
 * existing declare endpoint remains the only thing that writes an award.
 */

const LOWER = "abcdefghijkmnopqrstuvwxyz";   // no l
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";    // no I, O
const DIGIT = "23456789";                    // no 0, 1
const SYMBOL = "!@#$%^&*-_=+";

/**
 * A password the admin reads off the screen once and passes to the judge.
 *
 * Ambiguous glyphs are excluded because this password gets transcribed by a human at least once, and
 * an l/1/I mix-up turns into a support conversation. `crypto.randomInt` rather than Math.random —
 * this is a credential, and the difference costs nothing.
 *
 * Built to satisfy authController's isValidPassword (8+, upper, lower, digit, symbol) so a judge who
 * later changes it is not fighting a rule their issued password would have failed.
 */
const generatePassword = () => {
  const pick = (set, n) => Array.from({ length: n }, () => set[crypto.randomInt(set.length)]).join("");
  const chars = [...pick(UPPER, 3), ...pick(LOWER, 6), ...pick(DIGIT, 3), ...pick(SYMBOL, 2)];
  // Shuffle so the character classes are not always in the same positions.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

const judgeAccountView = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  isFrozen: Boolean(user.isFrozen),
});

/**
 * GET /api/admin/judges
 * Every judge account, with the competitions each is assigned to and their progress.
 */
export const adminListJudges = async (req, res) => {
  try {
    const judges = await User.find({ role: "judge" })
      .select("name email createdAt isFrozen")
      .sort({ createdAt: -1 })
      .lean();

    if (!judges.length) return res.json({ judges: [] });

    const judgeIds = judges.map((j) => j._id);
    const [assignments, scoreCounts] = await Promise.all([
      CompetitionJudge.find({ judge: { $in: judgeIds } })
        .populate("competition", "name slug")
        .lean(),
      JudgeScore.aggregate([
        { $match: { judge: { $in: judgeIds }, status: "submitted" } },
        { $group: { _id: { judge: "$judge", competition: "$competition" }, count: { $sum: 1 } } },
      ]),
    ]);

    const submittedBy = new Map(
      scoreCounts.map((s) => [`${s._id.judge}:${s._id.competition}`, s.count])
    );

    const assignmentsBy = new Map();
    for (const a of assignments) {
      const key = String(a.judge);
      assignmentsBy.set(key, [
        ...(assignmentsBy.get(key) || []),
        {
          competitionId: a.competition?._id || a.competition,
          name: a.competition?.name || "(deleted competition)",
          slug: a.competition?.slug || "",
          status: a.status,
          assignedAt: a.assignedAt,
          submittedCount: submittedBy.get(`${a.judge}:${a.competition?._id || a.competition}`) || 0,
        },
      ]);
    }

    return res.json({
      judges: judges.map((j) => ({
        ...judgeAccountView(j),
        assignments: assignmentsBy.get(String(j._id)) || [],
      })),
    });
  } catch (error) {
    console.error("[judging] adminListJudges failed:", error?.message || error);
    return res.status(500).json({ message: "Could not load judges." });
  }
};

/**
 * POST /api/admin/judges
 * Create a judge login. The generated password is returned in THIS response and never again.
 */
export const adminCreateJudge = async (req, res) => {
  try {
    const name = asTrimmedString(req.body?.name, 120);
    const email = asTrimmedString(req.body?.email, 200).toLowerCase();
    if (!name) return res.status(400).json({ message: "The judge needs a name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });

    // Refuses an existing account outright rather than swapping its role, which is stricter than
    // setFinanceRole is deliberately. Two reasons: converting a live account takes away whatever the
    // person was using the platform for, and a judge who also writes here could be holding an entry
    // in the competition they were about to judge. A separate address removes the whole class.
    const existing = await User.findOne({ email }).select("_id role").lean();
    if (existing) {
      return res.status(409).json({
        message: existing.role === "judge"
          ? "That email already has a judge account."
          : "That email already belongs to a platform account. Use a separate address for the judge login — converting an existing account would take away whatever they use the platform for.",
      });
    }

    const password = generatePassword();
    const judge = await User.create({
      name,
      email,
      // Assigned in plaintext on purpose: the pre("save") hook is what hashes it, and it only fires
      // on a modified `password` path. Pre-hashing here would double-hash and lock the account out.
      password,
      role: "judge",
      // REQUIRED. login() 403s an unverified account and tells the user to check their inbox for a
      // code that was never sent — a judge created without this can never sign in, and the error
      // message points them somewhere that cannot help. The admin creating the account is the
      // vouching step here.
      emailVerified: true,
      authProvider: "password",
    });

    return res.status(201).json({
      judge: judgeAccountView(judge),
      // Shown to the admin once. Never stored in plaintext, never logged, never returned again —
      // the only copy after this response is whatever the admin does with it.
      password,
    });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "That email already has an account." });
    console.error("[judging] adminCreateJudge failed:", error?.message || error);
    return res.status(500).json({ message: "Could not create the judge account." });
  }
};

/**
 * POST /api/admin/judges/:judgeId/reset-password
 * A judge who lost their password. Same one-time-display rule.
 */
export const adminResetJudgePassword = async (req, res) => {
  try {
    const judgeId = asObjectId(req.params.judgeId);
    const judge = await User.findOne({ _id: judgeId, role: "judge" });
    if (!judge) return res.status(404).json({ message: "Judge not found." });

    const password = generatePassword();
    judge.password = password;   // hashed by the pre-save hook
    await judge.save();

    return res.json({ judge: judgeAccountView(judge), password });
  } catch (error) {
    console.error("[judging] adminResetJudgePassword failed:", error?.message || error);
    return res.status(500).json({ message: "Could not reset the password." });
  }
};

/**
 * POST /api/admin/competitions/:id/judges
 * Assign a judge to a panel. Reactivates a revoked row rather than inserting a second one.
 */
export const adminAssignJudge = async (req, res) => {
  try {
    const competitionId = asObjectId(req.params.id);
    const judgeId = asObjectId(req.body?.judgeId);
    if (!competitionId || !judgeId) return res.status(400).json({ message: "Competition and judge are both required." });

    const [competition, judge] = await Promise.all([
      Competition.exists({ _id: competitionId }),
      User.findOne({ _id: judgeId, role: "judge" }).select("_id name email").lean(),
    ]);
    if (!competition) return res.status(404).json({ message: "Competition not found." });
    if (!judge) return res.status(404).json({ message: "Judge not found." });

    // Nobody judges a competition they entered. Cheap to check, and the alternative is discovering it
    // after the results are declared.
    const ownEntry = await CompetitionEntry.exists({ competitionId, userId: judgeId });
    if (ownEntry) {
      return res.status(409).json({ message: "That account has an entry in this competition and cannot judge it." });
    }

    const assignment = await CompetitionJudge.findOneAndUpdate(
      { competition: competitionId, judge: judgeId },
      {
        $set: { status: "active", assignedBy: req.user._id, assignedAt: new Date(), revokedAt: null, revokedBy: null },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    return res.status(201).json({ assignment: { ...assignment, judge } });
  } catch (error) {
    // Two admins assigning the same judge at the same moment. The row that won is the one we wanted.
    if (error?.code === 11000) return res.status(409).json({ message: "That judge is already on this panel." });
    console.error("[judging] adminAssignJudge failed:", error?.message || error);
    return res.status(500).json({ message: "Could not assign the judge." });
  }
};

/**
 * DELETE /api/admin/competitions/:id/judges/:judgeId
 *
 * Revokes the seat; it does NOT delete the scores. The judging happened, and the record of it is
 * what makes a declared result explainable afterwards. An admin who wants a specific judge's opinion
 * discounted is making a different, louder decision than removing them from a panel.
 */
export const adminRevokeJudge = async (req, res) => {
  try {
    const competitionId = asObjectId(req.params.id);
    const judgeId = asObjectId(req.params.judgeId);

    const assignment = await CompetitionJudge.findOneAndUpdate(
      { competition: competitionId, judge: judgeId },
      { $set: { status: "revoked", revokedAt: new Date(), revokedBy: req.user._id } },
      { new: true }
    ).lean();
    if (!assignment) return res.status(404).json({ message: "That judge is not on this panel." });

    return res.json({ assignment });
  } catch (error) {
    console.error("[judging] adminRevokeJudge failed:", error?.message || error);
    return res.status(500).json({ message: "Could not revoke the assignment." });
  }
};

/** Shape one criterion/award row from admin input, dropping the blank rows a repeater leaves behind. */
const sanitizeRubricRows = (rows, { withWeight = false } = {}) => {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  rows.forEach((row, index) => {
    const label = asTrimmedString(row?.label, 80);
    if (!label) return;   // "+ Add" leaves an empty row the moment it is clicked
    // Key defaults to a slug of the label, so an admin never has to think about keys — but an
    // explicit key wins, because renaming a label must not orphan the scores filed against it.
    const key = (asTrimmedString(row?.key, 40) || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 40);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({
      key,
      label,
      description: asTrimmedString(row?.description, 500),
      order: index,
      ...(withWeight ? { weight: asInt(row?.weight, { min: 0, max: 100, fallback: 0 }) } : {}),
    });
  });
  return out;
};

/**
 * PUT /api/admin/competitions/:id/judging
 *
 * The rubric's own endpoint — it is deliberately not reachable through the competition content
 * editor's CONTENT_FIELDS whitelist. See the comment there for why.
 */
export const adminSaveJudgingConfig = async (req, res) => {
  try {
    const competitionId = asObjectId(req.params.id);
    const competition = await Competition.findById(competitionId).select("judging").lean();
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const locked = Boolean(competition.judging?.lockedAt);
    const criteria = sanitizeRubricRows(req.body?.criteria, { withWeight: true });
    const awards = sanitizeRubricRows(req.body?.awards);
    const scale = asInt(req.body?.scale, { min: 2, max: 100, fallback: competition.judging?.scale || 10 });

    if (locked) {
      // Once a judge has submitted against this rubric, changing a weight silently restates what
      // they already decided. Timing windows stay editable — those do not change any score's meaning.
      const sameCriteria =
        JSON.stringify(criteria.map((c) => [c.key, c.weight])) ===
        JSON.stringify((competition.judging?.criteria || []).map((c) => [c.key, c.weight]));
      const sameScale = scale === (competition.judging?.scale || 10);
      if (!sameCriteria || !sameScale) {
        return res.status(409).json({
          message: "Judges have already scored against this rubric. Criteria, weights and the scale are frozen — reopen judging first if they must change.",
          lockedAt: competition.judging.lockedAt,
        });
      }
    }

    const update = {
      "judging.criteria": criteria,
      "judging.awards": awards,
      "judging.scale": scale,
      "judging.opensAt": req.body?.opensAt ? new Date(req.body.opensAt) : null,
      "judging.closesAt": req.body?.closesAt ? new Date(req.body.closesAt) : null,
    };

    const saved = await Competition.findByIdAndUpdate(competitionId, { $set: update }, { new: true })
      .select("judging")
      .lean();

    return res.json({ judging: saved.judging, locked });
  } catch (error) {
    console.error("[judging] adminSaveJudgingConfig failed:", error?.message || error);
    return res.status(500).json({ message: "Could not save the judging setup." });
  }
};

/**
 * POST /api/admin/competitions/:id/judging/unlock
 * Deliberately explicit: bumps the rubric version so scores cast under the old one stay identifiable.
 */
export const adminUnlockJudging = async (req, res) => {
  try {
    const competitionId = asObjectId(req.params.id);
    const competition = await Competition.findById(competitionId).select("judging").lean();
    if (!competition) return res.status(404).json({ message: "Competition not found." });
    if (!competition.judging?.lockedAt) return res.json({ judging: competition.judging, alreadyUnlocked: true });

    const affected = await JudgeScore.countDocuments({ competition: competitionId, status: "submitted" });

    const saved = await Competition.findByIdAndUpdate(
      competitionId,
      { $set: { "judging.lockedAt": null }, $inc: { "judging.version": 1 } },
      { new: true }
    ).select("judging").lean();

    return res.json({ judging: saved.judging, affectedScores: affected });
  } catch (error) {
    console.error("[judging] adminUnlockJudging failed:", error?.message || error);
    return res.status(500).json({ message: "Could not reopen judging." });
  }
};

/**
 * GET /api/admin/competitions/:id/judging
 *
 * Everything the admin needs on one screen: the rubric, the panel and its progress, the suggested
 * ranking, the per-judge breakdown, and the nomination tally.
 *
 * The admin is NOT blind — they see writer names, because they are the ones deciding rewards and
 * they already see them everywhere else in this console. Only the judge is blind.
 */
export const adminGetJudging = async (req, res) => {
  try {
    const competitionId = asObjectId(req.params.id);
    const competition = await Competition.findById(competitionId).select("name slug judging dates resultsDeclaredAt").lean();
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const [entries, scores, nominations, panel] = await Promise.all([
      CompetitionEntry.find({ competitionId, status: { $in: JUDGEABLE_STATUSES } })
        .select("eventId snapshot.title status result userId")
        .populate("userId", "name email")
        .lean(),
      JudgeScore.find({ competition: competitionId }).populate("judge", "name email").lean(),
      JudgeNomination.find({ competition: competitionId }).populate("judge", "name email").lean(),
      CompetitionJudge.find({ competition: competitionId }).populate("judge", "name email").lean(),
    ]);

    const { rows, meta } = buildJudgingLeaderboard(competition.judging, entries, scores);

    // The admin's view of each row adds back what the judge could not see. Same data, opposite rule.
    const entryBy = new Map(entries.map((e) => [String(e._id), e]));
    const scoresByEntry = new Map();
    for (const s of scores) {
      const key = String(s.entry);
      scoresByEntry.set(key, [...(scoresByEntry.get(key) || []), s]);
    }

    const submittedByJudge = new Map();
    for (const s of scores) {
      if (s.status !== "submitted") continue;
      const key = String(s.judge?._id || s.judge);
      submittedByJudge.set(key, (submittedByJudge.get(key) || 0) + 1);
    }

    return res.json({
      competition: { _id: competition._id, name: competition.name, slug: competition.slug },
      judging: competition.judging || {},
      locked: Boolean(competition.judging?.lockedAt),
      panel: panel.map((p) => ({
        judgeId: p.judge?._id || p.judge,
        name: p.judge?.name || "(deleted account)",
        email: p.judge?.email || "",
        status: p.status,
        assignedAt: p.assignedAt,
        revokedAt: p.revokedAt,
        submittedCount: submittedByJudge.get(String(p.judge?._id || p.judge)) || 0,
      })),
      leaderboard: rows.map((row) => {
        const entry = entryBy.get(row.entryId);
        return {
          ...row,
          // The admin sees the writer. This is the one place that is correct.
          writer: entry?.userId ? { name: entry.userId.name, email: entry.userId.email } : null,
          currentAward: entry?.result?.award || "none",
          currentRank: entry?.result?.rank ?? null,
          judgeBreakdown: (scoresByEntry.get(row.entryId) || []).map((s) => ({
            judgeId: s.judge?._id || s.judge,
            judgeName: s.judge?.name || "(deleted account)",
            status: s.status,
            marks: s.scores ? (typeof s.scores.get === "function" ? Object.fromEntries(s.scores) : { ...s.scores }) : {},
            comment: s.comment || "",
            submittedAt: s.submittedAt,
          })),
        };
      }),
      meta,
      nominations: tallyNominations(competition.judging?.awards || [], nominations, entries).map((award) => ({
        ...award,
        nominations: award.nominations.map((n) => ({
          ...n,
          judges: nominations
            .filter((x) => x.awardKey === award.key && String(x.entry) === n.entryId)
            .map((x) => ({ name: x.judge?.name || "(deleted account)", reason: x.reason || "" })),
        })),
      })),
    });
  } catch (error) {
    console.error("[judging] adminGetJudging failed:", error?.message || error);
    return res.status(500).json({ message: "Could not load judging results." });
  }
};

/**
 * PUT /api/admin/competitions/:id/judging/ranks
 *
 * The admin's confirmed ordering. Writes ONLY `result.rank` — it does not touch `result.award`,
 * `status`, or anything the declare-results grant loop reads. Ranking and declaring stay separate
 * actions, so recording an order can never accidentally hand out a prize.
 */
export const adminSetRanks = async (req, res) => {
  try {
    const competitionId = asObjectId(req.params.id);
    const ranks = Array.isArray(req.body?.ranks) ? req.body.ranks : [];
    if (!ranks.length) return res.status(400).json({ message: "No ranks were sent." });

    const ops = [];
    for (const row of ranks) {
      const entryId = asObjectId(row?.entryId);
      if (!entryId) continue;
      const rank = row?.rank === null ? null : asInt(row?.rank, { min: 1, max: 100_000, fallback: 0 }) || null;
      ops.push({
        updateOne: {
          // Scoped by competitionId as well as _id: an entry id from another competition must not be
          // rankable here just because the admin is on this page.
          filter: { _id: entryId, competitionId },
          update: { $set: { "result.rank": rank } },
        },
      });
    }
    if (!ops.length) return res.status(400).json({ message: "No valid entries were sent." });

    const result = await CompetitionEntry.bulkWrite(ops);
    return res.json({ updated: result.modifiedCount ?? 0 });
  } catch (error) {
    console.error("[judging] adminSetRanks failed:", error?.message || error);
    return res.status(500).json({ message: "Could not save the ranking." });
  }
};

/**
 * GET /api/admin/competitions/:id/entries/:entryId/judge-preview
 *
 * Exactly what a judge sees for this entry, produced by calling the judge's own projection. This is
 * the audit tool: an admin can confirm with their own eyes that the blind view is blind, and because
 * it is the same function, a regression shows up here immediately.
 */
export const adminPreviewJudgeEntry = async (req, res) => {
  try {
    const competitionId = asObjectId(req.params.id);
    const entryId = asObjectId(req.params.entryId);
    const entry = await CompetitionEntry.findOne({ _id: entryId, competitionId }).lean();
    if (!entry) return res.status(404).json({ message: "Entry not found." });

    return res.json({ entry: toJudgeEntryView(entry) });
  } catch (error) {
    console.error("[judging] adminPreviewJudgeEntry failed:", error?.message || error);
    return res.status(500).json({ message: "Could not load the preview." });
  }
};
