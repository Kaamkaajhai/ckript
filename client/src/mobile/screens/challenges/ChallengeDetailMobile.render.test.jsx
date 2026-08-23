// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import { CHALLENGE_DETAIL_STATUS } from "../../../pages/challenge/challengeDetail";
import ChallengeDetailMobile from "./ChallengeDetailMobile";

const authModal = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("../../../context/AuthModalContext", () => ({ useAuthModal: () => ({ openAuthModal: authModal.open }) }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const writer = { _id: "writer-1", role: "writer", name: "Mira Sen" };
const competition = {
  _id: "competition-1",
  slug: "forty-eight-hours",
  name: "Forty-Eight Hours",
  phase: "registration_open",
  overview: "Write a complete short screenplay. The clock begins together.",
  eligibility: "Open to all writers",
  format: "Short screenplay",
  prizePool: "₹1,00,000",
  totalParticipants: 84,
  dates: {
    regOpensAt: "2026-08-20T00:00:00.000Z",
    regClosesAt: "2026-08-25T00:00:00.000Z",
    startsAt: "2026-08-26T00:00:00.000Z",
    endsAt: "2026-08-28T00:00:00.000Z",
  },
  theme: { title: "The last train home", brief: "Someone misses the final train.", allowedGenres: ["Drama"] },
  prizes: { winner: ["Cash prize"], runnerUp: ["Silver plan"], special: [{ title: "Best Dialogue" }] },
  judges: [{ name: "Asha Rao", title: "Writer", bio: "Award-winning screenwriter." }],
  sponsors: [{ name: "Studio North", tier: "Headline", description: "Independent film studio." }],
  rules: ["Write during the official window."],
  faq: [{ q: "Can I enter twice?", a: "One entry per writer." }],
  resources: [{ label: "Formatting guide", url: "https://example.com/guide" }],
  communityLinks: [{ label: "Writers' room", url: "https://example.com/community" }],
};

const ready = ({ phase = "registration_open", entry = null, entryStatus = CHALLENGE_DETAIL_STATUS.READY, results = null } = {}) => ({
  public: {
    status: CHALLENGE_DETAIL_STATUS.READY,
    data: {
      competition: { ...competition, phase },
      phase,
      timeline: [{ key: "registration", label: "Registration", status: "current", date: competition.dates.regOpensAt }],
      results,
      serverNow: "2026-08-22T00:00:00.000Z",
    },
    failure: null,
  },
  entry: { status: entryStatus, data: entry, failure: entryStatus === CHALLENGE_DETAIL_STATUS.FAILED ? { message: "Entry check offline" } : null },
  refresh: vi.fn(),
  retryEntry: vi.fn(),
});

let container;
let root;

async function mount({ state = ready(), user = null } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/challenge/c/forty-eight-hours"]}>
      <AuthContext.Provider value={{ user }}>
        <div className="ckm"><ChallengeDetailMobile user={user} previewState={state} previewSlug="forty-eight-hours" /></div>
      </AuthContext.Provider>
    </MemoryRouter>,
  ));
  return container;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("ChallengeDetailMobile", () => {
  it("renders the complete public record under one detail shell and authenticates into registration", async () => {
    const el = await mount();
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.querySelector('[data-shell-mode="detail"]')).toBeTruthy();
    expect(el.textContent).toContain("The last train home");
    expect(el.textContent).toContain("Asha Rao");
    expect(el.textContent).toContain("Studio North");
    expect(el.textContent).toContain("Write during the official window.");
    expect(el.textContent).toContain("Writers' room");
    const register = Array.from(el.querySelectorAll("button")).find((button) => button.textContent === "Register now");
    await act(async () => register.click());
    expect(authModal.open).toHaveBeenCalledWith({ redirect: "/challenge/register?c=forty-eight-hours" });
  });

  it("turns a known entrant's primary action into the exact dashboard link", async () => {
    const el = await mount({ state: ready({ entry: { eventId: "CGSC-1234" } }), user: writer });
    expect(el.textContent).toContain("Registered as CGSC-1234");
    expect(el.querySelector('a[href="/challenge/dashboard?c=forty-eight-hours"]')).toBeTruthy();
  });

  it("renders declared results without handing hidden/direct-link records to another route", async () => {
    const state = ready({
      phase: "results",
      results: { winner: { userId: "writer-2", name: "Rhea", scriptTitle: "Last Stop" }, special: [] },
    });
    state.public.data.competition.visibility = "hidden";
    const el = await mount({ state });
    expect(el.textContent).toContain("Results");
    expect(el.textContent).toContain("Rhea");
    expect(el.textContent).toContain("Last Stop");
  });

  it("keeps an entry-status failure separate from the ready public record", async () => {
    const state = ready({ entryStatus: CHALLENGE_DETAIL_STATUS.FAILED });
    const el = await mount({ state, user: writer });
    expect(el.textContent).toContain("The last train home");
    expect(el.textContent).toContain("Entry check offline");
    const retry = el.querySelector(".ckm-message__actions button");
    expect(retry).toBeTruthy();
    await act(async () => retry.click());
    expect(state.retryEntry).toHaveBeenCalledTimes(1);
  });

  it("renders retryable public failure and a distinct not-found state", async () => {
    const failed = { public: { status: CHALLENGE_DETAIL_STATUS.FAILED, data: null, failure: { message: "Challenge service offline" } }, entry: { status: "idle", data: null }, refresh: vi.fn(), retryEntry: vi.fn() };
    let el = await mount({ state: failed });
    expect(el.textContent).toContain("Challenge service offline");
    await act(async () => root.unmount());
    container.remove();
    root = null;
    container = null;

    el = await mount({ state: { ...ready(), public: { status: CHALLENGE_DETAIL_STATUS.READY, data: { competition: null }, failure: null } } });
    expect(el.textContent).toContain("Challenge not found");
    expect(el.querySelector('a[href="/challenge"]')).toBeTruthy();
  });
});
