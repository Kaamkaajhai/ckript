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
  slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  lifecycle: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
  // Orthogonal to lifecycle. A `hidden` competition runs completely normally for the people who have
  // its link, but is never DISCOVERED: it is excluded from the Hall of Fame and never chosen as the
  // public "active" competition. That is what makes internal beta / university-only /
  // sponsor-exclusive events possible on the same infrastructure.
  visibility: { type: String, enum: ["public", "hidden"], default: "public", index: true },

  dates: {
    regOpensAt: { type: Date, required: true },
    regClosesAt: { type: Date, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    resultsAt: { type: Date },            // planned/announced results date — informational only
  },
  // Set when an admin declares results. Its presence (not a date comparison) is what puts the
  // competition into the `results` phase, so results can be declared early or late.
  resultsDeclaredAt: { type: Date, default: null },

  // Withheld by the API until the competition is live — the reveal is the point of the event.
  theme: {
    title: { type: String, trim: true, maxlength: 200, default: "" },
    brief: { type: String, maxlength: 5000, default: "" },
    allowedGenres: [{ type: String }],
    guidelines: { type: String, maxlength: 5000, default: "" },
  },

  overview: { type: String, maxlength: 5000, default: "" },
  eligibility: { type: String, maxlength: 2000, default: "" },
  format: { type: String, maxlength: 1000, default: "Any format written in the Ckript editor" },

  // Hero image for the Hall of Fame record.
  bannerUrl: { type: String, default: "" },
  // Free text rather than a number+currency: prizes here mix cash with subscriptions, trailers and
  // features, and the cash element is settled off-platform in whatever currency suits the edition.
  prizePool: { type: String, trim: true, maxlength: 200, default: "" },

  prizes: {
    winner: [{ type: String }],
    runnerUp: [{ type: String }],
    special: [{ title: String, description: String }],
  },

  rules: [{ type: String, maxlength: 1000 }],
  faq: [{ q: { type: String, maxlength: 300 }, a: { type: String, maxlength: 2000 } }],
  judges: [{ name: String, title: String, photoUrl: String, bio: { type: String, maxlength: 600, default: "" } }],
  sponsors: [{ name: String, logoUrl: String, url: String, tier: { type: String, trim: true, maxlength: 40, default: "" } }],
  communityLinks: [{ label: String, url: String }],
  resources: [{ label: String, url: String }],

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
  winner: ["Cash Prize", "Featured Script", "Gold Subscription (30 days)", "AI Trailer", "Winner Badge"],
  runnerUp: ["Silver Subscription (30 days)", "Featured Script", "Runner-Up Badge"],
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
