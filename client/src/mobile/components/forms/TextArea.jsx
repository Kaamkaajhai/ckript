import { forwardRef } from "react";
import Field from "./Field";
import "./Control.css";

/*
 * TextArea — a labelled multi-line input (prefixes: ckm-field, ckm-control).
 *
 * `maxLength` renders a live counter. On a phone the counter matters more than
 * on desktop: the keyboard covers most of the screen, so a user typing a
 * logline cannot see how much room is left unless it is next to the control.
 * The counter is polite, not assertive — a count that interrupted on every
 * keystroke would make the field unusable with a screen reader.
 */
const TextArea = forwardRef(function TextArea({
  label,
  hint = "",
  error = "",
  required = false,
  optional = false,
  rows = 4,
  maxLength = undefined,
  value = undefined,
  className = "",
  fieldClassName = "",
  ...rest
}, ref) {
  const used = typeof value === "string" ? value.length : null;
  const showCount = Boolean(maxLength) && used !== null;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={fieldClassName}
      meta={showCount ? <span aria-live="polite">{used} / {maxLength}</span> : null}
    >
      {(fieldProps) => (
        <textarea
          ref={ref}
          rows={rows}
          maxLength={maxLength}
          value={value}
          className={["ckm-control", "ckm-control--area", className].filter(Boolean).join(" ")}
          {...fieldProps}
          {...rest}
        />
      )}
    </Field>
  );
});

export default TextArea;
