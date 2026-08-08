import Icon from "../Icon";
import "./Badge.css";

/*
 * Badge — a status label (prefix: ckm-badge).
 *
 * A badge states what something *is*: In review, Draft, Winner, Overdue. It is
 * never interactive — the moment a pill can be tapped it is a Chip, and it
 * needs a 44px target and a pressed state that a badge must not spend layout
 * on. Keeping the two apart is why both exist.
 *
 * Two rules it enforces so screens do not have to:
 *   • colour is never the only carrier — the word is always there, and `dot`
 *     adds a second non-colour cue for the status families that repeat;
 *   • the text colour is the darkened `*-ink` token, not the shape colour.
 *     --ckm-green on --ckm-green-bg measures ~3.88:1 and fails AA at this
 *     size; the ink tokens were added for exactly this (see tokens.css).
 *
 * `srLabel` exists for the counting case: "3" beside an icon means nothing on
 * its own, so the badge can carry "3 unread messages" for a screen reader
 * while showing the numeral.
 */
export default function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  dot = false,
  icon = "",
  srLabel = "",
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "ckm-badge",
    `ckm-badge--${tone}`,
    `ckm-badge--${variant}`,
    size !== "md" ? `ckm-badge--${size}` : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <span className={classes} {...rest}>
      {dot && <span className="ckm-badge__dot" aria-hidden="true" />}
      {icon && <Icon className="ckm-badge__icon" name={icon} size={13} />}
      <span className={srLabel ? "ckm-badge__text" : undefined} aria-hidden={srLabel ? "true" : undefined}>
        {children}
      </span>
      {srLabel && <span className="ckm-sr-only">{srLabel}</span>}
    </span>
  );
}
