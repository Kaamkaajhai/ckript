// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../../context/AuthContext";
import { READER_PROFILE_STATUS } from "../../../../pages/reader-profile/readerProfile";
import { ToastContext } from "../../../components/feedback/toastContext";
import ReaderProfileMobile from "./ReaderProfileMobile";

const mocks = vi.hoisted(() => ({
  state: null,
  follow: vi.fn(),
  reload: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../../pages/reader-profile/useReaderProfile", () => ({
  useReaderProfile: () => mocks.state,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;

const ready = (overrides = {}) => {
  const { data: dataOverrides = {}, ...stateOverrides } = overrides;
  return ({
  status: READER_PROFILE_STATUS.READY,
  data: {
    profile: {
      _id: "reader-2",
      name: "Ria Kapoor",
      role: "reader",
      bio: "Reads character-led drama.",
      skills: ["Coverage", "Drama"],
      followers: [{ _id: "u1" }],
      following: [],
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    own: false,
    collectionsVisible: false,
    relationship: { isFollowing: false, followsMe: true, followRequestPending: false, blockedByCurrent: false, blockedByProfile: false },
    counts: { read: null, favorites: null, reviews: 1 },
    items: [{ _id: "review-1", rating: 4, comment: "Sharp pacing and a memorable final turn.", createdAt: "2026-08-20T00:00:00.000Z", script: { _id: "script-1", title: "Second Light" } }],
    pagination: { section: "reviews", page: 1, total: 1, totalPages: 1, hasPrevious: false, hasNext: false, privateCollection: false },
    ...dataOverrides,
  },
  failure: null,
  followPending: false,
  actionError: "",
  follow: mocks.follow,
  reload: mocks.reload,
  applyProfileUpdate: vi.fn(),
  ...stateOverrides,
  });
};

beforeEach(() => {
  mocks.state = ready();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.clearAllMocks();
});

async function render(path = "/reader/profile/reader-2?tab=reviews") {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user: { _id: "reader-1", role: "reader" }, setUser: vi.fn() }}>
        <ToastContext.Provider value={mocks.toast}>
          <MemoryRouter initialEntries={[path]}>
            <Routes><Route path="/reader/profile/:id" element={<div className="ckm"><ReaderProfileMobile user={{ _id: "reader-1", role: "reader" }} /></div>} /></Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>,
    );
    await Promise.resolve();
  });
}

describe("native reader profile", () => {
  it("renders visitor identity, follow state, and a paged review from the shared contract", async () => {
    await render();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("Ria Kapoor");
    expect(container.textContent).toContain("Follow back");
    expect(container.textContent).toContain("Sharp pacing and a memorable final turn.");
    expect(container.querySelector('a[href="/reader/script/script-1"]')).toBeTruthy();
  });

  it("states that visitor collections are private instead of rendering them as empty", async () => {
    mocks.state = ready({ data: {
      items: [],
      pagination: { section: "favorites", page: 1, total: 0, totalPages: 1, hasPrevious: false, hasNext: false, privateCollection: true },
    } });
    await render("/reader/profile/reader-2?tab=favorites");
    expect(container.textContent).toContain("Favorites are private");
    expect(container.textContent).toContain("Only this reader can view saved projects and reading history.");
  });
});
