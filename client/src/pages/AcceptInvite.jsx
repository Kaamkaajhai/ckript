import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { acceptCollabInvite } from "../components/collab/collaborationRequests";

const inviteAcceptanceRequests = new Map();

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useContext(AuthContext);
  const { openAuthModal } = useAuthModal();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Accepting your invitation...");
  const [scriptInfo, setScriptInfo] = useState(null);
  const displayStatus = !loading && !token ? "error" : !loading && !user ? "signed-out" : status;
  const displayMessage = displayStatus === "error" && !token
    ? "Invitation token is missing."
    : displayStatus === "signed-out"
      ? "Sign in or create your account to accept this invitation."
      : message;

  const currentPath = useMemo(() => (
    typeof window === "undefined"
      ? `/invite/${token || ""}`
      : `${window.location.pathname || `/invite/${token || ""}`}${window.location.search || ""}`
  ), [token]);

  useEffect(() => {
    if (loading) return;

    if (!token) {
      return;
    }

    if (!user) {
      // Do NOT route away. /signup and /login are both `<Navigate to="/">`, and nothing reads the
      // `next` param — sending an invitee there dropped them on the homepage and lost the invite
      // entirely. Stay put and open the auth modal with this URL as the post-sign-in redirect; the
      // effect re-runs once `user` lands and the invitation is accepted.
      openAuthModal({ redirect: currentPath });
      return;
    }

    let cancelled = false;
    let redirectTimer = null;

    const requestPromise = inviteAcceptanceRequests.get(token) || acceptCollabInvite(token, api);
    if (!inviteAcceptanceRequests.has(token)) {
      inviteAcceptanceRequests.set(token, requestPromise);
    }

    requestPromise
      .then((data) => {
        if (cancelled) return;

        setScriptInfo(data?.script || null);
        setStatus("success");
        setMessage(data?.message || "Invitation accepted.");

        const targetScriptId = data?.script?.id;
        if (targetScriptId) {
          redirectTimer = setTimeout(() => {
            // Land co-writers straight in the shared editor — that's where the duet happens.
            navigate(`/create-project/${encodeURIComponent(targetScriptId)}`, { replace: true });
          }, 1200);
        }
      })
      .catch((error) => {
        inviteAcceptanceRequests.delete(token);
        if (cancelled) return;
        setStatus("error");
        setMessage(error.response?.data?.error || "Failed to accept invitation.");
      });

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [currentPath, loading, navigate, openAuthModal, token, user]);

  return (
    <div className="min-h-screen bg-[#eef0f3] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl border border-gray-200 p-8 text-center">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
          displayStatus === "success" ? "bg-emerald-50 text-emerald-600" : displayStatus === "error" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
        }`}>
          {displayStatus === "signed-out" ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 12H8m0 0l3-3m-3 3l3 3m5-9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-1" />
            </svg>
          ) : displayStatus === "loading" ? (
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : displayStatus === "success" ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm9-3.758a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {displayStatus === "success" ? "Invitation Accepted"
            : displayStatus === "error" ? "Invitation Problem"
            : displayStatus === "signed-out" ? "You're Invited"
            : "Joining Collaboration"}
        </h1>
        <p className="mt-3 text-sm text-slate-600">{displayMessage}</p>

        {scriptInfo?.title ? (
          <p className="mt-2 text-sm font-medium text-slate-800">
            Project: {scriptInfo.title}
          </p>
        ) : null}

        {/* If they dismiss the modal the invite is still here — let them re-open it. */}
        {displayStatus === "signed-out" ? (
          <button
            type="button"
            onClick={() => openAuthModal({ redirect: currentPath })}
            className="mt-6 rounded-2xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Sign In to Accept
          </button>
        ) : null}

        {displayStatus === "success" ? (
          <p className="mt-5 text-xs text-slate-500">Redirecting you to the collaboration workspace...</p>
        ) : null}

        {displayStatus === "error" ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-2xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Go to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => openAuthModal({ redirect: currentPath })}
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-600"
            >
              Sign In Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
