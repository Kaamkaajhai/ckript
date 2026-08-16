import { createHash, randomUUID } from "node:crypto";
import Script from "../models/Script.js";
import MediaUploadSession from "../models/MediaUploadSession.js";
import {
  deleteFromCloudinary,
  uploadChunkToCloudinary,
} from "../config/cloudinary.js";
import {
  attachUploadedScriptMedia,
  canUploadPitchVideo,
  isAllowedScriptVideoMimeType,
  SCRIPT_MEDIA_POLICIES,
} from "../utils/scriptMedia.js";

// Cloudinary requires every non-final manual part to be larger than 5 MB.
// Six MiB is deliberately small enough for a mobile retry and bounded enough
// that a route can verify the checksum without buffering a whole video.
export const SCRIPT_MEDIA_CHUNK_BYTES = 6 * 1024 * 1024;
export const SCRIPT_MEDIA_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const ACTIVE_STATUSES = ["uploading", "ready"];
const RESTORABLE_STATUSES = [...ACTIVE_STATUSES, "completed"];
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/i;

const creatorIdOf = (script) => String(script?.creator?._id || script?.creator || "");
const userIdOf = (req) => String(req?.user?._id || "");

const asDate = (value) => (value instanceof Date ? value : new Date(value));

const sessionExpired = (session, now) => (
  Number.isNaN(asDate(session?.expiresAt).getTime())
  || asDate(session.expiresAt).getTime() <= now.getTime()
);

const fingerprintFor = ({ kind, fileName, mimeType, fileSize, lastModified }) => (
  createHash("sha256")
    .update([kind, fileName, mimeType, fileSize, lastModified].join("\u0000"))
    .digest("hex")
);

export const checksumForPart = (buffer) => (
  createHash("sha256").update(buffer).digest("hex")
);

export function parseUploadContentRange(value) {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/i.exec(String(value || "").trim());
  if (!match) return null;
  const [start, end, total] = match.slice(1).map(Number);
  if (![start, end, total].every(Number.isSafeInteger)) return null;
  if (start < 0 || end < start || total <= end) return null;
  return { start, end, total, size: end - start + 1 };
}

const sortedParts = (session) => (
  [...(session?.acceptedParts || [])].sort((a, b) => Number(a.index) - Number(b.index))
);

export function serializeMediaUploadSession(session) {
  const parts = sortedParts(session).map((part) => ({
    index: Number(part.index),
    start: Number(part.start),
    end: Number(part.end),
    size: Number(part.size),
    checksum: part.checksum,
  }));
  const acceptedBytes = parts.reduce((total, part) => total + part.size, 0);
  const fileSize = Number(session.fileSize) || 0;

  return {
    sessionId: String(session._id),
    scriptId: String(session.scriptId?._id || session.scriptId),
    kind: session.kind,
    file: {
      name: session.fileName,
      type: session.mimeType,
      size: fileSize,
      lastModified: Number(session.lastModified) || 0,
      fingerprint: session.fingerprint,
    },
    status: session.status,
    chunkSize: Number(session.chunkSize),
    totalParts: Math.ceil(fileSize / Number(session.chunkSize)),
    acceptedParts: parts,
    acceptedBytes,
    nextPart: parts.length,
    percent: fileSize > 0 ? Math.floor((acceptedBytes / fileSize) * 100) : 0,
    expiresAt: asDate(session.expiresAt).toISOString(),
    cleanupPending: Boolean(session.cleanupPending),
    asset: session.status === "completed" ? {
      secureUrl: session.asset?.secureUrl || "",
      bytes: Number(session.asset?.bytes) || fileSize,
      format: session.asset?.format || "",
    } : null,
  };
}

const respondError = (res, status, message, extra = {}) => (
  res.status(status).json({ message, ...extra })
);

const policyFromBody = (body = {}) => SCRIPT_MEDIA_POLICIES[String(body.kind || "")];

const validateSessionRequest = (body = {}) => {
  const policy = policyFromBody(body);
  if (!policy) return { error: "Media kind must be trailer or pitchVideo." };

  const fileName = String(body.fileName || "").trim();
  const mimeType = String(body.mimeType || "").trim().toLowerCase();
  const fileSize = Number(body.fileSize);
  const lastModified = Number(body.lastModified) || 0;

  if (!fileName || fileName.length > 255) return { error: "A valid media file name is required." };
  if (!isAllowedScriptVideoMimeType(mimeType)) {
    return { error: "Only MP4, MPEG, MOV, M4V and WebM videos are allowed." };
  }
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
    return { error: "A valid media file size is required." };
  }
  if (fileSize > policy.maxBytes) {
    return { error: `${policy.label} must be ${Math.floor(policy.maxBytes / (1024 * 1024))}MB or smaller.`, status: 413 };
  }
  if (!Number.isSafeInteger(lastModified) || lastModified < 0) {
    return { error: "The media file timestamp is invalid." };
  }

  return { policy, kind: policy.kind, fileName, mimeType, fileSize, lastModified };
};

const defaultDependencies = {
  ScriptModel: Script,
  SessionModel: MediaUploadSession,
  uploadChunk: uploadChunkToCloudinary,
  deleteAsset: deleteFromCloudinary,
  now: () => new Date(),
  randomId: randomUUID,
};

export function createMediaUploadHandlers(overrides = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  const {
    ScriptModel, SessionModel, uploadChunk, deleteAsset, now, randomId,
  } = dependencies;

  const loadOwnedScript = async (req, res) => {
    const script = await ScriptModel.findById(req.params.id);
    if (!script) {
      respondError(res, 404, "Script not found");
      return null;
    }
    if (creatorIdOf(script) !== userIdOf(req)) {
      respondError(res, 403, "Only the script creator can upload media");
      return null;
    }
    return script;
  };

  const loadOwnedSession = async (req, res) => {
    const session = await SessionModel.findOne({
      _id: req.params.sessionId,
      scriptId: req.params.id,
      userId: req.user._id,
    });
    if (!session) {
      respondError(res, 404, "Upload session not found");
      return null;
    }
    return session;
  };

  const deleteSessionAsset = async (session) => {
    const publicId = session?.asset?.publicId;
    if (!publicId) return;
    await deleteAsset(publicId, {
      resource_type: session.asset?.resourceType || session.resourceType || "video",
    });
  };

  const expireIfNeeded = async (session, res) => {
    const current = now();
    if (!sessionExpired(session, current)) return false;

    if (ACTIVE_STATUSES.includes(session.status)) {
      await deleteSessionAsset(session);
      session.status = "expired";
      await session.save();
    }
    respondError(res, 410, "This upload session expired. Start a new upload.", { expired: true });
    return true;
  };

  const createSession = async (req, res) => {
    try {
      const validated = validateSessionRequest(req.body);
      if (validated.error) {
        return respondError(res, validated.status || 400, validated.error);
      }

      const script = await loadOwnedScript(req, res);
      if (!script) return undefined;
      if (validated.kind === "pitchVideo" && !canUploadPitchVideo(req.user)) {
        return respondError(res, 403, "Pitch video uploads are a premium feature. Please upgrade your plan to unlock this.", {
          requiresUpgrade: true,
        });
      }

      // Serverless deployments do not have a reliable process lifetime for a
      // timer. Every new session therefore also advances a small batch of the
      // expiry queue; a cleanup failure is observable but must not block the
      // writer from starting a fresh transfer.
      cleanupExpiredSessions({ limit: 10 }).catch((error) => {
        console.error("Lazy media upload cleanup failed:", error);
      });

      const fingerprint = fingerprintFor(validated);
      const current = now();
      const existing = await SessionModel.findOne({
        scriptId: script._id,
        userId: req.user._id,
        kind: validated.kind,
        fingerprint,
        status: { $in: RESTORABLE_STATUSES },
        expiresAt: { $gt: current },
      });
      if (existing) {
        return res.status(200).json({
          message: "Resumable upload session restored",
          upload: serializeMediaUploadSession(existing),
        });
      }

      const uploadId = randomId();
      const publicIdToken = String(uploadId).replace(/[^a-zA-Z0-9_-]/g, "");
      const session = await SessionModel.create({
        scriptId: script._id,
        userId: req.user._id,
        kind: validated.kind,
        fileName: validated.fileName,
        mimeType: validated.mimeType,
        fileSize: validated.fileSize,
        lastModified: validated.lastModified,
        fingerprint,
        chunkSize: SCRIPT_MEDIA_CHUNK_BYTES,
        uploadId,
        publicId: `${validated.policy.publicIdPrefix}-${script._id}-${publicIdToken}`,
        folder: validated.policy.folder,
        resourceType: "video",
        expiresAt: new Date(current.getTime() + SCRIPT_MEDIA_SESSION_TTL_MS),
      });

      return res.status(201).json({
        message: "Resumable upload session created",
        upload: serializeMediaUploadSession(session),
      });
    } catch (error) {
      console.error("Create media upload session error:", error);
      return respondError(res, 500, error.message || "Could not start the media upload");
    }
  };

  const getSessionStatus = async (req, res) => {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return undefined;
      if (await expireIfNeeded(session, res)) return undefined;
      return res.json({ upload: serializeMediaUploadSession(session) });
    } catch (error) {
      console.error("Read media upload session error:", error);
      return respondError(res, 500, error.message || "Could not read the upload session");
    }
  };

  const uploadPart = async (req, res) => {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return undefined;
      if (await expireIfNeeded(session, res)) return undefined;
      if (session.status === "completed") {
        return respondError(res, 409, "This upload is already complete.");
      }
      if (session.status === "aborted") {
        return respondError(res, 410, "This upload was cancelled. Start a new upload.", { aborted: true });
      }
      if (session.status === "ready") {
        return respondError(res, 409, "All parts are already uploaded. Complete the session.");
      }

      const index = Number(req.params.partNumber);
      const range = parseUploadContentRange(req.headers["content-range"]);
      const suppliedChecksum = String(req.headers["x-chunk-sha256"] || "").trim().toLowerCase();
      if (!Number.isSafeInteger(index) || index < 0) {
        return respondError(res, 400, "Part number must be a non-negative integer.");
      }
      if (!range) return respondError(res, 400, "A valid Content-Range header is required.");
      if (!CHECKSUM_PATTERN.test(suppliedChecksum)) {
        return respondError(res, 400, "A SHA-256 checksum is required for every part.");
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return respondError(res, 400, "The upload part is empty.");
      }
      if (range.total !== Number(session.fileSize) || range.size !== req.body.length) {
        return respondError(res, 409, "The part range does not match the upload session.");
      }

      const expectedStart = index * Number(session.chunkSize);
      const expectedEnd = Math.min(expectedStart + Number(session.chunkSize), Number(session.fileSize)) - 1;
      if (range.start !== expectedStart || range.end !== expectedEnd) {
        return respondError(res, 409, "The part range is not the expected range for this upload.", {
          expectedRange: `bytes ${expectedStart}-${expectedEnd}/${session.fileSize}`,
        });
      }

      const actualChecksum = checksumForPart(req.body);
      if (actualChecksum !== suppliedChecksum) {
        return respondError(res, 422, "The upload part checksum does not match its bytes.");
      }

      const parts = sortedParts(session);
      const accepted = parts.find((part) => Number(part.index) === index);
      if (accepted) {
        const samePart = Number(accepted.start) === range.start
          && Number(accepted.end) === range.end
          && accepted.checksum === suppliedChecksum;
        if (!samePart) {
          return respondError(res, 409, "This part number was already accepted with different bytes.");
        }
        return res.json({
          message: "Upload part already accepted",
          idempotent: true,
          upload: serializeMediaUploadSession(session),
        });
      }
      if (index !== parts.length) {
        return respondError(res, 409, "Upload parts must be sent in order.", { nextPart: parts.length });
      }

      const isFinal = range.end === Number(session.fileSize) - 1;
      const result = await uploadChunk(req.body, {
        uploadId: session.uploadId,
        start: range.start,
        end: range.end,
        total: range.total,
        folder: session.folder,
        public_id: session.publicId,
        resource_type: session.resourceType,
        filename: session.fileName,
      });

      if (isFinal && (result?.done !== true || !result?.secure_url)) {
        return respondError(res, 502, "Cloudinary did not confirm the completed upload. Retry this part.");
      }
      if (!isFinal && result?.done === true) {
        return respondError(res, 502, "Cloudinary completed the upload before all declared bytes arrived.");
      }

      session.acceptedParts.push({
        index,
        start: range.start,
        end: range.end,
        size: range.size,
        checksum: suppliedChecksum,
        acceptedAt: now(),
      });
      if (isFinal) {
        session.status = "ready";
        session.asset = {
          secureUrl: result.secure_url,
          publicId: result.public_id || session.publicId,
          resourceType: result.resource_type || session.resourceType,
          bytes: Number(result.bytes) || Number(session.fileSize),
          format: result.format || "",
        };
      }
      await session.save();

      return res.json({
        message: isFinal ? "All upload parts accepted" : "Upload part accepted",
        upload: serializeMediaUploadSession(session),
      });
    } catch (error) {
      console.error("Upload media part error:", error);
      return respondError(res, 502, error.message || "The upload part could not be stored");
    }
  };

  const completeSession = async (req, res) => {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return undefined;
      if (await expireIfNeeded(session, res)) return undefined;
      if (session.status === "aborted") {
        return respondError(res, 410, "This upload was cancelled. Start a new upload.", { aborted: true });
      }

      const script = await loadOwnedScript(req, res);
      if (!script) return undefined;
      if (session.kind === "pitchVideo" && !canUploadPitchVideo(req.user)) {
        return respondError(res, 403, "Pitch video uploads are a premium feature. Please upgrade your plan to unlock this.", {
          requiresUpgrade: true,
        });
      }

      if (session.status === "completed") {
        return res.json({
          message: "Media upload already completed",
          idempotent: true,
          upload: serializeMediaUploadSession(session),
          script,
        });
      }
      if (session.status !== "ready" || !session.asset?.secureUrl) {
        return respondError(res, 409, "Upload every part before completing this session.", {
          upload: serializeMediaUploadSession(session),
        });
      }

      const mediaResult = attachUploadedScriptMedia(script, {
        kind: session.kind,
        secureUrl: session.asset.secureUrl,
      });
      await script.save();

      session.status = "completed";
      session.completedAt = now();
      await session.save();

      return res.json({
        ...mediaResult,
        upload: serializeMediaUploadSession(session),
        script,
      });
    } catch (error) {
      console.error("Complete media upload error:", error);
      return respondError(res, 500, error.message || "The uploaded media could not be attached");
    }
  };

  const abortSession = async (req, res) => {
    try {
      const session = await loadOwnedSession(req, res);
      if (!session) return undefined;
      if (session.status === "completed") {
        return respondError(res, 409, "Completed media is already attached and cannot be cancelled here.");
      }
      if (session.status === "aborted" || session.status === "expired") {
        return res.json({
          message: "Upload session already closed",
          idempotent: true,
          upload: serializeMediaUploadSession(session),
        });
      }

      session.status = "aborted";
      session.abortedAt = now();
      session.cleanupPending = Boolean(session?.asset?.publicId);
      await session.save();

      let cleanupError = null;
      if (session.cleanupPending) {
        try {
          await deleteSessionAsset(session);
          session.cleanupPending = false;
          await session.save();
        } catch (error) {
          // The cancellation itself is already authoritative. Keep the asset
          // unreachable and let scheduled/lazy cleanup retry its deletion.
          cleanupError = error;
          console.error("Cancelled media asset cleanup deferred:", error);
        }
      }

      return res.status(cleanupError ? 202 : 200).json({
        message: cleanupError
          ? "Upload cancelled; asset cleanup will retry automatically"
          : "Upload cancelled",
        upload: serializeMediaUploadSession(session),
      });
    } catch (error) {
      console.error("Abort media upload error:", error);
      return respondError(res, 502, error.message || "The upload could not be cancelled");
    }
  };

  const cleanupExpiredSessions = async ({ limit = 50 } = {}) => {
    const current = now();
    const expiredQuery = SessionModel.find({
      status: { $in: ACTIVE_STATUSES },
      expiresAt: { $lte: current },
    });
    const abortedQuery = SessionModel.find({
      status: "aborted",
      cleanupPending: true,
    });
    const read = async (query) => (
      typeof query?.limit === "function" ? query.limit(limit) : query
    );
    const [expiredSessions, abortedSessions] = await Promise.all([
      read(expiredQuery),
      read(abortedQuery),
    ]);
    const sessions = [...new Map([
      ...(expiredSessions || []),
      ...(abortedSessions || []),
    ].map((session) => [String(session._id), session])).values()].slice(0, limit);
    let cleaned = 0;
    for (const session of sessions || []) {
      try {
        await deleteSessionAsset(session);
        if (session.status === "aborted") {
          session.cleanupPending = false;
        } else {
          session.status = "expired";
        }
        await session.save();
        cleaned += 1;
      } catch (error) {
        // Keep it active-but-expired so the next cleanup retries the upstream
        // deletion. Marking it expired after a failed delete would orphan a
        // final Cloudinary asset with no later cleanup path.
        console.error("Expired media upload cleanup error:", error);
      }
    }
    return cleaned;
  };

  return {
    createSession,
    getSessionStatus,
    uploadPart,
    completeSession,
    abortSession,
    cleanupExpiredSessions,
  };
}

const handlers = createMediaUploadHandlers();

export const createMediaUploadSession = handlers.createSession;
export const getMediaUploadSession = handlers.getSessionStatus;
export const uploadMediaPart = handlers.uploadPart;
export const completeMediaUploadSession = handlers.completeSession;
export const abortMediaUploadSession = handlers.abortSession;
export const cleanupExpiredMediaUploadSessions = handlers.cleanupExpiredSessions;
