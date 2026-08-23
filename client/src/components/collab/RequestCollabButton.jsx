import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { AuthContext } from "../../context/AuthContext";
import { getApiBaseUrl } from "../../utils/apiOrigin";
import {
  COLLAB_REQUEST_ROLES,
  getCollabErrorMessage,
  getCollabRoleLabel,
  sendCollabRequest,
  useMyCollabRequest,
} from "./collaborationRequests";

const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");

function RequestCollabButtonForScript({ script }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const viewerId = user?._id || user?.id;
  const scriptId = script?._id;
  const viewerToken = user?.token || "";
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [requestedRole, setRequestedRole] = useState("editor");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const requestState = useMyCollabRequest(scriptId, { enabled: Boolean(viewerId && scriptId) });
  const refreshRequestState = requestState.refresh;

  useEffect(() => {
    if (!viewerToken || !scriptId) return undefined;
    const socket = io(SOCKET_ORIGIN, { auth: { token: viewerToken } });
    const refreshForScript = (payload = {}) => {
      if (String(payload.scriptId || "") === String(scriptId)) refreshRequestState();
    };
    socket.on("collab_request_sent", refreshForScript);
    socket.on("collab_request_responded", refreshForScript);
    socket.on("collab_membership_changed", refreshForScript);
    socket.on("collaborator_removed", refreshForScript);
    return () => socket.disconnect();
  }, [refreshRequestState, scriptId, viewerToken]);

  const loginLink = useMemo(() => (
    `/login?next=${encodeURIComponent(`${location.pathname}${location.search || ""}`)}`
  ), [location.pathname, location.search]);

  const request = requestState.request;
  const status = request?.status || "";
  const pending = status === "pending";
  const accepted = status === "accepted" && requestState.isCollaborator;
  const rejected = status === "rejected";
  const isWriterAccount = ["writer", "creator"].includes(String(user?.role || "").toLowerCase());
  const publicOpen = Boolean(script?.canRequestCollab ?? script?.can_request_collab ?? script?.collabVisibility === "open");
  const visible = viewerId
    ? isWriterAccount && !requestState.isOwner && !requestState.isCollaborator && (publicOpen || requestState.canRequest || pending || rejected || accepted || requestState.status === "loading")
    : publicOpen;
  const requestsClosed = rejected && !requestState.canRequest && requestState.status === "ready";

  if (!visible) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (submitting || pending || accepted) return;
    try {
      setSubmitting(true);
      setFeedback("");
      const result = await sendCollabRequest(scriptId, { requestedRole, message });
      requestState.setState((current) => ({
        ...current,
        status: "ready",
        request: result.request,
        canRequest: false,
        error: "",
      }));
      setOpen(false);
      setMessage("");
      setFeedback(result.message);
    } catch (error) {
      setFeedback(getCollabErrorMessage(error, "Could not send your request"));
      requestState.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Open for collaboration</p>
          <p className="mt-1 text-sm text-gray-600">
            {!viewerId
              ? "Sign in to request collaboration on this script."
              : requestState.status === "loading"
                ? "Checking your collaboration status…"
                : pending
                  ? `Requested as ${getCollabRoleLabel(request.requestedRole)}. Waiting for writer approval.`
                  : rejected
                    ? requestsClosed
                      ? "The writer declined your previous request, and new requests are closed."
                      : "The writer declined your previous request. You may send a new one."
                    : "This writer is accepting collaboration requests."}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${rejected ? "bg-red-50 text-red-700" : pending ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
          {rejected ? "Declined" : pending ? "Pending" : "Open"}
        </span>
      </div>

      {!viewerId ? (
        <Link to={loginLink} className="mt-4 inline-flex rounded-2xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white">
          Login to request
        </Link>
      ) : (
        <button
          type="button"
          disabled={pending || requestsClosed || submitting || requestState.status === "loading"}
          onClick={() => {
            setRequestedRole(request?.requestedRole || "editor");
            setOpen((value) => !value);
          }}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Request sent" : requestsClosed ? "Requests closed" : rejected ? "Request again" : "Request collaboration"}
        </button>
      )}

      {viewerId && open && !pending ? (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-gray-800">
            Requested role
            <select
              value={requestedRole}
              onChange={(event) => setRequestedRole(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700"
            >
              {COLLAB_REQUEST_ROLES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-gray-800">
            Message <span className="font-normal text-gray-500">(optional)</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm font-normal"
            />
          </label>
          <button type="submit" disabled={submitting} className="min-h-11 rounded-2xl border border-[#1e3a5f] px-4 py-2 text-sm font-semibold text-[#1e3a5f] disabled:opacity-60">
            {submitting ? "Sending…" : "Send request"}
          </button>
        </form>
      ) : null}

      {requestState.status === "error" ? (
        <button type="button" onClick={requestState.refresh} className="mt-3 text-sm font-semibold text-red-700 underline">Could not check status. Retry</button>
      ) : null}
      {feedback ? <p className="mt-3 text-sm text-gray-700" role="status">{feedback}</p> : null}
    </div>
  );
}

// React Router may reuse PublicScript while only `:id` changes. Key the stateful form here so a
// message, feedback banner, or open form from one project can never appear on the next project.
export default function RequestCollabButton({ script }) {
  return <RequestCollabButtonForScript key={script?._id || "unknown-script"} script={script} />;
}
