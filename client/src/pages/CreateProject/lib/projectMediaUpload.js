const MEDIA_UPLOADS = Object.freeze([
  { type: "thumbnail", label: "Cover image", field: "thumbnail", endpoint: "upload-thumbnail" },
  { type: "trailer", label: "Trailer video", field: "trailer", endpoint: "upload-trailer" },
  { type: "pitchVideo", label: "Pitch video", field: "pitchVideo", endpoint: "upload-pitch-video" },
]);

const LARGE_MEDIA_TYPES = new Set(["trailer", "pitchVideo"]);

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
  setProgress((current) => ({
    ...current,
    [type]: { ...(current[type] || {}), ...next },
  }));
};

export const withoutMediaProgress = (current, type) => {
  if (!current?.[type]) return current || {};
  const next = { ...current };
  delete next[type];
  return next;
};

/*
 * One byte-progress implementation for both project-creation entry points.
 * `onProgress` receives the exact `{ percent, status }` contract consumed by
 * the shared mobile MediaSlot. An absent total stays at zero rather than
 * manufacturing a percentage, and each retry starts the requested files over
 * at zero so a failed 87% bar can never masquerade as resumed upload.
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

    const formData = new FormData();
    formData.append(field, file);
    onProgress(type, { percent: 0, status: "uploading" });

    const request = apiClient.post(`/scripts/${targetScriptId}/${endpoint}`, formData, {
      signal,
      onUploadProgress: (event) => {
        if (!event?.total) return;
        const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        onProgress(type, { percent, status: "uploading" });
      },
    }).then(
      (response) => {
        onProgress(type, { percent: 100, status: "done" });
        return { response, mediaUploadStatus: "done" };
      },
      (error) => {
        const status = isMediaUploadCancellation(error, signal) ? "cancelled" : "failed";
        onProgress(type, { status });
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
