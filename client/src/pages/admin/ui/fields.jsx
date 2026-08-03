import { forwardRef, useId } from "react";

/**
 * Form controls, and the wrapper that wires them up.
 *
 * `Field` owns everything around a control — label, required mark, helper text, error — and hands
 * the control its ids. That wiring is the part screens always skip when they build inputs by hand:
 * an error that is not in `aria-describedby` is invisible to a screen reader, and a label that is
 * not `for`-bound is not a click target.
 *
 * Controls stay uncontrolled-friendly: they pass every prop through, so existing screens can move
 * a form onto these without changing how their state works.
 */

export function Field({ label, required = false, error = "", help = "", children, className = "" }) {
  const id = useId();
  const errorId = `${id}-err`;
  const helpId = `${id}-help`;
  const describedBy = [error ? errorId : "", help ? helpId : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`adf ${error ? "adf--invalid" : ""} ${className}`.trim()}>
      {label ? (
        <label className="adf-label" htmlFor={id}>
          {label}
          {/* aria-hidden: `required` on the control itself is what assistive tech announces. */}
          {required ? <span className="adf-req" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children({ id, required, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {help && !error ? <p className="adf-help" id={helpId}>{help}</p> : null}
      {/* The error replaces the helper rather than stacking under it — two lines of small print
          under every invalid control turns a form into a wall. */}
      {error ? <p className="adf-error" id={errorId} role="alert">{error}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = "", ...rest }, ref) {
  return <input ref={ref} className={`adf-control ${className}`.trim()} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className = "", rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={`adf-control adf-control--area ${className}`.trim()} {...rest} />;
});

export const Select = forwardRef(function Select({ className = "", children, ...rest }, ref) {
  return (
    <span className="adf-selectwrap">
      <select ref={ref} className={`adf-control adf-control--select ${className}`.trim()} {...rest}>
        {children}
      </select>
      <span className="adf-selectcaret" aria-hidden="true">▾</span>
    </span>
  );
});

/**
 * Search input with the icon inside the field. Debouncing belongs to the caller — a primitive that
 * debounces invisibly makes "why is my filter late" undiagnosable from the call site.
 */
export const SearchInput = forwardRef(function SearchInput(
  { className = "", "aria-label": ariaLabel = "Search", ...rest },
  ref,
) {
  return (
    <span className={`adf-search ${className}`.trim()}>
      <span className="adf-search-ico" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3.2 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <input ref={ref} type="search" className="adf-control adf-control--search" aria-label={ariaLabel} {...rest} />
    </span>
  );
});
