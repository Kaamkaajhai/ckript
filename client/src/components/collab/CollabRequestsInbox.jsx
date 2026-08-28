import { useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../../context/AuthContext";
import { getApiBaseUrl } from "../../utils/apiOrigin";
import {
  COLLAB_REQUEST_ROLES,
  getCollabErrorMessage,
  getCollabRoleLabel,
  respondToCollabRequest,
  useCollabRequestPage,
} from "./collaborationRequests";

const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");

const timeAgo = (value) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const delta = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

export default function CollabRequestsInbox() {
  const { user } = useContext(AuthContext);
  const [page, setPage] = useState(1);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState("");
  const [choices, setChoices] = useState({});
  const inbox = useCollabRequestPage({ scope: "inbox", page });

  useEffect(() => {
    if (!user?.token) return undefined;
    const socket = io(SOCKET_ORIGIN, { auth: { token: user.token } });
    ["collab_request", "collab_request_responded", "collab_membership_changed"]
      .forEach((event) => socket.on(event, inbox.refresh));
    return () => socket.disconnect();
  }, [inbox.refresh, user?.token]);

  const respond = async (request, decision) => {
    const role = choices[request.id]?.role || request.requestedRole;
    const accessLevel = role === "full_admin"
      ? (choices[request.id]?.accessLevel || "full_access")
      : "content_only";
    try {
      setActingId(request.id);
      setError("");
      await respondToCollabRequest(request, { decision, role, accessLevel });
      inbox.refresh();
    } catch (requestError) {
      setError(getCollabErrorMessage(requestError, "Could not update this request"));
    } finally {
      setActingId("");
    }
  };

  if (inbox.status === "loading" && !inbox.requests.length) {
    return <div className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-500">Loading requests…</div>;
  }

  if (inbox.status === "error" && !inbox.requests.length) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-5">
        <p className="text-sm text-red-700">{inbox.error}</p>
        <button type="button" onClick={inbox.refresh} className="mt-3 text-sm font-semibold text-[#1e3a5f] underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Collaboration requests</h3>
      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="mt-4 space-y-4">
        {inbox.requests.length ? inbox.requests.map((request) => {
          const role = choices[request.id]?.role || request.requestedRole;
          return (
            <article key={request.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{request.requester?.name || "Writer"}</p>
                  <p className="text-sm text-gray-600">{request.scriptTitle}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                    Requested {getCollabRoleLabel(request.requestedRole)} · {timeAgo(request.createdAt)}
                  </p>
                </div>
              </div>
              {request.legacyRequestedRole ? <p className="mt-3 text-sm text-amber-800">This older Merger request defaults to Commenter. Choose a current role before accepting.</p> : null}
              {request.message ? <p className="mt-3 text-sm text-gray-700">{request.message}</p> : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Role if accepted
                  <select
                    value={role}
                    onChange={(event) => setChoices((current) => ({
                      ...current,
                      [request.id]: { ...current[request.id], role: event.target.value },
                    }))}
                    className="mt-1 block min-h-11 w-full rounded-2xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700"
                  >
                    {COLLAB_REQUEST_ROLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => respond(request, "accepted")} disabled={actingId === request.id} className="min-h-11 rounded-2xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60">Accept</button>
                <button type="button" onClick={() => respond(request, "rejected")} disabled={actingId === request.id} className="min-h-11 rounded-2xl bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:opacity-60">Decline</button>
              </div>
            </article>
          );
        }) : <p className="text-sm text-gray-500">No pending collaboration requests.</p>}
      </div>
      {inbox.pagination.pages > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Collaboration request pages">
          <button type="button" disabled={!inbox.pagination.hasPrevious} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-11 px-3 text-sm font-semibold disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-600">Page {inbox.pagination.page} of {inbox.pagination.pages}</span>
          <button type="button" disabled={!inbox.pagination.hasNext} onClick={() => setPage((value) => value + 1)} className="min-h-11 px-3 text-sm font-semibold disabled:opacity-40">Next</button>
        </nav>
      ) : null}
    </div>
  );
}
