import { useCallback, useEffect, useState } from "react";
import {
  HALL_OF_FAME_STATUS,
  loadHallOfFameDetail,
  loadHallOfFameList,
} from "./hallOfFame";

const initialState = Object.freeze({ requestKey: "", status: HALL_OF_FAME_STATUS.IDLE, data: null, failure: null });

export function useHallOfFameList({ query, enabled = true } = {}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);
  const page = query?.page || 1;
  const year = query?.year || "all";
  const competition = query?.competition || "all";
  const requestKey = enabled
    ? `${page}:${year}:${competition}:${revision}`
    : "";

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    loadHallOfFameList({ query: { page, year, competition }, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setState(result.ok
        ? { requestKey, status: HALL_OF_FAME_STATUS.READY, data: result.data, failure: null }
        : { requestKey, status: HALL_OF_FAME_STATUS.FAILED, data: null, failure: result });
    });
    return () => controller.abort();
  }, [competition, page, requestKey, year]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const visible = state.requestKey === requestKey
    ? state
    : { ...initialState, status: requestKey ? HALL_OF_FAME_STATUS.LOADING : HALL_OF_FAME_STATUS.IDLE };
  return { ...visible, retry };
}

export function useHallOfFameDetail({ slug, enabled = true } = {}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);
  const [moreState, setMoreState] = useState({ requestKey: "", pending: false, failure: null });
  const requestKey = enabled && slug ? `${slug}:${revision}` : "";

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();
    loadHallOfFameDetail({ slug, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setState(result.ok
        ? { requestKey, status: HALL_OF_FAME_STATUS.READY, data: result.data, failure: null }
        : {
          requestKey,
          status: result.statusCode === 404 ? HALL_OF_FAME_STATUS.NOT_FOUND : HALL_OF_FAME_STATUS.FAILED,
          data: null,
          failure: result,
        });
    });
    return () => controller.abort();
  }, [requestKey, slug]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const visible = state.requestKey === requestKey
    ? state
    : { ...initialState, status: requestKey ? HALL_OF_FAME_STATUS.LOADING : HALL_OF_FAME_STATUS.IDLE };
  const visibleMore = moreState.requestKey === requestKey
    ? moreState
    : { requestKey, pending: false, failure: null };

  const loadMoreFeatured = useCallback(async () => {
    const pageInfo = visible.data?.featuredScriptsPageInfo;
    if (!visible.data || !pageInfo?.hasMore || visibleMore.pending) return;
    setMoreState({ requestKey, pending: true, failure: null });
    const result = await loadHallOfFameDetail({ slug, scriptPage: pageInfo.page + 1 });
    if (!result.ok) {
      setMoreState({ requestKey, pending: false, failure: result });
      return;
    }
    setState((current) => current.requestKey === requestKey ? {
      ...current,
      data: {
        ...current.data,
        featuredScripts: [...current.data.featuredScripts, ...result.data.featuredScripts],
        featuredScriptsPageInfo: result.data.featuredScriptsPageInfo,
      },
    } : current);
    setMoreState({ requestKey, pending: false, failure: null });
  }, [requestKey, slug, visible.data, visibleMore.pending]);

  return {
    ...visible,
    retry,
    loadMoreFeatured,
    featuredPending: visibleMore.pending,
    featuredFailure: visibleMore.failure,
  };
}
