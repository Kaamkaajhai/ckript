// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import { HALL_OF_FAME_STATUS } from "../../../pages/hall-of-fame/hallOfFame";
import HallOfFameMobile from "./HallOfFameMobile";

vi.mock("../../../context/AuthModalContext", () => ({ useAuthModal: () => ({ openAuthModal: vi.fn() }) }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const writer = { _id: "writer-0", name: "Aditi", role: "writer" };
const laureate = { userId: "writer-1", username: "maya", name: "Maya Rao", scriptTitle: "Last Lantern", logline: "A city redraws its memories.", rewards: ["winner_badge"] };
const competition = { _id: "c1", name: "Final Draft", slug: "final-draft", year: 2026, theme: "After the rain", prizePool: "₹1 lakh", dates: { startsAt: "2026-07-12T10:00:00.000Z", endsAt: "2026-07-14T10:00:00.000Z" }, winner: laureate, totalParticipants: 80, countriesRepresented: 9 };
const listState = { status: HALL_OF_FAME_STATUS.READY, data: { items: [competition], years: [2026], competitions: ["Final Draft"], pageInfo: { page: 1, total: 13, totalPages: 2, hasMore: true } }, retry: vi.fn() };
const detailState = { status: HALL_OF_FAME_STATUS.READY, data: { competition: { ...competition, theme: { title: "After the rain" }, overview: "A permanent record.", judges: [{ name: "Asha Rao", bio: "Screenwriter." }], sponsors: [{ name: "Studio North", description: "Challenge partner." }] }, results: { winner: laureate, runnerUp: null, special: [] }, stats: { totalParticipants: 80, countriesRepresented: 9, scriptsSubmitted: 60, completionRate: 75 }, featuredScripts: [{ _id: "s1", title: "Last Lantern", genre: "Drama", writer: { _id: "writer-1", name: "Maya Rao", username: "maya" } }], featuredScriptsPageInfo: { page: 1, totalPages: 2, hasMore: true } }, retry: vi.fn(), loadMoreFeatured: vi.fn(), featuredPending: false, featuredFailure: null };

let root;
let container;
async function mount({ path = "/hall-of-fame", list = listState, detail = null, user = writer } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<MemoryRouter initialEntries={[path]}><AuthContext.Provider value={{ user }}><div className="ckm"><HallOfFameMobile user={user} previewList={list} previewDetail={detail} previewSlug={detail ? "final-draft" : ""} /></div></AuthContext.Provider></MemoryRouter>));
  return container;
}

afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; container = null; vi.restoreAllMocks(); });

describe("HallOfFameMobile", () => {
  it("renders the signed-out archive in the public shell with a sign-in action", async () => {
    const el = await mount({ user: null });
    expect(el.querySelector('[data-shell-mode="public"]')).toBeTruthy();
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("Maya Rao");
    expect(Array.from(el.querySelectorAll("button")).some((button) => button.textContent === "Sign in")).toBe(true);
  });

  it("renders the bounded archive in the member shell with permanent-record links", async () => {
    const el = await mount();
    expect(el.querySelector('[data-shell-mode="standard"]')).toBeTruthy();
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("Maya Rao");
    expect(el.querySelector('a[href="/hall-of-fame/final-draft"]')).toBeTruthy();
    expect(el.textContent).toContain("Page 1 of 2");
  });

  it("distinguishes an empty archive from a retryable failure", async () => {
    let el = await mount({ list: { status: HALL_OF_FAME_STATUS.READY, data: { items: [], years: [], competitions: [], pageInfo: { page: 1, total: 0, totalPages: 1 } }, retry: vi.fn() } });
    expect(el.textContent).toContain("No results yet");
    await act(async () => root.unmount()); container.remove(); root = null; container = null;
    const failed = { status: HALL_OF_FAME_STATUS.FAILED, data: null, failure: { message: "Archive offline" }, retry: vi.fn() };
    el = await mount({ list: failed });
    expect(el.textContent).toContain("Archive offline");
    await act(async () => el.querySelector(".ckm-message__actions button").click());
    expect(failed.retry).toHaveBeenCalledTimes(1);
  });

  it("renders one permanent record with honourees, published scripts, people, stats, and privacy copy", async () => {
    const el = await mount({ path: "/hall-of-fame/final-draft", detail: detailState });
    expect(el.querySelector('[data-shell-mode="detail"]')).toBeTruthy();
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("Last Lantern");
    expect(el.textContent).toContain("Asha Rao");
    expect(el.textContent).toContain("Studio North");
    expect(el.textContent).toContain("Winning does not publish a private screenplay");
    const loadMore = Array.from(el.querySelectorAll("button")).find((button) => button.textContent.includes("Load more"));
    await act(async () => loadMore.click());
    expect(detailState.loadMoreFeatured).toHaveBeenCalledTimes(1);
  });

  it("keeps service failure separate from a missing record", async () => {
    let el = await mount({ path: "/hall-of-fame/final-draft", detail: { status: HALL_OF_FAME_STATUS.FAILED, data: null, failure: { message: "Record offline" }, retry: vi.fn() } });
    expect(el.textContent).toContain("Record offline");
    await act(async () => root.unmount()); container.remove(); root = null; container = null;
    el = await mount({ path: "/hall-of-fame/missing", detail: { status: HALL_OF_FAME_STATUS.NOT_FOUND, data: null, retry: vi.fn() } });
    expect(el.textContent).toContain("Competition record not found");
    expect(el.querySelector('a[href="/hall-of-fame"]')).toBeTruthy();
  });
});
