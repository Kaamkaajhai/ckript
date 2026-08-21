import { useRef } from "react";
import Button from "../../../../components/buttons/Button";
import TextArea from "../../../../components/forms/TextArea";
import Sheet from "../../../../components/overlays/Sheet";
import { DEFAULT_PURCHASE_NOTE } from "../../../../../pages/script-detail/projectActions";

/*
 * PurchaseRequestSheet — the buyer's note to the writer (D29).
 *
 * One optional field, because the request itself is the message and the server supplies a sentence
 * when the buyer sends none. It is still a form rather than a bare confirm: this note is the first
 * thing the writer reads about a stranger asking to buy their screenplay, and the desktop page has
 * always let a producer say who they are.
 *
 * The placeholder shows the default that will be sent, so "send it empty" is a visible choice
 * rather than a guess about what the writer will receive.
 */
export default function PurchaseRequestSheet({
  open = false,
  projectTitle = "",
  price = "",
  note = "",
  onNoteChange = null,
  pending = false,
  onSubmit = null,
  onClose = null,
}) {
  const fieldRef = useRef(null);

  const submit = async (event) => {
    event?.preventDefault?.();
    const accepted = await onSubmit?.(note);
    if (accepted) onClose?.();
  };

  return (
    <Sheet
      open={open}
      onClose={pending ? null : onClose}
      title="Request purchase access"
      description={projectTitle ? `${projectTitle}${price ? ` · ${price}` : ""}` : ""}
      initialFocus={fieldRef}
      footer={(
        <Button variant="primary" fullWidth pending={pending} pendingLabel="Sending…" onClick={submit}>
          Send request
        </Button>
      )}
    >
      <form onSubmit={submit}>
        <TextArea
          ref={fieldRef}
          label="Message to the writer"
          hint="The writer sees this with your name and account type before they decide."
          placeholder={DEFAULT_PURCHASE_NOTE}
          value={note}
          onChange={(event) => onNoteChange?.(event.target.value)}
          rows={5}
          maxLength={1000}
          optional
        />
        <p className="ckm-project__note">
          Sending a request does not charge you. Payment happens only after the writer approves.
        </p>
      </form>
    </Sheet>
  );
}
