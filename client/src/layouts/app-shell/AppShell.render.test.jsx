// @vitest-environment happy-dom
/*
 * Mounts the real shell for each audience.
 *
 * The unit tests above cover the nav MODEL; this covers the wiring — that the
 * model reaches the DOM, that a producer's rail is actually built from the
 * industry preset, and that the drawer's collection comes from the audience's
 * endpoint rather than the writer's. Those are the seams that broke when the
 * shell had the writer hardcoded into it.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* The shell opens a socket and polls two endpoints on mount. */
const apiGet = vi.fn();
vi.mock("../../services/api", () => ({
  default: {
    get: (...args) => apiGet(...args),
    put: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock("socket.io-client", () => ({
  io: () => ({ on: vi.fn(), onAny: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }),
}));

/* Keep the render synchronous and free of layout animation. */
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => children,
  motion: { div: ({ children, ...rest }) => <div {...rest}>{children}</div> },
}));

vi.mock("../../components/BrandLogo", () => ({
  default: () => <img alt="Ckript" />,
}));

import { AuthContext } from "../../context/AuthContext";
import AppShell from "./AppShell";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const USERS = {
  writer:   { _id: "u1", name: "Ada Lovelace", role: "writer" },
  producer: { _id: "u2", name: "Sam Reed", role: "producer" },
  director: { _id: "u3", name: "Ida Vane", role: "director" },
  investor: { _id: "u4", name: "Cy Mendez", role: "investor" },
};

/*
 * The shell deliberately defers its first notification/message fetch by one
 * macrotask so it does not compete with the page's own initial request. `act`
 * flushes microtasks but not timers, so tests that care about the badge have to
 * let that timer run.
 */
const settle = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

const mount = async (user, { route = "/" } = {}) => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={{ user, logout: vi.fn(), setUser: vi.fn() }}>
          <AppShell variant="page">
            <p>page content</p>
          </AppShell>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
  });
  await settle();
};

/* Visible label text of every link in a given nav surface. */
const labelsIn = (selector) =>
  Array.from(container.querySelectorAll(`${selector} a`))
    .map((a) => a.textContent.trim())
    .filter(Boolean);

const hrefsIn = (selector) =>
  Array.from(container.querySelectorAll(`${selector} a`))
    .map((a) => a.getAttribute("href"));

beforeEach(() => {
  apiGet.mockReset();
  // Default: no notifications, no unread messages, empty collection.
  apiGet.mockResolvedValue({ data: [] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.style.overflow = "";
  vi.clearAllTimers();
});

describe("AppShell — renders for the industry audience", () => {
  it("gives a producer the rail, the topbar and the burger", async () => {
    await mount(USERS.producer);

    expect(container.querySelector(".ck-sidebar")).toBeTruthy();
    expect(container.querySelector(".ck-header")).toBeTruthy();
    expect(container.querySelector(".ck-sidebar__menu-btn")).toBeTruthy();
    expect(container.querySelector(".ck-drawer")).toBeTruthy();
    expect(container.querySelector(".ck-mobile-nav")).toBeTruthy();
    expect(container.textContent).toContain("page content");
  });

  it("builds the producer's rail from the industry preset, not the writer's", async () => {
    await mount(USERS.producer);
    const rail = hrefsIn(".ck-sidebar__nav");

    expect(rail).toContain("/home");
    expect(rail).toContain("/writers");
    // The writer-only destinations that used to leak through.
    expect(rail).not.toContain("/upload");
    expect(rail).not.toContain("/create-project");
    expect(rail).not.toContain("/challenge");
  });

  it("labels a director as a Director in the drawer, not a Producer", async () => {
    await mount(USERS.director);
    expect(container.querySelector(".ck-drawer__role").textContent).toBe("Director");
  });

  it("points the logo at the industry home rather than the writer dashboard", async () => {
    await mount(USERS.producer);
    expect(container.querySelector(".ck-header__logo").getAttribute("href")).toBe("/home");
  });

  it("gives investors the same chrome as producers", async () => {
    // The profile link is per-user by design, so compare everything else.
    const shared = (list) => list.filter((href) => !href.startsWith("/profile/"));

    await mount(USERS.investor);
    const railForInvestor = shared(hrefsIn(".ck-sidebar__nav"));

    await act(async () => root.unmount());
    root = createRoot(container);
    await mount(USERS.producer);

    expect(railForInvestor).toEqual(shared(hrefsIn(".ck-sidebar__nav")));
    expect(railForInvestor.length).toBeGreaterThan(0);
  });
});

describe("AppShell — renders for writers", () => {
  it("keeps the writer's own destinations", async () => {
    await mount(USERS.writer);
    const rail = hrefsIn(".ck-sidebar__nav");

    expect(rail).toContain("/dashboard");
    expect(rail).toContain("/create-project");
    expect(rail).toContain("/upload");
    expect(rail).toContain("/challenge");
  });

  it("marks the current destination as active exactly once", async () => {
    await mount(USERS.writer, { route: "/upload" });
    const active = container.querySelectorAll(".ck-sidebar__nav .ck-nav-item.active");
    expect(active.length).toBe(1);
    expect(active[0].getAttribute("href")).toBe("/upload");
  });

  /*
   * A plain startsWith would light up /upload while on /uploads-report. The
   * shell's matcher works on segment boundaries.
   */
  it("does not activate a rail item on a merely similar path", async () => {
    await mount(USERS.writer, { route: "/uploads-report" });
    const active = Array.from(
      container.querySelectorAll(".ck-sidebar__nav .ck-nav-item.active"),
    ).map((a) => a.getAttribute("href"));
    expect(active).not.toContain("/upload");
  });
});

describe("AppShell — the drawer's collection is per audience", () => {
  it("fetches nothing until the drawer is opened", async () => {
    await mount(USERS.producer);
    expect(apiGet.mock.calls.map(([url]) => url)).not.toContain("/users/watchlist");
  });

  it("loads the producer's Watchlist from the industry endpoint", async () => {
    const script = {
      _id: "s1",
      title: "Nightjar",
      creator: { writerProfile: { username: "ada" } },
    };
    apiGet.mockImplementation((url) =>
      Promise.resolve({ data: url === "/users/watchlist" ? [script] : [] }));

    await mount(USERS.producer);
    await act(async () => {
      container.querySelector(".ck-sidebar__menu-btn").click();
    });

    expect(apiGet.mock.calls.map(([url]) => url)).toContain("/users/watchlist");
    expect(container.querySelector(".ck-drawer__section").textContent).toContain("Watchlist");
    expect(labelsIn(".ck-drawer__recents")).toContain("Nightjar");
  });

  it("loads the writer's projects from the writer endpoint instead", async () => {
    apiGet.mockImplementation((url) =>
      Promise.resolve({ data: url === "/scripts/mine" ? [{ _id: "s2", title: "Ledger" }] : [] }));

    await mount(USERS.writer);
    await act(async () => {
      container.querySelector(".ck-sidebar__menu-btn").click();
    });

    const requested = apiGet.mock.calls.map(([url]) => url);
    expect(requested).toContain("/scripts/mine");
    expect(requested).not.toContain("/users/watchlist");
    expect(container.querySelector(".ck-drawer__section").textContent).toContain("My Projects");
  });

  it("omits the section entirely when the collection is empty", async () => {
    await mount(USERS.producer);
    await act(async () => {
      container.querySelector(".ck-sidebar__menu-btn").click();
    });
    expect(container.querySelector(".ck-drawer__section")).toBeNull();
  });
});

describe("AppShell — drawer behaviour", () => {
  it("opens on the burger and locks the page behind it", async () => {
    await mount(USERS.producer);
    expect(container.querySelector(".ck-drawer").classList.contains("open")).toBe(false);

    await act(async () => {
      container.querySelector(".ck-sidebar__menu-btn").click();
    });

    expect(container.querySelector(".ck-drawer").classList.contains("open")).toBe(true);
    expect(container.querySelector(".ck-backdrop").classList.contains("open")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes on Escape and releases the scroll lock", async () => {
    await mount(USERS.producer);
    await act(async () => {
      container.querySelector(".ck-sidebar__menu-btn").click();
    });

    await act(async () => {
      document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(container.querySelector(".ck-drawer").classList.contains("open")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on the backdrop", async () => {
    await mount(USERS.producer);
    await act(async () => {
      container.querySelector(".ck-sidebar__menu-btn").click();
    });
    await act(async () => {
      container.querySelector(".ck-backdrop").click();
    });
    expect(container.querySelector(".ck-drawer").classList.contains("open")).toBe(false);
  });

  /*
   * A closed drawer sits translated off-screen. Before `inert` it kept every link
   * focusable, so tabbing through the page walked into invisible controls.
   */
  it("keeps a closed drawer out of the tab order", async () => {
    await mount(USERS.producer);
    expect(container.querySelector(".ck-drawer").hasAttribute("inert")).toBe(true);

    await act(async () => {
      container.querySelector(".ck-sidebar__menu-btn").click();
    });
    expect(container.querySelector(".ck-drawer").hasAttribute("inert")).toBe(false);
  });
});

describe("AppShell — the unread badge", () => {
  it("shows the message count on the rail and the mobile bar", async () => {
    apiGet.mockImplementation((url) => Promise.resolve({
      data: url === "/messages/unread-count" ? { count: 4 } : [],
    }));

    await mount(USERS.producer);

    const badges = Array.from(container.querySelectorAll(".ck-nav-item__badge"))
      .map((b) => b.textContent);
    // One on the rail, one on the mobile bar.
    expect(badges).toEqual(["4", "4"]);
  });

  it("caps the badge rather than overflowing the pill", async () => {
    apiGet.mockImplementation((url) => Promise.resolve({
      data: url === "/messages/unread-count" ? { count: 231 } : [],
    }));

    await mount(USERS.producer);
    expect(container.querySelector(".ck-nav-item__badge").textContent).toBe("9+");
  });
});

describe("AppShell — a role nobody planned for", () => {
  /*
   * The whole point of the exhaustive policy: an unmapped role must still render
   * a usable shell, and must NOT be handed the writer's authoring tools.
   */
  it("renders a working shell and no authoring tools", async () => {
    await mount({ _id: "u9", name: "Gaffer Gil", role: "gaffer" });

    expect(container.querySelector(".ck-sidebar")).toBeTruthy();
    expect(container.querySelector(".ck-header")).toBeTruthy();
    const rail = hrefsIn(".ck-sidebar__nav");
    expect(rail.length).toBeGreaterThan(0);
    expect(rail).not.toContain("/upload");
    expect(rail).not.toContain("/create-project");
  });

  it("does not crash without a user at all", async () => {
    await mount(null);
    expect(container.querySelector(".ck-sidebar")).toBeTruthy();
  });
});

/*
 * The mounting contract, end to end.
 *
 * shellPolicy.test.js asserts that /writers resolves to FILL; this asserts what
 * FILL actually does to the DOM — no padded scroll column, the page sitting
 * directly in the content area. The two together are the whole chain App.jsx's
 * one-line ternary sits in the middle of.
 */
describe("AppShell — the fill mount", () => {
  const mountAt = async (route, variant) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[route]}>
          <AuthContext.Provider value={{ user: USERS.producer, logout: vi.fn(), setUser: vi.fn() }}>
            <AppShell variant={variant}>
              <div className="test-page">page content</div>
            </AppShell>
          </AuthContext.Provider>
        </MemoryRouter>,
      );
    });
    await settle();
  };

  it("hands a padded scroll column to an ordinary page", async () => {
    await mountAt("/search", "page");
    expect(container.querySelector(".ck-page-scroll")).toBeTruthy();
  });

  it("gives /writers the whole content area, with no padded column", async () => {
    const { resolveShell, CONTENT_VARIANT } = await import("./shellPolicy");
    const { contentVariant } = resolveShell({ role: "producer", pathname: "/writers" });
    expect(contentVariant).toBe(CONTENT_VARIANT.FILL);

    // Exactly the mapping App.jsx's AppChrome performs.
    await mountAt("/writers", contentVariant === CONTENT_VARIANT.PAGE ? "page" : "fill");

    expect(container.querySelector(".ck-page-scroll")).toBeNull();
    const page = container.querySelector(".test-page");
    expect(page.parentElement.className).toBe("ck-content-area");
  });
});
