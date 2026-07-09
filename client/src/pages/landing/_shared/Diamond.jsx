import { RED } from "./theme";

/* The rotated-square motif that punctuates the landing (nav accents,
   marquee separators, section bridges, CTA flourishes). */
export default function Diamond({ size = 9, color = RED, style }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        background: color,
        transform: "rotate(45deg)",
        flex: "none",
        display: "inline-block",
        ...style,
      }}
    />
  );
}
