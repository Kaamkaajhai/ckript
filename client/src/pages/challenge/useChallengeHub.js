import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHALLENGE_HUB_STATUS,
  loadChallengeHubPublic,
  loadMyChallenges,
} from "./challengeHub";

const initialState = Object.freeze({
  requestKey: "",
  status: CHALLENGE_HUB_STATUS.IDLE,
  data: null,
  failure: null,
});

const userKeyOf = (user) => String(user?._id || user?.id || user?.sid || "").trim();

export default function useChallengeHub({ user, enabled = true } = {}) {
  const [publicRevision, setPublicRevision] = useState(0);
  const [mineRevision, setMineRevision] = useState(0);
  const [publicState, setPublicState] = useState(initialState);
  const [mineState, setMineState] = useState(initialState);
  const publicKey = enabled ? `public:${publicRevision}` : "";
  const userKey = enabled ? userKeyOf(user) : "";
  const mineKey = userKey ? `${userKey}:${mineRevision}` : "";

  useEffect(() => {
    if (!publicKey) return undefined;
    const controller = new AbortController();
    loadChallengeHubPublic({ signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setPublicState(result.ok
        ? { requestKey: publicKey, status: CHALLENGE_HUB_STATUS.READY, data: result.data, failure: null }
        : { requestKey: publicKey, status: CHALLENGE_HUB_STATUS.FAILED, data: null, failure: result });
    });
    return () => controller.abort();
  }, [publicKey]);

  useEffect(() => {
    if (!mineKey) return undefined;
    const controller = new AbortController();
    loadMyChallenges({ signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setMineState(result.ok
        ? { requestKey: mineKey, status: CHALLENGE_HUB_STATUS.READY, data: result.data, failure: null }
        : { requestKey: mineKey, status: CHALLENGE_HUB_STATUS.FAILED, data: null, failure: result });
    });
    return () => controller.abort();
  }, [mineKey]);

  const retryPublic = useCallback(() => setPublicRevision((value) => value + 1), []);
  const retryMine = useCallback(() => setMineRevision((value) => value + 1), []);

  return useMemo(() => ({
    public: publicState.requestKey === publicKey
      ? publicState
      : { ...initialState, status: publicKey ? CHALLENGE_HUB_STATUS.LOADING : CHALLENGE_HUB_STATUS.IDLE },
    mine: mineKey && mineState.requestKey === mineKey
      ? mineState
      : { ...initialState, status: mineKey ? CHALLENGE_HUB_STATUS.LOADING : CHALLENGE_HUB_STATUS.IDLE },
    retryPublic,
    retryMine,
  }), [mineKey, mineState, publicKey, publicState, retryMine, retryPublic]);
}
