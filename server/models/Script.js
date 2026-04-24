import mongoose from "mongoose";

const createSid = (prefix) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${token}`;
};

const roleSchema = new mongoose.Schema({
  characterName: { type: String, required: true },
  description: { type: String },
  type: { type: String }, // e.g. "Detective - Rough, older, like Liam Neeson"
  ageRange: { min: Number, max: Number },
  gender: { type: String },
}, { _id: true });

const scriptSchema = new mongoose.Schema({
  sid: { type: String, unique: true, sparse: true, index: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  companyName: { type: String, trim: true, maxlength: 120 },
  logline: { type: String }, // Max 50 chars hook for compact cards
  description: { type: String },
  synopsis: { type: String }, // Short visible teaser
  fullContent: { type: String }, // Locked full content
  textContent: { type: String }, // Extracted text from PDF or raw input from editor
  fileUrl: { type: String }, // Made optional since users can write text directly
  pageCount: { type: Number }, // Auto-calculated on upload
  coverImage: { type: String },
  genre: { type: String },
  contentType: { type: String, enum: ["movie", "tv_series", "anime", "documentary", "short_film", "web_series", "book", "startup", "songs", "standup_comedy", "dialogues", "poet"], default: "movie" },
  status: { type: String, enum: ["draft", "published", "pending_approval", "rejected"], default: "draft" },
  adminApproved: { type: Boolean, default: false },
  publishedAt: { type: Date },

  // Enhanced metadata for writer onboarding
  format: {
    type: String,
    enum: [
      "feature",
      "feature_film",
      "tv_1hour",
      "tv_pilot_1hour",
      "tv_halfhour",
      "tv_pilot_halfhour",
      "play",
      "short",
      "short_film",
      "web_series",
      "limited_series",
      "documentary",
      "drama_school",
      "anime",
      "movie",
      "tv_serial",
      "cartoon",
      "songs",
      "standup_comedy",
      "dialogues",
      "poet",
      "other",
    ],
    default: "feature_film"
  },
  formatOther: { type: String, trim: true, maxlength: 120 },
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
    aiTrailer: { type: Boolean, default: false },
    spotlight: { type: Boolean, default: false }
  },
  billing: {
    evaluationCreditsCharged: { type: Number, default: 0 },
    aiTrailerCreditsCharged: { type: Number, default: 0 },
    spotlightCreditsChargedAtUpload: { type: Number, default: 0 },
    evaluationCreditsChargedAtUpload: { type: Number, default: 0 },
    aiTrailerCreditsChargedAtUpload: { type: Number, default: 0 },
    evaluationCreditsRefunded: { type: Number, default: 0 },
    aiTrailerCreditsRefunded: { type: Number, default: 0 },
    spotlightCreditsSpent: { type: Number, default: 0 },
    lastSpotlightRefundCredits: { type: Number, default: 0 },
    lastSpotlightActivatedAt: { type: Date },
  },
  evaluationStatus: {
    type: String,
    enum: ["none", "requested", "completed"],
    default: "none",
  },
  evaluationRequestedAt: { type: Date },

  // Legal & Compliance
  legal: {
    agreedToTerms: { type: Boolean, default: false },
    timestamp: { type: Date },
    ipAddress: { type: String },
    termsVersion: { type: String },
    customInvestorTerms: { type: String, default: "", trim: true, maxlength: 3000 },
    customInvestorTermsUpdatedAt: { type: Date },
  },

  // Rights & Licensing Preferences (writer-defined at upload)
  rightsLicensing: {
    rightsType: {
      type: String,
      enum: ["full_rights_sale", "exclusive_license", "custom_negotiation_required"],
      default: "custom_negotiation_required",
    },
    exclusivity: {
      type: Boolean,
      default: true,
    },
    modificationRights: {
      type: String,
      enum: [
        "buyer_can_modify_freely",
        "buyer_must_consult_writer",
        "writer_retains_creative_approval_rights",
      ],
      default: "buyer_must_consult_writer",
    },
    paymentStructure: {
      type: String,
      enum: [
        "one_time_upfront_payment",
        "lower_upfront_plus_royalty_percent",
        "revenue_sharing_model",
        "custom_deal",
      ],
      default: "one_time_upfront_payment",
    },
    royaltySettings: {
      percentage: { type: Number, default: 0 },
      durationType: {
        type: String,
        enum: ["none", "years", "project_lifetime"],
        default: "none",
      },
      durationYears: { type: Number, default: 0 },
    },
    timeBound: {
      licenseDurationMonths: {
        type: Number,
        min: 0,
        max: 120,
        default: 0,
      },
      autoRevertToWriter: { type: Boolean, default: false },
    },
    negotiationMode: {
      type: String,
      enum: [
        "fixed_terms_non_negotiable",
        "open_to_discussion_after_purchase",
        "ckript_not_involved",
      ],
      default: "fixed_terms_non_negotiable",
    },
    customConditions: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    legalAcknowledgement: {
      ownershipConfirmed: { type: Boolean, default: false },
      platformTermsAccepted: { type: Boolean, default: false },
      exclusivityUnderstood: { type: Boolean, default: false },
      acknowledgedAt: { type: Date },
      ipAddress: { type: String, default: "" },
    },
    termsVersion: { type: String, default: "" },
    termsVersionNumber: { type: Number, default: 1 },
    lastUpdatedAt: { type: Date },
  },
  submissionSummaryPdf: {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    generatedAt: { type: Date },
  },

  premium: { type: Boolean, default: false },
  verifiedBadge: { type: Boolean, default: false },
  promotion: {
    spotlightActive: { type: Boolean, default: false },
    pendingSpotlightActivation: { type: Boolean, default: false },
    spotlightStartAt: { type: Date },
    spotlightEndAt: { type: Date },
    lastSpotlightPurchaseAt: { type: Date },
    totalSpotlightCreditsSpent: { type: Number, default: 0 },
  },
  price: { type: Number, default: 0 },
  isSold: { type: Boolean, default: false }, // true once any buyer purchases — hides script from all public listings
  transactionStatus: {
    type: String,
    enum: ["available", "locked", "sold_licensed"],
    default: "available",
    index: true,
  },
  purchaseRequestLocked: { type: Boolean, default: false },
  purchaseRequestLockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  purchaseRequestLockedAt: { type: Date },
  unlockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  purchasedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  // AI Trailer (Text-to-Trailer)
  trailerUrl: { type: String },
  trailerThumbnail: { type: String },
  trailerStatus: { type: String, enum: ["none", "requested", "generating", "ready", "failed"], default: "none" },
  // Uploaded Trailer (User uploaded, no credits required)
  uploadedTrailerUrl: { type: String },
  trailerSource: { type: String, enum: ["ai", "uploaded", "none"], default: "none" }, // Track trailer source
  trailerWriterFeedback: {
    status: { type: String, enum: ["pending", "approved", "revision_requested"], default: "pending" },
    note: { type: String, default: "" },
    updatedAt: { type: Date },
  },
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
    source: { type: String, enum: ["google_ai", "fallback"], default: "fallback" },
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
  engagement: {
    viewEvents: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    reads: { type: Number, default: 0 },
    totalTimeSpentMs: { type: Number, default: 0 },
    timeSpentEvents: { type: Number, default: 0 },
  },
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
