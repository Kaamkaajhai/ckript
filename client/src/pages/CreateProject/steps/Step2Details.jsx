import { useCreateProject } from "../CreateProjectContext";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Film, CheckCircle2 } from "lucide-react";
import ScreenplayReadOnly from "../../../components/ScreenplayReadOnly";
import { filmFormats, publishingFormats, styleOptions, ROLE_GENDER_OPTIONS, CP_ACCENT } from "../constants";
import { getContentTypeFromFormat } from "../lib/format";

/* Step 2 · Details — a mini-wizard.
   The old step was one long scrolling form styled in the pre-shell blue/emerald
   palette. It is now a set of fitted panels that share the Write step's design
   language (via the .ckcp-* primitives in createProjectEditor.css) and are paged
   by the shell's own Back / Next footer. This file renders the docked sub-stepper
   plus whichever panel is active; each panel below reads what it needs straight
   from CreateProjectContext, so the panels stay small and independently testable.
   Which panels appear (and their order) comes from `detailsSubSteps`, derived in
   index.jsx from the active film/publishing track. */

/* Small helper: the page-count status tint, kept semantic (green / amber / accent)
   rather than folded into the neutral design tokens. */
const pageTint = (status, dark) =>
  status === "good"
    ? { fg: dark ? "#4ade80" : "#16a34a", bg: dark ? "rgba(34,197,94,.08)" : "#f0faf3", bd: dark ? "rgba(34,197,94,.2)" : "#d7ecdd" }
    : status === "short"
      ? { fg: dark ? "#fbbf24" : "#d97706", bg: dark ? "rgba(245,158,11,.08)" : "#fef7ec", bd: dark ? "rgba(245,158,11,.2)" : "#f6e6c9" }
      : { fg: CP_ACCENT, bg: dark ? "rgba(229,38,26,.08)" : "rgba(229,38,26,.05)", bd: dark ? "rgba(229,38,26,.2)" : "rgba(229,38,26,.15)" };

const AiIcon = () => (
  <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>auto_awesome</span>
);

/* ───────────────────────── Panel · Basics ───────────────────────── */
const PanelBasics = () => {
  const { formData, handleChange, targetFilm, estimatedPages, pageStatus, formatInfo, wordCount, dark } = useCreateProject();
  const tint = pageTint(pageStatus, dark);
  return (
    <>
      <div className="ckcp-dhead">
        <div>
          <h2 className="ckcp-dtitle">Project basics</h2>
          <p className="ckcp-dsub">Who wrote it and what format it is — this is how we categorize and price your project.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="ckcp-label">Writer <span className="ckcp-opt">Required</span></label>
          <input type="text" name="writer" value={formData.writer} onChange={handleChange} placeholder="Writer's name" className="ckcp-input" />
        </div>
        <div>
          <label className="ckcp-label">Company name <span className="ckcp-opt">Optional</span></label>
          <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company name" className="ckcp-input" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="ckcp-label">Format <span className="ckcp-opt">Required</span></label>
          <select name="format" value={formData.format} onChange={handleChange} className="ckcp-input">
            {(targetFilm ? filmFormats : publishingFormats).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        {targetFilm && (
          <div>
            <label className="ckcp-label">Style (medium) <span className="ckcp-opt">Optional</span></label>
            <select name="styleMedium" value={formData.styleMedium} onChange={handleChange} className="ckcp-input">
              <option value="">Select style…</option>
              {styleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {targetFilm && (
        <div className="ckcp-card">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontFamily: "var(--ckcp-font-display)", fontSize: "34px", fontWeight: 700, lineHeight: 1, color: tint.fg, flex: "none" }}>{estimatedPages}</span>
            <div style={{ minWidth: 0 }}>
              <p className="ckcp-card-h">Estimated length · {formatInfo.label}</p>
              <p className="ckcp-card-p">
                Typical range {formatInfo.typical} pages · {getContentTypeFromFormat(formData.format) !== "book" ? "line-based, ~55 lines/page (matches export)" : `auto-calculated from ${wordCount} words`}
              </p>
            </div>
          </div>
          <div style={{ marginTop: "12px", padding: "9px 12px", borderRadius: "10px", fontSize: "11.5px", lineHeight: 1.5, background: tint.bg, border: `1px solid ${tint.bd}`, color: tint.fg }}>
            {pageStatus === "good"
              ? "Your script length looks good for this format."
              : pageStatus === "short"
                ? "Your script is shorter than typical — that's fine for early drafts, keep writing!"
                : "Your script exceeds the typical range. Consider trimming or changing the format."}
          </div>
        </div>
      )}
    </>
  );
};

/* ───────────────────────── Panel · Story ───────────────────────── */
const PanelStory = () => {
  const { formData, handleChange, targetFilm, handleGenerateMetadata, metaLoadingField, metaNotice, tagsInput, setTagsInput } = useCreateProject();
  return (
    <>
      <div className="ckcp-dhead">
        <div>
          <h2 className="ckcp-dtitle">Story</h2>
          <p className="ckcp-dsub">The pitch buyers read first. Write it yourself, or generate a starting draft with AI and refine.</p>
        </div>
      </div>

      {targetFilm && (
        <div>
          <div className="ckcp-label">
            <span>Logline <span className="ckcp-opt">Required · {formData.logline.length}/500</span></span>
            <button type="button" onClick={() => handleGenerateMetadata("logline")} disabled={Boolean(metaLoadingField)} className="ckcp-aibtn">
              <AiIcon />{metaLoadingField === "logline" ? "Generating…" : "Generate"}
            </button>
          </div>
          <textarea name="logline" value={formData.logline} onChange={handleChange} rows={3} maxLength={500} placeholder="A one-sentence summary of your story…" className="ckcp-input" />
          {metaNotice.field === "logline" && <p className="ckcp-card-p" style={{ marginTop: "6px" }}>{metaNotice.text}</p>}
        </div>
      )}

      <div className="ckcp-grow">
        <div className="ckcp-label">
          <span>Synopsis <span className="ckcp-opt">Required</span></span>
          <button type="button" onClick={() => handleGenerateMetadata("synopsis")} disabled={Boolean(metaLoadingField)} className="ckcp-aibtn">
            <AiIcon />{metaLoadingField === "synopsis" ? "Generating…" : "Generate"}
          </button>
        </div>
        <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} placeholder="A longer synopsis of your script…" className="ckcp-input" />
        {metaNotice.field === "synopsis" && <p className="ckcp-card-p" style={{ marginTop: "6px" }}>{metaNotice.text}</p>}
      </div>

      <div>
        <label className="ckcp-label">Tags <span className="ckcp-opt">Optional</span></label>
        <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. heist, ensemble, twist ending" className="ckcp-input" />
      </div>
    </>
  );
};

/* ───────────────────────── Panel · Cast ───────────────────────── */
const PanelCast = () => {
  const { roles, addRole, removeRole, updateRoleField, updateRoleAge, handleGenerateMetadata, metaLoadingField, metaNotice } = useCreateProject();
  return (
    <>
      <div className="ckcp-dhead">
        <div>
          <h2 className="ckcp-dtitle">Cast &amp; roles</h2>
          <p className="ckcp-dsub">The roles you're casting, with demographics and creative direction. Leave empty if you're not casting yet.</p>
          {metaNotice.field === "roles" && <p className="ckcp-card-p" style={{ marginTop: "6px" }}>{metaNotice.text}</p>}
        </div>
        <div style={{ display: "flex", gap: "8px", flex: "none" }}>
          <button type="button" onClick={() => handleGenerateMetadata("roles")} disabled={Boolean(metaLoadingField)} className="ckcp-aibtn">
            <AiIcon />{metaLoadingField === "roles" ? "Generating…" : "Suggest"}
          </button>
          <button type="button" onClick={addRole} className="ckcp-ghostbtn">
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>add</span>Add role
          </button>
        </div>
      </div>

      {roles.length === 0 ? (
        <div className="ckcp-card" style={{ borderStyle: "dashed", textAlign: "center", padding: "28px", color: "#9a9a9a", fontSize: "12.5px" }}>
          No roles added yet. Add one, or let AI suggest a starting cast from your script.
        </div>
      ) : (
        <div className="ckcp-growscroll ckcp-scroll" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {roles.map((role, idx) => (
            <div key={`role-${idx}`} className="ckcp-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "11px" }}>
                <p className="ckcp-card-h">Role {idx + 1}</p>
                <button type="button" onClick={() => removeRole(idx)} className="ckcp-ghostbtn is-danger">Remove</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={role.characterName} onChange={(e) => updateRoleField(idx, "characterName", e.target.value)} placeholder="Character name" className="ckcp-input" />
                <input type="text" value={role.type} onChange={(e) => updateRoleField(idx, "type", e.target.value)} placeholder="Archetype (e.g. Lead, Antagonist)" className="ckcp-input" />
                <select value={role.gender} onChange={(e) => updateRoleField(idx, "gender", e.target.value)} className="ckcp-input">
                  {ROLE_GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" placeholder="Min age" value={role.ageRange?.min ?? ""} onChange={(e) => updateRoleAge(idx, "min", e.target.value)} className="ckcp-input" />
                  <input type="number" min="0" placeholder="Max age" value={role.ageRange?.max ?? ""} onChange={(e) => updateRoleAge(idx, "max", e.target.value)} className="ckcp-input" />
                </div>
              </div>
              <textarea rows={2} value={role.description} onChange={(e) => updateRoleField(idx, "description", e.target.value)} placeholder="Performance notes, emotional range, or casting vibe…" className="ckcp-input" style={{ marginTop: "10px" }} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ───────────────────────── Panel · Market (publishing) ───────────────────────── */
const PanelMarket = () => {
  const { publishingDetails, setPublishingDetails, handleProseClick, proseLoading } = useCreateProject();
  const toggle = (field, value) => setPublishingDetails((prev) => {
    const curr = prev[field] || [];
    return { ...prev, [field]: curr.includes(value) ? curr.filter((x) => x !== value) : [...curr, value] };
  });
  return (
    <>
      <div className="ckcp-dhead">
        <div>
          <h2 className="ckcp-dtitle">Market positioning</h2>
          <p className="ckcp-dsub">Metadata publishers use to place your manuscript. All optional but recommended.</p>
        </div>
      </div>

      <div>
        <label className="ckcp-label">Target audience</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {["Young Adult", "Adult", "Mass Market", "Niche / Literary"].map((f) => (
            <button key={f} type="button" onClick={() => toggle("targetAudience", f)} className={`ckcp-chip2${publishingDetails.targetAudience?.includes(f) ? " is-on" : ""}`}>{f}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="ckcp-label">Writing style <span className="ckcp-opt">Optional</span></label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {["Descriptive", "Dialogue-driven", "Literary", "Commercial"].map((f) => (
            <button key={f} type="button" onClick={() => toggle("writingStyle", f)} className={`ckcp-chip2${publishingDetails.writingStyle?.includes(f) ? " is-on" : ""}`}>{f}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="ckcp-label">Estimated book length <span className="ckcp-opt">Optional</span></label>
        <input type="text" value={publishingDetails.estimatedWordCount} onChange={(e) => setPublishingDetails((p) => ({ ...p, estimatedWordCount: e.target.value }))} placeholder="e.g. 60,000 – 90,000 words" className="ckcp-input" />
      </div>

      <div className="ckcp-card ckcp-grow">
        <label className="ckcp-label">Series potential</label>
        <select value={publishingDetails.seriesPotential} onChange={(e) => setPublishingDetails((p) => ({ ...p, seriesPotential: e.target.value }))} className="ckcp-input">
          <option value="">Select potential…</option>
          <option value="Standalone">Standalone</option>
          <option value="Trilogy">Trilogy</option>
          <option value="Multi-part universe">Multi-part universe</option>
        </select>

        <div className="ckcp-label" style={{ marginTop: "16px" }}>
          <span>Prose sample <span className="ckcp-opt">Novel-formatted excerpt</span></span>
          <button type="button" onClick={handleProseClick} disabled={proseLoading} className="ckcp-aibtn"><AiIcon />{proseLoading ? "Generating…" : "AI prose"}</button>
        </div>
        <textarea value={publishingDetails.proseSample || ""} onChange={(e) => setPublishingDetails((p) => ({ ...p, proseSample: e.target.value }))} placeholder="A sample chapter or converted prose excerpt to demonstrate the writing quality…" className="ckcp-input" style={{ fontFamily: "var(--ckcp-font-display)" }} />
      </div>
    </>
  );
};

/* ───────────────────────── Panel · Progress ───────────────────────── */
const PanelProgress = () => {
  const { formData, setFormData, handleChange } = useCreateProject();
  const options = [
    { value: "complete", label: "Fully written", desc: "All parts are done and ready to share" },
    { value: "partial", label: "Partially done", desc: "Some episodes or acts are ready, more coming" },
  ];
  return (
    <>
      <div className="ckcp-dhead">
        <div>
          <h2 className="ckcp-dtitle">Completion</h2>
          <p className="ckcp-dsub">Let buyers know how much of the script is ready right now.</p>
        </div>
      </div>

      <div>
        <label className="ckcp-label">Where is your script right now?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setFormData((f) => ({ ...f, completionStatus: opt.value }))}
              className={`ckcp-seg${formData.completionStatus === opt.value ? " is-on" : ""}`}>
              <span className="ckcp-seg-t">{opt.label}</span>
              <span className="ckcp-seg-d">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {formData.completionStatus !== "complete" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ckcp-label">Parts / episodes done</label>
            <input type="number" min="0" name="completedParts" value={formData.completedParts} onChange={handleChange} placeholder="e.g. 4" className="ckcp-input" />
          </div>
          <div>
            <label className="ckcp-label">Total parts / episodes planned</label>
            <input type="number" min="0" name="totalParts" value={formData.totalParts} onChange={handleChange} placeholder="e.g. 10" className="ckcp-input" />
          </div>
        </div>
      )}

      <div className="ckcp-grow">
        <label className="ckcp-label">Anything else buyers should know? <span className="ckcp-opt">Optional</span></label>
        <textarea name="futurePlans" value={formData.futurePlans} onChange={handleChange} maxLength={300}
          placeholder={formData.completionStatus === "complete"
            ? "e.g. This is the final locked version, ready for production."
            : "e.g. Remaining episodes are still being written and will be uploaded soon."}
          className="ckcp-input" />
        <p className="ckcp-counter">{String(formData.futurePlans || "").length}/300</p>
      </div>
    </>
  );
};

/* ───────────────────────── Panel · Access (viewable preview) ───────────────────────── */
const PanelAccess = () => {
  const { formData, handleChange, previewPageTexts, dark, editorZoom } = useCreateProject();
  const on = Boolean(formData.viewableScript);
  return (
    <>
      <div className="ckcp-dhead">
        <div>
          <h2 className="ckcp-dtitle">Viewable preview</h2>
          <p className="ckcp-dsub">Optionally let buyers read a window of your script before they unlock the rest.</p>
        </div>
      </div>

      <div className="ckcp-card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <p className="ckcp-card-h">Viewable script</p>
            <p className="ckcp-card-p">Show a preview window from your uploaded script. Buyers and admins see the same range.</p>
          </div>
          <span style={{ flex: "none", padding: "4px 11px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, ...(on
            ? { background: dark ? "rgba(34,197,94,.14)" : "#eafaef", color: dark ? "#4ade80" : "#15803d", border: `1px solid ${dark ? "rgba(34,197,94,.22)" : "#cdeed7"}` }
            : { background: dark ? "#1e1e1e" : "#f2f2f2", color: "#9a9a9a", border: `1px solid ${dark ? "#2a2a2a" : "#ececec"}` }) }}>
            {on ? "Enabled" : "Hidden"}
          </span>
        </div>
        <label style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "11px", cursor: "pointer", padding: "11px 13px", borderRadius: "10px", border: `1px solid ${dark ? "#2a2a2a" : "#ececec"}`, background: dark ? "#181818" : "#fff" }}>
          <input type="checkbox" name="viewableScript" checked={on} onChange={handleChange} style={{ width: "16px", height: "16px", accentColor: CP_ACCENT }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: dark ? "#e6e6e6" : "#3a352e" }}>Add a viewable script preview</span>
        </label>
      </div>

      {on ? (
        <>
          <div className="ckcp-card">
            <p className="ckcp-card-h">Preview range</p>
            <p className="ckcp-card-p">Set the exact pages professionals can view before unlocking the rest.</p>
            <div className="grid grid-cols-2 gap-3" style={{ marginTop: "12px" }}>
              <div>
                <label className="ckcp-label">First page</label>
                <input type="number" min="1" name="previewWindowStart" value={formData.previewWindowStart} onChange={handleChange} className="ckcp-input" placeholder="e.g. 1" />
              </div>
              <div>
                <label className="ckcp-label">Last page</label>
                <input type="number" min={Math.max(1, Number(formData.previewWindowStart || 1) || 1)} name="previewWindowEnd" value={formData.previewWindowEnd} onChange={handleChange} className="ckcp-input" placeholder="e.g. 8" />
              </div>
            </div>
            <p className="ckcp-card-p" style={{ marginTop: "10px" }}>
              Buyers will see pages <strong style={{ color: dark ? "#e6e6e6" : "#3a352e" }}>{formData.previewWindowStart || "—"}</strong> to <strong style={{ color: dark ? "#e6e6e6" : "#3a352e" }}>{formData.previewWindowEnd || "—"}</strong>. Admin review shows this same range.
            </p>
          </div>

          <div className="ckcp-card ckcp-grow">
            <p className="ckcp-card-h">Preview</p>
            <p className="ckcp-card-p" style={{ marginBottom: "12px" }}>The exact page block buyers and admins will see.</p>
            <div className="ckcp-growscroll ckcp-scroll" style={{ borderRadius: "10px" }}>
              {/* Render the preview with the SAME read-only editor every other surface uses, so the
                  buyer/admin preview is byte-for-byte identical to what the writer authored. */}
              <ScreenplayReadOnly
                text={previewPageTexts
                  .slice(
                    Math.max(0, Number(formData.previewWindowStart || 1) - 1),
                    Math.max(0, Number(formData.previewWindowEnd || 1))
                  )
                  .join("\n\n")}
                dark={dark}
                zoom={editorZoom || 1}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="ckcp-card" style={{ color: "#9a9a9a", fontSize: "12.5px", lineHeight: 1.5 }}>
          No preview will be shown until you enable the viewable script option above.
        </div>
      )}
    </>
  );
};

/* ───────────────────────── Panel · Media ───────────────────────── */
const PanelMedia = () => {
  const {
    aiCoverAttempts, aiCoverHistory, aiCoverIndex, dark, downloadWatermarkedImage, formatDuration,
    generateAiCover, handlePitchVideoSelect, handleThumbnailSelect, handleTrailerSelect, isGeneratingAiCover,
    openThumbnailEditor, pitchVideoFile, pitchVideoInputRef, pitchVideoMeta, pitchVideoMetaLoading,
    pitchVideoPreviewUrl, setAiCoverIndex, setError, setPitchVideoFile, setThumbnailFile, setTrailerFile,
    targetFilm, thumbnailFile, thumbnailInputRef, thumbnailPreviewUrl, trailerFile, trailerInputRef,
    trailerMeta, trailerMetaLoading, trailerPreviewUrl, user,
  } = useCreateProject();

  const pitchLocked = ["writer", "creator"].includes(user?.role)
    && (["free", "silver"].includes(user?.subscription?.plan) || !user?.subscription?.plan);
  const isAiCover = thumbnailFile?.name?.startsWith("ai-cover");

  return (
    <>
      <div className="ckcp-dhead">
        <div>
          <h2 className="ckcp-dtitle">Visual assets</h2>
          <p className="ckcp-dsub">A cover and a trailer make your project far more discoverable. All optional.</p>
        </div>
      </div>

      <div className="ckcp-growscroll grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ alignContent: "start" }}>
        {/* Cover image */}
        <div className="ckcp-card">
          <label className="ckcp-label">Cover image <span className="ckcp-opt">Optional</span></label>
          {!thumbnailFile ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="ckcp-drop" onClick={() => thumbnailInputRef.current?.click()}>
                <ImageIcon className="w-6 h-6" style={{ color: "#9a9a9a" }} />
                <p className="ckcp-drop-t">Upload cover</p>
                <p className="ckcp-drop-s">JPEG/PNG · Max 5MB</p>
                <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => { handleThumbnailSelect(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
              </div>
              <div className="ckcp-drop" onClick={isGeneratingAiCover ? undefined : generateAiCover}
                style={{ borderStyle: "solid", cursor: isGeneratingAiCover ? "not-allowed" : "pointer", borderColor: dark ? "rgba(168,85,247,.3)" : "#e6d5f7", background: dark ? "rgba(168,85,247,.08)" : "#faf5ff", color: dark ? "#c4b5fd" : "#7c3aed" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>auto_awesome</span>
                <p className="ckcp-drop-t" style={{ color: "inherit" }}>{isGeneratingAiCover ? "Generating…" : "AI generate"}</p>
                <p className="ckcp-drop-s" style={{ color: "inherit", opacity: 0.75 }}>From your script</p>
              </div>
            </div>
          ) : (
            <div className="ckcp-filecard">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img src={thumbnailPreviewUrl} alt="Cover preview" style={{ width: "44px", height: "60px", objectFit: "cover", borderRadius: "6px", flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: dark ? "#4ade80" : "#15803d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{thumbnailFile.name}</p>
                  <p style={{ fontSize: "10.5px", color: dark ? "rgba(74,222,128,.8)" : "#16a34acc" }}>{(thumbnailFile.size / 1024).toFixed(1)} KB · Cover ready</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "none" }}>
                  <button type="button" onClick={() => openThumbnailEditor(thumbnailFile)} className="ckcp-ghostbtn">Adjust</button>
                  <button type="button" onClick={() => downloadWatermarkedImage(thumbnailFile)} className="ckcp-ghostbtn">Download</button>
                  <button type="button" onClick={() => { setThumbnailFile(null); setError(""); }} className="ckcp-ghostbtn is-danger">Remove</button>
                </div>
              </div>
              {isAiCover && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${dark ? "rgba(34,197,94,.2)" : "#cdeed7"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: dark ? "#4ade80" : "#15803d" }}>
                    <button type="button" disabled={aiCoverIndex <= 0}
                      onClick={() => { const n = aiCoverIndex - 1; setAiCoverIndex(n); setThumbnailFile(aiCoverHistory[n]); }}
                      className="ckcp-ghostbtn" style={{ height: "24px", padding: "0 6px", opacity: aiCoverIndex <= 0 ? 0.4 : 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>chevron_left</span>
                    </button>
                    <span style={{ fontSize: "10.5px", fontWeight: 700 }}>History {aiCoverIndex + 1}/{aiCoverHistory.length}</span>
                    <button type="button" disabled={aiCoverIndex >= aiCoverHistory.length - 1}
                      onClick={() => { const n = aiCoverIndex + 1; setAiCoverIndex(n); setThumbnailFile(aiCoverHistory[n]); }}
                      className="ckcp-ghostbtn" style={{ height: "24px", padding: "0 6px", opacity: aiCoverIndex >= aiCoverHistory.length - 1 ? 0.4 : 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>chevron_right</span>
                    </button>
                  </div>
                  {aiCoverAttempts < 3 ? (
                    <button type="button" onClick={isGeneratingAiCover ? undefined : generateAiCover}
                      className="ckcp-ghostbtn" style={{ color: dark ? "#c4b5fd" : "#7c3aed", borderColor: dark ? "rgba(168,85,247,.3)" : "#e6d5f7" }}>
                      {isGeneratingAiCover ? "Generating…" : `Try another (${3 - aiCoverAttempts} left)`}
                    </button>
                  ) : (
                    <span style={{ fontSize: "10.5px", fontWeight: 600, color: dark ? "#f87171" : "#dc2626" }}>Max attempts reached</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trailer (film only) */}
        {targetFilm && (
          <div className="ckcp-card">
            <label className="ckcp-label">Trailer video <span className="ckcp-opt">Optional</span></label>
            <input ref={trailerInputRef} type="file" accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
              onChange={(e) => { handleTrailerSelect(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
            {!trailerFile ? (
              <div className="ckcp-drop" onClick={() => trailerInputRef.current?.click()} style={{ padding: "24px 12px" }}>
                <Film className="w-7 h-7" style={{ color: "#9a9a9a" }} />
                <p className="ckcp-drop-t">Upload trailer</p>
                <p className="ckcp-drop-s">MP4, MOV, MPEG, WebM · Max 250MB</p>
              </div>
            ) : (
              <div className="ckcp-filecard">
                <video src={trailerPreviewUrl} controls preload="metadata" style={{ width: "100%", height: "118px", objectFit: "contain", background: "#000", borderRadius: "8px", marginBottom: "10px" }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e", flex: "none", marginTop: "1px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: dark ? "#4ade80" : "#15803d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trailerFile.name}</p>
                    <p style={{ fontSize: "10.5px", color: dark ? "rgba(74,222,128,.8)" : "#16a34acc" }}>
                      {(trailerFile.size / 1024 / 1024).toFixed(1)} MB{trailerMetaLoading ? " · reading…" : trailerMeta ? ` · ${formatDuration(trailerMeta.duration)} · ${trailerMeta.width}×${trailerMeta.height}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "none" }}>
                    <button type="button" onClick={() => trailerInputRef.current?.click()} className="ckcp-ghostbtn">Replace</button>
                    <button type="button" onClick={() => { setTrailerFile(null); setError(""); }} className="ckcp-ghostbtn is-danger">Remove</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pitch video */}
        {pitchLocked ? (
          <div className="ckcp-card">
            <label className="ckcp-label">Pitch video <span className="ckcp-opt" style={{ color: "#dc2626" }}>Locked</span></label>
            <p className="ckcp-card-p" style={{ marginBottom: "10px" }}>Uploading a pitch video is a premium feature.</p>
            <Link to="/pricing" className="ckcp-drop" style={{ textDecoration: "none", padding: "22px 12px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#9a9a9a" }}>lock</span>
              <p className="ckcp-drop-t">Upgrade to unlock</p>
            </Link>
          </div>
        ) : (
          <div className="ckcp-card">
            <label className="ckcp-label">Pitch video <span className="ckcp-opt">Optional</span></label>
            <p className="ckcp-card-p" style={{ marginBottom: "10px" }}>A short video pitch. Max 1:30 min · Max 90MB.</p>
            <input ref={pitchVideoInputRef} type="file" accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
              onChange={(e) => { handlePitchVideoSelect(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
            {!pitchVideoFile ? (
              <div className="ckcp-drop" onClick={() => pitchVideoInputRef.current?.click()} style={{ padding: "24px 12px" }}>
                <Film className="w-7 h-7" style={{ color: "#9a9a9a" }} />
                <p className="ckcp-drop-t">Upload pitch video</p>
                <p className="ckcp-drop-s">MP4, MOV, MPEG, WebM · Max 1:30 · 90MB</p>
              </div>
            ) : (
              <div className="ckcp-filecard">
                <video src={pitchVideoPreviewUrl} controls preload="metadata" style={{ width: "100%", height: "118px", objectFit: "contain", background: "#000", borderRadius: "8px", marginBottom: "10px" }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e", flex: "none", marginTop: "1px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: dark ? "#4ade80" : "#15803d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pitchVideoFile.name}</p>
                    <p style={{ fontSize: "10.5px", color: dark ? "rgba(74,222,128,.8)" : "#16a34acc" }}>
                      {(pitchVideoFile.size / 1024 / 1024).toFixed(1)} MB{pitchVideoMetaLoading ? " · reading…" : pitchVideoMeta ? ` · ${formatDuration(pitchVideoMeta.duration)}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "none" }}>
                    <button type="button" onClick={() => pitchVideoInputRef.current?.click()} className="ckcp-ghostbtn">Replace</button>
                    <button type="button" onClick={() => { setPitchVideoFile(null); setError(""); }} className="ckcp-ghostbtn is-danger">Remove</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

/* Panel registry, keyed by the sub-step `key` from DETAILS_STEPS. */
const PANELS = {
  basics: PanelBasics,
  story: PanelStory,
  cast: PanelCast,
  market: PanelMarket,
  progress: PanelProgress,
  access: PanelAccess,
  media: PanelMedia,
};

/* ───────────────────────── Orchestrator ───────────────────────── */
const Step2Details = () => {
  const { detailsStep, detailsSubSteps, setDetailsStep, setError } = useCreateProject();
  const active = detailsSubSteps[detailsStep] || detailsSubSteps[0];
  const Panel = PANELS[active?.key] || PanelBasics;

  return (
    <>
      {/* Docked sub-stepper — mirrors the Write step's "Insert" bar. Visited steps
          are clickable (jump back, no validation); the current one is highlighted;
          later steps unlock only by passing the footer's Next gate. */}
      <div className="ckcp-dstepper">
        {detailsSubSteps.map((s, i) => {
          const isActive = i === detailsStep;
          const isDone = i < detailsStep;
          const clickable = isDone;
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", flex: "none" }}>
              <button type="button" disabled={!clickable}
                onClick={() => { if (clickable) { setDetailsStep(i); setError(""); } }}
                className={`ckcp-dstep${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}${clickable ? " is-clickable" : ""}`}
                title={s.desc}>
                <span className="ckcp-dstep-num">
                  {isDone ? <span className="material-symbols-outlined">check</span> : i + 1}
                </span>
                <span className="ckcp-dstep-lbl">{s.label}</span>
              </button>
              {i < detailsSubSteps.length - 1 && <span className="ckcp-dstep-conn" />}
            </div>
          );
        })}
      </div>

      {/* Fitted panel body. Keyed by sub-step so the fade-in replays on each move. */}
      <div className="ckcp-dbody">
        <div key={active?.key} className="ckcp-dpanel">
          <Panel />
        </div>
      </div>
    </>
  );
};

export default Step2Details;
