import { useState } from "react";
import { Link } from "react-router-dom";
import { useCreateProject } from "../../../../pages/CreateProject/CreateProjectContext";
import {
  filmFormats, publishingFormats, styleOptions, ROLE_GENDER_OPTIONS,
} from "../../../../pages/CreateProject/constants";
import { getContentTypeFromFormat } from "../../../../pages/CreateProject/lib/format";
import { CREDIT_TYPES } from "../../../../utils/writerCredits";
import Button from "../../../components/buttons/Button";
import IconButton from "../../../components/buttons/IconButton";
import Card, { CardBody } from "../../../components/cards/Card";
import InlineMessage from "../../../components/feedback/InlineMessage";
import ChipSelect from "../../../components/forms/ChipSelect";
import RadioGroup from "../../../components/forms/RadioGroup";
import SelectField from "../../../components/forms/SelectField";
import Switch from "../../../components/forms/Switch";
import TextArea from "../../../components/forms/TextArea";
import TextField from "../../../components/forms/TextField";
import Icon from "../../../components/Icon";
/* Both promoted into the shared media family on 2026-08-09 (decision D12) so
   `/upload` renders the same two surfaces rather than a second copy of them. */
import MediaSlot from "../../../components/media/MediaSlot";
import PreviewDialog from "../../../components/media/PreviewDialog";

/*
 * Step 2 · Details — the seven mobile panels (prefix: ckm-create-project).
 *
 * The desktop counterpart (`pages/CreateProject/steps/Step2Details.jsx`, 693
 * lines) is already a mini-wizard, which is why this step ports better than it
 * looks: the *flow* is right and only the surface is not. What does not survive
 * touch is everything the desktop panels assume about width — a six-control
 * writer row, a two-column grid of role fields, a docked horizontal sub-stepper,
 * and a live preview that mounts one CodeMirror per page inside a form.
 *
 * So the transformation, panel by panel, is: every grid becomes one column;
 * every inline control row becomes a card with named actions; the sub-stepper
 * moves into the app bar's position line (`wizardChrome.describeWizardPosition`);
 * and the preview becomes a summoned full-screen dialog instead of eight editors
 * embedded in a scrolling form.
 *
 * All state is the orchestrator's. These panels read `CreateProjectContext` and
 * call its setters — the same ones the desktop panels call — so autosave, the
 * draft signature and validation are shared code and cannot drift.
 */

/* ─────────────────────────── Panel · Basics ─────────────────────────── */

function BasicsPanel() {
  const {
    formData, handleChange, targetFilm, estimatedPages, pageStatus, formatInfo, wordCount,
    writers, addWriter, updateWriter, removeWriter, moveWriter,
  } = useCreateProject();

  const isBook = getContentTypeFromFormat(formData.format) === "book";

  return (
    <>
      <PanelHead
        title="Project basics"
        blurb="Who wrote it and what format it is. This is how the project is categorised and priced."
      />

      {/*
        * Writer credits. Desktop lays each writer out as a single row of six
        * controls — name, credit, up, down, remove — which at 320px would give
        * every control about 50px. So each writer becomes a card: the two fields
        * full width, and the three order/remove actions on their own row with
        * real names rather than bare arrows.
        *
        * A <ul>, because credit ORDER is the content here: a screen reader
        * hearing "list, 3 items, item 2" is being told the billing position.
        */}
      <section className="ckm-create-project__section" aria-labelledby="ckm-cp-writers">
        <div className="ckm-create-project__section-head">
          <h3 className="ckm-create-project__section-title" id="ckm-cp-writers">
            {writers.length > 1 ? "Writers" : "Writer"}
          </h3>
          <Button size="sm" variant="tertiary" icon="add" onClick={addWriter}>Add writer</Button>
        </div>

        <ul className="ckm-create-project__stack">
          {writers.map((writer, index) => (
            <li key={`writer-${index}`}>
              <Card>
                <CardBody className="ckm-create-project__card-body">
                  <p className="ckm-create-project__card-eyebrow">
                    {index === 0 ? "First credit" : `Credit ${index + 1}`}
                  </p>

                  <TextField
                    label={index === 0 ? "Writer's name" : "Co-writer's name"}
                    purpose="name"
                    value={writer.name}
                    onChange={(event) => updateWriter(index, "name", event.target.value)}
                  />

                  <SelectField
                    label="Credited as"
                    options={CREDIT_TYPES}
                    value={writer.creditType || "written_by"}
                    onChange={(event) => updateWriter(index, "creditType", event.target.value)}
                  />

                  <div className="ckm-create-project__row-actions">
                    <IconButton
                      icon="arrow_upward"
                      label={`Move ${writer.name || `credit ${index + 1}`} up`}
                      variant="soft"
                      disabled={index === 0}
                      onClick={() => moveWriter(index, -1)}
                    />
                    <IconButton
                      icon="arrow_downward"
                      label={`Move ${writer.name || `credit ${index + 1}`} down`}
                      variant="soft"
                      disabled={index === writers.length - 1}
                      onClick={() => moveWriter(index, 1)}
                    />
                    {/* Tertiary, not `destructive`: the destructive variant is
                        a red fill reserved for the irreversible, and a removed
                        credit is re-added by typing the name again. */}
                    <Button
                      size="sm"
                      variant="tertiary"
                      icon="close"
                      disabled={writers.length <= 1}
                      onClick={() => removeWriter(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>

        <p className="ckm-create-project__note">
          Everyone listed is credited on the project page, in search results and on the title page.
          Co-writers you invite to collaborate are added here automatically.
        </p>
      </section>

      <TextField
        label="Company name"
        optional
        value={formData.companyName}
        name="companyName"
        onChange={handleChange}
      />

      <ChipSelect
        label="Format"
        required
        options={targetFilm ? filmFormats : publishingFormats}
        value={formData.format}
        onChange={(value) => handleChange({ target: { name: "format", value } })}
      />

      {targetFilm && (
        <ChipSelect
          label="Style (medium)"
          optional
          allowClear
          options={styleOptions}
          value={formData.styleMedium}
          onChange={(value) => handleChange({ target: { name: "styleMedium", value } })}
        />
      )}

      {/* The page estimate is a *status*, not a field: it reports what the
          script already is against what this format usually is. It reads as one
          message rather than a number and a separate sentence, because the
          number alone ("47") answers nothing. */}
      {targetFilm && (
        <InlineMessage
          tone={pageStatus === "good" ? "success" : pageStatus === "short" ? "warning" : "info"}
          variant="panel"
          title={`${estimatedPages} page${estimatedPages === 1 ? "" : "s"} · ${formatInfo.label}`}
        >
          {pageStatus === "good"
            ? `Typical range is ${formatInfo.typical} pages, so this length suits the format.`
            : pageStatus === "short"
              ? `Typical range is ${formatInfo.typical} pages. Shorter is fine for an early draft — keep writing.`
              : `Typical range is ${formatInfo.typical} pages. Consider trimming, or changing the format.`}
          {" "}
          {isBook ? `Calculated from ${wordCount} words.` : "Counted by line, ~55 lines a page — the same as the export."}
        </InlineMessage>
      )}
    </>
  );
}

/* ─────────────────────────── Panel · Story ──────────────────────────── */

function StoryPanel() {
  const {
    formData, handleChange, targetFilm, handleGenerateMetadata, metaLoadingField, metaNotice,
    tagsInput, setTagsInput,
  } = useCreateProject();

  return (
    <>
      <PanelHead
        title="Story"
        blurb="The two lines every buyer reads first. Both are required before you can publish."
      />

      {targetFilm && (
        <div className="ckm-create-project__field-group">
          <TextArea
            label="Logline"
            required
            name="logline"
            rows={3}
            maxLength={500}
            value={formData.logline}
            onChange={handleChange}
            placeholder="A one-sentence summary of your story…"
            hint="One sentence: who wants what, and what is in the way."
          />
          <AiAction
            label="Generate a logline"
            pending={metaLoadingField === "logline"}
            disabled={Boolean(metaLoadingField)}
            onClick={() => handleGenerateMetadata("logline")}
            notice={metaNotice.field === "logline" ? metaNotice.text : ""}
          />
        </div>
      )}

      <div className="ckm-create-project__field-group">
        <TextArea
          label="Synopsis"
          required
          name="synopsis"
          rows={8}
          value={formData.synopsis}
          onChange={handleChange}
          placeholder="A longer synopsis of your script…"
        />
        <AiAction
          label="Generate a synopsis"
          pending={metaLoadingField === "synopsis"}
          disabled={Boolean(metaLoadingField)}
          onClick={() => handleGenerateMetadata("synopsis")}
          notice={metaNotice.field === "synopsis" ? metaNotice.text : ""}
        />
      </div>

      <TextField
        label="Tags"
        optional
        value={tagsInput}
        onChange={(event) => setTagsInput(event.target.value)}
        placeholder="heist, ensemble, twist ending"
        hint="Separate them with commas."
      />
    </>
  );
}

/* ─────────────────────────── Panel · Cast ───────────────────────────── */

function CastPanel() {
  const {
    roles, addRole, removeRole, updateRoleField, updateRoleAge,
    handleGenerateMetadata, metaLoadingField, metaNotice,
  } = useCreateProject();

  return (
    <>
      <PanelHead
        title="Cast & roles"
        blurb="The roles you're casting, with demographics and creative direction. Leave it empty if you're not casting yet."
      />

      <div className="ckm-create-project__section-head">
        <Button
          size="sm"
          variant="tertiary"
          icon="auto_awesome"
          pending={metaLoadingField === "roles"}
          disabled={Boolean(metaLoadingField)}
          onClick={() => handleGenerateMetadata("roles")}
        >
          {metaLoadingField === "roles" ? "Suggesting…" : "Suggest a cast"}
        </Button>
        <Button size="sm" variant="tertiary" icon="add" onClick={addRole}>Add role</Button>
      </div>

      {metaNotice.field === "roles" && (
        <InlineMessage tone="info" variant="panel">{metaNotice.text}</InlineMessage>
      )}

      {roles.length === 0 ? (
        <InlineMessage tone="info" variant="panel" title="No roles yet">
          Add one, or let the suggester read a starting cast out of your script. This panel is optional —
          you can publish without it.
        </InlineMessage>
      ) : (
        <ul className="ckm-create-project__stack">
          {roles.map((role, index) => (
            <li key={`role-${index}`}>
              <Card>
                <CardBody className="ckm-create-project__card-body">
                  <div className="ckm-create-project__card-head">
                    <p className="ckm-create-project__card-eyebrow">Role {index + 1}</p>
                    <Button size="sm" variant="tertiary" icon="close" onClick={() => removeRole(index)}>
                      Remove
                    </Button>
                  </div>

                  <TextField
                    label="Character name"
                    value={role.characterName}
                    onChange={(event) => updateRoleField(index, "characterName", event.target.value)}
                  />
                  <TextField
                    label="Archetype"
                    value={role.type}
                    placeholder="Lead, Antagonist…"
                    onChange={(event) => updateRoleField(index, "type", event.target.value)}
                  />
                  <ChipSelect
                    label="Gender"
                    options={ROLE_GENDER_OPTIONS}
                    value={role.gender}
                    onChange={(value) => updateRoleField(index, "gender", value)}
                  />

                  {/* Two numeric fields side by side is the one grid that
                      survives 320px, because each holds at most three digits. */}
                  <div className="ckm-create-project__pair">
                    <TextField
                      label="Min age"
                      purpose="number"
                      value={role.ageRange?.min ?? ""}
                      onChange={(event) => updateRoleAge(index, "min", event.target.value)}
                    />
                    <TextField
                      label="Max age"
                      purpose="number"
                      value={role.ageRange?.max ?? ""}
                      onChange={(event) => updateRoleAge(index, "max", event.target.value)}
                    />
                  </div>

                  <TextArea
                    label="Casting notes"
                    optional
                    rows={3}
                    value={role.description}
                    placeholder="Performance notes, emotional range, or casting vibe…"
                    onChange={(event) => updateRoleField(index, "description", event.target.value)}
                  />
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ─────────────────────── Panel · Market (publishing) ────────────────── */

const AUDIENCE_OPTIONS = ["Young Adult", "Adult", "Mass Market", "Niche / Literary"];
const WRITING_STYLE_OPTIONS = ["Descriptive", "Dialogue-driven", "Literary", "Commercial"];
const SERIES_OPTIONS = ["Standalone", "Trilogy", "Multi-part universe"];

function MarketPanel() {
  const { publishingDetails, setPublishingDetails, handleProseClick, proseLoading } = useCreateProject();

  const setField = (field, value) => setPublishingDetails((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <PanelHead
        title="Market positioning"
        blurb="Metadata publishers use to place your manuscript. All optional, all worth filling in."
      />

      <ChipSelect
        label="Target audience"
        optional
        multiple
        options={AUDIENCE_OPTIONS}
        value={publishingDetails.targetAudience || []}
        onChange={(value) => setField("targetAudience", value)}
      />

      <ChipSelect
        label="Writing style"
        optional
        multiple
        options={WRITING_STYLE_OPTIONS}
        value={publishingDetails.writingStyle || []}
        onChange={(value) => setField("writingStyle", value)}
      />

      <TextField
        label="Estimated book length"
        optional
        value={publishingDetails.estimatedWordCount}
        placeholder="60,000 – 90,000 words"
        onChange={(event) => setField("estimatedWordCount", event.target.value)}
      />

      <ChipSelect
        label="Series potential"
        optional
        allowClear
        options={SERIES_OPTIONS}
        value={publishingDetails.seriesPotential}
        onChange={(value) => setField("seriesPotential", value)}
      />

      <div className="ckm-create-project__field-group">
        <TextArea
          label="Prose sample"
          optional
          rows={8}
          value={publishingDetails.proseSample || ""}
          placeholder="A sample chapter or converted prose excerpt…"
          hint="A novel-formatted excerpt that shows the writing quality."
          onChange={(event) => setField("proseSample", event.target.value)}
        />
        <AiAction
          label="Convert a scene to prose"
          pending={proseLoading}
          disabled={proseLoading}
          onClick={handleProseClick}
        />
      </div>
    </>
  );
}

/* ────────────────────────── Panel · Progress ────────────────────────── */

const COMPLETION_OPTIONS = [
  { value: "complete", label: "Fully written", description: "Every part is done and ready to share" },
  { value: "partial", label: "Partially done", description: "Some episodes or acts are ready, more are coming" },
];

function ProgressPanel() {
  const { formData, setFormData, handleChange } = useCreateProject();
  const complete = formData.completionStatus === "complete";

  return (
    <>
      <PanelHead
        title="Completion"
        blurb="Let buyers know how much of the script is ready right now."
      />

      {/*
        * A RadioGroup rather than two chips: this is one question with exactly
        * one answer and a real consequence (it reveals the parts fields), and a
        * <fieldset>/<legend> is what tells a screen reader the two options
        * belong to the same question. Chips would announce two unrelated toggles.
        */}
      <RadioGroup
        label="Where is your script right now?"
        name="completionStatus"
        options={COMPLETION_OPTIONS}
        value={formData.completionStatus}
        onChange={(event) => setFormData((prev) => ({ ...prev, completionStatus: event.target.value }))}
      />

      {!complete && (
        <div className="ckm-create-project__pair">
          <TextField
            label="Parts done"
            purpose="number"
            name="completedParts"
            value={formData.completedParts}
            onChange={handleChange}
            placeholder="4"
          />
          <TextField
            label="Parts planned"
            purpose="number"
            name="totalParts"
            value={formData.totalParts}
            onChange={handleChange}
            placeholder="10"
          />
        </div>
      )}

      <TextArea
        label="Anything else buyers should know?"
        optional
        name="futurePlans"
        rows={4}
        maxLength={300}
        value={formData.futurePlans || ""}
        onChange={handleChange}
        placeholder={complete
          ? "This is the final locked version, ready for production."
          : "Remaining episodes are still being written and will be uploaded soon."}
      />
    </>
  );
}

/* ─────────────────────────── Panel · Access ─────────────────────────── */

function AccessPanel() {
  const { formData, handleChange, previewPageTexts, estimatedPages } = useCreateProject();
  const [previewOpen, setPreviewOpen] = useState(false);
  const on = Boolean(formData.viewableScript);

  const start = Math.max(1, Number(formData.previewWindowStart || 1) || 1);
  const end = Math.max(start, Number(formData.previewWindowEnd || 1) || 1);
  const pages = previewPageTexts.slice(start - 1, end);
  const hasPages = pages.join("\n\n").trim().length > 0;

  return (
    <>
      <PanelHead
        title="Viewable preview"
        blurb="Optionally let buyers read a window of your script before they unlock the rest."
      />

      {/*
        * A Switch, not a checkbox. This turns a capability on and off and takes
        * effect immediately — no Save button confirms it — which is exactly the
        * distinction the Phase 1 form family draws between the two controls.
        */}
      <Switch
        label="Add a viewable script preview"
        description="Buyers and admins see the same page range."
        checked={on}
        /* Switch hands back the next boolean, not an event, so the orchestrator's
           event-shaped `handleChange` is given the shape it expects rather than a
           second setter being invented for one field. */
        onChange={(next) => handleChange({
          target: { name: "viewableScript", type: "checkbox", checked: next },
        })}
      />

      {on ? (
        <>
          <div className="ckm-create-project__pair">
            <TextField
              label="First page"
              purpose="number"
              name="previewWindowStart"
              value={formData.previewWindowStart}
              onChange={handleChange}
            />
            <TextField
              label="Last page"
              purpose="number"
              name="previewWindowEnd"
              value={formData.previewWindowEnd}
              onChange={handleChange}
            />
          </div>

          <InlineMessage tone="info" variant="panel" title={`Buyers will see pages ${start} to ${end}.`}>
            {estimatedPages > 0
              ? `Your script is about ${estimatedPages} page${estimatedPages === 1 ? "" : "s"} long. Admin review shows this same range.`
              : "Admin review shows this same range."}
          </InlineMessage>

          {/*
            * The preview is summoned, not embedded. Desktop renders the whole
            * range inline — one CodeMirror instance per page — inside a
            * scrolling form. On a phone that is up to eight editors mounted
            * behind a keyboard, and a screenplay page needs the full frame to be
            * legible at all. So it becomes a full-screen dialog: mounted only
            * when asked for, disposed when closed.
            */}
          <Button
            variant="secondary"
            icon="visibility"
            disabled={!hasPages}
            onClick={() => setPreviewOpen(true)}
          >
            {hasPages ? `Preview ${pages.length} page${pages.length === 1 ? "" : "s"}` : "Nothing to preview yet"}
          </Button>

          {!hasPages && (
            <p className="ckm-create-project__note">
              Your preview will appear here once you write or import content.
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
        <p className="ckm-create-project__note">
          No preview will be shown until you turn the option on.
        </p>
      )}
    </>
  );
}

/* ─────────────────────────── Panel · Media ──────────────────────────── */

function MediaPanel() {
  const {
    aiCoverRemaining, aiCoverHistory, aiCoverIndex, downloadWatermarkedImage, formatDuration,
    generateAiCover, handlePitchVideoSelect, handleThumbnailSelect, handleTrailerSelect,
    isGeneratingAiCover, mediaProgress, openThumbnailEditor, pitchVideoFile, pitchVideoMeta, pitchVideoMetaLoading,
    pitchVideoPreviewUrl, setAiCoverIndex, setError, setPitchVideoFile, setThumbnailFile,
    setTrailerFile, targetFilm, thumbnailFile, thumbnailPreviewUrl, trailerFile, trailerMeta,
    trailerMetaLoading, trailerPreviewUrl, user,
  } = useCreateProject();

  // The same gate desktop applies, read the same way: a free or silver writer
  // does not get to upload a pitch video.
  const pitchLocked = ["writer", "creator"].includes(user?.role)
    && (["free", "silver"].includes(user?.subscription?.plan) || !user?.subscription?.plan);
  const isAiCover = thumbnailFile?.name?.startsWith("ai-cover");

  return (
    <>
      <PanelHead
        title="Visual assets"
        blurb="A cover and a trailer make a project far more discoverable. All optional."
      />

      {/*
        * Desktop offers these as drag-and-drop zones. Drag-and-drop does not
        * exist on a touch screen — there is nothing to drag a file from — so
        * each becomes a plain tap target that opens the platform picker, which
        * on a phone is also the camera and the photo library.
        */}
      <MediaSlot
        label="Cover image"
        icon="image"
        hint="JPEG, PNG or WebP · up to 5 MB"
        accept="image/jpeg,image/png,image/webp"
        file={thumbnailFile}
        previewUrl={thumbnailPreviewUrl}
        previewKind="image"
        progress={mediaProgress?.thumbnail || null}
        onSelect={handleThumbnailSelect}
        onRemove={() => { setThumbnailFile(null); setError(""); }}
        actions={thumbnailFile ? [
          { id: "adjust", label: "Adjust", onSelect: () => openThumbnailEditor(thumbnailFile) },
          { id: "download", label: "Download", onSelect: () => downloadWatermarkedImage(thumbnailFile) },
        ] : []}
        secondary={!thumbnailFile ? {
          label: aiCoverRemaining <= 0
            ? "AI cover limit reached"
            : isGeneratingAiCover ? "Generating…" : "Generate a cover",
          hint: aiCoverRemaining <= 0
            ? "No AI covers left this plan period"
            : "Reads your script and draws one",
          icon: "auto_awesome",
          disabled: isGeneratingAiCover || aiCoverRemaining <= 0,
          onSelect: generateAiCover,
        } : null}
      >
        {isAiCover && (
          <div className="ckm-media__history">
            <IconButton
              icon="chevron_left"
              label="Previous generated cover"
              variant="soft"
              size="sm"
              disabled={aiCoverIndex <= 0}
              onClick={() => { const n = aiCoverIndex - 1; setAiCoverIndex(n); setThumbnailFile(aiCoverHistory[n]); }}
            />
            <span className="ckm-media__count">
              Cover {aiCoverIndex + 1} of {aiCoverHistory.length}
            </span>
            <IconButton
              icon="chevron_right"
              label="Next generated cover"
              variant="soft"
              size="sm"
              disabled={aiCoverIndex >= aiCoverHistory.length - 1}
              onClick={() => { const n = aiCoverIndex + 1; setAiCoverIndex(n); setThumbnailFile(aiCoverHistory[n]); }}
            />
            {aiCoverRemaining > 0 ? (
              <Button
                size="sm"
                variant="tertiary"
                pending={isGeneratingAiCover}
                disabled={isGeneratingAiCover}
                onClick={generateAiCover}
              >
                {isGeneratingAiCover ? "Generating…" : `Try another (${aiCoverRemaining} left)`}
              </Button>
            ) : (
              <span className="ckm-media__count">No AI covers left on your plan</span>
            )}
          </div>
        )}
      </MediaSlot>

      {targetFilm && (
        <MediaSlot
          label="Trailer video"
          icon="movie"
          hint="MP4, MOV, MPEG or WebM · up to 250 MB"
          accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
          file={trailerFile}
          previewUrl={trailerPreviewUrl}
          previewKind="video"
          meta={trailerMetaLoading
            ? "reading…"
            : trailerMeta ? `${formatDuration(trailerMeta.duration)} · ${trailerMeta.width}×${trailerMeta.height}` : ""}
          progress={mediaProgress?.trailer || null}
          onSelect={handleTrailerSelect}
          onRemove={() => { setTrailerFile(null); setError(""); }}
        />
      )}

      {pitchLocked ? (
        <InlineMessage
          tone="info"
          variant="panel"
          title="Pitch video is a premium feature"
          action={<Button size="sm" to="/pricing">View plans</Button>}
        >
          Upgrade to record and attach a short video pitch to this project.
        </InlineMessage>
      ) : (
        <MediaSlot
          label="Pitch video"
          icon="videocam"
          hint="Up to 1:30 · up to 90 MB"
          accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-m4v"
          file={pitchVideoFile}
          previewUrl={pitchVideoPreviewUrl}
          previewKind="video"
          meta={pitchVideoMetaLoading ? "reading…" : pitchVideoMeta ? formatDuration(pitchVideoMeta.duration) : ""}
          progress={mediaProgress?.pitchVideo || null}
          onSelect={handlePitchVideoSelect}
          onRemove={() => { setPitchVideoFile(null); setError(""); }}
        />
      )}

      <p className="ckm-create-project__note">
        <Icon name="info" size={16} className="ckm-create-project__note-icon" />
        <span>
          Media uploads start when you submit the project, not now — so a large trailer will not
          burn your data allowance while you are still editing. See{" "}
          <Link to="/pricing">plans</Link> for the limits on your account.
        </span>
      </p>
    </>
  );
}

/* ────────────────────────── Shared panel parts ──────────────────────── */

/*
 * Every panel opens with the same two lines. It is a plain <h2> because the
 * screen's <h1> is the project title in the app bar, and the wizard's panels are
 * the only things under it — an <h3> here would skip a level.
 */
export function PanelHead({ title, blurb }) {
  return (
    <header className="ckm-create-project__panel-head">
      <h2 className="ckm-create-project__panel-title">{title}</h2>
      {blurb && <p className="ckm-create-project__panel-blurb">{blurb}</p>}
    </header>
  );
}

/*
 * An AI generator attached to the field above it. Rendered *after* the control
 * rather than inside the label (where desktop puts it) for one reason: on a
 * phone the label is the first thing read and the last thing that should carry
 * a second tab stop. It is `tertiary`, never primary — the writer's own words
 * are the primary path and the button should not out-shout the textarea.
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
        className="ckm-create-project__ai-action"
      >
        {pending ? "Generating…" : label}
      </Button>
      {notice && <p className="ckm-create-project__note">{notice}</p>}
    </>
  );
}

/* ───────────────────────────── Registry ─────────────────────────────── */

/*
 * Keyed by the sub-step `key` in `DETAILS_STEPS`, exactly as the desktop
 * `PANELS` map is. Which panels appear, and in what order, is decided by
 * `detailsSubSteps` in the orchestrator (film vs. publishing track) — not here,
 * so the two platforms cannot disagree about what step 2 contains.
 */
export const DETAILS_PANELS = Object.freeze({
  basics: BasicsPanel,
  story: StoryPanel,
  cast: CastPanel,
  market: MarketPanel,
  progress: ProgressPanel,
  access: AccessPanel,
  media: MediaPanel,
});

export default DETAILS_PANELS;
