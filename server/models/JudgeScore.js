import mongoose from "mongoose";

/**
 * One judge's score for one competition entry.
 *
 * Its own collection, following ProducerRating: a per-judge score cannot live on the entry, because
 * `CompetitionEntry.result` holds exactly one outcome and a panel produces N opinions per entry.
 *
 * `scores` is a Map keyed by criterion, because the criteria are defined per competition by the admin
 * (`Competition.judging.criteria`). A fixed set of columns would mean a schema change every time a
 * challenge wanted to judge something different, and would silently drop scores for any criterion the
 * schema had not anticipated.
 *
 * `status` separates a draft from a submitted verdict. Both matter: a judge part-way through a
 * feature-length script must not lose work, and the admin's leaderboard must not average opinions
 * nobody has finished forming. Only `submitted` rows are aggregated.
 */
const judgeScoreSchema = new mongoose.Schema(
  {
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    entry: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitionEntry", required: true, index: true },
    judge: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** criterionKey -> 0..100. Keys come from Competition.judging.criteria. */
    scores: { type: Map, of: Number, default: () => new Map() },

    comment: { type: String, default: "", maxlength: 2000 },

    status: { type: String, enum: ["draft", "submitted"], default: "draft", index: true },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One score per judge per entry. Enforced HERE rather than in the controller: a judge double-clicking
// submit sends two writes that both read "no existing score" before either lands, and only the
// database sees them in an order.
judgeScoreSchema.index({ entry: 1, judge: 1 }, { unique: true });

// The aggregate reads every submitted score for a competition in one query.
judgeScoreSchema.index({ competition: 1, status: 1 });

export default mongoose.model("JudgeScore", judgeScoreSchema);
