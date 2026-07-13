import { Link } from "react-router-dom";
import { useCreateProject } from "./CreateProjectContext";
import { STEPS, CP_ACCENT } from "./constants";
import { cpIconBtnStyle, cpMoreMenuStyle, cpMoreItemStyle, cpZoomBtnStyle } from "./editorStyles";

/* The single, persistent Create Project chrome. It owns the compact header, the
   "Project setup" step navigator (a left rail on desktop, a horizontal stepper on
   phones), the plan/error banners, and the one pinned footer with Back / Next /
   Submit. Every step body (Write + the four form steps) renders as {children}
   inside the scrolling middle column, so navigation lives in exactly one place.
   Everything is read from CreateProjectContext — this component holds no state. */

const CreateProjectShell = ({ children }) => {
  const {
    adjustZoom, charCount, creationBlocked, dark, detailsStep, detailsSubSteps, drafts, editorZoom, enforceGoldPlan,
    error, estimatedPages, exportMenuOpen, exportingScreenplay, handleBack, handleExitEditor,
    handleExportScreenplay, handleNext, handlePublish, isScreenplayFormat, lastSaved, legal,
    loading, saved, saving, screenplayEnabled, screenplayFileInputRef,
    scriptLimit, setError, setDetailsStep, setExportMenuOpen, setFocusMode, setScreenplayEnabled, setShowDrafts,
    setShowVersionHistory, setSaved, setStep, setTitle, step, title, toggleDarkMode,
    useScreenplayEditor, currentElement, wordCount,
  } = useCreateProject();

  const activeStep = STEPS[step - 1];
  const isWrite = step === 1;
  const isDetails = step === 2;
  // The Details sub-panel's label, appended to the breadcrumb so the crumb tracks
  // the mini-wizard the same way it tracks the top-level steps.
  const detailsCrumb = isDetails ? detailsSubSteps[detailsStep]?.label : null;
  // Jump straight to an already-completed step from the rail / mobile stepper.
  // Mirrors handleBack by clearing any stale validation error on the way; landing
  // on Details always starts at its first sub-panel.
  const goToStep = (num) => { setStep(num); setError(""); if (num === 2) setDetailsStep(0); };

  return (
    <div className="ckcp-shell" data-theme={dark ? "dark" : "light"} style={{ display: "flex", flexDirection: "column" }}>

      {/* ───────── COMPACT HEADER ───────── */}
      <div className="ckcp-head" style={{ flex: "none", display: "flex", alignItems: "center", gap: "12px", padding: "0 2px 10px", flexWrap: "wrap" }}>
        <button type="button" aria-label="Exit" onClick={handleExitEditor} className="ckcp-backbtn"
          style={{ flex: "none", width: "30px", height: "30px", borderRadius: "50%", border: `1px solid ${dark ? "#2a2a2a" : "#ececec"}`, background: dark ? "#161616" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: dark ? "#f2f2f2" : "#111111" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
        </button>
        <div style={{ flex: "1", minWidth: "160px", display: "flex", alignItems: "baseline", gap: "10px" }}>
          <input type="text" className="ckcp-page-title" placeholder="Untitled project" value={title}
            onChange={e => { setTitle(e.target.value); setSaved(false); }}
            style={{ minWidth: 0, flex: "1 1 auto", border: "none", background: "transparent", fontFamily: "var(--ckcp-font-display)", fontWeight: 600, fontSize: "18px", letterSpacing: ".2px", color: dark ? "#f2f2f2" : "#111111", padding: 0 }} />
          <span className="ckcp-crumb" style={{ flex: "none", whiteSpace: "nowrap", fontSize: "11.5px", fontWeight: 500, letterSpacing: ".2px", color: "#9a9a9a" }}>
            Create Project&nbsp;/&nbsp;<span style={{ color: "#767676" }}>Step {step} · {activeStep?.label}{detailsCrumb ? ` · ${detailsCrumb}` : ""}</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "none" }}>
          {/* Save indicator (moved here from the old outer header). */}
          {saving && <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: dark ? "#8a8a8a" : "#9a9a9a", whiteSpace: "nowrap", marginRight: "2px" }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} className="animate-pulse" />Saving…</span>}
          {saved && !saving && <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: dark ? "#4ade80" : "#15803d", whiteSpace: "nowrap", marginRight: "2px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>check</span>Saved{lastSaved ? ` ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>}

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

          {/* Editor-only controls — writing step only. */}
          {isWrite && (
            <>
              <div className="ckcp-vr" style={{ width: "1px", height: "20px", background: dark ? "#2a2a2a" : "#eeeeee", margin: "0 3px" }} />
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
            </>
          )}

          <button type="button" aria-label="Toggle theme" title="Toggle light / dark" onClick={toggleDarkMode} className="ckcp-iconbtn" style={cpIconBtnStyle(dark)}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{dark ? "light_mode" : "dark_mode"}</span>
          </button>

          {isWrite && (
            <button type="button" onClick={() => setFocusMode(true)} className="ckcp-solid" title="Full-screen distraction-free writing"
              style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", border: "none", borderRadius: "9px", background: dark ? "#f2f2f2" : "#111111", color: dark ? "#111" : "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>fullscreen</span>Focus
            </button>
          )}
        </div>
      </div>

      {/* ───────── WORKSPACE (rail + main column) ───────── */}
      <div className="ckcp-workspace" style={{ display: "flex", border: `1px solid ${dark ? "#262626" : "#f0f0f0"}`, borderRadius: "14px", overflow: "hidden" }}>

        {/* Left "Project setup" rail — the single step navigator (desktop / tablet). */}
        <div className="ckcp-scroll ckcp-rail" style={{ width: "158px", flex: "none", background: dark ? "#141414" : "#fafafa", borderRight: `1px solid ${dark ? "#262626" : "#f0f0f0"}`, padding: "22px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: ".4px", color: "#b3b3b3", marginBottom: "18px" }}>Project setup</div>
          {STEPS.map((s, i) => {
            const active = s.num === step;
            const clickable = s.num < step;
            return (
              <div key={s.num} style={{ display: "flex", flexDirection: "column" }}>
                <button type="button" onClick={() => clickable && goToStep(s.num)} disabled={!clickable}
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

        {/* Main column */}
        <div className="ckcp-main" style={{ flex: "1", minWidth: 0, display: "flex", flexDirection: "column", background: dark ? "#0f0f0f" : "#ffffff" }}>

          {/* Compact horizontal stepper — phones only (rail is hidden there). */}
          <div className="ckcp-mobstepper" style={{ display: "none", flex: "none", alignItems: "center", gap: "6px", padding: "12px 14px", borderBottom: `1px solid ${dark ? "#262626" : "#f0f0f0"}`, overflowX: "auto" }}>
            {STEPS.map((s, i) => {
              const active = s.num === step;
              const done = s.num < step;
              return (
                <div key={s.num} style={{ display: "flex", alignItems: "center", flex: "none" }}>
                  <button type="button" onClick={() => done && goToStep(s.num)} disabled={!done}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", padding: "2px 2px", cursor: done ? "pointer" : "default" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, fontFamily: "var(--ckcp-font-display)", background: active ? CP_ACCENT : (done ? (dark ? "#1f1f1f" : "#efefef") : "transparent"), color: active ? "#fff" : (dark ? "#7a7a7a" : "#9a9a9a"), border: active ? "none" : `1px solid ${dark ? "#2a2a2a" : "#e4e4e4"}` }}>{s.num}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", color: active ? (dark ? "#f2f2f2" : "#111111") : "#9a9a9a" }}>{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <span style={{ width: "14px", height: "1px", background: dark ? "#2a2a2a" : "#e4e4e4", margin: "0 4px", flex: "none" }} />}
                </div>
              );
            })}
          </div>

          {/* Banner slot — plan-limit gate + inline errors, pinned above the body. */}
          {(creationBlocked || error) && (
            <div style={{ flex: "none", padding: "12px 16px 0" }}>
              {creationBlocked && (
                <div className={`rounded-2xl border p-4 flex items-start gap-3.5 ${dark ? "border-amber-500/25 bg-amber-500/[0.08]" : "border-amber-200 bg-amber-50"}`}>
                  <svg className={`w-6 h-6 shrink-0 mt-0.5 ${dark ? "text-amber-400" : "text-amber-500"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${dark ? "text-amber-300" : "text-amber-800"}`}>
                      You've reached your {scriptLimit?.plan === "free" ? "Free plan" : "plan"} limit of {scriptLimit?.limit} script{scriptLimit?.limit > 1 ? "s" : ""}.
                    </p>
                    <p className={`text-[13px] mt-0.5 ${dark ? "text-amber-200/80" : "text-amber-700"}`}>
                      You already have {scriptLimit?.used} published {scriptLimit?.used === 1 ? "script" : "scripts"}. Upgrade your plan to create another — you can't proceed until then.
                    </p>
                    <Link to="/pricing" className={`inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 rounded-lg text-[13px] font-bold transition ${dark ? "bg-amber-400 text-[#1a1206] hover:bg-amber-300" : "bg-amber-500 text-white hover:bg-amber-600"}`}>
                      View plans &amp; upgrade
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </Link>
                  </div>
                </div>
              )}
              {error && (
                <div className={`ckcp-fade ${creationBlocked ? "mt-3 " : ""}px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex flex-wrap items-center justify-between gap-2`}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    <span>{error}</span>
                  </div>
                  {error.toLowerCase().includes("limit") && (
                    <button type="button" onClick={() => window.open("/pricing", "_blank")}
                      className="shrink-0 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm">
                      Get Plan
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Per-step body. The key={step} remounts on navigation so the CSS
              fade-in replays. Write returns its own toolbar+canvas (self-managed
              flex); form steps scroll inside a padded container while the chrome
              stays pinned. */}
          <div key={step} className="ckcp-body" style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
            {/* Write and Details both manage their own flex layout (a docked toolbar /
                sub-stepper + a fitted body), so they render straight into the column.
                The remaining form steps scroll inside a padded container. */}
            {isWrite || isDetails ? children : (
              <div className="ckcp-scroll ckcp-formscroll" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "24px 28px" }}>
                {children}
              </div>
            )}
          </div>

          {/* ───────── UNIFIED FOOTER ───────── */}
          <div className="ckcp-foot" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "12px 18px", borderTop: `1px solid ${dark ? "#262626" : "#f0f0f0"}`, flexWrap: "wrap" }}>
            {/* Left cluster — writing status + editor controls (Write step only). */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
              {isWrite && useScreenplayEditor && (
                <>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500, color: dark ? "#b0b0b0" : "#767676", whiteSpace: "nowrap" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: CP_ACCENT }} />
                    {(currentElement === "blank" || currentElement === "shot" ? "action" : currentElement).toUpperCase()}
                  </span>
                  <span style={{ fontSize: "12px", color: "#c7c7c7" }}>·</span>
                </>
              )}
              {isWrite && (
                <>
                  <span style={{ fontSize: "12px", color: "#9a9a9a", whiteSpace: "nowrap" }}>{wordCount} words</span>
                  <span style={{ fontSize: "12px", color: "#9a9a9a", whiteSpace: "nowrap" }}>{charCount.toLocaleString()} chars</span>
                  <span style={{ fontSize: "12px", color: "#8a8a8a", whiteSpace: "nowrap" }}>{estimatedPages} page{estimatedPages !== 1 ? "s" : ""}</span>
                </>
              )}
            </div>

            {isWrite && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: "none" }}>
                {useScreenplayEditor && (
                  <>
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
            )}

            {/* Right cluster — the single Back / Next / Submit navigation. */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "none" }}>
              <button type="button" onClick={handleBack} disabled={step === 1}
                style={{ height: "38px", padding: "0 16px", border: "none", borderRadius: "9px", background: "transparent", color: dark ? (step === 1 ? "#4a4a4a" : "#b0b0b0") : (step === 1 ? "#cfcfcf" : "#767676"), fontFamily: "inherit", fontWeight: 600, fontSize: "13px", cursor: step === 1 ? "default" : "pointer" }}>Back</button>
              {step < 5 ? (
                <button type="button" onClick={handleNext} disabled={creationBlocked} className="ckcp-solid"
                  title={creationBlocked ? "Upgrade your plan to create another script" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px", padding: "0 20px", border: "none", borderRadius: "9px", background: dark ? "#f2f2f2" : "#111111", color: dark ? "#111" : "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: "13px", cursor: creationBlocked ? "not-allowed" : "pointer", opacity: creationBlocked ? 0.4 : 1 }}>
                  Next<span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
                </button>
              ) : (
                <button type="button" onClick={handlePublish} disabled={loading || !legal.agreedToTerms || creationBlocked} className="ckcp-solid"
                  title={!legal.agreedToTerms ? "Accept the Submission Agreement to submit" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px", padding: "0 20px", border: "none", borderRadius: "9px", background: dark ? "#f2f2f2" : "#111111", color: dark ? "#111" : "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: "13px", cursor: (loading || !legal.agreedToTerms || creationBlocked) ? "not-allowed" : "pointer", opacity: (loading || !legal.agreedToTerms || creationBlocked) ? 0.4 : 1 }}>
                  {loading ? "Submitting…" : "Submit for Approval"}
                  {!loading && <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check</span>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectShell;
