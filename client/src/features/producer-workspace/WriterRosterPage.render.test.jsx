// @vitest-environment happy-dom
/*
 * Mounts the real page.
 *
 * writerRoster.test.js covers the derivations; this covers the wiring — that
 * the request is built the way the design claims, that a facet toggle really
 * does filter without going back to the server, that the gate fires on the
 * profile action rather than on the row, and that each of the states reaches
 * the DOM. Those are the seams the page this replaces got wrong.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";

const apiGet = vi.fn();
vi.mock("../../services/api", () => ({
  default: { get: (...args) => apiGet(...args) },
}));

const openPricingModal = vi.fn();
vi.mock("../../context/AuthModalContext", () => ({
  useAuthModal: () => ({ openPricingModal }),
}));

const { default: WriterRosterPage } = await import("./WriterRosterPage");

const writer = (id, overrides = {}) => ({
  _id: id,
  name: overrides.name || `Writer ${id}`,
  bio: overrides.bio ?? `Bio ${id}`,
  scriptCount: overrides.scriptCount ?? 4,
  totalViews: overrides.totalViews ?? 1200,
  avgScore: overrides.avgScore ?? 70,
  followerCount: overrides.followerCount ?? 90,
  writerProfile: {
    genres: overrides.genres || ["Thriller"],
    wgaMember: overrides.wga || false,
    sgaMember: false,
    representationStatus: "unrepresented",
  },
});

const ROSTER = [
  writer("a", { name: "Meera Raghunathan", genres: ["Thriller"], wga: true, avgScore: 87 }),
  writer("b", { name: "Wei Chen", genres: ["Drama"], avgScore: 81 }),
  writer("c", { name: "Rahul Deshpande", genres: ["Crime", "Thriller"], avgScore: 0, scriptCount: 0 }),
];

let container;
let root;

const producer = {
  _id: "u1", role: "producer", email: "harlan@vance-pictures.com", name: "Harlan Vance",
};

const mount = async (user = producer) => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/writers"]}>
        <AuthContext.Provider value={{ user }}>
          <WriterRosterPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
  });
};

const text = () => container.textContent;
const all = (selector) => Array.from(container.querySelectorAll(selector));
const byText = (selector, needle) =>
  all(selector).find((el) => el.textContent.includes(needle));

const click = async (el) => {
  expect(el, "element to click was not found").toBeTruthy();
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(() => {
  window.localStorage.clear();
  apiGet.mockReset();
  openPricingModal.mockReset();
  apiGet.mockImplementation((url) => {
    if (url.startsWith("/users/writers")) return Promise.resolve({ data: ROSTER });
    if (url === "/users/me") return Promise.resolve({ data: {} });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("WriterRosterPage — the register", () => {
  it("renders a row per writer, ranked", async () => {
    await mount();
    const rows = all(".ckr-row");
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("Meera Raghunathan");
    expect(rows[0].querySelector(".ckr-rank").textContent).toBe("1");
  });

  it("marks the top three so the front rank survives filtering", async () => {
    await mount();
    expect(all(".ckr-row.is-lead")).toHaveLength(3);
  });

  it("shows an em dash for an unscored writer rather than a zero", async () => {
    await mount();
    const rahul = byText(".ckr-row", "Rahul Deshpande");
    expect(rahul.querySelector(".ckr-m--none").textContent).toBe("—");
  });

  it("labels the board figures as describing this page only", async () => {
    await mount();
    const board = container.querySelector(".ckr-board");
    expect(board.textContent).toContain("3 writers");
    expect(board.textContent).toContain("8 scripts");
    expect(board.textContent).toContain("this page");
  });

  it("builds the request from sort and search only", async () => {
    await mount();
    const url = apiGet.mock.calls.map(([u]) => u).find((u) => u.startsWith("/users/writers"));
    expect(url).toBe("/users/writers?sort=reputation");
    expect(url).not.toContain("genre");
  });
});

describe("WriterRosterPage — facets", () => {
  it("filters client-side, without a second request", async () => {
    await mount();
    const before = apiGet.mock.calls.filter(([u]) => u.startsWith("/users/writers")).length;

    await click(byText(".ckr-opt", "Drama"));

    expect(all(".ckr-row")).toHaveLength(1);
    expect(text()).toContain("Wei Chen");
    const after = apiGet.mock.calls.filter(([u]) => u.startsWith("/users/writers")).length;
    expect(after, "a facet toggle must not refetch").toBe(before);
  });

  it("counts each option over the returned set", async () => {
    await mount();
    const thriller = byText(".ckr-opt", "Thriller");
    // Meera and Rahul both write Thriller.
    expect(thriller.querySelector(".ckr-opt__n").textContent).toContain("2");
  });

  it("puts a removable chip up for every active filter", async () => {
    await mount();
    await click(byText(".ckr-opt", "Drama"));
    expect(byText(".ckr-chip", "Drama")).toBeTruthy();

    // Clearable while results are on screen — not only from the empty state.
    await click(byText(".ckr-chip", "Drama"));
    expect(all(".ckr-row")).toHaveLength(3);
  });

  it("offers the filtered-empty state with a way out", async () => {
    await mount();
    await click(byText(".ckr-opt", "Drama"));
    await click(byText(".ckr-opt", "WGA member"));

    expect(all(".ckr-row")).toHaveLength(0);
    expect(text()).toContain("Nothing matches these filters");

    await click(byText(".ckr-btn", "Clear all filters"));
    expect(all(".ckr-row")).toHaveLength(3);
  });
});

describe("WriterRosterPage — the detail pane", () => {
  it("rests until a row is chosen", async () => {
    await mount();
    expect(text()).toContain("No writer selected");
  });

  it("fills from the selected row without navigating", async () => {
    await mount();
    await click(byText(".ckr-row", "Wei Chen"));

    const pane = container.querySelector(".ckr-pane");
    expect(pane.querySelector(".ckr-pane__name").textContent).toBe("Wei Chen");
    expect(pane.querySelector(".ckr-pane__bio").getAttribute("title")).toBe("Bio b");
    expect(all(".ckr-row")).toHaveLength(3);
  });

  it("gives an unblocked viewer a real link to the profile", async () => {
    await mount();
    await click(byText(".ckr-row", "Wei Chen"));

    const action = byText(".ckr-pane .ckr-btn", "Open full profile");
    expect(action.tagName).toBe("A");
    expect(action.getAttribute("href")).toContain("/profile/b");
  });
});

describe("WriterRosterPage — profile access", () => {
  const personalEmailProducer = { _id: "u2", role: "producer", email: "harlan@gmail.com" };

  it("keeps the whole register readable for an industry viewer", async () => {
    await mount(personalEmailProducer);
    expect(all(".ckr-row")).toHaveLength(3);

    await click(byText(".ckr-row", "Wei Chen"));
    expect(container.querySelector(".ckr-pane__name").textContent).toBe("Wei Chen");
  });

  it("does not revive the retired personal-email restriction", async () => {
    await mount(personalEmailProducer);
    await click(byText(".ckr-row", "Wei Chen"));

    const action = byText(".ckr-pane .ckr-btn", "Open full profile");
    expect(action.tagName).toBe("A");
    expect(action.getAttribute("href")).toContain("/profile/b");
    expect(text()).not.toContain("Access Restricted");
  });

  it("does not block a writer or a reader on a personal address", async () => {
    // The predicate this page shares with /featured is role-aware; the one it
    // replaced blocked everyone whose address was not a business domain.
    await mount({ _id: "u3", role: "writer", email: "ada@gmail.com" });
    await click(byText(".ckr-row", "Wei Chen"));
    expect(byText(".ckr-pane .ckr-btn", "Open full profile").tagName).toBe("A");
  });

  it("does not block a paying subscriber on a personal address", async () => {
    await mount({
      _id: "u4",
      role: "producer",
      email: "harlan@gmail.com",
      subscription: { accessTier: "film_industry_professional", accessStatus: "active" },
    });
    await click(byText(".ckr-row", "Wei Chen"));
    expect(byText(".ckr-pane .ckr-btn", "Open full profile").tagName).toBe("A");
  });
});

describe("WriterRosterPage — states", () => {
  it("shows a structure-matched skeleton before the first response", async () => {
    let release;
    apiGet.mockImplementation((url) => {
      if (url.startsWith("/users/writers")) return new Promise((r) => { release = r; });
      return Promise.resolve({ data: {} });
    });
    await mount();

    expect(all(".ckr-row--skel").length).toBeGreaterThan(0);
    expect(container.querySelector(".ckr-rows").getAttribute("aria-busy")).toBe("true");

    await act(async () => { release({ data: ROSTER }); });
    expect(all(".ckr-row--skel")).toHaveLength(0);
  });

  it("keeps the facets and offers a retry when the request fails", async () => {
    apiGet.mockImplementation((url) => (url.startsWith("/users/writers")
      ? Promise.reject(new Error("500"))
      : Promise.resolve({ data: {} })));
    await mount();

    expect(text()).toContain("We couldn’t load the writer roster");
    expect(container.querySelector("[role='alert']")).toBeTruthy();
    // The rail survives — this is the argument for it not being a drawer.
    expect(all(".ckr-rail .ckr-opt").length).toBeGreaterThan(0);
    expect(text()).toContain("Counts unavailable");
    expect(byText(".ckr-btn", "Retry")).toBeTruthy();
  });

  it("recovers on retry", async () => {
    let fail = true;
    apiGet.mockImplementation((url) => {
      if (!url.startsWith("/users/writers")) return Promise.resolve({ data: {} });
      return fail ? Promise.reject(new Error("500")) : Promise.resolve({ data: ROSTER });
    });
    await mount();
    fail = false;

    await click(byText(".ckr-btn", "Retry"));
    expect(all(".ckr-row")).toHaveLength(3);
  });

  it("says so when the roster is genuinely empty", async () => {
    apiGet.mockImplementation((url) => Promise.resolve({
      data: url.startsWith("/users/writers") ? [] : {},
    }));
    await mount();
    expect(text()).toContain("No writers in the roster yet");
  });

  it("notes the cap when a full page comes back", async () => {
    const hundred = Array.from({ length: 100 }, (_, i) => writer(`w${i}`));
    apiGet.mockImplementation((url) => Promise.resolve({
      data: url.startsWith("/users/writers") ? hundred : {},
    }));
    await mount();
    expect(text()).toContain("Showing the top 100 writers");
  });
});

describe("WriterRosterPage — the mandate", () => {
  const withMandate = () => {
    apiGet.mockImplementation((url) => {
      if (url.startsWith("/users/writers")) return Promise.resolve({ data: ROSTER });
      if (url === "/users/me") {
        return Promise.resolve({
          data: { industryProfile: { mandates: { genres: ["Crime"], excludeGenres: [] } } },
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });
  };

  it("reads the mandate from /users/me, which is where it actually lives", async () => {
    withMandate();
    await mount();
    expect(apiGet.mock.calls.some(([u]) => u === "/users/me")).toBe(true);
    expect(byText(".ckr-opt", "Matches my mandate")).toBeTruthy();
  });

  it("marks matching rows and filters to them", async () => {
    withMandate();
    await mount();

    expect(all(".ckr-dot")).toHaveLength(1);
    await click(byText(".ckr-opt", "Matches my mandate"));
    expect(all(".ckr-row")).toHaveLength(1);
    expect(text()).toContain("Rahul Deshpande");
  });

  it("calls it an overlap, never a score", async () => {
    withMandate();
    await mount();
    await click(byText(".ckr-row", "Rahul Deshpande"));
    expect(text()).toContain("Genre overlap only — not a match score");
  });

  it("hides the facet entirely when no mandate is set", async () => {
    await mount();
    expect(byText(".ckr-opt", "Matches my mandate")).toBeFalsy();
  });
});

describe("WriterRosterPage — shareable URL", () => {
  it("restores facets and sort from the query string on mount", async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/writers?genre=Drama&sort=score"]}>
          <AuthContext.Provider value={{ user: producer }}>
            <WriterRosterPage />
          </AuthContext.Provider>
        </MemoryRouter>,
      );
    });

    expect(all(".ckr-row")).toHaveLength(1);
    expect(text()).toContain("Wei Chen");
    expect(byText(".ckr-opt", "Drama").getAttribute("aria-pressed")).toBe("true");

    const url = apiGet.mock.calls.map(([u]) => u).find((u) => u.startsWith("/users/writers"));
    expect(url).toBe("/users/writers?sort=score");
  });

  it("writes the facet back to the URL so the view can be sent to someone", async () => {
    const Probe = () => {
      const location = useLocation();
      return <b data-testid="search">{location.search}</b>;
    };

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/writers"]}>
          <AuthContext.Provider value={{ user: producer }}>
            <WriterRosterPage />
            <Probe />
          </AuthContext.Provider>
        </MemoryRouter>,
      );
    });

    const search = () => container.querySelector("[data-testid='search']").textContent;
    expect(search()).toBe("");

    await click(byText(".ckr-opt", "Drama"));
    expect(search()).toBe("?genre=Drama");

    await click(byText(".ckr-sort", "Score"));
    expect(search()).toBe("?sort=score&genre=Drama");
  });
});

describe("WriterRosterPage — structure", () => {
  it("exposes the register as a grid with sortable column headers", async () => {
    await mount();
    expect(container.querySelector("[role='grid']")).toBeTruthy();
    expect(all("[role='rowgroup']").length).toBe(2);

    const score = all("[role='columnheader']").find((el) => el.textContent.includes("Score"));
    expect(score.getAttribute("aria-sort")).toBe("none");

    await click(score.querySelector("button"));
    expect(score.getAttribute("aria-sort")).toBe("descending");
  });

  it("keeps exactly one h1 at every width", async () => {
    await mount();
    expect(all("h1")).toHaveLength(1);
    expect(container.querySelector("h1").textContent).toBe("Writers");
  });

  it("leaves one tab stop on the register", async () => {
    await mount();
    expect(all(".ckr-row[tabindex='0']")).toHaveLength(1);
    expect(all(".ckr-row[tabindex='-1']")).toHaveLength(2);
  });

  it("provides accessible resize handles for both side panels", async () => {
    await mount();

    const filters = container.querySelector("[aria-label='Resize filters panel']");
    const profile = container.querySelector("[aria-label='Resize profile panel']");
    expect(filters.getAttribute("role")).toBe("separator");
    expect(profile.getAttribute("role")).toBe("separator");

    const before = Number(filters.getAttribute("aria-valuenow"));
    await act(async () => {
      filters.dispatchEvent(new window.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
      }));
    });
    expect(Number(filters.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
  });

  it("collapses and restores the profile panel", async () => {
    await mount();

    await click(container.querySelector("[aria-label='Hide profile panel']"));
    expect(container.querySelector(".ckr-pane").classList.contains("is-collapsed")).toBe(true);

    await click(container.querySelector("[aria-label='Show profile panel']"));
    expect(container.querySelector(".ckr-pane").classList.contains("is-collapsed")).toBe(false);
  });

  it("renders bundled SVG icons instead of material-icon text", async () => {
    await mount();
    expect(container.querySelector(".ckr-icon").tagName.toLowerCase()).toBe("svg");
    expect(text()).not.toContain("arrow_downward");
  });
});
