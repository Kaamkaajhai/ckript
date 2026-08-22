import mongoose from "mongoose";

/**
 * One admission checkout per writer and competition.
 *
 * Razorpay recommends reusing one order for its retry attempts. Persisting that order here prevents
 * a second tap or a reopened page from creating another payable order, and keeps the accepted legal
 * answers on the server before the browser leaves for Checkout. It is intentionally separate from
 * CompetitionEntry: an unpaid attempt is not a participant and must not affect public counts.
 */
const competitionRegistrationIntentSchema = new mongoose.Schema({
  competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  registration: {
    country: { type: String, trim: true, maxlength: 80, required: true },
    language: { type: String, trim: true, maxlength: 60, required: true },
    genres: [{ type: String }],
    experienceLevel: { type: String, enum: ["beginner", "intermediate", "professional"], required: true },
    portfolioUrl: { type: String, trim: true, maxlength: 300, default: "" },
  },
  acceptedRulesAt: { type: Date, required: true },
  acceptedCopyrightAt: { type: Date, required: true },
  currency: { type: String, enum: ["INR", "USD"], required: true },
  amountMinor: { type: Number, min: 1, required: true },
  // No empty-string default: a sparse unique index skips missing values, but it does NOT skip "".
  // With a default, the first draft intent would claim the empty id and every other writer would
  // fail before an order existed.
  orderId: { type: String, trim: true },
  state: { type: String, enum: ["draft", "creating", "created", "verified", "failed"], default: "draft", index: true },
  lockToken: { type: String, default: "" },
  lockExpiresAt: { type: Date, default: null },
  paymentId: { type: String, trim: true, default: "" },
  entry: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitionEntry", default: null },
  verifiedAt: { type: Date, default: null },
}, { timestamps: true });

competitionRegistrationIntentSchema.index({ competition: 1, user: 1 }, { unique: true });
competitionRegistrationIntentSchema.index({ orderId: 1 }, { unique: true, sparse: true });

export default mongoose.model("CompetitionRegistrationIntent", competitionRegistrationIntentSchema);
