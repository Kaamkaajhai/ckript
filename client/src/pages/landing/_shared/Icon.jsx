/* Google Material Symbols glyph. Every inline SVG icon from the
   original Claude Design handoff was replaced with these. The `.msi`
   font wiring lives in landing.css. */
export default function Icon({ name, size = 24, color = "currentColor", fill = false, style }) {
  return (
    <span className={fill ? "msi fill" : "msi"} style={{ fontSize: size, color, ...style }}>
      {name}
    </span>
  );
}
