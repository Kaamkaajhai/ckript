// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import { ToastContext } from "../../components/feedback/toastContext";
import { READER_HOME_STATUS } from "../../../pages/reader-home/readerHome";
import ReaderHomeMobile from "./ReaderHomeMobile";
import ReaderDiscoverMobile from "./ReaderDiscoverMobile";

const mocks = vi.hoisted(() => ({ home: null, discover: null }));
vi.mock("../../../pages/reader-home/useReaderHome", () => ({
  useReaderHome: () => mocks.home,
  useReaderDiscover: () => mocks.discover,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const user = { _id: "reader-1", name: "Riya Sen", role: "reader", favoriteScripts: [] };
const toast = { show: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() };
const project = (id, title) => ({ _id: id, title, status: "published", genre: "Drama", creator: { _id: `w-${id}`, name: "Mira" } });
const readyHome = (overrides = {}) => ({ status: READER_HOME_STATUS.READY, data: { fresh: [], read: [], favorites: [], counts: {}, degraded: {}, ...overrides }, retry: vi.fn() });
const readyDiscover = (overrides = {}) => ({ status: READER_HOME_STATUS.READY, data: { scripts: [], page: 1, total: 0, totalPages: 1, hasPrevious: false, hasNext: false, ...overrides }, retry: vi.fn() });

let container;
let root;
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}
async function render(Component, entry) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={[entry]}><AuthContext.Provider value={{ user, setUser: vi.fn() }}><ToastContext.Provider value={toast}><div className="ckm"><Component user={user} /></div><LocationProbe /></ToastContext.Provider></AuthContext.Provider></MemoryRouter>);
    await Promise.resolve();
  });
  return container;
}

beforeEach(() => { mocks.home = readyHome(); mocks.discover = readyDiscover(); vi.clearAllMocks(); });
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; container = null; });

describe("reader native home and discover", () => {
  it("renders private shelves, fresh projects, and reader-only project links", async () => {
    mocks.home = readyHome({ read: [project("read", "Read Again")], favorites: [project("fav", "Saved Story")], fresh: [project("fresh", "Fresh Story")] });
    const el = await render(ReaderHomeMobile, "/reader");
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("Read again");
    expect(el.textContent).toContain("Favorites");
    expect(el.textContent).toContain("Fresh projects");
    expect(el.querySelector('[aria-current="page"]')?.textContent).toContain("Home");
    const projectButton = [...el.querySelectorAll("button")].find((button) => button.textContent === "Read Again");
    act(() => projectButton.click());
    expect(el.querySelector('[data-testid="location"]').textContent).toBe("/reader/script/read");
  });

  it("keeps a useful home visible when one shelf fails", async () => {
    mocks.home = readyHome({ fresh: [project("fresh", "Fresh Story")], degraded: { read: true, favorites: false, fresh: false } });
    const el = await render(ReaderHomeMobile, "/reader");
    expect(el.textContent).toContain("Some shelves are unavailable");
    expect(el.textContent).toContain("Fresh Story");
  });

  it("renders URL-owned discovery results and reader detail destinations", async () => {
    mocks.discover = readyDiscover({ scripts: [project("p1", "The Night Train")], page: 2, total: 13, totalPages: 2, hasPrevious: true });
    const el = await render(ReaderDiscoverMobile, "/reader/search?q=night&genre=Drama&page=2");
    expect(el.querySelector('input[type="search"]').value).toBe("night");
    expect(el.textContent).toContain("13 results · page 2 of 2");
    expect(el.querySelector('[aria-current="page"]')?.textContent).toContain("Discover");
    const projectButton = [...el.querySelectorAll("button")].find((button) => button.textContent === "The Night Train");
    act(() => projectButton.click());
    expect(el.querySelector('[data-testid="location"]').textContent).toBe("/reader/script/p1");
  });

  it("renders explicit empty and failure states", async () => {
    let el = await render(ReaderDiscoverMobile, "/reader/search?q=missing");
    expect(el.textContent).toContain("No projects for “missing”");
    act(() => root.unmount()); container.remove(); root = null; container = null;
    mocks.discover = { status: READER_HOME_STATUS.FAILED, failure: { message: "Offline" }, retry: vi.fn() };
    el = await render(ReaderDiscoverMobile, "/reader/search");
    expect(el.textContent).toContain("Reader discovery is unavailable");
    expect(el.textContent).toContain("Offline");
  });
});
