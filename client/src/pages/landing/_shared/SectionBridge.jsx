import Diamond from "./Diamond";
import "./SectionBridge.css";

/* The vertical hairline + diamond + kicker that bridges two sections
   (e.g. the "How It Works" divider between Hero and Steps). Reusable
   so any future section transition can reach for the same motif. */
export default function SectionBridge({ label }) {
  return (
    <div className="ckl-bridge">
      <span className="ckl-bridge-line ckl-bridge-line--in" />
      <Diamond size={9} style={{ boxShadow: "0 0 0 6px var(--ck-paper)" }} />
      <span className="ckl-bridge-label">{label}</span>
      <span className="ckl-bridge-line ckl-bridge-line--out" />
    </div>
  );
}
