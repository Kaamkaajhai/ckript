// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import { ToastContext } from "../../components/feedback/toastContext";
import FeaturedProjectsMobile from "./FeaturedProjectsMobile";

vi.mock("../../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mandated = {
  _id: "viewer-1",
  name: "Dev Malhotra",
  role: "investor",
  email: "dev@gmail.com",
  favoriteScripts: [],
  industryProfile: { mandates: { genres: ["Drama"], formats: ["Movie"], excludeGenres: [], specificHooks: [] } },
};
const writer = { _id: "viewer-2", name: "Asha", role: "writer", favoriteScripts: [] };
const reader = { _id: "reader-1", name: "Riya", role: "reader", favoriteScripts: [] };

const toast = {
  show: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn(),
  info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(),
};

const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();

const project = (id, title, extra = {}) => ({
  _id: id,
  title,
  logline: `${title} logline`,
  genre: "Drama",
  contentType: "movie",
  views: 4000,
  readsCount: 500,
  scriptScore: { overall: 88 },
  creator: { _id: `writer-${id}`, name: "Mira Sen", username: "mira" },
  ...extra,
});

const spotlight = (id, title, days = 19) => project(id, title, {
  promotion: { spotlightActive: true, spotlightEndAt: inDays(days) },
});

const page = (scripts, over = {}) => ({
  scripts,
  pagination: { page: 1, limit: 12, total: scripts.length, hasMore: false, ...over },
});

let container;
let root;

async function mount(entry = "/featured", { user = mandated, ...props } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
          <ToastContext.Provider value={toast}>
            <div className="ckm"><FeaturedProjectsMobile user={user} {...props} /></div>
          </ToastContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

const buttonWith = (el, text) => Array.from(el.querySelectorAll("button"))
  .find((button) => button.textContent.includes(text));

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("FeaturedProjectsMobile", () => {
  it("renders one h1, the glance strip and all four sections", async () => {
    const el = await mount("/featured", {
      previewData: {
        featured: page([spotlight("s1", "The Monsoon Archive")]),
        ranked: page(
          [spotlight("s1", "The Monsoon Archive"), project("r2", "A Quiet Ledger")],
          { total: 14, hasMore: true },
        ),
      },
    });

    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("Today's lead");
    expect(el.textContent).toContain("Spotlight");
    expect(el.textContent).toContain("14 featured projects");
    expect(el.textContent).toContain("Matches your mandate");
    // The glance strip states the two counts it can know.
    expect(el.textContent).toContain("Live spotlights");
    expect(el.textContent).toContain("In this list");
  });

  /*
   * The lead's explanation has a priority order, and the order is the point:
   * mandate fit outranks paid placement, which outranks raw performance. A
   * viewer whose brief the project satisfies should be told THAT, not that
   * someone paid — so the two branches need two different viewers to reach.
   */
  it("names paid placement as the reason when placement is the reason", async () => {
    const el = await mount("/featured", {
      user: writer, // no mandate, so placement is the strongest available reason
      previewData: {
        featured: page([spotlight("s1", "The Monsoon Archive", 19)]),
        ranked: page([spotlight("s1", "The Monsoon Archive", 19)]),
      },
    });
    expect(el.textContent).toContain("Leading on paid placement");
    expect(el.textContent).toContain("another 19 days");
  });

  it("names mandate fit ahead of paid placement, because it is the stronger reason", async () => {
    const el = await mount("/featured", {
      previewData: {
        featured: page([spotlight("s1", "The Monsoon Archive", 19)]),
        ranked: page([spotlight("s1", "The Monsoon Archive", 19)]),
      },
    });
    expect(el.textContent).toContain("Shown first because it matches your mandate");
    expect(el.textContent).not.toContain("Leading on paid placement");
  });

  it("falls back to the ranked list for a lead when nobody bought placement", async () => {
    const el = await mount("/featured", {
      previewData: {
        featured: page([]),
        ranked: page([project("r1", "A Quiet Ledger")]),
      },
    });
    expect(el.textContent).toContain("Today's lead");
    expect(el.textContent).toContain("A Quiet Ledger");
    // No spotlight section at all, rather than an empty one.
    expect(el.textContent).not.toContain("Writers bought this placement");
  });

  it("treats an expired spotlight window as expired, whatever the server ranked", async () => {
    const el = await mount("/featured", {
      previewData: {
        // Active flag, but the window closed yesterday.
        featured: page([project("s1", "Stale Placement", {
          promotion: { spotlightActive: true, spotlightEndAt: inDays(-1) },
        })]),
        ranked: page([project("r1", "A Quiet Ledger")]),
      },
    });
    expect(el.textContent).not.toContain("Writers bought this placement");
    expect(el.textContent).toContain("A Quiet Ledger");
  });

  it("hides the mandate section entirely for a viewer with no mandate", async () => {
    const el = await mount("/featured", {
      user: writer,
      previewData: { featured: page([]), ranked: page([project("r1", "A Quiet Ledger")]) },
    });
    expect(el.textContent).not.toContain("Matches your mandate");
    expect(el.textContent).toContain("No mandate set");
  });

  it("restores every facet from the URL and sends them to the ranked source", async () => {
    api.get.mockResolvedValue({ data: page([project("r1", "A Quiet Ledger")]) });
    const el = await mount("/featured?sort=views&genre=Horror&budget=medium&pricing=premium");

    const rankedCall = api.get.mock.calls.find(([url]) => url.startsWith("/scripts?"));
    expect(rankedCall[0]).toContain("sort=views");
    expect(rankedCall[0]).toContain("genre=Horror");
    expect(rankedCall[0]).toContain("budget=medium");
    expect(rankedCall[0]).toContain("premium=true");
    expect(rankedCall[0]).toContain("goldOnly=true");
    expect(rankedCall[0]).toContain("page=1");
    expect(el.querySelector("select").value).toBe("views");
  });

  it("does not narrow the editorial set by the viewer's facets", async () => {
    api.get.mockResolvedValue({ data: page([]) });
    await mount("/featured?genre=Horror");
    const editorialCall = api.get.mock.calls.find(([url]) => url.startsWith("/scripts/featured"));
    expect(editorialCall[0]).not.toContain("genre");
    expect(editorialCall[0]).toContain("limit=12");
  });

  it("requests and appends an explicit second server page", async () => {
    api.get
      .mockResolvedValueOnce({ data: page([]) })
      .mockResolvedValueOnce({ data: page([project("r1", "First Signal")], { total: 2, hasMore: true }) })
      .mockResolvedValueOnce({
        data: { scripts: [project("r2", "Second Signal")], pagination: { page: 2, limit: 12, total: 2, hasMore: false } },
      });

    const el = await mount();
    const loadMore = buttonWith(el, "Load 1 more project");
    expect(loadMore).toBeTruthy();

    await act(async () => {
      loadMore.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.get.mock.calls[2][0]).toContain("page=2");
    expect(el.textContent).toContain("First Signal");
    expect(el.textContent).toContain("Second Signal");
  });

  it("degrades one section rather than the screen when a single source fails", async () => {
    api.get.mockImplementation((url) => (url.startsWith("/scripts/featured")
      ? Promise.reject(new Error("offline"))
      : Promise.resolve({ data: page([project("r1", "A Quiet Ledger")]) })));

    const el = await mount();
    expect(el.textContent).not.toContain("Featured projects are unavailable");
    expect(el.textContent).toContain("A Quiet Ledger");
  });

  it("reports an error and keeps the URL facets when BOTH sources fail", async () => {
    api.get.mockRejectedValue(new Error("offline"));
    const el = await mount("/featured?sort=score&pricing=premium");
    expect(el.textContent).toContain("Featured projects are unavailable");
    expect(el.textContent).toContain("Paid only");
    expect(el.querySelector("select").value).toBe("score");
  });

  it("does not revive the personal-email restriction removed from the shared product policy", async () => {
    const el = await mount("/featured", {
      previewData: { featured: page([]), ranked: page([project("r1", "Restricted Signal")]) },
    });
    expect(el.querySelector('a[href="/restricted-signal/mira"]')).toBeTruthy();
    expect(el.textContent).not.toContain("Access Restricted");
    expect(el.textContent).not.toContain("business email");
  });

  it("keeps lead and ranked project opens inside the reader route family", async () => {
    const el = await mount("/featured", {
      user: reader,
      previewData: { featured: page([]), ranked: page([project("r1", "Reader Signal")]) },
    });
    expect(el.querySelectorAll('a[href="/reader/script/r1"]').length).toBeGreaterThanOrEqual(2);
    expect(el.querySelector('a[href="/reader-signal/mira"]')).toBeNull();
  });

  it("offers no eight-column table on a phone", async () => {
    const el = await mount("/featured", {
      previewData: { featured: page([]), ranked: page([project("r1", "A Quiet Ledger")]) },
    });
    expect(buttonWith(el, "Open as table")).toBeFalsy();
  });
});
