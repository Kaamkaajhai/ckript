// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import { INDUSTRY_HOME_STATUS, normalizeIndustryFeed } from "../../../features/investor-desk/industryHome";
import { INDUSTRY_DASHBOARD_STATUS } from "../../../features/producer-workspace/industryDashboard";
import { MANDATES_STATUS } from "../../../features/producer-workspace/mandatesData";
import IndustryDashboardMobile from "./IndustryDashboardMobile";
import IndustryHomeMobile from "./IndustryHomeMobile";
import WriterRosterMobile from "./WriterRosterMobile";
import MandatesMobile from "./MandatesMobile";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const producer = { _id: "u1", name: "Naina Kapoor", role: "producer", favoriteScripts: [] };
const project = { _id: "p1", title: "The Last Lantern", status: "published", genre: "Drama", contentType: "feature", logline: "A city must recover its memory.", creator: { _id: "w1", name: "Maya Rao" } };
const retry = vi.fn();
const homeReady = { status: INDUSTRY_HOME_STATUS.READY, data: { feed: normalizeIndustryFeed({ trending: [project] }), profile: {}, degraded: false }, retry };
const dashboardReady = { status: INDUSTRY_DASHBOARD_STATUS.READY, data: { dash: { stats: { totalViewed: 3 }, marketPulse: { available: 8 }, matchedScripts: [project], recentDeals: [], activeHolds: [] }, wallet: { balance: 5000 }, transactions: [], purchaseRequests: [], watchlist: [], failures: {} }, retry };

let root;
let container;
async function mount(node, path) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ user: producer, setUser: vi.fn() }}>
        <div className="ckm">{node}</div>
      </AuthContext.Provider>
    </MemoryRouter>,
  ));
  return container;
}

afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; container = null; vi.clearAllMocks(); });

describe("native industry workspace", () => {
  it("renders one native discovery heading and URL-owned controls", async () => {
    const el = await mount(<IndustryHomeMobile user={producer} previewState={homeReady} />, "/home?sort=reads");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("The Last Lantern");
    expect(Array.from(el.querySelectorAll("select")).some((select) => select.value === "reads")).toBe(true);
  });

  it("distinguishes discovery empty and failure states", async () => {
    let el = await mount(<IndustryHomeMobile user={producer} previewState={{ ...homeReady, data: { ...homeReady.data, feed: normalizeIndustryFeed({}) } }} />, "/home");
    expect(el.textContent).toContain("No project matches this shelf");
    act(() => root.unmount()); container.remove(); root = null; container = null;
    el = await mount(<IndustryHomeMobile user={producer} previewState={{ status: INDUSTRY_HOME_STATUS.FAILED, failure: { message: "Desk offline" }, retry }} />, "/home");
    expect(el.textContent).toContain("Desk offline");
  });

  it("renders role-specific dashboard sections and actor-safe navigation", async () => {
    let el = await mount(<IndustryDashboardMobile user={producer} previewState={dashboardReady} />, "/dashboard?section=matches");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("The Last Lantern");
    expect(el.textContent).toContain("Finance");
    act(() => root.unmount()); container.remove(); root = null; container = null;
    const actor = { ...producer, role: "actor" };
    el = await mount(<IndustryDashboardMobile user={actor} previewState={dashboardReady} />, "/dashboard");
    expect(el.textContent).toContain("Discovery-only account");
    expect(el.textContent).not.toContain("Finance");
  });

  it("keeps partial dashboard data visible", async () => {
    const partial = { ...dashboardReady, data: { ...dashboardReady.data, failures: { wallet: "Wallet unavailable" } } };
    const el = await mount(<IndustryDashboardMobile user={producer} previewState={partial} />, "/dashboard");
    expect(el.textContent).toContain("Some account data did not load");
    expect(el.textContent).toContain("Scripts read");
  });

  it("renders the native writer register from canonical URL filters", async () => {
    const writer = {
      _id: "w1",
      name: "Maya Rao",
      bio: "Drama writer",
      writerProfile: { genres: ["Drama"], wgaMember: true },
      scriptCount: 2,
      totalViews: 1250,
      avgScore: 81,
      followerCount: 34,
    };
    const state = {
      status: "ready",
      data: { writers: [writer], mandateSource: { industryProfile: { mandates: { genres: ["Drama"] } } } },
      retry,
    };
    const el = await mount(<WriterRosterMobile user={producer} previewState={state} />, "/writers?genre=Drama&mandate=1");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("Maya Rao");
    expect(el.textContent).toContain("Mandate overlap");
    expect(el.querySelector('a[href="/profile/w1"]')).toBeTruthy();
  });

  it("renders mandate draft, failure recovery, and save status without losing selections", async () => {
    const state = {
      status: MANDATES_STATUS.READY,
      mandates: { formats: ["feature"], genres: ["Drama"], excludeGenres: [], specificHooks: ["True Story"] },
      dirty: true,
      saved: false,
      saveFailure: new Error("offline"),
      toggle: vi.fn(), reset: vi.fn(), retry: vi.fn(), save: vi.fn().mockResolvedValue(undefined),
    };
    const el = await mount(<MandatesMobile user={producer} previewState={state} />, "/mandates");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("Your changes were not saved");
    expect(el.textContent).toContain("Unsaved changes");
    expect(el.querySelector('input[type="checkbox"]:checked')).toBeTruthy();
    const save = Array.from(el.querySelectorAll("button")).find((button) => button.textContent.includes("Save mandate"));
    await act(async () => save.click());
    expect(state.save).toHaveBeenCalledOnce();
  });
});
