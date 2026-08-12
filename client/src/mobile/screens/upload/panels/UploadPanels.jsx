import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SCRIPT_UPLOAD_TERMS_VERSION } from "../../../../constants/scriptUploadTerms";
import Button from "../../../components/buttons/Button";
import IconButton from "../../../components/buttons/IconButton";
import Card, { CardBody } from "../../../components/cards/Card";
import InlineMessage from "../../../components/feedback/InlineMessage";
import Checkbox from "../../../components/forms/Checkbox";
import ChipSelect from "../../../components/forms/ChipSelect";
import formatFileSize from "../../../components/forms/formatFileSize";
import RadioGroup from "../../../components/forms/RadioGroup";
import Switch from "../../../components/forms/Switch";
import TextArea from "../../../components/forms/TextArea";
import TextField from "../../../components/forms/TextField";
import Icon from "../../../components/Icon";
import MediaSlot from "../../../components/media/MediaSlot";
import PreviewDialog from "../../../components/media/PreviewDialog";

/*
 * The ten panels of the mobile upload flow (prefix: ckm-upload).
 *
 * WHY THESE ARE NOT `screens/create/panels/` (decision D10, §19.3)
 * ---------------------------------------------------------------
 * The previous session's `next_action` asked whether ScriptUpload's state could
 * feed the create-project panels. It was checked field by field, and the answer
 * is no — not because the two flows look different, but because five of the ten
 * panels ask genuinely different questions. `basics` here is format plus a page
 * count DETECTED FROM A PDF; there it is writer credits plus a page count
 * derived from the Fountain text. `access` reads `pdfPageTexts` from the
 * extractor; there it reads Fountain pages. `publish` has different price
 * presets and — documented at length in `scriptUploadValidation.js` — exactly
 * ONE required legal acknowledgement, because requiring the second one once made
 * this flow impossible to finish. And `upload` has no counterpart at all.
 *
 * Driving those panels through a synthesised `CreateProjectContext` would mean a
 * context answering `writers`, `targetFilm` and `estimatedPages` with fictions,
 * and would silently re-point `/upload` every time somebody edited a
 * create-project panel. So what is shared is the *component family* — the Phase
 * 1 form controls and the `ckm-media` slots, cropper and preview, all of which
 * these panels use unchanged.
 *
 * EVERY PANEL READS THE SAME `vm` THE DESKTOP WORKSPACE READS.
 * `pages/ScriptUpload.jsx` assembles one view model and hands it to whichever
 * chrome is mounted. No state, no fetch and no validation lives here: this file
 * decides what is on screen, never what is true.
 *
 * VALIDATION IS THE SHARED CONTRACT, HONOURED TWO WAYS (decision D11).
 * `validateUploadScreen` returns issues carrying `{ screen, step, detailStep,
 * fieldId, message }`. The message becomes the control's `error` prop, so the
 * Phase 1 `Field` wires `aria-invalid` and `aria-describedby` for free; and the
 * `fieldId` becomes the id of a wrapper around that control, so the
 * orchestrator's existing `document.getElementById(fieldId)` → `scrollIntoView`
 * → focus-first-descendant routine finds it without a second lookup table.
 */

/* ───────────────────────── Shared panel parts ───────────────────────── */

/*
 * Every panel opens with the same two lines. A plain <h2> because the screen's
 * <h1> is the project title in the app bar, and the panels are the only things
 * under it — an <h3> here would skip a level.
 */
function PanelHead({ title, blurb }) {
  return (
    <header className="ckm-upload__panel-head">
      <h2 className="ckm-upload__panel-title">{title}</h2>
      {blurb && <p className="ckm-upload__panel-blurb">{blurb}</p>}
    </header>
  );
}

/*
 * The anchor the shared validation contract navigates to. It carries the
 * contract's `fieldId` and nothing else — no styling, no semantics — because its
 * whole job is to be findable by `getElementById`. Wrapping is used rather than
 * pinning the id onto the control itself so that the Phase 1 `Field` keeps
 * generating the id its <label> points at; a pinned id would silently break that
 * association, which is a worse bug than the one it solves.
 */
function Anchor({ id, children }) {
  return <div className="ckm-upload__anchor" id={id}>{children}</div>;
}

const errorFor = (vm, fieldId) => (
  vm.state.validationErrors?.find((issue) => issue.fieldId === fieldId)?.message || ""
);

/*
 * An AI generator attached to the field above it. Rendered *after* the control
 * rather than inside the label (where desktop puts it): on a phone the label is
 * the first thing read and the last thing that should carry a second tab stop.
 * `tertiary`, never primary — the writer's own words are the primary path.
 */
function AiAction({ label, pending, disabled, onClick, notice = "" }) {
  return (
    <>
      <Button
        size="sm"
        variant="tertiary"
        icon="auto_awesome"
        pending={pending}
        disabled={disabled}
        onClick={onClick}
        className="ckm-upload__ai-action"
      >
        {pending ? "Generating…" : label}
      </Button>
      {notice && <p className="ckm-upload__note">{notice}</p>}
    </>
  );
}

/* ─────────────────── Panel 1 · Upload (the script file) ─────────────── */

/*
 * The one panel with no counterpart in the create-project wizard, and the one
 * that carries this bullet's name.
 *
 * DESKTOP'S PROGRESS BAR IS NOT PORTED, AND THAT IS THE POINT (DEF-9).
 * `handleFileSelect` starts a `setInterval` that adds 10% every 200ms and stops
 * at 90%, then jumps to 100% when `POST /scripts/extract-pdf` resolves. The
 * number is invented: the request reports no progress, so on a slow phone the
 * bar sits at "90%" for however long the upload really takes. WCAG 4.1.3 treats
 * a progress bar as a status message, and a status message that states something
 * untrue is worse than none. So extraction is an INDETERMINATE busy state here,
 * named in words — and the determinate bars are kept for the media uploads,
 * where D14 makes the number real.
 *
 * DRAG-AND-DROP IS NOT PORTED EITHER. Desktop's dropzone is a `<div
 * role="button">` with `onDrop`/`onDragOver`. A touch screen has nothing to drag
 * a file *from*; what a phone has is a picker that is also the camera roll and
 * the file provider. So this is a real `<label>` for a real `<input
 * type="file">`, which MDN gives as the way to make one both stylable and
 * reachable by assistive technology.
 */
function UploadPanel({ vm }) {
  const { state, actions, mode } = vm;
  const inputRef = useRef(null);

  const attached = state.uploadedFile || state.existingUploadedFile;
  const fromEditor = !attached && state.fromDraft && state.textContent;
  const ready = Boolean(attached || fromEditor);

  const fileName = state.uploadedFile?.name || state.existingUploadedFile?.name || "Draft from the editor";
  const fileSize = state.uploadedFile?.size ?? state.existingUploadedFile?.size ?? null;

  const handleChange = (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (chosen) actions.handleFileSelect(chosen);
  };

  if (mode.isContentOnlyEditMode) {
    return (
      <>
        <PanelHead
          title="Edit the script content"
          blurb="You have content access to this project. The body of the script is yours to change; the listing, the terms and the price stay as the owner set them."
        />
        <Anchor id="su-script-content">
          <TextArea
            label="Script content"
            required
            rows={18}
            value={state.textContent}
            error={errorFor(vm, "su-script-content")}
            onChange={(event) => actions.setTextContent(event.target.value)}
          />
        </Anchor>
        <p className="ckm-upload__note">
          <Icon name="info" size={16} className="ckm-upload__note-icon" />
          <span>
            Submitting sends this as a revision for the owner to review. It does not publish
            anything on its own.
          </span>
        </p>
      </>
    );
  }

  return (
    <>
      <PanelHead
        title={mode.editId ? "Update your script" : "Add your script"}
        blurb="Upload the file you already have. Ckript reads the text out of it and counts the pages, so the rest of the flow can be about the story rather than the paperwork."
      />

      <Anchor id="su-file-picker">
        {ready ? (
          <Card className="ckm-upload__file">
            <CardBody className="ckm-upload__file-body">
              <p className="ckm-upload__file-head">
                <Icon name="task_alt" size={20} className="ckm-upload__file-tick" />
                <span className="ckm-upload__file-name">{fileName}</span>
              </p>
              <p className="ckm-upload__file-meta">
                {[
                  fileSize ? formatFileSize(fileSize) : "Script content ready",
                  state.formData.pageCount ? `${state.formData.pageCount} pages` : null,
                  state.pdfTextExtracted ? "text extracted" : null,
                ].filter(Boolean).join(" · ")}
              </p>
              <div className="ckm-upload__file-actions">
                <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                  Replace the file
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {/*
              * `aria-busy` and a live region while extracting, and the label is
              * genuinely disabled meanwhile — picking a second file mid-extract
              * would race two requests whose results both write `textContent`.
              */}
            <label
              className={`ckm-upload__picker${state.isExtracting ? " is-busy" : ""}`}
              htmlFor="ckm-upload-file"
              aria-busy={state.isExtracting || undefined}
            >
              <Icon
                name={state.isExtracting ? "hourglass_top" : "upload_file"}
                size={30}
                className="ckm-upload__picker-icon"
              />
              <span className="ckm-upload__picker-title">
                {state.isExtracting ? "Reading your script…" : "Choose your script file"}
              </span>
              <span className="ckm-upload__picker-hint">
                {state.isExtracting
                  ? "This takes a few seconds. You can leave the screen open."
                  : "PDF, DOCX or DOC · up to 30 MB"}
              </span>
              {/* Indeterminate, because the request reports no progress. The
                  bar animates to say "still working" and claims no figure. */}
              {state.isExtracting && <span className="ckm-upload__picker-bar" aria-hidden="true" />}
            </label>

            {state.isExtracting && (
              <p className="ckm-upload__sr-status" role="status" aria-live="polite">
                Reading your script file.
              </p>
            )}
          </>
        )}

        {/*
          * Named explicitly, for the same reason `MediaSlot`'s input is: in the
          * empty state the picker `<label for>` names it, but once a file is
          * attached that label is gone — what is drawn is the file card and a
          * Replace button that clicks this from JS — and the input became a
          * silent focus stop. Found by the 2026-08-09 sweep's unnamed-control
          * leg, in a state no earlier fixture had rendered.
          */}
        <input
          ref={inputRef}
          id="ckm-upload-file"
          type="file"
          className="ckm-upload__file-input"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-label={ready ? "Replace your script file" : "Choose your script file"}
          disabled={state.isExtracting}
          onChange={handleChange}
        />
      </Anchor>

      {!ready && !mode.editId && (
        <>
          <p className="ckm-upload__or"><span>or start another way</span></p>
          <div className="ckm-upload__starts">
            <Button variant="secondary" icon="edit_note" onClick={actions.openEditor}>
              Write in the screenplay editor
            </Button>
            <Button variant="secondary" icon="folder_open" onClick={actions.openDrafts}>
              Continue a saved project
            </Button>
          </div>
        </>
      )}

      <Anchor id="su-project-title">
        <TextField
          label="Project title"
          required
          name="title"
          maxLength={200}
          value={state.formData.title}
          error={errorFor(vm, "su-project-title")}
          onChange={actions.handleChange}
          placeholder="Give your script a title"
          hint={ready ? "Check this before continuing — it is what buyers see first." : ""}
        />
      </Anchor>
    </>
  );
}

/* ─────────────────────── Panel 2.1 · Project basics ─────────────────── */

function BasicsPanel({ vm }) {
  const { state, actions, options } = vm;
  const range = options.formatRanges[state.formData.format];
  const pageCount = Number(state.formData.pageCount) || 0;

  return (
    <>
      <PanelHead
        title="Project basics"
        blurb="What kind of project this is. The format decides the length guidance and the suggested price range."
      />

      <Anchor id="su-format">
        <ChipSelect
          label="Format"
          required
          options={options.formats}
          value={state.formData.format}
          error={errorFor(vm, "su-format")}
          onChange={(value) => actions.handleChange({ target: { name: "format", value } })}
        />
      </Anchor>

      {state.formData.format === "other" && (
        <Anchor id="su-format-other">
          <TextField
            label="Which format?"
            required
            name="formatOther"
            maxLength={80}
            value={state.formData.formatOther}
            error={errorFor(vm, "su-format-other")}
            onChange={actions.handleChange}
          />
        </Anchor>
      )}

      {/*
        * The page count is DETECTED, never typed — `POST /scripts/extract-pdf`
        * returns it and nothing on either platform offers a field for it. So it
        * is reported as a status, not drawn as a disabled input: a greyed-out
        * text box invites someone to try to fix it here, and the fix is on the
        * previous panel.
        */}
      <Anchor id="su-page-count">
        <InlineMessage
          tone={!pageCount ? "warning" : state.pageCountWarning ? "info" : "success"}
          variant="panel"
          title={pageCount
            ? `${pageCount} page${pageCount === 1 ? "" : "s"} · ${range?.label || "Project"}`
            : "Page count not detected"}
        >
          {!pageCount
            ? "Go back to Upload and replace the script file — a formatted PDF or DOCX is what lets Ckript count the pages and build the buyer preview."
            : state.pageCountWarning
              || (range ? `Typical range is ${range.typical} pages, so this length suits the format.` : "Detected from your script file.")}
        </InlineMessage>
      </Anchor>
    </>
  );
}

/* ───────────────────────── Panel 2.2 · Story ────────────────────────── */

function StoryPanel({ vm }) {
  const { state, actions } = vm;
  const generating = Boolean(state.metaLoadingField);

  return (
    <>
      <PanelHead
        title="Tell the story"
        blurb="The two things every buyer reads first. Both are required before you can publish."
      />

      <div className="ckm-upload__field-group">
        <Anchor id="su-logline">
          <TextArea
            label="Logline"
            required
            name="logline"
            rows={3}
            maxLength={500}
            value={state.formData.logline}
            error={errorFor(vm, "su-logline")}
            onChange={actions.handleChange}
            placeholder="A one-sentence hook that sells your story…"
            hint="One sentence: who wants what, and what is in the way."
          />
        </Anchor>
        <AiAction
          label="Generate a logline"
          pending={state.metaLoadingField === "logline"}
          disabled={generating}
          onClick={() => actions.handleGenerateMetadata("logline")}
          notice={state.metaNotice.field === "logline" ? state.metaNotice.text : ""}
        />
      </div>

      <div className="ckm-upload__field-group">
        <Anchor id="su-synopsis">
          <TextArea
            label="Synopsis"
            required
            name="synopsis"
            rows={8}
            value={state.formData.synopsis}
            error={errorFor(vm, "su-synopsis")}
            onChange={actions.handleChange}
            placeholder="A fuller summary of the plot, the characters and the world…"
          />
        </Anchor>
        <AiAction
          label="Generate a synopsis"
          pending={state.metaLoadingField === "synopsis"}
          disabled={generating}
          onClick={() => actions.handleGenerateMetadata("synopsis")}
          notice={state.metaNotice.field === "synopsis" ? state.metaNotice.text : ""}
        />
      </div>

      <TextField
        label="Tags"
        optional
        value={state.tagsInput}
        onChange={(event) => actions.setTagsInput(event.target.value)}
        placeholder="monsoon, detective, slow-burn"
        hint="Separate them with commas."
      />
    </>
  );
}

/* ───────────────────────── Panel 2.3 · Cast ─────────────────────────── */

function CastPanel({ vm }) {
  const { state, actions, options } = vm;
  const generating = Boolean(state.metaLoadingField);

  return (
    <>
      <PanelHead
        title="Cast & roles"
        blurb="The roles you're casting, with demographics and creative direction. Leave it empty if you're not casting yet — you can still publish."
      />

      <div className="ckm-upload__section-head">
        <Button
          size="sm"
          variant="tertiary"
          icon="auto_awesome"
          pending={state.metaLoadingField === "roles"}
          disabled={generating}
          onClick={() => actions.handleGenerateMetadata("roles")}
        >
          {state.metaLoadingField === "roles" ? "Suggesting…" : "Suggest a cast"}
        </Button>
        <Button size="sm" variant="tertiary" icon="add" onClick={actions.addRole}>Add role</Button>
      </div>

      {state.metaNotice.field === "roles" && (
        <InlineMessage tone="info" variant="panel">{state.metaNotice.text}</InlineMessage>
      )}

      <Anchor id="su-role-list">
        {state.roles.length === 0 ? (
          <InlineMessage tone="info" variant="panel" title="No roles yet">
            Add one, or let the suggester read a starting cast out of the script you uploaded.
          </InlineMessage>
        ) : (
          /* A <ul>, because a cast list is a list: a screen reader hearing
             "list, 4 items" knows the size of the job before reading any of it. */
          <ul className="ckm-upload__stack">
            {state.roles.map((role, index) => (
              <li key={`role-${index}`}>
                <Card>
                  <CardBody className="ckm-upload__card-body">
                    <div className="ckm-upload__card-head">
                      <p className="ckm-upload__card-eyebrow">Role {index + 1}</p>
                      <Button
                        size="sm"
                        variant="tertiary"
                        icon="close"
                        onClick={() => actions.removeRole(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    <TextField
                      label="Character name"
                      value={role.characterName}
                      onChange={(event) => actions.updateRoleField(index, "characterName", event.target.value)}
                    />
                    <TextField
                      label="Archetype"
                      placeholder="Lead, antagonist, supporting…"
                      value={role.type}
                      onChange={(event) => actions.updateRoleField(index, "type", event.target.value)}
                    />
                    <ChipSelect
                      label="Gender"
                      options={options.roleGenders}
                      value={role.gender}
                      onChange={(value) => actions.updateRoleField(index, "gender", value)}
                    />

                    {/* The one grid that survives 320px, because each field
                        holds at most three digits. */}
                    <div className="ckm-upload__pair">
                      <Anchor id={`su-role-${index}-min-age`}>
                        <TextField
                          label="Min age"
                          purpose="number"
                          value={role.ageRange?.min ?? ""}
                          error={errorFor(vm, `su-role-${index}-min-age`)}
                          onChange={(event) => actions.updateRoleAge(index, "min", event.target.value)}
                        />
                      </Anchor>
                      <Anchor id={`su-role-${index}-max-age`}>
                        <TextField
                          label="Max age"
                          purpose="number"
                          value={role.ageRange?.max ?? ""}
                          error={errorFor(vm, `su-role-${index}-max-age`)}
                          onChange={(event) => actions.updateRoleAge(index, "max", event.target.value)}
                        />
                      </Anchor>
                    </div>

                    <TextArea
                      label="Casting notes"
                      optional
                      rows={3}
                      value={role.description}
                      placeholder="Performance notes, emotional range, or casting vibe…"
                      onChange={(event) => actions.updateRoleField(index, "description", event.target.value)}
                    />
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Anchor>
    </>
  );
}

/* ──────────────────────── Panel 2.4 · Progress ──────────────────────── */

function ProgressPanel({ vm }) {
  const { state, actions, options } = vm;
  const complete = state.formData.completionStatus === "complete";
  const partsError = errorFor(vm, "su-completed-parts") || errorFor(vm, "su-total-parts");

  return (
    <>
      <PanelHead
        title="How complete is it?"
        blurb="Set clear expectations about how much of the script is ready to read. Partial scripts are welcome — being vague about it is what costs you."
      />

      {/*
        * A RadioGroup rather than two chips: this is one question with exactly
        * one answer and a real consequence (it reveals the parts fields), and a
        * <fieldset>/<legend> is what tells a screen reader the options belong to
        * the same question. Chips would announce two unrelated toggles.
        */}
      <Anchor id="su-completion-status">
        <RadioGroup
          label="Where is your script right now?"
          name="completionStatus"
          options={options.completion.map((item) => ({
            value: item.value,
            label: item.label,
            description: item.helper,
          }))}
          value={state.formData.completionStatus}
          onChange={(event) => actions.setFormData((current) => ({
            ...current,
            completionStatus: event.target.value,
          }))}
        />
      </Anchor>

      {!complete && (
        <div className="ckm-upload__pair">
          <Anchor id="su-completed-parts">
            <TextField
              label="Parts done"
              purpose="number"
              name="completedParts"
              placeholder="4"
              value={state.formData.completedParts}
              error={errorFor(vm, "su-completed-parts")}
              onChange={actions.handleChange}
            />
          </Anchor>
          <Anchor id="su-total-parts">
            <TextField
              label="Parts planned"
              purpose="number"
              name="totalParts"
              placeholder="10"
              value={state.formData.totalParts}
              error={errorFor(vm, "su-total-parts")}
              onChange={actions.handleChange}
            />
          </Anchor>
        </div>
      )}

      {/* The cross-field rule ("done cannot exceed planned") belongs to neither
          box, so it is stated once under both rather than duplicated into each. */}
      {!complete && partsError && (
        <InlineMessage tone="error" variant="panel">{partsError}</InlineMessage>
      )}

      <TextArea
        label="Anything else buyers should know?"
        optional
        name="futurePlans"
        rows={4}
        maxLength={300}
        value={state.formData.futurePlans || ""}
        onChange={actions.handleChange}
        placeholder={complete
          ? "This is the final locked draft, ready to read."
          : "The remaining episodes are written and will be uploaded next month."}
      />
    </>
  );
}

/* ───────────────────────── Panel 2.5 · Access ───────────────────────── */

function AccessPanel({ vm }) {
  const { state, actions } = vm;
  const [previewOpen, setPreviewOpen] = useState(false);

  const on = Boolean(state.formData.viewableScript);
  const pageCount = Number(state.formData.pageCount) || 0;
  const start = Math.max(1, Number(state.formData.previewWindowStart || 1) || 1);
  const end = Math.max(start, Number(state.formData.previewWindowEnd || start) || start);
  const pages = state.pdfPageTexts.slice(start - 1, end);
  const hasPages = pages.join("\n\n").trim().length > 0;

  return (
    <>
      <PanelHead
        title="Viewable preview"
        blurb="The exact pages a buyer — and the reviewing admin — may read before the full script is unlocked."
      />

      {/*
        * A Switch, not a checkbox. It turns a capability on and off and takes
        * effect immediately, with no Save button to confirm it — the distinction
        * the Phase 1 form family draws between the two controls.
        */}
      <Switch
        label="Show a preview window"
        description="Without it, buyers see only the listing until they purchase access."
        checked={on}
        onChange={(next) => actions.setFormData((current) => ({ ...current, viewableScript: next }))}
      />

      {on ? (
        <>
          <div className="ckm-upload__pair">
            <Anchor id="su-preview-start">
              <TextField
                label="First page"
                purpose="number"
                name="previewWindowStart"
                value={state.formData.previewWindowStart}
                error={errorFor(vm, "su-preview-start")}
                onChange={actions.handleChange}
              />
            </Anchor>
            <Anchor id="su-preview-end">
              <TextField
                label="Last page"
                purpose="number"
                name="previewWindowEnd"
                value={state.formData.previewWindowEnd}
                error={errorFor(vm, "su-preview-end")}
                onChange={actions.handleChange}
              />
            </Anchor>
          </div>

          <InlineMessage tone="info" variant="panel" title={`Buyers will see pages ${start} to ${end}.`}>
            {pageCount > 0
              ? `Your script is ${pageCount} pages long. Admin review shows this same range.`
              : "Admin review shows this same range."}
          </InlineMessage>

          {/*
            * Summoned, not embedded. Desktop mounts `ScreenplayPdfViewer` — a
            * pdf.js instance — inside the scrolling form, which on a phone is a
            * second document renderer living behind the virtual keyboard for the
            * whole panel. Here the preview is a full-screen dialog, mounted when
            * asked for and disposed when closed.
            *
            * It renders the EXTRACTED page texts rather than the PDF, and that is
            * the truthful choice rather than the cheap one: `scriptPreviewPageTexts`
            * is what the submission actually carries and what a buyer is actually
            * served, so this shows what will be published, not what was uploaded.
            */}
          <Button
            variant="secondary"
            icon="visibility"
            disabled={!hasPages}
            onClick={() => setPreviewOpen(true)}
          >
            {hasPages
              ? `Preview ${pages.length} page${pages.length === 1 ? "" : "s"}`
              : "Nothing to preview yet"}
          </Button>

          {!hasPages && (
            <p className="ckm-upload__note">
              The preview appears once the text has been read out of your script file.
            </p>
          )}

          <PreviewDialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            pages={pages}
            firstPageNumber={start}
          />
        </>
      ) : (
        <p className="ckm-upload__note">
          No preview will be shown. Buyers see only the listing metadata until they purchase access.
        </p>
      )}
    </>
  );
}

/* ───────────────────────── Panel 2.6 · Media ────────────────────────── */

function MediaPanel({ vm }) {
  const { state, actions, mode } = vm;
  const plan = String(vm.user?.subscription?.plan || "free").toLowerCase();
  const pitchLocked = ["free", "silver", "none", ""].includes(plan);
  const coverHistory = state.aiCoverHistory || [];
  const hasCoverHistory = coverHistory.length > 1;
  const progress = state.mediaProgress || {};

  return (
    <Anchor id="su-media">
      <PanelHead
        title="Visual assets"
        blurb="A cover and a trailer make a listing far more discoverable. All optional."
      />

      <MediaSlot
        label="Cover image"
        icon="image"
        hint="JPEG, PNG or WebP · up to 5 MB"
        accept="image/jpeg,image/png,image/webp"
        file={state.thumbnailFile}
        previewUrl={state.thumbnailPreviewUrl}
        previewKind="image"
        progress={progress.thumbnail || null}
        onSelect={actions.handleThumbnailSelect}
        onRemove={() => actions.setThumbnailFile(null)}
        actions={state.thumbnailFile ? [
          { id: "adjust", label: "Adjust", onSelect: () => actions.openThumbnailEditor(state.thumbnailFile) },
          { id: "download", label: "Download proof", onSelect: () => actions.downloadWatermarkedImage(state.thumbnailFile) },
        ] : []}
        secondary={!state.thumbnailFile ? {
          label: state.aiCoverRemaining <= 0
            ? "AI cover limit reached"
            : state.isGeneratingAiCover ? "Generating…" : "Generate a cover",
          hint: state.aiCoverRemaining <= 0
            ? "No AI covers left this plan period"
            : "Reads your script and draws one",
          icon: "auto_awesome",
          disabled: state.isGeneratingAiCover || state.aiCoverRemaining <= 0,
          onSelect: actions.generateAiCover,
        } : null}
      >
        {/* Only once there is something to step between. A "1 of 1" pager is a
            control that cannot do anything. */}
        {hasCoverHistory && (
          <div className="ckm-media__history">
            <IconButton
              icon="chevron_left"
              label="Previous generated cover"
              variant="soft"
              size="sm"
              disabled={state.aiCoverIndex <= 0}
              onClick={() => actions.setAiCoverHistoryIndex(state.aiCoverIndex - 1)}
            />
            <span className="ckm-media__count">
              Cover {state.aiCoverIndex + 1} of {coverHistory.length}
            </span>
            <IconButton
              icon="chevron_right"
              label="Next generated cover"
              variant="soft"
              size="sm"
              disabled={state.aiCoverIndex >= coverHistory.length - 1}
              onClick={() => actions.setAiCoverHistoryIndex(state.aiCoverIndex + 1)}
            />
            {state.aiCoverRemaining > 0 ? (
              <Button
                size="sm"
                variant="tertiary"
                pending={state.isGeneratingAiCover}
                disabled={state.isGeneratingAiCover}
                onClick={actions.generateAiCover}
              >
                {`Try another (${state.aiCoverRemaining} left)`}
              </Button>
            ) : (
              <span className="ckm-media__count">No AI covers left on your plan</span>
            )}
          </div>
        )}
      </MediaSlot>

      <MediaSlot
        label="Trailer video"
        icon="movie"
        hint="MP4, MOV, MPEG or WebM · up to 250 MB"
        accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
        file={state.trailerFile}
        previewUrl={state.trailerPreviewUrl}
        previewKind="video"
        meta={state.trailerMetaLabel}
        progress={progress.trailer || null}
        onSelect={actions.handleTrailerSelect}
        onRemove={() => actions.setTrailerFile(null)}
      />

      {pitchLocked ? (
        <InlineMessage
          tone="info"
          variant="panel"
          title="Pitch video is a premium feature"
          action={<Button size="sm" onClick={actions.openPricing}>View plans</Button>}
        >
          Upgrade to attach a short video pitch — up to 1:30 — to this listing.
        </InlineMessage>
      ) : (
        <MediaSlot
          label="Pitch video"
          icon="videocam"
          hint="Up to 1:30 · up to 90 MB"
          accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
          file={state.pitchVideoFile}
          previewUrl={state.pitchVideoPreviewUrl}
          previewKind="video"
          meta={state.pitchVideoMetaLabel}
          progress={progress.pitchVideo || null}
          onSelect={actions.handlePitchVideoSelect}
          onRemove={() => actions.setPitchVideoFile(null)}
        />
      )}

      <p className="ckm-upload__note">
        <Icon name="info" size={16} className="ckm-upload__note-icon" />
        <span>
          {mode.editId
            ? "New media uploads after the listing update succeeds. Existing public media stays in place unless you replace it."
            : "Media uploads when you submit, not now — so a large trailer will not burn your data allowance while you are still filling this in."}
        </span>
      </p>
    </Anchor>
  );
}

/* ──────────────────────── Panel 3 · Classification ──────────────────── */

function ClassifyPanel({ vm }) {
  const { state, actions, options } = vm;
  const groups = [
    ["tones", "Tones", options.tones],
    ["themes", "Themes", options.themes],
    ["settings", "Settings", options.settings],
  ];

  return (
    <>
      <PanelHead
        title="Classification"
        blurb="How the right readers find your script. Genre is required; the rest sharpen the match."
      />

      <Anchor id="su-primary-genre">
        <ChipSelect
          label="Primary genre"
          required
          options={options.genres}
          value={state.formData.primaryGenre}
          error={errorFor(vm, "su-primary-genre")}
          onChange={(value) => actions.handleChange({ target: { name: "primaryGenre", value } })}
        />
      </Anchor>

      {/*
        * `toggleClassification` already owns the add/remove and the three-item
        * cap — including the message shown when a fourth is tapped — so the
        * group is driven one changed tag at a time rather than by replacing the
        * array. Two implementations of a cap is how the two platforms end up
        * disagreeing about whether four tags are allowed.
        */}
      {groups.map(([key, label, pool]) => {
        const selected = state.classification[key] || [];
        return (
          <ChipSelect
            key={key}
            label={label}
            optional
            multiple
            max={3}
            options={pool}
            value={selected}
            onChange={(next) => {
              const changed = next.length > selected.length
                ? next.find((value) => !selected.includes(value))
                : selected.find((value) => !next.includes(value));
              if (changed) actions.toggleClassification(key, changed);
            }}
          />
        );
      })}
    </>
  );
}

/* ───────────────────────── Panel 4 · Film info ──────────────────────── */

const DIALOGUE_OPTIONS = [
  { value: "yes", label: "Full dialogue" },
  { value: "partial", label: "Some dialogue" },
  { value: "no", label: "Action only" },
];

function FilmPanel({ vm }) {
  const { state, actions, options } = vm;
  const setField = (field, value) => actions.setFilmDetails((current) => ({ ...current, [field]: value }));

  return (
    <>
      <PanelHead
        title="Film production details"
        blurb="What industry professionals need to know about the project and your involvement. Language is required."
      />

      {/*
        * Two independent yes/no answers, so two checkboxes — not a chip pair.
        * Wanting to direct and wanting to produce are not alternatives, and the
        * desktop card pair (which looks like a segmented choice but toggles
        * independently) is the ambiguity being fixed here rather than ported.
        */}
      <fieldset className="ckm-upload__fieldset">
        <legend className="ckm-field__label">
          <span className="ckm-field__label-text">Your creative role</span>
          <span className="ckm-field__flag ckm-field__flag--soft">Optional</span>
        </legend>
        <Checkbox
          label="I want to direct this"
          description="Shown to buyers as a directing interest"
          checked={Boolean(state.filmDetails.wantToDirect)}
          onChange={(event) => setField("wantToDirect", event.target.checked)}
        />
        <Checkbox
          label="I want to produce this"
          description="Shown to buyers as a producing interest"
          checked={Boolean(state.filmDetails.wantToProduce)}
          onChange={(event) => setField("wantToProduce", event.target.checked)}
        />
      </fieldset>

      <Anchor id="su-film-language">
        <ChipSelect
          label="Film language"
          required
          allowClear
          options={options.languages}
          value={state.filmDetails.filmLanguage || ""}
          error={errorFor(vm, "su-film-language")}
          onChange={(value) => setField("filmLanguage", value)}
        />
      </Anchor>

      {state.filmDetails.filmLanguage === "Other" && (
        <Anchor id="su-film-language-custom">
          <TextField
            label="Which language?"
            required
            maxLength={80}
            value={state.filmDetails.filmLanguageCustom || ""}
            error={errorFor(vm, "su-film-language-custom")}
            onChange={(event) => setField("filmLanguageCustom", event.target.value)}
          />
        </Anchor>
      )}

      <ChipSelect
        label="Dialogue"
        optional
        options={DIALOGUE_OPTIONS}
        value={state.filmDetails.dialoguesPresent || ""}
        onChange={(value) => setField("dialoguesPresent", value)}
      />
    </>
  );
}

/* ───────────────────────── Panel 5 · Publish ────────────────────────── */

const ROYALTY_DURATIONS = [
  { value: "none", label: "None" },
  { value: "project_lifetime", label: "Project lifetime" },
  { value: "years", label: "Fixed years" },
];

function PublishPanel({ vm }) {
  const { state, actions, options, computed, elements } = vm;
  // Destructured before the JSX rather than read as `elements.agreementRef` in
  // it: the ref lint rule cannot tell a member read of a ref *object* from a
  // read of its `.current`, and flags the latter during render.
  const { agreementRef } = elements;
  const rights = state.rightsLicensing || {};
  const royalty = rights.royaltySettings || {};
  const showRoyalty = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"]
    .includes(rights.paymentStructure);
  const setRights = (patch) => actions.setRightsLicensing((current) => ({ ...current, ...patch }));

  return (
    <>
      <PanelHead
        title="Price & terms"
        blurb="What a buyer pays, what they get for it, and the agreement you are signing."
      />

      {/*
        * Presets and a custom box, in that order, and both always visible.
        * Desktop hides the custom input behind a "Custom" chip, so a writer who
        * wants ₹75 must first discover that a chip reveals a field. On a phone
        * that is one more tap and one more thing to find; here the presets fill
        * the box, and typing in the box clears the preset.
        */}
      <ChipSelect
        label="Asking price"
        options={options.pricePresets.map((price) => ({ value: String(price), label: `₹${price}` }))}
        value={state.useCustomPrice ? "" : String(state.scriptPrice ?? "")}
        onChange={(value) => {
          actions.setUseCustomPrice(false);
          actions.setScriptPrice(Number(value) || 0);
        }}
        hint={computed.priceGuide}
      />

      <Anchor id="su-custom-price">
        <TextField
          label="Or set your own price"
          /* `purpose="decimal"` rather than type="number": a numeric keyboard
             without the spinner, and without type="number"'s habit of throwing
             away an intermediate edit it cannot parse. The leading-zero strip is
             the desktop rule, kept. */
          purpose="decimal"
          icon="currency_rupee"
          value={state.useCustomPrice ? state.customPriceInput : ""}
          error={errorFor(vm, "su-custom-price")}
          placeholder={String(state.scriptPrice ?? "")}
          onChange={(event) => {
            const normalized = String(event.target.value || "").replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
            actions.setUseCustomPrice(true);
            actions.setCustomPriceInput(normalized);
          }}
        />
      </Anchor>

      {/* What the buyer pays and what the writer receives are different numbers,
          and a writer who only ever sees one of them is surprised by the other. */}
      <dl className="ckm-upload__invoice">
        {computed.publishInvoiceRows.map((row) => (
          <div className="ckm-upload__invoice-row" key={row.item}>
            <dt>
              <span className="ckm-upload__invoice-item">{row.item}</span>
              <span className="ckm-upload__invoice-detail">{row.detail}</span>
            </dt>
            <dd>{row.amount}</dd>
          </div>
        ))}
      </dl>

      <Anchor id="su-rights-type">
        <ChipSelect
          label="Rights on offer"
          required
          options={options.rights.map((item) => ({ value: item.value, label: item.short }))}
          value={rights.rightsType || "custom_negotiation_required"}
          onChange={(value) => setRights({ rightsType: value })}
          hint={options.rights.find((item) => item.value === rights.rightsType)?.desc || ""}
        />
      </Anchor>

      {rights.rightsType === "exclusive_license" && (
        <Anchor id="su-license-duration">
          <TextField
            label="Licence length in months"
            purpose="number"
            value={String(rights.timeBound?.licenseDurationMonths ?? 12)}
            error={errorFor(vm, "su-license-duration")}
            onChange={(event) => setRights({
              timeBound: { ...rights.timeBound, licenseDurationMonths: Number(event.target.value) || 0 },
            })}
            hint={`Presets: ${options.licenseDurations.join(", ")} months. Rights return to you afterwards.`}
          />
        </Anchor>
      )}

      <Anchor id="su-publish-modification">
        <ChipSelect
          label="Creative control"
          options={options.modification}
          value={rights.modificationRights || ""}
          onChange={(value) => setRights({ modificationRights: value })}
        />
      </Anchor>

      <Anchor id="su-publish-payment">
        <ChipSelect
          label="How you're paid"
          options={options.payments}
          value={rights.paymentStructure || ""}
          onChange={(value) => setRights({ paymentStructure: value })}
        />
      </Anchor>

      {showRoyalty && (
        <>
          <Anchor id="su-royalty-percentage">
            <TextField
              label="Royalty percentage"
              purpose="decimal"
              value={String(royalty.percentage ?? 0)}
              error={errorFor(vm, "su-royalty-percentage")}
              onChange={(event) => setRights({
                royaltySettings: { ...royalty, percentage: Number(event.target.value) || 0 },
              })}
            />
          </Anchor>
          <ChipSelect
            label="Royalty runs for"
            options={ROYALTY_DURATIONS}
            value={royalty.durationType || "none"}
            onChange={(value) => setRights({ royaltySettings: { ...royalty, durationType: value } })}
          />
          {royalty.durationType === "years" && (
            <TextField
              label="How many years"
              purpose="number"
              value={String(royalty.durationYears ?? 1)}
              onChange={(event) => setRights({
                royaltySettings: { ...royalty, durationYears: Number(event.target.value) || 0 },
              })}
            />
          )}
        </>
      )}

      <Anchor id="su-publish-negotiation">
        <ChipSelect
          label="Negotiation"
          options={options.negotiations}
          value={rights.negotiationMode || ""}
          onChange={(value) => setRights({ negotiationMode: value })}
        />
      </Anchor>

      <TextArea
        label="Custom conditions"
        optional
        rows={4}
        maxLength={5000}
        value={rights.customConditions || ""}
        placeholder="Specific investor terms, guaranteed credit conditions…"
        onChange={(event) => setRights({ customConditions: event.target.value })}
      />

      <section className="ckm-upload__section" aria-labelledby="ckm-upload-agreement">
        <h3 className="ckm-upload__section-title" id="ckm-upload-agreement">Submission agreement</h3>

        {/*
          * `tabIndex={0}` is not decoration: a scrollable region that is not
          * focusable cannot be scrolled by a keyboard or switch user at all
          * (WCAG 2.1.1), and a several-thousand-word agreement in a 240px box is
          * exactly the case that rule exists for. Named and given a role so it
          * is announced as a region rather than as loose text.
          *
          * The ref is the orchestrator's: it is what drives `agreementScrolled`,
          * so the "reviewed" state below is measured on this element rather than
          * assumed by whichever chrome is mounted.
          */}
        <div
          ref={agreementRef}
          className="ckm-upload__agreement"
          tabIndex={0}
          role="region"
          aria-label="Script upload terms and conditions, full text"
        >
          <pre className="ckm-upload__agreement-text">{computed.legalAgreement}</pre>
        </div>

        <p className="ckm-upload__agreement-status" role="status" aria-live="polite">
          {state.agreementScrolled ? "Agreement reviewed" : "Scroll to the end to review the whole agreement"}
        </p>

        <p className="ckm-upload__note">
          <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer" onClick={actions.flushWorkingSnapshot}>
            Open the full Script Upload Terms
          </Link>
          {" "}in a new tab.
        </p>

        <Anchor id="su-legal-terms">
          <Checkbox
            label={`I accept the Script Upload Terms & Conditions (v${SCRIPT_UPLOAD_TERMS_VERSION})`}
            error={errorFor(vm, "su-legal-terms")}
            checked={Boolean(state.legal.agreedToTerms && rights.legalAcknowledgement?.platformTermsAccepted)}
            /* One control writing two flags, because the server reads
               `platformTermsAccepted` and the client validation reads both — and
               a writer who ticks one box has agreed once, not half. */
            onChange={(event) => {
              const checked = event.target.checked;
              actions.setLegal((current) => ({ ...current, agreedToTerms: checked }));
              actions.setRightsLicensing((current) => ({
                ...current,
                legalAcknowledgement: { ...current.legalAcknowledgement, platformTermsAccepted: checked },
              }));
            }}
          />
        </Anchor>

        <Anchor id="su-legal-ownership">
          <Checkbox
            label="I am the sole creator, or I own the IP outright"
            checked={Boolean(rights.legalAcknowledgement?.ownershipConfirmed)}
            onChange={(event) => actions.setRightsLicensing((current) => ({
              ...current,
              legalAcknowledgement: { ...current.legalAcknowledgement, ownershipConfirmed: event.target.checked },
            }))}
          />
        </Anchor>
      </section>
    </>
  );
}

/* ───────────────────────────── Registry ─────────────────────────────── */

/*
 * Keyed by the shared screen key, so `getUploadScreenKey(step, detailStep)` —
 * the same function `validateUploadScreen` and `focusValidationIssue` use — is
 * the one thing that decides which panel is on screen. Neither platform can
 * disagree with the other about what step 2, panel 4 is.
 */
export const UPLOAD_PANELS = Object.freeze({
  upload: UploadPanel,
  basics: BasicsPanel,
  story: StoryPanel,
  cast: CastPanel,
  progress: ProgressPanel,
  access: AccessPanel,
  media: MediaPanel,
  classify: ClassifyPanel,
  film: FilmPanel,
  publish: PublishPanel,
});

export default UPLOAD_PANELS;
