import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHALLENGE_DETAIL_STATUS,
  loadChallengeDetail,
  loadChallengeEntrySummary,
} from "./challengeDetail";

const initialState = Object.freeze({ requestKey: "", scope: "", status: CHALLENGE_DETAIL_STATUS.IDLE, data: null, failure: null });
const userKeyOf = (user) => String(user?._id || user?.id || user?.sid || "").trim();

export default function useChallengeDetail({ slug = "", user, enabled = true, poll = true } = {}) {
  const [publicRevision, setPublicRevision] = useState(0);
  const [entryRevision, setEntryRevision] = useState(0);
  const [publicState, setPublicState] = useState(initialState);
  const [entryState, setEntryState] = useState(initialState);
  const publicScope = enabled ? (slug || "__active__") : "";
  const publicKey = enabled ? `${publicScope}:${publicRevision}` : "";
  const userKey = enabled ? userKeyOf(user) : "";
  const competitionId = publicState.scope === publicScope ? publicState.data?.competition?._id : "";
  const entryKey = userKey && competitionId ? `${userKey}:${competitionId}:${entryRevision}` : "";

  const refreshPublic = useCallback(() => setPublicRevision((value) => value + 1), []);
  const retryEntry = useCallback(() => setEntryRevision((value) => value + 1), []);

  useEffect(() => {
    if (!publicKey) return undefined;
    const controller = new AbortController();
    loadChallengeDetail({ slug, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setPublicState(result.ok
        ? { requestKey: publicKey, scope: publicScope, status: CHALLENGE_DETAIL_STATUS.READY, data: result.data, failure: null }
        : { requestKey: publicKey, scope: publicScope, status: CHALLENGE_DETAIL_STATUS.FAILED, data: null, failure: result });
    });
    return () => controller.abort();
  }, [publicKey, publicScope, slug]);

  useEffect(() => {
    if (!entryKey) return undefined;
    const controller = new AbortController();
    loadChallengeEntrySummary({ competitionId, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setEntryState(result.ok
        ? { requestKey: entryKey, scope: entryKey, status: CHALLENGE_DETAIL_STATUS.READY, data: result.data, failure: null }
        : { requestKey: entryKey, scope: entryKey, status: CHALLENGE_DETAIL_STATUS.FAILED, data: null, failure: result });
    });
    return () => controller.abort();
  }, [competitionId, entryKey]);

  useEffect(() => {
    if (!poll || !enabled) return undefined;
    const timer = setInterval(refreshPublic, 60_000);
    return () => clearInterval(timer);
  }, [enabled, poll, refreshPublic]);

  return useMemo(() => ({
    public: publicState.scope === publicScope
      ? publicState
      : { ...initialState, status: publicKey ? CHALLENGE_DETAIL_STATUS.LOADING : CHALLENGE_DETAIL_STATUS.IDLE },
    entry: entryKey && entryState.requestKey === entryKey
      ? entryState
      : { ...initialState, status: entryKey ? CHALLENGE_DETAIL_STATUS.LOADING : CHALLENGE_DETAIL_STATUS.IDLE },
    refresh: refreshPublic,
    retryEntry,
  }), [entryKey, entryState, publicKey, publicScope, publicState, refreshPublic, retryEntry]);
}
