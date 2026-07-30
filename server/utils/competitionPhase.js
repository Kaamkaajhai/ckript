// Competition phase + timeline derivation.
//
// The phase is NEVER stored. It is computed from the competition's dates every time it is read, the
// same lazy approach the codebase already uses for expiries (expireApprovedUnpaidRequests,
// scene-lock sweeps). Consequences worth knowing:
//   • no cron job is needed for the competition to advance,
//   • an admin correcting a date instantly fixes every screen,
//   • the client never decides anything — it renders the phase the API reports.

export const COMPETITION_PHASES = [
  "announced",            // before registration opens
  "registration_open",
  "registration_closed",  // registration shut, competition not started
  "live",                 // 48h writing window
  "judging",              // submissions closed; AI processing + judging
  "results",              // admin has declared
];

// Submissions are accepted for a minute past the deadline so a writer who hits Submit exactly on
// the buzzer (or whose request is slow in flight) is not punished by milliseconds.
export const SUBMIT_GRACE_MS = 60_000;

const at = (value) => (value ? new Date(value).getTime() : null);

export const getCompetitionPhase = (competition, now = new Date()) => {
  if (!competition) return "announced";
  // Declaration is an explicit act, so it wins over any date arithmetic — results can be declared
  // early or late without the phase flapping.
  if (competition.resultsDeclaredAt) return "results";

  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const d = competition.dates || {};
  const regOpens = at(d.regOpensAt);
  const regCloses = at(d.regClosesAt);
  const starts = at(d.startsAt);
  const ends = at(d.endsAt);

  if (regOpens != null && t < regOpens) return "announced";
  if (regCloses != null && t < regCloses) return "registration_open";
  if (starts != null && t < starts) return "registration_closed";
  if (ends != null && t < ends) return "live";
  return "judging";
};

/** Can this competition still accept a submission right now? (grace included) */
export const canSubmitNow = (competition, now = new Date()) => {
  const ends = at(competition?.dates?.endsAt);
  const starts = at(competition?.dates?.startsAt);
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (starts == null || ends == null) return false;
  if (competition.resultsDeclaredAt) return false;
  return t >= starts && t <= ends + SUBMIT_GRACE_MS;
};

// Ordering used to compare an entry's progress against a timeline step.
const ENTRY_RANK = { registered: 0, writing: 1, submitted: 2, ai_processed: 3, judged: 4 };
const entryRank = (entry) => ENTRY_RANK[entry?.status] ?? -1;

/**
 * Build the ordered timeline the UI renders (landing, dashboard, submission success, history).
 *
 * Returns [{ key, label, date (ISO|null), status: "done"|"current"|"upcoming" }].
 * Exactly one step is "current": the first that is not done. Steps after it are "upcoming".
 *
 * With an `entry`, the participant-specific steps report that writer's real progress rather than the
 * competition's clock — so someone who submitted early sees "Submitted ✓" while the window is still
 * open to everyone else.
 */
export const buildTimeline = (competition, entry = null, now = new Date()) => {
  const t = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const d = competition?.dates || {};
  const declared = Boolean(competition?.resultsDeclaredAt);
  const rank = entryRank(entry);

  const iso = (value) => (value ? new Date(value).toISOString() : null);
  const passed = (value) => {
    const ms = at(value);
    return ms != null && t >= ms;
  };

  const steps = [];

  if (entry) {
    steps.push({ key: "registered", label: "Registered", date: iso(entry.createdAt), done: true });
  } else {
    steps.push({ key: "registration_opens", label: "Registration opens", date: iso(d.regOpensAt), done: passed(d.regOpensAt) });
    steps.push({ key: "registration_closes", label: "Registration closes", date: iso(d.regClosesAt), done: passed(d.regClosesAt) });
  }

  steps.push({
    key: "competition_starts",
    // For a participant the meaningful event at startsAt is the reveal — the theme is withheld
    // server-side until exactly this moment. The public timeline keeps the neutral wording.
    label: entry ? "Theme released" : "Competition starts",
    date: iso(d.startsAt),
    done: passed(d.startsAt),
  });
  steps.push({
    key: "writing",
    label: entry ? "Writing" : "48-hour writing window",
    date: iso(d.startsAt),
    // For a participant, writing is "done" once they submit; otherwise it tracks the window.
    done: entry ? rank >= ENTRY_RANK.submitted : passed(d.endsAt),
  });
  steps.push({
    key: "submission",
    label: entry ? "Submitted" : "Submission ends",
    date: entry ? iso(entry.submittedAt) : iso(d.endsAt),
    done: entry ? rank >= ENTRY_RANK.submitted : passed(d.endsAt),
  });
  steps.push({
    key: "ai_review",
    label: "AI review",
    date: entry ? iso(entry.ai?.processedAt) : null,
    done: entry ? rank >= ENTRY_RANK.ai_processed : declared,
  });
  steps.push({
    key: "judging",
    label: "Judge review",
    date: null,
    done: declared,
  });
  steps.push({
    key: "results",
    label: "Results",
    date: iso(competition?.resultsDeclaredAt || d.resultsAt),
    done: declared,
  });
  steps.push({
    key: "rewards",
    label: "Rewards",
    date: iso(competition?.resultsDeclaredAt),
    // Rewards land with the declaration; for a participant, when their entry is judged.
    done: entry ? rank >= ENTRY_RANK.judged : declared,
  });

  // The certificate becomes downloadable at exactly the same moment — getCompetitionCertificate
  // gates on `entry.status === "judged"`, which is this same rank check. No new state: the step
  // simply names an outcome the entry already carries. Participant-only, since there is no
  // certificate to speak of on the public timeline.
  if (entry) {
    steps.push({
      key: "certificate",
      label: "Certificate available",
      date: iso(competition?.resultsDeclaredAt),
      done: rank >= ENTRY_RANK.judged,
    });
  }

  // A timeline is monotonic: once a step is unfinished, nothing after it can be finished. The
  // per-step `done` flags come from two different sources (the entry's own progress vs the
  // competition clock), which can disagree — a registrant who never submitted has writing/submission
  // not-done while judging/results are done, since those track the competition, not them. Rendering
  // that literally pins them on "Writing" forever with completed steps below. Collapsing from the
  // first unfinished step keeps the sequence honest.
  const firstUnfinished = steps.findIndex((s) => !s.done);
  const lastDone = firstUnfinished === -1 ? steps.length - 1 : firstUnfinished - 1;

  return steps.map(({ done, ...rest }, index) => {
    if (index <= lastDone) return { ...rest, status: "done" };
    // Exactly one "current": the first unfinished step — unless everything is done.
    if (index === firstUnfinished) return { ...rest, status: "current" };
    return { ...rest, status: "upcoming" };
  });
};

export default getCompetitionPhase;
