// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import NewProject from "./NewProject";

/*
 * The screen has no data and no states, so this file is not about states. It is
 * about the two things that are actually easy to get wrong here and expensive
 * to notice later:
 *
 *   1. `startFresh` must reach /create-project. It is not decoration — the
 *      wizard reads location.state.startFresh as an ENTRY MODE (plan §5.2): it
 *      resets the wizard and drops the local working draft. Lose it and "New
 *      project" silently reopens whatever the writer last wrote, which looks
 *      like data corruption rather than a missing field.
 *   2. The chooser must stay a chooser. Two destinations, no more, both real
 *      routes — a third card, or a card pointing at a route that does not
 *      exist, should fail here rather than in a writer's hands.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

// Renders the screen and captures whatever location a click navigates to.
let lastLocation = null;

function LocationProbe() {
  const location = useLocation();
  // Recorded in an effect, not during render: writing to module scope while
  // rendering is a side effect, and React is free to render twice.
  useEffect(() => { lastLocation = location; }, [location]);
  return null;
}

const renderScreen = (initialPath = "/new-project") => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        <Routes>
          <Route path="/new-project" element={<NewProject />} />
          <Route path="/create-project" element={<p>create</p>} />
          <Route path="/upload" element={<p>upload</p>} />
          <Route path="/dashboard" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
    );
  });
};

const linkNamed = (name) => Array.from(container.querySelectorAll("a"))
  .find((a) => a.textContent.trim() === name);

beforeEach(() => { lastLocation = null; });

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("NewProject — the two paths", () => {
  it("offers exactly two paths, as a list", () => {
    renderScreen();
    const paths = container.querySelectorAll(".ckm-new-project__path");
    expect(paths).toHaveLength(2);
    // A list, so a screen reader hears the shape of the decision first.
    expect(container.querySelector("ul.ckm-new-project__paths")).not.toBeNull();
  });

  it("names each path by its title alone — the card overlay must not swallow the affordances into the link name", () => {
    renderScreen();
    const names = Array.from(container.querySelectorAll(".ckm-card__link")).map((a) => a.textContent.trim());
    expect(names).toEqual(["Write from scratch", "Upload a file"]);
  });

  it("sends each path to its real route", () => {
    renderScreen();
    expect(linkNamed("Write from scratch").getAttribute("href")).toBe("/create-project");
    expect(linkNamed("Upload a file").getAttribute("href")).toBe("/upload");
  });

  it("uses real links, so long-press and open-in-new-tab still work", () => {
    renderScreen();
    // If these ever become buttons driven by navigate(), this fails — which is
    // the point: a chooser whose options cannot be opened in a new tab is worse
    // than the desktop page it replaces.
    expect(container.querySelectorAll(".ckm-card__link").length).toBe(2);
    expect(container.querySelectorAll("button.ckm-card__link").length).toBe(0);
  });
});

describe("NewProject — startFresh reaches the wizard (plan §5.2)", () => {
  it("carries state.startFresh to /create-project", () => {
    renderScreen();
    act(() => {
      linkNamed("Write from scratch").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(lastLocation.pathname).toBe("/create-project");
    expect(lastLocation.state).toEqual({ startFresh: true });
  });

  it("does NOT send startFresh to /upload, which has no such entry mode", () => {
    renderScreen();
    act(() => {
      linkNamed("Upload a file").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(lastLocation.pathname).toBe("/upload");
    expect(lastLocation.state ?? null).toBeNull();
  });
});

describe("NewProject — chrome and headings", () => {
  it("is a flow screen: an app bar with a back affordance and no bottom tabs", () => {
    renderScreen();
    const shell = container.querySelector(".ckm-shell");
    expect(shell.getAttribute("data-shell-mode")).toBe("flow");
    expect(container.querySelector(".ckm-shell__app-bar")).not.toBeNull();
    expect(container.querySelector(".ckm-shell__bottom")).toBeNull();
    expect(container.querySelector(".ckm-back")).not.toBeNull();
  });

  it("has one h1 and puts the two paths directly under it", () => {
    renderScreen();
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent.trim()).toBe("New project");
    // h2 rather than the Card default h3: skipping a level breaks heading
    // navigation for exactly the users who rely on it most.
    expect(container.querySelectorAll("h2")).toHaveLength(2);
    expect(container.querySelectorAll("h3")).toHaveLength(0);
  });

  it("reports its screen id to the shell, so scroll depth and click tracking name the right screen", () => {
    renderScreen();
    expect(container.querySelector(".ckm-shell").getAttribute("data-screen-id")).toBe("new-project");
    expect(container.querySelector("main").getAttribute("data-track-section")).toBe("new-project");
  });

  it("lists three affordances per path, and none of them are links competing with the card", () => {
    renderScreen();
    const groups = container.querySelectorAll(".ckm-new-project__affordances");
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.querySelectorAll("li")).toHaveLength(3);
      expect(group.querySelectorAll("a, button")).toHaveLength(0);
    }
  });
});
