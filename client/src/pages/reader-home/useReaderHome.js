import { useCallback, useEffect, useState } from "react";
import { loadReaderDiscover, loadReaderHome, READER_HOME_STATUS } from "./readerHome";

const initialState = Object.freeze({ requestKey: "", status: READER_HOME_STATUS.IDLE, data: null, failure: null });

function useRequest(loader, requestKey, { enabled = true, previewData = null, delay = 0 } = {}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);
  const liveKey = enabled ? `${requestKey}:${revision}` : "";

  useEffect(() => {
    if (!liveKey || previewData) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loader(controller.signal).then((result) => {
        if (controller.signal.aborted || result.cancelled) return;
        setState(result.ok
          ? { requestKey: liveKey, status: READER_HOME_STATUS.READY, data: result.data, failure: null }
          : { requestKey: liveKey, status: READER_HOME_STATUS.FAILED, data: null, failure: result });
      });
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [delay, liveKey, loader, previewData]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  if (previewData) return { requestKey: liveKey, status: READER_HOME_STATUS.READY, data: previewData, failure: null, retry };
  if (state.requestKey !== liveKey) {
    return { ...initialState, status: liveKey ? READER_HOME_STATUS.LOADING : READER_HOME_STATUS.IDLE, retry };
  }
  return { ...state, retry };
}

export function useReaderHome({ readerId, enabled = true, previewData = null } = {}) {
  const loader = useCallback((signal) => loadReaderHome({ readerId, signal }), [readerId]);
  return useRequest(loader, String(readerId || ""), { enabled, previewData });
}

export function useReaderDiscover({ query, enabled = true, previewData = null } = {}) {
  const requestKey = JSON.stringify(query || {});
  const loader = useCallback((signal) => loadReaderDiscover({ query, signal }), [query]);
  return useRequest(loader, requestKey, { enabled, previewData, delay: previewData ? 0 : 300 });
}

export default useReaderHome;
