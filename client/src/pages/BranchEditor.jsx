import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useNavigate, useParams } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import useCollabSocket from "../hooks/useCollabSocket";

const TEXT_COLORS = [
  { label: "Default", value: null },
  { label: "Black", value: "#000000" },
  { label: "Slate", value: "#64748b" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Yellow", value: "#eab308" },
  { label: "Lime", value: "#84cc16" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Rose", value: "#f43f5e" },
  { label: "White", value: "#ffffff" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Purple", value: "#e9d5ff" },
  { label: "Orange", value: "#fed7aa" },
];

const FORMAT_INFO = { min: 70, max: 180, typical: "90-120", label: "Feature Film", wordsPerPage: 250 };

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return String(value._id || value.id || "");
  return "";
};

const TBtn = ({ active, onClick, title, children, dark, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
      active
        ? "bg-[#1e3a5f] text-white shadow-sm"
        : dark
          ? "text-gray-400 hover:bg-white/[0.08] hover:text-white"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
    }`}
  >
    {children}
  </button>
);

const D = ({ dark }) => <div className={`w-px self-stretch mx-0.5 ${dark ? "bg-white/[0.08]" : "bg-gray-200"}`} />;
const ToolbarSection = ({ children }) => <div className="flex items-center gap-0.5">{children}</div>;

const EditorToolbar = ({ editor, dark, disabled }) => {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const textColorRef = useRef(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (textColorRef.current && !textColorRef.current.contains(e.target)) setShowTextColor(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target)) setShowHighlight(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editor) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-200 bg-white"} ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <ToolbarSection>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</TBtn>
      </ToolbarSection>

      <D dark={dark} />

      <ToolbarSection>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" /></svg>
        </TBtn>
      </ToolbarSection>

      <D dark={dark} />

      <ToolbarSection>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" /></svg>
        </TBtn>
      </ToolbarSection>

      <D dark={dark} />

      <ToolbarSection>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 10h-3v3h-2v-3H9v-2h3V8h2v3h3v2z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 11h18v2H3z" /></svg>
        </TBtn>
      </ToolbarSection>

      <D dark={dark} />

      <div className="relative" ref={textColorRef}>
        <button
          type="button"
          title="Text Color"
          disabled={disabled}
          onClick={() => { setShowTextColor((v) => !v); setShowHighlight(false); }}
          className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
            showTextColor ? "bg-[#1e3a5f] text-white" : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <svg className="w-[13px] h-[13px]" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z" /></svg>
          <div className="w-4 h-[3px] rounded-full mt-0.5" style={{ backgroundColor: editor.getAttributes("textStyle").color || (dark ? "#6b7280" : "#374151") }} />
        </button>
        {showTextColor && !disabled && (
          <div className={`absolute top-full left-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0a1624] border-[#1d3350]" : "bg-white border-gray-200"}`} style={{ width: 220 }}>
            <div className={`px-3 py-2 border-b text-[10px] font-bold tracking-widest uppercase ${dark ? "border-[#182840] text-gray-600" : "border-gray-100 text-gray-400"}`}>Text Color</div>
            <div className="p-3 grid grid-cols-6 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  onClick={() => { c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run(); setShowTextColor(false); }}
                  className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center ${
                    editor.getAttributes("textStyle").color === c.value ? "border-[#1e3a5f] scale-110" : dark ? "border-white/10" : "border-gray-200"
                  }`}
                  style={{ backgroundColor: c.value || (dark ? "#1a2a3a" : "#f3f4f6") }}
                >
                  {!c.value && <svg className={`w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={highlightRef}>
        <button
          type="button"
          title="Highlight"
          disabled={disabled}
          onClick={() => { setShowHighlight((v) => !v); setShowTextColor(false); }}
          className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
            showHighlight ? "bg-[#1e3a5f] text-white" : dark ? "text-gray-400 hover:bg-white/[0.08] hover:text-white" : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <svg className="w-[13px] h-[13px]" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <div className="w-4 h-[3px] rounded-full mt-0.5 bg-yellow-300" />
        </button>
        {showHighlight && !disabled && (
          <div className={`absolute top-full left-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden ${dark ? "bg-[#0a1624] border-[#1d3350]" : "bg-white border-gray-200"}`} style={{ width: 200 }}>
            <div className={`px-3 py-2 border-b text-[10px] font-bold tracking-widest uppercase ${dark ? "border-[#182840] text-gray-600" : "border-gray-100 text-gray-400"}`}>Highlight</div>
            <div className="p-3 grid grid-cols-6 gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c.value }).run(); setShowHighlight(false); }}
                  className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                    editor.isActive("highlight", { color: c.value }) ? "border-[#1e3a5f] scale-110" : dark ? "border-white/10" : "border-gray-200"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
              <button
                type="button"
                title="Remove Highlight"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}
                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center ${dark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}
              >
                <svg className={`w-3.5 h-3.5 ${dark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <D dark={dark} />

      <ToolbarSection>
        <TBtn dark={dark} disabled={disabled || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" /></svg>
        </TBtn>
        <TBtn dark={dark} disabled={disabled} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M5.13 3L4 4.13l7.36 7.37-4.6 9.5H9l3.64-7.54 5.23 5.23L17 17.87 5.13 3zm11.93-1.01l-3.09 3.09L12 4 9.38 9.38l1.41 1.41 1.62-3.35L16.87 12H13l1.41 1.41 2.09-2.09L18.87 13l1.13-1.13-2.94-9.88z" /></svg>
        </TBtn>
      </ToolbarSection>
    </div>
  );
};

const BranchEditor = () => {
  const { scriptId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchContent, setBranchContent] = useState("");
  const [branchOutdated, setBranchOutdated] = useState(false);
  const [prs, setPrs] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [showPrForm, setShowPrForm] = useState(false);
  const [prForm, setPrForm] = useState({ title: "", message: "" });
  const [submittingPr, setSubmittingPr] = useState(false);
  const [toast, setToast] = useState(null);

  const lastSavedContentRef = useRef("");
  const saveInFlightRef = useRef(false);
  const toastTimerRef = useRef(null);
  const redirectTimerRef = useRef(null);

  const [mergedBanner, setMergedBanner] = useState(false);
  const [activeEditors, setActiveEditors] = useState([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Underline,
      Placeholder.configure({ placeholder: "Start writing your script here...  e.g.  INT. LIVING ROOM - DAY" }),
    ],
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none min-h-[1056px] px-16 max-[1200px]:px-10 py-14 max-[1200px]:py-12 max-[640px]:px-6 max-[520px]:px-4 max-[420px]:px-3 max-[640px]:py-10 text-[15px] max-[520px]:text-[14px] leading-[1.65] ${dark ? "prose-invert" : ""}`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const text = currentEditor.getText();
      const html = currentEditor.getHTML();
      setWordCount(text.split(/\s+/).filter(Boolean).length);
      setCharCount(text.length);
      setDirty(html !== lastSavedContentRef.current);
      setSaveStatus(html === lastSavedContentRef.current ? "saved" : "idle");
    },
  });

  const currentUserId = normalizeId(user?._id);
  const latestUserPr = prs.filter((pr) => normalizeId(pr?.authorId) === currentUserId)[0] || null;
  const hasOpenPr = latestUserPr?.status === "open";
  const lastRejectedPr = latestUserPr?.status === "rejected" ? latestUserPr : null;

  const estimatedPages = Math.max(1, Math.round(wordCount / FORMAT_INFO.wordsPerPage));
  const pageStatus = estimatedPages < FORMAT_INFO.min ? "short" : estimatedPages > FORMAT_INFO.max ? "long" : "good";
  const renderPageMarkers = () => Array.from({ length: Math.max(estimatedPages, 1) }, (_, pageIndex) => (
    <div
      key={pageIndex}
      className="absolute left-3 flex items-center justify-center max-[1200px]:hidden"
      style={{ top: pageIndex * 1122 + 48, height: 28 }}
    >
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dark ? "bg-[#0d1520] text-gray-600 border border-[#182840]" : "bg-white text-gray-400 border border-gray-300 shadow-sm"}`}>
        {pageIndex + 1}
      </span>
    </div>
  ));

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [branchRes, prsRes] = await Promise.all([
        api.get(`/collab/${scriptId}/branch`),
        api.get(`/collab/${scriptId}/prs`),
      ]);

      const nextContent = String(branchRes.data?.branch?.content || "");
      const nextPrs = Array.isArray(prsRes.data?.prs) ? prsRes.data.prs : [];

      setBranchContent(nextContent);
      setBranchOutdated(Boolean(branchRes.data?.branch?.isOutdated));
      setPrs(nextPrs);
      lastSavedContentRef.current = nextContent;
      setDirty(false);
      setSaveStatus("idle");
    } catch (loadError) {
      setError(loadError?.response?.data?.error || "Failed to load branch editor.");
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { emitEditorActive, emitEditorInactive } = useCollabSocket(scriptId, Boolean(scriptId), {
    onPRMerged: (payload) => {
      const incomingScriptId = String(payload?.scriptId || "");
      if (incomingScriptId && incomingScriptId !== String(scriptId)) return;
      setMergedBanner(true);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = setTimeout(() => {
        navigate(`/collaborate?scriptId=${scriptId}`);
      }, 3000);
    },
    onEditorJoined: (payload) => {
      const uid = String(payload?.userId || "");
      if (!uid) return;
      setActiveEditors((prev) => {
        const filtered = prev.filter((e) => e.userId !== uid);
        return [...filtered, { userId: uid, name: payload.name || "Editor", avatar: payload.avatar || "" }];
      });
    },
    onEditorLeft: (payload) => {
      const uid = String(payload?.userId || "");
      setActiveEditors((prev) => prev.filter((e) => e.userId !== uid));
    },
  });

  // Emit editor_active on mount, editor_inactive on unmount
  useEffect(() => {
    if (!scriptId) return undefined;
    emitEditorActive(scriptId, user?.name || "", user?.profileImage || "");
    return () => { emitEditorInactive(scriptId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(branchContent || "");
    const text = editor.getText();
    setWordCount(text.split(/\s+/).filter(Boolean).length);
    setCharCount(text.length);
    setDirty(false);
    setSaveStatus("idle");
  }, [branchContent, editor]);

  // Editor is always editable — even when a PR is open (so the author can update it).

  const saveBranch = useCallback(async ({ silent = false } = {}) => {
    if (!editor || saveInFlightRef.current) return false;

    const content = editor.getHTML();
    if (content === lastSavedContentRef.current) {
      if (!silent) setSaveStatus("saved");
      return true;
    }

    saveInFlightRef.current = true;
    setSaveStatus("saving");
    setError("");

    try {
      const { data } = await api.patch(`/collab/${scriptId}/branch`, { content });
      const savedContent = String(data?.branch?.content || content);
      lastSavedContentRef.current = savedContent;
      setDirty(false);
      setSaveStatus("saved");
      return true;
    } catch (saveError) {
      setSaveStatus("idle");
      setError(saveError?.response?.data?.error || "Failed to save branch.");
      return false;
    } finally {
      saveInFlightRef.current = false;
    }
  }, [editor, scriptId]);

  useEffect(() => {
    if (loading) return undefined;

    const timer = window.setInterval(() => {
      if (!dirty || !editor) return;
      saveBranch({ silent: true });
    }, 30000);

    return () => window.clearInterval(timer);
  }, [dirty, editor, loading, saveBranch]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  const handleRaisePr = async (event) => {
    event.preventDefault();
    if (!prForm.title.trim()) {
      setError("PR title is required.");
      return;
    }

    setSubmittingPr(true);
    setError("");

    try {
      const saveOk = await saveBranch({ silent: true });
      if (!saveOk) return;
      await api.post(`/collab/${scriptId}/pr`, {
        title: prForm.title.trim(),
        message: prForm.message.trim(),
      });
      showToast("success", hasOpenPr ? "Pull request updated." : "Pull request raised.");
      setShowPrForm(false);
      // Redirect to the main script page after raising / updating a PR.
      navigate(`/script/${scriptId}`);
    } catch (submitError) {
      setError(submitError?.response?.data?.error || "Failed to submit pull request.");
    } finally {
      setSubmittingPr(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-[10020]">
          <div className={`rounded-xl px-4 py-3 shadow-2xl text-sm font-semibold ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.message}
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/collaborate?scriptId=${scriptId}`)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${dark ? "border-[#1c2a3a] bg-[#101b2b] text-gray-200 hover:bg-[#162234]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            <span aria-hidden="true">←</span>
            Back
          </button>
          <h1 className={`mt-4 text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Branch Editor</h1>
        </div>

        <button
          type="button"
          onClick={() => {
            if (hasOpenPr) {
              setPrForm({ title: latestUserPr?.title || "", message: latestUserPr?.message || "" });
            }
            setShowPrForm((prev) => !prev);
          }}
          disabled={loading}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
            hasOpenPr
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-[#1e3a5f] hover:bg-[#162d4a]"
          }`}
        >
          {hasOpenPr ? "Update Pull Request" : "Raise Pull Request"}
        </button>
      </div>

      {hasOpenPr ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${dark ? "border-amber-500/20 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          <span className="font-semibold">PR under review.</span> You can still edit your branch and update the pull request — any changes will be visible to the reviewer.
        </div>
      ) : null}

      {branchOutdated ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${dark ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-200" : "border-yellow-300 bg-yellow-50 text-yellow-800"}`}>
          ⚠️ <span className="font-semibold">The main script was updated by another collaborator since you started editing.</span> Your branch may have conflicts. The merger will resolve them during PR review.
        </div>
      ) : null}

      {/* Active editors presence bar */}
      {activeEditors.filter((e) => e.userId !== currentUserId).length > 0 ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm flex items-center gap-3 flex-wrap ${dark ? "border-[#1c2a3a] bg-[#101b2b] text-gray-300" : "border-gray-200 bg-white text-gray-700"}`}>
          <span className={`font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>Also editing now:</span>
          {activeEditors.filter((e) => e.userId !== currentUserId).map((e) => (
            <span key={e.userId} className="flex items-center gap-1.5">
              {e.avatar ? (
                <img src={e.avatar} alt={e.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${dark ? "bg-[#1e3a5f] text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                  {e.name?.[0]?.toUpperCase() || "E"}
                </span>
              )}
              <span className="text-xs font-medium">{e.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
          ))}
        </div>
      ) : null}

      {mergedBanner ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${dark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          Your changes have been merged. The script PDF has been updated. Redirecting in 3 seconds…
        </div>
      ) : null}

      {lastRejectedPr?.reviewNote ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${dark ? "border-red-500/20 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-800"}`}>
          Last pull request was rejected: {lastRejectedPr.reviewNote}
        </div>
      ) : null}

      {error ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${dark ? "border-red-500/20 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-800"}`}>
          {error}
        </div>
      ) : null}

      {showPrForm ? (
        <form onSubmit={handleRaisePr} className={`mb-5 rounded-2xl border p-4 ${dark ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-200 bg-white"}`}>
          <div className="grid gap-3">
            <input
              type="text"
              value={prForm.title}
              onChange={(event) => setPrForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Pull request title"
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${dark ? "border-[#223247] bg-[#0b1624] text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"}`}
            />
            <textarea
              value={prForm.message}
              onChange={(event) => setPrForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Optional message"
              rows={4}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${dark ? "border-[#223247] bg-[#0b1624] text-white placeholder:text-gray-500" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"}`}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPrForm(false)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${dark ? "border-[#1c2a3a] text-gray-300" : "border-gray-200 text-gray-700"}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPr}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  hasOpenPr ? "bg-amber-600" : "bg-[#1e3a5f]"
                }`}
              >
                {submittingPr ? "Submitting..." : hasOpenPr ? "Update Pull Request" : "Submit Pull Request"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className={`rounded-2xl border px-4 py-10 text-center text-sm ${dark ? "border-[#182840] bg-[#0d1520] text-gray-400" : "border-gray-200 bg-white text-gray-500"}`}>
          Loading branch editor...
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-[#0d1520] border-[#182840]" : "bg-white border-gray-200 shadow-sm"}`}>
          <div className={`flex items-center justify-between gap-3 px-5 py-3 border-b max-[640px]:px-3 ${dark ? "border-[#182840] bg-[#080f1a]" : "border-gray-100 bg-gray-50"}`}>
            <div className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
              Branch draft
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" ? <span className={`flex items-center gap-1.5 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Saving...</span> : null}
              {saveStatus === "saved" ? <span className={`flex items-center gap-1 text-xs ${dark ? "text-emerald-400" : "text-emerald-600"}`}><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Saved</span> : null}
              <button
                type="button"
                onClick={() => saveBranch()}
                disabled={saveStatus === "saving"}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${dark ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06] hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-100"} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Save Draft
              </button>
            </div>
          </div>

          <EditorToolbar editor={editor} dark={dark} disabled={false} />

          <div
            className={`relative overflow-y-auto overflow-x-auto max-[1200px]:overflow-x-hidden max-h-[72vh] ${dark ? "bg-[#05090f]" : "bg-[#e8eaed]"}`}
            style={{ backgroundImage: dark ? "radial-gradient(circle, #1a2a3a 1px, transparent 1px)" : "radial-gradient(circle, #c8cdd5 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          >
            <div className="sticky top-0 left-0 z-10 pointer-events-none">
              {renderPageMarkers()}
            </div>

            <div className="flex flex-col items-center max-[1200px]:items-start gap-0 py-8 max-[580px]:py-4 px-14 max-[1200px]:px-2 max-[380px]:px-1">
              <div
                className={`relative w-full max-w-[760px] max-[1200px]:max-w-none shadow-2xl ${dark ? "bg-[#111827]" : "bg-white"}`}
                style={{ minHeight: `${Math.max(estimatedPages, 1) * 1056}px` }}
              >
                {Array.from({ length: Math.max(estimatedPages - 1, 0) }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", top: (i + 1) * 1056, left: 0, right: 0, zIndex: 5 }}>
                    <div className={`w-full flex items-center gap-3 px-4 ${dark ? "bg-[#05090f]" : "bg-[#e8eaed]"}`} style={{ height: 32 }}>
                      <div className={`flex-1 h-px ${dark ? "bg-[#1a2a3a]" : "bg-gray-300"}`} />
                      <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${dark ? "bg-[#0d1520] text-gray-600 border border-[#182840]" : "bg-white text-gray-400 border border-gray-300"}`}>
                        Page {i + 2}
                      </span>
                      <div className={`flex-1 h-px ${dark ? "bg-[#1a2a3a]" : "bg-gray-300"}`} />
                    </div>
                  </div>
                ))}

                <div className={`relative z-0 ${dark
                  ? "[&_.tiptap]:text-gray-200 [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-700 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_h1]:text-white [&_.tiptap_h2]:text-gray-100 [&_.tiptap_blockquote]:border-[#1d3350] [&_.tiptap_blockquote]:text-gray-400 [&_.tiptap_code]:bg-white/[0.06] [&_.tiptap_pre]:bg-[#0a1220] [&_.tiptap_hr]:border-[#1e2a3a]"
                  : "[&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-300 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_code]:bg-gray-100 [&_.tiptap_pre]:bg-gray-50 [&_.tiptap_blockquote]:border-gray-200 [&_.tiptap_hr]:border-gray-200 [&_.tiptap]:text-gray-900"}`}>
                  <EditorContent editor={editor} />
                </div>


              </div>
            </div>
          </div>

          <div className={`flex items-center justify-between px-4 py-2 border-t text-[11px] ${dark ? "border-[#182840] bg-[#080f1a] text-gray-600" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
            <div className="flex items-center gap-4">
              <span>{wordCount} <span className={dark ? "text-gray-700" : "text-gray-300"}>words</span></span>
              <span>{charCount} <span className={dark ? "text-gray-700" : "text-gray-300"}>chars</span></span>
              <span className={`font-semibold ${pageStatus === "good" ? dark ? "text-emerald-400" : "text-emerald-600" : pageStatus === "short" ? dark ? "text-amber-400" : "text-amber-600" : dark ? "text-blue-400" : "text-blue-600"}`}>
                ~{estimatedPages} page{estimatedPages !== 1 ? "s" : ""}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] ${pageStatus === "good" ? dark ? "text-emerald-500" : "text-emerald-600" : pageStatus === "short" ? dark ? "text-amber-500" : "text-amber-600" : dark ? "text-blue-400" : "text-blue-600"}`}>
              {pageStatus === "good" ? "- Good length" : pageStatus === "short" ? "- Keep writing" : "- Consider trimming"}
              <span className={dark ? "text-gray-700" : "text-gray-300"}>-+ {FORMAT_INFO.label} typical: {FORMAT_INFO.typical} pages</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchEditor;
