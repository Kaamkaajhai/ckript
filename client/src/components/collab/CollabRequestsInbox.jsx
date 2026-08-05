import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "../../services/api";
import { getApiBaseUrl } from "../../utils/apiOrigin";

const ROLE_OPTIONS = [
  { value: "editor", label: "Editor" },
  { value: "merger", label: "Merger" },
  { value: "viewer", label: "Viewer" },
  { value: "full_admin", label: "Admin" },
];
const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");

const ACCESS_LEVEL_OPTIONS = [
  { value: "full_access", label: "Full Access" },
  { value: "content_only", label: "Content Only" },
];

const timeAgo = (value) => {
  const delta = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

export default function CollabRequestsInbox() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [requestAccessLevels, setRequestAccessLevels] = useState({});
  const loadInbox = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/collab/requests/inbox");
      setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    let token = "";

    try {
      token = JSON.parse(stored || "{}")?.token || "";
    } catch {
      token = "";
    }

    if (!token) return undefined;

    const socket = io(SOCKET_ORIGIN, {
      auth: { token },
    });

    const refreshInbox = () => {
      loadInbox();
    };

    socket.on("collab_request", refreshInbox);
    socket.on("collab_request_responded", refreshInbox);
    socket.on("collab_membership_changed", refreshInbox);

    return () => {
      socket.off("collab_request", refreshInbox);
      socket.off("collab_request_responded", refreshInbox);
      socket.off("collab_membership_changed", refreshInbox);
      socket.disconnect();
    };
  }, [loadInbox]);

  const respond = async (request, decision) => {
    try {
      setActingId(request._id);
      setRequests((prev) => prev.filter((entry) => entry._id !== request._id));
      await api.post(`/collab/${request.scriptId}/request/${request._id}/respond`, {
        decision,
        accessLevel: request.requestedRole === "full_admin" ? (requestAccessLevels[request._id] || "full_access") : "content_only",
      });
      loadInbox();
    } finally {
      setActingId("");
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-500">Loading requests...</div>;
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Collaboration Requests</h3>
      <div className="mt-4 space-y-4">
        {requests.length ? requests.map((request) => (
          <div key={request._id} className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{request.requesterId?.name}</p>
                <p className="text-sm text-gray-500">{request.scriptTitle}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                  Wants to join as {(ROLE_OPTIONS.find((option) => option.value === request.requestedRole)?.label || "Editor").toLowerCase()} · {timeAgo(request.createdAt)}
                </p>
              </div>
              <span className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">
                {ROLE_OPTIONS.find((option) => option.value === request.requestedRole)?.label || "Editor"}
              </span>
            </div>
            {request.message ? <p className="mt-3 text-sm text-gray-700">{request.message}</p> : null}
            <div className="mt-4 flex items-center gap-3">
              <select
                value={request.requestedRole === "full_admin" ? (requestAccessLevels[request._id] || "full_access") : "content_only"}
                onChange={(event) => setRequestAccessLevels((prev) => ({
                  ...prev,
                  [request._id]: event.target.value,
                }))}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
              >
                {request.requestedRole === "full_admin" && (
                  <option value="full_access">Full</option>
                )}
                <option value="content_only">Content</option>
              </select>
              <button
                onClick={() => respond(request, "accepted")}
                disabled={actingId === request._id}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Accept
              </button>
              <button
                onClick={() => respond(request, "rejected")}
                disabled={actingId === request._id}
                className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        )) : <p className="text-sm text-gray-500">No pending collaboration requests.</p>}
      </div>
    </div>
  );
}
