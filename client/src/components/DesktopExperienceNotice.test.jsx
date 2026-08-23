// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";
import DarkModeContext from "../context/DarkModeContext";
import DesktopExperienceNotice from "./DesktopExperienceNotice";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const writer = { _id: "writer-1", role: "writer" };

let container;
let root;

/* The notice reads the viewport through useIsMobile's matchMedia query. */
const setViewport = (width) => {
  window.innerWidth = width;
  window.matchMedia = (query) => ({
    matches: width <= 768,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
};

async function mount(pathname, { user = writer } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[pathname]}>
        <DarkModeContext.Provider value={{ isDark: false }}>
          <AuthContext.Provider value={{ user, loading: false, setUser: () => {} }}>
            <DesktopExperienceNotice />
          </AuthContext.Provider>
        </DarkModeContext.Provider>
      </MemoryRouter>,
    );
  });
  // The notice opens on a 1500 ms timer.
  await act(async () => { vi.advanceTimersByTime(2000); });
  return container;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  setViewport(390);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.useRealTimers();
});

describe("DesktopExperienceNotice — DEF-23", () => {
  it("does not cover a route that is already a native mobile screen", async () => {
    for (const pathname of ["/featured", "/top-script", "/search", "/dashboard", "/messages"]) {
      const el = await mount(pathname);
      expect(el.textContent).not.toContain("Switch to Desktop");
      act(() => root.unmount());
      container.remove();
    }
  });

  it("does not cover a dev harness, which is where the five-width sweeps run", async () => {
    const el = await mount("/__mobile-featured");
    expect(el.textContent).not.toContain("Switch to Desktop");
  });

  it("still shows on a route that is genuinely still desktop markup", async () => {
    const el = await mount("/pricing");
    expect(el.textContent).toContain("Switch to Desktop");
  });

  it("still shows to a signed-out visitor, whose routes are all fallbacks", async () => {
    const el = await mount("/featured", { user: null });
    expect(el.textContent).toContain("Switch to Desktop");
  });

  it("does not show on a desktop viewport at all", async () => {
    setViewport(1280);
    const el = await mount("/pricing");
    expect(el.textContent).not.toContain("Switch to Desktop");
  });

  it("gives the close control an accessible name and a 44 px target", async () => {
    const el = await mount("/pricing");
    const close = el.querySelector('button[aria-label="Dismiss this notice"]');
    expect(close).toBeTruthy();
    expect(close.className).toContain("w-11");
    expect(close.className).toContain("h-11");
  });

  it("sets the primary label colour where an unlayered rule cannot defeat it", async () => {
    const el = await mount("/pricing");
    const cta = Array.from(el.querySelectorAll("button"))
      .find((b) => b.textContent.includes("Continue on Mobile"));
    // index.css's unlayered `button { color: inherit }` beats Tailwind's
    // layered text-white, so the utility alone rendered this near-black.
    expect(cta.style.color).toBe("#ffffff");
    expect(cta.className).not.toContain("text-white");
  });
});
