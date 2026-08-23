import { useCallback, useEffect, useRef, useState } from "react";
import { decideIncomingFollowRequest, loadIncomingFollowRequests } from "./authenticatedProfile";

export const INCOMING_FOLLOW_REQUEST_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
});

export function useIncomingFollowRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState(INCOMING_FOLLOW_REQUEST_STATUS.LOADING);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");
  const controllerRef = useRef(null);
  const actingRef = useRef("");
  const mountedRef = useRef(false);

  const reload = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus(INCOMING_FOLLOW_REQUEST_STATUS.LOADING);
    setError("");

    const result = await loadIncomingFollowRequests({ signal: controller.signal });
    if (!mountedRef.current || controller.signal.aborted || result.cancelled) return result;
    if (result.ok) {
      setRequests(result.data);
      setStatus(INCOMING_FOLLOW_REQUEST_STATUS.READY);
    } else {
      setStatus(INCOMING_FOLLOW_REQUEST_STATUS.FAILED);
      setError(result.message);
    }
    return result;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    reload();
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, [reload]);

  const decide = useCallback(async (fromUserId, decision) => {
    const requesterId = String(fromUserId || "").trim();
    if (actingRef.current) {
      return { ok: false, message: "Another follow request is still being updated." };
    }

    actingRef.current = requesterId;
    setActingId(requesterId);
    setError("");
    try {
      const result = await decideIncomingFollowRequest({ fromUserId: requesterId, decision });
      if (!mountedRef.current) return result;
      if (result.ok) {
        setRequests((current) => current.filter((request) => String(request?.from?._id || "") !== requesterId));
      } else {
        setError(result.message);
      }
      return result;
    } finally {
      actingRef.current = "";
      if (mountedRef.current) setActingId("");
    }
  }, []);

  return { requests, status, error, actingId, reload, decide };
}

export default useIncomingFollowRequests;
