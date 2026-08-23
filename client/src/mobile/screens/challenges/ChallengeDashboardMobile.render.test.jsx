// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHALLENGE_DASHBOARD_STATUS } from "../../../pages/challenge/challengeDashboard";
import ChallengeDashboardMobile from "./ChallengeDashboardMobile";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const noop = vi.fn();
const user = { _id: "u1", role: "writer", name: "Aditi Rao" };
const competition = {
  _id: "c1", slug: "48-hours", name: "48 Hour Challenge", format: "Short screenplay", eligibility: "Open to writers",
  dates: { startsAt: "2026-08-23T00:00:00.000Z", endsAt: "2026-08-25T00:00:00.000Z" },
  theme: { title: "The last train", brief: "Someone misses it.", writingPrompt: "Begin after midnight." },
  rules: ["Write during the window."], prizes: { winner: ["₹1 lakh"], runnerUp: ["Silver plan"], special: [] },
  communityLinks: [], resources: [],
};
const state = (over = {}) => ({
  status: CHALLENGE_DASHBOARD_STATUS.READY,
  data: { competition, entry: { eventId: "CGSC-1234", status: "writing", scriptId: "s1", snapshot: {}, ai: {}, result: { award: "none" }, rewardsGranted: [] }, phase: "live", timeline: [{ key: "live", label: "Writing", status: "current", date: competition.dates.startsAt }], results: null, referrals: { count: 0 }, referralCode: "CKR1", serverNow: "2026-08-22T00:00:00.000Z" },
  refresh: noop, opening: false, openError: "", openEditor: vi.fn().mockResolvedValue("s1"),
  participants: { status: CHALLENGE_DASHBOARD_STATUS.READY, items: [{ _id: "u1", name: "Aditi Rao", isSelf: true, canonicalPath: "/profile" }, { _id: "u2", name: "Rhea", username: "rhea", canonicalPath: "/rhea", isFollowing: false }], page: 1, limit: 12, total: 2, hasMore: false, failure: null },
  referrals: { status: CHALLENGE_DASHBOARD_STATUS.READY, items: [], page: 1, limit: 12, total: 0, hasMore: false, progress: { count: 0, next: { needed: 3, label: "Bronze" } }, referralCode: "CKR1", failure: null },
  loadMoreParticipants: noop, retryParticipants: noop, loadMoreReferrals: noop, retryReferrals: noop, followPending: "", toggleFollow: noop,
  certificatePending: false, certificateError: "", downloadCertificate: noop,
  ...over,
});

let host;
let root;
const mount = async ({ dashboard = state(), viewer = user, path = "/challenge/dashboard?c=48-hours" } = {}) => {
  await act(async () => root.render(<MemoryRouter initialEntries={[path]}><div className="ckm"><ChallengeDashboardMobile user={viewer} previewSlug="48-hours" previewState={dashboard} /></div></MemoryRouter>));
  return host;
};

describe("ChallengeDashboardMobile", () => {
  beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });

  it("renders one standard participant workspace and opens the exact competition editor", async () => {
    const dashboard = state();
    const el = await mount({ dashboard });
    expect(el.querySelector('[data-screen-id="challenge-dashboard"]')).toBeTruthy();
    expect(el.querySelector('[data-shell-mode="standard"]')).toBeTruthy();
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("CGSC-1234");
    expect(el.textContent).toContain("The last train");
    const writing = [...el.querySelectorAll("button")].find((button) => button.textContent.includes("Continue writing"));
    await act(async () => writing.click());
    expect(dashboard.openEditor).toHaveBeenCalledTimes(1);
  });

  it("keeps the community section URL-owned and renders real participants", async () => {
    const el = await mount({ path: "/challenge/dashboard?c=48-hours&tab=community" });
    expect(el.querySelector('[role="tab"][aria-selected="true"]').textContent).toContain("Community");
    expect(el.textContent).toContain("Rhea");
    expect(el.textContent).toContain("Nobody has joined through your link yet");
    expect(el.textContent).not.toContain("287+");
  });

  it("shows judged outcome, achievements, and the owner-only certificate action", async () => {
    const judged = state();
    judged.data = { ...judged.data, phase: "results", entry: { ...judged.data.entry, status: "judged", submittedAt: "2026-08-24T00:00:00.000Z", result: { award: "winner" }, rewardsGranted: [{ type: "badge_winner" }] }, results: { winner: { name: "Aditi Rao", scriptTitle: "Last Stop" } } };
    const el = await mount({ dashboard: judged });
    expect(el.textContent).toContain("Winner");
    expect(el.textContent).toContain("Download certificate");
  });

  it("states service failure, missing registration, and wrong-role access", async () => {
    expect((await mount({ dashboard: state({ status: CHALLENGE_DASHBOARD_STATUS.FAILED, data: null, failure: { message: "Service offline" } }) })).textContent).toContain("Service offline");
    act(() => root.unmount()); root = createRoot(host);
    expect((await mount({ dashboard: state({ status: CHALLENGE_DASHBOARD_STATUS.NOT_REGISTERED, data: { competition }, failure: null }) })).textContent).toContain("not registered");
    act(() => root.unmount()); root = createRoot(host);
    expect((await mount({ viewer: { _id: "p1", role: "producer" } })).textContent).toContain("writer account is required");
  });
});
