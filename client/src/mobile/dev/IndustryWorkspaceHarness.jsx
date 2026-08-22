import { useSearchParams } from "react-router-dom";
import { INDUSTRY_HOME_STATUS, normalizeIndustryFeed } from "../../features/investor-desk/industryHome";
import { INDUSTRY_DASHBOARD_STATUS } from "../../features/producer-workspace/industryDashboard";
import IndustryDashboardMobile from "../screens/industry/IndustryDashboardMobile";
import IndustryHomeMobile from "../screens/industry/IndustryHomeMobile";

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

export default function IndustryWorkspaceHarness({ user }) {
  const [params] = useSearchParams();
  const view = params.get("view") || "home";
  const state = params.get("state") || "ready";
  const actor = params.get("role") === "actor";
  const fixtureUser = { ...user, _id: "preview-industry", name: actor ? "Arjun Mehta" : "Naina Kapoor", role: actor ? "actor" : "producer", favoriteScripts: [] };

  if (view === "dashboard") {
    const previewState = state === "loading"
      ? { status: INDUSTRY_DASHBOARD_STATUS.LOADING, data: null, retry }
      : state === "error"
        ? { status: INDUSTRY_DASHBOARD_STATUS.FAILED, data: null, failure: { message: "The account service is unavailable." }, retry }
        : { status: INDUSTRY_DASHBOARD_STATUS.READY, data: state === "partial" ? { ...dashData, failures: { wallet: "Wallet unavailable" } } : dashData, retry };
    return <IndustryDashboardMobile user={fixtureUser} previewState={previewState} />;
  }

  const previewState = state === "loading"
    ? { status: INDUSTRY_HOME_STATUS.LOADING, data: null, retry }
    : state === "error"
      ? { status: INDUSTRY_HOME_STATUS.FAILED, data: null, failure: { message: "The discovery service is unavailable." }, retry }
      : { status: INDUSTRY_HOME_STATUS.READY, data: state === "empty" ? { ...homeData, feed: normalizeIndustryFeed({}) } : { ...homeData, degraded: state === "degraded" }, retry };
  return <IndustryHomeMobile user={fixtureUser} previewState={previewState} />;
}
