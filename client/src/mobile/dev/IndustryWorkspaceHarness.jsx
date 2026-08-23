import { useSearchParams } from "react-router-dom";
import { INDUSTRY_HOME_STATUS, normalizeIndustryFeed } from "../../features/investor-desk/industryHome";
import { INDUSTRY_DASHBOARD_STATUS } from "../../features/producer-workspace/industryDashboard";
import { MANDATES_STATUS } from "../../features/producer-workspace/mandatesData";
import { WRITER_ROSTER_STATUS } from "../../features/producer-workspace/writerRosterData";
import { buildHoldsModel } from "../data/holdsModel";
import Holds from "../screens/Holds";
import IndustryDashboardMobile from "../screens/industry/IndustryDashboardMobile";
import IndustryHomeMobile from "../screens/industry/IndustryHomeMobile";
import MandatesMobile from "../screens/industry/MandatesMobile";
import WriterRosterMobile from "../screens/industry/WriterRosterMobile";

const project = (id, title, genre = "Drama") => ({
  _id: id,
  title,
  status: "published",
  genre,
  contentType: "feature",
  logline: "A determined outsider risks everything to bring a buried story into the light.",
  views: 1280,
  rating: 4.5,
  creator: { _id: `writer-${id}`, name: "Maya Rao", username: "maya-rao" },
  scriptScore: { overall: 86 },
});

const projects = [project("p1", "The Last Lantern"), project("p2", "A Map of Rain", "Mystery"), project("p3", "After the Monsoon")];
const homeData = {
  feed: normalizeIndustryFeed({ genreSections: [{ genre: "Drama", scripts: projects.slice(0, 2) }], trending: projects }),
  profile: { industryProfile: { mandates: { genres: ["Drama"], formats: ["feature"], specificHooks: ["contained"] }, investmentRange: "50k_250k" } },
  profileFailed: false,
  degraded: false,
};
const dashData = {
  dash: {
    stats: { totalViewed: 34, scriptsPurchased: 2, successfulProjects: 1, totalInvested: 450000 },
    marketPulse: { newThisWeek: 14, available: 268, totalScripts: 412 },
    matchedScripts: projects,
    recentDeals: [],
    activeHolds: [],
  },
  wallet: { balance: 125000 },
  transactions: [{ _id: "t1", type: "debit", status: "completed", description: "Option fee", amount: 12000, createdAt: "2026-08-18T10:00:00Z" }],
  purchaseRequests: [{ _id: "r1", status: "pending", amount: 85000, createdAt: "2026-08-20T10:00:00Z", script: projects[0], writer: projects[0].creator }],
  watchlist: projects.slice(0, 2),
  failures: {},
  syncedAt: new Date("2026-08-22T10:00:00Z"),
};
const retry = () => {};
const writer = {
  _id: "writer-1", name: "Maya Rao", bio: "Drama and mystery writer",
  writerProfile: { genres: ["Drama", "Mystery"], wgaMember: true },
  scriptCount: 4, totalViews: 12400, avgScore: 86, followerCount: 820,
};
const mandate = { formats: ["feature"], genres: ["Drama"], excludeGenres: ["Horror"], specificHooks: ["True Story"] };
const holdsData = buildHoldsModel([{
  _id: "hold-1",
  fee: 12000,
  platformCut: 600,
  creatorPayout: 12000,
  startDate: "2026-08-18T10:00:00Z",
  endDate: "2026-09-18T10:00:00Z",
  status: "active",
  script: projects[0],
}], { now: new Date("2026-08-23T10:00:00Z") });

export default function IndustryWorkspaceHarness({ user }) {
  const [params] = useSearchParams();
  const view = params.get("view") || "home";
  const state = params.get("state") || "ready";
  const actor = params.get("role") === "actor";
  const fixtureUser = { ...user, _id: "preview-industry", name: actor ? "Arjun Mehta" : "Naina Kapoor", role: actor ? "actor" : "producer", favoriteScripts: [] };

  if (view === "holds") {
    const previewState = state === "loading"
      ? { data: null, loading: true, error: null, refresh: retry }
      : state === "error"
        ? { data: null, loading: false, error: new Error("The holds service is unavailable."), refresh: retry }
        : {
          data: state === "empty" ? buildHoldsModel([]) : holdsData,
          loading: false,
          error: null,
          refresh: retry,
          release: async () => false,
          releasingId: "",
          releaseError: "",
          clearReleaseError: retry,
        };
    return <Holds user={fixtureUser} previewState={previewState} />;
  }

  if (view === "dashboard") {
    const previewState = state === "loading"
      ? { status: INDUSTRY_DASHBOARD_STATUS.LOADING, data: null, retry }
      : state === "error"
        ? { status: INDUSTRY_DASHBOARD_STATUS.FAILED, data: null, failure: { message: "The account service is unavailable." }, retry }
        : { status: INDUSTRY_DASHBOARD_STATUS.READY, data: state === "partial" ? { ...dashData, failures: { wallet: "Wallet unavailable" } } : dashData, retry };
    return <IndustryDashboardMobile user={fixtureUser} previewState={previewState} />;
  }

  if (view === "writers") {
    const previewState = state === "loading"
      ? { status: WRITER_ROSTER_STATUS.LOADING, data: null, retry }
      : state === "error"
        ? { status: WRITER_ROSTER_STATUS.FAILED, data: null, failure: { message: "The writer roster is unavailable." }, retry }
        : { status: WRITER_ROSTER_STATUS.READY, data: {
          writers: state === "empty" ? [] : [writer],
          mandateSource: { industryProfile: { mandates: mandate } },
          mandateUnavailable: state === "degraded",
        }, retry };
    return <WriterRosterMobile user={fixtureUser} previewState={previewState} />;
  }

  if (view === "mandates") {
    const previewState = {
      status: state === "loading" ? MANDATES_STATUS.LOADING : state === "error" ? MANDATES_STATUS.FAILED : MANDATES_STATUS.READY,
      mandates: mandate,
      dirty: state === "save-error",
      saved: state === "saved",
      failure: state === "error" ? new Error("The mandate service is unavailable.") : null,
      saveFailure: state === "save-error" ? new Error("The mandate could not be saved.") : null,
      toggle: () => {}, reset: () => {}, retry, save: async () => {},
    };
    return <MandatesMobile user={fixtureUser} previewState={previewState} />;
  }

  const previewState = state === "loading"
    ? { status: INDUSTRY_HOME_STATUS.LOADING, data: null, retry }
    : state === "error"
      ? { status: INDUSTRY_HOME_STATUS.FAILED, data: null, failure: { message: "The discovery service is unavailable." }, retry }
      : { status: INDUSTRY_HOME_STATUS.READY, data: state === "empty" ? { ...homeData, feed: normalizeIndustryFeed({}) } : { ...homeData, degraded: state === "degraded" }, retry };
  return <IndustryHomeMobile user={fixtureUser} previewState={previewState} />;
}
