import { forwardRef } from "react";

/**
 * The admin's one button.
 *
 * Every variant shares a single element and size grammar so that a row of mixed buttons aligns to
 * the pixel. `variant` is the only styling input the call sites get — the moment screens pass
 * their own classes for colour, the system stops being one.
 *
 *   primary   the ONE main action on a surface — wine red, so it must stay rare
 *   secondary bordered neutral; the default for everything else
 *   ghost     borderless; toolbars and table rows, where a border per action is noise
 *   danger    destructive intent, filled — reserved for the confirming step, not the opener
 *   success   confirmations of completed flows (rare)
 *
 * `loading` keeps the label mounted under an overlaid spinner instead of swapping it out, so the
 * button cannot change width mid-request — a submit row that reflows while disabled reads as broken.
 */
const Button = forwardRef(function Button(
  {
    variant = "secondary",
    size = "md",              // sm | md | lg
    icon = null,              // leading icon node
    iconOnly = false,         // square button; children become the accessible name
    loading = false,
    disabled = false,
    className = "",
    type = "button",          // explicit: a bare <button> inside a form submits it
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const classes = [
    "adb",
    `adb--${variant}`,
    `adb--${size}`,
    iconOnly ? "adb--icon" : "",
    loading ? "is-loading" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="adb-spin" aria-hidden="true" /> : null}
      <span className="adb-body">
        {icon ? <span className="adb-ico" aria-hidden="true">{icon}</span> : null}
        {iconOnly ? <span className="ckad-sr-only">{children}</span> : children}
      </span>
    </button>
  );
});

export default Button;
