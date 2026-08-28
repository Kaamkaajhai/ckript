import mongoose from "mongoose";

/**
 * A judge putting one entry forward for one special award.
 *
 * The competition's award categories are admin-defined (`Competition.judging.awards`); this records
 * which entry a judge nominated for which, and why. Separate from JudgeScore because a nomination is
 * about a category rather than an entry: a judge scores every entry, and nominates a handful.
 *
 * The unique index is per (competition, judge, awardKey) — one nomination per judge per category, so
 * "Best Dialogue" gets each judge's single strongest pick rather than a list of everything they
 * liked. Changing a nomination updates the existing row.
 */
const judgeNominationSchema = new mongoose.Schema(
  {
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    entry: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitionEntry", required: true, index: true },
    judge: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** Matches a `key` in Competition.judging.awards. */
    awardKey: { type: String, required: true, trim: true, maxlength: 60 },
    reason: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

judgeNominationSchema.index({ competition: 1, judge: 1, awardKey: 1 }, { unique: true });

export default mongoose.model("JudgeNomination", judgeNominationSchema);
