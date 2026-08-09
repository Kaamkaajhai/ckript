/**
 * The local working-draft snapshot — the editor's durable safety net.
 *
 * This is a module rather than three inline `localStorage` calls because of what
 * it has to survive. On a phone, "leaving the editor" is normally an app switch
 * or an OS kill, and none of `beforeunload` / `pagehide` / `visibilitychange` is
 * dependable there (MDN bfcache). So the snapshot, not the exit save, is the
 * thing that must hold — and a safety net nobody can unit-test is not one.
 *
 * Three behaviours here are fixes, not ports of the previous inline code:
 *
 *  1. RESUMED DRAFTS GET A SNAPSHOT. The old effect returned early whenever a
 *     `:draftId` was present, so the only script with a local fallback was one
 *     that had never been saved at all — the exact opposite of where the risk
 *     is. Each draft now owns its own key.
 *  2. THE SNAPSHOT RECORDS WHERE THE WRITER WAS, not only what they wrote:
 *     `step` and the Details sub-panel index, so resume lands on the panel they
 *     left instead of the top of the wizard.
 *  3. RESTORING IS A DECISION, NOT A REFLEX. `chooseDraftRecovery` is pure and
 *     separate: a snapshot may be in sync with the server (restore nothing), or
 *     the server copy may have moved on underneath it because a co-writer saved
 *     (never clobber — ask). Only when this session's own base is still the
 *     server's current version is the snapshot known to be strictly ahead.
 *
 * Per-draft keys multiply, so `pruneWorkingDrafts` exists too: unbounded growth
 * in a 5 MB store is how a safety net starts throwing QuotaExceededError.
 */

/* The v1 key is kept verbatim as the brand-new-script key so a writer who is
   mid-script when this ships does not lose their snapshot to a rename. */
export const WORKING_DRAFT_KEY_PREFIX = "create-project-working-draft-v1";

/* Snapshots older than this are pruned on mount. Long enough to survive a
   weekend away from a half-written scene; short enough that abandoned drafts do
   not accumulate against the origin's storage budget. */
export const WORKING_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const defaultStorage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Accessing localStorage throws outright in some privacy modes.
    return null;
  }
};

/**
 * One key per draft. A brand-new script has no id yet, so it keeps the bare
 * prefix — and inherits any snapshot written before this module existed.
 */
export function workingDraftKey(draftId) {
  const id = String(draftId || "").trim();
  return id ? `${WORKING_DRAFT_KEY_PREFIX}:${id}` : WORKING_DRAFT_KEY_PREFIX;
}

export function readWorkingDraft(draftId, { storage = defaultStorage() } = {}) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(workingDraftKey(draftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    // A corrupt or half-written snapshot is the same as no snapshot.
    return null;
  }
}

export function writeWorkingDraft(draftId, snapshot, { storage = defaultStorage() } = {}) {
  if (!storage || !snapshot) return false;
  try {
    storage.setItem(workingDraftKey(draftId), JSON.stringify(snapshot));
    return true;
  } catch {
    // Quota exceeded, or a storage-denied context. Reported so the caller can
    // decide whether the writer needs to be told the net is not there; never
    // thrown, because a failed snapshot must not break typing.
    return false;
  }
}

export function clearWorkingDraft(draftId, { storage = defaultStorage() } = {}) {
  if (!storage) return;
  try {
    storage.removeItem(workingDraftKey(draftId));
  } catch {
    // Ignore storage failures in private/restricted contexts.
  }
}

/**
 * Drop snapshots nobody is coming back for. Only keys owned by this module are
 * considered, and an unreadable or timestamp-less entry is left alone rather
 * than guessed at.
 */
export function pruneWorkingDrafts({
  storage = defaultStorage(),
  maxAgeMs = WORKING_DRAFT_MAX_AGE_MS,
  now = Date.now(),
} = {}) {
  if (!storage) return [];
  const removed = [];
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && (key === WORKING_DRAFT_KEY_PREFIX || key.startsWith(`${WORKING_DRAFT_KEY_PREFIX}:`))) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      try {
        const parsed = JSON.parse(storage.getItem(key));
        const updatedAt = Number(parsed?.updatedAt);
        if (!Number.isFinite(updatedAt)) continue;
        if (now - updatedAt > maxAgeMs) {
          storage.removeItem(key);
          removed.push(key);
        }
      } catch {
        // Leave anything unparseable in place — deleting what we cannot read is
        // how a bug in this function becomes data loss.
      }
    }
  } catch {
    // Ignore storage enumeration failures.
  }
  return removed;
}

/**
 * Build the snapshot body. Kept here so the shape is defined in exactly one
 * place and the recovery reader below can rely on it.
 *
 * `baseUpdatedAt` is the load-bearing field: it is the server document's
 * `updatedAt` that THIS editing session started from. It is what lets recovery
 * tell "the server never received my last edits" apart from "someone else saved
 * while I was gone" without trusting the device clock against the server's.
 */
export function buildWorkingDraftSnapshot({
  userId = null,
  scriptId = null,
  draftId = null,
  title = "",
  textContent = "",
  fountainContent = "",
  step = 1,
  detailsStep = 0,
  baseUpdatedAt = null,
  now = Date.now(),
} = {}) {
  return {
    userId: userId || null,
    scriptId: scriptId || draftId || null,
    title: String(title || ""),
    textContent: String(textContent || ""),
    fountainContent: String(fountainContent || ""),
    step: Number.isFinite(Number(step)) ? Number(step) : 1,
    detailsStep: Number.isFinite(Number(detailsStep)) ? Number(detailsStep) : 0,
    baseUpdatedAt: baseUpdatedAt ? String(baseUpdatedAt) : null,
    updatedAt: now,
  };
}

const stripMarkup = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function snapshotHasContent(snapshot) {
  if (!snapshot) return false;
  if (String(snapshot.title || "").trim()) return true;
  if (String(snapshot.fountainContent || "").trim()) return true;
  return stripMarkup(snapshot.textContent).length > 0;
}

/**
 * Should the snapshot on this device replace what the server just handed us?
 *
 * Pure, and deliberately conservative in one direction: it will decline to
 * restore, or ask, far sooner than it will silently overwrite a co-writer.
 *
 *   none      nothing to do (no snapshot, or it matches the server already)
 *   discard   the snapshot belongs to someone else, or holds nothing
 *   restore   this session's edits never reached the server; put them back
 *   conflict  the snapshot has edits AND the server copy moved on since this
 *             session loaded it — the writer chooses, we do not
 *
 * `server` is null for a brand-new script, where there is no server copy to
 * weigh the snapshot against.
 */
export function chooseDraftRecovery({ snapshot, userId = null, server = null } = {}) {
  if (!snapshot) return { action: "none", reason: "no-snapshot" };

  if (snapshot.userId && userId && String(snapshot.userId) !== String(userId)) {
    return { action: "discard", reason: "other-user" };
  }

  if (!snapshotHasContent(snapshot)) {
    return { action: "discard", reason: "empty" };
  }

  if (!server) {
    return { action: "restore", reason: "no-server-copy" };
  }

  // Compared against both fields because screenplay drafts round-trip through
  // `fountainContent` and prose drafts through `textContent`; a match on either
  // means the server is already holding this text.
  const serverContent = String(server.content || "");
  if (serverContent && (serverContent === String(snapshot.textContent || "") || serverContent === String(snapshot.fountainContent || ""))) {
    return { action: "none", reason: "in-sync" };
  }

  const base = snapshot.baseUpdatedAt ? String(snapshot.baseUpdatedAt) : "";
  const current = server.updatedAt ? String(server.updatedAt) : "";
  if (base && current && base !== current) {
    return { action: "conflict", reason: "server-moved" };
  }

  return { action: "restore", reason: "ahead-of-server" };
}
