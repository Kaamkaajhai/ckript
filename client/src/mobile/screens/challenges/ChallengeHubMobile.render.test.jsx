// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import publicApi from "../../../services/publicApi";
import ChallengeHubMobile from "./ChallengeHubMobile";

const authModal = vi.hoisted(() => ({ open: vi.fn() }));

vi.mock("../../../context/AuthModalContext", () => ({
  useAuthModal: () => ({ openAuthModal: authModal.open }),
}));
vi.mock("../../../services/api", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../services/publicApi", () => ({ default: { get: vi.fn() } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const writer = { _id: "writer-1", id: "writer-1", role: "writer", name: "Mira Sen" };
const publicList = {
  live: [{
    _id: "live-1",
    slug: "forty-eight-hours-2026",
    name: "Forty-Eight Hours 2026",
    phase: "live",
    theme: "The last train home",
    overview: "Write a complete short screenplay.",
    prizePool: "₹1,00,000",
    dates: {
      startsAt: "2026-08-22T00:00:00.000Z",
      endsAt: "2026-08-24T00:00:00.000Z",
    },
  }],
  upcoming: [],
  past: [{
    _id: "past-1",
    slug: "winter-2025",
    name: "Winter Challenge 2025",
    phase: "results",
    dates: { startsAt: "2025-12-01T00:00:00.000Z", endsAt: "2025-12-03T00:00:00.000Z" },
    resultsDeclaredAt: "2025-12-20T00:00:00.000Z",
  }],
  serverNow: "2026-08-22T00:00:00.000Z",
};
const archive = {
  items: [{
    _id: "past-1",
    slug: "winter-2025",
    name: "Winter Challenge 2025",
    theme: "A door in the snow",
    totalParticipants: 44,
    countriesRepresented: 9,
    resultsDeclaredAt: "2025-12-20T00:00:00.000Z",
    winner: { userId: "writer-2", username: "asha", name: "Asha Rao", scriptTitle: "Snowbound" },
    runnerUp: null,
    special: [],
  }],
  years: [2025],
};
const mine = {
  items: [{
    entry: {
      _id: "entry-1",
      eventId: "CGSC-ABCD1234",
      status: "judged",
      createdAt: "2025-12-01T00:00:00.000Z",
      submittedAt: "2025-12-03T00:00:00.000Z",
      snapshot: { title: "Snowbound", pageCount: 11, wordCount: 2490 },
      result: { award: "special", specialTitle: "Best Dialogue" },
      rewardsGranted: [{ type: "badge_special" }],
    },
    competition: {
      _id: "past-1",
      slug: "winter-2025",
      name: "Winter Challenge 2025",
      dates: { startsAt: "2025-12-01T00:00:00.000Z" },
      resultsDeclaredAt: "2025-12-20T00:00:00.000Z",
    },
    phase: "results",
    timeline: [
      { key: "registered", label: "Registered", status: "done", date: "2025-12-01T00:00:00.000Z" },
      { key: "certificate", label: "Certificate available", status: "done", date: "2025-12-20T00:00:00.000Z" },
    ],
  }],
  serverNow: "2026-08-22T00:00:00.000Z",
};

let container;
let root;

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

async function mount(entry, user = null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user }}>
          <div className="ckm"><ChallengeHubMobile user={user} /></div>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
  });
  await settle();
  return container;
}

beforeEach(() => {
  vi.clearAllMocks();
  publicApi.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith("/list") ? publicList : archive }));
  api.get.mockResolvedValue({ data: mine });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("ChallengeHubMobile", () => {
  it("renders the public Live collection with public chrome and no private request", async () => {
    const el = await mount("/challenge");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.querySelector('[data-shell-mode="public"]')).toBeTruthy();
    expect(el.querySelector('a[href="/challenge/c/forty-eight-hours-2026"]')).toBeTruthy();
    expect(el.textContent).toContain("The last train home");
    expect(api.get).not.toHaveBeenCalled();
    expect(publicApi.get).toHaveBeenCalledTimes(2);
  });

  it("deep-links to the writer's native entry list without waiting on another tab", async () => {
    const el = await mount("/challenge?tab=mine", writer);
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.querySelector('[data-shell-mode="standard"]')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/competitions/mine", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(el.textContent).toContain("CGSC-ABCD1234");
    expect(el.textContent).toContain("Best Dialogue");
    expect(el.textContent).toContain("Snowbound");

    const timeline = Array.from(el.querySelectorAll("button")).find((button) => button.textContent.includes("Show timeline"));
    await act(async () => timeline.click());
    expect(el.textContent).toContain("Certificate available");
  });

  it("keeps Mine useful when the unrelated public collection fails", async () => {
    publicApi.get.mockRejectedValue({ response: { data: { message: "Public archive offline" }, status: 503 } });
    const el = await mount("/challenge?tab=mine", writer);
    expect(el.textContent).toContain("CGSC-ABCD1234");
    expect(el.textContent).not.toContain("Public archive offline");
  });

  it("asks a signed-out visitor to authenticate in place and preserves the Mine deep link", async () => {
    const el = await mount("/challenge?tab=mine");
    const signIn = Array.from(el.querySelectorAll("button")).find((button) => button.textContent === "Sign in" && button.closest(".ckm-empty"));
    expect(signIn).toBeTruthy();
    await act(async () => signIn.click());
    expect(authModal.open).toHaveBeenCalledWith({ redirect: "/challenge?tab=mine" });
  });

  it("renders the Hall of Fame as writer cards linked to public profiles", async () => {
    const el = await mount("/challenge?tab=hall-of-fame");
    expect(el.textContent).toContain("1 writer honoured across 1 challenge");
    expect(el.querySelector('a[href="/share/profile/asha"]')).toBeTruthy();
    expect(el.textContent).toContain("Snowbound");
  });
});
