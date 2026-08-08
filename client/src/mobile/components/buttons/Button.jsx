import { Link } from "react-router-dom";
import Icon from "../Icon";
import "./Button.css";

/*
 * Button — the mobile app's one action primitive (prefix: ckm-button).
 *
 * Modelled on React Native's Pressable rather than on a desktop <button>:
 *   • press feedback is immediate and never depends on hover;
 *   • the control is at least --ckm-touch-target tall, so the visual size and
 *     the hit region are the same thing;
 *   • `pending` is a first-class state — it keeps the control focusable and
 *     announced (aria-busy + aria-disabled) instead of removing it from the
 *     tab order mid-task, and it blocks the double submit that a slow mobile
 *     network invites.
 *
 * Four intents, and only four, so a screen never invents a fifth:
 *   primary      ink fill        the one thing this screen wants you to do
 *   secondary    outlined        a real alternative, equal weight, lower ink
 *   tertiary     text only       low-stakes / repeated inline actions
 *   destructive  red fill        irreversible; §7.4 forbids placing it beside
 *                                the primary action
 *
 * `to` renders a react-router Link and `href` a plain anchor, so navigation
 * stays a link (long-press, open-in-new-tab, screen-reader link semantics)
 * while still looking like the same control.
 */
export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon = null,
  trailingIcon = null,
  pending = false,
  pendingLabel = "",
  disabled = false,
  to = null,
  href = null,
  type = "button",
  className = "",
  onClick,
  children,
  ...rest
}) {
  const inert = disabled || pending;
  const label = pending && pendingLabel ? pendingLabel : children;

  const classes = [
    "ckm-button",
    `ckm-button--${variant}`,
    `ckm-button--${size}`,
    fullWidth ? "ckm-button--block" : "",
    pending ? "is-pending" : "",
    disabled ? "is-disabled" : "",
    className,
  ].filter(Boolean).join(" ");

  // A pending control stays in the tab order, so its click must be refused
  // here rather than by the `disabled` attribute.
  const handleClick = (event) => {
    if (inert) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  const content = (
    <>
      {pending ? (
        <span className="ckm-button__spinner" aria-hidden="true" />
      ) : (
        icon && <Icon className="ckm-button__icon" name={icon} size={18} />
      )}
      <span className="ckm-button__label">{label}</span>
      {trailingIcon && !pending && (
        <Icon className="ckm-button__icon" name={trailingIcon} size={18} />
      )}
    </>
  );

  const shared = {
    className: classes,
    onClick: handleClick,
    "data-variant": variant,
    "aria-busy": pending || undefined,
    ...rest,
  };

  if (to && !disabled) {
    return (
      <Link to={to} aria-disabled={pending || undefined} {...shared}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a href={href} aria-disabled={pending || undefined} {...shared}>
        {content}
      </a>
    );
  }

  // A disabled link has no accessible equivalent, so it degrades to a real
  // disabled button rather than to an anchor that silently does nothing.
  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={pending || undefined}
      {...shared}
    >
      {content}
    </button>
  );
}
