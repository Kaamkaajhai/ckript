import { useState } from "react";
import { createPortal } from "react-dom";
import { TITLE_PAGE_FIELDS } from "../../../components/screenplay/classify";

/* -- Title Page Configurator ------------------------------------------------
   Industry-standard title page: Title, Credit ("Written by"), Author, Source
   ("Based on…"), Draft date. Stored as structured data and rendered by the PDF /
   Fountain export — NOT mixed into the editor body (keeps the classifier clean). */
const TitlePageModal = ({ open, initial, defaultTitle, dark, onSave, onClose }) => {
  // Seed once at mount. The call site remounts this (via `key`) each time it opens, so lazy initial
  // state is the right place to seed — no setState-in-effect (which triggers cascading renders).
  const [fields, setFields] = useState(() => {
    const seed = { ...Object.fromEntries(TITLE_PAGE_FIELDS.map((f) => [f.key, ""])), ...(initial || {}) };
    if (!String(seed.title || "").trim() && defaultTitle) seed.title = defaultTitle;
    if (!String(seed.credit || "").trim()) seed.credit = "Written by";
    return seed;
  });

  if (!open) return null;
  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));
  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border outline-none transition ${dark ? "bg-[#0a1322] border-[#22364f] text-gray-100 focus:border-[#3a5a82] placeholder:text-gray-600" : "bg-white border-gray-200 text-gray-900 focus:border-[#1e3a5f] placeholder:text-gray-300"}`;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div onMouseDown={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0d1520] border-[#1d3350]" : "bg-white border-gray-200"}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? "border-[#182840]" : "border-gray-100"}`}>
          <div>
            <h3 className={`text-base font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Title Page</h3>
            <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Industry-standard fields — shown on the exported PDF.</p>
          </div>
          <button type="button" onClick={onClose} className={`w-8 h-8 inline-flex items-center justify-center rounded-lg ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-100"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Centered preview of the title block */}
        <div className={`mx-5 mt-4 rounded-lg border px-4 py-6 text-center font-mono ${dark ? "border-[#22364f] bg-[#0a1322]" : "border-gray-200 bg-gray-50"}`}>
          <div className={`text-base font-bold uppercase tracking-wide ${dark ? "text-gray-100" : "text-gray-900"}`}>{fields.title?.trim() || "TITLE"}</div>
          {fields.credit?.trim() && <div className={`text-[12px] mt-3 ${dark ? "text-gray-400" : "text-gray-500"}`}>{fields.credit}</div>}
          {fields.author?.trim() && <div className={`text-[13px] ${dark ? "text-gray-200" : "text-gray-700"}`}>{fields.author}</div>}
          {fields.source?.trim() && <div className={`text-[11px] mt-3 italic ${dark ? "text-gray-500" : "text-gray-400"}`}>{fields.source}</div>}
          {fields.draftDate?.trim() && <div className={`text-[11px] mt-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>{fields.draftDate}</div>}
        </div>

        <div className="p-5 space-y-3">
          {TITLE_PAGE_FIELDS.map((f) => (
            <div key={f.key}>
              <label className={`block text-[11px] font-semibold mb-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{f.label}</label>
              <input type="text" value={fields[f.key] || ""} placeholder={f.placeholder || ""}
                onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
            </div>
          ))}
        </div>

        <div className={`px-5 py-4 border-t flex items-center gap-2 ${dark ? "border-[#182840]" : "border-gray-100"}`}>
          <button type="button" onClick={() => { onSave(null); onClose(); }}
            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition mr-auto ${dark ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50"}`}>
            Remove title page
          </button>
          <button type="button" onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${dark ? "border-[#22364f] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}>Cancel</button>
          <button type="button" onClick={() => { onSave(fields); onClose(); }}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition">Save title page</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TitlePageModal;
