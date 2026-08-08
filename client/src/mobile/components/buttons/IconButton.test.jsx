// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import IconButton from "./IconButton";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.restoreAllMocks();
});

function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
  return container;
}

describe("IconButton", () => {
  it("gives an icon-only control its accessible name", () => {
    const el = render(<IconButton icon="search" label="Search scripts" />);
    const button = el.querySelector("button");

    expect(button.getAttribute("aria-label")).toBe("Search scripts");
    // The glyph itself must stay hidden, or the name is read twice.
    expect(el.querySelector(".material-symbols-outlined").getAttribute("aria-hidden")).toBe("true");
  });

  it("complains in development when a label is missing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<IconButton icon="search" />);
    expect(error).toHaveBeenCalled();
  });

  it("folds the badge count into the accessible name", () => {
    const el = render(<IconButton icon="notifications" label="Notifications" badge={3} />);
    const button = el.querySelector("button");

    expect(button.getAttribute("aria-label")).toBe("Notifications, 3");
    expect(el.querySelector(".ckm-icon-button__badge").getAttribute("aria-hidden")).toBe("true");
  });

  it("prefers an explicit badge phrase when one is given", () => {
    const el = render(
      <IconButton icon="notifications" label="Notifications" badge={3} badgeLabel="Notifications, 3 unread" />,
    );
    expect(el.querySelector("button").getAttribute("aria-label")).toBe("Notifications, 3 unread");
  });

  it("caps a large count visually without losing it from the name", () => {
    const el = render(<IconButton icon="notifications" label="Notifications" badge={128} />);

    expect(el.querySelector(".ckm-icon-button__badge").textContent).toBe("99+");
    expect(el.querySelector("button").getAttribute("aria-label")).toBe("Notifications, 128");
  });

  it("renders no badge for a zero count", () => {
    const el = render(<IconButton icon="notifications" label="Notifications" badge={0} />);

    expect(el.querySelector(".ckm-icon-button__badge")).toBeNull();
    expect(el.querySelector("button").getAttribute("aria-label")).toBe("Notifications");
  });

  it("keeps the small size tappable by marking it, not shrinking the target", () => {
    const el = render(<IconButton icon="share" label="Share" size="sm" />);
    // The 44px hit region is a ::after overlay on this class (IconButton.css).
    expect(el.querySelector("button").className).toContain("ckm-icon-button--sm");
  });

  it("navigates as a link when given a route", () => {
    const el = render(<IconButton icon="person" label="Profile" to="/profile" />);
    expect(el.querySelector("a").getAttribute("href")).toBe("/profile");
  });
});
