// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import MobileShell from "./MobileShell";
import { MOBILE_SHELL_MODE, MOBILE_SHELL_MODES, getShellModeConfig } from "./mobileShellModes";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

// The shell is route-level: it reads the URL for per-screen analytics, so it
// is always mounted inside the app's router.
function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter initialEntries={["/dashboard"]}>{ui}</MemoryRouter>));
  return container;
}

const chrome = {
  appBar: <div data-testid="app-bar" />,
  bottomNav: <div data-testid="bottom-nav" />,
  overlays: <div data-testid="overlay" />,
};

describe("MobileShell", () => {
  it("renders one scroll surface and marks its mode", () => {
    const el = render(
      <MobileShell mode={MOBILE_SHELL_MODE.STANDARD} {...chrome}>
        <p>body</p>
      </MobileShell>,
    );

    const shell = el.querySelector(".ckm-shell");
    expect(shell.dataset.shellMode).toBe("standard");
    expect(el.querySelectorAll("main").length).toBe(1);
    expect(el.querySelector("main").className).toContain("ckm-scroll");
  });

  it("gives every mode exactly the chrome its config declares", () => {
    for (const mode of MOBILE_SHELL_MODES) {
      const config = getShellModeConfig(mode);
      const el = render(<MobileShell mode={mode} {...chrome}>body</MobileShell>);

      expect(Boolean(el.querySelector('[data-testid="app-bar"]'))).toBe(config.appBar);
      expect(Boolean(el.querySelector('[data-testid="bottom-nav"]'))).toBe(config.bottomNav);
      // Overlays are never mode-gated: a dialog must be reachable everywhere.
      expect(el.querySelector('[data-testid="overlay"]')).toBeTruthy();

      act(() => root.unmount());
      container.remove();
      root = null;
      container = null;
    }
  });

  it("falls back to the standard mode rather than rendering an unknown shell", () => {
    const el = render(<MobileShell mode="not-a-mode" {...chrome}>body</MobileShell>);
    expect(el.querySelector(".ckm-shell").dataset.shellMode).toBe("standard");
  });

  /*
   * Connectivity is an app-wide condition, so it is inherited by adopting the
   * shell rather than remembered by each screen — the contract §5.6 already
   * uses for scroll-depth analytics. The region is empty while online, but it
   * must exist: a live region created at the moment its content arrives is
   * routinely missed by screen readers.
   */
  it("gives every mode a connectivity region, above the scroll body", () => {
    for (const mode of MOBILE_SHELL_MODES) {
      const el = render(<MobileShell mode={mode} {...chrome}>body</MobileShell>);
      const region = el.querySelector(".ckm-offline");

      expect(region).toBeTruthy();
      expect(region.getAttribute("role")).toBe("status");
      expect(region.textContent).toBe("");
      expect(region.compareDocumentPosition(el.querySelector("main")))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);

      act(() => root.unmount());
      container.remove();
      root = null;
      container = null;
    }
  });

  it("appends adopting screen classes so a migrated screen keeps its selectors", () => {
    const el = render(
      <MobileShell className="ckm-dashboard" scrollClassName="ckm-dashboard__scroll" {...chrome}>
        body
      </MobileShell>,
    );

    expect(el.querySelector(".ckm-shell").className).toContain("ckm-dashboard");
    expect(el.querySelector("main").className).toContain("ckm-dashboard__scroll");
  });
});
