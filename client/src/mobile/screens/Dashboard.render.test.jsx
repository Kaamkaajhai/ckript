// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ToastProvider from "../components/feedback/ToastProvider";
import Dashboard from "./Dashboard";

/*
 * What this file is for
 * ---------------------
 * Phase 2's exit gate is "every dashboard interaction works on mobile; no
 * desktopOnly() branch remains in the dashboard family". A model test cannot
 * check that, because the defect was never in the arithmetic — it was that a
 * control which looked like a destination was a toast saying "use a computer".
 * So these tests assert the thing a user can act on: that the controls are real
 * links pointing at the real routes, and that a failed load says so and offers
 * a retry instead of skeletoning forever.
 */

const scripts = [
  {
    _id: "s1",
    title: "The Last Scene",
    logline: "A grieving editor splices one last reel.",
    genre: "Drama",
    format: "feature",
    status: "published",
    views: 4100,
    premium: true,
    price: 1499,
    platformScore: { overall: 74 },
    createdAt: "2026-02-01T00:00:00.000Z",
    creator: { name: "Arshad R.", username: "arshad" },
  },
];

const stats = { totalEarnings: 0, totalUnlocks: 0, profileViews: 12, trailersGenerated: 0, avgScore: 74 };
const reviews = { ai: [], adminScores: [] };

const get = vi.fn();
vi.mock("../../services/api", () => ({ default: { get: (...args) => get(...args) } }));
// The notification session opens a socket and polls; neither belongs in a
// render test of this screen, and the hook has its own coverage upstream.
vi.mock("../../layouts/app-shell/hooks/useShellNotifications", () => ({
  default: () => ({
    notifications: [], unreadCount: 0, messageCount: 0, toasts: [],
    refresh: () => {}, acknowledgeAll: () => {}, markAllRead: () => {},
    deleteNotification: () => {}, openNotification: () => {},
    decideFollowRequest: () => {}, dismissToast: () => {}, dismissAllToasts: () => {},
  }),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const okResponses = (url) => {
  if (url.startsWith("/scripts/mine")) return Promise.resolve({ data: scripts });
  if (url === "/dashboard") return Promise.resolve({ data: { stats } });
  if (url === "/dashboard/reviews") return Promise.resolve({ data: reviews });
  return Promise.reject(new Error(`unexpected ${url}`));
};

beforeEach(() => {
  get.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ToastProvider>
          <Dashboard
            initials="AR"
            userName="Arshad"
            onLogout={() => {}}
            user={{ _id: "u1", role: "writer", name: "Arshad R.", username: "arshad" }}
          />
        </ToastProvider>
      </MemoryRouter>,
    );
  });
  // Let the three settled requests resolve and the model build.
  await act(async () => { await Promise.resolve(); });
}

const linkTo = (href) => container.querySelector(`a[href="${href}"]`);

describe("Dashboard — real destinations replace desktopOnly()", () => {
  beforeEach(() => { get.mockImplementation(okResponses); });

  it("renders Create and Upload as links to the routes desktop uses", async () => {
    await mount();
    expect(linkTo("/create-project")).toBeTruthy();
    expect(linkTo("/upload")).toBeTruthy();
  });

  it("renders Edit profile as a link to the viewer's own profile", async () => {
    await mount();
    const edit = linkTo("/arshad");
    expect(edit).toBeTruthy();
    expect(edit.textContent).toContain("Edit");
  });

  it("makes every Top Scripts row a link to that script", async () => {
    await mount();
    const row = container.querySelector(".ckm-ov__top-link");
    expect(row).toBeTruthy();
    expect(row.getAttribute("href")).toBe("/the-last-scene/arshad");
    expect(row.textContent).toContain("The Last Scene");
  });

  /*
   * Performance / Reviews / Projects are NOT tested through this component.
   * `SectionTabs` was reduced to Overview + Challenge in ada2b85 (2026-08-03),
   * so three of the four sections have no tab and cannot be reached from the
   * dashboard at all — Performance only via "Full Analytics". That is a product
   * decision recorded in the plan's §19 and awaiting the user, not something to
   * be undone by a test. The sections are covered directly in
   * `sections/ProjectsSection.test.jsx` instead, so their behaviour is verified
   * whatever the tab strip ends up being.
   */
  it("reaches Performance through Full Analytics", async () => {
    await mount();
    const full = [...container.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Full Analytics"));
    expect(full).toBeTruthy();
    await act(async () => { full.click(); });
    expect(container.textContent).toContain("Script Performance");
  });

  it("does not render a Placeholder badge", async () => {
    await mount();
    expect(container.textContent).not.toContain("Placeholder");
  });
});

describe("Dashboard — failure state", () => {
  it("reports a total failure with a retry instead of skeletoning forever", async () => {
    get.mockImplementation(() => Promise.reject(new Error("offline")));
    await mount();

    // Not `[role="alert"]` alone: ToastProvider keeps an always-mounted live
    // region with that role, so the selector has to name the message itself.
    const alert = container.querySelector(".ckm-message");
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent).toContain("could not load your dashboard");

    const retry = [...container.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Try again"));
    expect(retry).toBeTruthy();

    // The retry must actually re-request, not just re-render the message.
    get.mockClear();
    get.mockImplementation(okResponses);
    await act(async () => { retry.click(); });
    await act(async () => { await Promise.resolve(); });
    expect(get).toHaveBeenCalledWith("/dashboard");
    expect(container.querySelector(".ckm-message")).toBeNull();
  });

  it("keeps the dashboard rendered when only one of the three calls fails", async () => {
    get.mockImplementation((url) =>
      url === "/dashboard/reviews" ? Promise.reject(new Error("boom")) : okResponses(url));
    await mount();

    // The section that loaded is still there, and no error interrupts.
    expect(container.textContent).toContain("At a Glance");
    expect(container.querySelector(".ckm-message")).toBeNull();
  });
});
