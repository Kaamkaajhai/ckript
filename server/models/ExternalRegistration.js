import mongoose from "mongoose";
import { PROVIDER_SLUGS } from "../utils/externalEventProviders.js";

/**
 * A claim that someone already paid to enter this competition somewhere else, and the admin decision
 * on it.
 *
 * The entrant paid Luma or BookMyShow or FilmFreeway, not Ckript, so there is no signature to verify
 * and no order to fetch — a human has to look at the evidence and decide. This document is that
 * review, and on approval it is what authorises a CompetitionEntry to be created with no payment.
 *
 * ONE DOCUMENT PER (competition, user), enforced by a unique index. A rejected claim is not deleted
 * and resubmitting does not create a second row: the same document goes back to `pending` with its
 * attempt count incremented and the rejection pushed onto `history`. That is what makes "let them
 * fill it in again" work without losing the record of what was claimed the first time — which is
 * exactly what a reviewer needs when the same person keeps trying different IDs.
 *
 * The registration answers are captured HERE rather than collected again after approval. The entrant
 * fills the form once; approval turns it into an entry without going back to ask them anything.
 */

const rejectionSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
    provider: { type: String, default: "" },
    externalRef: { type: String, default: "" },
  },
  { _id: false },
);

const externalRegistrationSchema = new mongoose.Schema(
  {
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Where they say they registered. An enum, not free text: the reviewer needs to know what an ID
    // from this platform should look like, and the queue is filtered by it.
    provider: { type: String, enum: PROVIDER_SLUGS, required: true },

    // Their name and number ON THAT PLATFORM, which is the point of asking: it may not match their
    // Ckript account, and matching the two is most of what the reviewer is doing.
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    externalRef: { type: String, required: true, trim: true, maxlength: 120 },

    // Optional. Most claims are decided on the reference alone; a screenshot settles the rest.
    screenshotUrl: { type: String, default: "" },
    screenshotPublicId: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // The registration answers, so approval needs nothing further from the entrant.
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

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, default: "", maxlength: 1000 },

    // 1 on first submission. Incremented each time a rejected claim is resubmitted, so a reviewer can
    // see at a glance that this is someone's fourth attempt.
    attempt: { type: Number, default: 1 },
    history: { type: [rejectionSchema], default: [] },

    // Set when approval creates the entry, so a double-approval cannot create a second one.
    entry: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitionEntry", default: null },
  },
  { timestamps: true },
);

// One claim per person per competition. Resubmission edits this document rather than adding another,
// which is what keeps the history in one place and the queue free of duplicates.
externalRegistrationSchema.index({ competition: 1, user: 1 }, { unique: true });
externalRegistrationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("ExternalRegistration", externalRegistrationSchema);
