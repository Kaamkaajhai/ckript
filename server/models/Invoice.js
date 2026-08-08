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
      enum: [
        "script",                   // a script purchase, paid or free-access
        "competition_registration", // challenge entry fee
        "plan_subscription",        // FIP / writer silver / writer gold
        "script_hold",              // a paid 30-day option on a script
        "ai_trailer",               // trailer generation
      ],
      default: "script",
      index: true,
    },

    // Required only where a script is genuinely part of the transaction. Stated as an allowlist
    // rather than "not competition_registration": the old form silently made `script` mandatory for
    // every kind added afterwards, which would have blocked the first plan-subscription invoice.
    script: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
      required() { return ["script", "script_hold", "ai_trailer"].includes(this.kind); },
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

    // The right-hand panel of the document, written by whoever issued the invoice.
    //
    // The PDF route used to build this itself with an `isRegistration` branch, which meant every new
    // payment surface needed a new branch there before its invoice could describe itself. Carrying
    // the lines on the document instead keeps that route kind-agnostic. Empty for older invoices,
    // which still fall back to the script/registration panels.
    detailTitle: { type: String, default: "" },
    detailLines: { type: [String], default: [] },

    pdfPath: { type: String, default: "" },
    pdfGeneratedAt: { type: Date },

    // Which iteration of the document design the cached PDF was rendered with.
    //
    // A redesign is invisible to anyone holding an already-rendered invoice: `pdfPath` is set, so the
    // download route serves the cached bytes forever and every historical invoice stays frozen on the
    // old look. Stamping the version lets the route notice and re-render exactly once, with no
    // backfill script and no admin button — and it does the same automatically for the next redesign.
    // 0 means "rendered before this field existed", i.e. the pre-Ckript layout.
    pdfDesignVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

invoiceSchema.index({ creator: 1, createdAt: -1 });
invoiceSchema.index({ script: 1 });

export default mongoose.model("Invoice", invoiceSchema);
