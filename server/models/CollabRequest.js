import mongoose from "mongoose";

// `merger` is retained only so historic documents remain readable; new requests use the same
// current role vocabulary as collaboration itself. The controller maps legacy merger requests to
// least-privilege commenter access unless an owner explicitly assigns another current role.
const VALID_REQUESTED_ROLES = ["editor", "commenter", "viewer", "full_admin", "merger"];
const normalizeRequestedRole = (value) => {
  return String(value || "").trim().toLowerCase();
};

const collabRequestSchema = new mongoose.Schema({
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requestedRole: { type: String, enum: VALID_REQUESTED_ROLES, required: true, set: normalizeRequestedRole },
  message: { type: String, default: "" },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  respondedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

collabRequestSchema.index({ scriptId: 1, requesterId: 1, status: 1 });
collabRequestSchema.index({ requesterId: 1, createdAt: -1 });

collabRequestSchema.pre("validate", function normalizeRole() {
  this.requestedRole = normalizeRequestedRole(this.requestedRole);
});

export default mongoose.model("CollabRequest", collabRequestSchema);
