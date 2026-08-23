import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTHENTICATED_PROFILE_STATUS,
  getAuthenticatedProfile,
  getPitchableScripts,
  revealProfileContact,
  sendProfilePitch,
  sendProfileMessage,
  toggleProfileBlock,
  updateProfileFollow,
} from "./authenticatedProfile";
import { mergeOwnProfileUpdate } from "./profileEditor";

const initialState = {
  requestKey: "",
  status: AUTHENTICATED_PROFILE_STATUS.LOADING,
  profile: null,
  scripts: [],
  deletedScripts: [],
  purchasedScripts: [],
  bookmarkedScripts: [],
  relationship: {},
  failure: null,
};

export function useAuthenticatedProfile({ profileKey, viewer, onCanonicalPath, setViewer } = {}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState({ follow: false, block: false, message: false, contact: false, pitch: false });
  const [actionError, setActionError] = useState("");
  const [contact, setContact] = useState(null);
  const [contactStats, setContactStats] = useState(null);
  const canonicalRef = useRef(onCanonicalPath);
  const normalizedKey = String(profileKey || "").trim();
  const requestKey = normalizedKey ? `${normalizedKey}:${attempt}` : "";

  useEffect(() => { canonicalRef.current = onCanonicalPath; }, [onCanonicalPath]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const clearActionError = useCallback(() => setActionError(""), []);
  const applyProfileUpdate = useCallback((update) => {
    setState((current) => ({
      ...current,
      profile: mergeOwnProfileUpdate(current.profile || {}, update || {}),
    }));
  }, []);

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    getAuthenticatedProfile({ profileKey: normalizedKey, viewer, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted || result.cancelled) return;
        if (!result.ok) {
          setState({
            requestKey,
            status: result.access?.status || AUTHENTICATED_PROFILE_STATUS.FAILED,
            profile: null,
            scripts: [],
            deletedScripts: [],
            purchasedScripts: [],
            bookmarkedScripts: [],
            relationship: result.access?.relationship || {},
            failure: result.access || { message: result.message },
          });
          return;
        }
        const next = result.data;
        setState({
          requestKey,
          status: AUTHENTICATED_PROFILE_STATUS.READY,
          profile: next.profile,
          scripts: next.scripts,
          deletedScripts: Array.isArray(next.deletedScripts) ? next.deletedScripts : [],
          purchasedScripts: Array.isArray(next.purchasedScripts) ? next.purchasedScripts : [],
          bookmarkedScripts: Array.isArray(next.bookmarkedScripts) ? next.bookmarkedScripts : [],
          relationship: next.relationship,
          failure: null,
        });
        if (next.canonicalPath) canonicalRef.current?.(next.canonicalPath);
      });
    return () => controller.abort();
  }, [normalizedKey, requestKey, viewer]);

  useEffect(() => {
    setContact(null);
    setContactStats(null);
    setActionError("");
  }, [normalizedKey]);

  const follow = useCallback(async () => {
    const profileId = state.profile?._id || state.failure?.profileId;
    if (!profileId || pending.follow) return false;
    setPending((current) => ({ ...current, follow: true }));
    setActionError("");
    try {
      const result = await updateProfileFollow({ profileId, relationship: state.relationship });
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }
      setState((current) => ({ ...current, relationship: result.data }));
      return true;
    } finally {
      setPending((current) => ({ ...current, follow: false }));
    }
  }, [pending.follow, state.failure?.profileId, state.profile?._id, state.relationship]);

  const toggleBlock = useCallback(async () => {
    const profileId = state.profile?._id;
    if (!profileId || pending.block) return false;
    setPending((current) => ({ ...current, block: true }));
    setActionError("");
    try {
      const result = await toggleProfileBlock({
        profileId,
        blocked: Boolean(state.relationship.blockedByCurrent),
      });
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }
      setState((current) => ({
        ...current,
        relationship: {
          ...current.relationship,
          blockedByCurrent: result.data.blocked,
          isFollowing: result.data.blocked ? false : current.relationship.isFollowing,
          followRequestPending: result.data.blocked ? false : current.relationship.followRequestPending,
        },
      }));
      return true;
    } finally {
      setPending((current) => ({ ...current, block: false }));
    }
  }, [pending.block, state.profile?._id, state.relationship.blockedByCurrent]);

  const sendMessage = useCallback(async (message) => {
    if (!state.profile?._id || pending.message) return false;
    setPending((current) => ({ ...current, message: true }));
    setActionError("");
    try {
      const result = await sendProfileMessage({ profileId: state.profile._id, message });
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }
      return true;
    } finally {
      setPending((current) => ({ ...current, message: false }));
    }
  }, [pending.message, state.profile?._id]);

  const revealContact = useCallback(async () => {
    if (!state.profile?._id || pending.contact) return false;
    setPending((current) => ({ ...current, contact: true }));
    setActionError("");
    try {
      const result = await revealProfileContact({ profileId: state.profile._id });
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }
      setContact(result.data?.contact || null);
      setContactStats({
        contactsUsed: result.data?.contactsUsed,
        contactsLimit: result.data?.contactsLimit,
        remainingContacts: result.data?.remainingContacts,
      });
      if (result.data?.contactsUsed !== undefined && setViewer) {
        setViewer((current) => {
          if (!current) return current;
          const existing = Array.isArray(current.subscription?.revealedContacts)
            ? current.subscription.revealedContacts
            : [];
          const alreadyRecorded = existing.some((entry) => String(entry?.writerId || entry) === String(state.profile._id));
          const updated = {
            ...current,
            subscription: {
              ...(current.subscription || {}),
              revealedContacts: alreadyRecorded
                ? existing
                : [...existing, { writerId: state.profile._id, revealedAt: new Date().toISOString() }],
            },
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }
      return true;
    } finally {
      setPending((current) => ({ ...current, contact: false }));
    }
  }, [pending.contact, setViewer, state.profile?._id]);

  const loadPitchScripts = useCallback(async () => {
    setActionError("");
    const result = await getPitchableScripts();
    if (!result.ok) setActionError(result.message);
    return result;
  }, []);

  const sendPitch = useCallback(async (draft) => {
    if (!state.profile?._id || pending.pitch) return false;
    setPending((current) => ({ ...current, pitch: true }));
    setActionError("");
    try {
      const result = await sendProfilePitch({ profileId: state.profile._id, ...draft });
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }
      return true;
    } finally {
      setPending((current) => ({ ...current, pitch: false }));
    }
  }, [pending.pitch, state.profile?._id]);

  if (!normalizedKey) {
    return { ...initialState, status: AUTHENTICATED_PROFILE_STATUS.NOT_FOUND, failure: { message: "Invalid profile link." }, pending, actionError, contact, contactStats, reload, clearActionError, applyProfileUpdate, follow, toggleBlock, sendMessage, revealContact, loadPitchScripts, sendPitch };
  }
  if (state.requestKey !== requestKey) {
    return { ...initialState, pending, actionError, contact, contactStats, reload, clearActionError, applyProfileUpdate, follow, toggleBlock, sendMessage, revealContact, loadPitchScripts, sendPitch };
  }
  return { ...state, pending, actionError, contact, contactStats, reload, clearActionError, applyProfileUpdate, follow, toggleBlock, sendMessage, revealContact, loadPitchScripts, sendPitch };
}
