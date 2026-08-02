import { useContext, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import CountdownTimer from "../../components/competition/CountdownTimer";
import useReveal from "./_shared/useReveal";
import useChallenge, { countdownFor } from "./_shared/useChallenge";
import LandingNav from "./_shared/LandingNav";
import Icon from "./_shared/Icon";
import Footer from "./sections/Footer/Footer";
import {
  KICKER, HERO_LINES, LEAD, WINNER_FACTS, ENTRY_CHIPS, CTA,
  DORMANT_STATUS, DORMANT_STATUS_SUB, PAGE_STRIP, STEPS, REWARDS, OWNERSHIP_NOTE,
  ENTRY_TERMS, QUESTIONS, resolveActions,
} from "./sections/Challenge/challenge.data";
import "./landing.css";
import "./challenges.css";

/**
 * /challenges — the Challenge as a prospectus.
 *
 * THE SPLIT, which everything here depends on:
 *
 *   /challenges  (this page)  .ckl register — persuade. What this is, what it costs, what you get,
 *                             what people ask. The marketing nav points here.
 *   /challenge   (the hub)    .ckc register — inform and manage. Full rules, judging criteria,
 *                             prizes, judges, sponsors, the dated timeline, the four-tab record.
 *
 * DORMANT IS THE DESIGN TARGET, not the fallback. Competitions run three or four times a year, and
 * `dormant` is additionally the first paint of every load because the hook resolves async. Every
 * section except the laureate is static copy and renders in full with no competition at all; the
 * phase changes the status band and two button labels, nothing else. No spinner, no skeleton and no
 * empty frame anywhere on this page, by design.
 *
 * The dark STATUS BAND carries the whole live state. Keeping it out of the masthead is what lets
 * the masthead be evergreen — and it doubles as the page's first ground change, two screens before
 * the reader would otherwise meet one.
 */

export default function ChallengesPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  const { phase, competition, winner, serverNow } = useChallenge();
  const { user } = useContext(AuthContext) || {};
  const { openAuthModal } = useAuthModal();

  // Same scrollbar scoping as Landing: present before first paint, gone when the page is.
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.add("ckl-scroll");
    return () => el.classList.remove("ckl-scroll");
  }, []);

  // ONE resolver for the band, the masthead and the closing ask, so the page cannot offer a
  // different primary action in three places.
  const { primary, secondary } = resolveActions(phase, competition);
  const { at: countdownAt, label: countdownLabel } = countdownFor(phase, competition?.dates);
  const isOpen = Boolean(competition);

  // Registering needs a WRITER account — the server refuses readers and investors — so a signed-out
  // visitor is sent to the auth modal rather than to a form that would reject them at the end.
  const guard = (action) => (event) => {
    if (action.needsAuth && !user) {
      event.preventDefault();
      openAuthModal({ redirect: action.to });
    }
  };

  // A plain function, NOT a component defined in the render body: a nested component gets a new
  // identity every render, so React would unmount and remount it each time.
  const renderAction = (action, className) => (
    <Link to={action.to} className={className} onClick={guard(action)}>
      {action.label}
    </Link>
  );

  return (
    <div className="ckl ckl-chalp-root" ref={rootRef}>
      <a href="#main" className="ckl-skip">Skip to content</a>
      <LandingNav active="challenges" />

      <main id="main" className="ckl-chalp">

        {/* ── Masthead ──────────────────────────────────────────────────────────────────────────
            Evergreen: nothing here changes with the phase, which is what keeps it true in the
            dormant state most visitors arrive in. */}
        <section className="ckl-chalp-mast" aria-labelledby="chalp-h1">
          <div className="ckl-chalp-in">
            <div className="ckl-kicker ckl-chalp-kicker" data-ra="ckl-fadeUp">{KICKER}</div>

            <h1 id="chalp-h1" className="ckl-chalp-h1" data-ra="ckl-fadeUp" data-rd="0.06">
              {HERO_LINES[0]}<br />
              <span className="ckl-chalp-h1-em">{HERO_LINES[1]}</span>
            </h1>

            <p className="ckl-chalp-lead" data-ra="ckl-fadeUp" data-rd="0.12">{LEAD}</p>

            {/* The motif: ten pages, one claimed. It carries "the same blank page, for everyone"
                structurally — decorative, so hidden from the reader that hears the caption. */}
            <div className="ckl-chalp-motif" data-ra="ckl-fadeUp" data-rd="0.18">
              <div className="ckl-chalp-pages" aria-hidden="true">
                {Array.from({ length: PAGE_STRIP.count }, (_, i) => (
                  <span
                    key={i}
                    className={`ckl-chalp-page${i === PAGE_STRIP.marked ? " is-marked" : ""}`}
                  />
                ))}
              </div>
              <div className="ckl-chalp-motif-rule" aria-hidden="true" />
              <div className="ckl-chalp-motif-cap">The same blank page, for everyone</div>
            </div>

            <div className="ckl-chalp-actions" data-ra="ckl-fadeUp" data-rd="0.24">
              {renderAction(primary, "ckl-chalp-btn")}
              {renderAction(secondary, "ckl-chalp-link")}
            </div>
          </div>
        </section>

        {/* ── Status band ───────────────────────────────────────────────────────────────────────
            Always mounted, both states the same height, so the swap when the API resolves cannot
            move the page. This is the one element that knows what phase it is. */}
        <div className="ckl-chalp-band" aria-label="Challenge status">
          <div className="ckl-chalp-band-in">
            {isOpen ? (
              <>
                <span className="ckl-chalp-band-dot" aria-hidden="true" />
                <span className="ckl-chalp-band-n">{competition.name}</span>
                <span className="ckl-chalp-band-sep" aria-hidden="true">·</span>
                <span className="ckl-chalp-band-l">{countdownLabel}</span>
                {countdownAt ? (
                  <span className="ckl-chalp-band-clock">
                    <CountdownTimer target={countdownAt} serverNow={serverNow} size="sm" />
                  </span>
                ) : null}
                {/* Stated once as an absolute date. The clock re-renders every second, so it must
                    never be a live region — it would be announced continuously. */}
                {countdownAt ? (
                  <span className="ckl-sr-only">
                    {countdownLabel} {new Date(countdownAt).toLocaleString()}
                  </span>
                ) : null}
                {renderAction(primary, "ckl-chalp-band-btn")}
              </>
            ) : (
              <>
                <span className="ckl-chalp-band-n">{DORMANT_STATUS}</span>
                <span className="ckl-chalp-band-l">{DORMANT_STATUS_SUB}</span>
                <Link to="/challenge" className="ckl-chalp-band-link">Past challenges</Link>
              </>
            )}
          </div>
        </div>

        {/* ── How it works ──────────────────────────────────────────────────────────────────────*/}
        <section className="ckl-chalp-sec ckl-chalp-sec--alt" aria-labelledby="chalp-how">
          <div className="ckl-chalp-in">
            <div className="ckl-kicker ckl-chalp-kicker" data-ra="ckl-fadeUp">How it works</div>
            <h2 id="chalp-how" className="ckl-chalp-h2" data-ra="ckl-fadeUp" data-rd="0.06">
              From register <span className="ckl-chalp-h2-em">to results.</span>
            </h2>

            <ol className="ckl-chalp-steps" data-ra="ckl-fadeUp" data-rd="0.12">
              {STEPS.map((s) => (
                <li key={s.label} className="ckl-chalp-step">
                  <span className="ckl-chalp-step-mark" aria-hidden="true" />
                  <span className="ckl-chalp-step-l">{s.label}</span>
                  <span className="ckl-chalp-step-s">{s.sub}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── What you receive ──────────────────────────────────────────────────────────────────*/}
        <section className="ckl-chalp-sec" aria-labelledby="chalp-gets">
          <div className="ckl-chalp-in">
            <div className="ckl-kicker ckl-chalp-kicker" data-ra="ckl-fadeUp">What you receive</div>
            <h2 id="chalp-gets" className="ckl-chalp-h2" data-ra="ckl-fadeUp" data-rd="0.06">
              Every entry, <span className="ckl-chalp-h2-em">not only the winners.</span>
            </h2>

            <div className="ckl-chalp-rewards">
              {REWARDS.map((r, i) => (
                <div key={r.title} className="ckl-chalp-reward" data-ra="ckl-fadeUp" data-rd={(i * 0.06).toFixed(2)}>
                  {/* Material Symbols are ligatures, so the glyph's NAME is its text content —
                      unhidden, a screen reader announces "trophy". The title carries the meaning. */}
                  <span aria-hidden="true" className="ckl-chalp-reward-i">
                    <Icon name={r.icon} size={26} />
                  </span>
                  <h3 className="ckl-chalp-reward-t">{r.title}</h3>
                  <p className="ckl-chalp-reward-b">{r.body}</p>
                </div>
              ))}
            </div>

            <p className="ckl-chalp-note" data-ra="ckl-fadeUp" data-rd="0.24">
              {OWNERSHIP_NOTE}{" "}
              <Link to="/terms-of-service">Read the terms</Link>
            </p>
          </div>
        </section>

        {/* ── Terms of entry ────────────────────────────────────────────────────────────────────*/}
        <section className="ckl-chalp-sec ckl-chalp-sec--alt" aria-labelledby="chalp-terms">
          <div className="ckl-chalp-in ckl-chalp-terms">
            <div className="ckl-kicker ckl-chalp-kicker" data-ra="ckl-fadeUp">Terms of entry</div>
            <h2 id="chalp-terms" className="ckl-chalp-h2" data-ra="ckl-fadeUp" data-rd="0.06">
              The same <span className="ckl-chalp-h2-em">for everyone.</span>
            </h2>

            <dl className="ckl-chalp-dl" data-ra="ckl-fadeUp" data-rd="0.12">
              {ENTRY_TERMS.map((row) => (
                <div key={row.term}>
                  <dt className="ckl-chalp-dt">{row.term}</dt>
                  <dd className="ckl-chalp-dd">{row.detail}</dd>
                </div>
              ))}
            </dl>

            {/* Set as a run of type, not as pills: six bordered 44px capsules that do nothing carry
                the exact signature of a filter control. */}
            <p className="ckl-chalp-run" data-ra="ckl-fadeUp" data-rd="0.18">
              <span className="ckl-chalp-run-lead">Examples, not requirements</span>
              {ENTRY_CHIPS.map((chip, i) => (
                <span key={chip}>
                  {i > 0 ? <span className="ckl-chalp-run-sep" aria-hidden="true">·</span> : null}
                  {chip}
                </span>
              ))}
            </p>

            {/* Where the page hands off. Eligibility, judging criteria, prizes, judges, sponsors and
                the dated timeline are the hub's job and are deliberately not restated here. */}
            <Link to="/challenge" className="ckl-chalp-more" data-ra="ckl-fadeUp" data-rd="0.24">
              Full rules on the challenge hub
              <span aria-hidden="true"><Icon name="arrow_forward" size={17} /></span>
            </Link>
          </div>
        </section>

        {/* ── The record ────────────────────────────────────────────────────────────────────────
            Only with a real laureate. `/completed` is permanent once any competition has declared,
            so this survives into dormant — which is exactly its value. No placeholder person and no
            reserved space: an invented laureate is worse than none. */}
        {winner ? (
          <section className="ckl-chalp-sec" aria-labelledby="chalp-record">
            <div className="ckl-chalp-in">
              <div className="ckl-kicker ckl-chalp-kicker" data-ra="ckl-fadeUp">The record</div>

              <div className="ckl-chalp-laureate" data-ra="ckl-fadeUp" data-rd="0.08">
                <div className="ckl-chalp-laureate-main">
                  <p className="ckl-chalp-laureate-meta">
                    <span id="chalp-record">
                      {winner.competitionName}{winner.year ? ` · ${winner.year}` : ""}
                    </span>
                  </p>
                  <p className="ckl-chalp-laureate-award">Winner</p>
                  {/* Stays a <p>: Baskervville ships no bold face, so an <h3> here would render a
                      browser-synthesised faux-bold. And no quote, ever — the only prose the API
                      holds for a winner is machine-written, and attributing it would be a lie. */}
                  <p className="ckl-chalp-laureate-name">{winner.name}</p>
                  {winner.scriptTitle ? (
                    <p className="ckl-chalp-laureate-script">{winner.scriptTitle}</p>
                  ) : null}
                </div>

                <div className="ckl-chalp-laureate-side">
                  {WINNER_FACTS.map((f) => (
                    <div key={f.label} className="ckl-chalp-fact">
                      <span className="ckl-chalp-fact-l">{f.label}</span>
                      <span className="ckl-chalp-fact-v">{f.value}</span>
                    </div>
                  ))}
                  <Link to="/hall-of-fame" className="ckl-chalp-laureate-link">
                    View Hall of Fame
                    <span aria-hidden="true"><Icon name="arrow_forward" size={17} /></span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Questions ─────────────────────────────────────────────────────────────────────────
            Static and evergreen on purpose — NOT the hub's admin-authored per-competition faq[],
            which is empty in exactly the state most visitors arrive in. */}
        <section className="ckl-chalp-sec ckl-chalp-sec--alt" aria-labelledby="chalp-q">
          <div className="ckl-chalp-in">
            <h2 id="chalp-q" className="ckl-chalp-h2 ckl-chalp-h2--flush" data-ra="ckl-fadeUp">
              Four things <span className="ckl-chalp-h2-em">people ask.</span>
            </h2>

            <div className="ckl-chalp-qa">
              {QUESTIONS.map((item, i) => (
                <div key={item.q} data-ra="ckl-fadeUp" data-rd={(i * 0.06).toFixed(2)}>
                  <h3 className="ckl-chalp-qa-q">{item.q}</h3>
                  <p className="ckl-chalp-qa-a">{item.a}</p>
                  {item.link ? (
                    <Link to={item.link.to} className="ckl-chalp-qa-link">{item.link.label}</Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The ask ───────────────────────────────────────────────────────────────────────────*/}
        <section className="ckl-chalp-cta" aria-labelledby="chalp-cta">
          <span className="ckl-chalp-cta-line" aria-hidden="true" />
          <span className="ckl-chalp-cta-diamond" aria-hidden="true" />
          <h2 id="chalp-cta" className="ckl-chalp-cta-h2" data-ra="ckl-fadeUp">
            Think you have <span className="ckl-chalp-cta-em">a story?</span>
          </h2>
          <p className="ckl-chalp-cta-lead" data-ra="ckl-fadeUp" data-rd="0.06">
            {isOpen
              ? "Registration is open. The theme stays sealed until the clock starts."
              : CTA.line}
          </p>
          <div className="ckl-chalp-actions ckl-chalp-actions--center" data-ra="ckl-fadeUp" data-rd="0.12">
            {renderAction(primary, "ckl-chalp-btn")}
            {renderAction(secondary, "ckl-chalp-link")}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
