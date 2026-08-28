import { useSearchParams } from "react-router-dom";
import { CHALLENGE_DETAIL_STATUS } from "../../pages/challenge/challengeDetail";
import ChallengeDetailMobile from "../screens/challenges/ChallengeDetailMobile";

const writer = { _id: "preview-writer", name: "Mira Sen", role: "writer", token: "preview" };
const producer = { _id: "preview-producer", name: "Ravi Menon", role: "producer", token: "preview" };

const competition = {
  _id: "competition-2026",
  slug: "global-script-challenge-2026",
  name: "Global Script Challenge 2026",
  overview: "Write a complete short screenplay in forty-eight hours. Every writer receives the same theme when the clock begins.",
  eligibility: "Open worldwide to writers aged 18 and above",
  format: "5–15 page screenplay written in the Ckript editor",
  prizePool: "₹1,00,000",
  totalParticipants: 284,
  dates: {
    regOpensAt: "2026-08-20T00:00:00.000Z",
    regClosesAt: "2026-08-25T00:00:00.000Z",
    startsAt: "2026-08-26T00:00:00.000Z",
    endsAt: "2026-08-28T00:00:00.000Z",
  },
  theme: {
    title: "The last train home",
    brief: "A traveller reaches the platform seconds after the final train leaves, then sees someone familiar inside the empty station.",
    allowedGenres: ["Drama", "Thriller", "Mystery"],
    guidelines: "The station must matter to the ending. Keep every scene producible and the screenplay within the stated page range.",
  },
  prizes: {
    winner: ["₹50,000 cash prize", "Gold subscription", "Featured placement when published"],
    runnerUp: ["₹25,000 cash prize", "Silver subscription"],
    special: [{ title: "Best Dialogue", description: "Recognition and a creator badge" }],
  },
  judges: [
    { name: "Asha Rao", title: "Screenwriter", company: "Northlight Pictures", bio: "Award-winning writer of independent features and limited series.", linkedin: "https://www.linkedin.com" },
    { name: "Kabir Shah", title: "Creative producer", company: "Frame House", bio: "Develops writer-led films for Indian and international audiences." },
  ],
  sponsors: [
    { name: "Studio North", tier: "Headline", description: "Independent film studio supporting emerging screenwriters.", url: "https://example.com" },
    { name: "Draft Room", tier: "Community", description: "A community for working screenwriters." },
  ],
  rules: [
    "Write the screenplay during the official challenge window.",
    "Submit one original screenplay between 5 and 15 pages.",
    "Do not include identifying information in the screenplay body.",
  ],
  faq: [
    { q: "Can I write before the clock starts?", a: "No. Planning is fine, but the screenplay must be written during the official window." },
    { q: "Can I enter from outside India?", a: "Yes. The challenge is open worldwide." },
  ],
  resources: [{ label: "Screenplay formatting guide", url: "https://example.com/formatting" }],
  communityLinks: [{ label: "Join the writers' room", url: "https://example.com/community" }],
};

const timeline = [
  { key: "registration", label: "Registration", status: "current", date: competition.dates.regOpensAt },
  { key: "writing", label: "Writing window", status: "upcoming", date: competition.dates.startsAt },
  { key: "judging", label: "Judging", status: "upcoming", date: competition.dates.endsAt },
];

const stateOf = (state) => {
  if (state === "loading") return { public: { status: CHALLENGE_DETAIL_STATUS.LOADING, data: null }, entry: { status: "idle", data: null }, refresh: () => {}, retryEntry: () => {} };
  if (state === "error") return { public: { status: CHALLENGE_DETAIL_STATUS.FAILED, data: null, failure: { message: "Challenge service offline" } }, entry: { status: "idle", data: null }, refresh: () => {}, retryEntry: () => {} };
  if (state === "missing") return { public: { status: CHALLENGE_DETAIL_STATUS.READY, data: { competition: null }, failure: null }, entry: { status: "idle", data: null }, refresh: () => {}, retryEntry: () => {} };

  const phase = state === "live" ? "live" : state === "results" ? "results" : "registration_open";
  const current = {
    ...competition,
    visibility: state === "results" ? "hidden" : "public",
  };
  const entry = state === "registered" ? { eventId: "CGSC-7KQ9M2RX", status: "registered" } : null;
  const entryStatus = state === "entry-error" ? CHALLENGE_DETAIL_STATUS.FAILED : state === "entry-loading" ? CHALLENGE_DETAIL_STATUS.LOADING : CHALLENGE_DETAIL_STATUS.READY;
  return {
    public: {
      status: CHALLENGE_DETAIL_STATUS.READY,
      data: {
        competition: current,
        phase,
        timeline,
        results: phase === "results" ? {
          winner: { userId: "writer-2", username: "rhea", name: "Rhea Kapoor", scriptTitle: "Last Stop", logline: "A missed train opens a door that should not exist." },
          runnerUp: { userId: "writer-3", username: "omar", name: "Omar Ali", scriptTitle: "Platform Nine" },
          special: [],
        } : null,
        serverNow: "2026-08-22T00:00:00.000Z",
      },
      failure: null,
    },
    entry: { status: entryStatus, data: entry, failure: entryStatus === CHALLENGE_DETAIL_STATUS.FAILED ? { message: "Entry check offline" } : null },
    refresh: () => {},
    retryEntry: () => {},
  };
};

export default function ChallengeDetailHarness() {
  const [params] = useSearchParams();
  const state = params.get("state") || "registration";
  const user = state === "public" ? null : state === "producer" ? producer : writer;
  return <ChallengeDetailMobile user={user} previewState={stateOf(state)} previewSlug="global-script-challenge-2026" />;
}
