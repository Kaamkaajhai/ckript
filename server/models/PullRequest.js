import mongoose from "mongoose";

const mergeDecisionSchema = new mongoose.Schema({
  changeIndex: { type: Number, required: true },
  decision: {
    type: String,
    enum: ["current", "incoming", "both"],
    required: true,
  },
}, { _id: false });

const pullRequestSchema = new mongoose.Schema({
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, default: "" },
  status: { type: String, enum: ["open", "approved", "rejected"], default: "open" },
  mergeDecisions: [mergeDecisionSchema],
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  reviewedAt: { type: Date, default: null },
});

pullRequestSchema.index({ scriptId: 1, authorId: 1, status: 1 });
pullRequestSchema.index({ scriptId: 1, status: 1, createdAt: -1 });

export default mongoose.model("PullRequest", pullRequestSchema);
