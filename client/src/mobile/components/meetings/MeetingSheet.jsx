import { useRef, useState } from "react";
import { assertMeeting, detectTimeZone } from "../../../pages/script-detail/projectActions";
import Button from "../buttons/Button";
import InlineMessage from "../feedback/InlineMessage";
import SelectField from "../forms/SelectField";
import TextArea from "../forms/TextArea";
import TextField from "../forms/TextField";
import Sheet from "../overlays/Sheet";
import { emptyMeetingDraft } from "./meetingModel";
import "./MeetingSheet.css";

const DURATIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
];

const todayValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/** One native meeting form shared by project detail and message-thread context. */
export default function MeetingSheet({
  open = false,
  writerName = "the writer",
  projectTitle = "",
  draft = emptyMeetingDraft(),
  onDraftChange = null,
  pending = false,
  connecting = false,
  connectionError = "",
  onSubmit = null,
  onConnect = null,
  onClose = null,
}) {
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);
  const timeZone = detectTimeZone();

  const update = (patch) => {
    setError("");
    onDraftChange?.({ ...draft, ...patch });
  };

  const submit = async (event) => {
    event?.preventDefault?.();
    const invalid = assertMeeting(draft);
    if (invalid) return setError(invalid);
    setError("");
    const result = await onSubmit?.({ ...draft, timeZone });
    if (result?.ok) return onClose?.();
    if (result?.flags?.needsCalendar) return update({ needsCalendar: true });
    return setError(result?.message || "Failed to request meeting.");
  };

  return (
    <Sheet
      open={open}
      onClose={pending ? null : onClose}
      title="Request a meeting"
      description={`With ${writerName}${projectTitle ? ` about ${projectTitle}` : ""}`}
      initialFocus={firstFieldRef}
      footer={draft.needsCalendar ? null : (
        <Button variant="primary" fullWidth pending={pending} pendingLabel="Requesting…" onClick={submit}>
          Send request
        </Button>
      )}
    >
      {draft.needsCalendar ? (
        <div className="ckm-meeting__connect">
          <InlineMessage variant="inline" tone="info" title="Connect Google Calendar first">
            Ckript books the meeting on your calendar and emails {writerName} the invite. You will
            return to this screen after Google asks for permission.
          </InlineMessage>
          {connectionError ? <InlineMessage>{connectionError}</InlineMessage> : null}
          <Button
            variant="primary"
            fullWidth
            icon="calendar_add_on"
            pending={connecting}
            pendingLabel="Opening Google…"
            onClick={onConnect}
          >
            Connect Google Calendar
          </Button>
        </div>
      ) : (
        <form className="ckm-meeting__form" onSubmit={submit}>
          <TextField
            ref={firstFieldRef}
            label="What is it about"
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
            maxLength={120}
            required
          />
          <TextField
            label="Date"
            type="date"
            min={todayValue()}
            value={draft.date}
            onChange={(event) => update({ date: event.target.value })}
            required
          />
          <TextField
            label="Time"
            type="time"
            value={draft.time}
            onChange={(event) => update({ time: event.target.value })}
            hint={`Your time zone: ${timeZone.replace(/_/g, " ")}. ${writerName} sees it in theirs.`}
            required
          />
          <SelectField
            label="How long"
            value={draft.duration}
            onChange={(event) => update({ duration: event.target.value })}
            options={DURATIONS}
            required
          />
          <TextArea
            label="Anything to add"
            value={draft.message}
            onChange={(event) => update({ message: event.target.value })}
            rows={3}
            maxLength={500}
            optional
          />
          {error ? (
            <p className="ckm-meeting__error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              {error}
            </p>
          ) : null}
        </form>
      )}
    </Sheet>
  );
}
