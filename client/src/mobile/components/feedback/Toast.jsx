import Icon from "../Icon";
import IconButton from "../buttons/IconButton";
import { TOAST_TONE, toastPersists } from "./toastContext";
import "./Toast.css";

/*
 * Toast — one transient message (prefix: ckm-toast).
 *
 * Rendered only by ToastProvider's host; screens raise one with `useToast()`
 * and never mount this directly. It is deliberately a plain region and not a
 * button: the dashboard-era DynamicIsland made the entire message a <button>,
 * which is why it can never carry an "Undo" — a button cannot live inside a
 * button, and the message's accessible name became the whole card.
 *
 * At most ONE action. Two competing actions in a surface that may vanish is a
 * decision the user is being rushed into; if a choice is genuinely needed, that
 * is a ConfirmDialog, which is modal precisely because it waits.
 */
export default function Toast({ toast, onDismiss, onAction }) {
  const { id, tone, title, description, action } = toast;
  const persists = toastPersists(toast);

  return (
    <div
      className={`ckm-toast ckm-toast--${tone}`}
      data-tone={tone}
      data-persists={persists ? "true" : undefined}
    >
      <span className="ckm-toast__icon">
        <Icon name={TONE_ICON[tone] || TONE_ICON.info} size={20} />
      </span>

      <div className="ckm-toast__text">
        <p className="ckm-toast__title">{title}</p>
        {description && <p className="ckm-toast__description">{description}</p>}
      </div>

      {action && (
        <button
          type="button"
          className="ckm-toast__action"
          onClick={() => onAction?.(id)}
        >
          {action.label}
        </button>
      )}

      <IconButton
        icon="close"
        label={`Dismiss: ${title}`}
        size="sm"
        className="ckm-toast__close"
        onClick={() => onDismiss?.(id)}
      />
    </div>
  );
}

/* The glyph repeats what the tone colour says, so the message is not carried by
   colour alone (§14). It is aria-hidden: the tone is already in the wording. */
const TONE_ICON = {
  [TOAST_TONE.INFO]: "info",
  [TOAST_TONE.SUCCESS]: "check_circle",
  [TOAST_TONE.WARNING]: "warning",
  [TOAST_TONE.ERROR]: "error",
};
