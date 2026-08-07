import mongoose from "mongoose";
import multer from "multer";
import crypto from "crypto";
import Competition from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";
import ExternalRegistration from "../models/ExternalRegistration.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { getCompetitionPhase } from "../utils/competitionPhase.js";
import { isKnownCountry } from "../utils/countries.js";
import { isKnownProvider, providerName, EXTERNAL_EVENT_PROVIDERS } from "../utils/externalEventProviders.js";
import { recordGrant } from "../utils/ledger.js";
import { createNotification } from "../utils/notify.js";
import { sendExternalRegistrationDecisionEmail } from "../utils/emailService.js";

/**
 * "I already registered through Luma / BookMyShow / FilmFreeway" — the claim, and the human decision.
 *
 * Every other way into a competition proves itself: a Razorpay signature says a payment happened.
 * This one cannot. The entrant paid somebody else, so the only evidence is a reference number and
 * maybe a screenshot, and a person has to look at it. That makes this an admin review queue, not a
 * checkout — and it means the rules below are about making the reviewer's job possible, not about
 * validating a token.
 *
 * Approval creates the CompetitionEntry with no payment attached and writes a LEDGER GRANT for the
 * entry fee. The grant is the point: Ckript received nothing, and an entry that simply appeared with
 * no money and no record against it is exactly the sort of hole the ledger exists to close. No
 * invoice is issued — the entrant paid a third party, and a Ckript invoice for money Ckript never
 * took would be a false document.
 */

const REGISTRATION_FEE_MINOR = { INR: 9800, USD: 200 };

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max);

/**
 * A booking reference reduced to what actually identifies it.
 *
 * The same Luma ticket arrives as "EVT-8841XY", "evt 8841xy" and "EVT8841XY" because people read
 * it off a screen and retype it. Comparing raw strings meant a second claimant defeated the
 * one-ticket rule by typing it slightly differently — usually without meaning to, which is worse,
 * because then nobody notices the duplicate at all.
 */
const refKey = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The optional proof screenshot.
 *
 * Images only, and 8MB — a phone screenshot is well under that, and the limit is what stops the
 * endpoint from being a free file host. Memory storage because the buffer goes straight to Cloudinary
 * and never touches this disk.
 */
const SCREENSHOT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (SCREENSHOT_MIME_TYPES.has(file?.mimetype)) return cb(null, true);
    return cb(new Error("Upload a JPG, PNG, WebP or HEIC screenshot."));
  },
}).single("screenshot");

/** Multer's errors are turned into the message the entrant should actually read. */
export const uploadExternalRegistrationScreenshot = (req, res, next) => {
  screenshotUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Screenshot must be 8MB or smaller." });
    }
    return res.status(400).json({ message: err.message || "Screenshot upload failed." });
  });
};

/** The projection the client and the admin queue both read. Never leaks another entrant's data. */
const publicShape = (doc) => ({
  _id: doc._id,
  competition: doc.competition,
  provider: doc.provider,
  providerName: providerName(doc.provider),
  fullName: doc.fullName,
  phone: doc.phone,
  externalRef: doc.externalRef,
  screenshotUrl: doc.screenshotUrl || "",
  status: doc.status,
  reviewNote: doc.reviewNote || "",
  attempt: doc.attempt,
  reviewedAt: doc.reviewedAt || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

/** GET /api/competitions/external-providers — the fixed list the form renders. */
export const listExternalProviders = async (_req, res) => {
  return res.json({ providers: EXTERNAL_EVENT_PROVIDERS });
};

/**
 * POST /api/competitions/:id/external-registration  (protect, multipart)
 *
 * Also the RESUBMIT path. A rejected claim is not replaced by a second document — the same one goes
 * back to pending with its attempt count raised and the rejection preserved in `history`, so a
 * reviewer seeing a fourth attempt knows it is a fourth attempt.
 */
export const submitExternalRegistration = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);
    if (!competition) return res.status(404).json({ message: "Competition not found." });

    const now = new Date();
    if (getCompetitionPhase(competition, now) !== "registration_open") {
      return res.status(409).json({ message: "Registration is not open for this challenge." });
    }

    // Already in? Then there is nothing to review. Checked before anything is written so a
    // double-submit cannot produce a claim against an entry that already exists.
    const existingEntry = await CompetitionEntry.findOne({
      competitionId: competition._id,
      userId: req.user._id,
    }).select("_id eventId");
    if (existingEntry) {
      return res.status(409).json({
        message: "You are already registered for this challenge.",
        eventId: existingEntry.eventId,
      });
    }

    const {
      provider, fullName, phone, externalRef,
      country, language, genres, experienceLevel, portfolioUrl,
      acceptRules, acceptCopyright,
    } = req.body || {};

    if (!isKnownProvider(provider)) {
      return res.status(400).json({ message: "Choose the platform you registered on." });
    }

    const cleanName = clean(fullName, 120);
    const cleanPhone = clean(phone, 30);
    const cleanRef = clean(externalRef, 120);
    if (!cleanName) return res.status(400).json({ message: "Enter the name you registered with." });
    // Loose on purpose: this is an international field and a reviewer reads it, nothing dials it.
    if (!/^[+\d][\d\s()-]{6,}$/.test(cleanPhone)) {
      return res.status(400).json({ message: "Enter the phone number you registered with." });
    }
    if (cleanRef.length < 3) {
      return res.status(400).json({ message: "Enter your registration or booking ID from that platform." });
    }

    const cleanCountry = clean(country, 80);
    const cleanLanguage = clean(language, 60);
    // Multipart sends repeated fields as an array and a single one as a string.
    const rawGenres = Array.isArray(genres) ? genres : (genres ? [genres] : []);
    const cleanGenres = rawGenres.map((g) => clean(g, 40)).filter(Boolean);
    const cleanExperience = clean(experienceLevel, 20).toLowerCase();
    const cleanPortfolio = clean(portfolioUrl, 300);

    if (!isKnownCountry(cleanCountry)) return res.status(400).json({ message: "Select a country from the list." });
    if (!cleanLanguage) return res.status(400).json({ message: "Preferred language is required." });
    if (cleanGenres.length < 1 || cleanGenres.length > 3) return res.status(400).json({ message: "Select 1 to 3 genres." });
    if (!["beginner", "intermediate", "professional"].includes(cleanExperience)) {
      return res.status(400).json({ message: "Select a valid experience level." });
    }
    if (cleanPortfolio && !/^https?:\/\//i.test(cleanPortfolio)) {
      return res.status(400).json({ message: "Portfolio link must start with http:// or https://" });
    }
    // Truthy across form-data ("true") and JSON (true) alike.
    const accepted = (v) => v === true || String(v).toLowerCase() === "true";
    if (!accepted(acceptRules)) return res.status(400).json({ message: "You must accept the competition rules." });
    if (!accepted(acceptCopyright)) return res.status(400).json({ message: "You must accept the copyright policy." });

    const existing = await ExternalRegistration.findOne({
      competition: competition._id,
      user: req.user._id,
    });

    if (existing && existing.status === "pending") {
      return res.status(409).json({
        message: "Your request is already with our team. We'll email you as soon as it's reviewed.",
        request: publicShape(existing),
      });
    }
    if (existing && existing.status === "approved") {
      return res.status(409).json({ message: "This request was already approved." });
    }

    // Uploaded only once the payload is known good, so a rejected form does not leave an orphan file
    // in Cloudinary.
    let screenshotUrl = "";
    let screenshotPublicId = "";
    if (req.file?.buffer) {
      try {
        // The public_id used to be `ext-<competitionId>-<userId>-<attempt>`. Every part of that is
        // knowable — competition ids are in URLs, user ids appear across the API — so the delivery
        // URL of somebody else's proof could simply be constructed, and these images are a ticket
        // holder's name, booking reference and often a partial payment record. A random suffix makes
        // the path unguessable, which is the control Cloudinary actually gives us on public delivery.
        const uploaded = await uploadToCloudinary(req.file.buffer, {
          folder: "scriptbridge/external-registrations",
          resource_type: "image",
          public_id: `ext-${competition._id}-${crypto.randomBytes(16).toString("hex")}`,
          originalFilename: req.file.originalname,
          mimeType: req.file.mimetype,
        });
        screenshotUrl = uploaded.secure_url;
        screenshotPublicId = uploaded.public_id;
      } catch (uploadError) {
        // The proof is optional; losing it must not lose the claim.
        console.error("[external-registration] screenshot upload failed:", uploadError?.message || uploadError);
      }
    }

    const payload = {
      provider,
      fullName: cleanName,
      phone: cleanPhone,
      externalRef: cleanRef,
      externalRefKey: refKey(cleanRef),
      registration: {
        country: cleanCountry,
        language: cleanLanguage,
        genres: cleanGenres,
        experienceLevel: cleanExperience,
        portfolioUrl: cleanPortfolio,
      },
      acceptedRulesAt: now,
      acceptedCopyrightAt: now,
      status: "pending",
      reviewNote: "",
      reviewedBy: undefined,
      reviewedAt: undefined,
      ...(screenshotUrl ? { screenshotUrl, screenshotPublicId } : {}),
    };

    let request;
    if (existing) {
      // Resubmission after a rejection. The previous verdict is kept so the queue shows the history.
      existing.history.push({
        at: existing.reviewedAt || new Date(),
        by: existing.reviewedBy,
        note: existing.reviewNote,
        provider: existing.provider,
        externalRef: existing.externalRef,
      });
      // A resubmission with a NEW reference but no new screenshot must not keep the old image — the
      // reviewer would otherwise be looking at proof of a reference that no longer exists on the
      // claim, and approving it on that basis.
      if (!screenshotUrl && refKey(cleanRef) !== existing.externalRefKey) {
        existing.screenshotUrl = "";
        existing.screenshotPublicId = "";
      }
      Object.assign(existing, payload);
      existing.attempt += 1;
      request = await existing.save();
    } else {
      request = await ExternalRegistration.create({
        competition: competition._id,
        user: req.user._id,
        ...payload,
      });
    }

    return res.status(201).json({
      message: "Sent to our team. We'll email you once it's reviewed.",
      request: publicShape(request),
    });
  } catch (error) {
    // A duplicate key means a concurrent submit won; return that one rather than an error.
    if (error?.code === 11000) {
      const current = await ExternalRegistration.findOne({
        competition: req.params.id,
        user: req.user._id,
      });
      if (current) return res.status(200).json({ request: publicShape(current) });
    }
    console.error("[external-registration] submit failed:", error);
    return res.status(500).json({ message: "Could not send your request. Please try again." });
  }
};

/** GET /api/competitions/:id/external-registration  (protect) — the entrant's own claim and status. */
export const getMyExternalRegistration = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid competition id." });
    }
    const request = await ExternalRegistration.findOne({
      competition: req.params.id,
      user: req.user._id,
    });
    if (!request) return res.json({ request: null });
    return res.json({ request: publicShape(request) });
  } catch (error) {
    console.error("[external-registration] fetch failed:", error);
    return res.status(500).json({ message: "Could not load your request." });
  }
};

/** GET /api/admin/external-registrations?status=pending&page=1  (adminOnly) */
export const listExternalRegistrations = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();

    // Every value below is rebuilt from a literal or an explicit String(), never handed through from
    // req.query. The request sanitiser already strips operator keys globally, but that is a guarantee
    // one layer away from this query; a value that arrives as ["luma"] passes isKnownProvider (because
    // String(["luma"]) === "luma") and would then be matched as an ARRAY. Constructing the filter from
    // known-good primitives is what makes the shape of this query independent of what was sent.
    const filter = {};
    if (["pending", "approved", "rejected"].includes(status)) filter.status = String(status);
    if (isKnownProvider(req.query.provider)) filter.provider = String(req.query.provider);
    if (search) {
      // Escaped AND bounded: an unescaped user string in a $regex is an injection, and an unbounded
      // one is a denial of service against the database rather than this process.
      const safe = search.slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      filter.$or = [{ fullName: rx }, { externalRef: rx }, { phone: rx }];
    }

    const [requests, total] = await Promise.all([
      ExternalRegistration.find(filter)
        .populate("user", "name email sid")
        .populate("competition", "name shortName")
        .sort({ status: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ExternalRegistration.countDocuments(filter),
    ]);

    // Which of these references has ALREADY been approved for somebody else. One third-party ticket
    // admitting two people is the abuse this flow is most exposed to, and a reviewer can only catch it
    // if the clash is on screen — every claim looks ordinary in isolation.
    const refs = requests.map((doc) => doc.externalRefKey).filter(Boolean);
    const approvedElsewhere = refs.length
      ? await ExternalRegistration.find({
        externalRefKey: { $in: refs },
        status: "approved",
      }).select("externalRefKey competition user").populate("user", "name email")
      : [];
    // Same rules as the approval guard: normalised, and not scoped by the platform the claimant chose.
    const clashKey = (doc) => `${doc.competition}|${doc.externalRefKey}`;
    const approvedBy = new Map(approvedElsewhere.map((doc) => [clashKey(doc), doc]));

    return res.json({
      requests: requests.map((doc) => {
        const clash = approvedBy.get(clashKey({
          competition: doc.competition?._id || doc.competition,
          externalRefKey: doc.externalRefKey,
        }));
        return {
          ...publicShape(doc),
          user: doc.user,
          competition: doc.competition,
          registration: doc.registration,
          history: doc.history,
          // Present only when ANOTHER entrant already holds this reference.
          duplicateOf: clash && String(clash.user?._id) !== String(doc.user?._id)
            ? { name: clash.user?.name || "", email: clash.user?.email || "" }
            : null,
        };
      }),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("[external-registration] list failed:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/admin/external-registrations/:id/approve  (adminOnly)
 *
 * Creates the entry, records the foregone fee, emails the entrant.
 */
export const approveExternalRegistration = async (req, res) => {
  try {
    const request = await ExternalRegistration.findById(req.params.id)
      .populate("user", "name email sid")
      .populate("competition");
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status === "approved") {
      return res.status(409).json({ message: "This request was already approved." });
    }

    const competition = request.competition;
    if (!competition) return res.status(410).json({ message: "That challenge no longer exists." });

    // ONE TICKET, ONE ENTRY. Nothing about the submission stops two accounts naming the same booking
    // ID — a single ₹98 ticket bought on Luma could otherwise be posted to a group chat and turned
    // into any number of free entries, and each one would look perfectly ordinary in the queue on its
    // own. Checked here rather than at submit time so an honest entrant correcting a typo is not
    // blocked by their own earlier attempt, and so the reviewer sees the clash spelled out.
    const duplicate = await ExternalRegistration.findOne({
      _id: { $ne: request._id },
      competition: request.competition?._id || request.competition,
      // Matched on the NORMALISED key, and deliberately not on `provider`. The platform is picked by
      // the claimant from a radio group and nothing verifies the reference came from it, so scoping
      // by provider would let the same reference through byte-for-byte under a different platform.
      externalRefKey: request.externalRefKey || refKey(request.externalRef),
      status: "approved",
    }).populate("user", "name email");

    if (duplicate) {
      return res.status(409).json({
        message: `That ${providerName(request.provider)} reference was already approved for ${duplicate.user?.name || "another entrant"} (${duplicate.user?.email || "unknown"}). One registration cannot admit two people — reject this claim, or reverse the other one first.`,
        conflictWith: {
          _id: duplicate._id,
          user: duplicate.user,
          reviewedAt: duplicate.reviewedAt,
        },
      });
    }

    const now = new Date();
    // Deliberately NOT gated on registration_open: a claim submitted in time can legitimately be
    // reviewed after the window shuts, and rejecting it then would punish the entrant for our queue.
    // What is checked is that they have not since registered by paying.
    const existingEntry = await CompetitionEntry.findOne({
      competitionId: competition._id,
      userId: request.user._id,
    }).select("_id eventId");

    let entry = existingEntry;
    if (!entry) {
      entry = new CompetitionEntry({
        competitionId: competition._id,
        userId: request.user._id,
        registration: request.registration,
        acceptedRulesAt: request.acceptedRulesAt,
        acceptedCopyrightAt: request.acceptedCopyrightAt,
        status: "registered",
        // No payment: Ckript took none. Leaving this empty is what keeps a granted entry
        // distinguishable from a paid one in every report that reads it.
        payment: { amount: 0, currency: "", paidAt: null },
        externalRegistration: {
          provider: request.provider,
          reference: request.externalRef,
          verifiedBy: req.user._id,
          verifiedAt: now,
        },
      });
      await entry.save();

      // Inside this branch on purpose. When the entrant already has an entry — because they gave up
      // waiting and paid — no access is being granted here, and recording ₹98 of foregone revenue
      // would invent a loss against a sale that actually happened. Approving then only settles the
      // paperwork.
      await recordGrant({
        kind: "competition_registration",
        user: request.user._id,
        listPriceMinor: REGISTRATION_FEE_MINOR.INR,
        currency: "INR",
        grantedBy: req.user._id,
        reason: `registered via ${providerName(request.provider)}`,
        subjectType: "Competition",
        subjectId: competition._id,
        label: competition.name,
        source: "externalRegistrationController.approveExternalRegistration",
        metadata: {
          provider: request.provider,
          externalRef: request.externalRef,
          eventId: entry.eventId || "",
        },
      });
    }

    request.status = "approved";
    request.reviewedBy = req.user._id;
    request.reviewedAt = now;
    request.reviewNote = String(req.body?.note || "").trim().slice(0, 1000);
    request.entry = entry._id;
    try {
      await request.save();
    } catch (saveError) {
      // The partial unique index on (competition, externalRefKey) over approved claims. Two admins
      // approving two claims on the same ticket at the same instant both pass the read above; this is
      // what actually stops the second one.
      if (saveError?.code === 11000) {
        return res.status(409).json({
          message: "That reference was approved for another entrant a moment ago. Reload the queue.",
        });
      }
      throw saveError;
    }

    await createNotification({
      userId: request.user._id,
      type: "admin_alert",
      message: `Your registration for ${competition.name} is confirmed. Entry ID: ${entry.eventId}.`,
    }).catch(() => {});

    await sendExternalRegistrationDecisionEmail(request.user.email, request.user.name || "there", {
      decision: "approved",
      competitionName: competition.name,
      providerLabel: providerName(request.provider),
      externalRef: request.externalRef,
      note: request.reviewNote,
      eventId: entry.eventId,
      competitionId: String(competition._id),
      clientBaseUrl: req.headers.origin || "",
    });

    return res.json({
      message: "Registration approved.",
      request: publicShape(request),
      entry: { _id: entry._id, eventId: entry.eventId },
    });
  } catch (error) {
    console.error("[external-registration] approve failed:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/admin/external-registrations/:id/reject  (adminOnly)
 *
 * A reason is REQUIRED. "Rejected" with no explanation gives the entrant nothing to correct, and the
 * whole point of leaving the door open is that they can fix it and come back.
 */
export const rejectExternalRegistration = async (req, res) => {
  try {
    const note = String(req.body?.note || "").trim().slice(0, 1000);
    if (!note) {
      return res.status(400).json({ message: "Give a reason — the entrant needs to know what to fix." });
    }

    const request = await ExternalRegistration.findById(req.params.id)
      .populate("user", "name email sid")
      .populate("competition", "name");
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status === "approved") {
      return res.status(409).json({ message: "This request was already approved." });
    }

    request.status = "rejected";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNote = note;
    await request.save();

    await createNotification({
      userId: request.user._id,
      type: "admin_alert",
      message: `We couldn't confirm your ${request.competition?.name || "challenge"} registration. You can submit again.`,
    }).catch(() => {});

    await sendExternalRegistrationDecisionEmail(request.user.email, request.user.name || "there", {
      decision: "rejected",
      competitionName: request.competition?.name || "the challenge",
      providerLabel: providerName(request.provider),
      externalRef: request.externalRef,
      note,
      competitionId: String(request.competition?._id || ""),
      clientBaseUrl: req.headers.origin || "",
    });

    return res.json({ message: "Request rejected and the entrant has been told why.", request: publicShape(request) });
  } catch (error) {
    console.error("[external-registration] reject failed:", error);
    return res.status(500).json({ message: error.message });
  }
};
