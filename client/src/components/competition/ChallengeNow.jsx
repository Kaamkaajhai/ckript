import { Link } from "react-router-dom";
import CountdownTimer from "./CountdownTimer";
import CompetitionCard from "./CompetitionCard";

/**
 * "What's on right now" — the one block on /challenge that changes.
 *
 * Phase used to live inside a card, inside a grid, inside a tab: an item in a list. It is the most
 * perishable and most interesting fact on the page, so it sits directly under the masthead instead,
 * and every one of its nine faces is rendered from here. That leaves the page with exactly one
 * moving part and everything else provably identical whether a challenge is running or not — which
 * is what makes the dormant state read as deliberate rather than as stripped.
 *
 * The band reads `judging` and `results` items out of the hub's PAST bucket on purpose.
 * competitionController.js:265-267 files both there ("judging looks live by the dates but the
 * deadline has passed and nothing can be entered"), so a band that only watched live+upcoming
 * would go quiet during judging — the exact week this page is most interesting. If listCompetitions
 * ever re-buckets, this silently falls back to dormant with no error.
 *
 * COLOUR DISCIPLINE: .ckc-live and .ckc-dot appear ONLY in registration_open and live. Every other
 * face — dormant included — is a plain card or a hairline row with no coral anywhere. challenge.css
 * reserves the accent for live state alone, and three visitors in four arrive when nothing is live,
 * so spending it on a dormant page would teach everyone that coral means nothing.
 *
 * Fetches nothing: every value arrives as a prop from the hub's existing state.
 */

// A hairline row rather than a card — used for the states where nothing is happening, so the visual
// step up to a bordered card genuinely means "a window is open".
const Row = ({ children }) => (
  <div style={{ borderTop: "1px solid var(--ckc-rule)", borderBottom: "1px solid var(--ckc-rule)", padding: "18px 0" }}>
    {children}
  </div>
);

const Name = ({ children }) => (
  <h2 className="ckc-title ckc-h2" style={{ marginTop: 8 }}>{children}</h2>
);

const Theme = ({ title }) => (title ? (
  <p style={{ marginTop: 10, fontFamily: "var(--ckc-display)", fontStyle: "italic", fontSize: "1.25rem", color: "var(--ckc-accent-text)" }}>
    {title}
  </p>
) : null);

const Body = ({ children }) => (
  <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.6, color: "var(--ckc-body)", maxWidth: "58ch" }}>{children}</p>
);

const Actions = ({ children }) => (
  <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 20 }}>{children}</div>
);

const ChallengeNow = ({
  item, latest, serverNow, entry, user, loading, error, openAuthModal, onSeeAll, openCount = 0,
}) => {
  // Same height as the dormant row, so nothing jumps and no false "nothing is open" flashes while
  // the two public requests are still in flight.
  if (loading) {
    return <Row><p className="ckc-meta">Checking what&rsquo;s on&hellip;</p></Row>;
  }

  if (error) {
    return <Row><p className="ckc-meta">Could not load what&rsquo;s on right now.</p></Row>;
  }

  // ── Nothing running ──────────────────────────────────────────────────────────────────────────
  // Names the state, then says WHY it is empty. "It runs in windows" is the missing fact that makes
  // an empty page read as designed rather than as broken.
  if (!item) {
    return (
      <Row>
        <p className="ckc-meta">Right now</p>
        <p style={{ marginTop: 8, fontSize: 17, color: "var(--ckc-body)", maxWidth: "56ch" }}>
          No challenge is open. The next one is announced here first, and registration opens before
          the theme is released.
        </p>

        {!user ? (
          <>
            <button
              type="button"
              className="ckc-btn"
              style={{ marginTop: 18 }}
              onClick={() => openAuthModal?.({ redirect: "/challenge" })}
            >
              Create a free account
            </button>
            {/* The reason travels with the ask — that is the difference between advice and a wall. */}
            <p className="ckc-meta" style={{ marginTop: 10, textTransform: "none", letterSpacing: 0 }}>
              Entries are made from a Ckript account. Having one now means you are not signing up
              while the clock is running.
            </p>
          </>
        ) : null}

        {latest ? (
          <>
            <p className="ckc-meta" style={{ marginTop: 28 }}>The last one</p>
            <div style={{ maxWidth: 420, marginTop: 12 }}>
              <CompetitionCard item={latest} variant="past" to={`/challenge/c/${latest.slug}`} />
            </div>
          </>
        ) : null}
      </Row>
    );
  }

  const slug = item.slug;
  const dates = item.dates || {};
  const phase = item.phase;

  // An entrant sees their own status first, in every phase.
  const entryChip = entry ? (
    <span className="ckc-chip" style={{ color: "var(--ckc-ink)" }}>
      You&rsquo;re in &middot; {entry.eventId}
    </span>
  ) : null;

  const dashboardCta = entry ? (
    <Link className="ckc-btn" to={`/challenge/dashboard?c=${slug}`}>Open your dashboard</Link>
  ) : null;

  const details = <Link className="ckc-btn ckc-btn-quiet" to={`/challenge/c/${slug}`}>Read the details</Link>;

  const seeAll = openCount > 1 ? (
    <button type="button" className="ckc-link" onClick={onSeeAll}>
      See all {openCount} open challenges
    </button>
  ) : null;

  const live = phase === "registration_open" || phase === "live";

  const face = () => {
    switch (phase) {
      case "announced":
        return {
          label: "Next challenge",
          countdown: { target: dates.regOpensAt, label: "Registration opens in" },
          body: "The theme stays sealed until the clock starts. Nobody sees it early.",
          // No disabled primary. A greyed-out "Registration opens soon" is a wall; one honest
          // secondary is not.
          actions: <>{dashboardCta}{details}</>,
        };

      case "registration_open":
        return {
          label: "Registration open",
          countdown: { target: dates.regClosesAt, label: "Registration closes in" },
          body: "Register once and the theme arrives on your screen the second the window opens.",
          actions: (
            <>
              {dashboardCta || (user ? (
                <Link className="ckc-btn" to={`/challenge/register?c=${slug}`}>Register</Link>
              ) : (
                // NEVER an href to /signup — that route is a <Navigate to="/"> and eats the query.
                <button
                  type="button"
                  className="ckc-btn"
                  onClick={() => openAuthModal?.({ redirect: `/challenge/register?c=${slug}` })}
                >
                  Register
                </button>
              ))}
              {details}
            </>
          ),
        };

      case "registration_closed":
        return {
          label: "Entries closed — writing begins soon",
          countdown: { target: dates.startsAt, label: "Theme released in" },
          actions: <>{dashboardCta}{details}</>,
        };

      case "live":
        return {
          label: "Writing under way",
          countdown: { target: dates.endsAt, label: "Deadline in" },
          theme: item.theme,
          actions: (
            <>
              {dashboardCta}
              <Link className="ckc-btn ckc-btn-quiet" to={`/challenge/c/${slug}`}>See this year&rsquo;s theme</Link>
            </>
          ),
          // Live is the one phase an interested newcomer cannot act on. Without this the page
          // rejects them at the moment they are most excited.
          footnote: "Registration for this one has closed. The next challenge is announced on this page.",
        };

      case "judging":
        return {
          label: "Judging",
          theme: item.theme,
          // No countdown: there is no meaningful next deadline to count to.
          body: "The forty-eight hours are over. Every entry is being read and evaluated — results "
            + "are posted here and recorded in the Hall of Fame.",
          actions: <>{dashboardCta}{details}</>,
        };

      case "results":
        return {
          label: "Results are in",
          theme: item.theme,
          actions: <Link className="ckc-btn" to={`/hall-of-fame/${slug}`}>See who won</Link>,
        };

      default:
        return { label: "Next challenge", actions: details };
    }
  };

  const f = face();

  return (
    <div className={`ckc-card ckc-card-pad${live ? " ckc-live" : ""}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        {live ? <span className="ckc-dot" aria-hidden="true" /> : null}
        <p className="ckc-meta">{f.label}</p>
        {entryChip}
      </div>

      <Name>{item.name}</Name>
      <Theme title={f.theme} />
      {f.body ? <Body>{f.body}</Body> : null}

      {f.countdown?.target ? (
        <div style={{ marginTop: 18 }}>
          <CountdownTimer target={f.countdown.target} serverNow={serverNow} size="lg" label={f.countdown.label} />
        </div>
      ) : null}

      <Actions>{f.actions}</Actions>

      {f.footnote ? (
        <p style={{ marginTop: 14, fontSize: 14, color: "var(--ckc-muted)" }}>{f.footnote}</p>
      ) : null}

      {seeAll ? <div style={{ marginTop: 16 }}>{seeAll}</div> : null}
    </div>
  );
};

export default ChallengeNow;
