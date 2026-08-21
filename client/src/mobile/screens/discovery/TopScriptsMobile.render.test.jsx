// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import { ToastContext } from "../../components/feedback/toastContext";
import TopScriptsMobile from "./TopScriptsMobile";

vi.mock("../../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const viewer = {
  _id: "viewer-1",
  name: "Dev Malhotra",
  role: "investor",
  email: "dev@gmail.com",
  favoriteScripts: [],
};
const toast = {
  show: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn(),
  info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(),
};
const project = (id, title, score = 80) => ({
  _id: id,
  title,
  logline: `${title} logline`,
  genre: "Drama",
  platformScore: score,
  scriptScore: { overall: score + 1 },
  engagementScore: score - 2,
  trendScore: score + 20,
  creator: { _id: `writer-${id}`, name: "Mira Sen", username: "mira" },
});

let container;
let root;

async function mount(entry = "/top-script", props = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user: viewer, setUser: vi.fn() }}>
          <ToastContext.Provider value={toast}>
            <div className="ckm"><TopScriptsMobile user={viewer} {...props} /></div>
          </ToastContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("TopScriptsMobile", () => {
  it("renders ranked cards with the active metric and bounded paging truth", async () => {
    const el = await mount("/top-script?sort=trending&genre=Drama", {
      previewData: {
        scripts: [project("one", "First Signal", 91), project("two", "Second Signal", 84)],
        pagination: { page: 1, limit: 12, total: 14, hasMore: true },
      },
    });

    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.textContent).toContain("14 ranked projects");
    expect(el.textContent).toContain("Rank 1");
    expect(el.textContent).toContain("111 trend score");
    expect(el.textContent).toContain("Drama");
    expect(Array.from(el.querySelectorAll("button")).some((button) => button.textContent.includes("Load 12 more projects"))).toBe(true);
  });

  it("requests and appends an explicit second server page", async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          scripts: [project("one", "First Signal")],
          pagination: { page: 1, limit: 12, total: 2, hasMore: true },
        },
      })
      .mockResolvedValueOnce({
        data: {
          scripts: [project("two", "Second Signal")],
          pagination: { page: 2, limit: 12, total: 2, hasMore: false },
        },
      });

    const el = await mount();
    const loadMore = Array.from(el.querySelectorAll("button"))
      .find((button) => button.textContent.includes("Load 1 more project"));
    expect(api.get.mock.calls[0][1].params.get("page")).toBe("1");

    await act(async () => {
      loadMore.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.get.mock.calls[1][1].params.get("page")).toBe("2");
    expect(el.textContent).toContain("First Signal");
    expect(el.textContent).toContain("Second Signal");
  });

  it("does not revive the personal-email restriction removed from the shared product policy", async () => {
    const el = await mount("/top-script", {
      previewData: {
        scripts: [project("one", "Restricted Signal")],
        pagination: { page: 1, limit: 12, total: 1, hasMore: false },
      },
    });
    expect(el.querySelector('a[href="/restricted-signal/mira"]')).toBeTruthy();
    expect(el.textContent).not.toContain("Reading is restricted");
  });

  it("keeps URL-owned filters visible after an initial failure", async () => {
    api.get.mockRejectedValue(new Error("offline"));
    const el = await mount("/top-script?sort=score&pricing=premium");
    expect(el.textContent).toContain("Rankings are unavailable");
    expect(el.textContent).toContain("Paid only");
    expect(el.querySelector("select").value).toBe("score");
  });
});
