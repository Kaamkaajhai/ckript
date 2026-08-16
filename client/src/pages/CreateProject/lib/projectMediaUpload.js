const MEDIA_UPLOADS = Object.freeze([
  { type: "thumbnail", label: "Cover image", field: "thumbnail", endpoint: "upload-thumbnail" },
  { type: "trailer", label: "Trailer video", field: "trailer", endpoint: "upload-trailer" },
  { type: "pitchVideo", label: "Pitch video", field: "pitchVideo", endpoint: "upload-pitch-video" },
]);

const LARGE_MEDIA_TYPES = new Set(["trailer", "pitchVideo"]);
const RESUMABLE_MEDIA_TYPES = new Set(["trailer", "pitchVideo"]);

// A deterministic product threshold, not an estimate of the current network.
// NetworkInformation is unavailable in several major browsers, while File.size
// is present everywhere this upload flow can run. Covers cannot reach this
// threshold because both entry points enforce a 5 MB ceiling.
export const LARGE_MEDIA_WARNING_BYTES = 25 * 1024 * 1024;

const requestedMediaTypes = (requestedTypes) => (
  Array.isArray(requestedTypes) ? new Set(requestedTypes) : null
);

export const mediaRecoveryTypes = (recovery = {}) => Array.from(new Set([
  ...(recovery?.failedTypes || []),
  ...(recovery?.cancelledTypes || []),
]));

export function buildMediaUploadPreflight({
  files = {},
  requestedTypes = null,
  thresholdBytes = LARGE_MEDIA_WARNING_BYTES,
} = {}) {
  const requested = requestedMediaTypes(requestedTypes);
  const largeFiles = MEDIA_UPLOADS.flatMap(({ type, label }) => {
    const file = files[type];
    if (
      !LARGE_MEDIA_TYPES.has(type)
      || !file
      || (requested && !requested.has(type))
      || Number(file.size) < thresholdBytes
    ) return [];

    return [{
      type,
      label,
      name: String(file.name || label),
      size: Number(file.size) || 0,
      lastModified: Number(file.lastModified) || 0,
    }];
  });

  if (largeFiles.length === 0) return null;

  // The signature is deliberately based on the selected local files. It lets
  // an orchestrator acknowledge one batch without suppressing the warning when
  // a writer replaces a cancelled file with a different large file.
  const signature = largeFiles
    .map(({ type, name, size, lastModified }) => `${type}:${name}:${size}:${lastModified}`)
    .join("|");

  return {
    signature,
    files: largeFiles,
    totalBytes: largeFiles.reduce((total, file) => total + file.size, 0),
  };
}

export const isMediaUploadCancellation = (error, signal = null) => Boolean(
  signal?.aborted
  || error?.code === "ERR_CANCELED"
  || error?.name === "CanceledError"
  || error?.name === "AbortError"
  || error?.__CANCEL__
);

export const mergeMediaProgress = (setProgress, type, next) => {
  setProgress((current) => {
    const merged = { ...(current[type] || {}), ...next };
    // The first event of a new attempt is always 0/uploading. Clear the marker
    // there so an explicitly aborted session cannot make its fresh retry read
    // "Resuming 0%"; the authoritative session response adds it back only when
    // accepted server ranges actually exist.
    if (next.status === "uploading" && next.percent === 0 && next.resumed === undefined) {
      delete merged.resumed;
    }
    return { ...current, [type]: merged };
  });
};

export const withoutMediaProgress = (current, type) => {
  if (!current?.[type]) return current || {};
  const next = { ...current };
  delete next[type];
  return next;
};

const checksumHex = (bytes) => (
  Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("")
);

export async function sha256ForBlob(blob) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure upload checksums are not available in this browser.");
  }
  const bytes = await blob.arrayBuffer();
  return checksumHex(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

const clampPercent = (value) => Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));

const resumableSessionPath = (targetScriptId, sessionId = "") => (
  `/scripts/${targetScriptId}/media-uploads${sessionId ? `/${sessionId}` : ""}`
);

/*
 * Upload one video through the authenticated server session contract.
 *
 * The POST is intentionally idempotent for the file's metadata. If a network
 * request fails after Cloudinary accepted complete chunks, the next call gets
 * the same session, starts at `nextPart`, and reports the confirmed server
 * percentage before sending another byte. Explicit Abort is different: it
 * closes the session and removes any finalized-but-unattached asset.
 */
export async function uploadResumableProjectMedia({
  apiClient,
  targetScriptId,
  type,
  file,
  signal = null,
  onProgress = () => {},
  digestBlob = sha256ForBlob,
}) {
  let sessionId = "";
  let confirmedPercent = 0;

  try {
    const { data: sessionData } = await apiClient.post(
      resumableSessionPath(targetScriptId),
      {
        kind: type,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        lastModified: Number(file.lastModified) || 0,
      },
      { signal },
    );
    let upload = sessionData.upload;
    sessionId = upload.sessionId;
    confirmedPercent = clampPercent(upload.percent);
    onProgress(type, {
      percent: confirmedPercent,
      status: "uploading",
      ...(upload.acceptedBytes > 0 ? { resumed: true } : {}),
    });

    for (let index = Number(upload.nextPart) || 0; index < Number(upload.totalParts); index += 1) {
      if (signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");

      const start = index * Number(upload.chunkSize);
      const endExclusive = Math.min(start + Number(upload.chunkSize), file.size);
      const chunk = file.slice(start, endExclusive);
      const checksum = await digestBlob(chunk);
      const { data } = await apiClient.put(
        `${resumableSessionPath(targetScriptId, sessionId)}/parts/${index}`,
        chunk,
        {
          signal,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Range": `bytes ${start}-${endExclusive - 1}/${file.size}`,
            "X-Chunk-SHA256": checksum,
          },
          onUploadProgress: (event) => {
            if (!event?.loaded) return;
            const loaded = Math.min(Number(event.loaded) || 0, chunk.size);
            onProgress(type, {
              percent: clampPercent(((start + loaded) / file.size) * 100),
              status: "uploading",
            });
          },
        },
      );
      upload = data.upload;
      confirmedPercent = clampPercent(upload.percent);
      onProgress(type, { percent: confirmedPercent, status: "uploading" });
    }

    const response = await apiClient.post(
      `${resumableSessionPath(targetScriptId, sessionId)}/complete`,
      null,
      { signal },
    );
    return { response, sessionId };
  } catch (error) {
    if (isMediaUploadCancellation(error, signal) && sessionId) {
      // Do not reuse the aborted signal for cleanup: axios would reject before
      // the DELETE reached the server. Cancellation remains best-effort if the
      // device has already gone fully offline; the session then expires.
      try {
        await apiClient.delete(resumableSessionPath(targetScriptId, sessionId));
      } catch { /* expiry cleanup is the fallback */ }
    } else if (error && typeof error === "object") {
      error.confirmedUploadPercent = confirmedPercent;
    }
    throw error;
  }
}

/*
 * One byte-progress implementation for both project-creation entry points.
 * `onProgress` receives the exact `{ percent, status }` contract consumed by
 * the shared mobile MediaSlot. Thumbnail stays on the bounded whole-file
 * endpoint; trailer and pitch video use server-confirmed chunks and can resume
 * at the last accepted range after a network interruption.
 */
export async function uploadProjectMedia({
  apiClient,
  targetScriptId,
  files = {},
  requestedTypes = null,
  signal = null,
  onProgress = () => {},
}) {
  if (!targetScriptId) return { failedTypes: [], cancelledTypes: [] };

  const requested = requestedMediaTypes(requestedTypes);
  const tasks = MEDIA_UPLOADS.flatMap(({ type, field, endpoint }) => {
    const file = files[type];
    if (!file || (requested && !requested.has(type))) return [];

    onProgress(type, { percent: 0, status: "uploading" });

    const uploadRequest = RESUMABLE_MEDIA_TYPES.has(type)
      ? uploadResumableProjectMedia({
        apiClient,
        targetScriptId,
        type,
        file,
        signal,
        onProgress,
      }).then(({ response }) => response)
      : (() => {
        const formData = new FormData();
        formData.append(field, file);
        return apiClient.post(`/scripts/${targetScriptId}/${endpoint}`, formData, {
          signal,
          onUploadProgress: (event) => {
            if (!event?.total) return;
            const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
            onProgress(type, { percent, status: "uploading" });
          },
        });
      })();

    const request = uploadRequest.then(
      (response) => {
        onProgress(type, { percent: 100, status: "done" });
        return { response, mediaUploadStatus: "done" };
      },
      (error) => {
        const status = isMediaUploadCancellation(error, signal) ? "cancelled" : "failed";
        onProgress(type, {
          status,
          ...(status === "failed" && Number.isFinite(error?.confirmedUploadPercent)
            ? { percent: error.confirmedUploadPercent }
            : {}),
        });
        return { error, mediaUploadStatus: status };
      },
    );

    return [{ type, request }];
  });

  if (tasks.length === 0) return { failedTypes: [], cancelledTypes: [] };
  const results = await Promise.all(tasks.map(({ request }) => request));
  return results.reduce((summary, result, index) => {
    if (result.mediaUploadStatus === "done") return summary;
    const key = result.mediaUploadStatus === "cancelled" ? "cancelledTypes" : "failedTypes";
    summary[key].push(tasks[index].type);
    return summary;
  }, { failedTypes: [], cancelledTypes: [] });
}
