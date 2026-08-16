import mongoose from "mongoose";

const acceptedPartSchema = new mongoose.Schema({
  index: { type: Number, required: true, min: 0 },
  start: { type: Number, required: true, min: 0 },
  end: { type: Number, required: true, min: 0 },
  size: { type: Number, required: true, min: 1 },
  checksum: { type: String, required: true },
  acceptedAt: { type: Date, default: Date.now },
}, { _id: false });

/*
 * Durable coordination record for a Cloudinary ranged upload.
 *
 * The binary data never lives in MongoDB. Each request holds at most one 6 MiB
 * part, sends it to Cloudinary with `uploadId` and its byte range, then records
 * only the acknowledged range and SHA-256 checksum here. That is what lets a
 * different request (or a restarted browser) ask which bytes are authoritative
 * without putting a 250 MiB trailer in the Node process.
 */
const mediaUploadSessionSchema = new mongoose.Schema({
  scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  kind: { type: String, enum: ["trailer", "pitchVideo"], required: true },
  fileName: { type: String, required: true, maxlength: 255 },
  mimeType: { type: String, required: true, maxlength: 120 },
  fileSize: { type: Number, required: true, min: 1 },
  lastModified: { type: Number, default: 0, min: 0 },
  fingerprint: { type: String, required: true, maxlength: 500 },
  chunkSize: { type: Number, required: true, min: 1 },
  uploadId: { type: String, required: true, unique: true },
  publicId: { type: String, required: true, unique: true },
  folder: { type: String, required: true },
  resourceType: { type: String, default: "video" },
  status: {
    type: String,
    enum: ["uploading", "ready", "completed", "aborted", "expired"],
    default: "uploading",
    index: true,
  },
  acceptedParts: { type: [acceptedPartSchema], default: [] },
  asset: {
    secureUrl: { type: String, default: "" },
    publicId: { type: String, default: "" },
    resourceType: { type: String, default: "video" },
    bytes: { type: Number, default: 0 },
    format: { type: String, default: "" },
  },
  completedAt: { type: Date, default: null },
  abortedAt: { type: Date, default: null },
  // Cancel closes the session before attempting an upstream delete. If that
  // delete is temporarily unavailable, this keeps cleanup retryable without
  // allowing the supposedly cancelled session to be restored.
  cleanupPending: { type: Boolean, default: false, index: true },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

// Session creation is idempotent for the same selected local file while that
// session is active. Expired/aborted rows remain as an audit trail and do not
// prevent a later session for the same file.
mediaUploadSessionSchema.index({
  userId: 1,
  scriptId: 1,
  kind: 1,
  fingerprint: 1,
  status: 1,
});
mediaUploadSessionSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model("MediaUploadSession", mediaUploadSessionSchema);
