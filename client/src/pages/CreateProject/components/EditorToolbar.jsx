import { useState, useEffect, useRef } from "react";
import { TEXT_COLORS, HIGHLIGHT_COLORS } from "../constants";

/* -- Toolbar Icon Button ---------------------------- */
export const TBtn = ({ active, onClick, title, children, dark, disabled = false }) => (
  <button type="button" onClick={onClick} title={title} disabled={disabled}
    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${active
        ? "bg-[#1e3a5f] text-white shadow-sm"
        : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}>{children}</button>
);

/* -- Divider ----------------------------------------- */
export const D = ({ dark }) => <div className={`w-px self-stretch mx-0.5 ${dark ? "bg-white/[0.08]" : "bg-gray-200"}`} />;

/* -- Editor Toolbar ---------------------------------- */
const EditorToolbar = ({ editor, dark }) => {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const textColorRef = useRef(null);
  const highlightRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (textColorRef.current && !textColorRef.current.contains(e.target)) setShowTextColor(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target)) setShowHighlight(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editor) return null;

  const Section = ({ children }) => <div className="flex items-center gap-0.5">{children}</div>;

  return (
    <div className={`flex flex-wrap items-center gap-1 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-200 bg-white"
      }`}>

      {/* -- Headings -- */}
      <Section>
        <TBtn dark={dark} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</TBtn>
        <TBtn dark={dark} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</TBtn>
        <TBtn dark={dark} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Text Style -- */}
      <Section>
        {/* Bold */}
        <TBtn dark={dark} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" /></svg>
        </TBtn>
        {/* Italic */}
        <TBtn dark={dark} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" /></svg>
        </TBtn>
        {/* Underline */}
        <TBtn dark={dark} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" /></svg>
        </TBtn>
        {/* Strikethrough */}
        <TBtn dark={dark} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" /></svg>
        </TBtn>
        {/* Inline Code */}
        <TBtn dark={dark} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" /></svg>
        </TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Alignment -- */}
      <Section>
        <TBtn dark={dark} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" /></svg>
        </TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Lists -- */}
      <Section>
        <TBtn dark={dark} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
        </TBtn>
        <TBtn dark={dark} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 10h-3v3h-2v-3H9v-2h3V8h2v3h3v2z" /></svg>
        </TBtn>
        <TBtn dark={dark} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 11h18v2H3z" /></svg>
        </TBtn>
      </Section>

      <D dark={dark} />

      {/* -- Text Color -- */}
      <div className="relative" ref={textColorRef}>
        <button type="button" title="Text Color"
          onClick={() => { setShowTextColor(v => !v); setShowHighlight(false); }}
          className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${showTextColor ? "bg-[#1e3a5f] text-white" : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100"
            }`}>
          <svg className="w-[13px] h-[13px]" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z" /></svg>
          <div className="w-4 h-[3px] rounded-full mt-0.5" style={{ backgroundColor: editor.getAttributes("textStyle").color || (dark ? "#6b7280" : "#374151") }} />
        </button>
        {showTextColor && (
          <div className={`absolute top-full left-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0a1624] border-[#1d3350]" : "bg-white border-gray-200"
            }`} style={{ width: 220 }}>
            <div className={`px-3 py-2 border-b text-[10px] font-bold tracking-widest uppercase ${dark ? "border-[#182840] text-gray-600" : "border-gray-100 text-gray-400"
              }`}>Text Color</div>
            <div className="p-3 grid grid-cols-6 gap-1.5">
              {TEXT_COLORS.map(c => (
                <button key={c.label} type="button" title={c.label}
                  onClick={() => { c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run(); setShowTextColor(false); }}
                  className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center ${(editor.getAttributes("textStyle").color === c.value) ? "border-[#1e3a5f] scale-110" : dark ? "border-white/10" : "border-gray-200"
                    }`}
                  style={{ backgroundColor: c.value || (dark ? "#1a2a3a" : "#f3f4f6") }}>
                  {!c.value && <svg className={`w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -- Highlight -- */}
      <div className="relative" ref={highlightRef}>
        <button type="button" title="Highlight"
          onClick={() => { setShowHighlight(v => !v); setShowTextColor(false); }}
          className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${showHighlight ? "bg-[#1e3a5f] text-white" : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100"
            }`}>
          <svg className="w-[13px] h-[13px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <div className="w-4 h-[3px] rounded-full mt-0.5 bg-yellow-300" />
        </button>
        {showHighlight && (
          <div className={`absolute top-full left-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0a1624] border-[#1d3350]" : "bg-white border-gray-200"
            }`} style={{ width: 200 }}>
            <div className={`px-3 py-2 border-b text-[10px] font-bold tracking-widest uppercase ${dark ? "border-[#182840] text-gray-600" : "border-gray-100 text-gray-400"
              }`}>Highlight</div>
            <div className="p-3 grid grid-cols-6 gap-1.5">
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.label} type="button" title={c.label}
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c.value }).run(); setShowHighlight(false); }}
                  className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${editor.isActive("highlight", { color: c.value }) ? "border-[#1e3a5f] scale-110" : dark ? "border-white/10" : "border-gray-200"
                    }`}
                  style={{ backgroundColor: c.value }} />
              ))}
              <button type="button" title="Remove Highlight"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
                  }`}>
                <svg className={`w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <D dark={dark} />

      {/* -- History -- */}
      <Section>
        <TBtn dark={dark} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" /></svg>
        </TBtn>
        <TBtn dark={dark} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M5.13 3L4 4.13l7.36 7.37-4.6 9.5H9l3.64-7.54 5.23 5.23L17 17.87 5.13 3zm11.93-1.01l-3.09 3.09L12 4 9.38 9.38l1.41 1.41 1.62-3.35L16.87 12H13l1.41 1.41 2.09-2.09L18.87 13l1.13-1.13-2.94-9.88z" /></svg>
        </TBtn>
      </Section>
    </div>
  );
};

export default EditorToolbar;
