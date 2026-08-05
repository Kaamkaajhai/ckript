import { forwardRef } from "react";
import Field from "./Field";
import Icon from "../Icon";
import "./Control.css";

/*
 * TextField — a labelled single-line input (prefixes: ckm-field, ckm-control).
 *
 * The mobile-specific value it adds over a bare <input> is the keyboard. A
 * phone user types on whatever keyboard the page asks for, and asking wrongly
 * costs them real effort: a numeric field on a QWERTY keyboard means hunting
 * for digits every time. `purpose` sets the three attributes that decide this
 * together — `type` (validation), `inputMode` (which keyboard) and
 * `autoComplete` (whether the browser can fill it) — because setting one and
 * forgetting the others is the usual bug.
 *
 * Per MDN, `inputMode` is a keyboard hint only and enforces nothing; the type
 * is what validates. Both are set here, deliberately.
 */

const PURPOSE = {
  text: { type: "text", inputMode: "text" },
  name: { type: "text", inputMode: "text", autoComplete: "name" },
  email: { type: "email", inputMode: "email", autoComplete: "email", spellCheck: false },
  password: { type: "password", autoComplete: "current-password" },
  newPassword: { type: "password", autoComplete: "new-password" },
  tel: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  url: { type: "url", inputMode: "url", autoComplete: "url", spellCheck: false },
  search: { type: "search", inputMode: "search", autoComplete: "off" },
  // `numeric` rather than type="number": a spinner is a poor phone control and
  // type="number" silently drops leading zeros and non-numeric edits.
  number: { type: "text", inputMode: "numeric", autoComplete: "off" },
  decimal: { type: "text", inputMode: "decimal", autoComplete: "off" },
  otp: { type: "text", inputMode: "numeric", autoComplete: "one-time-code" },
};

const TextField = forwardRef(function TextField({
  label,
  purpose = "text",
  hint = "",
  error = "",
  required = false,
  optional = false,
  icon = null,
  className = "",
  fieldClassName = "",
  ...rest
}, ref) {
  const preset = PURPOSE[purpose] || PURPOSE.text;

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
          {icon && <Icon className="ckm-control__icon" name={icon} size={20} />}
          <input
            ref={ref}
            className={[
              "ckm-control",
              icon ? "ckm-control--has-icon" : "",
              className,
            ].filter(Boolean).join(" ")}
            {...preset}
            {...fieldProps}
            {...rest}
          />
        </span>
      )}
    </Field>
  );
});

export default TextField;
