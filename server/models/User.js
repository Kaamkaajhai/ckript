import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["creator", "investor", "producer", "director", "actor", "reader", "writer", "industry", "professional"], required: true },
  bio: { type: String },
  skills: [String],
  profileImage: { type: String },
  
  // Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  
  // Writer-specific profile fields
  writerProfile: {
    legalName: { type: String },
    representationStatus: { 
      type: String, 
      enum: ["unrepresented", "manager", "agent", "manager_and_agent"],
      default: "unrepresented"
    },
    agencyName: { type: String },
    wgaMember: { type: Boolean, default: false },
    // Writer's primary genres
    genres: [String],
    // Specialized tags (themes, tones, settings)
    specializedTags: [String],
    // Plan selection
    plan: { type: String, enum: ["free", "paid"], default: "free" },
    // Diversity data (optional)
    diversity: {
      gender: { type: String },
      ethnicity: { type: String },
      lgbtqStatus: { type: String },
      disabilityStatus: { type: String },
    },
    // Onboarding completion tracking
    onboardingComplete: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 0 }, // Track which step they're on
  },
  
  // Industry Professional Profile
  industryProfile: {
    subRole: { 
      type: String, 
      enum: ["producer", "agent", "director", "actor"],
    },
    company: { type: String },
    jobTitle: { type: String },
    imdbUrl: { type: String },
    linkedInUrl: { type: String },
    previousCredits: { type: String },
    isVerified: { type: Boolean, default: false },
    // Mandates (what they're looking for)
    mandates: {
      formats: [String], // Feature Film, TV Pilot, etc.
      budgetTiers: [String], // micro, low, medium, high, blockbuster
      genres: [String], // Genres they want
      excludeGenres: [String], // Genres they don't want
      specificHooks: [String] // Diverse Voices, Female-Led, etc.
    },
    savedScripts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Script' }],
    onboardingComplete: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 0 },
  },
  
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // Smart Match preferences
  preferences: {
    genres: [String],
    budgetRange: { min: { type: Number, default: 0 }, max: { type: Number, default: 1000000 } },
    contentTypes: [{ type: String, enum: ["movie", "tv_series", "anime", "documentary", "short_film", "web_series", "book", "startup"] }],
  },
  viewHistory: [{
    script: { type: mongoose.Schema.Types.ObjectId, ref: "Script" },
    viewedAt: { type: Date, default: Date.now },
  }],
  // Subscription & credits
  subscription: {
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    expiresAt: { type: Date },
    scriptScoreCredits: { type: Number, default: 0 },
  },
  // Actor-specific fields for Talent Attachment
  actorProfile: {
    headshot: { type: String },
    reelUrl: { type: String },
    age: { type: Number },
    gender: { type: String },
    ethnicity: { type: String },
    actingStyles: [String],
    typeCast: { type: String }, // e.g. "Rough, older, like Liam Neeson"
    availableForAuditions: { type: Boolean, default: true },
  },
  // Reader system
  scriptsRead: [{ type: mongoose.Schema.Types.ObjectId, ref: "Script" }],
  favoriteScripts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Script" }],
  // Domain Packages purchased
  domainPackages: [{
    category: { type: String },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  }],
  // Notifications preferences
  notificationPrefs: {
    smartMatchAlerts: { type: Boolean, default: true },
    auditionAlerts: { type: Boolean, default: true },
    holdAlerts: { type: Boolean, default: true },
    viewAlerts: { type: Boolean, default: true },
  },
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
