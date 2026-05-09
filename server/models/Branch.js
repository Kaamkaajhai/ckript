import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  editorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  baseContent: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isOutdated: { type: Boolean, default: false },
});

branchSchema.index({ scriptId: 1, editorId: 1 }, { unique: true });

export default mongoose.model("Branch", branchSchema);
