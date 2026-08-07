import Icon from "../Icon";
import "./Chip.css";

/*
 * Chip — the tappable pill (prefix: ckm-chip, shared with theme/primitives.css).
 *
 * Deliberately not a second chip family. `ckm-chip` already exists as the
 * dashboard's static genre/status tag, and the plan's rule is to extend the
 * registered prefix rather than mint `ckm-chip2`. So the base pill is unchanged
 * and this file adds only what interaction requires:
 *
 *   tag         static, non-interactive — the existing look, kept verbatim
 *   action      a filter you can turn on and off (aria-pressed), 44px tall
 *   removable   a chosen value you can take back off, with its own target
 *
 * Two things a hand-rolled filter pill gets wrong and this does not:
 *   • selection is `aria-pressed`, not a class. A pill that only *looks*
 *     selected leaves a screen-reader user with no way to know what is
 *     filtering their results;
 *   • the remove control is a separate button with its own name ("Remove
 *     Drama"), because "Drama, button" twice in a row is unusable — and it is
 *     never nested inside the chip's own button, which would be invalid.
 *
 * Interactive chips are drawn at the full 44px rather than at 32–36px with a
 * hit-region overlay: chips sit in tight horizontal rows, and overlapping
 * overlays would hand a mis-tap to the neighbour instead of to the chip.
 */
/*
 * ChipRow — the horizontal filter rail (prefix: ckm-chip-row).
 *
 * Scrolls sideways by default rather than wrapping, because a wrapping filter
 * row changes the page height every time a filter is added and pushes the
 * results the user is reading off screen. It bleeds into the page gutter so a
 * chip is visibly cut at the edge — the cue that says "there is more".
 */
export function ChipRow({ label = "", wrap = false, className = "", children, ...rest }) {
  return (
    <div
      className={["ckm-chip-row", wrap ? "ckm-chip-row--wrap" : "", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label || undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

export default function Chip({
  selected = false,
  onSelect = null,
  onRemove = null,
  removeLabel = "",
  icon = "",
  tone = "neutral",
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  const text = typeof children === "string" ? children : "";
  const interactive = Boolean(onSelect);

  const classes = [
    "ckm-chip",
    interactive || onRemove ? "ckm-chip--action" : "ckm-chip--tag",
    tone !== "neutral" ? `ckm-chip--${tone}` : "",
    selected ? "is-selected" : "",
    disabled ? "is-disabled" : "",
    onRemove ? "ckm-chip--removable" : "",
    className,
  ].filter(Boolean).join(" ");

  const inner = (
    <>
      {icon && <Icon className="ckm-chip__icon" name={icon} size={16} />}
      {selected && !icon && <Icon className="ckm-chip__icon" name="check" size={16} />}
      <span className="ckm-chip__label">{children}</span>
    </>
  );

  // A plain tag: no target, no pressed state, nothing to announce.
  if (!interactive && !onRemove) {
    return <span className={classes} {...rest}>{inner}</span>;
  }

  const main = interactive ? (
    <button
      type="button"
      className="ckm-chip__main"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      {inner}
    </button>
  ) : (
    <span className="ckm-chip__main">{inner}</span>
  );

  return (
    <span className={classes} {...rest}>
      {main}
      {onRemove && (
        <button
          type="button"
          className="ckm-chip__remove"
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel || `Remove ${text || "filter"}`}
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </span>
  );
}
