import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ scriptId: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
