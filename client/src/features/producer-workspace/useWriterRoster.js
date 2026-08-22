import { useCallback, useEffect, useMemo, useState } from "react";
import { buildRequestParams } from "./writerRoster";
import { loadWriterRoster, WRITER_ROSTER_STATUS } from "./writerRosterData";

export default function useWriterRoster({ sort, query, user, enabled = true, previewData = null } = {}) {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState({ status: WRITER_ROSTER_STATUS.IDLE, data: null, failure: null, key: "" });
  const requestKey = useMemo(() => enabled
    ? `${reloadToken}|${buildRequestParams({ sort, query })}|${user?._id || user?.role || "viewer"}`
    : "", [enabled, query, reloadToken, sort, user?._id, user?.role]);

  useEffect(() => {
    if (!requestKey || previewData) return undefined;

    const controller = new AbortController();
    let active = true;
    loadWriterRoster({ sort, query, user, signal: controller.signal })
      .then((data) => {
        if (active) setState({ status: WRITER_ROSTER_STATUS.READY, data, failure: null, key: requestKey });
      })
      .catch((failure) => {
        if (active && !controller.signal.aborted) {
          setState({ status: WRITER_ROSTER_STATUS.FAILED, data: null, failure, key: requestKey });
        }
      });
    return () => { active = false; controller.abort(); };
  }, [previewData, query, requestKey, sort, user]);

  const retry = useCallback(() => setReloadToken((value) => value + 1), []);
  if (previewData) return { status: WRITER_ROSTER_STATUS.READY, data: previewData, failure: null, requestKey: "preview", retry };
  if (!requestKey) return { status: WRITER_ROSTER_STATUS.IDLE, data: null, failure: null, requestKey, retry };
  if (state.key !== requestKey) {
    return { status: WRITER_ROSTER_STATUS.LOADING, data: state.data, failure: null, requestKey, retry };
  }
  return { ...state, requestKey, retry };
}
