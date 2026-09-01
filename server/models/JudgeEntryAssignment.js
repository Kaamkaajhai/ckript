import mongoose from "mongoose";

/**
 * Which entries a particular judge is asked to read.
 *
 * CompetitionJudge says a judge sits on a competition's panel. This says WHICH SCRIPTS from it they
 * are responsible for, and it is a different question: a panel of five judges reading forty entries
 * each is forty scripts of duplicated effort, and the scores that come back are five opinions of
 * everything rather than a deliberate allocation. The admin decides who reads what.
 *
 * Many-to-many on purpose. One entry goes to SEVERAL judges — that is the point, since a single
 * opinion is not a panel — and one judge holds many entries. The pair is what is unique.
 *
 * This GATES rather than filters. A judge sees only what is assigned here, so an unassigned entry is
 * not merely hidden from a list: judgeController resolves every entry read through the same
 * assignment lookup, and an id typed directly into the URL answers 404 like any other entry that is
 * not theirs.
 */
const judgeEntryAssignmentSchema = new mongoose.Schema(
  {
    // Denormalised from the entry so the judge's queue is ONE indexed query rather than a lookup
    // per entry. The controller re-checks the entry really belongs to this competition, so a stale
    // value here cannot widen what anybody sees.
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    entry: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitionEntry", required: true, index: true },
    judge: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/**
 * One assignment per (entry, judge).
 *
 * Enforced by the index rather than a controller check because the admin UI assigns in bulk: a
 * double-clicked "Assign" sends two overlapping writes, both read "not assigned yet", and the judge
 * ends up with the same script twice in their queue and a duplicated row in the admin's matrix.
 */
judgeEntryAssignmentSchema.index({ entry: 1, judge: 1 }, { unique: true });

/** The judge's own queue: every entry assigned to them in one competition. */
judgeEntryAssignmentSchema.index({ competition: 1, judge: 1 });

/** The admin's matrix, and "who is reading this entry?". */
judgeEntryAssignmentSchema.index({ competition: 1, entry: 1 });

export default mongoose.model("JudgeEntryAssignment", judgeEntryAssignmentSchema);
