import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["creator", "investor", "producer", "director", "actor", "reader"], required: true },
  bio: { type: String },
  skills: [String],
  profileImage: { type: String },
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
