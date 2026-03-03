import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { 
    type: String, 
    enum: ["like", "comment", "follow", "unlock", "smart_match", "audition", "hold", "hold_expiring", "profile_view", "script_score", "trailer_ready", "script_approved", "script_rejected"], 
    required: true 
  },
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  script: { type: mongoose.Schema.Types.ObjectId, ref: "Script" },
  audition: { type: mongoose.Schema.Types.ObjectId, ref: "Audition" },
  message: { type: String },
  matchScore: { type: Number },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
