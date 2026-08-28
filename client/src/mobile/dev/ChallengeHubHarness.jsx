import { useSearchParams } from "react-router-dom";
import { CHALLENGE_HUB_STATUS } from "../../pages/challenge/challengeHub";
import ChallengeHubMobile from "../screens/challenges/ChallengeHubMobile";

const publicData = {
  live: [
    {
      _id: "challenge-live",
      slug: "global-script-challenge-2026",
      name: "Global Script Challenge 2026",
      phase: "live",
      theme: "The last train home",
      overview: "Write a complete short screenplay in one focused forty-eight-hour window.",
      prizePool: "₹1,00,000",
      dates: {
        startsAt: new Date(Date.now() - 8 * 3600000).toISOString(),
        endsAt: new Date(Date.now() + 40 * 3600000).toISOString(),
      },
      year: 2026,
    },
    {
      _id: "challenge-upcoming",
      slug: "midnight-draft-2027",
      name: "The Midnight Draft 2027 — International New Voices Edition",
      phase: "announced",
      overview: "A new challenge for first-time and returning screenwriters around the world.",
      dates: {
        regOpensAt: new Date(Date.now() + 10 * 86400000).toISOString(),
        startsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        endsAt: new Date(Date.now() + 32 * 86400000).toISOString(),
      },
      year: 2027,
    },
  ],
  past: [
    {
      _id: "challenge-past",
      slug: "winter-stories-2025",
      name: "Winter Stories 2025",
      phase: "results",
      theme: "A door in the snow",
      dates: { startsAt: "2025-12-01T00:00:00.000Z", endsAt: "2025-12-03T00:00:00.000Z" },
      resultsDeclaredAt: "2025-12-20T00:00:00.000Z",
      totalParticipants: 284,
      countriesRepresented: 31,
      winner: { userId: "writer-2", username: "asha", name: "Asha Rao" },
      runnerUp: { userId: "writer-3", username: "noor", name: "Noor Siddiqui" },
      special: [],
      year: 2025,
    },
    {
      _id: "challenge-judging",
      slug: "monsoon-pages-2026",
      name: "Monsoon Pages 2026",
      phase: "judging",
      theme: "What the flood returned",
      dates: { startsAt: "2026-07-01T00:00:00.000Z", endsAt: "2026-07-03T00:00:00.000Z" },
      year: 2026,
    },
  ],
  honourRoll: [{
    competition: {
      _id: "challenge-past",
      slug: "winter-stories-2025",
      name: "Winter Stories 2025",
      theme: "A door in the snow",
      totalParticipants: 284,
      countriesRepresented: 31,
    },
    people: [
      { award: "winner", person: { userId: "writer-2", username: "asha", name: "Asha Rao", scriptTitle: "Snowbound Signal", logline: "A railway guard hears a distress call from a train erased twenty years ago." } },
      { award: "runner_up", person: { userId: "writer-3", username: "noor", name: "Noor Siddiqui", scriptTitle: "White Room" } },
      { award: "special", person: { userId: "writer-4", username: "devika", name: "Devika Nair", specialTitle: "Best Dialogue", scriptTitle: "The Thaw" } },
    ],
  }],
  laureateCount: 3,
  serverNow: new Date().toISOString(),
};

const mineData = {
  items: [{
    entry: {
      _id: "entry-1",
      eventId: "CGSC-7KQ9M2RX",
      status: "judged",
      createdAt: "2025-12-01T00:00:00.000Z",
      submittedAt: "2025-12-03T00:00:00.000Z",
      snapshot: { title: "A Title That Keeps Going Across a Very Narrow Phone Without Escaping Its Card", pageCount: 14, wordCount: 3480 },
      result: { award: "special", specialTitle: "Best Dialogue in a Limited-Series Screenplay" },
      rewardsGranted: [{ type: "badge_special" }, { type: "subscription_gold" }],
    },
    competition: {
      _id: "challenge-past",
      slug: "winter-stories-2025",
      name: "Winter Stories 2025",
      dates: { startsAt: "2025-12-01T00:00:00.000Z" },
      resultsDeclaredAt: "2025-12-20T00:00:00.000Z",
    },
    phase: "results",
    timeline: [
      { key: "registered", label: "Registered", status: "done", date: "2025-12-01T00:00:00.000Z" },
      { key: "theme", label: "Theme released", status: "done", date: "2025-12-01T02:00:00.000Z" },
      { key: "submitted", label: "Submitted", status: "done", date: "2025-12-03T00:00:00.000Z" },
      { key: "certificate", label: "Certificate available", status: "done", date: "2025-12-20T00:00:00.000Z" },
    ],
  }],
  serverNow: new Date().toISOString(),
};

const ready = (data) => ({ requestKey: "preview", status: CHALLENGE_HUB_STATUS.READY, data, failure: null });
const failed = (message) => ({ requestKey: "preview", status: CHALLENGE_HUB_STATUS.FAILED, data: null, failure: { message } });
const noop = () => {};

export default function ChallengeHubHarness({ user }) {
  const [params] = useSearchParams();
  const state = params.get("state") || "ready";
  const signedOut = state === "public";
  const empty = state === "empty";
  const previewState = {
    public: state === "public-error" ? failed("The challenge archive could not be loaded.") : ready(empty ? { ...publicData, live: [], past: [], honourRoll: [], laureateCount: 0 } : publicData),
    mine: state === "mine-error" ? failed("Your challenge history could not be loaded.") : ready(empty ? { items: [], serverNow: publicData.serverNow } : mineData),
    retryPublic: noop,
    retryMine: noop,
  };

  return <ChallengeHubMobile user={signedOut ? null : user} previewState={previewState} />;
}
