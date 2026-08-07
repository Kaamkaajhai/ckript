import { useId } from "react";
import "./Switch.css";

/*
 * Switch — an immediate on/off setting (prefix: ckm-switch).
 *
 * A switch is not a checkbox with a different skin. The distinction is what it
 * promises: a checkbox states an intention that a later Save commits, while a
 * switch takes effect the moment it moves. Use this only where that is true —
 * notification toggles, visibility, dark mode — and a Checkbox everywhere a
 * form is submitted.
 *
 * Built as <button role="switch"> with aria-checked, the pattern assistive
 * technology announces as "on/off", rather than as a checkbox that would be
 * announced as "checked" and imply a pending save.
 */
export default function Switch({
  label,
  description = "",
  checked = false,
  onChange = undefined,
  disabled = false,
  srOnlyLabel = false,
  className = "",
  ...rest
}) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;

  return (
    <div className={["ckm-switch", className].filter(Boolean).join(" ")}>
      {/* Inside a ListRow the row's own title is the visible label, so showing
          it again here would read it twice. It stays in the accessibility tree
          either way — the control is still named by it. */}
      <span className={srOnlyLabel ? "ckm-sr-only" : "ckm-switch__text"}>
        <span className="ckm-switch__label" id={`${id}-label`}>{label}</span>
        {description && <span className="ckm-switch__description" id={descriptionId}>{description}</span>}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={descriptionId}
        disabled={disabled}
        className="ckm-switch__control"
        onClick={() => onChange?.(!checked)}
        {...rest}
      >
        <span className="ckm-switch__track" aria-hidden="true">
          <span className="ckm-switch__thumb" />
        </span>
      </button>
    </div>
  );
}
