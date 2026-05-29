import mongoose from "mongoose";

const clickSchema = new mongoose.Schema(
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

const pageSchema = new mongoose.Schema(
  {
    path: { type: String, trim: true },
    title: { type: String, trim: true },
    referrer: { type: String, trim: true },
    enteredAt: { type: Date, default: Date.now },
    exitedAt: { type: Date },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
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

const deviceSchema = new mongoose.Schema(
  {
    deviceType: { type: String, trim: true },
    browser: { type: String, trim: true },
    os: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { _id: false }
);

const sessionEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, trim: true },
    action: { type: String, trim: true },
    path: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, trim: true, index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    entryPath: { type: String, trim: true },
    exitPath: { type: String, trim: true },
    location: locationSchema,
    device: deviceSchema,
    scrollDepthMax: { type: Number, default: 0 },
    pages: { type: [pageSchema], default: [] },
    clicks: { type: [clickSchema], default: [] },
    events: { type: [sessionEventSchema], default: [] },
  },
  { _id: false }
);

const anonymousVisitorSchema = new mongoose.Schema(
  {
    anonymousId: { type: String, required: true, unique: true, index: true },
    ipAddress: { type: String, trim: true },
    location: locationSchema,
    device: deviceSchema,
    isReturning: { type: Boolean, default: false },
    firstVisit: { type: Date, default: Date.now },
    lastVisit: { type: Date, default: Date.now },
    lastEventAt: { type: Date, default: Date.now },
    sessions: { type: [sessionSchema], default: [] },
  },
  { timestamps: true }
);

anonymousVisitorSchema.index({ lastVisit: -1 });
anonymousVisitorSchema.index({ isReturning: 1, lastVisit: -1 });

const AnonymousVisitor = mongoose.model("AnonymousVisitor", anonymousVisitorSchema);

export default AnonymousVisitor;
