import { useCallback, useEffect, useState } from "react";
import { INDUSTRY_HOME_STATUS, loadIndustryHome } from "./industryHome";

const initialState = Object.freeze({ requestKey: -1, status: INDUSTRY_HOME_STATUS.IDLE, data: null, failure: null });

export default function useIndustryHome({ enabled = true, previewData = null } = {}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);
  const requestKey = enabled ? revision : -1;

  useEffect(() => {
    if (requestKey < 0 || previewData) return undefined;
    const controller = new AbortController();
    loadIndustryHome({ signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setState(result.ok
        ? { requestKey, status: INDUSTRY_HOME_STATUS.READY, data: result.data, failure: null }
        : { requestKey, status: INDUSTRY_HOME_STATUS.FAILED, data: null, failure: result });
    });
    return () => controller.abort();
  }, [previewData, requestKey]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  if (previewData) {
    return { requestKey, status: INDUSTRY_HOME_STATUS.READY, data: previewData, failure: null, retry };
  }
  if (state.requestKey !== requestKey) {
    return {
      ...initialState,
      status: requestKey < 0 ? INDUSTRY_HOME_STATUS.IDLE : INDUSTRY_HOME_STATUS.LOADING,
      retry,
    };
  }
  return { ...state, retry };
}
