import { useMemo, useState } from "react";
import ScreenplayEditor from "./ScreenplayEditor";
import ScreenplayElementBar from "./ScreenplayElementBar";
import PresenceAvatars from "./PresenceAvatars";
import Corkboard from "./Corkboard";
import ReportsPanel from "./ReportsPanel";
import InviteModal from "../collab/InviteModal";
import { getScenes, DOC_SCENE_ID } from "./sceneIdentity";

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
  wordsPerPage = 250,
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
}) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [centerView, setCenterView] = useState("page"); // "page" | "cards"
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

  const topComments = comments.filter((c) => !c.parentId);
  const repliesOf = (id) => comments.filter((c) => String(c.parentId) === String(id));
  const openCount = topComments.filter((c) => !c.resolved).length;
  const filteredComments = topComments.filter((c) => {
    if (commentFilter === "open") return !c.resolved;
    if (commentFilter === "resolved") return c.resolved;
    if (commentFilter === "mine") return String(c.authorId) === String(myUserId);
    return true;
  });

  const desk = dark ? "#0a0f17" : "#ece9e3";
  const barCls = dark ? "bg-[#080f1a] border-[#182840]" : "bg-white border-gray-200";
  const railCls = dark ? "bg-[#0b1320] border-[#182840]" : "bg-[#f6f5f2] border-gray-200";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const divider = dark ? "bg-[#182840]" : "bg-gray-200";

  const iconBtn = `w-9 h-9 inline-flex items-center justify-center rounded-lg transition ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`;
  const actionBtn = `px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition ${dark ? "border-[#22364f] text-gray-300 hover:bg-white/[0.06] hover:border-[#2f4a6e]" : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"}`;
  const dividerCls = `w-px h-6 shrink-0 ${divider}`;

  // A header panel button toggles its section: opening the right panel to that single section, or
  // closing the panel if it's already showing that section. The active section gets a filled state.
  const panelActive = (tab) => rightOpen && rightTab === tab;
  const togglePanel = (tab) => {
    if (rightOpen && rightTab === tab) { setRightOpen(false); return; }
    setRightTab(tab);
    setRightOpen(true);
  };
  const panelBtnCls = (tab) => `px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition ${panelActive(tab)
    ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
    : (dark ? "border-[#22364f] text-gray-300 hover:bg-white/[0.06] hover:border-[#2f4a6e]" : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300")}`;
  // Title shown in the single-section panel header.
  const panelTitle = { people: "People", comments: "Comments", reports: "Reports", outline: "Outline" }[rightTab] || "";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: desk }}>
      {/* ── Primary top toolbar: view + collaboration + file actions ──────── */}
      <div className={`h-14 shrink-0 flex items-center gap-3 px-4 border-b ${barCls}`}>
        <button onClick={() => setLeftOpen((o) => !o)} className={iconBtn} title="Toggle scene list">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
        </button>

        <span className={dividerCls} />

        {/* Page ⇄ Cards toggle — same script, two representations (Phase 4 §2.1) */}
        <div className={`flex items-center rounded-xl p-1 ${dark ? "bg-white/[0.05]" : "bg-gray-100"}`}>
          {[["page", "Page"], ["cards", "Cards"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => { setCenterView(id); if (id === "page") requestAnimationFrame(() => apiRef?.current?.requestMeasure?.()); }}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition ${centerView === id
                ? (dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-white text-gray-800 shadow-sm")
                : `${muted} hover:${dark ? "text-gray-300" : "text-gray-600"}`}`}>
              {label}
            </button>
          ))}
        </div>

        {title && (
          <span className={`text-[13px] font-medium truncate max-w-[280px] max-[900px]:hidden ${dark ? "text-gray-300" : "text-gray-700"}`}>{title}</span>
        )}

        {/* RIGHT GROUP — collaboration + file / mode actions, in clear clusters */}
        <div className="ml-auto flex items-center gap-2.5">
          {people.length > 0 && (
            <>
              <PresenceAvatars people={people} dark={dark} onClick={() => togglePanel("people")} />
              <span className={dividerCls} />
            </>
          )}

          {/* File cluster */}
          <button type="button" onClick={onImport} className={actionBtn}>Import</button>
          <div className="relative">
            <button type="button" onClick={() => setExportMenuOpen((o) => !o)} disabled={Boolean(exporting)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border transition disabled:opacity-50 ${dark ? "bg-[#1e3a5f] border-[#2a4a6a] text-white hover:bg-[#244873]" : "bg-[#1e3a5f] border-[#1e3a5f] text-white hover:bg-[#244873]"}`}>
              {exporting ? "Exporting…" : "Export"}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-xl z-50 py-1.5 text-[13px] ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
                  {[["pdf", "PDF"], ["pdf-wm", "Watermarked PDF"], ["fountain", "Fountain"], ["fdx", "Final Draft (.fdx)"]].map(([kind, label]) => (
                    <button key={kind} type="button" onClick={() => { setExportMenuOpen(false); onExport?.(kind); }}
                      className={`w-full text-left px-4 py-2.5 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>{label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={onOpenHistory} className={actionBtn}>History</button>

          <span className={dividerCls} />

          {/* Panel cluster — each toggles the single-section right panel */}
          <button type="button" onClick={() => togglePanel("reports")} className={panelBtnCls("reports")}>Reports</button>
          <button type="button" onClick={() => togglePanel("outline")} className={panelBtnCls("outline")}>Outline</button>
          <button onClick={() => togglePanel("comments")}
            className={`${iconBtn} relative ${panelActive("comments") ? "bg-[#1e3a5f] text-white" : ""}`} title="Comments">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            {openCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#d6a93a] text-white text-[9px] font-bold flex items-center justify-center">{openCount}</span>}
          </button>
          <span className={dividerCls} />

          <button type="button" onClick={onExit}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition ${dark ? "border-[#22364f] text-gray-200 hover:bg-white/[0.06]" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
            title="Exit focus mode (Esc)">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
            Exit
          </button>
        </div>
      </div>

      {/* ── Secondary bar: element types + inline emphasis on their own row ── */}
      {centerView === "page" && (
        <div className={`shrink-0 flex items-center gap-3 px-4 py-1.5 border-b ${barCls}`}>
          <ScreenplayElementBar currentElement={currentElement} onSetElement={onSetElement} dark={dark} />
          <span className={dividerCls} />
          {/* Fountain inline emphasis — wraps the selection with *italic* / **bold** / _underline_.
              Plain-text markers, so the classifier/export are unaffected. */}
          <div className="flex items-center gap-0.5">
            {[
              ["bold", "Bold", "B", "font-bold"],
              ["italic", "Italic", "I", "italic font-serif"],
              ["underline", "Underline", "U", "underline"],
            ].map(([kind, title, glyph, cls]) => (
              <button key={kind} type="button" onMouseDown={(e) => { e.preventDefault(); onEmphasis?.(kind); }}
                title={`${title}`}
                className={`w-8 h-8 inline-flex items-center justify-center rounded-md text-[13px] ${cls} transition ${dark ? "text-gray-300 hover:bg-white/[0.06]" : "text-gray-600 hover:bg-gray-100"}`}>
                {glyph}
              </button>
            ))}
          </div>
          <span className={dividerCls} />
          <span className={`text-[11px] ${muted} max-[1100px]:hidden`}>Press <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${dark ? "border-[#22364f] bg-white/[0.04]" : "border-gray-200 bg-gray-50"}`}>Enter</kbd> for next element · <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${dark ? "border-[#22364f] bg-white/[0.04]" : "border-gray-200 bg-gray-50"}`}>Tab</kbd> to cycle</span>
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
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#1e3a5f] text-white hover:bg-[#244873]">Release it</button>
            <button type="button" onClick={() => onDismissEditRequest?.()}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${dark ? "border-[#2a4a6a] text-gray-300 hover:bg-white/[0.06]" : "border-amber-300 text-amber-800 hover:bg-amber-100"}`}>Keep editing</button>
          </div>
        </div>
      )}

      {/* ── Three columns ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — scene navigator */}
        {leftOpen && (
          <aside className={`w-[288px] shrink-0 border-r overflow-y-auto ${railCls}`}>
            <div className={`px-5 pt-5 pb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] ${muted}`}>
              <span>Scenes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${dark ? "bg-white/[0.06] text-gray-400" : "bg-gray-200/70 text-gray-500"}`}>{sceneCount}</span>
            </div>
            {outline.length === 0 ? (
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
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dark ? "bg-[#1c2a3a]" : "bg-gray-300"}`} />
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
            <div className="flex justify-center py-12 max-[640px]:py-6 px-6">
              <div className={`w-full max-w-[820px] rounded-sm shadow-2xl ring-1 ${dark ? "bg-[#111827] ring-white/[0.04]" : "bg-white ring-black/[0.04]"}`}>
                {title && (
                  <div className={`px-[4rem] max-[640px]:px-4 pt-8 text-[12px] font-mono ${muted}`}>{title}</div>
                )}
                <ScreenplayEditor
                  value={value}
                  onChange={onChange}
                  onElementChange={onElementChange}
                  onCaretLine={onCaretLine}
                  locks={locks}
                  myUserId={myUserId}
                  onRequestEdit={onRequestEdit}
                  comments={comments}
                  focusedCommentId={focusedCommentId}
                  onAddComment={canComment ? onAddComment : undefined}
                  readOnly={!canEdit}
                  apiRef={apiRef}
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
              <div className="overflow-y-auto py-2">
                {/* Invite collaborator */}
                <div className="px-3 pb-2">
                  <button type="button" onClick={() => setInviteOpen(true)} disabled={!scriptId}
                    title={scriptId ? "Invite a collaborator" : "Save the project first to invite collaborators"}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px] font-bold transition disabled:opacity-50 ${dark ? "bg-[#1e3a5f] text-white hover:bg-[#244873]" : "bg-[#1e3a5f] text-white hover:bg-[#244873]"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    Invite collaborator
                  </button>
                  {!scriptId && <p className={`mt-1.5 text-[11px] leading-relaxed ${muted}`}>Save the project once to enable invites.</p>}
                </div>
                {people.length === 0 ? (
                  <p className={`px-5 py-3 text-[12.5px] leading-relaxed italic ${muted}`}>No one else is here yet. Invite a collaborator to see them appear live.</p>
                ) : people.map((p) => {
                  const isYou = String(p.userId) === String(myUserId);
                  return (
                    <div key={p.userId} className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg ${dark ? "hover:bg-white/[0.04]" : "hover:bg-white"}`}>
                      <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-[12px] font-bold ring-2 ring-white/20" style={{ backgroundColor: p.color }}>
                        {(p.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-semibold truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>{p.name}{isYou ? " (you)" : ""}</p>
                        <p className={`text-[11.5px] truncate ${muted}`}>{p.state === "editing" ? "Editing" : "Viewing"}{p.sceneHeading ? ` · ${p.sceneHeading}` : ""}</p>
                      </div>
                    </div>
                  );
                })}
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
                      className={`w-full px-3 py-2.5 rounded-lg text-[13px] leading-relaxed outline-none border resize-none focus:ring-2 focus:ring-[#1e3a5f]/30 ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200 placeholder:text-gray-600" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"}`} />
                    <div className="flex justify-end mt-2">
                      <button type="button" disabled={!newCommentBody.trim()}
                        onClick={async () => { const ok = await onAddComment?.(newCommentBody.trim()); if (ok) setNewCommentBody(""); }}
                        className="px-4 py-2 rounded-lg text-[12px] font-bold bg-[#1e3a5f] text-white hover:bg-[#244873] disabled:opacity-40">Comment</button>
                    </div>
                  </div>
                )}

                {/* Filter */}
                <div className="flex items-center gap-1.5 px-4 py-3 text-[10px]">
                  {[["open", "Open"], ["resolved", "Resolved"], ["mine", "Mine"]].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setCommentFilter(id)}
                      className={`px-2.5 py-1.5 rounded-full font-bold uppercase tracking-wide transition ${commentFilter === id
                        ? "bg-[#1e3a5f] text-white"
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
                              className={`text-[10px] font-bold ${dark ? "text-blue-300" : "text-[#1e3a5f]"}`}>Reply</button>
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
                              className={`flex-1 px-2 py-1.5 rounded-md text-[12px] outline-none border ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200" : "bg-white border-gray-200 text-gray-800"}`} />
                            <button type="button" disabled={!replyBody.trim()}
                              onClick={async () => { await onReplyComment?.(c._id, replyBody.trim()); setReplyBody(""); setReplyFor(null); }}
                              className="px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[#1e3a5f] text-white disabled:opacity-40">Send</button>
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
                wordsPerPage={wordsPerPage}
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
                  className={`flex-1 mx-4 mb-4 resize-none rounded-xl px-4 py-3 text-[13.5px] leading-relaxed outline-none border focus:ring-2 focus:ring-[#1e3a5f]/30 ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200 placeholder:text-gray-600" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"} disabled:opacity-60`}
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
