// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountMenu from "./AccountMenu";

/*
 * Phase 2 bullet 6. The account surface had no test coverage at all, which is
 * how it kept two alias links nobody noticed.
 *
 * Desktop's whole account surface is `layouts/app-shell/components/UserMenu.jsx`
 * — four entries plus Log out. There is no /settings route and no settings page
 * on either platform, so parity with that menu IS the deliverable, and these
 * tests assert it against desktop's own list rather than against a screenshot.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

async function mount(props = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <AccountMenu
          open
          onClose={() => {}}
          onLogout={() => {}}
          userName="Nadia Rahman"
          profileHref="/nadia"
          {...props}
        />
      </MemoryRouter>,
    );
  });
  return container;
}

const hrefs = () => [...container.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));

describe("AccountMenu — canonical destinations", () => {
  /*
   * The defect this replaces: these two linked /terms and /privacy, which
   * App.jsx:481,483 mount as <Navigate replace> to the paths below. Desktop's
   * UserMenu links straight to the canonical ones, so every mobile tap paid a
   * redirect hop desktop does not — and §5.2 wants one canonical URL per page.
   */
  it("links Terms to the canonical route, not the /terms alias", async () => {
    await mount();
    expect(hrefs()).toContain("/terms-of-service");
    expect(hrefs()).not.toContain("/terms");
  });

  it("links Privacy to the canonical route, not the /privacy alias", async () => {
    await mount();
    expect(hrefs()).toContain("/privacy-policy");
    expect(hrefs()).not.toContain("/privacy");
  });

  it("matches desktop UserMenu's destination set exactly", async () => {
    // ACCOUNT_MENU in layouts/app-shell/components/UserMenu.jsx, transcribed.
    // If desktop gains "Billing", this fails and mobile gains it too — which is
    // the §8.2 rule applied to account admin rather than navigation.
    await mount();
    expect(hrefs().sort()).toEqual(
      ["/nadia", "/contact", "/terms-of-service", "/privacy-policy"].sort(),
    );
  });

  it("points Profile at the viewer's own canonical path", async () => {
    await mount({ profileHref: "/profile/u1" });
    expect(hrefs()).toContain("/profile/u1");
  });
});

describe("AccountMenu — logging out is confirmed first", () => {
  const openConfirm = async () => {
    const logout = [...container.querySelectorAll("button")]
      .find((b) => /log out/i.test(b.textContent));
    await act(async () => { logout.click(); });
  };

  it("does not log out on the first tap", async () => {
    const onLogout = vi.fn();
    await mount({ onLogout });
    await openConfirm();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("raises an alertdialog rather than a plain dialog", async () => {
    /*
     * Desktop's Log out fires immediately with no confirmation. Mobile is
     * deliberately stricter: a destructive action on a touch surface is one
     * mis-tap away, and alertdialog is what interrupts a screen reader for a
     * consequence the user did not ask to be warned about.
     */
    await mount();
    await openConfirm();
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
  });

  it("logs out once the confirmation is accepted", async () => {
    const onLogout = vi.fn();
    const onClose = vi.fn();
    await mount({ onLogout, onClose });
    await openConfirm();

    const confirm = [...container.querySelectorAll('[role="alertdialog"] button')]
      .find((b) => /log out/i.test(b.textContent));
    await act(async () => { confirm.click(); });

    expect(onLogout).toHaveBeenCalledTimes(1);
    // The sheet must close with it; leaving it open over a logging-out app
    // would flash the account of a user who no longer has one.
    expect(onClose).toHaveBeenCalled();
  });

  it("abandons the logout on Cancel and leaves the session alone", async () => {
    const onLogout = vi.fn();
    await mount({ onLogout });
    await openConfirm();

    const cancel = [...container.querySelectorAll('[role="alertdialog"] button')]
      .find((b) => /cancel/i.test(b.textContent));
    await act(async () => { cancel.click(); });

    expect(onLogout).not.toHaveBeenCalled();
    /*
     * Cancel returns you to the account menu rather than closing everything —
     * asserted by the sheet's own items coming back, not by the dialog leaving
     * the DOM. `Overlay` wraps its surface in `AnimatePresence`, whose exit does
     * not complete synchronously under the stubbed framer-motion this suite
     * runs with, so a `toBeNull()` here would be testing the animation library.
     * Real close timing is verified in the browser (§19.3, 2026-08-07).
     */
    expect(hrefs()).toContain("/contact");
  });
});
