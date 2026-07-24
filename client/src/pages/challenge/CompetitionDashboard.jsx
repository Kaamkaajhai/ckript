import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home, CalendarDays, Trophy, Users, BookOpen, PenLine,
  Lock, Copy, Check, CheckCircle2, AlertCircle, ExternalLink,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import useCompetition from "../../components/competition/useCompetition";
import CountdownTimer from "../../components/competition/CountdownTimer";
import PhaseTimeline from "../../components/competition/PhaseTimeline";
import CompetitionJourney from "../../components/competition/CompetitionJourney";
import ParticipantsGrid from "../../components/competition/ParticipantsGrid";
import ReferralDrive from "../../components/competition/ReferralDrive";
import {
  JUDGING_CRITERIA, WRITING_RESOURCES, STUDIO_LOCKED_MESSAGE, PARTICIPANT_COMPLETION_MESSAGE,
} from "./constants";

const SECTIONS = [
  { key: "home", label: "Home", icon: Home },
  { key: "event", label: "Event", icon: CalendarDays },
  { key: "prizes", label: "Prizes", icon: Trophy },
  { key: "community", label: "Community", icon: Users },
  { key: "resources", label: "Resources", icon: BookOpen },
  { key: "studio", label: "Script Studio", icon: PenLine },
];

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
    {children}
  </div>
);

const Pill = ({ tone = "neutral", children }) => {
  const tones = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    brand: "bg-[#D14D37]/10 text-[#D14D37]",
  };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
};

const ScoreBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
      <span>{label}</span><span className="font-semibold">{value}</span>
    </div>
    <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
      <div className="h-1.5 rounded-full bg-[#D14D37]" style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} />
    </div>
  </div>
);

const AIResults = ({ ai }) => {
  if (!ai?.processedAt && !ai?.logline) return null;
  const ev = ai.evaluation || null;
  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your AI story materials</h3>
      {ai.logline ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Logline</p>
          <p className="mt-1 italic text-gray-800 dark:text-gray-100">{ai.logline}</p>
        </div>
      ) : null}
      {ai.synopsis ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Synopsis</p>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-200">{ai.synopsis}</p>
        </div>
      ) : null}
      {ev ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Evaluation</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {["plot", "characters", "dialogue", "pacing", "marketability", "overall"].map((key) => (
              ev[key] !== undefined ? <ScoreBar key={key} label={key[0].toUpperCase() + key.slice(1)} value={ev[key]} /> : null
            ))}
          </div>
          {ev.feedback ? <p className="mt-4 text-sm text-gray-700 dark:text-gray-200">{ev.feedback}</p> : null}
        </div>
      ) : null}
    </Card>
  );
};

const CompetitionDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const { competition, entry, phase, timeline, results, referrals, referralCode, serverNow, loading, refresh } = useCompetition();
  const [section, setSection] = useState("home");
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!competition) navigate("/challenge", { replace: true });
    else if (!entry) navigate("/challenge", { replace: true });
  }, [loading, competition, entry, navigate]);

  if (loading || !competition || !entry) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  const hasSubmitted = ["submitted", "ai_processed", "judged"].includes(entry.status);
  const isLive = phase === "live";

  const openEditor = async () => {
    setOpening(true);
    setOpenError("");
    try {
      const { data } = await api.post(`/competitions/${competition._id}/open-editor`);
      navigate(`/create-project/${data.scriptId}?ctx=competition`);
    } catch (err) {
      setOpenError(err?.response?.data?.message || "Could not open the editor. Please try again.");
      refresh();
    } finally {
      setOpening(false);
    }
  };

  const renderOpenEditorButton = () => (
    <div>
      <button
        type="button"
        onClick={openEditor}
        disabled={opening}
        className="rounded-lg bg-[#D14D37] px-6 py-3 font-semibold text-white hover:bg-[#b8402d] disabled:bg-gray-400"
      >
        {opening ? "Opening…" : entry.scriptId ? "Continue writing" : "Open Script Editor"}
      </button>
      {openError ? <p className="mt-2 text-sm text-[#D14D37]">{openError}</p> : null}
    </div>
  );

  const renderSubmittedCard = () => (
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
        <div>
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">Script submitted</p>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            Submitted {new Date(entry.submittedAt).toLocaleString()}. Your script is locked and safe.
          </p>
        </div>
      </div>
    </Card>
  );

  const awardLabel = {
    winner: "Winner",
    runner_up: "Runner-Up",
    special: entry.result?.specialTitle || "Special Award",
    participant: "Participant",
  }[entry.result?.award];

  const renderHome = () => (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {user?.name || "writer"}</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">{competition.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="success">Registered</Pill>
            {hasSubmitted ? <Pill tone="brand">Submitted</Pill> : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Event ID</span>
          <span className="font-mono font-bold tracking-wider text-gray-900 dark:text-white">{entry.eventId}</span>
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(entry.eventId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-gray-400 hover:text-[#D14D37]"
            aria-label="Copy Event ID"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </Card>

      <Card>
        <CompetitionJourney steps={timeline} />
      </Card>

      {phase === "announced" || phase === "registration_open" || phase === "registration_closed" ? (
        <Card>
          <CountdownTimer target={competition.dates?.startsAt} serverNow={serverNow} label="Competition starts in" onExpire={refresh} />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            The theme is revealed the moment the clock hits zero. Then you have 48 hours.
          </p>
        </Card>
      ) : null}

      {isLive ? (
        <>
          <Card className="border-[#D14D37]/30">
            <CountdownTimer target={competition.dates?.endsAt} serverNow={serverNow} label="Time remaining" onExpire={refresh} />
          </Card>

          {competition.theme?.title ? (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#D14D37]">Your theme</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{competition.theme.title}</h2>
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
          ) : null}

          {hasSubmitted ? renderSubmittedCard() : <Card>{renderOpenEditorButton()}</Card>}
        </>
      ) : null}

      {phase === "judging" ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#D14D37]" aria-hidden="true" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Submissions closed</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                AI processing and judging are underway. We'll email you the moment results are announced.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {phase === "results" ? (
        <Card className={entry.result?.award && entry.result.award !== "participant" && entry.result.award !== "none"
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20" : ""}>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Results are in</h2>
          </div>
          {awardLabel && entry.result.award !== "none" ? (
            <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{awardLabel}</p>
          ) : null}
          {["winner", "runner_up", "special"].includes(entry.result?.award) ? (
            <p className="mt-2 text-gray-700 dark:text-gray-200">
              Congratulations — your rewards have been added to your account.
            </p>
          ) : (
            <p className="mt-2 text-gray-700 dark:text-gray-200">{PARTICIPANT_COMPLETION_MESSAGE(competition.name)}</p>
          )}
          {entry.rewardsGranted?.length ? (
            <ul className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-200">
              {entry.rewardsGranted.map((reward, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span>{reward.type.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {results?.winner ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Winner: <strong>{results.winner.name}</strong>{results.winner.scriptTitle ? ` — ${results.winner.scriptTitle}` : ""}
            </p>
          ) : null}
        </Card>
      ) : null}

      <AIResults ai={entry.ai} />

      <Link
        to="/my-competitions"
        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#D14D37] dark:border-gray-700 dark:bg-gray-800"
      >
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">My Competitions</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Every challenge you've entered, and what you won.</p>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </Link>
    </div>
  );

  const renderEvent = () => (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rules</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-700 dark:text-gray-200">
          {(competition.rules || []).map((rule, i) => <li key={i}>{rule}</li>)}
        </ol>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Judging criteria</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {JUDGING_CRITERIA.map((c) => (
            <span key={c} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200">{c}</span>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Eligibility & format</h2>
        <p className="mt-3 text-gray-700 dark:text-gray-200">{competition.eligibility || "Open to all writers."}</p>
        <p className="mt-2 text-gray-700 dark:text-gray-200">{competition.format}</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Timeline</h2>
        <div className="mt-4"><PhaseTimeline steps={timeline} serverNow={serverNow} /></div>
      </Card>
    </div>
  );

  const renderPrizes = () => (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { title: "Winner", items: competition.prizes?.winner || [] },
        { title: "Runner-Up", items: competition.prizes?.runnerUp || [] },
        { title: "Special Awards", items: (competition.prizes?.special || []).map((s) => (s.description ? `${s.title} — ${s.description}` : s.title)) },
      ].map((group) => (
        <Card key={group.title}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{group.title}</h3>
          <ul className="mt-4 space-y-2">
            {group.items.length ? group.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"><span className="text-[#D14D37]">•</span>{item}</li>
            )) : <li className="text-sm text-gray-500 dark:text-gray-400">To be announced.</li>}
          </ul>
        </Card>
      ))}
    </div>
  );

  const renderCommunity = () => (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Community</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Talk to the other writers taking part.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(competition.communityLinks || []).length ? competition.communityLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#D14D37] hover:text-[#D14D37] dark:border-gray-600 dark:text-gray-200">
              {link.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )) : <p className="text-sm text-gray-500 dark:text-gray-400">Community links will appear here soon.</p>}
        </div>
      </Card>

      <ReferralDrive
        competitionId={competition._id}
        competitionName={competition.name}
        referrals={referrals}
        referralCode={referralCode}
      />

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Who else is writing</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Everyone entered in this challenge. Follow the writers whose work you want to keep up with.
        </p>
        <div className="mt-5">
          <ParticipantsGrid competitionId={competition._id} viewer={user} />
        </div>
      </Card>
    </div>
  );

  const renderResources = () => (
    <div className="space-y-4">
      {WRITING_RESOURCES.map((resource) => (
        <Card key={resource.title}>
          <h3 className="font-semibold text-gray-900 dark:text-white">{resource.title}</h3>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{resource.body}</p>
        </Card>
      ))}
      {(competition.resources || []).length ? (
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-white">More from Ckript</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {competition.resources.map((resource, i) => (
              <a key={i} href={resource.url} target="_blank" rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#D14D37] hover:text-[#D14D37] dark:border-gray-600 dark:text-gray-200">
                {resource.label} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );

  const renderStudio = () => {
    if (hasSubmitted) {
      return (
        <div className="space-y-6">
          {renderSubmittedCard()}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your submission</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Words", entry.snapshot?.wordCount],
                ["Pages", entry.snapshot?.pageCount],
                ["Scenes", entry.snapshot?.sceneCount],
                ["Characters", entry.snapshot?.charCount],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
                  <dd className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value ?? 0}</dd>
                </div>
              ))}
            </dl>
            {entry.snapshot?.title ? (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Title: <strong>{entry.snapshot.title}</strong></p>
            ) : null}
          </Card>
        </div>
      );
    }

    if (!isLive) {
      return (
        <Card className="text-center">
          <Lock className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          <p className="mt-4 font-semibold text-gray-900 dark:text-white">{STUDIO_LOCKED_MESSAGE}</p>
          {competition.dates?.startsAt && phase !== "judging" && phase !== "results" ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Opens in <CountdownTimer target={competition.dates.startsAt} serverNow={serverNow} size="sm" />
            </p>
          ) : null}
        </Card>
      );
    }

    return (
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Script Studio</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Write in the Ckript editor. Your work saves automatically — submit when you're ready.
        </p>
        <div className="mt-5">{renderOpenEditorButton()}</div>
      </Card>
    );
  };

  const content = {
    home: renderHome, event: renderEvent, prizes: renderPrizes,
    community: renderCommunity, resources: renderResources, studio: renderStudio,
  }[section]();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
        <nav className="sticky top-24 hidden h-fit w-56 shrink-0 space-y-1 lg:block">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
                section === key
                  ? "bg-[#D14D37] text-white"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
            {SECTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                  section === key ? "bg-[#D14D37] text-white" : "bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {content}
        </div>
      </div>
    </div>
  );
};

export default CompetitionDashboard;
