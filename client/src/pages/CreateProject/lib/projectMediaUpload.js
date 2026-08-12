const MEDIA_UPLOADS = Object.freeze([
  { type: "thumbnail", field: "thumbnail", endpoint: "upload-thumbnail" },
  { type: "trailer", field: "trailer", endpoint: "upload-trailer" },
  { type: "pitchVideo", field: "pitchVideo", endpoint: "upload-pitch-video" },
]);

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
  onProgress = () => {},
}) {
  if (!targetScriptId) return [];

  const requested = Array.isArray(requestedTypes) ? new Set(requestedTypes) : null;
  const tasks = MEDIA_UPLOADS.flatMap(({ type, field, endpoint }) => {
    const file = files[type];
    if (!file || (requested && !requested.has(type))) return [];

    const formData = new FormData();
    formData.append(field, file);
    onProgress(type, { percent: 0, status: "uploading" });

    const request = apiClient.post(`/scripts/${targetScriptId}/${endpoint}`, formData, {
      onUploadProgress: (event) => {
        if (!event?.total) return;
        const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        onProgress(type, { percent, status: "uploading" });
      },
    }).then(
      (response) => {
        onProgress(type, { percent: 100, status: "done" });
        return response;
      },
      (error) => {
        onProgress(type, { status: "failed" });
        throw error;
      },
    );

    return [{ type, request }];
  });

  if (tasks.length === 0) return [];
  const results = await Promise.allSettled(tasks.map(({ request }) => request));
  return results.flatMap((result, index) => result.status === "rejected" ? [tasks[index].type] : []);
}
