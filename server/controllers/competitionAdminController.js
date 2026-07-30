import mongoose from "mongoose";
import Competition, { DEFAULT_PRIZES } from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { createNotification, sendEmailNotification } from "../utils/notify.js";
import { getCompetitionPhase } from "../utils/competitionPhase.js";
import { runEntryAIProcessing } from "./competitionAI.js";
import { getReferralProgress, tiersFor, referralWindow } from "../utils/competitionReferrals.js";
import { escapeHtml } from "../utils/escapeHtml.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

// Reward definitions. Mirrors WRITER_GOLD_MODEL / WRITER_SILVER_MODEL in paymentController.js — a
// prize subscription must land the account in exactly the state a paid one would, or entitlement
// checks elsewhere will disagree about what the winner can do.
const THIRTY_DAYS_MS = 30 * 24 * 3600_000;

// Rank so a prize can never demote a better plan the winner is already on.
const TIER_RANK = { none: 0, standard: 1, writer_silver: 2, film_industry_professional: 2, writer_gold: 3 };

/**
 * Build the $set for a prize subscription.
 *
 * A prize must only ever ADD. Two ways a naive `$set` would rob the winner:
 *   • truncation — someone holding an annual plan with 300 days left would be cut to 30,
 *   • demotion — a Gold subscriber awarded Runner-Up would be knocked down to Silver.
 * So the 30 days are added to whatever they already have, and the tier only moves up.
 */
const subscriptionGrant = (plan, now, reference, existing = {}) => {
  const currentExpiry = existing?.accessExpiresAt ? new Date(existing.accessExpiresAt).getTime() : 0;
  // Extend from the later of "now" and their existing expiry, so paid time is never lost.
  const base = Math.max(now.getTime(), currentExpiry || 0);
  const expiresAt = new Date(base + THIRTY_DAYS_MS);

  const prizeTier = plan === "gold" ? "writer_gold" : "writer_silver";
  const prizePlan = plan === "gold" ? "gold" : "silver";
  const keepExisting = (TIER_RANK[existing?.accessTier] || 0) > TIER_RANK[prizeTier];

  const grant = {
    "subscription.plan": keepExisting ? existing.plan : prizePlan,
    "subscription.accessTier": keepExisting ? existing.accessTier : prizeTier,
    "subscription.accessStatus": "active",
    "subscription.accessActivatedAt": existing?.accessActivatedAt || now,
    "subscription.accessExpiresAt": expiresAt,
    "subscription.expiresAt": expiresAt,
    "subscription.checkoutMode": "live",
    "subscription.checkoutProvider": "manual",
    "subscription.checkoutReference": reference,
  };
  // Only reset the AI image quota when the prize actually starts a fresh period. Topping up an
  // active plan must not wipe usage the winner already paid for.
  if (!currentExpiry || currentExpiry <= now.getTime()) grant["subscription.aiImagesGeneratedTotal"] = 0;
  return grant;
};

// Reads the winner's current plan first so the grant can extend rather than replace it.
const grantSubscription = async (userId, plan, now, competitionId) => {
  const user = await User.findById(userId).select("subscription");
  await User.updateOne(
    { _id: userId },
    { $set: subscriptionGrant(plan, now, `competition:${competitionId}`, user?.subscription) },
  );
};

const BADGES = {
  winner: { id: "challenge_winner", label: "Global Script Challenge Winner" },
  runner_up: { id: "challenge_runner_up", label: "Global Script Challenge Runner-Up" },
  special: { id: "challenge_special", label: "Global Script Challenge Special Award" },
  participant: { id: "challenge_participant", label: "Global Script Challenge Participant" },
};

const asId = (value) => (mongoose.isValidObjectId(value) ? String(value) : null);

// ── Competitions CRUD ───────────────────────────────────────────────────────

export const adminUploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const cloudUpload = await uploadToCloudinary(req.file.buffer, {
      folder: "scriptbridge/admin/competitions",
      resource_type: "image",
      public_id: `admin-${Date.now()}`,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    res.json({ url: cloudUpload.secure_url });
  } catch (error) {
    console.error("[admin upload] failed:", error);
    res.status(500).json({ message: error.message });
  }
};

export const adminListCompetitions = async (req, res) => {
  try {
    const competitions = await Competition.find({}).sort({ "dates.startsAt": -1 }).lean();
    const counts = await CompetitionEntry.aggregate([
      { $group: {
        _id: "$competitionId",
        total: { $sum: 1 },
        submitted: { $sum: { $cond: [{ $in: ["$status", ["submitted", "ai_processed", "judged"]] }, 1, 0] } },
      } },
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c]));

    return res.json({
      competitions: competitions.map((competition) => ({
        ...competition,
        phase: getCompetitionPhase(competition),
        entryCount: byId.get(String(competition._id))?.total || 0,
        submittedCount: byId.get(String(competition._id))?.submitted || 0,
      })),
    });
  } catch (error) {
    console.error("[competition admin] list failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load competitions." });
  }
};

// Dates must tell a coherent story or the derived phase would skip or invert.
const validateDates = (dates = {}) => {
  const { regOpensAt, regClosesAt, startsAt, endsAt } = dates;
  if (!regOpensAt || !regClosesAt || !startsAt || !endsAt) return "All four competition dates are required.";
  const [a, b, c, d] = [regOpensAt, regClosesAt, startsAt, endsAt].map((v) => new Date(v).getTime());
  if ([a, b, c, d].some(Number.isNaN)) return "One or more dates could not be read.";
  if (!(a < b)) return "Registration must open before it closes.";
  if (!(b <= c)) return "Registration must close before (or when) the competition starts.";
  if (!(c < d)) return "The competition must start before it ends.";
  return null;
};

// Normalise a date down to a comparable instant. Missing, blank and unreadable all collapse to the
// same null, so "no results date" reads identically whether the editor dropped the key or sent "".
const instant = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

// Whether an incoming `dates` patch actually moves the schedule. Only the keys the patch carries are
// compared: an omitted key keeps its stored value under the merge below, so it can never be a change.
const scheduleMoved = (stored = {}, incoming = {}) =>
  Object.keys(incoming).some((key) => instant(incoming[key]) !== instant(stored[key]));

// Whitelist of admin-editable fields. Anything missing here is SILENTLY dropped from an update —
// add new editable fields to this list or the admin will save and see no error and no change.
const CONTENT_FIELDS = [
  "name", "shortName", "tagline", "shortDescription", "host", "language", "timezone", 
  "eventType", "competitionCategory", "difficulty", "expectedParticipants", "estimatedReadingTime",
  "featuredBadge", "trendingBadge", "newBadge", "highlights", "seo", "automation",
  "theme", "overview", "eligibility", "format", "prizes", "detailedPrizes", "rules",
  "faq", "judges", "sponsors", "communityLinks", "resources",
  "bannerUrl", "mobileBannerUrl", "cardThumbnailUrl", "ogImageUrl", "logoUrl", "backgroundImageUrl", "gallery",
  "cardConfig", "prizePool", "visibility", "referralTiers",
];

/**
 * Drop incomplete referral-tier rows before they reach the schema.
 *
 * The admin editor is a repeater, so "+ Add" leaves a blank row the moment it is clicked. The schema
 * enforces `count >= 1`, which would turn an ordinary half-finished edit into an opaque 500. A blank
 * row means "not filled in yet", not "invalid input", so it is dropped rather than rejected.
 */
const sanitizeReferralTiers = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      count: Number(row?.count),
      id: String(row?.id || "").trim(),
      label: String(row?.label || "").trim(),
      days: Math.max(0, Number(row?.days) || 0),
    }))
    .filter((row) => Number.isFinite(row.count) && row.count >= 1 && row.id)
    .map((row) => ({ ...row, label: row.label || row.id }));
};

// Fields needing shaping before they hit the schema.
const normalizeContent = (payload) => {
  if (payload.referralTiers !== undefined) payload.referralTiers = sanitizeReferralTiers(payload.referralTiers);
  return payload;
};

export const adminCreateCompetition = async (req, res) => {
  try {
    const { name, dates, ...rest } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ message: "Competition name is required." });

    const dateError = validateDates(dates);
    if (dateError) return res.status(400).json({ message: dateError });

    const payload = { name: String(name).trim(), dates, createdBy: req.user._id, lifecycle: "draft" };
    for (const field of CONTENT_FIELDS) {
      if (field !== "name" && rest[field] !== undefined) payload[field] = rest[field];
    }
    // Seed the standard prize lists so an admin never has to retype them.
    payload.prizes = {
      winner: payload.prizes?.winner?.length ? payload.prizes.winner : DEFAULT_PRIZES.winner,
      runnerUp: payload.prizes?.runnerUp?.length ? payload.prizes.runnerUp : DEFAULT_PRIZES.runnerUp,
      special: payload.prizes?.special || [],
    };

    const competition = await Competition.create(normalizeContent(payload));
    return res.status(201).json({ competition });
  } catch (error) {
    console.error("[competition admin] create failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to create the competition." });
  }
};

export const adminUpdateCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(asId(req.params.id));
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const { dates, ...rest } = req.body || {};
    if (dates !== undefined) {
      const storedDates = competition.dates.toObject();
      // Dates stay editable right up until results are declared — the phase is derived, so a
      // correction propagates to every screen at once. After declaration the record is history.
      //
      // But carrying a `dates` key is not the same as changing the schedule. The admin editor
      // rebuilds its entire payload from the populated form on every save, so `dates` is always
      // present; testing for the key alone locked a declared competition down completely, rejecting
      // banner, judge, sponsor, prize-pool, overview and FAQ edits with a 409 that talked about the
      // schedule. Compare the instants and only refuse when one of them has genuinely moved.
      if (competition.resultsDeclaredAt && scheduleMoved(storedDates, dates)) {
        return res.status(409).json({ message: "Results are declared — the schedule can no longer be changed." });
      }
      const dateError = validateDates({ ...storedDates, ...dates });
      if (dateError) return res.status(400).json({ message: dateError });
      competition.dates = { ...storedDates, ...dates };
    }

    const incoming = normalizeContent({ ...rest });
    for (const field of CONTENT_FIELDS) {
      if (incoming[field] !== undefined) competition[field] = incoming[field];
    }

    await competition.save();
    return res.json({ competition, phase: getCompetitionPhase(competition) });
  } catch (error) {
    console.error("[competition admin] update failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to update the competition: " + (error?.message || error) });
  }
};

export const adminPublishCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(asId(req.params.id));
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    // Publishing is what makes the competition public and lets people register — so the page must
    // not be half-built when it happens.
    const dateError = validateDates(competition.dates);
    if (dateError) return res.status(400).json({ message: dateError });
    if (!String(competition.overview || "").trim()) {
      return res.status(400).json({ message: "Add an overview before publishing." });
    }
    if (!(competition.rules || []).filter((r) => String(r || "").trim()).length) {
      return res.status(400).json({ message: "Add at least one rule before publishing." });
    }

    competition.lifecycle = "published";
    await competition.save();
    return res.json({ competition, phase: getCompetitionPhase(competition) });
  } catch (error) {
    console.error("[competition admin] publish failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to publish the competition." });
  }
};

export const adminArchiveCompetition = async (req, res) => {
  try {
    const competition = await Competition.findByIdAndUpdate(
      asId(req.params.id),
      { $set: { lifecycle: "archived" } },
      { new: true },
    );
    if (!competition) return res.status(404).json({ message: "Competition not found." });
    return res.json({ competition });
  } catch (error) {
    console.error("[competition admin] archive failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to archive the competition." });
  }
};

export const adminDeleteCompetition = async (req, res) => {
  try {
    const competitionId = asId(req.params.id);
    const competition = await Competition.findByIdAndDelete(competitionId);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    // Delete all entries for this competition
    await CompetitionEntry.deleteMany({ competitionId });

    // Unlink scripts
    await Script.updateMany(
      { competitionId },
      { $set: { competitionId: null, competitionLocked: false, competitionReleasedAt: null } }
    );

    return res.json({ message: "Competition deleted successfully." });
  } catch (error) {
    console.error("[competition admin] delete failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to delete the competition." });
  }
};

// ── Entries ─────────────────────────────────────────────────────────────────

export const adminListEntries = async (req, res) => {
  try {
    const competition = await Competition.findById(asId(req.params.id));
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const entries = await CompetitionEntry.find({ competitionId: competition._id })
      .populate("userId", "name email profileImage")
      .sort({ submittedAt: 1, createdAt: 1 })
      .lean();

    return res.json({ entries, phase: getCompetitionPhase(competition), competition });
  } catch (error) {
    console.error("[competition admin] entries failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load entries." });
  }
};

export const adminRetryEntryAI = async (req, res) => {
  try {
    const entry = await CompetitionEntry.findOne({
      _id: asId(req.params.entryId),
      competitionId: asId(req.params.id),
    });
    if (!entry) return res.status(404).json({ message: "Entry not found." });

    const processed = await runEntryAIProcessing(entry._id);
    return res.json({ entry: processed });
  } catch (error) {
    console.error("[competition admin] retry AI failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to re-run AI processing." });
  }
};

// ── Referral analytics ──────────────────────────────────────────────────────

// RFC-4180-ish: quote every field and double any embedded quote, so a name containing a comma
// cannot shift every following column.
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const toCsv = (headers, rows) =>
  [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");

// GET /api/admin/referrals/analytics[?competitionId=&format=csv]
export const adminReferralAnalytics = async (req, res) => {
  try {
    const competitionId = asId(req.query.competitionId);
    const competition = competitionId ? await Competition.findById(competitionId).lean() : null;
    if (competitionId && !competition) return res.status(404).json({ message: "Competition not found." });

    // Scoped to the competition window when one is given, otherwise all time.
    const window = competition ? referralWindow(competition) : { start: null, end: null };
    const match = { referredBy: { $ne: null } };
    if (window.start && window.end) match.referredAt = { $gte: window.start, $lte: window.end };

    const [totals] = await User.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          qualified: { $sum: { $cond: ["$hasReceivedReferralBonus", 1, 0] } },
        },
      },
    ]);

    const totalReferrals = totals?.totalReferrals || 0;
    const qualified = totals?.qualified || 0;

    const topReferrers = await User.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$referredBy",
          referrals: { $sum: 1 },
          qualified: { $sum: { $cond: ["$hasReceivedReferralBonus", 1, 0] } },
        },
      },
      { $sort: { qualified: -1, referrals: -1 } },
      { $limit: 25 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "referrer" } },
      { $unwind: "$referrer" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$referrer.name",
          email: "$referrer.email",          // admin-only view; the participant view never sees emails
          referralCode: "$referrer.referralCode",
          referrals: 1,
          qualified: 1,
        },
      },
    ]);

    // What was actually granted, read from the reward ledger rather than inferred from counts — the
    // ledger is the record of what really happened.
    const rewardRows = await CompetitionEntry.aggregate([
      ...(competitionId ? [{ $match: { competitionId: new mongoose.Types.ObjectId(competitionId) } }] : []),
      { $unwind: "$rewardsGranted" },
      { $match: { "rewardsGranted.type": /^referral_/ } },
      { $group: { _id: "$rewardsGranted.type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const payload = {
      competition: competition ? { _id: competition._id, name: competition.name } : null,
      totalReferrals,
      qualified,
      awaitingVerification: Math.max(0, totalReferrals - qualified),
      // Of the people who signed up through a link, how many finished verifying.
      conversionRate: totalReferrals ? Math.round((qualified / totalReferrals) * 100) : 0,
      rewardsDistributed: rewardRows.map((r) => ({ tier: r._id.replace(/^referral_/, ""), count: r.count })),
      topReferrers,
    };

    if (String(req.query.format || "").toLowerCase() === "csv") {
      const csv = toCsv(
        ["Referrer", "Email", "Referral code", "Referrals", "Qualified"],
        topReferrers.map((r) => [r.name, r.email, r.referralCode, r.referrals, r.qualified]),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="referrals-${Date.now()}.csv"`);
      return res.send(csv);
    }

    return res.json(payload);
  } catch (error) {
    console.error("[competition admin] referral analytics failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load referral analytics." });
  }
};

// ── Declare results ─────────────────────────────────────────────────────────

/**
 * Apply a reward once and only once.
 *
 * Every grant is tagged in `entry.rewardsGranted`, so a repeated declare (a double-click, a retry
 * after a timeout) cannot extend a subscription twice or duplicate a badge.
 */
const grantOnce = async (entry, type, apply) => {
  if ((entry.rewardsGranted || []).some((r) => r.type === type)) return false;
  await apply();
  entry.rewardsGranted.push({ type, at: new Date() });
  return true;
};

const awardBadge = async (userId, badge, competitionId) => {
  // The filter makes the push conditional at the database level, so concurrent declares still leave
  // exactly one badge. Keyed on (id, competitionId): winning two different challenges earns two
  // winner badges, but re-declaring one challenge never duplicates it.
  await User.updateOne(
    { _id: userId, badges: { $not: { $elemMatch: { id: badge.id, competitionId } } } },
    { $push: { badges: { ...badge, competitionId, awardedAt: new Date() } } },
  );
};

const featureScript = async (scriptId, extra = {}) => {
  if (!scriptId) return;
  await Script.updateOne({ _id: scriptId }, { $set: { isFeatured: true, ...extra } });
};

const notifyEntry = async (entry, competitionName, message, subject) => {
  const user = await User.findById(entry.userId).select("name email");
  if (!user) return;
  await createNotification({ userId: entry.userId, type: "competition", message });
  await sendEmailNotification({
    to: user.email,
    subject,
    // Both halves are free text somebody typed — the writer's display name, and a message carrying
    // the competition name and the admin's special-award title — so neither can go into HTML raw.
    // Subject and text are not HTML; escaping those would just show the entities to the reader.
    html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>${escapeHtml(message)}</p>`,
    text: message,
  }).catch(() => { /* email is best-effort */ });
};

export const adminDeclareResults = async (req, res) => {
  try {
    const competition = await Competition.findById(asId(req.params.id));
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const phase = getCompetitionPhase(competition);
    if (phase !== "judging") {
      return res.status(409).json({
        message: competition.resultsDeclaredAt
          ? "Results have already been declared for this competition."
          : "Results can only be declared once the submission window has closed.",
      });
    }

    const { winnerEntryId, runnerUpEntryId, specialAwards = [] } = req.body || {};
    if (!winnerEntryId) return res.status(400).json({ message: "Select a winner before declaring results." });
    if (runnerUpEntryId && String(runnerUpEntryId) === String(winnerEntryId)) {
      return res.status(400).json({ message: "The winner and runner-up must be different entries." });
    }

    const entries = await CompetitionEntry.find({ competitionId: competition._id });
    const byId = new Map(entries.map((e) => [String(e._id), e]));

    // An award may only go to someone who actually submitted. `judged` is allowed because a declare
    // that died halfway leaves its already-processed entries in that state — rejecting it would make
    // the retry permanently impossible, stranding the remaining writers with no results at all.
    const hasSubmitted = (entry) => ["submitted", "ai_processed", "judged"].includes(entry.status);

    const winner = byId.get(String(winnerEntryId));
    if (!winner) return res.status(400).json({ message: "The selected winner is not an entry in this competition." });
    if (!hasSubmitted(winner)) {
      return res.status(400).json({ message: "The winner must be a submitted entry." });
    }

    const runnerUp = runnerUpEntryId ? byId.get(String(runnerUpEntryId)) : null;
    if (runnerUpEntryId && !runnerUp) {
      return res.status(400).json({ message: "The selected runner-up is not an entry in this competition." });
    }
    if (runnerUp && !hasSubmitted(runnerUp)) {
      return res.status(400).json({ message: "The runner-up must be a submitted entry." });
    }

    const specials = [];
    for (const award of Array.isArray(specialAwards) ? specialAwards : []) {
      const entry = byId.get(String(award?.entryId));
      if (!entry) return res.status(400).json({ message: "A special award points at an entry not in this competition." });
      if (!hasSubmitted(entry)) {
        return res.status(400).json({ message: "A special award must go to a submitted entry." });
      }
      if (specials.some((s) => String(s.entry._id) === String(entry._id))) {
        return res.status(400).json({ message: "The same entry cannot receive two special awards." });
      }
      if (String(entry._id) === String(winner._id) || (runnerUp && String(entry._id) === String(runnerUp._id))) {
        return res.status(400).json({ message: "An entry cannot hold both a placing and a special award." });
      }
      // Default AFTER trimming, not before. `" "` is truthy, so defaulting first skipped the
      // fallback and then trimmed to "" — which was stored as the award's title and interpolated
      // into the notification as: You received the "" award.
      specials.push({ entry, title: String(award?.title || "").trim() || "Special Award" });
    }

    const now = new Date();
    const name = competition.name;
    const counts = { winners: 0, runnerUp: 0, special: 0, participants: 0 };

    // Winner ────────────────────────────────────────────────────────────────
    winner.result.award = "winner";
    await grantOnce(winner, "subscription_gold", () =>
      grantSubscription(winner.userId, "gold", now, competition._id));
    await grantOnce(winner, "badge_winner", () => awardBadge(winner.userId, BADGES.winner, competition._id));
    // isFeatured is what getFeaturedScripts reads; services.aiTrailer routes it into the existing
    // admin trailer pipeline rather than a second competition-only one.
    await grantOnce(winner, "featured_script", () => featureScript(winner.scriptId, { "services.aiTrailer": true }));
    winner.status = "judged";
    await winner.save();
    counts.winners = 1;
    await grantOnce(winner, "notified", () => notifyEntry(winner, name, `🏆 You won the ${name}! Your rewards have been added to your account.`, `🏆 You won the ${name}`));
    await winner.save();

    // Runner-up ─────────────────────────────────────────────────────────────
    if (runnerUp) {
      runnerUp.result.award = "runner_up";
      await grantOnce(runnerUp, "subscription_silver", () =>
        grantSubscription(runnerUp.userId, "silver", now, competition._id));
      await grantOnce(runnerUp, "badge_runner_up", () => awardBadge(runnerUp.userId, BADGES.runner_up, competition._id));
      await grantOnce(runnerUp, "featured_script", () => featureScript(runnerUp.scriptId));
      runnerUp.status = "judged";
      await runnerUp.save();
      counts.runnerUp = 1;
      await grantOnce(runnerUp, "notified", () => notifyEntry(runnerUp, name, `You placed Runner-Up in the ${name}! Your rewards have been added to your account.`, `Runner-Up — ${name}`));
      await runnerUp.save();
    }

    // Special awards ────────────────────────────────────────────────────────
    for (const { entry, title } of specials) {
      entry.result.award = "special";
      entry.result.specialTitle = title;
      // The badge carries the award's real name — "Best Dialogue", not "Special Award". The badge
      // ID stays `challenge_special` so the existing badge system, and awardBadge's
      // (id, competitionId) dedupe key, are untouched; only the human-readable label changes.
      // An older entry with no title falls back to the generic label.
      await grantOnce(entry, "badge_special", () =>
        awardBadge(entry.userId, { ...BADGES.special, label: title || BADGES.special.label }, competition._id));
      entry.status = "judged";
      await entry.save();
      counts.special += 1;
      await grantOnce(entry, "notified", () => notifyEntry(entry, name, `You received the "${title}" award in the ${name}!`, `${title} — ${name}`));
      await entry.save();
    }

    // Everyone else who actually submitted ──────────────────────────────────
    const placed = new Set([String(winner._id), runnerUp ? String(runnerUp._id) : "", ...specials.map((s) => String(s.entry._id))]);
    const completion = `Thank you for competing in the ${name}. Finishing a script in 48 hours is a real achievement — your AI evaluation and story materials are yours to keep, and your script stays in your Ckript library.`;

    for (const entry of entries) {
      if (placed.has(String(entry._id))) continue;
      // Registrants who never submitted stay `none` and earn no badge — a participation award has to
      // mean participation. `judged` is included so a retried declare re-visits entries it already
      // finished and heals any that missed a badge; grantOnce keeps that from duplicating anything.
      if (!hasSubmitted(entry)) continue;

      entry.result.award = "participant";
      await grantOnce(entry, "badge_participant", () => awardBadge(entry.userId, BADGES.participant, competition._id));
      entry.status = "judged";
      await entry.save();
      counts.participants += 1;
      await grantOnce(entry, "notified", () => notifyEntry(entry, name, completion, `${name} — results are in`));
      await entry.save();
    }

    // Referral drive rewards, settled at the same moment as everything else so a writer's whole
    // outcome lands in one go. Badge-only for the lower tiers; the top tiers add subscription time,
    // which is the one non-badge grant in this codebase that demonstrably persists.
    // Tiers are per-competition and admin-editable, so read them from the competition rather than a
    // module constant. grantOnce keys on `referral_<tierId>`, so editing tiers mid-competition can
    // add a reward but can never re-grant one already in the ledger.
    const referralTiers = tiersFor(competition);
    for (const entry of entries) {
      const progress = await getReferralProgress(entry.userId, competition);
      if (!progress.earned) continue;

      const tier = referralTiers.find((t) => t.id === progress.earned.id);
      if (!tier) continue;   // tier was renamed or removed after this entry qualified
      // grantOnce answers whether it actually granted; that answer was being thrown away and the
      // counter bumped regardless. A retried declare re-walks every entry and finds each reward
      // already in the ledger, so it granted nothing and still reported a full set of referral
      // rewards to the admin. Count the grants, not the entries that qualify.
      const grantedReferral = await grantOnce(entry, `referral_${tier.id}`, async () => {
        await awardBadge(entry.userId, { id: tier.id, label: tier.label }, competition._id);
        if (tier.days > 0) {
          const user = await User.findById(entry.userId).select("subscription");
          const grant = subscriptionGrant("silver", now, `competition-referral:${competition._id}`, user?.subscription);
          // The tier grants its own number of days, not the standard 30.
          const base = Math.max(now.getTime(), user?.subscription?.accessExpiresAt ? new Date(user.subscription.accessExpiresAt).getTime() : 0);
          const expiresAt = new Date(base + tier.days * 24 * 3600_000);
          grant["subscription.accessExpiresAt"] = expiresAt;
          grant["subscription.expiresAt"] = expiresAt;
          await User.updateOne({ _id: entry.userId }, { $set: grant });
        }
      });
      if (grantedReferral) counts.referralRewards = (counts.referralRewards || 0) + 1;
      await entry.save();
    }

    // The competition hands every entry back to its writer. The lock existed to make submission
    // final while the event was running; results are out, and `entry.snapshot` — the copy that was
    // actually judged — stays frozen forever regardless, so nothing about the result can change.
    // Writers can now publish (which is what makes the "Featured Script" prize real), edit, or
    // invite co-writers on their own script again. Idempotent, so a re-declare is harmless.
    const released = await Script.updateMany(
      { competitionId: competition._id },
      { $set: { competitionLocked: false, competitionReleasedAt: now } },
    );
    counts.scriptsReleased = released.modifiedCount ?? 0;

    competition.resultsDeclaredAt = now;
    await competition.save();

    return res.json({ declared: true, counts });
  } catch (error) {
    console.error("[competition admin] declare results failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to declare results." });
  }
};
