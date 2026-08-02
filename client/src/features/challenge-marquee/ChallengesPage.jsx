/*
 * ChallengesPage — /challenges, the marquee.
 *
 * WHAT THIS PAGE IS
 * -----------------
 * The challenge told in the LANDING's voice: a live notice bar, one enormous
 * numeral, three cards, a laureate, the shape of the thing, and one ask.
 *
 * The division of labour it inherits is unchanged and load-bearing:
 *
 *   /challenges  (this page)  seduce. One idea per beat, nothing to read.
 *                             The marketing nav points here.
 *   /challenge   (the hub)    inform. Masthead, phase band, programme,
 *                             ownership, the four-tab record. This page's
 *                             CTAs point there.
 *
 * WHAT CHANGED
 * ------------
 * The page previously rendered a slim logo-and-one-link header of its own and
 * the five-beat `sections/Challenge` component. It now wears the real landing
 * navbar and footer through MarketingPageLayout, so a visitor arriving from the
 * homepage keeps the same chrome instead of losing the nav on arrival.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 * `useChallenge` — the same hook the homepage uses, so the two marketing
 * surfaces can never disagree about what is running. It is dormant-first and
 * failure-silent: competitions run three or four times a year, so the notice
 * bar and the laureate each render only when there is genuinely something
 * behind them, and the rest of the page stands on its own the rest of the time.
 *
 * Copy lives in challengeCopy.js, shared rather than retyped here.
 */
import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import MarketingPageLayout from "../../pages/landing/_shared/MarketingPageLayout";
import useChallenge, { countdownFor } from "../../pages/landing/_shared/useChallenge";
import CountdownTimer from "../../components/competition/CountdownTimer";
import {
  CARDS,
  CTA,
  ENTRY_CHIPS,
  FLOW,
  HERO_FIGURE,
  HERO_LINES,
  KICKER,
  LEAD,
  WINNER_FACTS,
} from "./challengeCopy";
import "./ChallengesPage.css";

/* The phase, said the way a reader would say it. */
const PHASE_LABEL = {
  announced: "Announced",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  live: "Writing under way",
  judging: "In judging",
  results: "Results are in",
};

/*
 * The red bar. Renders only while there is a competition AND a deadline to
 * count to — the dormant months show nothing at all rather than an empty band.
 */
const LiveNotice = ({ phase, competition, serverNow }) => {
  if (!competition) return null;
  const { at, label } = countdownFor(phase, competition.dates);
  const phaseLabel = PHASE_LABEL[phase];
  if (!phaseLabel) return null;

  return (
    <div className="cmq-notice">
      <span className="cmq-notice__phase">
        <span className="cmq-notice__dot" aria-hidden="true" />
        {phaseLabel}
      </span>
      <span className="cmq-notice__name">{competition.name}</span>

      {at && (
        <>
          <span className="cmq-notice__sep" aria-hidden="true" />
          {/* No aria-live: a region re-announcing every second is unusable with
              a screen reader. The static deadline below carries it once. */}
          <span className="cmq-notice__clock">
            {label} <CountdownTimer target={at} serverNow={serverNow} size="units" />
          </span>
        </>
      )}

      <Link to={`/challenge/c/${competition.slug}`} className="cmq-notice__link">
        View Details
      </Link>

      {at && (
        <p className="cmq-sr">
          {`${label} ${new Date(at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}.`}
        </p>
      )}
    </div>
  );
};

/*
 * The laureate. One past winner, as proof the thing concludes. Renders only
 * when a completed competition actually has one — a placeholder here would be
 * inventing a person.
 */
const Laureate = ({ winner }) => {
  if (!winner) return null;

  return (
    <section className="cmq-laureate">
      <p className="cmq-lau__meta">
        {[winner.competitionName, winner.year].filter(Boolean).join(" · ")}
      </p>
      <p className="cmq-lau__award">Winner</p>
      <p className="cmq-lau__name">{winner.name}</p>
      {winner.scriptTitle && <p className="cmq-lau__script">{winner.scriptTitle}</p>}

      <div className="cmq-lau__facts">
        {WINNER_FACTS.map((fact, i) => (
          <div key={fact.label} className="cmq-lau__fact-group">
            {i > 0 && <span className="cmq-lau__div" aria-hidden="true" />}
            <div>
              <div className="cmq-lau__fact-l">{fact.label}</div>
              <div className="cmq-lau__fact-v">{fact.value}</div>
            </div>
          </div>
        ))}
      </div>

      <Link to="/hall-of-fame" className="cmq-lau__link">
        View Hall of Fame
        <span className="cmq-msi" aria-hidden="true">arrow_forward</span>
      </Link>
    </section>
  );
};

export default function ChallengesPage() {
  const { phase, competition, winner, serverNow } = useChallenge();

  /* Scope the landing's page-scrollbar styling to this page's lifetime.
     useLayoutEffect runs before paint, so there is no flash of the app default. */
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.add("ckl-scroll");
    return () => el.classList.remove("ckl-scroll");
  }, []);

  return (
    <MarketingPageLayout className="cmq">
      {/* The red band sits at the top of the CONTENT, under the site nav — the
          design draws it first because it has no nav of its own. */}
      <LiveNotice phase={phase} competition={competition} serverNow={serverNow} />

      {/* 1 · The figure */}
      <section className="cmq-hero">
        <div className="cmq-kicker cmq-rise" style={{ animationDelay: ".05s" }}>{KICKER}</div>

        <div className="cmq-figure cmq-rise" style={{ animationDelay: ".12s" }} aria-hidden="true">
          {HERO_FIGURE.value}
        </div>
        <div className="cmq-figure-u cmq-rise" style={{ animationDelay: ".18s" }}>
          {HERO_FIGURE.unit}
        </div>

        <span className="cmq-rule" aria-hidden="true" />

        <h1 className="cmq-h1 cmq-rise" style={{ animationDelay: ".3s" }}>
          {HERO_LINES[0]}
          <br />
          <em>{HERO_LINES[1]}</em>
          <span className="cmq-h1__dot" aria-hidden="true" />
        </h1>

        <p className="cmq-lead cmq-rise" style={{ animationDelay: ".38s" }}>{LEAD}</p>

        <div className="cmq-hero__actions cmq-rise" style={{ animationDelay: ".46s" }}>
          <Link to="/challenge" className="cmq-btn">Explore Challenge</Link>
          <Link to="/hall-of-fame" className="cmq-btn-text">View Hall of Fame</Link>
        </div>
      </section>

      {/* 2 · Three cards */}
      <section className="cmq-cards">
        {CARDS.map((card) => (
          <div key={card.title} className="cmq-card">
            <span className="cmq-msi cmq-card__i" aria-hidden="true">{card.icon}</span>
            <h3 className="cmq-card__t">{card.title}</h3>
            <p className="cmq-card__b">{card.body}</p>
          </div>
        ))}
      </section>

      {/* 3 · One laureate */}
      <Laureate winner={winner} />

      {/* 4 · Who, and the shape of it */}
      <section className="cmq-anyone">
        <p className="cmq-anyone__h">Anyone can enter.</p>

        <div className="cmq-chips">
          {ENTRY_CHIPS.map((chip) => <span key={chip} className="cmq-chip">{chip}</span>)}
        </div>

        <ol className="cmq-flow">
          {FLOW.map((step, i) => (
            <li key={step} className="cmq-flow__i">
              <span className="cmq-flow__t">
                <span
                  className={`cmq-flow__sq${i === FLOW.length - 1 ? " cmq-flow__sq--end" : ""}`}
                  aria-hidden="true"
                />
                {step}
              </span>
              {i < FLOW.length - 1 && <span className="cmq-flow__r" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      {/* 5 · The ask */}
      <section className="cmq-cta">
        <h3 className="cmq-cta__h">{CTA.headline}</h3>
        <p className="cmq-cta__l">{CTA.line}</p>
        <Link to={CTA.to} className="cmq-btn">{CTA.label}</Link>
      </section>
    </MarketingPageLayout>
  );
}
