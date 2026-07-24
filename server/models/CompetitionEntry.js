import mongoose from "mongoose";

// One writer's participation in one competition: their registration details, the script they wrote,
// a frozen snapshot of what they submitted, the AI outputs, and their final result.
//
// The SNAPSHOT is the important design choice. Judging and AI read `snapshot`, never the live
// Script, so a submission is genuinely final even though the underlying script row still exists in
// the writer's library. (The script is also flagged `competitionLocked`, but the snapshot means
// correctness does not depend on that flag holding.)

// Same generator/retry shape as User.sid and Script.sid (models/User.js).
const createEventId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — readable when typed or read aloud
  let token = "";
  for (let i = 0; i < 8; i += 1) token += chars[Math.floor(Math.random() * chars.length)];
  return `CGSC-${token}`;
};

const competitionEntrySchema = new mongoose.Schema({
  competitionId: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  eventId: { type: String, unique: true },

  registration: {
    country: { type: String, trim: true, maxlength: 80, required: true },
    language: { type: String, trim: true, maxlength: 60, required: true },
    genres: [{ type: String }],
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "professional"],
      required: true,
    },
    portfolioUrl: { type: String, trim: true, maxlength: 300, default: "" },
  },
  acceptedRulesAt: { type: Date, required: true },
  acceptedCopyrightAt: { type: Date, required: true },

  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", default: null },
  status: {
    type: String,
    enum: ["registered", "writing", "submitted", "ai_processed", "judged"],
    default: "registered",
    index: true,
  },
  submittedAt: { type: Date, default: null },

  // Frozen at submit — the authoritative record of what was entered.
  snapshot: {
    fountainContent: { type: String, default: "" },
    textContent: { type: String, default: "" },
    title: { type: String, default: "" },
    wordCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
    pageCount: { type: Number, default: 0 },
    sceneCount: { type: Number, default: 0 },
  },

  ai: {
    logline: { type: String, default: "" },
    synopsis: { type: String, default: "" },
    evaluation: { type: mongoose.Schema.Types.Mixed, default: null }, // scriptScore shape
    // Claimed-at marker for the AI run. Submit dispatches processing fire-and-forget and an admin can
    // retry at the same moment; setting this from null is the lock that stops two runs billing the
    // model twice. Cleared on failure, and treated as stale after 15 minutes so a dead run can't
    // wedge the entry.
    startedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    error: { type: String, default: "" },
  },

  result: {
    award: {
      type: String,
      enum: ["none", "winner", "runner_up", "special", "participant"],
      default: "none",
    },
    specialTitle: { type: String, default: "" },
    note: { type: String, default: "" },
  },

  // Append-only ledger; the declare-results grant loop skips any type already present, which is what
  // makes re-declaring safe.
  rewardsGranted: [{ type: { type: String }, at: Date }],
}, { timestamps: true });

// One entry per writer per competition.
competitionEntrySchema.index({ competitionId: 1, userId: 1 }, { unique: true });

competitionEntrySchema.pre("validate", async function ensureEventId() {
  if (this.eventId) return;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = createEventId();
    const exists = await this.constructor.exists({ eventId: candidate });
    if (!exists) {
      this.eventId = candidate;
      return;
    }
  }
  throw new Error("Unable to generate unique competition event ID");
});

export default mongoose.model("CompetitionEntry", competitionEntrySchema);
