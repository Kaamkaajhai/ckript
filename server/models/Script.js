import mongoose from "mongoose";

const scriptSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String, required: true },
  premium: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  unlockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

export default mongoose.model("Script", scriptSchema);
