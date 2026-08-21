// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import { ToastContext } from "../../components/feedback/toastContext";
import SearchMobile from "./SearchMobile";

vi.mock("../../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const viewer = {
  _id: "viewer-1",
  name: "Asha Writer",
  role: "writer",
  favoriteScripts: [],
};

const toast = {
  show: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn(),
  info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(),
};

let container;
let root;

async function mount(entry) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user: viewer, setUser: vi.fn() }}>
          <ToastContext.Provider value={toast}>
            <div className="ckm"><SearchMobile user={viewer} /></div>
          </ToastContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
  });
  return container;
}

async function finishDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(351);
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.useRealTimers();
});

describe("SearchMobile", () => {
  it("renders mixed, server-paged results at the canonical URL", async () => {
    api.get.mockResolvedValue({
      data: {
        users: [{
          _id: "person-1",
          name: "Mira Sen",
          role: "writer",
          writerProfile: { username: "mira", genres: ["Drama"] },
          followerCount: 12,
        }],
        scripts: [{
          _id: "script-1",
          title: "Night Train",
          logline: "A final journey changes two lives.",
          genre: "Drama",
          views: 2400,
          creator: { _id: "person-1", name: "Mira Sen", writerProfile: { username: "mira" } },
        }],
        pagination: {
          page: 1,
          limit: 10,
          users: { total: 1, hasMore: false },
          scripts: { total: 1, hasMore: false },
        },
      },
    });

    const el = await mount("/search?q=night");
    await finishDebounce();

    expect(api.get).toHaveBeenCalledTimes(1);
    const [, options] = api.get.mock.calls[0];
    expect(options.params.get("q")).toBe("night");
    expect(options.params.get("page")).toBe("1");
    expect(options.params.get("limit")).toBe("10");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("2 results");
    expect(el.querySelector('a[href="/mira"]')).toBeTruthy();
    expect(el.querySelector('a[href="/night-train/mira"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Share Night Train"]')).toBeTruthy();
  });

  it("starts with useful genre choices and does not enumerate data without intent", async () => {
    const el = await mount("/search");
    await finishDebounce();

    expect(api.get).not.toHaveBeenCalled();
    expect(el.textContent).toContain("What are you looking for?");
    expect(el.textContent).toContain("Thriller");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
  });

  it("keeps the URL-owned search visible when the request fails and offers retry", async () => {
    api.get.mockRejectedValue(new Error("offline"));
    const el = await mount("/search?q=lost&type=projects&genre=Drama");
    await finishDebounce();

    expect(el.querySelector('input[type="search"]').value).toBe("lost");
    expect(el.textContent).toContain("Search is unavailable");
    expect(el.textContent).toContain("Drama");
    expect(Array.from(el.querySelectorAll("button")).some((button) => button.textContent.includes("Try again"))).toBe(true);
  });

  it("requests and appends the next server page only when Load more is chosen", async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          users: [],
          scripts: [{ _id: "s1", title: "First", creator: { username: "one" } }],
          pagination: {
            page: 1,
            limit: 10,
            users: { total: 0, hasMore: false },
            scripts: { total: 2, hasMore: true },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          users: [],
          scripts: [{ _id: "s2", title: "Second", creator: { username: "two" } }],
          pagination: {
            page: 2,
            limit: 10,
            users: { total: 0, hasMore: false },
            scripts: { total: 2, hasMore: false },
          },
        },
      });

    const el = await mount("/search?q=project&type=projects");
    await finishDebounce();
    const loadMore = Array.from(el.querySelectorAll("button"))
      .find((button) => button.textContent.includes("Load 1 more result"));

    expect(loadMore).toBeTruthy();
    await act(async () => {
      loadMore.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get.mock.calls[1][1].params.get("page")).toBe("2");
    expect(el.textContent).toContain("First");
    expect(el.textContent).toContain("Second");
    expect(el.textContent).toContain("Showing 2 of 2 results");
  });
});
