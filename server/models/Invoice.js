import mongoose from "mongoose";

const invoiceRowSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    type: { type: String, required: true },
    detail: { type: String, default: "" },
    amountLabel: { type: String, required: true },
    amountValue: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    paymentReference: { type: String, unique: true, sparse: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creatorSid: { type: String, default: "" },

    // What was bought. Defaults to "script" so every existing document keeps its meaning without a
    // migration — this collection is the single invoice ledger, so a competition entry fee lands
    // here too rather than in a parallel model with its own numbering that could collide.
    kind: {
      type: String,
      enum: ["script", "competition_registration"],
      default: "script",
      index: true,
    },

    // Required only for script invoices. A competition registration has no script, and a blanket
    // `required: true` is what would otherwise force a dummy reference into the ledger.
    script: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
      required() { return this.kind !== "competition_registration"; },
    },
    scriptSid: { type: String, default: "" },
    competition: { type: mongoose.Schema.Types.ObjectId, ref: "Competition" },

    // What the buyer was actually charged, in the currency they actually paid. The ledger had no
    // currency field at all because scripts were INR-only; competition entry is INR or USD, and an
    // amount without its currency is not a record of anything.
    currency: { type: String, default: "INR" },
    amountCharged: { type: Number, default: 0 },
    accessType: { type: String, enum: ["free", "premium"], default: "free" },
    scriptPrice: { type: Number, default: 0 },
    platformFeeRate: { type: Number, default: 0.2 },
    writerEarnsPerSale: { type: Number, default: 0 },
    services: {
      hosting: { type: Boolean, default: true },
      evaluation: { type: Boolean, default: false },
      aiTrailer: { type: Boolean, default: false },
      trailerUpload: { type: Boolean, default: false },
    },
    totalCreditsRequired: { type: Number, default: 0 },
    creditsBalanceBefore: { type: Number, default: 0 },
    creditsBalanceAfter: { type: Number, default: 0 },
    rows: { type: [invoiceRowSchema], default: [] },
    pdfPath: { type: String, default: "" },
    pdfGeneratedAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ creator: 1, createdAt: -1 });
invoiceSchema.index({ script: 1 });

export default mongoose.model("Invoice", invoiceSchema);
