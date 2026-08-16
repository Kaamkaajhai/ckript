export const SCRIPT_MEDIA_POLICIES = Object.freeze({
  trailer: Object.freeze({
    kind: "trailer",
    maxBytes: 250 * 1024 * 1024,
    folder: "scriptbridge/trailers",
    publicIdPrefix: "trailer",
    label: "Trailer",
  }),
  pitchVideo: Object.freeze({
    kind: "pitchVideo",
    maxBytes: 90 * 1024 * 1024,
    folder: "scriptbridge/pitch-videos",
    publicIdPrefix: "pitch",
    label: "Pitch video",
  }),
});

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

export const isAllowedScriptVideoMimeType = (mimeType) => (
  VIDEO_MIME_TYPES.has(String(mimeType || "").trim().toLowerCase())
);

export const canUploadPitchVideo = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (!role || !["writer", "creator"].includes(role)) return true;
  const plan = String(user?.subscription?.plan || "free").toLowerCase();
  return plan !== "free" && plan !== "none";
};

/*
 * One mutation rule for legacy whole-file uploads and resumable completion.
 * The transport may differ, but attaching the resulting asset must not make
 * trailer status or the AI-trailer queue drift between the two paths.
 */
export function attachUploadedScriptMedia(script, { kind, secureUrl }) {
  if (!script || !secureUrl) throw new Error("A script and uploaded media URL are required");

  if (kind === "pitchVideo") {
    script.pitchVideoUrl = secureUrl;
    return {
      message: "Pitch video uploaded successfully",
      pitchVideoUrl: secureUrl,
    };
  }

  if (kind !== "trailer") throw new Error("Unsupported script media kind");

  script.uploadedTrailerUrl = secureUrl;
  script.trailerSource = "uploaded";

  const shouldKeepAiQueue = Boolean(script.services?.aiTrailer && !script.trailerUrl);
  if (shouldKeepAiQueue) {
    if (!["requested", "generating"].includes(script.trailerStatus)) {
      script.trailerStatus = "requested";
    }
    script.trailerWriterFeedback = {
      status: "pending",
      note: script.trailerWriterFeedback?.note || "",
      updatedAt: new Date(),
    };
  } else {
    script.trailerStatus = "ready";
    script.trailerWriterFeedback = {
      status: "approved",
      note: "",
      updatedAt: new Date(),
    };
  }

  return {
    message: shouldKeepAiQueue
      ? "Trailer uploaded successfully. AI trailer request is still active."
      : "Trailer uploaded successfully (free)",
    trailerUrl: secureUrl,
    trailerSource: "uploaded",
  };
}
