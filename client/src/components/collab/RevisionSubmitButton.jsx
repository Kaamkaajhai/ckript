import { useState } from "react";
import api from "../../services/api";

const STATUS_LABELS = {
  draft: "Draft",
  pending_review: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

export default function RevisionSubmitButton({
  scriptId,
  content,
  baseContent = "",
  sectionRef = "textContent",
  status = "draft",
  onSubmitted,
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setMessage("");
      await api.post(`/collab/${scriptId}/revisions`, { content, baseContent, sectionRef });
      setMessage("Revision submitted for review.");
      onSubmitted?.();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to submit revision");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
        {STATUS_LABELS[status] || "Draft"}
      </span>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-2xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit Revision"}
      </button>
      {message ? <p className="text-sm text-gray-600">{message}</p> : null}
    </div>
  );
}
