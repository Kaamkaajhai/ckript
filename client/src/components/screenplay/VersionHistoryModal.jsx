import { useEffect, useState, useCallback, useMemo } from "react";
import { diff_match_patch as DiffMatchPatch } from "diff-match-patch";
import api from "../../services/api";

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
};

// Fountain line-level diff (version → current): -1 removed, +1 added, 0 unchanged.
const useLineDiff = (versionText, currentText) =>
  useMemo(() => {
    if (versionText == null) return null;
    const dmp = new DiffMatchPatch();
    const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(versionText || "", currentText || "");
    const diffs = dmp.diff_main(chars1, chars2, false);
    dmp.diff_charsToLines_(diffs, lineArray);
    const rows = [];
    for (const [op, text] of diffs) {
      for (const line of text.split("\n")) {
        if (line === "" ) continue;
        rows.push({ op, line });
      }
    }
    return rows;
  }, [versionText, currentText]);

export default function VersionHistoryModal({ open, onClose, scriptId, currentText = "", dark = false, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [diffId, setDiffId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const fetchVersions = useCallback(async () => {
    if (!scriptId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/scripts/${scriptId}/versions`);
      setVersions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load versions.");
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    if (open) {
      setError("");
      setDiffId(null);
      fetchVersions();
    }
  }, [open, fetchVersions]);

  const handleSave = async () => {
    if (!scriptId) { setError("Save your project once before versioning."); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/scripts/${scriptId}/versions`, { label: label.trim(), content: currentText });
      setVersions(Array.isArray(data) ? data : []);
      setLabel("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save version.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (versionId) => {
    setRestoringId(versionId);
    setError("");
    try {
      const { data } = await api.post(`/scripts/${scriptId}/versions/${versionId}/restore`, { content: currentText });
      if (typeof data?.fountainContent === "string") onRestored?.(data.fountainContent);
      setVersions(Array.isArray(data?.versions) ? data.versions : []);
      setDiffId(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not restore version.");
    } finally {
      setRestoringId(null);
    }
  };

  const diffVersion = versions.find((v) => v._id === diffId) || null;
  const diffRows = useLineDiff(diffVersion ? diffVersion.fountainSnapshot : null, currentText);

  if (!open) return null;

  const panel = dark ? "bg-[#0b1320] border-[#1d3350] text-gray-200" : "bg-white border-gray-200 text-gray-800";
  const subText = dark ? "text-gray-500" : "text-gray-400";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-3xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col ${panel}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? "border-[#1d3350]" : "border-gray-100"}`}>
          <h3 className="text-sm font-bold">Version history</h3>
          <button onClick={onClose} className={`w-7 h-7 flex items-center justify-center rounded-lg ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-100"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Save row */}
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${dark ? "border-[#1d3350]" : "border-gray-100"}`}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="Label this version (e.g. 'First draft')"
            className={`flex-1 px-3 py-2 rounded-lg text-[13px] outline-none border ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200 placeholder:text-gray-600" : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400"}`}
          />
          <button onClick={handleSave} disabled={saving}
            className={`px-3.5 py-2 rounded-lg text-[12px] font-bold border transition disabled:opacity-50 ${dark ? "bg-[#1e3a5f] border-[#2a4a6a] text-white hover:bg-[#244873]" : "bg-[#1e3a5f] border-[#1e3a5f] text-white hover:bg-[#244873]"}`}>
            {saving ? "Saving…" : "Save version"}
          </button>
        </div>

        {error && <div className="px-5 py-2 text-[12px] text-red-500">{error}</div>}

        {/* Body: timeline + optional diff */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className={`text-[13px] ${subText}`}>Loading…</p>
          ) : versions.length === 0 ? (
            <p className={`text-[13px] ${subText}`}>No versions yet. Save one above to start tracking history.</p>
          ) : (
            <ul className="space-y-1.5">
              {versions.map((v) => (
                <li key={v._id} className={`rounded-lg border px-3 py-2.5 ${dark ? "border-[#1d3350]" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">
                        {v.label || (v.auto ? "Auto snapshot" : "Untitled version")}
                      </p>
                      <p className={`text-[11px] ${subText}`}>
                        {timeAgo(v.createdAt)}{v.authorName ? ` · ${v.authorName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setDiffId(diffId === v._id ? null : v._id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${dark ? "border-[#2a4a6a] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {diffId === v._id ? "Hide diff" : "Diff"}
                      </button>
                      <button onClick={() => handleRestore(v._id)} disabled={restoringId === v._id}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition disabled:opacity-50 ${dark ? "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                        {restoringId === v._id ? "…" : "Restore"}
                      </button>
                    </div>
                  </div>

                  {diffId === v._id && (
                    <div className={`mt-2 rounded-lg border p-2 max-h-64 overflow-auto font-mono text-[11px] leading-5 ${dark ? "border-[#1d3350] bg-[#070d16]" : "border-gray-200 bg-gray-50"}`}>
                      {diffRows && diffRows.length ? (
                        diffRows.map((r, i) => (
                          <div key={i} className={
                            r.op === 1 ? (dark ? "text-emerald-400" : "text-emerald-700")
                              : r.op === -1 ? (dark ? "text-red-400" : "text-red-600")
                              : (dark ? "text-gray-500" : "text-gray-500")
                          }>
                            <span className="select-none opacity-60">{r.op === 1 ? "+ " : r.op === -1 ? "− " : "  "}</span>{r.line}
                          </div>
                        ))
                      ) : (
                        <p className={subText}>No differences from the current draft.</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`px-5 py-2.5 border-t text-[11px] ${dark ? "border-[#1d3350] text-gray-500" : "border-gray-100 text-gray-400"}`}>
          Restoring saves your current draft as a snapshot first — nothing is lost.
        </div>
      </div>
    </div>
  );
}
