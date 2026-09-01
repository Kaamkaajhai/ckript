import { useCallback, useContext, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import CountdownTimer from "../../components/competition/CountdownTimer";
import { COMPANY, COPYRIGHT_LINE } from "../../constants/company";
import { FEATURES } from "../../pages/landing/sections/Features/features.data";
import { FORMATS } from "../../pages/landing/sections/Formats/formats.data";
import { PROBLEM_CARDS } from "../../pages/landing/sections/Problem/problem.data";
import { PARTNERS, PARTNER_KEYS } from "../../pages/landing/sections/Partners/partners.data";
import { FOOTER_COLS } from "../../pages/landing/sections/Footer/footer.data";
import { LOGO_SRC, LOGO_FOOTER_SRC, ROUTES, TRAILER_VIDEO_SRC } from "../../pages/landing/_shared/theme";
import useChallenge, { countdownFor } from "../../pages/landing/_shared/useChallenge";
import Button from "../components/buttons/Button";
import IconButton from "../components/buttons/IconButton";
import Dialog from "../components/overlays/Dialog";
import SegmentedControl from "../components/tabs/SegmentedControl";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import {
  landingAccountPath,
  landingActionLabels,
  landingDiscoveryPath,
  landingWriterPath,
} from "./landingModel";
import "./LandingMobile.css";

const STEPS = [
  { number: "01", title: "Discover a script", body: "Explore original stories across every genre." },
  { number: "02", title: "Watch the trailer", body: "Feel the tone through a focused visual pitch." },
  { number: "03", title: "Own the story", body: "Secure the rights and take the next step toward screen." },
];

const MARQUEE_PHRASES = [
  "Now casting untold stories",
  "From the page to the screen",
  "Every great film began as a script",
  "Your story deserves an audience",
];

function ContextAction({ user, kind, children, ...props }) {
  const { openProducerOnboarding, openWriterOnboarding } = useAuthModal();
  const to = kind === "writer" ? landingWriterPath(user) : landingDiscoveryPath(user);
  const open = kind === "writer" ? openWriterOnboarding : openProducerOnboarding;

  return user
    ? <Button to={to} {...props}>{children}</Button>
    : <Button onClick={open} {...props}>{children}</Button>;
}

function ChallengeDeadline({ challenge, user }) {
  const { openAuthModal } = useAuthModal();
  const { phase, competition, serverNow } = challenge;
  if (!competition || (phase !== "registration_open" && phase !== "live")) return null;

  const { at, label } = countdownFor(phase, competition.dates);
  if (!at) return null;

  const registering = phase === "registration_open";
  const to = registering
    ? `/challenge/register?c=${encodeURIComponent(competition.slug)}`
    : `/challenge/c/${encodeURIComponent(competition.slug)}`;

  return (
    <section className="ckm-landing__challenge" aria-labelledby="landing-challenge-title">
      <p className="ckm-landing__eyebrow">Live challenge</p>
      <h2 id="landing-challenge-title">{competition.name}</h2>
      <p className="ckm-landing__challenge-label">{label}</p>
      <div className="ckm-landing__challenge-clock" aria-hidden="true">
        <CountdownTimer target={at} serverNow={serverNow} size="sm" />
      </div>
      <p className="ckm-sr-only">
        {`${label} ${new Date(at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}.`}
      </p>
      {registering && !user ? (
        <Button onClick={() => openAuthModal({ redirect: to })}>Register</Button>
      ) : (
        <Button to={to}>{registering ? "Register" : "See the theme"}</Button>
      )}
    </section>
  );
}

export default function LandingMobile({ user: userProp = undefined }) {
  const auth = useContext(AuthContext);
  const user = userProp === undefined ? auth?.user : userProp;
  const challenge = useChallenge();
  const {
    openAuthModal,
    openAboutModal,
    openPricingModal,
    openProducerOnboarding,
    openWriterOnboarding,
  } = useAuthModal();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activePartner, setActivePartner] = useState(null);
  const videoRef = useRef(null);

  const labels = landingActionLabels(user);
  const accountPath = landingAccountPath(user);
  const partner = activePartner ? PARTNERS[activePartner] : null;

  const closeTrailer = useCallback(() => {
    const video = videoRef.current;
    video?.pause?.();
    if (video) video.currentTime = 0;
    setTrailerOpen(false);
  }, []);

  const closeMenuThen = (action) => () => {
    setMenuOpen(false);
    window.setTimeout(action, 300);
  };

  const runFooterAction = (action) => {
    if (action === "pricing") openPricingModal();
    else if (action === "about") openAboutModal();
    else if (action === "writer" && !user) openWriterOnboarding();
    else if (!user) openProducerOnboarding();
  };

  const appBar = (
    <header className="ckm-landing__bar">
      <Link className="ckm-landing__brand" to="/" aria-label="Ckript home">
        <img src={LOGO_SRC} alt="Ckript" width="3600" height="1028" />
      </Link>
      <div className="ckm-landing__bar-actions">
        {user ? (
          <Button to={accountPath} size="sm" variant="tertiary">{labels.account}</Button>
        ) : (
          <Button size="sm" variant="tertiary" onClick={() => openPricingModal()}>{labels.account}</Button>
        )}
        <IconButton icon="menu" label="Open menu" size="sm" onClick={() => setMenuOpen(true)} />
      </div>
    </header>
  );

  const overlays = (
    <>
      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Explore Ckript" bodyClassName="ckm-landing__menu">
        <nav aria-label="Marketing menu" className="ckm-landing__menu-links">
          {user ? (
            <Link to={landingWriterPath(user)} onClick={() => setMenuOpen(false)}>Scripts</Link>
          ) : (
            <button type="button" onClick={closeMenuThen(openWriterOnboarding)}>Scripts</button>
          )}
          <Link to={ROUTES.challenges} onClick={() => setMenuOpen(false)}>Challenge</Link>
          {user ? (
            <Link to={landingDiscoveryPath(user)} onClick={() => setMenuOpen(false)}>For producers</Link>
          ) : (
            <button type="button" onClick={closeMenuThen(openProducerOnboarding)}>For producers</button>
          )}
          <button type="button" onClick={closeMenuThen(() => openPricingModal())}>Pricing</button>
          <Link to={ROUTES.contact} onClick={() => setMenuOpen(false)}>Contact</Link>
          {user ? (
            <Link className="ckm-landing__menu-account" to={accountPath} onClick={() => setMenuOpen(false)}>{labels.account}</Link>
          ) : (
            <button className="ckm-landing__menu-account" type="button" onClick={closeMenuThen(() => openPricingModal())}>{labels.account}</button>
          )}
        </nav>
      </Dialog>

      <Dialog open={trailerOpen} onClose={closeTrailer} title="Ckript sample trailer" bodyClassName="ckm-landing__trailer-dialog">
        <video
          ref={videoRef}
          src={TRAILER_VIDEO_SRC}
          controls
          autoPlay
          playsInline
          controlsList="nodownload"
          preload="metadata"
          aria-label="Ckript sample trailer"
        />
        <p>A short example of how a screenplay can become a visual pitch.</p>
      </Dialog>

      <Dialog
        open={Boolean(partner)}
        onClose={() => setActivePartner(null)}
        title={partner?.name || "Production partner"}
        description="Ckript partnership"
        bodyClassName="ckm-landing__partner-dialog"
      >
        {partner ? (
          <>
            <SegmentedControl
              label="Production partner"
              name="landing-partner"
              value={activePartner}
              onChange={setActivePartner}
              options={PARTNER_KEYS.map((key) => ({ value: key, label: PARTNERS[key].name }))}
            />
            <div className="ckm-landing__partner-plate">
              <img src={partner.logo} alt={partner.name} width="400" height="180" />
            </div>
            <p className="ckm-landing__eyebrow">{partner.tag}</p>
            <p>{partner.desc}</p>
            <blockquote>{partner.pull}</blockquote>
            <Button href={partner.href} target="_blank" rel="noopener noreferrer" trailingIcon="open_in_new">
              Visit {partner.site}
            </Button>
          </>
        ) : null}
      </Dialog>
    </>
  );

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.PUBLIC}
      screenId="landing"
      className="ckm-landing"
      appBar={appBar}
      overlays={overlays}
    >
      <article className="ckm-landing__page">
        <section className="ckm-landing__hero" aria-labelledby="landing-title">
          <img
            className="ckm-landing__hero-art"
            src="/landing/ai/trailer-cinema.webp"
            alt=""
            width="1920"
            height="1100"
            fetchPriority="high"
          />
          <div className="ckm-landing__hero-shade" />
          <div className="ckm-landing__hero-copy">
            <p className="ckm-landing__eyebrow">Page to screen</p>
            <h1 id="landing-title">The journey from page to screen<span aria-hidden="true">.</span></h1>
            <p>Ckript brings powerful writing tools and a modern marketplace together, helping writers create exceptional scripts and producers discover the next great story.</p>
            <div className="ckm-landing__actions">
              {user ? (
                <Button to={accountPath} fullWidth>{labels.account}</Button>
              ) : (
                <ContextAction user={user} kind="discovery" fullWidth>{labels.discovery}</ContextAction>
              )}
              <Button variant="secondary" fullWidth onClick={() => openAboutModal()}>Meet the platform</Button>
            </div>
          </div>
        </section>

        <ChallengeDeadline challenge={challenge} user={user} />

        <section className="ckm-landing__section ckm-landing__journey" aria-labelledby="landing-journey-title">
          <p className="ckm-landing__eyebrow">How it works</p>
          <h2 id="landing-journey-title">Find it. Watch it. Own it.</h2>
          <ol className="ckm-landing__steps">
            {STEPS.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
              </li>
            ))}
          </ol>
          <ContextAction user={user} kind="discovery" variant="secondary" fullWidth>{labels.discovery}</ContextAction>
        </section>

        <section className="ckm-landing__marquee" aria-label="Ckript principles">
          <div>
            {[...MARQUEE_PHRASES, ...MARQUEE_PHRASES].map((phrase, index) => (
              <span key={`${phrase}-${index}`} aria-hidden={index >= MARQUEE_PHRASES.length || undefined}>{phrase}<i aria-hidden="true" /></span>
            ))}
          </div>
        </section>

        <section className="ckm-landing__section ckm-landing__features" aria-labelledby="landing-features-title">
          <p className="ckm-landing__eyebrow">What you get</p>
          <h2 id="landing-features-title">Built for writers. <em>Loved by producers.</em></h2>
          <p className="ckm-landing__lead">Seven tools that turn your script from a file into a film people want to make.</p>
          <div className="ckm-landing__accordion">
            {FEATURES.map((feature, index) => {
              const expanded = activeFeature === index;
              const panelId = `landing-feature-panel-${index}`;
              const buttonId = `landing-feature-button-${index}`;
              return (
                <div className="ckm-landing__feature" key={feature.num}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setActiveFeature(index)}
                    >
                      <span>{feature.num}</span>{feature.tab}<i aria-hidden="true">{expanded ? "−" : "+"}</i>
                    </button>
                  </h3>
                  {expanded ? (
                    <div id={panelId} role="region" aria-labelledby={buttonId} className="ckm-landing__feature-panel">
                      <img src={feature.image} alt="" width="1200" height="800" loading="lazy" decoding="async" />
                      <p className="ckm-landing__feature-tag">{feature.tag}</p>
                      <h4>{feature.title}</h4>
                      <p className="ckm-landing__feature-italic">{feature.italic}</p>
                      <p>{feature.desc}</p>
                      <ul>{feature.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="ckm-landing__section ckm-landing__formats" aria-labelledby="landing-formats-title">
          <p className="ckm-landing__eyebrow">Built for every story</p>
          <h2 id="landing-formats-title">One platform. <em>Every format.</em></h2>
          <p className="ckm-landing__lead">From features to anime, showcase work across every screen and every genre.</p>
          <div className="ckm-landing__format-rail">
            {FORMATS.map((format) => (
              <figure key={format.title}>
                <img src={format.image} alt={format.alt} width="750" height="1100" loading="lazy" decoding="async" />
                <figcaption><strong>{format.title}</strong><span>{format.sub}</span></figcaption>
              </figure>
            ))}
          </div>
          <ContextAction user={user} kind="writer" fullWidth>{labels.writer}</ContextAction>
        </section>

        <section className="ckm-landing__trailer" aria-labelledby="landing-trailer-title">
          <img src="/landing/ai/trailer-cinema.webp" alt="" width="1920" height="1100" loading="lazy" decoding="async" />
          <div className="ckm-landing__trailer-copy">
            <p className="ckm-landing__eyebrow">Text-to-trailer AI</p>
            <h2 id="landing-trailer-title">Your script, rendered in 30 seconds.</h2>
            <p>Blend stock footage with AI-generated visuals into a cinematic teaser that lets someone feel the story.</p>
            <Button icon="play_arrow" onClick={() => setTrailerOpen(true)}>Watch a sample trailer</Button>
          </div>
        </section>

        <section className="ckm-landing__section ckm-landing__problem" aria-labelledby="landing-problem-title">
          <p className="ckm-landing__eyebrow">The problem</p>
          <h2 id="landing-problem-title">The industry is broken on both sides of the page.</h2>
          <div className="ckm-landing__problem-grid">
            {PROBLEM_CARDS.map((card) => (
              <article key={card.kind}>
                <p className="ckm-landing__eyebrow">{card.kicker}</p>
                <h3>{card.title.join(" ")}</h3>
                <ul>{card.rows.map((row) => <li key={row}>{row}</li>)}</ul>
                <ContextAction user={user} kind={card.kind} variant="secondary" fullWidth>
                  {user ? (card.kind === "writer" ? labels.writer : labels.discovery) : card.cta}
                </ContextAction>
              </article>
            ))}
          </div>
        </section>

        <section className="ckm-landing__section ckm-landing__partners" aria-labelledby="landing-partners-title">
          <p className="ckm-landing__eyebrow">In partnership with</p>
          <h2 id="landing-partners-title">The company we keep.</h2>
          <p className="ckm-landing__lead">Industry partners helping exceptional stories reach the screen.</p>
          <div className="ckm-landing__partner-grid">
            {PARTNER_KEYS.map((key) => {
              const item = PARTNERS[key];
              return (
                <button type="button" key={key} onClick={() => setActivePartner(key)} aria-label={`Learn more about ${item.name}`}>
                  <span><img src={item.logo} alt={item.name} width="400" height="180" loading="lazy" decoding="async" /></span>
                  <strong>{item.name}</strong><small>{item.kicker}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ckm-landing__final" aria-labelledby="landing-final-title">
          <p className="ckm-landing__eyebrow">Your next scene</p>
          <h2 id="landing-final-title">Your story deserves an audience.</h2>
          <p>Shape the work, share the vision, and meet the people who can make it real.</p>
          <div className="ckm-landing__actions">
            <ContextAction user={user} kind="writer" fullWidth>{labels.writer}</ContextAction>
            <ContextAction user={user} kind="discovery" variant="secondary" fullWidth>{labels.discovery}</ContextAction>
          </div>
        </section>

        <footer className="ckm-landing__footer">
          <img src={LOGO_FOOTER_SRC} alt="Ckript" width="3600" height="1028" loading="lazy" decoding="async" />
          <p className="ckm-landing__footer-tagline">From the page to the screen.</p>
          <div className="ckm-landing__footer-cols">
            {FOOTER_COLS.map((column) => (
              <section key={column.head} aria-labelledby={`landing-footer-${column.head.toLowerCase()}`}>
                <h2 id={`landing-footer-${column.head.toLowerCase()}`}>{column.head}</h2>
                {column.links.map((link) => {
                  if (link.action) {
                    if (user && link.action === "writer") return <Link key={link.label} to={landingWriterPath(user)}>{link.label}</Link>;
                    if (user && link.action === "producer") return <Link key={link.label} to={landingDiscoveryPath(user)}>{link.label}</Link>;
                    return <button key={link.label} type="button" onClick={() => runFooterAction(link.action)}>{link.label}</button>;
                  }
                  return link.external
                    ? <a key={link.label} href={link.to} target="_blank" rel="noopener noreferrer">{link.label}</a>
                    : <Link key={link.label} to={link.to}>{link.label}</Link>;
                })}
              </section>
            ))}
          </div>
          <div className="ckm-landing__footer-bottom">
            <p>{COPYRIGHT_LINE}</p>
            <p>Made for storytellers.</p>
          </div>
          <div className="ckm-landing__legal">
            <p>{COMPANY.description}</p>
            <p className="ckm-landing__legal-head">CORPORATE INFORMATION</p>
            <p><strong>Legal Entity:</strong> {COMPANY.legalName}</p>
            <p><strong>CIN:</strong> {COMPANY.cin}</p>
            <p><strong>Registered Office:</strong> {COMPANY.registeredOffice}</p>
            <p><strong>Contact:</strong> <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
          </div>
        </footer>
      </article>
    </MobileShell>
  );
}
