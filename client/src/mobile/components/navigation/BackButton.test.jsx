// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BackButton from "./BackButton";
import { hasInAppHistory } from "../../hooks/useMobileBack";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

function render({ entries, index, ui }) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <Routes>
        <Route path="*" element={<><Where />{ui}</>} />
      </Routes>
    </MemoryRouter>,
  ));
  return container;
}

const at = (el) => el.querySelector('[data-testid="where"]').textContent;
const press = (el) => act(() => {
  el.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
});

beforeEach(() => {
  window.history.replaceState({}, "");
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.restoreAllMocks();
});

describe("useMobileBack / BackButton", () => {
  it("reads the router's own history index", () => {
    window.history.replaceState({ idx: 0 }, "");
    expect(hasInAppHistory()).toBe(false);

    window.history.replaceState({ idx: 3 }, "");
    expect(hasInAppHistory()).toBe(true);

    // A page the router never adopted has no idx at all.
    window.history.replaceState({}, "");
    expect(hasInAppHistory()).toBe(false);
  });

  it("uses browser history when the user actually walked here", () => {
    window.history.replaceState({ idx: 1 }, "");
    const el = render({
      entries: ["/dashboard", "/script/42"],
      index: 1,
      ui: <BackButton to="/search" />,
    });

    expect(at(el)).toBe("/script/42");
    press(el);
    expect(at(el)).toBe("/dashboard");
  });

  it("falls back to the declared parent on a deep link instead of leaving the app", () => {
    window.history.replaceState({ idx: 0 }, "");
    const el = render({
      entries: ["/script/42"],
      index: 0,
      ui: <BackButton to="/search" />,
    });

    press(el);
    expect(at(el)).toBe("/search");
  });

  it("names the parent for assistive technology when a visible label is shown", () => {
    const el = render({
      entries: ["/script/42"],
      index: 0,
      ui: <BackButton to="/search" label="Search results" />,
    });
    const button = el.querySelector("button");

    expect(button.getAttribute("aria-label")).toBe("Back: Search results");
    expect(button.textContent).toContain("Search results");
  });

  it("stays an icon button with an accessible name when unlabelled", () => {
    const el = render({
      entries: ["/script/42"],
      index: 0,
      ui: <BackButton to="/search" />,
    });
    const button = el.querySelector("button");

    expect(button.getAttribute("aria-label")).toBe("Back");
    expect(button.className).toContain("ckm-icon-button");
  });

  it("lets a screen own the gesture when it has unsaved work to protect", () => {
    const onBack = vi.fn();
    const el = render({
      entries: ["/create-project"],
      index: 0,
      ui: <BackButton to="/dashboard" onBack={onBack} />,
    });

    press(el);

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(at(el)).toBe("/create-project");
  });
});
