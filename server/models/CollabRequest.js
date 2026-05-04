import mongoose from "mongoose";

const normalizeRequestedRole = () => "editor";

const collabRequestSchema = new mongoose.Schema({
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requestedRole: { type: String, enum: ["editor"], required: true, default: "editor", set: normalizeRequestedRole },
  message: { type: String, default: "" },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  respondedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

collabRequestSchema.index({ scriptId: 1, requesterId: 1, status: 1 });
collabRequestSchema.index({ requesterId: 1, createdAt: -1 });

collabRequestSchema.pre("validate", function normalizeRole() {
  this.requestedRole = "editor";
});

export default mongoose.model("CollabRequest", collabRequestSchema);
