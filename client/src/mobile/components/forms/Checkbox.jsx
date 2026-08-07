import { forwardRef, useId } from "react";
import "./Checkbox.css";

/*
 * Checkbox — a real <input type="checkbox"> with a drawn indicator
 * (prefix: ckm-checkbox).
 *
 * The input is never removed from the DOM and never `display: none` — it is
 * the thing that is focused, checked, announced and submitted. Only its
 * *painting* is replaced. A div with `role="checkbox"` would have to
 * re-implement space-to-toggle, form participation and the indeterminate
 * state, and would still lose to the native control on a screen reader.
 *
 * The whole row is the label, so the tap target is the row rather than a 20px
 * square — the difference between a comfortable form and a frustrating one on
 * a phone.
 */
const Checkbox = forwardRef(function Checkbox({
  label,
  description = "",
  error = "",
  className = "",
  id: idProp,
  ...rest
}, ref) {
  const generated = useId();
  const id = idProp || generated;
  const descriptionId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={["ckm-checkbox", error ? "is-invalid" : "", className].filter(Boolean).join(" ")}>
      <label className="ckm-checkbox__row" htmlFor={id}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="ckm-checkbox__input"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        <span className="ckm-checkbox__box" aria-hidden="true">
          <span className="material-symbols-outlined ckm-checkbox__tick">check</span>
        </span>
        <span className="ckm-checkbox__text">
          <span className="ckm-checkbox__label">{label}</span>
          {description && <span className="ckm-checkbox__description" id={descriptionId}>{description}</span>}
        </span>
      </label>

      {error && (
        <p className="ckm-field__error" id={errorId} role="alert">
          <span className="material-symbols-outlined ckm-field__error-icon" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  );
});

export default Checkbox;
