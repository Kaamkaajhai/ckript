import { useId } from "react";
import Chip, { ChipRow } from "../chips/Chip";
import "./Field.css";

/*
 * ChipSelect — a labelled set of chips used as a form control
 * (prefixes: ckm-field, ckm-chip, ckm-chip-row — no new prefix).
 *
 * The mobile counterpart of `components/TagSelect`, which four create-project
 * steps use for genre, tone, theme, setting, format, rights and payment terms.
 * A native <select> is wrong for all of them: several are multi-select with a
 * cap, several are 20–29 options long, and every one of them is a *vocabulary*
 * the writer browses rather than a value they already know. A picker wheel hides
 * 27 of 29 genres behind a scroll gesture; chips show the vocabulary.
 *
 * Semantics match TagSelect deliberately — `role="group"` over real buttons with
 * `aria-pressed` — so the two platforms describe the same control the same way
 * to a screen reader. `aria-pressed` and not `aria-checked`: these are toggle
 * buttons, not radios, and a radio group would have to own roving tabindex and
 * arrow-key navigation, a desktop keyboard model that replaces behaviour a phone
 * user already has (Tab moves on) with behaviour they must discover. Same
 * argument the editor's dock switch and Phase 1's ActionSheet both made.
 *
 * `max` is enforced here rather than by the caller so the cap is visible in the
 * label ("2/3") and the refusal is silent-but-explained rather than a chip that
 * simply does not respond.
 */
export default function ChipSelect({
  label,
  options = [],
  value = undefined,
  onChange = undefined,
  multiple = false,
  max = 0,
  allowClear = false,
  hint = "",
  error = "",
  required = false,
  optional = false,
  disabled = false,
  className = "",
  ...rest
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const selected = multiple ? (Array.isArray(value) ? value : []) : value;
  const atCap = multiple && max > 0 && selected.length >= max;

  const toggle = (optionValue) => {
    if (!onChange) return;
    if (multiple) {
      if (selected.includes(optionValue)) {
        onChange(selected.filter((item) => item !== optionValue));
        return;
      }
      if (atCap) return;
      onChange([...selected, optionValue]);
      return;
    }
    // Single select. Re-tapping the chosen chip clears it only where clearing is
    // a real answer — on a required field "none" is not one, and a chip that
    // silently deselects is how a writer loses a value they thought they set.
    if (optionValue === selected) {
      if (allowClear) onChange("");
      return;
    }
    onChange(optionValue);
  };

  return (
    <div className={["ckm-field", error ? "is-invalid" : "", className].filter(Boolean).join(" ")} {...rest}>
      {/* A <span>, not a <label>: `for` may only point at a form control, and
          this group is a set of buttons. The group carries the name instead. */}
      <span className="ckm-field__label" id={`${id}-label`}>
        <span className="ckm-field__label-text">{label}</span>
        {required && <span className="ckm-field__flag">Required</span>}
        {optional && !required && <span className="ckm-field__flag ckm-field__flag--soft">Optional</span>}
        {multiple && max > 0 && (
          <span className="ckm-field__flag ckm-field__flag--soft" aria-live="polite">
            {selected.length}/{max}
          </span>
        )}
      </span>

      <ChipRow
        wrap
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        aria-label={undefined}
      >
        {options.map((option) => {
          const { value: optionValue, label: text } = typeof option === "string"
            ? { value: option, label: option }
            : option;
          const active = multiple ? selected.includes(optionValue) : selected === optionValue;

          return (
            <Chip
              key={optionValue}
              selected={active}
              /* Disabled at the cap rather than merely unresponsive: a chip that
                 looks tappable and does nothing reads as a broken app, and
                 `disabled` is what tells a screen reader the same thing. */
              disabled={disabled || (!active && atCap)}
              onSelect={() => toggle(optionValue)}
            >
              {text}
            </Chip>
          );
        })}
      </ChipRow>

      {(hint || error) && (
        <div className="ckm-field__foot">
          {error ? (
            <p className="ckm-field__error" id={errorId} role="alert">
              <span className="material-symbols-outlined ckm-field__error-icon" aria-hidden="true">error</span>
              {error}
            </p>
          ) : (
            hint && <p className="ckm-field__hint" id={hintId}>{hint}</p>
          )}
        </div>
      )}
    </div>
  );
}
