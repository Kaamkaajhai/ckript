import { useRef, useState } from "react";
import Button from "../../../../components/buttons/Button";
import TextArea from "../../../../components/forms/TextArea";
import Sheet from "../../../../components/overlays/Sheet";
import StarRating from "./StarRating";

/*
 * FeedbackSheet — the one form behind both a reader review and a producer rating (D29).
 *
 * They are different endpoints with different role gates, but on a phone they are the same task:
 * choose a score out of five, optionally or necessarily say why, submit. Building two sheets would
 * have produced two star controls, two error placements and two ideas of when the submit button is
 * live — the differences that matter are three props.
 *
 * A Sheet and not a Dialog: §5.5's rule is that a short task belonging to the screen behind it is
 * a sheet. This one is two controls, and the project it is about stays visible above it.
 *
 * The draft lives in the SCREEN, not here, and is seeded by whatever opened this — the same
 * arrangement `DiscoveryFiltersDialog` uses. A sheet that seeded its own draft would have to do it
 * in an effect keyed on `open`, and a form that resets itself in an effect is a form that can
 * clear what the user typed on any re-render its props happen to change.
 */
export default function FeedbackSheet({
  open = false,
  title = "",
  description = "",
  ratingLabel = "Your rating",
  commentLabel = "Your review",
  commentHint = "",
  commentRequired = false,
  draft = { rating: 0, comment: "" },
  onDraftChange = null,
  submitLabel = "Submit",
  pending = false,
  validate = null,
  onSubmit = null,
  onClose = null,
}) {
  const [error, setError] = useState("");
  const formRef = useRef(null);

  const update = (patch) => {
    setError("");
    onDraftChange?.({ ...draft, ...patch });
  };

  const submit = async (event) => {
    event?.preventDefault?.();
    const invalid = validate?.(draft) || "";
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    const accepted = await onSubmit?.(draft);
    // Closing is the caller's answer, not the form's: a submission the server refused must keep
    // the sheet — and the typed words — on screen.
    if (accepted) onClose?.();
  };

  return (
    <Sheet
      open={open}
      onClose={pending ? null : onClose}
      title={title}
      description={description}
      initialFocus={formRef}
      footer={(
        <Button variant="primary" fullWidth pending={pending} pendingLabel="Submitting…" onClick={submit}>
          {submitLabel}
        </Button>
      )}
    >
      <form className="ckm-project__feedback-form" onSubmit={submit} ref={formRef} tabIndex={-1}>
        <StarRating
          label={ratingLabel}
          value={draft.rating}
          onChange={(rating) => update({ rating })}
          required
          error={error && !draft.rating ? error : ""}
        />
        <TextArea
          label={commentLabel}
          hint={commentHint}
          value={draft.comment}
          onChange={(event) => update({ comment: event.target.value })}
          rows={5}
          maxLength={2000}
          required={commentRequired}
          optional={!commentRequired}
          error={error && draft.rating ? error : ""}
        />
      </form>
    </Sheet>
  );
}
