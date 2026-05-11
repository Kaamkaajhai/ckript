import mongoose from "mongoose";

const EventSubmissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: "EventRegistration", required: true },
    eventSlug: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    genre: { type: String, default: "" },
    logline: { type: String, default: "" },
    contentHtml: { type: String, default: "" },
    contentText: { type: String, default: "" },
    wordCount: { type: Number, default: 0 },
    estimatedPages: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "submitted"],
      default: "draft",
    },
    submittedAt: { type: Date, default: null },
    originalityConfirmedAt: { type: Date, default: null },
    rulesAcceptedAt: { type: Date, default: null },
    editLockAcceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EventSubmissionSchema.index({ user: 1, eventSlug: 1 }, { unique: true });
EventSubmissionSchema.index({ eventSlug: 1, status: 1, updatedAt: -1 });

const EventSubmission = mongoose.model("EventSubmission", EventSubmissionSchema);

export default EventSubmission;
