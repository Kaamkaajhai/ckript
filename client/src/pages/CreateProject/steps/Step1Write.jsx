import { useCreateProject } from "../CreateProjectContext";
import { EditorContent } from "@tiptap/react";
import ScreenplayEditor from "../../../components/screenplay/ScreenplayEditor";
import { TitlePageSheet } from "../../../components/screenplay/ScreenplayFocusMode";
import { CORE_ELEMENTS, MORE_ELEMENT_GROUPS, SCREENPLAY_ELEMENT_BAR } from "../../../components/screenplay/screenplayElements";
import EditorToolbar from "../components/EditorToolbar";
import { CP_ELEMENT_GLYPH } from "../constants";
import { PAGE_CONTENT_H, PAGE_MARGIN_Y } from "../lib/format";
import { cpElemBtnStyle, cpMoreMenuStyle, cpMoreItemStyle, cpFmtBtnStyle } from "../editorStyles";

/* Step 1 · Write — the editor BODY only. The compact header, the "Project setup"
   rail, and the footer (status + nav) now live in CreateProjectShell, which wraps
   every step; this component renders just the insert toolbar and the page canvas
   so the shell's flex column can pin the chrome around it. */

const Step1Write = () => {
  const {
    canEditContent, collabLocks, collabMyUserId, collabRequestEdit,
    currentElement, dark, editor, editorZoom, emphasisState, focusMode, focusedCommentId,
    handleCaretLine, handleDownloadMainContentPdf, handleImportScreenplayFile, handleScreenplayChange,
    moreMenuOpen, sceneComments, screenplayApiRef, screenplayFileInputRef, screenplayValue,
    setCurrentElement, setEmphasisState, setMoreMenuOpen, setShowTitlePageModal, saving,
    titlePage, titlePageActive, useScreenplayEditor,
  } = useCreateProject();

  return (
    <>
      {/* docked insert / elements toolbar — screenplay only (prose uses TipTap) */}
      {useScreenplayEditor ? (
        <div className="ckcp-toolbar" style={{ flex: "none", display: "flex", alignItems: "center", gap: "8px", height: "52px", padding: "0 18px", borderBottom: `1px solid ${dark ? "#262626" : "#f0f0f0"}` }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "#b3b3b3", flex: "none" }}>Insert</span>
          <div className="ckcp-vr" style={{ width: "1px", height: "20px", background: dark ? "#2a2a2a" : "#eeeeee", margin: "0 4px", flex: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: "1", minWidth: 0, overflowX: "auto" }}>
            {CORE_ELEMENTS.map((el) => {
              const active = currentElement === el.value;
              return (
                <button key={el.value} type="button" onClick={() => screenplayApiRef.current?.setElementType(el.value)}
                  className="ckcp-hoverable" style={cpElemBtnStyle(active, dark)}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{CP_ELEMENT_GLYPH[el.value]}</span>{el.label}
                </button>
              );
            })}
            <div className="ckcp-vr" style={{ width: "1px", height: "18px", background: dark ? "#2a2a2a" : "#eeeeee", margin: "0 6px", flex: "none" }} />
            <div style={{ position: "relative", flex: "none" }}>
              <button type="button" onClick={() => setMoreMenuOpen((o) => !o)} className="ckcp-hoverable"
                style={{ display: "flex", alignItems: "center", gap: "4px", height: "32px", padding: "0 11px", border: "none", borderRadius: "8px", background: "transparent", color: dark ? "#9a9a9a" : "#8a8a8a", fontFamily: "inherit", fontWeight: 500, fontSize: "12.5px", cursor: "pointer" }}>
                More<span className="material-symbols-outlined" style={{ fontSize: "16px" }}>expand_more</span>
              </button>
              {moreMenuOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setMoreMenuOpen(false)} />
                  <div style={cpMoreMenuStyle(dark)}>
                    {MORE_ELEMENT_GROUPS.map((group, gi) => (
                      <div key={gi} style={gi > 0 ? { marginTop: "6px", paddingTop: "6px", borderTop: `1px solid ${dark ? "#262626" : "#f0f0f0"}` } : undefined}>
                        {group.map((el) => {
                          const active = currentElement === el.value;
                          return (
                            <button key={el.value} type="button"
                              onClick={() => { setMoreMenuOpen(false); screenplayApiRef.current?.setElementType(el.value); }}
                              style={cpMoreItemStyle(active, dark)}>
                              <span className="material-symbols-outlined" style={{ fontSize: "16px", opacity: 0.7 }}>{CP_ELEMENT_GLYPH[el.value]}</span>
                              <span style={{ flex: "1", textAlign: "left" }}>{el.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ flex: "1" }} />
            <span style={{ fontSize: "11px", color: "#b3b3b3", whiteSpace: "nowrap", flex: "none" }}>Enter · Tab to cycle</span>
          </div>
        </div>
      ) : (
        // Prose (book) mode keeps the full TipTap toolbar — those formats are valid because
        // book content is stored as HTML, not Fountain.
        <div style={{ flex: "none" }}>
          <EditorToolbar editor={editor} dark={dark} />
        </div>
      )}

      {/* page canvas — the REAL editor (no mock pages); scrolls internally like the DC */}
      <div className="ckcp-scroll ckcp-canvas" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", background: dark ? "#0b0b0b" : "#f5f5f5", padding: "32px 40px", position: "relative" }}>

        {/* Text-format pill — the DC's floating formatter, shown on selection and wired to the
            real screenplay API. onMouseDown+preventDefault keeps the selection alive. */}
        {useScreenplayEditor && !focusMode && emphasisState?.hasSelection && (
          <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", justifyContent: "center", marginBottom: "18px", pointerEvents: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "5px 7px", background: "#27272a", borderRadius: "9px", boxShadow: "0 12px 26px rgba(0,0,0,.3)", fontFamily: "var(--ckcp-font-body)", whiteSpace: "nowrap", pointerEvents: "auto" }}>
              <span style={{ padding: "0 8px", height: "26px", display: "inline-flex", alignItems: "center", gap: "4px", color: "#e4e4e7", fontSize: "11px", fontWeight: 600 }}>
                {(SCREENPLAY_ELEMENT_BAR.find((e) => e.value === currentElement)?.label) || "Action"}
              </span>
              <span style={{ width: "1px", height: "16px", background: "#52525b" }} />
              {[
                ["bold", "B", "Bold", { fontSize: "12px", fontWeight: 700 }],
                ["italic", "I", "Italic", { fontSize: "13px", fontStyle: "italic" }],
                ["underline", "U", "Underline", { fontSize: "12px", textDecoration: "underline" }],
                ["bolditalic", "BI", "Bold Italic", { fontSize: "10px", fontWeight: 700, fontStyle: "italic" }],
              ].map(([kind, glyph, label, extra]) => (
                <button key={kind} type="button" title={label}
                  onMouseDown={(e) => { e.preventDefault(); screenplayApiRef.current?.applyEmphasis(kind); }}
                  style={{ ...cpFmtBtnStyle(emphasisState?.active?.includes(kind)), ...extra }}>{glyph}</button>
              ))}
              <span style={{ width: "1px", height: "16px", background: "#52525b" }} />
              <button type="button" title="UPPERCASE" onMouseDown={(e) => { e.preventDefault(); screenplayApiRef.current?.applyCase("upper"); }} style={{ ...cpFmtBtnStyle(false), fontSize: "11px", fontWeight: 700 }}>AA</button>
              <button type="button" title="lowercase" onMouseDown={(e) => { e.preventDefault(); screenplayApiRef.current?.applyCase("lower"); }} style={{ ...cpFmtBtnStyle(false), fontSize: "11px", fontWeight: 700, textTransform: "lowercase" }}>aa</button>
              <span style={{ width: "1px", height: "16px", background: "#52525b" }} />
              <button type="button" title="Center line" onMouseDown={(e) => { e.preventDefault(); screenplayApiRef.current?.applyCentered(); }} style={cpFmtBtnStyle(emphasisState?.centered)}>
                <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>format_align_center</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ maxWidth: "660px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "22px" }}>
          {/* Title page as its own sheet above the script page (click to edit). */}
          {useScreenplayEditor && titlePageActive && (
            <TitlePageSheet fields={titlePage} hasTitlePage onEdit={() => setShowTitlePageModal(true)} dark={dark} />
          )}

          {/* The page sheet — DC's .ck-page look, but the CONTENT is the real editor. Real page
              breaks come from the editor itself; zoom is applied via the editor's `zoom` prop
              (no wrapper transform:scale). */}
          <div className="ckcp-page" style={{ position: "relative", width: "100%", background: dark ? "#181818" : "#ffffff", border: `1px solid ${dark ? "#262626" : "#ececec"}`, borderRadius: "3px", boxShadow: dark ? "0 2px 16px rgba(0,0,0,.45)" : "0 2px 16px rgba(28,26,23,.055)", minHeight: useScreenplayEditor ? PAGE_CONTENT_H : undefined, paddingTop: useScreenplayEditor ? PAGE_MARGIN_Y : 0, paddingBottom: useScreenplayEditor ? PAGE_MARGIN_Y : 0 }}>

            {useScreenplayEditor && (
              <span style={{ position: "absolute", top: "18px", right: "22px", zIndex: 6, fontSize: "12px", fontFamily: "'Courier Prime','Courier New',monospace", color: dark ? "#7a7a7a" : "#b3b3b3", userSelect: "none" }}>1.</span>
            )}

            {useScreenplayEditor && focusMode ? (
              <div style={{ position: "relative", zIndex: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "96px 0", fontSize: "14px", color: dark ? "#6b6b6b" : "#9a9a9a" }}>
                Editing in focus mode…
              </div>
            ) : useScreenplayEditor ? (
              <div style={{ position: "relative", zIndex: 0 }}>
                <ScreenplayEditor
                  value={screenplayValue}
                  onChange={handleScreenplayChange}
                  onElementChange={setCurrentElement}
                  onEmphasisStateChange={setEmphasisState}
                  onCaretLine={handleCaretLine}
                  locks={collabLocks}
                  myUserId={collabMyUserId}
                  onRequestEdit={collabRequestEdit}
                  comments={sceneComments}
                  focusedCommentId={focusedCommentId}
                  readOnly={!canEditContent}
                  apiRef={screenplayApiRef}
                  zoom={editorZoom}
                  dark={dark}
                />
              </div>
            ) : (
              <div className={`relative z-0 ${dark
                ? "[&_.tiptap]:text-gray-200 [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-700 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_h1]:text-white [&_.tiptap_h2]:text-gray-100 [&_.tiptap_blockquote]:border-[#1d3350] [&_.tiptap_blockquote]:text-gray-400 [&_.tiptap_code]:bg-white/[0.06] [&_.tiptap_pre]:bg-[#0a1220] [&_.tiptap_hr]:border-[#1e2a3a]"
                : "[&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-300 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_code]:bg-gray-100 [&_.tiptap_pre]:bg-gray-50 [&_.tiptap_blockquote]:border-gray-200 [&_.tiptap_hr]:border-gray-200 [&_.tiptap]:text-gray-900"}`}
                style={{ padding: "24px 40px" }}>
                <EditorContent editor={editor} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* hidden import input — preserved from the original wiring */}
      <input ref={screenplayFileInputRef} type="file" accept=".fountain,.txt,.fdx,.pdf,.docx,.doc,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="hidden" onChange={handleImportScreenplayFile} />

      {/* Prose-mode PDF download (no screenplay export flow in book mode). */}
      {!useScreenplayEditor && (
        <div style={{ flex: "none", display: "flex", justifyContent: "flex-end", padding: "10px 40px 4px" }}>
          <button onClick={handleDownloadMainContentPdf} disabled={saving}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${dark ? "border-[#2a2a2a] text-gray-400 hover:bg-white/[0.06] hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
            Download PDF
          </button>
        </div>
      )}
    </>
  );
};

export default Step1Write;
