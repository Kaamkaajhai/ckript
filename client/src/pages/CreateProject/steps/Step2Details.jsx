import { useCreateProject } from "../CreateProjectContext";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Film, CheckCircle2 } from "lucide-react";
import ScreenplayPdfViewer from "../../../components/ScreenplayPdfViewer";
import { filmFormats, publishingFormats, styleOptions, ROLE_GENDER_OPTIONS } from "../constants";
import { getContentTypeFromFormat } from "../lib/format";

const Step2Details = () => {
  const {
    addRole, aiBtnCls, aiCoverAttempts, aiCoverHistory, aiCoverIndex, cardCls, dark, downloadWatermarkedImage, estimatedPages, formData, formatDuration, formatInfo, generateAiCover, handleChange, handleGenerateMetadata, handlePitchVideoSelect, handleProseClick, handleThumbnailSelect, handleTrailerSelect, inputCls, isGeneratingAiCover, metaLoadingField, metaNotice, openThumbnailEditor, pageStatus, pitchVideoFile, pitchVideoInputRef, pitchVideoMeta, pitchVideoMetaLoading, pitchVideoPreviewUrl, previewPageTexts, proseLoading, publishingDetails, removeRole, roles, setAiCoverIndex, setError, setFormData, setPitchVideoFile, setPublishingDetails, setTagsInput, setThumbnailFile, setTrailerFile, tagsInput, targetFilm, targetPublishing, thumbnailFile, thumbnailInputRef, thumbnailPreviewUrl, title, trailerFile, trailerInputRef, trailerMeta, trailerMetaLoading, trailerPreviewUrl, updateRoleAge, updateRoleField, user, wordCount,
  } = useCreateProject();

  return (
    <>
            <div className={`${cardCls} p-6 sm:p-8 space-y-5`}>
              
              {/* -- Target Industry Toggle -- (Hidden for now, will add Publishing in future) */}
              {/*
              <div className={`rounded-xl border p-4 ${dark ? "bg-[#0d1520] border-[#1d3350]" : "bg-gray-50 border-gray-200"}`}>
                <h3 className={`text-sm font-bold mb-3 ${dark ? "text-gray-200" : "text-gray-800"}`}>Make this script available for:</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetIndustry" checked={targetFilm} onChange={() => { setTargetFilm(true); setTargetPublishing(false); setFormData(f => ({ ...f, format: "feature_film" })); }} className="w-4 h-4 text-[#1e3a5f] focus:ring-[#1e3a5f]" />
                    <span className={`text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Film & TV Industry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="targetIndustry" checked={targetPublishing} onChange={() => { setTargetPublishing(true); setTargetFilm(false); setFormData(f => ({ ...f, format: "fiction_novel" })); }} className="w-4 h-4 text-[#1e3a5f] focus:ring-[#1e3a5f]" />
                    <span className={`text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Publishing Houses (Novel/Adaptation)</span>
                  </label>
                </div>
              </div>
              */}

              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Project Details</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Tell us about your script so we can categorize it properly.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Writer *</label>
                  <input type="text" name="writer" value={formData.writer} onChange={handleChange} placeholder="Writer's name" className={inputCls} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Company Name</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company name" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Format *</label>
                  <select name="format" value={formData.format} onChange={handleChange} className={inputCls}>
                    {(targetFilm ? filmFormats : publishingFormats).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                {targetFilm && (
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Style (Medium) <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span></label>
                    <select name="styleMedium" value={formData.styleMedium} onChange={handleChange} className={inputCls}>
                      <option value="">Select style...</option>
                      {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {targetFilm && (
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Estimated Pages</label>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${dark ? "bg-white/[0.04] border border-[#1d3350]" : "bg-gray-50 border border-gray-200"}`}>
                      <span className={`text-2xl font-bold ${pageStatus === "good" ? dark ? "text-green-400" : "text-green-600" : pageStatus === "short" ? dark ? "text-amber-400" : "text-amber-600" : dark ? "text-blue-400" : "text-[#1e3a5f]"}`}>{estimatedPages}</span>
                      <div>
                        <p className={`text-xs font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>pages</p>
                        <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>{getContentTypeFromFormat(formData.format) !== "book" ? "Line-based · standard ~55 lines/page (matches export)" : `Auto-calculated from ${wordCount} words`}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Format-aware page hint */}
              {targetFilm && (
                <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs ${pageStatus === "good"
                  ? dark ? "bg-green-500/5 border border-green-500/10 text-green-400" : "bg-green-50 border border-green-100 text-green-700"
                  : pageStatus === "short"
                    ? dark ? "bg-amber-500/5 border border-amber-500/10 text-amber-400" : "bg-amber-50 border border-amber-100 text-amber-700"
                    : dark ? "bg-blue-500/5 border border-blue-500/10 text-blue-400" : "bg-[#1e3a5f]/[0.06] border border-[#1e3a5f]/15 text-[#1e3a5f]"
                  }`}>
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  <div>
                    <p className="font-medium">{formatInfo.label}: typical range is {formatInfo.typical} pages</p>
                    <p className={`mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      {pageStatus === "good" ? "Your script length looks good for this format!"
                        : pageStatus === "short" ? `Your script is shorter than typical. That's okay for early drafts - keep writing!`
                          : `Your script exceeds the typical range. Consider trimming or changing the format.`}
                    </p>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Viewable Script</h3>
                    <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-500"}`}>
                      Turn this on if you want buyers to see a preview window from your uploaded script.
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${formData.viewableScript ? (dark ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200") : (dark ? "bg-white/[0.04] text-gray-300 border border-white/[0.08]" : "bg-white text-gray-600 border border-gray-200")}`}>
                    {formData.viewableScript ? "Enabled" : "Hidden"}
                  </span>
                </div>
                <label className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${dark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"}`}>
                  <input
                    type="checkbox"
                    name="viewableScript"
                    checked={Boolean(formData.viewableScript)}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-900"}`}>
                    Add a viewable script preview
                  </span>
                </label>
                {!formData.viewableScript && (
                  <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${dark ? "border-white/10 bg-white/[0.03] text-gray-400" : "border-gray-200 bg-white text-gray-600"}`}>
                    No preview will be shown until you enable the viewable script option.
                  </div>
                )}
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`} style={formData.viewableScript ? undefined : { display: "none" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Preview Range</h3>
                    <p className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-500"}`}>
                      Set the exact pages film professionals can view before unlocking the rest.
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${dark ? "bg-white/[0.04] text-gray-300 border border-white/[0.08]" : "bg-white text-gray-600 border border-gray-200"}`}>
                    Free preview
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min="1"
                      name="previewWindowStart"
                      value={formData.previewWindowStart}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={Math.max(1, Number(formData.previewWindowStart || 1) || 1)}
                      name="previewWindowEnd"
                      value={formData.previewWindowEnd}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="e.g. 8"
                    />
                  </div>
                </div>

                <div className={`mt-4 rounded-xl px-4 py-3 ${dark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                  <p className={`text-sm font-medium ${dark ? "text-gray-100" : "text-gray-900"}`}>
                    Film professionals will see pages {formData.previewWindowStart || "—"} to {formData.previewWindowEnd || "—"}
                  </p>
                  <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                    Admin review will also show this exact page range before approval.
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Viewable Script Preview</h3>
                    <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                      This is the exact page block buyers and admins will see.
                    </p>
                  </div>
                </div>
                <ScreenplayPdfViewer
                  pdfUrl=""
                  title={title || "Script"}
                  startPage={Number(formData.previewWindowStart || 1)}
                  endPage={Number(formData.previewWindowEnd || 1)}
                  fallbackPages={previewPageTexts.slice(
                    Math.max(0, Number(formData.previewWindowStart || 1) - 1),
                    Math.max(0, Number(formData.previewWindowEnd || 1))
                  ).map((pageText, index) => ({
                    pageNumber: Number(formData.previewWindowStart || 1) + index,
                    text: String(pageText || ""),
                  }))}
                  fallbackText={previewPageTexts.join("\n\n")}
                />
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                <div>
                  <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Script Completion</h3>
                  <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                    Let buyers know how much of the script is ready.
                  </p>
                </div>

                {/* Status picker */}
                <div className="mt-4">
                  <p className={`text-xs font-semibold mb-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>Where is your script right now?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { value: "complete", label: "Fully Written", desc: "All parts are done and ready to share" },
                      { value: "partial", label: "Partially Done", desc: "Some episodes or acts are ready, more coming" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, completionStatus: opt.value }))}
                        className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                          formData.completionStatus === opt.value
                            ? dark
                              ? "border-[#2a5080] bg-[#0f2035] ring-1 ring-[#2a5080]"
                              : "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                            : dark
                              ? "border-[#1d3350] bg-[#0d1826] hover:border-[#2a4a6a]"
                              : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className={`text-[13px] font-semibold ${
                          formData.completionStatus === opt.value
                            ? dark ? "text-white" : "text-blue-800"
                            : dark ? "text-gray-200" : "text-gray-800"
                        }`}>{opt.label}</span>
                        <span className={`text-[11px] leading-snug ${
                          formData.completionStatus === opt.value
                            ? dark ? "text-blue-300" : "text-blue-600"
                            : dark ? "text-gray-500" : "text-gray-400"
                        }`}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parts inputs — only relevant for partial */}
                {formData.completionStatus !== "complete" && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                        Parts / episodes done so far
                      </label>
                      <input type="number" min="0" name="completedParts" value={formData.completedParts} onChange={handleChange} placeholder="e.g. 4" className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                        Total parts / episodes planned
                      </label>
                      <input type="number" min="0" name="totalParts" value={formData.totalParts} onChange={handleChange} placeholder="e.g. 10" className={inputCls} />
                    </div>
                  </div>
                )}

                {/* Future note */}
                <div className="mt-4">
                  <label className={`block text-xs font-semibold mb-1.5 ${dark ? "text-gray-400" : "text-gray-600"}`}>
                    Anything else buyers should know? <span className={`font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                  </label>
                  <textarea
                    name="futurePlans"
                    value={formData.futurePlans}
                    onChange={handleChange}
                    rows={2}
                    maxLength={300}
                    placeholder={
                      formData.completionStatus === "complete"
                        ? "e.g. This is the final locked version, ready for production."
                        : "e.g. Remaining episodes are still being written and will be uploaded soon."
                    }
                    className={`${inputCls} resize-none`}
                  />
                  <p className={`text-[10px] mt-1 text-right ${dark ? "text-gray-600" : "text-gray-400"}`}>
                    {String(formData.futurePlans || "").length}/300
                  </p>
                </div>
              </div>

              {targetFilm && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className={`block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Logline * <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>{formData.logline.length}/500</span></label>
                    <button type="button" onClick={() => handleGenerateMetadata("logline")} disabled={Boolean(metaLoadingField)}
                      className={aiBtnCls}>{metaLoadingField === "logline" ? "Generating…" : "✨ Generate with AI"}</button>
                  </div>
                  <textarea name="logline" value={formData.logline} onChange={handleChange} rows={3} maxLength={500} placeholder="A one-sentence summary of your story..."
                    className={`${inputCls} resize-none`} />
                  {metaNotice.field === "logline" && <p className={`text-[11px] mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{metaNotice.text}</p>}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className={`block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Synopsis *</label>
                  <button type="button" onClick={() => handleGenerateMetadata("synopsis")} disabled={Boolean(metaLoadingField)}
                    className={aiBtnCls}>{metaLoadingField === "synopsis" ? "Generating…" : "✨ Generate with AI"}</button>
                </div>
                <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="A longer synopsis of your script..."
                  className={`${inputCls} resize-none`} />
                {metaNotice.field === "synopsis" && <p className={`text-[11px] mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{metaNotice.text}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Tags</label>
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. heist, ensemble, twist ending" className={inputCls} />
              </div>

              {targetFilm && (
                <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50/60"}`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className={`text-sm font-bold ${dark ? "text-gray-100" : "text-gray-900"}`}>Role Studio</h3>
                      <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Add cast roles with demographics and creative direction. Leave blank if not casting yet.</p>
                      {metaNotice.field === "roles" && <p className={`text-[11px] mt-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{metaNotice.text}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleGenerateMetadata("roles")}
                        disabled={Boolean(metaLoadingField)}
                        className={aiBtnCls}
                      >
                        {metaLoadingField === "roles" ? "Generating…" : "✨ Generate with AI"}
                      </button>
                      <button
                        type="button"
                        onClick={addRole}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${dark ? "bg-white/[0.06] border-[#2a4a6a] text-blue-300 hover:bg-white/[0.1]" : "bg-white border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`}
                      >
                        + Add Role
                      </button>
                    </div>
                  </div>

                  {roles.length === 0 ? (
                    <div className={`rounded-xl border border-dashed px-4 py-5 text-center ${dark ? "border-[#1d3350] text-gray-500" : "border-gray-300 text-gray-400"}`}>
                      No roles added yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {roles.map((role, idx) => (
                        <div key={`role-${idx}`} className={`rounded-xl border p-3 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-white"}`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className={`text-xs font-bold ${dark ? "text-gray-300" : "text-gray-700"}`}>Role {idx + 1}</p>
                            <button
                              type="button"
                              onClick={() => removeRole(idx)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "text-red-300 border-red-500/30 hover:bg-red-500/10" : "text-red-600 border-red-200 hover:bg-red-50"}`}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={role.characterName}
                              onChange={(e) => updateRoleField(idx, "characterName", e.target.value)}
                              placeholder="Character name"
                              className={inputCls}
                            />
                            <input
                              type="text"
                              value={role.type}
                              onChange={(e) => updateRoleField(idx, "type", e.target.value)}
                              placeholder="Archetype (e.g. Lead, Antagonist)"
                              className={inputCls}
                            />
                            <select value={role.gender} onChange={(e) => updateRoleField(idx, "gender", e.target.value)} className={inputCls}>
                              {ROLE_GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="Min age"
                                value={role.ageRange?.min ?? ""}
                                onChange={(e) => updateRoleAge(idx, "min", e.target.value)}
                                className={inputCls}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="Max age"
                                value={role.ageRange?.max ?? ""}
                                onChange={(e) => updateRoleAge(idx, "max", e.target.value)}
                                className={inputCls}
                              />
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={role.description}
                            onChange={(e) => updateRoleField(idx, "description", e.target.value)}
                            placeholder="Performance notes, emotional range, or casting vibe..."
                            className={`${inputCls} mt-3 resize-none`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* -- Publishing Details Section -- */}
              {/* -- Publishing Market Positioning Section -- */}
              {targetPublishing && (
                <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50"}`}>
                  <div className="mb-4">
                    <h3 className={`text-sm font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>Market Positioning</h3>
                    <p className={`text-[11px] mt-1 ${dark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>Provide important metadata for publishers.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Target Audience *</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["Young Adult", "Adult", "Mass Market", "Niche / Literary"].map(f => (
                          <button key={f} type="button" onClick={() => {
                            setPublishingDetails(prev => {
                              const curr = prev.targetAudience || [];
                              return { ...prev, targetAudience: curr.includes(f) ? curr.filter(x => x !== f) : [...curr, f] };
                            });
                          }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${publishingDetails.targetAudience?.includes(f) ? "bg-emerald-600 text-white border-emerald-600" : dark ? "border-emerald-500/30 text-emerald-400 hover:border-emerald-400" : "border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>{f}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Writing Style <span className="font-normal text-[11px]">(optional)</span></label>
                      <div className="flex flex-wrap gap-1.5">
                        {["Descriptive", "Dialogue-driven", "Literary", "Commercial"].map(f => (
                          <button key={f} type="button" onClick={() => {
                            setPublishingDetails(prev => {
                              const curr = prev.writingStyle || [];
                              return { ...prev, writingStyle: curr.includes(f) ? curr.filter(x => x !== f) : [...curr, f] };
                            });
                          }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${publishingDetails.writingStyle?.includes(f) ? "bg-emerald-600 text-white border-emerald-600" : dark ? "border-emerald-500/30 text-emerald-400 hover:border-emerald-400" : "border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>{f}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-emerald-300" : "text-emerald-800"}`}>Estimated Book Length <span className="font-normal text-[11px]">(optional)</span></label>
                      <input type="text" value={publishingDetails.estimatedWordCount} onChange={(e) => setPublishingDetails(p => ({ ...p, estimatedWordCount: e.target.value }))} placeholder="e.g. 60,000 - 90,000 words" className={inputCls} />
                    </div>
                  </div>
                </div>
              )}

              {/* -- Advanced Publishing Details (Collapsed) -- */}
              {targetPublishing && (
                <details className={`rounded-2xl border overflow-hidden ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-white"}`}>
                  <summary className={`px-4 py-4 cursor-pointer font-bold text-sm select-none hover:bg-black/5 transition-colors ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    Advanced Publishing Details (Optional)
                  </summary>
                  <div className={`px-4 pb-5 space-y-4 border-t pt-4 ${dark ? "border-[#1d3350]" : "border-gray-200"}`}>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Series Potential</label>
                      <select value={publishingDetails.seriesPotential} onChange={(e) => setPublishingDetails(p => ({ ...p, seriesPotential: e.target.value }))} className={inputCls}>
                        <option value="">Select potential...</option>
                        <option value="Standalone">Standalone</option>
                        <option value="Trilogy">Trilogy</option>
                        <option value="Multi-part universe">Multi-part universe</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>Prose Sample <span className="font-normal text-[11px]">(Novel-formatted excerpt)</span></label>
                        <button
                          type="button"
                          onClick={handleProseClick}
                          disabled={proseLoading}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${dark ? "bg-white/[0.06] text-blue-300 border border-[#2a4a6a] hover:bg-white/[0.1]" : "bg-white border border-blue-200 text-[#1e3a5f] hover:bg-blue-50"}`}
                        >
                          <svg className={`w-3 h-3 ${proseLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          {proseLoading ? "Generating..." : "AI Generate Prose"}
                        </button>
                      </div>
                      <textarea rows={6} value={publishingDetails.proseSample || ""} onChange={(e) => setPublishingDetails(p => ({ ...p, proseSample: e.target.value }))} placeholder="A sample chapter or converted prose excerpt to demonstrate the writing quality..." className={`${inputCls} resize-y font-serif text-sm leading-relaxed`} />
                    </div>
                  </div>
                </details>
              )}

              {/* Media Uploads */}
              <div className={`rounded-2xl border p-4 sm:p-5 ${dark ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-white"}`}>
                <div className="mb-4">
                  <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-[#1e3a5f]"}`}>Visual Assets</h3>
                  <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Add a cover image and trailer to improve profile quality and discovery.</p>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                  {/* Thumbnail Upload */}
                  <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                    <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                      Script Thumbnail <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                    </label>
                    {!thumbnailFile ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div onClick={() => thumbnailInputRef.current?.click()} className={`rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center border ${dark ? "bg-white/[0.03] hover:bg-white/[0.06] border-white/5" : "bg-white hover:bg-gray-50 border-gray-200"}`}>
                          <ImageIcon className={`w-6 h-6 mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`} />
                          <p className={`text-xs font-bold mb-0.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upload Cover</p>
                          <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>JPEG/PNG (Max 5MB)</p>
                          <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              handleThumbnailSelect(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                        </div>
                        <div onClick={isGeneratingAiCover ? null : generateAiCover} className={`rounded-xl p-3 text-center transition flex flex-col items-center justify-center border ${isGeneratingAiCover ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${dark ? "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400" : "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"}`}>
                          <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                          <p className="text-xs font-bold mb-0.5">{isGeneratingAiCover ? "Generating..." : "AI Generate"}</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`border rounded-xl p-3 flex flex-col gap-3 ${dark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                        <div className="flex items-center gap-3">
                          <img src={thumbnailPreviewUrl} alt="Thumbnail Preview" className="w-12 h-16 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${dark ? "text-green-400" : "text-green-700"}`}>{thumbnailFile.name}</p>
                            <p className={`text-[10px] ${dark ? "text-green-500/80" : "text-green-600/80"}`}>{(thumbnailFile.size / 1024).toFixed(1)} KB - Cover ready</p>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => openThumbnailEditor(thumbnailFile)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                            >
                              Adjust
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadWatermarkedImage(thumbnailFile)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-purple-300 border-purple-500/20 hover:bg-white/[0.12]" : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"}`}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setThumbnailFile(null);
                                setError("");
                              }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {thumbnailFile.name?.startsWith("ai-cover") && (
                          <div className={`pt-3 border-t flex items-center justify-between ${dark ? "border-green-500/20" : "border-green-200"}`}>
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                              <button
                                type="button"
                                disabled={aiCoverIndex <= 0}
                                onClick={() => {
                                  const newIndex = aiCoverIndex - 1;
                                  setAiCoverIndex(newIndex);
                                  setThumbnailFile(aiCoverHistory[newIndex]);
                                }}
                                className={`p-1 rounded-full ${aiCoverIndex <= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-green-500/20 dark:hover:bg-black/20"}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                              </button>
                              <span className="text-[10px] font-bold">History ({aiCoverIndex + 1}/{aiCoverHistory.length})</span>
                              <button
                                type="button"
                                disabled={aiCoverIndex >= aiCoverHistory.length - 1}
                                onClick={() => {
                                  const newIndex = aiCoverIndex + 1;
                                  setAiCoverIndex(newIndex);
                                  setThumbnailFile(aiCoverHistory[newIndex]);
                                }}
                                className={`p-1 rounded-full ${aiCoverIndex >= aiCoverHistory.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-green-500/20 dark:hover:bg-black/20"}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                              </button>
                            </div>
                            {aiCoverAttempts < 3 ? (
                              <button
                                type="button"
                                onClick={isGeneratingAiCover ? null : generateAiCover}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 ${isGeneratingAiCover ? "opacity-70 cursor-not-allowed" : ""} ${dark ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-purple-100 hover:bg-purple-200 text-purple-700"}`}
                              >
                                {isGeneratingAiCover ? "Generating..." : "Try Another Concept"}
                                {!isGeneratingAiCover && <span className="font-normal opacity-70">({3 - aiCoverAttempts} left)</span>}
                              </button>
                            ) : (
                              <span className={`text-[10px] font-semibold ${dark ? "text-red-400" : "text-red-600"}`}>Max attempts reached</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trailer Upload */}
                  {targetFilm && (
                    <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                        Trailer Video <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                      </label>
                      <input
                        ref={trailerInputRef}
                        type="file"
                        accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
                        onChange={(e) => {
                          handleTrailerSelect(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />

                      {!trailerFile ? (
                        <div onClick={() => trailerInputRef.current?.click()} className={`rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center ${dark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-100/70"}`}>
                          <Film className={`w-8 h-8 mb-2 ${dark ? "text-[#1d3350]" : "text-gray-400"}`} />
                          <p className={`text-xs font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upload High-Quality Trailer</p>
                          <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>MP4, MOV, MPEG, WebM (Max 250MB)</p>
                        </div>
                      ) : (
                        <div className={`border rounded-xl p-3 space-y-3 ${dark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                          <div className="relative overflow-hidden rounded-lg">
                            <video
                              src={trailerPreviewUrl}
                              controls
                              preload="metadata"
                              className="w-full h-44 object-contain bg-black"
                            />
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${dark ? "text-green-400" : "text-green-700"}`}>{trailerFile.name}</p>
                              <p className={`text-[10px] ${dark ? "text-green-500/80" : "text-green-600/80"}`}>
                                {(trailerFile.size / 1024 / 1024).toFixed(1)} MB
                                {trailerMetaLoading ? " - reading video info..." : trailerMeta ? ` - ${formatDuration(trailerMeta.duration)} - ${trailerMeta.width}x${trailerMeta.height}` : ""}
                              </p>
                              <p className={`text-[10px] mt-1 ${dark ? "text-green-500/80" : "text-green-700/80"}`}>Original quality will be preserved on upload.</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => trailerInputRef.current?.click()}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTrailerFile(null);
                                  setError("");
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pitch Video Upload */}
                  {["writer", "creator"].includes(user?.role) && (["free", "silver"].includes(user?.subscription?.plan) || !user?.subscription?.plan) ? (
                    <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-0.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                        Pitch Video <span className={`text-xs font-normal text-red-500`}>Locked</span>
                      </label>
                      <p className={`text-[11px] mb-2.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Upload Pitch Video is a premium feature.</p>
                      <Link to="/pricing" className="block text-center rounded-xl p-4 transition flex flex-col items-center bg-gray-100/50 hover:bg-gray-200/50 cursor-pointer">
                        <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        <p className={`text-xs font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upgrade to Unlock</p>
                      </Link>
                    </div>
                  ) : (
                    <div className={`rounded-2xl border p-4 ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-gray-50/60"}`}>
                      <label className={`block text-sm font-medium mb-0.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                        Pitch Video <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span>
                      </label>
                    <p className={`text-[11px] mb-2.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>A short video pitch for your project. Max 1:30 min · Max 90MB</p>
                    <input
                      ref={pitchVideoInputRef}
                      type="file"
                      accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
                      onChange={(e) => {
                        handlePitchVideoSelect(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    {!pitchVideoFile ? (
                      <div onClick={() => pitchVideoInputRef.current?.click()} className={`rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center ${dark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-100/70"}`}>
                        <Film className={`w-8 h-8 mb-2 ${dark ? "text-[#1d3350]" : "text-gray-400"}`} />
                        <p className={`text-xs font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>Upload Pitch Video</p>
                        <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>MP4, MOV, MPEG, WebM · Max 1:30 min · Max 90MB</p>
                      </div>
                    ) : (
                      <div className={`border rounded-xl p-3 space-y-3 ${dark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"}`}>
                        <div className="relative overflow-hidden rounded-lg">
                          <video
                            src={pitchVideoPreviewUrl}
                            controls
                            preload="metadata"
                            className="w-full h-44 object-contain bg-black"
                          />
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${dark ? "text-green-400" : "text-green-700"}`}>{pitchVideoFile.name}</p>
                            <p className={`text-[10px] ${dark ? "text-green-500/80" : "text-green-600/80"}`}>
                              {(pitchVideoFile.size / 1024 / 1024).toFixed(1)} MB
                              {pitchVideoMetaLoading ? " · reading..." : pitchVideoMeta ? ` · ${formatDuration(pitchVideoMeta.duration)}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => pitchVideoInputRef.current?.click()}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-blue-300 border-blue-500/20 hover:bg-white/[0.12]" : "bg-white text-[#1e3a5f] border-blue-200 hover:bg-blue-50"}`}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPitchVideoFile(null); setError(""); }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${dark ? "bg-white/[0.08] text-red-400 border-red-500/20 hover:bg-white/[0.12]" : "bg-white text-red-500 border-red-200 hover:bg-red-50"}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </div>
    </>
  );
};

export default Step2Details;
