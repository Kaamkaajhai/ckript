/**
 * Durable, per-flow recovery for `/upload`.
 *
 * Upload is one orchestrator with three materially different entry modes:
 * a fresh upload, conversion of `?draft=<id>`, and editing `?edit=<id>`. Keeping
 * those modes in separate keys is the load-bearing rule here; an edit snapshot
 * must never appear over a different live listing, and two drafts must never
 * borrow one another's terms or metadata.
 *
 * Files are deliberately not serialized. Browser `File` objects cannot be
 * reconstructed from localStorage after a reload, so the orchestrator records
 * their names separately and tells the writer to select them again. Remote PDF
 * descriptors are ordinary JSON and may be included in `data`.
 */

export const UPLOAD_WORKING_DRAFT_KEY_PREFIX = "script-upload-working-draft-v1";
export const UPLOAD_WORKING_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const defaultStorage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

const cleanId = (value) => String(value || "").trim();

export function uploadWorkingDraftFlow({ draftId = null, editId = null } = {}) {
  const edit = cleanId(editId);
  if (edit) return { kind: "edit", id: edit };
  const draft = cleanId(draftId);
  if (draft) return { kind: "draft", id: draft };
  return { kind: "new", id: null };
}

export function uploadWorkingDraftKey(flow = {}) {
  const { kind, id } = uploadWorkingDraftFlow(flow);
  return id
    ? `${UPLOAD_WORKING_DRAFT_KEY_PREFIX}:${kind}:${encodeURIComponent(id)}`
    : `${UPLOAD_WORKING_DRAFT_KEY_PREFIX}:new`;
}

export function readUploadWorkingDraft(flow, { storage = defaultStorage() } = {}) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(uploadWorkingDraftKey(flow));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeUploadWorkingDraft(flow, snapshot, { storage = defaultStorage() } = {}) {
  if (!storage || !snapshot) return false;
  try {
    storage.setItem(uploadWorkingDraftKey(flow), JSON.stringify(snapshot));
    return true;
  } catch {
    // A denied/full store must not break the form. The caller exposes the
    // failure through its save-state label and beforeunload warning.
    return false;
  }
}

export function clearUploadWorkingDraft(flow, { storage = defaultStorage() } = {}) {
  if (!storage) return;
  try {
    storage.removeItem(uploadWorkingDraftKey(flow));
  } catch {
    // Storage may be unavailable in private/restricted contexts.
  }
}

export function pruneUploadWorkingDrafts({
  storage = defaultStorage(),
  maxAgeMs = UPLOAD_WORKING_DRAFT_MAX_AGE_MS,
  now = Date.now(),
} = {}) {
  if (!storage) return [];
  const removed = [];
  try {
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(`${UPLOAD_WORKING_DRAFT_KEY_PREFIX}:`)) keys.push(key);
    }
    for (const key of keys) {
      try {
        const parsed = JSON.parse(storage.getItem(key));
        const updatedAt = Number(parsed?.updatedAt);
        if (Number.isFinite(updatedAt) && now - updatedAt > maxAgeMs) {
          storage.removeItem(key);
          removed.push(key);
        }
      } catch {
        // Never delete recovery data merely because this version cannot read it.
      }
    }
  } catch {
    // Ignore enumeration failures.
  }
  return removed;
}

const jsonSafe = (value) => {
  try {
    return JSON.parse(JSON.stringify(value, (_key, nested) => {
      if (typeof Blob !== "undefined" && nested instanceof Blob) return undefined;
      return nested;
    }));
  } catch {
    return {};
  }
};

export function getUploadWorkingDraftSignature(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "";
  try {
    return JSON.stringify({
      step: Number(snapshot.step) || 1,
      detailStep: Number(snapshot.detailStep) || 0,
      data: snapshot.data && typeof snapshot.data === "object" ? snapshot.data : {},
    });
  } catch {
    return "";
  }
}

export function buildUploadWorkingDraftSnapshot({
  userId = null,
  draftId = null,
  editId = null,
  scriptId = null,
  step = 1,
  detailStep = 0,
  data = {},
  pendingFiles = {},
  baseUpdatedAt = null,
  now = Date.now(),
} = {}) {
  const flow = uploadWorkingDraftFlow({ draftId, editId });
  const snapshot = {
    version: 1,
    userId: userId || null,
    flow,
    scriptId: scriptId || null,
    step: Number.isFinite(Number(step)) ? Number(step) : 1,
    detailStep: Number.isFinite(Number(detailStep)) ? Number(detailStep) : 0,
    data: jsonSafe(data),
    pendingFiles: jsonSafe(pendingFiles),
    baseUpdatedAt: baseUpdatedAt ? String(baseUpdatedAt) : null,
    updatedAt: now,
  };
  snapshot.signature = getUploadWorkingDraftSignature(snapshot);
  return snapshot;
}

export function uploadWorkingDraftHasContent(snapshot) {
  return Boolean(
    snapshot
    && snapshot.data
    && typeof snapshot.data === "object"
    && getUploadWorkingDraftSignature(snapshot)
  );
}

/**
 * Recovery is conservative around a server copy. A snapshot based on the same
 * `updatedAt` is this tab's work ahead of that copy and can be restored. If the
 * server moved, the caller must ask before putting local values over it.
 */
export function chooseUploadWorkingDraftRecovery({
  snapshot,
  userId = null,
  serverUpdatedAt = null,
} = {}) {
  if (!snapshot) return { action: "none", reason: "no-snapshot" };
  if (snapshot.userId && userId && String(snapshot.userId) !== String(userId)) {
    return { action: "discard", reason: "other-user" };
  }
  if (!uploadWorkingDraftHasContent(snapshot)) {
    return { action: "discard", reason: "empty" };
  }

  const base = snapshot.baseUpdatedAt ? String(snapshot.baseUpdatedAt) : "";
  const server = serverUpdatedAt ? String(serverUpdatedAt) : "";
  if (base && server && base !== server) {
    return { action: "conflict", reason: "server-moved" };
  }
  return { action: "restore", reason: server ? "ahead-of-server" : "local-only" };
}
