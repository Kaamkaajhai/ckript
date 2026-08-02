import { useContext } from "react";
import { Link } from "react-router-dom";
import Diamond from "../../_shared/Diamond";
import { countdownFor } from "../../_shared/useChallenge";
import CountdownTimer from "../../../../components/competition/CountdownTimer";
import { AuthContext } from "../../../../context/AuthContext";
import { useAuthModal } from "../../../../context/AuthModalContext";
import "./ChallengeStrip.css";

/**
 * The deadline band, directly under the hero.
 *
 * Renders ONLY while a writer can still act — registration open, or the writing window running.
 * Every other day of the year it returns null and occupies nothing. That restraint is the whole
 * point: a banner that is always there is a banner nobody sees, and it would spend the urgency of
 * the one week a year this actually matters.
 *
 * Visually it follows Marquee, the page's existing full-bleed band — same ink ground, same hairline
 * top and bottom, no inner container. A reader who has scrolled past the hero meets a dark bar; it
 * reads as a newsflash rather than as another section.
 */

const ChallengeStrip = ({ phase, competition, serverNow }) => {
  // The two phases where a visitor can do something about it.
  if (!competition || (phase !== "registration_open" && phase !== "live")) return null;

  const { at, label } = countdownFor(phase, competition.dates);
  if (!at) return null;

  const registering = phase === "registration_open";
  const to = registering
    ? `/challenge/register?c=${competition.slug}`
    : `/challenge/c/${competition.slug}`;

  const { user } = useContext(AuthContext) || {};
  const { openAuthModal } = useAuthModal();

  const handleActionClick = (e) => {
    if (registering && !user) {
      e.preventDefault();
      openAuthModal({ redirect: to });
    }
  };

  return (
    <section className="ckl-cstrip" aria-label="Competition deadline">
      <div className="ckl-cstrip-inner">
        <span className="ckl-cstrip-name">{competition.name}</span>
        <Diamond size={9} style={{ margin: "0 4px" }} />

        <span className="ckl-cstrip-label">{label}</span>
        {/* aria-live is off by default on this element and must stay that way: a region that
            re-announces every second is unusable with a screen reader. The static deadline below
            carries the same information once. */}
        <span className="ckl-cstrip-clock">
          <CountdownTimer target={at} serverNow={serverNow} size="sm" />
        </span>

        <Link to={to} className="ckl-cstrip-btn" onClick={handleActionClick}>
          {registering ? "Register" : "See the theme"}
        </Link>
      </div>

      <p className="ckl-cstrip-sr">
        {`${label} ${new Date(at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}.`}
      </p>
    </section>
  );
};

export default ChallengeStrip;
