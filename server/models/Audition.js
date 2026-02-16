import mongoose from "mongoose";

const auditionSchema = new mongoose.Schema({
  script: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
  role: { type: mongoose.Schema.Types.ObjectId, required: true }, // References Script.roles._id
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  notes: { type: String },
  status: { type: String, enum: ["pending", "shortlisted", "rejected", "accepted"], default: "pending" },
  rating: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
}, { timestamps: true });

// One actor can audition for one role only once
auditionSchema.index({ script: 1, role: 1, actor: 1 }, { unique: true });

export default mongoose.model("Audition", auditionSchema);
