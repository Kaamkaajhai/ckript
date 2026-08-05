import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import ScreenplayPdfViewer from "../ScreenplayPdfViewer";
import { MatIcon } from "../../layouts/app-shell/navigation/icons";
import "./ScriptUploadWorkspace.css";
import TagSelect from "../TagSelect";

const PHASES = [
  { num: 1, label: "Upload", desc: "Script file & title" },
  { num: 2, label: "Details", desc: "Story, cast & media" },
  { num: 3, label: "Classify", desc: "Genre, tone & themes" },
  { num: 4, label: "Film Info", desc: "Language & intent" },
  { num: 5, label: "Publish", desc: "Rights, price & terms" },
];

const DETAIL_STEPS = ["Basics", "Story", "Cast", "Progress", "Access", "Media"];

const SCREEN_COPY = {
  upload: ["Step 1 of 5 · Upload", "Add your script", "Upload an existing file or continue in the screenplay editor. We'll extract the text and detect the page count automatically."],
  basics: ["Step 2 of 5 · Details", "Project basics", "Choose the format and confirm the length detected from your script file."],
  story: ["Step 2 of 5 · Details", "Tell the story", "Write the pitch buyers read first, or use your real script content to generate a starting draft with AI."],
  cast: ["Step 2 of 5 · Details", "Cast & roles", "Define castable roles with demographics and creative direction. Leave this empty if you're not casting yet."],
  progress: ["Step 2 of 5 · Details", "How complete is it?", "Set clear expectations about how much of the script is ready to evaluate."],
  access: ["Step 2 of 5 · Details", "Viewable preview", "Choose the exact pages buyers and admins can preview before the full script is unlocked."],
  media: ["Step 2 of 5 · Details", "Visual assets", "Add a cover, trailer, or pitch video to make the listing more discoverable."],
  classify: ["Step 3 of 5 · Classify", "Classification", "Help the right readers discover your script by setting its genre, tone, themes, and setting."],
  film: ["Step 4 of 5 · Film Info", "Film production details", "Share your language, creative intent, dialogue coverage, and screenplay style."],
  publish: ["Step 5 of 5 · Publish", "Pricing & publish", ""],
};

const TIPS = {
  upload: ["Good to know", "A formatted PDF or DOCX lets Ckript detect page count and build the buyer preview from the real document."],
  basics: ["Pricing depends on this", "Format drives the page guidance and suggested price range. Pick the closest match to the uploaded work."],
  story: ["Loglines win reads", "A vivid sentence with a clear hook and stakes is easier for buyers to scan than a plot summary."],
  cast: ["Casting-ready sells", "Clear role names, age ranges, and a one-line performance direction make the project easier to evaluate."],
  progress: ["Clarity builds trust", "Partial scripts are welcome. State what is complete and what is still planned."],
  access: ["Show, don't tell", "A focused 5–8 page preview gives buyers evidence of voice and craft before purchase."],
  media: ["Covers get clicks", "Use your own artwork or generate a cover from the actual script. AI generation follows plan limits."],
  classify: ["Discovery matters", "Accurate tags power search and smart matching. Choose the strongest signals instead of every possible match."],
  film: ["Signal your intent", "Directing and producing intent helps buyers understand which deal structures are likely to fit."],
  publish: ["Review before submitting", "Rights, legal acknowledgements, pricing, and services are saved in the submission record reviewed by admins."],
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return "Size unavailable";
  const mb = Number(bytes) / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
};

const FieldLabel = ({ children, meta, required, htmlFor }) => {
  const LabelTag = htmlFor ? "label" : "span";
  return (
  <LabelTag className="su-field-label" htmlFor={htmlFor}>
    <span>{children}</span>
    {meta && <span className={required ? "su-required" : "su-field-meta"}>{meta}</span>}
  </LabelTag>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    className={`su-toggle${checked ? " is-on" : ""}`}
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
  >
    <span />
  </button>
);

const SelectableCard = ({ selected, onClick, title, tag, children }) => (
  <button type="button" className={`su-select-card${selected ? " is-selected" : ""}`} onClick={onClick} aria-pressed={selected}>
    <span className="su-radio" aria-hidden="true" />
    <span className="su-select-card__body">
      <span className="su-select-card__title">{title} {tag && <small>{tag}</small>}</span>
      <span className="su-select-card__desc">{children}</span>
    </span>
  </button>
);

const EmptyState = ({ children }) => <div className="su-empty">{children}</div>;

const getFieldIssue = (state, fieldId) => (
  state.validationErrors?.find((validationIssue) => validationIssue.fieldId === fieldId)
);

const validationFieldProps = (state, fieldId) => {
  const validationIssue = getFieldIssue(state, fieldId);
  if (!validationIssue) return {};
  return {
    "aria-invalid": true,
    "aria-describedby": "su-upload-toast-message",
    "data-upload-field-error": "true",
  };
};

function UploadToast({ toast, onDismiss }) {
  const icon = toast.type === "success" ? "check_circle" : toast.type === "warning" ? "warning" : "error";
  return (
    <Motion.div
      key={toast.id}
      id="su-upload-toast"
      className={`su-toast su-toast--${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      initial={{ opacity: 0, x: 28, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <span className="su-toast__icon"><MatIcon name={icon} size={21} /></span>
      <div className="su-toast__copy">
        <span className="su-toast__eyebrow">Script upload</span>
        <strong>{toast.title}</strong>
        <p id="su-upload-toast-message">{toast.text}</p>
        {toast.action && <button type="button" className="su-toast__action" onClick={toast.action.onClick}>{toast.action.label}<MatIcon name="arrow_forward" size={15} /></button>}
      </div>
      <button type="button" className="su-toast__dismiss" onClick={onDismiss} aria-label="Dismiss notification"><MatIcon name="close" size={17} /></button>
      <span className="su-toast__timer" style={{ "--su-toast-duration": `${toast.duration || 5000}ms` }} aria-hidden="true" />
    </Motion.div>
  );
}

function WorkflowTracker({ step, progress, onStepSelect, limit }) {
  return (
    <aside className="su-tracker" aria-label="Upload progress">
      <div className="su-overline">Publish your script</div>
      <p className="su-tracker__caption">{step === 5 ? "Final step · almost there" : `Step ${step} of 5`}</p>
      <ol className="su-tracker__list">
        {PHASES.map((phase, index) => {
          const done = phase.num < step;
          const active = phase.num === step;
          const enabled = phase.num <= step;
          return (
            <li key={phase.num} className={`su-tracker__item${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
              <button type="button" disabled={!enabled} onClick={() => onStepSelect(phase.num)}>
                <span className="su-tracker__marker">{done ? <MatIcon name="check" size={15} /> : phase.num}</span>
                <span><strong>{phase.label}</strong><small>{phase.desc}</small></span>
              </button>
              {index < PHASES.length - 1 && <span className="su-tracker__line" />}
            </li>
          );
        })}
      </ol>
      <div className="su-tracker__footer">
        <div><span>Overall progress</span><strong>{progress}%</strong></div>
        <span className="su-progress"><span style={{ width: `${progress}%` }} /></span>
        {limit?.applies && <p>{limit.used || 0} of {limit.limit || 0} scripts used on {limit.plan || "your plan"}</p>}
      </div>
    </aside>
  );
}

function DetailTabs({ current, unlocked, onSelect }) {
  return (
    <nav className="su-detail-tabs" aria-label="Project details sections">
      <span>Details</span>
      {DETAIL_STEPS.map((label, index) => {
        const done = index < current || unlocked > current;
        const enabled = index <= unlocked;
        return (
          <button type="button" key={label} disabled={!enabled} className={current === index ? "is-active" : ""} onClick={() => onSelect(index)}>
            <span>{done && current !== index ? <MatIcon name="check" size={13} /> : index + 1}</span>{label}
          </button>
        );
      })}
    </nav>
  );
}

function HelperRail({ screenKey, formData, formatLabel, roles, effectivePrice, rightsLabel, user, step }) {
  const [tipTitle, tipBody] = TIPS[screenKey] || TIPS.upload;
  return (
    <aside className="su-helper">
      <section className="su-tip"><div><MatIcon name="lightbulb" size={15} />{tipTitle}</div><p>{tipBody}</p></section>
      <section>
        <h3>Your script</h3>
        <dl>
          <div><dt>Title</dt><dd title={formData.title}>{formData.title || "Untitled"}</dd></div>
          <div><dt>Format</dt><dd>{formatLabel}</dd></div>
          <div><dt>Length</dt><dd>{formData.pageCount ? `${formData.pageCount} pp` : "—"}</dd></div>
          <div><dt>Genre</dt><dd>{formData.primaryGenre || "—"}</dd></div>
          <div><dt>Roles</dt><dd>{roles.length} defined</dd></div>
        </dl>
      </section>
      {step === 5 && (
        <section className="su-deal-preview"><h3>Deal preview</h3><dl><div><dt>Rights</dt><dd>{rightsLabel}</dd></div><div><dt>Writer payout</dt><dd className="is-positive">₹{Number(effectivePrice || 0).toLocaleString("en-IN")}</dd></div></dl></section>
      )}
      <section className="su-next-note"><h3>What happens next?</h3><p>After submission, an admin reviews the script and its terms. You'll receive a notification when the decision is ready.</p></section>
      <div className="su-helper__plan"><MatIcon name="inventory_2" size={15} />{user?.subscription?.plan || "Free"} plan</div>
    </aside>
  );
}

function UploadPanel({ vm }) {
  const { state, actions, elements, mode } = vm;
  const { fileInputRef } = elements;
  const fileReady = state.uploadedFile || state.existingUploadedFile || (state.fromDraft && state.textContent);
  const fileName = state.uploadedFile?.name || state.existingUploadedFile?.name || "Editor draft";
  const fileSize = state.uploadedFile?.size || state.existingUploadedFile?.size;
  return (
    <div className="su-panel-stack">
      {!fileReady ? (
        <div
          id="su-file-picker"
          className={`su-dropzone${state.isExtracting ? " is-busy" : ""}`}
          onDrop={actions.handleDrop}
          onDragOver={actions.handleDragOver}
          onClick={() => !state.isExtracting && fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (!state.isExtracting && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={state.isExtracting ? -1 : 0}
          aria-busy={state.isExtracting}
          {...validationFieldProps(state, "su-file-picker")}
        >
          <span className="su-dropzone__icon">{state.isExtracting ? <span className="su-spinner" /> : <MatIcon name="upload_file" size={30} />}</span>
          <h3>{state.isExtracting ? "Extracting your script" : "Drop your script here"}</h3>
          <p>PDF, DOCX, or DOC · up to 30 MB<br />Text and page count are detected automatically.</p>
          <span className="su-primary-inline"><MatIcon name="folder_open" size={18} />Browse files</span>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => actions.handleFileSelect(event.target.files?.[0])} disabled={state.isExtracting} />
          {state.uploadProgress > 0 && state.uploadProgress < 100 && <span className="su-upload-progress"><span style={{ width: `${state.uploadProgress}%` }} /></span>}
        </div>
      ) : (
        <div className="su-file-ready" role="status">
          <MatIcon name="task_alt" size={30} />
          <div><strong>{fileName}</strong><span>{fileSize ? formatFileSize(fileSize) : "Script content ready"}{state.formData.pageCount ? ` · ${state.formData.pageCount} pages` : ""}{state.pdfTextExtracted ? " · text extracted" : ""}</span></div>
          <button type="button" onClick={() => fileInputRef.current?.click()}>Replace</button>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => actions.handleFileSelect(event.target.files?.[0])} />
        </div>
      )}

      {!mode.isContentOnlyEditMode && !fileReady && (
        <>
          <div className="su-or"><span />or<span /></div>
          <div className="su-start-options">
            <button type="button" onClick={actions.openEditor}><MatIcon name="edit_note" size={22} /><span><strong>Write in the editor</strong><small>Start with screenplay formatting built in.</small></span></button>
            <button type="button" onClick={actions.openDrafts}><MatIcon name="history" size={22} /><span><strong>Use an existing draft</strong><small>Continue a project already saved to Ckript.</small></span></button>
          </div>
        </>
      )}

      {mode.isContentOnlyEditMode ? (
        <div className="su-content-editor">
          <FieldLabel htmlFor="su-script-content" meta="Required" required>Script content</FieldLabel>
          <textarea id="su-script-content" value={state.textContent} onChange={(event) => actions.setTextContent(event.target.value)} rows={20} {...validationFieldProps(state, "su-script-content")} />
          <p>This access level can update only the script body. Metadata and commercial terms remain unchanged.</p>
        </div>
      ) : (
        <div className="su-card su-title-card">
          <FieldLabel htmlFor="su-project-title" meta="Required" required>Project title</FieldLabel>
          <input id="su-project-title" name="title" value={state.formData.title} onChange={actions.handleChange} placeholder="Give your script a title" maxLength={200} {...validationFieldProps(state, "su-project-title")} />
          {fileReady && <p><MatIcon name="auto_awesome" size={15} />Review the title before continuing.</p>}
        </div>
      )}
    </div>
  );
}

function BasicsPanel({ vm }) {
  const { state, actions, options } = vm;
  const range = options.formatRanges[state.formData.format];
  return (
    <div className="su-panel-stack">
      <div className="su-grid-2">
        <div><FieldLabel meta="Required" required>Format</FieldLabel><TagSelect id="su-format" ariaLabel="Format" options={options.formats} value={state.formData.format} onChange={(v) => actions.handleChange({ target: { name: "format", value: v } })} size="sm" {...validationFieldProps(state, "su-format")} /></div>
        <div><FieldLabel meta="Auto-detected">Page count</FieldLabel><div id="su-page-count" className="su-readonly-value" tabIndex={-1} {...validationFieldProps(state, "su-page-count")}><strong>{state.formData.pageCount || "—"}</strong><span>pages</span></div></div>
      </div>
      {state.formData.format === "other" && <div><FieldLabel htmlFor="su-format-other" meta="Required" required>Custom format</FieldLabel><input id="su-format-other" name="formatOther" value={state.formData.formatOther} onChange={actions.handleChange} placeholder="Specify the format" {...validationFieldProps(state, "su-format-other")} /></div>}
      <div className={`su-length-card${state.pageCountWarning ? " has-warning" : ""}`}>
        <strong>{state.formData.pageCount || "—"}</strong>
        <div><h3>Estimated length · {range?.label || "Project"}</h3><p>{range ? `Typical range ${range.typical} pages` : "Detected from your script file"}</p><span>{state.pageCountWarning || "Your script length is within the expected range for this format."}</span></div>
      </div>
    </div>
  );
}

function StoryPanel({ vm }) {
  const { state, actions } = vm;
  return (
    <div className="su-panel-stack">
      <div><div className="su-label-row"><FieldLabel htmlFor="su-logline" meta={`Required · ${state.formData.logline.length}/500`} required>Logline</FieldLabel><button type="button" className="su-ai-button" disabled={Boolean(state.metaLoadingField)} onClick={() => actions.handleGenerateMetadata("logline")}><MatIcon name="auto_awesome" size={15} />{state.metaLoadingField === "logline" ? "Generating…" : "Generate"}</button></div><textarea id="su-logline" name="logline" value={state.formData.logline} onChange={actions.handleChange} maxLength={500} rows={3} placeholder="A one-sentence hook that sells your story…" {...validationFieldProps(state, "su-logline")} />{state.metaNotice.field === "logline" && <p className="su-field-notice">{state.metaNotice.text}</p>}</div>
      <div><div className="su-label-row"><FieldLabel htmlFor="su-synopsis" meta="Required" required>Synopsis</FieldLabel><button type="button" className="su-ai-button" disabled={Boolean(state.metaLoadingField)} onClick={() => actions.handleGenerateMetadata("synopsis")}><MatIcon name="auto_awesome" size={15} />{state.metaLoadingField === "synopsis" ? "Generating…" : "Generate"}</button></div><textarea id="su-synopsis" name="synopsis" value={state.formData.synopsis} onChange={actions.handleChange} rows={7} placeholder="A fuller summary of the plot, characters, and world…" {...validationFieldProps(state, "su-synopsis")} />{state.metaNotice.field === "synopsis" && <p className="su-field-notice">{state.metaNotice.text}</p>}</div>
      <div><FieldLabel htmlFor="su-tags" meta="Optional">Tags</FieldLabel><input id="su-tags" value={state.tagsInput} onChange={(event) => actions.setTagsInput(event.target.value)} placeholder="e.g. monsoon, detective, slow-burn" /></div>
    </div>
  );
}

function CastPanel({ vm }) {
  const { state, actions, options } = vm;
  return (
    <div className="su-panel-stack">
      <div className="su-section-toolbar"><strong>{state.roles.length} roles to fill</strong><div><button type="button" className="su-ai-button" disabled={Boolean(state.metaLoadingField)} onClick={() => actions.handleGenerateMetadata("roles")}><MatIcon name="auto_awesome" size={15} />{state.metaLoadingField === "roles" ? "Generating…" : "Suggest"}</button><button type="button" className="su-secondary-button" onClick={actions.addRole}><MatIcon name="add" size={16} />Add role</button></div></div>
      {state.metaNotice.field === "roles" && <p className="su-field-notice">{state.metaNotice.text}</p>}
      {state.roles.length === 0 ? <EmptyState>No roles added yet. Add one, or let AI suggest a starting cast from the uploaded script.</EmptyState> : (
        <div className="su-role-list" id="su-role-list" {...validationFieldProps(state, "su-role-list")}>{state.roles.map((role, index) => (
          <section className="su-role-card" key={`role-${index}`}>
            <header><span>{index + 1}</span><strong>{role.characterName || `Role ${index + 1}`}</strong><button type="button" onClick={() => actions.removeRole(index)} aria-label={`Remove role ${index + 1}`}><MatIcon name="close" size={16} /></button></header>
            <div className="su-grid-2"><input aria-label={`Role ${index + 1} character name`} value={role.characterName} onChange={(event) => actions.updateRoleField(index, "characterName", event.target.value)} placeholder="Character name" /><input aria-label={`Role ${index + 1} type`} value={role.type} onChange={(event) => actions.updateRoleField(index, "type", event.target.value)} placeholder="Lead, antagonist, supporting…" /></div>
            <div className="su-role-meta"><TagSelect ariaLabel={`Role ${index + 1} gender`} options={options.roleGenders} value={role.gender} onChange={(v) => actions.updateRoleField(index, "gender", v)} size="sm" /><input id={`su-role-${index}-min-age`} aria-label={`Role ${index + 1} minimum age`} type="number" min="0" value={role.ageRange?.min ?? ""} onChange={(event) => actions.updateRoleAge(index, "min", event.target.value)} placeholder="Min age" {...validationFieldProps(state, `su-role-${index}-min-age`)} /><input id={`su-role-${index}-max-age`} aria-label={`Role ${index + 1} maximum age`} type="number" min="0" value={role.ageRange?.max ?? ""} onChange={(event) => actions.updateRoleAge(index, "max", event.target.value)} placeholder="Max age" {...validationFieldProps(state, `su-role-${index}-max-age`)} /></div>
            <textarea aria-label={`Role ${index + 1} description`} value={role.description} onChange={(event) => actions.updateRoleField(index, "description", event.target.value)} rows={2} placeholder="Performance notes, emotional range, or casting vibe…" />
          </section>
        ))}</div>
      )}
    </div>
  );
}

function ProgressPanel({ vm }) {
  const { state, actions, options } = vm;
  return (
    <div className="su-panel-stack">
      <div><FieldLabel>Where is your script right now?</FieldLabel><div id="su-completion-status" className="su-completion-grid" {...validationFieldProps(state, "su-completion-status")}>{options.completion.map((item) => <button key={item.value} type="button" className={`su-choice${state.formData.completionStatus === item.value ? " is-selected" : ""}`} aria-pressed={state.formData.completionStatus === item.value} onClick={() => actions.setFormData((current) => ({ ...current, completionStatus: item.value }))}><strong>{item.label}</strong><span>{item.helper}</span></button>)}</div></div>
      {state.formData.completionStatus !== "complete" && <div className="su-grid-2"><div><FieldLabel htmlFor="su-completed-parts">Parts / episodes done</FieldLabel><input id="su-completed-parts" type="number" min="0" name="completedParts" value={state.formData.completedParts} onChange={actions.handleChange} placeholder="e.g. 4" {...validationFieldProps(state, "su-completed-parts")} /></div><div><FieldLabel htmlFor="su-total-parts">Total planned</FieldLabel><input id="su-total-parts" type="number" min="0" name="totalParts" value={state.formData.totalParts} onChange={actions.handleChange} placeholder="e.g. 10" {...validationFieldProps(state, "su-total-parts")} /></div></div>}
      <div><FieldLabel htmlFor="su-future-plans" meta={`${String(state.formData.futurePlans || "").length}/300`}>Anything else buyers should know?</FieldLabel><textarea id="su-future-plans" name="futurePlans" value={state.formData.futurePlans} onChange={actions.handleChange} maxLength={300} rows={4} placeholder="Add a short production-readiness note…" /></div>
    </div>
  );
}

function AccessPanel({ vm }) {
  const { state, actions } = vm;
  const start = Number(state.formData.previewWindowStart || 1);
  const end = Number(state.formData.previewWindowEnd || start);
  return (
    <div className="su-panel-stack">
      <div className="su-card su-switch-card"><div><strong>Viewable script preview</strong><p>Let buyers read a controlled page window before they unlock the full script. Admin review uses the same range.</p></div><Toggle checked={state.formData.viewableScript} onChange={(checked) => actions.setFormData((current) => ({ ...current, viewableScript: checked }))} label="Viewable script preview" /></div>
      {state.formData.viewableScript ? (
        <div className="su-card"><h3 className="su-card-title">Preview range</h3><div className="su-grid-2"><div><FieldLabel htmlFor="su-preview-start">First page</FieldLabel><input id="su-preview-start" type="number" min="1" name="previewWindowStart" value={state.formData.previewWindowStart} onChange={actions.handleChange} {...validationFieldProps(state, "su-preview-start")} /></div><div><FieldLabel htmlFor="su-preview-end">Last page</FieldLabel><input id="su-preview-end" type="number" min={start} name="previewWindowEnd" value={state.formData.previewWindowEnd} onChange={actions.handleChange} {...validationFieldProps(state, "su-preview-end")} /></div></div><p className="su-preview-caption">Buyers will see pages <strong>{start}</strong> to <strong>{end}</strong> of {state.formData.pageCount || "—"}.</p><div className="su-pdf-preview"><ScreenplayPdfViewer pdfFile={state.uploadedPdfFile} pdfUrl={state.uploadedFile?.previewUrl || state.uploadedFile?.url || state.existingUploadedFile?.url || ""} title={state.formData.title || "Script"} startPage={start} endPage={end} fallbackPages={state.pdfPageTexts.slice(Math.max(0, start - 1), Math.max(0, end)).map((text, index) => ({ pageNumber: start + index, text: String(text || "") }))} fallbackText={state.pdfPageTexts.join("\n\n")} /></div></div>
      ) : <EmptyState>No preview will be shown. Buyers will see only the listing metadata until they purchase access.</EmptyState>}
    </div>
  );
}

function MediaPanel({ vm }) {
  const { state, actions, elements, mode } = vm;
  const { thumbnailInputRef, trailerInputRef, pitchVideoInputRef } = elements;
  const plan = String(vm.user?.subscription?.plan || "free").toLowerCase();
  const pitchLocked = ["free", "silver"].includes(plan);
  const hasCoverHistory = state.aiCoverHistory.length > 1;

  return (
    <div id="su-media" className="su-media-grid" tabIndex={-1} {...validationFieldProps(state, "su-media")}>
      <section className="su-card">
        <h3 className="su-card-title">Cover image</h3>
        {!state.thumbnailFile ? (
          <div className="su-media-actions">
            <button type="button" onClick={() => thumbnailInputRef.current?.click()}>
              <MatIcon name="image" size={24} />
              <strong>Upload</strong>
              <small>JPG/PNG · 5 MB</small>
            </button>
            <button type="button" className="is-ai" disabled={state.isGeneratingAiCover} onClick={actions.generateAiCover}>
              {state.isGeneratingAiCover ? <span className="su-spinner" /> : <MatIcon name="auto_awesome" size={24} />}
              <strong>{state.isGeneratingAiCover ? "Generating…" : "AI generate"}</strong>
              <small>From your script</small>
            </button>
          </div>
        ) : (
          <div className="su-cover-ready">
            <img src={state.thumbnailPreviewUrl} alt="Selected script cover" />
            <div>
              <strong>{state.thumbnailFile.name || "AI-generated cover"}</strong>
              <span>Cover ready · {state.aiCoverAttempts}/3 AI tries used</span>
              {hasCoverHistory && (
                <div className="su-cover-history" aria-label="AI cover history">
                  <button type="button" disabled={state.aiCoverIndex <= 0} onClick={() => actions.setAiCoverHistoryIndex(state.aiCoverIndex - 1)} aria-label="Previous AI cover">
                    <MatIcon name="chevron_left" size={17} />
                  </button>
                  <small>{state.aiCoverIndex + 1} of {state.aiCoverHistory.length}</small>
                  <button type="button" disabled={state.aiCoverIndex >= state.aiCoverHistory.length - 1} onClick={() => actions.setAiCoverHistoryIndex(state.aiCoverIndex + 1)} aria-label="Next AI cover">
                    <MatIcon name="chevron_right" size={17} />
                  </button>
                </div>
              )}
              <div>
                <button type="button" onClick={() => thumbnailInputRef.current?.click()}>Replace</button>
                <button type="button" onClick={actions.generateAiCover} disabled={state.aiCoverAttempts >= 3 || state.isGeneratingAiCover}>Try another</button>
                <button type="button" onClick={() => actions.downloadWatermarkedImage(state.thumbnailFile)}>Download proof</button>
                <button type="button" onClick={() => actions.setThumbnailFile(null)}>Remove</button>
              </div>
            </div>
          </div>
        )}
        <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { actions.handleThumbnailSelect(event.target.files?.[0]); event.target.value = ""; }} />
      </section>

      <section className="su-card">
        <h3 className="su-card-title">Trailer video</h3>
        {!state.trailerFile ? (
          <button type="button" className="su-media-drop" onClick={() => trailerInputRef.current?.click()}>
            <MatIcon name="movie" size={26} />
            <strong>Upload trailer</strong>
            <small>MP4 · MOV · up to 250 MB</small>
          </button>
        ) : (
          <div className="su-video-ready">
            <video src={state.trailerPreviewUrl} controls preload="metadata" />
            <div>
              <span><MatIcon name="check_circle" size={18} /><strong>{state.trailerFile.name}</strong></span>
              {state.trailerMetaLabel && <small>{state.trailerMetaLabel}</small>}
              <button type="button" onClick={() => actions.setTrailerFile(null)}>Remove</button>
            </div>
          </div>
        )}
        <input ref={trailerInputRef} type="file" accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v" onChange={(event) => { actions.handleTrailerSelect(event.target.files?.[0]); event.target.value = ""; }} />
      </section>

      <section className="su-card su-pitch-card">
        <div>
          <h3 className="su-card-title">Pitch video {pitchLocked && <span>Premium</span>}</h3>
          <p>A personal pitch up to 90 seconds and 90 MB.</p>
        </div>
        {pitchLocked ? (
          <button type="button" className="su-upgrade" onClick={actions.openPricing}><MatIcon name="lock" size={16} />Upgrade to unlock</button>
        ) : !state.pitchVideoFile ? (
          <button type="button" className="su-secondary-button" onClick={() => pitchVideoInputRef.current?.click()}><MatIcon name="upload" size={17} />Upload pitch</button>
        ) : (
          <div className="su-pitch-ready">
            {state.pitchVideoPreviewUrl && <video src={state.pitchVideoPreviewUrl} controls preload="metadata" />}
            <strong>{state.pitchVideoFile.name}</strong>
            {state.pitchVideoMetaLabel && <small>{state.pitchVideoMetaLabel}</small>}
            <button type="button" onClick={() => actions.setPitchVideoFile(null)}>Remove</button>
          </div>
        )}
        <input ref={pitchVideoInputRef} type="file" accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v" onChange={(event) => { actions.handlePitchVideoSelect(event.target.files?.[0]); event.target.value = ""; }} />
      </section>

      {mode.editId && <p className="su-media-note">New media is uploaded after the project metadata update succeeds. Existing public media remains in place unless replaced.</p>}
    </div>
  );
}

function ClassifyPanel({ vm }) {
  const { state, actions, options } = vm;
  const rows = [
    ["tones", "Tones", options.tones],
    ["themes", "Themes", options.themes],
    ["settings", "Settings", options.settings],
  ];

  return (
    <div className="su-panel-stack">
      <div>
        <FieldLabel htmlFor="su-primary-genre" meta="Required" required>Primary genre</FieldLabel>
        <TagSelect
          id="su-primary-genre"
          ariaLabel="Primary genre"
          options={options.genres}
          value={state.formData.primaryGenre}
          onChange={(v) => actions.handleChange({ target: { name: "primaryGenre", value: v } })}
          size="sm"
          {...validationFieldProps(state, "su-primary-genre")}
        />
      </div>

      {rows.map(([key, label, pool]) => {
        const selected = state.classification[key];
        return (
          <div key={key}>
            <FieldLabel meta={selected.length + "/3"}>{label}</FieldLabel>
            <TagSelect
              ariaLabel={label}
              options={pool}
              value={selected}
              onChange={(next) => {
                const changed = next.length > selected.length
                  ? next.find((v) => !selected.includes(v))
                  : selected.find((v) => !next.includes(v));
                if (changed) actions.toggleClassification(key, changed);
              }}
              multiple
              max={3}
              size="sm"
            />
          </div>
        );
      })}
    </div>
  );
}

function FilmPanel({ vm }) {
  const { state, actions, options } = vm;
  const creativeRoles = [
    ["wantToDirect", "Want to Direct", "I want to direct this script myself"],
    ["wantToProduce", "Want to Produce", "I am also the producer of this project"],
  ];
  const dialogueOptions = [
    ["yes", "Yes — Full Dialogues"],
    ["partial", "Partial — Some Dialogues"],
    ["no", "No — Action / Direction Only"],
  ];

  return (
    <div className="su-panel-stack">
      <div>
        <FieldLabel>Your creative role</FieldLabel>
        <div className="su-grid-2">
          {creativeRoles.map(([key, title, desc]) => (
            <button
              type="button"
              key={key}
              className={"su-choice su-choice--inline" + (state.filmDetails[key] ? " is-selected" : "")}
              aria-pressed={state.filmDetails[key]}
              onClick={() => actions.setFilmDetails((current) => ({ ...current, [key]: !current[key] }))}
            >
              <span><strong>{title}</strong><small>{desc}</small></span>
              {state.filmDetails[key] && <MatIcon name="check_circle" size={20} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel meta="Required" required>Film language</FieldLabel>
        <div id="su-film-language" className="su-button-chips" tabIndex={-1} {...validationFieldProps(state, "su-film-language")}>
          {options.languages.map((language) => (
            <button
              type="button"
              key={language}
              className={state.filmDetails.filmLanguage === language ? "is-selected" : ""}
              aria-pressed={state.filmDetails.filmLanguage === language}
              onClick={() => actions.setFilmDetails((current) => ({
                ...current,
                filmLanguage: current.filmLanguage === language ? "" : language,
              }))}
            >
              {language}
            </button>
          ))}
        </div>
        {state.filmDetails.filmLanguage === "Other" && (
          <input
            id="su-film-language-custom"
            className="su-followup-input"
            aria-label="Custom film language"
            value={state.filmDetails.filmLanguageCustom || ""}
            onChange={(event) => actions.setFilmDetails((current) => ({ ...current, filmLanguageCustom: event.target.value }))}
            placeholder="Specify the film language"
            maxLength={80}
            {...validationFieldProps(state, "su-film-language-custom")}
          />
        )}
      </div>

      <div>
        <FieldLabel>Dialogues</FieldLabel>
        <div className="su-button-chips">
          {dialogueOptions.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={state.filmDetails.dialoguesPresent === value ? "is-selected" : ""}
              aria-pressed={state.filmDetails.dialoguesPresent === value}
              onClick={() => actions.setFilmDetails((current) => ({ ...current, dialoguesPresent: value }))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>


    </div>
  );
}

function PublishPanel({ vm }) {
  const { state, actions, options, computed, elements } = vm;
  const { agreementRef } = elements;
  const [openSection, setOpenSection] = useState("payment");
  const freePlan = ["free", "none", ""].includes(String(vm.user?.subscription?.plan || "free").toLowerCase());
  const royaltyBased = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(state.rightsLicensing.paymentStructure);
  const legalAck = state.rightsLicensing.legalAcknowledgement;
  const setRights = (patch) => actions.setRightsLicensing((current) => ({ ...current, ...patch }));
  const setAck = (key, checked) => actions.setRightsLicensing((current) => ({
    ...current,
    legalAcknowledgement: { ...current.legalAcknowledgement, [key]: checked },
  }));
  const accordionSections = [
    ["modification", "Modification rights", options.modification.find((item) => item.value === state.rightsLicensing.modificationRights)?.label],
    ["payment", "Payment structure", options.payments.find((item) => item.value === state.rightsLicensing.paymentStructure)?.label],
    ["negotiation", "Negotiation mode", options.negotiations.find((item) => item.value === state.rightsLicensing.negotiationMode)?.label],
    ["custom", "Custom conditions & investor terms", "Optional"],
  ];
  const validationFieldId = state.validationErrors?.find((validationIssue) => validationIssue.screen === "publish")?.fieldId || "";
  const validationSection = validationFieldId.includes("modification")
    ? "modification"
    : validationFieldId.includes("payment") || validationFieldId.includes("royalty")
      ? "payment"
      : validationFieldId.includes("negotiation")
        ? "negotiation"
        : validationFieldId.includes("conditions") || validationFieldId.includes("investor")
          ? "custom"
          : "";
  const visibleSection = validationSection || openSection;

  return (
    <div className="su-panel-stack su-publish-panel">

      <div className="su-card su-pricing-card">
        <header>
          <div><h3>Set your script price</h3></div>
        </header>
        <div className="su-price-row">
          {options.pricePresets.map((price) => {
            const selected = !state.useCustomPrice && state.scriptPrice === price;
            return (
              <button
                type="button"
                key={price}
                className={selected ? "is-selected" : ""}
                aria-pressed={selected}
                onClick={() => {
                  actions.setUseCustomPrice(false);
                  actions.setScriptPrice(price);
                }}
              >
                ₹{price}
              </button>
            );
          })}
          <button type="button" className={state.useCustomPrice ? "is-selected" : ""} aria-pressed={state.useCustomPrice} onClick={() => actions.setUseCustomPrice(true)}>
            Custom
          </button>
        </div>
        {state.useCustomPrice && (
          <input
            id="su-custom-price"
            aria-label="Custom script access price"
            type="number"
            min="1"
            value={state.customPriceInput}
            onChange={(event) => actions.setCustomPriceInput(event.target.value.replace(/^0+(?=\d)/, ""))}
            placeholder="Enter access price"
            {...validationFieldProps(state, "su-custom-price")}
          />
        )}

      </div>

      <div className="rounded-2xl border p-4 min-[420px]:p-5 sm:p-6 space-y-6 border-emerald-200 bg-emerald-50/60">
        <div>
          <h3 className="text-sm font-bold text-emerald-700">Rights Type</h3>
          <p className="text-xs mb-3 text-gray-600">What type of rights are you offering?</p>
          <TagSelect
            ariaLabel="Rights Type"
            options={[{ value: "full_rights_sale", label: "Full Rights Sale (Ownership Transfer)" }, { value: "exclusive_license", label: "Exclusive License" }, { value: "custom_negotiation_required", label: "Custom Negotiation Required" }]}
            value={state.rightsLicensing.rightsType || "custom_negotiation_required"}
            onChange={(v) => setRights({ rightsType: v })}
            size="sm"
          />
        </div>

        {state.rightsLicensing.rightsType === "exclusive_license" && (
          <div>
            <h3 className="text-sm font-bold text-emerald-700">License Duration</h3>
            <p className="text-xs mb-3 text-gray-600">How many months will the license last?</p>
            <input type="number" min="1" max="120" value={state.rightsLicensing.timeBound?.licenseDurationMonths || 12} onChange={(e) => setRights({ timeBound: { ...state.rightsLicensing.timeBound, licenseDurationMonths: Number(e.target.value) } })} className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-all bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:bg-white" />
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-emerald-700">Modification Rights</h3>
          <p className="text-xs mb-3 text-gray-600">How much creative control are you willing to give up?</p>
          <TagSelect
            ariaLabel="Modification Rights"
            options={[{ value: "buyer_can_modify_freely", label: "Publisher can modify freely" }, { value: "buyer_must_consult_writer", label: "Must consult writer" }, { value: "writer_retains_creative_approval_rights", label: "Writer approval required" }]}
            value={state.rightsLicensing.modificationRights || ""}
            onChange={(v) => setRights({ modificationRights: v })}
            size="sm"
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-emerald-700">Payment Structure</h3>
          <p className="text-xs mb-3 text-gray-600">How do you expect to be paid for these rights?</p>
          <TagSelect
            ariaLabel="Payment Structure"
            options={[{ value: "one_time_upfront_payment", label: "One-time upfront payment" }, { value: "lower_upfront_plus_royalty_percent", label: "Lower upfront + royalty %" }, { value: "revenue_sharing_model", label: "Revenue sharing model" }, { value: "custom_deal", label: "Custom deal" }]}
            value={state.rightsLicensing.paymentStructure || ""}
            onChange={(v) => setRights({ paymentStructure: v })}
            size="sm"
          />
        </div>

        {royaltyBased && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-700">Royalty Percentage (%)</h3>
              <input type="number" min="0" max="100" value={state.rightsLicensing.royaltySettings?.percentage || 0} onChange={(e) => setRights({ royaltySettings: { ...state.rightsLicensing.royaltySettings, percentage: Number(e.target.value) } })} className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-all bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:bg-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-700">Royalty Duration</h3>
              <TagSelect
                ariaLabel="Royalty duration"
                options={[{ value: "none", label: "None" }, { value: "project_lifetime", label: "Project Lifetime" }, { value: "years", label: "Fixed Years" }]}
                value={state.rightsLicensing.royaltySettings?.durationType || "none"}
                onChange={(v) => setRights({ royaltySettings: { ...state.rightsLicensing.royaltySettings, durationType: v } })}
                size="sm"
              />
            </div>
            {state.rightsLicensing.royaltySettings?.durationType === "years" && (
              <div className="sm:col-span-2">
                <h3 className="text-sm font-bold text-emerald-700">Number of Years</h3>
                <input type="number" min="1" max="99" value={state.rightsLicensing.royaltySettings?.durationYears || 1} onChange={(e) => setRights({ royaltySettings: { ...state.rightsLicensing.royaltySettings, durationYears: Number(e.target.value) } })} className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-all bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:bg-white" />
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-emerald-700">Negotiation Mode</h3>
          <p className="text-xs mb-3 text-gray-600">Are you open to counter-offers?</p>
          <TagSelect
            ariaLabel="Negotiation Mode"
            options={[{ value: "fixed_terms_non_negotiable", label: "Fixed terms" }, { value: "open_to_discussion_after_purchase", label: "Open to negotiation" }]}
            value={state.rightsLicensing.negotiationMode || ""}
            onChange={(v) => setRights({ negotiationMode: v })}
            size="sm"
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-emerald-700">Custom Conditions (Optional)</h3>
          <textarea
            placeholder="e.g. Specific investor terms, guaranteed credit conditions..."
            value={state.rightsLicensing.customConditions || ""}
            onChange={(e) => setRights({ customConditions: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-all bg-white border-gray-200 text-gray-900 focus:border-emerald-500 focus:bg-white min-h-[100px] resize-y"
          />
        </div>
      </div>

      <div className="su-card su-legal-card">
        <h3 className="su-card-title">Legal acknowledgements</h3>
        <div className="su-legal-checks">
          <label>
            <input
              id="su-legal-terms"
              type="checkbox"
              checked={state.legal.agreedToTerms && legalAck.platformTermsAccepted}
              onChange={(event) => {
                const checked = event.target.checked;
                actions.setLegal((current) => ({ ...current, agreedToTerms: checked }));
                setAck("platformTermsAccepted", checked);
              }}
              {...validationFieldProps(state, "su-legal-terms")}
            />
            <span>I accept the <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer">Script Upload Terms & Conditions</Link>.</span>
          </label>
          <label>
            <input
              id="su-legal-ownership"
              type="checkbox"
              checked={legalAck.ownershipConfirmed || false}
              onChange={(event) => setAck("ownershipConfirmed", event.target.checked)}
              {...validationFieldProps(state, "su-legal-ownership")}
            />
            <span>I explicitly confirm that I am the sole creator or own the IP outright.</span>
          </label>
        </div>
        <div ref={agreementRef} className="su-agreement" tabIndex="0">
          <pre>{computed.legalAgreement}</pre>
        </div>
        <p className="su-agreement-status">{state.agreementScrolled ? "Agreement reviewed" : "Scroll to review the complete agreement"}</p>
      </div>


    </div>
  );
}

export default function ScriptUploadWorkspace({ vm }) {
  const { state, actions, mode, computed } = vm;
  const screenKey = state.step === 1 ? "upload" : state.step === 2 ? ["basics", "story", "cast", "progress", "access", "media"][state.detailStep] : state.step === 3 ? "classify" : state.step === 4 ? "film" : "publish";
  const copy = SCREEN_COPY[screenKey];
  const progress = Math.round(({ 1: 0, 3: 78, 4: 89, 5: 100 }[state.step] ?? ((state.detailStep + 1) / 9 * 100)));
  const rightsLabel = vm.options.rights.find((item) => item.value === state.rightsLicensing.rightsType)?.short || "Custom";
  const formatLabel = vm.options.formats.find((item) => item.value === state.formData.format)?.label || "—";
  const currentValidationErrors = useMemo(
    () => (state.validationErrors || []).filter((validationIssue) => validationIssue.screen === screenKey),
    [screenKey, state.validationErrors]
  );
  const unlockedDetail = state.step > 2 ? 5 : state.detailStep;
  const Panel = useMemo(() => ({ upload: UploadPanel, basics: BasicsPanel, story: StoryPanel, cast: CastPanel, progress: ProgressPanel, access: AccessPanel, media: MediaPanel, classify: ClassifyPanel, film: FilmPanel, publish: PublishPanel }[screenKey]), [screenKey]);

  useEffect(() => {
    if (!state.validationAttempt || !currentValidationErrors.length) return undefined;
    const timer = window.setTimeout(() => {
      const validationIssue = currentValidationErrors[0];
      const target = document.getElementById(validationIssue.fieldId) || document.getElementById("su-upload-toast");
      if (!target) return;
      target.scrollIntoView?.({ behavior: "smooth", block: "center" });
      const focusTarget = target.matches("button, input, select, textarea, [tabindex]")
        ? target
        : target.querySelector("button, input, select, textarea, [tabindex]");
      focusTarget?.focus({ preventScroll: true });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [currentValidationErrors, screenKey, state.validationAttempt]);

  return (
    <main className="script-upload-workspace">
      <AnimatePresence>{state.toastMessage && <UploadToast toast={state.toastMessage} onDismiss={actions.dismissToast} />}</AnimatePresence>
      {!mode.isContentOnlyEditMode && <WorkflowTracker step={state.step} progress={progress} onStepSelect={actions.onStepSelect} limit={state.scriptLimit} />}
      <section className="su-main-column">
        {!mode.isContentOnlyEditMode && state.step === 2 && <DetailTabs current={state.detailStep} unlocked={unlockedDetail} onSelect={actions.onDetailSelect} />}
        {!mode.isContentOnlyEditMode && <div className="su-mobile-phases">{PHASES.map((phase) => <button type="button" key={phase.num} disabled={phase.num > state.step} className={phase.num === state.step ? "is-active" : ""} onClick={() => actions.onStepSelect(phase.num)}><span>{phase.num < state.step ? <MatIcon name="check" size={13} /> : phase.num}</span>{phase.label}</button>)}</div>}
        <form className="su-form" onSubmit={actions.handleSubmit}>
          <div className="su-scroll" id="script-upload-scroll">
            <div className="su-content">
              <header className="su-screen-header"><span>{mode.isContentOnlyEditMode ? "Content-only edit" : copy[0]}</span><h1>{mode.isContentOnlyEditMode ? "Edit script content" : mode.editId && state.step === 1 ? "Update your script" : copy[1]}</h1><p>{mode.isContentOnlyEditMode ? "Update the body of the script without changing owner-controlled metadata or commercial terms." : copy[2]}</p></header>
              {state.pdfNotice && <div className="su-alert su-alert--warning" role="status"><MatIcon name="warning" size={19} /><span>{state.pdfNotice}</span></div>}
              {state.creationBlocked && <div className="su-alert su-alert--limit" role="alert"><MatIcon name="lock" size={19} /><span><strong>You've reached your {state.scriptLimit?.plan || "current"} plan limit.</strong><small>You already have {state.scriptLimit?.used || 0} submitted scripts. Upgrade before starting another upload.</small><Link to="/pricing">View plans & upgrade</Link></span></div>}
              <AnimatePresence mode="wait"><Motion.div key={screenKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}><Panel vm={vm} /></Motion.div></AnimatePresence>
            </div>
          </div>
          <footer className="su-action-bar">
            {mode.isContentOnlyEditMode ? <><button type="button" className="su-back" onClick={actions.cancelContentEdit}><MatIcon name="close" size={17} />Cancel</button><span className="su-save-state">Only script content will change</span><button type="submit" className="su-next" disabled={state.loading}>{state.loading ? "Saving…" : "Submit revision"}<MatIcon name="arrow_forward" size={18} /></button></> : <><button type="button" className="su-back" disabled={state.step === 1} onClick={actions.handleBack}><MatIcon name="arrow_back" size={18} />Back</button><span className="su-save-state"><MatIcon name="cloud_done" size={15} />{mode.editId ? "Changes submit for review" : state.fromDraft ? "Draft saved" : "Drafts stay private"}</span><span className="su-action-spacer" />{!mode.editId && <button type="button" className="su-save" onClick={actions.handleSaveDraft} disabled={state.loading || state.creationBlocked || state.mediaRecoveryPending}>{state.loading ? "Saving…" : state.mediaRecoveryPending ? "Project saved" : "Save draft"}</button>}{state.step === 5 ? <button type="submit" className="su-publish" disabled={state.loading || state.creationBlocked}>{state.loading ? "Submitting…" : mode.editId ? "Submit update" : "Publish for review"}<MatIcon name="arrow_forward" size={18} /></button> : <button type="button" className="su-next" onClick={actions.handleNext} disabled={state.creationBlocked || state.isExtracting}>{state.step === 2 && state.detailStep < 5 ? "Next" : state.step === 2 ? "Continue to Classify" : "Continue"}<MatIcon name="arrow_forward" size={18} /></button>}</>}
          </footer>
        </form>
      </section>
      {!mode.isContentOnlyEditMode && <HelperRail screenKey={screenKey} formData={state.formData} formatLabel={formatLabel} roles={state.roles} effectivePrice={computed.effectivePrice} rightsLabel={rightsLabel} user={vm.user} step={state.step} />}
    </main>
  );
}
