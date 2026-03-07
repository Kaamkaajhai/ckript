import { useState, useEffect, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"];

const statusConfig = {
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  approved: {
    label: "Approved",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  rejected: {
    label: "Declined",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-700 border border-red-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: null,
  },
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(amount) {
  if (!amount || amount === 0) return "Free";
  return `$${amount.toLocaleString()}`;
}

export default function WriterPurchaseRequests() {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null); // request id
  const [rejectModal, setRejectModal] = useState(null); // { id, scriptTitle, investorName }
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const isWriter = ["writer", "creator"].includes(user?.role);
  const isInvestor = ["investor", "producer", "director", "industry", "professional"].includes(user?.role);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/scripts/purchase-requests/mine");
      setRequests(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load purchase requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      await api.put(`/scripts/purchase-request/${requestId}/approve`);
      showToast("success", "Purchase approved! Funds transferred to your wallet.");
      fetchRequests();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to approve request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await api.put(`/scripts/purchase-request/${rejectModal.id}/reject`, { note: rejectNote });
      showToast("success", "Request declined. Funds returned to the investor.");
      setRejectModal(null);
      setRejectNote("");
      fetchRequests();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to decline request.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
            ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Decline Purchase Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              You are declining <strong>{rejectModal.investorName}</strong>'s request for{" "}
              <strong>"{rejectModal.scriptTitle}"</strong>. Their reserved funds will be returned automatically.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Let the investor know why you're declining..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectNote(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading === rejectModal.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {actionLoading === rejectModal.id ? "Declining..." : "Decline Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isWriter ? "Purchase Requests" : "My Purchase Requests"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isWriter
              ? "Review and manage investors' requests to purchase your scripts."
              : "Track the status of your script purchase requests."}
          </p>
        </div>

        {/* Stats Row */}
        {!loading && requests.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total", value: stats.total, color: "text-gray-900" },
              { label: "Pending", value: stats.pending, color: "text-amber-600" },
              { label: "Approved", value: stats.approved, color: "text-emerald-600" },
              { label: "Declined", value: stats.rejected, color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all
                ${filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {f === "rejected" ? "Declined" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && stats.pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full w-4 h-4 font-bold">
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading requests...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No {filter !== "all" ? filter : ""} requests found</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === "pending" && isWriter
                ? "No investors have submitted purchase requests yet."
                : "Nothing to show here."}
            </p>
          </div>
        )}

        {/* Request Cards */}
        {!loading && filteredRequests.length > 0 && (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const cfg = statusConfig[req.status] || statusConfig.pending;
              const person = isWriter ? req.investor : req.writer;
              const personLabel = isWriter ? "Investor" : "Writer";

              return (
                <div
                  key={req._id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Script thumbnail or placeholder */}
                    <div className="flex-shrink-0">
                      {req.script?.thumbnailUrl ? (
                        <img
                          src={req.script.thumbnailUrl}
                          alt={req.script?.title}
                          className="w-14 h-14 rounded-xl object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/script/${req.script?._id}`}
                            className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block"
                          >
                            {req.script?.title || "Untitled Script"}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            {person?.profileImage ? (
                              <img
                                src={person.profileImage}
                                alt={person.name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {person?.name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-gray-500">
                              <span className="font-medium text-gray-700">{person?.name || "Unknown"}</span>
                              <span className="text-gray-400"> · {personLabel}</span>
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-700 font-semibold">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatAmount(req.amount)}
                        </span>
                        <span className="text-gray-400 text-xs">{formatDate(req.createdAt)}</span>
                      </div>

                      {/* Writer's rejection note */}
                      {req.status === "rejected" && req.note && (
                        <div className="mt-3 flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <p className="text-xs text-gray-600 italic">"{req.note}"</p>
                        </div>
                      )}

                      {/* Actions for writer on pending requests */}
                      {isWriter && req.status === "pending" && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => handleApprove(req._id)}
                            disabled={actionLoading === req._id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
                          >
                            {actionLoading === req._id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              setRejectModal({
                                id: req._id,
                                scriptTitle: req.script?.title,
                                investorName: req.investor?.name,
                              })
                            }
                            disabled={actionLoading === req._id}
                            className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Investor view: approved → link to script */}
                      {!isWriter && req.status === "approved" && (
                        <div className="mt-3">
                          <Link
                            to={`/script/${req.script?._id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            View Script
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
