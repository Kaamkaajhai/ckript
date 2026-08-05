import { useId, useRef } from "react";
import Button from "../buttons/Button";
import Overlay from "./Overlay";
import "./ConfirmDialog.css";

/*
 * ConfirmDialog — "are you sure?" done properly (prefix: ckm-confirm).
 *
 * `role="alertdialog"`, not `role="dialog"`. The difference is not decoration:
 * an alertdialog tells assistive technology that this interrupted the user and
 * that its message must be announced with it, which is why `aria-describedby`
 * pointing at the message is mandatory here and optional elsewhere.
 *
 * Three decisions worth keeping:
 *
 *   • initial focus goes to Cancel, not to the confirm button, whenever the
 *     action is destructive. The APG modal dialog pattern says to focus the
 *     least destructive option, and the reason is muscle memory: a user who
 *     taps through dialogs by reflex should hit the safe one. It is also why
 *     Escape and the scrim both mean *cancel* — every accidental dismissal
 *     resolves to not-doing-it.
 *   • the confirm button says what it does. "Delete script" and "Confirm" are
 *     the same tap and not the same information, and this is the last moment
 *     the user can be told which one they are about to make.
 *   • `pending` is on the confirm button, not on the dialog. A confirmation
 *     that closes optimistically and fails silently is worse than a slow one,
 *     so the dialog stays open, keeps focus, and lets the caller close it when
 *     the work has actually succeeded.
 */
export default function ConfirmDialog({
  open = false,
  onCancel = null,
  onConfirm = null,
  title = "",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  error = "",
  returnFocusTo = null,
  className = "",
  children = null,
  ...rest
}) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  if (import.meta.env?.DEV && open && !String(message || "").trim() && !children) {
    console.error("[mobile] ConfirmDialog needs a `message`: role=alertdialog must describe what is being confirmed.");
  }

  return (
    <Overlay
      open={open}
      onClose={onCancel}
      placement="center"
      role="alertdialog"
      labelledBy={title ? titleId : ""}
      describedBy={message ? messageId : ""}
      initialFocus={destructive ? cancelRef : confirmRef}
      returnFocusTo={returnFocusTo}
      surfaceClassName={["ckm-confirm", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <div className="ckm-confirm__body">
        {title && <h2 className="ckm-confirm__title" id={titleId}>{title}</h2>}
        {message && <p className="ckm-confirm__message" id={messageId}>{message}</p>}
        {children}
        {error && (
          <p className="ckm-confirm__error" role="alert">
            <span className="material-symbols-outlined ckm-confirm__error-icon" aria-hidden="true">error</span>
            {error}
          </p>
        )}
      </div>

      {/* Cancel first in the DOM so it is the first thing reached by Tab and by
          a screen reader, and so the destructive action is never the thing a
          user lands on by default. Order on screen is set in CSS. */}
      <div className="ckm-confirm__actions">
        <Button
          ref={cancelRef}
          className="ckm-confirm__cancel"
          variant="tertiary"
          fullWidth
          disabled={pending}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          ref={confirmRef}
          className="ckm-confirm__confirm"
          variant={destructive ? "destructive" : "primary"}
          fullWidth
          pending={pending}
          pendingLabel={`${confirmLabel}…`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Overlay>
  );
}
