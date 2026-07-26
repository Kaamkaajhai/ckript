import { useContext, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Trophy, Award, Sparkles, Mail, ExternalLink } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import useCompetition from "../../components/competition/useCompetition";
import CountdownTimer from "../../components/competition/CountdownTimer";
import PhaseTimeline from "../../components/competition/PhaseTimeline";
import { COMPANY } from "../../constants/company";
import { JUDGING_CRITERIA } from "./constants";

const Section = ({ id, title, children, subtitle }) => (
  <section id={id} className="scroll-mt-24 py-10">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{title}</h2>
    {subtitle ? <p className="mt-2 text-gray-600 dark:text-gray-300">{subtitle}</p> : null}
    <div className="mt-6">{children}</div>
  </section>
);

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
    {children}
  </div>
);

const PrizeCard = ({ icon: Icon, title, items = [], accent }) => (
  <Card>
    <div className="flex items-center gap-2">
      <Icon className={`h-5 w-5 ${accent}`} aria-hidden="true" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    </div>
    <ul className="mt-4 space-y-2">
      {items.length ? items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="text-[#D14D37]">•</span>
          <span>{item}</span>
        </li>
      )) : <li className="text-sm text-gray-500 dark:text-gray-400">To be announced.</li>}
    </ul>
  </Card>
);

const FaqItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-4 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="font-medium text-gray-900 dark:text-white">{item.q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? <p className="mt-3 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{item.a}</p> : null}
    </div>
  );
};

const WinnerCard = ({ label, person }) => {
  if (!person) return null;
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#D14D37]">{label}</p>
      <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{person.name}</p>
      {person.scriptTitle ? <p className="text-sm text-gray-600 dark:text-gray-300">{person.scriptTitle}</p> : null}
      {/* Only when it is not already the heading — otherwise the award name printed twice. */}
      {person.specialTitle && person.specialTitle !== label ? (
        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">{person.specialTitle}</p>
      ) : null}
      {person.logline ? <p className="mt-3 text-sm italic text-gray-600 dark:text-gray-400">{person.logline}</p> : null}
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
    className={`rounded-lg px-6 py-3 font-semibold text-white transition ${
      cta.disabled ? "cursor-not-allowed bg-gray-400 dark:bg-gray-600" : "bg-[#D14D37] hover:bg-[#b8402d]"
    } ${className}`}
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
  // /challenge/c/:slug names its competition; the hook falls back to "the active one" when it is
  // absent, which is how every pre-hub entry point still works.
  const { slug } = useParams();
  const { competition, entry, phase, timeline, results, serverNow, loading, error, refresh } = useCompetition({ slug });

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400">Loading the competition…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Card className="text-center">
          <p className="text-gray-700 dark:text-gray-200">{error}</p>
        </Card>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Card className="text-center">
          <Trophy className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">No active competition</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            There is no challenge running right now — check back soon.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-lg bg-[#D14D37] px-5 py-2.5 font-medium text-white hover:bg-[#b8402d]">
            Back to dashboard
          </Link>
        </Card>
      </div>
    );
  }

  const { target, label } = countdownTargetFor(phase, competition.dates);
  const oneLiner = String(competition.overview || "").split(/(?<=[.!?])\s/)[0] || "";

  // The CTA is the same in the hero and the sticky bar, so registration state can never look
  // different in two places on one screen.
  const cta = (() => {
    if (entry) return { label: "Open Dashboard", onClick: () => navigate("/challenge/dashboard"), disabled: false };
    if (phase === "registration_open") {
      return {
        label: "Register Now",
        // A logged-out visitor gets the auth modal with a redirect, NOT a /signup URL: the /signup
        // route is a <Navigate to="/"> that drops its query string, so a ?next= link would strand
        // them on the homepage having forgotten why they came.
        onClick: () => (user
          ? navigate("/challenge/register")
          : openAuthModal({ redirect: "/challenge/register" })),
        disabled: false,
      };
    }
    if (phase === "announced") return { label: "Registration opens soon", disabled: true };
    return { label: "Registration closed", disabled: true };
  })();

  const mailto = (subject) =>
    `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(`${subject} — ${competition.name}`)}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <header className="py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D14D37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D14D37]">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Ckript Competition
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">{competition.name}</h1>
          {oneLiner ? <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">{oneLiner}</p> : null}

          {target ? (
            <div className="mt-8">
              <CountdownTimer target={target} serverNow={serverNow} label={label} onExpire={refresh} />
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CtaButton cta={cta} />
            {entry ? (
              <span className="text-sm text-gray-600 dark:text-gray-300">
                You're registered — Event ID <span className="font-mono font-semibold">{entry.eventId}</span>
              </span>
            ) : null}
          </div>
        </header>

        {/* Theme — only exists in the payload once the competition is live */}
        {competition.theme?.title ? (
          <Section id="theme" title="The Theme">
            <Card>
              <h3 className="text-xl font-bold text-[#D14D37]">{competition.theme.title}</h3>
              {competition.theme.brief ? (
                <p className="mt-3 whitespace-pre-line text-gray-700 dark:text-gray-200">{competition.theme.brief}</p>
              ) : null}
              {competition.theme.allowedGenres?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {competition.theme.allowedGenres.map((g) => (
                    <span key={g} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{g}</span>
                  ))}
                </div>
              ) : null}
              {competition.theme.guidelines ? (
                <p className="mt-4 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{competition.theme.guidelines}</p>
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
              <p className="whitespace-pre-line text-gray-700 dark:text-gray-200">{competition.overview}</p>
            ) : null}
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Duration</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">48 hours</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Eligibility</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{competition.eligibility || "Open to all writers"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Format</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{competition.format || "Any format written in the Ckript editor"}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Judged on</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {JUDGING_CRITERIA.map((c) => (
                  <span key={c} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{c}</span>
                ))}
              </div>
            </div>
          </Card>
        </Section>

        <Section id="timeline" title="Timeline">
          <Card><PhaseTimeline steps={timeline} serverNow={serverNow} /></Card>
        </Section>

        <Section id="prizes" title="Prizes">
          <div className="grid gap-4 md:grid-cols-3">
            <PrizeCard icon={Trophy} title="Winner" items={competition.prizes?.winner} accent="text-amber-500" />
            <PrizeCard icon={Award} title="Runner-Up" items={competition.prizes?.runnerUp} accent="text-slate-400" />
            <PrizeCard
              icon={Sparkles}
              title="Special Awards"
              items={(competition.prizes?.special || []).map((s) => (s.description ? `${s.title} — ${s.description}` : s.title))}
              accent="text-[#D14D37]"
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
                      <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{judge.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{judge.title}</p>
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
              {competition.sponsors.map((sponsor, i) => (
                <a key={i} href={sponsor.url || "#"} target="_blank" rel="noreferrer noopener" className="opacity-80 transition hover:opacity-100">
                  {sponsor.logoUrl
                    ? <img src={sponsor.logoUrl} alt={sponsor.name} className="h-10 object-contain" />
                    : <span className="font-medium text-gray-700 dark:text-gray-200">{sponsor.name}</span>}
                </a>
              ))}
            </div>
          </Section>
        ) : null}

        <Section id="partner" title="Partner with us">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Become a sponsor</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Put your brand in front of thousands of writers competing over one intense weekend.
              </p>
              <a href={mailto("Sponsorship enquiry")} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#D14D37] hover:underline">
                <Mail className="h-4 w-4" aria-hidden="true" /> {COMPANY.supportEmail}
              </a>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Partner with us</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Film schools, festivals and production companies — let's build the next challenge together.
              </p>
              <a href={mailto("Partnership enquiry")} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#D14D37] hover:underline">
                <Mail className="h-4 w-4" aria-hidden="true" /> {COMPANY.supportEmail}
              </a>
            </Card>
          </div>
        </Section>

        {competition.rules?.length ? (
          <Section id="rules" title="Rules">
            <Card>
              <ol className="list-decimal space-y-3 pl-5 text-gray-700 dark:text-gray-200">
                {competition.rules.map((rule, i) => <li key={i}>{rule}</li>)}
              </ol>
            </Card>
          </Section>
        ) : null}

        {competition.faq?.length ? (
          <Section id="faq" title="FAQ">
            <Card className="py-2">
              {competition.faq.map((item, i) => <FaqItem key={i} item={item} />)}
            </Card>
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
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#D14D37] hover:text-[#D14D37] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {link.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      {/* Sticky CTA — the register decision follows the reader down the page */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{competition.name}</p>
            {target ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {label} <CountdownTimer target={target} serverNow={serverNow} size="sm" />
              </p>
            ) : null}
          </div>
          <CtaButton cta={cta} className="shrink-0 px-5 py-2.5 text-sm" />
        </div>
      </div>
    </div>
  );
};

export default CompetitionLanding;
