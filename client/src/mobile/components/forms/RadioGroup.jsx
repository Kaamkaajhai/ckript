import { useId } from "react";
import "./RadioGroup.css";

/*
 * RadioGroup — a set of mutually exclusive options (prefix: ckm-radio).
 *
 * It is a real <fieldset>/<legend>. That pairing is what tells a screen reader
 * "these five options belong to one question"; a heading above loose radios
 * announces each option with no idea what it is answering.
 *
 * The group, not the option, owns the label, the hint and the error — an error
 * attached to one radio of five is nonsense.
 *
 * Options render as full-width rows rather than an inline cluster: on a phone
 * an inline row of radios either wraps unpredictably or produces targets too
 * close together to hit reliably.
 */
export default function RadioGroup({
  label,
  name,
  options = [],
  value = undefined,
  onChange = undefined,
  hint = "",
  error = "",
  required = false,
  disabled = false,
  className = "",
  ...rest
}) {
  const id = useId();
  const groupName = name || id;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      className={["ckm-radio", error ? "is-invalid" : "", className].filter(Boolean).join(" ")}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
      {...rest}
    >
      <legend className="ckm-radio__legend">
        <span className="ckm-radio__legend-text">{label}</span>
        {required && <span className="ckm-field__flag">Required</span>}
      </legend>

      {hint && !error && <p className="ckm-field__hint" id={hintId}>{hint}</p>}

      <div className="ckm-radio__options">
        {options.map((option) => {
          const { value: optionValue, label: text, description, disabled: optionDisabled } =
            typeof option === "string" ? { value: option, label: option } : option;
          const optionId = `${id}-${optionValue}`;

          return (
            <label className="ckm-radio__row" key={optionValue} htmlFor={optionId}>
              <input
                id={optionId}
                type="radio"
                className="ckm-radio__input"
                name={groupName}
                value={optionValue}
                checked={value !== undefined ? value === optionValue : undefined}
                onChange={onChange}
                disabled={optionDisabled}
                required={required}
              />
              <span className="ckm-radio__dot" aria-hidden="true" />
              <span className="ckm-radio__text">
                <span className="ckm-radio__label">{text}</span>
                {description && <span className="ckm-radio__description">{description}</span>}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="ckm-field__error" id={errorId} role="alert">
          <span className="material-symbols-outlined ckm-field__error-icon" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </fieldset>
  );
}
