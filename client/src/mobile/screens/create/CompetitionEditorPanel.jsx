import { useRef, useState } from "react";
import api from "../../../services/api";
import CountdownTimer from "../../../components/competition/CountdownTimer";
import {
  competitionSubmissionErrorMessage,
  isCompetitionEntrySubmitted,
  submitCompetitionEntry,
} from "../../../components/competition/competitionSubmission";
import { SUBMIT_CHECKLIST } from "../../../pages/challenge/constants";
import { useCreateProject } from "../../../pages/CreateProject/CreateProjectContext";
import Button from "../../components/buttons/Button";
import InlineMessage from "../../components/feedback/InlineMessage";
import Checkbox from "../../components/forms/Checkbox";
import TextArea from "../../components/forms/TextArea";
import Dialog from "../../components/overlays/Dialog";

const formatSubmittedAt = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? "just now" : date.toLocaleString();
};

/*
 * Native competition chrome for the shared create-project editor.
 *
 * The server model and submission operation are shared with desktop; only the
 * presentation changes. Deadline, pitch, final confirmations and the locked
 * result are all reachable without sending a phone back through desktop UI.
 */
export default function useCompetitionEditorPanel() {
  const {
    canEditContent, charCount, competition, competitionEntry, competitionError,
    competitionLoading, competitionMode, competitionServerNow, formData,
    handleChange, handleSave, refreshCompetition, screenplayOutline,
    setCanEditContent, wordCount,
  } = useCreateProject();

  const [pitchOpen, setPitchOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [expired, setExpired] = useState(false);
  const [checks, setChecks] = useState({ confirmOriginal: false, confirmFinal: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);
  const pitchFocusRef = useRef(null);
  const submitFocusRef = useRef(null);

  if (!competitionMode) return { panel: null, overlays: null };

  const logline = formData?.logline || "";
  const synopsis = formData?.synopsis || "";
  const pitchAdded = Boolean(logline.trim() || synopsis.trim());
  const sceneCount = (screenplayOutline || []).filter((item) => item.type === "scene").length;
  const alreadySubmitted = Boolean(result) || isCompetitionEntrySubmitted(competitionEntry);
  const hasContent = Number(charCount) > 0 || Number(wordCount) > 0;
  const allChecked = SUBMIT_CHECKLIST.every((item) => checks[item.key]);
  const canSubmit = Boolean(competition?._id) && canEditContent && hasContent && !alreadySubmitted;
  const dashboardPath = competition?.slug
    ? `/challenge/dashboard?c=${competition.slug}`
    : "/challenge/dashboard";

  const closeSubmit = () => {
    if (submitting) return;
    setSubmitOpen(false);
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (!canSubmit || !allChecked || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const data = await submitCompetitionEntry({
        apiClient: api,
        competitionId: competition._id,
        // A manual save is awaited so the immutable snapshot includes the
        // final keystrokes, not merely the last autosave tick.
        flushDraft: () => handleSave(false),
      });
      setResult(data);
      setCanEditContent?.(false);
      refreshCompetition?.();
    } catch (error) {
      setSubmitError(competitionSubmissionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const panel = (
    <section className="ckm-editor__competition" aria-label="Competition entry">
        {competitionError ? (
          <InlineMessage
            tone="error"
            className="ckm-editor__competition-message"
            onRetry={refreshCompetition}
          >
            {competitionError}
          </InlineMessage>
        ) : !competition ? (
          <p className="ckm-editor__competition-loading" role="status" aria-live="polite">
            <span className="ckm-editor__competition-spinner" aria-hidden="true" />
            {competitionLoading ? "Loading competition…" : "Loading competition entry…"}
          </p>
        ) : (
          <>
            <div className="ckm-editor__competition-head">
              <strong className="ckm-editor__competition-name">{competition.name}</strong>
              {alreadySubmitted ? (
                <span className="ckm-editor__competition-status">
                  <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                  Submitted
                </span>
              ) : competition.dates?.endsAt ? (
                <span className="ckm-editor__competition-clock">
                  <span>{expired ? "Time's up —" : "Time left"}</span>
                  {expired ? (
                    <strong>submit now</strong>
                  ) : (
                    <CountdownTimer
                      target={competition.dates.endsAt}
                      serverNow={competitionServerNow}
                      size="sm"
                      onExpire={() => { setExpired(true); refreshCompetition?.(); }}
                    />
                  )}
                </span>
              ) : null}
            </div>

            <div className="ckm-editor__competition-foot">
              <span className="ckm-editor__competition-counts" aria-label={`${wordCount || 0} words, ${sceneCount} scenes, ${charCount || 0} characters`}>
                <span><strong>{wordCount || 0}</strong> words</span>
                <span><strong>{sceneCount}</strong> scenes</span>
                <span><strong>{charCount || 0}</strong> chars</span>
              </span>

              <div className="ckm-editor__competition-actions">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPitchOpen(true)}
                >
                  Pitch{pitchAdded ? " · Added" : ""}
                </Button>
                {!alreadySubmitted && (
                  <Button
                    size="sm"
                    onClick={() => setSubmitOpen(true)}
                    disabled={!canSubmit}
                    title={!hasContent ? "Write your script before submitting" : undefined}
                  >
                    Submit script
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
    </section>
  );

  const overlays = (
    <>
      <Dialog
        open={pitchOpen}
        onClose={() => setPitchOpen(false)}
        title="Logline & synopsis"
        description="Optional context that travels with your competition entry."
        closeLabel="Close pitch"
        initialFocus={pitchFocusRef}
        bodyClassName="ckm-editor__competition-dialog-body"
        footer={<Button fullWidth onClick={() => setPitchOpen(false)}>Done</Button>}
      >
        <p className="ckm-editor__competition-explain">
          Your entry is judged on the script. Write these in your own words, or leave them empty.
        </p>
        <TextArea
          ref={pitchFocusRef}
          name="logline"
          label="Logline"
          optional
          rows={3}
          maxLength={500}
          value={logline}
          disabled={!canEditContent}
          placeholder="A one-sentence summary of your story…"
          onChange={handleChange}
        />
        <TextArea
          name="synopsis"
          label="Synopsis"
          optional
          rows={7}
          value={synopsis}
          disabled={!canEditContent}
          placeholder="A short paragraph on what happens…"
          onChange={handleChange}
        />
      </Dialog>

      <Dialog
        open={submitOpen}
        onClose={closeSubmit}
        title={result ? "Submission successful" : "Submit your script"}
        description={result
          ? competition?.name || "Competition entry"
          : "Once submitted, your script locks and cannot be edited."}
        closeLabel={result ? "Close submission result" : "Close submission"}
        initialFocus={result ? null : submitFocusRef}
        bodyClassName="ckm-editor__competition-dialog-body"
        footer={result ? (
          <Button fullWidth to={dashboardPath}>Back to competition</Button>
        ) : (
          <>
            <Button
              fullWidth
              pending={submitting}
              pendingLabel="Submitting…"
              disabled={!allChecked || !canSubmit}
              onClick={handleSubmit}
            >
              Submit final script
            </Button>
            <Button fullWidth variant="tertiary" disabled={submitting} onClick={closeSubmit}>
              Keep writing
            </Button>
          </>
        )}
      >
        {result ? (
          <div className="ckm-editor__competition-result" role="status">
            <span className="material-symbols-outlined ckm-editor__competition-result-icon" aria-hidden="true">check_circle</span>
            <p>Your script was submitted {formatSubmittedAt(result.entry?.submittedAt)} and is now locked.</p>
            {Array.isArray(result.timeline) && result.timeline.length > 0 && (
              <ol className="ckm-editor__competition-timeline" aria-label="What happens next">
                {result.timeline.map((item) => (
                  <li key={item.key || item.label} data-status={item.status}>
                    <span className="ckm-editor__competition-timeline-mark" aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      {item.date && <small>{new Date(item.date).toLocaleString()}</small>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <div className="ckm-editor__competition-checklist">
            {SUBMIT_CHECKLIST.map((item, index) => (
              <Checkbox
                key={item.key}
                ref={index === 0 ? submitFocusRef : null}
                label={item.label}
                checked={checks[item.key]}
                disabled={submitting}
                onChange={(event) => setChecks((current) => ({
                  ...current,
                  [item.key]: event.target.checked,
                }))}
              />
            ))}
            {submitError && <InlineMessage tone="error">{submitError}</InlineMessage>}
          </div>
        )}
      </Dialog>
    </>
  );

  return { panel, overlays };
}
