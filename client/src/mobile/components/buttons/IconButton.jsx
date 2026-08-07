import { Link } from "react-router-dom";
import Icon from "../Icon";
import "./IconButton.css";

/*
 * IconButton — a control whose whole label is a glyph (prefix: ckm-icon-button).
 *
 * Two things it refuses to let a screen get wrong:
 *   • it has no visible text, so `label` is required and becomes the
 *     accessible name — an unlabelled icon button is silent to a screen
 *     reader, and in development this warns loudly instead of shipping;
 *   • the `sm` size looks 36px but is still tappable at --ckm-touch-target,
 *     because the CSS grows the hit region with a transparent overlay rather
 *     than shrinking the target (React Native's hitSlop, on the web).
 *
 * `badge` is visual information, so it is folded into the accessible name too:
 * "Notifications" and "Notifications, 3" are different controls to a user who
 * cannot see the dot.
 */
export default function IconButton({
  icon,
  label,
  variant = "plain",
  tone = "default",
  size = "md",
  badge = null,
  badgeLabel = "",
  active = false,
  disabled = false,
  to = null,
  href = null,
  type = "button",
  className = "",
  children = null,
  ...rest
}) {
  if (import.meta.env?.DEV && !String(label || "").trim()) {
    console.error("[mobile] IconButton needs a `label`: an icon-only control has no accessible name.");
  }

  const hasBadge = badge !== null && badge !== undefined && badge !== false && badge !== 0;
  const accessibleName = hasBadge
    ? (badgeLabel || `${label}, ${badge}`)
    : label;

  const classes = [
    "ckm-icon-button",
    `ckm-icon-button--${variant}`,
    `ckm-icon-button--${size}`,
    tone === "danger" ? "ckm-icon-button--danger" : "",
    active ? "is-active" : "",
    disabled ? "is-disabled" : "",
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {children ?? <Icon name={icon} size={size === "sm" ? 20 : 24} />}
      {hasBadge && (
        <span className="ckm-icon-button__badge" aria-hidden="true">
          {typeof badge === "number" && badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  const shared = {
    className: classes,
    "aria-label": accessibleName,
    ...rest,
  };

  if (to && !disabled) return <Link to={to} {...shared}>{content}</Link>;
  if (href && !disabled) return <a href={href} {...shared}>{content}</a>;

  return (
    <button type={type} disabled={disabled} {...shared}>
      {content}
    </button>
  );
}
