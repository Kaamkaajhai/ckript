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
  
  // Premium responsive input styling
  const inputCls = `w-full px-4 py-2.5 rounded-xl text-[14px] border outline-none transition-all duration-200 ${
    dark 
      ? "bg-[#0a1322]/80 border-[#22364f]/70 text-gray-100 focus:border-[#4a72a5] focus:bg-[#0d182a] focus:ring-4 focus:ring-[#4a72a5]/10 placeholder:text-gray-600 shadow-inner" 
      : "bg-gray-50/80 border-gray-200/80 text-gray-900 focus:border-[#1e3a5f] focus:bg-white focus:ring-4 focus:ring-[#1e3a5f]/10 placeholder:text-gray-400 shadow-inner"
  }`;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 max-[480px]:p-2 sm:p-6" onMouseDown={onClose}>
      {/* Glassmorphic Backdrop */}
      <div className="absolute inset-0 bg-black/60 dark:bg-[#00040a]/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300" />
      
      {/* Modal Container */}
      <div onMouseDown={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg flex flex-col max-h-[95vh] rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden border animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ${
          dark ? "bg-[#0d1520]/95 backdrop-blur-xl border-[#22364f]/60" : "bg-white/95 backdrop-blur-xl border-gray-200/80"
        }`}>
        
        {/* Header */}
        <div className={`shrink-0 px-6 py-5 border-b flex items-center justify-between ${dark ? "border-[#22364f]/60" : "border-gray-100"}`}>
          <div>
            <h3 className={`text-lg font-bold tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>Title Page</h3>
          </div>
          <button type="button" onClick={onClose} className={`w-9 h-9 inline-flex items-center justify-center rounded-full transition-colors active:scale-90 ${
            dark ? "text-gray-400 hover:bg-white/10 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7 custom-scrollbar">
          
          {/* Centered preview of the title block */}
          <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-b from-[#1e3a5f]/5 to-transparent dark:from-[#4a72a5]/10 dark:to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
            <div className={`rounded-2xl border px-6 py-8 text-center font-mono shadow-sm transition-all duration-300 ${
              dark ? "border-[#22364f]/80 bg-[#050a12] shadow-black/50" : "border-gray-200/80 bg-white shadow-gray-200/50"
            }`}>
              <div className={`text-lg font-bold uppercase tracking-widest ${dark ? "text-gray-100" : "text-gray-900"}`}>{fields.title?.trim() || "TITLE"}</div>
              {fields.credit?.trim() && <div className={`text-[12px] mt-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>{fields.credit}</div>}
              {fields.author?.trim() && <div className={`text-[14.5px] mt-1 font-medium ${dark ? "text-gray-200" : "text-gray-700"}`}>{fields.author}</div>}
              {fields.source?.trim() && <div className={`text-[12px] mt-4 italic ${dark ? "text-gray-500" : "text-gray-400"}`}>{fields.source}</div>}
              {fields.draftDate?.trim() && <div className={`text-[12px] mt-4 font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>{fields.draftDate}</div>}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {TITLE_PAGE_FIELDS.map((f) => (
              <div key={f.key}>
                <label className={`block text-[12px] font-bold mb-1.5 ml-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{f.label}</label>
                <input type="text" value={fields[f.key] || ""} placeholder={f.placeholder || ""}
                  onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`shrink-0 p-5 border-t flex flex-col-reverse sm:flex-row items-center gap-3 ${dark ? "border-[#22364f]/60 bg-[#0d1520]" : "border-gray-100 bg-gray-50/50"}`}>
          <button type="button" onClick={() => { onSave(null); onClose(); }}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-[13.5px] font-bold border transition-all active:scale-95 sm:mr-auto ${
              dark ? "border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30" : "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            }`}>
            Remove title page
          </button>
          
          <div className="flex w-full sm:w-auto gap-3">
            <button type="button" onClick={onClose}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full text-[14px] font-bold border transition-all active:scale-95 ${
                dark ? "border-[#22364f]/80 text-gray-300 hover:bg-white/10" : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}>
              Cancel
            </button>
            <button type="button" onClick={() => { onSave(fields); onClose(); }}
              className={`flex-1 sm:flex-none px-7 py-2.5 rounded-full text-[14px] font-bold text-white transition-all active:scale-95 shadow-lg ${
                dark ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/40 border border-blue-500/30" 
                     : "bg-gradient-to-r from-[#1e3a5f] to-[#2a5185] hover:from-[#162d4a] hover:to-[#1e3a5f] shadow-[#1e3a5f]/40 border border-[#1e3a5f]/20"
              }`}
              style={{ color: '#ffffff' }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TitlePageModal;
