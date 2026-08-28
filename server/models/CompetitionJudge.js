import mongoose from "mongoose";

/**
 * A judge's assignment to one competition.
 *
 * Judging is scoped per competition: an invited judge sees the entries for the challenges they were
 * assigned to and nothing else. That scope lives here rather than on the User, because one judge can
 * sit on several panels and the assignment has its own lifecycle — who granted it, when, and whether
 * it has since been withdrawn.
 *
 * Deliberately NOT `Competition.judges[]`. That array is public marketing copy — name, photo, bio,
 * IMDb link — rendered on the landing page. Putting an access grant inside the content the public
 * reads invites exactly the mistake where one gets exposed with the other.
 *
 * Withdrawal sets `status: "revoked"` and never deletes: the scores this judge already submitted keep
 * an author, and an audit of "who could see this competition" stays answerable after the fact.
 */
const competitionJudgeSchema = new mongoose.Schema(
  {
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    judge: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedAt: { type: Date, default: Date.now },

    status: { type: String, enum: ["active", "revoked"], default: "active", index: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// One assignment row per judge per competition. Re-assigning a revoked judge reactivates the existing
// row rather than inserting a second one, so history stays in one place.
competitionJudgeSchema.index({ competition: 1, judge: 1 }, { unique: true });

export default mongoose.model("CompetitionJudge", competitionJudgeSchema);
