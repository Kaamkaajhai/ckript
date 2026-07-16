import Diamond from "../../_shared/Diamond";
import "./Marquee.css";

const PHRASES = [
  "Now casting untold stories",
  "From the page to the screen",
  "Every great film began as a script",
  "Your story deserves an audience",
];

export default function Marquee() {
  return (
    <section className="ckl-marquee">
      <div className="ckl-marquee-track">
        {/* Two identical groups so the -50% keyframe loops seamlessly.
            The duplicate is aria-hidden to avoid repeating the phrases
            to assistive tech. */}
        {[0, 1].map((g) => (
          <div key={g} className="ckl-marquee-group" aria-hidden={g === 1 ? "true" : undefined}>
            {PHRASES.map((phrase) => (
              <span key={phrase} className="ckl-marquee-item">
                <span className="ckl-marquee-phrase">{phrase}</span>
                <Diamond size={9} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
