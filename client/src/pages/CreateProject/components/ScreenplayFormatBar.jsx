import { useState, useEffect, useRef } from "react";
import { SCREENPLAY_ELEMENT_BAR } from "../../../components/screenplay/screenplayElements";
import { D } from "./EditorToolbar";

/* -- Screenplay Format Bar --------------------------------------------------
   The "Rich text" lower bar for SCREENPLAY mode. Every control writes through the
   Fountain-native machinery (applyEmphasis / setElementType), so what the writer
   formats is exactly what the classifier, reports, page count, and PDF/Fountain/FDX
   export all see — no separate document model, nothing that can drift. Only controls
   with a real Fountain representation live here (inline emphasis + element styles);
   colour/highlight/headings deliberately do NOT, because Fountain can't store them. */
const ScreenplayFormatBar = ({ onSetElement, onEmphasis, onCase, onCentered, onZoom, zoom = 1, onSwitchToProse, currentElement, emphasisState, dark }) => {
  const [styleOpen, setStyleOpen] = useState(false);
  const styleRef = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (styleRef.current && !styleRef.current.contains(e.target)) setStyleOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = emphasisState?.active || [];
  const hasSelection = Boolean(emphasisState?.hasSelection);
  const currentLabel = (SCREENPLAY_ELEMENT_BAR.find((e) => e.value === currentElement)?.label)
    || (currentElement === "blank" ? "Action" : "Action");

  // mousedown + preventDefault keeps the editor selection alive while clicking the button.
  const emBtn = (kind, glyph, title, cls) => (
    <button key={kind} type="button" title={hasSelection ? title : `${title} — select text first`}
      onMouseDown={(e) => { e.preventDefault(); onEmphasis?.(kind); }}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[13px] ${cls} transition ${
        active.includes(kind)
          ? "bg-[#1e3a5f] text-white shadow-sm"
          : dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
      }`}>{glyph}</button>
  );

  return (
    <div className={`relative z-20 flex flex-wrap items-center gap-2 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-200 bg-white"}`}>
      {/* Style dropdown — the document's element styles (Scene / Action / Character …), Word-style. */}
      <div className="relative" ref={styleRef}>
        <button type="button" onClick={() => setStyleOpen((o) => !o)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-semibold border min-w-[120px] justify-between transition ${dark ? "border-[#2a4a6a] text-gray-200 hover:bg-white/[0.06]" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
          <span className="truncate">{currentLabel}</span>
          <svg className="w-3 h-3 opacity-60 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {styleOpen && (
          <>
            <div className="fixed inset-0 z-[55]" onClick={() => setStyleOpen(false)} />
            <div className={`absolute left-0 mt-1 w-52 rounded-lg border shadow-xl z-[60] py-1 text-[12px] max-h-[60vh] overflow-y-auto ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
              {SCREENPLAY_ELEMENT_BAR.map((el) => (
                <button key={el.value} type="button"
                  onClick={() => { setStyleOpen(false); onSetElement?.(el.value); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 ${
                    currentElement === el.value ? (dark ? "bg-white/[0.08] text-white" : "bg-gray-100 text-gray-900") : (dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50")
                  }`}>
                  <el.Icon className="w-3.5 h-3.5 opacity-70" strokeWidth={1.8} aria-hidden="true" />
                  <span className="flex-1 text-left">{el.label}</span>
                  {el.tab && <span className={`text-[10px] font-mono ${dark ? "text-gray-600" : "text-gray-400"}`}>{el.tab}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <D dark={dark} />

      {/* Inline emphasis — standard Fountain *italic* / **bold** / ***both*** / _underline_. */}
      <div className="flex items-center gap-0.5">
        {emBtn("bold", "B", "Bold", "font-bold")}
        {emBtn("italic", "I", "Italic", "italic font-serif")}
        {emBtn("underline", "U", "Underline", "underline")}
        {emBtn("bolditalic", "BI", "Bold Italic", "font-bold italic font-serif text-[11px]")}
      </div>

      <D dark={dark} />

      {/* Case transforms — rewrite the selected characters (persists, classifier-safe). */}
      <div className="flex items-center gap-0.5">
        <button type="button" title={hasSelection ? "UPPERCASE" : "UPPERCASE — select text first"}
          onMouseDown={(e) => { e.preventDefault(); onCase?.("upper"); }}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[12px] font-bold tracking-tight transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>AA</button>
        <button type="button" title={hasSelection ? "lowercase" : "lowercase — select text first"}
          onMouseDown={(e) => { e.preventDefault(); onCase?.("lower"); }}
          className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[12px] font-bold tracking-tight lowercase transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>aa</button>
      </div>

      <D dark={dark} />

      {/* Center — wraps the line(s) as Fountain ">centered<" (line-level, export-safe in Fountain). */}
      <button type="button" title="Center line"
        onMouseDown={(e) => { e.preventDefault(); onCentered?.(); }}
        className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition ${
          emphasisState?.centered ? "bg-[#1e3a5f] text-white shadow-sm" : dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>
        <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
      </button>

      {onZoom && (
        <>
          <D dark={dark} />
          {/* Editor zoom — scales how big the text LOOKS (view only); text/page count/export unchanged. */}
          <div className="flex items-center gap-0.5">
            <button type="button" title="Zoom out" onClick={() => onZoom(-1)}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>
              <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z" /></svg>
            </button>
            <button type="button" title="Reset zoom to 100%" onClick={() => onZoom(0)}
              className={`min-w-[3.25rem] h-8 px-1 inline-flex items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition ${dark ? "text-gray-300 hover:bg-white/[0.08]" : "text-gray-600 hover:bg-gray-100"}`}>
              {Math.round((Number(zoom) || 1) * 100)}%
            </button>
            <button type="button" title="Zoom in" onClick={() => onZoom(1)}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition ${dark ? "text-gray-300 hover:bg-white/[0.08] hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"}`}>
              <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            </button>
          </div>
        </>
      )}

      <span className={`text-[10px] max-[1100px]:hidden ${dark ? "text-gray-600" : "text-gray-400"}`}>
        Select text, then format
      </span>

      {/* Mode switch — screenplay uses Fountain emphasis; "Rich text (prose)" hands off to the full
          TipTap editor (headings, colour, lists) for non-screenplay writing. Kept here so every
          formatting choice lives under Text Format. */}
      {onSwitchToProse && (
        <button type="button" onClick={onSwitchToProse}
          title="Switch to the prose / rich-text editor (headings, colour, lists)"
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${dark ? "border-[#2a4a6a] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M3 12h18M3 19h12" /></svg>
          Rich text (prose)
        </button>
      )}
    </div>
  );
};

export default ScreenplayFormatBar;
