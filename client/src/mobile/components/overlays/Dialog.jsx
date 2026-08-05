import { useId } from "react";
import IconButton from "../buttons/IconButton";
import useKeyboardInset from "../../hooks/useKeyboardInset";
import Overlay from "./Overlay";
import "./Dialog.css";

/*
 * Dialog — a full-screen modal task (prefix: ckm-dialog).
 *
 * The counterpart to Sheet, and the choice is not about size. A Sheet is a
 * short task that belongs to the screen behind it. A Dialog is a task that
 * *replaces* the screen for its duration: editing a profile, composing a
 * message, picking from a long filtered list. It covers the frame completely
 * and slides in from the trailing edge, which is the native "pushed a screen"
 * motion — read that way, "close" is the only correct dismissal, and it is a
 * close icon, never a back chevron, because the app's history did not move.
 *
 * When the task deserves its own URL — refresh, deep link, share, browser back
 * — it is not a Dialog at all, it is a route. Plan §5.5: "Modal -> accessible
 * dialog or full-screen route". A Dialog is for a task that must not survive a
 * refresh, because nothing about it is addressable.
 *
 * The title is an <h2>, not an <h1>. The screen's own <h1> is still in the
 * document while the dialog is open — inert, so no assistive technology can
 * reach it, but present. Emitting a second <h1> that is only sometimes hidden
 * is more fragile than nesting consistently under the one that is always there.
 */
export default function Dialog({
  open = false,
  onClose = null,
  title = "",
  description = "",
  action = null,
  footer = null,
  closeLabel = "Close",
  initialFocus = null,
  returnFocusTo = null,
  className = "",
  bodyClassName = "",
  children,
  ...rest
}) {
  const titleId = useId();
  const descriptionId = useId();
  const keyboardInset = useKeyboardInset();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      placement="full"
      labelledBy={title ? titleId : ""}
      describedBy={description ? descriptionId : ""}
      initialFocus={initialFocus}
      returnFocusTo={returnFocusTo}
      /* A full-screen surface has no visible "outside" to tap, so scrim
         dismissal would mean an invisible edge that sometimes closes the task
         a user is halfway through. */
      closeOnScrim={false}
      surfaceClassName={["ckm-dialog", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <div className="ckm-dialog__bar">
        <IconButton
          className="ckm-dialog__close"
          icon="close"
          label={closeLabel}
          onClick={onClose}
        />
        <div className="ckm-dialog__titles">
          {title && <h2 className="ckm-dialog__title" id={titleId}>{title}</h2>}
          {description && (
            <p className="ckm-dialog__description" id={descriptionId}>{description}</p>
          )}
        </div>
        {action && <div className="ckm-dialog__action">{action}</div>}
      </div>

      <div className={["ckm-dialog__body", "ckm-scroll", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>

      {footer && (
        <div
          className="ckm-dialog__footer"
          style={keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined}
        >
          {footer}
        </div>
      )}
    </Overlay>
  );
}
