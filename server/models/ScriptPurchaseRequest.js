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
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    note: {
      type: String,
      default: "",
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
