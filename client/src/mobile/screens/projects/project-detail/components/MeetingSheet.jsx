import { useRef, useState } from "react";
import Button from "../../../../components/buttons/Button";
import InlineMessage from "../../../../components/feedback/InlineMessage";
import TextArea from "../../../../components/forms/TextArea";
import TextField from "../../../../components/forms/TextField";
import SelectField from "../../../../components/forms/SelectField";
import Sheet from "../../../../components/overlays/Sheet";
import { assertMeeting, detectTimeZone } from "../../../../../pages/script-detail/projectActions";
import { emptyMeetingDraft } from "../projectDetailModel";

/*
 * MeetingSheet — asking a writer for a meeting, including the leg where that is impossible yet
 * (D29).
 *
 * The form is the easy half. The half worth writing down is that this action can fail for a reason
 * that is not about the form at all: a meeting is a Google Calendar event on the INDUSTRY member's
 * own calendar, so an account with no connected calendar — or one whose stored token has died —
 * cannot schedule anything until they reconnect. The server says so with a 428, and the desktop
 * modal already flips to a connect view when it sees one.
 *
 * That flip is kept, and it is reachable in both directions: the sheet opens in connect mode when
 * the account is known to be disconnected, and falls back to it when a submitted request comes
 * back needing a calendar. Connecting is a full-page redirect to Google, so anything typed here is
 * lost — which is why the connect view is shown BEFORE the form whenever we already know, rather
 * than letting someone fill in three fields and then throwing them out of the app.
 *
 * The timezone is detected, shown, and never asked for. Google localizes the invite per attendee
 * from it, so the writer sees their own local time whatever the producer's phone says.
 */
const DURATIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
];

/** Today, in the phone's own date, as the `min` a date input understands. */
const todayValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

export default function MeetingSheet({
  open = false,
  writerName = "the writer",
  projectTitle = "",
  draft = emptyMeetingDraft(),
  onDraftChange = null,
  pending = false,
  connecting = false,
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
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    const result = await onSubmit?.({ ...draft, timeZone });
    if (result?.ok) {
      onClose?.();
      return;
    }
    if (result?.flags?.needsCalendar) {
      update({ needsCalendar: true });
      return;
    }
    setError(result?.message || "Failed to request meeting.");
  };

  const connectView = (
    <div className="ckm-project__meeting-connect">
      <InlineMessage variant="inline" tone="info" title="Connect Google Calendar first">
        Ckript books the meeting on your own calendar and emails {writerName} the invite, so it needs
        permission to create the event. You will come back here after Google asks you.
      </InlineMessage>
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
  );

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
      {draft.needsCalendar ? connectView : (
        <form className="ckm-project__meeting-form" onSubmit={submit}>
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
          {error && (
            <p className="ckm-project__form-error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              {error}
            </p>
          )}
        </form>
      )}
    </Sheet>
  );
}
