import { useCallback, useEffect, useState } from "react";
import { INDUSTRY_DASHBOARD_STATUS, loadIndustryDashboard } from "./industryDashboard";

const initialState = Object.freeze({ requestKey: -1, status: INDUSTRY_DASHBOARD_STATUS.IDLE, data: null, failure: null });

export default function useIndustryDashboard({ enabled = true, previewData = null, professional = true } = {}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(initialState);
  const requestKey = enabled ? revision : -1;

  useEffect(() => {
    if (requestKey < 0 || previewData) return undefined;
    const controller = new AbortController();
    loadIndustryDashboard({ signal: controller.signal, professional }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setState(result.ok
        ? { requestKey, status: INDUSTRY_DASHBOARD_STATUS.READY, data: result.data, failure: null }
        : { requestKey, status: INDUSTRY_DASHBOARD_STATUS.FAILED, data: null, failure: result });
    });
    return () => controller.abort();
  }, [previewData, professional, requestKey]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  if (previewData) {
    return { requestKey, status: INDUSTRY_DASHBOARD_STATUS.READY, data: previewData, failure: null, retry };
  }
  if (state.requestKey !== requestKey) {
    return {
      ...initialState,
      status: requestKey < 0 ? INDUSTRY_DASHBOARD_STATUS.IDLE : INDUSTRY_DASHBOARD_STATUS.LOADING,
      retry,
    };
  }
  return { ...state, retry };
}
