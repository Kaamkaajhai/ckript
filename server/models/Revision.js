import mongoose from "mongoose";

const revisionSchema = new mongoose.Schema({
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  baseContent: { type: String, default: "" },
  content: { type: String, required: true },
  sectionRef: { type: String, required: true },
  status: {
    type: String,
    enum: ["draft", "pending_review", "approved", "rejected"],
    default: "draft",
  },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewNote: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
});

revisionSchema.index({ scriptId: 1, status: 1, createdAt: -1 });
revisionSchema.index({ authorId: 1, status: 1 });

export default mongoose.model("Revision", revisionSchema);
