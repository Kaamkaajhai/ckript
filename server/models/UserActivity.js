import mongoose from "mongoose";

const activityLocationSchema = new mongoose.Schema(
  {
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    region: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    source: { type: String, trim: true },
  },
  { _id: false }
);

const activityDeviceSchema = new mongoose.Schema(
  {
    deviceType: { type: String, trim: true },
    browser: { type: String, trim: true },
    os: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { _id: false }
);

const userSessionPageSchema = new mongoose.Schema(
  {
    path: { type: String, trim: true },
    title: { type: String, trim: true },
    enteredAt: { type: Date, default: Date.now },
    exitedAt: { type: Date },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSessionClickSchema = new mongoose.Schema(
  {
    element: { type: String, trim: true },
    text: { type: String, trim: true },
    label: { type: String, trim: true },
    section: { type: String, trim: true },
    path: { type: String, trim: true },
    x: { type: Number },
    y: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSessionActionSchema = new mongoose.Schema(
  {
    eventType: { type: String, trim: true },
    action: { type: String, trim: true },
    path: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, trim: true, index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    entryPath: { type: String, trim: true },
    exitPath: { type: String, trim: true },
    location: activityLocationSchema,
    device: activityDeviceSchema,
    pages: { type: [userSessionPageSchema], default: [] },
    clicks: { type: [userSessionClickSchema], default: [] },
    actions: { type: [userSessionActionSchema], default: [] },
  },
  { _id: false }
);

const authEventSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true },
    source: { type: String, trim: true },
    sessionId: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const activityLogSchema = new mongoose.Schema(
  {
    sessionId: { type: String, trim: true },
    eventType: { type: String, trim: true },
    action: { type: String, trim: true },
    page: { type: String, trim: true },
    clickElement: { type: String, trim: true },
    timeSpentSeconds: { type: Number, default: 0 },
    ipAddress: { type: String, trim: true },
    location: activityLocationSchema,
    device: activityDeviceSchema,
    authState: {
      type: String,
      enum: ["anonymous", "registered"],
      default: "registered",
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    anonymousId: { type: String, trim: true, index: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    signupAt: { type: Date },
    firstLoginAt: { type: Date },
    lastLoginAt: { type: Date },
    authEvents: { type: [authEventSchema], default: [] },
    sessions: { type: [userSessionSchema], default: [] },
    activityLogs: { type: [activityLogSchema], default: [] },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userActivitySchema.index({ lastActiveAt: -1 });
userActivitySchema.index({ "activityLogs.timestamp": -1 });
userActivitySchema.index({ "authEvents.timestamp": -1 });

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

export default UserActivity;
