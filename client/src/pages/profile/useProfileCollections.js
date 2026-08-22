import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadProfileCollection,
  PROFILE_COLLECTION_STATUS,
  removeSavedProfileProject,
} from "./profileCollections";

const initialState = Object.freeze({
  requestKey: "",
  status: PROFILE_COLLECTION_STATUS.IDLE,
  data: null,
  failure: null,
});

export function useProfileCollections({ profileId, section = "activity", page = 1, query = "", sort = "recent", enabled = true } = {}) {
  const normalizedId = String(profileId || "").trim();
  const requestKey = enabled && normalizedId ? `${normalizedId}:${section}:${page}:${query}:${sort}` : "";
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);
  const [removingId, setRemovingId] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    setActionError("");
    loadProfileCollection({ profileId: normalizedId, section, page, query, sort, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted || result.cancelled) return;
        if (!result.ok) {
          setState({ requestKey, status: PROFILE_COLLECTION_STATUS.FAILED, data: null, failure: result });
          return;
        }
        setState({ requestKey, status: PROFILE_COLLECTION_STATUS.READY, data: result.data, failure: null });
      });
    return () => controller.abort();
  }, [normalizedId, page, query, requestKey, revision, section, sort]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const clearActionError = useCallback(() => setActionError(""), []);
  const removeSaved = useCallback(async (projectId) => {
    const id = String(projectId || "").trim();
    if (!id || removingId) return { ok: false, message: "A saved-project change is already in progress." };
    setRemovingId(id);
    setActionError("");
    try {
      const result = await removeSavedProfileProject(id);
      if (!result.ok) {
        setActionError(result.message);
        return result;
      }
      const pageBecameEmpty = state.data?.items?.length === 1 && state.data.pagination.page > 1;
      setState((current) => {
        if (!current.data) return current;
        const items = current.data.items.filter((item) => String(item?._id || item?.id || "") !== id);
        const nextTotal = Math.max(0, current.data.pagination.total - 1);
        const totalPages = Math.max(1, Math.ceil(nextTotal / current.data.pagination.limit));
        return {
          ...current,
          data: {
            ...current.data,
            items,
            counts: {
              ...current.data.counts,
              bookmarks: current.data.counts.bookmarks == null
                ? null
                : Math.max(0, current.data.counts.bookmarks - 1),
            },
            pagination: {
              ...current.data.pagination,
              total: nextTotal,
              totalPages,
              hasNext: current.data.pagination.page < totalPages,
            },
          },
        };
      });
      return { ...result, pageBecameEmpty };
    } finally {
      setRemovingId("");
    }
  }, [removingId, state.data]);

  return useMemo(() => ({
    ...(requestKey && state.requestKey === requestKey
      ? state
      : { ...initialState, status: requestKey ? PROFILE_COLLECTION_STATUS.LOADING : PROFILE_COLLECTION_STATUS.IDLE }),
    reload,
    removeSaved,
    removingId,
    actionError,
    clearActionError,
  }), [actionError, clearActionError, reload, removeSaved, removingId, requestKey, state]);
}
