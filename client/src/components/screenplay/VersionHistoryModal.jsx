import { useMemo, useState } from "react";
import useVersionHistory, { lineDiff, timeAgo } from "./useVersionHistory";

export default function VersionHistoryModal({ open, onClose, scriptId, currentText = "", dark = false, onRestored }) {
  const [label, setLabel] = useState("");
  const [diffId, setDiffId] = useState(null);

  const {
    versions, loading, saving, restoringId, error,
    save, restore,
  } = useVersionHistory({ scriptId, open, currentText, onRestored });

  const handleSave = async () => {
    const ok = await save(label);
    if (ok) setLabel("");
  };

  const handleRestore = async (versionId) => {
    const ok = await restore(versionId);
    if (ok) setDiffId(null);
  };

  const diffVersion = versions.find((v) => v._id === diffId) || null;
  const diffRows = useMemo(() => lineDiff(diffVersion ? diffVersion.fountainSnapshot : null, currentText), [diffVersion, currentText]);

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
