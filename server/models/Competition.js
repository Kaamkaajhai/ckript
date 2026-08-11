import mongoose from "mongoose";

// A scriptwriting competition (e.g. the Ckript Global Script Challenge).
//
// Deliberately a COLLECTION rather than a singleton: the public surface only ever shows "the active
// one", but storing many keeps competition history, archives and future simultaneous events working
// without a schema rewrite.
//
// NOTE: the competition's phase (announced / registration_open / live / judging / results) is NEVER
// stored — it is derived from these dates at read time by utils/competitionPhase.js. That is what
// makes the whole feature self-advancing with no cron job, and lets an admin correct a date and have
// every screen follow instantly.

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const competitionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  shortName: { type: String, trim: true, maxlength: 60, default: "" },
  slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  tagline: { type: String, trim: true, maxlength: 120, default: "" },
  shortDescription: { type: String, maxlength: 1000, default: "" },
  host: { type: String, trim: true, maxlength: 120, default: "" },
  language: { type: String, trim: true, default: "English" },
  timezone: { type: String, trim: true, default: "UTC" },
  eventType: { type: String, trim: true, default: "Global Challenge" },
  competitionCategory: { type: String, trim: true, default: "Screenwriting" },
  difficulty: { type: String, trim: true, default: "All Levels" },
  expectedParticipants: { type: Number, default: 0 },
  estimatedReadingTime: { type: String, trim: true, default: "" },
  
  featuredBadge: { type: Boolean, default: false },
  trendingBadge: { type: Boolean, default: false },
  newBadge: { type: Boolean, default: false },

  lifecycle: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
  visibility: { type: String, enum: ["public", "hidden", "private"], default: "public", index: true },

  dates: {
    regOpensAt: { type: Date, required: true },
    regClosesAt: { type: Date, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    resultsAt: { type: Date },
  },
  resultsDeclaredAt: { type: Date, default: null },

  theme: {
    title: { type: String, trim: true, maxlength: 200, default: "" },
    brief: { type: String, maxlength: 5000, default: "" },
    allowedGenres: [{ type: String }],
    guidelines: { type: String, maxlength: 5000, default: "" },
    writingPrompt: { type: String, default: "" },
    moodBoardImages: [{ type: String }],
    referenceVideos: [{ type: String }],
    inspirationalQuotes: [{ type: String }],
    restrictedTopics: [{ type: String }],
    allowedLanguages: [{ type: String }],
    requiredLength: { type: String, default: "" },
    wordLimit: { type: Number },
    timeLimit: { type: Number },
  },

  overview: { type: String, maxlength: 5000, default: "" },
  highlights: [{ type: String }],
  eligibility: { type: String, maxlength: 2000, default: "" },
  format: { type: String, maxlength: 1000, default: "Any format written in the Ckript editor" },

  // Branding & Media
  bannerUrl: { type: String, default: "" },
  mobileBannerUrl: { type: String, default: "" },
  cardThumbnailUrl: { type: String, default: "" },
  ogImageUrl: { type: String, default: "" },
  logoUrl: { type: String, default: "" },
  backgroundImageUrl: { type: String, default: "" },
  gallery: [{ type: String }],

  // Card Config
  cardConfig: {
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    badge: { type: String, default: "" },
    buttonText: { type: String, default: "Reserve Your Spot" },
    cardTheme: { type: String, default: "light" },
    cardAccent: { type: String, default: "#c94b3a" },
    featuredRibbon: { type: Boolean, default: false }
  },

  prizePool: { type: String, trim: true, maxlength: 200, default: "" },

  prizes: {
    winner: [{ type: String }],
    runnerUp: [{ type: String }],
    secondRunnerUp: [{ type: String }],
    special: [{ title: String, description: String }],
  },
  
  // Advanced Dynamic Prizes 
  detailedPrizes: [{
    title: String,
    description: String,
    cash: Number,
    currency: String,
    type: { type: String }, // e.g., 'Membership', 'Cash', 'Feature'
    visibility: { type: String, default: "public" },
    order: { type: Number, default: 0 }
  }],

  rules: [{ type: String, maxlength: 1000 }],
  faq: [{ q: { type: String, maxlength: 300 }, a: { type: String, maxlength: 2000 } }],
  
  judges: [{ 
    name: String, 
    title: String, 
    photoUrl: String, 
    bio: { type: String, maxlength: 600, default: "" },
    company: String,
    companyBio: { type: String, maxlength: 1000, default: "" },
    companyLink: String,
    imdb: String,
    linkedin: String,
    order: { type: Number, default: 0 },
    featured: { type: Boolean, default: false }
  }],
  
  sponsors: [{ 
    name: String, 
    logoUrl: String, 
    url: String, 
    tier: { type: String, trim: true, maxlength: 40, default: "" },
    description: String,
    visibility: { type: String, default: "public" }
  }],
  
  communityLinks: [{ label: String, url: String, icon: String }],
  resources: [{ label: String, url: String, type: { type: String } }],

  // SEO & Automation
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    canonicalUrl: String
  },
  automation: {
    autoPublishResults: { type: Boolean, default: false },
    autoGenerateCertificates: { type: Boolean, default: false },
    autoSendReminders: { type: Boolean, default: false }
  },

  // Referral reward tiers for THIS competition. Left empty, utils/competitionReferrals.js falls back
  // to its module defaults, so every existing competition keeps working untouched.
  referralTiers: [{
    count: { type: Number, min: 1 },
    id: { type: String, trim: true },
    label: { type: String, trim: true, maxlength: 80 },
    days: { type: Number, min: 0, default: 0 },
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Default prize lists, applied on create when the admin leaves them empty.
export const DEFAULT_PRIZES = {
  // "Featured placement" is worded as conditional on purpose: an entry is a private draft, and
  // winning does not publish it. The script is released back to the writer when results are
  // declared, and the featured flag it already carries takes effect if they choose to publish.
  winner: ["Cash Prize", "Featured placement when you publish your script", "Gold Subscription (30 days)", "AI Trailer", "Winner Badge"],
  runnerUp: ["Silver Subscription (30 days)", "Featured placement when you publish your script", "Runner-Up Badge"],
  secondRunnerUp: ["Bronze Subscription (14 days)", "Honorable Mention Badge"],
};

competitionSchema.pre("validate", async function ensureSlug() {
  if (this.slug) return;
  const base = slugify(this.name) || "competition";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const exists = await this.constructor.exists({ slug: candidate });
    if (!exists) {
      this.slug = candidate;
      return;
    }
  }
  this.slug = `${base}-${Date.now()}`;
});

export default mongoose.model("Competition", competitionSchema);
