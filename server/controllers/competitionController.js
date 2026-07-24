import mongoose from "mongoose";
import Competition from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { createNotification, sendEmailNotification } from "../utils/notify.js";
import { hasProjectCreatorAccess } from "../utils/projectAccess.js";
import { generateCompetitionCertificate } from "../utils/competitionCertificatePdf.js";
import { getReferralProgress, ensureReferralCode } from "../utils/competitionReferrals.js";
import { countPages } from "../utils/paginate.js";
import { classifyText } from "../utils/classify.js";
import {
  getCompetitionPhase,
  buildTimeline,
  canSubmitNow,
} from "../utils/competitionPhase.js";

// ── Shared helpers ──────────────────────────────────────────────────────────

const PHASES_WITH_THEME = new Set(["live", "judging", "results"]);

/**
 * Shape a competition for the client.
 *
 * The theme is withheld until the competition is live — the reveal is the whole point of the event,
 * so it is stripped SERVER-side. Never rely on the client hiding it.
 */
const publicCompetition = (competition, phase) => {
  const obj = typeof competition.toObject === "function" ? competition.toObject() : { ...competition };
  if (!PHASES_WITH_THEME.has(phase)) delete obj.theme;
  return obj;
};

/**
 * The one competition the public page shows.
 *
 * "Latest startsAt" alone was wrong: announcing next year's edition while this weekend's is still
 * running would hijack /active, hiding the live theme and the countdown from everyone mid-competition.
 * So prefer a competition whose window has actually opened and not yet been declared — newest first —
 * and only fall back to the soonest upcoming one when nothing is currently in flight.
 */
const findActiveCompetition = async () => {
  const now = new Date();

  const current = await Competition.findOne({
    lifecycle: "published",
    resultsDeclaredAt: null,
    "dates.regOpensAt": { $lte: now },
  }).sort({ "dates.startsAt": -1 });
  if (current) return current;

  // Nothing open yet — show the next one due to open.
  const upcoming = await Competition.findOne({
    lifecycle: "published",
    resultsDeclaredAt: null,
    "dates.regOpensAt": { $gt: now },
  }).sort({ "dates.regOpensAt": 1 });
  if (upcoming) return upcoming;

  // Everything is finished: show the most recently declared so results stay reachable.
  return Competition.findOne({ lifecycle: "published" }).sort({ "dates.startsAt": -1 });
};

const loadPublishedById = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Competition.findOne({ _id: id, lifecycle: { $ne: "archived" } });
};

const countWords = (text = "") => String(text).trim().split(/\s+/).filter(Boolean).length;

const countScenes = (text = "") => {
  if (!String(text || "").trim()) return 0;
  // Same classifier the editor, paginator and PDF use, so the count matches what the writer saw.
  return classifyText(text).filter((type) => type === "scene").length;
};

// Results shown publicly once declared. Deliberately winners-only: no rankings, no scores for
// anyone else (a competition should not publish a leaderboard of who lost).
const buildPublicResults = async (competitionId) => {
  const entries = await CompetitionEntry.find({
    competitionId,
    "result.award": { $in: ["winner", "runner_up", "special"] },
  })
    .populate("userId", "name profileImage writerProfile.username username")
    .lean();

  const shape = (entry) => ({
    name: entry.userId?.name || "Writer",
    username: entry.userId?.writerProfile?.username || entry.userId?.username || "",
    profileImage: entry.userId?.profileImage || "",
    scriptTitle: entry.snapshot?.title || "",
    logline: entry.ai?.logline || "",
    specialTitle: entry.result?.specialTitle || "",
  });

  return {
    winner: entries.filter((e) => e.result.award === "winner").map(shape)[0] || null,
    runnerUp: entries.filter((e) => e.result.award === "runner_up").map(shape)[0] || null,
    special: entries.filter((e) => e.result.award === "special").map(shape),
  };
};

// ── Participant endpoints ───────────────────────────────────────────────────

// GET /api/competitions/active  (public)
export const getActiveCompetition = async (req, res) => {
  try {
    const competition = await findActiveCompetition();
    if (!competition) return res.status(404).json({ message: "No active competition" });

    const now = new Date();
    const phase = getCompetitionPhase(competition, now);
    const payload = {
      competition: publicCompetition(competition, phase),
      phase,
      timeline: buildTimeline(competition, null, now),
      // Lets the client correct for a skewed device clock so countdowns are honest.
      serverNow: now.toISOString(),
    };
    if (phase === "results") payload.results = await buildPublicResults(competition._id);
    return res.json(payload);
  } catch (error) {
    console.error("[competition] getActive failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load the competition." });
  }
};

// POST /api/competitions/:id/register  (protect)
export const registerForCompetition = async (req, res) => {
  try {
    const competition = await loadPublishedById(req.params.id);
    if (!competition || competition.lifecycle !== "published") {
      return res.status(404).json({ message: "Competition not found." });
    }

    // Entering means writing a script, so the same rule that governs authoring applies here. Caught
    // at registration rather than at the first keystroke: letting a reader or investor register and
    // then refusing their writing would strand them with an entry they can never fulfil.
    if (!hasProjectCreatorAccess(req.user)) {
      return res.status(403).json({ message: "Only writer accounts can enter the competition." });
    }

    const now = new Date();
    const phase = getCompetitionPhase(competition, now);

    // An existing entry short-circuits BEFORE the phase check: someone returning to the page after
    // registration closes should be let through to their dashboard, not told registration is shut.
    const existing = await CompetitionEntry.findOne({ competitionId: competition._id, userId: req.user._id });
    if (existing) {
      return res.json({
        entry: existing,
        alreadyRegistered: true,
        phase,
        timeline: buildTimeline(competition, existing, now),
      });
    }

    if (phase !== "registration_open") {
      return res.status(409).json({ message: "Registration is not open." });
    }

    const {
      country, language, genres, experienceLevel, portfolioUrl,
      acceptRules, acceptCopyright,
    } = req.body || {};

    const cleanCountry = String(country || "").trim();
    const cleanLanguage = String(language || "").trim();
    const cleanGenres = (Array.isArray(genres) ? genres : []).map((g) => String(g || "").trim()).filter(Boolean);
    const cleanExperience = String(experienceLevel || "").trim().toLowerCase();
    const cleanPortfolio = String(portfolioUrl || "").trim();

    if (!cleanCountry) return res.status(400).json({ message: "Country is required." });
    if (!cleanLanguage) return res.status(400).json({ message: "Preferred language is required." });
    if (cleanGenres.length < 1 || cleanGenres.length > 3) {
      return res.status(400).json({ message: "Choose between 1 and 3 preferred genres." });
    }
    if (!["beginner", "intermediate", "professional"].includes(cleanExperience)) {
      return res.status(400).json({ message: "Select your experience level." });
    }
    if (cleanPortfolio && !/^https?:\/\//i.test(cleanPortfolio)) {
      return res.status(400).json({ message: "Portfolio link must start with http:// or https://" });
    }
    if (acceptRules !== true) return res.status(400).json({ message: "You must accept the competition rules." });
    if (acceptCopyright !== true) return res.status(400).json({ message: "You must accept the copyright policy." });

    let entry;
    try {
      entry = await CompetitionEntry.create({
        competitionId: competition._id,
        userId: req.user._id,
        registration: {
          country: cleanCountry,
          language: cleanLanguage,
          genres: cleanGenres,
          experienceLevel: cleanExperience,
          portfolioUrl: cleanPortfolio,
        },
        acceptedRulesAt: now,
        acceptedCopyrightAt: now,
      });
    } catch (err) {
      // Lost a race against a double-submit — the unique index is the source of truth.
      if (err?.code === 11000) {
        const raced = await CompetitionEntry.findOne({ competitionId: competition._id, userId: req.user._id });
        if (raced) {
          return res.json({ entry: raced, alreadyRegistered: true, phase, timeline: buildTimeline(competition, raced, now) });
        }
      }
      throw err;
    }

    await createNotification({
      userId: req.user._id,
      type: "competition",
      message: `You're registered for ${competition.name}. Event ID ${entry.eventId}.`,
    });
    sendEmailNotification({
      to: req.user.email,
      subject: `You're in — ${competition.name}`,
      html: `<p>Hi ${req.user.name || "there"},</p>
        <p>You're registered for <strong>${competition.name}</strong>.</p>
        <p>Your Event ID is <strong>${entry.eventId}</strong>.</p>
        <p>The competition starts ${new Date(competition.dates.startsAt).toUTCString()} — the theme is revealed then, and you'll have 48 hours to write.</p>`,
      text: `You're registered for ${competition.name}. Event ID ${entry.eventId}. Starts ${new Date(competition.dates.startsAt).toUTCString()}.`,
    }).catch(() => { /* email is best-effort; registration already succeeded */ });

    return res.status(201).json({ entry, phase, timeline: buildTimeline(competition, entry, now) });
  } catch (error) {
    console.error("[competition] register failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to register for the competition." });
  }
};

// GET /api/competitions/:id/me  (protect) — the single payload the dashboard renders from
export const getMyEntry = async (req, res) => {
  try {
    const competition = await loadPublishedById(req.params.id);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const entry = await CompetitionEntry.findOne({ competitionId: competition._id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: "You are not registered for this competition." });

    const now = new Date();
    const phase = getCompetitionPhase(competition, now);
    const payload = {
      competition: publicCompetition(competition, phase),
      entry,
      phase,
      timeline: buildTimeline(competition, entry, now),
      referrals: await getReferralProgress(req.user._id, competition),
      referralCode: await ensureReferralCode(req.user),
      serverNow: now.toISOString(),
    };
    if (phase === "results") payload.results = await buildPublicResults(competition._id);
    return res.json(payload);
  } catch (error) {
    console.error("[competition] getMyEntry failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load your competition entry." });
  }
};

// POST /api/competitions/:id/open-editor  (protect)
export const openCompetitionEditor = async (req, res) => {
  try {
    const competition = await loadPublishedById(req.params.id);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    // Belt-and-braces: this endpoint creates a Script directly, so it must not be a way around the
    // authoring rule even if an entry somehow predates the check in register.
    if (!hasProjectCreatorAccess(req.user)) {
      return res.status(403).json({ message: "Only writer accounts can write a competition entry." });
    }

    const phase = getCompetitionPhase(competition);
    if (phase !== "live") {
      return res.status(409).json({ message: "The writing window is not open." });
    }

    const entry = await CompetitionEntry.findOne({ competitionId: competition._id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: "You are not registered for this competition." });
    if (["submitted", "ai_processed", "judged"].includes(entry.status)) {
      return res.status(409).json({ message: "You have already submitted your script." });
    }

    // Idempotent: reopening the editor must return the SAME script, never start a fresh one.
    if (entry.scriptId) return res.json({ scriptId: String(entry.scriptId) });

    const script = await Script.create({
      creator: req.user._id,
      title: `${competition.name} — ${req.user.name || "Entry"}`,
      status: "draft",
      projectSource: "editor",
      competitionId: competition._id,
      format: "feature_film",
      fountainContent: "",
      textContent: "",
    });

    // Claim the entry ATOMICALLY. A plain assign-and-save would let two concurrent calls (a
    // double-click, or the dashboard open in two tabs) each create a script and race their writes:
    // the loser's script stays orphaned, but its id was already returned to that tab, so the writer
    // could spend the whole window writing into a script the entry no longer points at — and then be
    // told their submission is empty. The filter makes exactly one caller the winner.
    const claimed = await CompetitionEntry.findOneAndUpdate(
      { _id: entry._id, $or: [{ scriptId: null }, { scriptId: { $exists: false } }] },
      { $set: { scriptId: script._id, status: "writing" } },
      { new: true },
    );

    if (!claimed) {
      // Someone else claimed it first — bin the script we just made and hand back the real one.
      await Script.deleteOne({ _id: script._id });
      const current = await CompetitionEntry.findById(entry._id).select("scriptId");
      return res.json({ scriptId: String(current.scriptId) });
    }

    return res.json({ scriptId: String(script._id) });
  } catch (error) {
    console.error("[competition] openEditor failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to open the competition editor." });
  }
};

// POST /api/competitions/:id/submit  (protect)
export const submitCompetitionEntry = async (req, res) => {
  try {
    const competition = await loadPublishedById(req.params.id);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const entry = await CompetitionEntry.findOne({ competitionId: competition._id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: "You are not registered for this competition." });
    if (["submitted", "ai_processed", "judged"].includes(entry.status)) {
      return res.status(409).json({ message: "Already submitted." });
    }
    if (!canSubmitNow(competition)) {
      return res.status(409).json({ message: "The submission window has closed." });
    }

    const { confirmOriginal, confirmFinal } = req.body || {};
    if (confirmOriginal !== true || confirmFinal !== true) {
      return res.status(400).json({ message: "Please confirm both checklist items before submitting." });
    }

    if (!entry.scriptId) {
      return res.status(400).json({ message: "Your script looks empty — write your script before submitting." });
    }
    const script = await Script.findById(entry.scriptId);
    if (!script) return res.status(404).json({ message: "Your competition script could not be found." });

    const fountain = String(script.fountainContent || "");
    const text = String(script.textContent || "");
    const source = fountain.trim() || text.trim();
    if (source.length < 100) {
      return res.status(400).json({ message: "Your script looks empty — write your script before submitting." });
    }

    const now = new Date();
    // Lock the script BEFORE the entry flips, so a concurrent autosave can't land between the read
    // above and the freeze below and put content into the script that the snapshot never captured.
    await Script.updateOne({ _id: script._id }, { $set: { competitionLocked: true } });

    // Claim the submission atomically — the status check above is a read, so two simultaneous submits
    // would both pass it and each write a snapshot, send an email, and kick off an AI run.
    const submitted = await CompetitionEntry.findOneAndUpdate(
      { _id: entry._id, status: { $in: ["registered", "writing"] } },
      {
        $set: {
          status: "submitted",
          submittedAt: now,
          snapshot: {
            fountainContent: fountain,
            textContent: text,
            title: script.title || "",
            wordCount: countWords(source),
            charCount: source.length,
            pageCount: countPages(source),
            sceneCount: countScenes(source),
          },
        },
      },
      { new: true },
    );
    if (!submitted) {
      // Someone else got there first; the script is locked either way.
      return res.status(409).json({ message: "Already submitted." });
    }
    Object.assign(entry, submitted.toObject());

    await createNotification({
      userId: req.user._id,
      type: "competition",
      message: `Submission received for ${competition.name} at ${now.toUTCString()}.`,
    });
    sendEmailNotification({
      to: req.user.email,
      subject: `Submission received — ${competition.name}`,
      html: `<p>Hi ${req.user.name || "there"},</p>
        <p>Your script <strong>${script.title || "Untitled"}</strong> was submitted to <strong>${competition.name}</strong>.</p>
        <p>Submitted at ${now.toUTCString()}. Your script is now locked. We'll email you when results are announced.</p>`,
      text: `Your script was submitted to ${competition.name} at ${now.toUTCString()}.`,
    }).catch(() => { /* best effort */ });

    // Respond before the AI work — the writer should never wait on a model call to learn they made
    // the deadline.
    res.json({ entry, timeline: buildTimeline(competition, entry, now) });

    processEntryAI(entry._id).catch((err) => {
      console.warn("[competition] AI processing failed:", err?.message || err);
    });
    return undefined;
  } catch (error) {
    console.error("[competition] submit failed:", error?.message || error);
    if (!res.headersSent) return res.status(500).json({ message: "Failed to submit your script." });
    return undefined;
  }
};

// GET /api/competitions/:id/participants  (protect)
//
// The writers taking part, so entrants can find each other. Deliberately participant-only: you must
// have an entry yourself to see the room. It exposes who is competing, never what they wrote — no
// entry status, no snapshot, no scores, so nobody can infer who has already submitted or how their
// work was rated.
export const getCompetitionParticipants = async (req, res) => {
  try {
    const competition = await loadPublishedById(req.params.id);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const mine = await CompetitionEntry.findOne({ competitionId: competition._id, userId: req.user._id }).lean();
    if (!mine) return res.status(403).json({ message: "Only entrants can see who else is competing." });

    const entries = await CompetitionEntry.find({ competitionId: competition._id })
      .populate({
        path: "userId",
        select: "name profileImage role bio writerProfile.username writerProfile.genres isPrivate isDeactivated isFrozen followers followRequests",
      })
      .lean();

    const meId = String(req.user._id);
    const participants = entries
      .map((entry) => entry.userId)
      // A deleted or suspended account is not part of the room. A PRIVATE account still is — being
      // private hides your work, not your presence — but see the field list above: nothing about
      // their entry is included either way.
      .filter((user) => user && !user.isDeactivated && !user.isFrozen)
      .map((user) => ({
        _id: user._id,
        name: user.name,
        username: user.writerProfile?.username || "",
        profileImage: user.profileImage || "",
        role: user.role,
        bio: user.isPrivate ? "" : String(user.bio || "").slice(0, 240),
        genres: user.isPrivate ? [] : (user.writerProfile?.genres || []).slice(0, 5),
        isPrivate: Boolean(user.isPrivate),
        isSelf: String(user._id) === meId,
        isFollowing: (user.followers || []).some((f) => String(f) === meId),
        // followUser always creates a request (it never consults isPrivate), so the button has three
        // states, not two. Without this the UI would offer "Follow" to someone you already asked.
        followRequestPending: (user.followRequests || []).some((r) => String(r?.from) === meId),
      }))
      .sort((a, b) => (a.isSelf ? -1 : b.isSelf ? 1 : a.name.localeCompare(b.name)));

    return res.json({ participants, total: participants.length });
  } catch (error) {
    console.error("[competition] participants failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load participants." });
  }
};

// Filenames go straight into a response header, so strip anything that could break or inject there.
const sanitizePdfFileName = (value = "certificate") => {
  const base = String(value).replace(/[\\/]/g, "-").replace(/[^a-zA-Z0-9._ -]/g, "_").trim() || "certificate";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
};

// GET /api/competitions/:id/certificate  (protect)
//
// Only the entrant can download their own, and only once the competition has been judged — a
// certificate issued before results would be a claim about an outcome that does not exist yet.
export const getCompetitionCertificate = async (req, res) => {
  try {
    const competition = await loadPublishedById(req.params.id);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const entry = await CompetitionEntry.findOne({ competitionId: competition._id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: "You are not registered for this competition." });
    if (entry.status !== "judged") {
      return res.status(409).json({ message: "Your certificate will be available once results are announced." });
    }

    const pdf = await generateCompetitionCertificate({
      writerName: req.user.name,
      competitionName: competition.name,
      scriptTitle: entry.snapshot?.title || "",
      award: entry.result?.award || "participant",
      specialTitle: entry.result?.specialTitle || "",
      eventId: entry.eventId,
      declaredAt: competition.resultsDeclaredAt,
      stats: {
        pageCount: entry.snapshot?.pageCount,
        wordCount: entry.snapshot?.wordCount,
        sceneCount: entry.snapshot?.sceneCount,
      },
    });

    const disposition = String(req.query.download || "") === "1" ? "attachment" : "inline";
    const filename = sanitizePdfFileName(`${competition.name} certificate ${entry.eventId}`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    return res.send(pdf);
  } catch (error) {
    console.error("[competition] certificate failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to generate your certificate." });
  }
};

// GET /api/competitions/mine  (protect)
export const getMyCompetitions = async (req, res) => {
  try {
    const entries = await CompetitionEntry.find({ userId: req.user._id })
      .populate("competitionId", "name slug dates resultsDeclaredAt lifecycle")
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const items = entries
      .filter((entry) => entry.competitionId)
      .map((entry) => ({
        entry,
        competition: entry.competitionId,
        phase: getCompetitionPhase(entry.competitionId, now),
        timeline: buildTimeline(entry.competitionId, entry, now),
      }));

    return res.json({ items, serverNow: now.toISOString() });
  } catch (error) {
    console.error("[competition] getMine failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load your competitions." });
  }
};

// GET /api/competitions/history/:userId  (public) — profile competition history
export const getCompetitionHistory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.json({ history: [] });

    // This endpoint is unauthenticated, so it must respect the same visibility rules the rest of the
    // profile does. A private or deleted account's competition record is not public just because it
    // lives in a different collection.
    const owner = await User.findById(req.params.userId).select("isPrivate isDeactivated").lean();
    if (!owner || owner.isDeactivated || owner.isPrivate) return res.json({ history: [] });

    // Only judged entries are public: nothing about an in-flight competition leaks, and there are no
    // rankings — just the achievement.
    const entries = await CompetitionEntry.find({ userId: req.params.userId, status: "judged" })
      .populate("competitionId", "name dates resultsDeclaredAt")
      .sort({ submittedAt: -1 })
      .lean();

    const AWARD_LABELS = {
      winner: "Winner",
      runner_up: "Runner-Up",
      special: "Special Award",
      participant: "Participant",
      none: "Participant",
    };

    const history = entries
      .filter((entry) => entry.competitionId)
      .map((entry) => ({
        competitionName: entry.competitionId.name,
        year: new Date(entry.competitionId.dates?.startsAt || entry.createdAt).getUTCFullYear(),
        scriptTitle: entry.snapshot?.title || "",
        achievement: entry.result?.specialTitle || AWARD_LABELS[entry.result?.award] || "Participant",
        award: entry.result?.award || "participant",
      }));

    return res.json({ history });
  } catch (error) {
    console.error("[competition] history failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load competition history." });
  }
};

// AI processing lives in a separate module-level function so both submit and the admin "Retry AI"
// action call exactly the same code path. Implemented in the next task.
export const processEntryAI = async (entryId) => {
  const { runEntryAIProcessing } = await import("./competitionAI.js");
  return runEntryAIProcessing(entryId);
};
