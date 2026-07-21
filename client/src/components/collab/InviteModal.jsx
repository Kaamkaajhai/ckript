import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import { useDarkMode } from "../../context/DarkModeContext";

import { COLLAB_ROLES as ROLES } from "../../constants/collabRoles";

export default function InviteModal({ scriptId, onClose, onSuccess, dark: darkProp }) {
  const { isDarkMode } = useDarkMode();
  // Follow the in-app dark toggle by default; allow an explicit override from callers that manage their own theme.
  const dark = typeof darkProp === "boolean" ? darkProp : isDarkMode;

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

  const card = dark ? "bg-[#0B0A06] border border-[#1A1813]" : "bg-white border border-[#e4e2dc]";
  const divider = dark ? "border-[#1A1813]" : "border-[#e4e2dc]";
  const title = dark ? "text-[#f3f2ee]" : "text-[#0B0A06]";
  const label = dark ? "text-white/40" : "text-gray-500";
  const bodyText = dark ? "text-white/50" : "text-gray-500";
  const field = dark
    ? "bg-[#11100C] border-[#2C2A26] text-white placeholder:text-white/30 focus:ring-[#D14D37]/60"
    : "bg-gray-50 border-[#e4e2dc] text-gray-900 placeholder:text-gray-400 focus:ring-[#D14D37]/50";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onMouseDown={onClose}>
      <form onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[95vh] flex flex-col rounded-2xl shadow-xl overflow-hidden ${card}`}>
        {/* Header */}
        <div className={`px-6 pt-5 pb-4 border-b ${divider}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#D14D37]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            </div>
            <div className="min-w-0">
              <h3 className={`text-[19px] font-bold font-serif ${title}`}>Invite a co-writer</h3>
              <p className={`mt-0.5 text-[12.5px] leading-relaxed ${bodyText}`}>They'll get an email invite to write on this script with you, live.</p>
            </div>
            <button type="button" onClick={onClose} className={`ml-auto -mr-1 w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0 transition ${dark ? "text-white/40 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-100"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${label}`}>Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@example.com"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition focus:ring-2 focus:border-transparent ${field}`}
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
                      ? "border-[#D14D37] bg-[#D14D37]/10"
                      : (dark ? "border-[#2C2A26] hover:bg-white/[0.03]" : "border-[#e4e2dc] hover:bg-gray-50")}`}>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? "border-[#D14D37]" : (dark ? "border-[#2C2A26]" : "border-gray-300")}`}>
                      {active && <span className="w-2 h-2 rounded-full bg-[#D14D37]" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[13px] font-semibold ${dark ? "text-white/90" : "text-gray-800"}`}>{r.label}</span>
                      <span className={`block text-[11.5px] ${bodyText}`}>{r.hint}</span>
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
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition focus:ring-2 focus:border-transparent ${field} ${dark ? "[color-scheme:dark]" : ""}`}
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
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none resize-none transition focus:ring-2 focus:border-transparent ${field}`}
            />
          </div>

          {error ? <p className="text-[12.5px] font-medium text-red-500">{error}</p> : null}
          {success ? <p className="text-[12.5px] font-medium text-emerald-500">{success}</p> : null}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t ${divider}`}>
          <button type="button" onClick={onClose}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold transition ${dark ? "text-white/50 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}>
            Cancel
          </button>
          <button type="submit" disabled={loading || !form.email.trim()}
            className="rounded-xl bg-[#D14D37] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#b53c29] transition disabled:opacity-50">
            {loading ? "Sending…" : "Send invite"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
