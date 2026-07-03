import mongoose from "mongoose";

const VALID_COLLABORATOR_ROLES = ["editor", "merger", "viewer", "full_admin", "commenter"];
const normalizeCollaboratorRole = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_COLLABORATOR_ROLES.includes(normalized) ? normalized : "editor";
};

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

const collaboratorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["editor", "merger", "viewer", "full_admin", "commenter"], required: true, default: "editor", set: normalizeCollaboratorRole },
  accessLevel: {
    type: String,
    enum: ["full_access", "content_only"],
    default: "full_access",
  },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  inviteToken: { type: String, default: null },
  inviteExpiresAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  joinedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { _id: true });

collaboratorSchema.pre("validate", function normalizeRole() {
  this.role = normalizeCollaboratorRole(this.role);
});

const scriptSchema = new mongoose.Schema({
  sid: { type: String, unique: true, sparse: true, index: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  collabVisibility: {
    type: String,
    enum: ["private", "open"],
    default: "private",
  },
  collaborators: [collaboratorSchema],
  title: { type: String, required: true },
  companyName: { type: String, trim: true, maxlength: 120 },
  logline: { type: String }, // Max 50 chars hook for compact cards
  description: { type: String },
  synopsis: { type: String }, // Short visible teaser
  fullContent: { type: String }, // Locked full content
  textContent: { type: String }, // Extracted text from PDF or raw input from editor
  fountainContent: { type: String }, // Canonical Fountain markup for screenplay-format projects (source of truth when present)
  // Corkboard scene synopses (Phase 4) — one-line summaries keyed by normalized scene heading.
  // Pure editor metadata: NOT part of the screenplay text, never included in PDF/Fountain export.
  sceneSynopses: { type: Map, of: String, default: undefined },
  // Outline notes (Phase 4) — free-form beats/notes alongside the script. Editor metadata only,
  // never included in the screenplay text or PDF/Fountain export.
  outlineNotes: { type: String, default: "" },
  // Industry title page — structured fields (title/credit/author/source/draftDate). Stored separately
  // from the body text (so it never confuses the classifier); the PDF and Fountain export render it.
  titlePage: { type: Map, of: String, default: undefined },
  fileUrl: { type: String }, // Made optional since users can write text directly
  projectSource: { type: String, enum: ["uploaded", "editor"], default: "uploaded" },
  pageCount: { type: Number }, // Auto-calculated on upload
  viewableScript: { type: Boolean, default: false },
  scriptPreviewAccess: {
    mode: {
      type: String,
      enum: ["pages", "episodes"],
      default: "pages",
    },
    start: { type: Number, min: 1, default: 1 },
    end: { type: Number, min: 1, default: 8 },
  },
  scriptPreviewPageTexts: [{ type: String, default: "" }],
  scriptCompletion: {
    status: {
      type: String,
      enum: ["complete", "partial", "ongoing"],
      default: "complete",
    },
    completedParts: { type: Number, min: 0, default: 0 },
    totalParts: { type: Number, min: 0, default: 0 },
    futurePlans: { type: String, trim: true, maxlength: 300, default: "" },
  },
  coverImage: { type: String },
  genre: { type: String },
  contentType: { type: String, enum: ["movie", "tv_series", "anime", "documentary", "short_film", "web_series", "book", "startup", "songs", "standup_comedy", "dialogues", "poet", "micro_drama"], default: "movie" },
  status: { type: String, enum: ["draft", "published", "pending_approval", "rejected"], default: "draft" },
  approvalRequestType: { type: String, enum: ["new_submission", "edit_submission"], default: "new_submission" },
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
      "fiction_novel",
      "documentary",
      "drama_school",
      "micro_drama",
      "anime",
      "movie",
      "tv_serial",
      "cartoon",
      "songs",
      "standup_comedy",
      "dialogues",
      "poet",
      "other",
      // Publishing formats
      "fiction_novel",
      "non_fiction",
      "novella",
      "short_story_collection",
      "poetry",
      "screenplay",
      "novel",
      "hybrid",
    ],
    default: "feature_film"
  },
  styleMedium: { type: String, trim: true, maxlength: 120 },
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

  // Film production details set by writer during upload
  filmDetails: {
    filmLanguage: { type: String, trim: true, maxlength: 100 },
    dialoguesPresent: { type: String, enum: ["yes", "no", "partial"], default: "yes" },
    wantToDirect: { type: Boolean, default: false },
    wantToProduce: { type: Boolean, default: false },
    scriptStyle: [{ type: String }],
  },

  // Content indicators
  contentIndicators: {
    bechdelTest: { type: Boolean },
    basedOnTrueStory: { type: Boolean, default: false },
    adaptation: { type: Boolean, default: false },
    adaptationSource: { type: String },
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
  history: [{
    content: { type: String, default: "" },
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    prId: { type: mongoose.Schema.Types.ObjectId, ref: "PullRequest", default: null },
  }],
  // Screenplay editor version snapshots (Module 4 — version history & drafts)
  versions: [{
    label: { type: String, default: "", trim: true, maxlength: 80 },
    fountainSnapshot: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, default: "" },
    auto: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  // AI Trailer (Text-to-Trailer)
  trailerUrl: { type: String },
  trailerThumbnail: { type: String },
  trailerStatus: { type: String, enum: ["none", "requested", "generating", "ready", "failed"], default: "none" },
  // Uploaded Trailer (User uploaded, no credits required)
  uploadedTrailerUrl: { type: String },
  trailerSource: { type: String, enum: ["ai", "uploaded", "none"], default: "none" }, // Track trailer source
  // Pitch Video (short pitch, max 90s, max 90MB)
  pitchVideoUrl: { type: String },
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
  // Producer rating — aggregate of ratings from industry professionals (see ProducerRating model),
  // recomputed on each rating. Shown to every viewer as a credibility signal.
  producerRating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
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

  // ── Publishing Layer ────────────────────────────────────────────────────────
  // Which industry verticals this script targets
  targetIndustry: [{
    type: String,
    enum: ["film", "publishing"],
  }],

  // Full publishing metadata (only meaningful when targetIndustry includes "publishing")
  publishingDetails: {
    enabled: { type: Boolean, default: false },

    // Story format (multi-select)
    storyFormat: [{ type: String, enum: ["screenplay", "novel_ready", "adaptation_ready"] }],

    // Writing style (multi-select)
    writingStyle: [{ type: String, enum: ["descriptive", "dialogue_driven", "literary", "commercial"] }],

    // Target reading audience (multi-select)
    targetAudience: [{ type: String, enum: ["young_adult", "adult", "mass_market", "niche_literary"] }],

    // Free-text estimated word count range e.g. "60,000 – 90,000 words"
    estimatedWordCount: { type: String, trim: true, maxlength: 60 },

    // Series potential (single-select). An unselected value arrives as "" from the editor; coerce
    // empty/blank to undefined so the enum validation treats it as "not set" instead of rejecting
    // the whole save (a "" was failing every draft save with a ValidationError → 500).
    seriesPotential: {
      type: String,
      enum: ["standalone", "trilogy", "multi_part_universe"],
      set: (v) => (v === "" || v == null ? undefined : v),
    },

    // Book pitch (200–400 words narrative pitch for publishers)
    bookPitch: { type: String, trim: true, maxlength: 2500 },

    // AI-generated prose sample (optional, saved after writer approves)
    proseSample: { type: String, trim: true, maxlength: 5000 },
    proseSampleGeneratedAt: { type: Date },

    // Which portion of the script publishers can preview before purchase
    previewContent: {
      type: String,
      enum: ["first_5_pages", "sample_chapter", "none"],
      default: "none",
    },

    // Whether the writer is opting to sell publishing rights
    sellPublishingRights: { type: Boolean, default: false },

    // Publishing rights
    publishingRights: {
      // Rights bundle preset for simplified UX
      rightsBundle: {
        type: String,
        enum: ["basic", "full", "custom"],
        default: "custom",
      },

      // Core rights (Book + Digital + Audio)
      bookPublishing: { type: Boolean, default: false },
      digitalPublishing: { type: Boolean, default: false },
      audiobookRights: { type: Boolean, default: false },

      // Territory
      territory: [{ type: String, enum: ["worldwide", "india_only", "specific_regions"] }],
      territorySpecific: { type: String, trim: true, maxlength: 300 }, // when specific_regions selected

      // Language rights
      languages: [{ type: String, enum: ["english", "hindi", "regional", "all_languages"] }],

      // Adaptation rights
      adaptationIncluded: { type: Boolean, default: false },
      adaptationRights: [{
        type: String,
        enum: ["film_rights", "web_series_rights", "tv_rights", "remake_rights", "cross_media_rights"],
      }],

      // Exclusivity
      exclusivity: {
        type: String,
        enum: ["exclusive", "non_exclusive"],
        default: "non_exclusive",
      },

      // Duration (free text: "5 years", "10 years", "perpetual")
      durationYears: { type: String, trim: true, maxlength: 60 },

      // Payment type
      paymentType: {
        type: String,
        enum: ["one_time_upfront", "royalty_based", "advance_plus_royalty"],
        default: "one_time_upfront",
      },
      royaltyPercentage: { type: Number, default: 0 },
      advanceAmount: { type: Number, default: 0 },

      // Modification rights
      modificationRights: {
        type: String,
        enum: ["buyer_can_freely_modify", "buyer_must_consult_writer", "no_major_changes_allowed", "writer_approval_required"],
        default: "buyer_must_consult_writer",
      },

      // Negotiation mode
      negotiationMode: {
        type: String,
        enum: ["fixed_terms", "open_to_negotiation"],
        default: "fixed_terms",
      },
    },
  },
}, { timestamps: true });

// Indexes for fast queries
scriptSchema.index({ creator: 1 });
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

scriptSchema.virtual("can_request_collab").get(function canRequestCollab() {
  return this.collabVisibility === "open";
});

scriptSchema.set("toJSON", { virtuals: true });
scriptSchema.set("toObject", { virtuals: true });

export default mongoose.model("Script", scriptSchema);
