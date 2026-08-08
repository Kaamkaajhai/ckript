// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Holds from "./Holds";

/*
 * What this file is for
 * ---------------------
 * The model tests already prove the arithmetic and the three payload traps.
 * What they cannot prove is the thing this screen exists to get right: that
 * each of its four states is actually REACHABLE and says something true.
 *
 * The 2026-08-07 audit's worst finding was a screen that skeletoned forever on
 * a failed load — no error, no retry, indistinguishable from a slow network.
 * Every state below is asserted against the DOM for that reason.
 */

const NOW = new Date("2026-08-08T12:00:00.000Z");
const daysFromNow = (days) => new Date(NOW.getTime() + days * 864e5).toISOString();

const hold = (overrides = {}) => ({
  _id: "opt1",
  fee: 200,
  platformCut: 20,
  creatorPayout: 180,
  startDate: daysFromNow(-10),
  endDate: daysFromNow(20),
  status: "active",
  convertedToSale: false,
  script: {
    _id: "s1",
    title: "The Last Scene",
    genre: "Drama",
    coverImage: "/uploads/cover.jpg",
    price: 25000,
    creator: { _id: "u2", name: "Ada Okafor", profileImage: "" },
  },
  ...overrides,
});

const get = vi.fn();
vi.mock("../../services/api", () => ({ default: { get: (...args) => get(...args) } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const user = { _id: "u1", role: "producer", name: "Nadia Rahman" };

beforeEach(() => {
  get.mockReset();
  // The screen's whole subject is a countdown, so the clock is pinned. Without
  // this the "expiring" assertions would start failing 20 days after they were
  // written, which is the kind of test rot that gets suites deleted.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.useRealTimers();
});

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/offer-holds"]}>
        <Holds user={user} />
      </MemoryRouter>,
    );
  });
  await act(async () => { await Promise.resolve(); });
}

const text = () => container.textContent;

describe("Holds — the request", () => {
  it("reads the one endpoint that exists, and no other", async () => {
    get.mockResolvedValue({ data: [hold()] });
    await mount();
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/scripts/holds");
  });
});

describe("Holds — success", () => {
  beforeEach(() => { get.mockResolvedValue({ data: [hold()] }); });

  it("names the screen with a real heading, not a styled div", async () => {
    await mount();
    const h1 = container.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain("Offers");
  });

  it("makes the row a link to the project", async () => {
    await mount();
    const row = container.querySelector("a.ckm-holds__row");
    expect(row).toBeTruthy();
    // getMyHolds does not populate a creator username, so /script/<id> — a real
    // declared route — is the correct destination, not a guessed canonical URL.
    expect(row.getAttribute("href")).toBe("/script/s1");
    expect(row.textContent).toContain("The Last Scene");
  });

  it("shows the writer and the fee", async () => {
    await mount();
    expect(text()).toContain("Ada Okafor");
    expect(text()).toContain("₹200");
  });

  it("summarises open holds without counting closed ones", async () => {
    get.mockResolvedValue({ data: [hold(), hold({ _id: "o2", fee: 500, status: "cancelled" })] });
    await mount();
    const values = [...container.querySelectorAll(".ckm-holds__stat-value")].map((n) => n.textContent);
    expect(values[0]).toBe("1");      // open
    expect(values[2]).toBe("₹200");   // committed — the released 500 is excluded
  });

  it("gives each group a heading tied to its list", async () => {
    await mount();
    const heading = container.querySelector(".ckm-holds__group-title");
    const section = container.querySelector("section.ckm-holds__group");
    expect(heading.id).toBeTruthy();
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id);
  });
});

describe("Holds — the three payload traps, on screen", () => {
  it("shows a stale 'active' hold as Lapsed rather than counting it as open", async () => {
    get.mockResolvedValue({ data: [hold({ status: "active", endDate: daysFromNow(-60) })] });
    await mount();
    expect(text()).toContain("Lapsed");
    expect(container.querySelector(".ckm-holds__stat-value").textContent).toBe("0");
  });

  it("renders a deleted project as a non-link row that explains itself", async () => {
    get.mockResolvedValue({ data: [hold({ script: null })] });
    await mount();
    expect(container.querySelector("a.ckm-holds__row")).toBeNull();
    expect(container.querySelector(".ckm-holds__row--inert")).toBeTruthy();
    expect(text()).toContain("no longer available");
    // The money is still the viewer's, so it is still shown.
    expect(text()).toContain("₹200");
  });

  it("says Bought when only convertedToSale is set", async () => {
    get.mockResolvedValue({ data: [hold({ status: "active", convertedToSale: true })] });
    await mount();
    expect(text()).toContain("Bought");
  });
});

describe("Holds — states", () => {
  it("shows a labelled skeleton while loading, not a blank screen", async () => {
    let release;
    get.mockReturnValue(new Promise((resolve) => { release = () => resolve({ data: [] }); }));

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/offer-holds"]}><Holds user={user} /></MemoryRouter>,
      );
    });

    expect(container.querySelector(".ckm-skel__group")).toBeTruthy();
    await act(async () => { release(); await Promise.resolve(); });
  });

  it("offers an empty state with a way out, not just an absence", async () => {
    get.mockResolvedValue({ data: [] });
    await mount();
    expect(text()).toContain("No holds yet");
    expect(container.querySelector('a[href="/search"]')).toBeTruthy();
  });

  /*
   * The load-bearing one. A failed load must SAY it failed and offer a retry —
   * the exact defect the dashboard audit found, where a total failure left the
   * pending skeleton on screen forever.
   */
  it("reports a failed load and offers a retry that refetches", async () => {
    get.mockRejectedValue(new Error("network"));
    await mount();

    expect(container.querySelector(".ckm-skel__group")).toBeNull();
    expect(text()).toContain("Could not load your holds");

    const retry = [...container.querySelectorAll("button")]
      .find((b) => /try again/i.test(b.textContent));
    expect(retry).toBeTruthy();

    get.mockResolvedValue({ data: [hold()] });
    await act(async () => { retry.click(); });
    await act(async () => { await Promise.resolve(); });

    expect(text()).toContain("The Last Scene");
    expect(text()).not.toContain("Could not load your holds");
  });
});
