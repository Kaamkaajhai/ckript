// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { CHALLENGE_DETAIL_STATUS } from "./challengeDetail";
import CompetitionLanding from "./CompetitionLanding";

const mocks = vi.hoisted(() => ({ detail: vi.fn(), auth: vi.fn() }));
vi.mock("./useChallengeDetail", () => ({ default: (...args) => mocks.detail(...args) }));
vi.mock("../../context/AuthModalContext", () => ({ useAuthModal: () => ({ openAuthModal: mocks.auth }) }));
vi.mock("../hall-of-fame/HallOfFameDetail", () => ({ default: () => <main data-testid="competition-record">Public record</main> }));
vi.mock("../../components/competition/CountdownTimer", () => ({ default: ({ label }) => <span>{label}</span> }));
vi.mock("../../components/competition/PhaseTimeline", () => ({ default: () => <div>Timeline</div> }));
vi.mock("../../components/competition/ParticipantsGrid", () => ({ default: () => <div>Participants</div> }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const competition = {
  _id: "c1",
  slug: "48-hours",
  name: "Forty-Eight Hours",
  visibility: "public",
  overview: "Write a complete screenplay.",
  dates: { regClosesAt: "2026-08-25T00:00:00.000Z" },
  prizes: {},
};

const detail = ({ phase = "registration_open", visibility = "public", results = null } = {}) => ({
  public: { status: CHALLENGE_DETAIL_STATUS.READY, data: { competition: { ...competition, visibility }, phase, timeline: [], results, serverNow: null }, failure: null },
  entry: { status: CHALLENGE_DETAIL_STATUS.IDLE, data: null, failure: null },
  refresh: vi.fn(),
  retryEntry: vi.fn(),
});

let container;
let root;

async function mount(user = null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/challenge/c/48-hours"]}>
      <AuthContext.Provider value={{ user }}>
        <Routes><Route path="/challenge/c/:slug" element={<CompetitionLanding />} /></Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  ));
  return container;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detail.mockReturnValue(detail());
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("CompetitionLanding shared detail boundary", () => {
  it("authenticates a signed-out visitor into the exact competition registration", async () => {
    const el = await mount();
    const register = Array.from(el.querySelectorAll("button")).find((button) => button.textContent === "Register now");
    await act(async () => register.click());
    expect(mocks.auth).toHaveBeenCalledWith({ redirect: "/challenge/register?c=48-hours" });
  });

  it.each(["hidden", "private"])("keeps a %s completed direct-link record on its loaded payload", async (visibility) => {
    mocks.detail.mockReturnValue(detail({
      phase: "results",
      visibility,
      results: { winner: { name: "Mira Sen", scriptTitle: "Last Stop" }, special: [] },
    }));
    const el = await mount();
    expect(el.querySelector('[data-testid="competition-record"]')).toBeNull();
    expect(el.textContent).toContain("Mira Sen");
    expect(el.textContent).toContain("Last Stop");
  });

  it("hands a discoverable completed challenge to the permanent public record", async () => {
    mocks.detail.mockReturnValue(detail({ phase: "results", visibility: "public" }));
    const el = await mount();
    expect(el.querySelector('[data-testid="competition-record"]')).toBeTruthy();
  });
});
