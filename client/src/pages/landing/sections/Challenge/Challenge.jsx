import { Link } from "react-router-dom";
import COPY from "./challenge.data";
import "./Challenge.css";

/**
 * The challenge on the landing page.
 *
 * HEAD + ONE DEVICE — the shape every other section on this page takes. Formats is a head and a grid
 * of stills; Problem is a head and two cards. A section that stacks four blocks reads as a portal
 * however good the blocks are, and the homepage is Ckript's, not the competition's.
 *
 * So this deliberately withholds. How it works, what you receive and who can enter all live on
 * /challenge — restating them here at lower resolution would make the landing a worse copy of a page
 * that already does the job, and would remove any reason to click through. The lead sells the idea;
 * the laureate proves it happened; the button goes where the detail is.
 *
 * Phase-aware, and every element below the head is conditional: for most of the year no competition
 * is running, so `dormant` is the state this renders in and the one the copy is written for.
 */

const resolve = (value, competition) => (typeof value === "function" ? value(competition) : value);

const Challenge = ({ phase, competition, winner }) => {
  const copy = COPY[phase] || COPY.dormant;

  return (
    <section className="ckl-chal">
      <div className="ckl-chal-inner">
        <div className="ckl-chal-head" data-ra="ckl-fadeUp">
          <div className="ckl-kicker">{copy.kicker}</div>
          <h2 className="ckl-h2">
            {copy.line1}<br />
            <span className="ckl-h2-em">{copy.line2}</span>
          </h2>
          <p className="ckl-lead ckl-chal-lead">{resolve(copy.lead, competition)}</p>

          <div className="ckl-chal-cta">
            <Link to={resolve(copy.primary.to, competition)} className="ckl-chal-btn hov-btn-lift">
              {copy.primary.label}
            </Link>
            <Link to={resolve(copy.secondary.to, competition)} className="ckl-chal-link hov-underline">
              {copy.secondary.label}
            </Link>
          </div>
        </div>

        {/* The one device: a real person who did this. Renders only when a laureate exists — a
            placeholder name or an empty frame is worse proof than none. */}
        {winner ? (
          <Link
            to={`/hall-of-fame/${winner.slug}`}
            className="ckl-chal-proof hov-lift3"
            data-ra="ckl-fadeUp"
            data-rd="0.12"
          >
            <span className="ckl-chal-proof-eyebrow">Winner</span>
            <span className="ckl-chal-proof-name">{winner.name}</span>
            <span className="ckl-chal-proof-meta">{winner.competitionName} · {winner.year}</span>
            <span className="ckl-chal-proof-cta">View the Hall of Fame →</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
};

export default Challenge;
