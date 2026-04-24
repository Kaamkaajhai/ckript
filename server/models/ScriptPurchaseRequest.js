import mongoose from "mongoose";

const scriptPurchaseRequestSchema = new mongoose.Schema(
  {
    script: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
      required: true,
    },
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    writer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    frozenAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "razorpay", "manual", "free_access"],
      default: "wallet",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "escrow_held", "released", "refunded", "failed"],
      default: "pending",
    },
    paymentGatewayOrderId: {
      type: String,
      default: "",
    },
    paymentGatewayPaymentId: {
      type: String,
      default: "",
    },
    paymentGatewaySignature: {
      type: String,
      default: "",
    },
    settledAt: {
      type: Date,
    },
    paymentDueAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    note: {
      type: String,
      default: "",
    },
    termsAcceptance: {
      platformTermsAccepted: { type: Boolean, default: false },
      writerTermsAccepted: { type: Boolean, default: false },
      customWriterTermsAccepted: { type: Boolean, default: false },
      rightsSummaryAccepted: { type: Boolean, default: false },
      legalDisclaimerAccepted: { type: Boolean, default: false },
      customWriterTermsSnapshot: { type: String, default: "" },
      rightsTermsSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
      termsPolicyVersion: { type: String, default: "" },
      acceptedAt: { type: Date },
      acceptedIp: { type: String, default: "" },
      acceptedUserAgent: { type: String, default: "" },
    },
    acceptancePdf: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      generatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Prevent duplicate active requests from the same investor for the same script
scriptPurchaseRequestSchema.index(
  { script: 1, investor: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

export default mongoose.model("ScriptPurchaseRequest", scriptPurchaseRequestSchema);
