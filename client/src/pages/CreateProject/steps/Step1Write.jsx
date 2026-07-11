import { useCreateProject } from "../CreateProjectContext";
import { EditorContent } from "@tiptap/react";
import ScreenplayEditor from "../../../components/screenplay/ScreenplayEditor";
import { TitlePageSheet } from "../../../components/screenplay/ScreenplayFocusMode";
import { CORE_ELEMENTS, MORE_ELEMENT_GROUPS, SCREENPLAY_ELEMENT_BAR } from "../../../components/screenplay/screenplayElements";
import EditorToolbar from "../components/EditorToolbar";
import { STEPS, CP_ELEMENT_GLYPH, CP_ACCENT } from "../constants";
import { PAGE_CONTENT_H, PAGE_MARGIN_Y } from "../lib/format";
import { cpElemBtnStyle, cpMoreMenuStyle, cpMoreItemStyle, cpFmtBtnStyle, cpIconBtnStyle, cpVrStyle, cpZoomBtnStyle } from "../editorStyles";

const Step1Write = () => {
  const {
    adjustZoom, canEditContent, charCount, collabLocks, collabMyUserId, collabRequestEdit, creationBlocked, currentElement, dark, drafts, editor, editorZoom, emphasisState, enforceGoldPlan, estimatedPages, exportMenuOpen, exportingScreenplay, focusMode, focusedCommentId, handleBack, handleCaretLine, handleDownloadMainContentPdf, handleExportScreenplay, handleImportScreenplayFile, handleNext, handleScreenplayChange, isScreenplayFormat, moreMenuOpen, navigate, saving, sceneComments, screenplayApiRef, screenplayEnabled, screenplayFileInputRef, screenplayValue, setCurrentElement, setEmphasisState, setExportMenuOpen, setFocusMode, setMoreMenuOpen, setSaved, setScreenplayEnabled, setShowDrafts, setShowTitlePageModal, setShowVersionHistory, setStep, setTitle, step, title, titlePage, titlePageActive, toggleDarkMode, useScreenplayEditor, wordCount,
  } = useCreateProject();

  return (
    <>
            {/* ── Step 1 · Write — ported from "Create Project.dc.html" (MAIN content
                only; the app's MainLayout owns the sidebar + navbar). Accent = Ckript
                red (#E5261A). Every control is wired to the pre-existing state/handlers;
                dark styling comes from the app's global dark mode via `data-theme`. ── */}
            <div className="ckcp-shell" data-theme={dark ? "dark" : "light"} style={{ display: "flex", flexDirection: "column" }}>

              {/* ───────── COMPACT HEADER (.ck-head) ───────── */}
              <div className="ckcp-head" style={{ flex: "none", display: "flex", alignItems: "center", gap: "12px", padding: "0 2px 10px", flexWrap: "wrap" }}>
                <button type="button" aria-label="Back" onClick={() => navigate(-1)} className="ckcp-backbtn"
                  style={{ flex: "none", width: "30px", height: "30px", borderRadius: "50%", border: `1px solid ${dark ? "#2a2a2a" : "#ececec"}`, background: dark ? "#161616" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: dark ? "#f2f2f2" : "#111111" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
                </button>
                <div style={{ flex: "1", minWidth: "160px", display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <input type="text" className="ckcp-page-title" placeholder="Untitled project" value={title}
                    onChange={e => { setTitle(e.target.value); setSaved(false); }}
                    style={{ minWidth: 0, flex: "1 1 auto", border: "none", background: "transparent", fontFamily: "var(--ckcp-font-display)", fontWeight: 600, fontSize: "18px", letterSpacing: ".2px", color: dark ? "#f2f2f2" : "#111111", padding: 0 }} />
                  <span className="ckcp-crumb" style={{ flex: "none", whiteSpace: "nowrap", fontSize: "11.5px", fontWeight: 500, letterSpacing: ".2px", color: "#9a9a9a" }}>
                    Create Project&nbsp;/&nbsp;<span style={{ color: "#767676" }}>Step {step} · {STEPS[step - 1]?.label}</span>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "none" }}>
                  <button type="button" onClick={() => setShowDrafts(true)} className="ckcp-chip"
                    title="Switch between your projects"
                    style={{ display: "flex", alignItems: "center", gap: "7px", height: "36px", padding: "0 13px", border: "none", borderRadius: "9px", background: dark ? "#1e1e1e" : "#f5f5f5", color: dark ? "#e8e8e8" : "#333333", fontFamily: "inherit", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>folder_open</span>
                    <span style={{ whiteSpace: "nowrap" }}>My Projects</span>
                    {drafts.length > 0 && <span style={{ color: "#9a9a9a", fontSize: "11px" }}>{drafts.length}</span>}
                  </button>
                  <button type="button" aria-label="History" title="Version history" onClick={() => setShowVersionHistory(true)} className="ckcp-iconbtn" style={cpIconBtnStyle(dark)}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>history</span>
                  </button>
                  <div className="ckcp-vr" style={cpVrStyle(dark)} />
                  <button type="button" aria-label="Import" title="Import a script — Fountain, Final Draft (.fdx), PDF, or Word (.docx)"
                    onClick={(e) => { if (enforceGoldPlan(e)) screenplayFileInputRef.current?.click(); }} className="ckcp-iconbtn" style={cpIconBtnStyle(dark)}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>file_upload</span>
                  </button>
                  <div style={{ position: "relative" }}>
                    <button type="button" aria-label="Export" title="Export — PDF, Watermarked PDF, Fountain, Final Draft"
                      onClick={() => setExportMenuOpen((o) => !o)} disabled={Boolean(exportingScreenplay)} className="ckcp-iconbtn" style={{ ...cpIconBtnStyle(dark), opacity: exportingScreenplay ? 0.5 : 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>file_download</span>
                    </button>
                    {exportMenuOpen && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setExportMenuOpen(false)} />
                        <div style={{ ...cpMoreMenuStyle(dark), left: "auto", right: 0, minWidth: "200px" }}>
                          {[["pdf", "PDF"], ["pdf-wm", "Watermarked PDF"], ["fountain", "Fountain"], ["fdx", "Final Draft (.fdx)"]].map(([kind, label]) => (
                            <button key={kind} type="button" onClick={() => handleExportScreenplay(kind)} style={cpMoreItemStyle(false, dark)}>
                              <span style={{ flex: "1", textAlign: "left" }}>{label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button type="button" aria-label="Toggle theme" title="Toggle light / dark" onClick={toggleDarkMode} className="ckcp-iconbtn" style={cpIconBtnStyle(dark)}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{dark ? "light_mode" : "dark_mode"}</span>
                  </button>
                  <button type="button" onClick={() => setFocusMode(true)} className="ckcp-solid" title="Full-screen distraction-free writing"
                    style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", border: "none", borderRadius: "9px", background: dark ? "#f2f2f2" : "#111111", color: dark ? "#111" : "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>fullscreen</span>Focus
                  </button>
                </div>
              </div>

              {/* ───────── EDITOR WORKSPACE (rail + editor column) ───────── */}
              <div className="ckcp-workspace" style={{ display: "flex", height: "calc(100vh - 230px)", minHeight: "600px", border: `1px solid ${dark ? "#262626" : "#f0f0f0"}`, borderRadius: "14px", overflow: "hidden" }}>

                {/* vertical step rail — bound to STEPS / step; only completed steps clickable */}
                <div className="ckcp-scroll ckcp-rail" style={{ width: "158px", flex: "none", background: dark ? "#141414" : "#fafafa", borderRight: `1px solid ${dark ? "#262626" : "#f0f0f0"}`, padding: "22px 16px", overflowY: "auto" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: ".4px", color: "#b3b3b3", marginBottom: "18px" }}>Project setup</div>
                  {STEPS.map((s, i) => {
                    const active = s.num === step;
                    const clickable = s.num < step;
                    return (
                      <div key={s.num} style={{ display: "flex", flexDirection: "column" }}>
                        <button type="button" onClick={() => clickable && setStep(s.num)} disabled={!clickable}
                          style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "transparent", border: "none", padding: 0, width: "100%", textAlign: "left", cursor: clickable ? "pointer" : "default" }}>
                          <div style={{ flex: "none", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ckcp-font-display)", fontSize: "12.5px", background: active ? CP_ACCENT : "transparent", color: active ? "#fff" : (dark ? "#5c5c5c" : "#bcbcbc") }}>{s.num}</div>
                          <div style={{ paddingTop: "1px" }}>
                            <div style={{ fontSize: "13.5px", fontWeight: 600, color: active ? (dark ? "#f2f2f2" : "#111111") : (dark ? "#7a7a7a" : "#9a9a9a") }}>{s.label}</div>
                            <div style={{ fontSize: "11px", color: "#9a9a9a", marginTop: "2px" }}>{s.desc}</div>
                          </div>
                        </button>
                        {i < STEPS.length - 1 && (
                          <div className="ckcp-conn" style={{ width: "1px", height: "20px", background: dark ? "#262626" : "#eeeeee", margin: "3px 0 3px 11px" }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* main editor column */}
                <div className="ckcp-editor" style={{ flex: "1", minWidth: 0, display: "flex", flexDirection: "column", background: dark ? "#0f0f0f" : "#ffffff" }}>

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
                  <div className="ckcp-scroll ckcp-canvas" style={{ flex: "1", minHeight: 0, overflowY: "auto", background: dark ? "#0b0b0b" : "#f5f5f5", padding: "32px 40px", position: "relative" }}>

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

                  {/* status footer + step nav */}
                  <div className="ckcp-foot" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "12px 18px", borderTop: `1px solid ${dark ? "#262626" : "#f0f0f0"}`, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
                      {useScreenplayEditor && (
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: dark ? "#b0b0b0" : "#767676", whiteSpace: "nowrap" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: CP_ACCENT }} />
                          {(currentElement === "blank" || currentElement === "shot" ? "action" : currentElement).toUpperCase()}
                        </span>
                      )}
                      {useScreenplayEditor && <span style={{ fontSize: "12px", color: "#c7c7c7" }}>·</span>}
                      <span style={{ fontSize: "12px", color: "#9a9a9a", whiteSpace: "nowrap" }}>{wordCount} words</span>
                      <span style={{ fontSize: "12px", color: "#9a9a9a", whiteSpace: "nowrap" }}>{charCount.toLocaleString()} chars</span>
                      <span style={{ fontSize: "12px", color: "#8a8a8a", whiteSpace: "nowrap" }}>{estimatedPages} page{estimatedPages !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: "none" }}>
                      {useScreenplayEditor && (
                        <>
                          <button type="button" onClick={() => screenplayApiRef.current?.insertPageBreak()} title="Insert page break" className="ckcp-hoverable"
                            style={{ display: "flex", alignItems: "center", gap: "5px", height: "32px", padding: "0 11px", border: "none", borderRadius: "8px", background: "transparent", color: dark ? "#b0b0b0" : "#767676", fontFamily: "inherit", fontWeight: 600, fontSize: "11.5px", cursor: "pointer" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>horizontal_rule</span>Page break
                          </button>
                          <div className="ckcp-vr" style={{ width: "1px", height: "18px", background: dark ? "#2a2a2a" : "#eeeeee", margin: "0 3px" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: "1px", flex: "none" }}>
                            <button type="button" onClick={() => adjustZoom(-1)} title="Zoom out" className="ckcp-hoverable" style={cpZoomBtnStyle(dark)}>
                              <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>remove</span>
                            </button>
                            <button type="button" onClick={() => adjustZoom(0)} title="Reset zoom to 100%" className="ckcp-hoverable"
                              style={{ minWidth: "46px", height: "30px", border: "none", borderRadius: "8px", background: "transparent", color: dark ? "#b0b0b0" : "#767676", fontFamily: "inherit", fontWeight: 600, fontSize: "11px", cursor: "pointer" }}>{Math.round(editorZoom * 100)}%</button>
                            <button type="button" onClick={() => adjustZoom(1)} title="Zoom in" className="ckcp-hoverable" style={cpZoomBtnStyle(dark)}>
                              <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>add</span>
                            </button>
                          </div>
                          <div className="ckcp-vr" style={{ width: "1px", height: "18px", background: dark ? "#2a2a2a" : "#eeeeee", margin: "0 3px" }} />
                        </>
                      )}
                      {isScreenplayFormat && (
                        <button type="button" onClick={() => setScreenplayEnabled((v) => !v)} title="Rich text (prose)"
                          style={{ display: "flex", alignItems: "center", gap: "6px", height: "26px", padding: "0 11px", borderRadius: "8px", fontFamily: "inherit", fontWeight: 600, fontSize: "11.5px", whiteSpace: "nowrap", flex: "none", cursor: "pointer", background: !screenplayEnabled ? CP_ACCENT : "transparent", color: !screenplayEnabled ? "#fff" : (dark ? "#b0b0b0" : "#767676"), border: `1px solid ${!screenplayEnabled ? CP_ACCENT : (dark ? "#2a2a2a" : "#ececec")}` }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>notes</span>Rich text (prose)
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "none" }}>
                      <button type="button" onClick={handleBack} disabled={step === 1}
                        style={{ height: "38px", padding: "0 16px", border: "none", borderRadius: "9px", background: "transparent", color: dark ? (step === 1 ? "#4a4a4a" : "#b0b0b0") : "#c7c7c7", fontFamily: "inherit", fontWeight: 600, fontSize: "13px", cursor: step === 1 ? "default" : "pointer" }}>Back</button>
                      <button type="button" onClick={handleNext} disabled={creationBlocked} className="ckcp-solid"
                        title={creationBlocked ? "Upgrade your plan to create another script" : undefined}
                        style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px", padding: "0 20px", border: "none", borderRadius: "9px", background: dark ? "#f2f2f2" : "#111111", color: dark ? "#111" : "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: "13px", cursor: creationBlocked ? "not-allowed" : "pointer", opacity: creationBlocked ? 0.4 : 1 }}>
                        Next<span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* hidden import input — preserved from the original wiring */}
              <input ref={screenplayFileInputRef} type="file" accept=".fountain,.txt,.fdx,.pdf,.docx,.doc,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" className="hidden" onChange={handleImportScreenplayFile} />

              {/* Prose-mode PDF download (no screenplay export flow in book mode). */}
              {!useScreenplayEditor && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 2px 0" }}>
                  <button onClick={handleDownloadMainContentPdf} disabled={saving}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${dark ? "border-[#2a2a2a] text-gray-400 hover:bg-white/[0.06] hover:text-white" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                    Download PDF
                  </button>
                </div>
              )}
            </div>
    </>
  );
};

export default Step1Write;
