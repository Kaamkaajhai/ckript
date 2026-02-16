import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  characterName: { type: String, required: true },
  description: { type: String },
  type: { type: String }, // e.g. "Detective - Rough, older, like Liam Neeson"
  ageRange: { min: Number, max: Number },
  gender: { type: String },
}, { _id: true });

const scriptSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String },
  synopsis: { type: String }, // Short visible teaser
  fullContent: { type: String }, // Locked full content
  fileUrl: { type: String, required: true },
  coverImage: { type: String },
  genre: { type: String },
  contentType: { type: String, enum: ["movie", "tv_series", "anime", "documentary", "short_film", "web_series", "book", "startup"], default: "movie" },
  premium: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  unlockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // AI Trailer (Text-to-Trailer)
  trailerUrl: { type: String },
  trailerThumbnail: { type: String },
  trailerStatus: { type: String, enum: ["none", "generating", "ready", "failed"], default: "none" },
  // Script Score (Pro Analysis)
  scriptScore: {
    overall: { type: Number, min: 0, max: 100 },
    plot: { type: Number, min: 0, max: 100 },
    characters: { type: Number, min: 0, max: 100 },
    dialogue: { type: Number, min: 0, max: 100 },
    pacing: { type: Number, min: 0, max: 100 },
    marketability: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
    scoredAt: { type: Date },
  },
  // Talent Attachment - Roles
  roles: [roleSchema],
  // Hold / Option system
  heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  holdStartDate: { type: Date },
  holdEndDate: { type: Date },
  holdFee: { type: Number, default: 200 },
  holdStatus: { type: String, enum: ["available", "held", "sold"], default: "available" },
  // Analytics
  views: { type: Number, default: 0 },
  viewedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    viewedAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  budget: { type: String, enum: ["micro", "low", "medium", "high", "blockbuster"] },
}, { timestamps: true });

export default mongoose.model("Script", scriptSchema);
