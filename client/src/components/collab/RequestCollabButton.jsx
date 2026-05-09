import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

export default function RequestCollabButton({ script }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const latestRequestStatus = String(script?.myCollabRequest?.status || "").toLowerCase();
  const [submitted, setSubmitted] = useState(Boolean(script?.myCollabRequest?._id));

  useEffect(() => {
    setSubmitted(Boolean(script?.myCollabRequest?._id));
    setOpen(false);
    setFeedback("");
    setMessage("");
  }, [script?._id, script?.myCollabRequest?._id, latestRequestStatus]);

  const viewerId = user?._id || user?.id;
  const normalizedRole = String(user?.role || "").toLowerCase();
  const isViewerWriter = !viewerId || ["writer", "creator"].includes(normalizedRole);
  const creatorId = String(script?.creator?._id || script?.creator || "");
  const isOwner = Boolean(viewerId) && creatorId === String(viewerId);
  const isCollaborator = Array.isArray(script?.collaborators)
    && script.collaborators.some((entry) => {
      const collaboratorId = String(entry?.userId?._id || entry?.userId || "");
      return (
        collaboratorId === String(viewerId)
        && entry?.isActive === true
        && entry?.status === "accepted"
      );
    });
  const isOpenForCollab = Boolean(
    script?.canRequestCollab
    ?? script?.can_request_collab
    ?? (script?.collabVisibility === "open")
  );
  const hasPendingRequest = latestRequestStatus === "pending";
  const hasRejectedRequest = latestRequestStatus === "rejected";
  const hasAcceptedRequest = latestRequestStatus === "accepted";
  const canResubmitRequest = hasRejectedRequest;
  const loginLink = `/login?next=${encodeURIComponent(`${location.pathname}${location.search || ""}`)}`;

  if (!isOpenForCollab || isOwner || isCollaborator || (!viewerId ? false : !isViewerWriter)) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setFeedback("");
      await api.post(`/collab/${script._id}/request`, { requestedRole: "editor", message });
      setSubmitted(true);
      setOpen(false);
      setMessage("");
      setFeedback("Request sent!");
    } catch (err) {
      const nextMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to send request";
      setFeedback(nextMessage);
      const normalizedMessage = nextMessage.toLowerCase();
      if (normalizedMessage.includes("already") || normalizedMessage.includes("pending")) {
        setSubmitted(true);
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
              ? hasRejectedRequest
                ? "Your collaboration request was rejected."
                : hasAcceptedRequest
                  ? "Your collaboration request was accepted."
                  : "This writer is accepting collaboration requests."
              : "Sign in to request collaboration on this script."}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            hasRejectedRequest
              ? "bg-red-50 text-red-700"
              : hasAcceptedRequest
                ? "bg-emerald-50 text-emerald-700"
                : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {hasRejectedRequest ? "Rejected" : hasAcceptedRequest ? "Accepted" : "Open"}
        </span>
      </div>

      {viewerId ? (
        <button
          disabled={hasPendingRequest || hasAcceptedRequest}
          onClick={() => setOpen((prev) => !prev)}
          className="mt-4 rounded-2xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
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
          <input
            type="text"
            value="Editor"
            readOnly
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
          />
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
        <p className={`mt-3 text-sm ${feedback.includes("sent") ? "text-emerald-600" : hasRejectedRequest ? "text-red-700" : "text-amber-700"}`}>
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
