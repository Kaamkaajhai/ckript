import { useCallback, useEffect, useState } from "react";
import publicApi from "../../services/publicApi";

export const PUBLIC_PROFILE_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  PRIVATE: "private",
  NOT_FOUND: "not-found",
  FAILED: "failed",
});

export function usePublicProfile({ id, enabled = true } = {}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    requestKey: "",
    status: PUBLIC_PROFILE_STATUS.LOADING,
    profile: null,
    scripts: [],
    message: "",
  });
  const normalizedId = String(id || "").trim();
  const requestKey = enabled && normalizedId ? `${normalizedId}:${attempt}` : "";

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!requestKey) return undefined;
    const controller = new AbortController();

    publicApi.get(`/users/public/${encodeURIComponent(normalizedId)}`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!data?.user) {
          setState({
            requestKey,
            status: PUBLIC_PROFILE_STATUS.FAILED,
            profile: null,
            scripts: [],
            message: "The server returned an incomplete shared profile.",
          });
          return;
        }
        setState({
          requestKey,
          status: PUBLIC_PROFILE_STATUS.READY,
          profile: data.user,
          scripts: Array.isArray(data?.scripts) ? data.scripts : [],
          message: "",
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.code === "ERR_CANCELED") return;
        const code = error?.response?.status;
        setState({
          requestKey,
          status: code === 403
            ? PUBLIC_PROFILE_STATUS.PRIVATE
            : code === 400 || code === 404
              ? PUBLIC_PROFILE_STATUS.NOT_FOUND
              : PUBLIC_PROFILE_STATUS.FAILED,
          profile: null,
          scripts: [],
          message: error?.response?.data?.message || "This shared profile is unavailable.",
        });
      });

    return () => controller.abort();
  }, [normalizedId, requestKey]);

  if (!enabled) {
    return { status: PUBLIC_PROFILE_STATUS.READY, profile: null, scripts: [], message: "", retry };
  }

  if (!normalizedId) {
    return { status: PUBLIC_PROFILE_STATUS.NOT_FOUND, profile: null, scripts: [], message: "Invalid profile link.", retry };
  }

  // React can preserve this hook while the route parameter changes. Never
  // expose the previous person's data during the new request.
  if (state.requestKey !== requestKey) {
    return { status: PUBLIC_PROFILE_STATUS.LOADING, profile: null, scripts: [], message: "", retry };
  }

  return {
    status: state.status,
    profile: state.profile,
    scripts: state.scripts,
    message: state.message,
    retry,
  };
}
