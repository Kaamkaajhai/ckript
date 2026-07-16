import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    producer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    writer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    script: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Script",
      required: true,
    },
    producer_name: {
      type: String,
      required: true,
    },
    writer_name: {
      type: String,
      required: true,
    },
    script_name: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
    },
    meetingLink: {
      type: String,
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    // IANA timezone the producer scheduled in (e.g. "Asia/Kolkata"). Combined with scheduledDate +
    // scheduledTime it fully specifies the instant; Google localizes per-attendee from this.
    timeZone: {
      type: String,
    },
    // Canonical UTC instant of the meeting start (computed from date + time + timeZone). Source of truth
    // for sorting / "upcoming vs past" — never ambiguous, unlike the naive date+time above.
    startAt: {
      type: Date,
      index: true,
    },
    // Google Calendar event id (for future update/cancel sync).
    googleEventId: {
      type: String,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;
