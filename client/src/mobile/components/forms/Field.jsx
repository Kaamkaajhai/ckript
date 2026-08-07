import { useId } from "react";
import "./Field.css";

/*
 * Field — the wrapper that wires a control to its label, hint and error
 * (prefix: ckm-field).
 *
 * It deliberately mirrors the admin kit's `Field` (pages/admin/ui/fields.jsx):
 * same render-prop contract, same "error replaces hint" rule, so the two halves
 * of the codebase read the same way. What differs is presentation, which is
 * exactly the split plan §5.4 asks for — share the behaviour, not the CSS.
 *
 * The wiring is the part hand-built forms always skip:
 *   • a label that is not `for`-bound is not a tap target — and on a phone a
 *     44px label is a much easier target than a checkbox;
 *   • an error that is not in `aria-describedby` is invisible to a screen
 *     reader, which then hears "invalid" with no reason;
 *   • an error that only appears in red is invisible to a colour-blind user.
 *
 * Controls stay uncontrolled-friendly and pass every prop through, so a screen
 * can move a form onto these without changing how its state works.
 */
export default function Field({
  label,
  hint = "",
  error = "",
  required = false,
  optional = false,
  meta = null,
  children,
  className = "",
  ...rest
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined;

  const classes = ["ckm-field", error ? "is-invalid" : "", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      <label className="ckm-field__label" htmlFor={id}>
        <span className="ckm-field__label-text">{label}</span>
        {/* A word, not an asterisk. "*" depends on a legend the user has to
            find and scroll back to, and some screen readers skip it entirely. */}
        {required && <span className="ckm-field__flag">Required</span>}
        {optional && !required && <span className="ckm-field__flag ckm-field__flag--soft">Optional</span>}
      </label>

      {children({
        id,
        required: required || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}

      {/* The foot carries guidance on the left and status (a character count,
          say) on the right, so a counter never pushes itself above the hint
          that explains the field. The error replaces the hint rather than
          stacking under it — two lines of small print under every invalid
          control turns a form into a wall — but `meta` survives, because a
          count still matters while you are fixing the error. */}
      {(hint || error || meta) && (
        <div className="ckm-field__foot">
          {error ? (
            <p className="ckm-field__error" id={errorId} role="alert">
              <span className="material-symbols-outlined ckm-field__error-icon" aria-hidden="true">error</span>
              {error}
            </p>
          ) : (
            hint && <p className="ckm-field__hint" id={hintId}>{hint}</p>
          )}
          {meta && <span className="ckm-field__meta">{meta}</span>}
        </div>
      )}
    </div>
  );
}
