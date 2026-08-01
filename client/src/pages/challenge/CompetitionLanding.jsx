import { useContext, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Trophy, Award, Sparkles, Mail, ExternalLink } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import useCompetition from "../../components/competition/useCompetition";
// Both /challenge/c/:slug and /hall-of-fame/:slug expose the same `slug` param, so this renders
// unchanged under either route.
import CompetitionRecord from "../hall-of-fame/HallOfFameDetail";
import CountdownTimer from "../../components/competition/CountdownTimer";
import PhaseTimeline from "../../components/competition/PhaseTimeline";
import ParticipantsGrid from "../../components/competition/ParticipantsGrid";
import { COMPANY } from "../../constants/company";
import externalUrl from "../../utils/externalUrl";
import "./challenge.css";
import { JUDGING_CRITERIA, ELIGIBILITY_EXAMPLES } from "./constants";

const Section = ({ id, title, children, subtitle }) => (
  <section id={id} className="scroll-mt-24 py-10">
    <h2 className="ckc-title ckc-h2">{title}</h2>
    {subtitle ? <p className="ckc-lede" style={{ marginTop: 8 }}>{subtitle}</p> : null}
    <div className="mt-6">{children}</div>
  </section>
);

const Card = ({ children, className = "" }) => (
  <div className={`ckc-card ckc-card-pad ${className}`}>
    {children}
  </div>
);

// Rank reads by WEIGHT, not by a different hue per prize — a gold/silver/coral trio turned the
// prize grid into a paint chart, and none of these is the thing that is live.
const PrizeCard = ({ icon: Icon, title, items = [], accent }) => (
  <Card>
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
      <h3 className="ckc-title ckc-h3">{title}</h3>
    </div>
    <ul className="mt-4 space-y-2">
      {items.length ? items.map((item, i) => (
        <li key={i} className="flex gap-2" style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ckc-body)" }}>
          <span style={{ color: "var(--ckc-muted)" }} aria-hidden="true">•</span>
          <span>{item}</span>
        </li>
      )) : <li style={{ fontSize: 14, color: "var(--ckc-muted)" }}>To be announced.</li>}
    </ul>
  </Card>
);

const FaqItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-4" style={{ borderBottom: "1px solid var(--ckc-rule)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span style={{ fontWeight: 500, color: "var(--ckc-ink)" }}>{item.q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--ckc-muted)" }}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <p className="mt-3 whitespace-pre-line" style={{ fontSize: 14, lineHeight: 1.65, color: "var(--ckc-body)" }}>
          {item.a}
        </p>
      ) : null}
    </div>
  );
};

// The top placing keeps the accent; the rest are quiet. Same rule the shared WinnerCard uses in the
// Hall of Fame, so a result reads the same wherever it appears. Keyed off the label the call sites
// already pass — "Winner" is the only fixed one.
const AWARD_ACCENT = { Winner: "var(--ckc-accent-text)" };

const WinnerCard = ({ label, person }) => {
  if (!person) return null;
  return (
    <Card>
      <p
        className="ckc-meta"
        style={{ color: AWARD_ACCENT[label] || "var(--ckc-muted)", paddingBottom: 12, borderBottom: "1px solid var(--ckc-rule)" }}
      >
        {label}
      </p>
      <p className="ckc-title" style={{ marginTop: 16, fontSize: "1.1875rem" }}>{person.name}</p>
      {person.scriptTitle ? (
        <p style={{ marginTop: 6, fontFamily: "var(--ckc-display)", fontStyle: "italic", fontSize: "1.0625rem", color: "var(--ckc-ink)" }}>
          {person.scriptTitle}
        </p>
      ) : null}
      {/* Only when it is not already the heading — otherwise the award name printed twice. */}
      {person.specialTitle && person.specialTitle !== label ? (
        <p className="ckc-meta" style={{ marginTop: 10 }}>{person.specialTitle}</p>
      ) : null}
      {person.logline ? (
        <>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "var(--ckc-muted)" }}>{person.logline}</p>
          {/* Same note the shared WinnerCard carries: a logline is either the writer's pitch or the
              AI's reading of their script, and the reader gets to tell which. */}
          {person.loglineByAi ? (
            <p className="ckc-meta" style={{ marginTop: 7 }}>AI-generated logline</p>
          ) : null}
        </>
      ) : null}
    </Card>
  );
};

// Hoisted so React keeps one component identity across renders — a component declared inside the
// page body would be a brand-new type every render and remount on every countdown tick.
const CtaButton = ({ cta, className = "" }) => (
  <button
    type="button"
    onClick={cta.onClick}
    disabled={cta.disabled}
    className={`ckc-btn ${className}`}
  >
    {cta.label}
  </button>
);

// The next date the page counts down to, per phase.
const countdownTargetFor = (phase, dates = {}) => {
  if (phase === "announced") return { target: dates.regOpensAt, label: "Registration opens in" };
  if (phase === "registration_open") return { target: dates.regClosesAt, label: "Registration closes in" };
  if (phase === "registration_closed") return { target: dates.startsAt, label: "Competition starts in" };
  if (phase === "live") return { target: dates.endsAt, label: "Time remaining" };
  return { target: null, label: "" };
};

const CompetitionLanding = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const { openAuthModal } = useAuthModal();
  const [activeTab, setActiveTab] = useState("brief");
  // /challenge/c/:slug names its competition; the hook falls back to "the active one" when it is
  // absent, which is how every pre-hub entry point still works.
  const { slug } = useParams();
  const { competition, entry, phase, timeline, results, serverNow, loading, error, refresh } = useCompetition({ slug });

  if (loading) {
    return (
      <div className="ckc" style={{ minHeight: "100vh" }}>
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <p className="ckc-meta">Loading the competition…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ckc" style={{ minHeight: "100vh" }}>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="text-center">
            <p className="ckc-lede" style={{ margin: "0 auto" }}>{error}</p>
          </Card>
        </div>
      </div>
    );
  }

  // A finished challenge is a RECORD, not a pitch. This page exists to convert a visitor into an
  // entrant — rules, eligibility, the deadline, a Register button — and none of that means anything
  // once the results are out. So a concluded competition shows its highlights instead: the theme,
  // who won, and the numbers. Same URL, because the hub links here and the challenge page should be
  // the destination rather than a signpost to another section.
  //
  // A HIDDEN competition is the exception, and handing it to the record was how it broke. Hidden
  // means "never discovered, reachable only by its direct link" — which is the one link its entrants
  // have — but the Hall of Fame endpoint the record loads from excludes hidden by design. So the
  // moment such a competition's results were declared, its own page 404'd and told the people who
  // had just written for it that it does not exist. Nothing needs fetching to avoid that: the
  // /active payload this page is already holding carries both the competition and its results, and
  // the Results section further down renders them.
  if (phase === "results" && competition?.visibility !== "hidden") {
    return <CompetitionRecord />;
  }

  if (!competition) {
    return (
      <div className="ckc" style={{ minHeight: "100vh" }}>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="text-center">
            <Trophy className="mx-auto h-10 w-10" style={{ color: "var(--ckc-faint)" }} aria-hidden="true" />
            <h1 className="ckc-title ckc-h2" style={{ marginTop: 18 }}>No challenge is open right now</h1>
            {/* This route is public and reachable from search and shared links, so the old
                "back to dashboard" pointed a logged-out visitor straight at an auth wall. Send
                everyone to the page that explains the thing instead. */}
            <p className="ckc-lede" style={{ margin: "10px auto 0" }}>
              The Challenge runs in windows, not continuously. How it works, what you receive and
              who can enter are all on the Challenge page.
            </p>
            <Link to="/challenge" className="ckc-btn" style={{ marginTop: 24 }}>
              Go to the Challenge
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const { target, label } = countdownTargetFor(phase, competition.dates);
  const oneLiner = String(competition.overview || "").split(/(?<=[.!?])\s/)[0] || "";

  // Register and the dashboard are single routes shared by every competition, so they only know
  // which one you came from if we tell them. A bare /challenge/register sends the visitor to
  // whatever competition is active — not necessarily the one whose page they are standing on.
  const here = competition.slug || slug || "";
  const registerPath = here ? `/challenge/register?c=${here}` : "/challenge/register";
  const dashboardPath = here ? `/challenge/dashboard?c=${here}` : "/challenge/dashboard";

  // The CTA is the same in the hero and the sticky bar, so registration state can never look
  // different in two places on one screen.
  const cta = (() => {
    if (entry) return { label: "Open Dashboard", onClick: () => navigate(dashboardPath), disabled: false };
    if (phase === "registration_open") {
      return {
        label: "Register Now",
        // route is a <Navigate to="/"> that drops its query string, so a ?next= link would strand
        // them on the homepage having forgotten why they came.
        onClick: () => {
          if (user) {
            navigate(registerPath);
          } else {
            openAuthModal({ redirect: registerPath });
          }
        },
        disabled: false,
      };
    }
    if (phase === "announced") return { label: "Registration opens soon", disabled: true };
    if (phase === "registration_closed") return { label: "Writing begins soon", disabled: true };
    // The one phase a newcomer cannot act on — registration is shut and judging has not started. A
    // disabled "Registration closed" made it a dead end during the single week the competition is
    // most visible. The theme is public the moment the gun fires, and it is the most interesting
    // thing on the site that week, so send them to it.
    if (phase === "live") {
      return {
        label: "See this year's theme",
        onClick: () => {
          // Smooth by default, instant for anyone who has asked for less motion — a long animated
          // jump is exactly what that preference exists to prevent.
          const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
          document.getElementById("theme")?.scrollIntoView({
            behavior: reduce ? "auto" : "smooth",
            block: "start",
          });
        },
        disabled: false,
      };
    }
    return { label: "Registration closed", disabled: true };
  })();

  const mailto = (subject) =>
    `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(`${subject} — ${competition.name}`)}`;

  return (
    <div className="ckc" style={{ minHeight: "100vh", paddingBottom: 96 }}>
      <div className="mx-auto max-w-5xl px-4">
        {/* Masthead — eyebrow, name, the one-line stake. The clock sits directly beneath it because
            a 48-hour challenge IS its countdown. */}
        <header className="py-12 sm:py-16">
          <div className="ckc-masthead">
            <p className="ckc-meta inline-flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Ckript Competition
              {/* The one thing on this page that earns the accent. */}
              {phase === "live" ? <span className="ckc-dot" aria-hidden="true" /> : null}
            </p>
            <h1 className="ckc-title ckc-h1">{competition.name}</h1>
            {oneLiner ? <p className="ckc-lede">{oneLiner}</p> : null}
          </div>

          {target ? (
            <div style={{ marginTop: 38 }}>
              <CountdownTimer target={target} serverNow={serverNow} label={label} onExpire={refresh} />
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <CtaButton cta={cta} />
            {entry ? (
              <span style={{ fontSize: 14, color: "var(--ckc-muted)" }}>
                You're registered — Event ID{" "}
                <span className="ckc-meta" style={{ color: "var(--ckc-ink)" }}>{entry.eventId}</span>
              </span>
            ) : null}
          </div>
        </header>

        <Section id="participants" title="Who else is writing">
          <ParticipantsGrid totalParticipants={competition.totalParticipants || 0} prizePool={competition.prizePool} />
        </Section>

        {/* Theme — only exists in the payload once the competition is live */}
        {competition.theme?.title ? (
          <Section id="theme" title="The Theme">
            <Card>
              {/* The reveal is the emotional payload of the whole event, so it is set like a title
                  page — display serif, italic, given room. Not a coloured label. */}
              <h3
                className="ckc-title"
                style={{ fontStyle: "italic", fontSize: "clamp(1.6rem, 3.6vw, 2.4rem)", lineHeight: 1.15 }}
              >
                {competition.theme.title}
              </h3>
              {competition.theme.brief ? (
                <p className="ckc-prose whitespace-pre-line" style={{ marginTop: 18 }}>{competition.theme.brief}</p>
              ) : null}
              {competition.theme.allowedGenres?.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {competition.theme.allowedGenres.map((g) => (
                    <span key={g} className="ckc-chip">{g}</span>
                  ))}
                </div>
              ) : null}
              {competition.theme.guidelines ? (
                <p
                  className="whitespace-pre-line"
                  style={{ marginTop: 20, maxWidth: "68ch", fontSize: 14, lineHeight: 1.65, color: "var(--ckc-muted)" }}
                >
                  {competition.theme.guidelines}
                </p>
              ) : null}
            </Card>
          </Section>
        ) : null}

        {/* Results */}
        {phase === "results" && results ? (
          <Section id="results" title="Results">
            <div className="grid gap-4 sm:grid-cols-2">
              <WinnerCard label="Winner" person={results.winner} />
              <WinnerCard label="Runner-Up" person={results.runnerUp} />
              {/* The award's own name is the heading. It used to sit under a hardcoded
                  "SPECIAL AWARD" eyebrow, so "Best Dialogue" read as a subtitle to a generic
                  label — and appeared twice on the one card that showed both. */}
              {(results.special || []).map((p, i) => (
                <WinnerCard key={i} label={p.specialTitle || "Special Award"} person={p} />
              ))}
            </div>
          </Section>
        ) : null}

        <Section id="about" title="About the challenge">
          <Card>
            {competition.overview ? (
              <p className="ckc-prose whitespace-pre-line">{competition.overview}</p>
            ) : null}
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="ckc-meta">Duration</dt>
                <dd className="mt-1.5" style={{ color: "var(--ckc-ink)" }}>48 hours</dd>
              </div>
              <div>
                <dt className="ckc-meta">Eligibility</dt>
                <dd className="mt-1.5" style={{ color: "var(--ckc-ink)" }}>{competition.eligibility || "Open to all writers"}</dd>
              </div>
              <div>
                <dt className="ckc-meta">Format</dt>
                <dd className="mt-1.5" style={{ color: "var(--ckc-ink)" }}>{competition.format || "Any format written in the Ckript editor"}</dd>
              </div>
            </dl>
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--ckc-rule)" }}>
              <p className="ckc-meta">Judged on</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {JUDGING_CRITERIA.map((c) => (
                  <span key={c} className="ckc-chip">{c}</span>
                ))}
              </div>
            </div>
          </Card>
        </Section>

        {/* People rule themselves out long before anyone rules them out. The sentence carries the
            rule; the chips are examples, never a gate — so nobody reads their own absence from the
            list as an answer. The competition's own eligibility text stays the source of truth. */}
        <Section id="eligibility" title="Who can enter">
          <Card>
            <p className="ckc-prose" style={{ fontSize: "1.0625rem", color: "var(--ckc-ink)" }}>
              Anyone who writes. Wherever you are, whatever you have written before.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ELIGIBILITY_EXAMPLES.map((tag) => (
                <span key={tag} className="ckc-chip">{tag}</span>
              ))}
            </div>
          </Card>
        </Section>

        <Section id="timeline" title="Timeline">
          <Card><PhaseTimeline steps={timeline} serverNow={serverNow} /></Card>
        </Section>

        <Section id="prizes" title="Prizes">
          <div className="grid gap-4 md:grid-cols-3">
            <PrizeCard icon={Trophy} title="Winner" items={competition.prizes?.winner} accent="var(--ckc-ink)" />
            <PrizeCard icon={Award} title="Runner-Up" items={competition.prizes?.runnerUp} accent="var(--ckc-muted)" />
            <PrizeCard
              icon={Sparkles}
              title="Special Awards"
              items={(competition.prizes?.special || []).map((s) => (s.description ? `${s.title} — ${s.description}` : s.title))}
              accent="var(--ckc-muted)"
            />
          </div>
        </Section>

        {competition.judges?.length ? (
          <Section id="judges" title="Judges">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {competition.judges.map((judge, i) => (
                <Card key={i}>
                  <div className="flex items-center gap-3">
                    {judge.photoUrl ? (
                      <img src={judge.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full" style={{ background: "var(--ckc-cream)" }} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontWeight: 500, color: "var(--ckc-ink)" }}>{judge.name}</p>
                      <p className="ckc-meta truncate" style={{ marginTop: 3 }}>{judge.title}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        ) : null}

        {competition.sponsors?.length ? (
          <Section id="sponsors" title="Sponsors">
            <div className="flex flex-wrap items-center gap-6">
              {competition.sponsors.map((sponsor, i) => {
                const href = externalUrl(sponsor.url);
                const mark = sponsor.logoUrl
                  ? <img src={sponsor.logoUrl} alt={sponsor.name} className="h-10 object-contain" />
                  : <span style={{ fontWeight: 500, color: "var(--ckc-ink)" }}>{sponsor.name}</span>;
                // A sponsor with no usable link is still a sponsor — show the mark, but not as a
                // focusable anchor that goes nowhere.
                return href ? (
                  <a key={i} href={href} target="_blank" rel="noreferrer noopener" className="opacity-80 transition hover:opacity-100">
                    {mark}
                  </a>
                ) : <span key={i} className="opacity-80">{mark}</span>;
              })}
            </div>
          </Section>
        ) : null}

        {/* Deliberately quiet. Sponsors and judges matter at this stage, but they are not who this
            page is for — two full cards spent a writer's scroll on someone else's ask. One line
            keeps the door open at a fraction of the cost. */}
        <Section id="partner" title="Partner with us">
          <p className="ckc-lede">
            Sponsor a challenge, join the judging panel, or bring your community.
          </p>
          <p style={{ marginTop: 12 }}>
            <a href={mailto("Partnership enquiry")} className="ckc-link inline-flex items-center gap-2">
              <Mail className="h-4 w-4" aria-hidden="true" /> Get in touch
            </a>
          </p>
        </Section>

        {competition.rules?.length ? (
          <Section id="rules" title="Rules">
            <Card>
              <ol className="ckc-prose list-decimal space-y-3 pl-5">
                {competition.rules.map((rule, i) => <li key={i}>{rule}</li>)}
              </ol>
            </Card>
          </Section>
        ) : null}

        {competition.faq?.length ? (
          <Section id="faq" title="FAQ">
            {/* Not ckc-card-pad: each row rules itself off, so the card only needs side padding. */}
            <div className="ckc-card" style={{ padding: "4px 24px" }}>
              {competition.faq.map((item, i) => <FaqItem key={i} item={item} />)}
            </div>
          </Section>
        ) : null}

        {competition.communityLinks?.length ? (
          <Section id="community" title="Community">
            <div className="flex flex-wrap gap-3">
              {competition.communityLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ckc-btn ckc-btn-quiet"
                >
                  {link.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      {/* Sticky CTA — the register decision follows the reader down the page */}
      <div
        className="fixed inset-x-0 bottom-0 p-3 backdrop-blur"
        style={{ borderTop: "1px solid var(--ckc-rule)", background: "color-mix(in srgb, var(--ckc-card) 94%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-1">
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 14, fontWeight: 500, color: "var(--ckc-ink)" }}>{competition.name}</p>
            {target ? (
              <p className="ckc-meta" style={{ marginTop: 3 }}>
                {label} <CountdownTimer target={target} serverNow={serverNow} size="sm" />
              </p>
            ) : null}
          </div>
          <CtaButton cta={cta} className="shrink-0" />
        </div>
      </div>

      </div>
    </div>
  );
};

export default CompetitionLanding;
