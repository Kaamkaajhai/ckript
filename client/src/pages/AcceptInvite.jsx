import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const inviteAcceptanceRequests = new Map();

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useContext(AuthContext);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Accepting your invitation...");
  const [scriptInfo, setScriptInfo] = useState(null);

  const currentPath = useMemo(() => (
    typeof window === "undefined"
      ? `/invite/${token || ""}`
      : `${window.location.pathname || `/invite/${token || ""}`}${window.location.search || ""}`
  ), [token]);

  useEffect(() => {
    if (loading) return;

    if (!token) {
      setStatus("error");
      setMessage("Invitation token is missing.");
      return;
    }

    if (!user) {
      navigate(`/signup?role=writer&next=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }

    let cancelled = false;

    const requestPromise = inviteAcceptanceRequests.get(token) || api.get(`/collab/invite/${token}`);
    if (!inviteAcceptanceRequests.has(token)) {
      inviteAcceptanceRequests.set(token, requestPromise);
    }

    requestPromise
      .then(({ data }) => {
        if (cancelled) return;

        setScriptInfo(data?.script || null);
        setStatus("success");
        setMessage(data?.message || "Invitation accepted.");

        const targetScriptId = data?.script?._id;
        if (targetScriptId) {
          setTimeout(() => {
            navigate(`/script/${encodeURIComponent(targetScriptId)}`, { replace: true });
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
    };
  }, [currentPath, loading, navigate, token, user]);

  return (
    <div className="min-h-screen bg-[#eef0f3] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-xl border border-gray-200 p-8 text-center">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
          status === "success" ? "bg-emerald-50 text-emerald-600" : status === "error" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
        }`}>
          {status === "loading" ? (
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : status === "success" ? (
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
          {status === "success" ? "Invitation Accepted" : status === "error" ? "Invitation Problem" : "Joining Collaboration"}
        </h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>

        {scriptInfo?.title ? (
          <p className="mt-2 text-sm font-medium text-slate-800">
            Project: {scriptInfo.title}
          </p>
        ) : null}

        {status === "success" ? (
          <p className="mt-5 text-xs text-slate-500">Redirecting you to the collaboration workspace...</p>
        ) : null}

        {status === "error" ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-2xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Go to Dashboard
            </Link>
            <Link
              to="/login"
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-600"
            >
              Sign In Again
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
