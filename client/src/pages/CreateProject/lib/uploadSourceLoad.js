export const UPLOAD_SOURCE_LOAD_STATUS = Object.freeze({
  READY: "ready",
  LOADING: "loading",
  NOT_FOUND: "not-found",
  FORBIDDEN: "forbidden",
  FAILED: "failed",
  LOCAL_ONLY: "local-only",
});

export function getUploadSource({ draftId = null, editId = null } = {}) {
  const edit = String(editId || "").trim();
  if (edit) return { kind: "edit", id: edit };
  const draft = String(draftId || "").trim();
  if (draft) return { kind: "draft", id: draft };
  return null;
}
export function initialUploadSourceLoad(flow = {}) {
  const source = getUploadSource(flow);
  return source
    ? { ...source, status: UPLOAD_SOURCE_LOAD_STATUS.LOADING, hasLocalRecovery: false }
    : { kind: null, id: null, status: UPLOAD_SOURCE_LOAD_STATUS.READY, hasLocalRecovery: false };
}

export function classifyUploadSourceLoadError(error, {
  kind = "draft",
  id = "",
  online = true,
  hasLocalRecovery = false,
} = {}) {
  const httpStatus = Number(error?.response?.status) || null;
  const serverMessage = String(error?.response?.data?.message || "").trim();

  if (httpStatus === 404) {
    return {
      kind,
      id,
      status: UPLOAD_SOURCE_LOAD_STATUS.NOT_FOUND,
      httpStatus,
      offline: false,
      hasLocalRecovery: false,
      message: serverMessage || "Script not found",
    };
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return {
      kind,
      id,
      status: UPLOAD_SOURCE_LOAD_STATUS.FORBIDDEN,
      httpStatus,
      offline: false,
      hasLocalRecovery: false,
      message: serverMessage || "You do not have access to this script",
    };
  }

  return {
    kind,
    id,
    status: UPLOAD_SOURCE_LOAD_STATUS.FAILED,
    httpStatus,
    // `navigator.onLine` is only a hint. A response proves the server was
    // reached; without one, an offline device is useful, honest context.
    offline: !error?.response && online === false,
    hasLocalRecovery: Boolean(hasLocalRecovery),
    message: serverMessage || "The script could not be loaded",
  };
}

export function uploadSourceNeedsGate(sourceLoad) {
  return Boolean(
    sourceLoad?.kind
    && sourceLoad.status !== UPLOAD_SOURCE_LOAD_STATUS.READY
  );
}

export function uploadSourceCopy(sourceLoad = {}) {
  const noun = sourceLoad.kind === "edit" ? "script" : "draft";

  if (sourceLoad.status === UPLOAD_SOURCE_LOAD_STATUS.NOT_FOUND) {
    return {
      icon: "search_off",
      kicker: `${noun === "draft" ? "Draft" : "Script"} unavailable`,
      title: `We couldn't find this ${noun}.`,
      body: `It may have been deleted, or the link may no longer be valid. No changes have been made.`,
      retryable: false,
    };
  }

  if (sourceLoad.status === UPLOAD_SOURCE_LOAD_STATUS.FORBIDDEN) {
    return {
      icon: "lock",
      kicker: "Access required",
      title: `You can't open this ${noun}.`,
      body: sourceLoad.message || `Your account does not have permission to change this ${noun}.`,
      retryable: false,
    };
  }

  if (sourceLoad.status === UPLOAD_SOURCE_LOAD_STATUS.FAILED) {
    return {
      icon: sourceLoad.offline ? "cloud_off" : "sync_problem",
      kicker: sourceLoad.offline ? "You're offline" : "Couldn't load the latest copy",
      title: `We couldn't safely open this ${noun}.`,
      body: sourceLoad.offline
        ? "Reconnect and try again. The form stays closed so an empty copy can never replace your work."
        : "The server did not return the current copy. Try again before making changes.",
      retryable: true,
    };
  }

  return null;
}
