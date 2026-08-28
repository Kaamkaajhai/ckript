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
import { generateInviteToken, getInviteExpiryDate } from "../utils/inviteToken.js";
import { createNotification, sendJudgeInviteEmail, sendJudgeAssignmentEmail } from "../utils/notify.js";

/**
 * Admin side of the judge panel: creating judge logins, assigning them to competitions, defining the
 * rubric, and reading back what the panel decided.
 *
 * Kept out of competitionAdminController.js on purpose. That file is already large and owns
 * `adminDeclareResults` — the one irreversible action in the product, whose grant loop hands out
 * subscriptions and badges. Nothing here touches it: this controller SUGGESTS a ranking, and the
 * existing declare endpoint remains the only thing that writes an award.
 */

/**
 * The password nobody ever sees.
 *
 * The account needs a `password` (the schema requires one for non-Google users) but must not have a
 * usable one until the judge sets it themselves. 48 random bytes, hashed by the pre-save hook and
 * then forgotten — not returned, not logged, not recoverable. Until the invite is accepted there is
 * no secret in existence that opens this account.
 */
const unusablePassword = () => crypto.randomBytes(48).toString("hex");

/**
 * The PATH the admin sends, not an absolute URL.
 *
 * Building it from CLIENT_URL would make a correct invite depend on an env var being right in every
 * environment, and this codebase has already been bitten by exactly that (the Google Calendar
 * redirect URI, misconfigured in production with nothing to see server-side). The admin console is
 * served by the client app, so the browser already knows the right origin — it prefixes this and
 * cannot get it wrong.
 *
 * The raw token appears here and nowhere else, ever.
 */
const invitePath = (token) => `/judge?invite=${token}`;

/**
 * Issue (or re-issue) a set-password invite for a judge account.
 *
 * Stores the HASH and returns the raw token, so the caller can build one link and then lose it.
 */
const issueInvite = async (user, invitedBy) => {
  const token = generateInviteToken();
  user.judgeInvite = {
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: getInviteExpiryDate(),
    acceptedAt: null,
    invitedBy,
  };
  await user.save();
  return token;
};

const judgeAccountView = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  isFrozen: Boolean(user.isFrozen),
  // Whether this judge can actually sign in yet. An admin looking at the list needs to know who is
  // still sitting on an unopened invite.
  inviteAccepted: Boolean(user.judgeInvite?.acceptedAt),
  inviteExpiresAt: user.judgeInvite?.acceptedAt ? null : user.judgeInvite?.expiresAt || null,
});

/**
 * GET /api/admin/judges
 * Every judge account, with the competitions each is assigned to and their progress.
 */
export const adminListJudges = async (req, res) => {
  try {
    const judges = await User.find({ role: "judge" })
      .select("name email createdAt isFrozen judgeInvite.acceptedAt judgeInvite.expiresAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!judges.length) return res.json({ judges: [] });

    const judgeIds = judges.map((j) => j._id);
    const [assignments, scoreCounts] = await Promise.all([
      CompetitionJudge.find({ judge: { $in: judgeIds } })
        // judging.criteria comes along so the admin list can flag a panel with no rubric: a judge
        // assigned to a competition with no criteria can read entries but cannot score any of them,
        // and until now the only place that showed was on the judge's own screen.
        .populate("competition", "name slug judging.criteria")
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
          criteriaCount: (a.competition?.judging?.criteria || []).length,
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
 *
 * Create a judge account and return a one-time set-password link. The admin never learns the
 * password — the judge chooses it — which is what keeps every score attributable to the person who
 * actually cast it.
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

    const judge = await User.create({
      name,
      email,
      // Assigned in plaintext on purpose: the pre("save") hook is what hashes it, and it only fires
      // on a modified `password` path. Pre-hashing here would double-hash and lock the account out.
      // This particular value is random and immediately discarded — see unusablePassword.
      password: unusablePassword(),
      role: "judge",
      // REQUIRED. login() 403s an unverified account and tells the user to check their inbox for a
      // code that was never sent — a judge created without this can never sign in, and the error
      // message points them somewhere that cannot help. The admin creating the account is the
      // vouching step here, and accepting the invite proves the mailbox.
      emailVerified: true,
      authProvider: "password",
    });

    const token = await issueInvite(judge, req.user._id);
    const path = invitePath(token);

    // Emailed AND shown on screen. The send no-ops when SMTP is unavailable (sendEmailNotification
    // returns {skipped:true} rather than throwing), and the admin's copy of the link is what makes
    // that survivable — so `emailed` is reported honestly rather than assumed.
    const mail = await sendJudgeInviteEmail({ to: judge.email, name: judge.name, invitePath: path });

    return res.status(201).json({
      judge: judgeAccountView(judge),
      // Shown to the admin once. The raw token is not stored anywhere — only its hash — so this
      // response is the sole copy that will ever exist.
      invitePath: path,
      inviteExpiresAt: judge.judgeInvite.expiresAt,
      emailed: Boolean(mail?.success),
    });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "That email already has an account." });
    console.error("[judging] adminCreateJudge failed:", error?.message || error);
    return res.status(500).json({ message: "Could not create the judge account." });
  }
};

/**
 * POST /api/admin/judges/:judgeId/resend-invite
 *
 * For an invite that expired, or a judge who lost their password. Issues a NEW token and, if they
 * had already set a password, replaces it with an unusable one — so re-inviting genuinely resets
 * access rather than leaving an old password quietly working alongside a new link.
 *
 * Note what this endpoint cannot do: reveal or choose the judge's password. An admin resetting an
 * account still cannot sign in as that judge, which is the property that makes each score
 * attributable to the person who cast it.
 */
export const adminResendJudgeInvite = async (req, res) => {
  try {
    const judgeId = asObjectId(req.params.judgeId);
    const judge = await User.findOne({ _id: judgeId, role: "judge" });
    if (!judge) return res.status(404).json({ message: "Judge not found." });

    judge.password = unusablePassword();   // hashed by the pre-save hook
    const token = await issueInvite(judge, req.user._id);
    const path = invitePath(token);

    const mail = await sendJudgeInviteEmail({ to: judge.email, name: judge.name, invitePath: path });

    return res.json({
      judge: judgeAccountView(judge),
      invitePath: path,
      inviteExpiresAt: judge.judgeInvite.expiresAt,
      emailed: Boolean(mail?.success),
    });
  } catch (error) {
    console.error("[judging] adminResendJudgeInvite failed:", error?.message || error);
    return res.status(500).json({ message: "Could not re-issue the invite." });
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
      // The name, not just existence — the notification and email both quote it.
      Competition.findById(competitionId).select("name").lean(),
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

    // Told they are on the panel. Both are best-effort and deliberately NOT awaited into the
    // failure path: an assignment that succeeded must not report failure because a mail server is
    // down. createNotification and sendEmailNotification each swallow their own errors.
    await createNotification({
      userId: judge._id,
      type: "competition",
      from: req.user._id,
      message: `You have been added to the judging panel for ${competition.name}.`,
    });
    await sendJudgeAssignmentEmail({ to: judge.email, name: judge.name, competitionName: competition.name });

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
