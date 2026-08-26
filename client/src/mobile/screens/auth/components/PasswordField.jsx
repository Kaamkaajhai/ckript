import { useId, useState } from "react";
import Field from "../../../components/forms/Field";
import { passwordChecklist } from "../authModel";

/*
 * PasswordField — a password box with a reveal toggle and, optionally, the five
 * requirements shown as they are met.
 *
 * THE REVEAL IS NOT A NICETY ON A PHONE. A strong password on a soft keyboard
 * means several layout switches for symbols and digits, typed blind, with
 * autocorrect nearby. Being able to see what was typed is the difference
 * between one attempt and three. The toggle announces its state through
 * `aria-pressed` and swaps its accessible name, so it is not a mystery glyph.
 *
 * THE CHECKLIST EXISTS BECAUSE THE SERVER HAS FIVE RULES. `isValidPassword` on
 * the server refuses with one sentence naming one rule at a time, so a person
 * who breaks two learns about them one round trip apart. `passwordChecklist`
 * mirrors all five (authModel cites the source), and showing which are
 * outstanding turns a guessing game into a form.
 *
 * It appears on focus rather than always: on a sign-IN field the rules are
 * noise, and on a new-password field they are only useful once someone is
 * typing.
 */
export default function PasswordField({
  label = "Password",
  value,
  onChange,
  error = "",
  hint = "",
  autoComplete = "current-password",
  showRequirements = false,
  required = false,
  inputRef = null,
  ...rest
}) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const listId = useId();

  const rules = showRequirements ? passwordChecklist(value) : [];
  const outstanding = rules.filter((rule) => !rule.met).length;
  const showList = showRequirements && (focused || (value && outstanding > 0));

  return (
    <div className="ckm-auth__password">
      <Field label={label} hint={hint} error={error} required={required}>
        {(fieldProps) => (
          <span className="ckm-control__wrap ckm-auth__password-wrap">
            <input
              ref={inputRef}
              className="ckm-control ckm-auth__password-input"
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              onChange={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              {...fieldProps}
              aria-describedby={[fieldProps["aria-describedby"], showList ? listId : ""]
                .filter(Boolean).join(" ") || undefined}
              {...rest}
            />
            <button
              type="button"
              className="ckm-auth__reveal"
              onClick={() => setVisible((current) => !current)}
              aria-pressed={visible}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {visible ? "visibility_off" : "visibility"}
              </span>
            </button>
          </span>
        )}
      </Field>

      {showList && (
        <ul className="ckm-auth__rules" id={listId}>
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={rule.met ? "is-met" : ""}
              /* The state is carried by an icon and by the word, not by colour
                 alone — §14, and the same rule the token file enforces for
                 status text. */
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {rule.met ? "check_circle" : "radio_button_unchecked"}
              </span>
              <span>{rule.label}</span>
              <span className="ckm-sr-only">{rule.met ? " — done" : " — still needed"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
