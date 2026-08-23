import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadReaderProfile,
  READER_PROFILE_STATUS,
  updateReaderProfileFollow,
} from "./readerProfile";

const initialState = Object.freeze({
  status: READER_PROFILE_STATUS.LOADING,
  data: null,
  failure: null,
  requestKey: "",
});

export function useReaderProfile({ profileId, section, page, viewer, onCanonicalPath } = {}) {
  const requestKey = `${profileId || ""}:${section || "read"}:${page || 1}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);
  const [followPending, setFollowPending] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setState({ ...initialState, requestKey });
    loadReaderProfile({ profileId, section, page, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      if (!result.ok) {
        setState({
          status: result.access?.status || READER_PROFILE_STATUS.FAILED,
          data: null,
          failure: result.access || { message: "Unable to load reader profile." },
          requestKey,
        });
        return;
      }
      setState({ status: READER_PROFILE_STATUS.READY, data: result.data, failure: null, requestKey });
      onCanonicalPath?.(result.data.profile.canonicalPath);
    });
    return () => controller.abort();
  }, [onCanonicalPath, page, profileId, requestKey, revision, section]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const applyProfileUpdate = useCallback((update) => {
    setState((current) => current.data ? {
      ...current,
      data: { ...current.data, profile: { ...current.data.profile, ...update } },
    } : current);
  }, []);

  const follow = useCallback(async () => {
    const profileId = state.data?.profile?._id || state.failure?.profileId;
    const relationship = state.data?.relationship || state.failure?.relationship;
    if (!profileId || state.data?.own || followPending) return false;
    setFollowPending(true);
    setActionError("");
    try {
      const result = await updateReaderProfileFollow({
        profileId,
        relationship,
      });
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }
      setState((current) => current.data
        ? { ...current, data: { ...current.data, relationship: result.data } }
        : { ...current, failure: { ...current.failure, relationship: result.data } });
      return true;
    } finally {
      setFollowPending(false);
    }
  }, [followPending, state.data, state.failure?.profileId, state.failure?.relationship]);

  return useMemo(() => ({
    ...(state.requestKey === requestKey ? state : initialState),
    reload,
    applyProfileUpdate,
    follow,
    followPending,
    actionError,
    clearActionError: () => setActionError(""),
    viewer,
  }), [actionError, applyProfileUpdate, follow, followPending, reload, requestKey, state, viewer]);
}
