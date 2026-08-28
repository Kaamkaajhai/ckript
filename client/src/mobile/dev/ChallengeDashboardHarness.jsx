import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CHALLENGE_DASHBOARD_STATUS } from "../../pages/challenge/challengeDashboard";
import ChallengeDashboardMobile from "../screens/challenges/ChallengeDashboardMobile";

const noop = () => {};
const writer = { _id: "writer-1", role: "writer", name: "Aditi Rao" };
const competition = {
  _id: "competition-48", slug: "48-hours", name: "Ckript 48 Hour Global Script Challenge",
  eligibility: "Open to writers worldwide", format: "Short screenplay · Ckript editor", prizePool: "₹1,00,000",
  dates: { startsAt: "2026-08-23T09:00:00.000Z", endsAt: "2026-08-25T09:00:00.000Z" },
  theme: { title: "The last train home", brief: "Someone misses the final train and finds a different way home.", writingPrompt: "Begin after midnight.", allowedGenres: ["Drama", "Thriller"] },
  rules: ["Write during the official window.", "Submit one original screenplay.", "Use the Ckript editor."],
  prizes: { winner: ["₹1,00,000 cash prize", "Featured placement"], runnerUp: ["Silver membership"], special: [{ title: "Best Dialogue", description: "Jury citation" }] },
  communityLinks: [{ label: "Writers' room", url: "https://example.com/community" }],
  resources: [{ label: "Formatting guide", url: "https://example.com/format" }],
};
const timeline = (current = "live") => [
  { key: "registration", label: "Registered", status: current === "registration" ? "current" : "done", date: "2026-08-20T09:00:00.000Z" },
  { key: "live", label: "Writing window", status: current === "live" ? "current" : current === "registration" ? "upcoming" : "done", date: competition.dates.startsAt },
  { key: "judging", label: "Judging", status: current === "judging" ? "current" : current === "results" ? "done" : "upcoming", date: competition.dates.endsAt },
  { key: "results", label: "Results", status: current === "results" ? "current" : "upcoming", date: "2026-09-01T09:00:00.000Z" },
];
const entry = { eventId: "CGSC-8K4M2QPX", status: "writing", scriptId: "script-1", snapshot: {}, ai: {}, result: { award: "none" }, rewardsGranted: [] };
const page = (overrides = {}) => ({ status: CHALLENGE_DASHBOARD_STATUS.READY, items: [], page: 1, limit: 12, total: 0, hasMore: false, failure: null, ...overrides });
const base = (overrides = {}) => ({
  status: CHALLENGE_DASHBOARD_STATUS.READY,
  data: { competition, entry, phase: "live", timeline: timeline("live"), results: null, referrals: { count: 2, next: { needed: 1, label: "Bronze" } }, referralCode: "ADITI48", serverNow: "2026-08-22T09:00:00.000Z" },
  refresh: noop, opening: false, openError: "", openEditor: noop,
  participants: page({ items: [{ _id: "writer-1", name: "Aditi Rao", isSelf: true, canonicalPath: "/profile" }, { _id: "writer-2", name: "Rhea Mukherjee with a deliberately long display name", username: "rhea_writes", bio: "Writes intimate thrillers about cities, families, and strange nights.", canonicalPath: "/rhea_writes" }, { _id: "writer-3", name: "Kabir Sen", isPrivate: true, followRequestPending: true, canonicalPath: "/kabir" }], total: 19, hasMore: true }),
  referrals: page({ items: [{ name: "Mira Kapoor", username: "mira", status: "qualified", registeredAt: "2026-08-21T09:00:00.000Z" }, { name: "Dev Anand", status: "registered", registeredAt: "2026-08-22T09:00:00.000Z" }], total: 2, progress: { count: 1, awaitingVerification: 1, next: { needed: 2, label: "Bronze" } }, referralCode: "ADITI48" }),
  loadMoreParticipants: noop, retryParticipants: noop, loadMoreReferrals: noop, retryReferrals: noop, followPending: "", toggleFollow: noop,
  certificatePending: false, certificateError: "", downloadCertificate: noop,
  ...overrides,
});

export default function ChallengeDashboardHarness() {
  const [params] = useSearchParams();
  const state = params.get("state") || "writing";
  const fixture = useMemo(() => {
    if (state === "loading") return { user: writer, dashboard: base({ status: CHALLENGE_DASHBOARD_STATUS.LOADING, data: null }) };
    if (state === "error") return { user: writer, dashboard: base({ status: CHALLENGE_DASHBOARD_STATUS.FAILED, data: null, failure: { message: "The challenge service is unavailable." } }) };
    if (state === "missing-entry") return { user: writer, dashboard: base({ status: CHALLENGE_DASHBOARD_STATUS.NOT_REGISTERED, data: { competition } }) };
    if (state === "role") return { user: { _id: "producer-1", role: "producer", name: "Mira Producer" }, dashboard: base() };
    if (state === "prestart") return { user: writer, dashboard: base({ data: { ...base().data, phase: "registration_closed", entry: { ...entry, status: "registered", scriptId: null }, timeline: timeline("registration") } }) };
    if (state === "submitted") return { user: writer, dashboard: base({ data: { ...base().data, entry: { ...entry, status: "submitted", submittedAt: "2026-08-24T18:32:00.000Z", snapshot: { title: "Last Stop", wordCount: 2840, charCount: 17320, pageCount: 13, sceneCount: 19 } } } }) };
    if (state === "judging") return { user: writer, dashboard: base({ data: { ...base().data, phase: "judging", entry: { ...entry, status: "ai_processed", submittedAt: "2026-08-24T18:32:00.000Z", ai: { logline: "A stranded writer follows a silent conductor home.", synopsis: "One strange night changes two lives.", evaluation: { plot: 86, dialogue: 91, overall: 88 }, processedAt: "2026-08-25T10:00:00.000Z" } }, timeline: timeline("judging") } }) };
    if (state === "results") return { user: writer, dashboard: base({ data: { ...base().data, phase: "results", entry: { ...entry, status: "judged", submittedAt: "2026-08-24T18:32:00.000Z", result: { award: "winner" }, rewardsGranted: [{ type: "badge_winner" }], ai: { logline: "A stranded writer follows a silent conductor home.", processedAt: "2026-08-25T10:00:00.000Z" } }, timeline: timeline("results"), results: { winner: { name: "Aditi Rao", scriptTitle: "Last Stop" } } } }) };
    if (state === "community-error") return { user: writer, dashboard: base({ participants: page({ status: CHALLENGE_DASHBOARD_STATUS.FAILED, failure: { message: "Participant room is offline." } }), referrals: page({ status: CHALLENGE_DASHBOARD_STATUS.FAILED, failure: { message: "Referral history is offline." }, progress: { count: 1 }, referralCode: "ADITI48" }) }) };
    if (state === "community-empty") return { user: writer, dashboard: base({ participants: page(), referrals: page({ progress: { count: 0, next: { needed: 3, label: "Bronze" } }, referralCode: "ADITI48" }) }) };
    return { user: writer, dashboard: base() };
  }, [state]);
  return <ChallengeDashboardMobile user={fixture.user} previewSlug="48-hours" previewState={fixture.dashboard} />;
}
