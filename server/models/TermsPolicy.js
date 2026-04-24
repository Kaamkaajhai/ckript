import mongoose from "mongoose";

const termsPolicySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      index: true,
      enum: ["purchase_agreement"],
      default: "purchase_agreement",
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Ckript Marketplace Purchase Terms",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    effectiveAt: {
      type: Date,
      default: Date.now,
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

termsPolicySchema.index({ key: 1, version: 1 }, { unique: true });
termsPolicySchema.index(
  { key: 1, isCurrent: 1 },
  { partialFilterExpression: { isCurrent: true }, unique: true }
);

export default mongoose.model("TermsPolicy", termsPolicySchema);
