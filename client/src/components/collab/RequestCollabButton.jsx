import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { getApiBaseUrl } from "../../utils/apiOrigin";

const ROLE_OPTIONS = [
  { value: "editor", label: "Editor" },
  { value: "merger", label: "Merger" },
  { value: "viewer", label: "Viewer" },
  { value: "full_admin", label: "Admin" },
];
const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
const getRequestStorageKey = (userId, scriptId) => `collab-request:${userId}:${scriptId}`;
const getRemovedStorageKey = (userId, scriptId) => `collab-removed:${userId}:${scriptId}`;
const readStoredRequestState = (userId, scriptId) => {
  if (typeof window === "undefined" || !userId || !scriptId) return null;
  try {
    const raw = window.localStorage.getItem(getRequestStorageKey(userId, scriptId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const readRemovedState = (userId, scriptId) => {
  if (typeof window === "undefined" || !userId || !scriptId) return false;
  try {
    return window.localStorage.getItem(getRemovedStorageKey(userId, scriptId)) === "1";
  } catch {
    return false;
  }
};
const persistRequestState = (userId, scriptId, value) => {
  if (typeof window === "undefined" || !userId || !scriptId) return;
  const storageKey = getRequestStorageKey(userId, scriptId);
  try {
    if (value) {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore storage failures in restricted/private environments.
  }
};
const persistRemovedState = (userId, scriptId, value) => {
  if (typeof window === "undefined" || !userId || !scriptId) return;
  const storageKey = getRemovedStorageKey(userId, scriptId);
  try {
    if (value) {
      window.localStorage.setItem(storageKey, "1");
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore storage failures in restricted/private environments.
  }
};
const buildRequestState = (request = null) => {
  if (!request?._id && !request?.status) return null;
  return {
    _id: request?._id || "",
    status: String(request?.status || "").toLowerCase(),
    requestedRole: String(request?.requestedRole || "editor").toLowerCase(),
    message: String(request?.message || ""),
    createdAt: request?.createdAt || null,
    respondedAt: request?.respondedAt || null,
    optimistic: Boolean(request?.optimistic),
  };
};
const getRoleLabel = (role) => ROLE_OPTIONS.find((option) => option.value === role)?.label || "Editor";

export default function RequestCollabButton({ script }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [requestedRole, setRequestedRole] = useState("editor");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [wasRemovedAsCollaborator, setWasRemovedAsCollaborator] = useState(false);
  const [liveScriptState, setLiveScriptState] = useState(null);
  const viewerId = user?._id || user?.id;
  const viewerToken = user?.token || "";
  const storageKey = useMemo(
    () => (viewerId && script?._id ? getRequestStorageKey(String(viewerId), String(script._id)) : ""),
    [script?._id, viewerId]
  );
  const baseRequestState = useMemo(
    () => buildRequestState(script?.myCollabRequest),
    [script?.myCollabRequest]
  );
  const [requestState, setRequestState] = useState(() => (
    buildRequestState(script?.myCollabRequest)
    || readStoredRequestState(String(viewerId || ""), String(script?._id || ""))
  ));
  const inflightRequestRef = useRef(false);

  useEffect(() => {
    const removed = readRemovedState(String(viewerId || ""), String(script?._id || ""));
    setWasRemovedAsCollaborator(removed);
    const nextState = removed
      ? null
      : (baseRequestState || readStoredRequestState(String(viewerId || ""), String(script?._id || "")));
    setRequestState(nextState);
    setRequestedRole(String(nextState?.requestedRole || "editor"));
    setOpen(false);
    setFeedback("");
    setMessage("");
  }, [baseRequestState, script?._id, viewerId]);

  useEffect(() => {
    persistRequestState(String(viewerId || ""), String(script?._id || ""), requestState);
  }, [requestState, script?._id, viewerId]);

  useEffect(() => {
    persistRemovedState(String(viewerId || ""), String(script?._id || ""), wasRemovedAsCollaborator);
  }, [script?._id, viewerId, wasRemovedAsCollaborator]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return undefined;

    const handleStorage = (event) => {
      const removedStorageKey = viewerId && script?._id ? getRemovedStorageKey(String(viewerId), String(script._id)) : "";
      if (event.key === removedStorageKey) {
        const removed = event.newValue === "1";
        setWasRemovedAsCollaborator(removed);
        if (removed) {
          setRequestState(null);
          setRequestedRole("editor");
        }
        return;
      }
      if (event.key !== storageKey) return;
      try {
        const nextValue = event.newValue ? JSON.parse(event.newValue) : null;
        setRequestState(nextValue);
        setRequestedRole(String(nextValue?.requestedRole || "editor"));
      } catch {
        setRequestState(null);
        setRequestedRole("editor");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [script?._id, storageKey, viewerId]);

  useEffect(() => {
    if (!viewerToken || !viewerId || !script?._id) return undefined;

    const socket = io(SOCKET_ORIGIN, {
      auth: { token: viewerToken },
    });

    const handleRequestSent = (payload = {}) => {
      if (String(payload.scriptId || "") !== String(script._id)) return;
      setWasRemovedAsCollaborator(false);
      setRequestState((prev) => ({
        _id: payload.requestId || prev?._id || "",
        status: "pending",
        requestedRole: String(payload.requestedRole || prev?.requestedRole || "editor").toLowerCase(),
        message: prev?.message || "",
        createdAt: prev?.createdAt || new Date().toISOString(),
        respondedAt: null,
        optimistic: false,
      }));
      setFeedback("Request sent!");
      setLoading(false);
      inflightRequestRef.current = false;
    };

    const handleRequestResponded = (payload = {}) => {
      if (String(payload.scriptId || "") !== String(script._id)) return;
      const decision = String(payload.decision || "").toLowerCase();
      if (!["accepted", "rejected"].includes(decision)) return;

      if (decision === "accepted") {
        setWasRemovedAsCollaborator(false);
      }
      setRequestState((prev) => ({
        _id: payload.requestId || prev?._id || "",
        status: decision,
        requestedRole: String(payload.role || prev?.requestedRole || "editor").toLowerCase(),
        message: prev?.message || "",
        createdAt: prev?.createdAt || null,
        respondedAt: new Date().toISOString(),
        optimistic: false,
      }));
      setFeedback(decision === "accepted" ? "Request accepted!" : "Request rejected.");
      setOpen(false);
      setLoading(false);
      inflightRequestRef.current = false;
    };

    const handleCollaboratorRemoved = (payload = {}) => {
      if (String(payload.scriptId || "") !== String(script._id)) return;
      setWasRemovedAsCollaborator(true);
      setRequestState(null);
      setRequestedRole("editor");
      setFeedback("");
      setMessage("");
      setOpen(false);
      setLoading(false);
      inflightRequestRef.current = false;
    };

    const handleMembershipChanged = (payload = {}) => {
      if (String(payload.scriptId || "") !== String(script._id)) return;
      const removedForCurrentUser = String(payload.action || "").trim().toLowerCase() === "collaborator_removed"
        && Array.isArray(payload.targetUserIds)
        && payload.targetUserIds.includes(String(viewerId));
      if (!removedForCurrentUser) return;
      handleCollaboratorRemoved(payload);
    };

    socket.on("collab_request_sent", handleRequestSent);
    socket.on("collab_request_responded", handleRequestResponded);
    socket.on("collaborator_removed", handleCollaboratorRemoved);
    socket.on("collab_membership_changed", handleMembershipChanged);

    return () => {
      socket.off("collab_request_sent", handleRequestSent);
      socket.off("collab_request_responded", handleRequestResponded);
      socket.off("collaborator_removed", handleCollaboratorRemoved);
      socket.off("collab_membership_changed", handleMembershipChanged);
      socket.disconnect();
    };
  }, [script?._id, viewerId, viewerToken]);

  useEffect(() => {
    if (!viewerToken || !viewerId || !script?._id) return undefined;

    let cancelled = false;

    const syncRequestState = async () => {
      try {
        const { data } = await api.get(`/scripts/${script._id}`);
        if (cancelled || !data) return;

        setLiveScriptState({
          isCollaborator: Boolean(data?.isCollaborator),
          canRequestCollab: Boolean(data?.canRequestCollab ?? data?.can_request_collab),
          myCollabRequest: data?.myCollabRequest || null,
          collaborators: Array.isArray(data?.collaborators) ? data.collaborators : [],
        });

        if (data?.isCollaborator) {
          setWasRemovedAsCollaborator(false);
          return;
        }

        const nextRequestState = buildRequestState(data?.myCollabRequest);
        setRequestState(nextRequestState);
        if (!nextRequestState) {
          setWasRemovedAsCollaborator(true);
        }
      } catch {
        // Keep current optimistic/live state on background sync failures.
      }
    };

    syncRequestState();
    const intervalId = window.setInterval(syncRequestState, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [script?._id, viewerId, viewerToken]);

  const normalizedRole = String(user?.role || "").toLowerCase();
  const isViewerWriter = !viewerId || ["writer", "creator"].includes(normalizedRole);
  const creatorId = String(script?.creator?._id || script?.creator || "");
  const isOwner = Boolean(viewerId) && creatorId === String(viewerId);
  const collaboratorSource = Array.isArray(liveScriptState?.collaborators) ? liveScriptState.collaborators : script?.collaborators;
  const isCollaborator = (Boolean(liveScriptState?.isCollaborator) || (
    !wasRemovedAsCollaborator && Array.isArray(collaboratorSource)
    && collaboratorSource.some((entry) => {
      const collaboratorId = String(entry?.userId?._id || entry?.userId || "");
      return (
        collaboratorId === String(viewerId)
        && entry?.isActive === true
        && entry?.status === "accepted"
      );
    })
  )) && !wasRemovedAsCollaborator;
  const isOpenForCollab = Boolean(
    liveScriptState?.canRequestCollab
    ?? script?.canRequestCollab
    ?? script?.can_request_collab
    ?? (script?.collabVisibility === "open")
  );
  const latestRequestStatus = String(requestState?.status || "").toLowerCase();
  const hasPendingRequest = latestRequestStatus === "pending";
  const hasRejectedRequest = latestRequestStatus === "rejected";
  const hasAcceptedRequest = latestRequestStatus === "accepted" && isCollaborator && !wasRemovedAsCollaborator;
  const canResubmitRequest = hasRejectedRequest;
  const activeRequestedRole = String(requestState?.requestedRole || requestedRole || "editor");
  const loginLink = `/login?next=${encodeURIComponent(`${location.pathname}${location.search || ""}`)}`;

  if (!isOpenForCollab || isOwner || isCollaborator || (!viewerId ? false : !isViewerWriter)) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (inflightRequestRef.current || hasPendingRequest || hasAcceptedRequest) return;

    const optimisticRequest = {
      _id: requestState?._id || `optimistic-${Date.now()}`,
      status: "pending",
      requestedRole,
      message,
      createdAt: new Date().toISOString(),
      respondedAt: null,
      optimistic: true,
    };

    try {
      inflightRequestRef.current = true;
      setLoading(true);
      setFeedback("Sending request...");
      setWasRemovedAsCollaborator(false);
      setRequestState(optimisticRequest);
      setOpen(false);
      await api.post(`/collab/${script._id}/request`, { requestedRole, message });
      setMessage("");
      setFeedback("Request sent!");
    } catch (err) {
      inflightRequestRef.current = false;
      const nextMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to send request";
      setFeedback(nextMessage);
      setRequestState(baseRequestState || readStoredRequestState(String(viewerId || ""), String(script?._id || "")));
      const normalizedMessage = nextMessage.toLowerCase();
      if (normalizedMessage.includes("already") || normalizedMessage.includes("pending")) {
        setRequestState((prev) => prev || optimisticRequest);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">Open for collaboration</p>
          <p className="mt-1 text-sm text-gray-600">
            {viewerId
              ? hasPendingRequest
                ? `Requested as ${getRoleLabel(activeRequestedRole)}. Waiting for writer approval.`
                : hasRejectedRequest
                  ? "Your collaboration request was rejected."
                  : hasAcceptedRequest
                    ? `Your collaboration request was accepted as ${getRoleLabel(activeRequestedRole)}.`
                    : "This writer is accepting collaboration requests."
              : "Sign in to request collaboration on this script."}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 ${
            hasRejectedRequest
              ? "bg-red-50 text-red-700"
              : hasAcceptedRequest
                ? "bg-emerald-50 text-emerald-700"
                : hasPendingRequest
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {hasRejectedRequest ? "Rejected" : hasAcceptedRequest ? "Accepted" : hasPendingRequest ? "Pending" : "Open"}
        </span>
      </div>

      {viewerId ? (
        <button
          disabled={hasPendingRequest || hasAcceptedRequest || loading}
          onClick={() => setOpen((prev) => !prev)}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#284d7d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
          ) : null}
          {hasPendingRequest
            ? "Request sent"
            : hasAcceptedRequest
              ? "Request accepted"
              : canResubmitRequest
                ? "Request Again"
                : "Request Collab"}
        </button>
      ) : (
        <Link
          to={loginLink}
          className="mt-4 inline-flex rounded-2xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Login to Request
        </Link>
      )}

      {viewerId && open && !hasPendingRequest && !hasAcceptedRequest ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <select
            value={requestedRole}
            onChange={(event) => setRequestedRole(event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Optional message"
            rows={3}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl border border-[#1e3a5f] px-4 py-2 text-sm font-semibold text-[#1e3a5f]"
          >
            {loading ? "Sending..." : "Submit Request"}
          </button>
        </form>
      ) : null}

      {feedback ? (
        <p className={`mt-3 text-sm transition-all duration-200 ${feedback.toLowerCase().includes("sent") || feedback.toLowerCase().includes("accepted") ? "text-emerald-600" : hasRejectedRequest ? "text-red-700" : "text-amber-700"}`}>
          {feedback}
        </p>
      ) : hasRejectedRequest ? (
        <p className="mt-3 text-sm text-red-700">
          Your collaboration request was rejected.
        </p>
      ) : null}
    </div>
  );
}
