import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";

const ROLES = [
  { value: "editor", label: "Editor", hint: "Can write and raise PRs" },
  { value: "commenter", label: "Commenter", hint: "Read and comment only" },
  { value: "merger", label: "Merger", hint: "Review and merge PRs only" },
  { value: "viewer", label: "Reader", hint: "Read-only access" },
  { value: "full_admin", label: "Admin", hint: "Full collaboration control" },
];

export default function InviteModal({ scriptId, onClose, onSuccess, dark = false }) {
  const [form, setForm] = useState({ email: "", role: "editor", accessLevel: "full_access", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!scriptId) { setError("Save the project once before inviting collaborators."); return; }
    try {
      setLoading(true);
      setError("");
      const { data } = await api.post(`/collab/${scriptId}/invite`, form);
      setSuccess(data?.message || "Invite sent!");
      onSuccess?.();
      setTimeout(() => onClose?.(), 700);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const card = dark ? "bg-[#0b1320] border border-[#1d3350]" : "bg-white border border-gray-200";
  const label = dark ? "text-gray-400" : "text-gray-500";
  const field = dark
    ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200 placeholder:text-gray-600 focus:border-blue-400"
    : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-[#1e3a5f]";

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4" style={{ background: "rgba(3,10,19,0.6)", backdropFilter: "blur(6px)" }} onMouseDown={onClose}>
      <form onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${card}`}>
        {/* Header */}
        <div className={`px-6 pt-5 pb-4 border-b ${dark ? "border-[#182840]" : "border-gray-100"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dark ? "bg-[#1e3a5f]" : "bg-[#1e3a5f]"}`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            </div>
            <div className="min-w-0">
              <h3 className={`text-[17px] font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Invite a collaborator</h3>
              <p className={`mt-0.5 text-[12.5px] leading-relaxed ${label}`}>They'll get an email invite to join this script.</p>
            </div>
            <button type="button" onClick={onClose} className={`ml-auto -mr-1 w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0 ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${label}`}>Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@example.com"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition ${field}`}
              required
              autoFocus
            />
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${label}`}>Role</label>
            <div className="grid grid-cols-1 gap-1.5">
              {ROLES.map((r) => {
                const active = form.role === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${active
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/10"
                      : (dark ? "border-[#1d3350] hover:bg-white/[0.03]" : "border-gray-200 hover:bg-gray-50")}`}>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? "border-[#1e3a5f]" : (dark ? "border-[#2a4a6a]" : "border-gray-300")}`}>
                      {active && <span className="w-2 h-2 rounded-full bg-[#1e3a5f]" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[13px] font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>{r.label}</span>
                      <span className={`block text-[11.5px] ${label}`}>{r.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${label}`}>Access level</label>
            <select
              value={form.accessLevel}
              onChange={(e) => setForm((p) => ({ ...p, accessLevel: e.target.value }))}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition ${field}`}
            >
              <option value="full_access">Full access — metadata + content</option>
              <option value="content_only">Content only — script text only</option>
            </select>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${label}`}>Message <span className="font-normal normal-case">(optional)</span></label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Add a short note…"
              rows={2}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none resize-none transition ${field}`}
            />
          </div>

          {error ? <p className="text-[12.5px] font-medium text-red-500">{error}</p> : null}
          {success ? <p className="text-[12.5px] font-medium text-emerald-500">{success}</p> : null}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t ${dark ? "border-[#182840]" : "border-gray-100"}`}>
          <button type="button" onClick={onClose}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}>
            Cancel
          </button>
          <button type="submit" disabled={loading || !form.email.trim()}
            className="rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#244873] disabled:opacity-50">
            {loading ? "Sending…" : "Send invite"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
