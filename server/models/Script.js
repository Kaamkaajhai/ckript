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
  logline: { type: String }, // Max 300 chars hook for search cards
  description: { type: String },
  synopsis: { type: String }, // Short visible teaser
  fullContent: { type: String }, // Locked full content
  textContent: { type: String }, // Extracted text from PDF or raw input from editor
  fileUrl: { type: String }, // Made optional since users can write text directly
  pageCount: { type: Number }, // Auto-calculated on upload
  coverImage: { type: String },
  genre: { type: String },
  contentType: { type: String, enum: ["movie", "tv_series", "anime", "documentary", "short_film", "web_series", "book", "startup"], default: "movie" },
  status: { type: String, enum: ["draft", "published", "pending_approval", "rejected"], default: "draft" },
  adminApproved: { type: Boolean, default: false },

  // Enhanced metadata for writer onboarding
  format: {
    type: String,
    enum: ["feature", "feature_film", "tv_1hour", "tv_pilot_1hour", "tv_halfhour", "tv_pilot_halfhour", "play", "short", "short_film", "web_series"],
    default: "feature_film"
  },
  primaryGenre: { type: String },
  subGenres: [{ type: String }],

  // Deep Classification System (Smart Match Algorithm)
  classification: {
    primaryGenre: { type: String },
    secondaryGenre: { type: String },
    tones: [{ type: String }], // Max 3
    themes: [{ type: String }], // Max 3
    settings: [{ type: String }] // Max 3
  },

  // Content indicators
  contentIndicators: {
    bechdelTest: { type: Boolean },
    basedOnTrueStory: { type: Boolean, default: false },
    adaptation: { type: Boolean, default: false },
    adaptationSource: { type: String }, // What it's adapted from
  },

  // Tag references (Many-to-Many)
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],

  // Services & Revenue Tracking
  services: {
    hosting: { type: Boolean, default: true },
    evaluation: { type: Boolean, default: false },
    aiTrailer: { type: Boolean, default: false }
  },

  // Legal & Compliance
  legal: {
    agreedToTerms: { type: Boolean, default: false },
    timestamp: { type: Date },
    ipAddress: { type: String }
  },

  premium: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  unlockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // AI Trailer (Text-to-Trailer)
  trailerUrl: { type: String },
  trailerThumbnail: { type: String },
  trailerStatus: { type: String, enum: ["none", "generating", "ready", "failed"], default: "none" },
  // Uploaded Trailer (User uploaded, no credits required)
  uploadedTrailerUrl: { type: String },
  trailerSource: { type: String, enum: ["ai", "uploaded", "none"], default: "none" }, // Track trailer source
  // Script Score (Pro Analysis)
  scriptScore: {
    overall: { type: Number, min: 0, max: 100 },
    plot: { type: Number, min: 0, max: 100 },
    characters: { type: Number, min: 0, max: 100 },
    dialogue: { type: Number, min: 0, max: 100 },
    pacing: { type: Number, min: 0, max: 100 },
    marketability: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    improvements: [{ type: String }],
    audienceFit: { type: String },
    comparables: { type: String },
    scoredAt: { type: Date },
  },
  // Platform Score (Admin-given scores)
  platformScore: {
    overall: { type: Number, min: 0, max: 100 },
    content: { type: Number, min: 0, max: 100 },
    trailer: { type: Number, min: 0, max: 100 },
    title: { type: Number, min: 0, max: 100 },
    synopsis: { type: Number, min: 0, max: 100 },
    tags: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
    strengths: { type: String },
    weaknesses: { type: String },
    prospects: { type: String },
    scoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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
  // Reader system
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  readsCount: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  // Analytics
  views: { type: Number, default: 0 },
  viewedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    viewedAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  budget: { type: String, enum: ["micro", "low", "medium", "high", "blockbuster"] },
  // Admin approval
  rejectionReason: { type: String },
}, { timestamps: true });

// Indexes for fast queries
scriptSchema.index({ status: 1, rating: -1 });
scriptSchema.index({ status: 1, isFeatured: 1, rating: -1 });
scriptSchema.index({ status: 1, readsCount: -1 });
scriptSchema.index({ status: 1, unlockedByCount: -1 });
scriptSchema.index({ status: 1, createdAt: -1 });
scriptSchema.index({ status: 1, contentType: 1 });
scriptSchema.index({ status: 1, genre: 1 });
// Indexes for TopList & Featured sort fields
scriptSchema.index({ status: 1, views: -1 });
scriptSchema.index({ status: 1, "scriptScore.overall": -1 });
scriptSchema.index({ status: 1, genre: 1, views: -1 });
scriptSchema.index({ status: 1, contentType: 1, views: -1 });

export default mongoose.model("Script", scriptSchema);
