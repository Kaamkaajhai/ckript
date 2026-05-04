import { useState } from "react";
import api from "../../services/api";

export default function InviteModal({ scriptId, onClose, onSuccess }) {
  const [form, setForm] = useState({ email: "", role: "editor", accessLevel: "full_access", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const { data } = await api.post(`/collab/${scriptId}/invite`, form);
      setSuccess(data?.message || "Invite sent!");
      onSuccess?.();
      setTimeout(() => onClose?.(), 600);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09111bcc]/60 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-gray-900">Invite Someone</h3>
          <p className="mt-1 text-sm text-gray-500">Add a collaborator to this script.</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email address"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1e3a5f]"
            required
          />
          <select
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#1e3a5f]"
          >
            <option value="editor">Editor - can write and raise PRs</option>
            <option value="merger">Merger - can review and merge PRs only</option>
            <option value="viewer">Viewer - read only</option>
          </select>
          <select
            value={form.accessLevel}
            onChange={(event) => setForm((prev) => ({ ...prev, accessLevel: event.target.value }))}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#1e3a5f]"
          >
            <option value="full_access">Full Access</option>
            <option value="content_only">Content Only</option>
          </select>
          <textarea
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Optional message"
            rows={4}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1e3a5f]"
          />
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm font-medium text-emerald-600">{success}</p> : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-gray-500">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </form>
    </div>
  );
}
