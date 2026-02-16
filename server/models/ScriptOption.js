import mongoose from "mongoose";

const scriptOptionSchema = new mongoose.Schema({
  script: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  holder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fee: { type: Number, required: true },
  platformCut: { type: Number, default: 0 }, // 10% of fee
  creatorPayout: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true }, // 30 days from start
  status: { type: String, enum: ["active", "expired", "converted", "cancelled"], default: "active" },
  convertedToSale: { type: Boolean, default: false },
  paymentId: { type: String },
}, { timestamps: true });

export default mongoose.model("ScriptOption", scriptOptionSchema);
