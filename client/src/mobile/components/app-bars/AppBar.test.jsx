// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppBar, { AppBarAction, AppBarAvatar } from "./AppBar";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

const WRITER = { role: "writer", _id: "u1", name: "Ada Lovelace", username: "ada" };
const PRODUCER = { role: "producer", _id: "u2", name: "Otto Preminger", username: "otto" };
const READER = { role: "reader", _id: "u3", name: "Rae Ito" };

function render(ui, { route = "/dashboard" } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>));
  return container;
}

const href = (el, selector) => el.querySelector(selector).getAttribute("href");

describe("AppBar", () => {
  it("is a banner with a home link and a search entry", () => {
    const el = render(<AppBar user={WRITER} />);

    expect(el.querySelector("header")).toBeTruthy();
    expect(href(el, ".ckm-appbar__home")).toBe("/dashboard");
    expect(href(el, ".ckm-appbar__search")).toBe("/search");
  });

  /*
   * The defect this replaces: the old bar's logo was a bare <img> that
   * navigated nowhere, which is the one gesture every app user tries first.
   */
  it("sends each audience to its own home", () => {
    expect(href(render(<AppBar user={WRITER} />), ".ckm-appbar__home")).toBe("/dashboard");

    act(() => root.unmount()); container.remove();
    expect(href(render(<AppBar user={PRODUCER} route="/home" />), ".ckm-appbar__home")).toBe("/home");

    act(() => root.unmount()); container.remove();
    expect(href(render(<AppBar user={READER} route="/reader" />), ".ckm-appbar__home")).toBe("/reader");
  });

  it("speaks each audience's language and searches their own catalogue", () => {
    const writer = render(<AppBar user={WRITER} />);
    const writerCopy = writer.querySelector(".ckm-appbar__search-label").textContent;
    expect(writerCopy).toContain("scripts");

    act(() => root.unmount()); container.remove();

    const reader = render(<AppBar user={READER} route="/reader" />);
    // The reader searches their own catalogue, not the global project index.
    expect(href(reader, ".ckm-appbar__search")).toBe("/reader/search");
    expect(reader.querySelector(".ckm-appbar__search-label").textContent).not.toBe(writerCopy);
  });

  it("names the search link by its visible label", () => {
    const el = render(<AppBar user={PRODUCER} route="/home" />);
    const search = el.querySelector(".ckm-appbar__search");
    // No aria-label overriding the visible text: what is read is what is shown.
    expect(search.getAttribute("aria-label")).toBeNull();
    expect(search.textContent.trim().length).toBeGreaterThan(0);
  });

  it("gives the logo link a destination-shaped name and hides the decorative image", () => {
    const el = render(<AppBar user={WRITER} />);
    expect(el.querySelector(".ckm-appbar__home").getAttribute("aria-label")).toBe("Ckript home");
    // alt="" — the link is already named; a second name would be read twice.
    expect(el.querySelector(".ckm-appbar__logo").getAttribute("alt")).toBe("");
  });

  it("renders only the actions a screen gives it", () => {
    expect(render(<AppBar user={WRITER} />).querySelector(".ckm-appbar__actions")).toBeNull();

    act(() => root.unmount()); container.remove();

    const el = render(
      <AppBar user={WRITER} actions={<AppBarAction glyph="notifications" label="Notifications" />} />,
    );
    expect(el.querySelectorAll(".ckm-appbar__actions button")).toHaveLength(1);
  });
});

describe("AppBarAction", () => {
  it("is always named, with the count folded into the name", () => {
    const el = render(<AppBarAction glyph="notifications" label="Notifications" badge={4} />);
    const button = el.querySelector("button");

    expect(button.getAttribute("aria-label")).toBe("Notifications, 4 unread");
    expect(el.querySelector(".ckm-appbar__badge").getAttribute("aria-hidden")).toBe("true");
  });

  it("does not claim unread items when there are none", () => {
    const el = render(<AppBarAction glyph="notifications" label="Notifications" badge={0} />);
    expect(el.querySelector("button").getAttribute("aria-label")).toBe("Notifications");
    expect(el.querySelector(".ckm-appbar__badge")).toBeNull();
  });

  it("caps the drawn count but not the announced one", () => {
    const el = render(<AppBarAction glyph="notifications" label="Notifications" badge={140} />);
    expect(el.querySelector(".ckm-appbar__badge").textContent).toBe("99+");
    expect(el.querySelector("button").getAttribute("aria-label")).toBe("Notifications, 140 unread");
  });

  it("calls back when pressed", () => {
    const onClick = vi.fn();
    const el = render(<AppBarAction glyph="notifications" label="Notifications" onClick={onClick} />);
    act(() => { el.querySelector("button").click(); });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("AppBarAvatar", () => {
  it("announces that it opens something, and whether it is open", () => {
    const el = render(<AppBarAvatar initials="AL" />);
    const button = el.querySelector("button");

    expect(button.getAttribute("aria-label")).toBe("Account menu");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("reports the open state to the sheet it controls", () => {
    const el = render(<AppBarAvatar initials="AL" active />);
    expect(el.querySelector("button").getAttribute("aria-expanded")).toBe("true");
  });

  it("hides the initials from the accessible name", () => {
    // "AL" read aloud after "Account menu" is noise, not information.
    const el = render(<AppBarAvatar initials="AL" />);
    expect(el.querySelector("span[aria-hidden='true']").textContent).toBe("AL");
  });
});
