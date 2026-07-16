/*
 * Icon — thin wrapper over the Material Symbols Outlined webfont that the
 * whole app already loads. Centralising it means every glyph shares one
 * call-site (size, fill, colour) instead of repeating inline styles.
 */
export default function Icon({ name, size = 20, fill = false, color, className = "", style, ...rest }) {
  return (
    <span
      className={`material-symbols-outlined${fill ? " is-filled" : ""}${className ? ` ${className}` : ""}`}
      style={{ fontSize: size, color, ...style }}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
}
