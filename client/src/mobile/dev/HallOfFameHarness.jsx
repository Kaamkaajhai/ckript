import { useSearchParams } from "react-router-dom";
import { HALL_OF_FAME_STATUS } from "../../pages/hall-of-fame/hallOfFame";
import HallOfFameMobile from "../screens/challenges/HallOfFameMobile";

const person = (id, name, award = "winner") => ({ userId: id, name, username: name.toLowerCase().replace(/\s+/g, "-"), scriptTitle: award === "winner" ? "The Last Lantern" : "A Map of Rain", logline: "On the final night of monsoon season, a cartographer must redraw the city before memory washes it away.", specialTitle: award === "special" ? "Best Dialogue" : "", rewards: award === "winner" ? ["winner_badge"] : [] });

const competition = { _id: "competition-1", name: "The Final Draft", slug: "the-final-draft", year: 2026, theme: "What remains after the rain", prizePool: "₹1,00,000", dates: { startsAt: "2026-07-12T10:00:00.000Z", endsAt: "2026-07-14T10:00:00.000Z" }, resultsDeclaredAt: "2026-07-30T10:00:00.000Z", totalParticipants: 418, countriesRepresented: 17, winner: person("writer-1", "Maya Rao"), runnerUp: person("writer-2", "Kabir Sen", "runner_up"), special: [person("writer-3", "Noor Das", "special")] };

const listData = { items: [competition, { ...competition, _id: "competition-2", name: "Midnight Pages", slug: "midnight-pages", year: 2025 }], years: [2026, 2025], competitions: ["Midnight Pages", "The Final Draft"], pageInfo: { page: 1, limit: 12, total: 14, totalPages: 2, hasMore: true } };

const detailData = {
  competition: { ...competition, theme: { title: competition.theme, brief: "Write about what a city chooses to remember." }, overview: "A 48-hour screenwriting challenge about memory, place, and the stories that survive change.", prizes: { winner: ["₹60,000", "Winner badge"], runnerUp: ["₹25,000"] }, judges: [{ name: "Anita Verma", title: "Screenwriter", company: "North Star Films", bio: "An award-winning writer and story editor.", linkedin: "https://linkedin.com" }], sponsors: [{ name: "North Star Films", tier: "Headline", description: "Supporting new screenwriting voices.", url: "https://example.com" }] },
  results: { winner: competition.winner, runnerUp: competition.runnerUp, special: competition.special },
  stats: { totalParticipants: 418, countriesRepresented: 17, scriptsSubmitted: 302, completionRate: 72 },
  featuredScripts: [{ _id: "script-1", title: "The Last Lantern", genre: "Drama", writer: { _id: "writer-1", name: "Maya Rao", username: "maya-rao" } }],
  featuredScriptsPageInfo: { page: 1, limit: 6, total: 7, totalPages: 2, hasMore: true },
};

const retry = () => {};

export default function HallOfFameHarness() {
  const [params] = useSearchParams();
  const state = params.get("state") || "list";
  if (["detail", "detail-empty", "detail-error", "not-found"].includes(state)) {
    const previewDetail = state === "detail-error"
      ? { status: HALL_OF_FAME_STATUS.FAILED, data: null, failure: { message: "The archive service is unavailable." }, retry }
      : state === "not-found"
        ? { status: HALL_OF_FAME_STATUS.NOT_FOUND, data: null, retry }
        : { status: HALL_OF_FAME_STATUS.READY, data: state === "detail-empty" ? { ...detailData, featuredScripts: [], featuredScriptsPageInfo: { page: 1, limit: 6, total: 0, totalPages: 1, hasMore: false } } : detailData, retry, loadMoreFeatured: retry, featuredPending: false, featuredFailure: null };
    return <HallOfFameMobile previewSlug="the-final-draft" previewDetail={previewDetail} />;
  }
  const previewList = state === "loading"
    ? { status: HALL_OF_FAME_STATUS.LOADING, data: null, retry }
    : state === "list-error"
      ? { status: HALL_OF_FAME_STATUS.FAILED, data: null, failure: { message: "The archive service is unavailable." }, retry }
      : { status: HALL_OF_FAME_STATUS.READY, data: state === "empty" ? { items: [], years: [], competitions: [], pageInfo: { page: 1, limit: 12, total: 0, totalPages: 1, hasMore: false } } : listData, retry };
  const user = state === "public-list" ? null : { _id: "preview-writer", name: "Aditi Rao", role: "writer" };
  return <HallOfFameMobile user={user} previewList={previewList} />;
}
