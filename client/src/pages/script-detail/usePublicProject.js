import { useCallback, useEffect, useState } from "react";
import publicApi from "../../services/publicApi";

export const PUBLIC_PROJECT_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  NOT_FOUND: "not-found",
  FAILED: "failed",
});

export function usePublicProject({ id, enabled = true } = {}) {
  const [state, setState] = useState({
    status: enabled ? PUBLIC_PROJECT_STATUS.LOADING : PUBLIC_PROJECT_STATUS.READY,
    project: null,
    message: "",
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, status: PUBLIC_PROJECT_STATUS.LOADING, message: "" }));
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !id) return undefined;
    let cancelled = false;

    publicApi.get(`/scripts/public/${id}`).then(({ data }) => {
      if (!cancelled) setState({ status: PUBLIC_PROJECT_STATUS.READY, project: data || null, message: "" });
    }).catch((error) => {
      if (cancelled) return;
      const code = error?.response?.status;
      setState({
        status: code === 404 ? PUBLIC_PROJECT_STATUS.NOT_FOUND : PUBLIC_PROJECT_STATUS.FAILED,
        project: null,
        message: error?.response?.data?.message || "This shared project is unavailable.",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled, id]);

  if (enabled && !id) {
    return { status: PUBLIC_PROJECT_STATUS.NOT_FOUND, project: null, message: "Invalid project link.", retry };
  }

  return { ...state, retry };
}
