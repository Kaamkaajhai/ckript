import mongoose from "mongoose";
import Competition from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { createNotification, sendEmailNotification } from "../utils/notify.js";
import { hasProjectCreatorAccess } from "../utils/projectAccess.js";
import { generateCompetitionCertificate } from "../utils/competitionCertificatePdf.js";
import {
  getReferralProgress,
  ensureReferralCode,
  listCompetitionReferrals,
  referralWindow,
} from "../utils/competitionReferrals.js";
import { countPages } from "../utils/paginate.js";
import { isKnownCountry } from "../utils/countries.js";
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
  // `hidden` competitions are never DISCOVERED — an internal or university-only event must not take
  // over the public landing page. It stays fully usable for anyone holding its direct link.
  const discoverable = { lifecycle: "published", visibility: { $ne: "hidden" } };

  const current = await Competition.findOne({
    ...discoverable,
    resultsDeclaredAt: null,
    "dates.regOpensAt": { $lte: now },
  }).sort({ "dates.startsAt": -1 });
  if (current) return current;

  // Nothing open yet — show the next one due to open.
  const upcoming = await Competition.findOne({
    ...discoverable,
    resultsDeclaredAt: null,
    "dates.regOpensAt": { $gt: now },
  }).sort({ "dates.regOpensAt": 1 });
  if (upcoming) return upcoming;

  // Everything is finished: show the most recently declared so results stay reachable.
  return Competition.findOne(discoverable).sort({ "dates.startsAt": -1 });
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
    .populate("userId", "name profileImage writerProfile.username username isPrivate isDeactivated")
    .lean();

  // A writer who has since gone private or deleted their account is omitted entirely — the same rule
  // getCompetitionHistory applies. Their placing is not re-assigned to anyone else.
  const visible = entries.filter((e) => e.userId && !e.userId.isPrivate && !e.userId.isDeactivated);

  // NOTE: deliberately no scriptId. Competition entries stay private drafts; the Hall of Fame links
  // to the writer's profile, never to their script.
  const shape = (entry) => ({
    userId: String(entry.userId._id),
    name: entry.userId?.name || "Writer",
    username: entry.userId?.writerProfile?.username || entry.userId?.username || "",
    profileImage: entry.userId?.profileImage || "",
    scriptTitle: entry.snapshot?.title || "",
    logline: entry.ai?.logline || "",
    specialTitle: entry.result?.specialTitle || "",
    rewards: (entry.rewardsGranted || []).map((r) => r.type),
  });

  return {
    winner: visible.filter((e) => e.result.award === "winner").map(shape)[0] || null,
    runnerUp: visible.filter((e) => e.result.award === "runner_up").map(shape)[0] || null,
    special: visible.filter((e) => e.result.award === "special").map(shape),
  };
};

/**
 * Aggregate statistics for one competition.
 *
 * Individual-safe by construction: it returns counts only, never a row that could be traced back to
 * a person. In particular `countries` is a DISTINCT COUNT — registration.country is collected for
 * grouping, and no individual's country is ever published.
 */
const buildCompetitionStats = async (competitionId) => {
  const SUBMITTED = ["submitted", "ai_processed", "judged"];
  const [row] = await CompetitionEntry.aggregate([
    { $match: { competitionId } },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        scriptsSubmitted: { $sum: { $cond: [{ $in: ["$status", SUBMITTED] }, 1, 0] } },
        // Fold case and whitespace before counting: country is free text, so "USA", "usa " and
        // "Usa" are one country, not three. (Different spellings — "USA" vs "United States" — still
        // count separately; normalising those needs a country list, which is not worth it yet.)
        countries: { $addToSet: { $toLower: { $trim: { input: { $ifNull: ["$registration.country", ""] } } } } },
      },
    },
  ]);

  const totalParticipants = row?.totalParticipants || 0;
  const scriptsSubmitted = row?.scriptsSubmitted || 0;
  return {
    totalParticipants,
    scriptsSubmitted,
    countriesRepresented: (row?.countries || []).filter(Boolean).length,
    // How many of the writers who signed up actually finished. 0 participants ⇒ 0, not NaN.
    completionRate: totalParticipants ? Math.round((scriptsSubmitted / totalParticipants) * 100) : 0,
  };
};

// A competition belongs in the Hall of Fame once its results are declared. Archived editions stay —
// archiving retires a competition from the live page, it does not erase its history. Hidden ones
// never appear.
const HALL_OF_FAME_FILTER = {
  lifecycle: { $ne: "draft" },
  visibility: { $ne: "hidden" },
  resultsDeclaredAt: { $ne: null },
};

/**
 * GET /api/competitions/list  (public) — everything discoverable, bucketed for the Challenge hub.
 *
 * The hub needs to show "live", "upcoming" and "previous" side by side; `/active` deliberately
 * returns exactly ONE competition and cannot answer that.
 *
 * Two things this must not get wrong:
 *  - The THEME is the reveal, so it is only ever included for phases that have earned it. This
 *    reuses publicCompetition rather than spreading the raw document, so a competition that has not
 *    started cannot leak its theme through the list even though it leaks nothing through /active.
 *  - "Previous" is NOT the same as the Hall of Fame. A competition whose deadline has passed but
 *    whose results are not declared yet is finished from a writer's point of view, but has no
 *    winners to show. It belongs in `past` here and in neither list otherwise — without this bucket
 *    those competitions are invisible between the deadline and the announcement.
 */
export const listCompetitions = async (req, res) => {
  try {
    const now = new Date();
    const competitions = await Competition.find({
      lifecycle: "published",
      visibility: { $ne: "hidden" },
    }).sort({ "dates.startsAt": -1 }).lean();

    const buckets = { live: [], upcoming: [], past: [] };

    for (const competition of competitions) {
      const phase = getCompetitionPhase(competition, now);
      const safe = publicCompetition(competition, phase);
      const item = {
        _id: safe._id,
        name: safe.name,
        slug: safe.slug,
        phase,
        overview: safe.overview || "",
        bannerUrl: safe.bannerUrl || "",
        prizePool: safe.prizePool || "",
        dates: safe.dates,
        resultsDeclaredAt: safe.resultsDeclaredAt || null,
        // Present only once the theme has been released; withheld phases have no `theme` at all.
        theme: safe.theme?.title || "",
        year: new Date(safe.dates?.startsAt || safe.createdAt).getUTCFullYear(),
      };

      // `live` means a writer can still DO something — register, or write against the clock.
      // `judging` looks live by the dates but the deadline has passed and nothing can be entered or
      // submitted, so it sits with the finished ones, awaiting its result.
      if (phase === "announced") buckets.upcoming.push(item);
      else if (phase === "results" || phase === "judging") buckets.past.push(item);
      else buckets.live.push(item);   // registration_open | registration_closed | live
    }

    return res.json({ ...buckets, serverNow: now.toISOString() });
  } catch (error) {
    console.error("[competition] list failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load competitions." });
  }
};

// GET /api/competitions/completed  (public) — the Hall of Fame index
export const getCompletedCompetitions = async (req, res) => {
  try {
    const competitions = await Competition.find(HALL_OF_FAME_FILTER)
      .sort({ resultsDeclaredAt: -1 })
      .lean();

    const items = await Promise.all(competitions.map(async (competition) => {
      const [results, stats] = await Promise.all([
        buildPublicResults(competition._id),
        buildCompetitionStats(competition._id),
      ]);
      return {
        _id: competition._id,
        name: competition.name,
        slug: competition.slug,
        year: new Date(competition.dates?.startsAt || competition.resultsDeclaredAt).getUTCFullYear(),
        theme: competition.theme?.title || "",
        bannerUrl: competition.bannerUrl || "",
        prizePool: competition.prizePool || "",
        dates: competition.dates,
        resultsDeclaredAt: competition.resultsDeclaredAt,
        winner: results.winner,
        runnerUp: results.runnerUp,
        // Category winners (Best Dialogue and the like). The Hall of Fame is about the PEOPLE, so
        // it needs every award, not just the top two — omitting these silently erased a whole class
        // of winner from the record.
        special: results.special || [],
        ...stats,
      };
    }));

    return res.json({
      items,
      years: [...new Set(items.map((i) => i.year))].sort((a, b) => b - a),
    });
  } catch (error) {
    console.error("[competition] completed list failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load the Hall of Fame." });
  }
};

// GET /api/competitions/hall-of-fame/:slug  (public) — one competition's permanent record
export const getHallOfFameEntry = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const competition = await Competition.findOne({ ...HALL_OF_FAME_FILTER, slug }).lean();
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const [results, stats] = await Promise.all([
      buildPublicResults(competition._id),
      buildCompetitionStats(competition._id),
    ]);

    // Scripts from this competition that the writer has since chosen to publish. Empty until then —
    // winning entries are NOT auto-published, so this section simply stays hidden.
    const featuredScripts = await Script.find({
      competitionId: competition._id,
      isFeatured: true,
      status: { $in: ["published", "approved"] },
      isDeleted: { $ne: true },
    })
      .select("title coverImage genre primaryGenre logline creator")
      .populate("creator", "name profileImage writerProfile.username")
      .lean();

    return res.json({
      competition: {
        _id: competition._id,
        name: competition.name,
        slug: competition.slug,
        year: new Date(competition.dates?.startsAt || competition.resultsDeclaredAt).getUTCFullYear(),
        theme: competition.theme,          // fully public once results are declared
        bannerUrl: competition.bannerUrl || "",
        prizePool: competition.prizePool || "",
        overview: competition.overview || "",
        dates: competition.dates,
        resultsDeclaredAt: competition.resultsDeclaredAt,
        prizes: competition.prizes,
        judges: competition.judges || [],
        sponsors: competition.sponsors || [],
      },
      results,
      stats,
      featuredScripts: featuredScripts.map((script) => ({
        _id: script._id,
        title: script.title,
        coverImage: script.coverImage || "",
        genre: script.primaryGenre || script.genre || "",
        logline: script.logline || "",
        writer: {
          _id: script.creator?._id,
          name: script.creator?.name || "Writer",
          username: script.creator?.writerProfile?.username || "",
          profileImage: script.creator?.profileImage || "",
        },
      })),
    });
  } catch (error) {
    console.error("[competition] hall of fame entry failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load the competition." });
  }
};

// ── Participant endpoints ───────────────────────────────────────────────────

// GET /api/competitions/active  (public)
export const getActiveCompetition = async (req, res) => {
  try {
    // `?c=<slug>` targets one competition explicitly. This is how a hidden (internal / university /
    // sponsor-exclusive) competition is reached: it is excluded from discovery, so without this its
    // own entrants could never load it. Draft competitions stay unreachable either way.
    const requestedSlug = String(req.query.c || "").trim().toLowerCase();
    const competition = requestedSlug
      ? await Competition.findOne({ slug: requestedSlug, lifecycle: "published" })
      : await findActiveCompetition();
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

    // Membership-checked, not just non-empty. The form is a fixed dropdown, so a value outside the
    // list means a hand-crafted request — and one bad spelling permanently skews the "N countries
    // represented" figure the Hall of Fame publishes.
    if (!isKnownCountry(cleanCountry)) {
      return res.status(400).json({ message: "Select a country from the list." });
    }
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

// GET /api/competitions/:id/referrals  (protect) — the signed-in user's own referral history
export const getMyCompetitionReferrals = async (req, res) => {
  try {
    const competition = await loadPublishedById(req.params.id);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const [progress, referrals] = await Promise.all([
      getReferralProgress(req.user._id, competition),
      listCompetitionReferrals(req.user._id, competition),
    ]);

    return res.json({
      progress,
      referrals,
      referralCode: await ensureReferralCode(req.user),
      window: referralWindow(competition),
    });
  } catch (error) {
    console.error("[competition] referral history failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to load your referrals." });
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
      // slug + visibility so the profile can link to the Hall of Fame entry — and refrain from
      // linking for a hidden competition, which has no public record.
      .populate("competitionId", "name slug dates resultsDeclaredAt visibility")
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
        // Only a competition with a public Hall of Fame record is linkable.
        competitionSlug: entry.competitionId.visibility === "hidden" || !entry.competitionId.resultsDeclaredAt
          ? ""
          : entry.competitionId.slug || "",
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
