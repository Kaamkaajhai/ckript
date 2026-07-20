import { useMemo, useRef, useState } from "react";
import ScreenplayEditor from "./ScreenplayEditor";
import ScreenplayElementBar from "./ScreenplayElementBar";
import PresenceAvatars from "./PresenceAvatars";
import Corkboard from "./Corkboard";
import ReportsPanel from "./ReportsPanel";
import InviteModal from "../collab/InviteModal";
import CollaboratorsPanel from "../collab/CollaboratorsPanel";
import { getScenes, DOC_SCENE_ID } from "./sceneIdentity";
import { paginate } from "./paginate";

// A real, visible title-page sheet (same proportions/look as the script page) rendered at the top of
// the canvas. Shows the centered industry block exactly as it prints; clicking anywhere opens the
// field editor (the configurator modal). When there's no title page yet, shows an "Add title page"
// placeholder so the writer can discover it as a page, Final Draft / WriterDuet style.
export const TitlePageSheet = ({ fields, hasTitlePage, onEdit, dark, anchorRef }) => {
  const f = fields || {};
  const muted = dark ? "text-gray-500" : "text-gray-400";
  return (
    <div ref={anchorRef} className="flex justify-center pt-12 max-[640px]:pt-6 px-6">
      <button type="button" onClick={onEdit}
        title="Click to edit the title page"
        className={`group relative w-full max-w-[820px] aspect-[8.5/11] rounded-sm shadow-2xl ring-1 transition outline-none text-left ${dark ? "bg-[#181818] ring-[#262626] hover:ring-gray-400/30" : "bg-white ring-black/[0.04] hover:ring-[#262626]/20"}`}>
        {/* Edit affordance */}
        <span className={`absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition ${dark ? "bg-white/[0.08] text-gray-200" : "bg-gray-100 text-gray-600"}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
          Edit
        </span>

        {hasTitlePage ? (
          <div className="absolute inset-0 flex flex-col items-center font-mono px-[10%]">
            {/* Title block — upper third, centered (industry layout) */}
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
              <div className={`text-[1.6vw] max-[820px]:text-base font-bold uppercase tracking-wide ${dark ? "text-gray-100" : "text-gray-900"}`}>{f.title?.trim() || "UNTITLED"}</div>
              {f.credit?.trim() && <div className={`mt-[3vh] text-[1vw] max-[820px]:text-[11px] ${dark ? "text-gray-400" : "text-gray-500"}`}>{f.credit}</div>}
              {f.author?.trim() && <div className={`mt-[0.6vh] text-[1.1vw] max-[820px]:text-[13px] ${dark ? "text-gray-200" : "text-gray-700"}`}>{f.author}</div>}
              {f.source?.trim() && <div className={`mt-[3vh] text-[0.95vw] max-[820px]:text-[11px] italic ${muted}`}>{f.source}</div>}
            </div>
            {/* Draft date — low on the page */}
            {f.draftDate?.trim() && (
              <div className={`pb-[10%] text-[0.95vw] max-[820px]:text-[11px] ${muted}`}>{f.draftDate}</div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg className={`w-10 h-10 ${muted}`} fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 9h8M8 13h8M10 17h4" /></svg>
            <span className={`text-[13px] font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>Add a title page</span>
            <span className={`text-[11px] ${muted}`}>Title, author, credit & more</span>
          </div>
        )}
      </button>
    </div>
  );
};

// Distraction-free, full-viewport screenwriting surface: scene navigator (left) ·
// page canvas (center) · reserved comments/presence rail (right). This is purely a
// presentation wrapper around the SAME ScreenplayEditor — all state stays in the wizard.
export default function ScreenplayFocusMode({
  value,
  onChange,
  onElementChange,
  onCaretLine,
  apiRef,
  dark = false,
  title = "",
  scriptId = null,
  onInviteSuccess,
  currentElement = "action",
  onSetElement,
  onEmphasis,
  onCase,
  onCentered,
  onConfigureTitlePage,
  hasTitlePage = false,
  titlePageFields = null,
  onZoom,
  zoom = 1,
  emphasisState = { active: [], hasSelection: false },
  onEmphasisStateChange,
  outline = [],
  presenceBySceneId = {},
  people = [],
  myUserId,
  locks = {},
  onRequestEdit,
  editRequest,
  onReleaseHeld,
  onDismissEditRequest,
  comments = [],
  focusedCommentId = null,
  canComment = true,
  canEdit = true,
  isCommentOrphaned,
  onAddComment,
  onReplyComment,
  onResolveComment,
  onDeleteComment,
  onFocusComment,
  onSceneClick,
  synopses = {},
  onSynopsisChange,
  onReorderScene,
  outlineNotes = "",
  onOutlineChange,
  importNotice = "",
  onDismissImportNotice,
  notice = "",
  onDismissNotice,
  onImport,
  onExport,
  exporting = "",
  onOpenHistory,
  onExit,
  onToggleDark,
}) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [centerView, setCenterView] = useState("page"); // "page" | "cards"
  const [lowerBarMode, setLowerBarMode] = useState("elements"); // "elements" | "format"
  const [leftTab, setLeftTab] = useState("scenes"); // "scenes" | "pages"
  const titlePageRef = useRef(null);
  const scrollToTitlePage = () => titlePageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [rightTab, setRightTab] = useState("people"); // "people" | "comments"
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [commentFilter, setCommentFilter] = useState("open"); // open | resolved | mine
  const [newCommentBody, setNewCommentBody] = useState("");
  const [replyFor, setReplyFor] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const sceneCount = outline.filter((o) => o.type === "scene").length;
  // Corkboard cards derive from the SAME scene identity (index+heading) the locks key off,
  // so a card's lock state lines up exactly with the editor's.
  const cardScenes = useMemo(() => getScenes(value).filter((s) => s.sceneId !== DOC_SCENE_ID), [value]);

  // Page list for the Pages panel — LINE-based pagination (industry standard, matches the exported PDF
  // via paginate.js) instead of the old word-count estimate. `paginate` returns the 0-based line index
  // each page starts on (honouring "===" breaks); each entry records the 1-based start line (so
  // clicking scrolls the editor there) and a label from the first meaningful line on that page.
  const pages = useMemo(() => {
    const lines = String(value || "").split("\n");
    const { pageStarts } = paginate(value || "");
    const labelFrom = (startIdx, endIdx) => {
      for (let i = startIdx; i < endIdx; i += 1) {
        const t = lines[i].trim();
        if (t && !/^={3,}$/.test(t)) return t.replace(/^[.@>~#]+\s*/, "").replace(/^>|<$/g, "");
      }
      return "";
    };
    return pageStarts.map((startIdx, p) => {
      const endIdx = p + 1 < pageStarts.length ? pageStarts[p + 1] : lines.length;
      return { page: p + 1, line: startIdx + 1, label: labelFrom(startIdx, endIdx).trim() || "(blank)" };
    });
  }, [value]);

  const topComments = comments.filter((c) => !c.parentId);
  const repliesOf = (id) => comments.filter((c) => String(c.parentId) === String(id));
  const openCount = topComments.filter((c) => !c.resolved).length;
  const filteredComments = topComments.filter((c) => {
    if (commentFilter === "open") return !c.resolved;
    if (commentFilter === "resolved") return c.resolved;
    if (commentFilter === "mine") return String(c.authorId) === String(myUserId);
    return true;
  });

  // Theme-based colors (matches non-focus mode editor palette)
  const desk = dark ? "#0b0b0b" : "#FBFAF7";
  const barCls = dark ? "bg-[#141414] border-[#262626]" : "bg-white border-[#e7e5df]";
  const railCls = dark ? "bg-[#141414] border-[#262626]" : "bg-white border-[#e7e5df]";
  const muted = dark ? "text-[#b0b0b0]" : "text-[#57544f]";
  const divider = dark ? "bg-[#262626]" : "bg-[#e7e5df]";

  const iconBtn = `w-9 h-9 inline-flex items-center justify-center rounded-lg transition-all ${dark ? "text-[#b0b0b0] hover:text-[#f2f2f2] hover:bg-[#1e1e1e]" : "text-[#57544f] hover:text-[#0B0A06] hover:bg-[#f0efe9]"}`;
  const actionBtn = `px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${dark ? "border-[#2a2a2a] text-[#e8e8e8] hover:bg-[#1e1e1e]" : "border-[#e7e5df] text-[#0B0A06] hover:bg-[#f0efe9]"}`;
  const dividerCls = `w-px h-5 shrink-0 ${divider}`;

  // A header panel button toggles its section: opening the right panel to that single section, or
  // closing the panel if it's already showing that section. The active section gets a filled state.
  const panelActive = (tab) => rightOpen && rightTab === tab;
  const togglePanel = (tab) => {
    if (rightOpen && rightTab === tab) { setRightOpen(false); return; }
    setRightTab(tab);
    setRightOpen(true);
  };
  const panelBtnCls = (tab) => `px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${panelActive(tab)
    ? (dark ? "bg-[#D14D37]/15 border-[#D14D37]/30 text-[#D14D37]" : "bg-[#0B0A06] border-[#0B0A06]")
    : (dark ? "border-[#2a2a2a] text-[#b0b0b0] hover:text-[#f2f2f2] hover:bg-[#1e1e1e]" : "border-[#e7e5df] text-[#57544f] hover:text-[#0B0A06] hover:bg-[#f0efe9]")}`;

  // Title shown in the single-section panel header.
  const panelTitle = { people: "People", comments: "Comments", reports: "Reports", outline: "Outline" }[rightTab] || "";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: desk, color: dark ? "#e8e8e8" : "#0B0A06" }}>
      {/* ── Primary top toolbar: view + collaboration + file actions ──────── */}
      <div className={`h-14 shrink-0 flex items-center gap-3 px-4 border-b ${barCls}`}>
        <button onClick={() => setLeftOpen((o) => !o)} className={iconBtn} title="Toggle scene list">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
        </button>

        <span className={dividerCls} />

        {/* Ribbon tabs — Elements ⇄ Text Format, Word-style: the tab lives up here and its controls
            render in the ribbon row directly below. Only meaningful over the page view. */}
        {centerView === "page" && (
          <div className={`flex items-center rounded-xl p-1 ${dark ? "bg-white/[0.05]" : "bg-gray-100"}`}>
            <button type="button" onClick={() => setLowerBarMode("elements")}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition ${lowerBarMode === "elements"
                ? (dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-white text-gray-800 shadow-sm")
                : `${muted} hover:${dark ? "text-gray-300" : "text-gray-600"}`}`}>
              Elements
            </button>
            <button type="button" onClick={() => setLowerBarMode("format")}
              title="Text formatting — bold, italic, underline"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition ${lowerBarMode === "format"
                ? (dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-white text-gray-800 shadow-sm")
                : `${muted} hover:${dark ? "text-gray-300" : "text-gray-600"}`}`}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 4v3h5.5v12h3V7H19V4z" /></svg>
              Text Format
            </button>
          </div>
        )}

        {title && (
          <span className={`text-[13px] font-medium truncate max-w-[280px] max-[900px]:hidden ${dark ? "text-[#f2f2f2]" : "text-[#0B0A06]"}`}>{title}</span>
        )}

        {/* RIGHT GROUP — collaboration + file / mode actions, in clear clusters */}
        <div className="ml-auto flex items-center gap-2.5">
          <>
            {people.length > 0 ? (
              <PresenceAvatars people={people} dark={dark} onClick={() => togglePanel("people")} />
            ) : (
              <button type="button" aria-label="Collaborators" title="Manage collaborators" onClick={() => togglePanel("people")}
                className={`flex items-center justify-center w-7 h-7 rounded-full border border-dashed transition-all ${dark ? "border-[#b0b0b0] text-[#b0b0b0] hover:text-[#D14D37] hover:border-[#D14D37]" : "border-[#9a978f] text-[#57544f] hover:text-[#0B0A06] hover:border-[#0B0A06]"}`}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person_add</span>
              </button>
            )}
            <span className={dividerCls} />
          </>

          {/* File cluster */}
          <button type="button" aria-label="Invite Writer" title="Invite Writer" onClick={() => setInviteOpen(true)} className={iconBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>person_add</span>
          </button>
          <button type="button" onClick={onImport} className={actionBtn}>Import</button>
          <div className="relative">
            <button type="button" onClick={() => setExportMenuOpen((o) => !o)} disabled={Boolean(exporting)}
              style={{ color: "#ffffff" }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border transition disabled:opacity-50 ${dark ? "bg-[#D14D37] border-[#D14D37] hover:bg-[#c0432f]" : "bg-[#0B0A06] border-[#0B0A06] hover:bg-[#2c2a26]"}`}>
              {exporting ? "Exporting…" : "Export"}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-xl z-50 py-1 text-[13px] ${dark ? "bg-[#181818] border-[#262626] text-[#e8e8e8] shadow-black/50" : "bg-white border-[#e7e5df] text-[#0B0A06] shadow-sm"}`}>
                  {[["pdf", "PDF"], ["pdf-wm", "Watermarked PDF"], ["fountain", "Fountain"], ["fdx", "Final Draft (.fdx)"]].map(([kind, label]) => (
                    <button key={kind} type="button" onClick={() => { setExportMenuOpen(false); onExport?.(kind); }}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${dark ? "hover:bg-[#1e1e1e] hover:text-[#D14D37]" : "hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}>{label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={onOpenHistory} className={actionBtn}>History</button>

          <span className={dividerCls} />

          {/* Panel cluster — each toggles the single-section right panel */}
          <button type="button" onClick={() => togglePanel("reports")} className={panelBtnCls("reports")} style={panelActive("reports") && !dark ? { color: "#ffffff" } : undefined}>Reports</button>
          <button type="button" onClick={() => togglePanel("outline")} className={panelBtnCls("outline")} style={panelActive("outline") && !dark ? { color: "#ffffff" } : undefined}>Outline</button>
          <button onClick={() => togglePanel("comments")}
            style={panelActive("comments") && !dark ? { color: "#ffffff" } : undefined}
            className={`${iconBtn} relative ${panelActive("comments") ? (dark ? "bg-[#D14D37]/15 text-[#D14D37]" : "bg-[#0B0A06]") : ""}`} title="Comments">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            {openCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#d6a93a] text-[#ffffff] text-[9px] font-bold flex items-center justify-center">{openCount}</span>}
          </button>
          <span className={dividerCls} />

          <button type="button" aria-label="Toggle Dark Mode" title="Toggle Dark Mode" onClick={onToggleDark} className={iconBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              {dark ? "light_mode" : "dark_mode"}
            </span>
          </button>

          <button type="button" onClick={onExit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${dark ? "border-[#2a2a2a] text-[#b0b0b0] hover:text-[#f2f2f2] hover:bg-[#1e1e1e]" : "border-[#e7e5df] text-[#57544f] hover:text-[#0B0A06] hover:bg-[#f0efe9]"}`}
            title="Exit focus mode (Esc)">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
            Exit
          </button>
        </div>
      </div>

      {/* ── Ribbon row: the controls for whichever tab is selected in the top bar ── */}
      {centerView === "page" && (
        <div className={`shrink-0 flex items-center gap-3 px-4 py-1.5 border-b ${barCls}`}>
          {lowerBarMode === "format" ? (
            <>
              {/* Fountain inline emphasis — wraps the selection with *italic* / **bold** / ***both*** /
                  _underline_. Plain-text markers, so the classifier/export are unaffected. */}
              <div className="flex items-center gap-0.5">
                {[
                  ["bold", "Bold", "B", "font-bold"],
                  ["italic", "Italic", "I", "italic font-serif"],
                  ["underline", "Underline", "U", "underline"],
                  ["bolditalic", "Bold Italic", "BI", "font-bold italic font-serif text-[11px]"],
                ].map(([kind, title, glyph, cls]) => (
                  <button key={kind} type="button" onMouseDown={(e) => { e.preventDefault(); onEmphasis?.(kind); }}
                    title={emphasisState.hasSelection ? title : `${title} — select text first`}
                    className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[13px] ${cls} transition-all ${
                      emphasisState.active?.includes(kind)
                        ? (dark ? "bg-[#D14D37]/15 text-[#D14D37]" : "bg-[#0B0A06]")
                        : dark ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]" : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}
                    style={emphasisState.active?.includes(kind) && !dark ? { color: "#ffffff" } : undefined}>
                    {glyph}
                  </button>
                ))}
              </div>
              <span className={dividerCls} />
              {/* Case transforms — rewrite the selected characters (persists, classifier-safe). */}
              <div className="flex items-center gap-0.5">
                <button type="button" title={emphasisState.hasSelection ? "UPPERCASE" : "UPPERCASE — select text first"}
                  onMouseDown={(e) => { e.preventDefault(); onCase?.("upper"); }}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[12px] font-bold tracking-tight transition-all ${dark ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]" : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}>AA</button>
                <button type="button" title={emphasisState.hasSelection ? "lowercase" : "lowercase — select text first"}
                  onMouseDown={(e) => { e.preventDefault(); onCase?.("lower"); }}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[12px] font-bold tracking-tight lowercase transition-all ${dark ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]" : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}>aa</button>
              </div>
              <span className={dividerCls} />
              {/* Center — wraps the line(s) as Fountain ">centered<". */}
              <button type="button" title="Center line"
                onMouseDown={(e) => { e.preventDefault(); onCentered?.(); }}
                className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition-all ${
                  emphasisState.centered ? (dark ? "bg-[#D14D37]/15 text-[#D14D37]" : "bg-[#0B0A06]") : dark ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]" : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}
                style={emphasisState.centered && !dark ? { color: "#ffffff" } : undefined}>
                <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
              </button>
              {onZoom && (
                <>
                  <span className={dividerCls} />
                  {/* Editor zoom — visual only; text / page count / export unchanged. */}
                  <div className="flex items-center gap-0.5">
                    <button type="button" title="Zoom out" onClick={() => onZoom(-1)}
                      className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition-all ${dark ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]" : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}>
                      <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z" /></svg>
                    </button>
                    <button type="button" title="Reset zoom to 100%" onClick={() => onZoom(0)}
                      className={`min-w-[3.25rem] h-8 px-1 inline-flex items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-all ${dark ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]" : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}>
                      {Math.round((Number(zoom) || 1) * 100)}%
                    </button>
                    <button type="button" title="Zoom in" onClick={() => onZoom(1)}
                      className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition-all ${dark ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]" : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]"}`}>
                      <svg className="w-[15px] h-[15px]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                    </button>
                  </div>
                </>
              )}
              <span className={dividerCls} />
              <span className={`text-[11px] ${muted} max-[1100px]:hidden`}>Select text, then format</span>
            </>
          ) : (
            <>
              <ScreenplayElementBar currentElement={currentElement} onSetElement={onSetElement} dark={dark} />
              <span className={dividerCls} />
              <span className={`text-[11px] ${muted} max-[1100px]:hidden`}>Press <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${dark ? "border-[#262626] bg-white/[0.04]" : "border-gray-200 bg-gray-50"}`}>Enter</kbd> for next element · <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${dark ? "border-[#262626] bg-white/[0.04]" : "border-gray-200 bg-gray-50"}`}>Tab</kbd> to cycle</span>
            </>
          )}
        </div>
      )}

      {/* Error / save-blocked banner — e.g. plan limit reached (402). Persistent until dismissed. */}
      {notice && (
        <div className={`shrink-0 flex items-center gap-3 px-4 py-2 border-b text-[12px] ${dark ? "bg-[#3a1620] border-[#5a2433] text-red-200" : "bg-red-50 border-red-200 text-red-800"}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.01M10.06 3.4 1.6 18a1.5 1.5 0 0 0 1.3 2.25h18.2A1.5 1.5 0 0 0 22.4 18L13.94 3.4a1.5 1.5 0 0 0-2.88 0z" /></svg>
          <span>{notice}</span>
          <button type="button" onClick={() => onDismissNotice?.()}
            className={`ml-auto px-2.5 py-1 rounded-md text-[11px] font-medium border ${dark ? "border-[#5a2433] text-red-200 hover:bg-white/[0.06]" : "border-red-300 text-red-800 hover:bg-red-100"}`}>Dismiss</button>
        </div>
      )}

      {/* Import notice — e.g. after a Final Draft import with unmapped element types */}
      {importNotice && (
        <div className={`shrink-0 flex items-center gap-3 px-4 py-2 border-b text-[12px] ${dark ? "bg-[#0f2a1e] border-[#1d4f38] text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
          <span>{importNotice}</span>
          <button type="button" onClick={() => onDismissImportNotice?.()}
            className={`ml-auto px-2.5 py-1 rounded-md text-[11px] font-medium border ${dark ? "border-[#1d4f38] text-emerald-200 hover:bg-white/[0.06]" : "border-emerald-300 text-emerald-800 hover:bg-emerald-100"}`}>Dismiss</button>
        </div>
      )}

      {/* Edit-request banner — shown to the lock holder when someone wants their scene */}
      {editRequest && (
        <div className={`shrink-0 flex items-center gap-3 px-4 py-2 border-b text-[12px] ${dark ? "bg-[#10233b] border-[#1d3350] text-gray-200" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
          <span className="font-semibold">{editRequest.byName}</span>
          <span>wants to edit the scene you're holding.</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={() => { onReleaseHeld?.(); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${dark ? "bg-[#1e1e1e] text-[#ffffff] hover:bg-[#2a2a2a]" : "bg-[#0B0A06] text-[#ffffff] hover:bg-[#2c2a26]"}`}>Release it</button>
            <button type="button" onClick={() => onDismissEditRequest?.()}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${dark ? "border-[#262626] text-gray-300 hover:bg-white/[0.06]" : "border-amber-300 text-amber-800 hover:bg-amber-100"}`}>Keep editing</button>
          </div>
        </div>
      )}

      {/* ── Three columns ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden" style={{ background: desk }}>
        {/* Left — scene navigator */}
        {leftOpen && (
          <aside className={`w-[288px] shrink-0 border-r overflow-y-auto ${railCls}`}>
            {/* Scenes ⇄ Pages tab toggle */}
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <div className={`flex items-center rounded-lg p-0.5 ${dark ? "bg-[#0b0b0b] ring-1 ring-[#262626]" : "bg-gray-200/60"}`}>
                {[["scenes", "Scenes", sceneCount], ["pages", "Pages", pages.length]].map(([id, label, count]) => (
                  <button key={id} type="button"
                    onClick={() => {
                      setLeftTab(id);
                      // Page entries scroll the page view, so jumping to one from the corkboard would
                      // scroll something the writer can't see — return to the page first.
                      if (id === "pages" && centerView !== "page") {
                        setCenterView("page");
                        requestAnimationFrame(() => apiRef?.current?.requestMeasure?.());
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${leftTab === id ? (dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-white text-gray-900 shadow-sm") : `${muted} hover:${dark ? "text-gray-300" : "text-gray-700"}`}`}>
                    {label}
                    <span className={`px-1.5 rounded-full text-[9px] ${leftTab === id ? "bg-white/20" : (dark ? "bg-white/[0.06]" : "bg-gray-300/50")}`}>{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page ⇄ Cards — SCENES tab only. Cards is a scene-restructuring tool (drag to reorder);
                pages are a computed projection of the text, so the Pages tab is navigation-only and
                must not offer it. */}
            {leftTab === "scenes" && (
              <div className="px-4 pb-3">
                <div className={`flex items-center rounded-lg p-0.5 ${dark ? "bg-white/[0.05]" : "bg-gray-200/60"}`}>
                  {[
                    ["page", "Page", "M4 5h16v14H4z M8 9h8M8 13h5"],
                    ["cards", "Cards", "M4 5h7v6H4z M13 5h7v6h-7z M4 13h7v6H4z M13 13h7v6h-7z"],
                  ].map(([id, label, path]) => (
                    <button key={id} type="button"
                      onClick={() => { setCenterView(id); if (id === "page") requestAnimationFrame(() => apiRef?.current?.requestMeasure?.()); }}
                      title={id === "cards" ? "Corkboard — drag cards to reorder scenes" : "Script page view"}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition ${centerView === id ? (dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-white text-gray-900 shadow-sm") : `${muted} hover:${dark ? "text-gray-300" : "text-gray-700"}`}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={path} /></svg>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── PAGES TAB ── */}
            {leftTab === "pages" ? (
              <div className="pb-5">
                {/* Insert menu — title page */}
                <div className="px-4 pb-2 relative">
                  <button type="button" onClick={() => onConfigureTitlePage?.()}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border transition ${dark ? "border-[#262626] text-[#e8e8e8] hover:bg-[#1e1e1e]" : "border-gray-200 text-gray-700 hover:bg-white"}`}>
                    <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 9h8M8 13h8M10 17h4" /></svg>
                    {hasTitlePage ? "Edit title page" : "Title page"}
                  </button>
                </div>

                <div className="px-2 space-y-0.5">
                  {hasTitlePage && (
                    <button type="button" onClick={() => { setCenterView("page"); requestAnimationFrame(scrollToTitlePage); }}
                      className={`group w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition ${dark ? "hover:bg-white/[0.05]" : "hover:bg-white hover:shadow-sm"}`}>
                      <span className={`w-7 h-9 shrink-0 rounded-sm border flex items-center justify-center text-[8px] font-bold ${dark ? "border-[#262626] text-[#b0b0b0] bg-white/[0.03]" : "border-gray-300 text-gray-400 bg-gray-50"}`}>TITLE</span>
                      <span className={`text-[12.5px] truncate ${dark ? "text-gray-300" : "text-gray-700"}`}>Title page</span>
                    </button>
                  )}
                  {pages.map((p) => (
                    <button key={p.page} type="button" onClick={() => onSceneClick?.(p.line)}
                      className={`group w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition ${dark ? "hover:bg-white/[0.05]" : "hover:bg-white hover:shadow-sm"}`}>
                      <span className={`w-7 h-9 shrink-0 rounded-sm border flex items-center justify-center text-[11px] font-mono font-bold ${dark ? "border-[#262626] text-[#b0b0b0] bg-white/[0.03]" : "border-gray-300 text-gray-500 bg-gray-50"}`}>{p.page}</span>
                      <span className={`text-[12.5px] truncate ${muted}`}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : outline.length === 0 ? (
              <p className={`px-5 py-3 text-[12.5px] leading-relaxed italic ${muted}`}>No scenes yet. Add an INT./EXT. heading to begin building your outline.</p>
            ) : (
              <div className="px-2 pb-5 space-y-0.5">
                {(() => {
                  let n = 0;
                  return outline.map((item, i) => {
                    if (item.type === "sequence") {
                      return (
                        <button key={`${item.line}-${i}`} onClick={() => onSceneClick?.(item.line)}
                          className={`w-full text-left px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] truncate ${muted} hover:underline`}>
                          {item.text}
                        </button>
                      );
                    }
                    n += 1;
                    const here = (item.sceneId && presenceBySceneId[item.sceneId]) || [];
                    const lock = item.sceneId ? locks[item.sceneId] : null;
                    const lockedByOther = lock && String(lock.holderId) !== String(myUserId);
                    return (
                      <button key={`${item.line}-${i}`} onClick={() => onSceneClick?.(item.line)}
                        title={lock ? `Locked by ${lock.holderName}` : undefined}
                        className={`group w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition ${dark ? "hover:bg-white/[0.05]" : "hover:bg-white hover:shadow-sm"}`}>
                        {/* Lock icon (held) overrides the presence dot; else presence dots; else empty. */}
                        {lock ? (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={lock.color || "#888"} strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M3.75 21.75h16.5a.75.75 0 00.75-.75v-9a.75.75 0 00-.75-.75H3.75a.75.75 0 00-.75.75v9a.75.75 0 00.75.75z" />
                          </svg>
                        ) : here.length > 0 ? (
                          <span className="flex items-center -space-x-1 shrink-0 w-3.5 justify-center">
                            {here.slice(0, 3).map((p) => (
                              <span key={p.userId} className="w-2 h-2 rounded-full ring-1 ring-white/30" style={{ backgroundColor: p.color }} title={p.name} />
                            ))}
                          </span>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dark ? "bg-[#262626]" : "bg-gray-300"}`} />
                        )}
                        <span className={`text-[11px] font-mono w-5 shrink-0 ${muted}`}>{n}</span>
                        <span className={`text-[12.5px] uppercase tracking-tight truncate ${lockedByOther ? muted : (dark ? "text-gray-300" : "text-gray-700")}`}>{item.text}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </aside>
        )}

        {/* Center — page canvas (Cards view overlays it; the editor stays MOUNTED but hidden so a
            reorder applied to its value remains a single undo step that survives the toggle). */}
        <div className="flex-1 flex overflow-hidden" style={{ background: desk }}>
          <div className={`flex-1 overflow-y-auto ${centerView === "cards" ? "hidden" : ""}`}>
            {/* Title page renders as its OWN sheet (a real first page), above the script page. */}
            {hasTitlePage && (
              <TitlePageSheet fields={titlePageFields} hasTitlePage={hasTitlePage} onEdit={onConfigureTitlePage} dark={dark} anchorRef={titlePageRef} />
            )}
            <div className="flex justify-center py-12 max-[640px]:py-6 px-6">
              <div className={`w-full max-w-[820px] rounded-sm shadow-2xl ring-1 ${dark ? "bg-[#181818] ring-[#262626]" : "bg-white ring-black/[0.04]"}`}>
                {title && (
                  <div className={`px-[4rem] max-[640px]:px-4 pt-8 text-[12px] font-mono ${muted}`}>{title}</div>
                )}
                <ScreenplayEditor
                  value={value}
                  onChange={onChange}
                  onElementChange={onElementChange}
                  onEmphasisStateChange={onEmphasisStateChange}
                  onCaretLine={onCaretLine}
                  locks={locks}
                  myUserId={myUserId}
                  onRequestEdit={onRequestEdit}
                  comments={comments}
                  focusedCommentId={focusedCommentId}
                  onAddComment={canComment ? onAddComment : undefined}
                  readOnly={!canEdit}
                  apiRef={apiRef}
                  zoom={zoom}
                  dark={dark}
                />
              </div>
            </div>
          </div>

          {centerView === "cards" && (
            <Corkboard
              scenes={cardScenes}
              synopses={synopses}
              onSynopsisChange={onSynopsisChange}
              onReorder={onReorderScene}
              onOpenScene={(line) => { setCenterView("page"); requestAnimationFrame(() => onSceneClick?.(line)); }}
              locks={locks}
              myUserId={myUserId}
              presenceBySceneId={presenceBySceneId}
              canEdit={canEdit}
              dark={dark}
            />
          )}
        </div>

        {/* Right — People / Comments. Responsive width so the panel never runs off-screen on
            narrower viewports: full-width (capped) on small screens, fixed 340px on large. */}
        {rightOpen && (
          <aside className={`w-full max-w-[340px] min-[900px]:w-[340px] shrink-0 border-l flex flex-col overflow-hidden ${railCls}`}>
            {/* Single-section header — title of the active section + close. The section is chosen
                from the top toolbar (one panel at a time), so there's no in-panel tab bar. */}
            <div className={`flex items-center px-4 h-14 shrink-0 border-b ${dark ? "border-[#182840]" : "border-gray-200"}`}>
              <h2 className={`text-[13px] font-bold uppercase tracking-[0.1em] ${dark ? "text-gray-200" : "text-gray-800"}`}>
                {panelTitle}
                {rightTab === "people" && people.length > 0 && <span className={`ml-2 text-[11px] font-semibold ${muted}`}>{people.length}</span>}
                {rightTab === "comments" && openCount > 0 && <span className={`ml-2 text-[11px] font-semibold ${muted}`}>{openCount}</span>}
              </h2>
              <button onClick={() => setRightOpen(false)} className={`ml-auto ${iconBtn} w-8 h-8 shrink-0`} title="Close panel">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* People tab */}
            {rightTab === "people" && (
              <div className="overflow-y-auto py-2 flex flex-col h-full">
                {people.length > 0 && (
                  <div className="mb-4">
                    <p className={`px-4 mb-2 text-[11px] font-bold uppercase tracking-[0.1em] ${dark ? "text-gray-500" : "text-gray-400"}`}>Online Now</p>
                    {people.map((p) => {
                      const isYou = String(p.userId) === String(myUserId);
                      return (
                        <div key={p.userId} className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg ${dark ? "hover:bg-white/[0.04]" : "hover:bg-white"}`}>
                          <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#ffffff] text-[12px] font-bold ring-2 ring-white/20" style={{ backgroundColor: p.color }}>
                            {(p.name || "?").trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-semibold truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>{p.name}{isYou ? " (you)" : ""}</p>
                            <p className={`text-[11.5px] truncate ${muted}`}>{p.state === "editing" ? "Editing" : "Viewing"}{p.sceneHeading ? ` · ${p.sceneHeading}` : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className={`mt-3 mx-4 border-b ${dark ? "border-[#182840]" : "border-gray-200"}`} />
                  </div>
                )}
                
                {scriptId ? (
                  <div className="flex-1 px-1">
                    <CollaboratorsPanel scriptId={scriptId} currentUserId={myUserId} compact={true} dark={dark} />
                  </div>
                ) : (
                  <div className="px-5 py-3">
                    <p className={`text-[12.5px] leading-relaxed italic ${muted}`}>Save the project once to enable invites and manage collaborators.</p>
                  </div>
                )}
              </div>
            )}

            {/* Comments tab */}
            {rightTab === "comments" && (
              <div className="flex flex-col min-h-0 flex-1">
                {/* New comment composer (uses the editor's current selection) */}
                {canComment && (
                  <div className={`px-4 py-4 border-b ${dark ? "border-[#182840]" : "border-gray-200"}`}>
                    <textarea value={newCommentBody} onChange={(e) => setNewCommentBody(e.target.value)} rows={3}
                      placeholder="Select script text, then write a note…"
                      className={`w-full px-3 py-2.5 rounded-lg text-[13px] leading-relaxed outline-none border resize-none focus:ring-2 focus:ring-[#262626] ${dark ? "bg-[#0b0b0b] border-[#262626] text-gray-200 placeholder:text-gray-600" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"}`} />
                    <div className="flex justify-end mt-2">
                      <button type="button" disabled={!newCommentBody.trim()}
                        onClick={async () => { const ok = await onAddComment?.(newCommentBody.trim()); if (ok) setNewCommentBody(""); }}
                        style={{ color: "#ffffff" }}
                        className={`px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-40 ${dark ? "bg-[#1e1e1e] hover:bg-[#2a2a2a]" : "bg-[#0B0A06] hover:bg-[#2c2a26]"}`}>Comment</button>
                    </div>
                  </div>
                )}

                {/* Filter */}
                <div className="flex items-center gap-1.5 px-4 py-3 text-[10px]">
                  {[["open", "Open"], ["resolved", "Resolved"], ["mine", "Mine"]].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setCommentFilter(id)}
                      style={commentFilter === id ? { color: "#ffffff" } : undefined}
                      className={`px-2.5 py-1.5 rounded-full font-bold uppercase tracking-wide transition ${commentFilter === id
                        ? (dark ? "bg-[#1e1e1e]" : "bg-[#0B0A06]")
                        : (dark ? "text-gray-500 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-200/60")}`}>{label}</button>
                  ))}
                </div>

                <div className="overflow-y-auto flex-1 pb-4">
                  {filteredComments.length === 0 ? (
                    <p className={`px-5 py-4 text-[12.5px] leading-relaxed italic ${muted}`}>No {commentFilter} comments.</p>
                  ) : filteredComments.map((c) => {
                    const orphaned = isCommentOrphaned?.(c);
                    const mine = String(c.authorId) === String(myUserId);
                    return (
                      <div key={c._id} className={`mx-4 my-2.5 rounded-xl border p-3.5 ${dark ? "border-[#1d3350] bg-[#0b1320]" : "border-gray-200 bg-white shadow-sm"}`}>
                        <button type="button" onClick={() => onFocusComment?.(c)} className="w-full text-left">
                          {c.anchor?.quote && (
                            <p className={`text-[11px] italic mb-1 truncate ${orphaned ? "line-through " : ""}${muted}`}>“{c.anchor.quote}”</p>
                          )}
                          {orphaned && <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500 mb-1">Orphaned — text removed</p>}
                          <p className={`text-[12px] ${dark ? "text-gray-200" : "text-gray-800"}`}>{c.body}</p>
                          <p className={`text-[10px] mt-1 ${muted}`}>{c.authorName}{mine ? " (you)" : ""}</p>
                        </button>

                        {repliesOf(c._id).map((r) => (
                          <div key={r._id} className={`mt-2 pl-2.5 border-l-2 ${dark ? "border-[#1d3350]" : "border-gray-200"}`}>
                            <p className={`text-[12px] ${dark ? "text-gray-300" : "text-gray-700"}`}>{r.body}</p>
                            <p className={`text-[10px] ${muted}`}>{r.authorName}</p>
                          </div>
                        ))}

                        <div className="flex items-center gap-2 mt-2">
                          {canComment && (
                            <button type="button" onClick={() => { setReplyFor(replyFor === c._id ? null : c._id); setReplyBody(""); }}
                              className={`text-[10px] font-bold ${dark ? "text-gray-300" : "text-[#0B0A06]"}`}>Reply</button>
                          )}
                          <button type="button" onClick={() => onResolveComment?.(c._id, !c.resolved)}
                            className={`text-[10px] font-bold ${dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}>{c.resolved ? "Reopen" : "Resolve"}</button>
                          {mine && (
                            <button type="button" onClick={() => onDeleteComment?.(c._id)}
                              className="text-[10px] font-bold text-red-400 hover:text-red-500 ml-auto">Delete</button>
                          )}
                        </div>

                        {replyFor === c._id && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <input value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Reply…"
                              className={`flex-1 px-2 py-1.5 rounded-md text-[12px] outline-none border ${dark ? "bg-[#0b0b0b] border-[#262626] text-gray-200" : "bg-white border-gray-200 text-gray-800"}`} />
                            <button type="button" disabled={!replyBody.trim()}
                              onClick={async () => { await onReplyComment?.(c._id, replyBody.trim()); setReplyBody(""); setReplyFor(null); }}
                              style={{ color: "#ffffff" }}
                              className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold disabled:opacity-40 ${dark ? "bg-[#1e1e1e]" : "bg-[#0B0A06]"}`}>Send</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reports tab — auto-generated scene & character summaries (Phase 4 §3) */}
            {rightTab === "reports" && (
              <ReportsPanel
                value={value}
                title={title}
                dark={dark}
                onJumpScene={(line) => { setCenterView("page"); requestAnimationFrame(() => onSceneClick?.(line)); }}
              />
            )}

            {/* Outline tab — free-form beats/notes kept alongside the script (Phase 4 §4).
                Stored as script metadata; never exports into the screenplay. */}
            {rightTab === "outline" && (
              <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 shrink-0 ${dark ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" /></svg>
                    <h3 className={`text-[12px] font-bold uppercase tracking-[0.1em] ${dark ? "text-gray-300" : "text-gray-700"}`}>Outline &amp; Beats</h3>
                  </div>
                  <p className={`mt-1.5 text-[11.5px] leading-relaxed ${muted}`}>Private notes for structure and beats. Saved with the script — never exported into the screenplay.</p>
                </div>
                <textarea
                  value={outlineNotes}
                  onChange={(e) => onOutlineChange?.(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Jot down beats, structure notes, to-dos…"
                  className={`flex-1 mx-4 mb-4 resize-none rounded-xl px-4 py-3 text-[13.5px] leading-relaxed outline-none border focus:ring-2 focus:ring-[#262626] ${dark ? "bg-[#0b0b0b] border-[#262626] text-gray-200 placeholder:text-gray-600" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"} disabled:opacity-60`}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {inviteOpen && (
        <InviteModal
          scriptId={scriptId}
          dark={dark}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => onInviteSuccess?.()}
        />
      )}
    </div>
  );
}
