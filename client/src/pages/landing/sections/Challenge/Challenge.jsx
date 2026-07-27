import { Link } from "react-router-dom";
import COPY, { THE_PROMISE, STEPS, OPEN_TO } from "./challenge.data";
import "./Challenge.css";

/**
 * The challenge on the landing page.
 *
 * ONE section with internal structure, not five stacked ones. The competition is a flagship event,
 * but Ckript is the product — the moment this becomes a run of sub-sections the homepage starts
 * reading as a competition portal.
 *
 * Everything here is phase-aware and every proof element is conditional, because for roughly ten
 * months of the year there is no competition running and nothing to count. The dormant state is the
 * one this renders most often, so it is the one the copy is written for.
 */

// A number is only worth showing once it flatters. Below this, the promise does the work instead —
// and "every entry gets an AI evaluation" is true from the very first entrant.
const PROOF_THRESHOLD = 25;

const resolve = (value, competition) => (typeof value === "function" ? value(competition) : value);

const Challenge = ({ phase, competition, winner, pastEntrants }) => {
  const copy = COPY[phase] || COPY.dormant;
  const showCount = pastEntrants >= PROOF_THRESHOLD;

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
        </div>

        <div className="ckl-chal-body">
          {/* What you get. The universal promise first, the prizes second — reversing these speaks
              only to the minority who think they can win. */}
          <div className="ckl-chal-get" data-ra="ckl-fadeUp" data-rd="0.06">
            <p className="ckl-chal-promise">{THE_PROMISE}</p>
            <p className="ckl-chal-prizes">
              Winners take a cash prize, a Gold subscription, an AI trailer and a featured placement.
            </p>
          </div>

          {/* Three beats, not six. The landing answers "what happens"; the competition page answers
              "exactly what happens". */}
          <ol className="ckl-chal-steps" data-ra="ckl-fadeUp" data-rd="0.12">
            {STEPS.map((step) => (
              <li key={step.n} className="ckl-chal-step">
                <span className="ckl-chal-step-n">{step.n}</span>
                <span className="ckl-chal-step-label">{step.label}</span>
              </li>
            ))}
          </ol>

          <p className="ckl-chal-open" data-ra="ckl-fadeUp" data-rd="0.18">
            {OPEN_TO}
            {showCount ? ` ${pastEntrants.toLocaleString()} writers have entered so far.` : ""}
          </p>

          {/* One laureate, and only when one exists. An empty proof card, or a placeholder name,
              is worse than no proof at all. */}
          {winner ? (
            <Link
              to={`/hall-of-fame/${winner.slug}`}
              className="ckl-chal-winner hov-lift3"
              data-ra="ckl-fadeUp"
              data-rd="0.24"
            >
              <span className="ckl-chal-winner-eyebrow">Winner · {winner.year}</span>
              <span className="ckl-chal-winner-name">{winner.name}</span>
              <span className="ckl-chal-winner-meta">{winner.competitionName}</span>
              <span className="ckl-chal-winner-cta">View the Hall of Fame →</span>
            </Link>
          ) : null}
        </div>

        <div className="ckl-chal-cta" data-ra="ckl-fadeUp" data-rd="0.3">
          <Link to={resolve(copy.primary.to, competition)} className="ckl-chal-btn hov-btn-lift">
            {copy.primary.label}
          </Link>
          <Link to={resolve(copy.secondary.to, competition)} className="ckl-chal-link hov-underline">
            {copy.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Challenge;
