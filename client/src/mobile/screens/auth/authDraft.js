/*
 * authDraft — the sign-up flow's resume point (Phase 8, D59).
 *
 * A nine-step form on a phone is interrupted. A call arrives, the tab is
 * evicted under memory pressure, the writer switches to their mail app for the
 * verification code and comes back four minutes later. Losing four screens of
 * typing to any of those is the difference between an account and a bounce, so
 * the flow keeps a draft and offers to resume it.
 *
 * WHAT IS NEVER WRITTEN, and why the exclusion list is code rather than a note:
 *
 *   password        Storage on this origin is readable by every script on it.
 *                   A password is the one field whose loss is not recoverable
 *                   by retyping it, and re-entering one is seconds of work.
 *   dateOfBirth     }  Special-category data under GDPR Art. 9 and the most
 *   diversity.*     }  sensitive thing this product collects anywhere: gender,
 *                   nationality, LGBTQ+ status, disability status. The desktop
 *                   modal reached the same conclusion and documents it at
 *                   WriterOnboardingModal.jsx — this is that rule applied to
 *                   the native flow, not a second opinion about it.
 *
 * Stripped rather than encrypted, for the reason the desktop file gives: a key
 * kept beside the ciphertext protects nothing, and a draft exists to save
 * typing, which four dropdowns and a date picker barely involve.
 *
 * sessionStorage rather than localStorage: a draft is for *this* visit. A
 * half-finished sign-up still sitting there next month is a liability, not a
 * convenience, and sessionStorage expires it the way the product means.
 */

/* Versioned so a shape change cannot be read back as the shape it replaced. */
const VERSION = 1;
const KEY_PREFIX = "ckm:signup-draft";

/* A draft older than this is stale enough that resuming it is more confusing
   than starting again — the referral may have expired, the challenge deadline
   may have passed, and the person almost certainly does not remember what they
   had typed. sessionStorage usually beats us to it; this covers a tab left open
   all day. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const keyFor = (roleKey) => `${KEY_PREFIX}:${VERSION}:${String(roleKey || "unknown")}`;

const store = () => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Private mode, disabled storage, or a sandboxed frame. A flow with no
    // draft still works; one that throws on every keystroke does not.
    return null;
  }
};

/* The single definition of what a draft may contain. Anything not named here is
   dropped, so a field added to the form later cannot ride into storage just by
   existing — the decision to persist it has to be made here, on purpose. */
function sanitise(draft = {}) {
  const account = { ...(draft.account || {}) };
  delete account.password;
  delete account.confirmPassword;
  delete account.dateOfBirth;

  const profile = { ...(draft.profile || {}) };
  delete profile.diversity;

  return {
    version: VERSION,
    savedAt: draft.savedAt,
    step: Number.isFinite(draft.step) ? draft.step : 1,
    accountCreated: Boolean(draft.accountCreated),
    account,
    profile,
    genres: Array.isArray(draft.genres) ? draft.genres : [],
    formats: Array.isArray(draft.formats) ? draft.formats : [],
    tags: Array.isArray(draft.tags) ? draft.tags : [],
  };
}

export function saveDraft(roleKey, draft) {
  const storage = store();
  if (!storage) return false;
  try {
    // `savedAt` is stamped here rather than by the caller so a draft cannot be
    // written with a time it did not have.
    storage.setItem(keyFor(roleKey), JSON.stringify({ ...sanitise(draft), savedAt: Date.now() }));
    return true;
  } catch {
    // Quota, or storage revoked mid-session. The in-progress form is unaffected.
    return false;
  }
}

export function loadDraft(roleKey) {
  const storage = store();
  if (!storage) return null;
  try {
    const raw = storage.getItem(keyFor(roleKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) return null;
    if (!Number.isFinite(parsed.savedAt) || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      storage.removeItem(keyFor(roleKey));
      return null;
    }
    // Sanitised on the way out as well as in. A draft written by an older build
    // — or by anything else that can reach this origin — must not be able to
    // reintroduce a field this version decided not to keep.
    return sanitise(parsed);
  } catch {
    return null;
  }
}

export function clearDraft(roleKey) {
  const storage = store();
  if (!storage) return;
  try {
    storage.removeItem(keyFor(roleKey));
  } catch { /* nothing to clean up if storage is gone */ }
}

/* Sign-out clears every role's draft, not just the current one: leaving one
   person's half-finished sign-up in a browser the next person is about to use
   is exactly the shape of leak this file exists to avoid. */
export function clearAllDrafts() {
  const storage = store();
  if (!storage) return;
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch { /* nothing to clean up if storage is gone */ }
}

/* Whether a loaded draft is worth interrupting someone to offer. A draft that
   is only the first step, with nothing typed, is not — silently continuing is
   better than a dialog asking about work that does not exist. */
export function isResumable(draft) {
  if (!draft) return false;
  if (draft.accountCreated) return true;
  if (draft.step > 1) return true;
  const account = draft.account || {};
  return Boolean(account.name || account.email || account.phone);
}
