import Icon from "../Icon";
import Button from "../buttons/Button";
import "./InlineMessage.css";

/*
 * InlineMessage — a message that stays put (prefix: ckm-message).
 *
 * The durable half of the pair whose transient half is Toast. The division is
 * not stylistic:
 *
 *   Toast           something HAPPENED. It is over, the screen behind it is the
 *                   record, and the message may fade.
 *   InlineMessage   something IS. A section failed to load, a plan is out of
 *                   quota, a field is wrong — the condition is still true, so
 *                   the message must still be on screen.
 *
 * This is also the answer to the rule that a toast must never be the only place
 * an error is reported: whatever a toast says about a failed load, the surface
 * that failed says here too, and this one does not disappear.
 *
 * Two shapes, one component:
 *   inline   a bordered strip in the flow of a screen or above a form
 *   panel    the whole region's content, replacing what could not be shown —
 *            the failure counterpart of EmptyState's "nothing here yet"
 */
export default function InlineMessage({
  tone = "error",
  variant = "inline",
  title = "",
  titleAs = "h3",
  icon = null,
  onRetry = null,
  retryLabel = "Try again",
  action = null,
  className = "",
  children = null,
  ...rest
}) {
  /*
   * Only an error is assertive. `role="alert"` interrupts whatever a screen
   * reader is saying, and the APG is explicit that overusing it is itself a
   * failure — SC 2.2.4's "no interruptions" is easier to meet the less often
   * this role is reached for. Everything else is a status message (SC 4.1.3):
   * announced when it changes, never taking focus.
   */
  const role = tone === "error" ? "alert" : "status";
  const Title = variant === "panel" ? titleAs : "p";

  return (
    <div
      className={[
        "ckm-message",
        `ckm-message--${tone}`,
        `ckm-message--${variant}`,
        className,
      ].filter(Boolean).join(" ")}
      role={role}
      data-tone={tone}
      {...rest}
    >
      <span className="ckm-message__icon">
        <Icon name={icon || TONE_ICON[tone] || TONE_ICON.info} size={variant === "panel" ? 28 : 20} />
      </span>

      <div className="ckm-message__body">
        {title && <Title className="ckm-message__title">{title}</Title>}
        {children && <div className="ckm-message__text">{children}</div>}

        {(onRetry || action) && (
          <div className="ckm-message__actions">
            {onRetry && (
              <Button
                variant="secondary"
                icon="refresh"
                fullWidth={variant === "panel"}
                onClick={onRetry}
              >
                {retryLabel}
              </Button>
            )}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

/* The glyph carries the tone alongside the colour, so the distinction survives
   a monochrome display and colour-blindness (§14). */
const TONE_ICON = {
  info: "info",
  success: "check_circle",
  warning: "warning",
  error: "error",
};
