import mongoose from "mongoose";

const agreementSchema = new mongoose.Schema(
  {
    script_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
      required: true,
      index: true,
    },
    writer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    buyer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    terms_json: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    writer_pdf_url: {
      type: String,
      default: "",
      trim: true,
    },
    buyer_pdf_url: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "expired", "cancelled", "superseded"],
      default: "active",
      index: true,
    },
    terms_policy_version: {
      type: String,
      default: "",
      trim: true,
    },
    terms_policy_title: {
      type: String,
      default: "",
      trim: true,
    },
    expires_at: {
      type: Date,
      default: null,
      index: true,
    },
    activated_at: {
      type: Date,
      default: Date.now,
    },
    consent_logs: {
      writer: {
        acknowledgedAt: { type: Date },
        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" },
      },
      buyer: {
        acknowledgedAt: { type: Date },
        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        acceptedPlatformTerms: { type: Boolean, default: false },
        acceptedWriterTerms: { type: Boolean, default: false },
        acceptedCustomWriterTerms: { type: Boolean, default: false },
      },
      disclaimerAcknowledged: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

agreementSchema.index({ script_id: 1, buyer_id: 1, createdAt: -1 });
agreementSchema.index({ writer_id: 1, createdAt: -1 });
agreementSchema.index({ buyer_id: 1, createdAt: -1 });

export default mongoose.model("Agreement", agreementSchema);
