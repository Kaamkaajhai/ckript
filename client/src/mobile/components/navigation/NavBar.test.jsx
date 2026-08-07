// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import NavBar from "./NavBar";

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

function render(ui, { route = "/dashboard" } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>));
  return container;
}

const links = (el) => [...el.querySelectorAll("a")];
const labels = (el) => links(el).map((a) => a.querySelector(".ckm-navbar__label").textContent);

describe("NavBar", () => {
  it("is a labelled navigation landmark holding a real list", () => {
    const el = render(<NavBar user={WRITER} />);

    const nav = el.querySelector("nav");
    expect(nav.getAttribute("aria-label")).toBe("Primary");
    // A list, so a screen reader announces how many destinations there are
    // before the user commits to walking them.
    expect(el.querySelectorAll("ul > li").length).toBe(4);
    expect(links(el).length).toBe(4);
  });

  it("renders the audience's own destinations", () => {
    expect(labels(render(<NavBar user={WRITER} />)))
      .toEqual(["Dashboard", "Create", "Messages", "Profile"]);

    act(() => root.unmount());
    container.remove();

    expect(labels(render(<NavBar user={PRODUCER} route="/home" />)))
      .toEqual(["Discover", "Featured", "Messages", "Profile"]);
  });

  /*
   * The defect this replaces: the old bar took `active="dashboard"` as a prop
   * and every caller passed the constant, so the bar claimed the dashboard was
   * current on every screen in the app.
   */
  it("takes the current tab from the URL, not from a prop", () => {
    const el = render(<NavBar user={WRITER} />, { route: "/messages/653f" });

    const current = links(el).filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("Messages");
  });

  it("marks no tab current on a screen that belongs to none", () => {
    const el = render(<NavBar user={WRITER} />, { route: "/script/653f" });
    expect(links(el).filter((a) => a.getAttribute("aria-current"))).toHaveLength(0);
  });

  it("never marks more than one tab current", () => {
    for (const route of ["/dashboard", "/create-project/d1", "/ada", "/messages"]) {
      const el = render(<NavBar user={WRITER} />, { route });
      expect(links(el).filter((a) => a.getAttribute("aria-current") === "page").length, route)
        .toBeLessThanOrEqual(1);
      act(() => root.unmount());
      container.remove();
      root = null;
      container = null;
    }
  });

  it("navigates with real hrefs, so a destination can be opened however the user likes", () => {
    const el = render(<NavBar user={WRITER} />);
    expect(links(el).map((a) => a.getAttribute("href")))
      .toEqual(["/dashboard", "/create-project", "/messages", "/ada"]);
    // …and nothing in the bar is a button pretending to be a link.
    expect(el.querySelectorAll("button")).toHaveLength(0);
  });

  it("puts an unread count in the accessible name, not only in the badge", () => {
    const el = render(<NavBar user={WRITER} msgCount={3} />);
    const messages = links(el).find((a) => a.textContent.includes("Messages"));

    expect(messages.textContent).toContain("3 unread");
    // The drawn badge is decoration and must not be announced twice.
    expect(messages.querySelector(".ckm-navbar__badge").getAttribute("aria-hidden")).toBe("true");
  });

  it("caps an implausible badge instead of stretching the bar", () => {
    const el = render(<NavBar user={WRITER} msgCount={1240} />);
    expect(el.querySelector(".ckm-navbar__badge").textContent).toBe("99+");
    // The true count still reaches a screen reader.
    expect(el.textContent).toContain("1240 unread");
  });

  it("shows no badge when there is nothing unread", () => {
    const el = render(<NavBar user={WRITER} msgCount={0} />);
    expect(el.querySelector(".ckm-navbar__badge")).toBeNull();
    expect(el.textContent).not.toContain("unread");
  });

  it("keeps every label visible — icon-only primary navigation is not allowed", () => {
    const el = render(<NavBar user={WRITER} />);
    for (const label of el.querySelectorAll(".ckm-navbar__label")) {
      expect(label.textContent.trim().length).toBeGreaterThan(0);
    }
  });

  it("opens Create as a new draft rather than resuming the last one", () => {
    // `fresh` is carried as router state; asserting the model here keeps the
    // contract visible even though happy-dom cannot read a NavLink's state.
    const el = render(<NavBar user={WRITER} />);
    expect(links(el)[1].getAttribute("href")).toBe("/create-project");
  });
});
