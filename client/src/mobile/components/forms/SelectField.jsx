import { forwardRef } from "react";
import Field from "./Field";
import Icon from "../Icon";
import "./Control.css";

/*
 * SelectField — a labelled native <select> (prefixes: ckm-field, ckm-control).
 *
 * Deliberately native. A custom listbox on a phone has to re-implement the
 * platform picker — the iOS wheel, Android's dialog, the hardware keyboard,
 * VoiceOver's rotor — and every implementation is worse than the one the OS
 * ships. A custom combobox is only worth building when the list must be
 * *searched*; that is a separate primitive, not this one.
 *
 * `placeholder` renders a disabled first option AND makes it the initial
 * selection. Without that second half the browser selects the first enabled
 * option instead, so a select the user never touched reads as a real answer —
 * "Drama" — and submits one.
 */
const SelectField = forwardRef(function SelectField({
  label,
  options = [],
  placeholder = "",
  hint = "",
  error = "",
  required = false,
  optional = false,
  className = "",
  fieldClassName = "",
  children = null,
  ...rest
}, ref) {
  // Only when the caller is not driving the value itself, so this can never
  // fight a controlled select or override an explicit default.
  const placeholderDefault = placeholder
    && rest.value === undefined
    && rest.defaultValue === undefined
    ? { defaultValue: "" }
    : null;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={fieldClassName}
    >
      {(fieldProps) => (
        <span className="ckm-control__wrap">
          <select
            ref={ref}
            className={["ckm-control", "ckm-control--select", className].filter(Boolean).join(" ")}
            {...placeholderDefault}
            {...fieldProps}
            {...rest}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {children ?? options.map((option) => {
              const { value, label: text, disabled } = typeof option === "string"
                ? { value: option, label: option }
                : option;
              return <option key={value} value={value} disabled={disabled}>{text}</option>;
            })}
          </select>
          <Icon className="ckm-control__caret" name="expand_more" size={20} />
        </span>
      )}
    </Field>
  );
});

export default SelectField;
