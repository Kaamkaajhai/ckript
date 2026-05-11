import mongoose from "mongoose";

const EventRegistrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventSlug: { type: String, required: true, index: true },
    participantId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    username: { type: String, default: "" },
    email: { type: String, required: true },
    phoneNumber: { type: String, default: "" },
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    bio: { type: String, default: "" },
    socialLinks: { type: String, default: "" },
    experienceLevel: { type: String, default: "" },
    preferredGenre: { type: String, default: "" },
    participationReason: { type: String, default: "" },
    storyPlan: { type: String, default: "" },
    agreedOriginal: { type: Boolean, default: false },
    agreedRules: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentAmount: { type: Number, default: 0 },
    paymentCurrency: { type: String, default: "INR" },
    paymentProvider: { type: String, default: "manual" },
    paymentReference: { type: String, default: "" },
  },
  { timestamps: true }
);

EventRegistrationSchema.index({ user: 1, eventSlug: 1 }, { unique: true });

const EventRegistration = mongoose.model("EventRegistration", EventRegistrationSchema);

export default EventRegistration;
